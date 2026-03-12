-- create helper function to expire subscriptions server-side

CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
UPDATE public.subscriptions
SET plan = 'free',
    status = 'expired',
    updated_at = now()
WHERE expires_at IS NOT NULL
  AND expires_at < now()
  AND status <> 'expired';
$$;

-- schedule the function using pg_cron if available (runs every hour)
-- if pg_cron is not enabled in your project, create the schedule from the
-- Supabase dashboard under "Database → Scheduled jobs" and call the function
-- manually (SELECT public.expire_subscriptions();)

-- the following will silently fail if pg_cron isn't installed,
-- so it's safe to include in a migration for both hosted and local.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('expire_subscriptions_job', '0 * * * *',
                         'SELECT public.expire_subscriptions();');
  END IF;
END$$;
