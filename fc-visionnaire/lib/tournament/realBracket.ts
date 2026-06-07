import { computeBracket, type KnockoutResult } from "./engine";
import {
  BRACKET_BY_SLOT,
  matchesForRound,
  ROUND_LABELS,
  type Round,
} from "./bracketStructure";
import { computeStanding } from "./standings";
import { GROUP_LETTERS, type StandingResult } from "./types";
import type { Phase } from "./phases";
import { roundGeneratedBy } from "./phases";

export type DbMatch = {
  id: string;
  stage: string;
  team_home: string;
  team_away: string;
  slot: string | null;
  real_score_home: number | null;
  real_score_away: number | null;
  real_winner: string | null;
  status: string;
  match_date: string;
};

export type GeneratedMatch = {
  slot: string;
  stage: string;
  team_home: string;
  team_away: string;
  match_date: string;
  round: Round;
};

// Dates indicatives (calendrier FIFA 2026) par créneau.
const SLOT_DATES: Record<string, string> = {
  M73: "2026-06-28T20:00:00Z",
  M74: "2026-06-29T19:00:00Z",
  M75: "2026-06-29T21:00:00Z",
  M76: "2026-06-29T19:00:00Z",
  M77: "2026-06-30T17:00:00Z",
  M78: "2026-06-30T19:00:00Z",
  M79: "2026-06-30T22:00:00Z",
  M80: "2026-07-01T16:00:00Z",
  M81: "2026-07-01T20:00:00Z",
  M82: "2026-07-01T20:00:00Z",
  M83: "2026-07-02T19:00:00Z",
  M84: "2026-07-02T20:00:00Z",
  M85: "2026-07-02T23:00:00Z",
  M86: "2026-07-03T20:00:00Z",
  M87: "2026-07-03T23:30:00Z",
  M88: "2026-07-03T18:00:00Z",
  M89: "2026-07-04T17:00:00Z",
  M90: "2026-07-04T19:00:00Z",
  M91: "2026-07-05T17:00:00Z",
  M92: "2026-07-05T19:00:00Z",
  M93: "2026-07-06T19:00:00Z",
  M94: "2026-07-06T21:00:00Z",
  M95: "2026-07-07T19:00:00Z",
  M96: "2026-07-07T21:00:00Z",
  M97: "2026-07-09T15:00:00Z",
  M98: "2026-07-10T20:00:00Z",
  M99: "2026-07-11T17:00:00Z",
  M100: "2026-07-11T21:00:00Z",
  M101: "2026-07-14T19:00:00Z",
  M102: "2026-07-15T19:00:00Z",
  M103: "2026-07-18T19:00:00Z",
  M104: "2026-07-19T19:00:00Z",
};

function isGroupMatch(m: DbMatch): boolean {
  return m.stage?.startsWith("Groupe ") ?? false;
}

function groupLetter(m: DbMatch): string | null {
  if (!isGroupMatch(m)) return null;
  return m.stage.split(" ")[1] ?? null;
}

/** Classements réels à partir des scores saisis par l'admin. */
export function realGroupStandings(
  matches: DbMatch[],
): { standings: Record<string, StandingResult>; errors: string[] } {
  const errors: string[] = [];
  const standings: Record<string, StandingResult> = {};

  for (const letter of GROUP_LETTERS) {
    const gMatches = matches.filter((m) => groupLetter(m) === letter);
    if (gMatches.length === 0) continue;

    const teams = new Set<string>();
    for (const m of gMatches) {
      if (m.team_home) teams.add(m.team_home);
      if (m.team_away) teams.add(m.team_away);
    }

    const inputs = gMatches.map((m) => ({
      home: m.team_home,
      away: m.team_away,
      scoreHome: m.real_score_home,
      scoreAway: m.real_score_away,
    }));

    const st = computeStanding(inputs, Array.from(teams));
    standings[letter] = st;

    if (!st.complete) {
      errors.push(`Groupe ${letter} : tous les résultats ne sont pas saisis.`);
    }
    if (st.unresolved.length > 0) {
      errors.push(
        `Groupe ${letter} : égalité indépartageable (${st.unresolved.flat().join(", ")}).`,
      );
    }
  }

  const missing = GROUP_LETTERS.filter((g) => !standings[g]?.complete);
  if (missing.length > 0) {
    errors.push(`Groupes manquants ou incomplets : ${missing.join(", ")}.`);
  }

  return { standings, errors };
}

