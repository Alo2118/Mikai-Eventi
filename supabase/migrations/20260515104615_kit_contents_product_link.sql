-- Link kit_contents rows to a registered product (instead of free-text name + code).
-- piece_product_id is nullable so esistenti free-text rows continuano a funzionare;
-- per nuove righe la UI propone un product picker e popola piece_name/piece_code dal prodotto.

ALTER TABLE kit_contents
  ADD COLUMN IF NOT EXISTS piece_product_id uuid;

DO $$ BEGIN
  ALTER TABLE kit_contents
    ADD CONSTRAINT kit_contents_piece_product_id_fkey
    FOREIGN KEY (piece_product_id) REFERENCES products(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_kit_contents_piece_product ON kit_contents(piece_product_id);

COMMENT ON COLUMN kit_contents.piece_product_id IS
  'FK al catalogo prodotti. Quando valorizzato, piece_name/piece_code sono cache dal prodotto. NULL = riga free-text legacy o pezzo non ancora in catalogo.';

-- Backfill: collega righe esistenti dove piece_code corrisponde esattamente a un codice prodotto
UPDATE kit_contents kc
SET piece_product_id = p.id
FROM products p
WHERE kc.piece_product_id IS NULL
  AND kc.piece_code IS NOT NULL
  AND LOWER(TRIM(kc.piece_code)) = LOWER(TRIM(p.codice));
