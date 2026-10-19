import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

import { initDatabaseSchema } from "./src/config/db.js";
import authRouter from "./src/routes/auth.js";
import savesRouter from "./src/routes/saves.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const PUBLIC_DIR = path.resolve(__dirname, "public");
const RES_DIR = path.resolve(PUBLIC_DIR, "res");

const BOOT_ID = Date.now().toString();
let lastChangeVersion = Date.now();
const sseClients = new Set();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// 1. Live-Reload SSE Endpoint
app.get("/live-reload", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  res.write(`data: boot:${BOOT_ID}\n\n`);
  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

// 2. Live-Reload Polling Fallback
app.get("/api/live-check", (req, res) => {
  const clientV = Number(req.query.v) || 0;
  const changed = clientV > 0 && clientV < lastChangeVersion;
  res.json({ changed, v: lastChangeVersion });
});

// Function to broadcast live reload to all active browsers
function broadcastLiveReload(filename = "update") {
  lastChangeVersion = Date.now();
  console.log(
    `[Live-Reload] ⚡ File changed: ${filename} -> Notifying browser clients...`,
  );
  const msg = `data: reload:${filename}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// 3. API Routes Mounting
app.use("/api", authRouter);
app.use("/api", savesRouter);

const PATH_MAP = [
  [/^doll\//i, "models/characters/doll/"],
  [/^img\/jx\//i, "models/characters/sprites/"],
  [/^img\/a\//i, "models/monsters/"],
  [/^img\/char\//i, "models/char/"],
  [/^fx\//i, "models/effects/"],
  [/^img\/z\/m\//i, "models/maps/m/"],
  [/^img\/z\/53\//i, "models/maps/53/"],
  [/^img\/z\//i, "models/maps/"],
  [/^img\/training\//i, "models/arena/"],
  [/^img\/i\//i, "icons/items/"],
  [/^img\/s\//i, "icons/skills/"],
  [/^img\/m\//i, "icons/monsters/"],
  [/^img\/pl\//i, "icons/factions/"],
  [/^img\/fabao\//i, "icons/fabao/"],
  [/^img\/ep\//i, "icons/props/"],
  [/^img\/u2\//i, "icons/ui/"],
  [/^img\/icon\//i, "icons/app/"],
  [/^img\/app\//i, "icons/app/"],
  [/^snd\//i, "audio/efc/"],
  [/^music\//i, "audio/music/"],
  [/^webfonts\//i, "fonts/"],
];

function checkFile(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile() ? p : null;
  } catch {
    return null;
  }
}

// 4. Smart Static Assets Resolution with Standardized Structure & Legacy Fallbacks
function resolveFilePath(reqPath) {
  const rawDecoded = decodeURIComponent(reqPath).replace(/^\/+/, "");
  if (rawDecoded === "" || rawDecoded === "index.html") {
    return checkFile(path.resolve(PUBLIC_DIR, "index.html"));
  }

  // 1. Direct inside public/ (e.g. css/app.root.css, core/engine/app.js)
  let hit = checkFile(path.resolve(PUBLIC_DIR, rawDecoded));
  if (hit) return hit;

  // 2. Direct inside public/res/ (e.g. res/icons/app/icon.svg)
  hit = checkFile(path.resolve(RES_DIR, rawDecoded));
  if (hit) return hit;

  let decoded = rawDecoded;
  if (decoded.toLowerCase().startsWith("res/")) {
    decoded = decoded.substring(4);
    hit = checkFile(path.resolve(RES_DIR, decoded));
    if (hit) return hit;
  } else if (decoded.toLowerCase().startsWith("css/")) {
    decoded = decoded.substring(4);
    hit = checkFile(path.resolve(RES_DIR, decoded));
    if (hit) return hit;
  }

  for (const [re, rep] of PATH_MAP) {
    if (re.test(decoded)) {
      const mapped = decoded.replace(re, rep);
      hit = checkFile(path.resolve(RES_DIR, mapped));
      if (hit) return hit;
      if (re.source.includes("img\\/a\\/")) {
        const charFallback = decoded.replace(re, "models/char/");
        hit = checkFile(path.resolve(RES_DIR, charFallback));
        if (hit) return hit;
      }
    }
  }

  const basename = path.basename(decoded);
  const isMonster = /^(ani|enemy|boss)/i.test(basename);
  const candidates = isMonster
    ? [
        "models/monsters/" + basename,
        "models/char/" + basename,
        "models/effects/" + basename,
        "models/arena/" + basename,
        "icons/monsters/" + basename,
        "icons/items/" + basename,
        "icons/skills/" + basename,
        "icons/props/" + basename,
        "icons/app/" + basename,
        "fonts/" + basename,
        "audio/efc/" + basename,
        "audio/music/" + basename,
      ]
    : [
        "models/char/" + basename,
        "models/monsters/" + basename,
        "models/effects/" + basename,
        "models/arena/" + basename,
        "audio/efc/" + basename,
        "audio/music/" + basename,
        "icons/items/" + basename,
        "icons/skills/" + basename,
        "icons/monsters/" + basename,
        "icons/props/" + basename,
        "icons/app/" + basename,
        "fonts/" + basename,
      ];
  for (const c of candidates) {
    hit = checkFile(path.resolve(RES_DIR, c));
    if (hit) return hit;
  }

  return null;
}

// Static Assets Handler
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return next();
  }

  const filePath = resolveFilePath(req.path);
  if (!filePath) {
    return next();
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) res.status(500).end();
  });
  stream.pipe(res);
});

// JX Asset & Model Studio Workbench
app.get("/studio", (req, res) => {
  const studioPath = path.resolve(PUBLIC_DIR, "studio.html");
  if (fs.existsSync(studioPath)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return fs.createReadStream(studioPath).pipe(res);
  }
  res.status(404).send("Studio page not found");
});

// Fallback for SPA/Webgame entry
app.get("*", (req, res) => {
  const indexPath = path.resolve(PUBLIC_DIR, "index.html");
  if (fs.existsSync(indexPath)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return fs.createReadStream(indexPath).pipe(res);
  }
  res.status(404).send("404 Not Found");
});

// Watch public directory for live browser reloads
let watchDebounce = null;
try {
  fs.watch(PUBLIC_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const ext = path.extname(filename).toLowerCase();
    if ([".html", ".css", ".js", ".json", ".svg"].includes(ext)) {
      if (watchDebounce) clearTimeout(watchDebounce);
      watchDebounce = setTimeout(() => {
        broadcastLiveReload(filename);
      }, 300);
    }
  });
} catch (e) {
  console.warn("[Watcher Warning]", e.message);
}

function freePort(port) {
  try {
    if (process.platform === "win32") {
      const currentPid = process.pid;
      const killed = new Set();
      try {
        const netstat = execSync(`netstat -ano | findstr :${port}`, {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        });
        for (const line of netstat.split("\n")) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const localAddr = parts[1] || "";
            if (localAddr.endsWith(`:${port}`) || localAddr.includes(`:${port}`)) {
              const pid = parseInt(parts[parts.length - 1], 10);
              if (pid && pid !== currentPid && !killed.has(pid)) {
                try {
                  execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
                  killed.add(pid);
                  console.log(`\x1b[33m⚡ [Port Guard] Auto-freed port ${port} by terminating stale PID ${pid} (taskkill)\x1b[0m`);
                } catch {
                  try {
                    execSync(`wmic process where processid=${pid} call terminate`, { stdio: "ignore" });
                    killed.add(pid);
                    console.log(`\x1b[33m⚡ [Port Guard] Auto-freed port ${port} by terminating stale PID ${pid} (wmic)\x1b[0m`);
                  } catch {}
                }
              }
            }
          }
        }
      } catch {}

      try {
        execSync(
          `powershell -NoProfile -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne ${currentPid} } | Stop-Process -Force -ErrorAction SilentlyContinue"`,
          { stdio: "ignore" }
        );
      } catch {}
    }
  } catch {}
}

