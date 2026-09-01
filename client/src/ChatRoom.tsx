import { useEffect, useRef } from "react";
import Win98Window from "./Win98Window";
import type { ChatMessage, JoinedRoom } from "./types";

type Props = {
  room: JoinedRoom;
  you: string;
  selectedMember: string | null;
  draft: string;
  mutes: string[];
  error: string;
  x: number;
  y: number;
  z: number;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onClose: () => void;
  onSelectMember: (name: string) => void;
  onPrivate: (name: string) => void;
  onInfo: (name: string) => void;
  onDraft: (text: string) => void;
  onSay: (e: React.FormEvent) => void;
  onAddBf: (name: string) => void;
  onMute: (name: string, on: boolean) => void;
  onKick: (name: string) => void;
  onBan: (name: string) => void;
  onUnban: (name: string) => void;
  onSilence: (name: string, on: boolean) => void;
  onPass: (name: string) => void;
  onFlag: (name: string) => void;
};

export default function ChatRoom({
  room,
  you,
  selectedMember,
  draft,
  mutes,
  error,
  x,
  y,
  z,
  onFocus,
  onMove,
  onClose,
  onSelectMember,
  onPrivate,
  onInfo,
  onDraft,
  onSay,
  onAddBf,
  onMute,
  onKick,
  onBan,
  onUnban,
  onSilence,
  onPass,
  onFlag,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [room.messages]);

  const peer = selectedMember && selectedMember !== you ? selectedMember : null;
  const isOp = room.operator === you;
  const muted = peer ? mutes.some((n) => n.toLowerCase() === peer.toLowerCase()) : false;
  const quiet = room.silenced ?? [];
  const peerQuiet = peer ? quiet.some((n) => n.toLowerCase() === peer.toLowerCase()) : false;

  return (
    <Win98Window
      title={`${room.name} — ${room.members.length}/${room.cap}${isOp ? " — operator" : ""}`}
      x={x}
      y={y}
      w={680}
      h={500}
      z={z}
      onFocus={onFocus}
      onMove={onMove}
      onClose={onClose}
    >
      <div className="window-body pad">
        <div className="caption">
          {room.blurb} Host: {room.operator ?? "—"}. Double-click a name for private chat.
          {isOp ? " Perm mute: they stay, nobody else sees their lines." : ""}
        </div>
        <div className="room-layout">
          <div className="sunken transcript" ref={scroller}>
            {room.messages
              .filter(
                (m) =>
                  m.kind !== "chat" ||
                  !mutes.some((n) => n.toLowerCase() === m.from.toLowerCase()),
              )
              .map((m) => (
                <Line key={m.id} message={m} />
              ))}
          </div>
          <div className="sunken people">
            {room.members.map((m) => (
              <div
                key={m.name}
                className={`person ${selectedMember === m.name ? "selected" : ""} ${m.name === you ? "you" : ""}`}
                onClick={() => onSelectMember(m.name)}
                onDoubleClick={() => {
                  if (m.name !== you) onPrivate(m.name);
                }}
              >
                {m.op ? "@" : ""}
                {m.name}
                {m.away ? " (away)" : ""}
                {mutes.some((n) => n.toLowerCase() === m.name.toLowerCase()) ? " (muted)" : ""}
                {isOp && quiet.some((n) => n.toLowerCase() === m.name.toLowerCase()) ? " (quiet)" : ""}
              </div>
            ))}
            {isOp && quiet.length > 0 && (
              <div className="ban-block">
                <div className="bf-head">Perm muted</div>
                {quiet.map((name) => (
                  <div key={name} className="person" onClick={() => onSelectMember(name)}>
                    {name}
                    <button
                      type="button"
                      className="tiny"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSilence(name, false);
                      }}
                    >
                      hear
                    </button>
                  </div>
                ))}
              </div>
            )}
            {isOp && room.bans.length > 0 && (
              <div className="ban-block">
                <div className="bf-head">Banned</div>
                {room.bans.map((name) => (
                  <div key={name} className="person" onClick={() => onSelectMember(name)}>
                    {name}
                    <button
                      type="button"
                      className="tiny"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnban(name);
                      }}
                    >
                      unban
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <form className="compose" onSubmit={onSay}>
            <textarea
              rows={3}
              value={draft}
              maxLength={400}
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSay(e);
                }
              }}
            />
            <div className="room-ops">
              <button type="submit">Send</button>
              <button type="button" disabled={!peer} onClick={() => peer && onPrivate(peer)}>
                Private
              </button>
              <button
                type="button"
                onClick={() => onInfo(selectedMember || you)}
              >
                Info
              </button>
              <button type="button" disabled={!peer} onClick={() => peer && onAddBf(peer)}>
                BF+
              </button>
              <button type="button" disabled={!peer} onClick={() => peer && onMute(peer, !muted)}>
                {muted ? "Unmute" : "Mute"}
              </button>
              <button type="button" disabled={!peer} onClick={() => peer && onFlag(peer)}>
                Flag
              </button>
              {isOp && (
                <>
                  <button type="button" disabled={!peer} onClick={() => peer && onKick(peer)}>
                    Kick
                  </button>
                  <button type="button" disabled={!peer} onClick={() => peer && onBan(peer)}>
                    Ban
                  </button>
                  <button type="button" disabled={!peer} onClick={() => peer && onSilence(peer, !peerQuiet)}>
                    {peerQuiet ? "Unsilence" : "Perm mute"}
                  </button>
                  <button type="button" disabled={!peer} onClick={() => peer && onPass(peer)}>
                    Pass
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
        <div className="error-line">{error}</div>
      </div>
    </Win98Window>
  );
}

function Line({ message }: { message: ChatMessage }) {
  if (message.kind === "system") {
    return <div className="line-system">{message.text}</div>;
  }
  return (
    <div className="line-chat">
      <span className="who">{message.from}:</span> {message.text}
    </div>
  );
}
