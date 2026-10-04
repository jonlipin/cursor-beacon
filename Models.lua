-- Cursor Beacon
-- Models: real 3D spell effects that follow the cursor.
--
-- How it works. One ModelScene covers the whole screen, with a camera this addon places itself,
-- and one actor in it carries a spell missile model. It is the ACTOR that moves each frame, not
-- the frame. A missile's ribbons and particles are let go into the scene wherever the missile is
-- at that moment and stay there, so moving the actor leaves a trail behind it, the way the spell
-- does in the world.
--
-- Why it is measured rather than guessed. The older way to do this was a PlayerModel with a hand
-- tuned "magic number" per model and per screen size. That widget's camera fits itself to each
-- model's bounds, so every model needs its own number and the numbers only hold at the resolution
-- they were tuned on. Here the addon fixes the camera itself, then asks the scene where three
-- points land on screen (Project3DPointTo2D) and inverts that. The mapping comes out exact at any
-- resolution and UI scale, and the same for every model.
--
-- What the client source says, read off the forever branch of Blizzard's UI code:
--  * Project3DPointTo2D answers in pixels from the scene's bottom left; Blizzard's own drop shadow
--    code divides by the effective scale and anchors to BOTTOMLEFT. That is the space
--    GetCursorPosition answers in when the scene covers the screen. Calibration still checks the
--    units and the y direction for itself rather than relying on this.
--  * An actor's position is in its own units: Blizzard multiplies GetPosition by GetScale to get a
--    world point. So a world point is divided by the actor's scale before SetPosition, and the
--    scale is read live because something other than this file may change it.
--  * CreateActor is documented as wanting a name and a template, but Blizzard passes nil for the
--    name. A bare actor is tried first; Blizzard's template is the last resort, because its mixin
--    rescales the actor by itself once the model loads.

local ADDON, ns = ...

local Models = {}
ns.Models = Models

local report = ns.report

