import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { saveBracket } from "@/app/actions/bracket";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

export default async function BracketPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  if (!userId) redirect("/login");

  const { data: settings } = await supabase
    .from("app_settings")
    .select("is_locked")
    .eq("id", 1)
    .single();
  const isLocked = settings?.is_locked || false;

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("match_date", { ascending: true });

  const { data: myPredictions } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", userId);
  const { data: myDistinctions } = await supabase
    .from("distinctions")
    .select("*")
    .eq("user_id", userId);

  const getProno = (matchId: string) =>
    myPredictions?.find((p) => p.match_id === matchId);
  const getDistinction = (cat: string) =>
    myDistinctions?.find((d) => d.category === cat)?.player_name || "";

  const distinctionList = [
    { id: "Ballon_Or", label: "Ballon d'Or (Meilleur joueur)" },
    { id: "Ballon_Argent", label: "Ballon d'Argent (2e Meilleur joueur)" },
    { id: "Soulier_Or", label: "Soulier d'Or (Meilleur Buteur)" },
    { id: "Gant_Or", label: "Gant d'Or (Meilleur Gardien)" },
    { id: "Jeune", label: "Meilleur Jeune (U21)" },
    { id: "Vainqueur", label: "VAINQUEUR DE LA COUPE DU MONDE" },
  ];

  return (
    <div className="min-h-screen bg-bg-base text-text-base pb-20 font-sans">
      <Navbar />

      {/* Header Sticky spécialement pour le Bracket afin de garder le bouton "Enregistrer" sous la main */}
      <header className="sticky top-0 z-40 bg-bg-base/95 backdrop-blur-md border-b border-border-subtle p-5 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-text-base uppercase tracking-widest">
              Ta Grille
            </h1>
          </div>
          {isLocked && (
            <div className="bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-xs font-bold px-4 py-2 rounded max-w-sm text-center mr-4 hidden md:block">
              Attention : Compétition verrouillée. Toute modification subira le
              malus "Girouette".
            </div>
          )}
          <button
            form="bracket-form"
            type="submit"
            className="bg-text-base text-bg-base font-black px-8 py-3 rounded uppercase tracking-wider hover:bg-gray-200 transition shadow"
          >
            Enregistrer
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-10 px-4">
        <form
          id="bracket-form"
          action={saveBracket}
          className="flex flex-col gap-14"
        >
          {/* SECTION 1 : LES MATCHS */}
          <section>
            <h2 className="text-2xl font-black uppercase tracking-widest text-text-base mb-8 border-b border-border-subtle pb-3">
              1. Les Matchs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {matches && matches.length > 0 ? (
                matches.map((match) => {
                  const prono = getProno(match.id);
                  return (
                    <div
                      key={match.id}
                      className="bg-bg-panel p-5 rounded-xl border border-border-subtle relative transition hover:border-gray-600"
                    >
                      {prono?.is_girouette && (
                        <span className="absolute -top-3 -right-2 bg-accent-danger text-white text-[9px] uppercase tracking-wider font-black px-2 py-1 rounded shadow-lg rotate-3">
                          Girouette
                        </span>
                      )}
                      <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3 text-center">
                        {match.stage}
                      </div>
                      <div className="flex justify-between items-center gap-3">
                        <div className="flex-1 text-right font-bold truncate">
                          {match.team_home}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            name={`matchHome_${match.id}`}
                            defaultValue={prono?.predicted_score_home}
                            className="w-14 h-14 text-center bg-bg-base text-xl font-black text-text-base border border-border-subtle rounded focus:border-accent-main outline-none transition"
                          />
                          <span className="text-text-muted font-black">-</span>
                          <input
                            type="number"
                            name={`matchAway_${match.id}`}
                            defaultValue={prono?.predicted_score_away}
                            className="w-14 h-14 text-center bg-bg-base text-xl font-black text-text-base border border-border-subtle rounded focus:border-accent-main outline-none transition"
                          />
                        </div>
                        <div className="flex-1 font-bold truncate">
                          {match.team_away}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-10 text-text-muted bg-bg-panel rounded-xl border border-border-subtle italic">
                  Aucun match n'a encore été publié par l'admin.
                </div>
              )}
            </div>
          </section>

          {/* SECTION 2 : DISTINCTIONS ET VAINQUEUR */}
          <section>
            <h2 className="text-2xl font-black uppercase tracking-widest text-text-base mb-4 border-b border-border-subtle pb-3">
              2. Les Distinctions & Le Vainqueur
            </h2>
            <p className="text-text-muted text-sm mb-8">
              Inscris le nom du joueur ou de l'équipe. Attention à l'orthographe
              pour la validation des points par l'admin.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {distinctionList.map((dist) => {
                const isVainqueur = dist.id === "Vainqueur";
                return (
                  <div
                    key={dist.id}
                    className={`p-6 rounded-xl border ${isVainqueur ? "bg-bg-panel border-text-base md:col-span-2" : "bg-bg-panel border-border-subtle"}`}
                  >
                    <label
                      className={`block font-bold mb-3 uppercase tracking-wider text-xs ${isVainqueur ? "text-text-base text-lg" : "text-text-base"}`}
                    >
                      {dist.label}
                    </label>
                    <input
                      type="text"
                      name={`distinction_${dist.id}`}
                      defaultValue={getDistinction(dist.id)}
                      placeholder={
                        isVainqueur ? "Ex: France" : "Ex: Kylian Mbappé"
                      }
                      className={`w-full bg-bg-base text-text-base border border-border-subtle rounded p-4 focus:border-accent-main outline-none transition ${isVainqueur ? "text-2xl font-black text-center" : ""}`}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}
