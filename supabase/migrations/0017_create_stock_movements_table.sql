create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  type text not null check (type in ('entry', 'exit')),
  quantity integer not null check (quantity > 0),
  reason text not null, -- 'purchase', 'sale', 'usage', 'adjustment', 'loss', 'other'
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete set null,
  observations text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add indexes for better performance
create index if not exists idx_stock_movements_tenant_id on public.stock_movements(tenant_id);
create index if not exists idx_stock_movements_product_id on public.stock_movements(product_id);
create index if not exists idx_stock_movements_date on public.stock_movements(date);

-- Enable RLS
alter table public.stock_movements enable row level security;

-- RLS Policies
create policy "Users can view stock movements from their tenant"
  on public.stock_movements for select
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy "Admins can insert stock movements"
  on public.stock_movements for insert
  with check (
    tenant_id = (select tenant_id from public.profiles where id = auth.uid()) and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
-- Barbers might need to register usage ('exit' type), so maybe relax the insert policy?
-- "Registro rápido de uso interno." implies barbers or staff.
-- Let's allow authenticated users of the tenant to insert if they are not just 'receptionist' (unless receptionists handle stock too).
-- Assuming any staff can register usage.
drop policy "Admins can insert stock movements" on public.stock_movements;
create policy "Users can insert stock movements for their tenant"
  on public.stock_movements for insert
  with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

-- Only admins should probably update/delete, or maybe no one should delete movements (audit log).
-- Let's stick to insert and usage.

