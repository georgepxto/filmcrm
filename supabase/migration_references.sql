-- Tabela para armazenar as Referências (Moodboard)
create table if not exists public.references (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  title text not null,
  url text not null,
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.references enable row level security;

create policy "Users can view own references"
  on public.references for select
  using (auth.uid() = user_id);

create policy "Users can insert own references"
  on public.references for insert
  with check (auth.uid() = user_id);

create policy "Users can update own references"
  on public.references for update
  using (auth.uid() = user_id);

create policy "Users can delete own references"
  on public.references for delete
  using (auth.uid() = user_id);

-- Índices
create index if not exists idx_references_user_id on public.references(user_id);
create index if not exists idx_references_client_id on public.references(client_id);
