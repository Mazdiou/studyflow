-- Migration : create_case_function
-- Crée un dossier et, si fourni, son mot de passe Pastel chiffré,
-- dans UNE transaction. Appelable uniquement par le serveur.

create or replace function public.create_case(
  p_case_id uuid,
  p_agency_id uuid,
  p_created_by uuid,
  p_assigned_to uuid,
  p_first_name text,
  p_last_name text,
  p_birth_date date,
  p_phone text,
  p_email text,
  p_education_level text,
  p_main_track text,
  p_schools boolean,
  p_scope text,
  p_pastel_account text,
  p_pastel_email text,
  p_language_tests text[],
  p_diplomas text[],
  p_password_encrypted text,
  p_key_version smallint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign_id uuid;
begin
  select id into v_campaign_id from public.campaigns where is_current;
  if v_campaign_id is null then
    raise exception 'Aucune campagne en cours' using errcode = 'P0001';
  end if;

  -- Le créateur doit être un utilisateur actif de cette agence
  if not exists (
    select 1 from public.profiles
    where id = p_created_by and agency_id = p_agency_id and is_active
  ) then
    raise exception 'Créateur invalide' using errcode = '42501';
  end if;

  -- Le responsable, s'il est indiqué, doit être actif et de la même agence
  if p_assigned_to is not null and not exists (
    select 1 from public.profiles
    where id = p_assigned_to and agency_id = p_agency_id and is_active
  ) then
    raise exception 'Responsable invalide' using errcode = '22023';
  end if;

  -- Compte Pastel existant : le mot de passe est obligatoire
  if p_pastel_account = 'existing'
     and coalesce(p_password_encrypted, '') = '' then
    raise exception 'Mot de passe Pastel requis' using errcode = '23514';
  end if;

  insert into public.cases (
    id, agency_id, campaign_id, created_by, assigned_to,
    first_name, last_name, birth_date, phone, email,
    education_level, main_track, schools, scope,
    pastel_account, pastel_email, language_tests, diplomas
  ) values (
    p_case_id, p_agency_id, v_campaign_id, p_created_by, p_assigned_to,
    p_first_name, p_last_name, p_birth_date, p_phone, p_email,
    p_education_level, p_main_track, p_schools, p_scope,
    p_pastel_account, p_pastel_email, p_language_tests, p_diplomas
  );

  if coalesce(p_password_encrypted, '') <> '' then
    insert into public.case_pastel_credentials (
      case_id, agency_id, password_encrypted, key_version, updated_by
    ) values (
      p_case_id, p_agency_id, p_password_encrypted, p_key_version, p_created_by
    );
  end if;

  return p_case_id;
end;
$$;

revoke all on function public.create_case(
  uuid, uuid, uuid, uuid, text, text, date, text, text, text, text,
  boolean, text, text, text, text[], text[], text, smallint
) from public, anon, authenticated;

grant execute on function public.create_case(
  uuid, uuid, uuid, uuid, text, text, date, text, text, text, text,
  boolean, text, text, text, text[], text[], text, smallint
) to service_role;