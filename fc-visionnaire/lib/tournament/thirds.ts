import type { TeamRow } from "./types";

export type ThirdEntry = { group: string; row: TeamRow };

/**
 * Classe les 12 troisièmes de groupe et retient les 8 meilleurs.
 * Critères FIFA : points, différence de buts, buts marqués.
 * En cas d'égalité parfaite (cas extrêmement rare, non départageable par
 * confrontation directe car groupes différents), départage déterministe par
 * lettre de groupe pour rester reproductible.
 */
export function rankThirds(thirds: ThirdEntry[]): {
  orderedGroups: string[];
  best8Groups: string[];
} {
  const ordered = [...thirds].sort((a, b) => {
    if (b.row.points !== a.row.points) return b.row.points - a.row.points;
    if (b.row.gd !== a.row.gd) return b.row.gd - a.row.gd;
    if (b.row.gf !== a.row.gf) return b.row.gf - a.row.gf;
    return a.group.localeCompare(b.group);
  });

  const orderedGroups = ordered.map((t) => t.group);
  return { orderedGroups, best8Groups: orderedGroups.slice(0, 8) };
}
