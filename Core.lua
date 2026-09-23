-- Cursor Beacon
-- Core: saved variables, defaults, the shared event frame, the Blizzard cursor size CVar
-- and the slash commands.
--
-- Client notes that shape this file:
--  * The Forever beta client can hand back a nil SavedVariables table on a fresh login even
--    when a valid file is on disk, so every character's settings are mirrored into an
--    account wide copy and adopted late at PLAYER_LOGIN.
--  * Anything that might not exist on this client is probed once and recorded in `report`,
--    which "/cursor debug" prints. Nothing here should ever hard error.

local ADDON, ns = ...

ns.version = "1.6.0"
ns.report = {}

local report = ns.report

local function Print(msg)
	DEFAULT_CHAT_FRAME:AddMessage("|cff66ccffCursor Beacon|r " .. tostring(msg))
end
ns.Print = Print

-- ------------------------------------------------------------------
-- Defaults
-- ------------------------------------------------------------------

ns.defaults = {
	enabled = true,

	-- Blizzard hardware cursor
	applyCursorSize = false,
	cursorSize = -1, -- -1 auto, 0 = 32px, 1 = 48px, 2 = 64px

	-- A button on the minimap rim. `angle` is degrees around it, kept when the user drags it.
	minimap = {
		shown = true,
		angle = 215,
	},

	-- Shared look and behaviour of everything we draw
	-- `lead` pushes the drawn art forward along the direction of travel to cancel the frame of
	-- delay between positioning it and the screen showing it. 100 is one frame's worth.
	lead = 100,
	scale = 1.0,
	alpha = 1.0,
	strata = "TOOLTIP",
	combatOnly = false,
	hideWhileMouselooking = true,
	idleFade = false,
	idleSeconds = 3,

	-- A drawn copy of the pointer. The Blizzard cursor setting stops at 64 pixels, so this is how
	-- the cursor gets any bigger than that.
	pointer = {
		enabled = false,
		texture = "Interface\\CURSOR\\Point",
		size = 96,
		color = { 1.0, 1.0, 1.0 },
		alpha = 1.0,
		shadow = true,
		offsetX = 0,
		offsetY = 0,
	},

	ring = {
		enabled = true,
		texture = "Interface\\Cooldown\\ping4",
		size = 46,
		color = { 0.25, 0.75, 1.0 },
		alpha = 0.85,
		spin = 0,
		hoverGrow = true,
		hoverScale = 1.35,
	},

	dot = {
		enabled = false,
		texture = "Interface\\COMMON\\Indicator-Gray",
		size = 10,
		color = { 1.0, 1.0, 1.0 },
		alpha = 0.9,
	},

	trail = {
		enabled = true,
		count = 8,
		size = 18,
		spacing = 0.30,
		texture = "Interface\\Cooldown\\star4",
		color = { 0.25, 0.75, 1.0 },
		alpha = 0.55,
		fade = true,
	},

	activity = {
		mode = "off", -- off | gcd | cast | both
		size = 56,
		color = { 1.0, 0.85, 0.25 },
		alpha = 0.65,
		channelColor = { 0.45, 0.9, 0.45 },
	},

	info = {
		enabled = false,
		offsetX = 26,
		offsetY = -26,
		fontSize = 12,
		background = true,
		combatOnly = false,
		fields = {
			targetName = true,
			targetHealth = true,
			playerHealth = false,
			playerPower = false,
			combat = false,
			coords = false,
			fps = false,
			latency = false,
			clock = false,
		},
	},
}

-- ------------------------------------------------------------------
-- Table helpers
-- ------------------------------------------------------------------

local function DeepCopy(src)
	local out = {}
	for k, v in pairs(src) do
		if type(v) == "table" then out[k] = DeepCopy(v) else out[k] = v end
	end
	return out
end
ns.DeepCopy = DeepCopy

-- Fills in anything the saved table is missing without touching what the user set.
local function FillDefaults(dst, src)
	for k, v in pairs(src) do
		if type(v) == "table" then
			if type(dst[k]) ~= "table" then dst[k] = {} end
			FillDefaults(dst[k], v)
		elseif dst[k] == nil then
			dst[k] = v
		end
	end
	return dst
end