-- Spell missiles by FileDataID, grouped by school. The ones this client does not carry are dropped
-- when the addon tries to load them, so a client missing some of these simply offers fewer. Ids
-- come from the wago.tools file list (spells/*_missile.m2); keep to the vanilla era block below
-- 200000 where possible, since those are the most likely to be in a classic era client.
ns.SPELL_MODELS = {
	-- Shadow
	{ id = 166815, label = "Shadow Bolt" },
	{ id = 165891, label = "Death Coil" },
	{ id = 167163, label = "Haunt" },
	{ id = 166926, label = "Soul Shatter" },
	{ id = 166822, label = "Shadow Missile" },
	{ id = 382336, label = "Shadow Fireball" },
	-- Fire
	{ id = 166128, label = "Fireball" },
	{ id = 166674, label = "Pyroblast" },
	{ id = 166135, label = "Firebolt" },
	{ id = 166127, label = "Blue Fireball" },
	{ id = 166673, label = "Blue Pyroblast" },
	{ id = 166074, label = "Fel Fireball" },
	{ id = 166094, label = "Fel Pyroblast" },
	{ id = 166553, label = "Meteor" },
	-- Frost and water
	{ id = 166214, label = "Frostbolt" },
	{ id = 166374, label = "Ice" },
	{ id = 166373, label = "Ice Lance" },
	{ id = 167174, label = "Waterbolt" },
	-- Arcane
	{ id = 165569, label = "Arcane Missiles" },
	{ id = 166513, label = "Arcane Barrage" },
	{ id = 165592, label = "Arcane Shot" },
	{ id = 166942, label = "Spellsteal" },
	-- Nature
	{ id = 167213, label = "Wrath" },
	{ id = 166497, label = "Lightning" },
	{ id = 166498, label = "Lightning, long" },
	{ id = 166504, label = "Lightning Streak" },
	{ id = 166648, label = "Poison Shot" },
	-- Holy
	{ id = 166330, label = "Holy" },
	{ id = 166333, label = "Holy, bright" },
	{ id = 166661, label = "Penance" },
	-- Odds and ends
	{ id = 165724, label = "Blood Bolt" },
	{ id = 166570, label = "Snowball" },
}

-- The camera. Its distance and field of view decide how big a model looks; the mapping is measured
-- afterwards, so they can change without anything else having to.
--
-- Size is done by moving the camera, not by scaling the actor. A spell's particles and ribbons
-- keep their own size when the actor is scaled (the game even has a separate particle scale for
-- that), so a scaled down missile kept a full sized trail and never got small enough. Moving the
-- camera away shrinks everything on screen evenly, model, ribbon and sparks alike, because it is
-- only perspective. At size 1 the camera sits at CAMERA_DISTANCE; at size s it sits at that over s.
local CAMERA_DISTANCE = 30
local CAMERA_FOV = 0.6
local cameraDistance = CAMERA_DISTANCE

-- A jump this far in one frame is a warp rather than movement. Without a reset the ribbon would
-- draw a streak right across the screen to the new spot.
local WARP_PIXELS = 400

-- Particle density. An actor has no control over how many particles a model lets go; it can only
-- change their size. So density is done by layering copies of the same missile on the same spot:
-- each copy lets go its own particles, and since spell particles add their light together, more
-- copies give a fuller and brighter trail. Copies past the first are made only when asked for.
local MAX_LAYERS = 5

local scene
local layers = {}
local activeLayers = 0
local calib
local available = {}
local loadedId
local hiddenSince = true
local lastSX, lastSY

-- ------------------------------------------------------------------
-- Calibration
-- ------------------------------------------------------------------

local function Project(x, y, z)
	local ok, px, py = pcall(scene.Project3DPointTo2D, scene, x, y, z)
	if ok and type(px) == "number" and type(py) == "number" then return px, py end
	return nil
end

local function ScenePixels()
	local es = scene:GetEffectiveScale() or 1
	return (scene:GetWidth() or 0) * es, (scene:GetHeight() or 0) * es, es
end

-- Measures how the scene turns 3D points into screen pixels, and keeps what is needed to go the
-- other way. Returns false and a reason when the camera is not set up the way it needs to be.
local function Calibrate()
	local w, h, es = ScenePixels()
	if w <= 0 or h <= 0 then return false, "the scene has no size yet" end

	local okR, rx, ry, rz = pcall(scene.GetCameraRight, scene)
	local okU, ux, uy, uz = pcall(scene.GetCameraUp, scene)
	if not (okR and okU and rx and ux) then return false, "the camera's axes cannot be read" end

	-- The origin sits on the camera's axis, so it lands in the middle of the scene. Where exactly
	-- it lands says which units the projection answers in.
	local ox, oy = Project(0, 0, 0)
	if not ox then return false, "the projection returned nothing for the origin" end

	local fx, fy, units
	local function near(a, b, span) return math.abs(a - b) <= span * 0.05 end
	if near(ox, w / 2, w) and near(oy, h / 2, h) then
		fx, fy, units = 1, 1, "pixels"
	elseif near(ox, w / 2 / es, w / es) and near(oy, h / 2 / es, h / es) then
		fx, fy, units = es, es, "interface units"
	elseif near(ox, 0.5, 1) and near(oy, 0.5, 1) then
		fx, fy, units = w, h, "fractions of the scene"
	else
		return false, string.format("the origin landed at %.1f, %.1f, not the middle of a %.0f by %.0f scene", ox, oy, w, h)
	end

	local ax, ay = Project(rx, ry, rz)
	local bx, by = Project(ux, uy, uz)
	if not (ax and bx) then return false, "the projection returned nothing for the camera's axes" end

	ox, oy, ax, ay, bx, by = ox * fx, oy * fy, ax * fx, ay * fy, bx * fx, by * fy

	-- The camera's up has to come out as up on screen. If it comes out as down, the projection
	-- counts from the top, and every y is turned round to count from the bottom like the cursor.
	local flipped = by < oy
	if flipped then
		oy, ay, by = h - oy, h - ay, h - by
	end

	local Ax, Ay, Bx, By = ax - ox, ay - oy, bx - ox, by - oy
	local det = Ax * By - Ay * Bx
	if math.abs(det) < 1e-6 then return false, "the camera's axes land on a single line" end

	calib = {
		ox = ox, oy = oy, Ax = Ax, Ay = Ay, Bx = Bx, By = By, det = det,
		rx = rx, ry = ry, rz = rz, ux = ux, uy = uy, uz = uz,
		w = w, h = h, es = es,
	}
	report["3d calibration"] = string.format("ok, %.1f pixels to a unit, answered in %s%s",
		math.sqrt(Ax * Ax + Ay * Ay), units, flipped and ", counted from the top" or "")
	return true
end

-- A screen pixel, counted from the bottom left, to the point under it on the plane through the
-- origin that faces the camera.
local function ScreenToWorld(sx, sy)
	local c = calib
	local dx, dy = sx - c.ox, sy - c.oy
	local r = (dx * c.By - dy * c.Bx) / c.det
	local u = (c.Ax * dy - c.Ay * dx) / c.det
	return r * c.rx + u * c.ux, r * c.ry + u * c.uy, r * c.rz + u * c.uz
end
Models.ScreenToWorld = function(sx, sy) if calib then return ScreenToWorld(sx, sy) end end

-- Throws the measurement away so the next frame takes a fresh one.
function Models.ForgetCalibration() calib = nil end

-- ------------------------------------------------------------------
-- Build
-- ------------------------------------------------------------------

local function SetupCamera()
	pcall(scene.SetCameraFieldOfView, scene, CAMERA_FOV)
	pcall(scene.SetCameraNearClip, scene, 0.1)
	pcall(scene.SetCameraFarClip, scene, 5000)
	pcall(scene.SetCameraPosition, scene, cameraDistance, 0, 0)
	-- Forward, right, up. Which way "right" points depends on the client's handedness. It does
	-- not matter here: calibration measures whatever results.
	pcall(scene.SetCameraOrientationByAxisVectors, scene, -1, 0, 0, 0, 1, 0, 0, 0, 1)
end


local function NewActor()
	local routes = {
		{ name = "a bare actor", run = function() return scene:CreateActor() end },
		{ name = "a bare actor, named nil", run = function() return scene:CreateActor(nil, nil) end },
		{ name = "Blizzard's actor template", run = function() return scene:CreateActor(nil, "ModelSceneActorTemplate") end },
	}
	for _, route in ipairs(routes) do
		local ok, made = pcall(route.run)
		if ok and made then
			if not report["3d actor"] then report["3d actor"] = "ok, " .. route.name end
			return made
		end
	end
	if not report["3d actor"] then report["3d actor"] = "this client would not create one" end
	return nil
end

local function LoadInto(a, id)
	local ok, success = pcall(a.SetModelByFileID, a, id)
	if ok and success ~= false then
		a.cbModel = id
		return true
	end
	return false
end

-- Makes sure there are `n` actors, making more only as they are needed. Returns how many there
-- are, which can be fewer if the client stops handing them out.
local function EnsureLayers(n)
	while #layers < n do
		local a = NewActor()
		if not a then break end
		layers[#layers + 1] = a
	end
	return math.min(n, #layers)
end

function Models.Init()
	if scene then return end

	local ok, made = pcall(CreateFrame, "ModelScene", "CursorBeaconModelScene", UIParent)
	if not ok or not made then
		report["3d effects"] = "unavailable, this client has no ModelScene"
		return
	end
	scene = made
	scene:SetAllPoints(UIParent)
	-- It covers the whole screen, so it must never take a click or the game stops answering.
	scene:EnableMouse(false)
	if scene.SetMouseClickEnabled then pcall(scene.SetMouseClickEnabled, scene, false) end
	if scene.SetMouseMotionEnabled then pcall(scene.SetMouseMotionEnabled, scene, false) end
	scene:Hide()

	SetupCamera()
	if EnsureLayers(1) < 1 then
		report["3d effects"] = "unavailable, no actor"
		return
	end
	report["3d effects"] = "ok"
	report["3d models"] = "not checked yet, that happens the first time the spell effect is used"
end

-- Finds out which of the spell models this client has, by loading each one once into the first
-- layer. Done the first time the effect is switched on or its options tab is opened, never at
-- login: the effect is off by default, and most players would otherwise pay for thirty model loads
-- they never see.
local probed = false

function Models.Probe()
	if probed or #layers == 0 then return end
	probed = true
	available = {}
	for _, entry in ipairs(ns.SPELL_MODELS) do
		if LoadInto(layers[1], entry.id) then available[#available + 1] = entry end
	end
	layers[1].cbModel = nil
	ns.SPELL_MODELS_AVAILABLE = available
	report["3d models"] = #available .. "/" .. #ns.SPELL_MODELS .. " this client accepted"
	if #available == 0 then report["3d effects"] = "no spell models on this client" end
	loadedId = nil
	activeLayers = 0
end

function Models.Available()
	Models.Probe()
	return available
end

-- ------------------------------------------------------------------
-- Settings
-- ------------------------------------------------------------------

local function WantedId()
	local want = ns.db.model.file
	for _, entry in ipairs(available) do
		if entry.id == want then return want end
	end
	return available[1] and available[1].id
end

-- Every active layer carries the model; the rest are emptied and hidden so they cost nothing.
local function ReloadLayers()
	for i, a in ipairs(layers) do
		if i <= activeLayers then
			LoadInto(a, loadedId)
			pcall(a.Show, a)
		else
			pcall(a.ClearModel, a)
			a.cbModel = nil
			pcall(a.Hide, a)
		end
	end
end

function Models.Apply()
	if not scene then return end
	local db = ns.db
	if not pcall(scene.SetFrameStrata, scene, db.strata) then scene:SetFrameStrata("TOOLTIP") end
	scene:SetFrameLevel(205)

	if #layers == 0 then return end

	-- The actors stay at their own size; the camera moves to make the effect bigger or smaller,
	-- and a new distance means a new mapping, so it is measured again on the next frame.
	local size = math.max(0.01, db.model.size * (db.scale or 1))
	local wanted = CAMERA_DISTANCE / size
	if math.abs(wanted - cameraDistance) > 1e-6 then
		cameraDistance = wanted
		pcall(scene.SetCameraPosition, scene, cameraDistance, 0, 0)
		calib = nil
	end

	-- Nothing to load until the effect is wanted; the first time it is, find out what this client has.
	if db.enabled and db.model.enabled then Models.Probe() end
	if not probed then return end

	local want = math.max(1, math.min(MAX_LAYERS, math.floor((db.model.density or 1) + 0.5)))
	local have
	if db.enabled and db.model.enabled then
		-- Only worth saying the client fell short once more were actually asked for.
		have = EnsureLayers(want)
		report["3d layers"] = have < want
			and string.format("%d of the %d asked for, the client would not make more", have, want)
			or string.format("%d, up to %d", have, MAX_LAYERS)
	else
		have = math.min(want, #layers)
	end

	local id = WantedId()
	if (id and id ~= loadedId) or have ~= activeLayers then
		loadedId = id
		activeLayers = have
		for _, a in ipairs(layers) do pcall(a.SetScale, a, 1) end
		ReloadLayers()
		hiddenSince = true
	end
	if not (db.enabled and db.model.enabled) then
		scene:Hide()
		hiddenSince = true
	end
end

-- ------------------------------------------------------------------
-- Frame loop
-- ------------------------------------------------------------------

-- Points the missile along the way the cursor is going, so it flies rather than drifts. The
-- missile models fly along their own x; yaw turns x within the camera's plane, pitch tilts it up.
local function Aim(a, dx, dy)
	if dx * dx + dy * dy < 1 then return end
	local wx, wy, wz = calib.rx * dx + calib.ux * dy, calib.ry * dx + calib.uy * dy, calib.rz * dx + calib.uz * dy
	local yaw = math.atan2 and math.atan2(wy, wx) or math.atan(wy, wx)
	local flat = math.sqrt(wx * wx + wy * wy)
	local pitch = -(math.atan2 and math.atan2(wz, flat) or math.atan(wz, flat))
	pcall(a.SetYaw, a, yaw)
	pcall(a.SetPitch, a, pitch)
end

-- sx, sy are screen pixels from the bottom left, with the lead already in them. `drawing` is
-- whether the effects are showing at all this frame, and `master` the overall opacity.
function Models.Tick(elapsed, sx, sy, drawing, master)
	if not scene then return end
	local db = ns.db
	if not (drawing and db.enabled and db.model.enabled and activeLayers > 0 and loadedId) then
		if scene:IsShown() then scene:Hide() end
		hiddenSince = true
		return
	end

	-- Measure again whenever the screen changes size or the UI scale changes. The scale matters
	-- even at the same pixel size: if the projection answers in interface units, a new scale is a
	-- new mapping.
	local w, h, es = ScenePixels()
	if not calib or math.abs(calib.w - w) > 0.5 or math.abs(calib.h - h) > 0.5
		or math.abs(calib.es - es) > 1e-6 then
		if not scene:IsShown() then scene:Show() end
		calib = nil
		local ok, why = Calibrate()
		if not ok then
			report["3d calibration"] = "failed: " .. tostring(why)
			scene:Hide()
			return
		end
	end

	-- Coming back from hidden, or a warp: reload the model so its ribbon starts fresh here
	-- instead of drawing a streak from wherever it last was.
	local warped = lastSX and ((sx - lastSX) ^ 2 + (sy - lastSY) ^ 2) > WARP_PIXELS * WARP_PIXELS
	if hiddenSince or warped then
		ReloadLayers()
		hiddenSince = false
	end

	local wx, wy, wz = ScreenToWorld(sx, sy)
	local alpha = db.model.alpha * (master or 1)
	local aim = db.model.aim and lastSX
	for i = 1, activeLayers do
		local a = layers[i]
		-- Each actor's own scale, read live: a position is in the actor's units.
		local okS, s = pcall(a.GetScale, a)
		s = (okS and type(s) == "number" and s ~= 0) and s or 1
		pcall(a.SetPosition, a, wx / s, wy / s, wz / s)
		pcall(a.SetAlpha, a, alpha)
		if aim then Aim(a, sx - lastSX, sy - lastSY) end
	end
	lastSX, lastSY = sx, sy

	if not scene:IsShown() then scene:Show() end
end
