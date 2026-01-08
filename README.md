# Steal a Brainrot - Discord Notifier

A Node.js server that receives Roblox game events and forwards them to Discord webhooks. Designed to be deployed on Render.com with robust security, observability, and error handling.

## Features

- **Dual Discord Webhooks**: Separate notifications for low (1-10M) and high (>10M) value brainrots
- **Authentication**: Optional SECRET_TOKEN to prevent unauthorized access
- **Rate Limiting**: 30 requests per minute per IP address
- **Deduplication**: Prevents duplicate notifications within a sliding window
- **Request Logging**: Safe, minimal logging of incoming requests
- **Debug Endpoint**: View last 50 received payloads
- **Health Checks**: `/health` and `/status` endpoints for monitoring
- **Content-Type Fallback**: Accepts JSON even with incorrect or missing Content-Type headers

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/adrielemir208-eng/Steal-a-brainrot-auto-joiner.git
   cd Steal-a-brainrot-auto-joiner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Discord webhook URLs and secret token:
   ```env
   WEBHOOK_LOW=https://discord.com/api/webhooks/YOUR_LOW_WEBHOOK_ID/YOUR_TOKEN
   WEBHOOK_HIGH=https://discord.com/api/webhooks/YOUR_HIGH_WEBHOOK_ID/YOUR_TOKEN
   SECRET_TOKEN=your-secret-token-here
   PORT=3000
   ```

4. **Run the server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Test the server**
   ```bash
   curl http://localhost:3000/health
   ```

## Deployment on Render

### Step 1: Create Discord Webhooks

1. Go to your Discord server
2. Navigate to **Server Settings** > **Integrations** > **Webhooks**
3. Click **New Webhook** (create two: one for LOW and one for HIGH)
4. Copy the webhook URLs

### Step 2: Deploy to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** > **Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `brainrot-notifier` (or your choice)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free or Starter

### Step 3: Set Environment Variables

In Render's **Environment** section, add these variables:

