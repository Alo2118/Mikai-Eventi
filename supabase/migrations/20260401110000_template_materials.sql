-- Template materials: predefined material lists per event type
CREATE TABLE IF NOT EXISTS template_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantita integer NOT NULL DEFAULT 1,
  note text,
  ordine integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_materials_template ON template_materials(template_id);

ALTER TABLE template_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template_materials_read" ON template_materials FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "template_materials_write" ON template_materials FOR ALL USING (
  get_user_role() = 'admin'::user_role
);
