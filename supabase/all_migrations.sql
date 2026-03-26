-- Mikai Eventi — Core Tables (Spec ref: Section 4.1)
CREATE TYPE user_role AS ENUM ('admin', 'direzione', 'ufficio', 'area_manager', 'commerciale');
CREATE TYPE permission_type AS ENUM ('approva_eventi', 'approva_materiale', 'gestione_costi', 'compliance', 'gestione_utenti');

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  nome text NOT NULL,
  cognome text NOT NULL,
  telefono text,
  avatar_url text,
  ruolo user_role NOT NULL DEFAULT 'commerciale',
  ruoli_operativi text[] DEFAULT '{}',
  responsabile_id uuid REFERENCES users(id),
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission permission_type NOT NULL,
  UNIQUE(user_id, permission)
);

CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cognome text NOT NULL,
  email text,
  telefono text,
  ente_ospedaliero text,
  ruolo_medico text,
  specializzazione text,
  note text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_users_ruolo ON users(ruolo);
CREATE INDEX idx_users_responsabile ON users(responsabile_id);
CREATE INDEX idx_users_attivo ON users(attivo);
CREATE INDEX idx_contacts_nome ON contacts(nome, cognome);
CREATE INDEX idx_contacts_ente ON contacts(ente_ospedaliero);
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
-- Mikai Eventi — Materials Tables (Spec ref: Section 4.3)
CREATE TYPE material_tipo AS ENUM ('demo_kit', 'montaggio', 'strumentario', 'altro');
CREATE TYPE material_posizione AS ENUM ('magazzino', 'evento', 'agente', 'spedito', 'manutenzione');
CREATE TYPE material_request_stato AS ENUM ('richiesto', 'approvato', 'rifiutato');
CREATE TYPE movement_tipo AS ENUM ('uscita', 'rientro', 'trasferimento');
CREATE TYPE movement_modalita AS ENUM ('spedizione', 'mano', 'gia_in_loco', 'trasferimento_da_altro_evento');
CREATE TYPE rientro_stato AS ENUM ('integro', 'parziale', 'danneggiato');
CREATE TYPE gadget_request_stato AS ENUM ('richiesto', 'pronto', 'consegnato');

CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo material_tipo NOT NULL,
  codice_inventario text UNIQUE,
  quantita_totale integer NOT NULL DEFAULT 1,
  posizione_attuale material_posizione NOT NULL DEFAULT 'magazzino',
  posizione_dettaglio text,
  foto_url text,
  note text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE event_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id),
  quantita_richiesta integer NOT NULL DEFAULT 1,
  data_inizio_utilizzo date NOT NULL,
  data_fine_utilizzo date NOT NULL,
  stato material_request_stato NOT NULL DEFAULT 'richiesto',
  richiesto_da uuid NOT NULL REFERENCES users(id),
  approvato_da uuid REFERENCES users(id),
  data_richiesta timestamptz DEFAULT now(),
  data_approvazione timestamptz,
  note text,
  CONSTRAINT date_range_valid CHECK (data_fine_utilizzo >= data_inizio_utilizzo)
);

CREATE TABLE material_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id),
  event_id uuid REFERENCES events(id),
  tipo movement_tipo NOT NULL,
  modalita movement_modalita NOT NULL,
  da_posizione text,
  a_posizione text,
  data_movimento timestamptz NOT NULL DEFAULT now(),
  data_rientro_prevista date,
  responsabile_id uuid NOT NULL REFERENCES users(id),
  tracking_spedizione text,
  stato_rientro rientro_stato,
  quantita_rientrata integer,
  note_danni text,
  foto_danno_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT rientro_check CHECK (tipo != 'rientro' OR stato_rientro IS NOT NULL)
);

CREATE TABLE gadgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descrizione text,
  foto_url text,
  quantita_disponibile integer NOT NULL DEFAULT 0,
  soglia_minima integer NOT NULL DEFAULT 10,
  fornitore_abituale text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE event_gadgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  gadget_id uuid NOT NULL REFERENCES gadgets(id),
  quantita_richiesta integer NOT NULL DEFAULT 0,
  quantita_consegnata integer DEFAULT 0,
  stato gadget_request_stato NOT NULL DEFAULT 'richiesto',
  note text
);

