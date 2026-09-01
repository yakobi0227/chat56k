import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { hasPhoto, photoPath } from "./photos.js";

const DIST = fileURLToPath(new URL("../client/dist", import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

export function servePublic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }

  const url = new URL(req.url || "/", "http://chat56k.local");
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok\n");
    return;
  }

  if (url.pathname.startsWith("/photo/")) {
    const name = decodeURIComponent(url.pathname.slice("/photo/".length).split("/")[0] || "");
    if (hasPhoto(name)) {
      stream(res, photoPath(name), "image/png");
      return;
    }
    res.writeHead(404);
    res.end();
    return;
  }

  if (!existsSync(DIST)) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("chat56k — run npm run build, then npm start\n");
    return;
  }

  const file = safeFile(url.pathname);
  if (file) {
    stream(res, file, MIME[extname(file).toLowerCase()] || "application/octet-stream");
    return;
  }

  stream(res, join(DIST, "index.html"), MIME[".html"]);
}

function safeFile(pathname) {
  let path = decodeURIComponent(pathname.split("?")[0] || "/");
  if (path === "/") path = "/index.html";
  const resolved = normalize(join(DIST, path));
  const root = DIST.endsWith(sep) ? DIST : DIST + sep;
  if (resolved !== DIST && !resolved.startsWith(root)) return null;
  if (existsSync(resolved) && statSync(resolved).isFile()) return resolved;
  return null;
}

function stream(res, file, type) {
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
  createReadStream(file).pipe(res);
}
