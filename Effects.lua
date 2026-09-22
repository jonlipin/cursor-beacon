-- Cursor Beacon
-- Effects: everything that is drawn at the cursor. A ring, a centre dot, a lagging trail and
-- an activity swipe that shows the global cooldown or the current cast.
--
-- One OnUpdate drives all of it. Positions come from GetCursorPosition(), which reports screen
-- pixels with the bottom left as the origin, so every coordinate is divided by
-- UIParent:GetEffectiveScale() and anchored against UIParent's BOTTOMLEFT.

local ADDON, ns = ...

local Effects = {}
ns.Effects = Effects

local MAX_TRAIL = 20
local GCD_SPELL = 61304 -- the hidden global cooldown spell

local overlay, driver, ring, dot, activity, pointer, pointerShadow
local trail = {}
local lastX, lastY = 0, 0
local idleFor, hoverCheck, gcdCheck = 0, 0, 0
local hovering = false
local spin = 0
local castEnds, castStarts, castIsChannel = 0, 0, false

local report = ns.report

-- ------------------------------------------------------------------
-- Small helpers
-- ------------------------------------------------------------------

local function CursorXY()
	local scale = UIParent:GetEffectiveScale()
	if not scale or scale == 0 then scale = 1 end
	local x, y = GetCursorPosition()
	return (x or 0) / scale, (y or 0) / scale
end

local function PlaceAt(region, x, y)
	region:ClearAllPoints()
	region:SetPoint("CENTER", UIParent, "BOTTOMLEFT", x, y)
end

local function InCombat()
	if InCombatLockdown and InCombatLockdown() then return true end
	if UnitAffectingCombat then return UnitAffectingCombat("player") and true or false end
	return false
end

local function Mouselooking()
	return IsMouselooking and IsMouselooking() and true or false
end

-- True when the cursor sits on a unit or on a piece of interface rather than empty world.
local function OverSomething()
	if UnitExists and UnitExists("mouseover") then return true end
	local focus
	if GetMouseFoci then
		local list = GetMouseFoci()
		focus = list and list[1]
	elseif GetMouseFocus then
		focus = GetMouseFocus()
	end
	if focus and focus ~= WorldFrame and focus ~= UIParent and focus ~= overlay then return true end
	return false
end

-- ------------------------------------------------------------------
-- Build
-- ------------------------------------------------------------------

function Effects.Init()
	if overlay then return end

	overlay = CreateFrame("Frame", "CursorBeaconOverlay", UIParent)
	overlay:SetAllPoints(UIParent)
	overlay:EnableMouse(false)
	if overlay.SetMouseClickEnabled then pcall(overlay.SetMouseClickEnabled, overlay, false) end
	if overlay.SetMouseMotionEnabled then pcall(overlay.SetMouseMotionEnabled, overlay, false) end
	overlay:Hide()
	ns.overlay = overlay

	-- Trail first so it draws under the ring.
	for i = 1, MAX_TRAIL do
		local tex = overlay:CreateTexture(nil, "BACKGROUND")
		tex:SetBlendMode("ADD")
		tex:Hide()
		trail[i] = { tex = tex, x = 0, y = 0 }
	end

	ring = overlay:CreateTexture(nil, "ARTWORK")
	ring:SetBlendMode("ADD")
	ring:Hide()

	dot = overlay:CreateTexture(nil, "OVERLAY")
	dot:Hide()

	-- The drawn pointer goes above everything else we draw, with its shadow one sublevel down.
	pointerShadow = overlay:CreateTexture(nil, "OVERLAY", nil, 3)
	pointerShadow:SetVertexColor(0, 0, 0)
	pointerShadow:Hide()

	pointer = overlay:CreateTexture(nil, "OVERLAY", nil, 4)
	pointer:Hide()

	report["SetRotation"] = (ring.SetRotation and pcall(ring.SetRotation, ring, 0)) and "ok" or "unavailable"
	report["SetCursor"] = SetCursor and "present" or "unavailable, the real cursor cannot be hidden"

	-- The activity swipe rides on a Cooldown frame, which is the same widget the action bars use.
	local ok, cd = pcall(CreateFrame, "Cooldown", "CursorBeaconActivity", overlay, "CooldownFrameTemplate")
	if ok and cd then
		activity = cd
		activity:SetHideCountdownNumbers(true)
		if activity.SetDrawEdge then pcall(activity.SetDrawEdge, activity, true) end
		if activity.SetDrawBling then pcall(activity.SetDrawBling, activity, false) end
		activity:EnableMouse(false)
		activity:Hide()
		report["activity swipe"] = "ok"
	else
		report["activity swipe"] = "unavailable (CooldownFrameTemplate missing)"
	end

	-- Cast and channel tracking. RegisterUnitEvent keeps the traffic down where it exists.
	local events = {
		"UNIT_SPELLCAST_START", "UNIT_SPELLCAST_STOP", "UNIT_SPELLCAST_FAILED",
		"UNIT_SPELLCAST_INTERRUPTED", "UNIT_SPELLCAST_CHANNEL_START", "UNIT_SPELLCAST_CHANNEL_STOP",
	}
	local registered = 0
	for _, event in ipairs(events) do
		local done = false
		if ns.frame.RegisterUnitEvent then
			done = pcall(ns.frame.RegisterUnitEvent, ns.frame, event, "player")
		end
		if not done then done = pcall(ns.frame.RegisterEvent, ns.frame, event) end
		if done then registered = registered + 1 end
	end
	report["cast events"] = registered .. "/" .. #events .. " registered"

	-- The loop lives on its own frame. A hidden frame stops running OnUpdate, and the overlay
	-- gets hidden whenever the effects are off, so it cannot be the one driving this.
	driver = CreateFrame("Frame", nil, UIParent)
	driver:SetSize(1, 1)
	driver:SetPoint("TOPLEFT")
	driver:EnableMouse(false)
	driver:Show()
	driver:SetScript("OnUpdate", Effects.OnUpdate)

	lastX, lastY = CursorXY()
	for i = 1, MAX_TRAIL do trail[i].x, trail[i].y = lastX, lastY end
