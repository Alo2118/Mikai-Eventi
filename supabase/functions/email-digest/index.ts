import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface DigestSection {
  title: string
  items: string[]
}

interface UserRow {
  id: string
  nome: string
  cognome: string
  email: string
  attivo: boolean
}

interface PreferenceRow {
  user_id: string
  email_daily: boolean
  email_weekly: boolean
  mute_types: string[]
}

function buildEmailHtml(
  user: UserRow,
  sections: DigestSection[],
  mode: string,
  dateStr: string
): string {
  const sectionHtml = sections
    .map(
      (s) => `
      <tr>
        <td style="padding: 16px 24px;">
          <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #1f2937; border-bottom: 2px solid #3296dc; padding-bottom: 8px;">
            ${s.title}
          </h2>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            ${s.items.map((item) => `<li style="margin-bottom: 6px; font-size: 14px;">${item}</li>`).join('')}
          </ul>
        </td>
      </tr>`
    )
    .join('')

  const modeLabel = mode === 'daily' ? 'Riepilogo giornaliero' : 'Riepilogo settimanale'

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #3296dc; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">MIKAI EVENTI</h1>
              <p style="margin: 8px 0 0 0; color: #dbeafe; font-size: 14px;">${modeLabel} &mdash; ${dateStr}</p>
            </td>
          </tr>
          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 24px 8px 24px;">
              <p style="margin: 0; font-size: 15px; color: #374151;">Ciao <strong>${user.nome}</strong>,</p>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">Ecco il tuo riepilogo:</p>
            </td>
          </tr>
          <!-- Sections -->
          ${sectionHtml}
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <a href="https://mikai.github.io/Eventi/" style="display: inline-block; background-color: #3296dc; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">Apri Mikai Eventi</a>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #9ca3af;">Per modificare le preferenze di notifica, vai su Notifiche &gt; Preferenze nell'app.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json().catch(() => ({}))
    const mode: string = body.mode || 'daily'

    const today = new Date()
    const todayStr = today.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Fetch all users and preferences
    const { data: users } = await supabase
      .from('users')
      .select('id, nome, cognome, email, attivo')
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')

    const prefsMap: Record<string, PreferenceRow> = Object.fromEntries(
      (prefs || []).map((p: PreferenceRow) => [p.user_id, p])
    )

    // Fetch user permissions for filtering
    const { data: allPermissions } = await supabase
      .from('user_permissions')
      .select('user_id, permission')
    const userPermsMap: Record<string, string[]> = {}
    for (const p of (allPermissions || [])) {
      if (!userPermsMap[p.user_id]) userPermsMap[p.user_id] = []
      userPermsMap[p.user_id].push(p.permission)
    }

    let emailsSent = 0
    let emailsSkipped = 0

    for (const user of (users || []) as UserRow[]) {
      if (!user.attivo || !user.email) {
        emailsSkipped++
        continue
      }

      const userPrefs: PreferenceRow = prefsMap[user.id] || {
        user_id: user.id,
        email_daily: true,
        email_weekly: true,
        mute_types: [],
      }

      if (mode === 'daily' && !userPrefs.email_daily) {
        emailsSkipped++
        continue
      }
      if (mode === 'weekly' && !userPrefs.email_weekly) {
        emailsSkipped++
        continue
      }

      const userPermissions = userPermsMap[user.id] || []
      const sections: DigestSection[] = []

      if (mode === 'daily') {
        // a. Pending approvals
        if (
          userPermissions.includes('approva_eventi') ||
          userPermissions.includes('approva_preventivi')
        ) {
          const pendingItems: string[] = []

          if (userPermissions.includes('approva_eventi')) {
            const { data: pendingEvents } = await supabase
              .from('events')
              .select('id, titolo')
              .eq('stato', 'proposto')
            for (const e of (pendingEvents || [])) {
              pendingItems.push(`Evento "${e.titolo}" in attesa di approvazione`)
            }
          }

          if (userPermissions.includes('approva_preventivi')) {
            const { data: pendingPrev } = await supabase
              .from('event_preventivi')
              .select('id, evento:events!event_preventivi_event_id_fkey(titolo)')
              .eq('stato', 'in_attesa')
            for (const p of (pendingPrev || [])) {
              const evento = p.evento as { titolo: string } | null
              pendingItems.push(
                `Preventivo per "${evento?.titolo || 'N/D'}" in attesa`
              )
            }
          }

          if (pendingItems.length > 0) {
            sections.push({
              title: 'Approvazioni in attesa',
              items: pendingItems,
            })
          }
        }

        // b. Activities expiring within 3 days
        const threeDaysFromNow = new Date(
          today.getTime() + 3 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .slice(0, 10)
        const todayIso = today.toISOString().slice(0, 10)

        const { data: expiringActivities } = await supabase
          .from('event_activities')
          .select(
            'id, descrizione, deadline, evento:events!event_activities_event_id_fkey(titolo)'
          )
          .in('stato', ['da_fare', 'in_corso'])
          .eq('assegnato_a', user.id)
          .gte('deadline', todayIso)
          .lte('deadline', threeDaysFromNow)

        if (expiringActivities && expiringActivities.length > 0) {
          sections.push({
            title: 'Attivita in scadenza (prossimi 3 giorni)',
            items: expiringActivities.map((a) => {
              const evento = a.evento as { titolo: string } | null
              return `"${a.descrizione}" per "${evento?.titolo || 'N/D'}" - scadenza ${a.deadline}`
            }),
          })
        }

        // c. Overdue activities assigned to user
        const { data: overdueActivities } = await supabase
          .from('event_activities')
          .select(
            'id, descrizione, deadline, evento:events!event_activities_event_id_fkey(titolo)'
          )
          .in('stato', ['da_fare', 'in_corso'])
          .eq('assegnato_a', user.id)
          .lt('deadline', todayIso)

        if (overdueActivities && overdueActivities.length > 0) {
          sections.push({
            title: 'Attivita scadute',
            items: overdueActivities.map((a) => {
              const evento = a.evento as { titolo: string } | null
              return `"${a.descrizione}" per "${evento?.titolo || 'N/D'}" - scaduta il ${a.deadline}`
            }),
          })
        }

        // d. Events happening today
        const { data: todayEvents } = await supabase
          .from('events')
          .select('id, titolo, luogo')
          .lte('data_inizio', todayIso)
          .gte('data_fine', todayIso)
          .not('stato', 'in', '("cancellato","rifiutato")')

        if (todayEvents && todayEvents.length > 0) {
          sections.push({
            title: 'Eventi di oggi',
            items: todayEvents.map(
              (e) => `"${e.titolo}"${e.luogo ? ` - ${e.luogo}` : ''}`
            ),
          })
        }

        // e. Overdue returns (only for warehouse users)
        if (userPermissions.includes('gestione_magazzino')) {
          const { data: overdueReturns } = await supabase
            .from('material_movements')
            .select(
              '*, material:materials!material_movements_material_id_fkey(nome, posizione_attuale)'
            )
            .eq('tipo', 'uscita')
            .lt('data_rientro_prevista', todayIso)

          const overdueItems = (overdueReturns || []).filter(
            (m: Record<string, unknown>) => {
              const material = m.material as {
                posizione_attuale: string
              } | null
              return material && material.posizione_attuale !== 'in_magazzino'
            }
          )

          if (overdueItems.length > 0) {
            sections.push({
              title: 'Rientri materiale scaduti',
              items: overdueItems.map((m: Record<string, unknown>) => {
                const material = m.material as { nome: string }
                return `"${material.nome}" - rientro previsto ${m.data_rientro_prevista}`
              }),
            })
          }
        }
      }

      if (mode === 'weekly') {
        // a. Events this week
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay() + 1) // Monday
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6) // Sunday

        const weekStartStr = weekStart.toISOString().slice(0, 10)
        const weekEndStr = weekEnd.toISOString().slice(0, 10)

        const { data: weekEvents } = await supabase
          .from('events')
          .select('id, titolo, data_inizio, luogo')
          .gte('data_inizio', weekStartStr)
          .lte('data_inizio', weekEndStr)
          .not('stato', 'in', '("cancellato","rifiutato")')
          .order('data_inizio', { ascending: true })

        if (weekEvents && weekEvents.length > 0) {
          sections.push({
            title: 'Eventi questa settimana',
            items: weekEvents.map(
              (e) =>
                `${e.data_inizio} - "${e.titolo}"${e.luogo ? ` (${e.luogo})` : ''}`
            ),
          })
        }

        // b. Last week summary
        const lastWeekStart = new Date(weekStart)
        lastWeekStart.setDate(lastWeekStart.getDate() - 7)
        const lastWeekEnd = new Date(weekStart)
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)

        const { count: completedEvents } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('stato', 'concluso')
          .gte('data_fine', lastWeekStart.toISOString().slice(0, 10))
          .lte('data_fine', lastWeekEnd.toISOString().slice(0, 10))

        const { count: completedActivities } = await supabase
          .from('event_activities')
          .select('id', { count: 'exact', head: true })
          .eq('stato', 'completata')
          .gte('updated_at', lastWeekStart.toISOString())
          .lte('updated_at', lastWeekEnd.toISOString())

        if ((completedEvents ?? 0) > 0 || (completedActivities ?? 0) > 0) {
          sections.push({
            title: 'Riepilogo settimana scorsa',
            items: [
              `${completedEvents ?? 0} eventi conclusi`,
              `${completedActivities ?? 0} attivita completate`,
            ],
          })
        }

        // c. Budget alerts (preventivi with costs exceeding 20%)
        if (userPermissions.includes('gestione_costi')) {
          const { data: budgetAlerts } = await supabase
            .from('event_preventivi')
            .select(
              'id, importo, evento:events!event_preventivi_event_id_fkey(id, titolo, budget_previsto)'
            )
            .eq('stato', 'approvato')

          const alertItems: string[] = []
          for (const prev of (budgetAlerts || [])) {
            const evento = prev.evento as {
              id: string
              titolo: string
              budget_previsto: number | null
            } | null
            if (evento?.budget_previsto && prev.importo) {
              const ratio = (prev.importo as number) / evento.budget_previsto
              if (ratio > 1.2) {
                alertItems.push(
                  `"${evento.titolo}" - preventivo supera il budget del ${Math.round((ratio - 1) * 100)}%`
                )
              }
            }
          }

          if (alertItems.length > 0) {
            sections.push({
              title: 'Avvisi budget',
              items: alertItems,
            })
          }
        }

        // d. Critical overdue activities
        const todayIso = today.toISOString().slice(0, 10)
        const criticalThreshold = new Date(
          today.getTime() - 7 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .slice(0, 10)

        const { data: criticalActivities } = await supabase
          .from('event_activities')
          .select(
            'id, descrizione, deadline, evento:events!event_activities_event_id_fkey(titolo, stato)'
          )
          .in('stato', ['da_fare', 'in_corso'])
          .eq('obbligatoria', true)
          .lt('deadline', todayIso)
          .gt('deadline', criticalThreshold)

        const criticalItems = (criticalActivities || []).filter(
          (a: Record<string, unknown>) => {
            const evento = a.evento as { stato: string } | null
            return (
              evento &&
              !['cancellato', 'rifiutato', 'concluso'].includes(evento.stato)
            )
          }
        )

        if (criticalItems.length > 0) {
          sections.push({
            title: 'Attivita critiche scadute',
            items: criticalItems.map((a: Record<string, unknown>) => {
              const evento = a.evento as { titolo: string }
              return `"${a.descrizione}" per "${evento.titolo}" - scaduta il ${a.deadline}`
            }),
          })
        }
      }

      // Filter out muted notification types from sections
      if (userPrefs.mute_types && userPrefs.mute_types.length > 0) {
        // Muted types affect which sections are included
        // Map section titles to notification types
        const sectionTypeMap: Record<string, string> = {
          'Approvazioni in attesa': 'approvazione_richiesta',
          'Attivita in scadenza (prossimi 3 giorni)': 'attivita_in_scadenza',
          'Attivita scadute': 'attivita_scaduta',
          'Rientri materiale scaduti': 'rientro_scaduto',
          'Attivita critiche scadute': 'attivita_scaduta',
          'Avvisi budget': 'preventivo_stato',
        }

        const filteredSections = sections.filter((s) => {
          const tipo = sectionTypeMap[s.title]
          return !tipo || !userPrefs.mute_types.includes(tipo)
        })
        sections.length = 0
        sections.push(...filteredSections)
      }

      // Skip if nothing to report
      if (sections.length === 0) {
        emailsSkipped++
        continue
      }

      // Build email HTML
      const html = buildEmailHtml(user, sections, mode, todayStr)
      const subject =
        mode === 'daily'
          ? `[Mikai Eventi] Riepilogo giornaliero`
          : `[Mikai Eventi] Riepilogo settimanale`

      // Log digest content (actual email sending via Resend/SendGrid to be added later)
      console.log(`[email-digest] ${mode} digest for ${user.email}:`)
      console.log(`  Subject: ${subject}`)
      console.log(`  Sections: ${sections.map((s) => s.title).join(', ')}`)
      console.log(
        `  Total items: ${sections.reduce((sum, s) => sum + s.items.length, 0)}`
      )

      // TODO: Uncomment when email provider is configured
      // const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
      // if (RESEND_API_KEY) {
      //   await fetch('https://api.resend.com/emails', {
      //     method: 'POST',
      //     headers: {
      //       'Authorization': `Bearer ${RESEND_API_KEY}`,
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({
      //       from: 'Mikai Eventi <noreply@mikai.it>',
      //       to: [user.email],
      //       subject,
      //       html,
      //     }),
      //   })
      // }

      emailsSent++
    }

    return new Response(
      JSON.stringify({
        ok: true,
        mode,
        emailsSent,
        emailsSkipped,
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
