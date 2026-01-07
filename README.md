# Steal a Brainrot Auto Joiner

A Roblox script for automatically joining public servers in "Steal a Brainrot".

## 🚨 IMPORTANT - READ FIRST

**If you're seeing servers from other games:**
1. Open the UI (click brain icon)
2. Go to **Settings** tab
3. Find **"Game Place ID (IMPORTANT!)"** (red border)
4. Verify the Place ID matches your game
5. If wrong, enter the correct Place ID from your game's URL

**Understanding the Limitations:**
- ✅ The script CAN show all public servers for your game
- ❌ The script CANNOT detect income or brainrots from the API
- ℹ️ You must JOIN a server to see income and brainrots
- ℹ️ The Roblox API only provides: server job ID, player count, ping

## 🎯 Features

### Core Functionality
- ✅ **Real Server Fetching** - Shows ONLY real servers from Roblox API (no fake/simulated data)
- ✅ **Place ID Verification** - Configure the correct game Place ID in Settings
- ✅ **Player Count Filtering** - Avoid crowded servers (configurable)
- ✅ **ESP System** - Highlights the highest value Brainrot on the server
- ✅ **Modern UI** - Neon black theme with purple accents

### What You Can Filter
- 👥 **Player Count** - Only join servers with fewer than X players
- 🎮 **Place ID** - Ensure you're looking at the right game's servers

### What You CANNOT Filter (API Limitations)
- ❌ **Income** - Must join server to see
- ❌ **Brainrot Types** - Must join server to see
- ❌ **Brainrot Values** - Must join server to see

## 🚀 Quick Start

1. **Get an Executor**: Use a Roblox script executor
2. **Copy the Script**: Copy the entire `Auto-joiner` file
3. **Execute in Game**: Run the script while in Roblox
4. **Click the Brain Icon**: UI appears on the left side
5. **VERIFY PLACE ID**: Go to Settings → Check "Game Place ID"
6. **Start Scanning**: Click "Start Auto-Joiner" in Dashboard

## 📋 Configuration

### Critical Settings

| Setting | Location | Description |
|---------|----------|-------------|
| **Place ID** | Settings tab | The game's Place ID - MUST BE CORRECT! |
| Max Player Count | Settings tab | Only join servers with < this many players |

### How to Find Your Game's Place ID

1. Go to the Roblox game page
2. Look at the URL: `https://www.roblox.com/games/{PLACE_ID}/game-name`
3. Copy the number (Place ID)
4. Enter it in Settings → "Game Place ID"

**Example:**
- URL: `https://www.roblox.com/games/109983668079237/Steal-a-Brainrot`
- Place ID: `109983668079237`

## 🎮 Usage

### Step-by-Step

1. **Launch Script** in Roblox
2. **Click Brain Icon** (left side of screen)
3. **Go to Settings Tab**
4. **Verify Place ID** - This is the most important step!
5. **Adjust Max Player Count** (optional - default is 12)
6. **Return to Dashboard**
7. **Click "Start Auto-Joiner"**
8. **Script scans and shows available servers**
9. **Join a server** to see income and brainrots

### What Happens When You Start

```
1. Script fetches Universe ID from your Place ID
2. Script queries Roblox API for public servers
3. Filters servers by player count
4. Shows you all available servers
5. You choose which server to join
```

## 🛡️ Troubleshooting

### Problem: "Seeing servers from other games"

**Solution:**
1. Open Settings tab
2. Check the Place ID setting (red border)
3. Make sure it matches YOUR game
4. If wrong, update it and try again

### Problem: "No servers found"

**Possible Causes:**
- Place ID is incorrect
- All servers are full (increase Max Player Count)
- Game has no public servers currently
- API is temporarily unavailable

**Solutions:**
1. Verify Place ID in Settings
2. Increase Max Player Count to 100
3. Try again later
4. Check console for error messages

### Problem: "Income shows as Unknown"

**This is normal!** The Roblox API doesn't provide income data. You must:
1. Join a server
2. Use the ESP feature to find high-value brainrots
3. Income will be visible once you're in the server

### Problem: "Brainrots show as Unknown"

**This is normal!** The Roblox API doesn't provide brainrot data. You must:
1. Join a server
2. Enable ESP in the ESP tab
3. The script will highlight the highest value brainrot

## 📊 What the UI Shows

### Dashboard Tab
- **Status**: Active/Inactive
- **Servers Scanned**: Total servers checked from API
- **Eligible Servers**: Servers matching your filters

### Settings Tab
- **Game Place ID** ⚠️ MOST IMPORTANT SETTING
- **Minimum Income**: (Not used - API limitation)
- **Scan Interval**: Time between scans
- **Max Player Count**: Avoid crowded servers

### Servers Tab
Shows all eligible servers with:
- 🌐 Server number
- 💰 Income: Unknown (join to check)
- 👥 Players: X/Y (actual count from API)
- 🧠 Brainrots: Unknown (join to check)
- **Join Button**: Click to teleport

### ESP Tab
- Toggle ESP on/off
- Highlights highest value brainrot (when in a server)

## 🔧 Advanced Configuration

### In the Script Code

```lua
-- Change default Place ID (at top of script)
Config.PlaceId = 109983668079237  -- Change this to your game's Place ID

-- Change max player threshold
Config.MaxPlayerCount = 8  -- Only join servers with < 8 players

-- Enable/disable validation
Config.ValidateGameMatch = true  -- Always keep this true
```

## ⚠️ Important Notes

### API Limitations
The Roblox public API (`/v1/games/{universeId}/servers/Public`) provides:
- ✅ Server job ID
- ✅ Player count
- ✅ Max players
- ✅ Ping
- ❌ Income
- ❌ Brainrot data
- ❌ Any game-specific information

**This means:** You cannot filter by income or brainrots without actually joining servers.

### Why No Income/Brainrot Filtering?

To detect income or brainrots, the script would need to:
1. Join each server
2. Read the game's UI or workspace
3. Collect the data
4. Leave and join the next server

This is:
- ⚠️ Very slow (minutes per server)
- ⚠️ Against some game rules
- ⚠️ May trigger anti-cheat
- ⚠️ Uses your player slot

Therefore, this script shows you ALL servers and lets YOU choose based on player count.

### Safety
- Use at your own risk
- May violate Roblox Terms of Service
- Risk of account suspension/ban
- Don't share account credentials
- Use responsibly

## 📝 Credits

**By**: Sammy (SpyderSammy)  
**Game**: Steal a Brainrot (and compatible games)  
**Default Place ID**: 109983668079237

## 🆘 Getting Help

1. **Verify Place ID** - Most common issue!
2. **Check console** for error messages
3. **Read error notifications** in-game
4. **Make sure you're using a compatible game**

---

**Version**: 3.0 (Critical Fix Update)  
**Last Updated**: 2026-01-07  
**Focus**: Real API data only, Place ID verification
