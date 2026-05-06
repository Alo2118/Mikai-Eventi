-- Add 'sollecito_rientro' notification type for warehouse-initiated reminders
-- to agents holding materials in the field for too long.

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
    'escalation',
    'materiale_approvato',
    'materiale_rifiutato',
    'materiale_in_preparazione',
    'materiale_spedito',
    'materiale_rientrato',
    'staff_assegnato',
    'staff_rimosso'
  ));
