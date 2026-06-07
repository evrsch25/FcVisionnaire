// Types des données échangées entre la page pronos et les server actions.

export type PredictionInput = {
  match_id: string;
  score_home: number;
  score_away: number;
};

export type SavePredictionsPayload = {
  scores: PredictionInput[];
};

export type DistinctionInput = {
  category: string;
  player_name: string;
};

export type SaveDistinctionsPayload = {
  distinctions: DistinctionInput[];
};
