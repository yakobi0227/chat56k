import http from "node:http";
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { WebSocketServer, WebSocket } from "ws";
import { findRoomMeta, findUser, findUserByToken, loadStore, saveStore } from "./store.js";
import { servePublic } from "./static.js";
import { handleGame, initGames, leaveTable, listTables } from "./games.js";

const scryptAsync = promisify(scrypt);
const PORT = Number(process.env.PORT) || 3999;
const ROOM_CAP = 23;
const NAME_RE = /^[A-Za-z][A-Za-z0-9]{2,15}$/;
const ROOM_NAME_RE = /^[A-Za-z][A-Za-z0-9 ]{2,23}$/;
const MAX_MESSAGE = 400;
const MAX_ROOMS_PER_USER = 8;
const MAX_ROOMS = 200;

const db = loadStore();

/** @typedef {{ id: string, name: string, blurb: string, house: boolean, createdBy: string, members: Map<string, number>, messages: object[], operator: string | null }} LiveRoom */

/** @type {Map<string, LiveRoom>} */
const rooms = new Map();
for (const meta of db.rooms) {
  rooms.set(meta.id, liveFromMeta(meta));
}

/** @type {Map<WebSocket, { id: string, screenName: string, roomId: string | null, away: boolean, awayMessage: string }>} */
const sessions = new Map();
/** @type {Map<string, WebSocket>} */
const byName = new Map();

/** @type {Map<string, { timer: ReturnType<typeof setTimeout>, session: object }>} */
const ghosts = new Map();
const RESUME_MS = 20_000;

const server = http.createServer((req, res) => {
  servePublic(req, res);
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const path = req.url?.split("?")[0];
  if (path === "/ws") {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    return;
  }
  socket.destroy();
});

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      send(ws, { type: "error", code: "BAD_JSON", message: "That didn't send." });
      return;
    }
    handle(ws, msg).catch((err) => {
      console.error(err);
      send(ws, { type: "error", code: "SERVER", message: "chat56k hit a snag. Try again." });
    });
  });
  ws.on("close", () => disconnect(ws));
  ws.on("error", () => disconnect(ws));
});

async function handle(ws, msg) {
  const session = sessions.get(ws);
  if (session && handleGame(ws, session, msg)) return;
  switch (msg?.type) {
    case "create_account":
      return createAccount(ws, msg);
    case "sign_on":
      return signOn(ws, msg);
    case "resume":
      return resume(ws, msg.token);
    case "list_rooms":
      if (!session) return needSignOn(ws);
      return send(ws, { type: "rooms", rooms: listRooms() });
    case "create_room":
      if (!session) return needSignOn(ws);
      return createRoom(ws, session, msg);
    case "join_room":
      if (!session) return needSignOn(ws);
      return joinRoom(ws, session, msg.roomId);
    case "leave_room":
      if (!session) return needSignOn(ws);
      return leaveRoom(session, { announce: true });
    case "say":
      if (!session) return needSignOn(ws);
      return say(ws, session, msg.text);
    case "im":
      if (!session) return needSignOn(ws);
      return sendIm(ws, session, msg.to, msg.text);
    case "add_bf":
      if (!session) return needSignOn(ws);
      return addBf(ws, session, msg.screenName);
    case "remove_bf":
      if (!session) return needSignOn(ws);
      return removeBf(ws, session, msg.screenName);
    case "mute":
      if (!session) return needSignOn(ws);
      return muteSn(ws, session, msg.screenName, true);
    case "unmute":
      if (!session) return needSignOn(ws);
      return muteSn(ws, session, msg.screenName, false);
    case "set_away":
      if (!session) return needSignOn(ws);
      return setAway(session, msg.away, msg.message);
    case "kick":
      if (!session) return needSignOn(ws);
      return kick(ws, session, msg.screenName);
    case "ban":
      if (!session) return needSignOn(ws);
      return ban(ws, session, msg.screenName);
    case "unban":
      if (!session) return needSignOn(ws);
      return unban(ws, session, msg.screenName);
    case "pass_op":
      if (!session) return needSignOn(ws);
      return passOp(ws, session, msg.screenName);
    case "report":
      if (!session) return needSignOn(ws);
      return report(ws, session, msg.screenName, msg.reason);
    default:
      send(ws, { type: "error", code: "UNKNOWN", message: "Unknown request." });
  }
}

