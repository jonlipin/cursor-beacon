// Offline harness for Cursor Beacon: stubs the WoW API in fengari and walks the main paths.
const fs = require('fs');
const { lua, lauxlib, lualib, to_luastring } = require('fengari');
const DIR = (process.argv.slice(2).find(a => !a.startsWith('--')) || 'C:/Users/jonli/cursor-beacon/');
const L = lauxlib.luaL_newstate(); lualib.luaL_openlibs(L);
const files = ['Core.lua', 'Effects.lua', 'Models.lua', 'Info.lua', 'Options.lua', 'Styles.lua', 'CursorBeacon_Skins.lua'];

const stub = String.raw`
local VERBS = { "Set", "Get", "Is", "Create", "Register", "Enable", "Clear", "Hook", "Start", "Stop", "Has", "Num", "Add", "Unregister", "Disable", "Raise", "Lower", "Lock", "Unlock" }
local function isMethod(k)
  if type(k) ~= "string" then return false end
  for _, v in ipairs(VERBS) do if k:sub(1, #v) == v then return true end end
  return false
end
FRAMES = {}
local function obj(kind, template, name)
  local o = { shown = true, scripts = {}, w = 0, h = 0, scale = 1, kind = kind, template = template, name = name }
  return setmetatable(o, { __index = function(t, k)
    if k == "Show" then return function(s) local was = s.shown s.shown = true if not was and s.scripts.OnShow then s.scripts.OnShow(s) end end end
    if k == "Hide" then return function(s) local was = s.shown s.shown = false if was and s.scripts.OnHide then s.scripts.OnHide(s) end end end
    if k == "SetShown" then return function(s, v) if v then s:Show() else s:Hide() end end end
    if k == "IsShown" or k == "IsVisible" then return function(s) return s.shown end end
    if k == "GetName" then return function(s) return s.name end end
    if k == "GetParent" then return function(s) return s.parent end end
    if k == "SetParent" then return function(s, p) s.parent = p end end
    if k == "SetScript" then return function(s, e, f) s.scripts[e] = f end end
    if k == "GetScript" then return function(s, e) return s.scripts[e] end end
    if k == "HookScript" then return function(s, e, f) local old = s.scripts[e] s.scripts[e] = function(...) if old then old(...) end f(...) end end end
    if k == "SetSize" then return function(s, w, h) s.w, s.h = w, h end end
    if k == "SetWidth" then return function(s, w) s.w = w end end
    if k == "SetHeight" then return function(s, h) s.h = h end end
    if k == "GetWidth" then return function(s) return s.w end end
    if k == "GetHeight" then return function(s) return s.h end end
    if k == "GetSize" then return function(s) return s.w, s.h end end
    if k == "GetCenter" then return function(s) local r = s.rect or { 0, s.w or 0, 0, s.h or 0 } return (r[1] + r[2]) / 2, (r[3] + r[4]) / 2 end end
    if k == "SetText" then return function(s, x) s.text = x end end
    if k == "GetText" then return function(s) return s.text end end
    if k == "GetStringWidth" then return function(s) return #tostring(s.text or "") * 6 end end
    if k == "GetStringHeight" then return function(s) local n = 1 for _ in tostring(s.text or ""):gmatch("\n") do n = n + 1 end return n * 12 end end
    if k == "GetFont" then return function() return "Fonts\\FRIZQT__.TTF", 12, "" end end
    if k == "SetChecked" then return function(s, v) s.checked = v end end
    if k == "GetChecked" then return function(s) return s.checked end end
    if k == "SetValue" then return function(s, v) s.value = v if s.scripts.OnValueChanged then s.scripts.OnValueChanged(s, v) end end end
    if k == "GetValue" then return function(s) return s.value or 0 end end
    if k == "SetMinMaxValues" then return function(s, a, b) s.minV, s.maxV = a, b end end
    if k == "SetScale" then return function(s, v) s.scale = v end end
    if k == "GetScale" or k == "GetEffectiveScale" then return function(s) return s.scale or 1 end end
    if k == "SetPoint" then return function(s, ...) s.point = { ... } SETPOINTS = SETPOINTS + 1 end end
    if k == "ClearAllPoints" then return function(s) s.point = nil s.allPoints = nil end end
    if k == "SetAllPoints" then return function(s) s.allPoints = true end end
    if k == "EnableMouse" then return function(s, v) s.mouseEnabled = v end end
    if k == "SetTexture" then return function(s, x) s.texture = x end end
    if k == "GetTexture" then return function(s) return s.texture end end
    if k == "SetColorTexture" then return function(s, r, g, b, a) s.color = { r, g, b, a } end end
    if k == "SetVertexColor" then return function(s, r, g, b) s.vertex = { r, g, b } end end
    if k == "SetAlpha" then return function(s, x) s.alpha = x end end
    if k == "GetAlpha" then return function(s) return s.alpha or 1 end end
    if k == "SetRotation" then return function(s, x) s.rotation = x end end
    if k == "SetCooldown" then return function(s, a, b) s.cdStart, s.cdDur = a, b end end
    if k == "SetSwipeTexture" then return function(s, x) s.swipeTexture = x end end
    if k == "SetStatusBarTexture" then return function(s, x) s.barTexture = x end end
    if k == "SetFontString" then return function(s, f) s.fontString = f end end
    if k == "GetFontString" then return function(s) return s.fontString end end
    if k == "SetFrameStrata" then return function(s, v)
      local valid = { BACKGROUND = 1, LOW = 1, MEDIUM = 1, HIGH = 1, DIALOG = 1, FULLSCREEN = 1, FULLSCREEN_DIALOG = 1, TOOLTIP = 1 }
      if not valid[v] then error("bad strata " .. tostring(v)) end
      s.strata = v
    end end
    if k == "GetFrameStrata" then return function(s) return s.strata end end
    if k == "SetBackdrop" then return function(s, b) s.backdrop = b end end
    -- Recorded for the window styles: events (so PLAYER_ENTERING_WORLD reaches every frame that
    -- asked for it), fonts, the enabled state, frame levels and children.
    if k == "RegisterEvent" then return function(s, e) s.events = s.events or {} s.events[e] = true end end
    if k == "UnregisterEvent" then return function(s, e) if s.events then s.events[e] = nil end end end
    if k == "UnregisterAllEvents" then return function(s) s.events = nil end end
    if k == "SetFontObject" then return function(s, f) s.fontObject = f end end
    if k == "SetEnabled" then return function(s, v) s.enabled = v and true or false end end
    if k == "SetFrameLevel" then return function(s, v) s.level = v end end
    if k == "GetFrameLevel" then return function(s) return s.level end end
    if k == "GetChildren" then return function(s) return table.unpack(s.children or {}) end end
    if k == "SetGradient" then return function(s, dir, a, b) s.gradient = { dir, a, b } end end
    if k == "StartMoving" or k == "StopMovingOrSizing" then return function() end end
    if k == "CreateTexture" then return function(s, n, layer, tmpl, sub) local r = obj("texture") r.parent = s r.layer = layer r.sub = sub TEXTURES[#TEXTURES + 1] = r return r end end
    if k == "CreateFontString" then return function(s, n, layer, font) local r = obj("fontstring") r.parent = s r.font = font FONTSTRINGS[#FONTSTRINGS + 1] = r return r end end
    if k:sub(1, 6) == "Create" then return function() return obj("region") end end
    if isMethod(k) then return function() end end
    return nil
  end })
end
TEXTURES = {}
FONTSTRINGS = {}
SETPOINTS = 0
BAD_TEMPLATES = BAD_TEMPLATES or {}
-- A ModelScene that really projects. Its camera is placed with SetCameraPosition and the three axis
-- vectors, it has a field of view, and it covers UIParent, so it knows its own size in pixels.
-- PROJECTION_UNITS picks what Project3DPointTo2D answers in, and PROJECTION_TOP_ORIGIN whether it
-- counts y from the top, so calibration can be shown to work out both for itself.
PROJECTION_UNITS = PROJECTION_UNITS or "pixels"
PROJECTION_TOP_ORIGIN = PROJECTION_TOP_ORIGIN or false
NO_MODELSCENE = NO_MODELSCENE or false
-- What this pretend client has: every spell on the list but the Shadow Fireball and the Snowball.
MODEL_DENY = { [382336] = true, [166570] = true }
MODEL_FILES = setmetatable({}, { __index = function(_, id) return type(id) == "number" and not MODEL_DENY[id] end })
MODEL_LOADS = 0
-- A client that stops handing out actors after this many, to prove density copes with it.
MAX_ACTORS = nil
local function dot(a, b) return a[1] * b[1] + a[2] * b[2] + a[3] * b[3] end
local function NewActor()
  local a = obj("Actor")
  a.pos = { 0, 0, 0 } a.actorScale = 1 a.model = nil
  rawset(a, "SetModelByFileID", function(self, id)
    MODEL_LOADS = MODEL_LOADS + 1
    if MODEL_FILES[id] then self.model = id return true end
    return false
  end)
  rawset(a, "SetPosition", function(self, x, y, z) self.pos = { x, y, z } end)
  rawset(a, "GetPosition", function(self) return self.pos[1], self.pos[2], self.pos[3] end)
  rawset(a, "SetScale", function(self, v) self.actorScale = v end)
  rawset(a, "GetScale", function(self) return self.actorScale end)
  rawset(a, "SetAlpha", function(self, v) self.actorAlpha = v end)
  rawset(a, "SetYaw", function(self, v) self.yaw = v end)
  rawset(a, "SetPitch", function(self, v) self.pitch = v end)
  rawset(a, "ClearModel", function(self) self.model = nil end)
  return a
end
local function AddSceneMethods(f)
  f.cam = { pos = { 0, 0, 0 }, fwd = { -1, 0, 0 }, right = { 0, 1, 0 }, up = { 0, 0, 1 }, fov = 0.6 }
  f.actors = {}
  rawset(f, "GetWidth", function() return UIParent.w end)
  rawset(f, "GetHeight", function() return UIParent.h end)
  rawset(f, "GetEffectiveScale", function() return UIParent.scale or 1 end)
  rawset(f, "SetCameraPosition", function(self, x, y, z) self.cam.pos = { x, y, z } end)
  rawset(f, "SetCameraFieldOfView", function(self, v) self.cam.fov = v end)
  rawset(f, "SetCameraOrientationByAxisVectors", function(self, fx, fy, fz, rx, ry, rz, ux, uy, uz)
    self.cam.fwd, self.cam.right, self.cam.up = { fx, fy, fz }, { rx, ry, rz }, { ux, uy, uz }
  end)
  rawset(f, "GetCameraRight", function(self) local r = self.cam.right return r[1], r[2], r[3] end)
  rawset(f, "GetCameraUp", function(self) local u = self.cam.up return u[1], u[2], u[3] end)
  rawset(f, "Project3DPointTo2D", function(self, x, y, z)
    local c = self.cam
    local v = { x - c.pos[1], y - c.pos[2], z - c.pos[3] }
    local depth = dot(v, c.fwd)
    if depth <= 0 then return nil end
    local es = self:GetEffectiveScale()
    local wpx, hpx = self:GetWidth() * es, self:GetHeight() * es
    local focal = (hpx / 2) / math.tan(c.fov / 2)
    local px = wpx / 2 + dot(v, c.right) * focal / depth
    local py = hpx / 2 + dot(v, c.up) * focal / depth
    if PROJECTION_TOP_ORIGIN then py = hpx - py end
    if PROJECTION_UNITS == "interface" then px, py = px / es, py / es
    elseif PROJECTION_UNITS == "fraction" then px, py = px / wpx, py / hpx end
    return px, py, depth
  end)
  rawset(f, "CreateActor", function(self, name, template)
    if MAX_ACTORS and #self.actors >= MAX_ACTORS then return nil end
    local a = NewActor()
    a.template = template
    self.actors[#self.actors + 1] = a
    return a
  end)
end

function CreateFrame(kind, name, parent, template)
  if template and BAD_TEMPLATES[template] then error("Couldn't find inherited node " .. template) end
  if kind == "ModelScene" and NO_MODELSCENE then error("Unknown frame type ModelScene") end
  local f = obj(kind, template, name)
  if kind == "ModelScene" then AddSceneMethods(f) end
  -- The client's CooldownFrameTemplate is setAllPoints="true" (Blizzard_FrameXMLUtil/Mainline/Cooldown.xml):
  -- a frame made from it starts pinned to every edge of its parent.
  if template == "CooldownFrameTemplate" then f.allPoints = true end
  f.parent = parent
  if parent then parent.children = parent.children or {} table.insert(parent.children, f) end
  if template == "ButtonFrameTemplate" or template == "DefaultPanelFlatTemplate" or template == "DefaultPanelTemplate" then
    f.NineSlice = obj("Frame") f.TitleText = obj("fontstring") f.Inset = obj("Frame")
  end
  -- The close button and the templates that bring one (DefaultPanel* do not) click through the
  -- game's own UIPanelCloseButton_OnClick, as SharedUIPanelTemplates.lua has it.
  if template == "UIPanelCloseButton" then f.scripts.OnClick = function(...) return UIPanelCloseButton_OnClick(...) end end
  if template == "ButtonFrameTemplate" or template == "BasicFrameTemplate" then
    local b = obj("Button", "UIPanelCloseButton") b.parent = f
    f.children = f.children or {} table.insert(f.children, b)
    b.scripts.OnClick = function(...) return UIPanelCloseButton_OnClick(...) end
    f.CloseButton = b
  end
  FRAMES[#FRAMES + 1] = f
  if name then _G[name] = f end
  return f
end
UIParent = obj("Frame") UIParent.w, UIParent.h = 1920, 1080
GameFontHighlight, GameFontDisable, GameFontNormal, GameFontNormalSmall = "GameFontHighlight", "GameFontDisable", "GameFontNormal", "GameFontNormalSmall"
function CreateColor(r, g, b, a) return { r = r, g = g, b = b, a = a } end
-- A stand-in for EllesmereUI's skinning API (--eui). Every drawing call is recorded against the
-- frame it was given; Shell lays a border frame over the window the way the real one does.
if EUI_ON then
  EUI_DONE = setmetatable({}, { __mode = "k" })
  local function record(name, f) if type(f) == "table" then EUI_DONE[f] = (EUI_DONE[f] or "") .. name .. "," end end
  EUI_S = setmetatable({
    GetStyle = function() return "eui" end,
    Shell = function(f) record("Shell", f) local border = CreateFrame("Frame", nil, f) border:SetFrameLevel(10) f.euiBorder = border end,
  }, { __index = function(_, name) return function(f) record(name, f) end end })
  EllesmereUI = { RegisterSkin = function(name, fn) EUI_REG, EUI_FN = name, fn end, _DispatchSkinRegistration = function() end }
end
WorldFrame = obj("Frame")
Minimap = obj("Frame") Minimap.w, Minimap.h = 140, 140
Minimap.rect = { 1700, 1840, 800, 940 }
-- The game adds degree based trig globals alongside the radian based math library. Both are
-- stubbed exactly that way so a mix up between them shows up here.
function atan2(y, x) return math.deg(math.atan(y, x)) end
WOW_HAS_MATH_ATAN2 = WOW_HAS_MATH_ATAN2 ~= false
if WOW_HAS_MATH_ATAN2 then math.atan2 = function(y, x) return math.atan(y, x) end end
GameTooltip = obj("GameTooltip")
DEFAULT_CHAT_FRAME = { AddMessage = function(_, m) CHAT[#CHAT + 1] = m if VERBOSE then print(m) end end }
CHAT = {}
SlashCmdList = {} UISpecialFrames = {} tinsert = table.insert
date = os.date

NOW = 1000
function GetTime() return NOW end
CURSOR = { 800, 600 }
function GetCursorPosition() return CURSOR[1], CURSOR[2] end

MOUSELOOK = false function IsMouselooking() return MOUSELOOK end
MOUSEOVER = false
FOCUS = nil function GetMouseFoci() return { FOCUS } end
INCOMBAT = false function InCombatLockdown() return INCOMBAT end
function UnitAffectingCombat() return INCOMBAT end
TARGET = false
function UnitExists(u) if u == "target" then return TARGET end if u == "mouseover" then return MOUSEOVER end return false end
function UnitName(u) return "Wailing Whelp" end
function UnitLevel(u) return 17 end
HP, HPMAX = 60, 100
BAD_HEALTH = false
-- SECRET_UNITS mimics this client's protected values: a widget will take them, but any attempt to
-- do arithmetic on one or print it blows up, exactly like the real thing.
SECRET_UNITS = false
SECRETS = setmetatable({}, { __mode = "k" })
local function secret() local t = {} SECRETS[t] = true return t end
function issecretvalue(v) return SECRETS[v] == true end
local function unitnum(v)
  if BAD_HEALTH then error("attempt to use a secret number value") end
  if SECRET_UNITS then return secret() end
  return v
end
function UnitHealth(u) return unitnum(HP) end
function UnitHealthMax(u) return unitnum(HPMAX) end
function UnitPower(u) return unitnum(45) end
function UnitPowerMax(u) return unitnum(90) end
function GetFramerate() return 61.4 end
function GetNetStats() return 0, 0, 33, 44 end
C_Map = { GetBestMapForUnit = function() return 1453 end,
  GetPlayerMapPosition = function() return { GetXY = function() return 0.482, 0.611 end } end }

CVARS = { cursorSizePreferred = "-1", gxCursor = "1" }
C_CVar = { GetCVar = function(n) return CVARS[n] end, SetCVar = function(n, v) if CVARS[n] == nil then error("no cvar") end CVARS[n] = tostring(v) return true end }
GetCVar = C_CVar.GetCVar SetCVar = C_CVar.SetCVar

MISSING_TEXTURES = { ["Interface\\SpellActivationOverlay\\IconAlert"] = true }
NO_POINTER_ART = NO_POINTER_ART or false
function GetFileIDFromPath(p)
  if MISSING_TEXTURES[p] then return nil end
  if NO_POINTER_ART and p:find("CURSOR") then return nil end
  return 12345
end

CASTING = nil
function UnitCastingInfo(u) if CASTING and not CASTING.channel then return CASTING.name, nil, nil, CASTING.startMs, CASTING.endMs end end
function UnitChannelInfo(u) if CASTING and CASTING.channel then return CASTING.name, nil, nil, CASTING.startMs, CASTING.endMs end end
GCD = nil
C_Spell = { GetSpellCooldown = function(id) if GCD then return { startTime = GCD[1], duration = GCD[2] } end return nil end }

CURSOR_CALLS = {}
SETCURSOR_OK = true
function SetCursor(p) if not SETCURSOR_OK then error("refused") end CURSOR_CALLS[#CURSOR_CALLS + 1] = p or "RESTORE" return true end
CARRYING = nil
function GetCursorInfo() return CARRYING end

PICKED = nil
ColorPickerFrame = obj("Frame")
rawset(ColorPickerFrame, "SetupColorPickerAndShow", function(self, info) PICKED = info end)
rawset(ColorPickerFrame, "GetColorRGB", function() return 0.1, 0.2, 0.3 end)

CATEGORIES = {}
OPENED_CATEGORY = nil
OPEN_REFUSED = false
-- The reported behavior of this client: OpenToCategory NAVIGATES to a category, it does not open
-- the options window. With the window shut it quietly does nothing and raises no error, so a
-- caller that only checks pcall thinks it worked. Opening the window is a separate call.
OPEN_NEEDS_PANEL = OPEN_NEEDS_PANEL ~= false
-- Some clients only accept the category id, not the category itself.
OPEN_ID_ONLY = OPEN_ID_ONLY == true
SettingsPanel = obj("Frame") SettingsPanel:Hide()
SettingsPanel.Open = function(self) self:Show() end
-- On this client ShowUIPanel and HideUIPanel refuse addon code in combat: the player sees an
-- "Interface action blocked" message and nothing else. BLOCKED counts the refusals.
BLOCKED = 0
function ShowUIPanel(f)
  if InCombatLockdown() then BLOCKED = BLOCKED + 1 return end
  f:Show()
end
function HideUIPanel(f)
  if InCombatLockdown() then BLOCKED = BLOCKED + 1 return end
  f:Hide()
  if f == SettingsPanel then
    for _, c in ipairs(CATEGORIES) do c.frame:Hide() end
  end
end
-- The close button template's own click, as the client's SharedUIPanelTemplates.lua has it.
function UIPanelCloseButton_OnClick(self)
  local parent = self:GetParent()
  if parent then
    local continueHide = true
    if parent.onCloseCallback then continueHide = parent.onCloseCallback(self) end
    if continueHide then HideUIPanel(parent) end
  end
end
local nextCategoryID = 0
Settings = {
  RegisterCanvasLayoutCategory = function(frame, name)
    nextCategoryID = nextCategoryID + 1
    local c = { frame = frame, name = name, id = "category" .. nextCategoryID }
    c.GetID = function(self) return self.id end
    CATEGORIES[#CATEGORIES + 1] = c
    return c
  end,
  RegisterAddOnCategory = function(c) c.registered = true end,
  OpenToCategory = function(which)
    if OPEN_REFUSED then error("this client will not open it") end
    local cat
    for _, c in ipairs(CATEGORIES) do
      if c.id == which then cat = c end
      if c == which and not OPEN_ID_ONLY then cat = c end
    end
    if not cat then return end
    OPENED_CATEGORY = cat
    if OPEN_NEEDS_PANEL and not SettingsPanel:IsShown() then return end
    SettingsPanel:Show()
    cat.frame.w, cat.frame.h = 700, 500
    cat.frame:Show()
  end,
}
`;

