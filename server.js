import 'dotenv/config';
import express from "express";
import fetch from "node-fetch";
import { timingSafeEqual } from "crypto";

const {
  WEBHOOK_LOW,
  WEBHOOK_HIGH,
  SECRET_TOKEN,
  PORT = 3000,
} = process.env;

if (!WEBHOOK_LOW || !WEBHOOK_HIGH) {
  console.warn("[WARN] Missing WEBHOOK_LOW or WEBHOOK_HIGH env variables.");
}

const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: "256kb" }));

// Simple rate limiting per IP
const RATE_WINDOW_MS = 15_000;
const RATE_MAX_REQUESTS = 30;
const rateBuckets = new Map();
app.use((req, res, next) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.start > RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    rateBuckets.set(ip, bucket);
  }
  bucket.count += 1;
  if (bucket.count > RATE_MAX_REQUESTS) {
    return res.status(429).json({ ok: false, error: "Too many requests" });
  }
  next();
});

// Dedup suppression per jobId + range
const DEDUP_WINDOW_MS = 60_000;
const dedup = { low: new Map(), high: new Map() };
function suppress(range, jobId) {
  const map = range === "high" ? dedup.high : dedup.low;
  const last = map.get(jobId);
  const now = Date.now();
  if (last && now - last < DEDUP_WINDOW_MS) return true;
  map.set(jobId, now);
  return false;
}

// In-memory last notifications
let lastLowNotification = null;
let lastHighNotification = null;

// Value ranges
const LOW_MIN = 1e6;   // inclusive
const LOW_MAX = 1e7;   // inclusive
const HIGH_MIN = 1e7;  // exclusive

function validatePayload(body) {
  const errors = [];
  const placeId = body?.placeId;
  const jobId = body?.jobId;
  const brainrots = body?.brainrots;

  if (!placeId || (!Number.isInteger(placeId) && typeof placeId !== "string")) {
    errors.push("Invalid or missing placeId");
  }
  if (!jobId || typeof jobId !== "string") {
    errors.push("Invalid or missing jobId");
  }
  if (!Array.isArray(brainrots)) {
    errors.push("Invalid or missing brainrots array");
  } else {
    if (brainrots.length === 0) errors.push("Empty brainrots array");
    if (brainrots.length > 100) errors.push("Too many brainrots (max 100)");
    for (const b of brainrots) {
      if (!b || typeof b.name !== "string" || b.name.length === 0) {
        errors.push("Brainrot entry missing name");
        break;
      }
      if (typeof b.value !== "number" || !isFinite(b.value) || b.value < 0) {
        errors.push("Brainrot entry invalid value");
        break;
      }
    }
  }

  return { ok: errors.length === 0, errors, placeId, jobId, brainrots };
}

function buildEmbed({ topBrainrot, placeId, jobId }) {
  const line = `${topBrainrot.name} / $${(topBrainrot.value / 1e6).toFixed(2)} M/s`;
  const joinLink = `https://www.roblox.com/games/start?placeId=${placeId}&gameInstanceId=${jobId}`;
  const joinScript = `game:GetService("TeleportService"):TeleportToPlaceInstance(${placeId},"${jobId}",game.Players.LocalPlayer)`;

  return {
    username: "hyper hub",
    embeds: [
      {
        title: "Brainrot Notifier",
        color: 0xFFB000,
        fields: [
          { name: "Name", value: line || "N/A", inline: false },
          { name: "Job ID", value: jobId || "N/A", inline: false },
          { name: "Join Link", value: `[Click to join](${joinLink})`, inline: false },
          { name: "Join Script (PC)", value: "```lua\n" + joinScript + "\n```", inline: false },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function sendToDiscord(webhookUrl, embed) {
  if (!webhookUrl) throw new Error("Webhook URL not configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(embed),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Discord webhook error: ${resp.status} ${resp.statusText} ${text}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function requireSecret(req, res, next) {
  if (!SECRET_TOKEN) return next();
  const provided = req.headers["x-notifier-token"];
  if (!provided) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  // Use timing-safe comparison to prevent timing attacks
  try {
    const providedBuf = Buffer.from(provided);
    const secretBuf = Buffer.from(SECRET_TOKEN);
    if (providedBuf.length !== secretBuf.length || !timingSafeEqual(providedBuf, secretBuf)) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

app.post("/data", requireSecret, async (req, res) => {
  try {
    const v = validatePayload(req.body);
    if (!v.ok) {
      return res.status(400).json({ ok: false, errors: v.errors });
    }
    const { placeId, jobId, brainrots } = v;

    const lowBrainrots = brainrots.filter(b => b.value >= LOW_MIN && b.value <= LOW_MAX);
    const highBrainrots = brainrots.filter(b => b.value > HIGH_MIN);

    const topLow = lowBrainrots.length ? lowBrainrots.reduce((m, b) => (b.value > m.value ? b : m), lowBrainrots[0]) : null;
    const topHigh = highBrainrots.length ? highBrainrots.reduce((m, b) => (b.value > m.value ? b : m), highBrainrots[0]) : null;

    const results = [];
    if (topLow && !suppress("low", jobId)) {
      const embed = buildEmbed({ topBrainrot: topLow, placeId, jobId });
      await sendToDiscord(WEBHOOK_LOW, embed);
      lastLowNotification = { name: topLow.name, value: topLow.value, placeId, jobId, at: Date.now() };
      results.push({ range: "low", name: topLow.name, value: topLow.value });
    }
    if (topHigh && !suppress("high", jobId)) {
      const embed = buildEmbed({ topBrainrot: topHigh, placeId, jobId });
      await sendToDiscord(WEBHOOK_HIGH, embed);
      lastHighNotification = { name: topHigh.name, value: topHigh.value, placeId, jobId, at: Date.now() };
      results.push({ range: "high", name: topHigh.name, value: topHigh.value });
    }

    if (results.length === 0) {
      return res.json({ ok: true, message: "No notification sent (dedup or no brainrots in range)" });
    }
    res.json({ ok: true, sent: results });
  } catch (err) {
    console.error("[/data] Error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/notifications/high", (req, res) => {
  res.json(lastHighNotification || {});
});
app.get("/notifications/low", (req, res) => {
  res.json(lastLowNotification || {});
});
app.get("/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), timestamp: Date.now() });
});
app.get("/status", (req, res) => {
  res.json({
    ok: true,
    rateLimit: { windowMs: RATE_WINDOW_MS, maxRequests: RATE_MAX_REQUESTS },
    dedupWindowMs: DEDUP_WINDOW_MS,
    lowRange: { min: LOW_MIN, max: LOW_MAX },
    highRangeMin: HIGH_MIN,
    lastLowNotification,
    lastHighNotification,
  });
});

app.listen(PORT, () => {
  console.log(`Notifier server listening on port ${PORT}`);
});
