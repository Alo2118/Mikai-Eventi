-- Mikai Eventi — Logistics Tables (Spec ref: Section 4.5)
CREATE TYPE logistics_record_tipo AS ENUM ('trasporto', 'alloggio', 'transfer');
CREATE TYPE mezzo_tipo AS ENUM ('treno', 'aereo', 'auto', 'bus', 'altro');

CREATE TABLE event_sub_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tipo sub_activity_tipo NOT NULL,
  data_ora timestamptz,
  durata_minuti integer,
  luogo text,
  indirizzo text,
  n_partecipanti_previsti integer,
  fornitore text,
  confermata boolean DEFAULT false,
  template_item_id uuid REFERENCES template_items(id),
  generato_da_template boolean DEFAULT false,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE event_logistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id),
  user_id uuid REFERENCES users(id),
  persona_nome text,
  tipo logistics_record_tipo NOT NULL,
  mezzo mezzo_tipo,
  da_luogo text,
  a_luogo text,
  data_ora_partenza timestamptz,
  data_ora_arrivo timestamptz,
  compagnia text,
  codice_prenotazione text,
  hotel_nome text,
  hotel_indirizzo text,
  check_in date,
  check_out date,
  n_notti integer,
  prenotazione_confermata boolean DEFAULT false,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sub_activities_event ON event_sub_activities(event_id);
CREATE INDEX idx_logistics_event ON event_logistics(event_id);
