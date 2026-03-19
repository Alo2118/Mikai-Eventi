-- Mikai Eventi — Materials Tables (Spec ref: Section 4.3)
CREATE TYPE material_tipo AS ENUM ('demo_kit', 'montaggio', 'strumentario', 'altro');
CREATE TYPE material_posizione AS ENUM ('magazzino', 'evento', 'agente', 'spedito', 'manutenzione');
CREATE TYPE material_request_stato AS ENUM ('richiesto', 'approvato', 'rifiutato');
CREATE TYPE movement_tipo AS ENUM ('uscita', 'rientro', 'trasferimento');
CREATE TYPE movement_modalita AS ENUM ('spedizione', 'mano', 'gia_in_loco', 'trasferimento_da_altro_evento');
CREATE TYPE rientro_stato AS ENUM ('integro', 'parziale', 'danneggiato');
CREATE TYPE gadget_request_stato AS ENUM ('richiesto', 'pronto', 'consegnato');

CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo material_tipo NOT NULL,
  codice_inventario text UNIQUE,
  quantita_totale integer NOT NULL DEFAULT 1,
  posizione_attuale material_posizione NOT NULL DEFAULT 'magazzino',
  posizione_dettaglio text,
  foto_url text,
  note text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE event_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES materials(id),
  quantita_richiesta integer NOT NULL DEFAULT 1,
  data_inizio_utilizzo date NOT NULL,
  data_fine_utilizzo date NOT NULL,
  stato material_request_stato NOT NULL DEFAULT 'richiesto',
  richiesto_da uuid NOT NULL REFERENCES users(id),
  approvato_da uuid REFERENCES users(id),
  data_richiesta timestamptz DEFAULT now(),
  data_approvazione timestamptz,
  note text,
  CONSTRAINT date_range_valid CHECK (data_fine_utilizzo >= data_inizio_utilizzo)
);

CREATE TABLE material_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id),
  event_id uuid REFERENCES events(id),
  tipo movement_tipo NOT NULL,
  modalita movement_modalita NOT NULL,
  da_posizione text,
  a_posizione text,
  data_movimento timestamptz NOT NULL DEFAULT now(),
  data_rientro_prevista date,
  responsabile_id uuid NOT NULL REFERENCES users(id),
  tracking_spedizione text,
  stato_rientro rientro_stato,
  quantita_rientrata integer,
  note_danni text,
  foto_danno_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT rientro_check CHECK (tipo != 'rientro' OR stato_rientro IS NOT NULL)
);

CREATE TABLE gadgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descrizione text,
  foto_url text,
  quantita_disponibile integer NOT NULL DEFAULT 0,
  soglia_minima integer NOT NULL DEFAULT 10,
  fornitore_abituale text,
  attivo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE event_gadgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  gadget_id uuid NOT NULL REFERENCES gadgets(id),
  quantita_richiesta integer NOT NULL DEFAULT 0,
  quantita_consegnata integer DEFAULT 0,
  stato gadget_request_stato NOT NULL DEFAULT 'richiesto',
  note text
);

CREATE INDEX idx_event_materials_conflict ON event_materials(material_id, data_inizio_utilizzo, data_fine_utilizzo) WHERE stato != 'rifiutato';
CREATE INDEX idx_event_materials_event ON event_materials(event_id);
CREATE INDEX idx_movements_material ON material_movements(material_id);
CREATE INDEX idx_movements_event ON material_movements(event_id);
CREATE INDEX idx_movements_rientro ON material_movements(data_rientro_prevista) WHERE tipo = 'uscita' AND data_rientro_prevista IS NOT NULL;
