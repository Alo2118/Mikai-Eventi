-- Seed agents as contacts and specialists/responsabili as users
-- Source: ABBREVIATI MIKAI 06.03.26.xlsx

-- Must run AFTER 20260401140000_contact_tipo_agente.sql (enum value needed)

-- Disable audit triggers (no auth context in migration)
ALTER TABLE contacts DISABLE TRIGGER USER;

-- ═══════════════════════════════════════════
-- 1. Ensure zones exist
-- ═══════════════════════════════════════════
INSERT INTO zones (nome)
SELECT nome FROM (VALUES
  ('Toscana'), ('Piacenza'), ('Liguria - Basso Piemonte'), ('Sardegna'),
  ('Abruzzo'), ('Romagna'), ('Friuli'), ('Veneto'), ('Trentino'),
  ('Roma'), ('Lombardia'), ('Campania'), ('Sicilia Est'), ('Sicilia Ovest'),
  ('Emilia'), ('Puglia Bari'), ('Puglia Brindisi Lecce'), ('Lazio'),
  ('Puglia Foggia')
) AS v(nome)
WHERE NOT EXISTS (SELECT 1 FROM zones z WHERE z.nome = v.nome);

-- ═══════════════════════════════════════════
-- 2. Insert agents as contacts (tipo_contatto = 'agente')
-- ═══════════════════════════════════════════
INSERT INTO contacts (cognome, nome, tipo_contatto, azienda, telefono, zone_id, note)
SELECT v.cognome, v.nome, 'agente'::contact_tipo, v.agenzia, v.telefono,
       z.id, v.note
FROM (VALUES
  ('Angeloni',    'Michelangelo', NULL,            '3922862792', 'Toscana',                  NULL),
  ('Biasini',     'Luciano',      'B&T',           '3294547874', 'Piacenza',                 NULL),
  ('Tarantola',   'Milena',       'B&T',           '3316656147', 'Piacenza',                 NULL),
  ('Barbara',     'Saverio',      NULL,            '3356976560', 'Liguria - Basso Piemonte', NULL),
  ('Becciu',      'Francesco',    NULL,            '3494593167', 'Sardegna',                 NULL),
  ('Farinacci',   'Adamo',        NULL,            '3297430005', 'Abruzzo',                  NULL),
  ('Ferroni',     'Francesco',    NULL,            '3387492723', 'Romagna',                  NULL),
  ('Giacomazzi',  'Stefano',      NULL,            '3487824323', 'Friuli',                   NULL),
  ('Giacon',      'Massimo',      NULL,            '3313811273', 'Veneto',                   NULL),
  ('Giordano',    'Paolo',        NULL,            '3356158622', 'Trentino',                 NULL),
  ('Fabrizio',    'Cellini',      'Italimplants',  '3313980838', 'Roma',                     'Cell'),
  ('Fabrizio',    'Ufficio',      'Italimplants',  '0630600445', 'Roma',                     'Ufficio'),
  ('Gigli',       'Max',          'Italimplants',  '3484112810', 'Roma',                     NULL),
  ('Gigli',       'Paolo',        'Italimplants',  '3485359743', 'Roma',                     NULL),
  ('Mangione',    'Alessandro',   NULL,            NULL,         'Puglia Foggia',            NULL),
  ('Iotti',       'Francesco',    'MDI',           '3474026538', 'Lombardia',                NULL),
  ('Fiori',       'Marco',        'MDI',           '3471222589', 'Lombardia',                NULL),
  ('Iotti',       'Marco',        'MDI',           '3477919495', 'Lombardia',                NULL),
  ('Rapisardi',   'Federica',     'MDI',           '3345958401', 'Lombardia',                NULL),
  ('Merone',      'Claudio',      NULL,            '3331222290', 'Campania',                 NULL),
  ('Messina',     'Carmelo',      NULL,            '3477584648', 'Sicilia Est',              NULL),
  ('Missimi',     'Roberto',      NULL,            '3356359491', 'Emilia',                   NULL),
  ('Missimi',     'Nicolò',       NULL,            '3920704536', 'Emilia',                   NULL),
  ('Missimi',     'Alessandro',   NULL,            '3483810881', 'Emilia',                   NULL),
  ('Missimi',     'Chiara',       NULL,            '3341770565', 'Emilia',                   NULL),
  ('Muscas',      'Davide',       NULL,            NULL,         'Lazio',                    NULL),
  ('Perrone',     'Antonio',      'Perrone RAP',   '3482261257', 'Puglia Bari',              NULL),
  ('Bello',       'Silvio',       'Perrone RAP',   '3296184248', 'Puglia Bari',              NULL),
  ('Ficarella',   'Giuseppe',     'Perrone RAP',   '3284997557', 'Puglia Bari',              NULL),
  ('Cordovani',   'Elisa',        'Perrone RAP',   '3337906361', 'Puglia Bari',              NULL),
  ('Pirazzoli',   'Alessandra',   NULL,            '3383341398', 'Sicilia Ovest',            NULL),
  ('Scrimieri',   'Adriano',      NULL,            '3475984324', 'Puglia Brindisi Lecce',    NULL),
  ('Tommasi',     'Umberto',      NULL,            '3289626244', 'Puglia Brindisi Lecce',    NULL),
  ('Tramaglino',  'Daniele',      NULL,            '3356527054', 'Sardegna',                 NULL)
) AS v(cognome, nome, agenzia, telefono, zona, note)
LEFT JOIN zones z ON z.nome = v.zona
WHERE NOT EXISTS (
  SELECT 1 FROM contacts c
  WHERE c.cognome = v.cognome AND c.nome = v.nome AND c.tipo_contatto = 'agente'
);

