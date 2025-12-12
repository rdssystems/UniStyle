-- 1. Criar a tabela public.tenants primeiro, pois outras tabelas farão referência a ela.
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  primary_color TEXT DEFAULT '#ff7b00',
  logo_url TEXT,
  business_hours JSONB DEFAULT '{
    "sunday": {"open": "00:00", "close": "00:00", "isClosed": true},
    "monday": {"open": "09:00", "close": "18:00", "isClosed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "isClosed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "isClosed": false},
    "thursday": {"open": "09:00", "close": "18:00", "isClosed": false},
    "friday": {"open": "09:00", "close": "18:00", "isClosed": false},
    "saturday": {"open": "09:00", "close": "14:00", "isClosed": false}
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para tenants
CREATE POLICY "Tenants can be read by authenticated users" ON public.tenants
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert tenants" ON public.tenants
FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Criar a tabela public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Habilitar RLS para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Adicionar a coluna tenant_id à tabela profiles (agora que tenants existe)
-- Usar ALTER TABLE IF EXISTS para evitar erro se a coluna já existir
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN RAISE NOTICE 'column tenant_id already exists in public.profiles.';
END $$;


-- 4. Atualizar políticas de RLS para profiles (agora que tenant_id existe)
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles 
FOR SELECT TO authenticated USING (auth.uid() = id AND EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = auth.uid() AND p.tenant_id = profiles.tenant_id));

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id AND EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = auth.uid() AND p.tenant_id = profiles.tenant_id));

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles 
FOR UPDATE TO authenticated USING (auth.uid() = id AND EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = auth.uid() AND p.tenant_id = profiles.tenant_id));

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles 
FOR DELETE TO authenticated USING (auth.uid() = id AND EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = auth.uid() AND p.tenant_id = profiles.tenant_id));

-- Políticas de RLS para tenants que dependem de profiles.tenant_id
DROP POLICY IF EXISTS "Tenant admins can update their tenant" ON public.tenants;
CREATE POLICY "Tenant admins can update their tenant" ON public.tenants
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = tenants.id));

DROP POLICY IF EXISTS "Tenant admins can delete their tenant" ON public.tenants;
CREATE POLICY "Tenant admins can delete their tenant" ON public.tenants
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = tenants.id));

-- 5. Criar a função e o trigger handle_new_user_and_tenant
CREATE OR REPLACE FUNCTION public.handle_new_user_and_tenant()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_tenant_id UUID;
  tenant_name TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
BEGIN
  -- Extrair nome do tenant do email (ex: "barberelite" de "admin@barberelite.com")
  tenant_name := split_part(split_part(new.email, '@', 2), '.', 1);
  
  -- Criar um novo tenant para o usuário
  INSERT INTO public.tenants (name, slug)
  VALUES (
    initcap(replace(tenant_name, '-', ' ')), -- Capitaliza e substitui hífens
    tenant_name
  )
  ON CONFLICT (slug) DO NOTHING -- Evita erro se o tenant já existir (ex: múltiplos usuários do mesmo domínio)
  RETURNING id INTO new_tenant_id;

  -- Se o tenant não foi criado (porque já existia), buscar o ID existente
  IF new_tenant_id IS NULL THEN
    SELECT id INTO new_tenant_id FROM public.tenants WHERE slug = tenant_name;
  END IF;

  -- Extrair primeiro e último nome do metadata, se disponível
  user_first_name := new.raw_user_meta_data ->> 'first_name';
  user_last_name := new.raw_user_meta_data ->> 'last_name';

  -- Inserir o perfil do usuário, vinculando-o ao novo tenant
  INSERT INTO public.profiles (id, first_name, last_name, tenant_id)
  VALUES (
    new.id, 
    user_first_name, 
    user_last_name,
    new_tenant_id
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_and_tenant();

-- 6. Criar as tabelas de dados (clients, professionals, products, services, appointments)
-- Tabela Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'Novo' NOT NULL, -- 'Ativo', 'Novo', 'Inadimplente'
  points INTEGER DEFAULT 0 NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can only be seen by their tenant's users" ON public.clients
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = clients.tenant_id));

CREATE POLICY "Clients can only be inserted by their tenant's users" ON public.clients
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = clients.tenant_id));

CREATE POLICY "Clients can only be updated by their tenant's users" ON public.clients
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = clients.tenant_id));

CREATE POLICY "Clients can only be deleted by their tenant's users" ON public.clients
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = clients.tenant_id));

-- Tabela Professionals
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'Disponível' NOT NULL, -- 'Disponível', 'Em atendimento', 'Offline'
  color TEXT DEFAULT 'gray' NOT NULL,
  avatar_url TEXT,
  rating NUMERIC(2,1) DEFAULT 5.0 NOT NULL,
  reviews INTEGER DEFAULT 0 NOT NULL,
  specialties TEXT[] DEFAULT '{}' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can only be seen by their tenant's users" ON public.professionals
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = professionals.tenant_id));

CREATE POLICY "Professionals can only be inserted by their tenant's users" ON public.professionals
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = professionals.tenant_id));

CREATE POLICY "Professionals can only be updated by their tenant's users" ON public.professionals
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = professionals.tenant_id));

CREATE POLICY "Professionals can only be deleted by their tenant's users" ON public.professionals
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = professionals.tenant_id));

-- Tabela Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  stock INTEGER DEFAULT 0 NOT NULL,
  min_stock INTEGER DEFAULT 0 NOT NULL,
  price NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
  category TEXT NOT NULL,
  sku TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products can only be seen by their tenant's users" ON public.products
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = products.tenant_id));

CREATE POLICY "Products can only be inserted by their tenant's users" ON public.products
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = products.tenant_id));

CREATE POLICY "Products can only be updated by their tenant's users" ON public.products
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = products.tenant_id));

CREATE POLICY "Products can only be deleted by their tenant's users" ON public.products
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = products.tenant_id));

-- Tabela Services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  price NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
  duration_minutes INTEGER DEFAULT 0 NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services can only be seen by their tenant's users" ON public.services
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = services.tenant_id));

CREATE POLICY "Services can only be inserted by their tenant's users" ON public.services
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = services.tenant_id));

CREATE POLICY "Services can only be updated by their tenant's users" ON public.services
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = services.tenant_id));

CREATE POLICY "Services can only be deleted by their tenant's users" ON public.services
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = services.tenant_id));

-- Tabela Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'Agendado' NOT NULL, -- 'Agendado', 'Concluído', 'Cancelado', 'Confirmado'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Appointments can only be seen by their tenant's users" ON public.appointments
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = appointments.tenant_id));

CREATE POLICY "Appointments can only be inserted by their tenant's users" ON public.appointments
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = appointments.tenant_id));

CREATE POLICY "Appointments can only be updated by their tenant's users" ON public.appointments
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = appointments.tenant_id));

CREATE POLICY "Appointments can only be deleted by their tenant's users" ON public.appointments
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.tenant_id = appointments.tenant_id));