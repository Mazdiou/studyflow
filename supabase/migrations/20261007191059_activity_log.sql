-- Migration : activity_log
-- Journal d'activité : écriture par le serveur uniquement,
-- insertion seule (ni modification ni suppression)

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  actor_id uuid,
  action text not null check (length(trim(action)) > 0),
  target_type text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_agency_created_idx
  on public.activity_log (agency_id, created_at desc);

alter table public.activity_log enable row level security;

-- Retirer tout droit éventuel, puis accorder uniquement le nécessaire
revoke all on public.activity_log from anon, authenticated;

-- Lecture : utilisateurs connectés (filtrés par la règle RLS ci-dessous)
grant select on public.activity_log to authenticated;

-- Écriture : routes serveur uniquement, insertion seule
grant select, insert on public.activity_log to service_role;

-- Seul le patron d'une agence lit le journal de son agence
create policy "activity_log_select_owner" on public.activity_log
  for select to authenticated
  using (agency_id = public.current_agency_id() and public.is_owner());