ALTER TABLE public.appointments
ADD COLUMN total_amount NUMERIC DEFAULT 0.00,
ADD COLUMN products_sold JSONB DEFAULT '[]'::jsonb;