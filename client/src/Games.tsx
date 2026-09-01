import Win98Window from "./Win98Window";
import { GAMES, type GameId } from "./games/catalog";

export type TableInfo = {
  id: string;
  kind: GameId;
  count: number;
  cap: number;
  status: string;
  names: string[];
};

type Props = {
  x: number;
  y: number;
  z: number;
  tables: TableInfo[];
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onClose: () => void;
  onCreate: (id: GameId) => void;
  onJoin: (id: string) => void;
};

export default function Games({ x, y, z, tables, onFocus, onMove, onClose, onCreate, onJoin }: Props) {
  return (
    <Win98Window title="Games — chat56k" x={x} y={y} w={400} h={480} z={z} onFocus={onFocus} onMove={onMove} onClose={onClose}>
      <div className="window-body pad">
        <p className="hint">Open tables. Join or start a new one. War is still vs the house.</p>
        <div className="game-list">
          {GAMES.filter((g) => g.pvp).map((g) => (
            <div key={g.id} className="game-row">
              <div>
                <strong>{g.name}</strong>
                <div className="hint" style={{ margin: 0 }}>
                  {g.blurb}
                </div>
              </div>
              <button type="button" onClick={() => onCreate(g.id)}>
                New
              </button>
            </div>
          ))}
          <div className="game-row">
            <div>
              <strong>War</strong>
              <div className="hint" style={{ margin: 0 }}>
                Vs the house. No seats.
              </div>
            </div>
            <button type="button" onClick={() => onCreate("war")}>
              Play
            </button>
          </div>
        </div>
        <p className="caption">Open tables</p>
        <div className="sunken" style={{ maxHeight: 140, overflow: "auto" }}>
          {tables.length === 0 && <div className="hint" style={{ padding: 8 }}>None yet.</div>}
          {tables.map((t) => {
            const meta = GAMES.find((g) => g.id === t.kind);
            const full = t.count >= t.cap;
            return (
              <div key={t.id} className="game-row">
                <div>
                  <strong>
                    {meta?.name} {t.count}/{t.cap}
                  </strong>
                  <div className="hint" style={{ margin: 0 }}>
                    {t.names.join(", ")}
                  </div>
                </div>
                <button type="button" disabled={full} onClick={() => onJoin(t.id)}>
                  {full ? "Full" : "Join"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Win98Window>
  );
}