/** Vainqueurs réels des matchs à élimination (slot -> winner/loser). */
export function realKnockoutResults(matches: DbMatch[]): Record<string, KnockoutResult> {
  const results: Record<string, KnockoutResult> = {};

  for (const m of matches) {
    if (!m.slot) continue;
    if (m.status !== "Completed") continue;
    if (m.real_score_home === null || m.real_score_away === null) continue;

    let winner: string | null = m.real_winner;
    if (!winner) {
      if (m.real_score_home > m.real_score_away) winner = m.team_home;
      else if (m.real_score_away > m.real_score_home) winner = m.team_away;
    }
    if (!winner) continue;

    const loser = winner === m.team_home ? m.team_away : m.team_home;
    results[m.slot] = { winner, loser };
  }

  return results;
}

/** Génère les affiches du tour suivant à insérer en base. */
export function generateNextRoundMatches(
  currentPhase: Phase,
  allMatches: DbMatch[],
): { matches: GeneratedMatch[]; errors: string[] } {
  const round = roundGeneratedBy(currentPhase);
  if (!round) return { matches: [], errors: ["Aucun tour à générer."] };

  const phaseCheck = currentPhaseComplete(currentPhase, allMatches);
  if (!phaseCheck.complete) {
    return { matches: [], errors: phaseCheck.errors };
  }

  const { standings } = realGroupStandings(allMatches);
  const engineStandings: Record<string, StandingResult> = {};
  for (const [letter, st] of Object.entries(standings)) {
    engineStandings[letter] = { ...st, unresolved: [] };
  }

  const results = realKnockoutResults(allMatches);

  const { matches: resolved } = computeBracket(engineStandings, results);
  const bySlot = Object.fromEntries(resolved.map((m) => [m.slot, m]));

  const toGenerate = matchesForRound(round);
  const generated: GeneratedMatch[] = [];

  for (const bm of toGenerate) {
    const m = bySlot[bm.slot];
    if (!m?.home || !m?.away) {
      return {
        matches: [],
        errors: [`Impossible de déterminer l'affiche ${bm.slot}.`],
      };
    }

    const def = BRACKET_BY_SLOT[bm.slot];
    generated.push({
      slot: bm.slot,
      stage: ROUND_LABELS[def.round],
      team_home: m.home,
      team_away: m.away,
      match_date: SLOT_DATES[bm.slot] ?? "2026-07-01T12:00:00Z",
      round: def.round,
    });
  }

  return { matches: generated, errors: [] };
}

/** Vérifie si tous les matchs du tour courant ont des résultats réels. */
export function currentPhaseComplete(
  phase: Phase,
  matches: DbMatch[],
): { complete: boolean; errors: string[] } {
  if (phase === "GROUPS") {
    const groupMatches = matches.filter(isGroupMatch);
    if (groupMatches.length === 0) {
      return { complete: false, errors: ["Aucun match de groupe."] };
    }
    const incomplete = groupMatches.filter(
      (m) =>
        m.status !== "Completed" ||
        m.real_score_home === null ||
        m.real_score_away === null,
    );
    if (incomplete.length > 0) {
      return {
        complete: false,
        errors: [`${incomplete.length} match(s) de groupe sans résultat.`],
      };
    }
    const { errors } = realGroupStandings(matches);
    return { complete: errors.length === 0, errors };
  }

  if (phase === "DONE") return { complete: true, errors: [] };

  const round = phase as Round;
  const slots = matchesForRound(round === "FINAL" ? "FINAL" : round);
  const phaseMatches = matches.filter(
    (m) => m.slot && slots.some((s) => s.slot === m.slot),
  );

  if (phaseMatches.length === 0) {
    return { complete: false, errors: ["Aucun match pour ce tour."] };
  }

  const errors: string[] = [];
  for (const bm of slots) {
    const m = phaseMatches.find((x) => x.slot === bm.slot);
    if (!m) {
      errors.push(`Match ${bm.slot} manquant.`);
      continue;
    }
    if (
      m.status !== "Completed" ||
      m.real_score_home === null ||
      m.real_score_away === null
    ) {
      errors.push(`Match ${bm.slot} sans score réel.`);
      continue;
    }
    const sh = m.real_score_home;
    const sa = m.real_score_away;
    if (sh === sa && !m.real_winner) {
      errors.push(`Match ${bm.slot} : indiquez le qualifié (match nul).`);
    }
  }

  return { complete: errors.length === 0, errors };
}
