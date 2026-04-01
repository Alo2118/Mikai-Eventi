-- Fix: admin editing own permissions causes permanent lockout
-- Root cause: DELETE + INSERT are separate REST calls (separate transactions).
-- After DELETE removes gestione_utenti, the INSERT fails RLS check.
--
-- Solution 1: Re-seed admin permissions (immediate fix)
-- Solution 2: SECURITY DEFINER RPC that does delete+insert in one transaction

-- 1. Re-seed admin permissions (disable audit trigger to avoid FK error on auth.uid())
ALTER TABLE user_permissions DISABLE TRIGGER audit_permissions_insert;

INSERT INTO user_permissions (user_id, permission)
VALUES
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_utenti'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_catalogo'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'approva_eventi'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'approva_materiale'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_costi'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'compliance'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_magazzino'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_spedizioni'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_gadget'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_sedi'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_contatti'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_staff_evento'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_logistica'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'approva_preventivi'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'richiedi_materiale'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_marketing'::permission_type),
  ('9b8cc786-3334-4e3c-a100-5bbf132d78f8', 'gestione_organizzazione'::permission_type)
ON CONFLICT (user_id, permission) DO NOTHING;

ALTER TABLE user_permissions ENABLE TRIGGER audit_permissions_insert;

-- 2. Create SECURITY DEFINER RPC for safe permission updates
-- This runs delete+insert in a single transaction, bypassing RLS mid-operation
CREATE OR REPLACE FUNCTION set_user_permissions(
  target_user_id uuid,
  new_permissions permission_type[]
)
RETURNS void AS $$
BEGIN
  -- Caller must have gestione_utenti (checked ONCE at function entry)
  IF NOT has_permission('gestione_utenti'::permission_type) THEN
    RAISE EXCEPTION 'Permesso negato: gestione_utenti richiesto';
  END IF;

  -- Delete all existing permissions
  DELETE FROM user_permissions WHERE user_id = target_user_id;

  -- Insert new permissions
  IF array_length(new_permissions, 1) > 0 THEN
    INSERT INTO user_permissions (user_id, permission)
    SELECT target_user_id, unnest(new_permissions)
    ON CONFLICT (user_id, permission) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
