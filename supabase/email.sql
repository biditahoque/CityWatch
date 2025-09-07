-- supabase/email.sql
create table if not exists public.email_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  city text not null,
  wants_new_issues boolean not null default true,
  wants_resolved boolean not null default false,
  verified_at timestamptz,
  verify_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, city)
);

-- RLS
alter table public.email_subscriptions enable row level security;

-- Allow the logged-in user to see and manage only their own rows
create policy "email_subs_select_own"
on public.email_subscriptions
for select
using (auth.uid() = user_id);

create policy "email_subs_upsert_own"
on public.email_subscriptions
for insert
with check (auth.uid() = user_id);

create policy "email_subs_update_own"
on public.email_subscriptions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Keep updated_at fresh
create or replace function public.tg_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists set_email_subs_updated_at on public.email_subscriptions;
create trigger set_email_subs_updated_at
before update on public.email_subscriptions
for each row execute function public.tg_set_updated_at();

