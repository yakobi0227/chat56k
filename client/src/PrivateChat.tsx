import { useEffect, useRef } from "react";
import Mark from "./Mark";
import Win98Window from "./Win98Window";
import type { ImMessage } from "./types";

type Thread = {
  peer: string;
  messages: ImMessage[];
  x: number;
  y: number;
  z: number;
};

type Props = {
  you: string;
  thread: Thread;
  draft: string;
  connected: boolean;
  error: string;
  muted: boolean;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onClose: () => void;
  onDraft: (text: string) => void;
  onSend: () => void;
  onMute: (on: boolean) => void;
  onFlag: () => void;
};

export default function PrivateChat({
  you,
  thread,
  draft,
  connected,
  error,
  muted,
  onFocus,
  onMove,
  onClose,
  onDraft,
  onSend,
  onMute,
  onFlag,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.messages]);

  return (
    <Win98Window
      className="pc-window"
      title={`Private Chat — ${thread.peer}`}
      x={thread.x}
      y={thread.y}
      w={380}
      h={340}
      z={thread.z}
      onFocus={onFocus}
      onMove={onMove}
      onClose={onClose}
    >
      <div className="pc-banner">
        <Mark size={28} />
        <span>Private Chat with {thread.peer}</span>
      </div>
      <div className="window-body pad">
        <div className="im-layout">
          <div className="sunken im-thread" ref={scroller}>
            {thread.messages.length === 0 && (
              <div className="line-system">No lines yet. This stays between the two of you.</div>
            )}
            {thread.messages.map((m) => (
              <div key={m.id} className="line-chat">
                <span className="who">{m.from === you ? you : m.from}:</span> {m.text}
              </div>
            ))}
          </div>
          <form
            className="im-compose"
            onSubmit={(e) => {
              e.preventDefault();
              onSend();
            }}
          >
            <textarea
              rows={3}
              value={draft}
              maxLength={400}
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <div className="room-ops">
              <button type="submit">Send</button>
              <button type="button" onClick={() => onMute(!muted)}>
                {muted ? "Unmute" : "Mute"}
              </button>
              <button type="button" onClick={onFlag}>
                Flag
              </button>
            </div>
          </form>
        </div>
        {!connected && <div className="offline">Not connected.</div>}
        <div className="error-line">{error}</div>
      </div>
    </Win98Window>
  );
}