local function CountKeys(t)
	local n = 0
	if type(t) == "table" then for _ in pairs(t) do n = n + 1 end end
	return n
end

-- ------------------------------------------------------------------
-- The Blizzard hardware cursor size
-- ------------------------------------------------------------------

local CURSOR_CVAR = "cursorSizePreferred"

local function GetCVarSafe(name)
	local getter = (C_CVar and C_CVar.GetCVar) or GetCVar
	if not getter then return nil end
	local ok, value = pcall(getter, name)
	if ok then return value end
	return nil
end

local function SetCVarSafe(name, value)
	local setter = (C_CVar and C_CVar.SetCVar) or SetCVar
	if not setter then return false end
	return (pcall(setter, name, value))
end

-- Probed once: some builds do not carry the accessibility cursor CVar at all.
function ns.CursorSizeSupported()
	if ns.cursorSizeOK == nil then
		local value = GetCVarSafe(CURSOR_CVAR)
		ns.cursorSizeOK = value ~= nil
		report["cursor size cvar"] = value ~= nil and ("ok (currently " .. tostring(value) .. ")") or "not on this client"
	end
	return ns.cursorSizeOK
end

function ns.ApplyCursorSize()
	if not ns.db or not ns.db.applyCursorSize then return end
	if not ns.CursorSizeSupported() then return end
	SetCVarSafe(CURSOR_CVAR, tostring(ns.db.cursorSize))
end

function ns.CurrentCursorSize()
	if not ns.CursorSizeSupported() then return nil end
	return tonumber(GetCVarSafe(CURSOR_CVAR))
end

-- ------------------------------------------------------------------
-- Undoing version 1.2.0
--
-- 1.2.0 tried to hide the game's cursor so the drawn pointer could be the only one on screen. The
-- client refuses it: SetCursor with anything that is not one of the game's own cursors paints a
-- 32 by 32 black square instead, and custom cursor art has been blocked since Cataclysm. 1.2.0
-- could also switch the game to a software cursor to help that along. Both are gone, and anyone
-- upgrading gets their cursor and their video setting put back.
-- ------------------------------------------------------------------

local GX_CVAR = "gxCursor"

local function UndoCursorHiding()
	local pointer = ns.db and ns.db.pointer
	if not pointer then return end

	if pointer.hideReal then
		pointer.hideReal = nil
		if ns.Effects and ns.Effects.RestoreCursor then pcall(ns.Effects.RestoreCursor, true) end
		report["1.2.0 cleanup"] = "the game's cursor was hidden, it has been put back"
	end
	if pointer.softwareCursor then
		pointer.softwareCursor = nil
		if GetCVarSafe(GX_CVAR) == "0" then
			SetCVarSafe(GX_CVAR, "1")
			report["1.2.0 cleanup"] = (report["1.2.0 cleanup"] and (report["1.2.0 cleanup"] .. "; ") or "")
				.. "the hardware cursor has been switched back on"
		end
	end
end

-- ------------------------------------------------------------------
-- Unit numbers
--
-- This client protects some unit values: an addon may hand them to a widget to draw but may not
-- read, compare or print them. Health and power are the ones this addon cares about, so it probes
-- once and shows them as bars rather than as a percentage when they cannot be read.
-- ------------------------------------------------------------------

function ns.NumbersReadable()
	if ns.numbersReadable == nil then
		local ok, usable = pcall(function()
			local max, cur = UnitHealthMax("player"), UnitHealth("player")
			if issecretvalue and (issecretvalue(max) or issecretvalue(cur)) then return false end
			return type(max) == "number" and type(cur) == "number" and max > 0
		end)
		ns.numbersReadable = (ok and usable) and true or false
		report["unit numbers"] = ns.numbersReadable and "readable, health and power can show a percentage"
			or "protected by the client, health and power show as bars"
	end
	return ns.numbersReadable
end

-- ------------------------------------------------------------------
-- Texture probing. Only offer the user art this client actually has.
-- ------------------------------------------------------------------

function ns.TextureExists(path)
	if not GetFileIDFromPath then return true end
	local ok, id = pcall(GetFileIDFromPath, path)
	return ok and id ~= nil
end

