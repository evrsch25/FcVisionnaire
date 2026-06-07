"use server";

import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type {
  SavePredictionsPayload,
  SaveDistinctionsPayload,
} from "./bracketTypes";
import type { Phase } from "@/lib/tournament/phases";
import {
  getPhaseKickoff,
  isKickoffPassed,
  isCompetitionStarted,
  matchBelongsToPhase,
} from "@/lib/tournament/phaseLock";

async function getUserId() {
  const cookieStore = await cookies();
  return cookieStore.get("user_id")?.value;
}

async function getSettings() {
  const { data } = await supabase
    .from("app_settings")
    .select("current_phase")
    .eq("id", 1)
    .single();
  return {
    currentPhase: (data?.current_phase ?? "GROUPS") as Phase,
  };
}

/** Pronos du tour courant — modifiables après kickoff avec demi-points (girouette). */
export async function savePredictions(payload: SavePredictionsPayload) {
  const userId = await getUserId();
  if (!userId) return { error: "Non autorisé" };

  const { currentPhase } = await getSettings();
  if (currentPhase === "DONE") {
    return { error: "Le tournoi est terminé." };
  }

  const { data: allMatches } = await supabase
    .from("matches")
    .select("id, stage, slot, match_date")
    .order("match_date", { ascending: true });

  const matches = allMatches ?? [];
  const matchById = Object.fromEntries(matches.map((m) => [m.id, m]));
  const now = new Date();

  const updates: {
    user_id: string;
    match_id: string;
    predicted_score_home: number;
    predicted_score_away: number;
    is_girouette: boolean;
  }[] = [];

  for (const s of payload.scores) {
    if (Number.isNaN(s.score_home) || Number.isNaN(s.score_away)) continue;

    const match = matchById[s.match_id];
    if (!match || !matchBelongsToPhase(match, currentPhase)) continue;

    const kickoff = getPhaseKickoff(currentPhase, matches);
    const pastKickoff = isKickoffPassed(kickoff, now);

    let girouette = false;
    if (pastKickoff) {
      const { data: existing } = await supabase
        .from("predictions")
        .select("predicted_score_home, predicted_score_away, is_girouette")
        .eq("user_id", userId)
        .eq("match_id", s.match_id)
        .single();

      const isNew = !existing;
      const isChanged =
        existing &&
        (existing.predicted_score_home !== s.score_home ||
          existing.predicted_score_away !== s.score_away);

      if (isNew || isChanged) {
        girouette = true;
      } else {
        girouette = existing?.is_girouette ?? false;
      }
    }

    updates.push({
      user_id: userId,
      match_id: s.match_id,
      predicted_score_home: s.score_home,
      predicted_score_away: s.score_away,
      is_girouette: girouette,
    });
  }

  if (updates.length > 0) {
    await supabase
      .from("predictions")
      .upsert(updates, { onConflict: "user_id, match_id" });
  }

  revalidatePath("/bracket");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Distinctions : modifiables uniquement avant le coup d'envoi (1er match de groupes). */
export async function saveDistinctions(payload: SaveDistinctionsPayload) {
  const userId = await getUserId();
  if (!userId) return { error: "Non autorisé" };

  const { data: matches } = await supabase
    .from("matches")
    .select("stage, slot, match_date");

  if (isCompetitionStarted(matches ?? [])) {
    return { error: "Les distinctions sont verrouillées (compétition démarrée)." };
  }

  const rows: {
    user_id: string;
    category: string;
    player_name: string;
    is_girouette: boolean;
  }[] = [];

  for (const d of payload.distinctions) {
    const val = (d.player_name || "").trim();
    if (!val) continue;
    rows.push({
      user_id: userId,
      category: d.category,
      player_name: val,
      is_girouette: false,
    });
  }

  if (rows.length > 0) {
    await supabase
      .from("distinctions")
      .upsert(rows, { onConflict: "user_id, category" });
  }

  revalidatePath("/bracket");
  revalidatePath("/dashboard");
  return { ok: true };
}
