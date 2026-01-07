# Auto Joiner Server Filtering Guide

## Overview
The Steal-a-Brainrot Auto Joiner now includes comprehensive server filtering to ensure you only see and join servers running the correct game, preventing ghost servers and servers from other games.

## New Features

### 1. Game Validation
- **Universe ID Verification**: The script validates that servers belong to the correct Universe ID for "Steal a Brainrot"
- **Place ID Matching**: Ensures servers are running the exact game (Place ID: 109983668079237)
- **API-based Validation**: Uses Roblox's official API to fetch and verify server data

### 2. Player Count Filtering
- **Configuration**: `Config.MaxPlayerCount = 12` (default)
- **Purpose**: Filters out crowded servers to improve your chances
- **UI Control**: Adjustable via Settings tab → "Max Player Count"
- **Validation**: Accepts values between 1-100

### 3. Brainrot Name Filtering

#### Whitelist Mode
- **Configuration**: `Config.BrainrotWhitelist = {}`
- **Usage**: Add brainrot names to only join servers with those specific brainrots
- **Example**: `Config.BrainrotWhitelist = {"Sigma", "Grimace"}` - only joins servers with Sigma or Grimace
- **Default**: Empty (allows all brainrots)

#### Blacklist Mode
- **Configuration**: `Config.BrainrotBlacklist = {}`
- **Usage**: Add brainrot names to never join servers with those brainrots
- **Example**: `Config.BrainrotBlacklist = {"Ohio", "Smurf"}` - avoids servers with Ohio or Smurf
- **Priority**: Blacklist takes priority over whitelist

#### Ignore Unknown
- **Configuration**: `Config.IgnoreUnknown = true` (default)
- **Purpose**: Skips servers where brainrot information cannot be determined
- **Safety**: Prevents joining potentially incorrect servers

### 4. Multi-Filter Validation
All filters work together. A server must pass ALL active filters:
1. ✅ Must be from Steal-a-Brainrot Universe
2. ✅ Must be a public server
3. ✅ Must meet minimum income threshold
4. ✅ Must pass brainrot name validation (whitelist/blacklist)
5. ✅ Must have fewer players than MaxPlayerCount

## Best Practices from Similar Auto Joiners

Based on research from Chilli Hub Auto Joiner and Nameless Hub:

### Recommended Settings for Optimal Results

1. **Income Threshold**: 100M - 500M/s
   - Too low: Join unprofitable servers
   - Too high: Miss many opportunities

2. **Player Count**: 8-10 players max
   - Avoids overcrowded servers
   - Better chance of high-value brainrots

3. **Scan Interval**: 30-60 seconds
   - Balance between finding servers quickly and avoiding rate limits
   - Lower intervals use more resources

### Advanced Configuration Examples

#### Conservative Mode (High Quality)
```lua
Config.MinimumIncome = 200000000  -- 200M/s minimum
Config.MaxPlayerCount = 8          -- Max 8 players
Config.IgnoreUnknown = true        -- Skip unknowns
Config.BrainrotWhitelist = {"Sigma", "Grimace", "Gigachad"}
```

#### Aggressive Mode (More Opportunities)
```lua
Config.MinimumIncome = 100000000  -- 100M/s minimum
Config.MaxPlayerCount = 12         -- Max 12 players (full server)
Config.IgnoreUnknown = false       -- Don't skip unknowns
Config.BrainrotWhitelist = {}      -- Accept all brainrots
```

#### Blacklist Specific Brainrots
```lua
Config.MinimumIncome = 150000000
Config.MaxPlayerCount = 10
Config.BrainrotBlacklist = {"Ohio", "Beta", "Sus"}  -- Avoid these
```

## How It Works

### Server Scanning Process

1. **Fetch Servers**: Script requests server list from Roblox API using Universe ID
2. **Validate Each Server**:
   - Check if player count is below threshold
   - Verify server is public
   - Check income meets minimum threshold
   - Validate brainrot names against whitelist/blacklist
3. **Display Filtered Results**: Only eligible servers appear in the Servers tab
4. **Auto-Join**: Joins the best server (highest income) from filtered list

### Preventing Ghost Servers

The script now prevents ghost servers through:
- **Universe ID validation**: Only servers from the exact Steal-a-Brainrot Universe
- **API verification**: Uses official Roblox APIs to fetch real server data
- **Fallback handling**: Clear notifications when API is unavailable
- **Error logging**: Warns if Place ID is invalid or game doesn't exist

### Debug Information

Check console output for:
- `Universe ID fetched successfully for Place ID X : Y` - Validation succeeded
- `Failed to get Universe ID from Place ID` - Configuration issue
- `Invalid Universe ID type` - Data validation failed

## Troubleshooting

### No Servers Found
1. Check that `Config.PlaceId = 109983668079237` is correct
2. Lower `Config.MinimumIncome` threshold
3. Increase `Config.MaxPlayerCount`
4. Clear whitelist/blacklist filters
5. Check console for Universe ID errors

### Wrong Servers Appearing
1. Verify `Config.ValidateGameMatch = true`
2. Check Place ID is for Steal-a-Brainrot
3. Review brainrot names in server list
4. Report issue with specific server details

### Filtering Too Strict
1. Increase `Config.MaxPlayerCount`
2. Lower `Config.MinimumIncome`
3. Set `Config.IgnoreUnknown = false`
4. Clear `Config.BrainrotWhitelist`
5. Clear `Config.BrainrotBlacklist`

## Technical Details

### Configuration Options
```lua
Config = {
    PlaceId = 109983668079237,        -- Steal a Brainrot Place ID
    UniverseId = nil,                  -- Auto-fetched from Place ID
    MinimumIncome = 100000000,         -- 100M/s minimum
    MaxPlayerCount = 12,               -- Max players per server
    MaxServersToScan = 50,             -- Scan up to 50 servers
    ScanInterval = 30,                 -- Scan every 30 seconds
    IgnoreUnknown = true,              -- Skip unknown brainrots
    BrainrotWhitelist = {},            -- Whitelist (empty = all)
    BrainrotBlacklist = {},            -- Blacklist (empty = none)
    ValidateGameMatch = true           -- Validate game match
}
```

### API Endpoints Used
- Universe ID: `https://apis.roblox.com/universes/v1/places/{placeId}/universe`
- Server List: `https://games.roblox.com/v1/games/{universeId}/servers/Public`

## Updates and Improvements

### Recent Changes
- ✅ Added Universe ID validation
- ✅ Added player count filtering
- ✅ Added brainrot whitelist/blacklist support
- ✅ Improved error handling and logging
- ✅ Added UI controls for new settings
- ✅ Enhanced server validation logic
- ✅ Better notifications for scan status

### Future Enhancements
- Real-time income detection (requires joining servers)
- Server performance metrics
- Custom filter rules
- Save/load filter presets
- Historical server data tracking

## Safety and Ethics

### Important Notes
- Use responsibly and understand risks to your Roblox account
- Respect game rules and Terms of Service
- Don't share account credentials
- Be aware of detection risks
- Use at your own discretion

### Recommendations
- Don't run 24/7 to avoid detection
- Use reasonable scan intervals (30+ seconds)
- Don't join too many servers rapidly
- Monitor for game updates that may break functionality

## Support

For issues, improvements, or questions:
1. Check this guide first
2. Review console output for errors
3. Verify configuration settings
4. Check Place ID is correct
5. Report bugs with detailed information

---

**Version**: 2.0  
**Last Updated**: 2026-01-07  
**Compatibility**: Steal a Brainrot (Place ID: 109983668079237)
