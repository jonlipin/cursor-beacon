-- Cursor Beacon
-- Skins: the addon's own window in the window styles. Styles.lua does the choosing and the
-- drawing (Blizzard, Dark, or EllesmereUI's look); this file says what Cursor Beacon restyles.
--
-- That is the standalone window's frame (its backdrop, title and close button) and nothing more:
--  * The controls inside it are the very frames the game's options window shows on our page.
--    Options.lua moves one set between the two, and a restyle cannot be taken back off, so
--    restyling them in the window would restyle them in the game's options window as well.
--    They keep the game's look, the way EllesmereUI leaves the contents of options pages alone.
--  * The minimap button belongs with the game's minimap art.
--  * Everything drawn at the cursor (pointer, ring, trail, sweep, readout) is the feature itself,
--    and the readout already sits on a flat dark backing.
-- The reload prompt is drawn by Styles.lua in whatever style is in use.

local ADDON, ns = ...
local Styles = ns.Styles

-- A border frame the style lays over the window sits above its title bar buttons, so the close
-- button is put back on top of everything else in the window.
local function RaiseWithinParent(button, parent)
	local level = parent.GetFrameLevel and parent:GetFrameLevel() or 1
	for _, child in ipairs({ parent:GetChildren() }) do
		if child ~= button then level = math.max(level, child:GetFrameLevel() or 0) end
	end
	button:SetFrameLevel(level + 5)
end

-- Also called from BuildWindow, for a window built after a style was drawn.
function ns.SkinWindow(win)
	local S = Styles.S
	if not S or type(win) ~= "table" then return end
	Styles.Try("options window", function()
		S.Shell(win)
		if type(win.cbTitle) == "table" then S.Font(win.cbTitle) end
		local close = win.cbClose
		if type(close) == "table" then
			S.CloseButton(close)
			RaiseWithinParent(close, win)
		end
	end)
end

Styles.Setup({
	addon = ADDON,
	title = "Cursor Beacon",
	db = function() return ns.DB and ns.DB() end,
	report = ns.report,
	accent = { 0.25, 0.75, 1.0 }, -- the ring's default blue
	skin = function() ns.SkinWindow(CursorBeaconWindow) end,
})
