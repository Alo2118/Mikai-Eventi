// ============================================================
// send-push — invia notifiche Web Push ai dispositivi registrati
//
// Secondo canale di notifica (oltre a in-app realtime ed email digest).
// Legge push_subscriptions e rispetta il consenso in notification_preferences
// (mute_types). INERTE senza chiavi VAPID: se VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY
// non sono configurate, la function risponde 200 { skipped: true } senza inviare
// (stesso pattern di email-digest con RESEND_API_KEY assente).
//
// Aggancio (da fare in DB, vedi needsUser): invocare questa function dai punti
// critici — evento da approvare, materiale spedito, sollecito rientro — passando
// gli user_ids destinatari e il testo. In alternativa, un trigger/cron può
// leggere le `notifications` non ancora "pushate" e chiamarla in batch.
//
// Contratto POST (JSON):
//   {
//     user_ids: string[],   // destinatari (oppure user_id: string singolo)
//     tipo?: string,        // tipo notifica → rispetta mute_types per il consenso
//     title: string,
//     body: string,
//     url?: string,         // path relativo o assoluto da aprire al click
//     tag?: string          // raggruppa/sostituisce notifiche con lo stesso tag
//   }
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

interface PushSubRow {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

interface PrefRow {
  user_id: string
  mute_types: string[]
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:eventi@mikai.it'

    const body = await req.json().catch(() => ({}))
    const userIds: string[] = Array.isArray(body.user_ids)
      ? body.user_ids
      : body.user_id
        ? [body.user_id]
        : []
    const tipo: string | null = body.tipo || null
    const title: string = body.title || 'Eventi Mikai'
    const message: string = body.body || 'Hai un nuovo aggiornamento.'
    const url: string = body.url || '/Mikai-Eventi/'
    const tag: string | undefined = body.tag || undefined

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Nessun destinatario (user_ids mancante)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Feature inerte finché le chiavi VAPID non sono configurate.
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.log('[send-push] INVIO DISATTIVATO: chiavi VAPID assenti')
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          reason: 'VAPID non configurato',
          recipients: userIds.length,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    // Consenso: escludi gli utenti che hanno silenziato questo `tipo`.
    let allowedUserIds = userIds
    if (tipo) {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('user_id, mute_types')
        .in('user_id', userIds)
      const muted = new Set(
        (prefs as PrefRow[] | null || [])
          .filter((p) => Array.isArray(p.mute_types) && p.mute_types.includes(tipo))
          .map((p) => p.user_id)
      )
      allowedUserIds = userIds.filter((id) => !muted.has(id))
    }

    if (allowedUserIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, skipped: 0, note: 'Tutti i destinatari hanno silenziato questo tipo' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .in('user_id', allowedUserIds)

    if (subsError) {
      return new Response(
        JSON.stringify({ ok: false, error: subsError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const payload = JSON.stringify({ title, body: message, url, tag })
    let sent = 0
    let failed = 0
    const staleIds: string[] = []

    for (const sub of (subs as PushSubRow[] | null) || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
        sent++
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        // 404/410 = subscription scaduta o revocata → rimuovila dal DB
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id)
        } else {
          failed++
          console.error(`[send-push] invio fallito (${statusCode ?? '?'}): ${(err as Error).message}`)
        }
      }
    }

    if (staleIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', staleIds)
    }

    return new Response(
      JSON.stringify({ ok: true, sent, failed, removed: staleIds.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
