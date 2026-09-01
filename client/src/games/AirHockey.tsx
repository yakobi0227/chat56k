import { useEffect, useRef } from "react";

type Props = {
  state: {
    w: number;
    h: number;
    puck: { x: number; y: number };
    mallets: { name: string; x: number; y: number; score: number; you: boolean }[];
    status: string;
    players: { name: string; score?: number }[];
  };
  onInput: (x: number, y: number) => void;
};

export default function AirHockey({ state, onInput }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const onInputRef = useRef(onInput);
  onInputRef.current = onInput;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      onInputRef.current(((e.clientX - r.left) / r.width) * state.w, ((e.clientY - r.top) / r.height) * state.h);
    };
    canvas.addEventListener("pointermove", move);
    return () => canvas.removeEventListener("pointermove", move);
  }, [state.w, state.h]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const W = state.w;
    const H = state.h;
    ctx.fillStyle = "#0a3d4d";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#9ee7ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, W - 4, H - 4);
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.fillStyle = "#003344";
    ctx.fillRect(W * 0.32, 0, W * 0.36, 8);
    ctx.fillRect(W * 0.32, H - 8, W * 0.36, 8);
    for (const m of state.mallets) {
      ctx.fillStyle = m.you ? "#39ff88" : "#ffb000";
      ctx.beginPath();
      ctx.arc(m.x, m.y, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(state.puck.x, state.puck.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "12px Tahoma";
    const you = state.mallets.find((m) => m.you);
    const them = state.mallets.find((m) => !m.you);
    ctx.fillText(`${them?.name ?? "…"} ${them?.score ?? 0}`, 8, 20);
    ctx.fillText(`${you?.name ?? "You"} ${you?.score ?? 0}`, 8, H - 10);
    if (state.status === "over") {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, H / 2 - 24, W, 48);
      ctx.fillStyle = "#ffcc33";
      ctx.fillText("Game.", 120, H / 2 + 6);
    }
  }, [state]);

  const waiting = state.players.length < 2;
  return (
    <div className="game-pad center">
      <canvas ref={ref} width={state.w} height={state.h} className="game-canvas" />
      <p className="hint">{waiting ? "Waiting for player 2." : "Green is you. First to 7."}</p>
    </div>
  );
}
