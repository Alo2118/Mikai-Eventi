-- Template hotel per riutilizzo rapido nei modali logistica

CREATE TABLE IF NOT EXISTS hotel_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_hotel text NOT NULL,
  indirizzo_hotel text,
  note text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hotel_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotel_templates_select" ON hotel_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "hotel_templates_insert" ON hotel_templates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "hotel_templates_update" ON hotel_templates
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "hotel_templates_delete" ON hotel_templates
  FOR DELETE TO authenticated USING (true);
