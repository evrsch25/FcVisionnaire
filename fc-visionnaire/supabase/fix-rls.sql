-- ============================================================================
-- FC Visionnaire — Correction RLS
-- L'app utilise la clé publishable côté serveur (pas Supabase Auth).
-- Si RLS est activé sans policy permissive, tout est bloqué silencieusement.
-- À exécuter dans Supabase : SQL Editor > Run.
-- ============================================================================

-- Option recommandée pour une ligue privée : désactiver RLS sur les tables app.
alter table public.users disable row level security;
alter table public.matches disable row level security;
alter table public.predictions disable row level security;
alter table public.distinctions disable row level security;
alter table public.badges disable row level security;
alter table public.app_settings disable row level security;
alter table public.user_badge_stats disable row level security;

-- Ligne de configuration obligatoire (id = 1).
insert into public.app_settings (id, is_locked, current_phase, real_distinctions)
values (1, false, 'GROUPS', '{}'::jsonb)
on conflict (id) do update set
  current_phase = coalesce(public.app_settings.current_phase, 'GROUPS'),
  real_distinctions = coalesce(public.app_settings.real_distinctions, '{}'::jsonb);
