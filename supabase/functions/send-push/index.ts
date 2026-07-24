// ============================================================
// send-push — invia notifiche Web Push ai dispositivi registrati
//
// Secondo canale di notifica (oltre a in-app realtime ed email digest).
// Legge push_subscriptions e rispetta il consenso in notification_preferences
// (mute_types). INERTE senza chiavi VAPID: se VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY
// non sono configurate, la function risponde 200 { skipped: true } senza inviare
// (stesso pattern di email-digest con RESEND_API_KEY assente).
//
// Due modalità:
//   • scan mode — invocata dal cron 'send-push-scan' (ogni minuto) con
//     { mode: 'scan' }. Seleziona le notifiche CRITICHE recenti con pushed_at IS
//     NULL, le invia ai push_subscriptions dei destinatari (rispettando mute_types)
//     e imposta pushed_at=now(). Senza VAPID risponde { skipped:true } e NON marca
//     pushed_at, così i push partono appena le chiavi vengono configurate.
//   • explicit mode — invocata a mano/da altro codice con user_ids + testo.
//
// Contratto POST (JSON):
//   scan:      { mode: 'scan' }
//   explicit:  {
//     user_ids: string[],   // destinatari (oppure user_id: string singolo)
//     tipo?: string,        // tipo notifica → rispetta mute_types per il consenso
//     title: string,
//     body: string,
//     url?: string,         // path relativo o assoluto da aprire al click
//     tag?: string          // raggruppa/sostituisce notifiche con lo stesso tag
//   }
// ============================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

// Tipi notifica "critici" spinti via push in scan mode. Valori allineati al
// CHECK notifications_tipo_check (vedi migrazioni notification_*).
const CRITICAL_TYPES = [
  'approvazione_richiesta', // evento/materiale da approvare
  'materiale_spedito',
  'sollecito_rientro',
  'evento_imminente',
]

// Finestra di recency: in scan mode consideriamo solo le notifiche create di
// recente, per non spingere in blocco lo storico al primo giro con VAPID attivo.
const SCAN_WINDOW_MINUTES = 60
const SCAN_LIMIT = 200

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

interface NotifRow {
  id: string
  user_id: string
  tipo: string
  titolo: string
  messaggio: string | null
  link: string | null
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const jsonResponse = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS })

/** Utenti che hanno silenziato `tipo` in notification_preferences.mute_types. */
async function fetchMutedSet(
  supabase: SupabaseClient,
  userIds: string[],
  tipo: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('user_id, mute_types')
    .in('user_id', userIds)
  return new Set(
    ((data as PrefRow[] | null) || [])
      .filter((p) => Array.isArray(p.mute_types) && p.mute_types.includes(tipo))
      .map((p) => p.user_id)
  )
}

/** Invia il payload a una lista di subscription. Ritorna esito + endpoint scaduti. */
async function deliverToSubs(subs: PushSubRow[], payload: string) {
  let sent = 0
  let failed = 0
  const staleIds: string[] = []
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
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
  return { sent, failed, staleIds }
}