end

-- ------------------------------------------------------------------
-- Apply settings
-- ------------------------------------------------------------------

function Effects.Apply()
	if not overlay then return end
	local db = ns.db
	if not db then return end

	local ok = pcall(overlay.SetFrameStrata, overlay, db.strata)
	if not ok then overlay:SetFrameStrata("TOOLTIP") end
	overlay:SetFrameLevel(200)

	local s = db.scale or 1

	-- Ring
	local r = db.ring
	ring:SetTexture(r.texture)
	ring:SetSize(r.size * s, r.size * s)
	ring:SetVertexColor(r.color[1], r.color[2], r.color[3])
	ring:SetShown(db.enabled and r.enabled)

	-- Dot
	local d = db.dot
	dot:SetTexture(d.texture)
	dot:SetSize(d.size * s, d.size * s)
	dot:SetVertexColor(d.color[1], d.color[2], d.color[3])
	dot:SetShown(db.enabled and d.enabled)

	-- Drawn pointer. Its size is an absolute pixel size rather than a multiple of the overall
	-- scale, because the whole point of it is to pick an exact size.
	local p = db.pointer
	pointer:SetTexture(p.texture)
	pointer:SetSize(p.size, p.size)
	pointer:SetVertexColor(p.color[1], p.color[2], p.color[3])
	pointer:SetShown(db.enabled and p.enabled)
	pointerShadow:SetTexture(p.texture)
	pointerShadow:SetSize(p.size, p.size)
	pointerShadow:SetShown(db.enabled and p.enabled and p.shadow)

	-- Trail
	local t = db.trail
	local count = db.enabled and t.enabled and math.min(t.count, MAX_TRAIL) or 0
	for i = 1, MAX_TRAIL do
		local seg = trail[i]
		if i <= count then
			local step = (i - 1) / math.max(count, 1)
			local size = t.size * s * (1 - 0.55 * step)
			seg.tex:SetTexture(t.texture)
			seg.tex:SetSize(size, size)
			seg.tex:SetVertexColor(t.color[1], t.color[2], t.color[3])
			seg.baseAlpha = t.fade and (t.alpha * (1 - step)) or t.alpha
			seg.tex:Show()
		else
			seg.tex:Hide()
		end
	end

	-- Activity swipe
	if activity then
		local a = db.activity
		activity:SetSize(a.size * s, a.size * s)
		if activity.SetSwipeColor then
			pcall(activity.SetSwipeColor, activity, a.color[1], a.color[2], a.color[3], a.alpha)
		end
		if a.mode == "off" then activity:Hide() end
	end

	if not db.enabled then
		overlay:Hide()
	end
	if not (db.enabled and db.pointer.enabled and db.pointer.hideReal) then
		Effects.RestoreCursor()
	end
end

