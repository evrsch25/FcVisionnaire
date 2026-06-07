// Types partagés du moteur de tournoi.

export type GroupMatchInput = {
  home: string;
  away: string;
  scoreHome: number | null;
  scoreAway: number | null;
};

export type TeamRow = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // buts marqués
  ga: number; // buts encaissés
  gd: number; // différence de buts
  points: number;
};

export type StandingResult = {
  table: TeamRow[]; // trié au mieux
  order: string[]; // ordre final des équipes (1er -> dernier)
  byTeam: Record<string, TeamRow>;
  unresolved: string[][]; // blocs d'équipes réellement indépartageables (ordre manuel requis)
  complete: boolean; // tous les matchs du groupe sont renseignés
};

export const GROUP_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;
