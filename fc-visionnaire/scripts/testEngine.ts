// Test de bout en bout du moteur de tournoi (logique pure, sans base de données).
// Usage : npx tsx scripts/testEngine.ts
import { computeStanding } from "../lib/tournament/standings";
import { computeBracket, type KnockoutResult } from "../lib/tournament/engine";
import {
  BRACKET,
  matchesForRound,
} from "../lib/tournament/bracketStructure";
import { GROUP_LETTERS, type StandingResult } from "../lib/tournament/types";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("ECHEC:", msg);
    failures++;
  } else {
    console.log("OK:", msg);
  }
}

// 12 groupes A-L, 4 équipes (X1..X4). X1 > X2 > X3 > X4 (le rang = l'indice).
const groupStandings: Record<string, StandingResult> = {};
for (const g of GROUP_LETTERS) {
  const teams = [1, 2, 3, 4].map((n) => `${g}${n}`);
  const pairs: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ];
  const matches = pairs.map(([i, j]) => ({
    home: teams[i],
    away: teams[j],
    scoreHome: 1, // le mieux classé (indice le plus faible) gagne 1-0
    scoreAway: 0,
  }));
  const st = computeStanding(matches, teams);
  assert(st.complete, `Groupe ${g} complet`);
  assert(
    st.order.join(",") === teams.join(","),
    `Groupe ${g} ordre correct (${st.order.join(",")})`,
  );
  groupStandings[g] = st;
}

// Construction du 1/16
const { matches: r32first } = computeBracket(groupStandings, {});
const r32 = matchesForRound("R32").map(
  (bm) => r32first.find((m) => m.slot === bm.slot)!,
);
assert(r32.length === 16, "16 matchs en 1/16");
assert(
  r32.every((m) => m.home !== null && m.away !== null),
  "Toutes les affiches du 1/16 sont déterminées",
);
const teamsInR32 = r32.flatMap((m) => [m.home, m.away]).filter(Boolean);
assert(teamsInR32.length === 32, "32 équipes engagées en 1/16");
assert(new Set(teamsInR32).size === 32, "32 équipes distinctes (pas de doublon)");

// Simulation : on fait gagner l'équipe "home" à chaque match, round après round.
const results: Record<string, KnockoutResult> = {};
for (let pass = 0; pass < 6; pass++) {
  const { matches } = computeBracket(groupStandings, results);
  for (const m of matches) {
    if (m.home && m.away && !results[m.slot]) {
      results[m.slot] = { winner: m.home, loser: m.away };
    }
  }
}

const final = computeBracket(groupStandings, results).matches.find(
  (m) => m.slot === "M104",
)!;
assert(
  final.home !== null && final.away !== null,
  `Finale déterminée (${final.home} vs ${final.away})`,
);
const champion = results["M104"]?.winner;
assert(!!champion, `Champion déterminé (${champion})`);

// Toutes les affiches de tous les rounds doivent être résolues.
const allResolved = BRACKET.every((bm) => {
  const m = computeBracket(groupStandings, results).matches.find(
    (x) => x.slot === bm.slot,
  )!;
  return m.home !== null && m.away !== null;
});
assert(allResolved, "Tout l'arbre (M73->M104) est résolu");

console.log(
  failures === 0
    ? "\nTOUS LES TESTS PASSENT."
    : `\n${failures} test(s) en échec.`,
);
process.exit(failures === 0 ? 0 : 1);
