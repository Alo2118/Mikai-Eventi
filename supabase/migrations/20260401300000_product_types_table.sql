-- Dynamic product types: replace hardcoded enum with a manageable table

CREATE TABLE IF NOT EXISTS product_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  colore TEXT NOT NULL DEFAULT 'gray',
  icona TEXT NOT NULL DEFAULT 'package',
  ordine INTEGER NOT NULL DEFAULT 0,
  attivo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_types_select" ON product_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "product_types_insert" ON product_types
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "product_types_update" ON product_types
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "product_types_delete" ON product_types
  FOR DELETE TO authenticated USING (true);

-- Seed existing types
INSERT INTO product_types (codice, nome, colore, icona, ordine) VALUES
  ('demo_kit', 'Demo Kit', 'blue', 'layers', 1),
  ('strumentario', 'Strumentario', 'emerald', 'flask', 2),
  ('montaggio', 'Montaggio', 'purple', 'wrench', 3),
  ('pezzo_sfuso', 'Pezzo sfuso', 'yellow', 'cpu', 4),
  ('gadget', 'Gadget', 'orange', 'gift', 5),
  ('ossa', 'Ossa', 'amber', 'bone', 6)
ON CONFLICT (codice) DO NOTHING;

-- Convert products.tipo from enum to text
ALTER TABLE products ALTER COLUMN tipo TYPE TEXT USING tipo::TEXT;

-- Drop the old enum (no longer needed)
DROP TYPE IF EXISTS product_tipo;
