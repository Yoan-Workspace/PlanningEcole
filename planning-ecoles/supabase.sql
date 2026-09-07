-- Table unique pour le planning partagé.
-- Accès uniquement via la fonction Netlify (clé service_role).
-- Aucune lecture/écriture publique (anon).

create table if not exists planning_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

alter table planning_state enable row level security;

drop policy if exists "Allow anon read" on planning_state;
drop policy if exists "Allow anon upsert" on planning_state;
drop policy if exists "Allow anon update" on planning_state;

revoke all on table planning_state from anon, authenticated;
grant all on table planning_state to service_role;
