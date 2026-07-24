-- Catering: esigenze alimentari/accessibilità PER-EVENTO + costo pasti.
-- Fino ad ora le esigenze venivano scritte sul record master del contatto/utente
-- (profilo permanente), sovrascrivendo il preesistente. Queste colonne le rendono
-- specifiche del singolo evento (una persona può essere vegetariana in un evento e
-- richiedere un pasto diverso in un altro), senza toccare il profilo globale.
-- `costo_pasti` = costo del vitto offerto a quella persona per l'evento; servirà
-- all'Intervento 3 per calcolare i ToV (Transfer of Value) verso gli HCP.
-- Idempotente: ADD COLUMN IF NOT EXISTS. Le nuove colonne ereditano le policy RLS
-- esistenti di event_participants / event_staff.

-- Partecipanti (HCP / discenti — contatti esterni)
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS esigenze_alimentari_evento text;
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS esigenze_accessibilita_evento text;
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS costo_pasti numeric;

-- Staff (personale interno)
ALTER TABLE event_staff ADD COLUMN IF NOT EXISTS esigenze_alimentari_evento text;
ALTER TABLE event_staff ADD COLUMN IF NOT EXISTS esigenze_accessibilita_evento text;
ALTER TABLE event_staff ADD COLUMN IF NOT EXISTS costo_pasti numeric;
