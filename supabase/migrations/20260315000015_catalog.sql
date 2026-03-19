-- ============================================
-- Mikai Eventi — Product Catalog
-- ============================================

CREATE TYPE brand_tipo AS ENUM ('produttore', 'distributore');

CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo brand_tipo NOT NULL DEFAULT 'produttore',
  logo_url text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE body_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ordine integer DEFAULT 0,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id),
  nome text NOT NULL,
  descrizione text,
  codice text UNIQUE,
  foto_url text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE product_body_sections (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  body_section_id uuid NOT NULL REFERENCES body_sections(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, body_section_id)
);

ALTER TABLE materials ADD COLUMN product_id uuid REFERENCES products(id);

-- Indexes
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_body_sections_ordine ON body_sections(ordine);
CREATE INDEX idx_product_body_sections_section ON product_body_sections(body_section_id);
CREATE INDEX idx_materials_product ON materials(product_id);

-- RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_body_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brands_read" ON brands FOR SELECT USING (true);
CREATE POLICY "brands_write" ON brands FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "body_sections_read" ON body_sections FOR SELECT USING (true);
CREATE POLICY "body_sections_write" ON body_sections FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "products_read" ON products FOR SELECT USING (true);
CREATE POLICY "products_write" ON products FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "product_body_sections_read" ON product_body_sections FOR SELECT USING (true);
CREATE POLICY "product_body_sections_write" ON product_body_sections FOR ALL USING (get_user_role() = 'admin');

-- Triggers
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed: Brands
INSERT INTO brands (id, nome, tipo) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'Mikai', 'produttore'),
  ('b0000002-0000-0000-0000-000000000002', 'Medartis', 'distributore');

-- Seed: Body sections
INSERT INTO body_sections (id, nome, ordine) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Polso', 1),
  ('a0000002-0000-0000-0000-000000000002', 'Mano', 2),
  ('a0000003-0000-0000-0000-000000000003', 'Gomito', 3),
  ('a0000004-0000-0000-0000-000000000004', 'Spalla', 4),
  ('a0000005-0000-0000-0000-000000000005', 'Piede', 5),
  ('a0000006-0000-0000-0000-000000000006', 'Caviglia', 6),
  ('a0000007-0000-0000-0000-000000000007', 'Gamba', 7),
  ('a0000008-0000-0000-0000-000000000008', 'Ginocchio', 8),
  ('a0000009-0000-0000-0000-000000000009', 'Anca', 9),
  ('a0000010-0000-0000-0000-000000000010', 'Colonna', 10);

-- Seed: Products (Mikai)
INSERT INTO products (id, brand_id, nome, descrizione, codice) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'Stylo', 'Fissatore esterno da polso', 'STYLO'),
  ('c0000002-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', 'FEP', 'Fissatore esterno polivalente', 'FEP'),
  ('c0000003-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001', 'VCA', 'Viti piede piatto', 'VCA'),
  ('c0000004-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000001', 'BSS', 'Viti per piccoli segmenti', 'BSS'),
  ('c0000005-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000001', 'MiniStylo', 'Mini fissatore esterno da polso', 'MINISTYLO');

-- Seed: Products (Medartis)
INSERT INTO products (id, brand_id, nome, descrizione, codice) VALUES
  ('c0000006-0000-0000-0000-000000000006', 'b0000002-0000-0000-0000-000000000002', 'Placche da polso', 'Placche per osteosintesi polso', 'MED-PLAC'),
  ('c0000007-0000-0000-0000-000000000007', 'b0000002-0000-0000-0000-000000000002', 'Viti a compressione', 'Viti a compressione Medartis', 'MED-VITI');

-- Seed: Product-Body section links
INSERT INTO product_body_sections (product_id, body_section_id) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001'),
  ('c0000001-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002'),
  ('c0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001'),
  ('c0000002-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000003'),
  ('c0000002-0000-0000-0000-000000000002', 'a0000007-0000-0000-0000-000000000007'),
  ('c0000003-0000-0000-0000-000000000003', 'a0000005-0000-0000-0000-000000000005'),
  ('c0000004-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002'),
  ('c0000004-0000-0000-0000-000000000004', 'a0000005-0000-0000-0000-000000000005'),
  ('c0000006-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001'),
  ('c0000007-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001'),
  ('c0000005-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001'),
  ('c0000005-0000-0000-0000-000000000005', 'a0000002-0000-0000-0000-000000000002');

-- Link existing materials to products
UPDATE materials SET product_id = 'c0000001-0000-0000-0000-000000000001' WHERE codice_inventario LIKE 'KIT-STYLO-%';
UPDATE materials SET product_id = 'c0000005-0000-0000-0000-000000000005' WHERE codice_inventario LIKE 'KIT-MINI-%';
