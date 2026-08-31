import { useEffect, useRef, type ReactNode } from "react";

const TITLE = 28;
const DOCK = 28;
const GRIP = 100;

function clamp(x: number, y: number, w: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight - DOCK;
  return {
    x: Math.min(Math.max(x, GRIP - w), vw - GRIP),
    y: Math.min(Math.max(y, 0), Math.max(0, vh - TITLE)),
  };
}

type Props = {
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  className?: string;
  status?: string;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onClose?: () => void;
  children: ReactNode;
};

export default function Win98Window({
  title,
  x,
  y,
  w,
  h,
  z,
  className,
  status,
  onFocus,
  onMove,
  onClose,
  children,
}: Props) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const keepIn = () => {
      const next = clamp(x, y, w);
      if (next.x !== x || next.y !== y) onMove(next.x, next.y);
    };
    keepIn();
    window.addEventListener("resize", keepIn);
    return () => window.removeEventListener("resize", keepIn);
  }, [x, y, w, onMove]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      const next = clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy, w);
      onMove(next.x, next.y);
    };
    const up = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [onMove, w]);

  return (
    <div
      className={`window-shell ${className ?? ""}`}
      style={{ left: x, top: y, width: w, height: h, zIndex: z }}
      onPointerDown={onFocus}
    >
      <div className="window">
        <div
          className="title-bar"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            drag.current = { dx: e.clientX - x, dy: e.clientY - y };
          }}
        >
          <div className="title-bar-text">{title}</div>
          <div className="title-bar-controls">
            {onClose ? (
              <button aria-label="Close" onClick={onClose} />
            ) : (
              <button aria-label="Minimize" disabled />
            )}
          </div>
        </div>
        {children}
        {status ? (
          <div className="status-bar-field" style={{ margin: "0 4px 4px", padding: "2px 6px" }}>
            {status}
          </div>
        ) : null}
      </div>
    </div>
  );
}
