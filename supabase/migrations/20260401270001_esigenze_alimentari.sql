-- Esigenze alimentari e accessibilità su contatti e utenti
-- Persistono sul profilo persona, non per-evento

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS esigenze_alimentari text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS esigenze_accessibilita text;

ALTER TABLE users ADD COLUMN IF NOT EXISTS esigenze_alimentari text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS esigenze_accessibilita text;
