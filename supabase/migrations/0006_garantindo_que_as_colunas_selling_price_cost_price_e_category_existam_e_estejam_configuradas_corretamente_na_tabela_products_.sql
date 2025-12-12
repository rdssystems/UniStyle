-- Garante que a coluna 'selling_price' exista e seja do tipo NUMERIC
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='selling_price') THEN
        -- Se 'selling_price' não existe, verifica se 'price' existe e o renomeia
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price') THEN
            ALTER TABLE public.products RENAME COLUMN price TO selling_price;
            RAISE NOTICE 'Coluna "price" renomeada para "selling_price" na tabela "products".';
        ELSE
            -- Se nem 'price' nem 'selling_price' existem, adiciona 'selling_price'
            ALTER TABLE public.products ADD COLUMN selling_price NUMERIC DEFAULT 0.00 NOT NULL;
            RAISE NOTICE 'Coluna "selling_price" adicionada à tabela "products".';
        END IF;
    END IF;
    -- Garante que a coluna 'selling_price' seja NUMERIC e NOT NULL com DEFAULT
    EXECUTE 'ALTER TABLE public.products ALTER COLUMN selling_price TYPE NUMERIC USING selling_price::NUMERIC;';
    EXECUTE 'ALTER TABLE public.products ALTER COLUMN selling_price SET DEFAULT 0.00;';
    EXECUTE 'ALTER TABLE public.products ALTER COLUMN selling_price SET NOT NULL;';
END $$;

-- Adiciona a coluna 'cost_price' se ela não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cost_price') THEN
        ALTER TABLE public.products ADD COLUMN cost_price NUMERIC DEFAULT 0.00 NOT NULL;
        RAISE NOTICE 'Coluna "cost_price" adicionada à tabela "products".';
    END IF;
    -- Garante que a coluna 'cost_price' seja NUMERIC e NOT NULL com DEFAULT
    EXECUTE 'ALTER TABLE public.products ALTER COLUMN cost_price TYPE NUMERIC USING cost_price::NUMERIC;';
    EXECUTE 'ALTER TABLE public.products ALTER COLUMN cost_price SET DEFAULT 0.00;';
    EXECUTE 'ALTER TABLE public.products ALTER COLUMN cost_price SET NOT NULL;';
END $$;

-- Adiciona a coluna 'category' (TEXT) se ela não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='category') THEN
        ALTER TABLE public.products ADD COLUMN category TEXT DEFAULT '' NOT NULL;
        RAISE NOTICE 'Coluna "category" adicionada à tabela "products".';
    END IF;
    -- Garante que a coluna 'category' seja TEXT e NOT NULL com DEFAULT
    EXECUTE 'ALTER TABLE public.products ALTER COLUMN category TYPE TEXT USING category::TEXT;';
    EXECUTE 'ALTER TABLE public.products ALTER COLUMN category SET DEFAULT '''';';
    EXECUTE 'ALTER TABLE public.products ALTER COLUMN category SET NOT NULL;';
END $$;