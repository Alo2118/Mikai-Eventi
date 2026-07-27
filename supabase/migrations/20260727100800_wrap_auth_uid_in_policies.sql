-- #12 (PERF) Wrappa auth.uid() in (select auth.uid()) in tutte le policy RLS.
--
-- Problema noto Supabase: auth.uid() chiamata "nuda" in una policy viene rivalutata
-- per OGNI riga scansionata. Wrappandola in una subquery scalare — (select auth.uid())
-- — il planner la valuta UNA volta per query (InitPlan) e riusa il risultato. È
-- semanticamente identica, quindi non cambia il controllo accessi: cambia solo il
-- piano di esecuzione. Su tabelle grandi sotto RLS è un miglioramento sostanziale.
--
-- Approccio DATA-DRIVEN: invece di riscrivere ~118 policy a mano (rischio di
-- trascrizione), leggiamo le policy REALI da pg_policies e le ricreiamo preservando
-- fedelmente permissive/cmd/roles/USING/WITH CHECK, sostituendo solo auth.uid().
-- Idempotente: salta le policy già wrappate. Se una ricostruzione fallisse, l'intera
-- migrazione va in rollback (nessuno stato intermedio rotto).
--
-- Ambito: solo schema `public` (le policy di storage/auth non vengono toccate).

DO $$
DECLARE
  r record;
  v_using text;
  v_check text;
  v_sql text;
  v_count int := 0;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL AND qual LIKE '%auth.uid()%' AND qual NOT LIKE '%select auth.uid()%')
        OR
        (with_check IS NOT NULL AND with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%select auth.uid()%')
      )
  LOOP
    v_using := CASE WHEN r.qual IS NOT NULL
      THEN regexp_replace(r.qual, 'auth\.uid\(\)', '(select auth.uid())', 'g') END;
    v_check := CASE WHEN r.with_check IS NOT NULL
      THEN regexp_replace(r.with_check, 'auth\.uid\(\)', '(select auth.uid())', 'g') END;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;',
      r.policyname, r.schemaname, r.tablename);

    v_sql := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname, r.schemaname, r.tablename,
      r.permissive,                       -- 'PERMISSIVE' | 'RESTRICTIVE'
      r.cmd,                              -- 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
      array_to_string(r.roles, ', '));    -- es. authenticated / public

    IF v_using IS NOT NULL THEN
      v_sql := v_sql || format(' USING (%s)', v_using);
    END IF;
    IF v_check IS NOT NULL THEN
      v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
    END IF;

    EXECUTE v_sql;
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'wrap_auth_uid_in_policies: % policy aggiornate', v_count;
END $$;
