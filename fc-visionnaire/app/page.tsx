import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-16">
      {/* Halo central */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-[36rem] w-[36rem] rounded-full bg-accent-main/20 blur-[140px]"
      />

      <div className="relative z-10 w-full max-w-3xl text-center flex flex-col items-center">
        <span className="chip-gold mb-6">Coupe du Monde 2026</span>

        <h1 className="font-display text-6xl md:text-8xl font-bold uppercase leading-[0.95] tracking-tight">
          <span className="text-text-base">FC</span>{" "}
          <span className="text-gradient">Visionnaire</span>
        </h1>

        <p className="mt-6 max-w-xl text-base md:text-lg text-text-muted leading-relaxed">
          L&apos;arène de pronostics ultime pour la Coupe du Monde 2026. Prépare
          ton bracket, assume tes choix, ou deviens la plus grande girouette du
          tournoi.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
          <Link href="/register" className="btn-primary text-base px-8 py-4">
            Rejoindre la ligue
          </Link>
          <Link href="/login" className="btn-secondary text-base px-8 py-4">
            Se connecter
          </Link>
        </div>

        {/* Mini points forts */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          {[
            { title: "Pronostique", desc: "Scores, vainqueur & distinctions" },
            { title: "Affronte", desc: "Grimpe dans le classement live" },
            { title: "Collectionne", desc: "Débloque badges & trophées" },
          ].map((item) => (
            <div key={item.title} className="surface p-5 text-left">
              <div className="font-display text-lg font-bold uppercase tracking-wide text-accent-soft">
                {item.title}
              </div>
              <div className="mt-1 text-sm text-text-muted">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
