-- Add CPF column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Update public_identify_client to handle CPF
CREATE OR REPLACE FUNCTION public.public_identify_client(
    p_tenant_id UUID,
    p_phone TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_cpf TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_client_id UUID;
    v_client_name TEXT;
    v_client_phone TEXT;
    v_client_cpf TEXT;
    v_token TEXT;
    v_existing_count INT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Normalize inputs
    IF p_phone IS NOT NULL AND TRIM(p_phone) = '' THEN p_phone := NULL; END IF;
    IF p_name IS NOT NULL AND TRIM(p_name) = '' THEN p_name := NULL; END IF;
    IF p_cpf IS NOT NULL AND TRIM(p_cpf) = '' THEN p_cpf := NULL; END IF;

    IF p_phone IS NULL AND p_name IS NULL AND p_cpf IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'CPF, Phone or Name is required');
    END IF;

    -- 1. Strategy: CPF (Highest Priority)
    IF p_cpf IS NOT NULL THEN
        SELECT id, name, phone, cpf INTO v_client_id, v_client_name, v_client_phone, v_client_cpf
        FROM public.clients
        WHERE tenant_id = p_tenant_id AND cpf = p_cpf
        LIMIT 1;

        -- If found by CPF, we use it. 
        -- If phone/name provided are different, we could update, but for now let's just identify.
        -- Ideally we might want to update phone if provided and different.
    END IF;

    -- 2. Strategy: PHONE (Secondary) - Only if not found by CPF
    IF v_client_id IS NULL AND p_phone IS NOT NULL THEN
        SELECT id, name, phone, cpf INTO v_client_id, v_client_name, v_client_phone, v_client_cpf
        FROM public.clients
        WHERE tenant_id = p_tenant_id AND phone = p_phone
        LIMIT 1;
    END IF;

    -- 3. Strategy: NAME (Fallback) - Only if not found by CPF or Phone
    IF v_client_id IS NULL AND p_phone IS NULL AND p_cpf IS NULL AND p_name IS NOT NULL THEN
       -- Existing name logic...
       SELECT COUNT(*) INTO v_existing_count
        FROM public.clients
        WHERE tenant_id = p_tenant_id AND lower(name) = lower(p_name);

        IF v_existing_count > 1 THEN
            RETURN jsonb_build_object('status', 'ambiguous', 'message', 'Multiple clients found with this name. Please provide phone or CPF.');
        END IF;

        IF v_existing_count = 1 THEN
             SELECT id, name, phone, cpf INTO v_client_id, v_client_name, v_client_phone, v_client_cpf
            FROM public.clients
            WHERE tenant_id = p_tenant_id AND lower(name) = lower(p_name)
            LIMIT 1;
        END IF;
    END IF;


    -- Create New Client if not found
    IF v_client_id IS NULL THEN
        -- Validation for creation: Phone is required by schema constraints usually, or logic requirements.
        -- User said CPF is priority. 
        IF p_phone IS NULL THEN
             RETURN jsonb_build_object('status', 'error', 'message', 'Phone is required for new registration.');
        END IF;

         INSERT INTO public.clients (tenant_id, name, phone, cpf, status)
            VALUES (
                p_tenant_id, 
                COALESCE(p_name, 'Cliente ' || p_phone),
                p_phone, 
                p_cpf,
                'Novo'
            )
            RETURNING id, name, phone, cpf INTO v_client_id, v_client_name, v_client_phone, v_client_cpf;
    ELSE
        -- Update CPF if missing in existing client and provided now
        IF v_client_cpf IS NULL AND p_cpf IS NOT NULL THEN
            UPDATE public.clients SET cpf = p_cpf WHERE id = v_client_id;
            v_client_cpf := p_cpf;
        END IF;
        
        -- Optional: Update Phone/Name if provided and different? 
        -- Let's stick to minimal updates to avoid accidental overwrites, but CPF is a strong identifier so safe to link.
    END IF;

    -- 3. Generate Session Token
    v_token := encode(gen_random_bytes(32), 'hex');
    v_expires_at := NOW() + INTERVAL '365 days';

    INSERT INTO public.public_sessions (client_id, token, expires_at)
    VALUES (v_client_id, v_token, v_expires_at);

    RETURN jsonb_build_object(
        'status', 'success',
        'token', v_token,
        'client', jsonb_build_object(
            'id', v_client_id,
            'name', v_client_name,
            'phone', v_client_phone,
            'cpf', v_client_cpf
        )
    );
END;
$$;

-- Update verify to return CPF
CREATE OR REPLACE FUNCTION public.public_verify_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_client RECORD;
BEGIN
    SELECT * INTO v_session
    FROM public.public_sessions
    WHERE token = p_token AND expires_at > NOW();

    IF v_session.id IS NULL THEN
        RETURN jsonb_build_object('valid', false);
    END IF;

    -- Update last used
    UPDATE public.public_sessions SET last_used_at = NOW() WHERE id = v_session.id;

    -- Fetch client info
    SELECT id, name, phone, cpf INTO v_client
    FROM public.clients
    WHERE id = v_session.client_id;

    RETURN jsonb_build_object(
        'valid', true,
        'client', jsonb_build_object(
            'id', v_client.id,
            'name', v_client.name,
            'phone', v_client.phone,
            'cpf', v_client.cpf
        )
    );
END;
$$;
