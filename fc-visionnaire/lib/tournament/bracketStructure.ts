// Structure figée du tableau final de la Coupe du Monde 2026 (48 équipes).
// Matchs M73 -> M104. Source : règlement FIFA 2026 / Wikipédia.
//
// Chaque côté d'un match provient d'une "source" :
//  - { type: "winner", group }     -> 1er du groupe (ex: 1A)
//  - { type: "runnerUp", group }   -> 2e du groupe (ex: 2B)
//  - { type: "third", slot }       -> 3e placé via l'Annexe C, pour le créneau vainqueur (slot)
//  - { type: "matchWinner", match }-> vainqueur d'un match précédent
//  - { type: "matchLoser", match } -> perdant d'un match précédent (petite finale)

export type Round = "R32" | "R16" | "QF" | "SF" | "THIRD" | "FINAL";

export type SlotSource =
  | { type: "winner"; group: string }
  | { type: "runnerUp"; group: string }
  | { type: "third"; slot: string } // slot = "1A" | "1B" | "1D" | "1E" | "1G" | "1I" | "1K" | "1L"
  | { type: "matchWinner"; match: string }
  | { type: "matchLoser"; match: string };

export type BracketMatch = {
  slot: string; // "M73" .. "M104"
  round: Round;
  home: SlotSource;
  away: SlotSource;
  // Pour l'affichage des candidats 3es ("3e Groupe A/B/C/D/F"), ordre indicatif.
  thirdCandidates?: string[];
};

const w = (group: string): SlotSource => ({ type: "winner", group });
const r = (group: string): SlotSource => ({ type: "runnerUp", group });
const t = (slot: string): SlotSource => ({ type: "third", slot });
const mw = (match: string): SlotSource => ({ type: "matchWinner", match });
const ml = (match: string): SlotSource => ({ type: "matchLoser", match });

export const BRACKET: BracketMatch[] = [
  // ---- Round of 32 (1/16) ----
  { slot: "M73", round: "R32", home: r("A"), away: r("B") },
  { slot: "M74", round: "R32", home: w("E"), away: t("1E"), thirdCandidates: ["A", "B", "C", "D", "F"] },
  { slot: "M75", round: "R32", home: w("F"), away: r("C") },
  { slot: "M76", round: "R32", home: w("C"), away: r("F") },
  { slot: "M77", round: "R32", home: w("I"), away: t("1I"), thirdCandidates: ["C", "D", "F", "G", "H"] },
  { slot: "M78", round: "R32", home: r("E"), away: r("I") },
  { slot: "M79", round: "R32", home: w("A"), away: t("1A"), thirdCandidates: ["C", "E", "F", "H", "I"] },
  { slot: "M80", round: "R32", home: w("L"), away: t("1L"), thirdCandidates: ["E", "H", "I", "J", "K"] },
  { slot: "M81", round: "R32", home: w("D"), away: t("1D"), thirdCandidates: ["B", "E", "F", "I", "J"] },
  { slot: "M82", round: "R32", home: w("G"), away: t("1G"), thirdCandidates: ["A", "E", "H", "I", "J"] },
  { slot: "M83", round: "R32", home: r("K"), away: r("L") },
  { slot: "M84", round: "R32", home: w("H"), away: r("J") },
  { slot: "M85", round: "R32", home: w("B"), away: t("1B"), thirdCandidates: ["E", "F", "G", "I", "J"] },
  { slot: "M86", round: "R32", home: w("J"), away: r("H") },
  { slot: "M87", round: "R32", home: w("K"), away: t("1K"), thirdCandidates: ["D", "E", "I", "J", "L"] },
  { slot: "M88", round: "R32", home: r("D"), away: r("G") },

  // ---- Round of 16 (1/8) ----
  { slot: "M89", round: "R16", home: mw("M74"), away: mw("M77") },
  { slot: "M90", round: "R16", home: mw("M73"), away: mw("M75") },
  { slot: "M91", round: "R16", home: mw("M76"), away: mw("M78") },
  { slot: "M92", round: "R16", home: mw("M79"), away: mw("M80") },
  { slot: "M93", round: "R16", home: mw("M83"), away: mw("M84") },
  { slot: "M94", round: "R16", home: mw("M81"), away: mw("M82") },
  { slot: "M95", round: "R16", home: mw("M86"), away: mw("M88") },
  { slot: "M96", round: "R16", home: mw("M85"), away: mw("M87") },

  // ---- Quarterfinals (1/4) ----
  { slot: "M97", round: "QF", home: mw("M89"), away: mw("M90") },
  { slot: "M98", round: "QF", home: mw("M93"), away: mw("M94") },
  { slot: "M99", round: "QF", home: mw("M91"), away: mw("M92") },
  { slot: "M100", round: "QF", home: mw("M95"), away: mw("M96") },

  // ---- Semifinals (1/2) ----
  { slot: "M101", round: "SF", home: mw("M97"), away: mw("M98") },
  { slot: "M102", round: "SF", home: mw("M99"), away: mw("M100") },

  // ---- Match for third place (petite finale) ----
  { slot: "M103", round: "THIRD", home: ml("M101"), away: ml("M102") },

  // ---- Final ----
  { slot: "M104", round: "FINAL", home: mw("M101"), away: mw("M102") },
];

export const ROUND_ORDER: Round[] = ["R32", "R16", "QF", "SF", "FINAL"];

export const ROUND_LABELS: Record<Round, string> = {
  R32: "16es de finale",
  R16: "8es de finale",
  QF: "Quarts de finale",
  SF: "Demi-finales",
  THIRD: "Petite finale",
  FINAL: "Finale",
};

export const BRACKET_BY_SLOT: Record<string, BracketMatch> = Object.fromEntries(
  BRACKET.map((m) => [m.slot, m]),
);

export function matchesForRound(round: Round): BracketMatch[] {
  // La petite finale (THIRD) est rattachée à l'étape FINALE dans le stepper.
  if (round === "FINAL") {
    return BRACKET.filter((m) => m.round === "FINAL" || m.round === "THIRD");
  }
  return BRACKET.filter((m) => m.round === round);
}

// Les 8 créneaux "vainqueur de groupe" qui affrontent un 3e (ordre Annexe C).
export const THIRD_SLOTS: string[] = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"];