-- Re-enable triggers
ALTER TABLE contacts ENABLE TRIGGER USER;

-- ═══════════════════════════════════════════
-- 3. Insert specialists & responsabili as users
-- Uses auth.users + public.users (requires service role)
-- We create auth users first, then public users
-- ═══════════════════════════════════════════

-- Helper: create user in auth.users + public.users
-- (Supabase admin API would be better, but for migration we use raw SQL)
DO $$
DECLARE
  rec RECORD;
  new_uid uuid;
BEGIN
  FOR rec IN (
    SELECT * FROM (VALUES
      ('Abbiati',    'Alberto',     'Product Specialist', 'commerciale'),
      ('Amato',      'Valerio',     'Area Specialist',    'commerciale'),
      ('Franci',     'Filippo',     'Area Specialist',    'commerciale'),
      ('Guarino',    'Roberto',     'Product Specialist', 'commerciale'),
      ('Lovecchio',  'Flavio',      'Area Specialist',    'commerciale'),
      ('Marchesin',  'Alice',       'Area Specialist',    'commerciale'),
      ('Martellini', 'Riccardo',    'Product Specialist', 'commerciale'),
      ('Montresor',  'Paolo',       'Product Specialist', 'commerciale'),
      ('Valerio',    'Margherita',  'Area Specialist',    'commerciale'),
      ('Serra',      'Giovanni',    'Responsabile Vendite Estero', 'direzione'),
      ('Melison',    'Diego',       'Responsabile Stabilimento',   'ufficio')
    ) AS t(cognome, nome, ruolo_desc, ruolo)
  ) LOOP
    -- Build email: nome.cognome@mikai.it (lowercase, no accents)
    DECLARE
      email_addr text := lower(
        replace(replace(replace(replace(rec.nome, '''', ''), 'è', 'e'), 'à', 'a'), 'ù', 'u')
        || '.' ||
        replace(replace(replace(replace(rec.cognome, '''', ''), 'è', 'e'), 'à', 'a'), 'ù', 'u')
        || '@mikai.it'
      );
    BEGIN
      -- Skip if user already exists
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = email_addr) THEN
        CONTINUE;
      END IF;

      new_uid := gen_random_uuid();

      -- Create auth user (confirmed, with temp password)
      -- The on_auth_user_created trigger auto-creates the public.users record
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        new_uid,
        '00000000-0000-0000-0000-000000000000',
        email_addr,
        crypt('Mikai2026!', gen_salt('bf')),
        now(),
        'authenticated', 'authenticated',
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('nome', rec.nome, 'cognome', rec.cognome),
        now(), now()
      );

      -- Create identity
      INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES (new_uid, new_uid, email_addr, jsonb_build_object('sub', new_uid, 'email', email_addr), 'email', now(), now(), now());

      -- Update public user (created by trigger) with correct data
      UPDATE users SET
        nome = rec.nome,
        cognome = rec.cognome,
        ruolo = rec.ruolo::user_role,
        attivo = true
      WHERE id = new_uid;

      RAISE NOTICE 'Created user: % % (%) — %', rec.cognome, rec.nome, rec.ruolo_desc, email_addr;
    END;
  END LOOP;
END $$;
