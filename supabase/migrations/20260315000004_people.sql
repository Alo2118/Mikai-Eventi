-- Mikai Eventi — People Tables (Spec ref: Section 4.4)
CREATE TYPE ruolo_evento AS ENUM ('formatore', 'responsabile', 'staff', 'commerciale', 'relatore', 'ospite');
CREATE TYPE participant_tipo AS ENUM ('discente', 'relatore_esterno', 'ospite', 'accompagnatore');
CREATE TYPE iscrizione_stato AS ENUM ('invitato', 'confermato', 'presente', 'assente');

CREATE TABLE event_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  ruolo_evento ruolo_evento NOT NULL,
  confermato boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id),
  tipo participant_tipo NOT NULL,
  stato_iscrizione iscrizione_stato NOT NULL DEFAULT 'invitato',
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, contact_id)
);

CREATE INDEX idx_staff_event ON event_staff(event_id);
CREATE INDEX idx_staff_user ON event_staff(user_id);
CREATE INDEX idx_participants_event ON event_participants(event_id);
CREATE INDEX idx_participants_contact ON event_participants(contact_id);
