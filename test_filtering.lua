--[[
    Test Script for Auto-Joiner Server Filtering
    
    This script validates that the filtering logic works correctly
    to prevent ghost servers and wrong game servers.
]]

-- Test Configuration
local TestConfig = {
    PlaceId = 109983668079237,
    MaxPlayerCount = 12,
    IgnoreUnknown = true,
    BrainrotWhitelist = {},
    BrainrotBlacklist = {},
    ValidateGameMatch = true,
    MinimumIncome = 100000000
}

-- Test Utilities
local TestResults = {
    passed = 0,
    failed = 0,
    tests = {}
}

local function assertEqual(actual, expected, testName)
    if actual == expected then
        TestResults.passed = TestResults.passed + 1
        table.insert(TestResults.tests, {name = testName, result = "PASS"})
        print("✅ PASS:", testName)
        return true
    else
        TestResults.failed = TestResults.failed + 1
        table.insert(TestResults.tests, {name = testName, result = "FAIL", actual = actual, expected = expected})
        print("❌ FAIL:", testName, "| Expected:", expected, "| Got:", actual)
        return false
    end
end

-- Mock validateBrainrots function (copy from main script)
local function validateBrainrots(brainrotList, config)
    config = config or TestConfig
    
    if not brainrotList or #brainrotList == 0 then
        if config.IgnoreUnknown then
            return false
        end
        if #config.BrainrotWhitelist > 0 then
            return false
        end
        return true
    end
    
    -- Check blacklist first
    for _, brainrot in ipairs(brainrotList) do
        for _, blacklisted in ipairs(config.BrainrotBlacklist) do
            if string.find(brainrot:lower(), blacklisted:lower()) then
                return false
            end
        end
    end
    
    -- Check whitelist if active
    if #config.BrainrotWhitelist > 0 then
        for _, brainrot in ipairs(brainrotList) do
            for _, whitelisted in ipairs(config.BrainrotWhitelist) do
                if string.find(brainrot:lower(), whitelisted:lower()) then
                    return true
                end
            end
        end
        return false
    end
    
    return true
end

-- Mock validateServerGame function
local function validateServerGame(serverData, config)
    config = config or TestConfig
    
    if not config.ValidateGameMatch then
        return true
    end
    
    if serverData.players and serverData.players >= config.MaxPlayerCount then
        return false
    end
    
    return true
end

-- Test Cases
print("\n=== Running Auto-Joiner Server Filtering Tests ===\n")

-- Test 1: Brainrot validation with empty list and IgnoreUnknown = true
print("\n--- Test Group 1: Unknown Brainrot Filtering ---")
local config1 = {
    IgnoreUnknown = true,
    BrainrotWhitelist = {},
    BrainrotBlacklist = {}
}
assertEqual(validateBrainrots({}, config1), false, "Should reject servers with no brainrots when IgnoreUnknown is true")

-- Test 2: Brainrot validation with empty list and IgnoreUnknown = false
local config2 = {
    IgnoreUnknown = false,
    BrainrotWhitelist = {},
    BrainrotBlacklist = {}
}
assertEqual(validateBrainrots({}, config2), true, "Should accept servers with no brainrots when IgnoreUnknown is false")

-- Test 3: Whitelist filtering
print("\n--- Test Group 2: Whitelist Filtering ---")
local config3 = {
    IgnoreUnknown = false,
    BrainrotWhitelist = {"Sigma", "Grimace"},
    BrainrotBlacklist = {}
}
assertEqual(validateBrainrots({"Sigma"}, config3), true, "Should accept server with whitelisted brainrot (Sigma)")
assertEqual(validateBrainrots({"Grimace"}, config3), true, "Should accept server with whitelisted brainrot (Grimace)")
assertEqual(validateBrainrots({"Ohio"}, config3), false, "Should reject server without whitelisted brainrot")
assertEqual(validateBrainrots({"Sigma", "Ohio"}, config3), true, "Should accept server with at least one whitelisted brainrot")

-- Test 4: Blacklist filtering
print("\n--- Test Group 3: Blacklist Filtering ---")
local config4 = {
    IgnoreUnknown = false,
    BrainrotWhitelist = {},
    BrainrotBlacklist = {"Ohio", "Beta"}
}
assertEqual(validateBrainrots({"Sigma"}, config4), true, "Should accept server without blacklisted brainrot")
assertEqual(validateBrainrots({"Ohio"}, config4), false, "Should reject server with blacklisted brainrot (Ohio)")
assertEqual(validateBrainrots({"Beta"}, config4), false, "Should reject server with blacklisted brainrot (Beta)")
assertEqual(validateBrainrots({"Sigma", "Ohio"}, config4), false, "Should reject server with any blacklisted brainrot")

