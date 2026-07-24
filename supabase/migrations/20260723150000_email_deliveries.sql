-- Mikai Eventi — Log invii email digest
-- Registra ogni tentativo di invio del digest (inviata / errore / saltata)
-- effettuato dalla edge function email-digest.

CREATE TABLE IF NOT EXISTS email_deliveries (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  mode      TEXT,
  subject   TEXT,
  status    TEXT NOT NULL CHECK (status IN ('inviata', 'errore', 'saltata')),
  error     TEXT,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_user_id ON email_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_sent_at ON email_deliveries(sent_at);

ALTER TABLE email_deliveries ENABLE ROW LEVEL SECURITY;

-- Sola lettura: il proprietario vede i propri invii, l'admin vede tutto.
-- Gli inserimenti avvengono solo dalla edge function con service role (bypassa RLS).
DROP POLICY IF EXISTS "email_deliveries_read" ON email_deliveries;
CREATE POLICY "email_deliveries_read" ON email_deliveries
  FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() = 'admin');
