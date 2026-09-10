import express from "express";
import { createServer as createHttpServer } from "http";
import { createServer as createHttpsServer } from "https";
import { createServer as createNetServer } from "net";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import os from "os";
import selfsigned from "selfsigned";
import localtunnel from "localtunnel";
import { registerLiveSocketHandlers } from "./liveSocketHandlers.js";
import { registerPaymentRoutes } from "./paymentRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Set when localtunnel is ready — used to send phone browsers from http://10.x… to https://….loca.lt */
let tunnelPublicUrl = null;

const app = express();

app.use((req, res, next) => {
  if (!tunnelPublicUrl) return next();
  const h = req.hostname;
  if (h === "localhost" || h === "127.0.0.1") return next();
  let tunnelHost;
  try {
    tunnelHost = new URL(tunnelPublicUrl).hostname;
  } catch {
    return next();
  }
  if (h === tunnelHost) return next();
  if (req.protocol !== "http") return next();
  const looksLikeIp =
    /^\d{1,3}(\.\d{1,3}){3}$/.test(h) ||
    /^\[[\dA-Fa-f:]+\]$/.test(h) ||
    (h.includes(":") && !h.includes("."));
  if (looksLikeIp) {
    const dest = new URL(req.originalUrl || "/", tunnelPublicUrl).href;
    return res.redirect(302, dest);
  }
  next();
});

app.use(express.static(join(__dirname, "public")));
registerPaymentRoutes(app);

const useTunnel = process.env.TUNNEL === "1";
const useHttps = process.env.LIVE_HTTPS === "1";

function collectAltNames() {
  const altNames = [
    { type: 2, value: "localhost" },
    { type: 7, ip: "127.0.0.1" },
    { type: 7, ip: "::1" },
  ];
  const seen = new Set(["127.0.0.1", "::1"]);

  for (const addrs of Object.values(os.networkInterfaces())) {
    if (!addrs) continue;
    for (const a of addrs) {
      if (a.internal) continue;
      const v4 = a.family === "IPv4" || a.family === 4;
      const v6 = a.family === "IPv6" || a.family === 6;
      if (!v4 && !v6) continue;
      const ip = a.address.split("%")[0];
      if (seen.has(ip)) continue;
      seen.add(ip);
      altNames.push({ type: 7, ip });
    }
  }
  return altNames;
}

async function devTlsCredentials() {
  const altNames = collectAltNames();
  const pems = await selfsigned.generate(
    [{ name: "commonName", value: "video-call-dev" }],
    {
      algorithm: "sha256",
      days: 365,
      extensions: [
        { name: "basicConstraints", cA: false },
        {
          name: "keyUsage",
          digitalSignature: true,
          keyEncipherment: true,
        },
        {
          name: "subjectAltName",
          altNames,
        },
      ],
    }
  );
  return { key: pems.private, cert: pems.cert };
}

/**
 * Star topology: only the host (and any accepted guests) send video — passive
 * viewers are receive-only, so this bounds room size, not upload fan-out per se.
 * The real ceiling is still the host's own upload bandwidth (one outbound
 * connection per viewer); this cap just stops a room growing unbounded.
 */
const MAX_PEERS = 60;

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("join-room", (roomId, ack) => {
      if (typeof roomId !== "string" || !roomId.trim()) {
        ack?.({ ok: false, error: "invalid-room" });
        return;
      }

      const room = roomId.trim().slice(0, 64);
      const existing = io.sockets.adapter.rooms.get(room);
      const count = existing ? existing.size : 0;

      if (count >= MAX_PEERS) {
        ack?.({ ok: false, error: "room-full" });
        return;
      }

      const peerIds = existing ? [...existing] : [];

      socket.join(room);
      socket.data.room = room;

      socket.to(room).emit("peer-joined", { id: socket.id });
      ack?.({ ok: true, room, peers: peerIds });
    });

    socket.on("signal", (payload) => {
      const room = socket.data.room;
      if (!room || !payload) return;
      const target = payload.to;
      if (typeof target === "string" && target) {
        const { to: _t, ...rest } = payload;
        io.to(target).emit("signal", { ...rest, from: socket.id });
      } else {
        socket.to(room).emit("signal", { ...payload, from: socket.id });
      }
    });

    socket.on("leave-room", () => {
      const room = socket.data.room;
      if (!room) return;
      socket.to(room).emit("peer-left", { id: socket.id });
      socket.leave(room);
      delete socket.data.room;
    });

    socket.on("disconnecting", () => {
      const room = socket.data.room;
      if (room) {
        socket.to(room).emit("peer-left", { id: socket.id });
      }
    });
  });
}