-- Candidate art, all of it shipped with the game. The first entry that resolves becomes the
-- fallback for its group, so a client missing a file degrades to something instead of nothing.
ns.RING_TEXTURES = {
	{ path = "Interface\\Cooldown\\ping4", label = "Ping" },
	{ path = "Interface\\Cooldown\\starburst", label = "Starburst" },
	{ path = "Interface\\Cooldown\\star4", label = "Star" },
	{ path = "Interface\\Minimap\\UI-Minimap-ZoomButton-Highlight", label = "Halo" },
	{ path = "Interface\\SpellActivationOverlay\\IconAlert", label = "Alert" },
	{ path = "Interface\\COMMON\\Indicator-Gray", label = "Disc" },
	{ path = "Interface\\Buttons\\WHITE8X8", label = "Square" },
}

-- The game's own pointer art. `anchor` is the point on the texture that sits on the exact cursor
-- position: the arrows carry their tip in the top left corner, the crosshair is centred.
ns.POINTER_TEXTURES = {
	{ path = "Interface\\CURSOR\\Point", label = "Arrow", anchor = "TOPLEFT" },
	{ path = "Interface\\CURSOR\\Cast", label = "Cast", anchor = "TOPLEFT" },
	{ path = "Interface\\CURSOR\\Interact", label = "Hand", anchor = "TOPLEFT" },
	{ path = "Interface\\CURSOR\\Attack", label = "Attack", anchor = "TOPLEFT" },
	{ path = "Interface\\CURSOR\\Item", label = "Grab", anchor = "TOPLEFT" },
	{ path = "Interface\\CURSOR\\Quest", label = "Quest", anchor = "TOPLEFT" },
	{ path = "Interface\\CURSOR\\Crosshairs", label = "Crosshair", anchor = "CENTER" },
}

function ns.PointerAnchor(path)
	for _, entry in ipairs(ns.POINTER_TEXTURES) do
		if entry.path == path then return entry.anchor end
	end
	return "TOPLEFT"
end

ns.DOT_TEXTURES = {
	{ path = "Interface\\COMMON\\Indicator-Gray", label = "Disc" },
	{ path = "Interface\\Cooldown\\star4", label = "Star" },
	{ path = "Interface\\Buttons\\WHITE8X8", label = "Square" },
	{ path = "Interface\\Cooldown\\ping4", label = "Ping" },
}

