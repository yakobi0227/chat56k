import { useState } from "react";
import AirHockey from "./games/AirHockey";
import { GAMES, type GameId } from "./games/catalog";
import Poker from "./games/Poker";
import Pool from "./games/Pool";
import Trivia from "./games/Trivia";
import War from "./games/War";
import Win98Window from "./Win98Window";

type Player = { name: string; cpu?: boolean };

type Props = {
  id: string;
  game: GameId;
  you: string;
  people: string[];
  state: Record<string, unknown> | null;
  x: number;
  y: number;
  z: number;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onClose: () => void;
  onInput: (x: number, y: number) => void;
  onAction: (msg: object) => void;
  onInvite: (name: string) => void;
  onAddCpu: () => void;
  onToCpu: (name: string) => void;
};

export default function GameTable({
  id,
  game,
  you,
  people,
  state,
  x,
  y,
  z,
  onFocus,
  onMove,
  onClose,
  onInput,
  onAction,
  onInvite,
  onAddCpu,
  onToCpu,
}: Props) {
  const meta = GAMES.find((g) => g.id === game)!;
  const players = ((state?.players as Player[]) || []) as Player[];
  const full = players.length >= meta.cap;
  const host = players.find((p) => !p.cpu)?.name === you;
  const [invite, setInvite] = useState("");

  return (
    <Win98Window
      title={state ? `${meta.name}` : `${meta.name} — vs House`}
      x={x}
      y={y}
      w={meta.w}
      h={game === "war" ? meta.h : meta.h + 52}
      z={z}
      onFocus={onFocus}
      onMove={onMove}
      onClose={onClose}
    >
      <div className="window-body pad">
        {game !== "war" && (
          <div className="game-invite">
            <input
              list={`game-people-${id}`}
              placeholder="Invite screen name"
              maxLength={16}
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
            />
            <datalist id={`game-people-${id}`}>
              {people.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <button
              type="button"
              disabled={!invite.trim() || full}
              onClick={() => {
                onInvite(invite.trim());
                setInvite("");
              }}
            >
              Invite
            </button>
            <button type="button" disabled={full} onClick={onAddCpu}>
              Add CPU
            </button>
            {host &&
              players
                .filter((p) => !p.cpu && p.name !== you)
                .map((p) => (
                  <button key={p.name} type="button" onClick={() => onToCpu(p.name)}>
                    {p.name} → CPU
                  </button>
                ))}
          </div>
        )}
        {game === "war" && <War />}
        {game === "hockey" && state && <AirHockey state={state as never} onInput={onInput} />}
        {game === "pool" && state && (
          <Pool
            state={state as never}
            onShoot={(tx, ty, power) => onAction({ act: "shoot", tx, ty, power })}
          />
        )}
        {game === "trivia" && state && <Trivia state={state as never} onAction={onAction} />}
        {game === "poker" && state && <Poker state={state as never} onAction={onAction} />}
        {game !== "war" && !state && <p className="hint">Sitting down…</p>}
      </div>
    </Win98Window>
  );
}
