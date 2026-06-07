/** Types et barème des badges (bronze → légende). */

export type BadgeType =
  | "girouette"
  | "visionnaire"
  | "sniper"
  | "chat-noir"
  | "touriste"
  | "parachute";

export type BadgeTier = "bronze" | "silver" | "gold" | "legend";

export const BADGE_TIERS: BadgeTier[] = [
  "bronze",
  "silver",
  "gold",
  "legend",
];

export type BadgeThresholds = {
  bronze: number;
  silver: number;
  gold: number;
  legend: number;
};

export const BADGE_THRESHOLDS: Record<BadgeType, BadgeThresholds> = {
  girouette: { bronze: 3, silver: 6, gold: 9, legend: 10 },
  visionnaire: { bronze: 3, silver: 6, gold: 9, legend: 10 },
  sniper: { bronze: 2, silver: 4, gold: 6, legend: 7 },
  "chat-noir": { bronze: 3, silver: 6, gold: 9, legend: 10 },
  touriste: { bronze: 3, silver: 6, gold: 9, legend: 10 },
  parachute: { bronze: 3, silver: 6, gold: 9, legend: 10 },
};

export const BADGE_LABELS: Record<BadgeType, string> = {
  girouette: "La Girouette",
  visionnaire: "Le Visionnaire",
  sniper: "Le Sniper",
  "chat-noir": "Le Chat Noir",
  touriste: "Le Touriste",
  parachute: "Le Parachute",
};

export const TIER_LABELS: Record<BadgeTier, string> = {
  bronze: "Bronze",
  silver: "Argent",
  gold: "Or",
  legend: "Légende",
};

/** Fichiers sur disque (tier légende = platinium.png). */
const TIER_IMAGE_FILE: Record<BadgeTier, string> = {
  bronze: "bronze.png",
  silver: "silver.png",
  gold: "gold.png",
  legend: "platinium.png",
};

export function badgeImagePath(type: BadgeType, tier: BadgeTier): string {
  return `/badges/${type}/${TIER_IMAGE_FILE[tier]}`;
}

export function badgeDisplayName(type: BadgeType, tier: BadgeTier): string {
  return `${BADGE_LABELS[type]} — ${TIER_LABELS[tier]}`;
}

export function tierFromValue(
  value: number,
  thresholds: BadgeThresholds,
): BadgeTier | null {
  if (value >= thresholds.legend) return "legend";
  if (value >= thresholds.gold) return "gold";
  if (value >= thresholds.silver) return "silver";
  if (value >= thresholds.bronze) return "bronze";
  return null;
}

export function parseBadgeRow(row: {
  badge_type?: string | null;
  tier?: string | null;
  badge_name?: string | null;
}): { type: BadgeType; tier: BadgeTier } | null {
  let type = row.badge_type as BadgeType | undefined;
  let tier = row.tier as BadgeTier | undefined;

  if (tier === ("platinum" as string)) tier = "legend";
  if (type === ("oracle" as string)) return null;

  if (type && tier && BADGE_LABELS[type] && TIER_LABELS[tier]) {
    return { type, tier };
  }
  return null;
}
