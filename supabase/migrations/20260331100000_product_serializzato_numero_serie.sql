-- Migration: Add serializzato flag to products and numero_serie to materials
-- Purpose: Allow user to choose tracking mode (per-specimen vs quantity) per product,
--          and track manufacturer serial numbers separately from internal inventory codes.

-- 1. Add serializzato boolean to products (user decides tracking mode)
ALTER TABLE products ADD COLUMN IF NOT EXISTS serializzato boolean DEFAULT false;

-- 2. Set default based on existing product types:
--    demo_kit, strumentario, montaggio → serializzato (tracked per specimen)
--    gadget, pezzo_sfuso → quantity (stock count)
UPDATE products SET serializzato = true WHERE tipo IN ('demo_kit', 'strumentario', 'montaggio');
UPDATE products SET serializzato = false WHERE tipo IN ('gadget', 'pezzo_sfuso');

-- 3. Add numero_serie to materials (manufacturer serial number, separate from codice_inventario)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS numero_serie text;

-- 4. Index for serial number lookups
CREATE INDEX IF NOT EXISTS idx_materials_numero_serie ON materials(numero_serie) WHERE numero_serie IS NOT NULL;

-- 5. Comment for documentation
COMMENT ON COLUMN products.serializzato IS 'true = tracked per specimen (materials table), false = tracked by quantity (quantita_disponibile)';
COMMENT ON COLUMN materials.numero_serie IS 'Manufacturer serial number (separate from internal codice_inventario)';