-- ------------------------------------------------------------------
-- Hiding the game's own cursor
--
-- Nothing an addon draws can sit above the hardware cursor: the game composites it last. The one
-- lever the API gives us is SetCursor with a path that does not resolve, which hides the cursor
-- art. Two limits come with it and neither is something this addon can work around:
--   * over WorldFrame the game locks the cursor to what you are pointing at and ignores us, so
--     the real cursor stays visible out in the world;
--   * whatever you pick up rides on the cursor, so hiding pauses while you are carrying something.
-- ------------------------------------------------------------------

-- Deliberately not a real file. SetCursor hides the cursor when the path does not resolve.
local HIDE_PATH = "Interface\\AddOns\\CursorBeacon\\NoCursor"

local hideThrottle = 0
local cursorHidden = false

local function CarryingSomething()
	if not GetCursorInfo then return false end
	local ok, kind = pcall(GetCursorInfo)
	return ok and kind ~= nil
end

function Effects.RestoreCursor()
	if not cursorHidden then return end
	cursorHidden = false
	ns.cursorHidden = false
	pcall(SetCursor, nil)
end

-- `drawing` is whether the effects are visible this frame; there is no sense hiding the real
-- cursor while our own pointer is hidden too.
local function UpdateCursorHiding(elapsed, drawing)
	local db = ns.db
	local want = drawing and db.enabled and db.pointer.enabled and db.pointer.hideReal
		and pointer and pointer:IsShown() and not CarryingSomething()

	if not want then
		Effects.RestoreCursor()
		return
	end

	-- The interface sets the cursor itself whenever the mouse moves over something, so this has
	-- to be put back rather than set once.
	hideThrottle = hideThrottle + elapsed
	if hideThrottle > 0.05 or not cursorHidden then
		hideThrottle = 0
		local ok = pcall(SetCursor, HIDE_PATH)
		if report["hide cursor"] == nil then
			report["hide cursor"] = ok and "ok (no effect over the open world)" or "SetCursor refused it"
		end
		if not ok then
			db.pointer.hideReal = false
			return
		end
	end
	cursorHidden = true
	ns.cursorHidden = true
end

-- ------------------------------------------------------------------
-- Activity: cast, channel, global cooldown
-- ------------------------------------------------------------------

local function GCDInfo()
	local start, duration
	if C_Spell and C_Spell.GetSpellCooldown then
		local ok, info = pcall(C_Spell.GetSpellCooldown, GCD_SPELL)
		if ok and type(info) == "table" then start, duration = info.startTime, info.duration end
	elseif GetSpellCooldown then
		local ok, s, d = pcall(GetSpellCooldown, GCD_SPELL)
		if ok then start, duration = s, d end
	end
	if report["gcd source"] == nil then
		report["gcd source"] = (start ~= nil) and "ok" or "unavailable on this client"
	end
	return start, duration
end

-- Returns start, duration, isChannel for whatever the swipe should be showing, or nil.
local function ActivityState()
	local mode = ns.db.activity.mode
	if mode == "off" then return nil end

	if mode == "cast" or mode == "both" then
		if castEnds > 0 and GetTime() < castEnds then
			return castStarts, castEnds - castStarts, castIsChannel
		end
	end

	if mode == "gcd" or mode == "both" then
		local start, duration = GCDInfo()
		if start and duration and duration > 0 and start > 0 and (start + duration) > GetTime() then
			return start, duration, false
		end
	end

	return nil
end

function Effects.OnEvent(event, unit)
	if not overlay then return end
	if not event or event:sub(1, 15) ~= "UNIT_SPELLCAST_" then return end
	if unit and unit ~= "player" then return end

	if event == "UNIT_SPELLCAST_START" or event == "UNIT_SPELLCAST_CHANNEL_START" then
		local channel = event == "UNIT_SPELLCAST_CHANNEL_START"
		local getter = channel and UnitChannelInfo or UnitCastingInfo
		if not getter then return end
		local ok, name, _, _, startTime, endTime = pcall(getter, "player")
		if ok and name and startTime and endTime then
			castStarts = startTime / 1000
			castEnds = endTime / 1000
			castIsChannel = channel
		end
	else
		castEnds, castStarts = 0, 0
	end
end

-- ------------------------------------------------------------------
-- Frame loop
-- ------------------------------------------------------------------

local function ShouldDraw()
	local db = ns.db
	if not db or not db.enabled then return false end
	if db.combatOnly and not InCombat() then return false end
	if db.hideWhileMouselooking and Mouselooking() then return false end
	return true
