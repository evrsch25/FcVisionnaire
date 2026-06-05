import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-base text-text-base flex flex-col justify-center items-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter uppercase">
          FC Visionnaire
        </h1>
        <p className="text-text-muted text-lg md:text-xl mb-12">
          L'arène de pronostics ultime pour la Coupe du Monde 2026. Prépare ton
          bracket, assume tes choix, ou deviens la plus grande girouette du
          tournoi.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="bg-text-base text-bg-base font-black py-4 px-8 rounded-lg uppercase hover:bg-gray-200 transition-transform hover:scale-105 shadow-lg"
          >
            Rejoindre la ligue
          </Link>
          <Link
            href="/login"
            className="bg-bg-panel border border-border-subtle text-text-base font-bold py-4 px-8 rounded-lg uppercase hover:bg-border-subtle transition-transform hover:scale-105"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
