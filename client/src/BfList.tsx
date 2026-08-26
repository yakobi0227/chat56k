import Win98Window from "./Win98Window";
import type { BfEntry } from "./types";

type Props = {
  you: string;
  list: BfEntry[];
  away: boolean;
  awayMessage: string;
  addName: string;
  error: string;
  x: number;
  y: number;
  z: number;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onAddName: (value: string) => void;
  onAdd: () => void;
  onRemove: (name: string) => void;
  onOpen: (name: string) => void;
  onAway: (away: boolean, message: string) => void;
  onAwayMessage: (value: string) => void;
};

const GROUPS: { key: BfEntry["status"]; label: string }[] = [
  { key: "online", label: "Online" },
  { key: "away", label: "Away" },
  { key: "offline", label: "Offline" },
];

export default function BfList({
  you,
  list,
  away,
  awayMessage,
  addName,
  error,
  x,
  y,
  z,
  onFocus,
  onMove,
  onAddName,
  onAdd,
  onRemove,
  onOpen,
  onAway,
  onAwayMessage,
}: Props) {
  return (
    <Win98Window title={`BF List — ${you}`} x={x} y={y} w={230} h={460} z={z} onFocus={onFocus} onMove={onMove}>
      <div className="window-body pad">
        <p className="hint">Double-click a name for private chat.</p>
        <div className="sunken bf-list">
          {GROUPS.map((g) => {
            const rows = list.filter((e) => e.status === g.key);
            return (
              <div key={g.key} className="bf-group">
                <div className="bf-head">
                  {g.label} ({rows.length})
                </div>
                {rows.map((e) => (
                  <div
                    key={e.screenName}
                    className={`bf-row ${e.status}`}
                    title={e.awayMessage}
                    onDoubleClick={() => onOpen(e.screenName)}
                  >
                    <span className="bf-dot" />
                    <span className="bf-name">{e.screenName}</span>
                    <button type="button" className="tiny" onClick={() => onRemove(e.screenName)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
          {list.length === 0 && <div className="bf-empty">Nobody on your BF List yet.</div>}
        </div>
        <form
          className="bf-add"
          onSubmit={(e) => {
            e.preventDefault();
            onAdd();
          }}
        >
          <input
            placeholder="Screen name"
            maxLength={16}
            value={addName}
            onChange={(e) => onAddName(e.target.value)}
          />
          <button type="submit">Add</button>
        </form>
        <label className="check">
          <input
            type="checkbox"
            checked={away}
            onChange={(e) => onAway(e.target.checked, awayMessage)}
          />
          Away
        </label>
        <input
          className="away-msg"
          placeholder="Away message"
          maxLength={80}
          value={awayMessage}
          disabled={!away}
          onChange={(e) => onAwayMessage(e.target.value)}
          onBlur={() => {
            if (away) onAway(true, awayMessage);
          }}
        />
        <div className="error-line">{error}</div>
      </div>
    </Win98Window>
  );
}
