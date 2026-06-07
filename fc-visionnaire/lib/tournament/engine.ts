import { ANNEX_C } from "./annexC";
import {
  BRACKET,
  THIRD_SLOTS,
  type Round,
  type SlotSource,
} from "./bracketStructure";
import { rankThirds } from "./thirds";
import { GROUP_LETTERS, type StandingResult } from "./types";

export type KnockoutResult = { winner: string; loser: string };

export type ResolvedMatch = {
  slot: string;
  round: Round;
  home: string | null;
  away: string | null;
};

export type GroupStandings = Record<string, StandingResult>;

function emptyThirdSlots(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const s of THIRD_SLOTS) out[s] = null;
  return out;
}

/**
 * Détermine les 8 meilleurs 3es et, via l'Annexe C, l'équipe affectée à chaque
 * créneau "3e" du 1/16. Renvoie des valeurs nulles tant que les 12 groupes ne
 * sont pas tous complets.
 */
export function computeThirdSlotTeams(groupStandings: GroupStandings): {
  thirdSlotTeams: Record<string, string | null>;
  best8Groups: string[] | null;
} {
  const haveAll = GROUP_LETTERS.every((g) => {
    const s = groupStandings[g];
    return s && s.complete && s.order.length >= 3 && s.unresolved.length === 0;
  });
  if (!haveAll) return { thirdSlotTeams: emptyThirdSlots(), best8Groups: null };

  const thirds = GROUP_LETTERS.map((g) => {
    const s = groupStandings[g];
    const thirdTeam = s.order[2];
    return { group: g, row: s.byTeam[thirdTeam] };
  });

  const { best8Groups } = rankThirds(thirds);
  const key = [...best8Groups].sort().join("");
  const mapping = ANNEX_C[key];
  if (!mapping) return { thirdSlotTeams: emptyThirdSlots(), best8Groups };

  const thirdSlotTeams: Record<string, string | null> = {};
  for (const slot of THIRD_SLOTS) {
    const grp = mapping[slot as keyof typeof mapping];
    thirdSlotTeams[slot] = groupStandings[grp]?.order[2] ?? null;
  }
  return { thirdSlotTeams, best8Groups };
}

type ResolveCtx = {
  groupStandings: GroupStandings;
  thirdSlotTeams: Record<string, string | null>;
  results: Record<string, KnockoutResult>;
};

function resolveSource(src: SlotSource, ctx: ResolveCtx): string | null {
  switch (src.type) {
    case "winner":
      return ctx.groupStandings[src.group]?.order[0] ?? null;
    case "runnerUp":
      return ctx.groupStandings[src.group]?.order[1] ?? null;
    case "third":
      return ctx.thirdSlotTeams[src.slot] ?? null;
    case "matchWinner":
      return ctx.results[src.match]?.winner ?? null;
    case "matchLoser":
      return ctx.results[src.match]?.loser ?? null;
  }
}

/**
 * Construit l'arbre complet (M73 -> M104) à partir des classements de groupe et
 * des vainqueurs déjà choisis par l'utilisateur sur les rounds précédents.
 * Une équipe vaut `null` tant qu'elle n'est pas déterminable.
 */
export function computeBracket(
  groupStandings: GroupStandings,
  results: Record<string, KnockoutResult>,
): {
  matches: ResolvedMatch[];
  thirdSlotTeams: Record<string, string | null>;
  best8Groups: string[] | null;
} {
  const { thirdSlotTeams, best8Groups } = computeThirdSlotTeams(groupStandings);
  const ctx: ResolveCtx = { groupStandings, thirdSlotTeams, results };

  const matches: ResolvedMatch[] = BRACKET.map((m) => ({
    slot: m.slot,
    round: m.round,
    home: resolveSource(m.home, ctx),
    away: resolveSource(m.away, ctx),
  }));

  return { matches, thirdSlotTeams, best8Groups };
}
