import { useEffect, useRef } from "react";

const W = 460;
const H = 260;
const R = 8;
const POCKETS: [number, number][] = [
  [12, 12],
  [W / 2, 8],
  [W - 12, 12],
  [12, H - 12],
  [W / 2, H - 8],
  [W - 12, H - 12],
];

type Ball = { x: number; y: number; vx: number; vy: number; color: string; dead: boolean; cue?: boolean };

function rack(): Ball[] {
  const balls: Ball[] = [{ x: 120, y: H / 2, vx: 0, vy: 0, color: "#f4f0e0", dead: false, cue: true }];
  const colors = ["#e11", "#14e", "#e81", "#1a1", "#808", "#ea0", "#a52", "#222"];
  let n = 0;
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i <= row; i++) {
      balls.push({
        x: 300 + row * 16,
        y: H / 2 - row * 8 + i * 16,
        vx: 0,
        vy: 0,
        color: colors[n++ % colors.length],
        dead: false,
      });
    }
  }
  return balls;
}

export default function Pool() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let balls = rack();
    let you = 0;
    let house = 0;
    let turn: "you" | "cpu" = "you";
    let busy = false;
    let cpuWait = 0;
    let running = true;
    const aim = { x: 200, y: H / 2, down: false };

    const moving = () => balls.some((b) => !b.dead && Math.hypot(b.vx, b.vy) > 0.05);

    function shoot(cue: Ball, tx: number, ty: number, power: number) {
      const dx = tx - cue.x;
      const dy = ty - cue.y;
      const d = Math.hypot(dx, dy) || 1;
      cue.vx = (dx / d) * power;
      cue.vy = (dy / d) * power;
      busy = true;
    }

    const ptr = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      aim.x = ((e.clientX - r.left) / r.width) * W;
      aim.y = ((e.clientY - r.top) / r.height) * H;
    };
    const down = (e: PointerEvent) => {
      if (turn !== "you" || moving()) return;
      aim.down = true;
      ptr(e);
    };
    const up = () => {
      if (!aim.down || turn !== "you" || moving()) {
        aim.down = false;
        return;
      }
      aim.down = false;
      const cue = balls.find((b) => b.cue && !b.dead);
      if (!cue) return;
      shoot(cue, aim.x, aim.y, Math.min(11, Math.hypot(aim.x - cue.x, aim.y - cue.y) / 14));
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", ptr);
    window.addEventListener("pointerup", up);

    let raf = 0;
    const tick = () => {
      if (!running) return;

      for (const b of balls) {
        if (b.dead) continue;
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.986;
        b.vy *= 0.986;
        if (Math.hypot(b.vx, b.vy) < 0.05) {
          b.vx = 0;
          b.vy = 0;
        }
        if (b.x < R || b.x > W - R) {
          b.vx *= -1;
          b.x = Math.max(R, Math.min(W - R, b.x));
        }
        if (b.y < R || b.y > H - R) {
          b.vy *= -1;
          b.y = Math.max(R, Math.min(H - R, b.y));
        }
        if (POCKETS.some(([px, py]) => Math.hypot(b.x - px, b.y - py) < 14)) {
          if (b.cue) {
            b.x = 120;
            b.y = H / 2;
            b.vx = 0;
            b.vy = 0;
          } else {
            b.dead = true;
            b.vx = 0;
            b.vy = 0;
            if (turn === "you") you += 1;
            else house += 1;
          }
        }
      }

      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i];
          const b = balls[j];
          if (a.dead || b.dead) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d >= R * 2) continue;
          const nx = dx / d;
          const ny = dy / d;
          const p = a.vx * nx + a.vy * ny - (b.vx * nx + b.vy * ny);
          a.vx -= p * nx;
          a.vy -= p * ny;
          b.vx += p * nx;
          b.vy += p * ny;
          const o = (R * 2 - d) / 2;
          a.x -= nx * o;
          a.y -= ny * o;
          b.x += nx * o;
          b.y += ny * o;
        }
      }

      const live = balls.filter((b) => !b.dead && !b.cue).length;
      const finished = you >= 5 || house >= 5 || live === 0;

      if (!moving() && busy && !finished) {
        busy = false;
        if (turn === "you") {
          turn = "cpu";
          cpuWait = 0;
        } else {
          turn = "you";
        }
      }

      if (turn === "cpu" && !moving() && !finished) {
        cpuWait += 1;
        if (cpuWait === 35) {
          const cue = balls.find((b) => b.cue && !b.dead);
          const t = balls.find((b) => !b.dead && !b.cue);
          if (cue && t) {
            shoot(cue, t.x + (Math.random() - 0.5) * 20, t.y + (Math.random() - 0.5) * 20, 6 + Math.random() * 4);
          } else {
            turn = "you";
          }
        }
      }

      ctx.fillStyle = "#0b5a32";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#5a3214";
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, W - 10, H - 10);
      ctx.fillStyle = "#111";
      for (const [px, py] of POCKETS) {
        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const b of balls) {
        if (b.dead) continue;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      const cue = balls.find((b) => b.cue && !b.dead);
      if (cue && turn === "you" && !moving()) {
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        ctx.lineTo(aim.x, aim.y);
        ctx.stroke();
      }
      ctx.fillStyle = "#fff";
      ctx.font = "12px Tahoma";
      ctx.fillText(
        `You ${you}   House ${house}   ${finished ? "" : turn === "you" ? "Your shot" : "House shooting"}`,
        12,
        18,
      );
      if (finished) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, H / 2 - 20, W, 40);
        ctx.fillStyle = "#ffcc33";
        ctx.fillText(you >= house ? "You ran the table." : "House ran the table.", 160, H / 2 + 6);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", ptr);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <div className="game-pad center">
      <canvas ref={ref} width={W} height={H} className="game-canvas pool" />
      <p className="hint">Aim with the mouse. Hold and release to shoot. Pocket 5 before the house.</p>
    </div>
  );
}
