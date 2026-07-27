-- #8 (MEDIO) event_logistics_legacy: la tabella è rimasta in `public` con RLS
--    DISABILITATA, quindi esposta via PostgREST (leggibile/scrivibile con la anon
--    key). Contiene dati di logistica legacy. La blindiamo senza distruggere i dati:
--    RLS abilitata (nessuna policy = accesso negato) + REVOKE dei privilegi.
ALTER TABLE IF EXISTS event_logistics_legacy ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON event_logistics_legacy FROM anon, authenticated;

-- #13 (PERF) notifications.gruppo senza indice: usato per la deduplica ad ogni giro
--    dei cron (deadline-checker / overdue-returns-checker) → seq scan ripetuti.
CREATE INDEX IF NOT EXISTS idx_notifications_gruppo
  ON notifications (gruppo) WHERE gruppo IS NOT NULL;

-- #15 (PERF/pulizia) indice FK duplicato su event_staff(user_id):
--    idx_staff_user (20260315000004) == idx_event_staff_user_id (20260417160517).
--    Manteniamo quello con naming coerente e rimuoviamo il duplicato.
DROP INDEX IF EXISTS idx_staff_user;
