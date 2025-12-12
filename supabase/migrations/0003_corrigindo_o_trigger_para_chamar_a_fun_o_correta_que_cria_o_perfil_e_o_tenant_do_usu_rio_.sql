-- Primeiro, removemos o trigger existente para evitar conflitos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Em seguida, criamos o trigger novamente, desta vez chamando a função correta
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_and_tenant();