import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ESCALATION_OVERDUE_DAYS = parseInt(Deno.env.get('ESCALATION_OVERDUE_DAYS') || '3')
const APPROVAL_PENDING_HOURS = parseInt(Deno.env.get('APPROVAL_PENDING_HOURS') || '48')

const ESCALATION_CHAIN: Record<string, string | null> = {
  'gestione_spedizioni':     'gestione_magazzino',
  'gestione_magazzino':      'approva_eventi',
  'gestione_marketing':      'approva_eventi',
  'gestione_organizzazione': 'approva_eventi',
  'richiedi_materiale':      'gestione_magazzino',
  'gestione_logistica':      'gestione_organizzazione',
  'gestione_costi':          'approva_preventivi',
  'approva_eventi':          null,
  'approva_preventivi':      null,
}

async function dedupCheck(
  supabase: ReturnType<typeof createClient>,
  gruppo: string
): Promise<boolean> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('gruppo', gruppo)
  return (count ?? 0) > 0
}

async function insertNotification(
  supabase: ReturnType<typeof createClient>,
  notification: Record<string, unknown>
): Promise<void> {
  await supabase.from('notifications').insert(notification)
}

async function getUsersWithPermission(
  supabase: ReturnType<typeof createClient>,
  permission: string
): Promise<string[]> {
  const { data } = await supabase
    .from('user_permissions')
    .select('user_id')
    .eq('permission', permission)
  return (data || []).map((u: { user_id: string }) => u.user_id)
}

type Row = Record<string, unknown>

