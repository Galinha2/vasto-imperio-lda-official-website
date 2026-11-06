-- Notificações do chat no Android, iPhone e computador. Executar no SQL Editor.
create table if not exists public.admin_push_subscriptions (
  id text primary key check (id ~ '^[a-f0-9]{64}$'),
  owner text not null,
  subscription jsonb not null,
  preferences jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists admin_push_subscriptions_owner_idx on public.admin_push_subscriptions (owner, expires_at);
alter table public.admin_push_subscriptions enable row level security;
revoke all on public.admin_push_subscriptions from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.admin_push_subscriptions to service_role;
