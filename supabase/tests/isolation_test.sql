begin;
select plan(16);

-- Données de test : agence A (patron a1, employé a2), agence B (patron b1)
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a1@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'a2@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'b1@test.local');

select public.create_agency_with_owner(
  '11111111-1111-1111-1111-111111111111', 'Agence A', 'Alger', '0555000001', 'Patron', 'A');
select public.create_agency_with_owner(
  '33333333-3333-3333-3333-333333333333', 'Agence B', 'Oran', '0555000002', 'Patron', 'B');

insert into public.profiles (id, agency_id, first_name, last_name, role)
select '22222222-2222-2222-2222-222222222222', agency_id, 'Employe', 'A', 'employee'
from public.profiles where id = '11111111-1111-1111-1111-111111111111';

-- Connecté comme patron A
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*) from public.agencies), 1::bigint,
  'patron A ne voit que sa propre agence');
select is((select count(*) from public.profiles), 2::bigint,
  'patron A ne voit que les 2 profils de son agence');
select is((select count(*) from public.profiles
           where id = '33333333-3333-3333-3333-333333333333'), 0::bigint,
  'patron A ne voit pas le profil du patron B');

select throws_ok(
  $$update public.profiles set role = 'employee'
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'patron A ne peut pas modifier un rôle');

select throws_ok(
  $$insert into public.profiles (id, agency_id, first_name, last_name, role)
    values (gen_random_uuid(), gen_random_uuid(), 'X', 'Y', 'owner')$$,
  '42501', null, 'un utilisateur connecté ne peut pas créer de profil');

select throws_ok(
  $$select public.create_agency_with_owner(
      gen_random_uuid(), 'Pirate', 'X', '000', 'P', 'P')$$,
  '42501', null, 'un utilisateur connecté ne peut pas appeler create_agency_with_owner');

-- Plus aucun droit d'écriture direct : refus net (42501), pas seulement 0 ligne
select throws_ok(
  $$update public.agencies set name = 'Piratee' where name = 'Agence B'$$,
  '42501', null, 'patron A n''a aucun droit d''écriture direct sur agencies');
select throws_ok(
  $$update public.profiles set is_active = false
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'le patron ne peut pas se désactiver lui-même depuis le navigateur');
select throws_ok(
  $$update public.agencies set name = 'Autre nom'
    where id = (select agency_id from public.profiles
                where id = '11111111-1111-1111-1111-111111111111')$$,
  '42501', null, 'le patron ne peut pas renommer son agence depuis le navigateur');
reset role;
select is((select count(*) from public.agencies where name = 'Piratee'), 0::bigint,
  'patron A ne peut pas modifier l''agence B');

-- Connecté comme employé A
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select throws_ok(
  $$update public.profiles set is_active = false
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'un employé n''a aucun droit d''écriture direct sur profiles');
reset role;
select is((select is_active from public.profiles
           where id = '11111111-1111-1111-1111-111111111111'), true,
  'un employé ne peut pas désactiver le patron');

set local role authenticated;
select throws_ok(
  $$update public.agencies set name = 'Piratee 2'
    where id = (select agency_id from public.profiles
                where id = '11111111-1111-1111-1111-111111111111')$$,
  '42501', null, 'un employé n''a aucun droit d''écriture direct sur agencies');
reset role;
select is((select count(*) from public.agencies where name = 'Piratee 2'), 0::bigint,
  'un employé ne peut pas modifier son agence');

set local role authenticated;
select throws_ok(
  $$update public.profiles set role = 'owner'
    where id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null, 'un employé ne peut pas se promouvoir patron');

-- Visiteur non connecté
reset role;
set local role anon;
select throws_ok(
  $$select count(*) from public.agencies$$,
  '42501', null, 'un visiteur non connecté ne peut rien lire');

select * from finish();
rollback;