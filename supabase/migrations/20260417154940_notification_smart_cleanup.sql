-- Smart notification cleanup: replace the existing single-rule cron
-- with a two-tier rule: read > 30 days OR unread > 90 days
--
-- Rationale: read notifications are already acknowledged and serve only
-- as history — 30 days is enough. Unread ones may still be actionable,
-- so keep them longer (90 days) before assuming they're obsolete.

SELECT cron.unschedule('notification-cleanup');

SELECT cron.schedule(
  'notification-cleanup',
  '0 3 * * 0',
  $$DELETE FROM notifications
    WHERE (letta = true AND created_at < NOW() - INTERVAL '30 days')
       OR (letta = false AND created_at < NOW() - INTERVAL '90 days')$$
);
