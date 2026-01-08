# Steal a Brainrot Auto-Joiner

Auto-joiner script for **Steal a Brainrot** (PlaceId: 109983668079237) with Discord webhook notifications.

## Features

### Auto-Joiner (Roblox Lua Script)
- ✅ **Server Filtering**: Only lists and joins servers for PlaceId 109983668079237
- ✅ **Accurate Teleportation**: Uses correct placeId for TeleportService
- ✅ **Brainrot ESP**: Highlights highest-value brainrot on server
- ✅ **Auto-Grab**: Automatically teleports to and grabs brainrots
- ✅ **Safe Anti-Hit**: Evasive movement without hitbox modification
- ✅ **Discord Integration**: Sends notifications to webhook server

### Notifier Server (Node.js)
- ✅ **Discord Webhooks**: Separate webhooks for low (1-10M) and high (>10M) value targets
- ✅ **Rate Limiting**: 30 requests per 15 seconds per IP
- ✅ **Deduplication**: Prevents duplicate notifications (60s window per jobId)
- ✅ **Authentication**: Optional SECRET_TOKEN protection
- ✅ **Debug Logging**: Stores last 50 requests at `/debug/last`
- ✅ **Health Checks**: `/health` and `/status` endpoints

## Server Deployment (Render)

### Step 1: Create Discord Webhooks

1. Go to your Discord server settings
2. Navigate to Integrations > Webhooks
3. Create two webhooks:
   - **Low Range**: For brainrots worth 1-10M/s
   - **High Range**: For brainrots worth >10M/s
4. Copy both webhook URLs

### Step 2: Deploy to Render

1. Fork this repository to your GitHub account
2. Go to [Render.com](https://render.com) and sign up/login
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure the service:
   - **Name**: `brainrot-notifier` (or your choice)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### Step 3: Set Environment Variables

In Render, add these environment variables:

| Variable | Value | Required |
|----------|-------|----------|
| `WEBHOOK_LOW` | Your Discord webhook URL for low-range alerts | ✅ Yes |
| `WEBHOOK_HIGH` | Your Discord webhook URL for high-range alerts | ✅ Yes |
| `SECRET_TOKEN` | Secret token for authentication (optional) | ❌ No |
| `PORT` | Port number (default: 3000) | ❌ No |

### Step 4: Deploy

Click "Create Web Service" and wait for deployment to complete.

Your server URL will be: `https://your-service-name.onrender.com`

## Testing the Server

### Health Check
```bash
curl https://your-service-name.onrender.com/health
```
Expected response:
```json
{"ok":true,"status":"healthy"}
```

### Status Check
```bash
curl https://your-service-name.onrender.com/status
```
Expected response:
```json
{
  "ok": true,
  "webhooksConfigured": true,
  "authRequired": false,
  "uptime": 123.45
}
```

### Test Data Endpoint (with authentication)
```bash
curl -X POST https://your-service-name.onrender.com/data \
  -H "Content-Type: application/json" \
  -H "x-notifier-token: YOUR_SECRET_TOKEN" \
  -d '{
    "placeId": 109983668079237,
    "jobId": "test-job-id",
    "brainrots": [
      {"name": "Skibidi", "value": 5000000},
      {"name": "Grimace", "value": 15000000}
    ]
  }'
```

Expected response:
```json
{
  "ok": true,
  "message": "Notifications sent",
  "results": {
    "low": {"success": true},
    "high": {"success": true}
  }
}
```

### View Debug Logs
```bash
curl https://your-service-name.onrender.com/debug/last
```

## Roblox Script Integration

In the Auto-joiner script, configure the notifier:

```lua
-- Add to Config section
Notifier = {
    Url = "https://your-service-name.onrender.com/data",
    Secret = "YOUR_SECRET_TOKEN" -- Optional, leave as "" if not using
}
```

The script will automatically send notifications using:

```lua
HttpService:RequestAsync({
    Url = Config.Notifier.Url,
    Method = "POST",
    Headers = {
        ["Content-Type"] = "application/json",
        ["x-notifier-token"] = Config.Notifier.Secret
    },
    Body = HttpService:JSONEncode({
        placeId = Config.PlaceId,
        jobId = game.JobId,
        brainrots = brainrotsList
    })
})
```

## Important Notes

### Server List Behavior
- ✅ **Only shows servers for PlaceId 109983668079237** (Steal a Brainrot)
- ✅ **Income is NOT available** from Roblox API and will show as "N/A/s" in the UI
- ✅ **Filtering works correctly** - only servers matching the exact PlaceId are displayed
- ✅ **Teleportation is accurate** - uses TeleportToPlaceInstance with correct placeId

### Anti-Hit (Auto-Dodge) Mode
The Safe Anti-Hit feature performs **evasive movement only**:
- ❌ **No hitbox modification**
- ❌ **No network replication tampering**
- ✅ **Detects nearby threats**
- ✅ **Performs lateral dodging steps**
- ✅ **Safe and non-intrusive**

### Rate Limits
- **15 second window**: Maximum 30 requests per IP
- **60 second deduplication**: Same jobId won't trigger multiple notifications
- **Payload limit**: Only first 25 brainrots are processed

## Troubleshooting

### Server doesn't start
- Check that `WEBHOOK_LOW` and `WEBHOOK_HIGH` are set correctly
- View logs in Render dashboard

### No Discord messages
- Verify webhook URLs are correct
- Check `/debug/last` for error messages
- Ensure webhooks haven't been deleted in Discord

### Authentication errors
- If using `SECRET_TOKEN`, ensure header `x-notifier-token` is included
- Token must match exactly

### Rate limiting
- Wait 15 seconds and try again
- Check `/debug/last` to see when rate limit resets

## API Endpoints Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/status` | GET | No | Server status and configuration |
| `/data` | POST | Optional | Receive brainrot data from Roblox |
| `/notifications/high` | GET | No | Last high-value notification |
| `/notifications/low` | GET | No | Last low-value notification |
| `/debug/last` | GET | No | Last 50 request logs |

## License

MIT License - Feel free to modify and use as needed.