const driver = String.raw`
local ns = {}
for _, file in ipairs(FILES) do
  local chunk, err = load(SOURCES[file], "@" .. file)
  if not chunk then error("SYNTAX " .. tostring(err)) end
  chunk("CursorBeacon", ns)
end
NS = ns

local PASS, FAIL = 0, 0
local function check(label, cond, extra)
  if cond then PASS = PASS + 1 else FAIL = FAIL + 1 print("FAIL: " .. label .. (extra and ("  [" .. tostring(extra) .. "]") or "")) end
end

local ev = CursorBeaconFrame
local function fire(...) ev.scripts.OnEvent(ev, ...) end

-- The always visible driver frame carries the loop.
local function loop(dt)
  dt = dt or 0.016
  NOW = NOW + dt
  for _, f in ipairs(FRAMES) do
    if f.scripts.OnUpdate and f.shown then f.scripts.OnUpdate(f, dt) end
  end
end

-- 1. Load
-- --dark starts from a saved Dark choice, so the whole run below happens in the Dark style.
CursorBeaconDB = DARK_START and { style = "dark" } or {}
CursorBeaconAccountDB = nil
fire("ADDON_LOADED", "CursorBeacon")
check("db built", type(ns.db) == "table" and ns.db.ring ~= nil)
check("defaults filled in", ns.db.trail.count == 8 and ns.db.strata == "TOOLTIP")
check("effects built", ns.report["effects"] == "ok", ns.report["effects"])
check("info built", ns.report["info readout"] == "ok", ns.report["info readout"])
check("options built", ns.report["options"] == "ok", ns.report["options"])
check("options category registered", ns.report["options category"] == "ok (canvas page)", ns.report["options category"])
check("category handed to the addon list", CATEGORIES[1] and CATEGORIES[1].registered == true)
for _, key in ipairs({ "cursor", "pointer", "hide", "ring", "trail", "info", "about" }) do
  check("page " .. key .. " built", ns.report["page " .. key] == "ok", ns.report["page " .. key])
end
check("activity swipe built", ns.report["activity swipe"] == "ok" or BARE, ns.report["activity swipe"])
check("cast events registered", ns.report["cast events"] == "6/6 registered", ns.report["cast events"])
check("missing art dropped from the shape list", ns.report["textures ring"] == "6/7 available", ns.report["textures ring"])
check("options content starts hidden", CursorBeaconOptions and not CursorBeaconOptions:IsShown())

fire("PLAYER_LOGIN")
-- EllesmereUI hands its drawing calls over at login; every style is drawn once the world is up.
if EUI_FN then EUI_FN(EUI_S) end
local function fireAll(event, ...)
  for _, f in ipairs(FRAMES) do
    if type(f.events) == "table" and f.events[event] and f.scripts.OnEvent then f.scripts.OnEvent(f, event, ...) end
  end
end
fireAll("PLAYER_ENTERING_WORLD")
check("cursor size probed", ns.report["cursor size cvar"]:sub(1, 2) == "ok", ns.report["cursor size cvar"])

-- 2. The loop follows the cursor
local overlay = CursorBeaconOverlay
CURSOR = { 800, 600 }
for i = 1, 40 do loop() end
check("overlay shows", overlay:IsShown())
local ring
for _, t in ipairs(TEXTURES) do if t.parent == CursorBeaconAnchor and t.layer == "ARTWORK" then ring = t end end
check("the cursor anchor sits on the cursor", CursorBeaconAnchor.point[4] == 800 and CursorBeaconAnchor.point[5] == 600,
  CursorBeaconAnchor.point[4] .. "," .. CursorBeaconAnchor.point[5])
check("the ring rides the anchor, not its own point", ring.point[2] == CursorBeaconAnchor and ring.point[1] == "CENTER")

local trail = {}
for _, t in ipairs(TEXTURES) do if t.parent == overlay and t.layer == "BACKGROUND" then trail[#trail + 1] = t end end
check("trail pool built", #trail == 20, #trail)
check("only the wanted segments show", (function() local n = 0 for _, t in ipairs(trail) do if t.shown then n = n + 1 end end return n end)() == 8)

CURSOR = { 1200, 600 }
loop()
local first = trail[1]
check("the trail lags behind a jump", first.point[4] > 800 and first.point[4] < 1200, first.point[4])
for i = 1, 200 do loop() end
check("the trail catches up when the cursor rests", math.abs(trail[1].point[4] - 1200) < 1, trail[1].point[4])

-- 2b. Keeping up with the cursor. The game draws its own cursor where the mouse is now, while
-- ours only reaches the screen next frame, so the drawn art is pushed forward while moving.
check("lead is on by default", ns.db.lead == 100, ns.db.lead)
CURSOR = { 1200, 600 } loop() loop()
check("a resting cursor gets no lead", CursorBeaconAnchor.point[4] == 1200, CursorBeaconAnchor.point[4])
CURSOR = { 1220, 640 }
loop()
check("a moving cursor is led by one frame of travel",
  CursorBeaconAnchor.point[4] == 1240 and CursorBeaconAnchor.point[5] == 680,
  CursorBeaconAnchor.point[4] .. "," .. CursorBeaconAnchor.point[5])
CURSOR = { 200, 640 }
loop()
check("a warp across the screen is capped, not flung off",
  CursorBeaconAnchor.point[4] == 110, CursorBeaconAnchor.point[4])
ns.db.lead = 50
CURSOR = { 400, 640 } loop() loop()
CURSOR = { 420, 640 } loop()
check("half lead moves it half a frame", CursorBeaconAnchor.point[4] == 430, CursorBeaconAnchor.point[4])
ns.db.lead = 0
CURSOR = { 600, 640 } loop() loop()
CURSOR = { 640, 640 } loop()
check("lead off pins it to the real cursor", CursorBeaconAnchor.point[4] == 640, CursorBeaconAnchor.point[4])
ns.db.lead = 100

-- Per frame layout work: one move for the anchor plus one per live trail segment, and nothing
-- else. This is the whole point of hanging the ring, dot, pointer and sweep off the anchor.
ns.db.dot.enabled = true
ns.db.activity.mode = "gcd"
ns.Refresh()
loop()
SETPOINTS = 0
loop()
check("the draw loop re-anchors the anchor and the trail, nothing more",
  SETPOINTS == 1 + math.min(ns.db.trail.count, 20), SETPOINTS .. " SetPoint calls")
ns.db.dot.enabled = false
ns.db.activity.mode = "off"
ns.Refresh()
CURSOR = { 1200, 600 }
for i = 1, 200 do loop() end

-- 3. Visibility rules
ns.db.combatOnly = true
loop()
check("combat only hides it out of combat", not overlay:IsShown())
INCOMBAT = true
loop()
check("combat only shows it in combat", overlay:IsShown())
ns.db.combatOnly = false
INCOMBAT = false

MOUSELOOK = true
loop()
check("mouse look hides it", not overlay:IsShown())
MOUSELOOK = false
loop()
check("mouse look release shows it", overlay:IsShown())

-- No streaking: the parked trail is on the cursor when it comes back.
MOUSELOOK = true loop()
CURSOR = { 300, 300 }
loop() loop()
MOUSELOOK = false loop()
check("the trail does not whip across the screen after a hide", math.abs(trail[1].point[4] - 300) < 30, trail[1].point[4])

-- 4. Hover growth
ns.db.ring.size = 40
ns.db.ring.hoverScale = 2
ns.Refresh()
for i = 1, 20 do loop(0.05) end
check("normal ring size", math.abs(ring.w - 40) < 0.1, ring.w)
MOUSEOVER = true
for i = 1, 20 do loop(0.05) end
check("ring grows over a unit", math.abs(ring.w - 80) < 0.1, ring.w)
MOUSEOVER = false
for i = 1, 20 do loop(0.05) end
check("ring shrinks back", math.abs(ring.w - 40) < 0.1, ring.w)

-- 4b. The drawn pointer, which is how the cursor gets bigger than the 64 pixel cvar limit
local pointer, pointerShadow
for _, t in ipairs(TEXTURES) do
  if t.parent == CursorBeaconAnchor and t.layer == "OVERLAY" then
    if t.sub == 4 then pointer = t elseif t.sub == 3 then pointerShadow = t end
  end
end
check("pointer textures built", pointer ~= nil and pointerShadow ~= nil)

if NO_POINTER_ART then
  check("no pointer art, the feature switches itself off", ns.hasPointerArt == false and ns.db.pointer.enabled == false)
  check("and the report says so", ns.report["textures pointer"] == "0/7 available", ns.report["textures pointer"])
  ns.db.pointer.enabled = true
  ns.Refresh()
  loop()
  check("and it stays off even if the saved value says otherwise", not pointer:IsShown() or ns.db.pointer.texture:find("CURSOR") == nil)
  ns.db.pointer.enabled = false
  ns.Refresh()
else
  check("all the pointer art resolved", ns.report["textures pointer"] == "7/7 available", ns.report["textures pointer"])
  check("pointer is off by default", not pointer:IsShown())

  ns.db.pointer.enabled = true
  ns.db.pointer.size = 160
  ns.db.scale = 2
  ns.Refresh()
  CURSOR = { 700, 400 }
  loop() loop()
  check("pointer shows", pointer:IsShown())
  check("pointer size is absolute, not scaled with everything else", pointer.w == 160, pointer.w)
  check("the arrow hangs its tip on the cursor",
    pointer.point[1] == "TOPLEFT" and pointer.point[2] == CursorBeaconAnchor
    and CursorBeaconAnchor.point[4] == 700 and CursorBeaconAnchor.point[5] == 400,
    pointer.point[1] .. " " .. CursorBeaconAnchor.point[4] .. "," .. CursorBeaconAnchor.point[5])
  check("the shadow sits behind and below", pointerShadow:IsShown() and pointerShadow.point[4] == 2 and pointerShadow.point[5] == -2)
  check("the shadow is black", pointerShadow.vertex[1] == 0 and pointerShadow.vertex[2] == 0)
  check("the shadow is fainter than the pointer", pointerShadow.alpha < pointer.alpha)

  ns.db.pointer.shadow = false
  ns.Refresh()
  loop()
  check("the outline can be turned off", not pointerShadow:IsShown())
  ns.db.pointer.shadow = true

  ns.db.pointer.offsetX, ns.db.pointer.offsetY = -6, 9
  ns.Refresh()
  loop()
  check("the nudge sliders move it", pointer.point[4] == -6 and pointer.point[5] == 9,
    pointer.point[4] .. "," .. pointer.point[5])
  ns.db.pointer.offsetX, ns.db.pointer.offsetY = 0, 0
  ns.Refresh()

  check("the crosshair centers instead", ns.PointerAnchor("Interface\\CURSOR\\Crosshairs") == "CENTER")
  ns.db.pointer.texture = "Interface\\CURSOR\\Crosshairs"
  ns.Refresh()
  loop()
  check("and the drawn crosshair is centered on the cursor", pointer.point[1] == "CENTER", pointer.point[1])
  ns.db.pointer.texture = "Interface\\CURSOR\\Point"

  ns.db.pointer.size = 512
  ns.Refresh()
  loop()
  check("the size slider reaches 512", pointer.w == 512, pointer.w)

  -- The pointer obeys the same visibility rules as everything else.
  MOUSELOOK = true loop()
  check("mouse look hides the pointer too", not overlay:IsShown())
  MOUSELOOK = false loop()

  -- 4c. The 1.2.0 cursor hiding is gone. This client paints a black square when asked for any
  -- cursor art that is not one of its own, so the switch was removed and upgrades are undone.
  check("SetCursor probed", ns.report["SetCursor"] == "present", ns.report["SetCursor"])
  CURSOR_CALLS = {}
  for i = 1, 40 do loop() end
  check("the draw loop never touches the cursor now", #CURSOR_CALLS == 0, #CURSOR_CALLS)
  check("the hide switch is gone from the defaults", ns.defaults.pointer.hideReal == nil)

  -- 4d. The activity sweep. A bare Cooldown draws nothing without a swipe texture, which is why
  -- it was invisible before 1.4.0.
  if CursorBeaconActivity then
  check("the sweep has art to draw with", CursorBeaconActivity.swipeTexture ~= nil)
  -- The sweep reveals its texture like a clock hand, so the texture is its shape. Seen in game: a
  -- plain white square made a solid square pie; the game's ring art (additive glow on black) made a
  -- ring on a black square, since a sweep cannot blend additively. It has its own white ring.
  local RING = "Interface\\AddOns\\CursorBeacon\\Media\\Ring\\Ring"
  local function Swipe() return tostring(CursorBeaconActivity.swipeTexture) end
  check("the sweep uses one of the addon's own rings", Swipe():sub(1, #RING) == RING, Swipe())
  check("not the white square", not Swipe():find("WHITE8X8"), Swipe())
  check("nor the game's glow art", not Swipe():find("Cooldown"), Swipe())
  ns.db.ring.texture = "Interface\\Cooldown\\starburst"
  ns.Refresh()
  check("and changing the cursor ring's shape leaves it alone", Swipe():sub(1, #RING) == RING, Swipe())
  ns.db.ring.texture = "Interface\\Cooldown\\ping4"
  ns.Refresh()

  -- Thickness picks the nearest ring file: a sweep's band can only change by changing its texture.
  check("the default is a 40px ring", ns.defaults.activity.size == 40, ns.defaults.activity.size)
  check("3px thick", ns.defaults.activity.thickness == 3, ns.defaults.activity.thickness)
  check("in a soft white, not a strong color", ns.defaults.activity.color[1] > 0.85 and ns.defaults.activity.color[3] > 0.8
    and ns.defaults.activity.alpha <= 0.6)
  local a = ns.db.activity
  a.size, a.thickness = 40, 3
  ns.Refresh()
  check("40px across and 3px thick picks the 15% band", Swipe() == RING .. "015", Swipe())
  a.size, a.thickness = 400, 1
  ns.Refresh()
  check("a hairline on a big ring picks the thinnest file", Swipe() == RING .. "002", Swipe())
  a.size, a.thickness = 40, 40
  ns.Refresh()
  check("a band past the radius fills in to a disc", Swipe() == RING .. "100", Swipe())
  a.size, a.thickness = 100, 12
  ns.Refresh()
  -- 12px on a 100px ring is 24.8% of its 48.4px outer radius: nearer 27 than 20 by ratio.
  check("in between picks the nearest band by ratio", Swipe() == RING .. "027", Swipe())
  for _, band in ipairs(ns.RING_BANDS) do
    local path = ns.RingTexture(100, 100 / 2 * (124 / 128) * band / 100)
    if path ~= RING .. string.format("%03d", band) then check("every band can be reached: " .. band, false, path) end
  end
  check("every band can be reached", true)
  local swaps = 0
  local real = CursorBeaconActivity.SetSwipeTexture
  rawset(CursorBeaconActivity, "SetSwipeTexture", function(s, t) swaps = swaps + 1 return real(s, t) end)
  ns.Refresh() ns.Refresh()
  check("an unchanged ring is not handed to the game again", swaps == 0, swaps)
  rawset(CursorBeaconActivity, "SetSwipeTexture", nil)
  check("the debug report names the band", (ns.report["activity ring"] or ""):find("27%%") ~= nil, ns.report["activity ring"])
  a.size, a.thickness = 40, 3
  ns.Refresh()
  -- Its template pins it to every edge of its parent, the 1 by 1 anchor; left pinned, it is that size and
  -- SetSize does nothing, which showed in game as a dot that grew over a cast.
  check("the sweep is not left pinned to the 1 by 1 anchor", not CursorBeaconActivity.allPoints)
  check("so it takes the size it is given", CursorBeaconActivity.w == ns.db.activity.size * (ns.db.scale or 1),
    tostring(CursorBeaconActivity.w))
  ns.db.activity.mode = "off"
  loop(0.1)
  check("nothing is sweeping to start with", not CursorBeaconActivity:IsShown())
  check("the preview does not complain", ns.Effects.PreviewActivity(4) == nil)
  loop(0.1)
  check("the preview sweeps even with the mode off", CursorBeaconActivity:IsShown())
  NOW = NOW + 5
  loop(0.1)
  check("and stops on its own", not CursorBeaconActivity:IsShown())
  ns.db.combatOnly = true
  check("the preview says so when combat only would hide it",
    (ns.Effects.PreviewActivity(4) or ""):find("combat only") ~= nil, ns.Effects.PreviewActivity(4))
  ns.db.combatOnly = false
  ns.db.enabled = false
  check("and when everything is switched off",
    (ns.Effects.PreviewActivity(4) or ""):find("switched off") ~= nil)
  ns.db.enabled = true
  loop()
  end

  ns.db.pointer.enabled = false
  ns.db.scale = 1
  ns.Refresh()
  loop()
  check("pointer can be turned off again", not pointer:IsShown())
end

-- 5. Idle fade
ns.db.idleFade = true
ns.db.idleSeconds = 1
CURSOR = { 500, 500 }
loop() loop()
local lit = ring.alpha
for i = 1, 60 do loop(0.05) end
check("idle fades the ring out", ring.alpha < lit and ring.alpha <= 0.01, ring.alpha .. " from " .. lit)
CURSOR = { 501, 502 }
loop() loop()
check("moving brings it back", ring.alpha > 0.1, ring.alpha)
ns.db.idleFade = false

-- 6. Activity sweep
local swipe = CursorBeaconActivity
if swipe then
ns.db.activity.mode = "off"
loop() loop()
check("sweep off by default", not swipe:IsShown())
ns.db.activity.mode = "gcd"
GCD = { NOW, 1.5 }
loop(0.1)
check("sweep shows for the global cooldown", swipe:IsShown() and swipe.cdDur == 1.5, tostring(swipe.cdDur))
GCD = nil
loop(0.1)
check("sweep hides when the cooldown ends", not swipe:IsShown())

ns.db.activity.mode = "cast"
CASTING = { name = "Shadow Bolt", startMs = NOW * 1000, endMs = (NOW + 3) * 1000, channel = false }
fire("UNIT_SPELLCAST_START", "player")
loop(0.1)
check("sweep shows for a cast", swipe:IsShown() and math.abs(swipe.cdDur - 3) < 0.01, tostring(swipe.cdDur))
fire("UNIT_SPELLCAST_STOP", "player")
loop(0.1)
check("sweep hides when the cast stops", not swipe:IsShown())
CASTING = { name = "Drain Life", startMs = NOW * 1000, endMs = (NOW + 5) * 1000, channel = true }
fire("UNIT_SPELLCAST_CHANNEL_START", "player")
loop(0.1)
check("sweep shows for a channel", swipe:IsShown())
fire("UNIT_SPELLCAST_CHANNEL_STOP", "player")
loop(0.1)
check("another unit's cast is ignored", (function()
  CASTING = { name = "Fireball", startMs = NOW * 1000, endMs = (NOW + 9) * 1000 }
  fire("UNIT_SPELLCAST_START", "target")
  loop(0.1)
  return not swipe:IsShown()
end)())
CASTING = nil
ns.db.activity.mode = "off"
loop(0.1)
else
  check("no sweep widget, the addon reports it instead of breaking", ns.report["activity swipe"]:find("unavailable") ~= nil)
end

-- 7. Cursor readout
local info = CursorBeaconInfo
ns.db.info.enabled = true
TARGET = true
ns.Refresh()
for i = 1, 20 do loop(0.05) end
check("readout shows with a target", info:IsShown())
local body
for _, t in ipairs(TEXTURES) do end
body = (function()
  for _, f in ipairs(FRAMES) do end
  return nil
end)()
check("readout names the target", (function()
  local fs = nil
  for _, f in ipairs(FRAMES) do if f == info then fs = f end end
  return true
end)())
TARGET = false
for i = 1, 20 do loop(0.05) end
check("readout hides with nothing to say", not info:IsShown())

TARGET = true
ns.db.info.fields.fps = true
ns.db.info.fields.latency = true
ns.db.info.fields.coords = true
ns.db.info.fields.clock = true
ns.db.info.fields.playerHealth = true
ns.db.info.fields.playerPower = true
for i = 1, 20 do loop(0.05) end
check("every field builds", info:IsShown())

-- A field that throws is switched off instead of breaking the addon.
BAD_HEALTH = true
for i = 1, 20 do loop(0.05) end
check("a secret value turns its field off", ns.db.info.fields.targetHealth == false and ns.db.info.fields.playerHealth == false)
check("and says so in the debug report", ns.report["info field targetHealth"] ~= nil, ns.report["info field targetHealth"])
BAD_HEALTH = false
ns.db.info.enabled = false
TARGET = false
ns.Refresh()

-- 7b. Protected unit values. Target name is a string and always works; health and power come back
-- as values this client will draw but will not let an addon read.
local statusBars = {}
for _, f in ipairs(FRAMES) do if f.kind == "StatusBar" then statusBars[#statusBars + 1] = f end end
check("a bar was built for each protected value", #statusBars == 3, #statusBars)
check("the bars have art", statusBars[1].barTexture ~= nil)

SECRET_UNITS = true
ns.numbersReadable = nil
ns.report["unit numbers"] = nil
check("protected values are spotted", ns.NumbersReadable() == false)
check("and explained in the debug report", (ns.report["unit numbers"] or ""):find("protected") ~= nil,
  ns.report["unit numbers"])

TARGET = true
ns.db.info.enabled = true
ns.db.info.fields.targetName = true
ns.db.info.fields.targetHealth = true
ns.db.info.fields.playerHealth = true
ns.db.info.fields.playerPower = true
ns.Refresh()
for i = 1, 20 do loop(0.05) end
check("the readout shows with protected values", CursorBeaconInfo:IsShown())
check("target health stays on rather than silently doing nothing", ns.db.info.fields.targetHealth == true)
local liveBars = 0
for _, b in ipairs(statusBars) do if b:IsShown() then liveBars = liveBars + 1 end end
check("all three bars are drawn", liveBars == 3, liveBars)
check("the bar was fed the protected value", statusBars[1].value ~= nil)
check("no percentage is printed when it cannot be read", statusBars[1].cbValue:GetText() == "")

-- With plain numbers the same bars carry a percentage.
SECRET_UNITS = false
ns.numbersReadable = nil
for i = 1, 20 do loop(0.05) end
check("plain numbers are spotted", ns.NumbersReadable() == true)
check("and the bar picks up a percentage", statusBars[1].cbValue:GetText() == "60%", statusBars[1].cbValue:GetText())

-- A target going away takes its bar with it but leaves the others alone.
TARGET = false
for i = 1, 20 do loop(0.05) end
liveBars = 0
for _, b in ipairs(statusBars) do if b:IsShown() then liveBars = liveBars + 1 end end
check("the target bar goes with the target", liveBars == 2, liveBars)

ns.db.info.enabled = false
ns.db.info.fields.targetHealth = false
ns.db.info.fields.playerHealth = false
ns.db.info.fields.playerPower = false
ns.Refresh()
loop()

-- 7c. Undoing 1.2.0 for anyone upgrading with the cursor hidden.
ns.db.pointer.hideReal = true
ns.db.pointer.softwareCursor = true
CVARS.gxCursor = "0"
CURSOR_CALLS = {}
fire("PLAYER_LOGIN")
check("the old hide setting is dropped", ns.db.pointer.hideReal == nil)
check("the cursor is handed back", CURSOR_CALLS[#CURSOR_CALLS] == "RESTORE", CURSOR_CALLS[#CURSOR_CALLS])
check("the hardware cursor is switched back on", CVARS.gxCursor == "1")
check("and the cleanup is recorded", (ns.report["1.2.0 cleanup"] or ""):find("put back") ~= nil,
  ns.report["1.2.0 cleanup"])

-- 8. Cursor size cvar
SlashCmdList.CURSORBEACON("size 3")
check("slash sets the cvar", CVARS.cursorSizePreferred == "2", CVARS.cursorSizePreferred)
check("and remembers it", ns.db.applyCursorSize == true and ns.db.cursorSize == 2)
SlashCmdList.CURSORBEACON("size auto")
check("auto stops us touching the cvar", ns.db.applyCursorSize == false)

-- 9. Slash commands
SlashCmdList.CURSORBEACON("off")
loop()
check("off hides everything", ns.db.enabled == false and not overlay:IsShown())
SlashCmdList.CURSORBEACON("on")
loop()
check("on brings it back", ns.db.enabled == true and overlay:IsShown())
SlashCmdList.CURSORBEACON("debug")
SlashCmdList.CURSORBEACON("help")
check("debug prints something", #CHAT > 0)

-- 9b. Minimap button
local mm = CursorBeaconMinimapButton
check("minimap button built", mm ~= nil and ns.report["minimap button"] == "ok", ns.report["minimap button"])
check("it hangs off the minimap", mm:GetParent() == Minimap)
check("it sits on the rim at the saved angle", mm.point and mm.point[1] == "CENTER" and mm.point[2] == Minimap)
local firstX = mm.point[4]
check("the rim offset is about the minimap radius",
  math.abs(math.sqrt(mm.point[4] ^ 2 + mm.point[5] ^ 2) - 76) < 0.5,
  math.sqrt(mm.point[4] ^ 2 + mm.point[5] ^ 2))

-- Left-click opens the options, right-click flips the effects.
CursorBeaconWindow:Hide()
mm.scripts.OnClick(mm, "LeftButton")
check("left-click opens the options", CATEGORIES[1].frame:IsShown())
mm.scripts.OnClick(mm, "LeftButton")
check("and closes them again", not CATEGORIES[1].frame:IsShown())
local wasOn = ns.db.enabled
mm.scripts.OnClick(mm, "RightButton")
check("right-click flips the effects", ns.db.enabled ~= wasOn)
mm.scripts.OnClick(mm, "RightButton")
check("and flips them back", ns.db.enabled == wasOn)

-- Dragging moves it around the rim and the new angle is kept.
mm.scripts.OnEnter(mm)
mm.scripts.OnLeave(mm)
local oldAngle = ns.db.minimap.angle
mm.scripts.OnDragStart(mm)

-- The minimap center is at 1770, 870 in the stub. Dragging to a known spot has to land on a known
-- angle: the game's own atan2 answers in degrees while math.atan2 answers in radians, and running
-- math.deg over the wrong one multiplies the angle by about fifty seven.
CURSOR = { 1770, 970 }
mm.scripts.OnUpdate(mm, 0.1)
check("straight above the minimap is 90 degrees", math.abs(ns.db.minimap.angle - 90) < 0.01, ns.db.minimap.angle)
CURSOR = { 1870, 870 }
mm.scripts.OnUpdate(mm, 0.1)
check("straight right is 0", math.abs(ns.db.minimap.angle) < 0.01, ns.db.minimap.angle)
CURSOR = { 1670, 870 }
mm.scripts.OnUpdate(mm, 0.1)
check("straight left is 180", math.abs(ns.db.minimap.angle - 180) < 0.01, ns.db.minimap.angle)
CURSOR = { 1770, 770 }
mm.scripts.OnUpdate(mm, 0.1)
check("straight below is 270", math.abs(ns.db.minimap.angle - 270) < 0.01, ns.db.minimap.angle)

-- A small mouse move must be a small angle move, which is what the bug broke.
CURSOR = { 1870, 870 }
mm.scripts.OnUpdate(mm, 0.1)
CURSOR = { 1870, 880 }
mm.scripts.OnUpdate(mm, 0.1)
check("a small drag is a small change", ns.db.minimap.angle > 0 and ns.db.minimap.angle < 12,
  ns.db.minimap.angle)

-- And the button follows the angle round the rim.
CURSOR = { 1770, 970 }
mm.scripts.OnUpdate(mm, 0.1)
check("the button sits above the minimap", math.abs(mm.point[4]) < 0.01 and mm.point[5] > 70,
  mm.point[4] .. "," .. mm.point[5])
check("dragging changed the angle", ns.db.minimap.angle ~= oldAngle, ns.db.minimap.angle)
check("and moved the button with it", mm.point[4] ~= firstX)
mm.scripts.OnDragStop(mm)
check("the drag handler is let go", mm.scripts.OnUpdate == nil)
check("the new angle is mirrored for the next login", CursorBeaconAccountDB.profile.minimap.angle == ns.db.minimap.angle)
check("the angle route is recorded", ns.report["minimap angle"] ~= nil, ns.report["minimap angle"])
check("and it is the expected one for this client",
  WOW_HAS_MATH_ATAN2 and ns.report["minimap angle"]:find("math.atan2") ~= nil
  or (not WOW_HAS_MATH_ATAN2) and ns.report["minimap angle"]:find("degrees") ~= nil,
  ns.report["minimap angle"])

-- Turning it off hides it, from the options and from chat.
ns.db.minimap.shown = false
ns.Refresh()
check("the option hides it", not mm:IsShown())
SlashCmdList.CURSORBEACON("minimap on")
check("the slash command brings it back", mm:IsShown() and ns.db.minimap.shown == true)
SlashCmdList.CURSORBEACON("minimap")
check("and with no argument it toggles", not mm:IsShown())
SlashCmdList.CURSORBEACON("minimap on")

-- 9c. Opening the options. The user wants the game's own options window, not a separate one.
local canvasPage = CATEGORIES[1].frame
CursorBeaconWindow:Hide()
HideUIPanel(SettingsPanel)
OPENED_CATEGORY = nil

mm.scripts.OnClick(mm, "LeftButton")
check("the minimap button opens the game's options", OPENED_CATEGORY == CATEGORIES[1])
check("and the page is showing", canvasPage:IsShown())
check("no separate window is opened", not CursorBeaconWindow:IsShown())
check("the route is recorded", (ns.report["open options"] or ""):sub(1, 6) == "ok, vi", ns.report["open options"])

mm.scripts.OnClick(mm, "LeftButton")
check("clicking again closes it", not canvasPage:IsShown() and not SettingsPanel:IsShown())

OPENED_CATEGORY = nil
SlashCmdList.CURSORBEACON("")
check("/cursor opens the same place", OPENED_CATEGORY == CATEGORIES[1] and canvasPage:IsShown())
check("still no separate window", not CursorBeaconWindow:IsShown())
HideUIPanel(SettingsPanel)

-- The reported bug: with the options window shut, navigating to a category does nothing and does
-- not error, so the button appeared dead unless another addon had already opened the window.
HideUIPanel(SettingsPanel)
OPENED_CATEGORY = nil
check("the options window starts shut", not SettingsPanel:IsShown() and not canvasPage:IsShown())
mm.scripts.OnClick(mm, "LeftButton")
check("the button opens it from shut", SettingsPanel:IsShown() and canvasPage:IsShown())
check("it opened the window rather than only navigating",
  (ns.report["open options"] or ""):find("opening the window") ~= nil, ns.report["open options"])
check("and no separate window crept in", not CursorBeaconWindow:IsShown())
HideUIPanel(SettingsPanel)

-- The case that already worked: another addon has the window open, we navigate into it.
ns.report["open options"] = nil
SettingsPanel:Show()
mm.scripts.OnClick(mm, "LeftButton")
check("it still works when the window is already open", canvasPage:IsShown())
HideUIPanel(SettingsPanel)

-- A client that only accepts the category id, never the category itself.
OPEN_ID_ONLY = true
ns.report["open options"] = nil
mm.scripts.OnClick(mm, "LeftButton")
check("an id only client is handled", canvasPage:IsShown(), ns.report["open options"])
OPEN_ID_ONLY = false
HideUIPanel(SettingsPanel)

-- The escape hatch, for anyone who would rather keep the game's window out of it.
SlashCmdList.CURSORBEACON("window")
check("/cursor window opens the addon's own window", CursorBeaconWindow:IsShown())
check("without touching the game's options", not canvasPage:IsShown())
SlashCmdList.CURSORBEACON("window")
check("and toggles it shut", not CursorBeaconWindow:IsShown())

-- A client that will not open its settings panel falls back rather than doing nothing.
OPEN_REFUSED = true
OPENED_CATEGORY = nil
ns.report["open options"] = nil
mm.scripts.OnClick(mm, "LeftButton")
check("a refusal falls back to the addon's window", CursorBeaconWindow:IsShown())
check("and says so in the debug report", (ns.report["open options"] or ""):find("no route worked") ~= nil,
  ns.report["open options"])
check("and the options window is not left hanging open", not SettingsPanel:IsShown())
OPEN_REFUSED = false
CursorBeaconWindow:Hide()
HideUIPanel(SettingsPanel)

-- 9d. The 3D spell effect
if NO_MODELSCENE then
  check("a client without ModelScene says so", (ns.report["3d effects"] or ""):find("no ModelScene") ~= nil,
    ns.report["3d effects"])
  ns.db.model.enabled = true
  ns.Refresh()
  loop() loop()
  check("and nothing errors when the effect is switched on anyway", true)
  ns.db.model.enabled = false
  ns.Refresh()
  local spellTab
  for _, f in ipairs(FRAMES) do if f.kind == "Button" and f.text == "Spell effect" then spellTab = f end end
  spellTab.scripts.OnClick(spellTab)
  check("its options tab still opens, and explains", ns.report["page spell"] == "ok", ns.report["page spell"])
else
  local scene = CursorBeaconModelScene
  check("the scene was built", scene ~= nil and ns.report["3d effects"] == "ok", ns.report["3d effects"])
  check("it covers the screen", scene.allPoints == true)
  check("it never takes a click", scene.mouseEnabled == false)
  check("a bare actor was enough", (ns.report["3d actor"] or ""):find("bare actor") ~= nil, ns.report["3d actor"])
  local actor = scene.actors[1]
  check("the effect is off to start with", not scene:IsShown())

  -- The effect is off by default, so logging in must not load thirty spell models to find out
  -- which ones this client has. That waits for first use.
  check("no spell model is loaded at login", MODEL_LOADS == 0, MODEL_LOADS)
  check("and the debug report says the check is still to come",
    (ns.report["3d models"] or ""):find("not checked yet", 1, true) ~= nil, ns.report["3d models"])
  check("the spell tab is not built until it is opened",
    (ns.report["page spell"] or ""):find("waiting", 1, true) ~= nil, ns.report["page spell"])

  ns.db.lead = 0
  ns.db.model.enabled = true
  ns.Refresh()
  local listed = #ns.SPELL_MODELS
  check("switching it on runs the check", ns.report["3d models"] == (listed - 2) .. "/" .. listed .. " this client accepted",
    ns.report["3d models"])
  check("switching it on loads the chosen spell", actor.model == ns.db.model.file, tostring(actor.model))
  check("one copy by default", ns.report["3d layers"] == "1, up to 5", ns.report["3d layers"])
  local probeLoads = MODEL_LOADS
  ns.Refresh()
  check("the check runs only once", MODEL_LOADS == probeLoads, MODEL_LOADS - probeLoads)

  -- Where the actor really is in the world, and where that lands on screen, in pixels from the
  -- bottom left whatever the projection itself answers in.
  local function ActorOnScreen()
    local s = actor:GetScale()
    local x, y, z = actor:GetPosition()
    local px, py = scene:Project3DPointTo2D(x * s, y * s, z * s)
    local es = scene:GetEffectiveScale()
    if PROJECTION_UNITS == "interface" then px, py = px * es, py * es
    elseif PROJECTION_UNITS == "fraction" then px, py = px * scene:GetWidth() * es, py * scene:GetHeight() * es end
    if PROJECTION_TOP_ORIGIN then py = scene:GetHeight() * es - py end
    return px, py
  end

  local es = UIParent.scale or 1
  local W, H = UIParent.w * es, UIParent.h * es
  local spots = { { W / 2, H / 2 }, { 1, 1 }, { W - 1, H - 1 }, { 37, H - 12 }, { W * 0.77, H * 0.31 } }
  CURSOR = { spots[1][1], spots[1][2] }
  loop() loop()
  check("the scene calibrated", (ns.report["3d calibration"] or ""):sub(1, 2) == "ok", ns.report["3d calibration"])
  check("and shows", scene:IsShown())

  local worst = 0
  for _, p in ipairs(spots) do
    CURSOR = { p[1], p[2] }
    loop() loop()
    local px, py = ActorOnScreen()
    worst = math.max(worst, math.abs(px - p[1]), math.abs(py - p[2]))
  end
  check("the spell sits exactly under the cursor, center to corners", worst < 0.01, worst .. " px off at worst")

  -- Size moves the camera rather than scaling the actor. A scaled actor keeps full sized particles
  -- and ribbons, so it never got small enough; pulling the camera back shrinks all of it evenly.
  local function PixelsPerUnit()
    return tonumber((ns.report["3d calibration"] or ""):match("([%d%.]+) pixels to a unit"))
  end
  local fullSize = PixelsPerUnit()
  check("the full size scale is known", fullSize and fullSize > 0, ns.report["3d calibration"])

  ns.db.model.size = 0.05
  ns.Refresh()
  CURSOR = { W * 0.2, H * 0.8 }
  loop() loop()
  check("5% pulls the camera twenty times further back", math.abs(scene.cam.pos[1] - 600) < 1e-6, scene.cam.pos[1])
  check("the actor itself stays at its own size", actor:GetScale() == 1, actor:GetScale())
  check("so everything on screen is a twentieth the size", math.abs(PixelsPerUnit() - fullSize / 20) < 0.06,
    PixelsPerUnit() .. " against " .. fullSize)
  local px, py = ActorOnScreen()
  check("and it was measured again, still exactly under the cursor",
    math.abs(px - W * 0.2) < 0.01 and math.abs(py - H * 0.8) < 0.01, px .. "," .. py)

  ns.db.model.size = 2.5
  ns.Refresh()
  CURSOR = { W * 0.7, H * 0.15 }
  loop() loop()
  check("250% brings the camera in", math.abs(scene.cam.pos[1] - 12) < 1e-6, scene.cam.pos[1])
  check("everything is two and a half times the size", math.abs(PixelsPerUnit() - fullSize * 2.5) < 0.06,
    PixelsPerUnit() .. " against " .. fullSize)
  px, py = ActorOnScreen()
  check("still exactly under the cursor", math.abs(px - W * 0.7) < 0.01 and math.abs(py - H * 0.15) < 0.01, px .. "," .. py)

  -- The overall size on the Cursor tab counts too.
  ns.db.model.size = 1
  ns.db.scale = 0.5
  ns.Refresh()
  loop()
  check("the overall size moves the camera as well", math.abs(scene.cam.pos[1] - 60) < 1e-6, scene.cam.pos[1])
  ns.db.scale = 1
  ns.Refresh()
  loop()

  -- An actor's position is in its own units: Blizzard multiplies it by the scale to get the world,
  -- and Blizzard's actor template rescales the actor by itself once its model loads. So the scale
  -- is read live, and a rescale behind the addon's back must not move the effect off the cursor.
  actor:SetScale(3)
  CURSOR = { W * 0.4, H * 0.6 }
  loop() loop()
  px, py = ActorOnScreen()
  check("an actor rescaled behind the addon's back still sits under the cursor",
    math.abs(px - W * 0.4) < 0.01 and math.abs(py - H * 0.6) < 0.01, px .. "," .. py)
  actor:SetScale(1)

  -- A warp across the screen reloads the model, so its ribbon starts fresh rather than streaking.
  CURSOR = { W * 0.5, H * 0.5 } loop() loop()
  local loads = MODEL_LOADS
  CURSOR = { W * 0.52, H * 0.5 } loop()
  check("ordinary movement does not reload the model", MODEL_LOADS == loads, MODEL_LOADS - loads)
  CURSOR = { 5, 5 } loop()
  check("a warp does", MODEL_LOADS == loads + 1, MODEL_LOADS - loads)

  -- Hidden by the shared rules, and the ribbon starts fresh when it comes back.
  MOUSELOOK = true loop()
  check("turning the camera hides the spell too", not scene:IsShown())
  loads = MODEL_LOADS
  MOUSELOOK = false loop()
  check("and it comes back with a fresh ribbon", scene:IsShown() and MODEL_LOADS == loads + 1)

  -- The opacity follows the master opacity and the idle fade.
  ns.db.model.alpha = 0.5
  ns.db.alpha = 0.8
  loop()
  check("opacity is the spell's times the overall", math.abs((actor.actorAlpha or 0) - 0.4) < 1e-9, actor.actorAlpha)
  ns.db.model.alpha, ns.db.alpha = 1, 1

  -- Picking another spell swaps the model; a spell this client lacks falls back to one it has.
  ns.db.model.file = 165569
  ns.Refresh()
  check("choosing Arcane Missiles loads it", actor.model == 165569, tostring(actor.model))
  ns.db.model.file = 382336
  ns.Refresh()
  check("a spell this client lacks falls back to one it has", actor.model ~= nil and MODEL_FILES[actor.model], tostring(actor.model))
  ns.db.model.file = 166815
  ns.Refresh()

  -- Pointing along the motion, and a screen that changes size underneath it.
  ns.db.model.aim = true
  CURSOR = { W * 0.3, H * 0.3 } loop()
  CURSOR = { W * 0.4, H * 0.3 } loop()
  check("aiming turns the actor", actor.yaw ~= nil)
  ns.db.model.aim = false
  local oldW = UIParent.w
  UIParent.w = UIParent.w * 1.25
  W = UIParent.w * es
  CURSOR = { W * 0.9, H * 0.5 }
  loop() loop()
  px, py = ActorOnScreen()
  check("a wider screen is measured again and still lines up",
    math.abs(px - W * 0.9) < 0.01 and math.abs(py - H * 0.5) < 0.01, px .. "," .. py)
  UIParent.w = oldW

  -- Every way the projection could answer: in pixels, in interface units, or as fractions of the
  -- scene, counting y from the bottom or from the top. A UI scale of 0.8 makes pixels and
  -- interface units tell apart; at exactly 1 they are the same numbers. The same screen, 1920 by
  -- 1080 pixels, is 2400 by 1350 interface units at that scale.
  UIParent.scale, UIParent.w, UIParent.h = 0.8, 2400, 1350
  es = 0.8
  W, H = 1920, 1080
  local expect = { pixels = "pixels", interface = "interface units", fraction = "fractions of the scene" }
  for _, units in ipairs({ "pixels", "interface", "fraction" }) do
    for _, top in ipairs({ false, true }) do
      PROJECTION_UNITS, PROJECTION_TOP_ORIGIN = units, top
      ns.Models.ForgetCalibration()
      local label = units .. (top and ", from the top" or "")
      CURSOR = { W * 0.5, H * 0.5 } loop() loop()
      local rep = ns.report["3d calibration"] or ""
      check("calibration reads " .. label, rep:find(expect[units], 1, true) ~= nil
        and (rep:find("from the top", 1, true) ~= nil) == top, rep)
      local worstHere = 0
      for _, p in ipairs({ { 1, 1 }, { W - 1, H - 1 }, { W * 0.13, H * 0.9 } }) do
        CURSOR = { p[1], p[2] } loop() loop()
        local qx, qy = ActorOnScreen()
        worstHere = math.max(worstHere, math.abs(qx - p[1]), math.abs(qy - p[2]))
      end
      check("and lines up exactly at a UI scale of 0.8 (" .. label .. ")", worstHere < 0.01, worstHere .. " px")
    end
  end
  PROJECTION_UNITS, PROJECTION_TOP_ORIGIN = "pixels", false
  UIParent.scale, UIParent.w, UIParent.h = 1, 1920, 1080
  ns.Models.ForgetCalibration()
  loop() loop()

  -- Opening the spell tab builds it, and it lists exactly what loaded.
  local spellTab
  for _, f in ipairs(FRAMES) do if f.kind == "Button" and f.text == "Spell effect" then spellTab = f end end
  check("there is a Spell effect tab", spellTab ~= nil)
  spellTab.scripts.OnClick(spellTab)
  check("opening it builds it", ns.report["page spell"] == "ok", ns.report["page spell"])
  local spellButtons, offered = {}, 0
  for _, f in ipairs(FRAMES) do
    if f.kind == "Button" and f.cbValue and type(f.cbValue) == "number" and f.cbValue > 100000 then
      spellButtons[#spellButtons + 1] = f
      if MODEL_FILES[f.cbValue] then offered = offered + 1 end
    end
  end
  check("it offers every spell this client has", offered == #ns.SPELL_MODELS - 2, offered)
  check("and nothing it lacks", #spellButtons == offered, #spellButtons .. " buttons")
  local rows = {}
  for _, b in ipairs(spellButtons) do rows[b.point[3]] = true end
  local rowCount = 0 for _ in pairs(rows) do rowCount = rowCount + 1 end
  check("the long list wraps onto several rows", rowCount >= 4, rowCount .. " rows")
  local widest = 0
  for _, b in ipairs(spellButtons) do widest = math.max(widest, b.point[2] + b.w) end
  check("and no row runs off the page", widest <= 464, widest)

  -- Density layers copies of the missile on the same spot.
  CURSOR = { W * 0.6, H * 0.4 } loop() loop()
  ns.db.model.density = 3
  ns.Refresh()
  CURSOR = { W * 0.35, H * 0.65 } loop() loop()
  check("density 3 makes three copies", #scene.actors >= 3 and ns.report["3d layers"] == "3, up to 5", ns.report["3d layers"])
  local allHere, allSame = true, true
  for i = 1, 3 do
    local a = scene.actors[i]
    if not a:IsShown() or a.model ~= ns.db.model.file then allSame = false end
    local sc = a:GetScale()
    local x, y, z = a:GetPosition()
    local qx, qy = scene:Project3DPointTo2D(x * sc, y * sc, z * sc)
    if math.abs(qx - W * 0.35) > 0.01 or math.abs(qy - H * 0.65) > 0.01 then allHere = false end
  end
  check("all three show the chosen spell", allSame)
  check("all three sit exactly under the cursor", allHere)

  ns.db.model.file = 165569
  ns.Refresh()
  local swapped = true
  for i = 1, 3 do if scene.actors[i].model ~= 165569 then swapped = false end end
  check("a new spell swaps every copy", swapped)

  CURSOR = { W * 0.36, H * 0.65 } loop()
  local loads = MODEL_LOADS
  CURSOR = { 4, 4 } loop()
  check("a warp starts every copy's ribbon fresh", MODEL_LOADS == loads + 3, MODEL_LOADS - loads)

  ns.db.model.density = 1
  ns.Refresh()
  loop()
  check("back to one copy hides and empties the others",
    scene.actors[1]:IsShown() and not scene.actors[2]:IsShown() and scene.actors[2].model == nil
    and not scene.actors[3]:IsShown() and scene.actors[3].model == nil)

  -- A client that will not hand out as many actors as density asks for.
  MAX_ACTORS = #scene.actors
  ns.db.model.density = 5
  ns.Refresh()
  check("asking for more than the client gives says so",
    (ns.report["3d layers"] or ""):find("of the 5 asked for", 1, true) ~= nil, ns.report["3d layers"])
  loop()
  check("and still draws what it has", scene:IsShown())
  MAX_ACTORS = nil
  ns.db.model.density = 1
  ns.db.model.file = 166815
  ns.Refresh()

  ns.db.model.enabled = false
  ns.db.lead = 100
  ns.Refresh()
  loop()
  check("switching it off hides the scene", not scene:IsShown())
end

-- 9e. Where things live in the options, and that every page fits.
local function TextFrame(text)
  for _, fs in ipairs(FONTSTRINGS) do if fs.text == text then return fs end end
end
local readoutHeader, activityHeader = TextFrame("Cursor readout"), TextFrame("Activity ring")
check("the activity ring is on the Information tab, with the readout",
  readoutHeader and activityHeader and readoutHeader.parent == activityHeader.parent)
local trailHeader = TextFrame("Trail")
check("and no longer on the Trail tab", trailHeader and trailHeader.parent ~= activityHeader.parent)
local columns = {}
for _, field in ipairs(ns.INFO_FIELDS) do
  local fs = TextFrame(field.label)
  if fs and fs.parent and fs.parent.point then columns[fs.parent.point[4]] = true end
end
local columnCount = 0 for _ in pairs(columns) do columnCount = columnCount + 1 end
check("the readout fields sit in three columns", columnCount == 3, columnCount)

-- Every page that has been built keeps its controls inside the page.
local pagesChecked, overflow = 0, nil
for _, f in ipairs(FRAMES) do
  if f.cbLayout then
    pagesChecked = pagesChecked + 1
    if f.cbLayout.y > f.h then overflow = (overflow or "") .. string.format(" %d of %d", f.cbLayout.y, f.h) end
  end
end
check("the pages were found", pagesChecked >= 8, pagesChecked)
check("no options page runs off the bottom", overflow == nil, overflow)

-- Two color swatches with one name is confusing (the activity ring's was briefly "Ring color",
-- the same as the cursor ring's, on another tab).
local swatchNames, dupe = {}, nil
for _, fs in ipairs(FONTSTRINGS) do
  local owner = fs.parent
  if owner and owner.kind == "Button" and owner.h == 22 and fs.text then
    if swatchNames[fs.text] then dupe = fs.text end
    swatchNames[fs.text] = true
  end
end
check("no two color swatches share a name", dupe == nil, dupe)

-- Size and Thickness share a row, as do the readout's two offsets.
local function SliderHolder(minV, maxV)
  for _, f in ipairs(FRAMES) do
    if f.kind == "Slider" and f.minV == minV and f.maxV == maxV then return f.parent end
  end
end
local sizeRow, thickRow = SliderHolder(16, 400), SliderHolder(1, 60)
check("the ring's size and thickness share a row", sizeRow and thickRow and sizeRow.point[5] == thickRow.point[5]
  and sizeRow.point[4] < thickRow.point[4])

-- Default look puts the ring back to its defaults but leaves what it shows alone.
local act = ns.db.activity
act.size, act.thickness, act.alpha, act.color, act.mode = 400, 20, 1, { 1, 0.85, 0.25 }, "both"
local defaultButton
for _, f in ipairs(FRAMES) do if f.kind == "Button" and f.text == "Default look" then defaultButton = f end end
check("there is a Default look button", defaultButton ~= nil)
defaultButton.scripts.OnClick(defaultButton)
local d = ns.defaults.activity
check("Default look restores the size, thickness and opacity",
  act.size == d.size and act.thickness == d.thickness and act.alpha == d.alpha, act.size .. "/" .. act.thickness .. "/" .. act.alpha)
check("and the color", act.color[1] == d.color[1] and act.color[2] == d.color[2] and act.color[3] == d.color[3])
check("as a copy, so changing it later cannot change the defaults", act.color ~= d.color)
check("but leaves what it shows alone", act.mode == "both", act.mode)
act.mode = "off"
ns.Refresh()

-- 10. Options widgets
local checks, sliders, choiceButtons = 0, 0, 0
for _, f in ipairs(FRAMES) do
  if f.kind == "CheckButton" then checks = checks + 1 end
  if f.kind == "Slider" then sliders = sliders + 1 end
end
check("checkboxes built", checks >= 18, checks)
check("sliders built", sliders >= 14, sliders)

-- Flipping a checkbox writes through to the saved variables.
local ringCheck
for _, f in ipairs(FRAMES) do
  if f.kind == "CheckButton" and f.scripts.OnClick then ringCheck = ringCheck or f end
end
ringCheck.checked = false
ringCheck.scripts.OnClick(ringCheck)
check("a checkbox writes to the db", ns.db.enabled == false)
ringCheck.checked = true
ringCheck.scripts.OnClick(ringCheck)
check("and back", ns.db.enabled == true)

-- Sliders round to their step and save.
local scaleSlider
for _, f in ipairs(FRAMES) do
  if f.kind == "Slider" and f.minV == 50 and f.maxV == 500 then scaleSlider = f end
end
check("found the overall size slider", scaleSlider ~= nil)
scaleSlider:SetValue(152)
check("slider rounds to its step and saves", math.abs(ns.db.scale - 1.5) < 0.001, ns.db.scale)

-- The color picker is handed our current color and its result is stored.
local colorButton
for _, fs in ipairs(FONTSTRINGS) do
  if fs.text == "Ring color" then colorButton = fs.parent end
end
check("found the ring color swatch", colorButton ~= nil and colorButton.h == 22)
colorButton.scripts.OnClick(colorButton)
check("picker opened with the current color", PICKED ~= nil and PICKED.r ~= nil)
PICKED.swatchFunc()
check("picker result saved", math.abs(ns.db.ring.color[1] - 0.1) < 0.001, ns.db.ring.color[1])
PICKED.cancelFunc({ r = 0.9, g = 0.8, b = 0.7 })
check("cancel restores the old color", math.abs(ns.db.ring.color[1] - 0.9) < 0.001, ns.db.ring.color[1])

-- Navigation swaps pages.
local nav
for _, f in ipairs(FRAMES) do if f.kind == "Button" and f.text == "Information" then nav = f end end
check("found the Information tab", nav ~= nil)
nav.scripts.OnClick(nav)
check("switching tabs does not error", true)

-- The canvas page hosts the same controls and scales them to fit.
local canvas = CATEGORIES[1].frame
canvas.w, canvas.h = 700, 500
canvas:Show()
check("canvas page adopts the controls", CursorBeaconOptions:GetParent() == canvas)
check("canvas page scales to fit", CursorBeaconOptions.scale < 1 and CursorBeaconOptions.scale > 0.5, CursorBeaconOptions.scale)
canvas:Hide()

-- The window and the page never fight over the controls.
CursorBeaconWindow:Show()
check("window adopts the controls", CursorBeaconOptions:GetParent() == CursorBeaconWindow)
check("window shows them at full size", CursorBeaconOptions.scale == 1)
canvas:Show()
check("opening the game options closes the window", not CursorBeaconWindow:IsShown())
canvas:Hide()

-- 10b. Window styles (Styles.lua). Only the addon's own window is restyled; the controls inside
-- it are the same frames the game's options page shows, so they keep the game's look. Run as
-- it is for Blizzard, with --dark for a saved Dark choice, and with --eui for EllesmereUI.
do
  local Styles = ns.Styles
  local win = CursorBeaconWindow
  local close = win.cbClose
  local function Drawn(parent)
    local n = 0
    for _, tex in ipairs(TEXTURES) do if tex.parent == parent then n = n + 1 end end
    return n
  end
  local styleButtons, opacity = {}, nil
  for _, f in ipairs(FRAMES) do
    if f.kind == "Button" and (f.cbValue == "auto" or f.cbValue == "blizzard" or f.cbValue == "dark") then styleButtons[f.cbValue] = f end
    if f.kind == "Slider" and f.minV == 0 and f.maxV == 100 then opacity = f end
  end
  local function Pick(style) local b = styleButtons[style] b.scripts.OnClick(b) end
  local function Grayed() return opacity.alpha == 0.5 and opacity.enabled == false and opacity.cbCaption.fontObject == "GameFontDisable" end
  local function Live() return opacity.alpha == 1 and opacity.enabled == true and opacity.cbCaption.fontObject == "GameFontHighlight" end
  local function Backdrop()
    for _, tex in ipairs(TEXTURES) do if tex.parent == win and tex.layer == "BACKGROUND" and tex.sub == -8 then return tex end end
  end
  local function BackdropAlpha() local b = Backdrop() return b and b.gradient and b.gradient[2].a end
  local function Prompt() return CursorBeaconReloadPrompt end
  local function PromptShown() return Prompt() ~= nil and Prompt():IsShown() end
  local function SkinErrors()
    local n = 0
    for k, v in pairs(ns.report) do if k:find("skin error", 1, true) then n = n + 1 print("  " .. k .. ": " .. tostring(v)) end end
    return n
  end

  -- Compared byte for byte with ShardGrid's live copy (read on the JS side), so a new version of
  -- the shared file needs no change here.
  check("the style file is the shared one", Styles ~= nil and STYLES_SHARED == true, STYLES_SHARED_WHY)
  check("defaults carry a style and a Dark opacity", ns.defaults.style == "auto" and ns.defaults.darkAlpha == 0.92)
  check("the Look tab was built", ns.report["page look"] == "ok", ns.report["page look"])
  check("it offers all three styles", styleButtons.auto and styleButtons.blizzard and styleButtons.dark
    and styleButtons.auto.text == "Automatic" and styleButtons.dark.text == "Dark")
  check("and the Dark opacity slider", opacity ~= nil and opacity.cbCaption.text == "Dark background opacity")
  check("the window keeps its close button for the styles", BARE or type(close) == "table")

  if EUI_ON then
    local function Did(f, what) return f ~= nil and (EUI_DONE[f] or ""):find(what, 1, true) ~= nil end
    check("registered with EllesmereUI under the folder name", EUI_REG == "CursorBeacon", EUI_REG)
    check("Automatic draws EllesmereUI's look", Styles.Applied() == "eui", Styles.Applied())
    check("and the debug line says so", ns.report.skin == "EllesmereUI (eui style)", ns.report.skin)
    check("the window is shelled", Did(win, "Shell"))
    check("its title goes through EllesmereUI's font", Did(win.cbTitle, "Font"))
    check("its close button is restyled", Did(close, "CloseButton"))
    check("and raised above the border EllesmereUI lays over the window",
      win.euiBorder ~= nil and (close.level or 0) > (win.euiBorder.level or 0), tostring(close.level))
    check("Dark drew nothing of its own", Drawn(win) == 0, Drawn(win))
    check("the controls are left alone, they are the options page's too", not Did(styleButtons.dark, "Button") and not Did(opacity, "Slider"))
    check("the opacity slider is grayed while it is not Dark", Grayed())
    Pick("dark")
    check("choosing Dark over EllesmereUI asks for a reload", PromptShown())
    check("in EllesmereUI's look, like the rest of the addon", Did(Prompt(), "Shell") and Did(Prompt().reload, "Button"))
    check("and the debug line says what a reload brings", (ns.report.skin or ""):find("Dark after a /reload", 1, true) ~= nil, ns.report.skin)
    check("the slider is live for Dark", Live())
    Pick("auto")
    check("back to Automatic takes the prompt away", not PromptShown())
    check("and the slider is grayed again", Grayed())
  else
    if DARK_START then
      check("a saved Dark choice is drawn at login", Styles.Applied() == "dark", Styles.Applied())
      check("the debug line says Dark", ns.report.skin == "Dark", ns.report.skin)
    else
      check("Blizzard draws nothing", Styles.S == nil and Styles.Applied() == nil)
      check("and says why in the debug line", ns.report.skin == "Blizzard (EllesmereUI is not loaded)", ns.report.skin)
      check("the window has none of the Dark art", Drawn(win) == 0, Drawn(win))
      check("the opacity slider is grayed for Automatic", Grayed())
      Pick("blizzard")
      check("and for Blizzard", Grayed() and ns.db.style == "blizzard")
      check("Blizzard to Blizzard asks for nothing", not PromptShown())
      Pick("dark")
      check("Blizzard to Dark is drawn at once", Styles.Applied() == "dark" and ns.report.skin == "Dark", ns.report.skin)
      check("with no reload asked for", not PromptShown())
    end
    check("the window has a backdrop, title strip, accent rule and two edges", Drawn(win) == 11, Drawn(win))
    check("in the addon's accent", (function()
      for _, tex in ipairs(TEXTURES) do
        if tex.parent == win and tex.layer == "BORDER" and tex.color and tex.color[3] == 1.0 and tex.color[1] == 0.25 then return true end
      end
    end)())
    if not BARE then
      check("the close button is a drawn X", Drawn(close) == 2, Drawn(close))
      check("raised above the window's own frames", (close.level or 0) > 0, close.level)
    end
    check("the controls are left alone, they are the options page's too", Drawn(styleButtons.dark) == 0 and Drawn(opacity) == 0)
    check("the backdrop takes the saved opacity", BackdropAlpha() == 0.92, BackdropAlpha())
    check("the opacity slider is live for Dark", Live())
    opacity:SetValue(62)
    check("moving it saves to the step", math.abs(ns.db.darkAlpha - 0.6) < 1e-9, ns.db.darkAlpha)
    check("and repaints the backdrop at once", math.abs((BackdropAlpha() or 0) - 0.6) < 1e-9, BackdropAlpha())
    opacity.scripts.OnEnter(opacity)
    opacity.scripts.OnLeave(opacity)
    check("the options note says what is in use", (Styles.Note() or ""):find("In use: Dark", 1, true) ~= nil, Styles.Note())

    -- Leaving a drawn style. The reload prompt falls back to plain buttons, so this runs on a
    -- client with no templates (--bare) too.
    do
      Pick("blizzard")
      check("leaving Dark asks for a reload", PromptShown())
      check("and says why", (Prompt().text.text or ""):find("Switching Cursor Beacon to Blizzard", 1, true) ~= nil, Prompt().text.text)
      check("the prompt is in the Dark style too", Drawn(Prompt()) == 11, Drawn(Prompt()))
      check("the debug line says a reload is pending", (ns.report.skin or ""):find("Blizzard after a /reload", 1, true) ~= nil, ns.report.skin)
      check("so does the options note", (Styles.Note() or ""):find("/reload", 1, true) ~= nil)
      check("and the slider grays out", Grayed())
      RELOADED = false
      C_UI = { Reload = function() RELOADED = true end }
      Prompt().reload.scripts.OnClick(Prompt().reload)
      check("Reload now reloads", RELOADED)
      C_UI = nil
      Pick("dark")
      check("coming back to Dark takes the prompt away", not PromptShown())

      -- /cursor style
      local before = #CHAT
      SlashCmdList.CURSORBEACON("style auto")
      check("/cursor style auto sets it", ns.db.style == "auto")
      check("and says so, with the note", (CHAT[before + 1] or ""):find("window style: Automatic.", 1, true) ~= nil, CHAT[before + 1])
      check("the choice is mirrored for the next login", CursorBeaconAccountDB.profile.style == "auto")
      SlashCmdList.CURSORBEACON("style")
      check("with no argument it steps to the next style", ns.db.style == "blizzard", ns.db.style)
      SlashCmdList.CURSORBEACON("style dark")
      check("/cursor style dark", ns.db.style == "dark" and not PromptShown())
      before = #CHAT
      SlashCmdList.CURSORBEACON("style neon")
      check("an unknown style is refused", ns.db.style == "dark" and (CHAT[before + 1] or ""):find("use /cursor style", 1, true) ~= nil)
    end
  end

  -- The window still shows the shared controls, in every style.
  win:Show()
  check("the styled window still adopts the controls", CursorBeaconOptions:GetParent() == win)
  win:Hide()

  -- 10c. The window's close X. The template's own click goes through HideUIPanel, which this
  -- client refuses in combat, so the X has to hide the window itself. Checked after the styles,
  -- so the restyled X is the one clicked.
  if type(close) == "table" then
    check("the X has a click of its own", type(close.scripts.OnClick) == "function")
    win:Show()
    INCOMBAT = true
    local blocked = BLOCKED
    pcall(close.scripts.OnClick, close, "LeftButton")
    INCOMBAT = false
    check("in combat the X closes the window", not win:IsShown())
    check("with no interface action blocked", BLOCKED == blocked, BLOCKED - blocked)
    win:Hide()
    win:Show()
    pcall(close.scripts.OnClick, close, "LeftButton")
    check("out of combat the X still closes it", not win:IsShown())
    win:Show()
    check("and the window takes the controls back when it opens again", CursorBeaconOptions:GetParent() == win)
    win:Hide()
  else
    check("no templates, so no close button to click (--bare)", BARE)
  end
  local before = #CHAT
  SlashCmdList.CURSORBEACON("debug")
  local skinLine
  for i = before + 1, #CHAT do if CHAT[i]:find("skin:", 1, true) then skinLine = CHAT[i] end end
  check("/cursor debug prints the skin line", skinLine ~= nil)
  check("no skin errors", SkinErrors() == 0)
end

-- 11. Reset and the account mirror
ns.db.ring.size = 99
ns.MirrorToAccount()
check("mirror keeps a copy", CursorBeaconAccountDB.profile.ring.size == 99)
SlashCmdList.CURSORBEACON("reset")
check("reset restores defaults", ns.db.ring.size == 46 and ns.db.trail.count == 8)

-- The client bug: a blank per character table on login adopts the account copy.
ns.db.trail.count = 3
ns.MirrorToAccount()
CursorBeaconDB = {}
fire("PLAYER_LOGIN")
check("blank saved variables adopt the account copy", ns.db.trail.count == 3, ns.db.trail.count)
check("and the report says so", ns.report["db player login"] == "adopted the account copy", ns.report["db player login"])

-- 12. Strata values are all real
for _, value in ipairs({ "BACKGROUND", "MEDIUM", "HIGH", "TOOLTIP" }) do
  ns.db.strata = value
  local ok = pcall(ns.Refresh)
  check("strata " .. value .. " is valid", ok)
end
ns.db.strata = "TOOLTIP"


-- A minimap button collector (EllesmereUI's, for one) takes the button off the minimap. Neither a
-- refresh nor a drag tick may put it back on the rim then; on the minimap a drag still moves it.
do
  local mm = CursorBeaconMinimapButton
  local function Script(f, e) return f.scripts[e] end
  local holder = CreateFrame("Frame", nil, UIParent)
  local own, setPoint = rawget(mm, "SetPoint"), mm.SetPoint
  local moves, rel = 0, nil
  rawset(mm, "SetPoint", function(self, ...) moves = moves + 1 rel = select(2, ...) return setPoint(self, ...) end)
  local center, escale, cursor = rawget(Minimap, "GetCenter"), rawget(Minimap, "GetEffectiveScale"), GetCursorPosition
  rawset(Minimap, "GetCenter", function() return 500, 500 end)
  rawset(Minimap, "GetEffectiveScale", function() return 1 end)
  GetCursorPosition = function() return 600, 560 end
  -- The game has both: a degree based global atan2 and the radian based math.atan2.
  local atan2Was, mathAtan2Was = atan2, math.atan2
  atan2 = atan2 or function(y, x) return math.deg(math.atan(y, x)) end
  math.atan2 = math.atan2 or function(y, x) return math.atan(y, x) end
  local function Drag()
    local start, stop = Script(mm, "OnDragStart"), Script(mm, "OnDragStop")
    if not start then return false end
    start(mm)
    local tick = Script(mm, "OnUpdate")
    if tick then tick(mm, 0.02) end
    if stop then stop(mm) end
    return tick ~= nil
  end
  mm:SetParent(holder)
  Drag()
  ns.Refresh()
  check("minimap: a button a collector (EllesmereUI's) has taken stays where the collector put it", moves == 0, moves)
  mm:SetParent(Minimap)
  local dragged = Drag()
  check("minimap: on the minimap a drag still moves it round the rim", dragged and moves > 0 and rel == Minimap, moves)
  rawset(mm, "SetPoint", own)
  rawset(Minimap, "GetCenter", center)
  rawset(Minimap, "GetEffectiveScale", escale)
  GetCursorPosition = cursor
  atan2, math.atan2 = atan2Was, mathAtan2Was
end
-- 13. Nothing above left a stray error in the chat log
local errors = 0
for _, line in ipairs(CHAT) do if line:find("failed") then errors = errors + 1 end end
check("no failures printed", errors == 0, errors)

print(("RESULT pass=%d fail=%d"):format(PASS, FAIL))
`;

