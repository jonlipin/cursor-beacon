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
local bars = {}
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

-- Health and power are not text fields. This client hands them over as values an addon may draw
-- but may not read, so they are fed straight to a bar and never go near arithmetic; see the bar
-- section below. When the numbers do turn out to be readable the bar gets a percentage on it.

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

-- The order fields appear in, and the labels the options page shows for them. The three marked
-- `bar` are drawn as bars under the text rather than added to it.
ns.INFO_FIELDS = {
	{ key = "targetName", label = "Target name" },
	{ key = "targetHealth", label = "Target health", bar = true },
	{ key = "playerHealth", label = "Your health", bar = true },
	{ key = "playerPower", label = "Your power", bar = true },
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

	-- One bar per protected value. The unit API hands these over as things we may draw but not
	-- read, and a StatusBar takes them exactly as they come: SetMinMaxValues and SetValue never
	-- inspect what they are given, so no comparison or formatting happens on our side.
	local function MakeBar(label, r, g, b)
		local bar = CreateFrame("StatusBar", nil, frame)
		bar:SetSize(96, 9)
		bar:SetStatusBarTexture("Interface\\Buttons\\WHITE8X8")
		bar:SetStatusBarColor(r, g, b)
		bar:EnableMouse(false)

		local bg = bar:CreateTexture(nil, "BACKGROUND")
		bg:SetPoint("TOPLEFT", -1, 1)
		bg:SetPoint("BOTTOMRIGHT", 1, -1)
		bg:SetColorTexture(0, 0, 0, 0.8)

		bar.cbLabel = bar:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
		bar.cbLabel:SetPoint("LEFT", 3, 0)
		bar.cbLabel:SetText(label)

		bar.cbValue = bar:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
		bar.cbValue:SetPoint("RIGHT", -3, 0)

		bar:Hide()
		return bar
	end

	bars = {
		targetHealth = MakeBar("Target", 0.8, 0.2, 0.2),
		playerHealth = MakeBar("Health", 0.2, 0.7, 0.2),
		playerPower = MakeBar("Power", 0.25, 0.45, 0.9),
	}
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

-- Feeds one bar without ever reading what the unit API returned. Anything that fails here is a
-- client that will not even let the value be drawn, so the field is switched off and recorded.
local BAR_UNITS = {
	targetHealth = { unit = "target", cur = function(u) return UnitHealth(u) end, max = function(u) return UnitHealthMax(u) end },
	playerHealth = { unit = "player", cur = function(u) return UnitHealth(u) end, max = function(u) return UnitHealthMax(u) end },
	playerPower = { unit = "player", cur = function(u) return UnitPower(u) end, max = function(u) return UnitPowerMax(u) end },
}

local function UpdateBar(key)
	local db = ns.db.info
	local bar, spec = bars[key], BAR_UNITS[key]
	if not bar or not spec then return false end
	if not db.fields[key] then return false end
	if spec.unit == "target" and not UnitExists("target") then return false end

	local ok = pcall(function()
		bar:SetMinMaxValues(0, spec.max(spec.unit))
		bar:SetValue(spec.cur(spec.unit))
	end)
	if not ok then
		db.fields[key] = false
		report["info field " .. key] = "turned off, this client will not draw it"
		return false
	end

	-- Only when the numbers are plain can a percentage be worked out and printed.
	if ns.NumbersReadable() then
		local fine, pct = pcall(Pct, spec.cur(spec.unit), spec.max(spec.unit))
		bar.cbValue:SetText((fine and pct) and (pct .. "%") or "")
	else
		bar.cbValue:SetText("")
	end
	return true
end

local function BuildText()
	local db = ns.db.info
	local lines = {}
	for _, field in ipairs(ns.INFO_FIELDS) do
		if db.fields[field.key] and not field.bar then
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
		text:SetText(body)

		-- Bars stack under the text, each one only taking room when it has something to show.
		local width = math.max(text:GetStringWidth(), 0)
		local height = (body ~= "") and text:GetStringHeight() or 0
		local shownBars = 0
		for _, field in ipairs(ns.INFO_FIELDS) do
			if field.bar then
				local bar = bars[field.key]
				local live = UpdateBar(field.key)
				bar:SetShown(live)
				if live then
					shownBars = shownBars + 1
					bar:ClearAllPoints()
					bar:SetPoint("TOPLEFT", frame, "TOPLEFT", 0, -(height + (height > 0 and 3 or 0)))
					height = height + (height > 0 and 3 or 0) + bar:GetHeight()
					width = math.max(width, bar:GetWidth())
				end
			end
		end

		if body == "" and shownBars == 0 then
			-- Clear it as well as hiding: the ticks between rebuilds only look at this, and stale
			-- content would flick the readout back on.
			text:SetText("")
			frame.cbLive = false
			frame:Hide()
			return
		end
		frame.cbLive = true
		frame:SetSize(math.max(width, 1), math.max(height, 1))
	end

	if frame.cbLive then
		local x, y = cursorX, cursorY
		if not x then x, y = CursorXY() end
		frame:ClearAllPoints()
		frame:SetPoint("TOPLEFT", UIParent, "BOTTOMLEFT", x + db.offsetX, y + db.offsetY)
		frame:SetAlpha(ns.db.alpha or 1)
		if not frame:IsShown() then frame:Show() end
	end
end