-- Test 5: Blacklist takes priority over whitelist
print("\n--- Test Group 4: Priority Tests ---")
local config5 = {
    IgnoreUnknown = false,
    BrainrotWhitelist = {"Ohio"},
    BrainrotBlacklist = {"Ohio"}
}
assertEqual(validateBrainrots({"Ohio"}, config5), false, "Blacklist should take priority over whitelist")

-- Test 6: Player count filtering
print("\n--- Test Group 5: Player Count Filtering ---")
local configPC = {
    ValidateGameMatch = true,
    MaxPlayerCount = 10
}
assertEqual(validateServerGame({players = 5}, configPC), true, "Should accept server with 5 players (max 10)")
assertEqual(validateServerGame({players = 10}, configPC), false, "Should reject server with 10 players (max 10)")
assertEqual(validateServerGame({players = 12}, configPC), false, "Should reject server with 12 players (max 10)")

-- Test 7: Game validation disabled
print("\n--- Test Group 6: Validation Toggle ---")
local configNoValidation = {
    ValidateGameMatch = false,
    MaxPlayerCount = 10
}
assertEqual(validateServerGame({players = 15}, configNoValidation), true, "Should accept any server when validation is disabled")

-- Test 8: Combined filter logic
print("\n--- Test Group 7: Combined Filters ---")
local function shouldAcceptServer(serverData, config)
    return serverData.isPublic 
        and serverData.income >= config.MinimumIncome 
        and validateBrainrots(serverData.brainrots, config)
        and validateServerGame(serverData, config)
end

local combinedConfig = {
    MinimumIncome = 100000000,
    MaxPlayerCount = 10,
    IgnoreUnknown = true,
    BrainrotWhitelist = {},
    BrainrotBlacklist = {"Ohio"},
    ValidateGameMatch = true
}

local testServer1 = {
    isPublic = true,
    income = 150000000,
    brainrots = {"Sigma"},
    players = 5
}
assertEqual(shouldAcceptServer(testServer1, combinedConfig), true, "Should accept valid server (public, good income, valid brainrot, low players)")

local testServer2 = {
    isPublic = true,
    income = 150000000,
    brainrots = {"Ohio"},
    players = 5
}
assertEqual(shouldAcceptServer(testServer2, combinedConfig), false, "Should reject server with blacklisted brainrot")

local testServer3 = {
    isPublic = true,
    income = 50000000,
    brainrots = {"Sigma"},
    players = 5
}
assertEqual(shouldAcceptServer(testServer3, combinedConfig), false, "Should reject server with income below threshold")

local testServer4 = {
    isPublic = true,
    income = 150000000,
    brainrots = {"Sigma"},
    players = 12
}
assertEqual(shouldAcceptServer(testServer4, combinedConfig), false, "Should reject server with too many players")

local testServer5 = {
    isPublic = false,
    income = 150000000,
    brainrots = {"Sigma"},
    players = 5
}
assertEqual(shouldAcceptServer(testServer5, combinedConfig), false, "Should reject private server")

local testServer6 = {
    isPublic = true,
    income = 150000000,
    brainrots = {},
    players = 5
}
assertEqual(shouldAcceptServer(testServer6, combinedConfig), false, "Should reject server with unknown brainrots when IgnoreUnknown is true")

-- Print Results
print("\n=== Test Results Summary ===")
print(string.format("✅ Passed: %d", TestResults.passed))
print(string.format("❌ Failed: %d", TestResults.failed))
print(string.format("Total: %d", TestResults.passed + TestResults.failed))

if TestResults.failed == 0 then
    print("\n🎉 All tests passed! Server filtering is working correctly.")
else
    print("\n⚠️  Some tests failed. Review the failures above.")
    print("\nFailed Tests:")
    for _, test in ipairs(TestResults.tests) do
        if test.result == "FAIL" then
            print(string.format("  - %s (Expected: %s, Got: %s)", test.name, tostring(test.expected), tostring(test.actual)))
        end
    end
end

print("\n=== End of Tests ===\n")
