-- Enable RLS
alter table public.issues             enable row level security;
alter table public.city_subscriptions enable row level security;
alter table public.push_subscriptions enable row level security;

-- Policies: issues
create policy "Public read issues"
  on public.issues for select
  using (true);

create policy "Insert own issues"
  on public.issues for insert
  with check (auth.uid() = creator_id);

create policy "Update own issues"
  on public.issues for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

-- Policies: city_subscriptions
create policy "CRUD own city_subscriptions"
  on public.city_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- push_subscriptions: no client policies (server-only access)

-- Storage policies (issue-photos bucket)
create policy "Public read issue-photos"
  on storage.objects for select
  using (bucket_id = 'issue-photos');

create policy "Authenticated upload issue-photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'issue-photos');

