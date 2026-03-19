-- Readiness Engine: new enum values
-- Must be separate migration from policies that reference them (PostgreSQL limitation)

-- New permission types for activity categories
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_marketing';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'gestione_organizzazione';

-- New movement types for logistics tracking
ALTER TYPE movement_tipo ADD VALUE IF NOT EXISTS 'preparazione';
ALTER TYPE movement_tipo ADD VALUE IF NOT EXISTS 'consegna';

-- New event state: rifiutato (separate from cancellato)
ALTER TYPE evento_stato ADD VALUE IF NOT EXISTS 'rifiutato';

-- New material request state for agent custody
ALTER TYPE material_request_stato ADD VALUE IF NOT EXISTS 'chiuso_in_custodia';
