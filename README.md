# Brainrot Auto-Joiner Notifier Server

This service receives Brainrot data from your Roblox script and posts Discord embeds to one or two webhooks (low/high ranges). It also exposes health and status endpoints.

## Configuration

Set environment variables (use `.env` locally or Render service settings):

- `WEBHOOK_LOW` — Discord webhook URL for 1M–10M range
- `WEBHOOK_HIGH` — Discord webhook URL for >10M range
- `SECRET_TOKEN` — Optional shared secret; if set, clients must send header `x-notifier-token`
- `PORT` — Optional; defaults to 3000

## Endpoints

- `POST /data` — payload: `{ placeId: number|string, jobId: string, brainrots: [{ name: string, value: number }] }`
- `GET /notifications/high` — last high-range notification
- `GET /notifications/low` — last low-range notification
- `GET /health` — service health
- `GET /status` — current service status/config

## Roblox Integration Example

```lua
local HttpService = game:GetService("HttpService")
local NOTIFIER_URL = "https://your-render-app.onrender.com/data"
local SECRET_TOKEN = "your-secret-token" -- Optional, must match server

local function sendBrainrotData(placeId, jobId, brainrots)
    local payload = {
        placeId = placeId,
        jobId = jobId,
        brainrots = brainrots
    }
    
    local headers = {
        ["Content-Type"] = "application/json"
    }
    
    -- Add secret token if configured
    if SECRET_TOKEN and SECRET_TOKEN ~= "" then
        headers["x-notifier-token"] = SECRET_TOKEN
    end
    
    local success, result = pcall(function()
        return HttpService:PostAsync(
            NOTIFIER_URL,
            HttpService:JSONEncode(payload),
            Enum.HttpContentType.ApplicationJson,
            false,
            headers
        )
    end)
    
    if success then
        print("Brainrot data sent successfully")
    else
        warn("Failed to send brainrot data:", result)
    end
end

-- Example usage:
local brainrots = {
    { name = "Skibidi", value = 5000000 },
    { name = "Grimace", value = 15000000 },
    { name = "Sigma", value = 8000000 }
}

sendBrainrotData(
    game.PlaceId,
    game.JobId,
    brainrots
)
```

## Setup Instructions

### Local Development

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your Discord webhook URLs
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the server:
   ```bash
   npm run dev  # Development mode with auto-reload
   # or
   npm start    # Production mode
   ```

### Deploying to Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set the following configuration:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `WEBHOOK_LOW`: Your Discord webhook URL for low range (1M-10M)
     - `WEBHOOK_HIGH`: Your Discord webhook URL for high range (>10M)
     - `SECRET_TOKEN`: (Optional) A secret token for authentication
     - `PORT`: (Optional) Defaults to 3000
4. Deploy!

## Features

- **Rate Limiting**: 30 requests per 15 seconds per IP to prevent abuse
- **Deduplication**: Prevents sending duplicate notifications for the same jobId within 60 seconds
- **Authentication**: Optional secret token authentication via `x-notifier-token` header
- **Payload Validation**: Validates all incoming data for correctness
- **Health Endpoints**: Monitor service health and status
- **Error Handling**: Comprehensive error handling with timeout protection

## Value Ranges

- **Low Range**: 1,000,000 to 10,000,000 (1M-10M) — sent to `WEBHOOK_LOW`
- **High Range**: >10,000,000 (>10M) — sent to `WEBHOOK_HIGH`

The server automatically categorizes brainrots by their value and sends the highest value in each range to the appropriate Discord webhook.

## License

MIT
