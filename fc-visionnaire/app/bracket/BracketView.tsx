"use client";

import { useState, useTransition } from "react";
import { savePredictions, saveDistinctions } from "@/app/actions/bracket";
import { PHASE_LABELS, type Phase } from "@/lib/tournament/phases";
import { DISTINCTION_CATEGORIES } from "@/lib/tournament/distinctions";

export type MatchRow = {
  id: string;
  stage: string;
  team_home: string;
  team_away: string;
  slot: string | null;
  match_date: string;
  real_score_home: number | null;
  real_score_away: number | null;
  status: string;
};

export type GroupData = {
  letter: string;
  matches: { id: string; home: string; away: string }[];
};

type Props = {
  currentPhase: Phase;
  phaseKickoffPassed: boolean;
  phaseKickoffLabel: string | null;
  groups: GroupData[];
  currentMatches: MatchRow[];
  historyMatches: MatchRow[];
  initialScores: Record<string, { home: string; away: string }>;
  initialDistinctions: Record<string, string>;
  distinctionsLocked: boolean;
  girouetteMatchIds: string[];
  champion: string | null;
};

const DISTINCTIONS = DISTINCTION_CATEGORIES.map((c) => ({
  id: c.id,
  label: c.label,
}));

function parseScore(v: string): number | null {
  if (v.trim() === "") return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

export default function BracketView({
  currentPhase,
  phaseKickoffPassed,
  phaseKickoffLabel,
  groups,
  currentMatches,
  historyMatches,
  initialScores,
  initialDistinctions,
  distinctionsLocked,
  girouetteMatchIds,
  champion,
}: Props) {
  const [scores, setScores] = useState(initialScores);
  const [distinctions, setDistinctions] = useState(initialDistinctions);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const girouetteSet = new Set(girouetteMatchIds);
  const canEditPronos = currentPhase !== "DONE";

  function setScore(matchId: string, side: "home" | "away", value: string) {
    setScores((prev) => {
      const cur = prev[matchId] ?? { home: "", away: "" };
      return { ...prev, [matchId]: { ...cur, [side]: value } };
    });
  }

  function savePronos(matchIds: string[]) {
    setMsg(null);
    startTransition(async () => {
      const payload = matchIds
        .map((id) => ({
          match_id: id,
          score_home: parseScore(scores[id]?.home ?? ""),
          score_away: parseScore(scores[id]?.away ?? ""),
        }))
        .filter(
          (s) => s.score_home !== null && s.score_away !== null,
        ) as { match_id: string; score_home: number; score_away: number }[];

      const res = await savePredictions({ scores: payload });
      if (res && "error" in res && res.error) setMsg(res.error);
      else setMsg("Pronos enregistrés ✓");
    });
  }

  function saveDist() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveDistinctions({
        distinctions: DISTINCTIONS.map((d) => ({
          category: d.id,
          player_name: distinctions[d.id] ?? "",
        })),
      });
      if (res && "error" in res && res.error) setMsg(res.error);
      else setMsg("Distinctions enregistrées ✓");
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="surface p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Tour en cours</p>
          <p className="font-display text-xl font-bold">
            {PHASE_LABELS[currentPhase]}
          </p>
        </div>
        <span
          className={`chip ${phaseKickoffPassed ? "text-accent-danger border-accent-danger/30" : ""}`}
        >
          {phaseKickoffPassed
            ? "Demi-points actifs"
            : phaseKickoffLabel
              ? `Kickoff ${phaseKickoffLabel}`
              : "Pronos ouverts"}
        </span>
      </div>

      {msg && (
        <p className="text-sm text-accent-soft font-bold text-center">{msg}</p>
      )}

      {/* Tour courant */}
      {currentPhase === "GROUPS" && groups.length > 0 && (
        <section>
          <h2 className="section-title mb-4">Phase de groupes</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groups.map((g) => (
              <div key={g.letter} className="surface p-5">
                <h3 className="font-display font-bold uppercase mb-3">
                  Groupe {g.letter}
                </h3>
                <div className="flex flex-col gap-2">
                  {g.matches.map((m) => (
                    <MatchScoreRow
                      key={m.id}
                      home={m.home}
                      away={m.away}
                      scores={scores[m.id]}
                      editable={canEditPronos}
                      isGirouette={girouetteSet.has(m.id)}
                      onChange={(side, v) => setScore(m.id, side, v)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {canEditPronos && (
            <button
              type="button"
              className="btn-primary mt-6"
              disabled={pending}
              onClick={() =>
                savePronos(groups.flatMap((g) => g.matches.map((m) => m.id)))
              }
            >
              Enregistrer mes pronos
            </button>
          )}
        </section>
      )}

      {currentPhase !== "GROUPS" &&
        currentPhase !== "DONE" &&
        currentMatches.length > 0 && (
          <section>
            <h2 className="section-title mb-4">
              {PHASE_LABELS[currentPhase]}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentMatches.map((m) => (
                <div key={m.id} className="surface p-5 relative">
                  {girouetteSet.has(m.id) && (
                    <span className="absolute -top-2 -right-2 bg-accent-danger text-white text-[9px] uppercase tracking-wider font-black px-2 py-0.5 rounded-md rotate-3">
                      Demi-points
                    </span>
                  )}
                  <div className="eyebrow mb-2 text-center">{m.stage}</div>
                  <MatchScoreRow
                    home={m.team_home}
                    away={m.team_away}
                    scores={scores[m.id]}
                    editable={canEditPronos}
                    isGirouette={girouetteSet.has(m.id)}
                    onChange={(side, v) => setScore(m.id, side, v)}
                  />
                </div>
              ))}
            </div>
            {canEditPronos && (
              <button
                type="button"
                className="btn-primary mt-6"
                disabled={pending}
                onClick={() => savePronos(currentMatches.map((m) => m.id))}
              >
                Enregistrer mes pronos
              </button>
            )}
          </section>
        )}

      {currentPhase === "DONE" && (
        <div className="surface p-8 text-center text-text-muted">
          Le tournoi est terminé. Consulte ton historique ci-dessous.
        </div>
      )}

      {/* Distinctions */}
      <section>
        <h2 className="section-title mb-4">Distinctions individuelles</h2>
        {champion && (
          <div className="surface p-4 mb-4 text-center border-gold/30">
            <p className="eyebrow">Ton champion (prono finale)</p>
            <p className="font-display text-2xl font-bold text-gradient-gold">
              {champion}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DISTINCTIONS.map((d) => (
            <div key={d.id} className="surface p-4">
              <label className="label-field">{d.label}</label>
              <input
                type="text"
                value={distinctions[d.id] ?? ""}
                onChange={(e) =>
                  setDistinctions((prev) => ({
                    ...prev,
                    [d.id]: e.target.value,
                  }))
                }
                disabled={distinctionsLocked}
                placeholder="Ex: Kylian Mbappé"
                className="input-field disabled:opacity-60"
              />
            </div>
          ))}
        </div>
        {!distinctionsLocked && (
          <button
            type="button"
            className="btn-secondary mt-4"
            disabled={pending}
            onClick={saveDist}
          >
            Enregistrer les distinctions
          </button>
        )}
        {distinctionsLocked && (
          <p className="text-text-muted text-sm mt-2 italic">
            Distinctions verrouillées (compétition démarrée).
          </p>
        )}
      </section>

      {/* Historique */}
      {historyMatches.length > 0 && (
        <section>
          <h2 className="section-title mb-4">Historique</h2>
          <div className="flex flex-col gap-3">
            {historyMatches.map((m) => {
              const pr = scores[m.id];
              const done = m.status === "Completed";
              return (
                <div
                  key={m.id}
                  className={`surface p-4 flex flex-col sm:flex-row justify-between items-center gap-4 ${done ? "opacity-80" : ""}`}
                >
                  <div className="min-w-0 text-center sm:text-left">
                    <div className="eyebrow">{m.stage}</div>
                    <div className="font-bold">
                      {m.team_home}{" "}
                      <span className="text-text-muted text-xs">vs</span>{" "}
                      {m.team_away}
                    </div>
                  </div>
                  <div className="text-center surface-2 px-4 py-2">
                    <div className="text-[10px] text-text-muted uppercase">
                      Ton prono
                      {girouetteSet.has(m.id) && (
                        <span className="text-accent-danger ml-1">
                          (demi-points)
                        </span>
                      )}
                    </div>
                    <div className="font-display font-bold text-lg">
                      {pr?.home !== "" && pr?.away !== ""
                        ? `${pr?.home} - ${pr?.away}`
                        : "—"}
                    </div>
                  </div>
                  {done && (
                    <div className="text-center sm:text-right">
                      <div className="text-[10px] text-text-muted uppercase">
                        Score réel
                      </div>
                      <div className="font-bold">
                        {m.real_score_home} - {m.real_score_away}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function MatchScoreRow({
  home,
  away,
  scores,
  editable,
  isGirouette,
  onChange,
}: {
  home: string;
  away: string;
  scores?: { home: string; away: string };
  editable: boolean;
  isGirouette?: boolean;
  onChange: (side: "home" | "away", v: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-sm ${isGirouette ? "opacity-90" : ""}`}
    >
      <span className="flex-1 text-right font-medium truncate">{home}</span>
      <input
        type="number"
        min={0}
        value={scores?.home ?? ""}
        onChange={(e) => onChange("home", e.target.value)}
        disabled={!editable}
        className="w-11 h-10 text-center bg-bg-elevated font-display font-bold border border-border-subtle rounded-lg focus:border-accent-main outline-none disabled:opacity-60"
      />
      <span className="text-text-muted text-xs">-</span>
      <input
        type="number"
        min={0}
        value={scores?.away ?? ""}
        onChange={(e) => onChange("away", e.target.value)}
        disabled={!editable}
        className="w-11 h-10 text-center bg-bg-elevated font-display font-bold border border-border-subtle rounded-lg focus:border-accent-main outline-none disabled:opacity-60"
      />
      <span className="flex-1 text-left font-medium truncate">{away}</span>
    </div>
  );
}
