-- Mikai Eventi — Documents Table (Spec ref: Section 4.8)
CREATE TYPE document_tipo AS ENUM ('contratto', 'programma', 'locandina', 'depliant', 'bolla', 'fattura', 'presentazione', 'foto', 'altro');
CREATE TYPE document_stato AS ENUM ('bozza', 'in_revisione', 'approvato', 'definitivo');

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials(id),
  tipo document_tipo NOT NULL,
  nome_file text NOT NULL,
  file_url text NOT NULL,
  stato document_stato NOT NULL DEFAULT 'bozza',
  versione integer DEFAULT 1,
  caricato_da uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_documents_event ON documents(event_id);