/** ISO date (YYYY-MM-DD) for `base` + `days`, in UTC (coerente con todayStr). */
function isoPlusDays(base: Date, days: number): string {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function groupByEvent(rows: Row[]): Map<string, Row[]> {
  const map = new Map<string, Row[]>()
  for (const r of rows) {
    const key = r.event_id as string
    const arr = map.get(key)
    if (arr) arr.push(r)
    else map.set(key, [r])
  }
  return map
}

interface EventTypeFlags {
  spedizione: boolean
  hotel: boolean
  trasporti: boolean
}

interface GapOpts {
  flags: EventTypeFlags
  modalita: unknown
  activities: Row[]
  preventivi: Row[]
  materials: Row[]
  staff: Row[]
  participants: Row[]
  hotels: Row[]
  trasporti: Row[]
}

/**
 * Elenco (in italiano) dei buchi di prontezza di un evento imminente, rispettando
 * il branching per tipo evento (equivalente a src/lib/event-flow.js):
 * salta hotel/trasporti se il tipo non li richiede, salta la spedizione se il tipo
 * non la richiede o se l'evento è a contributo.
 */
function buildReadinessGaps(o: GapOpts): string[] {
  const gaps: string[] = []

  // Attività obbligatorie pre-evento non completate
  const attOpen = o.activities.filter(a =>
    a.obbligatoria === true && a.post_evento !== true &&
    a.stato !== 'completata' && a.stato !== 'disattivata'
  ).length
  if (attOpen > 0) gaps.push(`${attOpen} attività obbligatori${attOpen === 1 ? 'a' : 'e'} da completare`)

  // Preventivi non ancora approvati
  const prevOpen = o.preventivi.filter(p => p.stato !== 'approvato').length
  if (prevOpen > 0) gaps.push(`${prevOpen} preventiv${prevOpen === 1 ? 'o' : 'i'} da approvare`)

  // Materiali non ancora spediti (solo se il tipo richiede spedizione e non è a contributo)
  if (o.flags.spedizione && o.modalita !== 'contributo') {
    const matOpen = o.materials.filter(m =>
      m.stato !== 'spedito' && m.stato !== 'rifiutato' && m.stato !== 'chiuso_in_custodia'
    ).length
    if (matOpen > 0) gaps.push(`${matOpen} material${matOpen === 1 ? 'e' : 'i'} da spedire`)
  }

  // Persone confermate (staff confermato + partecipanti confermato/presente)
  const confirmed = new Set<string>()
  for (const s of o.staff) if (s.confermato === true && s.user_id) confirmed.add(s.user_id as string)
  for (const p of o.participants) {
    if ((p.stato_iscrizione === 'confermato' || p.stato_iscrizione === 'presente') && p.contact_id) {
      confirmed.add(p.contact_id as string)
    }
  }

  if (o.flags.hotel && confirmed.size > 0) {
    const ok = new Set<string>()
    for (const h of o.hotels) {
      if (h.stato !== 'confermato' && h.stato !== 'non_necessario') continue
      const pid = (h.user_id || h.contact_id) as string | null
      if (pid) ok.add(pid)
    }
    const missing = [...confirmed].filter(id => !ok.has(id)).length
    if (missing > 0) gaps.push(`${missing} person${missing === 1 ? 'a' : 'e'} senza hotel`)
  }

  if (o.flags.trasporti && confirmed.size > 0) {
    const andata = new Set<string>()
    const ritorno = new Set<string>()
    for (const t of o.trasporti) {
      if (t.stato !== 'confermato' && t.stato !== 'non_necessario') continue
      const pid = (t.user_id || t.contact_id) as string | null
      if (!pid) continue
      if (t.direzione === 'andata') andata.add(pid)
      else if (t.direzione === 'ritorno') ritorno.add(pid)
    }
    const missing = [...confirmed].filter(id => !(andata.has(id) && ritorno.has(id))).length
    if (missing > 0) gaps.push(`${missing} person${missing === 1 ? 'a' : 'e'} senza trasporto`)
  }

  return gaps
}

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    let deadlineNotifications = 0
    let overdueNotifications = 0
    let escalationNotifications = 0
    let unassignedNotifications = 0
    let approvalReminders = 0
    let imminentNotifications = 0

    // 1. Fetch open activities with deadlines
    const { data: activities } = await supabase
      .from('event_activities')
      .select('*, evento:events!event_activities_event_id_fkey(id, titolo, stato)')
      .in('stato', ['da_fare', 'in_corso'])
      .eq('obbligatoria', true)
      .not('deadline', 'is', null)

    const activeActivities = (activities || []).filter(
      (a: Record<string, unknown>) => {
        const evento = a.evento as { stato: string } | null
        return evento && !['cancellato', 'rifiutato', 'concluso'].includes(evento.stato)
      }
    )

    for (const activity of activeActivities) {
      const deadline = new Date(activity.deadline as string)
      const diffDays = Math.ceil(
        (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
      const evento = activity.evento as { id: string; titolo: string }

      // Approaching deadline (within 3 days)
      if (diffDays === 3 || diffDays === 1) {
        const gruppo = `deadline_${activity.id}_${todayStr}`
        const exists = await dedupCheck(supabase, gruppo)
        if (!exists) {
          const recipients: string[] = []

          if (activity.assegnato_a) {
            recipients.push(activity.assegnato_a as string)
          } else if (activity.permesso_responsabile) {
            const users = await getUsersWithPermission(
              supabase,
              activity.permesso_responsabile as string
            )
            recipients.push(...users)
          }

          for (const userId of recipients) {
            await insertNotification(supabase, {
              user_id: userId,
              tipo: 'attivita_in_scadenza',
              titolo: `Attivita in scadenza: ${activity.descrizione}`,
              messaggio: `Scadenza tra ${diffDays} giorn${diffDays === 1 ? 'o' : 'i'} per "${evento.titolo}"`,
              link: `/eventi/${evento.id}`,
              link_label: 'Vai all\'evento',
              entity_type: 'event_activity',
              entity_id: activity.id as string,
              gruppo,
            })
            deadlineNotifications++
          }
        }
      }

      // Overdue
      if (diffDays < 0) {
        const gruppo = `overdue_${activity.id}_${todayStr}`
        const exists = await dedupCheck(supabase, gruppo)
        if (!exists) {
          const recipients = new Set<string>()

          if (activity.assegnato_a) {
            recipients.add(activity.assegnato_a as string)
          }

          if (activity.permesso_responsabile) {
            const users = await getUsersWithPermission(
              supabase,
              activity.permesso_responsabile as string
            )
            users.forEach((u) => recipients.add(u))
          }

          const overdueDays = Math.abs(diffDays)
          for (const userId of recipients) {
            await insertNotification(supabase, {
              user_id: userId,
              tipo: 'attivita_scaduta',
              titolo: `Attivita scaduta: ${activity.descrizione}`,
              messaggio: `Scaduta da ${overdueDays} giorn${overdueDays === 1 ? 'o' : 'i'} per "${evento.titolo}"`,
              link: `/eventi/${evento.id}`,
              link_label: 'Vai all\'evento',
              entity_type: 'event_activity',
              entity_id: activity.id as string,
              gruppo,
            })
            overdueNotifications++
          }
        }

        // Escalation: overdue by 3+ days
        const overdueDays = Math.abs(diffDays)
        if (overdueDays >= ESCALATION_OVERDUE_DAYS && activity.permesso_responsabile) {
          const weekNum = Math.floor(today.getTime() / (7 * 24 * 60 * 60 * 1000))
          const escalationGruppo = `escalation_${activity.id}_1_${weekNum}`
          const escalationExists = await dedupCheck(supabase, escalationGruppo)

          if (!escalationExists) {
            const nextPermission = ESCALATION_CHAIN[activity.permesso_responsabile as string]
            if (nextPermission) {
              const escalationUsers = await getUsersWithPermission(supabase, nextPermission)
              for (const userId of escalationUsers) {
                await insertNotification(supabase, {
                  user_id: userId,
                  tipo: 'escalation',
                  titolo: `Escalation: ${activity.descrizione}`,
                  messaggio: `Scaduta da ${overdueDays} giorni per "${evento.titolo}". Nessun progresso.`,
                  link: `/eventi/${evento.id}`,
                  link_label: 'Vai all\'evento',
                  entity_type: 'event_activity',
                  entity_id: activity.id as string,
                  gruppo: escalationGruppo,
                })
                escalationNotifications++
              }
            }
          }
        }
      }
    }

    // 2. Unassigned activities approaching deadline (within 3 days, no assegnato_a)
    for (const activity of activeActivities) {
      if (activity.assegnato_a) continue
      if (!activity.permesso_responsabile) continue

      const deadline = new Date(activity.deadline as string)
      const diffDays = Math.ceil(
        (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diffDays > 3 || diffDays < 0) continue // only 0-3 days before deadline

      const evento = activity.evento as { id: string; titolo: string }
      const gruppo = `unassigned_${activity.id}_${todayStr}`
      const exists = await dedupCheck(supabase, gruppo)
      if (exists) continue

      const users = await getUsersWithPermission(
        supabase,
        activity.permesso_responsabile as string
      )
      for (const userId of users) {
        await insertNotification(supabase, {
          user_id: userId,
          tipo: 'attivita_non_assegnata',
          titolo: `Attivita non assegnata: ${activity.descrizione}`,
          messaggio: `Scade tra ${diffDays} giorn${diffDays === 1 ? 'o' : 'i'} per "${evento.titolo}" e non ha un responsabile`,
          link: `/eventi/${evento.id}`,
          link_label: 'Vai all\'evento',
          entity_type: 'event_activity',
          entity_id: activity.id as string,
          gruppo,
        })
        unassignedNotifications++
      }
    }

    // 3. Check pending approvals (events pending > 48 hours)
    const { data: pendingEvents } = await supabase
      .from('events')
      .select('id, titolo, promotore_id, updated_at')
      .eq('stato', 'proposto')

    const pendingThreshold = new Date(
      today.getTime() - APPROVAL_PENDING_HOURS * 60 * 60 * 1000
    )

    for (const event of (pendingEvents || [])) {
      const updatedAt = new Date(event.updated_at as string)
      if (updatedAt > pendingThreshold) continue

      const gruppo = `approval_reminder_${event.id}_${todayStr}`
      const exists = await dedupCheck(supabase, gruppo)
      if (exists) continue

      const approvers = await getUsersWithPermission(supabase, 'approva_eventi')
      for (const userId of approvers) {
        await insertNotification(supabase, {
          user_id: userId,
          tipo: 'approvazione_richiesta',
          titolo: `Approvazione in attesa: ${event.titolo}`,
          messaggio: `Evento in attesa di approvazione da oltre ${APPROVAL_PENDING_HOURS} ore`,
          link: `/eventi/${event.id}`,
          link_label: 'Vai all\'evento',
          entity_type: 'event',
          entity_id: event.id as string,
          gruppo,
        })
        approvalReminders++
      }
    }

    // 3. Check pending preventivi (> 48 hours)
    const { data: pendingPreventivi } = await supabase
      .from('event_preventivi')
      .select('id, event_id, created_at, evento:events!event_preventivi_event_id_fkey(titolo)')
      .eq('stato', 'in_attesa')

    for (const prev of (pendingPreventivi || [])) {
      const createdAt = new Date(prev.created_at as string)
      if (createdAt > pendingThreshold) continue

      const gruppo = `preventivo_reminder_${prev.id}_${todayStr}`
      const exists = await dedupCheck(supabase, gruppo)
      if (exists) continue

      const approvers = await getUsersWithPermission(supabase, 'approva_preventivi')
      const evento = prev.evento as { titolo: string } | null
      for (const userId of approvers) {
        await insertNotification(supabase, {
          user_id: userId,
          tipo: 'preventivo_stato',
          titolo: `Preventivo in attesa di approvazione`,
          messaggio: `Per l'evento "${evento?.titolo || 'N/D'}" - in attesa da oltre ${APPROVAL_PENDING_HOURS} ore`,
          link: `/eventi/${prev.event_id}`,
          link_label: 'Vai all\'evento',
          entity_type: 'event_preventivo',
          entity_id: prev.id as string,
          gruppo,
        })
        approvalReminders++
      }
    }

    // 4. Eventi imminenti — reminder di prontezza a promotore + staff quando
    // data_inizio è a 7/3/1 giorni e l'evento è confermato/in preparazione/pronto.
    const dateToGiorni = new Map<string, number>()
    for (const g of [1, 3, 7]) dateToGiorni.set(isoPlusDays(today, g), g)

    const { data: imminentEvents } = await supabase
      .from('events')
      .select('id, titolo, data_inizio, tipo_evento, modalita, promotore_id')
      .in('stato', ['confermato', 'in_preparazione', 'pronto'])
      .in('data_inizio', [...dateToGiorni.keys()])

    const imminentIds = (imminentEvents || []).map((e: Row) => e.id as string)

    if (imminentIds.length > 0) {
      const [etRes, actRes, prevRes, matRes, staffRes, partRes, hotelRes, trasRes] = await Promise.all([
        supabase.from('event_types').select('codice, richiede_spedizione, richiede_hotel, richiede_trasporti'),
        supabase.from('event_activities').select('event_id, obbligatoria, post_evento, stato').in('event_id', imminentIds),
        supabase.from('event_preventivi').select('event_id, stato').in('event_id', imminentIds),
        supabase.from('event_materials').select('event_id, stato').in('event_id', imminentIds),
        supabase.from('event_staff').select('event_id, user_id, confermato').in('event_id', imminentIds),
        supabase.from('event_participants').select('event_id, contact_id, stato_iscrizione').in('event_id', imminentIds),
        supabase.from('event_hotel').select('event_id, user_id, contact_id, stato').in('event_id', imminentIds),
        supabase.from('event_trasporti').select('event_id, user_id, contact_id, direzione, stato').in('event_id', imminentIds),
      ])

      const flagsByType = new Map<string, EventTypeFlags>()
      for (const et of (etRes.data || []) as Row[]) {
        flagsByType.set(et.codice as string, {
          spedizione: et.richiede_spedizione !== false,
          hotel: et.richiede_hotel !== false,
          trasporti: et.richiede_trasporti !== false,
        })
      }
      const defaultFlags: EventTypeFlags = { spedizione: true, hotel: true, trasporti: true }

      const actByEvent = groupByEvent((actRes.data || []) as Row[])
      const prevByEvent = groupByEvent((prevRes.data || []) as Row[])
      const matByEvent = groupByEvent((matRes.data || []) as Row[])
      const staffByEvent = groupByEvent((staffRes.data || []) as Row[])
      const partByEvent = groupByEvent((partRes.data || []) as Row[])
      const hotelByEvent = groupByEvent((hotelRes.data || []) as Row[])
      const trasByEvent = groupByEvent((trasRes.data || []) as Row[])

      for (const event of (imminentEvents || []) as Row[]) {
        const giorni = dateToGiorni.get(event.data_inizio as string)
        if (!giorni) continue

        const gruppo = `evento_imminente_${event.id}_${giorni}`
        const exists = await dedupCheck(supabase, gruppo)
        if (exists) continue

        const eventId = event.id as string
        const staff = staffByEvent.get(eventId) || []
        const gaps = buildReadinessGaps({
          flags: flagsByType.get(event.tipo_evento as string) || defaultFlags,
          modalita: event.modalita,
          activities: actByEvent.get(eventId) || [],
          preventivi: prevByEvent.get(eventId) || [],
          materials: matByEvent.get(eventId) || [],
          staff,
          participants: partByEvent.get(eventId) || [],
          hotels: hotelByEvent.get(eventId) || [],
          trasporti: trasByEvent.get(eventId) || [],
        })

        const recipients = new Set<string>()
        if (event.promotore_id) recipients.add(event.promotore_id as string)
        for (const s of staff) if (s.user_id) recipients.add(s.user_id as string)

        const quando = giorni === 1 ? 'domani' : `tra ${giorni} giorni`
        const messaggio = gaps.length > 0
          ? `Da completare: ${gaps.join('; ')}.`
          : 'Tutto pronto per l\'evento.'

        for (const userId of recipients) {
          await insertNotification(supabase, {
            user_id: userId,
            tipo: 'evento_imminente',
            titolo: `Evento ${quando}: ${event.titolo}`,
            messaggio,
            link: `/eventi/${eventId}`,
            link_label: 'Vai all\'evento',
            entity_type: 'event',
            entity_id: eventId,
            gruppo,
          })
          imminentNotifications++
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        counts: {
          deadlineNotifications,
          overdueNotifications,
          escalationNotifications,
          unassignedNotifications,
          approvalReminders,
          imminentNotifications,
          activitiesChecked: activeActivities.length,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
