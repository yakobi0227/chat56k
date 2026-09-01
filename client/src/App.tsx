import { useCallback, useEffect, useRef, useState } from "react";
import BfList from "./BfList";
import Tagline from "./Tagline";
import ChatRoom from "./ChatRoom";
import DonateJar from "./DonateJar";
import Flag from "./Flag";
import Directory from "./Directory";
import Games, { type TableInfo } from "./Games";
import GameTable from "./GameTable";
import PrivateChat from "./PrivateChat";
import Profile, { type ProfileInfo } from "./Profile";
import SignOn from "./SignOn";
import { GAMES, type GameId } from "./games/catalog";
import type { BfEntry, ClientEvent, ImMessage, JoinedRoom, RoomSummary } from "./types";
import { hasAttest, lastScreenName, loadVault, rememberAttest, saveVault } from "./vault";

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
  const [flagName, setFlagName] = useState<string | null>(null);
  const [focus, setFocus] = useState("signon");
  const [signPos, setSignPos] = useState({ x: 260, y: 72, z: 6 });
  const [bfPos, setBfPos] = useState({ x: 16, y: 16, z: 3 });
  const [dirPos, setDirPos] = useState({ x: 258, y: 16, z: 4 });
  const [roomPos, setRoomPos] = useState({ x: 200, y: 40, z: 5 });
  const [gamesOpen, setGamesOpen] = useState(false);
  const [gamesPos, setGamesPos] = useState({ x: 480, y: 40, z: 6 });
  const [tables, setTables] = useState<{ id: string; game: GameId; x: number; y: number; z: number }[]>([]);
  const [gameTables, setGameTables] = useState<TableInfo[]>([]);
  const [gameStates, setGameStates] = useState<Record<string, Record<string, unknown>>>({});
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [profilePos, setProfilePos] = useState({ x: 300, y: 80, z: 8 });
  const [jar, setJar] = useState(false);
  const [gameInvite, setGameInvite] = useState<{ from: string; tableId: string; kind: string; names: string[] } | null>(
    null,
  );

  const screenNameRef = useRef(screenName);
  screenNameRef.current = screenName;
  const mutesRef = useRef(mutes);
  mutesRef.current = mutes;
  const pendingSign = useRef<{ screenName: string; password: string } | null>(null);
  const restoreVault = useRef(false);

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
          if (msg.code === "NO_USER") {
            const pending = pendingSign.current;
            const vault = loadVault();
            if (
              pending &&
              hasAttest() &&
              vault &&
              vault.screenName.toLowerCase() === pending.screenName.toLowerCase()
            ) {
              restoreVault.current = true;
              ws?.send(
                JSON.stringify({
                  type: "create_account",
                  screenName: pending.screenName,
                  password: pending.password,
                  attest18: true,
                }),
              );
              return;
            }
          }
          setError(msg.message);
          return;
        }
      if (msg.type === "signed_on") {
        localStorage.setItem("chat56k.token", msg.token);
        localStorage.removeItem("chat99.token");
        rememberAttest();
        setError("");
        setScreenName(msg.screenName);
        setRooms(msg.rooms);
        setBfList(msg.bfList);
        setMutes(msg.mutes);
        setAway(msg.away);
        setAwayMessage(msg.awayMessage || "I'm away.");
        if (msg.games) setGameTables(msg.games as TableInfo[]);
        if (!msg.roomId) setRoom(null);
        const vault = loadVault();
        const same = vault && vault.screenName.toLowerCase() === msg.screenName.toLowerCase();
        if (restoreVault.current && same && vault) {
          restoreVault.current = false;
          if (vault.bio) send({ type: "set_profile", bio: vault.bio });
          for (const name of vault.bfList) send({ type: "add_bf", screenName: name });
          for (const name of vault.mutes) send({ type: "mute", screenName: name });
        } else if (same && vault && !(msg.bio || "") && vault.bio) {
          send({ type: "set_profile", bio: vault.bio });
        }
        saveVault({
          screenName: msg.screenName,
          bio: msg.bio || (same && vault ? vault.bio : ""),
          bfList: msg.bfList.map((e) => e.screenName),
          mutes: msg.mutes,
        });
        if (!screenNameRef.current) {
          setSelectedRoomId(msg.rooms[0]?.id ?? null);
          setFocus("dir");
          const hideUntil = Number(localStorage.getItem("chat56k.jar") || 0);
          if (Date.now() > hideUntil) {
            window.setTimeout(() => setJar(true), 2500);
          }
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
                bans: msg.operator === prev.you || prev.createdBy === prev.you ? msg.bans : [],
                silenced: msg.operator === prev.you || prev.createdBy === prev.you ? msg.silenced ?? [] : [],
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
                bans: msg.operator === prev.you || prev.createdBy === prev.you ? msg.bans : [],
                silenced: msg.operator === prev.you || prev.createdBy === prev.you ? msg.silenced ?? [] : [],
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
        const you = screenNameRef.current;
        if (you) saveVault({ screenName: you, bfList: msg.bfList.map((e) => e.screenName) });
        return;
      }
      if (msg.type === "mutes") {
        setMutes(msg.mutes);
        const you = screenNameRef.current;
        if (you) saveVault({ screenName: you, mutes: msg.mutes });
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
        setNotice(`Flagged ${msg.target}${msg.reason ? ` — ${msg.reason}` : ""}.`);
        return;
      }
      if (msg.type === "silenced_ok") {
        setNotice(
          msg.on
            ? `${msg.target} is perm muted. They can stay. Nobody else will see their room lines or IMs.`
            : `${msg.target} can be heard again.`,
        );
        return;
      }
      if (msg.type === "game_tables") {
        setGameTables(msg.tables as TableInfo[]);
        return;
      }
      if (msg.type === "game_invite") {
        setGameInvite({ from: msg.from, tableId: msg.tableId, kind: msg.kind, names: msg.names });
        return;
      }
      if (msg.type === "invite_ok") {
        setNotice(`Invite sent to ${msg.target}.`);
        return;
      }
      if (msg.type === "game_boot") {
        setTables((prev) => prev.filter((t) => t.id !== msg.tableId));
        setGameStates((s) => {
          const n = { ...s };
          delete n[msg.tableId];
          return n;
        });
        setNotice(`${msg.by || "The host"} sat a CPU in your chair.`);
        return;
      }
      if (msg.type === "profile") {
        setProfile({
          screenName: msg.screenName,
          bio: msg.bio,
          away: msg.away,
          awayMessage: msg.awayMessage,
          signedOn: msg.signedOn,
        });
        if (screenNameRef.current && msg.screenName.toLowerCase() === screenNameRef.current.toLowerCase()) {
          saveVault({ screenName: msg.screenName, bio: msg.bio });
        }
        setProfilePos((p) => ({ ...p, z: ++zCounter }));
        return;
      }
      if (msg.type === "game_state") {
        const st = msg as Record<string, unknown>;
        setGameStates((prev) => ({ ...prev, [msg.tableId]: st }));
        setTables((prev) => {
          if (prev.some((t) => t.id === msg.tableId)) return prev;
          return [
            ...prev,
            {
              id: msg.tableId,
              game: msg.kind as GameId,
              x: 140 + prev.length * 16,
              y: 72 + prev.length * 16,
              z: ++zCounter,
            },
          ];
        });
        setGamesOpen(true);
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
          lastName={lastScreenName()}
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
            pendingSign.current = { screenName: name, password };
            send({ type: "sign_on", screenName: name, password });
          }}
          onCreate={(name, password, attest18) => {
            setError("");
            rememberAttest();
            pendingSign.current = { screenName: name, password };
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
            onInfo={(name) => send({ type: "get_profile", screenName: name })}
            onMute={(name, on) => send({ type: on ? "mute" : "unmute", screenName: name })}
            mutes={mutes}
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
          onInfo={(name) => send({ type: "get_profile", screenName: name })}
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
          onSilence={(name, on) => send({ type: on ? "silence" : "unsilence", screenName: name })}
          onPass={(name) => send({ type: "pass_op", screenName: name })}
          onFlag={(name) => setFlagName(name)}
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
            muted={mutes.some((n) => n.toLowerCase() === thread.peer.toLowerCase())}
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
            onMute={(on) => send({ type: on ? "mute" : "unmute", screenName: thread.peer })}
            onFlag={() => setFlagName(thread.peer)}
          />
        ))}

      {screenName && gamesOpen && (
        <Games
          x={gamesPos.x}
          y={gamesPos.y}
          z={gamesPos.z}
          tables={gameTables}
          onFocus={() => {
            setFocus("games");
            setGamesPos((p) => ({ ...p, z: ++zCounter }));
          }}
          onMove={(x, y) => setGamesPos((p) => ({ ...p, x, y }))}
          onClose={() => setGamesOpen(false)}
          onCreate={(kind) => {
            if (kind === "war") {
              setTables((prev) => [
                ...prev,
                { id: `war-${Date.now()}`, game: "war", x: 120, y: 70, z: ++zCounter },
              ]);
              return;
            }
            send({ type: "create_game", kind });
          }}
          onJoin={(id) => send({ type: "join_game", tableId: id })}
        />
      )}

      {tables.map((t) => (
        <GameTable
          key={t.id}
          id={t.id}
          game={t.game}
          you={screenName || ""}
          people={[
            ...bfList.map((e) => e.screenName),
            ...(room?.members.map((m) => m.name) ?? []),
          ].filter((n, i, a) => n !== screenName && a.indexOf(n) === i)}
          state={gameStates[t.id] ?? null}
          x={t.x}
          y={t.y}
          z={t.z}
          onFocus={() => {
            setFocus(t.id);
            setTables((prev) => prev.map((g) => (g.id === t.id ? { ...g, z: ++zCounter } : g)));
          }}
          onMove={(x, y) => setTables((prev) => prev.map((g) => (g.id === t.id ? { ...g, x, y } : g)))}
          onClose={() => {
            if (t.game !== "war") send({ type: "leave_game" });
            setTables((prev) => prev.filter((g) => g.id !== t.id));
            setGameStates((s) => {
              const n = { ...s };
              delete n[t.id];
              return n;
            });
          }}
          onInput={(x, y) => send({ type: "game_input", x, y })}
          onAction={(msg) => send({ type: "game_action", ...msg })}
          onInvite={(name) => send({ type: "invite_game", screenName: name })}
          onAddCpu={() => send({ type: "add_cpu" })}
          onToCpu={(name) => send({ type: "to_cpu", screenName: name })}
        />
      ))}

      {screenName && profile && (
        <Profile
          you={screenName}
          profile={profile}
          x={profilePos.x}
          y={profilePos.y}
          z={profilePos.z}
          onFocus={() => setProfilePos((p) => ({ ...p, z: ++zCounter }))}
          onMove={(x, y) => setProfilePos((p) => ({ ...p, x, y }))}
          onClose={() => setProfile(null)}
          onSave={(bio) => {
            send({ type: "set_profile", bio });
            if (profile) saveVault({ screenName: profile.screenName, bio });
          }}
          muted={mutes.some((n) => n.toLowerCase() === profile.screenName.toLowerCase())}
          onMute={(on) => send({ type: on ? "mute" : "unmute", screenName: profile.screenName })}
          onFlag={() => setFlagName(profile.screenName)}
        />
      )}

      {screenName && gameInvite && (
        <div className="notice-modal">
          <div className="window" style={{ width: 340 }}>
            <div className="title-bar">
              <div className="title-bar-text">Game invite</div>
            </div>
            <div className="window-body pad">
              <p className="hint" style={{ marginBottom: 12 }}>
                {gameInvite.from} wants you at {GAMES.find((g) => g.id === gameInvite.kind)?.name || gameInvite.kind}.
                {gameInvite.names.length ? ` Seated: ${gameInvite.names.join(", ")}.` : ""}
              </p>
              <div className="signon-actions">
                <button
                  type="button"
                  onClick={() => {
                    send({ type: "join_game", tableId: gameInvite.tableId });
                    setGameInvite(null);
                  }}
                >
                  Sit
                </button>
                <button type="button" onClick={() => setGameInvite(null)}>
                  Nah
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {screenName && flagName && (
        <Flag
          screenName={flagName}
          onClose={() => setFlagName(null)}
          onSubmit={(reason, note, alsoMute) => {
            send({ type: "report", screenName: flagName, reason, note });
            if (alsoMute) send({ type: "mute", screenName: flagName });
            setFlagName(null);
          }}
        />
      )}

      {screenName && jar && (
        <DonateJar
          onClose={() => {
            localStorage.setItem("chat56k.jar", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
            setJar(false);
          }}
        />
      )}

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
          <>
            <button type="button" onClick={() => setJar(true)}>
              Jar
            </button>
            <button
              type="button"
              onClick={() => send({ type: "get_profile", screenName })}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => {
                setGamesOpen(true);
                send({ type: "list_games" });
              }}
            >
              Games
            </button>
          </>
        )}
        <span style={{ marginLeft: "auto" }}>{screenName ? `${inRooms} in rooms` : "18+  ·  no email"}</span>
      </div>
    </div>
  );
}
