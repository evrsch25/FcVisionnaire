/** Catégories de distinctions et barème de points (bon prono = points pleins). */
export const DISTINCTION_CATEGORIES = [
  { id: "Ballon_Or", label: "Ballon d'Or (Meilleur joueur)", points: 12 },
  { id: "Ballon_Argent", label: "Ballon d'Argent (2e meilleur joueur)", points: 8 },
  { id: "Soulier_Or", label: "Soulier d'Or (Meilleur buteur)", points: 10 },
  { id: "Gant_Or", label: "Gant d'Or (Meilleur gardien)", points: 8 },
  { id: "Jeune", label: "Meilleur Jeune (U21)", points: 6 },
] as const;

export type DistinctionCategory = (typeof DISTINCTION_CATEGORIES)[number]["id"];

export const DISTINCTION_POINTS: Record<DistinctionCategory, number> =
  Object.fromEntries(
    DISTINCTION_CATEGORIES.map((c) => [c.id, c.points]),
  ) as Record<DistinctionCategory, number>;

export type RealDistinctions = Partial<Record<DistinctionCategory, string>>;

export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function scoreDistinctionProno(
  predicted: string,
  actual: string | null | undefined,
  isGirouette: boolean,
  category: DistinctionCategory,
): number {
  if (!actual?.trim() || !predicted?.trim()) return 0;
  if (normalizePlayerName(predicted) !== normalizePlayerName(actual)) return 0;

  const base = DISTINCTION_POINTS[category];
  return isGirouette ? Math.floor(base / 2) : base;
}
