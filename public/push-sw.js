/* eslint-disable no-restricted-globals */
// ============================================================
// push-sw.js — handler Web Push per il service worker Mikai Eventi
//
// Questo file NON è il service worker principale: viene iniettato dentro il SW
// generato da vite-plugin-pwa (workbox generateSW) tramite `importScripts`
// (vedi vite.config.js). Aggiunge SOLO gli handler 'push' e 'notificationclick'
// senza toccare il precache/routing di workbox.
//
// Il payload atteso (inviato dalla edge function send-push) è JSON:
//   { title, body, url, tag, icon }
// Tutti i campi sono opzionali: se il payload è vuoto o non-JSON, mostriamo un
// avviso generico in italiano.
// ============================================================

const DEFAULT_ICON = '/Mikai-Eventi/icons/icon-192.svg'
const APP_SCOPE = '/Mikai-Eventi/'

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    // Payload non-JSON (o assente): fallback generico
    payload = { body: event.data && event.data.text ? event.data.text() : '' }
  }

  const title = payload.title || 'Eventi Mikai'
  const options = {
    body: payload.body || 'Hai un nuovo aggiornamento.',
    icon: payload.icon || DEFAULT_ICON,
    badge: DEFAULT_ICON,
    tag: payload.tag || undefined,
    // Ricarica una notifica esistente con lo stesso tag invece di accumularle
    renotify: Boolean(payload.tag),
    data: { url: payload.url || APP_SCOPE },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = (event.notification.data && event.notification.data.url) || APP_SCOPE

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se l'app è già aperta, portala in primo piano e naviga
        for (const client of clientList) {
          if (client.url.includes(APP_SCOPE) && 'focus' in client) {
            client.focus()
            if ('navigate' in client && targetUrl) {
              client.navigate(targetUrl).catch(() => {})
            }
            return
          }
        }
        // Altrimenti apri una nuova finestra
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
  )
})
