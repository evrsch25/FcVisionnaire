"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAdmin } from "@/app/actions/adminAuth";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAdmin, null);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4">
      <div className="surface w-full max-w-md p-8">
        <div className="text-center mb-8">
          <p className="eyebrow">Accès restreint</p>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide mt-1">
            Admin FC Visionnaire
          </h1>
          <p className="text-text-muted text-sm mt-2">
            Mot de passe requis pour gérer la compétition.
          </p>
        </div>

        {state?.error && (
          <div className="mb-4 rounded-lg border border-accent-danger/30 bg-accent-danger/10 px-4 py-3 text-sm font-bold text-accent-danger text-center">
            {state.error}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-5">
          <div>
            <label className="label-field">Mot de passe admin</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="input-field"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="btn-primary w-full disabled:opacity-60"
          >
            {pending ? "Vérification..." : "Accéder au panel"}
          </button>
        </form>

        <p className="text-center mt-6">
          <Link href="/dashboard" className="text-sm text-text-muted hover:text-text-base">
            ← Retour au jeu
          </Link>
        </p>
      </div>
    </div>
  );
}
