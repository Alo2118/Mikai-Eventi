-- Reset all seed user passwords to {nome}@@@ pattern (lowercase)
-- Excludes nicola@mikai.it (admin, different email format)

DO $$
DECLARE
  rec RECORD;
  new_pw text;
BEGIN
  FOR rec IN (
    SELECT au.id, au.email, pu.nome
    FROM auth.users au
    JOIN public.users pu ON pu.id = au.id
    WHERE au.email LIKE '%@mikai.it'
      AND au.email != 'nicola@mikai.it'
  ) LOOP
    new_pw := lower(replace(rec.nome, ' ', '')) || '@@@';

    UPDATE auth.users
    SET encrypted_password = crypt(new_pw, gen_salt('bf')),
        updated_at = now()
    WHERE id = rec.id;

    RAISE NOTICE '% → %', rec.email, new_pw;
  END LOOP;
END $$;