CREATE INDEX idx_event_materials_conflict ON event_materials(material_id, data_inizio_utilizzo, data_fine_utilizzo) WHERE stato != 'rifiutato';
CREATE INDEX idx_event_materials_event ON event_materials(event_id);
CREATE INDEX idx_movements_material ON material_movements(material_id);
CREATE INDEX idx_movements_event ON material_movements(event_id);
CREATE INDEX idx_movements_rientro ON material_movements(data_rientro_prevista) WHERE tipo = 'uscita' AND data_rientro_prevista IS NOT NULL;
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
-- Mikai Eventi — Costs Table (Spec ref: Section 4.6)
CREATE TYPE cost_source AS ENUM ('sub_activity', 'logistics', 'materiale', 'sponsorizzazione', 'iscrizioni', 'desk', 'gadget', 'altro');
CREATE TYPE payment_stato AS ENUM ('da_pagare', 'pagato', 'parzialmente_pagato');

CREATE TABLE event_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_tipo cost_source NOT NULL,
  source_id uuid,
  contact_id uuid REFERENCES contacts(id),
  descrizione text,
  importo_previsto decimal,
  importo_effettivo decimal,
  fornitore text,
  n_fattura text,
  stato_pagamento payment_stato NOT NULL DEFAULT 'da_pagare',
  approvato_da uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_costs_event ON event_costs(event_id);
CREATE INDEX idx_costs_contact ON event_costs(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_costs_pagamento ON event_costs(stato_pagamento);
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
-- Mikai Eventi — Documents Table (Spec ref: Section 4.8)
CREATE TYPE document_tipo AS ENUM ('contratto', 'programma', 'locandina', 'depliant', 'bolla', 'fattura', 'presentazione', 'foto', 'altro');
CREATE TYPE document_stato AS ENUM ('bozza', 'in_revisione', 'approvato', 'definitivo');

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials(id),
  tipo document_tipo NOT NULL,
  nome_file text NOT NULL,
  file_url text NOT NULL,
  stato document_stato NOT NULL DEFAULT 'bozza',
  versione integer DEFAULT 1,
  caricato_da uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_documents_event ON documents(event_id);
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
-- Mikai Eventi — Row Level Security (Spec ref: Section 3, 12)

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE gadgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_gadgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sub_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_suggestions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT ruolo FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_permission(p permission_type)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid() AND permission = p
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "users_read" ON users FOR SELECT USING (true);
CREATE POLICY "users_write" ON users FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "perms_read" ON user_permissions FOR SELECT USING (true);
CREATE POLICY "perms_write" ON user_permissions FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "contacts_read" ON contacts FOR SELECT USING (true);
CREATE POLICY "contacts_write" ON contacts FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'direzione', 'ufficio'));
CREATE POLICY "contacts_update" ON contacts FOR UPDATE USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "events_read" ON events FOR SELECT USING (
  CASE get_user_role()
    WHEN 'admin' THEN true
    WHEN 'direzione' THEN true
    WHEN 'ufficio' THEN true
    WHEN 'area_manager' THEN (
      manager_user_id = auth.uid()
      OR promotore_id = auth.uid()
    )
    WHEN 'commerciale' THEN (
      promotore_id = auth.uid()
      OR EXISTS (SELECT 1 FROM event_staff WHERE event_id = events.id AND user_id = auth.uid())
    )
    ELSE false
  END
);

CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (
  CASE get_user_role()
    WHEN 'commerciale' THEN promotore_id = auth.uid()
    WHEN 'area_manager' THEN promotore_id = auth.uid()
    ELSE get_user_role() IN ('admin', 'direzione', 'ufficio')
  END
);
CREATE POLICY "events_update" ON events FOR UPDATE USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio', 'area_manager')
);

CREATE OR REPLACE FUNCTION can_see_event(eid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM events e WHERE e.id = eid
    AND (
      CASE get_user_role()
        WHEN 'admin' THEN true
        WHEN 'direzione' THEN true
        WHEN 'ufficio' THEN true
        WHEN 'area_manager' THEN (e.manager_user_id = auth.uid() OR e.promotore_id = auth.uid())
        WHEN 'commerciale' THEN (
          e.promotore_id = auth.uid()
          OR EXISTS (SELECT 1 FROM event_staff es WHERE es.event_id = e.id AND es.user_id = auth.uid())
        )
        ELSE false
      END
    )
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "event_materials_read" ON event_materials FOR SELECT USING (can_see_event(event_id));
CREATE POLICY "event_materials_write" ON event_materials FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "event_staff_read" ON event_staff FOR SELECT USING (can_see_event(event_id));
CREATE POLICY "event_staff_write" ON event_staff FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "event_participants_read" ON event_participants FOR SELECT USING (can_see_event(event_id));
CREATE POLICY "event_participants_write" ON event_participants FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
  OR EXISTS (SELECT 1 FROM event_staff WHERE event_id = event_participants.event_id AND user_id = auth.uid())
);

