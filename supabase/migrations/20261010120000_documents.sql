-- Migration : documents
-- Documents PDF d'un dossier (noms libres, 10 Mo maximum).
-- Lecture : utilisateurs actifs de l'agence (RLS).
-- Écriture : routes serveur uniquement.
-- Un document verrouillé par le patron ne peut ni être renommé ni supprimé
-- (garanti par des triggers, donc même en cas de bug dans une route).

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  case_id uuid not null,

  -- Nom libre donné par l'agence
  name text not null check (length(trim(name)) between 1 and 120),
  -- Nom du fichier envoyé, pour information seulement
  original_file_name text not null
    check (length(trim(original_file_name)) between 1 and 255),

  -- Toujours agency_id/case_id/document_id.pdf : jamais un nom saisi par un utilisateur
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),

  uploaded_by uuid not null,
  locked_at timestamptz,
  locked_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Le dossier et les profils appartiennent à la même agence que le document.
  -- Pas de suppression en cascade : un employé qui a envoyé ou verrouillé un
  -- document ne peut plus être supprimé (désactivation seulement).
  constraint documents_case_fk foreign key (case_id, agency_id)
    references public.cases (id, agency_id),
  constraint documents_uploaded_by_fk foreign key (uploaded_by, agency_id)
    references public.profiles (id, agency_id),
  constraint documents_locked_by_fk foreign key (locked_by, agency_id)
    references public.profiles (id, agency_id),

  constraint documents_lock_consistent
    check ((locked_at is null) = (locked_by is null)),
  constraint documents_path_format check (
    storage_path = agency_id::text || '/' || case_id::text || '/' || id::text || '.pdf'
  )
);

create index documents_case_idx
  on public.documents (agency_id, case_id, created_at desc);
create index documents_uploaded_by_idx on public.documents (uploaded_by);
create index documents_locked_by_idx on public.documents (locked_by);

-- Colonnes non modifiables, document verrouillé figé, date de modification
create or replace function public.documents_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.agency_id is distinct from old.agency_id
     or new.case_id is distinct from old.case_id
     or new.storage_path is distinct from old.storage_path
     or new.size_bytes is distinct from old.size_bytes
     or new.original_file_name is distinct from old.original_file_name
     or new.uploaded_by is distinct from old.uploaded_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Ces colonnes du document ne sont pas modifiables'
      using errcode = '42501';
  end if;

  -- Un document verrouillé ne peut pas être renommé
  -- (même en même temps qu'on le déverrouille)
  if old.locked_at is not null and new.name is distinct from old.name then
    raise exception 'Document verrouillé : il ne peut plus être renommé'
      using errcode = '55006';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger documents_before_update
  before update on public.documents
  for each row execute function public.documents_before_update();

-- Un document verrouillé ne peut pas être supprimé
create or replace function public.documents_before_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.locked_at is not null then
    raise exception 'Document verrouillé : il ne peut plus être supprimé'
      using errcode = '55006';
  end if;
  return old;
end;
$$;

create trigger documents_before_delete
  before delete on public.documents
  for each row execute function public.documents_before_delete();

alter table public.documents enable row level security;

revoke all on public.documents from anon, authenticated;
grant select on public.documents to authenticated;
-- Routes serveur : lecture, ajout, renommage, suppression (si non verrouillé)
grant select, insert, update, delete on public.documents to service_role;

create policy "documents_select_same_agency" on public.documents
  for select to authenticated
  using (agency_id = public.current_agency_id());

-- Verrouiller / déverrouiller : seul un patron actif de l'agence.
-- La vérification est faite ici, pas seulement dans la route.
create or replace function public.set_document_lock(
  p_document_id uuid,
  p_agency_id uuid,
  p_actor_id uuid,
  p_locked boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = p_actor_id
      and agency_id = p_agency_id
      and role = 'owner'
      and is_active
  ) then
    raise exception 'Seul un patron actif peut verrouiller un document'
      using errcode = '42501';
  end if;

  update public.documents
  set locked_at = case when p_locked then coalesce(locked_at, now()) else null end,
      locked_by = case when p_locked then coalesce(locked_by, p_actor_id) else null end
  where id = p_document_id and agency_id = p_agency_id;

  if not found then
    raise exception 'Document introuvable' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_document_lock(uuid, uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_document_lock(uuid, uuid, uuid, boolean)
  to service_role;

-- Stockage privé des PDF. Aucune règle sur storage.objects : ni les visiteurs
-- ni les utilisateurs connectés n'ont accès direct, seul le serveur (clé secrète)
-- envoie et lit, par URL signée.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('case-documents', 'case-documents', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;
