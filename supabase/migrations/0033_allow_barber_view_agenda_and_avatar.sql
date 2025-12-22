-- 1. APPOINTMENTS VISIBILITY
-- Permite que barbeiros vejam todos os agendamentos da sua barbearia (tenant), mas apenas para fins de visualização.
-- As permissões de INSERT, UPDATE e DELETE continuam restritas apenas aos seus próprios agendamentos ou para admins.

DROP POLICY IF EXISTS "Appointments visibility" ON public.appointments;

CREATE POLICY "Appointments visibility" ON public.appointments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = appointments.tenant_id
  )
);

-- 2. PROFILE PICTURE UPDATES
-- Permite que barbeiros atualizem seu próprio avatar na tabela profiles e professionals.
-- A política de atualização de profissionais já permite (professionals.user_id = auth.uid()).
-- Precisamos garantir que a tabela profiles também permita.

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

CREATE POLICY "profiles_update_policy" ON public.profiles 
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. STORAGE PERMISSIONS FOR BARBERS
-- Permitir que barbeiros façam upload de fotos para a pasta 'avatars' no bucket 'logos' (ou criar um novo bucket).
-- Como já existe o bucket 'logos' usado para logos da barbearia, vamos permitir uploads lá em uma pasta específica.

CREATE POLICY "Avatar upload for professionals" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  (storage.foldername(name))[1] = 'avatars'
);

CREATE POLICY "Avatar selection for professionals" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'logos');

CREATE POLICY "Avatar update for professionals" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = 'avatars');
