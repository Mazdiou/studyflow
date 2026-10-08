-- Migration : case_pastel_credentials
-- Mot de passe du compte Pastel de l'étudiant, CHIFFRÉ par le serveur.
-- Aucun droit pour les utilisateurs connectés : serveur uniquement.

-- Nécessaire pour le lien composite (dossier, agence)
alter table public.cases
  add constraint cases_id_agency_unique unique (id, agency_id);

create table public.case_pastel_credentials (
  case_id uuid primary key,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  password_encrypted text not null check (length(password_encrypted) > 0),
  key_version smallint not null default 1,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint case_pastel_credentials_case_fk foreign key (case_id, agency_id)
    references public.cases (id, agency_id) on delete cascade
);

alter table public.case_pastel_credentials enable row level security;

-- Aucun droit côté client, même en lecture
revoke all on public.case_pastel_credentials from anon, authenticated;

-- Serveur uniquement. Pas de suppression.
grant select, insert, update on public.case_pastel_credentials to service_role;