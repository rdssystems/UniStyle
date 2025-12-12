-- Create public_sessions table to store persistent login tokens
CREATE TABLE IF NOT EXISTS public.public_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (though mostly accessed via efficient RPCs)
ALTER TABLE public.public_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public access via RPC (we will control access inside functions)
-- But generally, we don't want direct SELECT/INSERT from public API without control.
-- So we won't add broad policies for 'anon' role unless necessary.
-- We will use SECURITY DEFINER functions.

-- Function to Identify or Register a Client and Issue a Token
CREATE OR REPLACE FUNCTION public.public_identify_client(
    p_tenant_id UUID,
    p_phone TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run as database owner to bypass RLS for creation/select
AS $$
DECLARE
    v_client_id UUID;
    v_client_name TEXT;
    v_client_phone TEXT;
    v_token TEXT;
    v_existing_count INT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Normalize inputs
    IF p_phone IS NOT NULL AND TRIM(p_phone) = '' THEN p_phone := NULL; END IF;
    IF p_name IS NOT NULL AND TRIM(p_name) = '' THEN p_name := NULL; END IF;

    IF p_phone IS NULL AND p_name IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Phone or Name is required');
    END IF;

    -- 1. Strategy: PHONE (Primary)
    IF p_phone IS NOT NULL THEN
        SELECT id, name, phone INTO v_client_id, v_client_name, v_client_phone
        FROM public.clients
        WHERE tenant_id = p_tenant_id AND phone = p_phone
        LIMIT 1;

        -- If not found, create new
        IF v_client_id IS NULL THEN
            INSERT INTO public.clients (tenant_id, name, phone, status)
            VALUES (
                p_tenant_id, 
                COALESCE(p_name, 'Cliente ' || p_phone), -- Callback name if provided, else generic
                p_phone, 
                'Novo'
            )
            RETURNING id, name, phone INTO v_client_id, v_client_name, v_client_phone;
        END IF;

    -- 2. Strategy: NAME (Secondary, only if phone not provided)
    ELSE
        SELECT COUNT(*) INTO v_existing_count
        FROM public.clients
        WHERE tenant_id = p_tenant_id AND lower(name) = lower(p_name);

        IF v_existing_count > 1 THEN
            RETURN jsonb_build_object('status', 'ambiguous', 'message', 'Multiple clients found with this name. Please provide phone.');
        END IF;

        IF v_existing_count = 1 THEN
            SELECT id, name, phone INTO v_client_id, v_client_name, v_client_phone
            FROM public.clients
            WHERE tenant_id = p_tenant_id AND lower(name) = lower(p_name)
            LIMIT 1;
        ELSE
            -- Create new client with just Name (Phone is mandatory in schema usually, let's check schema)
            -- Schema says: phone TEXT NOT NULL. So we cannot create without phone.
            -- If user only gives Name and it's not found, we MUST ask for phone.
            RETURN jsonb_build_object('status', 'ambiguous', 'message', 'Client not found. Phone required for registration.');
        END IF;
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
            'phone', v_client_phone
        )
    );
END;
$$;

-- Function to Verify a Token
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
    SELECT id, name, phone INTO v_client
    FROM public.clients
    WHERE id = v_session.client_id;

    RETURN jsonb_build_object(
        'valid', true,
        'client', jsonb_build_object(
            'id', v_client.id,
            'name', v_client.name,
            'phone', v_client.phone
        )
    );
END;
$$;
