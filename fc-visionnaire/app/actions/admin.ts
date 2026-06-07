"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import {
  generateNextRoundMatches,
  currentPhaseComplete,
  type DbMatch,
} from "@/lib/tournament/realBracket";
import { nextPhase, type Phase } from "@/lib/tournament/phases";
import { recalculateScores } from "@/lib/scoring/recalculate";
import {
  DISTINCTION_CATEGORIES,
  type RealDistinctions,
} from "@/lib/tournament/distinctions";

async function afterAdminMutation() {
  await recalculateScores();
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/bracket");
}

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

  await afterAdminMutation();
}

// 2. Mettre à jour le score réel d'un match terminé
export async function updateRealScore(formData: FormData) {
  const matchId = formData.get("match_id") as string;
  const scoreHome = formData.get("score_home") as string;
  const scoreAway = formData.get("score_away") as string;
  const realWinner = (formData.get("real_winner") as string) || null;

  if (!matchId || scoreHome === "" || scoreAway === "") return;

  const sh = parseInt(scoreHome, 10);
  const sa = parseInt(scoreAway, 10);

  const { data: match } = await supabase
    .from("matches")
    .select("team_home, team_away, slot")
    .eq("id", matchId)
    .single();

  let winner: string | null = null;
  if (match?.slot) {
    if (sh > sa) winner = match.team_home;
    else if (sa > sh) winner = match.team_away;
    else winner = realWinner;
  }

  await supabase
    .from("matches")
    .update({
      real_score_home: sh,
      real_score_away: sa,
      real_winner: winner,
      status: "Completed",
    })
    .eq("id", matchId);

  await afterAdminMutation();
}

// 3b. Clôturer le tour courant et générer le suivant
export async function advancePhase() {
  const { data: settings } = await supabase
    .from("app_settings")
    .select("current_phase, is_locked")
    .eq("id", 1)
    .single();

  const phase = (settings?.current_phase ?? "GROUPS") as Phase;
  const following = nextPhase(phase);
  if (!following) return;

  const { data: allMatches } = await supabase.from("matches").select("*");
  const matches = (allMatches ?? []) as DbMatch[];

  const check = currentPhaseComplete(phase, matches);
  if (!check.complete) return;

  if (phase === "FINAL") {
    await supabase
      .from("app_settings")
      .update({ current_phase: "DONE", is_locked: true })
      .eq("id", 1);
    await afterAdminMutation();
    return;
  }

  const { matches: generated, errors } = generateNextRoundMatches(
    phase,
    matches,
  );
  if (errors.length > 0) return;

  const existingSlots = new Set(
    matches.filter((m) => m.slot).map((m) => m.slot),
  );

  const toInsert = generated
    .filter((g) => !existingSlots.has(g.slot))
    .map((g) => ({
      stage: g.stage,
      team_home: g.team_home,
      team_away: g.team_away,
      slot: g.slot,
      match_date: g.match_date,
      status: "Pending",
    }));

  if (toInsert.length > 0) {
    await supabase.from("matches").insert(toInsert);
  }

  await supabase
    .from("app_settings")
    .update({ current_phase: following, is_locked: false })
    .eq("id", 1);

  await afterAdminMutation();
}

/** Recalcul manuel (les mutations admin le déclenchent déjà automatiquement). */
export async function recalculateAll() {
  await afterAdminMutation();
}

/** Vainqueurs réels des distinctions (saisis par l'admin après la compétition). */
export async function updateRealDistinctions(formData: FormData) {
  const real: RealDistinctions = {};

  for (const cat of DISTINCTION_CATEGORIES) {
    const val = (formData.get(cat.id) as string)?.trim();
    if (val) real[cat.id] = val;
  }

  await supabase
    .from("app_settings")
    .update({ real_distinctions: real })
    .eq("id", 1);

  await afterAdminMutation();
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

  await afterAdminMutation();
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
  await afterAdminMutation();
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

  await afterAdminMutation();
}

// 8. Supprimer un match spécifique
export async function deleteMatch(formData: FormData) {
  const matchId = formData.get("match_id") as string;
  if (!matchId) return;

  await supabase.from("matches").delete().eq("id", matchId);

  await afterAdminMutation();
}

// 9. Supprimer TOUS les matchs (Bouton d'urgence)
export async function deleteAllMatches() {
  await supabase
    .from("matches")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Hack pour tout supprimer facilement

  await afterAdminMutation();
}