const preferredPort = Number(process.env.PORT) || 3001;
const maxPort = preferredPort + 30;

function findFreePort(start) {
  return new Promise((resolve, reject) => {
    if (start > maxPort) {
      reject(new Error("no-free-port"));
      return;
    }
    const probe = createNetServer();
    probe.once("error", (err) => {
      probe.close();
      if (err.code === "EADDRINUSE") {
        console.warn(`Port ${start} in use, trying ${start + 1}…`);
        findFreePort(start + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
    probe.listen(start, () => {
      const addr = probe.address();
      const port = typeof addr === "object" && addr ? addr.port : start;
      probe.close(() => resolve(port));
    });
  });
}

function lanIPv4Hints() {
  const ips = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    if (!addrs) continue;
    for (const a of addrs) {
      if (a.internal) continue;
      if (a.family !== "IPv4" && a.family !== 4) continue;
      ips.push(a.address);
    }
  }
  return ips;
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.listen(port, () => resolve());
    server.once("error", reject);
  });
}

async function main() {
  const port = await findFreePort(preferredPort);

  if (useTunnel) {
    const httpServer = createHttpServer(app);
    const io = new Server(httpServer, { cors: { origin: true } });
    registerSocketHandlers(io);
    registerLiveSocketHandlers(io);

    await listen(httpServer, port);

    let tunnel;
    try {
      tunnel = await localtunnel({ port });
    } catch (err) {
      console.error("Could not start public tunnel (localtunnel).", err.message || err);
      console.error("Try again or use: npx cloudflared tunnel --url http://localhost:" + port);
      process.exit(1);
    }

    tunnelPublicUrl = tunnel.url;

    console.log("");
    console.log("Phone / iOS / strict browsers — open this URL (real HTTPS):");
    console.log("  " + tunnel.url);
    console.log("");
    console.log("Embed-only live engine — use the main app at http://localhost:5173 for lives.");
    console.log("Payments API: " + tunnel.url + "/api/payments/health");
    console.log("Local: http://localhost:" + port);
    console.log("");

    tunnel.on("close", () => {
      console.warn("Tunnel closed. Restart the server.");
    });
    return;
  }

  const server = useHttps
    ? createHttpsServer(await devTlsCredentials(), app)
    : createHttpServer(app);
  const io = new Server(server, { cors: { origin: true } });
  registerSocketHandlers(io);
  registerLiveSocketHandlers(io);

  await listen(server, port);

  const protocol = useHttps ? "https" : "http";
  console.log(`Live engine (embed): ${protocol}://localhost:${port}`);
  console.log(`Payments API: ${protocol}://localhost:${port}/api/payments/health`);
  console.log("Main app: http://localhost:5173 — open /u/username/live to go live");
  const hints = lanIPv4Hints();
  if (hints.length) {
    console.log("Same Wi‑Fi (self-signed cert — may block camera on iPhone):");
    for (const ip of hints) {
      console.log(`  ${protocol}://${ip}:${port}`);
    }
    console.log("");
    console.log("If the phone still cannot use camera/mic, run:");
    console.log("  npm run start:tunnel");
    console.log("and open the https URL it prints (works on iOS).");
  }
}

main().catch((err) => {
  if (err?.message === "no-free-port") {
    console.error("Could not find a free port.");
  } else {
    console.error(err);
  }
  process.exit(1);
});
