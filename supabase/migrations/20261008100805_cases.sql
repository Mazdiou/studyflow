-- Migration : cases (dossiers candidats)
-- Lecture : utilisateurs actifs de l'agence (RLS).
-- Écriture : routes serveur uniquement. Aucune suppression.

-- Nécessaire pour les liens composites (profil, agence)
alter table public.profiles
  add constraint profiles_id_agency_unique unique (id, agency_id);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id),
  created_by uuid not null,
  assigned_to uuid,

  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null check (length(trim(last_name)) > 0),
  birth_date date not null check (birth_date > date '1900-01-01'),
  phone text not null check (length(trim(phone)) > 0),
  email text check (email is null or length(trim(email)) > 0),

  education_level text not null
    check (education_level in ('terminale', 'l1', 'l2', 'l3', 'm1', 'm2')),
  main_track text check (main_track in ('dap', 'non_dap')),
  schools boolean not null default false,
  scope text not null check (scope in ('application', 'visa', 'both')),

  pastel_account text not null check (pastel_account in ('to_create', 'existing')),
  pastel_email text,

  language_tests text[] not null default '{}',
  diplomas text[] not null default '{}',

  status text not null default 'active'
    check (status in ('active', 'closed', 'abandoned')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Le créateur et le responsable appartiennent à la même agence que le dossier.
  -- Un employé qui a créé un dossier ne peut pas être supprimé (désactivation seulement).
  constraint cases_created_by_fk foreign key (created_by, agency_id)
    references public.profiles (id, agency_id),
  constraint cases_assigned_to_fk foreign key (assigned_to, agency_id)
    references public.profiles (id, agency_id) on delete set null (assigned_to),

  constraint cases_track_or_schools check (main_track is not null or schools),
  constraint cases_pastel_email_if_existing check (
    pastel_account <> 'existing' or length(trim(coalesce(pastel_email, ''))) > 0
  ),
  constraint cases_language_tests_valid check (
    language_tests <@ array['fr', 'en']::text[] and cardinality(language_tests) <= 2
  ),
  constraint cases_diplomas_valid check (
    diplomas <@ array['bac', 'licence', 'master']::text[] and cardinality(diplomas) <= 3
  )
);

create index cases_agency_campaign_idx
  on public.cases (agency_id, campaign_id, created_at desc);
create index cases_created_by_idx on public.cases (created_by);
create index cases_assigned_to_idx on public.cases (assigned_to);

-- Colonnes non modifiables + date de modification automatique
create or replace function public.cases_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.agency_id is distinct from old.agency_id
     or new.campaign_id is distinct from old.campaign_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'agency_id, campaign_id, created_by et created_at ne sont pas modifiables'
      using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger cases_before_update
  before update on public.cases
  for each row execute function public.cases_before_update();

alter table public.cases enable row level security;

revoke all on public.cases from anon, authenticated;

-- Lecture pour les utilisateurs connectés (filtrée par la règle RLS)
grant select on public.cases to authenticated;

-- Routes serveur : lecture, création, modification. Jamais de suppression.
grant select, insert, update on public.cases to service_role;

create policy "cases_select_same_agency" on public.cases
  for select to authenticated
  using (agency_id = public.current_agency_id());