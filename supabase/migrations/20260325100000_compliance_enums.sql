-- Phase 6C: Compliance — Enum types
-- Must be separate migration from tables that reference them (PostgreSQL limitation)

-- HCP professional categories
CREATE TYPE tipo_hcp AS ENUM (
  'medico', 'infermiere', 'tecnico', 'fisioterapista', 'farmacista', 'altro'
);

-- Transfer of Value types
CREATE TYPE tipo_tov AS ENUM (
  'ospitalita', 'viaggio', 'compenso', 'regalo', 'sponsorizzazione', 'formazione', 'consulenza'
);

-- ToV states
CREATE TYPE stato_tov AS ENUM (
  'registrato', 'verificato', 'segnalato'
);

-- HCP interaction types
CREATE TYPE tipo_interazione_hcp AS ENUM (
  'visita', 'telefonata', 'email', 'evento', 'cadaver_lab', 'congresso', 'workshop'
);

-- Extend audit_entita with new entity types for compliance tracking
ALTER TYPE audit_entita ADD VALUE IF NOT EXISTS 'trasferimento_valore';
ALTER TYPE audit_entita ADD VALUE IF NOT EXISTS 'interazione_hcp';
ALTER TYPE audit_entita ADD VALUE IF NOT EXISTS 'hcp_professionista';
ALTER TYPE audit_entita ADD VALUE IF NOT EXISTS 'permesso';
ALTER TYPE audit_entita ADD VALUE IF NOT EXISTS 'contatto';

-- Extend audit_azione with additional actions
ALTER TYPE audit_azione ADD VALUE IF NOT EXISTS 'eliminato';
ALTER TYPE audit_azione ADD VALUE IF NOT EXISTS 'verificato';
ALTER TYPE audit_azione ADD VALUE IF NOT EXISTS 'segnalato';