async function createAccount(ws, msg) {
  if (sessions.has(ws)) {
    send(ws, { type: "error", code: "ALREADY_ON", message: "You are already signed on." });
    return;
  }
  const name = String(msg.screenName || "").trim();
  if (!NAME_RE.test(name)) {
    send(ws, {
      type: "error",
      code: "BAD_NAME",
      message: "Screen names must be 3–16 characters, start with a letter, and use only letters and numbers.",
    });
    return;
  }
  if (!msg.attest18) {
    send(ws, {
      type: "error",
      code: "AGE",
      message: "You must confirm you are 18 or older to use chat56k.",
    });
    return;
  }
  const password = String(msg.password || "");
  if (password.length < 4 || password.length > 32) {
    send(ws, {
      type: "error",
      code: "BAD_PASS",
      message: "Password must be 4–32 characters. No email needed.",
    });
    return;
  }
  if (findUser(db, name)) {
    send(ws, {
      type: "error",
      code: "NAME_TAKEN",
      message: "That screen name is already registered.",
    });
    return;
  }
  db.users.push({
    screenName: name,
    password: await hashPassword(password),
    sessionToken: newToken(),
    attest18: true,
    attestAt: Date.now(),
    createdAt: Date.now(),
    bfList: [],
    mutes: [],
  });
  saveStore(db);
  attach(ws, name);
}

async function signOn(ws, msg) {
  if (sessions.has(ws)) {
    send(ws, { type: "error", code: "ALREADY_ON", message: "You are already signed on." });
    return;
  }
  const name = String(msg.screenName || "").trim();
  const user = findUser(db, name);
  if (!user) {
    send(ws, {
      type: "error",
      code: "NO_USER",
      message: "No screen name by that spelling. Create one first.",
    });
    return;
  }
  if (!(await checkPassword(String(msg.password || ""), user.password))) {
    send(ws, {
      type: "error",
      code: "BAD_PASS",
      message: "That password does not match this screen name.",
    });
    return;
  }
  attach(ws, user.screenName);
}

function resume(ws, token) {
  if (sessions.has(ws)) return;
  const user = findUserByToken(db, token);
  if (!user) {
    send(ws, { type: "error", code: "BAD_TOKEN", message: "Sign on again." });
    return;
  }
  attach(ws, user.screenName);
}

function attach(ws, screenName) {
  const ghost = ghosts.get(screenName);
  if (ghost) {
    clearTimeout(ghost.timer);
    ghosts.delete(screenName);
    ghost.session.replaced = false;
    sessions.set(ws, ghost.session);
    byName.set(screenName, ws);
    send(ws, bootstrap(ghost.session));
    if (ghost.session.roomId) {
      const room = rooms.get(ghost.session.roomId);
      if (room) send(ws, snapshot(room, screenName));
    }
    broadcastPresence(screenName);
    return;
  }

  const live = findByName(screenName);
  if (live && live !== ws) {
    const current = sessions.get(live);
    if (current) {
      current.replaced = true;
      sessions.delete(live);
      try {
        live.close();
      } catch {
        /* ignore */
      }
      current.replaced = false;
      sessions.set(ws, current);
      byName.set(screenName, ws);
      send(ws, bootstrap(current));
      if (current.roomId) {
        const room = rooms.get(current.roomId);
        if (room) send(ws, snapshot(room, screenName));
      }
      return;
    }
  }

  const session = {
    id: randomUUID(),
    screenName,
    roomId: null,
    away: false,
    awayMessage: "",
    replaced: false,
  };
  sessions.set(ws, session);
  byName.set(screenName, ws);
  send(ws, bootstrap(session));
  broadcastPresence(screenName);
}