/** Scan mode: spinge le notifiche critiche recenti non ancora pushate. */
async function runScan(supabase: SupabaseClient, hasVapid: boolean) {
  const sinceISO = new Date(Date.now() - SCAN_WINDOW_MINUTES * 60_000).toISOString()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, tipo, titolo, messaggio, link')
    .is('pushed_at', null)
    .in('tipo', CRITICAL_TYPES)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: true })
    .limit(SCAN_LIMIT)

  if (error) return jsonResponse({ ok: false, error: error.message }, 500)

  const notifs = (data as NotifRow[] | null) || []
  if (notifs.length === 0) return jsonResponse({ ok: true, mode: 'scan', processed: 0 })

  // Senza VAPID resta inerte e NON marca pushed_at: le notifiche restano candidate
  // così, appena configuri le chiavi, i push recenti partono al primo giro.
  if (!hasVapid) {
    console.log('[send-push] scan inerte: chiavi VAPID assenti')
    return jsonResponse({ ok: true, mode: 'scan', skipped: true, reason: 'VAPID non configurato', pending: notifs.length })
  }

  const userIds = [...new Set(notifs.map((n) => n.user_id))]
  const { data: subsData } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)
  const subsByUser = new Map<string, PushSubRow[]>()
  for (const s of (subsData as PushSubRow[] | null) || []) {
    const list = subsByUser.get(s.user_id) || []
    list.push(s)
    subsByUser.set(s.user_id, list)
  }

  const { data: prefsData } = await supabase
    .from('notification_preferences')
    .select('user_id, mute_types')
    .in('user_id', userIds)
  const muteByUser = new Map<string, string[]>()
  for (const p of (prefsData as PrefRow[] | null) || []) {
    muteByUser.set(p.user_id, Array.isArray(p.mute_types) ? p.mute_types : [])
  }

  let sent = 0
  let failed = 0
  const allStale: string[] = []
  // Marca pushed_at SOLO se non c'è nulla da ritentare (mute / nessuna subscription / almeno un invio riuscito).
  // Le notifiche con soli fallimenti transitori restano non marcate → il prossimo scan ritenta (entro la finestra di 60 min).
  const markIds: string[] = []
  for (const n of notifs) {
    // Mute rispettato: notifica processata (pushed_at marcato) ma non inviata.
    if ((muteByUser.get(n.user_id) || []).includes(n.tipo)) { markIds.push(n.id); continue }
    const subs = subsByUser.get(n.user_id) || []
    if (subs.length === 0) { markIds.push(n.id); continue }
    const payload = JSON.stringify({
      title: n.titolo,
      body: n.messaggio || '',
      url: n.link || '/Mikai-Eventi/',
      tag: n.tipo,
    })
    const res = await deliverToSubs(subs, payload)
    sent += res.sent
    failed += res.failed
    allStale.push(...res.staleIds)
    // Fallimento solo transitorio (nessun invio riuscito e i fallimenti non sono subscription scadute): non marcare, ritenta.
    const transientOnly = res.sent === 0 && res.failed > res.staleIds.length
    if (!transientOnly) markIds.push(n.id)
  }

  await supabase.from('notifications').update({ pushed_at: new Date().toISOString() }).in('id', markIds)
  if (allStale.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', allStale)
  }

  return jsonResponse({ ok: true, mode: 'scan', candidates: notifs.length, marked: markIds.length, sent, failed, removed: allStale.length })
}

/** Explicit mode: invio diretto a user_ids con testo passato nel body. */
async function runExplicit(supabase: SupabaseClient, hasVapid: boolean, body: Record<string, unknown>) {
  const userIds: string[] = Array.isArray(body.user_ids)
    ? (body.user_ids as string[])
    : body.user_id
      ? [body.user_id as string]
      : []
  const tipo: string | null = (body.tipo as string) || null
  const title: string = (body.title as string) || 'Eventi Mikai'
  const message: string = (body.body as string) || 'Hai un nuovo aggiornamento.'
  const url: string = (body.url as string) || '/Mikai-Eventi/'
  const tag: string | undefined = (body.tag as string) || undefined

  if (userIds.length === 0) {
    return jsonResponse({ ok: false, error: 'Nessun destinatario (user_ids mancante)' }, 400)
  }

  // Feature inerte finché le chiavi VAPID non sono configurate.
  if (!hasVapid) {
    console.log('[send-push] INVIO DISATTIVATO: chiavi VAPID assenti')
    return jsonResponse({ ok: true, skipped: true, reason: 'VAPID non configurato', recipients: userIds.length })
  }

  // Consenso: escludi gli utenti che hanno silenziato questo `tipo`.
  let allowedUserIds = userIds
  if (tipo) {
    const muted = await fetchMutedSet(supabase, userIds, tipo)
    allowedUserIds = userIds.filter((id) => !muted.has(id))
  }
  if (allowedUserIds.length === 0) {
    return jsonResponse({ ok: true, sent: 0, skipped: 0, note: 'Tutti i destinatari hanno silenziato questo tipo' })
  }

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', allowedUserIds)
  if (subsError) return jsonResponse({ ok: false, error: subsError.message }, 500)

  const payload = JSON.stringify({ title, body: message, url, tag })
  const { sent, failed, staleIds } = await deliverToSubs((subs as PushSubRow[] | null) || [], payload)
  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds)
  }
  return jsonResponse({ ok: true, sent, failed, removed: staleIds.length })
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
    const hasVapid = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
    if (hasVapid) {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!)
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

    if (body.mode === 'scan') {
      return await runScan(supabase, hasVapid)
    }
    return await runExplicit(supabase, hasVapid, body)
  } catch (err) {
    return jsonResponse({ ok: false, error: (err as Error).message }, 500)
  }
})
