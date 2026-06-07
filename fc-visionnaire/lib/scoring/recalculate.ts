import { supabase } from "@/lib/supabase";
import { computeAwardedBadges, type UserBadgeMetrics } from "@/lib/badges/compute";
import {
  chronologicalPronos,
  countBigExactScores,
  countDoubleExactEvents,
  maxConsecutive,
} from "@/lib/badges/metrics";
import {
  DISTINCTION_POINTS,
  scoreDistinctionProno,
  type DistinctionCategory,
  type RealDistinctions,
} from "@/lib/tournament/distinctions";

type BadgeStatsRow = {
  user_id: string;
  touriste_last_streak: number;
  parachute_big_drop_count: number;
};

/** Recalcule points, rangs et badges pour tous les joueurs. */
export async function recalculateScores(): Promise<{ ok: boolean }> {
  const { data: users } = await supabase.from("users").select("*");
  const { data: completedMatches } = await supabase
    .from("matches")
    .select("id, match_date, real_score_home, real_score_away")
    .eq("status", "Completed")
    .order("match_date", { ascending: true });
  const { data: predictions } = await supabase.from("predictions").select("*");
  const { data: allDistinctions } = await supabase.from("distinctions").select("*");
  const { data: settings } = await supabase
    .from("app_settings")
    .select("real_distinctions")
    .eq("id", 1)
    .single();
  const { data: badgeStatsRows } = await supabase
    .from("user_badge_stats")
    .select("user_id, touriste_last_streak, parachute_big_drop_count");

  if (!users || !completedMatches || !predictions || !allDistinctions) {
    return { ok: false };
  }

  const realDistinctions = (settings?.real_distinctions ?? {}) as RealDistinctions;
  const statsByUser = new Map<string, BadgeStatsRow>(
    (badgeStatsRows ?? []).map((r) => [r.user_id, r]),
  );

  const userUpdates: {
    id: string;
    total_points: number;
    old_rank: number;
  }[] = [];
  const allMetrics: UserBadgeMetrics[] = [];

  for (const user of users) {
    let totalPoints = 0;
    const userPronos = predictions.filter((p) => p.user_id === user.id);

    for (const prono of userPronos) {
      const match = completedMatches.find((m) => m.id === prono.match_id);
      if (!match) continue;

      let pointsEarned = 0;
      const isGirouette = prono.is_girouette;
      const realHome = match.real_score_home!;
      const realAway = match.real_score_away!;
      const predHome = prono.predicted_score_home;
      const predAway = prono.predicted_score_away;

      if (realHome === predHome && realAway === predAway) {
        pointsEarned = isGirouette ? 2 : 4;
      } else if (
        Math.sign(realHome - realAway) === Math.sign(predHome - predAway)
      ) {
        pointsEarned = isGirouette ? 1 : 2;
      }

      totalPoints += pointsEarned;
      prono.points_earned = pointsEarned;

      await supabase
        .from("predictions")
        .update({ points_earned: pointsEarned })
        .eq("id", prono.id);
    }

    const userDistinctions = allDistinctions.filter((d) => d.user_id === user.id);
    for (const dist of userDistinctions) {
      const category = dist.category as DistinctionCategory;
      if (!DISTINCTION_POINTS[category]) continue;

      const pointsEarned = scoreDistinctionProno(
        dist.player_name,
        realDistinctions[category],
        dist.is_girouette ?? false,
        category,
      );
      totalPoints += pointsEarned;

      await supabase
        .from("distinctions")
        .update({ points_earned: pointsEarned })
        .eq("id", dist.id);
    }

    const completedPronos = userPronos.filter((p) =>
      completedMatches.some((m) => m.id === p.match_id),
    );
    const timeline = chronologicalPronos(completedMatches, completedPronos);

    userUpdates.push({
      id: user.id,
      total_points: totalPoints,
      old_rank: user.rank,
    });

    const prevStats = statsByUser.get(user.id);

    allMetrics.push({
      userId: user.id,
      girouetteMaxStreak: maxConsecutive(timeline, (p) => p.isGirouette),
      visionnaireBigExactCount: countBigExactScores(timeline),
      sniperDoubleExactEvents: countDoubleExactEvents(timeline),
      chatNoirMaxStreak: maxConsecutive(
        timeline,
        (p) => p.pointsEarned === 0,
      ),
      touristeLastStreak: prevStats?.touriste_last_streak ?? 0,
      parachuteBigDropCount: prevStats?.parachute_big_drop_count ?? 0,
    });
  }

  userUpdates.sort((a, b) => b.total_points - a.total_points);
  const playerCount = userUpdates.length;
  const lastUserId =
    playerCount >= 2 ? userUpdates[playerCount - 1].id : null;

  for (let i = 0; i < userUpdates.length; i++) {
    const newRank = i + 1;
    const user = userUpdates[i];
    const metrics = allMetrics.find((m) => m.userId === user.id)!;
    const prevStats = statsByUser.get(user.id);

    let touristeStreak = prevStats?.touriste_last_streak ?? 0;
    let parachuteDrops = prevStats?.parachute_big_drop_count ?? 0;

    if (playerCount >= 2 && user.id === lastUserId) {
      touristeStreak += 1;
    } else {
      touristeStreak = 0;
    }

    const rankDrop =
      user.old_rank !== 0 && newRank > user.old_rank
        ? newRank - user.old_rank
        : 0;
    if (rankDrop >= 3) parachuteDrops += 1;

    metrics.touristeLastStreak = touristeStreak;
    metrics.parachuteBigDropCount = parachuteDrops;

    await supabase
      .from("users")
      .update({ total_points: user.total_points, rank: newRank })
      .eq("id", user.id);

    await supabase.from("user_badge_stats").upsert(
      {
        user_id: user.id,
        touriste_last_streak: touristeStreak,
        parachute_big_drop_count: parachuteDrops,
      },
      { onConflict: "user_id" },
    );
  }

  const newBadges = computeAwardedBadges(allMetrics);

  await supabase
    .from("badges")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (newBadges.length > 0) {
    await supabase.from("badges").insert(newBadges);
  }

  return { ok: true };
}
