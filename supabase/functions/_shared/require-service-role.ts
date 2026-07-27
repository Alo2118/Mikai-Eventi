// Guardia di autorizzazione condivisa per le Edge Functions invocate SOLO dal cron.
//
// Contesto (#5): tutte le function (send-push, email-digest, deadline-checker,
// overdue-returns-checker) sono invocate esclusivamente da pg_cron con
// `Authorization: Bearer <service_role_key>` (vedi migrazioni *_cron.sql) e NON
// sono mai chiamate dal frontend. Senza questo controllo, chiunque possieda la anon
// key pubblica (nel bundle) poteva invocarle (spam email/push, notifiche spoofate).
//
// La piattaforma Supabase verifica già la FIRMA del JWT (verify_jwt attivo di
// default). Qui verifichiamo solo che il claim `role` sia `service_role`, così anon
// e utenti autenticati vengono rifiutati.

export function requireServiceRole(req: Request): Response | null {
  const header = req.headers.get('Authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token) return deny(401, 'Non autenticato')

  try {
    const parts = token.split('.')
    if (parts.length < 2) return deny(401, 'Token non valido')
    // base64url → base64 + padding
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    b64 += '='.repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(atob(b64))
    if (payload.role !== 'service_role') {
      return deny(403, 'Accesso consentito solo al processo interno (service role)')
    }
    return null // ok
  } catch {
    return deny(401, 'Token non valido')
  }
}

function deny(status: number, error: string): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
