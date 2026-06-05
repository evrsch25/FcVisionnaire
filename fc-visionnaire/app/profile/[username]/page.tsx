import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = await params;
  const decodedUsername = decodeURIComponent(resolvedParams.username);

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("username", decodedUsername)
    .single();

  if (!user) notFound();

  const { data: badges } = await supabase
    .from("badges")
    .select("*")
    .eq("user_id", user.id);
  const { data: distinctions } = await supabase
    .from("distinctions")
    .select("*")
    .eq("user_id", user.id);
  const { data: predictions } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", user.id);
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true });

  return (
    <div className="min-h-screen bg-bg-base text-text-base pb-20 font-sans">
      <Navbar />

      {/* Header du Profil */}
      <header className="bg-bg-panel border-b border-border-subtle p-8 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar / Initiale */}
            <div className="w-24 h-24 bg-text-base rounded-full flex items-center justify-center text-bg-base font-black text-4xl uppercase shrink-0 shadow-sm">
              {user.username.charAt(0)}
            </div>

            {/* Infos Principales */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-black text-text-base uppercase tracking-widest">
                {user.username}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                {badges && badges.length > 0 ? (
                  badges.map((badge, i) => (
                    <span
                      key={i}
                      className="bg-bg-base border border-border-subtle text-text-muted text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded"
                    >
                      {badge.badge_name}
                    </span>
                  ))
                ) : (
                  <span className="text-text-muted text-sm italic">
                    Aucun trophée pour l'instant
                  </span>
                )}
              </div>
            </div>

            {/* Statistiques Rapides */}
            <div className="flex gap-4 mt-4 md:mt-0">
              <div className="bg-bg-base p-4 rounded-xl border border-border-subtle text-center min-w-[100px]">
                <div className="text-text-muted text-[10px] tracking-widest font-bold uppercase mb-1">
                  Rang
                </div>
                <div className="text-3xl font-black text-text-base">
                  {user.rank === 0 ? "-" : `#${user.rank}`}
                </div>
              </div>
              <div className="bg-bg-base p-4 rounded-xl border border-border-subtle text-center min-w-[100px]">
                <div className="text-text-muted text-[10px] tracking-widest font-bold uppercase mb-1">
                  Points
                </div>
                <div className="text-3xl font-black text-text-base">
                  {user.total_points}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-8 px-4 flex flex-col gap-12">
        {/* Section 1 : Les Distinctions (Pour voir ses favoris) */}
        <section>
          <h2 className="text-xl font-black uppercase tracking-widest text-text-base mb-6 border-b border-border-subtle pb-2">
            Distinctions Prédites
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {distinctions && distinctions.length > 0 ? (
              distinctions.map((dist) => (
                <div
                  key={dist.id}
                  className="bg-bg-panel p-4 rounded-xl border border-border-subtle"
                >
                  <div className="text-[10px] text-text-muted font-bold mb-1 uppercase tracking-wider">
                    {dist.category.replace("_", " ")}
                  </div>
                  <div className="font-bold text-lg text-text-base truncate">
                    {dist.player_name}
                  </div>
                  {dist.is_girouette && (
                    <div className="text-[10px] text-accent-danger font-bold uppercase tracking-wider mt-2">
                      Girouette assumée
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full text-text-muted italic bg-bg-panel p-4 rounded-xl border border-border-subtle">
                Grille des distinctions vide.
              </div>
            )}
          </div>
        </section>

        {/* Section 2 : Les Matchs (L'historique des pronos) */}
        <section>
          <h2 className="text-xl font-black uppercase tracking-widest text-text-base mb-6 border-b border-border-subtle pb-2">
            Historique des Matchs
          </h2>
          <div className="flex flex-col gap-3">
            {matches && matches.length > 0 ? (
              matches.map((match) => {
                const prono = predictions?.find((p) => p.match_id === match.id);
                const isCompleted = match.status === "Completed";

                return (
                  <div
                    key={match.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-4 transition
                    ${isCompleted ? "bg-bg-base border-border-subtle opacity-70" : "bg-bg-panel border-border-subtle"}`}
                  >
                    {/* Info Match */}
                    <div className="flex-1">
                      <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                        {match.stage}
                      </div>
                      <div
                        className={`font-bold text-lg flex items-center gap-2 text-text-base`}
                      >
                        <span>{match.team_home}</span>
                        <span className="text-text-muted text-sm">VS</span>
                        <span>{match.team_away}</span>
                      </div>
                    </div>

                    {/* Le Pronostic du joueur */}
                    <div className="text-center bg-bg-base px-6 py-2 rounded-lg border border-border-subtle relative">
                      {prono?.is_girouette && (
                        <span className="absolute -top-2 -right-2 bg-accent-danger text-white text-[8px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded">
                          Girouette
                        </span>
                      )}
                      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                        Son Prono
                      </div>
                      {prono ? (
                        <div className="font-black text-xl text-text-base tracking-widest">
                          {prono.predicted_score_home} -{" "}
                          {prono.predicted_score_away}
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-text-muted uppercase tracking-wider mt-1">
                          Non pronostiqué
                        </div>
                      )}
                    </div>

                    {/* Résultat réel (si terminé) */}
                    <div className="w-24 text-right">
                      {isCompleted ? (
                        <>
                          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                            Score Réel
                          </div>
                          <div className="font-bold text-text-base">
                            {match.real_score_home} - {match.real_score_away}
                          </div>
                          <div className="text-[11px] uppercase tracking-wider font-bold mt-1 text-accent-main">
                            +{prono?.points_earned || 0} pts
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] uppercase tracking-wider text-text-muted mt-4">
                          À venir
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-text-muted py-8 italic bg-bg-panel rounded-xl border border-border-subtle">
                Aucun match disponible.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
