-- FORCE PUBLIC ACCESS ON APPOINTMENTS
-- This is an aggressive fix to ensure the 'anon' role can see appointments for Realtime.
-- We are not changing logic, just ensuring policy existence.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'appointments'
        AND policyname = 'Public appointments visibility'
    ) THEN
        CREATE POLICY "Public appointments visibility" ON public.appointments
        FOR SELECT TO anon
        USING (true);
    END IF;
END
$$;

GRANT SELECT ON public.appointments TO anon;
