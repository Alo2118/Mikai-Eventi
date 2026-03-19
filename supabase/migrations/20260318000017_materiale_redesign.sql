-- ============================================
-- Mikai Eventi — Materiale Redesign
-- Migration 017: tables, columns, triggers, RLS
-- Requires: 016_enum_extensions (enum values must be committed first)
-- ============================================

-- ============================================
-- 1. New tables
-- ============================================

-- Zones: geographic zones
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Zone provinces: zone to province mapping
CREATE TABLE IF NOT EXISTS zone_provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  provincia text NOT NULL,
  UNIQUE(zone_id, provincia)
);

-- Couriers: courier companies
CREATE TABLE IF NOT EXISTS couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  contatto text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Zone couriers: default courier per zone
CREATE TABLE IF NOT EXISTS zone_couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  UNIQUE(zone_id, courier_id)
);

-- Venues: venue directory
CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  indirizzo text,
  cap text,
  citta text,
  provincia text,
  zone_id uuid REFERENCES zones(id),
  courier_id uuid REFERENCES couriers(id),
  note_consegna text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Kit contents: pieces inside a kit/product
CREATE TABLE IF NOT EXISTS kit_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  piece_name text NOT NULL,
  piece_code text,
  quantity integer NOT NULL DEFAULT 1
);

-- ============================================
-- 3. Indexes for new tables
-- ============================================
CREATE INDEX IF NOT EXISTS idx_venues_nome ON venues(nome);
CREATE INDEX IF NOT EXISTS idx_venues_zona ON venues(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_provinces_zona ON zone_provinces(zone_id);
CREATE INDEX IF NOT EXISTS idx_kit_contents_product ON kit_contents(product_id);

-- ============================================
-- 4. Alter existing tables
-- ============================================

-- Events: add shipping/venue fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS data_spedizione_prevista date;
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES venues(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS courier_id uuid REFERENCES couriers(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS note_consegna text;

-- Body sections: add image
ALTER TABLE body_sections ADD COLUMN IF NOT EXISTS immagine_url text;

-- Products: add tipo column
DO $$ BEGIN
  CREATE TYPE product_tipo AS ENUM ('demo_kit', 'strumentario', 'montaggio', 'pezzo_sfuso');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tipo product_tipo;

-- Event materials: ensure product_id exists (may be missing if 015 was partial)
ALTER TABLE event_materials ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id);

-- Event materials: add new columns for lista model
ALTER TABLE event_materials ADD COLUMN IF NOT EXISTS quantita integer DEFAULT 1;
ALTER TABLE event_materials ADD COLUMN IF NOT EXISTS note_commerciale text;
ALTER TABLE event_materials ADD COLUMN IF NOT EXISTS note_ufficio text;
ALTER TABLE event_materials ADD COLUMN IF NOT EXISTS motivo_rifiuto text;

-- ============================================
-- 5. Data migration for existing event_materials
-- ============================================

-- Populate product_id from materials for existing rows (product_id column already exists from 015)
UPDATE event_materials em
SET product_id = m.product_id
FROM materials m
WHERE em.material_id = m.id
  AND em.product_id IS NULL
  AND m.product_id IS NOT NULL;

-- Add constraint: rejection requires reason
DO $$ BEGIN
  ALTER TABLE event_materials ADD CONSTRAINT rifiuto_motivo_required
    CHECK (stato::text != 'rifiutato' OR motivo_rifiuto IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 6. Triggers for updated_at on new tables
-- ============================================
CREATE OR REPLACE TRIGGER trg_venues_updated_at
  BEFORE UPDATE ON venues FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_zones_updated_at
  BEFORE UPDATE ON zones FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_couriers_updated_at
  BEFORE UPDATE ON couriers FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 7. Drop old conflicting RLS policies
-- ============================================
DROP POLICY IF EXISTS "event_materials_write" ON event_materials;
DROP POLICY IF EXISTS "brands_write" ON brands;
DROP POLICY IF EXISTS "body_sections_write" ON body_sections;
DROP POLICY IF EXISTS "products_write" ON products;
DROP POLICY IF EXISTS "product_body_sections_write" ON product_body_sections;
DROP POLICY IF EXISTS "perms_write" ON user_permissions;
DROP POLICY IF EXISTS "users_write" ON users;

-- ============================================
-- 8. New permission-based RLS policies
-- ============================================

-- event_materials: permission-based write
CREATE POLICY "event_materials_insert_richiedi" ON event_materials
  FOR INSERT WITH CHECK (
    has_permission('richiedi_materiale') AND richiesto_da = auth.uid()
  );

CREATE POLICY "event_materials_update_richiedi" ON event_materials
  FOR UPDATE USING (
    has_permission('richiedi_materiale') AND richiesto_da = auth.uid() AND stato::text = 'richiesto'
  );

CREATE POLICY "event_materials_update_approva" ON event_materials
  FOR UPDATE USING (
    has_permission('approva_materiale')
  );

-- Catalog tables: gestione_catalogo
CREATE POLICY "brands_write_perm" ON brands
  FOR ALL USING (has_permission('gestione_catalogo'));

CREATE POLICY "body_sections_write_perm" ON body_sections
  FOR ALL USING (has_permission('gestione_catalogo'));

CREATE POLICY "products_write_perm" ON products
  FOR ALL USING (has_permission('gestione_catalogo'));

CREATE POLICY "product_body_sections_write_perm" ON product_body_sections
  FOR ALL USING (has_permission('gestione_catalogo'));

-- User management: gestione_utenti (not just admin role)
CREATE POLICY "perms_write_perm" ON user_permissions
  FOR ALL USING (has_permission('gestione_utenti'));

CREATE POLICY "users_write_perm" ON users
  FOR ALL USING (has_permission('gestione_utenti'));

-- New tables: enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_contents ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated users
CREATE POLICY "venues_read" ON venues FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "zones_read" ON zones FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "zone_provinces_read" ON zone_provinces FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "couriers_read" ON couriers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "zone_couriers_read" ON zone_couriers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "kit_contents_read" ON kit_contents FOR SELECT USING (auth.uid() IS NOT NULL);

-- Write: permission-based
CREATE POLICY "venues_write" ON venues FOR ALL USING (
  has_permission('gestione_sedi') OR has_permission('gestione_catalogo')
);
CREATE POLICY "zones_write" ON zones FOR ALL USING (has_permission('gestione_catalogo'));
CREATE POLICY "zone_provinces_write" ON zone_provinces FOR ALL USING (has_permission('gestione_catalogo'));
CREATE POLICY "couriers_write" ON couriers FOR ALL USING (has_permission('gestione_catalogo'));
CREATE POLICY "zone_couriers_write" ON zone_couriers FOR ALL USING (has_permission('gestione_catalogo'));
CREATE POLICY "kit_contents_write" ON kit_contents FOR ALL USING (has_permission('gestione_catalogo'));
