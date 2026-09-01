type Props = {
  state: {
    you: string;
    started: boolean;
    revealed: boolean;
    q: number;
    total: number;
    status: string;
    question: { q: string; a: string[]; c: number | null } | null;
    players: { name: string; score?: number; pick: number | boolean | null }[];
  };
  onAction: (msg: object) => void;
};

export default function Trivia({ state, onAction }: Props) {
  const you = state.players.find((p) => p.name === state.you);
  const host = state.players[0]?.name === state.you;
  const done = state.status === "over";

  if (!state.started) {
    return (
      <div className="game-pad">
        <p className="hint">Up to 5. Host starts when at least two are seated. Invite or Add CPU.</p>
        <p className="hint">Seated: {state.players.map((p) => p.name).join(", ")}</p>
        <button type="button" disabled={!host || state.players.length < 2} onClick={() => onAction({ act: "start" })}>
          Start trivia
        </button>
      </div>
    );
  }

  if (done || !state.question) {
    return (
      <div className="game-pad">
        <p className="game-score">Final</p>
        {state.players
          .slice()
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .map((p) => (
            <div key={p.name}>
              {p.name}: {p.score || 0}
            </div>
          ))}
      </div>
    );
  }

  return (
    <div className="game-pad">
      <div className="caption">
        Q {state.q + 1}/{state.total} · {state.players.map((p) => `${p.name} ${p.score || 0}`).join(" · ")}
      </div>
      <p className="game-q">{state.question.q}</p>
      <div className="game-choices">
        {state.question.a.map((t, n) => {
          let cls = "";
          if (state.revealed && state.question) {
            if (n === state.question.c) cls = "right";
            else if (you?.pick === n) cls = "wrong";
          } else if (you?.pick === n) cls = "right";
          return (
            <button
              key={t}
              type="button"
              className={cls}
              disabled={state.revealed || you?.pick !== null}
              onClick={() => onAction({ act: "pick", n })}
            >
              {t}
            </button>
          );
        })}
      </div>
      <p className="hint">
        {state.players.map((p) => `${p.name}: ${p.pick === null ? "…" : "locked"}`).join("  ")}
      </p>
      {state.revealed && host && (
        <button type="button" onClick={() => onAction({ act: "next" })}>
          Next
        </button>
      )}
    </div>
  );
}
