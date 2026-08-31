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

const DATA_DIR = process.env.DATA_DIR || fileURLToPath(new URL(".", import.meta.url));
const FILE = join(DATA_DIR, "data.json");

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
  };
}

export function loadStore() {
  if (!existsSync(FILE)) {
    const data = emptyData();
    saveStore(data);
    return data;
  }
  const data = JSON.parse(readFileSync(FILE, "utf8"));
  if (!Array.isArray(data.users)) data.users = [];
  if (!Array.isArray(data.rooms)) data.rooms = [];
  if (!Array.isArray(data.reports)) data.reports = [];
  for (const house of HOUSE_ROOMS) {
    if (!data.rooms.some((r) => r.id === house.id)) {
      data.rooms.unshift({ ...house, house: true, createdBy: "chat56k", bans: [] });
    }
  }
  for (const room of data.rooms) {
    if (!Array.isArray(room.bans)) room.bans = [];
  }
  return data;
}

export function saveStore(data) {
  mkdirSync(dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, FILE);
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
