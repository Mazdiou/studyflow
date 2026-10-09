-- Migration : set_pastel_credentials_function
-- Définit ou modifie le compte Pastel d'un dossier (e-mail + mot de passe
-- chiffré) dans UNE transaction. Appelable uniquement par le serveur.
--
-- - Compte « à créer » : l'e-mail ET le mot de passe sont obligatoires ;
--   le dossier passe à « existing ».
-- - Compte « existing » : l'e-mail est obligatoire ; le mot de passe est
--   facultatif (absent = l'ancien est conservé).

create or replace function public.set_pastel_credentials(
  p_case_id uuid,
  p_agency_id uuid,
  p_actor_id uuid,
  p_pastel_email text,
  p_password_encrypted text,
  p_key_version smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account text;
  v_has_secret boolean;
begin
  -- L'auteur doit être un utilisateur actif de cette agence
  if not exists (
    select 1 from public.profiles
    where id = p_actor_id and agency_id = p_agency_id and is_active
  ) then
    raise exception 'Utilisateur invalide' using errcode = '42501';
  end if;

  -- Verrouille le dossier (de la bonne agence) jusqu'à la fin de la transaction
  select pastel_account into v_account
  from public.cases
  where id = p_case_id and agency_id = p_agency_id
  for update;

  if not found then
    raise exception 'Dossier introuvable' using errcode = 'P0002';
  end if;

  if length(trim(coalesce(p_pastel_email, ''))) = 0 then
    raise exception 'E-mail Pastel requis' using errcode = '23514';
  end if;

  select exists (
    select 1 from public.case_pastel_credentials where case_id = p_case_id
  ) into v_has_secret;

  -- Sans mot de passe déjà enregistré, un nouveau mot de passe est obligatoire
  if coalesce(p_password_encrypted, '') = '' and not v_has_secret then
    raise exception 'Mot de passe Pastel requis' using errcode = '23514';
  end if;

  update public.cases
  set pastel_account = 'existing',
      pastel_email = trim(p_pastel_email)
  where id = p_case_id and agency_id = p_agency_id;

  if coalesce(p_password_encrypted, '') <> '' then
    insert into public.case_pastel_credentials (
      case_id, agency_id, password_encrypted, key_version, updated_by
    ) values (
      p_case_id, p_agency_id, p_password_encrypted, p_key_version, p_actor_id
    )
    on conflict (case_id) do update
      set password_encrypted = excluded.password_encrypted,
          key_version = excluded.key_version,
          updated_by = excluded.updated_by,
          updated_at = now();
  end if;
end;
$$;

revoke all on function public.set_pastel_credentials(
  uuid, uuid, uuid, text, text, smallint
) from public, anon, authenticated;

grant execute on function public.set_pastel_credentials(
  uuid, uuid, uuid, text, text, smallint
) to service_role;