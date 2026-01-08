import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Configure Express to trust proxy for accurate IP detection
app.set('trust proxy', true);

// Tolerant JSON parsing
app.use(express.json({ strict: false }));
app.use((req, res, next) => {
  if (req.is("text/plain") || req.is("application/x-www-form-urlencoded")) {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => {
      try {
        req.body = JSON.parse(data);
      } catch (e) {
        req.body = {};
      }
      next();
    });
  } else {
    next();
  }
});

// Validate required environment variables
const WEBHOOK_LOW = process.env.WEBHOOK_LOW;
const WEBHOOK_HIGH = process.env.WEBHOOK_HIGH;
const SECRET_TOKEN = process.env.SECRET_TOKEN;
const PORT = process.env.PORT || 3000;

if (!WEBHOOK_LOW || !WEBHOOK_HIGH) {
  console.error("ERROR: WEBHOOK_LOW and WEBHOOK_HIGH environment variables are required!");
  process.exit(1);
}

// Validate webhook URLs
const WEBHOOK_URL_PATTERN = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;
if (!WEBHOOK_URL_PATTERN.test(WEBHOOK_LOW)) {
  console.error("ERROR: WEBHOOK_LOW is not a valid Discord webhook URL");
  process.exit(1);
}
if (!WEBHOOK_URL_PATTERN.test(WEBHOOK_HIGH)) {
  console.error("ERROR: WEBHOOK_HIGH is not a valid Discord webhook URL");
  process.exit(1);
}

// Constants
const MAX_BRAINROTS = 25;
const DISCORD_TIMEOUT = 10000; // 10 seconds

// Rate limiting: 15s window, 30 req/IP
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15000; // 15 seconds
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + RATE_LIMIT_WINDOW;
  } else {
    record.count++;
  }
  
  rateLimitMap.set(ip, record);
  return record.count <= RATE_LIMIT_MAX;
}

// Deduplication: 60s per jobId
const dedupMap = new Map();
const DEDUP_WINDOW = 60000; // 60 seconds

function checkDedup(jobId) {
  const now = Date.now();
  const lastSent = dedupMap.get(jobId);
  
  if (lastSent && (now - lastSent < DEDUP_WINDOW)) {
    return false; // Duplicate
  }
  
  dedupMap.set(jobId, now);
  return true;
}

// Store last 50 payload summaries
const debugLog = [];
const MAX_DEBUG_LOG = 50;

function addDebugLog(entry) {
  debugLog.push({ ...entry, timestamp: new Date().toISOString() });
  if (debugLog.length > MAX_DEBUG_LOG) {
    debugLog.shift();
  }
}

// Last notifications storage
let lastLowNotification = null;
let lastHighNotification = null;

// Send embed to Discord with timeout and error handling
async function sendEmbed(brainrots, payload, webhookUrl, webhookType) {
  const jobId = payload.jobId || "N/A";
  const placeId = payload.placeId || "N/A";

  const topBrainrot = brainrots.reduce((max, b) => (b.value > max.value ? b : max), brainrots[0]);
  const line = `${topBrainrot.name} / $${(topBrainrot.value/1e6).toFixed(2)} M/s`;

  const joinLink = `https://www.roblox.com/games/start?placeId=${placeId}&gameInstanceId=${jobId}`;
  const joinScript = `game:GetService("TeleportService"):TeleportToPlaceInstance(${placeId},"${jobId}",game.Players.LocalPlayer)`;

  const embed = {
    username: "Brainrot Notifier",
    embeds: [{
      title: "🧠 Steal a Brainrot Alert",
      color: 16742400,
      fields: [
        { name: "Name", value: line || "N/A", inline: false },
        { name: "Job ID", value: jobId, inline: false },
        { name: "Join Link", value: `[Click to join](${joinLink})`, inline: false },
        { name: "Join Script (PC)", value: "```lua\n" + joinScript + "\n```", inline: false }
      ]
    }]
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DISCORD_TIMEOUT);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(embed),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
    }

    const notification = {
      name: topBrainrot.name,
      value: topBrainrot.value,
      placeId,
      jobId
    };

    if (webhookType === "HIGH") {
      lastHighNotification = notification;
    } else {
      lastLowNotification = notification;
    }

    return { success: true };
  } catch (err) {
    console.error(`Error sending to ${webhookType} webhook:`, err.message);
    return { success: false, error: err.message };
  }
}

// Authentication middleware
function authenticate(req, res, next) {
  if (!SECRET_TOKEN) {
    return next(); // No authentication required
  }

  const token = req.headers["x-notifier-token"];
  if (token !== SECRET_TOKEN) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  next();
}

// Endpoints
app.get("/health", (req, res) => {
  res.json({ ok: true, status: "healthy" });
});

app.get("/status", (req, res) => {
  res.json({
    ok: true,
    webhooksConfigured: !!(WEBHOOK_LOW && WEBHOOK_HIGH),
    authRequired: !!SECRET_TOKEN,
    uptime: process.uptime()
  });
});

app.post("/data", authenticate, async (req, res) => {
  const clientIp = req.ip;

  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    addDebugLog({ status: "rate_limited", ip: clientIp });
    return res.status(429).json({ ok: false, error: "Rate limit exceeded" });
  }

  try {
    const payload = req.body;

    // Validate payload
    if (!payload || !payload.brainrots || !Array.isArray(payload.brainrots)) {
      addDebugLog({ status: "invalid_payload", ip: clientIp });
      return res.status(400).json({ ok: false, error: "Invalid payload: brainrots array required" });
    }

    const jobId = payload.jobId || "unknown";
    const placeId = payload.placeId || "unknown";

    // Deduplication
    if (!checkDedup(jobId)) {
      addDebugLog({ status: "duplicate", jobId, ip: clientIp });
      return res.json({ ok: true, message: "Duplicate request ignored" });
    }

    // Truncate to MAX_BRAINROTS entries
    const brainrots = payload.brainrots.slice(0, MAX_BRAINROTS);

    // Separate by range
    const lowBrainrots = brainrots.filter(b => b.value >= 1e6 && b.value <= 1e7);
    const highBrainrots = brainrots.filter(b => b.value > 1e7);

    const results = { low: null, high: null };

    if (lowBrainrots.length > 0) {
      results.low = await sendEmbed(lowBrainrots, payload, WEBHOOK_LOW, "LOW");
    }
    if (highBrainrots.length > 0) {
      results.high = await sendEmbed(highBrainrots, payload, WEBHOOK_HIGH, "HIGH");
    }

    addDebugLog({
      status: "processed",
      jobId,
      placeId,
      brainrotCount: brainrots.length,
      lowSent: results.low?.success || false,
      highSent: results.high?.success || false,
      ip: clientIp
    });

    res.json({ ok: true, message: "Notifications sent", results });
  } catch (err) {
    console.error("Error processing /data:", err);
    addDebugLog({ status: "error", error: err.message, ip: clientIp });
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/notifications/high", (req, res) => {
  res.json(lastHighNotification || {});
});

app.get("/notifications/low", (req, res) => {
  res.json(lastLowNotification || {});
});

app.get("/debug/last", (req, res) => {
  res.json({ logs: debugLog });
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`✅ Webhooks configured: ${!!(WEBHOOK_LOW && WEBHOOK_HIGH)}`);
  console.log(`✅ Authentication: ${SECRET_TOKEN ? "Enabled" : "Disabled"}`);
});
