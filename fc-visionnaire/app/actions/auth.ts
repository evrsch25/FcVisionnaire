"use server";

import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function registerUser(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) return { error: "Remplis tous les champs !" };

  // 1. Vérifier si le pseudo existe déjà
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .single();

  if (existingUser)
    return { error: "Ce pseudo est déjà pris, trouve autre chose !" };

  // 2. Hacher le mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Créer l'utilisateur
  const { data: newUser, error } = await supabase
    .from("users")
    .insert([{ username, password_hash: hashedPassword }])
    .select("id")
    .single();

  if (error || !newUser)
    return { error: "Erreur lors de la création du compte." };

  // 4. Connecter l'utilisateur (NOUVELLE SYNTAXE NEXT.JS)
  const cookieStore = await cookies();
  cookieStore.set("user_id", newUser.id, { httpOnly: true, secure: true });

  // 5. Redirection vers le dashboard
  redirect("/dashboard");
}

export async function loginUser(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) return { error: "Remplis tous les champs !" };

  // 1. Récupérer l'utilisateur
  const { data: user } = await supabase
    .from("users")
    .select("id, password_hash")
    .eq("username", username)
    .single();

  if (!user) return { error: "Pseudo inconnu au bataillon." };

  // 2. Vérifier le mot de passe
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return { error: "Mot de passe incorrect !" };

  // 3. Connecter l'utilisateur (NOUVELLE SYNTAXE NEXT.JS)
  const cookieStore = await cookies();
  cookieStore.set("user_id", user.id, { httpOnly: true, secure: true });

  redirect("/dashboard");
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("user_id");
  redirect("/login");
}
