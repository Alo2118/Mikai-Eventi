-- Mikai Eventi — Workflow Tables (Spec ref: Section 4.7)
CREATE TYPE task_tipo AS ENUM ('checklist', 'approvazione', 'verifica', 'marketing', 'generico');
CREATE TYPE task_priorita AS ENUM ('bassa', 'normale', 'alta');
CREATE TYPE audit_entita AS ENUM ('event', 'material', 'material_request', 'document', 'cost', 'user', 'participant', 'task', 'staff');
CREATE TYPE audit_azione AS ENUM ('creato', 'modificato', 'approvato', 'rifiutato', 'cancellato', 'stato_cambiato');

CREATE TABLE event_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tipo task_tipo NOT NULL DEFAULT 'checklist',
  descrizione text NOT NULL,
  assegnato_a uuid REFERENCES users(id),
  data_scadenza date,
  priorita task_priorita NOT NULL DEFAULT 'normale',
  obbligatorio boolean DEFAULT true,
  pre_approvazione boolean DEFAULT false,
  completato boolean DEFAULT false,
  completato_il timestamptz,
  completato_da uuid REFERENCES users(id),
  feedback_post text,
  generato_da_template boolean DEFAULT false,
  template_item_id uuid REFERENCES template_items(id),
  ordine integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entita_tipo audit_entita NOT NULL,
  entita_id uuid NOT NULL,
  azione audit_azione NOT NULL,
  campo_modificato text,
  valore_precedente text,
  valore_nuovo text,
  eseguito_da uuid NOT NULL REFERENCES users(id),
  commento text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tasks_event ON event_tasks(event_id);
CREATE INDEX idx_tasks_assegnato ON event_tasks(assegnato_a) WHERE completato = false;
CREATE INDEX idx_tasks_scadenza ON event_tasks(data_scadenza) WHERE completato = false;
CREATE INDEX idx_activity_entita ON activity_log(entita_tipo, entita_id);
CREATE INDEX idx_activity_user ON activity_log(eseguito_da);
