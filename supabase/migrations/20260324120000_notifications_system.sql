-- Migration: Notifications system tables
-- Phase 5B: In-app notifications + preferences

-- ============================================================
-- 1. Drop legacy tables from migration 20260315000009
-- ============================================================
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS template_suggestions CASCADE;
DROP TYPE IF EXISTS notifica_categoria;
DROP TYPE IF EXISTS notifica_canale;

-- ============================================================
-- 2. notifications table
-- ============================================================
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,
  titolo        TEXT NOT NULL,
  messaggio     TEXT,
  link          TEXT,
  link_label    TEXT,
  letta         BOOLEAN NOT NULL DEFAULT false,
  entity_type   TEXT,
  entity_id     UUID,
  gruppo        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CHECK constraint for tipo (not an ENUM — easier to extend)
ALTER TABLE notifications ADD CONSTRAINT notifications_tipo_check
  CHECK (tipo IN (
    'approvazione_richiesta',
    'approvazione_completata',
    'attivita_scaduta',
    'attivita_in_scadenza',
    'attivita_assegnata',
    'conflitto_materiale',
    'rientro_scaduto',
    'preventivo_stato',
    'evento_stato_cambiato',
    'escalation'
  ));

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, letta) WHERE letta = false;
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- ============================================================
-- 4. RLS policies
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Triggers run as SECURITY DEFINER (bypass RLS), so this policy covers
-- only frontend-initiated inserts (e.g. conflict notifications from useMaterials).
-- Restrict to own user_id to prevent spoofing.
CREATE POLICY "Authenticated users insert own notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 5. notification_preferences table
-- ============================================================
CREATE TABLE notification_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_daily   BOOLEAN NOT NULL DEFAULT true,
  email_weekly  BOOLEAN NOT NULL DEFAULT true,
  mute_types    TEXT[] NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 6. Enable Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
