import {
  BADGE_THRESHOLDS,
  badgeDisplayName,
  tierFromValue,
  type BadgeTier,
  type BadgeType,
} from "./definitions";

export type UserBadgeMetrics = {
  userId: string;
  girouetteMaxStreak: number;
  visionnaireBigExactCount: number;
  sniperDoubleExactEvents: number;
  chatNoirMaxStreak: number;
  touristeLastStreak: number;
  parachuteBigDropCount: number;
};

export type AwardedBadge = {
  user_id: string;
  badge_type: BadgeType;
  tier: BadgeTier;
  badge_name: string;
};

/** Attribue le meilleur palier atteint par type pour chaque joueur. */
export function computeAwardedBadges(
  metrics: UserBadgeMetrics[],
): AwardedBadge[] {
  const awarded: AwardedBadge[] = [];
  const types = Object.keys(BADGE_THRESHOLDS) as BadgeType[];

  const metricValue: Record<
    BadgeType,
    (m: UserBadgeMetrics) => number
  > = {
    girouette: (m) => m.girouetteMaxStreak,
    visionnaire: (m) => m.visionnaireBigExactCount,
    sniper: (m) => m.sniperDoubleExactEvents,
    "chat-noir": (m) => m.chatNoirMaxStreak,
    touriste: (m) => m.touristeLastStreak,
    parachute: (m) => m.parachuteBigDropCount,
  };

  for (const m of metrics) {
    for (const type of types) {
      const value = metricValue[type](m);
      const tier = tierFromValue(value, BADGE_THRESHOLDS[type]);
      if (!tier) continue;

      awarded.push({
        user_id: m.userId,
        badge_type: type,
        tier,
        badge_name: badgeDisplayName(type, tier),
      });
    }
  }

  return awarded;
}
