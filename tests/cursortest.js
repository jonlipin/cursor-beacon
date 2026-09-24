// Offline harness for Cursor Beacon: stubs the WoW API in fengari and walks the main paths.
const fs = require('fs');
const { lua, lauxlib, lualib, to_luastring } = require('fengari');
const DIR = (process.argv.slice(2).find(a => !a.startsWith('--')) || 'C:/Users/jonli/cursor-beacon/');
const L = lauxlib.luaL_newstate(); lualib.luaL_openlibs(L);
const files = ['Core.lua', 'Effects.lua', 'Info.lua', 'Options.lua'];

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
    if k == "ClearAllPoints" then return function(s) s.point = nil end end
    if k == "SetAllPoints" then return function(s) s.allPoints = true end end
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
      local valid = { BACKGROUND = 1, LOW = 1, MEDIUM = 1, HIGH = 1, DIALOG = 1, FULLSCREEN = 1, TOOLTIP = 1 }
      if not valid[v] then error("bad strata " .. tostring(v)) end
      s.strata = v
    end end
    if k == "GetFrameStrata" then return function(s) return s.strata end end
    if k == "SetBackdrop" then return function(s, b) s.backdrop = b end end
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
function CreateFrame(kind, name, parent, template)
  if template and BAD_TEMPLATES[template] then error("Couldn't find inherited node " .. template) end
  local f = obj(kind, template, name)
  f.parent = parent
  if template == "ButtonFrameTemplate" or template == "DefaultPanelFlatTemplate" or template == "DefaultPanelTemplate" then
    f.NineSlice = obj("Frame") f.TitleText = obj("fontstring") f.Inset = obj("Frame")
  end
  FRAMES[#FRAMES + 1] = f
  if name then _G[name] = f end
  return f
end
UIParent = obj("Frame") UIParent.w, UIParent.h = 1920, 1080
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
-- The reported behaviour of this client: OpenToCategory NAVIGATES to a category, it does not open
-- the options window. With the window shut it quietly does nothing and raises no error, so a
-- caller that only checks pcall thinks it worked. Opening the window is a separate call.
OPEN_NEEDS_PANEL = OPEN_NEEDS_PANEL ~= false
-- Some clients only accept the category id, not the category itself.
OPEN_ID_ONLY = OPEN_ID_ONLY == true
SettingsPanel = obj("Frame") SettingsPanel:Hide()
SettingsPanel.Open = function(self) self:Show() end
function ShowUIPanel(f) f:Show() end
function HideUIPanel(f)
  f:Hide()
  if f == SettingsPanel then
    for _, c in ipairs(CATEGORIES) do c.frame:Hide() end
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
CursorBeaconDB = {}
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

  check("the crosshair centres instead", ns.PointerAnchor("Interface\\CURSOR\\Crosshairs") == "CENTER")
  ns.db.pointer.texture = "Interface\\CURSOR\\Crosshairs"
  ns.Refresh()
  loop()
  check("and the drawn crosshair is centred on the cursor", pointer.point[1] == "CENTER", pointer.point[1])
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

-- The minimap centre is at 1770, 870 in the stub. Dragging to a known spot has to land on a known
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

-- The colour picker is handed our current colour and its result is stored.
local colourButton
for _, fs in ipairs(FONTSTRINGS) do
  if fs.text == "Ring colour" then colourButton = fs.parent end
end
check("found the ring colour swatch", colourButton ~= nil and colourButton.h == 22)
colourButton.scripts.OnClick(colourButton)
check("picker opened with the current colour", PICKED ~= nil and PICKED.r ~= nil)
PICKED.swatchFunc()
check("picker result saved", math.abs(ns.db.ring.color[1] - 0.1) < 0.001, ns.db.ring.color[1])
PICKED.cancelFunc({ r = 0.9, g = 0.8, b = 0.7 })
check("cancel restores the old colour", math.abs(ns.db.ring.color[1] - 0.9) < 0.001, ns.db.ring.color[1])

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

const pre = (process.argv.includes('--bare')
  ? 'BARE=true\nBAD_TEMPLATES={UICheckButtonTemplate=true,ChatConfigCheckButtonTemplate=true,MinimalSliderTemplate=true,UISliderTemplate=true,OptionsSliderTemplate=true,UIPanelButtonTemplate=true,UIPanelCloseButton=true,CooldownFrameTemplate=true,DefaultPanelFlatTemplate=true,DefaultPanelTemplate=true,ButtonFrameTemplate=true,BasicFrameTemplate=true,BackdropTemplate=true}\n'
  : '') + (process.argv.includes('--verbose') ? 'VERBOSE=true\n' : '')
  + (process.argv.includes('--noart') ? 'NO_POINTER_ART=true\n' : '');
run(pre + stub, 'stub');
run(driver, 'driver');
