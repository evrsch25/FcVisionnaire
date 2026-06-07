import type { Round } from "./bracketStructure";

export type Phase = "GROUPS" | Round | "DONE";

export const PHASE_ORDER: Phase[] = [
  "GROUPS",
  "R32",
  "R16",
  "QF",
  "SF",
  "FINAL",
  "DONE",
];

export const PHASE_LABELS: Record<Phase, string> = {
  GROUPS: "Phase de groupes",
  R32: "16es de finale",
  R16: "8es de finale",
  QF: "Quarts de finale",
  SF: "Demi-finales",
  THIRD: "Petite finale",
  FINAL: "Finale",
  DONE: "Tournoi terminé",
};

export function nextPhase(phase: Phase): Phase | null {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

/** Round généré quand on clôture `phase`. */
export function roundGeneratedBy(phase: Phase): Round | null {
  if (phase === "GROUPS") return "R32";
  if (phase === "R32") return "R16";
  if (phase === "R16") return "QF";
  if (phase === "QF") return "SF";
  if (phase === "SF") return "FINAL";
  return null;
}

/** Matchs pronostiquables pour `current_phase`. */
export function phaseMatchFilter(phase: Phase): {
  groupOnly: boolean;
  rounds: Round[];
} {
  if (phase === "GROUPS") return { groupOnly: true, rounds: [] };
  if (phase === "DONE") return { groupOnly: false, rounds: [] };
  if (phase === "FINAL") return { groupOnly: false, rounds: ["FINAL", "THIRD"] };
  return { groupOnly: false, rounds: [phase as Round] };
}
