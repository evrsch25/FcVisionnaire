import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import BadgeList from "@/app/components/BadgeList";

export const dynamic = "force-dynamic"; // Fixe le bug d'affichage (Remplace "revalidate = 0")

export default async function LeaderboardPage() {
  const { data: users } = await supabase
    .from("users")
    .select("id, username, total_points, rank")
    .order("rank", { ascending: true })
    .order("total_points", { ascending: false });

  const { data: allBadges } = await supabase.from("badges").select("*");

  const podiumStyles: Record<number, string> = {
    1: "border-gold/50 shadow-[var(--shadow-gold)]",
    2: "border-border-strong",
    3: "border-[color:rgba(245,180,23,0.2)]",
  };
  const rankBadgeStyles: Record<number, string> = {
    1: "bg-gradient-to-br from-gold-soft to-gold text-[#1a1203]",
    2: "bg-bg-elevated text-text-base border border-border-strong",
    3: "bg-bg-elevated text-gold-soft border border-[color:rgba(245,180,23,0.3)]",
  };

  return (
    <div className="min-h-screen text-text-base pb-20">
      <Navbar />

      <main className="max-w-3xl mx-auto mt-8 md:mt-12 px-4 flex flex-col gap-3">
        <div className="text-center mb-6">
          <p className="eyebrow">Saison 2026</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold uppercase tracking-wide mt-1">
            Classement <span className="text-gradient-gold">Général</span>
          </h1>
          <p className="text-text-muted mt-3 text-sm tracking-wide">
            La vérité du terrain se trouve ici.
          </p>
        </div>

        {users && users.length > 0 ? (
          users.map((user) => {
            const userBadges =
              allBadges?.filter((b) => b.user_id === user.id) || [];
            const isPodium = user.total_points > 0 && [1, 2, 3].includes(user.rank);

            return (
              <Link
                href={`/profile/${user.username}`}
                key={user.id}
                className={`surface card-interactive flex items-center gap-4 md:gap-6 p-4 md:p-5 ${
                  isPodium ? podiumStyles[user.rank] : ""
                }`}
              >
                {/* Le Rang */}
                <div
                  className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-2xl font-display font-bold text-2xl shrink-0 ${
                    isPodium
                      ? rankBadgeStyles[user.rank]
                      : "bg-bg-elevated text-text-base border border-border-subtle"
                  }`}
                >
                  {user.rank === 0 ? "-" : user.rank}
                </div>

                {/* Infos Joueur & Badges */}
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-lg md:text-xl tracking-wide truncate text-text-base">
                    {user.username}
                  </div>
                  {userBadges.length > 0 && (
                    <div className="mt-2">
                      <BadgeList badges={userBadges} size="sm" />
                    </div>
                  )}
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <div
                    className={`font-display text-3xl md:text-4xl font-bold ${
                      user.rank === 1 && user.total_points > 0
                        ? "text-gradient-gold"
                        : "text-text-base"
                    }`}
                  >
                    {user.total_points}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mt-0.5">
                    Points
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-12 text-text-muted italic surface">
            Aucun joueur dans l&apos;arène pour le moment.
          </div>
        )}
      </main>
    </div>
  );
}
