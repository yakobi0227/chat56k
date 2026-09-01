import { existsSync, mkdirSync, unlinkSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = process.env.PHOTO_DIR || fileURLToPath(new URL("./photos", import.meta.url));
const MAX = 40_000;

function safeName(screenName) {
  const n = String(screenName || "").replace(/[^A-Za-z0-9]/g, "");
  return n.slice(0, 16);
}

export function photoPath(screenName) {
  mkdirSync(DIR, { recursive: true });
  return join(DIR, `${safeName(screenName)}.png`);
}

export function hasPhoto(screenName) {
  const p = photoPath(screenName);
  return existsSync(p);
}

export function photoStamp(screenName) {
  const p = photoPath(screenName);
  if (!existsSync(p)) return 0;
  return statSync(p).mtimeMs;
}

export function savePhoto(screenName, dataUrl) {
  const raw = String(dataUrl || "");
  const m = raw.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return false;
  const buf = Buffer.from(m[1], "base64");
  if (buf.length < 32 || buf.length > MAX) return false;
  if (buf[0] !== 0x89 || buf[1] !== 0x50) return false;
  writeFileSync(photoPath(screenName), buf);
  return true;
}

export function clearPhoto(screenName) {
  const p = photoPath(screenName);
  if (existsSync(p)) unlinkSync(p);
}
