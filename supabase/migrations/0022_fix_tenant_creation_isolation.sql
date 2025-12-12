-- Create a function to generate a random string
CREATE OR REPLACE FUNCTION public.generate_random_string(length INTEGER)
RETURNS TEXT
LANGUAGE PLPGSQL
AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Update the handle_new_user_and_tenant function to ensure isolation
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
  -- Extract the part before the '@' (e.g., "john" from "john@gmail.com")
  email_local_part := split_part(new.email, '@', 1);
  
  -- Create a base name from the email local part
  -- e.g., "john" -> "John"
  tenant_name := initcap(replace(email_local_part, '.', ' '));
  
  -- Generate a unique slug: local_part + random 4 char suffix
  -- e.g., "john" + "-" + "a1b2" -> "john-a1b2"
  -- This ensures that even if two people named john sign up, they get different tenants
  tenant_slug := lower(email_local_part) || '-' || public.generate_random_string(4);
  
  -- ALWAYS Create a new tenant for the user
  -- We removed the ON CONFLICT DO NOTHING and the lookup logic because WE WANT conflict (or rather, unique tenants)
  -- The random suffix guarantees uniqueness practically 100% of the time for this use case
  INSERT INTO public.tenants (name, slug)
  VALUES (
    tenant_name,
    tenant_slug
  )
  RETURNING id INTO new_tenant_id;

  -- Extract first and last name from metadata, if available
  user_first_name := new.raw_user_meta_data ->> 'first_name';
  user_last_name := new.raw_user_meta_data ->> 'last_name';

  -- Insert the user profile, linking it to the NEW tenant
  INSERT INTO public.profiles (id, first_name, last_name, tenant_id, role)
  VALUES (
    new.id, 
    user_first_name, 
    user_last_name,
    new_tenant_id,
    'admin' -- The creator of the tenant is always an admin
  );
  
  RETURN new;
END;
$$;
