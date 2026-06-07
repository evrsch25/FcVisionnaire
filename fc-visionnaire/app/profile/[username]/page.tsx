import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import BadgeList from "@/app/components/BadgeList";

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
    <div className="min-h-screen text-text-base pb-20">
      <Navbar />

      {/* Header du Profil */}
      <header className="relative overflow-hidden border-b border-border-subtle">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-accent-main/12 blur-[110px]"
        />
        <div className="relative max-w-4xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar / Initiale */}
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center font-display text-4xl font-bold uppercase shrink-0 bg-gradient-to-br from-accent-soft to-accent-deep text-[#04130d] shadow-[var(--shadow-glow)]">
              {user.username.charAt(0)}
            </div>

            {/* Infos Principales */}
            <div className="flex-1 text-center md:text-left">
              <p className="eyebrow">Profil joueur</p>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-text-base uppercase tracking-wide mt-1">
                {user.username}
              </h1>
              <div className="flex justify-center md:justify-start mt-3">
                <BadgeList
                  badges={badges}
                  size="md"
                  emptyMessage="Aucun trophée pour l'instant"
                />
              </div>
            </div>

            {/* Statistiques Rapides */}
            <div className="flex gap-3 mt-2 md:mt-0">
              <div className="surface-2 p-4 text-center min-w-[100px]">
                <div className="eyebrow mb-1">Rang</div>
                <div className="font-display text-3xl font-bold text-text-base">
                  {user.rank === 0 ? "-" : `#${user.rank}`}
                </div>
              </div>
              <div className="surface-2 p-4 text-center min-w-[100px]">
                <div className="eyebrow mb-1">Points</div>
                <div className="font-display text-3xl font-bold text-gradient">
                  {user.total_points}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-10 px-4 flex flex-col gap-12">
        {/* Section 1 : Les Distinctions (Pour voir ses favoris) */}
        <section>
          <h2 className="section-title mb-6 divider pb-2">
            Distinctions Prédites
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {distinctions && distinctions.length > 0 ? (
              distinctions.map((dist) => (
                <div key={dist.id} className="surface card-interactive p-4">
                  <div className="eyebrow mb-1">
                    {dist.category.replace("_", " ")}
                  </div>
                  <div className="font-bold text-lg text-text-base truncate">
                    {dist.player_name}
                  </div>
                  {dist.points_earned > 0 && (
                    <div className="text-sm font-bold text-accent-soft mt-1">
                      +{dist.points_earned} pts
                    </div>
                  )}
                  {dist.is_girouette && (
                    <div className="text-[10px] text-accent-danger font-bold uppercase tracking-wider mt-2">
                      Girouette assumée
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full text-text-muted italic surface p-4">
                Grille des distinctions vide.
              </div>
            )}
          </div>
        </section>

        {/* Section 2 : Les Matchs (L'historique des pronos) */}
        <section>
          <h2 className="section-title mb-6 divider pb-2">
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
                    className={`surface p-4 flex flex-col sm:flex-row justify-between items-center gap-4 ${
                      isCompleted ? "opacity-75" : "card-interactive"
                    }`}
                  >
                    {/* Info Match */}
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <div className="eyebrow mb-1">{match.stage}</div>
                      <div className="font-bold text-base md:text-lg flex items-center justify-center sm:justify-start gap-2 text-text-base">
                        <span className="truncate">{match.team_home}</span>
                        <span className="text-text-muted text-xs">VS</span>
                        <span className="truncate">{match.team_away}</span>
                      </div>
                    </div>

                    {/* Le Pronostic du joueur */}
                    <div className="text-center surface-2 px-6 py-2 relative">
                      {prono?.is_girouette && (
                        <span className="absolute -top-2 -right-2 bg-accent-danger text-white text-[8px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded">
                          Girouette
                        </span>
                      )}
                      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                        Son Prono
                      </div>
                      {prono ? (
                        <div className="font-display font-bold text-xl text-text-base tracking-wider">
                          {prono.predicted_score_home} -{" "}
                          {prono.predicted_score_away}
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">
                          Non joué
                        </div>
                      )}
                    </div>

                    {/* Résultat réel (si terminé) */}
                    <div className="w-24 text-center sm:text-right">
                      {isCompleted ? (
                        <>
                          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                            Score Réel
                          </div>
                          <div className="font-bold text-text-base">
                            {match.real_score_home} - {match.real_score_away}
                          </div>
                          <div className="text-[11px] uppercase tracking-wider font-bold mt-1 text-accent-soft">
                            +{prono?.points_earned || 0} pts
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] uppercase tracking-wider text-text-muted">
                          À venir
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-text-muted py-8 italic surface">
                Aucun match disponible.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
