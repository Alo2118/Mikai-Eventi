-- Add 'evento_imminente' notification type for the date-aware lifecycle reminder
-- (deadline-checker: eventi in confermato/in_preparazione/pronto con data_inizio a
-- 7/3/1 giorni, con l'elenco dei buchi di prontezza).
-- Idempotent: rigenera il CHECK constraint includendo il nuovo valore.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_tipo_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_tipo_check
  CHECK (tipo IN (
    'approvazione_richiesta',
    'approvazione_completata',
    'attivita_scaduta',
    'attivita_in_scadenza',
    'attivita_assegnata',
    'attivita_non_assegnata',
    'conflitto_materiale',
    'rientro_scaduto',
    'sollecito_rientro',
    'preventivo_stato',
    'evento_stato_cambiato',
    'evento_imminente',
    'escalation',
    'materiale_approvato',
    'materiale_rifiutato',
    'materiale_in_preparazione',
    'materiale_spedito',
    'materiale_rientrato',
    'staff_assegnato',
    'staff_rimosso'
  ));
