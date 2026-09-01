import { useCallback, useEffect, useRef, useState } from "react";
import BfList from "./BfList";
import Tagline from "./Tagline";
import ChatRoom from "./ChatRoom";
import Directory from "./Directory";
import Games from "./Games";
import GameTable from "./GameTable";
import PrivateChat from "./PrivateChat";
import SignOn from "./SignOn";
import type { GameId } from "./games/catalog";
import type { BfEntry, ClientEvent, ImMessage, JoinedRoom, RoomSummary } from "./types";

type ImThread = {
  peer: string;
  messages: ImMessage[];
  x: number;
  y: number;
  z: number;
};

let zCounter = 6;

export default function App() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [screenName, setScreenName] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<JoinedRoom | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [ims, setIms] = useState<ImThread[]>([]);
  const [bfList, setBfList] = useState<BfEntry[]>([]);
  const [mutes, setMutes] = useState<string[]>([]);
  const [away, setAway] = useState(false);
  const [awayMessage, setAwayMessage] = useState("I'm away.");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState("");
  const [imDrafts, setImDrafts] = useState<Record<string, string>>({});
  const [bfAdd, setBfAdd] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomBlurb, setNewRoomBlurb] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [focus, setFocus] = useState("signon");
  const [signPos, setSignPos] = useState({ x: 260, y: 72, z: 6 });
  const [bfPos, setBfPos] = useState({ x: 16, y: 16, z: 3 });
  const [dirPos, setDirPos] = useState({ x: 258, y: 16, z: 4 });
  const [roomPos, setRoomPos] = useState({ x: 200, y: 40, z: 5 });
  const [gamesOpen, setGamesOpen] = useState(false);
  const [gamesPos, setGamesPos] = useState({ x: 480, y: 40, z: 6 });
  const [tables, setTables] = useState<{ id: string; game: GameId; x: number; y: number; z: number }[]>([]);

  const screenNameRef = useRef(screenName);
  screenNameRef.current = screenName;
  const mutesRef = useRef(mutes);
  mutesRef.current = mutes;

  const send = useCallback((payload: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }, []);

  const openPrivate = useCallback((peer: string, seed?: ImMessage) => {
    setIms((prev) => {
      const existing = prev.find((t) => t.peer.toLowerCase() === peer.toLowerCase());
      if (existing) {
        setFocus(existing.peer);
        return prev.map((t) =>
          t.peer.toLowerCase() === peer.toLowerCase()
            ? {
                ...t,
                z: ++zCounter,
                messages:
                  seed && !t.messages.some((m) => m.id === seed.id) ? [...t.messages, seed] : t.messages,
              }
            : t,
        );
      }
      setFocus(peer);
      return [
        ...prev,
        {
          peer,
          messages: seed ? [seed] : [],
          x: 420 + prev.length * 22,
          y: 90 + prev.length * 22,
          z: ++zCounter,
        },
      ];
    });
  }, []);

  useEffect(() => {
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let ws: WebSocket | undefined;

    const proto = location.protocol === "https:" ? "wss:" : "ws:";

    function connect() {
      ws = new WebSocket(`${proto}//${location.host}/ws`);
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true);
        const token = localStorage.getItem("chat56k.token") || localStorage.getItem("chat99.token");
        if (token) ws?.send(JSON.stringify({ type: "resume", token }));
      };
      ws.onclose = () => {
        setConnected(false);
        if (!stopped) retry = setTimeout(connect, 1200);
      };
      ws.onerror = () => setError("Could not reach the chat56k server.");
      ws.onmessage = (ev) => {
        const msg = JSON.parse(String(ev.data)) as ClientEvent;
        if (msg.type === "error") {
          if (msg.code === "BAD_TOKEN") {
            localStorage.removeItem("chat56k.token");
            localStorage.removeItem("chat99.token");
            setScreenName(null);
            setRoom(null);
            setIms([]);
            setBfList([]);
          }
          setError(msg.message);
          return;
        }
      if (msg.type === "signed_on") {
        localStorage.setItem("chat56k.token", msg.token);
        localStorage.removeItem("chat99.token");
        setError("");
        setScreenName(msg.screenName);
        setRooms(msg.rooms);
        setBfList(msg.bfList);
        setMutes(msg.mutes);
        setAway(msg.away);
        setAwayMessage(msg.awayMessage || "I'm away.");
        if (!msg.roomId) setRoom(null);
        if (!screenNameRef.current) {
          setSelectedRoomId(msg.rooms[0]?.id ?? null);
          setFocus("dir");
        }
        document.title = `chat56k — ${msg.screenName}`;
        return;
      }
      if (msg.type === "rooms") {
        setRooms(msg.rooms);
        return;
      }
      if (msg.type === "joined") {
        setError("");
        setRoom(msg.room);
        setSelectedMember(null);
        setFocus("room");
        setRoomPos((p) => ({ ...p, z: ++zCounter }));
        document.title = `${msg.room.name} — chat56k`;
        return;
      }
      if (msg.type === "room_event") {
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                members: msg.members,
                operator: msg.operator,
                bans: msg.operator === prev.you ? msg.bans : [],
                messages: [...prev.messages, msg.message].slice(-200),
              }
            : prev,
        );
        return;
      }
      if (msg.type === "room_state") {
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                members: msg.members,
                operator: msg.operator,
                bans: msg.operator === prev.you ? msg.bans : [],
              }
            : prev,
        );
        return;
      }
      if (msg.type === "im") {
        const you = screenNameRef.current;
        if (!you) return;
        if (mutesRef.current.some((n) => n.toLowerCase() === msg.from.toLowerCase()) && msg.from !== you) {
          return;
        }
        const peer = msg.from.toLowerCase() === you.toLowerCase() ? msg.to : msg.from;
        openPrivate(peer, msg);
        return;
      }
      if (msg.type === "bf_list") {
        setBfList(msg.bfList);
        return;
      }
      if (msg.type === "mutes") {
        setMutes(msg.mutes);
        return;
      }
      if (msg.type === "away") {
        setAway(msg.away);
        setAwayMessage(msg.awayMessage || "I'm away.");
        return;
      }
      if (msg.type === "kicked" || msg.type === "banned") {
        setRoom(null);
        setFocus("dir");
        setNotice(
          msg.type === "kicked"
            ? `${msg.by} removed you from ${msg.roomName}.`
            : `${msg.by} banned you from ${msg.roomName}.`,
        );
        return;
      }
      if (msg.type === "report_ok") {
        setReportReason("");
        setNotice(`Report on ${msg.target} was filed.`);
      }
      };
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, [openPrivate]);

  const inRooms = rooms.reduce((n, r) => n + r.count, 0);

  return (
    <div className="desktop">
      <img className="desktop-logo" src="/logo.png" alt="" />
      <div className="desktop-mark">
        <div className="tag">
          <Tagline />
        </div>
      </div>

      {!screenName && (
        <SignOn
          connected={connected}
          error={error}
          x={signPos.x}
          y={signPos.y}
          z={signPos.z}
          onFocus={() => {
            setFocus("signon");
            setSignPos((p) => ({ ...p, z: ++zCounter }));
          }}
          onMove={(x, y) => setSignPos((p) => ({ ...p, x, y }))}
          onSignOn={(name, password) => {
            setError("");
            send({ type: "sign_on", screenName: name, password });
          }}
          onCreate={(name, password, attest18) => {
            setError("");
            send({ type: "create_account", screenName: name, password, attest18 });
          }}
          onClearError={() => setError("")}
        />
      )}

      {screenName && (
        <>
          <BfList
            you={screenName}
            list={bfList}
            away={away}
            awayMessage={awayMessage}
            addName={bfAdd}
            error={focus === "bf" ? error : ""}
            x={bfPos.x}
            y={bfPos.y}
            z={bfPos.z}
            onFocus={() => {
              setFocus("bf");
              setBfPos((p) => ({ ...p, z: ++zCounter }));
            }}
            onMove={(x, y) => setBfPos((p) => ({ ...p, x, y }))}
            onAddName={setBfAdd}
            onAdd={() => {
              send({ type: "add_bf", screenName: bfAdd });
              setBfAdd("");
            }}
            onRemove={(name) => send({ type: "remove_bf", screenName: name })}
            onOpen={(name) => openPrivate(name)}
            onAway={(next, message) => send({ type: "set_away", away: next, message })}
            onAwayMessage={setAwayMessage}
          />
          <Directory
            you={screenName}
            rooms={rooms}
            selectedId={selectedRoomId}
            newName={newRoomName}
            newBlurb={newRoomBlurb}
            error={focus === "dir" ? error : ""}
            x={dirPos.x}
            y={dirPos.y}
            z={dirPos.z}
            onFocus={() => {
              setFocus("dir");
              setDirPos((p) => ({ ...p, z: ++zCounter }));
            }}
            onMove={(x, y) => setDirPos((p) => ({ ...p, x, y }))}
            onSelect={(id) => {
              setSelectedRoomId(id);
              setError("");
            }}
            onEnter={(id) => send({ type: "join_room", roomId: id })}
            onNewName={setNewRoomName}
            onNewBlurb={setNewRoomBlurb}
            onCreate={() => {
              send({ type: "create_room", name: newRoomName, blurb: newRoomBlurb });
              setNewRoomName("");
              setNewRoomBlurb("");
            }}
          />
        </>
      )}

      {room && screenName && (
        <ChatRoom
          room={room}
          you={screenName}
          selectedMember={selectedMember}
          draft={draft}
          reportReason={reportReason}
          mutes={mutes}
          error={focus === "room" ? error : ""}
          x={roomPos.x}
          y={roomPos.y}
          z={roomPos.z}
          onFocus={() => {
            setFocus("room");
            setRoomPos((p) => ({ ...p, z: ++zCounter }));
          }}
          onMove={(x, y) => setRoomPos((p) => ({ ...p, x, y }))}
          onClose={() => {
            send({ type: "leave_room" });
            setRoom(null);
            setFocus("dir");
          }}
          onSelectMember={setSelectedMember}
          onPrivate={(name) => openPrivate(name)}
          onDraft={setDraft}
          onSay={(e) => {
            e.preventDefault();
            const text = draft.trim();
            if (!text) return;
            send({ type: "say", text });
            setDraft("");
          }}
          onAddBf={(name) => send({ type: "add_bf", screenName: name })}
          onMute={(name, on) => send({ type: on ? "mute" : "unmute", screenName: name })}
          onKick={(name) => send({ type: "kick", screenName: name })}
          onBan={(name) => send({ type: "ban", screenName: name })}
          onUnban={(name) => send({ type: "unban", screenName: name })}
          onPass={(name) => send({ type: "pass_op", screenName: name })}
          onReportReason={setReportReason}
          onReport={(name) => send({ type: "report", screenName: name, reason: reportReason })}
        />
      )}

      {screenName &&
        ims.map((thread) => (
          <PrivateChat
            key={thread.peer}
            you={screenName}
            thread={thread}
            draft={imDrafts[thread.peer] ?? ""}
            connected={connected}
            error={focus === thread.peer ? error : ""}
            onFocus={() => {
              setFocus(thread.peer);
              setIms((prev) =>
                prev.map((t) => (t.peer === thread.peer ? { ...t, z: ++zCounter } : t)),
              );
            }}
            onMove={(x, y) =>
              setIms((prev) => prev.map((t) => (t.peer === thread.peer ? { ...t, x, y } : t)))
            }
            onClose={() => setIms((prev) => prev.filter((t) => t.peer !== thread.peer))}
            onDraft={(text) => setImDrafts((d) => ({ ...d, [thread.peer]: text }))}
            onSend={() => {
              const text = (imDrafts[thread.peer] ?? "").trim();
              if (!text) return;
              send({ type: "im", to: thread.peer, text });
              setImDrafts((d) => ({ ...d, [thread.peer]: "" }));
            }}
          />
        ))}

      {screenName && gamesOpen && (
        <Games
          x={gamesPos.x}
          y={gamesPos.y}
          z={gamesPos.z}
          onFocus={() => {
            setFocus("games");
            setGamesPos((p) => ({ ...p, z: ++zCounter }));
          }}
          onMove={(x, y) => setGamesPos((p) => ({ ...p, x, y }))}
          onClose={() => setGamesOpen(false)}
          onPlay={(game) => {
            setTables((prev) => [
              ...prev,
              {
                id: `${game}-${Date.now()}`,
                game,
                x: 120 + prev.length * 18,
                y: 70 + prev.length * 18,
                z: ++zCounter,
              },
            ]);
          }}
        />
      )}

      {tables.map((t) => (
        <GameTable
          key={t.id}
          id={t.id}
          game={t.game}
          x={t.x}
          y={t.y}
          z={t.z}
          onFocus={() => {
            setFocus(t.id);
            setTables((prev) => prev.map((g) => (g.id === t.id ? { ...g, z: ++zCounter } : g)));
          }}
          onMove={(x, y) => setTables((prev) => prev.map((g) => (g.id === t.id ? { ...g, x, y } : g)))}
          onClose={() => setTables((prev) => prev.filter((g) => g.id !== t.id))}
        />
      ))}

      {notice && (
        <div className="notice-modal">
          <div className="window" style={{ width: 320 }}>
            <div className="title-bar">
              <div className="title-bar-text">chat56k</div>
            </div>
            <div className="window-body pad">
              <p className="hint" style={{ marginBottom: 12 }}>
                {notice}
              </p>
              <div className="signon-actions">
                <button type="button" onClick={() => setNotice("")}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="status-bar">
        <div className="grip" />
        <span>{connected ? (screenName ? `Signed on as ${screenName}` : "Connected") : "Not connected"}</span>
        {screenName && (
          <button type="button" onClick={() => setGamesOpen(true)}>
            Games
          </button>
        )}
        <span style={{ marginLeft: "auto" }}>{screenName ? `${inRooms} in rooms` : "18+  ·  no email"}</span>
      </div>
    </div>
  );
}
