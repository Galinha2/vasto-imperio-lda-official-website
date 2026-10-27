-- Executar no SQL Editor do mesmo projeto Supabase usado pela administração.
create table if not exists public.site_chat_threads (
  id text primary key,
  name text not null,
  contact text not null default '',
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists site_chat_threads_created on public.site_chat_threads (created_at desc);
create index if not exists site_chat_threads_ip on public.site_chat_threads (ip_hash, created_at);
create table if not exists public.site_chat_messages (
  id uuid primary key,
  thread_id text not null references public.site_chat_threads(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  sender text not null check (sender in ('visitor', 'staff')),
  created_at timestamptz not null default now()
);
create index if not exists site_chat_messages_thread on public.site_chat_messages (thread_id, created_at);
alter table public.site_chat_threads enable row level security;
alter table public.site_chat_messages enable row level security;
revoke all on public.site_chat_threads, public.site_chat_messages from anon, authenticated;
grant select, insert on public.site_chat_threads, public.site_chat_messages to service_role;

-- Presença do visitante: permite encaminhar por email quando fecha o chat.
create table if not exists public.site_chat_presence (
  id text primary key references public.site_chat_threads(id) on delete cascade,
  is_open boolean not null default false,
  last_seen timestamptz not null default now()
);
alter table public.site_chat_presence enable row level security;
revoke all on public.site_chat_presence from anon, authenticated;
grant select, insert, update on public.site_chat_presence to service_role;

-- Apagar a conversa elimina as mensagens e a presença em cascata.
grant delete on public.site_chat_threads to service_role;

-- Mensagens por ler no painel de administração (sincronizadas entre dispositivos).
alter table public.site_chat_messages add column if not exists admin_read_at timestamptz;
create index if not exists site_chat_messages_unread on public.site_chat_messages (thread_id) where sender = 'visitor' and admin_read_at is null;
grant update on public.site_chat_messages to service_role;
