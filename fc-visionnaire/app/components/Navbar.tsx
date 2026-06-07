import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { logoutUser } from "@/app/actions/auth";

export default async function Navbar() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) return null;

  const { data: user } = await supabase
    .from("users")
    .select("username")
    .eq("id", userId)
    .single();

  if (!user) return null;

  const initial = user.username.charAt(0).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-base/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-soft to-accent-deep text-[#04130d] font-black text-lg shadow-[0_0_18px_-4px_rgba(16,185,129,0.6)]">
              FC
            </span>
            <span className="font-display text-lg font-bold tracking-wide uppercase text-text-base group-hover:text-accent-soft transition">
              Visionnaire
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/leaderboard"
              className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-base hover:bg-bg-panel transition"
            >
              Classement
            </Link>
            <Link
              href={`/profile/${user.username}`}
              className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-base hover:bg-bg-panel transition"
            >
              Mon Profil
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={`/profile/${user.username}`}
              className="hidden sm:flex items-center gap-2.5 rounded-full border border-border-subtle bg-bg-panel/60 pl-1.5 pr-3 py-1.5 hover:border-border-strong transition"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated text-xs font-black text-accent-soft border border-border-subtle">
                {initial}
              </span>
              <span className="text-sm font-bold text-text-base">
                {user.username}
              </span>
            </Link>
            <form action={logoutUser}>
              <button type="submit" className="btn-ghost btn-sm">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Nav mobile */}
      <div className="flex md:hidden gap-2 px-4 py-3 border-b border-border-subtle bg-bg-base/60 backdrop-blur-md">
        <Link
          href="/leaderboard"
          className="flex-1 text-center text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-base transition surface-2 px-4 py-2.5"
        >
          Classement
        </Link>
        <Link
          href={`/profile/${user.username}`}
          className="flex-1 text-center text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-base transition surface-2 px-4 py-2.5"
        >
          Mon Profil
        </Link>
      </div>
    </>
  );
}
