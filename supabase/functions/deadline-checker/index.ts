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
    let approvalReminders = 0

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

    // 2. Check pending approvals (events pending > 48 hours)
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

    return new Response(
      JSON.stringify({
        ok: true,
        counts: {
          deadlineNotifications,
          overdueNotifications,
          escalationNotifications,
          approvalReminders,
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
