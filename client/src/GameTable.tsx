import AirHockey from "./games/AirHockey";
import { GAMES, type GameId } from "./games/catalog";
import Poker from "./games/Poker";
import Pool from "./games/Pool";
import Trivia from "./games/Trivia";
import War from "./games/War";
import Win98Window from "./Win98Window";

type Props = {
  id: string;
  game: GameId;
  state: Record<string, unknown> | null;
  x: number;
  y: number;
  z: number;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onClose: () => void;
  onInput: (x: number, y: number) => void;
  onAction: (msg: object) => void;
};

export default function GameTable({ game, state, x, y, z, onFocus, onMove, onClose, onInput, onAction }: Props) {
  const meta = GAMES.find((g) => g.id === game)!;
  return (
    <Win98Window
      title={state ? `${meta.name}` : `${meta.name} — vs House`}
      x={x}
      y={y}
      w={meta.w}
      h={meta.h}
      z={z}
      onFocus={onFocus}
      onMove={onMove}
      onClose={onClose}
    >
      <div className="window-body pad">
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
