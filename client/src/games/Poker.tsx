import { useState } from "react";

type Card = { r: number; s: number };

const SUITS = ["♠", "♥", "♦", "♣"];
function face(c: Card) {
  if (!c.r) return "🂠";
  const f = c.r === 11 ? "J" : c.r === 12 ? "Q" : c.r === 13 ? "K" : c.r === 14 ? "A" : String(c.r);
  return `${f}${SUITS[c.s] || "?"}`;
}

type Player = {
  name: string;
  chips?: number;
  bet?: number;
  folded?: boolean;
  drawn?: boolean;
  cards?: Card[];
};

type Props = {
  state: {
    you: string;
    phase: string;
    pot: number;
    currentBet: number;
    toAct: string | null;
    dealer?: string;
    winner?: string | null;
    sb: number;
    bb: number;
    players: Player[];
  };
  onAction: (msg: object) => void;
};

export default function Poker({ state, onAction }: Props) {
  const me = state.players.find((p) => p.name === state.you);
  const myTurn = state.toAct === state.you;
  const need = Math.max(0, (state.currentBet || 0) - (me?.bet || 0));
  const [discard, setDiscard] = useState<number[]>([]);

  function toggle(i: number) {
    setDiscard((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  }

  return (
    <div className="game-pad">
      <div className="caption">
        Pot {state.pot} · bet {state.currentBet} · blinds {state.sb}/{state.bb} · {state.phase}
        {state.winner ? ` · ${state.winner} takes it` : ""}
      </div>
      <div className="poker-seats">
        {state.players.map((p) => (
          <div key={p.name} className={`poker-seat ${p.name === state.toAct ? "act" : ""} ${p.folded ? "folded" : ""}`}>
            <strong>
              {p.name}
              {p.name === state.dealer ? " (D)" : ""}
            </strong>
            <div>{p.chips} chips</div>
            <div>bet {p.bet || 0}</div>
            <div className="poker-cards">
              {(p.cards || []).map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className={`hole ${discard.includes(i) && p.name === state.you ? "drop" : ""}`}
                  disabled={state.phase !== "draw" || p.name !== state.you || !myTurn}
                  onClick={() => toggle(i)}
                >
                  {face(c)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="hint">
        {state.players.length < 2
          ? "Need 2–5. Invite, Join from Games, or Add CPU. New joiners start at 1500."
          : myTurn
            ? state.phase === "draw"
              ? "Click cards to dump, then Draw."
              : "Your action."
            : `${state.toAct || "Table"} to act.`}
      </p>
      <div className="poker-acts">
        {(state.phase === "waiting" || state.phase === "showdown") && (
          <button type="button" disabled={state.players.filter((p) => (p.chips || 0) >= state.bb).length < 2} onClick={() => onAction({ act: "deal" })}>
            Deal
          </button>
        )}
        {(state.phase === "bet1" || state.phase === "bet2") && myTurn && (
          <>
            <button type="button" onClick={() => onAction({ act: "fold" })}>
              Fold
            </button>
            {need <= 0 ? (
              <button type="button" onClick={() => onAction({ act: "check" })}>
                Check
              </button>
            ) : (
              <button type="button" onClick={() => onAction({ act: "call" })}>
                Call {need || state.sb}
              </button>
            )}
            <button type="button" onClick={() => onAction({ act: "raise", amount: state.sb })}>
              Raise {state.sb}
            </button>
          </>
        )}
        {state.phase === "draw" && myTurn && (
          <button
            type="button"
            onClick={() => {
              onAction({ act: "draw", discard });
              setDiscard([]);
            }}
          >
            Draw {discard.length ? `(dump ${discard.length})` : "(stand)"}
          </button>
        )}
      </div>
    </div>
  );
}