function createRoom(ws, session, msg) {
  const name = String(msg.name || "").replace(/\s+/g, " ").trim();
  if (!ROOM_NAME_RE.test(name)) {
    send(ws, {
      type: "error",
      code: "BAD_ROOM",
      message: "Room names must be 3–24 characters, start with a letter, and use letters, numbers, and spaces.",
    });
    return;
  }
  if (db.rooms.length >= MAX_ROOMS) {
    send(ws, { type: "error", code: "ROOM_LIMIT", message: "The directory is full." });
    return;
  }
  const owned = db.rooms.filter((r) => r.createdBy.toLowerCase() === session.screenName.toLowerCase()).length;
  if (owned >= MAX_ROOMS_PER_USER) {
    send(ws, {
      type: "error",
      code: "ROOM_LIMIT",
      message: `You can create up to ${MAX_ROOMS_PER_USER} rooms.`,
    });
    return;
  }
  if (db.rooms.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
    send(ws, { type: "error", code: "ROOM_EXISTS", message: "A room with that name is already on the directory." });
    return;
  }
  const id = slug(name);
  const meta = {
    id,
    name,
    blurb: cleanText(msg.blurb || "User room.") || "User room.",
    house: false,
    createdBy: session.screenName,
    bans: [],
  };
  db.rooms.push(meta);
  saveStore(db);
  rooms.set(id, liveFromMeta(meta));
  broadcastDirectory();
  joinRoom(ws, session, id);
}

function joinRoom(ws, session, roomId) {
  const room = rooms.get(roomId);
  const meta = findRoomMeta(db, roomId);
  if (!room || !meta) {
    send(ws, { type: "error", code: "NO_ROOM", message: "That room is not on the directory." });
    return;
  }
  if (isBanned(meta, session.screenName)) {
    send(ws, { type: "error", code: "BANNED", message: "You are not allowed in that room." });
    return;
  }
  if (session.roomId === room.id) {
    send(ws, snapshot(room, session.screenName));
    return;
  }
  if (room.members.size >= ROOM_CAP && !room.members.has(session.screenName)) {
    send(ws, { type: "error", code: "ROOM_FULL", message: "This room is full (23)." });
    return;
  }
  if (session.roomId) leaveRoom(session, { announce: true });

  room.members.set(session.screenName, Date.now());
  session.roomId = room.id;
  if (!room.operator) room.operator = session.screenName;

  const entered = systemLine(`${session.screenName} has entered the room.`);
  pushMessage(room, entered);
  emitRoom(room, entered, session.screenName);
  broadcastDirectory();
  send(ws, snapshot(room, session.screenName));
}

function leaveRoom(session, { announce }) {
  if (!session.roomId) return;
  const room = rooms.get(session.roomId);
  session.roomId = null;
  if (!room) return;

  room.members.delete(session.screenName);
  if (room.operator === session.screenName) {
    room.operator = oldestMember(room);
  }
  if (announce) {
    announceRoom(room, `${session.screenName} has left the room.`);
    if (room.operator && room.members.size > 0) {
      announceRoom(room, `${room.operator} is now the room operator.`);
    }
  } else {
    emitRoom(room);
  }
  broadcastDirectory();
}

function say(ws, session, text) {
  const room = session.roomId ? rooms.get(session.roomId) : null;
  if (!room) {
    send(ws, { type: "error", code: "NOT_IN_ROOM", message: "Join a room first." });
    return;
  }
  const body = cleanText(text);
  if (!body) return;
  const message = {
    id: randomUUID(),
    kind: "chat",
    from: session.screenName,
    text: body,
    ts: Date.now(),
  };
  pushMessage(room, message);
  emitRoom(room, message);
}

function sendIm(ws, session, to, text) {
  const targetName = String(to || "").trim();
  if (!targetName) return;
  if (targetName.toLowerCase() === session.screenName.toLowerCase()) {
    send(ws, { type: "error", code: "IM_SELF", message: "You cannot private-chat yourself." });
    return;
  }
  const targetWs = findByName(targetName);
  if (!targetWs) {
    send(ws, { type: "error", code: "NOT_ONLINE", message: `${targetName} is not signed on.` });
    return;
  }
  const targetSession = sessions.get(targetWs);
  const body = cleanText(text);
  if (!body) return;

  const payload = {
    type: "im",
    from: session.screenName,
    to: targetSession.screenName,
    text: body,
    ts: Date.now(),
    id: randomUUID(),
  };
  send(ws, payload);
  if (!isMuted(targetSession.screenName, session.screenName)) {
    send(targetWs, payload);
  }
}

