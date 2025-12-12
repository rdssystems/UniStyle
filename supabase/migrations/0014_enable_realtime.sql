-- Enable Realtime for appointments and clients tables
-- This allows the frontend to listen for changes (INSERT, UPDATE, DELETE)

-- Add tables to the supabase_realtime publication
alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.clients;
