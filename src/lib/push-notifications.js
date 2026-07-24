// ============================================================
// push-notifications.js — lato browser del Web Push (PushManager)
//
// Solo logica browser: permessi, subscribe/unsubscribe via PushManager.
// Il salvataggio della subscription nel DB passa dallo store useNotifications
// (regola: chiamate Supabase solo negli store). Qui NON si tocca Supabase.
//
// INERTE senza chiave VAPID: se VITE_VAPID_PUBLIC_KEY non è configurata,
// `pushConfigured()` è false e la UI nasconde l'attivazione push.
// ============================================================

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

/** True se il browser supporta Service Worker + Push + Notification. */
export function isPushSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** True solo se la chiave VAPID pubblica è configurata (feature inerte senza). */
export function pushConfigured() {
  return VAPID_PUBLIC_KEY.length > 0
}

/** Stato attuale del permesso notifiche: 'default' | 'granted' | 'denied'. */
export function getPushPermission() {
  if (typeof Notification === 'undefined') return 'denied'
  return Notification.permission
}

/** Converte la chiave VAPID base64-url in Uint8Array per applicationServerKey. */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/** Serializza una PushSubscription nelle colonne del DB (endpoint/p256dh/auth). */
function serializeSubscription(sub) {
  const json = sub.toJSON()
  return {
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh || '',
    auth: json.keys?.auth || '',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  }
}

/** Ritorna la subscription già registrata su questo dispositivo, o null. */
export async function getExistingSubscription() {
  if (!isPushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub ? serializeSubscription(sub) : null
  } catch {
    return null
  }
}

/**
 * Richiede il permesso e crea una subscription push.
 * Ritorna { data, error }: data = { endpoint, p256dh, auth, user_agent }.
 * error è un messaggio umano in italiano, mai un oggetto.
 */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    return { data: null, error: 'Il tuo dispositivo non supporta le notifiche push.' }
  }
  if (!pushConfigured()) {
    return { data: null, error: 'Le notifiche push non sono ancora configurate.' }
  }

  let permission
  try {
    permission = await Notification.requestPermission()
  } catch {
    return { data: null, error: 'Non siamo riusciti a richiedere il permesso. Riprova.' }
  }
  if (permission !== 'granted') {
    return {
      data: null,
      error:
        'Permesso negato. Attiva le notifiche dalle impostazioni del browser per ricevere gli avvisi.',
    }
  }

  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }
    return { data: serializeSubscription(sub), error: null }
  } catch {
    return {
      data: null,
      error: 'Non siamo riusciti ad attivare le notifiche push. Riprova.',
    }
  }
}

/**
 * Annulla la subscription push su questo dispositivo.
 * Ritorna { endpoint, error }: endpoint della subscription rimossa (per pulire il DB).
 */
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return { endpoint: null, error: null }
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return { endpoint: null, error: null }
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    return { endpoint, error: null }
  } catch {
    return { endpoint: null, error: 'Non siamo riusciti a disattivare le notifiche push.' }
  }
}