function addBf(ws, session, screenName) {
  const name = canonicalName(screenName);
  if (!name) {
    send(ws, { type: "error", code: "NO_USER", message: "No screen name by that spelling." });
    return;
  }
  if (name.toLowerCase() === session.screenName.toLowerCase()) {
    send(ws, { type: "error", code: "BF_SELF", message: "You are already on your own list." });
    return;
  }
  const user = findUser(db, session.screenName);
  if (user.bfList.some((n) => n.toLowerCase() === name.toLowerCase())) {
    send(ws, bfPayload(session));
    return;
  }
  user.bfList.push(name);
  saveStore(db);
  send(ws, bfPayload(session));
}

function removeBf(ws, session, screenName) {
  const user = findUser(db, session.screenName);
  user.bfList = user.bfList.filter((n) => n.toLowerCase() !== String(screenName || "").toLowerCase());
  saveStore(db);
  send(ws, bfPayload(session));
}

function muteSn(ws, session, screenName, on) {
  const name = canonicalName(screenName) || String(screenName || "").trim();
  if (!name) return;
  if (name.toLowerCase() === session.screenName.toLowerCase()) {
    send(ws, { type: "error", code: "MUTE_SELF", message: "You cannot mute yourself." });
    return;
  }
  const user = findUser(db, session.screenName);
  const key = name.toLowerCase();
  user.mutes = user.mutes.filter((n) => n.toLowerCase() !== key);
  if (on) user.mutes.push(canonicalName(name) || name);
  saveStore(db);
  send(ws, { type: "mutes", mutes: user.mutes });
}

function setAway(session, away, message) {
  session.away = Boolean(away);
  session.awayMessage = session.away ? cleanText(message || "I'm away.") : "";
  broadcastPresence(session.screenName);
  const room = session.roomId ? rooms.get(session.roomId) : null;
  if (room) emitRoom(room);
  const ws = byName.get(session.screenName);
  if (ws) send(ws, { type: "away", away: session.away, awayMessage: session.awayMessage });
}

function kick(ws, session, screenName) {
  const room = requireOp(ws, session);
  if (!room) return;
  const target = inRoom(room, screenName);
  if (!target) {
    send(ws, { type: "error", code: "NOT_HERE", message: "That screen name is not in this room." });
    return;
  }
  if (target === session.screenName) {
    send(ws, { type: "error", code: "KICK_SELF", message: "You cannot kick yourself. Leave the room." });
    return;
  }
  const targetWs = byName.get(target);
  const targetSession = targetWs ? sessions.get(targetWs) : null;
  if (targetSession) {
    targetSession.roomId = null;
    room.members.delete(target);
    if (room.operator === target) room.operator = session.screenName;
    send(targetWs, { type: "kicked", roomId: room.id, roomName: room.name, by: session.screenName });
  }
  announceRoom(room, `${target} has been removed from the room.`);
  broadcastDirectory();
}

function ban(ws, session, screenName) {
  const room = requireOp(ws, session);
  if (!room) return;
  const meta = findRoomMeta(db, room.id);
  const name = canonicalName(screenName) || String(screenName || "").trim();
  if (!name) return;
  if (name.toLowerCase() === session.screenName.toLowerCase()) {
    send(ws, { type: "error", code: "BAN_SELF", message: "You cannot ban yourself." });
    return;
  }
  if (!meta.bans.some((n) => n.toLowerCase() === name.toLowerCase())) {
    meta.bans.push(name);
    saveStore(db);
  }
  const target = inRoom(room, name);
  if (target) {
    const targetWs = byName.get(target);
    const targetSession = targetWs ? sessions.get(targetWs) : null;
    room.members.delete(target);
    if (room.operator === target) room.operator = session.screenName;
    if (targetSession) {
      targetSession.roomId = null;
      send(targetWs, { type: "banned", roomId: room.id, roomName: room.name, by: session.screenName });
    }
  }
  announceRoom(room, `${name} is banned from this room.`);
  broadcastDirectory();
}

function unban(ws, session, screenName) {
  const room = requireOp(ws, session);
  if (!room) return;
  const meta = findRoomMeta(db, room.id);
  const key = String(screenName || "").toLowerCase();
  meta.bans = meta.bans.filter((n) => n.toLowerCase() !== key);
  saveStore(db);
  emitRoom(room);
}

