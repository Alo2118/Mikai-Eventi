-- Extend permission_type enum
-- Must run in separate migration before policies that reference these values
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'richiedi_materiale';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_magazzino';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_spedizioni';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_gadget';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_sedi';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_catalogo';
