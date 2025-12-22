-- Adiciona coluna para controlar se barbeiros podem concluir atendimentos
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS allow_barber_checkout BOOLEAN DEFAULT true;
