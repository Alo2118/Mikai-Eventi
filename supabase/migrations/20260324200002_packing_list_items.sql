CREATE TABLE IF NOT EXISTS packing_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  event_material_id UUID REFERENCES event_materials(id) ON DELETE CASCADE,
  descrizione TEXT NOT NULL,
  quantita INTEGER NOT NULL DEFAULT 1,
  imballato BOOLEAN NOT NULL DEFAULT false,
  imballato_da UUID REFERENCES auth.users(id),
  imballato_at TIMESTAMPTZ,
  note TEXT,
  ordine INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packing_list_event_id ON packing_list_items(event_id);

ALTER TABLE packing_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packing_list_select" ON packing_list_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "packing_list_insert" ON packing_list_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "packing_list_update" ON packing_list_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "packing_list_delete" ON packing_list_items
  FOR DELETE TO authenticated USING (true);
