-- Migration : revoke_direct_writes
-- Règle du projet : le navigateur lit (RLS), les écritures passent par les
-- routes serveur. Jusqu'ici, un utilisateur connecté pouvait modifier
-- directement profiles (prénom, nom, is_active) et agencies (nom, ville,
-- téléphone) : un patron pouvait par exemple se désactiver lui-même, ou
-- changer le statut d'un employé sans blocage Auth ni journal.
-- Aucun code du navigateur n'écrit dans ces tables : on retire ces droits.

drop policy if exists "profiles_update_owner" on public.profiles;
drop policy if exists "agencies_update_owner" on public.agencies;

-- Retire aussi les droits par colonne accordés par la première migration
revoke update on public.profiles from authenticated;
revoke update on public.agencies from authenticated;
