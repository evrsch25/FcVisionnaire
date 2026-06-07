-- ============================================================================

-- FC Visionnaire — Schéma (modèle round par round)

-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > Run.

-- Idempotent : peut être relancé sans erreur.

-- ============================================================================



-- Phase courante du tournoi (pilotée par l'admin).

alter table public.app_settings

  add column if not exists current_phase text not null default 'GROUPS';



-- Lauréats réels des distinctions (saisis par l'admin).

alter table public.app_settings

  add column if not exists real_distinctions jsonb not null default '{}';



-- Métadonnées des matchs à élimination.

alter table public.matches

  add column if not exists slot text;



alter table public.matches

  add column if not exists real_winner text;



create unique index if not exists idx_matches_slot on public.matches(slot)

  where slot is not null;



-- Points gagnés sur une distinction (recalculés automatiquement).

alter table public.distinctions

  add column if not exists points_earned integer not null default 0;



-- Badges à paliers (type + tier + libellé affiché).

alter table public.badges

  add column if not exists badge_type text;

alter table public.badges

  add column if not exists tier text;



-- Stats persistantes pour badges à streak (touriste, parachute).

create table if not exists public.user_badge_stats (

  user_id uuid primary key references public.users(id) on delete cascade,

  touriste_last_streak integer not null default 0,

  parachute_big_drop_count integer not null default 0

);





-- Tables du modèle A (bracket par joueur) — obsolètes.

drop table if exists public.knockout_predictions;

drop table if exists public.group_rankings;


