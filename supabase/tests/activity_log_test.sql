begin;
select plan(6);

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

-- Une ligne de journal par agence
insert into public.activity_log (agency_id, actor_id, action)
select agency_id, id, 'test.action' from public.profiles
where id in ('11111111-1111-1111-1111-111111111111',
             '33333333-3333-3333-3333-333333333333');

-- Connecté comme patron A
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*) from public.activity_log), 1::bigint,
  'patron A ne voit que le journal de son agence');

select throws_ok(
  $$insert into public.activity_log (agency_id, action)
    values (gen_random_uuid(), 'x')$$,
  '42501', null, 'un utilisateur connecté ne peut pas écrire dans le journal');

select throws_ok(
  $$update public.activity_log set action = 'x'$$,
  '42501', null, 'personne ne peut modifier le journal');

select throws_ok(
  $$delete from public.activity_log$$,
  '42501', null, 'personne ne peut supprimer du journal');

-- Employé A
reset role;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*) from public.activity_log), 0::bigint,
  'un employé ne voit rien du journal');

-- Visiteur non connecté
reset role;
set local role anon;

select throws_ok(
  $$select count(*) from public.activity_log$$,
  '42501', null, 'un visiteur ne peut pas lire le journal');

select * from finish();
rollback;