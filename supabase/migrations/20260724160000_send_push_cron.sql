-- ============================================================
-- Intervento 1 — Cablaggio Web Push: cron → send-push (scan mode)
--
-- La edge function send-push esisteva ma nessun trigger/cron la invocava, quindi
-- nessun push partiva mai. Qui la agganciamo con lo stesso pattern pg_cron + pg_net
-- usato da deadline-checker/email-digest (vedi 20260324120002_notification_cron.sql).
--
-- 1. notifications.pushed_at: marca quando una notifica è stata processata dal push.
--    NULL = mai processata → candidata al prossimo giro di scan.
-- 2. Job ogni minuto che chiama send-push in "scan mode": la function seleziona le
--    notifiche critiche non ancora pushate e le invia ai push_subscriptions.
--
-- Inerte finché non sono configurate le chiavi VAPID: send-push in scan mode senza
-- VAPID risponde { skipped:true } e NON marca pushed_at, così quando le chiavi
-- verranno impostate i push accumulati recenti partiranno al primo giro utile.
-- ============================================================

-- Estensioni (idempotenti — già presenti da notification_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1. Colonna di stato invio push
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMPTZ;

-- Indice parziale: il scan cerca solo le notifiche non ancora pushate.
CREATE INDEX IF NOT EXISTS idx_notifications_unpushed
  ON notifications (created_at DESC)
  WHERE pushed_at IS NULL;

-- 2. Cron ogni minuto → send-push in scan mode.
--    cron.schedule per jobname è un upsert: rieseguire la migrazione riallinea il job.
SELECT cron.schedule(
  'send-push-scan',
  '* * * * *',
  $$SELECT net.http_post(
    url := 'https://ncjpbbvlucquopyihios.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"mode":"scan"}'::jsonb
  )$$
);
