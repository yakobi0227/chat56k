import { useEffect, useRef } from "react";

const W = 280;
const H = 420;
const PR = 10;
const MALLET = 22;

export default function AirHockey() {
  const ref = useRef<HTMLCanvasElement>(null);
  const you = useRef(0);
  const cpuScore = useRef(0);
  const running = useRef(true);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    running.current = true;

    const state = {
      puck: { x: W / 2, y: H / 2, vx: 0, vy: 2.4 },
      you: { x: W / 2, y: H - 48 },
      cpu: { x: W / 2, y: 48 },
    };
    you.current = 0;
    cpuScore.current = 0;

    function malletHit(
      mx: number,
      my: number,
      px: number,
      py: number,
      pvx: number,
      pvy: number,
    ) {
      const dx = px - mx;
      const dy = py - my;
      const d = Math.hypot(dx, dy) || 1;
      if (d < MALLET + PR) {
        const nx = dx / d;
        const ny = dy / d;
        const speed = Math.max(4, Math.hypot(pvx, pvy) + 1.6);
        return { x: mx + nx * (MALLET + PR + 1), y: my + ny * (MALLET + PR + 1), vx: nx * speed, vy: ny * speed };
      }
      return null;
    }

    function reset(dir: number) {
      state.puck = { x: W / 2, y: H / 2, vx: (Math.random() - 0.5) * 2, vy: dir * 2.6 };
    }

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      state.you.x = Math.max(MALLET, Math.min(W - MALLET, ((e.clientX - r.left) / r.width) * W));
      state.you.y = Math.max(H * 0.55, Math.min(H - MALLET, ((e.clientY - r.top) / r.height) * H));
    };
    canvas.addEventListener("pointermove", onMove);

    let raf = 0;
    const tick = () => {
      if (!running.current) return;
      const p = state.puck;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.995;
      p.vy *= 0.995;

      if (p.x < PR || p.x > W - PR) {
        p.vx *= -1;
        p.x = Math.max(PR, Math.min(W - PR, p.x));
      }
      const goal = p.x > W * 0.32 && p.x < W * 0.68;
      if (p.y < PR) {
        if (goal) {
          you.current += 1;
          reset(1);
        } else {
          p.vy *= -1;
          p.y = PR;
        }
      }
      if (p.y > H - PR) {
        if (goal) {
          cpuScore.current += 1;
          reset(-1);
        } else {
          p.vy *= -1;
          p.y = H - PR;
        }
      }

      const hitYou = malletHit(state.you.x, state.you.y, p.x, p.y, p.vx, p.vy);
      if (hitYou) Object.assign(p, hitYou);
      const target = p.y < H * 0.55 ? p.x : W / 2;
      state.cpu.x += (target - state.cpu.x) * 0.08;
      state.cpu.x = Math.max(MALLET, Math.min(W - MALLET, state.cpu.x));
      const hitCpu = malletHit(state.cpu.x, state.cpu.y, p.x, p.y, p.vx, p.vy);
      if (hitCpu) Object.assign(p, hitCpu);

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

      ctx.fillStyle = "#ffb000";
      ctx.beginPath();
      ctx.arc(state.cpu.x, state.cpu.y, MALLET, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#39ff88";
      ctx.beginPath();
      ctx.arc(state.you.x, state.you.y, MALLET, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, PR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "12px Tahoma";
      ctx.fillText(`House ${cpuScore.current}`, 8, 20);
      ctx.fillText(`You ${you.current}`, 8, H - 10);

      if (you.current >= 7 || cpuScore.current >= 7) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, H / 2 - 24, W, 48);
        ctx.fillStyle = "#ffcc33";
        ctx.font = "14px Tahoma";
        ctx.fillText(you.current >= 7 ? "You win." : "House wins.", 90, H / 2 + 6);
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      running.current = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="game-pad center">
      <canvas ref={ref} width={W} height={H} className="game-canvas" />
      <p className="hint">Move the mouse on the table. Green is you. First to 7.</p>
    </div>
  );
}
