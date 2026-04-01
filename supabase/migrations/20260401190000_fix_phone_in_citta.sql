ALTER TABLE contacts DISABLE TRIGGER USER;
-- Fix: some contacts have phone numbers in the citta field
-- Move phone-like values from citta to telefono (if telefono is empty) or clear citta

UPDATE contacts
SET
  telefono = CASE WHEN (telefono IS NULL OR telefono = '') THEN citta ELSE telefono END,
  citta = NULL
WHERE citta ~ '^\+?[0-9 ]{8,}$'
  AND attivo = true;
ALTER TABLE contacts ENABLE TRIGGER USER;
