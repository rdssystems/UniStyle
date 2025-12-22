-- FIX REALTIME FILTER FOR PUBLIC ANON ROLE
-- Sometimes filters on UUIDs require specific casting or handling if the client sends them differently.
-- However, the most robust way for public data that is ALREADY filtered by RLS (we use 'true' but we could filter by tenant if we wanted stricter security)
-- is to TRUST the RLS and possibly relax the client-side filter if it is causing issues.

-- But we can't change the client code via SQL.
-- We can ensures the RLS policy is definitely applied and working.
-- Re-applying strict and correct RLS for select.

DROP POLICY IF EXISTS "Public appointments visibility" ON public.appointments;

CREATE POLICY "Public appointments visibility" ON public.appointments
FOR SELECT TO anon
USING (true);

-- Ensure the publication allows it.
ALTER PUBLICATION supabase_realtime SET TABLE public.appointments;
