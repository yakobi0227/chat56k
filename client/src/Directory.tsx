import Win98Window from "./Win98Window";
import type { RoomSummary } from "./types";

type Props = {
  you: string;
  rooms: RoomSummary[];
  selectedId: string | null;
  newName: string;
  newBlurb: string;
  error: string;
  x: number;
  y: number;
  z: number;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onSelect: (id: string) => void;
  onEnter: (id: string) => void;
  onNewName: (value: string) => void;
  onNewBlurb: (value: string) => void;
  onCreate: () => void;
};

export default function Directory({
  you,
  rooms,
  selectedId,
  newName,
  newBlurb,
  error,
  x,
  y,
  z,
  onFocus,
  onMove,
  onSelect,
  onEnter,
  onNewName,
  onNewBlurb,
  onCreate,
}: Props) {
  const selected = rooms.find((r) => r.id === selectedId) ?? null;

  return (
    <Win98Window
      title="Room Directory"
      x={x}
      y={y}
      w={430}
      h={500}
      z={z}
      onFocus={onFocus}
      onMove={onMove}
    >
      <div className="window-body pad">
        <p className="hint">Public rooms. 23 seats. Double-click to enter. Make your own if you want a door with your name on it.</p>
        <div className="directory">
          <div className="sunken" style={{ flex: 1 }}>
            <table className="room-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th style={{ width: 78 }}>People</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => {
                  const full = r.count >= r.cap;
                  return (
                    <tr
                      key={r.id}
                      className={r.id === selectedId ? "selected" : ""}
                      onClick={() => onSelect(r.id)}
                      onDoubleClick={() => onEnter(r.id)}
                    >
                      <td>
                        <div>
                          {r.name}
                          {r.house ? "" : " · user"}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.85 }}>{r.blurb}</div>
                      </td>
                      <td className={full ? "count full" : "count"}>
                        {r.count}/{r.cap}
                        {full ? " Full" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="dir-actions">
            <span>
              Signed on as <strong>{you}</strong>
            </span>
            <button type="button" onClick={() => selected && onEnter(selected.id)} disabled={!selected}>
              Enter Room
            </button>
          </div>
          <form
            className="create-room"
            onSubmit={(e) => {
              e.preventDefault();
              onCreate();
            }}
          >
            <input
              placeholder="New room name"
              maxLength={24}
              value={newName}
              onChange={(e) => onNewName(e.target.value)}
            />
            <input
              placeholder="Short blurb"
              maxLength={80}
              value={newBlurb}
              onChange={(e) => onNewBlurb(e.target.value)}
            />
            <button type="submit">Create</button>
          </form>
          <div className="error-line">{error}</div>
        </div>
      </div>
    </Win98Window>
  );
}
