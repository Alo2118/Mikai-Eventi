-- Mikai Eventi — Events Tables (Spec ref: Section 4.2, 5.5)
CREATE TYPE evento_tipo AS ENUM ('workshop', 'corso', 'congresso', 'convegno', 'cadaver_lab', 'live_surgery');
CREATE TYPE evento_modalita AS ENUM ('interno', 'esterno', 'contributo');
CREATE TYPE evento_stato AS ENUM ('proposto', 'confermato', 'in_preparazione', 'pronto', 'in_corso', 'concluso', 'cancellato');
CREATE TYPE evento_ricorrenza AS ENUM ('annuale', 'semestrale');

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo text NOT NULL,
  tipo_evento evento_tipo NOT NULL,
  modalita evento_modalita NOT NULL,
  luogo text,
  sede_dettaglio text,
  data_inizio date,
  data_fine date,
  desk_richiesto boolean DEFAULT false,
  n_postazioni integer,
  stato evento_stato NOT NULL DEFAULT 'proposto',
  motivo_cancellazione text,
  parent_event_id uuid REFERENCES events(id),
  promotore_id uuid NOT NULL REFERENCES users(id),
  manager_user_id uuid REFERENCES users(id),
  clonato_da_id uuid REFERENCES events(id),
  budget_previsto decimal,
  ricorrenza evento_ricorrenza,
  mese_tipico integer CHECK (mese_tipico BETWEEN 1 AND 12),
  note text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT cancellazione_motivo CHECK (
    stato != 'cancellato' OR motivo_cancellazione IS NOT NULL
  )
);

CREATE TABLE event_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_evento evento_tipo NOT NULL,
  modalita evento_modalita NOT NULL,
  nome_template text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TYPE template_item_tipo AS ENUM ('checklist', 'sub_activity', 'logistics');
CREATE TYPE sub_activity_tipo AS ENUM ('pranzo', 'cena', 'aperitivo', 'coffee_break', 'meeting', 'altro');
CREATE TYPE logistics_tipo AS ENUM ('trasporto', 'alloggio');

CREATE TABLE template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
  tipo template_item_tipo NOT NULL,
  descrizione text NOT NULL,
  assegnazione_ruolo_operativo text,
  giorni_prima_evento integer NOT NULL DEFAULT 0,
  obbligatorio boolean DEFAULT true,
  pre_approvazione boolean DEFAULT false,
  ordine integer NOT NULL DEFAULT 0,
  sub_tipo sub_activity_tipo,
  n_pax_default integer,
  logistics_tipo logistics_tipo,
  CONSTRAINT sub_tipo_check CHECK (tipo != 'sub_activity' OR sub_tipo IS NOT NULL),
  CONSTRAINT logistics_tipo_check CHECK (tipo != 'logistics' OR logistics_tipo IS NOT NULL)
);

CREATE TABLE approval_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_evento evento_tipo,
  soglia_importo decimal NOT NULL,
  area_manager_can_approve boolean DEFAULT true
);

CREATE INDEX idx_events_stato ON events(stato);
CREATE INDEX idx_events_date ON events(data_inizio, data_fine);
CREATE INDEX idx_events_promotore ON events(promotore_id);
CREATE INDEX idx_events_manager ON events(manager_user_id);
CREATE INDEX idx_events_tipo ON events(tipo_evento);
CREATE INDEX idx_template_items_template ON template_items(template_id);
