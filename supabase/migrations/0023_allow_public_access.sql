-- 1. Enable public (anon) access to Tenants
CREATE POLICY "Public tenants view" ON public.tenants
FOR SELECT TO anon USING (true);

-- 2. Enable public access to Professionals
CREATE POLICY "Public professionals view" ON public.professionals
FOR SELECT TO anon USING (true);

-- 3. Enable public access to Services
CREATE POLICY "Public services view" ON public.services
FOR SELECT TO anon USING (true);

-- 4. Enable public access to Products (if needed for display)
CREATE POLICY "Public products view" ON public.products
FOR SELECT TO anon USING (true);

-- 5. RPC to get appointments for booking (sanitized)
-- Returns only necessary info to calculate availability, hiding client personal info
CREATE OR REPLACE FUNCTION public.get_public_appointments(
    p_tenant_id UUID,
    p_from_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    id UUID,
    date TIMESTAMP WITH TIME ZONE,
    service_id UUID,
    professional_id UUID,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.date,
        a.service_id,
        a.professional_id,
        a.status
    FROM public.appointments a
    WHERE a.tenant_id = p_tenant_id
      AND a.date >= p_from_date
      AND a.status != 'Cancelado';
END;
$$;