| Key | Value | Description |
|-----|-------|-------------|
| `WEBHOOK_LOW` | `https://discord.com/api/webhooks/...` | Discord webhook for 1-10M brainrots |
| `WEBHOOK_HIGH` | `https://discord.com/api/webhooks/...` | Discord webhook for >10M brainrots |
| `SECRET_TOKEN` | `your-random-secret` | Authentication token (generate with `openssl rand -hex 32`) |
| `PORT` | (auto-set by Render) | Port number (don't set manually) |

### Step 4: Deploy

1. Click **Create Web Service**
2. Wait for deployment to complete
3. Note your service URL: `https://your-service-name.onrender.com`

## API Endpoints

### POST /data

Receives brainrot data from Roblox and sends Discord notifications.

**Headers:**
- `Content-Type: application/json` (recommended but not required)
- `Authorization: your-secret-token` OR `X-Secret-Token: your-secret-token`

**Request Body:**
```json
{
  "jobId": "abc123",
  "placeId": "109983668079237",
  "brainrots": [
    { "name": "Skibidi", "value": 15000000 },
    { "name": "Grimace", "value": 5000000 }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Notifications sent successfully"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-08T10:00:00.000Z"
}
```

### GET /status

Detailed status information.

**Response:**
```json
{
  "status": "running",
  "webhooks": {
    "low": "configured",
    "high": "configured"
  },
  "lastNotifications": {
    "low": { "name": "Grimace", "value": 5000000, "timestamp": "..." },
    "high": { "name": "Skibidi", "value": 15000000, "timestamp": "..." }
  },
  "payloadsReceived": 42,
  "uptime": 3600
}
```

### GET /debug/last

View last 50 received payloads (redacted for safety).

**Response:**
```json
{
  "count": 50,
  "payloads": [
    {
      "timestamp": "2024-01-08T10:00:00.000Z",
      "jobId": "abc123",
      "placeId": "109983668079237",
      "brainrotCount": 2,
      "topBrainrots": [
        { "name": "Skibidi", "value": 15000000 }
      ]
    }
  ]
}
```

## Roblox Integration

### Important: Use HttpService:RequestAsync

Roblox's `PostAsync` **does not support custom headers**. You **must** use `RequestAsync` to send the authentication token.

### Add Notifier Configuration to Auto-joiner Script

Add this configuration block at the **top** of your `Auto-joiner` Lua script (after service declarations):

```lua
-- Notifier Configuration
local Notifier = {
    Enabled = false, -- Set to true to enable Discord notifications
    Url = "https://your-service-name.onrender.com/data",
    SecretToken = "your-secret-token-here"
}

-- Function to send notification to Discord
local function sendNotification(brainrots, jobId, placeId)
    if not Notifier.Enabled then return end
    
    local payload = {
        jobId = jobId,
        placeId = placeId,
        brainrots = brainrots
    }
    
    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = Notifier.Url,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
                ["Authorization"] = Notifier.SecretToken
            },
            Body = HttpService:JSONEncode(payload)
        })
    end)
    
    if success and response.Success then
        print("[Notifier] Sent to Discord:", response.Body)
    else
        warn("[Notifier] Failed to send:", response)
    end
end
```

### Example Usage

When you detect high-value brainrots in a server, call:

```lua
local brainrotsToSend = {
    { name = "Skibidi", value = 15000000 },
    { name = "Grimace", value = 5000000 }
}

sendNotification(brainrotsToSend, game.JobId, game.PlaceId)
```

## Testing

### Test with curl (Local)

```bash
# Health check
curl http://localhost:3000/health

# Status
curl http://localhost:3000/status

# Send test data (with authentication)
curl -X POST http://localhost:3000/data \
  -H "Content-Type: application/json" \
  -H "Authorization: your-secret-token" \
  -d '{
    "jobId": "test-123",
    "placeId": "109983668079237",
    "brainrots": [
      {"name": "Skibidi", "value": 15000000},
      {"name": "Grimace", "value": 5000000}
    ]
  }'

# View debug logs
curl http://localhost:3000/debug/last
```

### Test with curl (Render)

Replace `http://localhost:3000` with your Render URL:

```bash
curl https://your-service-name.onrender.com/health
```

### Test Discord Webhooks Directly

```bash
curl -X POST "https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Test",
    "content": "Testing webhook!"
  }'
```

## Troubleshooting

### Server not receiving requests

1. **Check Render logs**: Go to Render dashboard > Your service > Logs
2. **Verify environment variables**: Ensure all required variables are set
3. **Test health endpoint**: `curl https://your-service.onrender.com/health`
4. **Check for errors in logs**: Look for startup errors or missing configuration

### Discord webhooks not working

1. **Verify webhook URLs**: Test them directly with curl (see above)
2. **Check Render logs**: Look for error messages when sending to Discord
3. **Ensure webhooks are not rate-limited**: Discord has webhook rate limits
4. **Verify webhook format**: Check the Discord Developer Portal for any changes

### Authentication errors (401 Unauthorized)

1. **Check SECRET_TOKEN**: Ensure it matches in both `.env` and Roblox script
2. **Verify header name**: Use `Authorization` or `X-Secret-Token`
3. **Check for typos**: Secret tokens are case-sensitive
4. **Test without auth**: Temporarily remove SECRET_TOKEN to test connectivity

### Rate limiting (429 errors)

- Default: 30 requests per minute per IP
- Wait 1 minute before retrying
- Consider implementing client-side throttling in your Roblox script

### Roblox script not sending data

1. **Use RequestAsync, not PostAsync**: PostAsync doesn't support custom headers
2. **Enable HttpService**: `HttpService.HttpEnabled = true` in Studio settings
3. **Check Roblox output**: Look for error messages in the output console
4. **Test URL directly**: Use curl to verify the server is reachable
5. **Check for CORS**: Roblox servers should not have CORS issues, but verify the URL is correct

### Environment variables not loading

1. **Check .env file**: Ensure it exists and has correct format
2. **Restart server**: Changes to .env require a restart
3. **Check for quotes**: Don't use quotes around values in .env
4. **On Render**: Set variables in dashboard, not .env file

### Content-Type errors

- Server now accepts JSON even without proper Content-Type header
- If you still get errors, ensure the request body is valid JSON

## Monitoring

### View Render Logs

1. Go to Render dashboard
2. Click on your service
3. Click **Logs** tab
4. Look for:
   - `[TIMESTAMP] Server listening on port XXX`
   - `[TIMESTAMP] Webhook LOW: configured`
   - `[TIMESTAMP] Webhook HIGH: configured`
   - `[TIMESTAMP] POST /data from IP_ADDRESS`

### Check Service Status

Visit: `https://your-service-name.onrender.com/status`

This shows:
- Webhook configuration status
- Last notifications sent
- Total payloads received
- Server uptime

## Security Best Practices

1. **Always use SECRET_TOKEN** in production
2. **Generate strong tokens**: `openssl rand -hex 32`
3. **Never commit .env** to git (already in .gitignore)
4. **Rotate tokens** periodically
5. **Monitor logs** for suspicious activity
6. **Use HTTPS**: Render provides this automatically

## Support

For issues or questions:
- Check Render logs first
- Test endpoints with curl
- Verify environment variables
- Review Roblox output console

## License

MIT
