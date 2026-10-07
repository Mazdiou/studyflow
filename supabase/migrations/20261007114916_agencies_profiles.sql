-- Migration : agencies_profiles
-- Tables agencies et profiles, fonctions d'aide, droits et RLS

-- Droits par défaut : rien n'est exposé automatiquement
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- Tables
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  city text not null check (length(trim(city)) > 0),
  phone text not null check (length(trim(phone)) > 0),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null check (length(trim(last_name)) > 0),
  role text not null check (role in ('owner', 'employee')),
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

create index profiles_agency_id_idx on public.profiles (agency_id);

alter table public.agencies enable row level security;
alter table public.profiles enable row level security;

-- Retirer tout droit éventuellement accordé automatiquement
revoke all on public.agencies from anon, authenticated;
revoke all on public.profiles from anon, authenticated;

-- Fonctions d'aide (security definer : évite la récursion RLS)
create or replace function public.current_agency_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select agency_id from public.profiles
  where id = (select auth.uid()) and is_active
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role = 'owner' from public.profiles
     where id = (select auth.uid()) and is_active),
    false
  )
$$;

-- Création d'une agence et de son premier patron (une seule transaction).
-- Appelée uniquement par la route serveur d'inscription (clé secrète).
create or replace function public.create_agency_with_owner(
  p_user_id uuid,
  p_agency_name text,
  p_city text,
  p_phone text,
  p_first_name text,
  p_last_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agency_id uuid;
begin
  insert into public.agencies (name, city, phone)
  values (p_agency_name, p_city, p_phone)
  returning id into v_agency_id;

  insert into public.profiles (id, agency_id, first_name, last_name, role)
  values (p_user_id, v_agency_id, p_first_name, p_last_name, 'owner');

  return v_agency_id;
end;
$$;

-- Droits d'exécution des fonctions
revoke all on function public.current_agency_id() from public, anon;
revoke all on function public.is_owner() from public, anon;
revoke all on function public.create_agency_with_owner(uuid, text, text, text, text, text)
  from public, anon, authenticated;

grant execute on function public.current_agency_id() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.create_agency_with_owner(uuid, text, text, text, text, text)
  to service_role;

-- Droits d'accès aux tables (exposition manuelle de l'API)
-- Utilisateurs connectés : lecture, et modification de colonnes précises
grant select on public.agencies to authenticated;
grant update (name, city, phone) on public.agencies to authenticated;

grant select on public.profiles to authenticated;
grant update (first_name, last_name, is_active) on public.profiles to authenticated;
-- Aucun insert/delete côté client, role et agency_id non modifiables.

-- Routes serveur (clé secrète) : accès complet
grant select, insert, update, delete on public.agencies to service_role;
grant select, insert, update, delete on public.profiles to service_role;

-- Règles RLS
create policy "agencies_select_own" on public.agencies
  for select to authenticated
  using (id = public.current_agency_id());

create policy "agencies_update_owner" on public.agencies
  for update to authenticated
  using (id = public.current_agency_id() and public.is_owner())
  with check (id = public.current_agency_id());

create policy "profiles_select_same_agency" on public.profiles
  for select to authenticated
  using (agency_id = public.current_agency_id());

create policy "profiles_update_owner" on public.profiles
  for update to authenticated
  using (agency_id = public.current_agency_id() and public.is_owner())
  with check (agency_id = public.current_agency_id());