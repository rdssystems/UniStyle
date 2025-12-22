-- Secure RPC for public users to cancel appointments
CREATE OR REPLACE FUNCTION public.public_cancel_appointment(
    p_appointment_id UUID,
    p_token TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_appointment RECORD;
    v_tenant_cancellation_window INT;
    v_minutes_until_start INT;
BEGIN
    -- 1. Verify Token
    SELECT * INTO v_session
    FROM public.public_sessions
    WHERE token = p_token AND expires_at > NOW();

    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sessão inválida ou expirada');
    END IF;

    -- 2. Fetch Appointment & verify ownership
    SELECT a.*, t.cancellation_window_minutes 
    INTO v_appointment
    FROM public.appointments a
    JOIN public.tenants t ON a.tenant_id = t.id
    WHERE a.id = p_appointment_id 
      AND a.client_id = v_session.client_id; -- Must belong to the client

    IF v_appointment.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado ou não pertence a você');
    END IF;

    -- 3. Check status
    IF v_appointment.status = 'Cancelado' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agendamento já está cancelado');
    END IF;

    IF v_appointment.status = 'Concluído' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não é possível cancelar agendamentos concluídos');
    END IF;

    -- 4. Check Cancellation Window
    -- Calculate minutes difference: Appointment Date - Now
    v_minutes_until_start := EXTRACT(EPOCH FROM (v_appointment.date - NOW())) / 60;
    v_tenant_cancellation_window := COALESCE(v_appointment.cancellation_window_minutes, 120); -- Default 120 if null

    IF v_minutes_until_start < v_tenant_cancellation_window THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Cancelamento permitido apenas com %s minutos de antecedência (Faltam %s min).', v_tenant_cancellation_window, floor(v_minutes_until_start))
        );
    END IF;

    -- 5. Execute Cancellation
    UPDATE public.appointments
    SET 
        status = 'Cancelado',
        notes = COALESCE(notes, '') || E'\nCancelado pelo cliente via Web.' || COALESCE(' Motivo: ' || p_reason, '')
    WHERE id = p_appointment_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
