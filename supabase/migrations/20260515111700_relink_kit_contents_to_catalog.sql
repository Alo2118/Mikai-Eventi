-- Re-aggancia kit_contents al catalogo dopo l'import dei 126 codici nuovi.
-- Idempotente: aggiorna SOLO le righe ancora senza piece_product_id.

-- 1. Match diretto su codice (case-insensitive, trimmed)
UPDATE kit_contents kc
SET piece_product_id = p.id,
    piece_name = COALESCE(NULLIF(TRIM(kc.piece_name), ''), p.nome)
FROM products p
WHERE kc.piece_product_id IS NULL
  AND kc.piece_code IS NOT NULL
  AND LOWER(TRIM(kc.piece_code)) = LOWER(TRIM(p.codice));

-- 2. Log diagnostico: quante righe restano scollegate (verrà visibile nei log di db push)
DO $$
DECLARE
  total int;
  linked int;
  unlinked_with_code int;
BEGIN
  SELECT COUNT(*) INTO total FROM kit_contents;
  SELECT COUNT(*) INTO linked FROM kit_contents WHERE piece_product_id IS NOT NULL;
  SELECT COUNT(*) INTO unlinked_with_code
    FROM kit_contents
    WHERE piece_product_id IS NULL AND piece_code IS NOT NULL;
  RAISE NOTICE 'kit_contents: % totali, % collegati, % ancora scollegati con piece_code valorizzato',
    total, linked, unlinked_with_code;
END $$;
