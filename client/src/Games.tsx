import Win98Window from "./Win98Window";
import { GAMES, type GameId } from "./games/catalog";

type Props = {
  x: number;
  y: number;
  z: number;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onClose: () => void;
  onPlay: (id: GameId) => void;
};

export default function Games({ x, y, z, onFocus, onMove, onClose, onPlay }: Props) {
  return (
    <Win98Window title="Games — chat56k" x={x} y={y} w={360} h={420} z={z} onFocus={onFocus} onMove={onMove} onClose={onClose}>
      <div className="window-body pad">
        <p className="hint">Play while you chat. The house always sits down. Nobody is keeping stats.</p>
        <div className="game-list">
          {GAMES.map((g) => (
            <div key={g.id} className="game-row">
              <div>
                <strong>{g.name}</strong>
                <div className="hint" style={{ margin: 0 }}>
                  {g.blurb}
                </div>
              </div>
              <button type="button" onClick={() => onPlay(g.id)}>
                Play
              </button>
            </div>
          ))}
        </div>
      </div>
    </Win98Window>
  );
}
