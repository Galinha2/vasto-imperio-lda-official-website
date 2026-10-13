-- Executar no SQL Editor do projeto Supabase.
-- Apenas o backend com service_role pode aceder aos registos e aos PDFs.
create table if not exists public.admin_sales (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  record jsonb not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists admin_sales_uploaded_at_idx on public.admin_sales (uploaded_at desc);
alter table public.admin_sales drop constraint if exists valid_sale_status;

update public.admin_sales
set record = record || jsonb_build_object(
  'status', case
    when record->>'status' = 'em_preparacao' then 'em_preparacao'
    else 'confirmada'
  end,
  'paymentStatus', coalesce(record->>'paymentStatus', case record->>'status'
    when 'entrada_paga' then 'entrada_paga'
    when 'paga_por_entregar' then 'pago'
    when 'resolvida' then 'pago'
    else 'por_pagar'
  end),
  'deliveryStatus', coalesce(record->>'deliveryStatus', case record->>'status'
    when 'entregue' then 'entregue'
    when 'resolvida' then 'entregue'
    else 'por_entregar'
  end)
)
where record->>'status' not in ('em_preparacao', 'confirmada')
   or record->>'paymentStatus' is null
   or record->>'deliveryStatus' is null;

alter table public.admin_sales add constraint valid_sale_status check (
  record->>'status' in ('em_preparacao', 'confirmada')
  and record->>'paymentStatus' in ('por_pagar', 'entrada_paga', 'pago')
  and record->>'deliveryStatus' in ('por_entregar', 'entregue')
);
alter table public.admin_sales enable row level security;
revoke all on public.admin_sales from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.admin_sales to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sales-pdfs', 'sales-pdfs', false, 6291456, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 6291456,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
