-- Daily trigger for the 10-day expiry reminder job.
-- Requires a Vault secret named 'cron_secret' that matches the CRON_SECRET
-- variable on the admin Worker (created out-of-band, never committed).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('expiry-reminders-daily')
where exists (select 1 from cron.job where jobname = 'expiry-reminders-daily');

-- 03:30 UTC = 09:00 Sri Lanka time.
select cron.schedule(
  'expiry-reminders-daily',
  '30 3 * * *',
  $$
  select net.http_get(
    url := 'https://admin.evofitness.lk/api/cron/expiry-reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $$
);
