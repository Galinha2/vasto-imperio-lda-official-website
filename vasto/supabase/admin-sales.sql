-- Executar no SQL Editor do projeto Supabase.
-- Apenas o backend com service_role pode aceder aos registos e aos PDFs.
create table if not exists public.admin_sales (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  record jsonb not null,
  uploaded_at timestamptz not null default now(),
  constraint valid_sale_status check (record->>'status' in ('vendida', 'em_preparacao'))
);

create index if not exists admin_sales_uploaded_at_idx on public.admin_sales (uploaded_at desc);
alter table public.admin_sales enable row level security;
revoke all on public.admin_sales from anon, authenticated;
grant select, insert, update on public.admin_sales to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sales-pdfs', 'sales-pdfs', false, 6291456, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 6291456, allowed_mime_types = array['application/pdf'];
