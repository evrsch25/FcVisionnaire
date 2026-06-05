"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// 1. Ajouter un nouveau match
export async function addMatch(formData: FormData) {
  const stage = formData.get("stage") as string;
  const teamHome = formData.get("team_home") as string;
  const teamAway = formData.get("team_away") as string;
  const matchDate = formData.get("match_date") as string;

  if (!stage || !teamHome || !teamAway || !matchDate) return;

  await supabase.from("matches").insert([
    {
      stage,
      team_home: teamHome,
      team_away: teamAway,
      match_date: new Date(matchDate).toISOString(),
      status: "Pending",
    },
  ]);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

// 2. Verrouiller / Déverrouiller la compétition
export async function toggleLock() {
  // On récupère le statut actuel
  const { data: settings } = await supabase
    .from("app_settings")
    .select("is_locked")
    .eq("id", 1)
    .single();

  if (settings) {
    // On inverse le statut
    await supabase
      .from("app_settings")
      .update({ is_locked: !settings.is_locked })
      .eq("id", 1);
  }

  revalidatePath("/admin");
}

// 3. Mettre à jour le score réel d'un match terminé
export async function updateRealScore(formData: FormData) {
  const matchId = formData.get("match_id") as string;
  const scoreHome = formData.get("score_home") as string;
  const scoreAway = formData.get("score_away") as string;

  if (!matchId || !scoreHome || !scoreAway) return;

  await supabase
    .from("matches")
    .update({
      real_score_home: parseInt(scoreHome),
      real_score_away: parseInt(scoreAway),
      status: "Completed",
    })
    .eq("id", matchId);

  revalidatePath("/admin");
}

// 4. LE MOTEUR DE CALCUL (À ajouter à la fin de app/actions/admin.ts)
export async function recalculateAll() {
  // 1. Récupérer toutes les données nécessaires
  const { data: users } = await supabase.from("users").select("*");
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "Completed");
  const { data: predictions } = await supabase.from("predictions").select("*");
  const { data: oldBadges } = await supabase.from("badges").select("*");

  if (!users || !matches || !predictions) return;

  // On va préparer les mises à jour en mémoire pour aller plus vite
  const userUpdates = [];
  const newBadges: any[] = [];

  // 2. Boucle sur chaque utilisateur
  for (const user of users) {
    let totalPoints = 0;
    let exactScoresCount = 0;
    let hasGirouette = false;
    let hasVisionnaire = false;

    // A. Calcul des points pour les Matchs
    const userPronos = predictions.filter((p) => p.user_id === user.id);

    for (const prono of userPronos) {
      const match = matches.find((m) => m.id === prono.match_id);
      if (!match) continue; // Match pas encore terminé

      let pointsEarned = 0;
      const isGirouette = prono.is_girouette;

      if (isGirouette) hasGirouette = true;

      const realHome = match.real_score_home!;
      const realAway = match.real_score_away!;
      const predHome = prono.predicted_score_home;
      const predAway = prono.predicted_score_away;

      // Logique des points (Score exact = 4, Bonne issue = 2)
      if (realHome === predHome && realAway === predAway) {
        pointsEarned = isGirouette ? 2 : 4;
        exactScoresCount++;
        // Badge Visionnaire (Score exact avec 4 buts ou plus au total)
        if (realHome + realAway >= 4) hasVisionnaire = true;
      } else if (
        Math.sign(realHome - realAway) === Math.sign(predHome - predAway)
      ) {
        pointsEarned = isGirouette ? 1 : 2;
      }

      totalPoints += pointsEarned;

      // Mise à jour du prono en base pour l'historique
      await supabase
        .from("predictions")
        .update({ points_earned: pointsEarned })
        .eq("id", prono.id);
    }

    // B. Attribution des Badges "Positifs" ou liés aux actions
    if (hasGirouette)
      newBadges.push({ user_id: user.id, badge_name: "La Girouette 🌪️" });
    if (hasVisionnaire)
      newBadges.push({ user_id: user.id, badge_name: "Le Visionnaire 👁️" });
    if (exactScoresCount >= 2)
      newBadges.push({ user_id: user.id, badge_name: "Le Sniper 🎯" });
    if (userPronos.length >= 3 && totalPoints === 0)
      newBadges.push({ user_id: user.id, badge_name: "Le Chat Noir 🐈‍⬛" });

    userUpdates.push({
      ...user,
      total_points: totalPoints,
      old_rank: user.rank, // On garde l'ancien rang en mémoire temporaire pour le Parachute
    });
  }

  // 3. Tri des utilisateurs pour définir le nouveau Classement (Rang)
  userUpdates.sort((a, b) => b.total_points - a.total_points);

  // 4. Attribution des Rangs et Badges de Classement
  for (let i = 0; i < userUpdates.length; i++) {
    const newRank = i + 1;
    const user = userUpdates[i];

    // Le Touriste (Dernier du classement)
    if (newRank === userUpdates.length && userUpdates.length > 1) {
      newBadges.push({ user_id: user.id, badge_name: "Le Touriste 🩴" });
    }

    // Le Parachute (A perdu 3 places ou plus)
    if (user.old_rank !== 0 && newRank - user.old_rank >= 3) {
      newBadges.push({ user_id: user.id, badge_name: "Le Parachute 🪂" });
    }

    // Sauvegarde du nouveau rang et des points
    await supabase
      .from("users")
      .update({
        total_points: user.total_points,
        rank: newRank,
      })
      .eq("id", user.id);
  }

  // 5. Nettoyage et insertion des nouveaux badges
  // On efface tous les anciens badges pour ne garder que ceux du recalcul actuel
  await supabase
    .from("badges")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Hack pour tout supprimer facilement sans bloquer
  if (newBadges.length > 0) {
    // Éviter les doublons de badges pour un même utilisateur
    const uniqueBadges = newBadges.filter(
      (badge, index, self) =>
        index ===
        self.findIndex(
          (t) =>
            t.user_id === badge.user_id && t.badge_name === badge.badge_name,
        ),
    );
    await supabase.from("badges").insert(uniqueBadges);
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
}

// 5. Générer les 6 matchs d'un Groupe ou les mettre à jour
export async function generateGroup(formData: FormData) {
  const groupName = formData.get("group_name") as string;
  if (!groupName) return;

  const newTeams = [
    formData.get("team_1") as string,
    formData.get("team_2") as string,
    formData.get("team_3") as string,
    formData.get("team_4") as string,
  ];

  const oldTeams = [
    formData.get("old_team_1") as string,
    formData.get("old_team_2") as string,
    formData.get("old_team_3") as string,
    formData.get("old_team_4") as string,
  ];

  // On s'assure que les 4 champs sont remplis
  if (newTeams.some((t) => !t)) return;

  const stageName = `Groupe ${groupName}`;

  // Vérifier si des matchs existent déjà pour ce groupe
  const { data: existingMatches } = await supabase
    .from("matches")
    .select("id")
    .eq("stage", stageName)
    .order("match_date", { ascending: true });

  const [t1, t2, t3, t4] = newTeams;

  // Le planning standard de 6 matchs
  const defaultMatchDates = [
    "2026-06-11T12:00:00Z",
    "2026-06-11T12:00:00Z",
    "2026-06-15T12:00:00Z",
    "2026-06-15T12:00:00Z",
    "2026-06-19T12:00:00Z",
    "2026-06-19T12:00:00Z",
  ];

  // Les 6 affiches du groupe
  const pairings = [
    { home: t1, away: t2 },
    { home: t3, away: t4 },
    { home: t1, away: t3 },
    { home: t4, away: t2 },
    { home: t4, away: t1 },
    { home: t2, away: t3 },
  ];

  // --- CAS 1: UPDATE (des matchs existent déjà) ---
  if (existingMatches && existingMatches.length > 0) {
    // On vérifie si la structure du groupe est saine (4 anciennes équipes distinctes et non vides)
    const validOldTeams = oldTeams.filter((t) => t && t.trim() !== "");
    const uniqueOldTeams = new Set(validOldTeams);

    if (existingMatches.length === 6 && uniqueOldTeams.size === 4) {
      // A. Renommage propre et chirurgical
      const teamChanges = new Map<string, string>();
      for (let i = 0; i < 4; i++) {
        if (oldTeams[i] !== newTeams[i]) {
          teamChanges.set(oldTeams[i], newTeams[i]);
        }
      }
      if (teamChanges.size > 0) {
        for (const [oldName, newName] of teamChanges.entries()) {
          await supabase
            .from("matches")
            .update({ team_home: newName })
            .eq("stage", stageName)
            .eq("team_home", oldName);
          await supabase
            .from("matches")
            .update({ team_away: newName })
            .eq("stage", stageName)
            .eq("team_away", oldName);
        }
      }
    } else if (existingMatches.length === 6) {
      // B. Groupe corrompu mais on a bien 6 matchs : On écrase les affiches par ID pour tout réparer
      for (let i = 0; i < 6; i++) {
        await supabase
          .from("matches")
          .update({ team_home: pairings[i].home, team_away: pairings[i].away })
          .eq("id", existingMatches[i].id);
      }
    } else {
      // C. Extrêmement corrompu (< ou > 6 matchs) : On nettoie et on recrée tout
      await supabase.from("matches").delete().eq("stage", stageName);
      const groupMatches = pairings.map((p, i) => ({
        stage: stageName,
        team_home: p.home,
        team_away: p.away,
        match_date: new Date(defaultMatchDates[i]).toISOString(),
        status: "Pending",
      }));
      await supabase.from("matches").insert(groupMatches);
    }
  }
  // --- CAS 2: CREATE (aucun match n'existe pour ce groupe) ---
  else {
    const groupMatches = pairings.map((p, i) => ({
      stage: stageName,
      team_home: p.home,
      team_away: p.away,
      match_date: new Date(defaultMatchDates[i]).toISOString(),
      status: "Pending",
    }));
    await supabase.from("matches").insert(groupMatches);
  }

  revalidatePath("/admin");
}

// 6. Générer l'Arbre Final (avec des champs vides pour activer les placeholders)
export async function generateKnockouts() {
  // Sécurité anti-doublon : on vérifie si la Finale existe déjà
  const { data: existing } = await supabase
    .from("matches")
    .select("id")
    .eq("stage", "FINALE");
  if (existing && existing.length > 0) return;

  const matchesToInsert = [];

  for (let i = 1; i <= 16; i++)
    matchesToInsert.push({
      stage: "1/16 Finale",
      team_home: "",
      team_away: "",
      match_date: new Date("2026-06-28T12:00:00Z").toISOString(),
      status: "Pending",
    });
  for (let i = 1; i <= 8; i++)
    matchesToInsert.push({
      stage: "1/8 Finale",
      team_home: "",
      team_away: "",
      match_date: new Date("2026-07-04T12:00:00Z").toISOString(),
      status: "Pending",
    });
  for (let i = 1; i <= 4; i++)
    matchesToInsert.push({
      stage: "1/4 Finale",
      team_home: "",
      team_away: "",
      match_date: new Date("2026-07-09T12:00:00Z").toISOString(),
      status: "Pending",
    });
  matchesToInsert.push({
    stage: "1/2 Finale",
    team_home: "",
    team_away: "",
    match_date: new Date("2026-07-14T12:00:00Z").toISOString(),
    status: "Pending",
  });
  matchesToInsert.push({
    stage: "1/2 Finale",
    team_home: "",
    team_away: "",
    match_date: new Date("2026-07-15T12:00:00Z").toISOString(),
    status: "Pending",
  });
  matchesToInsert.push({
    stage: "Petite Finale",
    team_home: "",
    team_away: "",
    match_date: new Date("2026-07-18T12:00:00Z").toISOString(),
    status: "Pending",
  });
  matchesToInsert.push({
    stage: "FINALE",
    team_home: "",
    team_away: "",
    match_date: new Date("2026-07-19T12:00:00Z").toISOString(),
    status: "Pending",
  });

  await supabase.from("matches").insert(matchesToInsert);
  revalidatePath("/admin");
}

// 7. Mettre à jour les infos d'un match (Équipes et Date)
export async function updateMatchInfo(formData: FormData) {
  const matchId = formData.get("match_id") as string;
  const teamHome = formData.get("team_home") as string;
  const teamAway = formData.get("team_away") as string;
  const matchDate = formData.get("match_date") as string;

  // On autorise teamHome et teamAway à être vides (pratique pour les phases finales)
  if (!matchId || !matchDate) return;

  await supabase
    .from("matches")
    .update({
      team_home: teamHome,
      team_away: teamAway,
      // L'ajout du "Z" force le fuseau horaire UTC.
      // Ça empêche ton serveur de décaler l'heure en fonction de sa propre localisation !
      match_date: new Date(matchDate + "Z").toISOString(),
    })
    .eq("id", matchId);

  revalidatePath("/admin");
  revalidatePath("/bracket");
}

// 8. Supprimer un match spécifique
export async function deleteMatch(formData: FormData) {
  const matchId = formData.get("match_id") as string;
  if (!matchId) return;

  await supabase.from("matches").delete().eq("id", matchId);

  revalidatePath("/admin");
}

// 9. Supprimer TOUS les matchs (Bouton d'urgence)
export async function deleteAllMatches() {
  await supabase
    .from("matches")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Hack pour tout supprimer facilement

  revalidatePath("/admin");
}
