-- Allow updating and deleting stock adjustments (for editing/removing past entries)
CREATE POLICY "stock_adjustments_update" ON stock_adjustments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
      AND permission IN ('gestione_magazzino', 'gestione_gadget')
    )
  );

CREATE POLICY "stock_adjustments_delete" ON stock_adjustments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
      AND permission IN ('gestione_magazzino', 'gestione_gadget')
    )
  );
