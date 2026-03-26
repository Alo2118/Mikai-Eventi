-- Phase 6C: Expanded audit triggers for all sensitive actions

-- ═══════════════════════════════════════════
-- Generic audit trigger function
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_audit_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entita audit_entita;
  v_azione audit_azione;
  v_entita_id UUID;
  v_campo TEXT;
  v_vecchio TEXT;
  v_nuovo TEXT;
BEGIN
  -- Determine entity type from table name
  v_entita := TG_ARGV[0]::audit_entita;

  IF TG_OP = 'INSERT' THEN
    v_azione := 'creato';
    v_entita_id := NEW.id;
    INSERT INTO activity_log (entita_tipo, entita_id, azione, eseguito_da)
    VALUES (v_entita, v_entita_id, v_azione, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_entita_id := NEW.id;

    -- Check for specific state changes
    IF TG_ARGV[1] IS NOT NULL AND TG_ARGV[1] = 'stato' THEN
      -- Track stato changes specifically
      v_vecchio := row_to_json(OLD)::jsonb ->> 'stato';
      v_nuovo := row_to_json(NEW)::jsonb ->> 'stato';
      IF v_vecchio IS DISTINCT FROM v_nuovo THEN
        -- Map specific state transitions to audit actions
        IF v_nuovo IN ('verificato') THEN
          v_azione := 'verificato';
        ELSIF v_nuovo IN ('segnalato') THEN
          v_azione := 'segnalato';
        ELSIF v_nuovo IN ('approvato') THEN
          v_azione := 'approvato';
        ELSIF v_nuovo IN ('rifiutato') THEN
          v_azione := 'rifiutato';
        ELSE
          v_azione := 'stato_cambiato';
        END IF;
        INSERT INTO activity_log (entita_tipo, entita_id, azione, campo_modificato, valore_precedente, valore_nuovo, eseguito_da)
        VALUES (v_entita, v_entita_id, v_azione, 'stato', v_vecchio, v_nuovo, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'));
        RETURN NEW;
      END IF;
    END IF;

    -- Generic modification
    v_azione := 'modificato';
    INSERT INTO activity_log (entita_tipo, entita_id, azione, eseguito_da)
    VALUES (v_entita, v_entita_id, v_azione, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_entita_id := OLD.id;
    v_azione := 'eliminato';
    INSERT INTO activity_log (entita_tipo, entita_id, azione, eseguito_da)
    VALUES (v_entita, v_entita_id, v_azione, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- ═══════════════════════════════════════════
-- Trasferimenti di valore (ToV)
-- ═══════════════════════════════════════════
CREATE TRIGGER audit_tov_insert
  AFTER INSERT ON trasferimenti_valore
  FOR EACH ROW EXECUTE FUNCTION log_audit_action('trasferimento_valore');

CREATE TRIGGER audit_tov_update
  AFTER UPDATE ON trasferimenti_valore
  FOR EACH ROW EXECUTE FUNCTION log_audit_action('trasferimento_valore', 'stato');

-- ═══════════════════════════════════════════
-- Interazioni HCP
-- ═══════════════════════════════════════════
CREATE TRIGGER audit_interazione_insert
  AFTER INSERT ON interazioni_hcp
  FOR EACH ROW EXECUTE FUNCTION log_audit_action('interazione_hcp');

-- ═══════════════════════════════════════════
-- HCP Professionisti
-- ═══════════════════════════════════════════
CREATE TRIGGER audit_hcp_insert
  AFTER INSERT ON hcp_professionisti
  FOR EACH ROW EXECUTE FUNCTION log_audit_action('hcp_professionista');

CREATE TRIGGER audit_hcp_update
  AFTER UPDATE ON hcp_professionisti
  FOR EACH ROW EXECUTE FUNCTION log_audit_action('hcp_professionista');

CREATE TRIGGER audit_hcp_delete
  AFTER DELETE ON hcp_professionisti
  FOR EACH ROW EXECUTE FUNCTION log_audit_action('hcp_professionista');

-- ═══════════════════════════════════════════
-- Contacts (sensitive: modification + deletion)
-- ═══════════════════════════════════════════
CREATE TRIGGER audit_contacts_update
  AFTER UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION log_audit_action('contatto');

CREATE TRIGGER audit_contacts_delete
  AFTER DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION log_audit_action('contatto');

-- ═══════════════════════════════════════════
-- User permissions (sensitive: grant/revoke)
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_permission_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_log (entita_tipo, entita_id, azione, campo_modificato, valore_nuovo, eseguito_da)
    VALUES ('permesso', NEW.user_id, 'creato', 'permission', NEW.permission::text, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activity_log (entita_tipo, entita_id, azione, campo_modificato, valore_precedente, eseguito_da)
    VALUES ('permesso', OLD.user_id, 'eliminato', 'permission', OLD.permission::text, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_permissions_insert
  AFTER INSERT ON user_permissions
  FOR EACH ROW EXECUTE FUNCTION log_permission_change();

CREATE TRIGGER audit_permissions_delete
  AFTER DELETE ON user_permissions
  FOR EACH ROW EXECUTE FUNCTION log_permission_change();

-- ═══════════════════════════════════════════
-- Event documents (sensitive: upload/delete)
-- ═══════════════════════════════════════════
CREATE TRIGGER audit_documents_insert
  AFTER INSERT ON event_documents
  FOR EACH ROW EXECUTE FUNCTION log_audit_action('document');

CREATE TRIGGER audit_documents_delete
  AFTER DELETE ON event_documents
  FOR EACH ROW EXECUTE FUNCTION log_audit_action('document');

-- ═══════════════════════════════════════════
-- Preventivi (quotes) — state changes
-- ═══════════════════════════════════════════
CREATE TRIGGER audit_preventivi_update
  AFTER UPDATE ON event_preventivi
  FOR EACH ROW EXECUTE FUNCTION log_audit_action('cost', 'stato');

-- ═══════════════════════════════════════════
-- Material requests — state changes
-- ═══════════════════════════════════════════
CREATE TRIGGER audit_material_requests_update
  AFTER UPDATE ON event_materials
  FOR EACH ROW EXECUTE FUNCTION log_audit_action('material_request', 'stato');
