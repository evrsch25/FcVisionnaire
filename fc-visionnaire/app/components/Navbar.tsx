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

  return (
    <>
      <header className="bg-bg-panel border-b border-border-subtle p-5 flex justify-between items-center shadow-sm">
        <Link
          href="/dashboard"
          className="font-black text-xl text-text-base tracking-widest uppercase hover:text-gray-300 transition"
        >
          FC Visionnaire
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            href="/leaderboard"
            className="hidden md:block text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-base transition"
          >
            Classement
          </Link>
          <Link
            href={`/profile/${user.username}`}
            className="hidden md:block text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-base transition"
          >
            Mon Profil
          </Link>
          <span className="font-bold text-text-base ml-2">{user.username}</span>
          <form action={logoutUser}>
            <button
              type="submit"
              className="text-xs font-bold uppercase tracking-wider border border-border-subtle text-text-muted px-4 py-2 rounded hover:bg-border-subtle hover:text-text-base transition"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </header>
      {/* Nav Mobile */}
      <div className="flex md:hidden gap-4 justify-center p-4 bg-bg-base border-b border-border-subtle">
        <Link
          href="/leaderboard"
          className="flex-1 text-center text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-base transition bg-bg-panel px-4 py-2 rounded border border-border-subtle"
        >
          Classement
        </Link>
        <Link
          href={`/profile/${user.username}`}
          className="flex-1 text-center text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-base transition bg-bg-panel px-4 py-2 rounded border border-border-subtle"
        >
          Mon Profil
        </Link>
      </div>
    </>
  );
}
