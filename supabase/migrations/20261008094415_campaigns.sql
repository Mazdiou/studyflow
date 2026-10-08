-- Migration : campaigns
-- Campagnes Études en France : table GLOBALE (partagée par toutes
-- les agences), en lecture seule pour les utilisateurs.

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  label text not null unique check (length(trim(label)) > 0),
  opens_on date,
  deadline_non_dap date,
  deadline_dap date,
  deadline_pro date,
  interviews_end_on date,
  institutions_answer_deadline date,
  final_choice_deadline date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  constraint campaigns_deadlines_after_opening check (
    opens_on is null or (
      (deadline_non_dap is null or deadline_non_dap >= opens_on)
      and (deadline_dap is null or deadline_dap >= opens_on)
      and (deadline_pro is null or deadline_pro >= opens_on)
    )
  )
);

-- Une seule campagne en cours à la fois
create unique index campaigns_one_current_idx
  on public.campaigns (is_current)
  where is_current;

alter table public.campaigns enable row level security;

revoke all on public.campaigns from anon, authenticated;

-- Lecture seule pour les utilisateurs connectés ; aucune écriture côté client
grant select on public.campaigns to authenticated;
grant select on public.campaigns to service_role;

-- Tout utilisateur actif d'une agence lit les campagnes
create policy "campaigns_select_active_users" on public.campaigns
  for select to authenticated
  using (public.current_agency_id() is not null);

-- Campagne 2026/2027 (Algérie)
insert into public.campaigns (
  label,
  opens_on,
  deadline_non_dap,
  deadline_dap,
  deadline_pro,
  interviews_end_on,
  institutions_answer_deadline,
  final_choice_deadline,
  is_current
) values (
  '2026/2027',
  '2026-10-01',
  '2026-11-30',
  '2026-12-15',
  '2026-12-15',
  '2027-03-15',
  '2027-04-30',
  '2027-05-31',
  true
);