end

function Effects.OnUpdate(_, elapsed)
	local db = ns.db
	if not db then return end

	local x, y = CursorXY()
	local moved = (math.abs(x - lastX) > 0.5) or (math.abs(y - lastY) > 0.5)
	lastX, lastY = x, y

	if ns.Info and ns.Info.Tick then ns.Info.Tick(elapsed, x, y) end

	if not ShouldDraw() then
		UpdateCursorHiding(elapsed, false)
		overlay:Hide()
		-- Park the trail on the cursor so it does not whip across the screen when it comes back.
		for i = 1, MAX_TRAIL do trail[i].x, trail[i].y = x, y end
		return
	end
	if not overlay:IsShown() then overlay:Show() end

	-- Idle fade
	local fade = 1
	if db.idleFade then
		if moved then idleFor = 0 else idleFor = idleFor + elapsed end
		local over = idleFor - db.idleSeconds
		if over > 0 then fade = math.max(0, 1 - over) end
	else
		idleFor = 0
	end
	local master = (db.alpha or 1) * fade

	-- Hover growth, checked a few times a second rather than every frame.
	hoverCheck = hoverCheck + elapsed
	if hoverCheck > 0.1 then
		hoverCheck = 0
		hovering = db.ring.hoverGrow and OverSomething() or false
	end

	-- Ring
	if ring:IsShown() then
		local size = db.ring.size * (db.scale or 1) * (hovering and db.ring.hoverScale or 1)
		ring:SetSize(size, size)
		ring:SetAlpha(db.ring.alpha * master)
		PlaceAt(ring, x, y)
		if db.ring.spin ~= 0 and ring.SetRotation then
			spin = spin + elapsed * db.ring.spin
			pcall(ring.SetRotation, ring, spin)
		end
	end

	-- Dot
	if dot:IsShown() then
		dot:SetAlpha(db.dot.alpha * master)
		PlaceAt(dot, x, y)
	end

	-- Drawn pointer. The anchor puts the art's own hotspot on the real cursor position, so an
	-- arrow lines its tip up rather than sitting centred on it.
	if pointer:IsShown() then
		local p = db.pointer
		local anchor = ns.PointerAnchor(p.texture)
		local px, py = x + p.offsetX, y + p.offsetY
		pointer:SetAlpha(p.alpha * master)
		pointer:ClearAllPoints()
		pointer:SetPoint(anchor, UIParent, "BOTTOMLEFT", px, py)
		if pointerShadow:IsShown() then
			pointerShadow:SetAlpha(p.alpha * master * 0.6)
			pointerShadow:ClearAllPoints()
			pointerShadow:SetPoint(anchor, UIParent, "BOTTOMLEFT", px + 2, py - 2)
		end
	end

	UpdateCursorHiding(elapsed, true)

	-- Trail. Each segment eases toward the one in front of it; the smoothing is corrected for
	-- frame time so the shape looks the same at 30 and at 144 frames a second.
	if db.trail.enabled then
		local follow = 1 - (1 - db.trail.spacing) ^ math.min(elapsed * 60, 10)
		local px, py = x, y
		local count = math.min(db.trail.count, MAX_TRAIL)
		for i = 1, count do
			local seg = trail[i]
			seg.x = seg.x + (px - seg.x) * follow
			seg.y = seg.y + (py - seg.y) * follow
			seg.tex:SetAlpha((seg.baseAlpha or db.trail.alpha) * master)
			PlaceAt(seg.tex, seg.x, seg.y)
			px, py = seg.x, seg.y
		end
	end

	-- Activity swipe
	if activity then
		gcdCheck = gcdCheck + elapsed
		if gcdCheck > 0.05 then
			gcdCheck = 0
			local start, duration, channel = ActivityState()
			if start then
				if activity.lastStart ~= start or activity.lastDuration ~= duration then
					activity.lastStart, activity.lastDuration = start, duration
					if activity.SetReverse then pcall(activity.SetReverse, activity, not channel) end
					activity:SetCooldown(start, duration)
				end
				activity:SetAlpha(master)
				PlaceAt(activity, x, y)
				if not activity:IsShown() then activity:Show() end
			else
				activity.lastStart, activity.lastDuration = nil, nil
				if activity:IsShown() then activity:Hide() end
			end
		elseif activity:IsShown() then
			PlaceAt(activity, x, y)
		end
	end
end
