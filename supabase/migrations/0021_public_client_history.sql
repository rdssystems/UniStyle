-- Function to get appointment history for a publicly authenticated client
CREATE OR REPLACE FUNCTION public_get_client_appointments(p_token TEXT)
RETURNS TABLE (
    id UUID,
    date TIMESTAMP WITH TIME ZONE,
    status TEXT,
    service_title TEXT,
    service_duration INTEGER,
    professional_name TEXT,
    total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_client_id UUID;
BEGIN
    -- Verify token and get client_id
    SELECT client_id INTO v_client_id
    FROM public_sessions
    WHERE token = p_token
    AND expires_at > NOW();

    IF v_client_id IS NULL THEN
        RETURN; -- Invalid or expired token
    END IF;

    -- Update last used at
    UPDATE public_sessions SET last_used_at = NOW() WHERE token = p_token;

    -- Return appointments
    RETURN QUERY
    SELECT 
        a.id,
        a.date,
        a.status,
        s.title AS service_title,
        s.duration_minutes AS service_duration,
        p.name AS professional_name,
        a.total_amount
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    JOIN professionals p ON a.professional_id = p.id
    WHERE a.client_id = v_client_id
    ORDER BY a.date DESC;
END;
$$;
