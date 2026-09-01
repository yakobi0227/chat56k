import { useEffect, useRef } from "react";

type Ball = { x: number; y: number; color: string; dead: boolean; cue?: boolean };

type Props = {
  state: {
    w: number;
    h: number;
    balls: Ball[];
    scores: Record<string, number>;
    turn: string;
    busy: boolean;
    you: string;
    status: string;
    players: { name: string }[];
  };
  onShoot: (tx: number, ty: number, power: number) => void;
};

export default function Pool({ state, onShoot }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const aim = useRef({ x: 200, y: 130, down: false });
  const shootRef = useRef(onShoot);
  shootRef.current = onShoot;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ptr = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      aim.current.x = ((e.clientX - r.left) / r.width) * state.w;
      aim.current.y = ((e.clientY - r.top) / r.height) * state.h;
    };
    const down = (e: PointerEvent) => {
      const s = stateRef.current;
      if (s.turn !== s.you || s.busy) return;
      aim.current.down = true;
      ptr(e);
    };
    const up = () => {
      const s = stateRef.current;
      if (!aim.current.down || s.turn !== s.you || s.busy) {
        aim.current.down = false;
        return;
      }
      aim.current.down = false;
      const cue = s.balls.find((b) => b.cue && !b.dead);
      if (!cue) return;
      const pwr = Math.min(11, Math.hypot(aim.current.x - cue.x, aim.current.y - cue.y) / 14);
      shootRef.current(aim.current.x, aim.current.y, pwr);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", ptr);
    window.addEventListener("pointerup", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", ptr);
      window.removeEventListener("pointerup", up);
    };
  }, [state.w, state.h]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const W = state.w;
    const H = state.h;
    ctx.fillStyle = "#0b5a32";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#5a3214";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, W - 10, H - 10);
    ctx.fillStyle = "#111";
    for (const [px, py] of [
      [12, 12],
      [W / 2, 8],
      [W - 12, 12],
      [12, H - 12],
      [W / 2, H - 8],
      [W - 12, H - 12],
    ]) {
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of state.balls) {
      if (b.dead) continue;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.stroke();
    }
    const cue = state.balls.find((b) => b.cue && !b.dead);
    if (cue && state.turn === state.you && !state.busy) {
      ctx.strokeStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(cue.x, cue.y);
      ctx.lineTo(aim.current.x, aim.current.y);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.font = "12px Tahoma";
    const line = state.players.map((p) => `${p.name} ${state.scores?.[p.name] || 0}`).join("   ");
    ctx.fillText(`${line}   ${state.busy ? "balls rolling" : state.turn === state.you ? "Your shot" : `${state.turn}'s shot`}`, 12, 18);
  }, [state]);

  return (
    <div className="game-pad center">
      <canvas ref={ref} width={state.w} height={state.h} className="game-canvas pool" />
      <p className="hint">
        {state.players.length < 2 ? "Waiting for player 2." : "Aim, hold, release. Pocket 5."}
      </p>
    </div>
  );
}