CREATE POLICY "sub_activities_read" ON event_sub_activities FOR SELECT USING (can_see_event(event_id));
CREATE POLICY "sub_activities_write" ON event_sub_activities FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "logistics_read" ON event_logistics FOR SELECT USING (can_see_event(event_id));
CREATE POLICY "logistics_write" ON event_logistics FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "costs_read" ON event_costs FOR SELECT USING (has_permission('gestione_costi') AND can_see_event(event_id));
CREATE POLICY "costs_write" ON event_costs FOR ALL USING (has_permission('gestione_costi'));

CREATE POLICY "tasks_read" ON event_tasks FOR SELECT USING (can_see_event(event_id));
CREATE POLICY "tasks_write" ON event_tasks FOR ALL USING (
  get_user_role() IN ('admin', 'direzione', 'ufficio')
  OR assegnato_a = auth.uid()
);

CREATE POLICY "activity_read" ON activity_log FOR SELECT USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));
CREATE POLICY "activity_insert" ON activity_log FOR INSERT WITH CHECK (eseguito_da = auth.uid());

CREATE POLICY "documents_read" ON documents FOR SELECT USING (
  event_id IS NULL OR EXISTS (SELECT 1 FROM events WHERE id = documents.event_id)
);
CREATE POLICY "documents_write" ON documents FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "notifications_read" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notif_prefs_read" ON notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_prefs_write" ON notification_preferences FOR ALL USING (user_id = auth.uid());

CREATE POLICY "materials_read" ON materials FOR SELECT USING (true);
CREATE POLICY "materials_write" ON materials FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "movements_read" ON material_movements FOR SELECT USING (true);
CREATE POLICY "movements_write" ON material_movements FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "gadgets_read" ON gadgets FOR SELECT USING (true);
CREATE POLICY "gadgets_write" ON gadgets FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "event_gadgets_read" ON event_gadgets FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_gadgets.event_id)
);
CREATE POLICY "event_gadgets_write" ON event_gadgets FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));

CREATE POLICY "templates_read" ON event_templates FOR SELECT USING (true);
CREATE POLICY "templates_write" ON event_templates FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "template_items_read" ON template_items FOR SELECT USING (true);
CREATE POLICY "template_items_write" ON template_items FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "thresholds_read" ON approval_thresholds FOR SELECT USING (true);
CREATE POLICY "thresholds_write" ON approval_thresholds FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "suggestions_read" ON template_suggestions FOR SELECT USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));
CREATE POLICY "suggestions_write" ON template_suggestions FOR ALL USING (get_user_role() IN ('admin', 'direzione', 'ufficio'));
-- Mikai Eventi — Triggers (Spec ref: Section 8, O4)

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'users', 'contacts', 'events', 'event_templates',
      'materials', 'gadgets', 'event_sub_activities',
      'event_logistics', 'event_costs', 'event_tasks', 'documents'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION sync_material_position()
RETURNS TRIGGER AS $$
DECLARE
  new_pos material_posizione;
BEGIN
  new_pos := CASE lower(trim(NEW.a_posizione))
    WHEN 'magazzino' THEN 'magazzino'::material_posizione
    WHEN 'evento' THEN 'evento'::material_posizione
    WHEN 'agente' THEN 'agente'::material_posizione
    WHEN 'spedito' THEN 'spedito'::material_posizione
    WHEN 'manutenzione' THEN 'manutenzione'::material_posizione
    ELSE
      CASE NEW.tipo
        WHEN 'uscita' THEN 'spedito'::material_posizione
        WHEN 'rientro' THEN 'magazzino'::material_posizione
        ELSE 'magazzino'::material_posizione
      END
  END;

  UPDATE materials SET posizione_attuale = new_pos WHERE id = NEW.material_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_material_position
  AFTER INSERT ON material_movements
  FOR EACH ROW
  EXECUTE FUNCTION sync_material_position();

CREATE OR REPLACE FUNCTION set_event_manager()
RETURNS TRIGGER AS $$
DECLARE
  manager_id uuid;
