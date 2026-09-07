-- Table unique pour le planning partagé
create table if not exists planning_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

alter table planning_state enable row level security;

create policy "Allow anon read"
  on planning_state for select
  to anon
  using (true);

create policy "Allow anon upsert"
  on planning_state for insert
  to anon
  with check (true);

create policy "Allow anon update"
  on planning_state for update
  to anon
  using (true)
  with check (true);

alter publication supabase_realtime add table planning_state;
