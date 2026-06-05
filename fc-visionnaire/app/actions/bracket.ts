"use server";

import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function saveBracket(formData: FormData) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) return { error: "Non autorisé" };

  // 1. Vérifier si la compétition est verrouillée (Statut Girouette)
  const { data: settings } = await supabase
    .from("app_settings")
    .select("is_locked")
    .eq("id", 1)
    .single();
  const isLocked = settings?.is_locked || false;

  // 2. Parcourir toutes les données envoyées par le formulaire
  const matchUpdates = [];
  const distinctionUpdates = [];

  for (const [key, value] of formData.entries()) {
    const valStr = value.toString().trim();
    if (!valStr) continue;

    // --- SAUVEGARDE DES MATCHS ---
    if (key.startsWith("matchHome_")) {
      const matchId = key.split("_")[1];
      const scoreHome = parseInt(valStr);
      const scoreAway = parseInt(
        formData.get(`matchAway_${matchId}`) as string,
      );

      if (!isNaN(scoreHome) && !isNaN(scoreAway)) {
        // Vérifier s'il y a déjà un prono pour savoir si on le modifie après verrouillage
        const { data: existing } = await supabase
          .from("predictions")
          .select("predicted_score_home, predicted_score_away, is_girouette")
          .eq("user_id", userId)
          .eq("match_id", matchId)
          .single();

        let girouette = existing?.is_girouette || false;
        // Si c'est verrouillé ET que c'est une modification (ou un nouveau prono tardif), on le marque en Girouette
        if (isLocked) {
          if (
            !existing ||
            existing.predicted_score_home !== scoreHome ||
            existing.predicted_score_away !== scoreAway
          ) {
            girouette = true;
          }
        }

        matchUpdates.push({
          user_id: userId,
          match_id: matchId,
          predicted_score_home: scoreHome,
          predicted_score_away: scoreAway,
          is_girouette: girouette,
        });
      }
    }

    // --- SAUVEGARDE DES DISTINCTIONS ---
    if (key.startsWith("distinction_")) {
      const category = key.replace("distinction_", "");

      const { data: existing } = await supabase
        .from("distinctions")
        .select("player_name, is_girouette")
        .eq("user_id", userId)
        .eq("category", category)
        .single();

      let girouette = existing?.is_girouette || false;
      if (isLocked && (!existing || existing.player_name !== valStr)) {
        girouette = true;
      }

      distinctionUpdates.push({
        user_id: userId,
        category: category,
        player_name: valStr,
        is_girouette: girouette,
      });
    }
  }

  // 3. Envoyer en base de données (Upsert = Insère ou Met à jour si ça existe déjà)
  if (matchUpdates.length > 0) {
    await supabase
      .from("predictions")
      .upsert(matchUpdates, { onConflict: "user_id, match_id" });
  }
  if (distinctionUpdates.length > 0) {
    await supabase
      .from("distinctions")
      .upsert(distinctionUpdates, { onConflict: "user_id, category" });
  }

  // (Note: L'arbre de tournoi complet nécessiterait un traitement similaire, on le simplifiera dans l'UI)

  revalidatePath("/bracket");
  revalidatePath("/dashboard");
}
