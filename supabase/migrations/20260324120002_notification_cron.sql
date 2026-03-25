-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1. Daily deadline checker at 07:00 UTC
SELECT cron.schedule(
  'deadline-checker-daily',
  '0 7 * * *',
  $$SELECT net.http_post(
    url := 'https://ncjpbbvlucquopyihios.supabase.co/functions/v1/deadline-checker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  )$$
);

-- 2. Daily overdue returns checker at 07:00 UTC
SELECT cron.schedule(
  'overdue-returns-daily',
  '0 7 * * *',
  $$SELECT net.http_post(
    url := 'https://ncjpbbvlucquopyihios.supabase.co/functions/v1/overdue-returns-checker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  )$$
);

-- 3. Daily email digest at 07:00 UTC weekdays (Mon-Fri)
SELECT cron.schedule(
  'email-digest-daily',
  '0 7 * * 1-5',
  $$SELECT net.http_post(
    url := 'https://ncjpbbvlucquopyihios.supabase.co/functions/v1/email-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"mode":"daily"}'::jsonb
  )$$
);

-- 4. Weekly email digest at 07:00 UTC Monday
SELECT cron.schedule(
  'email-digest-weekly',
  '0 7 * * 1',
  $$SELECT net.http_post(
    url := 'https://ncjpbbvlucquopyihios.supabase.co/functions/v1/email-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{"mode":"weekly"}'::jsonb
  )$$
);

-- 5. Weekly cleanup: delete notifications older than 90 days (Sunday 03:00 UTC)
SELECT cron.schedule(
  'notification-cleanup',
  '0 3 * * 0',
  $$DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '90 days'$$
);
