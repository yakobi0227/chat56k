import { useEffect, useRef, useState } from "react";

const SRC = 32;
const SCALE = 4;
const SIZE = SRC * SCALE;

export default function DialupPic({ src }: { src: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let stop = false;
    const img = new Image();
    img.onload = () => {
      const el = canvas.current;
      const ctx = el?.getContext("2d");
      if (!el || !ctx || stop) return;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#001a1a";
      ctx.fillRect(0, 0, SIZE, SIZE);
      let row = 0;
      const step = () => {
        if (stop) return;
        ctx.drawImage(img, 0, row, SRC, 1, 0, row * SCALE, SIZE, SCALE);
        ctx.fillStyle = "#39ff88";
        ctx.fillRect(0, Math.min(SIZE - 1, (row + 1) * SCALE), SIZE, 1);
        row += 1;
        setPct(Math.min(99, Math.round((row / SRC) * 100)));
        if (row < SRC) {
          window.setTimeout(step, 90);
        } else {
          ctx.drawImage(img, 0, 0, SRC, SRC, 0, 0, SIZE, SIZE);
          setPct(100);
          setDone(true);
        }
      };
      step();
    };
    img.src = src;
    return () => {
      stop = true;
    };
  }, [src]);

  return (
    <div className="dialup-pic">
      <canvas ref={canvas} width={SIZE} height={SIZE} />
      <div className="caption">{done ? "Received." : `Receiving… ${pct}%  (56k)`}</div>
    </div>
  );
}
