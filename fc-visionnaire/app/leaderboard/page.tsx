import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

export const dynamic = "force-dynamic"; // Fixe le bug d'affichage (Remplace "revalidate = 0")

export default async function LeaderboardPage() {
  const { data: users } = await supabase
    .from("users")
    .select("id, username, total_points, rank")
    .order("rank", { ascending: true })
    .order("total_points", { ascending: false });

  const { data: allBadges } = await supabase.from("badges").select("*");

  return (
    <div className="min-h-screen bg-bg-base text-text-base pb-20 font-sans">
      <Navbar />

      <main className="max-w-3xl mx-auto mt-10 px-4 flex flex-col gap-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-text-base uppercase tracking-widest">
            Classement Général
          </h1>
          <p className="text-text-muted mt-3 text-sm tracking-wide">
            La vérité du terrain se trouve ici.
          </p>
        </div>

        {users && users.length > 0 ? (
          users.map((user, index) => {
            const userBadges =
              allBadges?.filter((b) => b.user_id === user.id) || [];
            const isFirst = user.rank === 1 && user.total_points > 0;

            return (
              <Link
                href={`/profile/${user.username}`}
                key={user.id}
                className={`flex items-center gap-6 p-5 rounded-xl border transition-all hover:scale-[1.01] cursor-pointer
                  ${isFirst ? "bg-bg-panel border-text-base shadow" : "bg-bg-panel border-border-subtle hover:border-gray-600"}`}
              >
                {/* Le Rang */}
                <div
                  className={`w-14 h-14 flex items-center justify-center rounded-full font-black text-2xl shrink-0
                  ${isFirst ? "bg-text-base text-bg-base shadow" : "bg-bg-base text-text-base border border-border-subtle"}`}
                >
                  {user.rank === 0 ? "-" : user.rank}
                </div>

                {/* Infos Joueur & Badges */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-black text-xl tracking-wide truncate ${isFirst ? "text-text-base" : "text-text-base"}`}
                  >
                    {user.username}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {userBadges.map((badge, i) => (
                      <span
                        key={i}
                        className="bg-bg-base border border-border-subtle text-text-muted text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded"
                      >
                        {badge.badge_name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <div
                    className={`text-4xl font-black ${isFirst ? "text-text-base" : "text-text-base"}`}
                  >
                    {user.total_points}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mt-1">
                    Points
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-10 text-text-muted italic bg-bg-panel rounded-xl border border-border-subtle">
            Aucun joueur dans l'arène pour le moment.
          </div>
        )}
      </main>
    </div>
  );
}
