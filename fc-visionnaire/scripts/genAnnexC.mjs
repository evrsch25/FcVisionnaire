// Génère lib/tournament/annexC.ts à partir de la table Annexe C (495 lignes)
// de la Coupe du Monde 2026 (source : Wikipédia "2026 FIFA World Cup knockout stage").
//
// La table source est conservée dans scripts/annexC.raw.txt (format Markdown).
// Chaque ligne : | No | g1..g8 (groupes fournissant un 3e qualifié) | a1..a8 (3X par créneau) |
// Ordre des colonnes de créneaux : 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L.
//
// Usage : node scripts/genAnnexC.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = join(__dirname, "annexC.raw.txt");
const OUT = join(__dirname, "..", "lib", "tournament", "annexC.ts");

// Ordre officiel des colonnes "vainqueur de groupe" dans la table.
const WINNER_SLOTS = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"];

const raw = readFileSync(RAW, "utf8");

const table = {};
let count = 0;

for (const line of raw.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) continue;
  const cells = trimmed
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  // Attendu : 17 cellules (No + 8 groupes + 8 assignations)
  if (cells.length !== 17) continue;
  const no = Number(cells[0]);
  if (!Number.isInteger(no)) continue; // ignore l'en-tête

  const groups = cells.slice(1, 9);
  const assigns = cells.slice(9, 17);

  // Clé = ensemble trié des 8 groupes fournissant un 3e qualifié.
  const key = [...groups].sort().join("");

  const mapping = {};
  WINNER_SLOTS.forEach((slot, i) => {
    // assigns[i] ressemble à "3E" -> on garde la lettre de groupe.
    mapping[slot] = assigns[i].replace(/[^A-L]/g, "");
  });

  table[key] = mapping;
  count++;
}

if (count !== 495) {
  console.error(`ATTENTION: ${count} lignes parsées (attendu 495).`);
  process.exit(1);
}

const header = `// AUTO-GÉNÉRÉ par scripts/genAnnexC.mjs — NE PAS ÉDITER À LA MAIN.
// Table Annexe C de la Coupe du Monde 2026 : les 495 combinaisons des 8 meilleurs
// 3es et le placement des 3es face aux vainqueurs de groupe en 1/16.
//
// Clé : les 8 lettres (triées) des groupes dont le 3e est qualifié.
// Valeur : pour chaque créneau "vainqueur de groupe", la lettre du groupe dont
// provient le 3e qu'il affronte.

export type WinnerSlot = "1A" | "1B" | "1D" | "1E" | "1G" | "1I" | "1K" | "1L";

export const ANNEX_C: Record<string, Record<WinnerSlot, string>> = ${JSON.stringify(
  table,
  null,
  2,
)};
`;

writeFileSync(OUT, header, "utf8");
console.log(`OK: ${count} combinaisons écrites dans ${OUT}`);
