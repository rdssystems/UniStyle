-- Adicionar colunas para cores personalizadas de sidebar e fundo
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS sidebar_color TEXT DEFAULT '#181410';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#0f0c0a';
