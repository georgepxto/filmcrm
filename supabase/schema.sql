-- ═══════════════════════════════════════════════════════════
-- FilmmakerCRM — Supabase Database Schema
-- Execute este SQL no editor SQL do Supabase Dashboard
-- ═══════════════════════════════════════════════════════════

-- Habilitar UUID
create extension if not exists "uuid-ossp";

-- ── Tabela: clients ──
create table if not exists public.clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  contact text default '',
  email text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── Tabela: packages ──
create table if not exists public.packages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null,
  total_videos integer default 4,
  delivered integer default 0,
  posted integer default 0,
  status text default 'Ativo',
  value numeric default 0,
  paid numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── Tabela: sessions (agendamentos de gravação) ──
create table if not exists public.sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  date date not null,
  time_start time default '09:00',
  time_end time default '10:00',
  service text default '',
  status text default 'Pendente',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── Tabela: videos ──
create table if not exists public.videos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  package_id uuid references public.packages(id) on delete set null,
  title text not null,
  recorded boolean default false,
  edited boolean default false,
  delivered boolean default false,
  posted boolean default false,
  planned_date date,
  actual_date date, -- data de conclusão (setada quando posted=true), usada p/ arquivar concluídos após 7 dias
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── Tabela: payments ──
create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  package_id uuid references public.packages(id) on delete set null,
  date date not null,
  amount numeric not null default 0,
  note text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ═══════════════════════════════════════════════
-- Row Level Security (RLS)
-- Cada usuário só vê seus próprios dados
-- ═══════════════════════════════════════════════

-- Clients
alter table public.clients enable row level security;

create policy "Users can view own clients"
  on public.clients for select
  using (auth.uid() = user_id);

create policy "Users can insert own clients"
  on public.clients for insert
  with check (auth.uid() = user_id);

create policy "Users can update own clients"
  on public.clients for update
  using (auth.uid() = user_id);

create policy "Users can delete own clients"
  on public.clients for delete
  using (auth.uid() = user_id);

-- Packages
alter table public.packages enable row level security;

create policy "Users can view own packages"
  on public.packages for select
  using (auth.uid() = user_id);

create policy "Users can insert own packages"
  on public.packages for insert
  with check (auth.uid() = user_id);

create policy "Users can update own packages"
  on public.packages for update
  using (auth.uid() = user_id);

create policy "Users can delete own packages"
  on public.packages for delete
  using (auth.uid() = user_id);

-- Sessions
alter table public.sessions enable row level security;

create policy "Users can view own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);

-- Videos
alter table public.videos enable row level security;

create policy "Users can view own videos"
  on public.videos for select
  using (auth.uid() = user_id);

create policy "Users can insert own videos"
  on public.videos for insert
  with check (auth.uid() = user_id);

create policy "Users can update own videos"
  on public.videos for update
  using (auth.uid() = user_id);

create policy "Users can delete own videos"
  on public.videos for delete
  using (auth.uid() = user_id);

-- Payments
alter table public.payments enable row level security;

create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "Users can insert own payments"
  on public.payments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own payments"
  on public.payments for update
  using (auth.uid() = user_id);

create policy "Users can delete own payments"
  on public.payments for delete
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════
-- Indexes para performance
-- ═══════════════════════════════════════════════

create index if not exists idx_clients_user_id on public.clients(user_id);
create index if not exists idx_packages_user_id on public.packages(user_id);
create index if not exists idx_packages_client_id on public.packages(client_id);
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_date on public.sessions(date);
create index if not exists idx_sessions_client_id on public.sessions(client_id);
create index if not exists idx_videos_user_id on public.videos(user_id);
create index if not exists idx_videos_client_id on public.videos(client_id);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_client_id on public.payments(client_id);
create index if not exists idx_payments_package_id on public.payments(package_id);
