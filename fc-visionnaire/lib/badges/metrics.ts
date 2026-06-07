type MatchRow = {
  id: string;
  match_date: string;
  real_score_home: number | null;
  real_score_away: number | null;
};

type PronoRow = {
  match_id: string;
  predicted_score_home: number;
  predicted_score_away: number;
  is_girouette: boolean;
  points_earned?: number | null;
};

export type ChronologicalProno = {
  matchId: string;
  isGirouette: boolean;
  isExact: boolean;
  isBigExact: boolean;
  pointsEarned: number;
};

/** Pronos triés par date de match. */
export function chronologicalPronos(
  matches: MatchRow[],
  predictions: PronoRow[],
): ChronologicalProno[] {
  const matchById = Object.fromEntries(matches.map((m) => [m.id, m]));
  const ordered = [...predictions]
    .filter((p) => matchById[p.match_id])
    .sort(
      (a, b) =>
        new Date(matchById[a.match_id].match_date).getTime() -
        new Date(matchById[b.match_id].match_date).getTime(),
    );

  return ordered.map((p) => {
    const m = matchById[p.match_id];
    const rh = m.real_score_home;
    const ra = m.real_score_away;
    const isExact =
      rh !== null &&
      ra !== null &&
      rh === p.predicted_score_home &&
      ra === p.predicted_score_away;
    const isBigExact = isExact && rh + ra >= 4;

    return {
      matchId: p.match_id,
      isGirouette: !!p.is_girouette,
      isExact,
      isBigExact,
      pointsEarned: p.points_earned ?? 0,
    };
  });
}

export function maxConsecutive(
  items: ChronologicalProno[],
  predicate: (p: ChronologicalProno) => boolean,
): number {
  let max = 0;
  let cur = 0;
  for (const item of items) {
    if (predicate(item)) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}

/** Nombre de fois où une série de 2 scores exacts d'affilée est atteinte. */
export function countDoubleExactEvents(items: ChronologicalProno[]): number {
  let events = 0;
  let consec = 0;
  let countedForRun = false;

  for (const item of items) {
    if (item.isExact) {
      consec++;
      if (consec >= 2 && !countedForRun) {
        events++;
        countedForRun = true;
      }
    } else {
      consec = 0;
      countedForRun = false;
    }
  }
  return events;
}

export function countBigExactScores(items: ChronologicalProno[]): number {
  return items.filter((p) => p.isBigExact).length;
}
