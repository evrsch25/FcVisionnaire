import { recalculateScores } from "@/lib/scoring/recalculate";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/** Recalcul quotidien (Vercel Cron Hobby) + filet de sécurité. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const result = await recalculateScores();

  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/leaderboard");
    revalidatePath("/bracket");
    revalidatePath("/profile", "layout");
  }

  return Response.json({ ok: result.ok, at: new Date().toISOString() });
}