function run(code, name) {
  if (lauxlib.luaL_loadbuffer(L, to_luastring(code), null, to_luastring(name)) !== 0 || lua.lua_pcall(L, 0, 0, 0) !== 0) {
    console.log('LUA ERROR in ' + name + ': ' + lua.lua_tojsstring(L, -1)); process.exit(1);
  }
}
lua.lua_newtable(L);
for (const f of files) { lua.lua_pushstring(L, to_luastring(fs.readFileSync(DIR + f, 'utf8'))); lua.lua_setfield(L, -2, to_luastring(f)); }
lua.lua_setglobal(L, to_luastring('SOURCES'));
lua.lua_newtable(L); files.forEach((f, i) => { lua.lua_pushstring(L, to_luastring(f)); lua.lua_rawseti(L, -2, i + 1); });
lua.lua_setglobal(L, to_luastring('FILES'));

// Every addon carries the same Styles.lua; ShardGrid's live copy is the reference.
(function compareSharedStyles() {
  const reference = 'C:/Program Files (x86)/World of Warcraft/_classic_beta_/Interface/AddOns/ShardGrid/Styles.lua';
  let shared = false, why;
  if (!fs.existsSync(reference)) why = 'ShardGrid is not installed at ' + reference;
  else if (Buffer.compare(fs.readFileSync(reference), fs.readFileSync(DIR + 'Styles.lua')) === 0) shared = true;
  else why = 'Styles.lua differs from ' + reference;
  lua.lua_pushboolean(L, shared); lua.lua_setglobal(L, to_luastring('STYLES_SHARED'));
  lua.lua_pushstring(L, to_luastring(why || '')); lua.lua_setglobal(L, to_luastring('STYLES_SHARED_WHY'));
})();

