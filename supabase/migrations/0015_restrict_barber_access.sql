-- Refine RLS policies for strict barber permissions

-- 1. APPOINTMENTS
-- Drop existing policies
DROP POLICY IF EXISTS "Appointments can only be seen by their tenant's users" ON public.appointments;
DROP POLICY IF EXISTS "Appointments can only be inserted by their tenant's users" ON public.appointments;
DROP POLICY IF EXISTS "Appointments can only be updated by their tenant's users" ON public.appointments;
DROP POLICY IF EXISTS "Appointments can only be deleted by their tenant's users" ON public.appointments;

-- Create new policies
-- SELECT: Admins see all in tenant. Barbers see only their own (linked via professional_id -> user_id).
CREATE POLICY "Appointments visibility" ON public.appointments
FOR SELECT TO authenticated
USING (
  -- Admin check
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = appointments.tenant_id 
    AND profiles.role = 'admin'
  ))
  OR
  -- Barber check (can see appointments where they are the professional)
  (EXISTS (
    SELECT 1 FROM public.professionals 
    WHERE professionals.id = appointments.professional_id 
    AND professionals.user_id = auth.uid()
  ))
);

-- INSERT: Admins can insert for any. Barbers can insert only for themselves.
CREATE POLICY "Appointments insert" ON public.appointments
FOR INSERT TO authenticated
WITH CHECK (
  -- Admin check
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = appointments.tenant_id 
    AND profiles.role = 'admin'
  ))
  OR
  -- Barber check (can insert if they are the professional)
  (EXISTS (
    SELECT 1 FROM public.professionals 
    WHERE professionals.id = appointments.professional_id 
    AND professionals.user_id = auth.uid()
  ))
);

-- UPDATE: Admins can update any. Barbers can update only their own.
CREATE POLICY "Appointments update" ON public.appointments
FOR UPDATE TO authenticated
USING (
  -- Admin check
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = appointments.tenant_id 
    AND profiles.role = 'admin'
  ))
  OR
  -- Barber check
  (EXISTS (
    SELECT 1 FROM public.professionals 
    WHERE professionals.id = appointments.professional_id 
    AND professionals.user_id = auth.uid()
  ))
);

-- DELETE: Admins can delete any. Barbers can delete only their own.
CREATE POLICY "Appointments delete" ON public.appointments
FOR DELETE TO authenticated
USING (
  -- Admin check
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = appointments.tenant_id 
    AND profiles.role = 'admin'
  ))
  OR
  -- Barber check
  (EXISTS (
    SELECT 1 FROM public.professionals 
    WHERE professionals.id = appointments.professional_id 
    AND professionals.user_id = auth.uid()
  ))
);


-- 2. PROFESSIONALS
-- Drop existing policies
DROP POLICY IF EXISTS "Professionals can only be updated by their tenant's users" ON public.professionals;

-- Create new update policy
-- Admins can update any professional in their tenant.
-- Barbers can ONLY update themselves.
CREATE POLICY "Professionals update" ON public.professionals
FOR UPDATE TO authenticated
USING (
  -- Admin check
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = professionals.tenant_id 
    AND profiles.role = 'admin'
  ))
  OR
  -- Self update check
  (professionals.user_id = auth.uid())
);

-- Re-create the dropped policy for SELECT/INSERT/DELETE to ensure they still exist (or rely on previous ones if not dropped)
-- Note: We only dropped the UPDATE policy above. The SELECT policy from 0002 allows all tenant users to see all professionals, which is correct (barbers need to see other barbers to know who exists, or at least the system needs it).
-- We should ensure DELETE is restricted to admins though.
DROP POLICY IF EXISTS "Professionals can only be deleted by their tenant's users" ON public.professionals;
CREATE POLICY "Professionals delete" ON public.professionals
FOR DELETE TO authenticated
USING (
  -- Admin check ONLY
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = professionals.tenant_id 
    AND profiles.role = 'admin'
  )
);
