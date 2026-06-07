import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import BracketView, { type GroupData, type MatchRow } from "./BracketView";
import { PHASE_LABELS, type Phase } from "@/lib/tournament/phases";
import {
  matchBelongsToPhase,
  getPhaseKickoff,
  isKickoffPassed,
  isCompetitionStarted,
  formatKickoffFr,
} from "@/lib/tournament/phaseLock";

export default async function BracketPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;
  if (!userId) redirect("/login");

  const { data: settings } = await supabase
    .from("app_settings")
    .select("current_phase")
    .eq("id", 1)
    .single();

  const currentPhase = (settings?.current_phase ?? "GROUPS") as Phase;

  const { data: allMatches } = await supabase
    .from("matches")
    .select(
      "id, stage, team_home, team_away, slot, real_score_home, real_score_away, status, match_date",
    )
    .order("match_date", { ascending: true });

  const matches = (allMatches ?? []) as MatchRow[];

  const { data: predictions } = await supabase
    .from("predictions")
    .select("match_id, predicted_score_home, predicted_score_away, is_girouette")
    .eq("user_id", userId);

  const phaseKickoff = getPhaseKickoff(currentPhase, matches);
  const phaseKickoffPassed = isKickoffPassed(phaseKickoff);
  const phaseKickoffLabel = formatKickoffFr(phaseKickoff);
  const competitionStarted = isCompetitionStarted(matches);

  const currentMatches = matches.filter((m) =>
    matchBelongsToPhase(m, currentPhase),
  );

  const currentIds = new Set(currentMatches.map((m) => m.id));
  const predictedIds = new Set((predictions ?? []).map((p) => p.match_id));
  const historyMatches = matches.filter(
    (m) =>
      !currentIds.has(m.id) &&
      (m.status === "Completed" || predictedIds.has(m.id)),
  );

  const groupMap = new Map<string, GroupData>();
  for (const m of matches.filter((x) => x.stage.startsWith("Groupe "))) {
    const letter = m.stage.split(" ")[1];
    if (!letter) continue;
    if (!groupMap.has(letter)) {
      groupMap.set(letter, { letter, matches: [] });
    }
    groupMap.get(letter)!.matches.push({
      id: m.id,
      home: m.team_home,
      away: m.team_away,
    });
  }
  const groups = Array.from(groupMap.values()).sort((a, b) =>
    a.letter.localeCompare(b.letter),
  );

  const initialScores: Record<string, { home: string; away: string }> = {};
  for (const p of predictions ?? []) {
    initialScores[p.match_id] = {
      home:
        p.predicted_score_home === null ? "" : String(p.predicted_score_home),
      away:
        p.predicted_score_away === null ? "" : String(p.predicted_score_away),
    };
  }

  const { data: distinctions } = await supabase
    .from("distinctions")
    .select("category, player_name")
    .eq("user_id", userId);

  const initialDistinctions: Record<string, string> = {};
  for (const d of distinctions ?? []) {
    initialDistinctions[d.category] = d.player_name;
  }

  const distinctionsLocked = competitionStarted;

  const girouetteMatchIds = new Set(
    (predictions ?? []).filter((p) => p.is_girouette).map((p) => p.match_id),
  );

  let champion: string | null = null;
  const finalMatch = matches.find((m) => m.slot === "M104");
  if (finalMatch) {
    const pr = initialScores[finalMatch.id];
    const sh = pr?.home !== "" ? parseInt(pr.home, 10) : NaN;
    const sa = pr?.away !== "" ? parseInt(pr.away, 10) : NaN;
    if (!Number.isNaN(sh) && !Number.isNaN(sa) && sh !== sa) {
      champion = sh > sa ? finalMatch.team_home : finalMatch.team_away;
    }
  }

  return (
    <div className="min-h-screen text-text-base pb-10">
      <Navbar />

      <main className="max-w-5xl mx-auto mt-8 md:mt-10 px-4">
        <div className="mb-6">
          <p className="eyebrow">Édition 2026</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-wide mt-1">
            Mes Pronostics
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Pronostique tour par tour sur les vraies affiches.{" "}
            {PHASE_LABELS[currentPhase]}.
          </p>
        </div>

        {phaseKickoffPassed && currentPhase !== "DONE" && (
          <div className="mb-6 bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-xs font-bold px-4 py-2 rounded-lg text-center">
            Coup d&apos;envoi de ce tour passé
            {phaseKickoffLabel ? ` (${phaseKickoffLabel})` : ""}. Tu peux encore
            modifier tes pronos, mais les changements ne valent que{" "}
            <strong>la moitié des points</strong> sur le match concerné.
          </div>
        )}
        {!phaseKickoffPassed && phaseKickoffLabel && currentPhase !== "DONE" && (
          <div className="mb-6 surface p-3 text-center text-text-muted text-xs">
            Verrouillage automatique des pronos au coup d&apos;envoi :{" "}
            <span className="text-text-base font-bold">{phaseKickoffLabel}</span>
          </div>
        )}

        {matches.length === 0 ? (
          <div className="surface p-10 text-center text-text-muted italic">
            Aucun match n&apos;a encore été créé par l&apos;admin.
          </div>
        ) : (
          <BracketView
            currentPhase={currentPhase}
            phaseKickoffPassed={phaseKickoffPassed}
            phaseKickoffLabel={phaseKickoffLabel}
            groups={groups}
            currentMatches={currentMatches}
            historyMatches={historyMatches}
            initialScores={initialScores}
            initialDistinctions={initialDistinctions}
            distinctionsLocked={distinctionsLocked}
            girouetteMatchIds={Array.from(girouetteMatchIds)}
            champion={champion}
          />
        )}
      </main>
    </div>
  );
}
