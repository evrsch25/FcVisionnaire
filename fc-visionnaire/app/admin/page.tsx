import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  toggleLock,
  updateRealScore,
  recalculateAll,
  generateGroup,
  generateKnockouts,
  updateMatchInfo,
  deleteMatch,
} from "@/app/actions/admin";
import GroupCreationForm from "./GroupCreationForm";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

export default async function AdminPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const sortBy = searchParams.sort || "date";

  const { data: settings } = await supabase
    .from("app_settings")
    .select("is_locked")
    .eq("id", 1)
    .single();
  const isLocked = settings?.is_locked || false;

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
    <div className="min-h-screen bg-bg-base text-text-base p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER ADMIN */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 bg-bg-panel p-6 rounded-xl border border-border-subtle shadow-sm">
          <div>
            <h1 className="text-3xl font-black text-text-base uppercase tracking-wider">
              Panel Admin
            </h1>
            <p className="text-text-muted text-sm mt-1">
              Gestion de la compétition et des scores.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <form action={recalculateAll}>
              <button
                type="submit"
                className="bg-accent-main text-white font-bold px-6 py-3 rounded shadow hover:bg-blue-600 transition"
              >
                Calculer les Points
              </button>
            </form>

            <form
              action={toggleLock}
              className="flex items-center gap-3 bg-bg-base p-2 rounded-lg border border-border-subtle"
            >
              <span className="text-sm text-text-muted px-2">
                Pronos :{" "}
                <span
                  className={`font-bold ${isLocked ? "text-accent-danger" : "text-green-500"}`}
                >
                  {isLocked ? "Verrouillés" : "Ouverts"}
                </span>
              </span>
              <button
                type="submit"
                className="bg-text-base text-bg-base font-black px-4 py-2 rounded hover:bg-gray-200 transition text-sm uppercase tracking-wider"
              >
                {isLocked ? "Déverrouiller" : "Verrouiller"}
              </button>
            </form>
          </div>
        </header>

        {/* OUTILS DE GÉNÉRATION */}
        <GroupCreationForm
          groups={groups}
          existingGroupsData={existingGroupsData}
        />

        {/* LISTE DES MATCHS (AVEC PLACEHOLDERS) */}
        <div className="bg-bg-panel p-6 rounded-xl border border-border-subtle">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-text-base uppercase tracking-wider">
              La Grille des Matchs
            </h2>

            {/* BOUTONS DE TRI */}
            <div className="flex bg-bg-base p-1 rounded-lg border border-border-subtle">
              <Link
                href="/admin?sort=date"
                className={`px-4 py-2 rounded text-sm font-bold transition ${sortBy === "date" ? "bg-text-base text-bg-base shadow" : "text-text-muted hover:text-text-base"}`}
              >
                Par Date
              </Link>
              <Link
                href="/admin?sort=group"
                className={`px-4 py-2 rounded text-sm font-bold transition ${sortBy === "group" ? "bg-text-base text-bg-base shadow" : "text-text-muted hover:text-text-base"}`}
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
                  className="bg-bg-base p-4 rounded-xl border border-border-subtle flex flex-col xl:flex-row justify-between items-center gap-6"
                >
                  <div className="w-full xl:w-48 text-center xl:text-left shrink-0">
                    <span className="bg-border-subtle text-text-muted px-3 py-1 rounded text-xs font-black uppercase tracking-wider border border-border-subtle">
                      {match.stage}
                    </span>
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
                      className="w-full sm:w-1/3 bg-bg-panel text-text-base border border-border-subtle rounded p-2 text-center text-sm focus:border-accent-main outline-none placeholder:text-text-muted"
                    />
                    <span className="text-text-muted font-black px-2">VS</span>
                    <input
                      type="text"
                      name="team_away"
                      defaultValue={match.team_away}
                      placeholder="Ex: 2e Grp B"
                      className="w-full sm:w-1/3 bg-bg-panel text-text-base border border-border-subtle rounded p-2 text-center text-sm focus:border-accent-main outline-none placeholder:text-text-muted"
                    />
                    <input
                      type="datetime-local"
                      name="match_date"
                      defaultValue={formatDateForInput(match.match_date)}
                      required
                      className="w-full sm:w-auto bg-bg-panel text-text-base border border-border-subtle rounded p-2 text-sm focus:border-accent-main outline-none text-center"
                    />
                    <button
                      type="submit"
                      className="w-full sm:w-auto bg-border-subtle hover:bg-text-base hover:text-bg-base text-text-base font-bold px-3 py-2 rounded transition text-sm"
                    >
                      Mettre à jour
                    </button>
                  </form>

                  <div className="flex items-center gap-3 w-full xl:w-auto justify-center xl:justify-end shrink-0">
                    <form
                      action={updateRealScore}
                      className="flex items-center gap-2 bg-bg-panel p-2 rounded-lg border border-border-subtle"
                    >
                      <input type="hidden" name="match_id" value={match.id} />
                      <input
                        type="number"
                        name="score_home"
                        defaultValue={match.real_score_home ?? ""}
                        required
                        placeholder="0"
                        className="w-14 bg-bg-base text-center font-black text-xl text-text-base border border-border-subtle rounded py-1 outline-none focus:border-accent-main"
                      />
                      <span className="font-black text-text-muted">-</span>
                      <input
                        type="number"
                        name="score_away"
                        defaultValue={match.real_score_away ?? ""}
                        required
                        placeholder="0"
                        className="w-14 bg-bg-base text-center font-black text-xl text-text-base border border-border-subtle rounded py-1 outline-none focus:border-accent-main"
                      />
                      <button
                        type="submit"
                        className="bg-accent-main text-white font-black px-4 py-2 rounded hover:bg-blue-600 transition uppercase text-xs tracking-wider"
                      >
                        Valider Score
                      </button>
                    </form>

                    <form action={deleteMatch}>
                      <input type="hidden" name="match_id" value={match.id} />
                      <button
                        type="submit"
                        className="bg-accent-danger/10 text-accent-danger hover:bg-accent-danger hover:text-white px-3 py-2 rounded-lg transition border border-accent-danger/20 flex items-center justify-center h-full text-xs font-bold uppercase"
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
