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
  RETURNING id INTO new_tenant_id;

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

-- Acionar a função na criação do usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_and_tenant();