# Steal-a-Brainrot Auto-Joiner

An advanced auto-joiner script for Roblox's "Steal a Brainrot" game with ESP, auto-grab, and safe anti-hit features.

## Features

### Core Features
- **Auto-Joiner**: Automatically scans and joins high-income servers
- **Strict PlaceId Filter**: Only joins servers for PlaceId `109983668079237` to avoid wrong games
- **ESP System**: Highlights the highest-value Brainrot on the server
- **Auto-Grab**: Automatically teleports to and grabs high-value Brainrots
- **Anti-Hit (Auto-Dodge)**: Safe, ToS-compliant evasive movement system

### External Notifier Integration
- Optional webhook integration to send brainrot data to an external server
- POST endpoint accepts data via `HttpService:RequestAsync()`
- Supports environment variables for production deployment (Render)

## Configuration

### Roblox Script (Auto-joiner)

Key configuration options in the `Config` table:

```lua
PlaceId = 109983668079237  -- Target game PlaceId
UseServerPlaceId = true     -- Enable strict PlaceId filtering
MinimumIncome = 100000000   -- Minimum income threshold (100M/s)
NotifierUrl = ""            -- Optional: External notifier server URL
AntiHitEnabled = false      -- Auto-Dodge mode
ESPEnabled = true           -- ESP highlighting
AutoGrabEnabled = false     -- Auto-grab Brainrots
```

### Node.js Server (server.js)

Environment variables for production (required):

```bash
PORT=3000                    # Server port (default: 3000)
NODE_ENV=production          # Environment mode
WEBHOOK_LOW=<discord_url>    # Discord webhook for 1-10M brainrots (required in production)
WEBHOOK_HIGH=<discord_url>   # Discord webhook for >10M brainrots (required in production)
```

**Note:** Webhook URLs are not hardcoded for security. You must set them via environment variables in production.

## API Endpoints

### POST /data
Receives brainrot data from Roblox script.

**Request Body:**
```json
{
  "brainrots": [
    {"name": "Skibidi Sigma", "value": 5000000},
    {"name": "Gyatt Master", "value": 15000000}
  ],
  "jobId": "job-id-here",
  "placeId": 109983668079237
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2026-01-08T12:00:00.000Z"
}
```

### GET /status
Detailed status and statistics.

**Response:**
```json
{
  "status": "ok",
  "environment": "development",
  "requestCount": 42,
  "lastRequestTime": "2026-01-08T12:00:00.000Z",
  "lastHighNotification": {...},
  "lastLowNotification": {...},
  "webhooks": {
    "low": "configured",
    "high": "configured"
  }
}
```

### GET /notifications/high
Get last high-value notification (>10M).

### GET /notifications/low
Get last low-value notification (1-10M).

### GET /
Root endpoint with service information.

## Anti-Hit (Auto-Dodge) System

The Anti-Hit system is a **ToS-compliant** evasive movement feature that:

1. Detects nearby players with weapons or approaching threats
2. Performs random dodge movements (strafe, step back, diagonal)
3. Does **NOT** modify hitboxes or character properties
4. Does **NOT** use desync or replication exploits
5. Uses legitimate client-side movement only

This replaces the previous "Hitbox Remover" feature which violated Roblox ToS.

## Deployment

### Deploying to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set environment variables:
   - `NODE_ENV=production`
   - `WEBHOOK_LOW=<your-discord-webhook>`
   - `WEBHOOK_HIGH=<your-discord-webhook>`
4. Deploy!

### Using with Roblox

1. Execute the Auto-joiner script in Roblox
2. Click the brain icon to open the UI
3. Configure settings in the Settings tab
4. Enable features as needed
5. Start the auto-joiner

## Security & ToS Compliance

This script is designed to be ToS-compliant:

- ✅ No hitbox modification
- ✅ No desync exploits
- ✅ No unhittable/invincibility hacks
- ✅ Client-side movement only
- ✅ Legitimate API usage

## Development

### Running Locally

```bash
npm install
npm start
```

### Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test status endpoint
curl http://localhost:3000/status

# Test data endpoint
curl -X POST http://localhost:3000/data \
  -H "Content-Type: application/json" \
  -d '{"brainrots": [...], "jobId": "...", "placeId": 109983668079237}'
```

## License

For educational purposes only. Use responsibly and in accordance with Roblox Terms of Service.
