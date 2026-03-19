-- Mikai Eventi — Core Tables (Spec ref: Section 4.1)
CREATE TYPE user_role AS ENUM ('admin', 'direzione', 'ufficio', 'area_manager', 'commerciale');
CREATE TYPE permission_type AS ENUM ('approva_eventi', 'approva_materiale', 'gestione_costi', 'compliance', 'gestione_utenti');

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  nome text NOT NULL,
  cognome text NOT NULL,
  telefono text,
  avatar_url text,
  ruolo user_role NOT NULL DEFAULT 'commerciale',
  ruoli_operativi text[] DEFAULT '{}',
  responsabile_id uuid REFERENCES users(id),
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission permission_type NOT NULL,
  UNIQUE(user_id, permission)
);

CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cognome text NOT NULL,
  email text,
  telefono text,
  ente_ospedaliero text,
  ruolo_medico text,
  specializzazione text,
  note text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_users_ruolo ON users(ruolo);
CREATE INDEX idx_users_responsabile ON users(responsabile_id);
CREATE INDEX idx_users_attivo ON users(attivo);
CREATE INDEX idx_contacts_nome ON contacts(nome, cognome);
CREATE INDEX idx_contacts_ente ON contacts(ente_ospedaliero);
