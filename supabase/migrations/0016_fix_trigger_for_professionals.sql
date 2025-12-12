-- Fix trigger to allow professional creation via Edge Function without creating a new tenant
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
  -- 1. Check if the user is being created as a professional (via Edge Function)
  -- If so, skip the automatic tenant creation logic.
  IF (new.raw_user_meta_data ->> 'is_professional')::boolean IS TRUE THEN
    RETURN new;
  END IF;

  -- 2. Existing logic for normal signups
  -- Extrair nome do tenant do email (ex: "barberelite" de "admin@barberelite.com")
  tenant_name := split_part(split_part(new.email, '@', 2), '.', 1);
  
  -- Criar um novo tenant para o usuário
  INSERT INTO public.tenants (name, slug)
  VALUES (
    initcap(replace(tenant_name, '-', ' ')), -- Capitaliza e substitui hífens
    tenant_name
  )
  ON CONFLICT (slug) DO NOTHING
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