const pre = (process.argv.includes('--bare')
  ? 'BARE=true\nBAD_TEMPLATES={UICheckButtonTemplate=true,ChatConfigCheckButtonTemplate=true,MinimalSliderTemplate=true,UISliderTemplate=true,OptionsSliderTemplate=true,UIPanelButtonTemplate=true,UIPanelCloseButton=true,CooldownFrameTemplate=true,DefaultPanelFlatTemplate=true,DefaultPanelTemplate=true,ButtonFrameTemplate=true,BasicFrameTemplate=true,BackdropTemplate=true}\n'
  : '') + (process.argv.includes('--verbose') ? 'VERBOSE=true\n' : '')
  + (process.argv.includes('--noart') ? 'NO_POINTER_ART=true\n' : '')
  + (process.argv.includes('--nomathatan2') ? 'WOW_HAS_MATH_ATAN2=false\n' : '')
  + (process.argv.includes('--nomodelscene') ? 'NO_MODELSCENE=true\n' : '')
  + (process.argv.includes('--dark') ? 'DARK_START=true\n' : '')
  + (process.argv.includes('--eui') ? 'EUI_ON=true\n' : '');
// The sweep's rings are files the Lua above can only name, so they are checked here. The band list
// in Effects.lua and the one in the tool that makes the files must agree; every band must have its
// file in the repository; and each file must be a power of two, white in every pixel (so the sweep
// color alone decides the color), clear in the corners, and have the band its name says,
// measured from the pixels.
(function checkRingFiles() {
  const path = require('path');
  const repo = path.join(__dirname, '..');
  const fail = msg => { console.log('FAIL: activity ring files: ' + msg); process.exit(1); };
  const luaList = /ns\.RING_BANDS = \{([^}]*)\}/.exec(fs.readFileSync(path.join(repo, 'Effects.lua'), 'utf8'));
  const toolList = /const BANDS = \[([^\]]*)\]/.exec(fs.readFileSync(path.join(repo, 'tools', 'make-ring.js'), 'utf8'));
  if (!luaList || !toolList) fail('could not read the band lists');
  const bands = luaList[1].split(',').map(Number);
  if (bands.join() !== toolList[1].split(',').map(Number).join()) fail('Effects.lua and tools/make-ring.js list different bands');
  for (const band of bands) {
    const file = path.join(repo, 'Media', 'Ring', 'Ring' + String(band).padStart(3, '0') + '.tga');
    if (!fs.existsSync(file)) fail('missing ' + file);
    const b = fs.readFileSync(file);
    if (b[2] !== 2 || b[16] !== 32 || (b[17] & 0x0f) !== 8) fail(band + ': not a 32 bit TGA with an 8 bit alpha channel');
    const w = b.readUInt16LE(12), h = b.readUInt16LE(14);
    if (w !== h || (w & (w - 1)) !== 0) fail(band + ': not square and a power of two');
    const alpha = (x, y) => b[18 + (y * w + x) * 4 + 3];
    for (let i = 18; i < b.length; i += 4) if (b[i] !== 255 || b[i + 1] !== 255 || b[i + 2] !== 255) fail(band + ': a pixel is not white');
    if (alpha(0, 0) !== 0) fail(band + ': a corner is not clear');
    // Walk down the middle column from the top: where the band starts, and where it ends.
    const x = w >> 1;
    let outer = -1, inner = h >> 1;
    for (let y = 0; y <= h >> 1; y++) {
      if (outer < 0 && alpha(x, y) >= 128) outer = y;
      else if (outer >= 0 && alpha(x, y) < 128) { inner = y; break; }
    }
    if (outer < 0) fail(band + ': no band found');
    const measured = 100 * (inner - outer) / (124 * w / 256);
    if (Math.abs(measured - band) > Math.max(1.5, band * 0.08)) fail(band + ': the band measures ' + measured.toFixed(1) + '%');
    if (band < 100 && alpha(x, h >> 1) !== 0) fail(band + ': the middle is not clear');
  }
})();

run(pre + stub, 'stub');
run(driver, 'driver');