function ns.UsableTextures(list, key)
	local out = {}
	for _, entry in ipairs(list) do
		if ns.TextureExists(entry.path) then out[#out + 1] = entry end
	end
	-- Counted before the fallback goes in, so the report says 0 rather than 1 when this client
	-- has none of the art.
	local found = #out
	if found == 0 then out[1] = { path = "Interface\\Buttons\\WHITE8X8", label = "Square" } end
	report["textures " .. key] = found .. "/" .. #list .. " available"
	return out
end

-- Falls back to the first usable texture when a saved path is missing here.
function ns.ResolveTexture(path, list)
	for _, entry in ipairs(list) do
		if entry.path == path then return path end
	end
	return list[1] and list[1].path or "Interface\\Buttons\\WHITE8X8"
end

-- ------------------------------------------------------------------
-- Saved variables
-- ------------------------------------------------------------------

local function MirrorToAccount()
	if not ns.db then return end
	CursorBeaconAccountDB = CursorBeaconAccountDB or {}
	CursorBeaconAccountDB.profile = DeepCopy(ns.db)
	CursorBeaconAccountDB.version = ns.version
end
ns.MirrorToAccount = MirrorToAccount

-- The client sometimes starts a session with a blank per character table even though the file
-- on disk is fine. When the character table looks untouched we adopt the account mirror.
local function LoadDB(phase)
	local fresh = CountKeys(CursorBeaconDB) == 0
	if fresh and type(CursorBeaconAccountDB) == "table" and type(CursorBeaconAccountDB.profile) == "table" then
		CursorBeaconDB = DeepCopy(CursorBeaconAccountDB.profile)
		report["db " .. phase] = "adopted the account copy"
	else
		CursorBeaconDB = type(CursorBeaconDB) == "table" and CursorBeaconDB or {}
		report["db " .. phase] = fresh and "fresh (first run)" or "loaded from this character"
	end
	FillDefaults(CursorBeaconDB, ns.defaults)
	ns.db = CursorBeaconDB

	-- UsableTextures falls back to a plain square when nothing resolves; the pointer art all
	-- carries an `anchor`, so its absence means this client has no cursor art to copy.
	ns.pointerArt = ns.UsableTextures(ns.POINTER_TEXTURES, "pointer")
	ns.hasPointerArt = ns.pointerArt[1] ~= nil and ns.pointerArt[1].anchor ~= nil
	if not ns.hasPointerArt then ns.db.pointer.enabled = false end
	ns.db.pointer.texture = ns.ResolveTexture(ns.db.pointer.texture, ns.pointerArt)
	ns.db.ring.texture = ns.ResolveTexture(ns.db.ring.texture, ns.UsableTextures(ns.RING_TEXTURES, "ring"))
	ns.db.dot.texture = ns.ResolveTexture(ns.db.dot.texture, ns.UsableTextures(ns.DOT_TEXTURES, "dot"))
	ns.db.trail.texture = ns.ResolveTexture(ns.db.trail.texture, ns.UsableTextures(ns.DOT_TEXTURES, "dot"))
	MirrorToAccount()
end

function ns.ResetToDefaults()
	CursorBeaconDB = DeepCopy(ns.defaults)
	ns.db = CursorBeaconDB
	MirrorToAccount()
	ns.Refresh()
	if ns.SyncOptions then ns.SyncOptions() end
	Print("Settings reset to defaults.")
end

-- ------------------------------------------------------------------
-- Refresh fan out. Every setter in the options calls this.
-- ------------------------------------------------------------------

function ns.Refresh()
	MirrorToAccount()
	if ns.Effects and ns.Effects.Apply then pcall(ns.Effects.Apply) end
	if ns.Info and ns.Info.Apply then pcall(ns.Info.Apply) end
	if ns.UpdateMinimapButton then pcall(ns.UpdateMinimapButton) end
end

-- ------------------------------------------------------------------
-- Event frame
-- ------------------------------------------------------------------

local frame = CreateFrame("Frame", "CursorBeaconFrame", UIParent)
ns.frame = frame
frame:RegisterEvent("ADDON_LOADED")
frame:RegisterEvent("PLAYER_LOGIN")
frame:RegisterEvent("PLAYER_LOGOUT")
frame:RegisterEvent("PLAYER_REGEN_DISABLED")
frame:RegisterEvent("PLAYER_REGEN_ENABLED")

frame:SetScript("OnEvent", function(self, event, ...)
	if event == "ADDON_LOADED" then
		local name = ...
		if name ~= ADDON then return end
		LoadDB("addon loaded")
		if ns.Effects and ns.Effects.Init then
			local ok, err = pcall(ns.Effects.Init)
			report["effects"] = ok and "ok" or ("failed: " .. tostring(err))
		end
		if ns.Info and ns.Info.Init then
			local ok, err = pcall(ns.Info.Init)
			report["info readout"] = ok and "ok" or ("failed: " .. tostring(err))
		end
		if ns.SetupOptions then
			local ok, err = pcall(ns.SetupOptions)
			report["options"] = ok and "ok" or ("failed: " .. tostring(err))
		end
		ns.Refresh()

	elseif event == "PLAYER_LOGIN" then
		-- Second chance at the saved table, see the note above LoadDB.
		if CountKeys(CursorBeaconDB) == 0 then LoadDB("player login") end
		ns.CursorSizeSupported()
		ns.ApplyCursorSize()
		UndoCursorHiding()
		ns.NumbersReadable()
		ns.Refresh()
		if ns.SyncOptions then pcall(ns.SyncOptions) end

	elseif event == "PLAYER_LOGOUT" then
		MirrorToAccount()

	elseif event == "PLAYER_REGEN_DISABLED" or event == "PLAYER_REGEN_ENABLED" then
		ns.Refresh()
	end

	if ns.Effects and ns.Effects.OnEvent then ns.Effects.OnEvent(event, ...) end
end)

-- ------------------------------------------------------------------
-- Slash commands
-- ------------------------------------------------------------------

local function PrintDebug()
	Print("version " .. ns.version .. ", debug report:")
	local keys = {}
	for k in pairs(report) do keys[#keys + 1] = k end
	table.sort(keys)
	for _, k in ipairs(keys) do
		DEFAULT_CHAT_FRAME:AddMessage("   |cffaaaaaa" .. k .. ":|r " .. tostring(report[k]))
	end
	local size = ns.CurrentCursorSize()
	DEFAULT_CHAT_FRAME:AddMessage("   |cffaaaaaa" .. CURSOR_CVAR .. " now:|r " .. tostring(size))
end

local function PrintHelp()
	Print("commands:")
	DEFAULT_CHAT_FRAME:AddMessage("   |cffffff00/cursor|r opens the options in the game menu")
	DEFAULT_CHAT_FRAME:AddMessage("   |cffffff00/cursor window|r opens them in a window of their own instead")
	DEFAULT_CHAT_FRAME:AddMessage("   |cffffff00/cursor on|r or |cffffff00off|r toggles every effect")
	DEFAULT_CHAT_FRAME:AddMessage("   |cffffff00/cursor size auto|1|2|3|r sets the Blizzard cursor size")
	DEFAULT_CHAT_FRAME:AddMessage("   |cffffff00/cursor minimap|r shows or hides the minimap button")
	DEFAULT_CHAT_FRAME:AddMessage("   |cffffff00/cursor test|r runs the activity sweep for a few seconds")
	DEFAULT_CHAT_FRAME:AddMessage("   |cffffff00/cursor reset|r restores defaults")
	DEFAULT_CHAT_FRAME:AddMessage("   |cffffff00/cursor debug|r prints what resolved on this client")
	DEFAULT_CHAT_FRAME:AddMessage("   Options also live in Esc > Options > AddOns > Cursor Beacon.")
end

SLASH_CURSORBEACON1 = "/cursorbeacon"
SLASH_CURSORBEACON2 = "/cursor"
SlashCmdList["CURSORBEACON"] = function(msg)
	msg = (msg or ""):lower():gsub("^%s+", ""):gsub("%s+$", "")
	local cmd, rest = msg:match("^(%S*)%s*(.-)$")

	if cmd == "" then
		if ns.ToggleOptions then ns.ToggleOptions() else Print("Options are not built yet.") end
	elseif cmd == "debug" then
		PrintDebug()
	elseif cmd == "window" then
		if ns.ToggleOptions then ns.ToggleOptions(true) end
	elseif cmd == "minimap" then
		local want = ns.db.minimap.shown
		if rest == "on" then want = true elseif rest == "off" then want = false else want = not want end
		ns.db.minimap.shown = want
		ns.Refresh()
		if ns.SyncOptions then ns.SyncOptions() end
		Print("minimap button " .. (want and "shown" or "hidden") .. ".")
	elseif cmd == "test" then
		if not (ns.Effects and ns.Effects.PreviewActivity) then
			Print("the activity sweep was not built on this client, see /cursor debug.")
			return
		end
		local why = ns.Effects.PreviewActivity(4)
		if why then
			Print(why)
		else
			Print("running the activity sweep for four seconds. If you see nothing, paste /cursor debug here.")
		end
	elseif cmd == "reset" then
		ns.ResetToDefaults()
	elseif cmd == "on" or cmd == "off" then
		ns.db.enabled = (cmd == "on")
		ns.Refresh()
		if ns.SyncOptions then ns.SyncOptions() end
		Print("effects " .. (ns.db.enabled and "on" or "off") .. ".")
	elseif cmd == "size" then
		if not ns.CursorSizeSupported() then
			Print("this client does not expose the cursor size setting.")
			return
		end
		local map = { auto = -1, ["1"] = 0, small = 0, ["2"] = 1, medium = 1, ["3"] = 2, large = 2 }
		local value = map[rest]
		if value == nil then
			Print("use /cursor size auto, 1, 2 or 3.")
			return
		end
		ns.db.applyCursorSize = value ~= -1
		ns.db.cursorSize = value
		ns.ApplyCursorSize()
		if ns.SyncOptions then ns.SyncOptions() end
		Print("cursor size set to " .. rest .. ".")
	else
		PrintHelp()
	end
end
