-- Corrige a função do trigger para ignorar a criação de tenant/perfil se for um profissional (criado via Edge Function)
-- Mantendo as melhorias de isolamento da migração 0022

CREATE OR REPLACE FUNCTION public.handle_new_user_and_tenant()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_tenant_id UUID;
  email_local_part TEXT;
  tenant_name TEXT;
  tenant_slug TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
BEGIN
  -- 1. VERIFICAÇÃO DE BYPASS PARA PROFISSIONAIS
  -- Se o usuário está sendo criado com o metadata 'is_professional', saímos imediatamente.
  -- A Edge Function create-professional se encarregará de criar o perfil e o registro de profissional.
  IF (new.raw_user_meta_data ->> 'is_professional')::boolean IS TRUE THEN
    RETURN new;
  END IF;

  -- 2. LÓGICA PARA NOVOS TENANTS (ADMINS)
  -- Extrair a parte local do email
  email_local_part := split_part(new.email, '@', 1);
  
  -- Criar nome base do tenant
  tenant_name := initcap(replace(email_local_part, '.', ' '));
  
  -- Gerar slug único usando o local_part + sufixo aleatório
  tenant_slug := lower(email_local_part) || '-' || public.generate_random_string(4);
  
  -- Inserir o novo tenant
  INSERT INTO public.tenants (name, slug)
  VALUES (
    tenant_name,
    tenant_slug
  )
  RETURNING id INTO new_tenant_id;

  -- Extrair nomes do metadata
  user_first_name := new.raw_user_meta_data ->> 'first_name';
  user_last_name := new.raw_user_meta_data ->> 'last_name';

  -- Inserir o perfil vinculado ao novo tenant como ADMIN
  INSERT INTO public.profiles (id, first_name, last_name, tenant_id, role)
  VALUES (
    new.id, 
    user_first_name, 
    user_last_name,
    new_tenant_id,
    'admin'
  );
  
  RETURN new;
END;
$$;
