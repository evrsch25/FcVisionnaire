import { BRACKET_BY_SLOT } from "./bracketStructure";
import { phaseMatchFilter, type Phase } from "./phases";

export type MatchSchedule = {
  stage: string;
  slot: string | null;
  match_date: string;
};

/** Indique si un match appartient à une phase donnée. */
export function matchBelongsToPhase(m: MatchSchedule, phase: Phase): boolean {
  const filter = phaseMatchFilter(phase);
  if (filter.groupOnly) return m.stage.startsWith("Groupe ");
  if (filter.rounds.length === 0) return false;
  if (!m.slot) return false;
  const def = BRACKET_BY_SLOT[m.slot];
  if (!def) return false;
  return filter.rounds.includes(def.round);
}

/** Date/heure du premier match d'une phase (kickoff). */
export function getPhaseKickoff(
  phase: Phase,
  matches: MatchSchedule[],
): Date | null {
  const phaseMatches = matches.filter((m) => matchBelongsToPhase(m, phase));
  if (phaseMatches.length === 0) return null;

  const times = phaseMatches
    .map((m) => new Date(m.match_date).getTime())
    .filter((t) => !Number.isNaN(t));

  if (times.length === 0) return null;
  return new Date(Math.min(...times));
}

export function isKickoffPassed(kickoff: Date | null, now = new Date()): boolean {
  if (!kickoff) return false;
  return now.getTime() >= kickoff.getTime();
}

/** Coup d'envoi = premier match de la phase de groupes. */
export function getCompetitionKickoff(matches: MatchSchedule[]): Date | null {
  return getPhaseKickoff("GROUPS", matches);
}

export function isCompetitionStarted(
  matches: MatchSchedule[],
  now = new Date(),
): boolean {
  return isKickoffPassed(getCompetitionKickoff(matches), now);
}

export function formatKickoffFr(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
