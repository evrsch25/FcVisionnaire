// Test génération du vrai arbre (modèle round par round).
// Usage : npx tsx scripts/testRealBracket.ts
import { GROUP_LETTERS } from "../lib/tournament/types";
import {
  generateNextRoundMatches,
  currentPhaseComplete,
  type DbMatch,
} from "../lib/tournament/realBracket";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("ECHEC:", msg);
    failures++;
  } else {
    console.log("OK:", msg);
  }
}

const pairings: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];

function buildGroupMatches(): DbMatch[] {
  const matches: DbMatch[] = [];
  let id = 0;
  for (const g of GROUP_LETTERS) {
    const teams = [1, 2, 3, 4].map((n) => `${g}${n}`);
    for (const [i, j] of pairings) {
      matches.push({
        id: `g-${id++}`,
        stage: `Groupe ${g}`,
        team_home: teams[i],
        team_away: teams[j],
        slot: null,
        real_score_home: 1,
        real_score_away: 0,
        real_winner: null,
        status: "Completed",
        match_date: "2026-06-11T12:00:00Z",
      });
    }
  }
  return matches;
}

const groupMatches = buildGroupMatches();
const check = currentPhaseComplete("GROUPS", groupMatches);
assert(check.complete, "Phase GROUPS complète avec 12 groupes");

const { matches: r32, errors } = generateNextRoundMatches(
  "GROUPS",
  groupMatches,
);
assert(errors.length === 0, `Génération R32 sans erreur (${errors.join("; ")})`);
assert(r32.length === 16, `16 matchs R32 générés (${r32.length})`);
assert(
  r32.every((m) => m.team_home && m.team_away && m.slot),
  "Toutes les affiches R32 ont des équipes",
);

console.log(
  failures === 0
    ? "\nTOUS LES TESTS PASSENT."
    : `\n${failures} test(s) en échec.`,
);
process.exit(failures === 0 ? 0 : 1);
