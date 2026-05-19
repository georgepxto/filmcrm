create table if not exists google_tokens (
  user_id uuid references auth.users on delete cascade primary key,
  refresh_token text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table google_tokens enable row level security;

-- The Edge function uses service_role key to access this table, so RLS policies are technically not required to be public.
-- But we can add a policy if you ever want the user to see their own connection status:
create policy "Users can view own google_tokens"
  on google_tokens for select
  using ( auth.uid() = user_id );
