-- Add 'agente' to participant_tipo enum
-- Separate migration required: new enum values not visible in same transaction as policies
ALTER TYPE participant_tipo ADD VALUE IF NOT EXISTS 'agente';
