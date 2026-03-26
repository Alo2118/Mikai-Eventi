-- Phase 6C: Compliance — Tables, RLS, Indexes

-- ═══════════════════════════════════════════
-- HCP Professional Profile (extends contacts)
-- ═══════════════════════════════════════════
CREATE TABLE hcp_professionisti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contatto_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  categoria tipo_hcp NOT NULL,
  specializzazione TEXT,
  ordine_provinciale TEXT,
  codice_fiscale TEXT,
  struttura_appartenenza TEXT,
  consenso_privacy BOOLEAN DEFAULT false,
  data_consenso TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contatto_id)
);

-- ═══════════════════════════════════════════
-- Transfer of Value (ToV)
-- ═══════════════════════════════════════════
CREATE TABLE trasferimenti_valore (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hcp_id UUID NOT NULL REFERENCES hcp_professionisti(id) ON DELETE RESTRICT,
  evento_id UUID REFERENCES events(id) ON DELETE SET NULL,
  tipo tipo_tov NOT NULL,
  importo DECIMAL(10,2) NOT NULL CHECK (importo >= 0),
  valuta TEXT NOT NULL DEFAULT 'EUR',
  data_trasferimento DATE NOT NULL,
  descrizione TEXT NOT NULL,
  giustificazione TEXT NOT NULL,
  stato stato_tov NOT NULL DEFAULT 'registrato',
  periodo_riferimento TEXT, -- e.g. "2026-S1", "2026-S2", "2026"
  created_by UUID NOT NULL REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- HCP Interactions (with or without ToV)
-- ═══════════════════════════════════════════
CREATE TABLE interazioni_hcp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hcp_id UUID NOT NULL REFERENCES hcp_professionisti(id) ON DELETE CASCADE,
  evento_id UUID REFERENCES events(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tipo tipo_interazione_hcp NOT NULL,
  data_interazione DATE NOT NULL,
  note TEXT,
  materiale_presentato TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════
CREATE INDEX idx_hcp_contatto ON hcp_professionisti(contatto_id);
CREATE INDEX idx_hcp_categoria ON hcp_professionisti(categoria);

CREATE INDEX idx_tov_hcp ON trasferimenti_valore(hcp_id);
CREATE INDEX idx_tov_evento ON trasferimenti_valore(evento_id);
CREATE INDEX idx_tov_periodo ON trasferimenti_valore(periodo_riferimento);
CREATE INDEX idx_tov_stato ON trasferimenti_valore(stato);
CREATE INDEX idx_tov_data ON trasferimenti_valore(data_trasferimento);
CREATE INDEX idx_tov_created_by ON trasferimenti_valore(created_by);

CREATE INDEX idx_interazioni_hcp ON interazioni_hcp(hcp_id);
CREATE INDEX idx_interazioni_evento ON interazioni_hcp(evento_id);
CREATE INDEX idx_interazioni_user ON interazioni_hcp(user_id);
CREATE INDEX idx_interazioni_data ON interazioni_hcp(data_interazione);

-- Index for audit trail queries
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);

-- ═══════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════
ALTER TABLE hcp_professionisti ENABLE ROW LEVEL SECURITY;
ALTER TABLE trasferimenti_valore ENABLE ROW LEVEL SECURITY;
ALTER TABLE interazioni_hcp ENABLE ROW LEVEL SECURITY;

-- Helper: check if user has compliance permission
CREATE OR REPLACE FUNCTION has_compliance_permission()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
    AND permission = 'compliance'
  );
$$;

-- hcp_professionisti: compliance users can see/modify all
CREATE POLICY "hcp_select_compliance" ON hcp_professionisti
  FOR SELECT USING (has_compliance_permission());

CREATE POLICY "hcp_insert_compliance" ON hcp_professionisti
  FOR INSERT WITH CHECK (has_compliance_permission());

CREATE POLICY "hcp_update_compliance" ON hcp_professionisti
  FOR UPDATE USING (has_compliance_permission())
  WITH CHECK (has_compliance_permission());

CREATE POLICY "hcp_delete_compliance" ON hcp_professionisti
  FOR DELETE USING (has_compliance_permission());

-- trasferimenti_valore: compliance can all, creator can view own
CREATE POLICY "tov_select_compliance" ON trasferimenti_valore
  FOR SELECT USING (
    has_compliance_permission()
    OR created_by = auth.uid()
  );

CREATE POLICY "tov_insert_compliance" ON trasferimenti_valore
  FOR INSERT WITH CHECK (has_compliance_permission());

CREATE POLICY "tov_update_compliance" ON trasferimenti_valore
  FOR UPDATE USING (has_compliance_permission())
  WITH CHECK (has_compliance_permission());

CREATE POLICY "tov_delete_compliance" ON trasferimenti_valore
  FOR DELETE USING (has_compliance_permission());

-- interazioni_hcp: compliance can all, user can see/create own
CREATE POLICY "interazioni_select" ON interazioni_hcp
  FOR SELECT USING (
    has_compliance_permission()
    OR user_id = auth.uid()
  );

CREATE POLICY "interazioni_insert" ON interazioni_hcp
  FOR INSERT WITH CHECK (
    has_compliance_permission()
    OR user_id = auth.uid()
  );

CREATE POLICY "interazioni_update_compliance" ON interazioni_hcp
  FOR UPDATE USING (has_compliance_permission())
  WITH CHECK (has_compliance_permission());

CREATE POLICY "interazioni_delete_compliance" ON interazioni_hcp
  FOR DELETE USING (has_compliance_permission());

-- activity_log: compliance + admin can read all
CREATE POLICY "audit_select" ON activity_log
  FOR SELECT USING (
    has_compliance_permission()
    OR EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_id = auth.uid()
      AND permission = 'gestione_utenti'
    )
  );
