import "dotenv/config";
import express from "express";
import fetch from "node-fetch";

const app = express();

// Trust proxy for correct IP detection
app.set("trust proxy", true);

// JSON body parser with lenient content-type handling
app.use(express.json({ 
  type: ["application/json", "text/plain", "*/*"],
  strict: false 
}));

// Environment variables
const WEBHOOK_LOW = process.env.WEBHOOK_LOW;
const WEBHOOK_HIGH = process.env.WEBHOOK_HIGH;
const SECRET_TOKEN = process.env.SECRET_TOKEN || "";
const PORT = process.env.PORT || 3000;

// In-memory storage
let lastLowNotification = null;
let lastHighNotification = null;
const recentPayloads = []; // Stores last 50 payload summaries
const recentHashesArray = []; // FIFO array for hash order
const recentHashesSet = new Set(); // Fast O(1) lookup
const requestCounts = new Map(); // For rate limiting: IP -> {count, resetTime}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

// Helper: Check rate limit
function checkRateLimit(ip) {
  const now = Date.now();
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

// Helper: Create hash for deduplication
function createPayloadHash(payload) {
  const str = JSON.stringify({
    jobId: payload.jobId,
    placeId: payload.placeId,
    brainrots: payload.brainrots?.map(b => ({ name: b.name, value: b.value }))
  });
  return Buffer.from(str).toString("base64");
}

// Helper: Store payload summary (redacted for /debug/last)
function storePayloadSummary(payload) {
  const summary = {
    timestamp: new Date().toISOString(),
    jobId: payload.jobId || "N/A",
    placeId: payload.placeId || "N/A",
    brainrotCount: Array.isArray(payload.brainrots) ? payload.brainrots.length : 0,
    topBrainrots: Array.isArray(payload.brainrots) 
      ? payload.brainrots.slice(0, 3).map(b => ({
          name: (b.name || "").substring(0, 50), // Limit field size
          value: b.value
        }))
      : []
  };
  
  recentPayloads.unshift(summary);
  if (recentPayloads.length > 50) {
    recentPayloads.pop();
  }
}

// Function to send embed to Discord
async function sendEmbed(brainrots, payload, webhookUrl) {
  const jobId = payload.jobId || "N/A";
  const placeId = payload.placeId || "N/A";

  // Select top brainrot by value
  const topBrainrot = brainrots.reduce((max, b) => (b.value > max.value ? b : max), brainrots[0]);

  const line = `${topBrainrot.name} / $${(topBrainrot.value / 1e6).toFixed(2)} M/s`;
  const joinLink = `https://www.roblox.com/games/start?placeId=${placeId}&gameInstanceId=${jobId}`;
  const joinScript = `game:GetService("TeleportService"):TeleportToPlaceInstance(${placeId},"${jobId}",game.Players.LocalPlayer)`;

  const embed = {
    username: ".",
    embeds: [{
      title: "Angies hub",
      color: 16742400,
      fields: [
        { name: "Name", value: line || "N/A", inline: false },
        { name: "Job ID", value: jobId, inline: false },
        { name: "Join Link", value: `[Click para unirse](${joinLink})`, inline: false },
        { name: "Join Script (PC)", value: "```lua\n" + joinScript + "\n```", inline: false }
      ]
    }]
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(embed)
  });

  // Store last notification
  if (webhookUrl === WEBHOOK_HIGH) {
    lastHighNotification = {
      name: topBrainrot.name,
      value: topBrainrot.value,
      placeId,
      jobId,
      timestamp: new Date().toISOString()
    };
  } else if (webhookUrl === WEBHOOK_LOW) {
    lastLowNotification = {
      name: topBrainrot.name,
      value: topBrainrot.value,
      placeId,
      jobId,
      timestamp: new Date().toISOString()
    };
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Status endpoint
app.get("/status", (req, res) => {
  res.json({
    status: "running",
    webhooks: {
      low: WEBHOOK_LOW ? "configured" : "missing",
      high: WEBHOOK_HIGH ? "configured" : "missing"
    },
    lastNotifications: {
      low: lastLowNotification || null,
      high: lastHighNotification || null
    },
    payloadsReceived: recentPayloads.length,
    uptime: process.uptime()
  });
});

// Debug endpoint - last 50 payloads
app.get("/debug/last", (req, res) => {
  res.json({
    count: recentPayloads.length,
    payloads: recentPayloads
  });
});

// Main data endpoint
app.post("/data", async (req, res) => {
  try {
    // Request logging (safe, minimal fields)
    const clientIp = req.ip || req.socket?.remoteAddress || "unknown";
    console.log(`[${new Date().toISOString()}] POST /data from ${clientIp}`);
    
    // Authentication check
    if (SECRET_TOKEN) {
      const authHeader = req.get("authorization") || req.get("x-secret-token");
      if (authHeader !== SECRET_TOKEN) {
        console.log(`[${new Date().toISOString()}] Unauthorized request from ${clientIp}`);
        return res.status(401).json({ ok: false, error: "Unauthorized: Invalid or missing secret token" });
      }
    }

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      console.log(`[${new Date().toISOString()}] Rate limit exceeded for ${clientIp}`);
      return res.status(429).json({ ok: false, error: "Rate limit exceeded. Try again later." });
    }

    // Validate webhook URLs are configured
    if (!WEBHOOK_LOW) {
      return res.status(500).json({ 
        ok: false, 
        error: "Server misconfigured: WEBHOOK_LOW environment variable is missing" 
      });
    }
    if (!WEBHOOK_HIGH) {
      return res.status(500).json({ 
        ok: false, 
        error: "Server misconfigured: WEBHOOK_HIGH environment variable is missing" 
      });
    }

    const payload = req.body;

    // Validate payload structure
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ ok: false, error: "Invalid payload: must be a JSON object" });
    }
    
    if (!Array.isArray(payload.brainrots)) {
      return res.status(400).json({ ok: false, error: "Invalid payload: brainrots must be an array" });
    }

    // Deduplication check (O(1) lookup with Set)
    const payloadHash = createPayloadHash(payload);
    if (recentHashesSet.has(payloadHash)) {
      console.log(`[${new Date().toISOString()}] Duplicate payload detected, skipping`);
      return res.json({ ok: true, message: "Duplicate payload, skipped" });
    }
    
    // Add to both Set (for fast lookup) and array (for FIFO)
    recentHashesSet.add(payloadHash);
    recentHashesArray.push(payloadHash);
    
    // Maintain max size
    if (recentHashesArray.length > 100) {
      const oldestHash = recentHashesArray.shift();
      recentHashesSet.delete(oldestHash);
    }

    // Store payload summary
    storePayloadSummary(payload);

    // Log payload summary
    console.log(`[${new Date().toISOString()}] Payload received: ${payload.brainrots.length} brainrots, jobId=${payload.jobId}, placeId=${payload.placeId}`);

    // Separate brainrots by range
    const lowBrainrots = payload.brainrots.filter(b => b.value >= 1e6 && b.value <= 1e7);
    const highBrainrots = payload.brainrots.filter(b => b.value > 1e7);

    // Send top brainrot for each range
    if (lowBrainrots.length > 0) {
      await sendEmbed(lowBrainrots, payload, WEBHOOK_LOW);
      console.log(`[${new Date().toISOString()}] Sent LOW webhook notification`);
    }
    if (highBrainrots.length > 0) {
      await sendEmbed(highBrainrots, payload, WEBHOOK_HIGH);
      console.log(`[${new Date().toISOString()}] Sent HIGH webhook notification`);
    }

    res.json({ ok: true, message: "Notifications sent successfully" });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error:`, err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Legacy endpoints for backward compatibility
app.get("/notifications/high", (req, res) => {
  res.json(lastHighNotification || {});
});

app.get("/notifications/low", (req, res) => {
  res.json(lastLowNotification || {});
});

// Start server
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server listening on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] Webhooks configured: ${(WEBHOOK_LOW && WEBHOOK_HIGH) ? "Yes" : "Incomplete"}`);
  console.log(`[${new Date().toISOString()}] Authentication: ${SECRET_TOKEN ? "Enabled" : "Disabled"}`);
});
