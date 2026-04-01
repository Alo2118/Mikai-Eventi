-- Convert materials.tipo from enum to text (allows dynamic product types)
ALTER TABLE materials ALTER COLUMN tipo TYPE TEXT USING tipo::TEXT;
DROP TYPE IF EXISTS material_tipo;
