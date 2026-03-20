-- ============================================
-- Phase 4: Enum extensions
-- Must be separate from DDL that references new values
-- ============================================

-- New permission types
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_contatti';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_staff_evento';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_logistica';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'approva_preventivi';

-- Contact type
CREATE TYPE contact_tipo AS ENUM ('medico', 'fornitore', 'tecnico', 'istituzionale', 'altro');

-- Booking status (hotel + transport)
CREATE TYPE prenotazione_stato AS ENUM ('da_prenotare', 'prenotato', 'confermato');

-- Transport direction
CREATE TYPE trasporto_direzione AS ENUM ('andata', 'ritorno');

-- Quote status
CREATE TYPE preventivo_stato AS ENUM ('in_attesa', 'approvato', 'rifiutato', 'in_revisione');
