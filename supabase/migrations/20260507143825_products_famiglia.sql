-- Add free-text "famiglia" (product family) to products to allow grouping
-- (e.g. "CFix", "Sawbones cadaver", "Demo kit Mikai") without introducing a
-- new lookup table. Autocomplete in the admin form pulls existing values.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS famiglia text;

COMMENT ON COLUMN products.famiglia IS
  'Famiglia commerciale del prodotto (testo libero). Utile per raggruppare prodotti correlati nei dettagli e nelle viste.';

CREATE INDEX IF NOT EXISTS idx_products_famiglia ON products(famiglia) WHERE famiglia IS NOT NULL;
