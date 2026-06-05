import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { logoutUser } from "@/app/actions/auth";
import Navbar from "@/app/components/Navbar";

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
    .select("badge_name")
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
    <div className="min-h-screen bg-bg-base text-text-base pb-10 font-sans">
      <Navbar />

      <main className="max-w-4xl mx-auto mt-10 px-4 flex flex-col gap-10">
        {/* Ligne des Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/leaderboard"
            className="block bg-bg-panel p-6 rounded-xl border border-border-subtle text-center shadow-sm transition hover:bg-border-subtle cursor-pointer group"
          >
            <h3 className="text-text-muted group-hover:text-text-base transition font-bold uppercase tracking-wider text-xs mb-2">
              Classement
            </h3>
            <p className="text-4xl font-black">
              {user.rank === 0 ? "-" : `#${user.rank}`}
            </p>
          </Link>
          <div className="bg-bg-panel p-6 rounded-xl border border-border-subtle text-center shadow-sm">
            <h3 className="text-text-muted font-bold uppercase tracking-wider text-xs mb-2">
              Points
            </h3>
            <p className="text-4xl font-black">{user.total_points}</p>
          </div>
          <div className="bg-bg-panel p-6 rounded-xl border border-border-subtle text-center flex flex-col items-center shadow-sm">
            <h3 className="text-text-muted font-bold uppercase tracking-wider text-xs mb-2">
              Badges
            </h3>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {badges && badges.length > 0 ? (
                badges.map((b, i) => (
                  <span
                    key={i}
                    className="bg-bg-base border border-border-subtle text-text-muted text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                  >
                    {b.badge_name}
                  </span>
                ))
              ) : (
                <span className="text-text-muted text-sm italic">
                  Aucun badge
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Le gros CTA pour le Bracket */}
        <div className="bg-bg-panel border border-border-subtle rounded-xl p-1 shadow-sm transform transition hover:scale-[1.01]">
          <div className="bg-bg-base rounded-lg p-10 text-center flex flex-col items-center gap-4">
            <h2 className="text-3xl font-black text-text-base uppercase tracking-widest">
              Ta Grille 2026
            </h2>
            <p className="text-text-muted max-w-lg leading-relaxed">
              La compétition approche. Remplis tes scores, désigne tes favoris
              et valide ton arbre final avant le match d'ouverture.
            </p>
            <Link
              href="/bracket"
              className="mt-4 bg-text-base text-bg-base font-black py-4 px-10 rounded uppercase tracking-wider text-lg hover:bg-gray-200 transition shadow"
            >
              Remplir mes pronostics
            </Link>
          </div>
        </div>

        {/* Prochains Matchs */}
        <div className="bg-bg-panel p-6 rounded-xl border border-border-subtle">
          <h2 className="text-xl font-black text-text-base uppercase tracking-wider mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            Prochains Matchs
            <Link
              href="/leaderboard"
              className="text-xs uppercase tracking-wider text-text-muted hover:text-text-base border border-border-subtle px-3 py-1 rounded transition"
            >
              Voir le classement complet →
            </Link>
          </h2>

          <div className="flex flex-col gap-4">
            {upcomingMatches && upcomingMatches.length > 0 ? (
              upcomingMatches.map((match) => {
                const prono = predictions?.find((p) => p.match_id === match.id);
                return (
                  <div
                    key={match.id}
                    className="bg-bg-base p-4 rounded-lg border border-border-subtle flex justify-between items-center transition hover:border-gray-600"
                  >
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                        {match.stage} -{" "}
                        {new Date(match.match_date).toLocaleDateString("fr-FR")}
                      </div>
                      <div className="font-bold text-lg text-text-base">
                        {match.team_home}{" "}
                        <span className="text-text-muted text-sm px-1">VS</span>{" "}
                        {match.team_away}
                      </div>
                    </div>
                    <div className="text-right">
                      {prono ? (
                        <div className="bg-bg-panel px-4 py-2 rounded border border-border-subtle">
                          <span className="text-[10px] uppercase tracking-wider text-text-muted block mb-1">
                            Ton prono
                          </span>
                          <span className="font-black text-xl text-text-base">
                            {prono.predicted_score_home} -{" "}
                            {prono.predicted_score_away}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs uppercase tracking-wider text-text-muted font-bold bg-border-subtle px-3 py-1 rounded">
                          Non pronostiqué
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-text-muted py-8 italic">
                L'admin n'a pas encore ajouté de matchs.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
