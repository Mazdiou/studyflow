begin;
select plan(9);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a1@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'b1@test.local');

select public.create_agency_with_owner(
  '11111111-1111-1111-1111-111111111111', 'Agence A', 'Alger', '0555000001', 'Patron', 'A');
select public.create_agency_with_owner(
  '33333333-3333-3333-3333-333333333333', 'Agence B', 'Oran', '0555000002', 'Patron', 'B');

create temp table ctx as
select
  (select agency_id from public.profiles
    where id = '11111111-1111-1111-1111-111111111111') as agency_a,
  (select id from public.campaigns where is_current) as campaign;

-- Création avec compte existant et mot de passe chiffré
select lives_ok(
  $$select public.create_case(
      'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
      (select agency_a from ctx),
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Karim', 'Test', '2004-05-01'::date, '0555111111', null,
      'l3', 'non_dap', false, 'both', 'existing', 'karim@example.com',
      array['fr'], array['bac'], 'valeur-chiffree', 1::smallint)$$,
  'la fonction crée un dossier avec mot de passe chiffré');

select is(
  (select count(*) from public.case_pastel_credentials
   where case_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1::bigint, 'le mot de passe chiffré est enregistré avec le dossier');

select is(
  (select campaign_id from public.cases
   where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  (select campaign from ctx), 'le dossier est rattaché à la campagne en cours');

-- Compte existant sans mot de passe
select throws_ok(
  $$select public.create_case(
      'aaaaaaaa-0000-0000-0000-000000000002'::uuid,
      (select agency_a from ctx),
      '11111111-1111-1111-1111-111111111111'::uuid,
      'X', 'Y', '2004-01-01'::date, '0555', null,
      'l3', 'dap', false, 'both', 'existing', 'x@example.com',
      array[]::text[], array[]::text[], null, 1::smallint)$$,
  '23514', null, 'un compte Pastel existant sans mot de passe est refusé');

-- Créateur d'une autre agence
select throws_ok(
  $$select public.create_case(
      'aaaaaaaa-0000-0000-0000-000000000003'::uuid,
      (select agency_a from ctx),
      '33333333-3333-3333-3333-333333333333'::uuid,
      'X', 'Y', '2004-01-01'::date, '0555', null,
      'l3', 'dap', false, 'both', 'to_create', null,
      array[]::text[], array[]::text[], null, 1::smallint)$$,
  '42501', null, 'un créateur d''une autre agence est refusé');

-- Compte à créer : pas de mot de passe, pas de ligne de secret
select lives_ok(
  $$select public.create_case(
      'aaaaaaaa-0000-0000-0000-000000000004'::uuid,
      (select agency_a from ctx),
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Sans', 'Pastel', '2005-03-03'::date, '0555222222', null,
      'terminale', 'dap', false, 'application', 'to_create', null,
      array[]::text[], array[]::text[], null, 1::smallint)$$,
  'un compte à créer ne demande pas de mot de passe');

select is(
  (select count(*) from public.case_pastel_credentials
   where case_id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  0::bigint, 'aucune ligne de secret pour un compte à créer');

-- Appel direct interdit aux utilisateurs connectés et aux visiteurs
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select throws_ok(
  $$select public.create_case(
      gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
      'X', 'Y', '2004-01-01'::date, '0555', null,
      'l3', 'dap', false, 'both', 'to_create', null,
      array[]::text[], array[]::text[], null, 1::smallint)$$,
  '42501', null, 'un utilisateur connecté ne peut pas appeler create_case');

reset role;
set local role anon;

select throws_ok(
  $$select public.create_case(
      gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
      'X', 'Y', '2004-01-01'::date, '0555', null,
      'l3', 'dap', false, 'both', 'to_create', null,
      array[]::text[], array[]::text[], null, 1::smallint)$$,
  '42501', null, 'un visiteur ne peut pas appeler create_case');

select * from finish();
rollback;