-- Adiciona a coluna 'role' à tabela de perfis se ela não existir.
-- O valor padrão 'admin' será aplicado a usuários existentes (os donos).
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';