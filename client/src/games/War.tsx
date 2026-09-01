import { useMemo, useState } from "react";

type Card = { r: number; s: string };

const SUITS = ["♠", "♥", "♦", "♣"];

function deck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) d.push({ r, s });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function label(c: Card) {
  const face = c.r === 11 ? "J" : c.r === 12 ? "Q" : c.r === 13 ? "K" : c.r === 14 ? "A" : String(c.r);
  return `${face}${c.s}`;
}

export default function War() {
  const start = useMemo(() => {
    const d = deck();
    return { you: d.slice(0, 26), cpu: d.slice(26) };
  }, []);
  const [you, setYou] = useState(start.you);
  const [cpu, setCpu] = useState(start.cpu);
  const [table, setTable] = useState<{ you: Card; cpu: Card; note: string } | null>(null);
  const [over, setOver] = useState("");

  function flip() {
    if (over || you.length === 0 || cpu.length === 0) return;
    const y = you[0];
    const c = cpu[0];
    let ys = you.slice(1);
    let cs = cpu.slice(1);
    let note = "Tie. War.";
    if (y.r > c.r) {
      ys = [...ys, y, c];
      note = "You take the trick.";
    } else if (c.r > y.r) {
      cs = [...cs, c, y];
      note = "The house takes it.";
    } else {
      ys = [...ys, y];
      cs = [...cs, c];
    }
    setYou(ys);
    setCpu(cs);
    setTable({ you: y, cpu: c, note });
    if (ys.length === 0) setOver("The house won. As is tradition.");
    if (cs.length === 0) setOver("You cleaned them out.");
  }

  return (
    <div className="game-pad">
      <div className="war-row">
        <div className="war-pile">
          <div className="caption">You · {you.length}</div>
          <div className="card-face">{table ? label(table.you) : "🂠"}</div>
        </div>
        <div className="war-pile">
          <div className="caption">House · {cpu.length}</div>
          <div className="card-face cpu">{table ? label(table.cpu) : "🂠"}</div>
        </div>
      </div>
      <p className="hint">{over || table?.note || "Flip. Highest card takes both. Ties do nothing useful, like 1999."}</p>
      <button type="button" onClick={flip} disabled={Boolean(over)}>
        Flip
      </button>
    </div>
  );
}
