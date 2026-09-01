import AirHockey from "./games/AirHockey";
import { GAMES, type GameId } from "./games/catalog";
import Pool from "./games/Pool";
import Trivia from "./games/Trivia";
import War from "./games/War";
import Win98Window from "./Win98Window";

type Props = {
  id: string;
  game: GameId;
  x: number;
  y: number;
  z: number;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onClose: () => void;
};

export default function GameTable({ game, x, y, z, onFocus, onMove, onClose }: Props) {
  const meta = GAMES.find((g) => g.id === game)!;
  return (
    <Win98Window
      title={`${meta.name} — vs House`}
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
        {game === "trivia" && <Trivia />}
        {game === "hockey" && <AirHockey />}
        {game === "war" && <War />}
        {game === "pool" && <Pool />}
      </div>
    </Win98Window>
  );
}
