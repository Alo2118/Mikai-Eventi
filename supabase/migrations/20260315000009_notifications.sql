-- Mikai Eventi — Notifications Tables (Spec ref: Section 4.8)
CREATE TYPE notifica_categoria AS ENUM ('nuovo_evento', 'approvazione', 'materiale', 'conflitto', 'scadenza', 'scadenza_altrui', 'rientro_scaduto');
CREATE TYPE notifica_canale AS ENUM ('in_app', 'email', 'digest', 'off');

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  categoria notifica_categoria NOT NULL,
  titolo text NOT NULL,
  messaggio text,
  link text,
  letta boolean DEFAULT false,
  canale_inviato notifica_canale NOT NULL DEFAULT 'in_app',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  canale notifica_canale NOT NULL DEFAULT 'in_app',
  UNIQUE(user_id, categoria)
);

CREATE TYPE suggestion_tipo AS ENUM ('anticipa_scadenza', 'posticipa_scadenza', 'aggiungi_task', 'rimuovi_task');

CREATE TABLE template_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_item_id uuid NOT NULL REFERENCES template_items(id),
  event_id uuid NOT NULL REFERENCES events(id),
  tipo suggestion_tipo NOT NULL,
  dettaglio text,
  applicata boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, letta);
CREATE INDEX idx_notifications_recent ON notifications(created_at DESC);
