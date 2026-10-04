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

-- Spell missiles by FileDataID. The ones this client does not carry are dropped when the addon
-- tries to load them, so a client missing some of these simply offers fewer.
ns.SPELL_MODELS = {
	{ id = 166815, label = "Shadow Bolt" },
	{ id = 165569, label = "Arcane Missiles" },
	{ id = 166128, label = "Fireball" },
	{ id = 166214, label = "Frostbolt" },
	{ id = 166374, label = "Ice" },
	{ id = 167213, label = "Wrath" },
	{ id = 166330, label = "Holy" },
	{ id = 166333, label = "Holy, bright" },
	{ id = 166497, label = "Lightning" },
	{ id = 166498, label = "Lightning, long" },
	{ id = 382336, label = "Shadow Fireball" },
}

-- The camera. Its distance and field of view only decide how big a model looks at size 1; the
-- mapping is measured afterwards, so these can change without anything else having to.
local CAMERA_DISTANCE = 30
local CAMERA_FOV = 0.6

-- A jump this far in one frame is a warp rather than movement. Without a reset the ribbon would
-- draw a streak right across the screen to the new spot.
local WARP_PIXELS = 400

local scene, actor
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
	pcall(scene.SetCameraFarClip, scene, 1000)
	pcall(scene.SetCameraPosition, scene, CAMERA_DISTANCE, 0, 0)
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
			report["3d actor"] = "ok, " .. route.name
			return made
		end
	end
	report["3d actor"] = "this client would not create one"
	return nil
end

local function LoadModel(id)
	if not actor then return false end
	local ok, success = pcall(actor.SetModelByFileID, actor, id)
	return ok and success ~= false
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
	actor = NewActor()
	if not actor then
		report["3d effects"] = "unavailable, no actor"
		return
	end

	-- Every candidate is loaded once to see whether this client has it.
	available = {}
	for _, entry in ipairs(ns.SPELL_MODELS) do
		if LoadModel(entry.id) then available[#available + 1] = entry end
	end
	ns.SPELL_MODELS_AVAILABLE = available
	report["3d models"] = #available .. "/" .. #ns.SPELL_MODELS .. " this client accepted"
	report["3d effects"] = #available > 0 and "ok" or "no spell models on this client"
	loadedId = nil
end

function Models.Available()
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

function Models.Apply()
	if not scene then return end
	local db = ns.db
	if not pcall(scene.SetFrameStrata, scene, db.strata) then scene:SetFrameStrata("TOOLTIP") end
	scene:SetFrameLevel(205)

	if not actor then return end
	pcall(actor.SetScale, actor, db.model.size * (db.scale or 1))

	local id = WantedId()
	if id and id ~= loadedId then
		if LoadModel(id) then loadedId = id end
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
local function Aim(dx, dy)
	if dx * dx + dy * dy < 1 then return end
	local wx, wy, wz = calib.rx * dx + calib.ux * dy, calib.ry * dx + calib.uy * dy, calib.rz * dx + calib.uz * dy
	local yaw = math.atan2 and math.atan2(wy, wx) or math.atan(wy, wx)
	local flat = math.sqrt(wx * wx + wy * wy)
	local pitch = -(math.atan2 and math.atan2(wz, flat) or math.atan(wz, flat))
	pcall(actor.SetYaw, actor, yaw)
	pcall(actor.SetPitch, actor, pitch)
end

-- sx, sy are screen pixels from the bottom left, with the lead already in them. `drawing` is
-- whether the effects are showing at all this frame, and `master` the overall opacity.
function Models.Tick(elapsed, sx, sy, drawing, master)
	if not scene then return end
	local db = ns.db
	if not (drawing and db.enabled and db.model.enabled and actor and loadedId) then
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
		LoadModel(loadedId)
		hiddenSince = false
	end

	local wx, wy, wz = ScreenToWorld(sx, sy)
	local okS, s = pcall(actor.GetScale, actor)
	s = (okS and type(s) == "number" and s ~= 0) and s or 1
	pcall(actor.SetPosition, actor, wx / s, wy / s, wz / s)
	pcall(actor.SetAlpha, actor, db.model.alpha * (master or 1))

	if db.model.aim and lastSX then Aim(sx - lastSX, sy - lastSY) end
	lastSX, lastSY = sx, sy

	if not scene:IsShown() then scene:Show() end
end
