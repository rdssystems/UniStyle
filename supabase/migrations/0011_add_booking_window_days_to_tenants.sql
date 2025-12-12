ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS booking_window_days INTEGER DEFAULT 30;
