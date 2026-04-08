-- Multi-leg transport: allow multiple tratte per person per direction
-- Adds ordine column to sequence legs and 'transfer' as transport type

-- Step 1: Add ordine column (existing records get default 1)
ALTER TABLE event_trasporti ADD COLUMN IF NOT EXISTS ordine smallint NOT NULL DEFAULT 1;

-- Step 2: Add transfer mezzo type (separate statement from policies per CLAUDE.md)
ALTER TYPE trasporto_mezzo ADD VALUE IF NOT EXISTS 'transfer';

-- Step 3: Index for ordered queries
CREATE INDEX IF NOT EXISTS idx_trasporti_ordine ON event_trasporti(event_id, COALESCE(user_id, contact_id), direzione, ordine);