function passOp(ws, session, screenName) {
  const room = requireOp(ws, session);
  if (!room) return;
  const target = inRoom(room, screenName);
  if (!target) {
    send(ws, { type: "error", code: "NOT_HERE", message: "Pass the operator to someone in this room." });
    return;
  }
  if (target === session.screenName) return;
  room.operator = target;
  announceRoom(room, `${session.screenName} passed the operator to ${target}.`);
}

function report(ws, session, screenName, reason) {
  const name = canonicalName(screenName) || String(screenName || "").trim();
  const why = cleanText(reason);
  if (!name || !why) {
    send(ws, { type: "error", code: "BAD_REPORT", message: "Pick a screen name and say why." });
    return;
  }
  db.reports.push({
    id: randomUUID(),
    from: session.screenName,
    target: name,
    roomId: session.roomId,
    reason: why,
    ts: Date.now(),
  });
  if (db.reports.length > 500) db.reports.splice(0, db.reports.length - 500);
  saveStore(db);
  send(ws, { type: "report_ok", target: name });
}

function disconnect(ws) {
  const session = sessions.get(ws);
  if (!session) return;
  sessions.delete(ws);
  if (session.replaced) return;
  leaveTable(session);
  if (byName.get(session.screenName) === ws) byName.delete(session.screenName);

  const existing = ghosts.get(session.screenName);
  if (existing) clearTimeout(existing.timer);

  const timer = setTimeout(() => {
    ghosts.delete(session.screenName);
    leaveRoom(session, { announce: true });
    broadcastPresence(session.screenName);
    broadcastDirectory();
  }, RESUME_MS);
  ghosts.set(session.screenName, { timer, session });
}

function requireOp(ws, session) {
  const room = session.roomId ? rooms.get(session.roomId) : null;
  if (!room) {
    send(ws, { type: "error", code: "NOT_IN_ROOM", message: "Join a room first." });
    return null;
  }
  if (room.operator !== session.screenName) {
    send(ws, { type: "error", code: "NOT_OP", message: "Only the room operator can do that." });
    return null;
  }
  return room;
}

function snapshot(room, you) {
  const meta = findRoomMeta(db, room.id);
  const isOp = room.operator === you;
  return {
    type: "joined",
    room: {
      id: room.id,
      name: room.name,
      blurb: room.blurb,
      cap: ROOM_CAP,
      house: room.house,
      createdBy: room.createdBy,
      operator: room.operator,
      members: memberList(room),
      messages: visibleMessages(you, room.messages),
      bans: isOp ? meta?.bans ?? [] : [],
      you,
    },
  };
}

function announceRoom(room, text) {
  const message = systemLine(text);
  pushMessage(room, message);
  emitRoom(room, message);
}

function emitRoom(room, incoming, except = null) {
  const members = memberList(room);
  for (const [name] of room.members) {
    if (except && name === except) continue;
    const ws = byName.get(name);
    if (!ws) continue;
    if (incoming?.kind === "chat" && isMuted(name, incoming.from)) continue;
    if (incoming) {
      send(ws, {
        type: "room_event",
        message: incoming,
        members,
        operator: room.operator,
        bans: opBans(room, name),
      });
    } else {
      send(ws, { type: "room_state", members, operator: room.operator, bans: opBans(room, name) });
    }
  }
}

function opBans(room, name) {
  if (room.operator !== name) return [];
  return findRoomMeta(db, room.id)?.bans ?? [];
}

function memberList(room) {
  return [...room.members.keys()]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map((name) => {
      const session = sessions.get(byName.get(name));
      return {
        name,
        op: room.operator === name,
        away: Boolean(session?.away),
      };
    });
}

function listRooms() {
  return db.rooms.map((meta) => {
    const room = rooms.get(meta.id);
    return {
      id: meta.id,
      name: meta.name,
      blurb: meta.blurb,
      house: Boolean(meta.house),
      createdBy: meta.createdBy,
      operator: room?.operator ?? null,
      count: room?.members.size ?? 0,
      cap: ROOM_CAP,
    };
  });
}

