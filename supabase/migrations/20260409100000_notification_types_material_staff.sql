-- ============================================================
-- Extend notification CHECK constraint with new types
-- Must be in separate migration from triggers that reference them
-- ============================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_tipo_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_tipo_check
  CHECK (tipo IN (
    -- Existing
    'approvazione_richiesta',
    'approvazione_completata',
    'attivita_scaduta',
    'attivita_in_scadenza',
    'attivita_assegnata',
    'attivita_non_assegnata',
    'conflitto_materiale',
    'rientro_scaduto',
    'preventivo_stato',
    'evento_stato_cambiato',
    'escalation',
    -- Material lifecycle (P0)
    'materiale_approvato',
    'materiale_rifiutato',
    'materiale_in_preparazione',
    'materiale_spedito',
    'materiale_rientrato',
    -- Staff (P0)
    'staff_assegnato',
    'staff_rimosso'
  ));
