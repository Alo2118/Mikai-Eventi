-- Tavoli Corso: workstation tables for surgical courses
-- Links formatori (staff), discenti (participants), and products to tables within an event

-- 1. Main tavoli table
CREATE TABLE event_tavoli (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  numero int NOT NULL,
  nome text,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, numero)
);

-- 2. Formatori per tavolo (from event_staff)
CREATE TABLE event_tavoli_formatori (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tavolo_id uuid NOT NULL REFERENCES event_tavoli(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES event_staff(id) ON DELETE CASCADE,
  UNIQUE(tavolo_id, staff_id)
);

-- 3. Discenti per tavolo (from event_participants)
CREATE TABLE event_tavoli_discenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tavolo_id uuid NOT NULL REFERENCES event_tavoli(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
  UNIQUE(tavolo_id, participant_id),
  UNIQUE(participant_id)
);

-- 4. Materiale (products) per tavolo
CREATE TABLE event_tavoli_materiale (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tavolo_id uuid NOT NULL REFERENCES event_tavoli(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  note text,
  UNIQUE(tavolo_id, product_id)
);

-- Indexes
CREATE INDEX idx_event_tavoli_event ON event_tavoli(event_id);
CREATE INDEX idx_tavoli_formatori_tavolo ON event_tavoli_formatori(tavolo_id);
CREATE INDEX idx_tavoli_discenti_tavolo ON event_tavoli_discenti(tavolo_id);
CREATE INDEX idx_tavoli_materiale_tavolo ON event_tavoli_materiale(tavolo_id);

-- RLS
ALTER TABLE event_tavoli ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tavoli_formatori ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tavoli_discenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tavoli_materiale ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated
CREATE POLICY "event_tavoli_read" ON event_tavoli FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "event_tavoli_formatori_read" ON event_tavoli_formatori FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "event_tavoli_discenti_read" ON event_tavoli_discenti FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "event_tavoli_materiale_read" ON event_tavoli_materiale FOR SELECT USING (auth.uid() IS NOT NULL);

-- Write: gestione_staff_evento permission
CREATE POLICY "event_tavoli_write" ON event_tavoli FOR ALL USING (has_permission('gestione_staff_evento'));
CREATE POLICY "event_tavoli_formatori_write" ON event_tavoli_formatori FOR ALL USING (has_permission('gestione_staff_evento'));
CREATE POLICY "event_tavoli_discenti_write" ON event_tavoli_discenti FOR ALL USING (has_permission('gestione_staff_evento'));
CREATE POLICY "event_tavoli_materiale_write" ON event_tavoli_materiale FOR ALL USING (has_permission('gestione_staff_evento'));
