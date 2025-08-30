-- Extensions (for UUIDs)
create extension if not exists pgcrypto;

-- Enum for status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'issue_status') then
    create type issue_status as enum ('open','resolved');
  end if;
end$$;

-- 1) issues
create table if not exists public.issues (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) <= 120),
  type        text not null check (type in ('pothole','garbage','graffiti','light','other')),
  description text,
  city        text not null default 'Toronto',
  status      issue_status not null default 'open',
  photo_url   text,
  lat         double precision not null,
  lng         double precision not null,
  creator_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Trigger function for updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_issues_updated_at on public.issues;
create trigger trg_issues_updated_at
before update on public.issues
for each row execute function public.set_updated_at();

-- 2) city_subscriptions
create table if not exists public.city_subscriptions (
  user_id    uuid not null references auth.users(id) on delete cascade,
  city       text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, city)
);

-- 3) push_subscriptions
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  subscription jsonb not null,
  created_at   timestamptz not null default now()
);

