import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  updateRealScore,
  recalculateAll,
  updateMatchInfo,
  deleteMatch,
  advancePhase,
  updateRealDistinctions,
} from "@/app/actions/admin";
import { DISTINCTION_CATEGORIES } from "@/lib/tournament/distinctions";
import type { RealDistinctions } from "@/lib/tournament/distinctions";
import {
  getPhaseKickoff,
  isKickoffPassed,
  formatKickoffFr,
} from "@/lib/tournament/phaseLock";
import GroupCreationForm from "./GroupCreationForm";
import {
  currentPhaseComplete,
  type DbMatch,
} from "@/lib/tournament/realBracket";
import {
  PHASE_LABELS,
  nextPhase,
  type Phase,
} from "@/lib/tournament/phases";
import { requireAdminSession, logoutAdmin } from "@/app/actions/adminAuth";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

export default async function AdminPage(props: PageProps) {
  await requireAdminSession();

  const searchParams = await props.searchParams;
  const sortBy = searchParams.sort || "date";

  const { data: settings } = await supabase
    .from("app_settings")
    .select("current_phase, real_distinctions")
    .eq("id", 1)
    .single();

  const realDistinctions = (settings?.real_distinctions ?? {}) as RealDistinctions;
  const currentPhase = (settings?.current_phase ?? "GROUPS") as Phase;
  const followingPhase = nextPhase(currentPhase);

  let matchesQuery = supabase.from("matches").select("*");

  if (sortBy === "group") {
    // Tri principal par Groupe (A-Z) puis Date chronologique
    matchesQuery = matchesQuery
      .order("stage", { ascending: true })
      .order("match_date", { ascending: true });
  } else {
    // Tri principal par Date (Chronologique global) puis par Groupe si même heure
    matchesQuery = matchesQuery
      .order("match_date", { ascending: true })
      .order("stage", { ascending: true });
  }

  const { data: matches } = await matchesQuery;
  const dbMatches = (matches ?? []) as DbMatch[];
  const phaseStatus = currentPhaseComplete(currentPhase, dbMatches);

  const phaseKickoff = getPhaseKickoff(currentPhase, dbMatches);
  const phaseKickoffLabel = formatKickoffFr(phaseKickoff);
  const phaseKickoffPassed = isKickoffPassed(phaseKickoff);

  const formatDateForInput = (isoString: string) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toISOString().slice(0, 16);
    } catch (e) {
      return "";
    }
  };
  const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  const existingGroupsData: Record<string, string[]> = {};
  if (matches) {
    const groupTeamsMap = new Map<string, Set<string>>();
    for (const match of matches) {
      if (
        match.stage &&
        match.stage.startsWith("Groupe ") &&
        match.team_home &&
        match.team_away
      ) {
        const groupLetter = match.stage.split(" ")[1];
        if (!groupTeamsMap.has(groupLetter)) {
          groupTeamsMap.set(groupLetter, new Set());
        }
        groupTeamsMap.get(groupLetter)?.add(match.team_home);
        groupTeamsMap.get(groupLetter)?.add(match.team_away);
      }
    }
    for (const [groupLetter, teamSet] of groupTeamsMap.entries()) {
      existingGroupsData[groupLetter] = Array.from(teamSet);
    }
  }

  return (
    <div className="min-h-screen text-text-base p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER ADMIN */}
        <header className="surface flex flex-col md:flex-row justify-between items-center gap-6 p-6">
          <div className="text-center md:text-left">
            <p className="eyebrow">Espace administrateur</p>
            <h1 className="font-display text-3xl font-bold text-text-base uppercase tracking-wide mt-1">
              Panel Admin
            </h1>
            <p className="text-text-muted text-sm mt-1">
              Gestion de la compétition et des scores.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <form action={logoutAdmin}>
              <button type="submit" className="btn-ghost btn-sm">
                Déconnexion admin
              </button>
            </form>
            <form action={recalculateAll}>
              <button type="submit" className="btn-secondary">
                Forcer le recalcul
              </button>
            </form>
            <p className="text-[10px] text-text-muted text-center max-w-[140px]">
              Auto après chaque action admin + 1×/jour (cron)
            </p>

            <div className="surface-2 p-3 text-sm text-text-muted max-w-xs">
              <p>
                Verrouillage auto :{" "}
                <span className="font-bold text-text-base">
                  {phaseKickoffLabel ?? "—"}
                </span>
              </p>
              <p className="mt-1 text-xs">
                {phaseKickoffPassed
                  ? "Coup d'envoi passé — modifications joueur = demi-points."
                  : "Les pronos se verrouillent au coup d'envoi du 1er match de la phase."}
              </p>
            </div>
          </div>
        </header>

        {/* DIRECTION DU TOURNOI */}
        <div className="surface p-6">
          <h2 className="section-title mb-4">Direction du tournoi</h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-text-muted">
                Phase en cours :{" "}
                <span className="font-bold text-text-base">
                  {PHASE_LABELS[currentPhase]}
                </span>
              </p>
              {followingPhase && (
                <p className="text-sm text-text-muted mt-1">
                  Prochaine étape : {PHASE_LABELS[followingPhase]}
                </p>
              )}
              {!phaseStatus.complete && phaseStatus.errors.length > 0 && (
                <p className="text-xs text-accent-danger mt-2">
                  {phaseStatus.errors[0]}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {followingPhase && (
                <form action={advancePhase}>
                  <button
                    type="submit"
                    disabled={!phaseStatus.complete}
                    className="btn-primary disabled:opacity-50"
                  >
                    Clôturer et générer le tour suivant
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* VAINQUEURS RÉELS DES DISTINCTIONS */}
        <div className="surface p-6">
          <h2 className="section-title mb-4">Distinctions — vainqueurs réels</h2>
          <p className="text-sm text-text-muted mb-4">
            Saisis les lauréats officiels pour attribuer les points (recalcul
            automatique à l&apos;enregistrement).
          </p>
          <form action={updateRealDistinctions}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DISTINCTION_CATEGORIES.map((cat) => (
                <div key={cat.id}>
                  <label className="label-field">
                    {cat.label}{" "}
                    <span className="text-text-muted font-normal">
                      ({cat.points} pts)
                    </span>
                  </label>
                  <input
                    type="text"
                    name={cat.id}
                    defaultValue={realDistinctions[cat.id] ?? ""}
                    placeholder="Nom du joueur"
                    className="input-field"
                  />
                </div>
              ))}
            </div>
            <button type="submit" className="btn-primary mt-4">
              Enregistrer les lauréats
            </button>
          </form>
        </div>

        {/* OUTILS DE GÉNÉRATION */}
        <GroupCreationForm
          groups={groups}
          existingGroupsData={existingGroupsData}
        />

        {/* LISTE DES MATCHS (AVEC PLACEHOLDERS) */}
        <div className="surface p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="section-title">La Grille des Matchs</h2>

            {/* BOUTONS DE TRI */}
            <div className="flex surface-2 p-1 gap-1">
              <Link
                href="/admin?sort=date"
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${sortBy === "date" ? "bg-bg-base text-text-base shadow" : "text-text-muted hover:text-text-base"}`}
              >
                Par Date
              </Link>
              <Link
                href="/admin?sort=group"
                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${sortBy === "group" ? "bg-bg-base text-text-base shadow" : "text-text-muted hover:text-text-base"}`}
              >
                Par Groupe
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {matches && matches.length > 0 ? (
              matches.map((match) => (
                <div
                  key={match.id}
                  className="surface-2 p-4 flex flex-col xl:flex-row justify-between items-center gap-6"
                >
                  <div className="w-full xl:w-40 text-center xl:text-left shrink-0">
                    <span className="chip">{match.stage}</span>
                  </div>

                  {/* Modification des équipes avec Placeholders */}
                  <form
                    action={updateMatchInfo}
                    className="flex-1 flex flex-col sm:flex-row items-center gap-2 w-full"
                  >
                    <input type="hidden" name="match_id" value={match.id} />
                    {/* On passe la value par défaut, si elle est vide (""), le placeholder s'affiche */}
                    <input
                      type="text"
                      name="team_home"
                      defaultValue={match.team_home}
                      placeholder="Ex: 1er Grp A"
                      className="input-field w-full sm:w-1/3 px-2 py-2 text-center text-sm"
                    />
                    <span className="text-text-muted font-black px-2">VS</span>
                    <input
                      type="text"
                      name="team_away"
                      defaultValue={match.team_away}
                      placeholder="Ex: 2e Grp B"
                      className="input-field w-full sm:w-1/3 px-2 py-2 text-center text-sm"
                    />
                    <input
                      type="datetime-local"
                      name="match_date"
                      defaultValue={formatDateForInput(match.match_date)}
                      required
                      className="input-field w-full sm:w-auto px-2 py-2 text-sm text-center"
                    />
                    <button
                      type="submit"
                      className="btn-secondary btn-sm w-full sm:w-auto normal-case"
                    >
                      Mettre à jour
                    </button>
                  </form>

                  <div className="flex items-center gap-3 w-full xl:w-auto justify-center xl:justify-end shrink-0">
                    <form
                      action={updateRealScore}
                      className="flex flex-col sm:flex-row items-center gap-2 surface p-2"
                    >
                      <input type="hidden" name="match_id" value={match.id} />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          name="score_home"
                          defaultValue={match.real_score_home ?? ""}
                          required
                          placeholder="0"
                          className="w-12 bg-bg-base text-center font-display font-bold text-xl text-text-base border border-border-subtle rounded-lg py-1 outline-none focus:border-accent-main"
                        />
                        <span className="font-black text-text-muted">-</span>
                        <input
                          type="number"
                          name="score_away"
                          defaultValue={match.real_score_away ?? ""}
                          required
                          placeholder="0"
                          className="w-12 bg-bg-base text-center font-display font-bold text-xl text-text-base border border-border-subtle rounded-lg py-1 outline-none focus:border-accent-main"
                        />
                      </div>
                      {match.slot && (
                        <select
                          name="real_winner"
                          defaultValue={match.real_winner ?? ""}
                          className="input-field text-xs py-1 max-w-[140px]"
                          title="Qualifié si match nul"
                        >
                          <option value="">Qualifié (si nul)</option>
                          <option value={match.team_home}>
                            {match.team_home}
                          </option>
                          <option value={match.team_away}>
                            {match.team_away}
                          </option>
                        </select>
                      )}
                      <button type="submit" className="btn-primary btn-sm">
                        Valider
                      </button>
                    </form>

                    <form action={deleteMatch}>
                      <input type="hidden" name="match_id" value={match.id} />
                      <button
                        type="submit"
                        className="btn-danger btn-sm"
                        title="Supprimer ce match"
                      >
                        Suppr.
                      </button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-text-muted py-12 italic">
                Utilise les formulaires ci-dessus pour construire la
                compétition.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
