-- ============================================================
-- Reset dei flag self-service agente al cambio di possessore
-- ------------------------------------------------------------
-- I flag impostati dalla RPC agent_flag_material
--   (rientro_richiesto_at, possesso_confermato_at, segnalato_perso_at,
--    segnalazione_foto_url)
-- non venivano mai azzerati. Quando un esemplare viene ri-consegnato a un
-- altro agente o rientra in magazzino, la card AgentMaterialCard (locked =
-- rientro_richiesto_at || segnalato_perso_at) restava bloccata per il nuovo
-- possessore, spegnendo la feature su tutta la flotta al primo riuso.
--
-- Approccio robusto (copre TUTTI i percorsi: registerBulkReturn diretto,
-- sync_material_position, dispatch): un trigger BEFORE UPDATE su materials
-- azzera i 4 flag quando cambia presso_utente_id (incluso il ritorno a NULL).
-- La RPC agent_flag_material NON tocca presso_utente_id, quindi resta
-- indisturbata. Non modifichiamo migrazioni esistenti ne' sync_material_position.
-- ============================================================

CREATE OR REPLACE FUNCTION reset_agent_flags_on_owner_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.presso_utente_id IS DISTINCT FROM OLD.presso_utente_id THEN
    NEW.rientro_richiesto_at := NULL;
    NEW.possesso_confermato_at := NULL;
    NEW.segnalato_perso_at := NULL;
    NEW.segnalazione_foto_url := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_agent_flags_on_owner_change ON materials;
CREATE TRIGGER trg_reset_agent_flags_on_owner_change
  BEFORE UPDATE ON materials
  FOR EACH ROW
  WHEN (NEW.presso_utente_id IS DISTINCT FROM OLD.presso_utente_id)
  EXECUTE FUNCTION reset_agent_flags_on_owner_change();
