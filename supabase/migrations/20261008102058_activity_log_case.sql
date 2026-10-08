-- Migration : activity_log_case
-- Rattache une ligne du journal à un dossier (facultatif).

alter table public.activity_log add column case_id uuid;

-- Le dossier doit appartenir à la même agence que la ligne de journal.
-- Pas de suppression en cascade : le journal reste, même si un dossier
-- disparaissait un jour (seule la suppression d'une agence efface tout).
alter table public.activity_log
  add constraint activity_log_case_fk foreign key (case_id, agency_id)
  references public.cases (id, agency_id);

create index activity_log_case_idx
  on public.activity_log (agency_id, case_id, created_at desc)
  where case_id is not null;