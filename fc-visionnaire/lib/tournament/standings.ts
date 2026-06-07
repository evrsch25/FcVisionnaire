import type { GroupMatchInput, StandingResult, TeamRow } from "./types";

function emptyRow(team: string): TeamRow {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
  };
}

function applyMatch(
  rows: Record<string, TeamRow>,
  home: string,
  away: string,
  sh: number,
  sa: number,
) {
  const h = rows[home];
  const a = rows[away];
  if (!h || !a) return;
  h.played++;
  a.played++;
  h.gf += sh;
  h.ga += sa;
  a.gf += sa;
  a.ga += sh;
  if (sh > sa) {
    h.won++;
    a.lost++;
    h.points += 3;
  } else if (sh < sa) {
    a.won++;
    h.lost++;
    a.points += 3;
  } else {
    h.drawn++;
    a.drawn++;
    h.points += 1;
    a.points += 1;
  }
}

function finalizeGd(rows: Record<string, TeamRow>) {
  for (const r of Object.values(rows)) r.gd = r.gf - r.ga;
}

// Compare deux équipes sur les critères globaux : points, diff., buts marqués.
function cmpOverall(a: TeamRow, b: TeamRow): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  return b.gf - a.gf;
}

function overallEqual(a: TeamRow, b: TeamRow): boolean {
  return a.points === b.points && a.gd === b.gd && a.gf === b.gf;
}

// Mini-classement entre équipes à égalité (confrontations directes uniquement).
function headToHead(
  tiedTeams: string[],
  matches: GroupMatchInput[],
): { order: string[]; stillTied: string[][] } {
  const rows: Record<string, TeamRow> = {};
  for (const t of tiedTeams) rows[t] = emptyRow(t);
  const set = new Set(tiedTeams);

  for (const m of matches) {
    if (m.scoreHome === null || m.scoreAway === null) continue;
    if (set.has(m.home) && set.has(m.away)) {
      applyMatch(rows, m.home, m.away, m.scoreHome, m.scoreAway);
    }
  }
  finalizeGd(rows);

  const sorted = [...tiedTeams].sort((x, y) => cmpOverall(rows[x], rows[y]));

  // Détecte les sous-blocs encore strictement égaux après confrontation directe.
  const stillTied: string[][] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && overallEqual(rows[sorted[i]], rows[sorted[j]])) {
      j++;
    }
    if (j - i > 1) stillTied.push(sorted.slice(i, j));
    i = j;
  }

  return { order: sorted, stillTied };
}

/**
 * Calcule le classement d'un groupe selon les règles FIFA :
 * 1) points, 2) différence de buts, 3) buts marqués (sur tous les matchs),
 * puis confrontation directe entre équipes encore à égalité.
 * Les blocs réellement indépartageables sont remontés dans `unresolved`
 * (l'utilisateur devra les ordonner manuellement).
 */
export function computeStanding(
  matches: GroupMatchInput[],
  teams: string[],
): StandingResult {
  const rows: Record<string, TeamRow> = {};
  for (const t of teams) rows[t] = emptyRow(t);

  let scored = 0;
  for (const m of matches) {
    if (m.scoreHome === null || m.scoreAway === null) continue;
    applyMatch(rows, m.home, m.away, m.scoreHome, m.scoreAway);
    scored++;
  }
  finalizeGd(rows);

  const expectedGames = (teams.length * (teams.length - 1)) / 2;
  const complete = teams.length >= 2 && scored >= expectedGames;

  // Tri global initial.
  const sorted = [...teams].sort((x, y) => cmpOverall(rows[x], rows[y]));

  // Résolution des blocs à égalité globale via confrontation directe.
  const order: string[] = [];
  const unresolved: string[][] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && overallEqual(rows[sorted[i]], rows[sorted[j]])) {
      j++;
    }
    const block = sorted.slice(i, j);
    if (block.length === 1) {
      order.push(block[0]);
    } else {
      const { order: h2hOrder, stillTied } = headToHead(block, matches);
      order.push(...h2hOrder);
      for (const st of stillTied) unresolved.push(st);
    }
    i = j;
  }

  const table = order.map((t) => rows[t]);

  return { table, order, byTeam: rows, unresolved, complete };
}