function bootstrap(session) {
  const user = findUser(db, session.screenName);
  return {
    type: "signed_on",
    screenName: session.screenName,
    token: ensureToken(user),
    rooms: listRooms(),
    bfList: bfEntries(user.bfList),
    mutes: user.mutes,
    away: session.away,
    awayMessage: session.awayMessage,
    roomId: session.roomId,
    games: listTables(),
  };
}

function ensureToken(user) {
  if (!user.sessionToken) {
    user.sessionToken = newToken();
    saveStore(db);
  }
  return user.sessionToken;
}

function newToken() {
  return randomBytes(24).toString("hex");
}

function bfPayload(session) {
  const user = findUser(db, session.screenName);
  return { type: "bf_list", bfList: bfEntries(user.bfList) };
}

function bfEntries(names) {
  return names.map((screenName) => {
    const live = findByName(screenName);
    const liveSession = live ? sessions.get(live) : null;
    let status = "offline";
    if (liveSession?.away) status = "away";
    else if (liveSession) status = "online";
    return {
      screenName: liveSession?.screenName || screenName,
      status,
      awayMessage: liveSession?.awayMessage || "",
    };
  });
}

function broadcastDirectory() {
  const payload = { type: "rooms", rooms: listRooms() };
  for (const ws of sessions.keys()) send(ws, payload);
}

function broadcastPresence(screenName) {
  for (const [ws, session] of sessions) {
    const user = findUser(db, session.screenName);
    if (!user.bfList.some((n) => n.toLowerCase() === screenName.toLowerCase()) && session.screenName !== screenName) {
      continue;
    }
    if (user.bfList.some((n) => n.toLowerCase() === screenName.toLowerCase())) {
      send(ws, bfPayload(session));
    }
  }
}

function visibleMessages(you, messages) {
  return messages.filter((m) => m.kind !== "chat" || !isMuted(you, m.from));
}

function isMuted(owner, other) {
  const user = findUser(db, owner);
  if (!user) return false;
  return user.mutes.some((n) => n.toLowerCase() === String(other).toLowerCase());
}

function isBanned(meta, screenName) {
  return meta.bans.some((n) => n.toLowerCase() === screenName.toLowerCase());
}

function canonicalName(screenName) {
  const user = findUser(db, screenName);
  if (user) return user.screenName;
  const live = findByName(screenName);
  if (live) return sessions.get(live).screenName;
  return null;
}

function inRoom(room, screenName) {
  const key = String(screenName || "").toLowerCase();
  for (const name of room.members.keys()) {
    if (name.toLowerCase() === key) return name;
  }
  return null;
}

function oldestMember(room) {
  let pick = null;
  let ts = Infinity;
  for (const [name, joinedAt] of room.members) {
    if (joinedAt < ts) {
      ts = joinedAt;
      pick = name;
    }
  }
  return pick;
}

function liveFromMeta(meta) {
  return {
    id: meta.id,
    name: meta.name,
    blurb: meta.blurb,
    house: Boolean(meta.house),
    createdBy: meta.createdBy,
    members: new Map(),
    messages: [],
    operator: null,
  };
}

function slug(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  let id = base;
  while (rooms.has(id)) id = `${base}-${randomBytes(2).toString("hex")}`;
  return id;
}

function systemLine(text) {
  return { id: randomUUID(), kind: "system", text, ts: Date.now() };
}

function pushMessage(room, message) {
  room.messages.push(message);
  if (room.messages.length > 200) room.messages.splice(0, room.messages.length - 200);
}

function findByName(name) {
  const key = String(name || "").toLowerCase();
  for (const [existing, ws] of byName) {
    if (existing.toLowerCase() === key) return ws;
  }
  return null;
}

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE);
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function checkPassword(password, stored) {
  const [saltHex, hashHex] = String(stored).split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const hash = Buffer.from(hashHex, "hex");
  const next = await scryptAsync(password, salt, 32);
  if (hash.length !== next.length) return false;
  return timingSafeEqual(hash, next);
}

function needSignOn(ws) {
  send(ws, { type: "error", code: "NEED_SIGN_ON", message: "Sign on first." });
}

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

initGames({
  send,
  findByName,
  everyone: (fn) => {
    for (const ws of sessions.keys()) fn(ws);
  },
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`chat56k listening on 0.0.0.0:${PORT}`);
});
