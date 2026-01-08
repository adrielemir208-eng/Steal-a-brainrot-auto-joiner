import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Environment variables for production deployment (Render)
const WEBHOOK_LOW = process.env.WEBHOOK_LOW || "";   // 1–10 millones
const WEBHOOK_HIGH = process.env.WEBHOOK_HIGH || "";  // >10 millones
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Guardar últimas notificaciones
let lastLowNotification = null;
let lastHighNotification = null;

// Statistics for debug
let requestCount = 0;
let lastRequestTime = null;

// Función para construir y enviar embed
async function sendEmbed(brainrots, payload, webhookUrl) {
  const jobId = payload.jobId || "N/A";
  const placeId = payload.placeId || "N/A";

  // Seleccionar el brainrot con mayor valor
  const topBrainrot = brainrots.reduce((max, b) => (b.value > max.value ? b : max), brainrots[0]);

  // Línea única con nombre y dinero
  const line = `${topBrainrot.name} / $${(topBrainrot.value/1e6).toFixed(2)} M/s`;

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

  // Guardar notificación según rango
  if (webhookUrl === WEBHOOK_HIGH) {
    lastHighNotification = {
      name: topBrainrot.name,
      value: topBrainrot.value,
      placeId,
      jobId
    };
  } else if (webhookUrl === WEBHOOK_LOW) {
    lastLowNotification = {
      name: topBrainrot.name,
      value: topBrainrot.value,
      placeId,
      jobId
    };
  }
}

// Endpoint que recibe datos desde Roblox
app.post("/data", async (req, res) => {
  try {
    requestCount++;
    lastRequestTime = new Date().toISOString();
    
    const payload = req.body;

    // Validate payload
    if (!payload || !payload.brainrots || !Array.isArray(payload.brainrots)) {
      return res.status(400).json({ ok: false, error: "Invalid payload: brainrots array required" });
    }

    if (NODE_ENV === "development") {
      console.log("Received payload with", payload.brainrots?.length || 0, "brainrot(s)");
    }

    // Separar brainrots por rango
    const lowBrainrots = payload.brainrots.filter(b => b.value >= 1e6 && b.value <= 1e7);
    const highBrainrots = payload.brainrots.filter(b => b.value > 1e7);

    // Enviar solo el top brainrot de cada rango
    if (lowBrainrots.length > 0) {
      await sendEmbed(lowBrainrots, payload, WEBHOOK_LOW);
    }
    if (highBrainrots.length > 0) {
      await sendEmbed(highBrainrots, payload, WEBHOOK_HIGH);
    }

    res.json({ ok: true, message: "Top brainrot enviado según rango" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Endpoints para consultar últimas notificaciones
app.get("/notifications/high", (req, res) => {
  res.json(lastHighNotification || {});
});

app.get("/notifications/low", (req, res) => {
  res.json(lastLowNotification || {});
});

// Debug endpoints
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get("/status", (req, res) => {
  res.json({
    status: "ok",
    environment: NODE_ENV,
    requestCount,
    lastRequestTime,
    lastHighNotification,
    lastLowNotification,
    webhooks: {
      low: WEBHOOK_LOW ? "configured" : "not configured",
      high: WEBHOOK_HIGH ? "configured" : "not configured"
    }
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "Steal-a-Brainrot Notifier",
    version: "1.0.0",
    endpoints: {
      POST: ["/data"],
      GET: ["/health", "/status", "/notifications/high", "/notifications/low"]
    }
  });
});

// Render necesita escuchar en el puerto asignado
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
  console.log(`Modo: ${NODE_ENV}`);
  console.log(`Webhook LOW: ${WEBHOOK_LOW ? "configurado" : "no configurado"}`);
  console.log(`Webhook HIGH: ${WEBHOOK_HIGH ? "configurado" : "no configurado"}`);
});