// Initialize Database & Start Server
async function startServer() {
  try {
    await initDatabaseSchema();
    freePort(PORT);

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log("\x1b[38;2;255;180;50m╔═══════════════════════════════════════════════════════════════════════════╗\x1b[0m");
      console.log("\x1b[38;2;255;180;50m║\x1b[0m   \x1b[1;38;2;255;215;80m⚔  JX - IDLE REALTIME ENGINE  (NODE.JS + MYSQL ENTITY-BLOB)  ⚔\x1b[0m     \x1b[38;2;255;180;50m║\x1b[0m");
      console.log("\x1b[38;2;255;180;50m╠═══════════════════════════════════════════════════════════════════════════╣\x1b[0m");
      console.log(`\x1b[38;2;255;180;50m║\x1b[0m  \x1b[32m✔ Web Server\x1b[0m   : \x1b[1;36mhttp://localhost:${PORT}/\x1b[0m`);
      console.log(`\x1b[38;2;255;180;50m║\x1b[0m  \x1b[32m✔ Static Root\x1b[0m  : \x1b[37m${PUBLIC_DIR}\x1b[0m`);
      console.log(`\x1b[38;2;255;180;50m║\x1b[0m  \x1b[32m✔ Live Reload\x1b[0m  : \x1b[35mActive (SSE + Nodemon Realtime Watcher)\x1b[0m`);
      console.log(`\x1b[38;2;255;180;50m║\x1b[0m  \x1b[32m✔ Target FPS\x1b[0m   : \x1b[1;32m60 FPS Minimum Locked Engine\x1b[0m`);
      console.log(`\x1b[38;2;255;180;50m║\x1b[0m  \x1b[32m✔ UI Styling\x1b[0m   : \x1b[33mPure CSS Shimmer + FontAwesome 6 (No UI Images)\x1b[0m`);
      console.log("\x1b[38;2;255;180;50m╚═══════════════════════════════════════════════════════════════════════════╝\x1b[0m");
    });

    let retries = 0;
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        if (retries < 3) {
          retries++;
          console.warn(`\x1b[33m⚡ [Port Guard] Port ${PORT} busy, auto-terminating occupant (attempt ${retries}/3)...\x1b[0m`);
          freePort(PORT);
          setTimeout(() => {
            server.listen(PORT, "0.0.0.0");
          }, 400);
        } else {
          console.error(`\x1b[31m[Port Guard] Unable to claim port ${PORT} after 3 attempts.\x1b[0m`);
          process.exit(1);
        }
      } else {
        console.error("\x1b[31m[Server Error]\x1b[0m", err);
      }
    });
  } catch (err) {
    console.error("\x1b[31m[Fatal Startup Error] Failed to initialize database:\x1b[0m", err);
    process.exit(1);
  }
}

startServer();