BEGIN
  SELECT u.responsabile_id INTO manager_id
  FROM users u
  WHERE u.id = NEW.promotore_id AND u.ruolo = 'commerciale';

  IF manager_id IS NULL THEN
    WITH RECURSIVE hier AS (
      SELECT id, responsabile_id, ruolo FROM users WHERE id = NEW.promotore_id
      UNION ALL
      SELECT u.id, u.responsabile_id, u.ruolo FROM users u JOIN hier h ON u.id = h.responsabile_id
      WHERE h.ruolo != 'area_manager'
    )
    SELECT id INTO manager_id FROM hier WHERE ruolo = 'area_manager' LIMIT 1;
  END IF;

  IF manager_id IS NOT NULL THEN
    NEW.manager_user_id := manager_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_event_manager
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_event_manager();
-- Mikai Eventi — Seed Data (development only)

INSERT INTO event_templates (id, tipo_evento, modalita, nome_template) VALUES
  ('10000000-0000-0000-0000-000000000001', 'workshop', 'interno', 'Workshop interno standard'),
  ('10000000-0000-0000-0000-000000000002', 'congresso', 'esterno', 'Congresso esterno standard'),
  ('10000000-0000-0000-0000-000000000003', 'corso', 'interno', 'Corso chirurgico interno');

INSERT INTO template_items (template_id, tipo, descrizione, assegnazione_ruolo_operativo, giorni_prima_evento, obbligatorio, pre_approvazione, ordine) VALUES
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Preparare locandina', 'marketing', -21, true, true, 1),
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Ordinare materiale mancante', 'logistica_ordini', -14, true, false, 2),
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Preparare e spedire kit demo', 'logistica_spedizioni', -7, true, false, 3),
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Confermare iscrizioni e inviare promemoria', 'segreteria_org', -3, true, false, 4),
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Verifica finale', 'segreteria_org', -1, true, false, 5),
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Verificare rientro materiale demo', 'logistica_spedizioni', 3, true, false, 6),
  ('10000000-0000-0000-0000-000000000001', 'checklist', 'Compilare report e chiudere consuntivo', 'segreteria_org', 7, false, false, 7);

INSERT INTO template_items (template_id, tipo, descrizione, assegnazione_ruolo_operativo, giorni_prima_evento, obbligatorio, pre_approvazione, ordine) VALUES
  ('10000000-0000-0000-0000-000000000002', 'checklist', 'Preparare materiale marketing', 'marketing', -21, true, true, 1),
  ('10000000-0000-0000-0000-000000000002', 'checklist', 'Preparare e spedire kit demo + gadget', 'logistica_spedizioni', -10, true, false, 2),
  ('10000000-0000-0000-0000-000000000002', 'checklist', 'Prenotare hotel e trasporti staff', 'segreteria_org', -14, true, false, 3),
  ('10000000-0000-0000-0000-000000000002', 'checklist', 'Verificare rientro materiale', 'logistica_spedizioni', 3, true, false, 4);

INSERT INTO approval_thresholds (tipo_evento, soglia_importo, area_manager_can_approve) VALUES
  (NULL, 5000, true),
  ('congresso', 10000, true);

INSERT INTO materials (id, nome, tipo, codice_inventario, quantita_totale, posizione_attuale) VALUES
  (gen_random_uuid(), 'Kit Stylo #1', 'demo_kit', 'KIT-STYLO-001', 1, 'magazzino'),
  (gen_random_uuid(), 'Kit Stylo #2', 'demo_kit', 'KIT-STYLO-002', 1, 'magazzino'),
  (gen_random_uuid(), 'Kit Stylo #3', 'demo_kit', 'KIT-STYLO-003', 1, 'magazzino'),
  (gen_random_uuid(), 'Kit MiniStylo #1', 'demo_kit', 'KIT-MINI-001', 1, 'magazzino'),
  (gen_random_uuid(), 'Kit MiniStylo #2', 'demo_kit', 'KIT-MINI-002', 1, 'magazzino'),
  (gen_random_uuid(), 'Vela espositiva grande', 'montaggio', 'VEL-001', 2, 'magazzino'),
  (gen_random_uuid(), 'Kit strumentario MMC', 'strumentario', 'STR-MMC-001', 1, 'magazzino');

INSERT INTO gadgets (nome, quantita_disponibile, soglia_minima, fornitore_abituale) VALUES
  ('Penne Mikai', 500, 100, 'Tipografia Rossi'),
  ('Borse congresso', 200, 50, 'Tipografia Rossi'),
  ('Block notes A5', 300, 80, 'Tipografia Rossi'),
  ('USB 16GB brandizzate', 100, 30, 'PromoGadget Srl');
