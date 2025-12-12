-- Create Transactions Table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense', 'reversal')),
  category text not null, -- 'service', 'product', 'salary', 'commission', 'operational', 'other'
  amount numeric(10, 2) not null,
  description text,
  payment_method text not null, -- 'cash', 'card', 'pix', 'other'
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  responsible_id uuid references auth.users(id),
  related_entity_id uuid, -- appointment_id or other
  related_entity_type text, -- 'appointment', 'manual'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Indexes for transactions
create index if not exists idx_transactions_tenant_date on public.transactions(tenant_id, date);

-- Enable RLS for transactions
alter table public.transactions enable row level security;

create policy "Users can view transactions from their tenant"
  on public.transactions for select
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy "Users can insert transactions for their tenant"
  on public.transactions for insert
  with check (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

-- Create Commissions Table
create table if not exists public.commissions (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    professional_id uuid references public.professionals(id) on delete cascade not null,
    appointment_id uuid references public.appointments(id) on delete set null,
    amount numeric(10, 2) not null,
    status text default 'pending' check (status in ('pending', 'paid')),
    date timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Indexes for commissions
create index if not exists idx_commissions_professional on public.commissions(professional_id);
create index if not exists idx_commissions_tenant on public.commissions(tenant_id);

-- Enable RLS for commissions
alter table public.commissions enable row level security;

create policy "Users can view commissions from their tenant"
  on public.commissions for select
  using (tenant_id = (select tenant_id from public.profiles where id = auth.uid()));

create policy "Admins can manage commissions"
   on public.commissions for all
   using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Barbers can view their own commissions?
-- The first policy covers viewing all commissions for the tenant.
-- Maybe restrict barbers to see ONLY their commissions?
-- For now, keeping it simple: tenant-based visibility. But 'admin' check for management is good.
