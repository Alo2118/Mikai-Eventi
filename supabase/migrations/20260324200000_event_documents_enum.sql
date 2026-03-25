DO $$ BEGIN
  CREATE TYPE tipo_documento AS ENUM (
    'contratto', 'preventivo_firmato', 'programma',
    'presentazione', 'foto', 'autorizzazione', 'altro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
