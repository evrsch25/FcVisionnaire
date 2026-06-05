import { loginUser } from "@/app/actions/auth";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4">
      <div className="bg-brand-light p-8 rounded-xl shadow-2xl w-full max-w-md border border-brand-gold/20">
        <h1 className="text-3xl font-black text-brand-gold mb-6 text-center tracking-wider uppercase">
          Connexion
        </h1>

        <form action={loginUser} className="flex flex-col gap-4">
          <div>
            <label className="text-white text-sm font-bold mb-2 block">
              Pseudo
            </label>
            <input
              type="text"
              name="username"
              required
              className="w-full bg-brand-dark text-white border border-brand-gold/50 rounded p-3 focus:outline-none focus:border-brand-gold"
            />
          </div>

          <div>
            <label className="text-white text-sm font-bold mb-2 block">
              Mot de passe
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full bg-brand-dark text-white border border-brand-gold/50 rounded p-3 focus:outline-none focus:border-brand-gold"
            />
          </div>

          <button
            type="submit"
            className="mt-4 bg-brand-gold text-brand-dark font-black py-3 rounded uppercase hover:bg-yellow-500 transition-colors"
          >
            Entrer
          </button>
        </form>

        <p className="text-white/60 text-center mt-6 text-sm">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-brand-gold hover:underline">
            Inscris-toi
          </Link>
        </p>
      </div>
    </div>
  );
}
