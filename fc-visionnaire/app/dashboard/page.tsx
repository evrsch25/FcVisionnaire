import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import BadgeList from "@/app/components/BadgeList";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) {
    redirect("/login");
  }

  const { data: user } = await supabase
    .from("users")
    .select("username, total_points, rank")
    .eq("id", userId)
    .single();

  if (!user) {
    redirect("/login");
  }

  const { data: badges } = await supabase
    .from("badges")
    .select("badge_type, tier, badge_name")
    .eq("user_id", userId);

  const { data: upcomingMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "Pending")
    .order("match_date", { ascending: true })
    .limit(5);

  const matchIds = upcomingMatches?.map((m) => m.id) || [];
  const { data: predictions } =
    matchIds.length > 0
      ? await supabase
          .from("predictions")
          .select("*")
          .eq("user_id", userId)
          .in("match_id", matchIds)
      : { data: [] };

  return (
    <div className="min-h-screen text-text-base pb-16">
      <Navbar />

      <main className="max-w-5xl mx-auto mt-8 md:mt-12 px-4 flex flex-col gap-8 md:gap-10">
        {/* Salutation */}
        <div>
          <p className="eyebrow">Tableau de bord</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold uppercase tracking-wide mt-1">
            Salut, <span className="text-gradient">{user.username}</span>
          </h1>
        </div>

        {/* Ligne des Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/leaderboard"
            className="surface card-interactive p-6 text-center group"
          >
            <h3 className="eyebrow group-hover:text-text-base transition mb-2">
              Classement
            </h3>
            <p className="font-display text-5xl font-bold">
              {user.rank === 0 ? "-" : `#${user.rank}`}
            </p>
          </Link>
          <div className="surface p-6 text-center">
            <h3 className="eyebrow mb-2">Points</h3>
            <p className="font-display text-5xl font-bold text-gradient">
              {user.total_points}
            </p>
          </div>
          <div className="surface p-6 text-center flex flex-col items-center">
            <h3 className="eyebrow mb-3">Badges</h3>
            <BadgeList badges={badges} size="sm" />
          </div>
        </div>

        {/* Le gros CTA pour le Bracket */}
        <div className="relative overflow-hidden surface p-8 md:p-12 text-center flex flex-col items-center gap-4">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-accent-main/15 blur-[100px]"
          />
          <span className="chip-gold relative z-10">Édition 2026</span>
          <h2 className="relative z-10 font-display text-3xl md:text-4xl font-bold uppercase tracking-wide">
            Mes pronostics
          </h2>
          <p className="relative z-10 text-text-muted max-w-lg leading-relaxed">
            Pronostique tour par tour sur les vraies affiches. Remplis tes
            groupes, puis chaque phase au fur et à mesure du tournoi.
          </p>
          <Link
            href="/bracket"
            className="btn-primary relative z-10 mt-2 text-base px-10 py-4"
          >
            Mes pronostics
          </Link>
        </div>

        {/* Prochains Matchs */}
        <div className="surface p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
            <h2 className="section-title">Prochains Matchs</h2>
            <Link href="/leaderboard" className="btn-ghost btn-sm">
              Classement complet →
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {upcomingMatches && upcomingMatches.length > 0 ? (
              upcomingMatches.map((match) => {
                const prono = predictions?.find((p) => p.match_id === match.id);
                return (
                  <div
                    key={match.id}
                    className="surface-2 card-interactive p-4 flex justify-between items-center gap-4"
                  >
                    <div className="min-w-0">
                      <div className="eyebrow mb-1 truncate">
                        {match.stage} ·{" "}
                        {new Date(match.match_date).toLocaleDateString("fr-FR")}
                      </div>
                      <div className="font-bold text-base md:text-lg text-text-base">
                        {match.team_home}{" "}
                        <span className="text-text-muted text-xs px-1">VS</span>{" "}
                        {match.team_away}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {prono ? (
                        <div className="rounded-lg border border-accent-main/30 bg-accent-main/10 px-4 py-2">
                          <span className="block text-[10px] uppercase tracking-wider text-accent-soft mb-0.5">
                            Ton prono
                          </span>
                          <span className="font-display font-bold text-xl text-text-base">
                            {prono.predicted_score_home} -{" "}
                            {prono.predicted_score_away}
                          </span>
                        </div>
                      ) : (
                        <span className="chip">Non pronostiqué</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-text-muted py-10 italic">
                L&apos;admin n&apos;a pas encore ajouté de matchs.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
