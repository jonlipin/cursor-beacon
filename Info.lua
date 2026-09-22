-- Cursor Beacon
-- Info: a small readout that rides next to the cursor.
--
-- Every field is built inside its own pcall. This client carries protected "secret" values on
-- some unit data, and reading one of those throws; a field that fails is simply dropped from
-- the readout and recorded in the debug report instead of taking the addon down.

local ADDON, ns = ...

local Info = {}
ns.Info = Info

local frame, text, backdrop
local throttle = 0
local report = ns.report

local function CursorXY()
	local scale = UIParent:GetEffectiveScale()
	if not scale or scale == 0 then scale = 1 end
	local x, y = GetCursorPosition()
	return (x or 0) / scale, (y or 0) / scale
end

local function InCombat()
	if InCombatLockdown and InCombatLockdown() then return true end
	if UnitAffectingCombat then return UnitAffectingCombat("player") and true or false end
	return false
end

local function Pct(cur, max)
	if not cur or not max or max == 0 then return nil end
	return math.floor((cur / max) * 100 + 0.5)
end

local function HealthColor(pct)
	if pct >= 70 then return "|cff40dd40" end
	if pct >= 30 then return "|cffffcc00" end
	return "|cffff4040"
end

-- ------------------------------------------------------------------
-- Field builders. Each returns a line of text or nil.
-- ------------------------------------------------------------------

local builders = {}

builders.targetName = function()
	if not UnitExists("target") then return nil end
	local name = UnitName("target")
	if not name then return nil end
	local level = UnitLevel and UnitLevel("target")
	if level and level > 0 then
		return name .. " |cffaaaaaa(" .. level .. ")|r"
	end
	return name
end

builders.targetHealth = function()
	if not UnitExists("target") then return nil end
	local pct = Pct(UnitHealth("target"), UnitHealthMax("target"))
	if not pct then return nil end
	return "Target " .. HealthColor(pct) .. pct .. "%|r"
end

builders.playerHealth = function()
	local pct = Pct(UnitHealth("player"), UnitHealthMax("player"))
	if not pct then return nil end
	return "Health " .. HealthColor(pct) .. pct .. "%|r"
end

builders.playerPower = function()
	local pct = Pct(UnitPower("player"), UnitPowerMax("player"))
	if not pct then return nil end
	return "Power |cff4488ff" .. pct .. "%|r"
end

builders.combat = function()
	if not InCombat() then return nil end
	return "|cffff4040In combat|r"
end

builders.coords = function()
	if not (C_Map and C_Map.GetBestMapForUnit and C_Map.GetPlayerMapPosition) then return nil end
	local map = C_Map.GetBestMapForUnit("player")
	if not map then return nil end
	local pos = C_Map.GetPlayerMapPosition(map, "player")
	if not pos or not pos.GetXY then return nil end
	local px, py = pos:GetXY()
	if not px or px == 0 then return nil end
	return string.format("%.1f, %.1f", px * 100, py * 100)
end

builders.fps = function()
	if not GetFramerate then return nil end
	return string.format("%d fps", GetFramerate())
end

builders.latency = function()
	if not GetNetStats then return nil end
	local _, _, home, world = GetNetStats()
	if not home then return nil end
	return string.format("%d / %d ms", home, world or home)
end

builders.clock = function()
	if not date then return nil end
	return date("%H:%M")
end

-- The order fields appear in, and the labels the options page shows for them.
ns.INFO_FIELDS = {
	{ key = "targetName", label = "Target name" },
	{ key = "targetHealth", label = "Target health" },
	{ key = "playerHealth", label = "Your health" },
	{ key = "playerPower", label = "Your power" },
	{ key = "combat", label = "Combat warning" },
	{ key = "coords", label = "Map coordinates" },
	{ key = "fps", label = "Frame rate" },
	{ key = "latency", label = "Latency" },
	{ key = "clock", label = "Clock" },
}

-- ------------------------------------------------------------------
-- Build
-- ------------------------------------------------------------------

function Info.Init()
	if frame then return end

	frame = CreateFrame("Frame", "CursorBeaconInfo", UIParent)
	frame:SetSize(10, 10)
	frame:EnableMouse(false)
	if frame.SetMouseClickEnabled then pcall(frame.SetMouseClickEnabled, frame, false) end
	frame:Hide()
	ns.infoFrame = frame

	backdrop = frame:CreateTexture(nil, "BACKGROUND")
	backdrop:SetColorTexture(0, 0, 0, 0.55)
	backdrop:SetPoint("TOPLEFT", -6, 4)
	backdrop:SetPoint("BOTTOMRIGHT", 6, -4)

	text = frame:CreateFontString(nil, "OVERLAY", "GameFontNormal")
	text:SetPoint("TOPLEFT")
	text:SetJustifyH("LEFT")
	-- No OnUpdate here on purpose: the frame spends most of its life hidden, and a hidden frame
	-- stops ticking. Effects' always visible driver calls Info.Tick instead.
end

function Info.Apply()
	if not frame then return end
	local db = ns.db and ns.db.info
	if not db then return end

	local font, _, flags = text:GetFont()
	if font then
		pcall(text.SetFont, text, font, db.fontSize, flags or "")
	end
	backdrop:SetShown(db.background)

	local strata = ns.db.strata
	if not pcall(frame.SetFrameStrata, frame, strata) then frame:SetFrameStrata("TOOLTIP") end
	frame:SetFrameLevel(210)

	if not db.enabled then frame:Hide() end
end

-- ------------------------------------------------------------------
-- Frame loop
-- ------------------------------------------------------------------

local function BuildText()
	local db = ns.db.info
	local lines = {}
	for _, field in ipairs(ns.INFO_FIELDS) do
		if db.fields[field.key] then
			local ok, line = pcall(builders[field.key])
			if ok then
				if line then lines[#lines + 1] = line end
			else
				db.fields[field.key] = false
				report["info field " .. field.key] = "turned off, it errored on this client"
			end
		end
	end
	return table.concat(lines, "\n")
end

function Info.Tick(elapsed, cursorX, cursorY)
	if not frame then return end
	local db = ns.db and ns.db.info
	if not db or not db.enabled or not ns.db.enabled then
		frame:Hide()
		return
	end
	if db.combatOnly and not InCombat() then
		frame:Hide()
		return
	end
	if ns.db.hideWhileMouselooking and IsMouselooking and IsMouselooking() then
		frame:Hide()
		return
	end

	throttle = throttle + elapsed
	if throttle > 0.15 then
		throttle = 0
		local body = BuildText()
		if body == "" then
			-- Clear it as well as hiding: the ticks between rebuilds only look at the text, and
			-- stale text would flick the readout back on.
			text:SetText("")
			frame:Hide()
			return
		end
		text:SetText(body)
		frame:SetSize(math.max(text:GetStringWidth(), 1), math.max(text:GetStringHeight(), 1))
	end

	if text:GetText() and text:GetText() ~= "" then
		local x, y = cursorX, cursorY
		if not x then x, y = CursorXY() end
		frame:ClearAllPoints()
		frame:SetPoint("TOPLEFT", UIParent, "BOTTOMLEFT", x + db.offsetX, y + db.offsetY)
		frame:SetAlpha(ns.db.alpha or 1)
		if not frame:IsShown() then frame:Show() end
	end
end
