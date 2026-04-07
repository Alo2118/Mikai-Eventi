-- Stock adjustment log: tracks every manual stock change (who/when/how much)
-- Automatic changes from event approval are tracked in event_materials

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  delta integer NOT NULL,
  quantita_prima integer NOT NULL,
  quantita_dopo integer NOT NULL,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by product
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id, created_at DESC);

-- RLS
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_adjustments_select" ON stock_adjustments
  FOR SELECT USING (true);

CREATE POLICY "stock_adjustments_insert" ON stock_adjustments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
      AND permission IN ('gestione_magazzino', 'gestione_gadget')
    )
  );
