import { useEffect, useRef, useState } from "react";
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

type Menu = { name: string; x: number; y: number };

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
  const [menu, setMenu] = useState<Menu | null>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [room.messages]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const isOp = room.house ? room.operator === you : room.createdBy.toLowerCase() === you.toLowerCase();
  const hostName = room.house ? room.operator ?? "—" : room.createdBy;
  const quiet = room.silenced ?? [];

  function openMenu(name: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onSelectMember(name);
    const w = 160;
    const x = Math.min(e.clientX, window.innerWidth - w - 8);
    const y = Math.min(e.clientY, window.innerHeight - 220);
    setMenu({ name, x: Math.max(8, x), y: Math.max(8, y) });
  }

  return (
    <Win98Window
      title={`${room.name} — ${room.members.length}/${room.cap}${isOp ? (room.house ? " — operator" : " — host") : ""}`}
      x={x}
      y={y}
      w={700}
      h={520}
      z={z}
      onFocus={onFocus}
      onMove={onMove}
      onClose={onClose}
    >
      <div className="window-body pad">
        <div className="caption">
          {room.blurb} Host: {hostName}. Right-click a name for options. Double-click for private chat.
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
                <Line key={m.id} message={m} onName={(name, e) => openMenu(name, e)} />
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
                onContextMenu={(e) => openMenu(m.name, e)}
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
                  <div key={name} className="person" onContextMenu={(e) => openMenu(name, e)} onClick={() => onSelectMember(name)}>
                    {name}
                  </div>
                ))}
              </div>
            )}
            {isOp && room.bans.length > 0 && (
              <div className="ban-block">
                <div className="bf-head">Banned</div>
                {room.bans.map((name) => (
                  <div key={name} className="person" onContextMenu={(e) => openMenu(name, e)} onClick={() => onSelectMember(name)}>
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <form className="compose" onSubmit={onSay}>
            <textarea
              rows={2}
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
            <button type="submit">Send</button>
          </form>
        </div>
        <div className="error-line">{error}</div>
      </div>
      {menu && (
        <SnMenu
          you={you}
          name={menu.name}
          x={menu.x}
          y={menu.y}
          isOp={isOp}
          house={room.house}
          muted={mutes.some((n) => n.toLowerCase() === menu.name.toLowerCase())}
          quiet={quiet.some((n) => n.toLowerCase() === menu.name.toLowerCase())}
          banned={room.bans.some((n) => n.toLowerCase() === menu.name.toLowerCase())}
          onPrivate={onPrivate}
          onInfo={onInfo}
          onAddBf={onAddBf}
          onMute={onMute}
          onKick={onKick}
          onBan={onBan}
          onUnban={onUnban}
          onSilence={onSilence}
          onPass={onPass}
          onFlag={onFlag}
          onClose={() => setMenu(null)}
        />
      )}
    </Win98Window>
  );
}

function SnMenu({
  you,
  name,
  x,
  y,
  isOp,
  house,
  muted,
  quiet,
  banned,
  onPrivate,
  onInfo,
  onAddBf,
  onMute,
  onKick,
  onBan,
  onUnban,
  onSilence,
  onPass,
  onFlag,
  onClose,
}: {
  you: string;
  name: string;
  x: number;
  y: number;
  isOp: boolean;
  house: boolean;
  muted: boolean;
  quiet: boolean;
  banned: boolean;
  onPrivate: (name: string) => void;
  onInfo: (name: string) => void;
  onAddBf: (name: string) => void;
  onMute: (name: string, on: boolean) => void;
  onKick: (name: string) => void;
  onBan: (name: string) => void;
  onUnban: (name: string) => void;
  onSilence: (name: string, on: boolean) => void;
  onPass: (name: string) => void;
  onFlag: (name: string) => void;
  onClose: () => void;
}) {
  const mine = name.toLowerCase() === you.toLowerCase();

  function go(fn: () => void) {
    fn();
    onClose();
  }

  return (
    <div className="sn-menu" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
      <button type="button" onClick={() => go(() => onInfo(name))}>
        Get Info
      </button>
      {!mine && (
        <>
          <button type="button" onClick={() => go(() => onPrivate(name))}>
            Private chat
          </button>
          <button type="button" onClick={() => go(() => onAddBf(name))}>
            Add to BF List
          </button>
          <button type="button" onClick={() => go(() => onMute(name, !muted))}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button type="button" onClick={() => go(() => onFlag(name))}>
            Flag
          </button>
          {isOp && (
            <>
              <div className="sn-menu-rule" />
              <button type="button" onClick={() => go(() => onKick(name))}>
                Kick
              </button>
              {banned ? (
                <button type="button" onClick={() => go(() => onUnban(name))}>
                  Unban
                </button>
              ) : (
                <button type="button" onClick={() => go(() => onBan(name))}>
                  Ban
                </button>
              )}
              <button type="button" onClick={() => go(() => onSilence(name, !quiet))}>
                {quiet ? "Unsilence" : "Perm mute"}
              </button>
              {house && (
                <button type="button" onClick={() => go(() => onPass(name))}>
                  Pass operator
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Line({
  message,
  onName,
}: {
  message: ChatMessage;
  onName: (name: string, e: React.MouseEvent) => void;
}) {
  if (message.kind === "system") {
    return <div className="line-system">{message.text}</div>;
  }
  return (
    <div className="line-chat">
      <span className="who" onContextMenu={(e) => onName(message.from, e)}>
        {message.from}:
      </span>{" "}
      {message.text}
    </div>
  );
}
