-- Add cancellation_window_minutes to tenants
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS cancellation_window_minutes INTEGER DEFAULT 120; -- Default 2 hours

-- Ensure safe permissions (public read is already on tenants, but good to check if implicit)
-- Tenants RLS policy 'Public tenants view' (0023) allows SELECT (true), so public can read this new column.
