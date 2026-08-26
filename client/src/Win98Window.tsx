import { useEffect, useRef, type ReactNode } from "react";

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
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      onMove(e.clientX - drag.current.dx, e.clientY - drag.current.dy);
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
  }, [onMove]);

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
