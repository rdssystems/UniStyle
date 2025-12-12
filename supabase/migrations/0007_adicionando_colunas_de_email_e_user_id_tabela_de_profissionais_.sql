-- Adiciona a coluna de email se ela não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='professionals' AND column_name='email') THEN
        ALTER TABLE public.professionals ADD COLUMN email TEXT UNIQUE;
        RAISE NOTICE 'Coluna "email" adicionada à tabela "professionals".';
    END IF;
END $$;

-- Adiciona a coluna user_id para vincular ao sistema de autenticação
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='professionals' AND column_name='user_id') THEN
        ALTER TABLE public.professionals ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Coluna "user_id" adicionada à tabela "professionals".';
    END IF;
END $$;