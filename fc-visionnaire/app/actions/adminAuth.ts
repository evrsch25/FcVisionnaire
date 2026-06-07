"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionValue,
  isValidAdminSession,
} from "@/lib/adminAuth";

export async function loginAdmin(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const password = formData.get("password") as string;

  if (!process.env.ADMIN_PASSWORD) {
    return { error: "ADMIN_PASSWORD non configuré sur le serveur." };
  }

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return { error: "Mot de passe incorrect." };
  }

  const token = createAdminSessionValue();
  if (!token) return { error: "Erreur de configuration admin." };

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/admin");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidAdminSession(value)) {
    redirect("/admin/login");
  }
}
