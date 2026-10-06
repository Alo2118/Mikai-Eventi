-- 20260325100001_compliance_tables ha creato created_by/verified_by/user_id con
-- REFERENCES auth.users: PostgREST non vede lo schema auth, quindi i join
-- users!trasferimenti_valore_created_by_fkey / users!interazioni_hcp_user_id_fkey
-- usati da useCompliance falliscono (PGRST200) e la tab Compliance dell'evento
-- mostra sempre "Errore nel caricamento". Ripuntiamo le FK su public.users
-- mantenendo gli stessi nomi di constraint.

ALTER TABLE trasferimenti_valore
  DROP CONSTRAINT IF EXISTS trasferimenti_valore_created_by_fkey,
  ADD CONSTRAINT trasferimenti_valore_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id);

ALTER TABLE trasferimenti_valore
  DROP CONSTRAINT IF EXISTS trasferimenti_valore_verified_by_fkey,
  ADD CONSTRAINT trasferimenti_valore_verified_by_fkey
    FOREIGN KEY (verified_by) REFERENCES public.users(id);

ALTER TABLE interazioni_hcp
  DROP CONSTRAINT IF EXISTS interazioni_hcp_user_id_fkey,
  ADD CONSTRAINT interazioni_hcp_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id);

NOTIFY pgrst, 'reload schema';
