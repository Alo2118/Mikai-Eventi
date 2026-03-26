-- Performance indexes: FK indexes, trigram search, composite indexes
-- All CREATE INDEX IF NOT EXISTS for idempotency

-- ═══════════════════════════════════════════
-- 1. Missing FK indexes (PostgreSQL doesn't auto-index FKs)
-- ═══════════════════════════════════════════

-- Materials position tracking
CREATE INDEX IF NOT EXISTS idx_materials_magazzino ON materials(magazzino_id);
CREATE INDEX IF NOT EXISTS idx_materials_presso_utente ON materials(presso_utente_id);

-- Event materials
CREATE INDEX IF NOT EXISTS idx_event_materials_richiesto_da ON event_materials(richiesto_da);

-- Material movements
CREATE INDEX IF NOT EXISTS idx_movements_responsabile ON material_movements(responsabile_id);

-- Hotel & transport logistics
CREATE INDEX IF NOT EXISTS idx_hotel_user ON event_hotel(user_id);
CREATE INDEX IF NOT EXISTS idx_hotel_contact ON event_hotel(contact_id);
CREATE INDEX IF NOT EXISTS idx_trasporti_user ON event_trasporti(user_id);
CREATE INDEX IF NOT EXISTS idx_trasporti_contact ON event_trasporti(contact_id);

-- Quotes & costs
CREATE INDEX IF NOT EXISTS idx_preventivi_fornitore ON event_preventivi(fornitore_id);
CREATE INDEX IF NOT EXISTS idx_preventivi_created_by ON event_preventivi(created_by);

-- Activities dependencies & completion
CREATE INDEX IF NOT EXISTS idx_activities_dipende_da ON event_activities(dipende_da);
CREATE INDEX IF NOT EXISTS idx_activities_completata_da ON event_activities(completata_da);

-- Sub-activities
CREATE INDEX IF NOT EXISTS idx_sub_activities_fornitore ON event_sub_activities(fornitore_id);

-- ═══════════════════════════════════════════
-- 2. Trigram indexes for ILIKE '%search%' queries
-- ═══════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_events_titolo_trgm ON events USING GIN(titolo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_nome_trgm ON contacts USING GIN(nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_cognome_trgm ON contacts USING GIN(cognome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_azienda_trgm ON contacts USING GIN(COALESCE(azienda, '') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_materials_nome_trgm ON materials USING GIN(nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_venues_nome_trgm ON venues USING GIN(nome gin_trgm_ops);

-- ═══════════════════════════════════════════
-- 3. Composite indexes for frequent filter combinations
-- ═══════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_event_activities_event_stato ON event_activities(event_id, stato);
CREATE INDEX IF NOT EXISTS idx_event_materials_event_stato ON event_materials(event_id, stato);

-- Notification per-user recent (speeds up "last N for user" queries)
CREATE INDEX IF NOT EXISTS idx_notifications_user_recent ON notifications(user_id, created_at DESC);
