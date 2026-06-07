"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginUser } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginUser, null);

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center p-4 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-accent-main/15 blur-[120px]"
      />

      <Link
        href="/"
        className="relative z-10 mb-8 flex items-center gap-2.5 group"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft to-accent-deep text-[#04130d] font-black text-lg">
          FC
        </span>
        <span className="font-display text-lg font-bold tracking-wide uppercase text-text-base">
          Visionnaire
        </span>
      </Link>

      <div className="relative z-10 surface w-full max-w-md p-8 shadow-[var(--shadow-soft)]">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-text-base">
            Connexion
          </h1>
          <p className="text-text-muted text-sm mt-2">
            Ravi de te revoir dans l&apos;arène.
          </p>
        </div>

        {state?.error && (
          <div className="mb-4 rounded-lg border border-accent-danger/30 bg-accent-danger/10 px-4 py-3 text-sm font-bold text-accent-danger text-center">
            {state.error}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-5">
          <div>
            <label className="label-field">Pseudo</label>
            <input
              type="text"
              name="username"
              required
              className="input-field"
              placeholder="Ton pseudo..."
            />
          </div>

          <div>
            <label className="label-field">Mot de passe</label>
            <input
              type="password"
              name="password"
              required
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="btn-primary w-full mt-2 disabled:opacity-60"
          >
            {pending ? "Connexion..." : "Entrer"}
          </button>
        </form>

        <p className="text-text-muted text-center mt-6 text-sm">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="font-bold text-accent-soft hover:text-accent-main transition"
          >
            Inscris-toi
          </Link>
        </p>
      </div>
    </div>
  );
}
