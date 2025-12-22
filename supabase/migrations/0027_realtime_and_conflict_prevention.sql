-- 1. Enable REALTIME updates for the anonymous users
-- To receive realtime events, the 'anon' role must have SELECT permission on the table.
CREATE POLICY "Public appointments visibility" ON public.appointments
FOR SELECT TO anon
USING (status != 'Cancelado');

-- 2. Create function to check for appointment overlaps (Server-side validation)
CREATE OR REPLACE FUNCTION public.check_appointment_overlap()
RETURNS TRIGGER AS $$
DECLARE
    v_overlap_exists BOOLEAN;
    v_service_duration INT;
    v_new_start TIMESTAMP WITH TIME ZONE;
    v_new_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Don't check if status is 'Canceled'
    IF NEW.status = 'Cancelado' THEN
        RETURN NEW;
    END IF;

    -- Get duration of the service being booked
    SELECT duration_minutes INTO v_service_duration
    FROM public.services
    WHERE id = NEW.service_id;

    v_new_start := NEW.date;
    v_new_end := NEW.date + (v_service_duration || ' minutes')::interval;

    -- Check if ANY existing appointment (not canceled) for the SAME professional overlaps
    -- Overlap logic: (StartA < EndB) AND (EndA > StartB)
    SELECT EXISTS (
        SELECT 1 
        FROM public.appointments a
        JOIN public.services s ON a.service_id = s.id
        WHERE a.professional_id = NEW.professional_id
          AND a.id != NEW.id -- Ignore self if update
          AND a.status != 'Cancelado'
          -- New Start < Existing End
          AND v_new_start < (a.date + (s.duration_minutes || ' minutes')::interval)
          -- New End > Existing Start
          AND v_new_end > a.date
    ) INTO v_overlap_exists;

    IF v_overlap_exists THEN
        RAISE EXCEPTION 'Conflito de horário: O barbeiro já possui um agendamento neste período.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS tr_check_appointment_overlap ON public.appointments;
CREATE TRIGGER tr_check_appointment_overlap
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.check_appointment_overlap();
