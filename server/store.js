import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const HOUSE_ROOMS = [
  { id: "front-porch", name: "Front Porch", blurb: "First stop after sign-on." },
  { id: "after-hours", name: "After Hours", blurb: "The lights stay on." },
  { id: "mix-tape", name: "Mix Tape", blurb: "What is in the deck." },
  { id: "scoreboard", name: "Scoreboard", blurb: "Last night's game, still." },
  { id: "modem-pool", name: "Modem Pool", blurb: "Busy signal stories." },
  { id: "reading-lamp", name: "Reading Lamp", blurb: "Quieter, mostly." },
];

const DISK = "/var/data";
const DATA_DIR =
  process.env.DATA_DIR ||
  (existsSync(DISK) ? DISK : fileURLToPath(new URL(".", import.meta.url)));
const FILE = join(DATA_DIR, "data.json");

/** @type {ReturnType<typeof emptyData> | null} */
let current = null;

export function dataFile() {
  return FILE;
}

export function emptyData() {
  return {
    users: [],
    rooms: HOUSE_ROOMS.map((r) => ({
      ...r,
      house: true,
      createdBy: "chat56k",
      bans: [],
    })),
    reports: [],
    silenced: [],
    stats: { visitors: 0, signOns: 0 },
  };
}

function ensureStats(data) {
  if (!data.stats) data.stats = { visitors: 0, signOns: 0 };
  if (typeof data.stats.visitors !== "number") data.stats.visitors = 0;
  if (typeof data.stats.signOns !== "number") data.stats.signOns = 0;
}

export function loadStore() {
  if (!existsSync(FILE)) {
    const data = emptyData();
    current = data;
    saveStore(data);
    return data;
  }
  const data = JSON.parse(readFileSync(FILE, "utf8"));
  if (!Array.isArray(data.users)) data.users = [];
  if (!Array.isArray(data.rooms)) data.rooms = [];
  if (!Array.isArray(data.reports)) data.reports = [];
  if (!Array.isArray(data.silenced)) data.silenced = [];
  ensureStats(data);
  for (const house of HOUSE_ROOMS) {
    if (!data.rooms.some((r) => r.id === house.id)) {
      data.rooms.unshift({ ...house, house: true, createdBy: "chat56k", bans: [] });
    }
  }
  for (const room of data.rooms) {
    if (!Array.isArray(room.bans)) room.bans = [];
  }
  for (const user of data.users) {
    if (!Array.isArray(user.bfList)) user.bfList = [];
    if (!Array.isArray(user.mutes)) user.mutes = [];
    if (typeof user.bio !== "string") user.bio = "";
  }
  current = data;
  return data;
}

export function getStats() {
  if (!current) return { visitors: 0, signOns: 0 };
  ensureStats(current);
  return { visitors: current.stats.visitors, signOns: current.stats.signOns };
}

export function bumpVisitor() {
  if (!current) return getStats();
  ensureStats(current);
  current.stats.visitors += 1;
  saveStore(current);
  return getStats();
}

export function bumpSignOn() {
  if (!current) return getStats();
  ensureStats(current);
  current.stats.signOns += 1;
  saveStore(current);
  return getStats();
}

export function saveStore(data) {
  mkdirSync(dirname(FILE), { recursive: true });
  const body = JSON.stringify(data, null, 2);
  const tmp = `${FILE}.tmp`;
  try {
    writeFileSync(tmp, body);
    renameSync(tmp, FILE);
  } catch (err) {
    writeFileSync(FILE, body);
    console.error("chat56k saveStore fallback", err);
  }
}

export function findUserByToken(data, token) {
  const key = String(token || "");
  if (!key) return null;
  return data.users.find((u) => u.sessionToken && u.sessionToken === key) ?? null;
}

export function findUser(data, screenName) {
  const key = String(screenName || "").toLowerCase();
  return data.users.find((u) => u.screenName.toLowerCase() === key) ?? null;
}

export function findRoomMeta(data, roomId) {
  return data.rooms.find((r) => r.id === roomId) ?? null;
}
