-- 1. Remover a política de SELECT existente para 'tenants' que é muito permissiva
DROP POLICY IF EXISTS "Tenants can be read by authenticated users" ON public.tenants;

-- 2. Remover a política de SELECT existente para 'profiles' que é muito complexa
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- 3. Criar uma nova política de SELECT para 'profiles' que permite ao usuário ler APENAS seu próprio perfil
CREATE POLICY "User can view their own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

-- 4. Criar uma nova política de SELECT para 'tenants' que permite ao usuário ler APENAS o tenant ao qual está vinculado
CREATE POLICY "User can view their associated tenant" ON public.tenants
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = tenants.id));