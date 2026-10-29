-- Run this once in your Supabase project (SQL Editor -> New query -> paste -> Run).
-- One row per player account holds their whole game profile.
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  data jsonb not null,
  player_id text,
  updated_at timestamptz not null default now()
);

-- Row-level security: each player can only read and write their own save.
alter table public.saves enable row level security;

drop policy if exists "read own save" on public.saves;
create policy "read own save" on public.saves for select to authenticated using (auth.uid() = user_id);

drop policy if exists "insert own save" on public.saves;
create policy "insert own save" on public.saves for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "update own save" on public.saves;
create policy "update own save" on public.saves for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
