-- ============================================================
-- Intervento 6 — Web Push PWA come secondo canale notifiche
-- Le notifiche esistono solo in-app (realtime a app aperta). Questa tabella
-- registra le subscription Web Push (PushManager) per utente/dispositivo, così
-- una edge function (send-push) può inviare notifiche di sistema anche ad app
-- chiusa. Inerte finché non sono configurate le chiavi VAPID (vedi send-push).
--
-- Ogni browser/dispositivo produce un endpoint univoco: la chiave d'unicità è
-- l'endpoint (upsert on conflict). Un utente può avere più subscription
-- (desktop + telefono). p256dh/auth sono le chiavi di cifratura del payload.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Il proprietario gestisce le proprie subscription. La edge function usa la
-- service_role key (bypassa RLS) per leggere tutte le subscription in invio.
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
