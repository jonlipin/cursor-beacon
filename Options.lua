-- Cursor Beacon
-- Options: one set of controls, shown either in the game's own options list
-- (Esc > Options > AddOns > Cursor Beacon) or in a standalone window opened with /cursor.
--
-- The page is registered as a CANVAS category and holds only our own widgets. It deliberately
-- does not create Settings proxy settings and never calls Settings.OpenToCategory: on this
-- client both of those tainted Blizzard code paths and produced "secret number value" errors in
-- unrelated frames. Registering a canvas category and drawing into it is safe.

local ADDON, ns = ...

local report = ns.report

local CONTENT_W, CONTENT_H = 664, 544
local NAV_W = 150
local PANE_X = NAV_W + 14
local PANE_W = CONTENT_W - PANE_X - 14

local content, window, page
local pages, navButtons = {}, {}
local widgets = {}
local currentPage = "cursor"
local uniqueID = 0

local function NextName(prefix)
	uniqueID = uniqueID + 1
	return "CursorBeacon" .. prefix .. uniqueID
end

local function Tooltip(widget, title, body)
	if not body and not title then return end
	widget:SetScript("OnEnter", function(self)
		GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
		GameTooltip:SetText(title or "", 1, 1, 1)
		if body then GameTooltip:AddLine(body, nil, nil, nil, true) end
		GameTooltip:Show()
	end)
	widget:SetScript("OnLeave", function() GameTooltip:Hide() end)
end

-- ------------------------------------------------------------------
-- Panel art for the standalone window, same chain the bag style windows use.
-- ------------------------------------------------------------------

local PANEL_TEMPLATES = {
	{ "DefaultPanelFlatTemplate", function(f) return f.NineSlice ~= nil end },
	{ "DefaultPanelTemplate", function(f) return f.NineSlice ~= nil end },
	{ "ButtonFrameTemplate", function(f) return f.NineSlice ~= nil or f.Inset ~= nil end },
	{ "BasicFrameTemplate" },
}

local function CreatePanel(name)
	local f, used
	for _, candidate in ipairs(PANEL_TEMPLATES) do
		local ok, made = pcall(CreateFrame, "Frame", name, UIParent, candidate[1])
		if ok and made and (not candidate[2] or candidate[2](made)) then
			f, used = made, candidate[1]
			break
		end
		if ok and made then made:Hide() end
	end
	if not f then
		local ok, made = pcall(CreateFrame, "Frame", name, UIParent, "BackdropTemplate")
		f = (ok and made) or CreateFrame("Frame", name, UIParent)
		used = "backdrop"
		if f.SetBackdrop then
			f:SetBackdrop({
				bgFile = "Interface\\Tooltips\\UI-Tooltip-Background",
				edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
				tile = true, tileSize = 16, edgeSize = 14,
				insets = { left = 3, right = 3, top = 3, bottom = 3 },
			})
			f:SetBackdropColor(0.05, 0.05, 0.05, 0.94)
		end
	end
	report["window panel"] = used

	if used == "ButtonFrameTemplate" then
		if ButtonFrameTemplate_HidePortrait then pcall(ButtonFrameTemplate_HidePortrait, f) end
		if ButtonFrameTemplate_HideButtonBar then pcall(ButtonFrameTemplate_HideButtonBar, f) end
		if f.Inset then f.Inset:Hide() end
	end

	local title = f.TitleText or (f.TitleContainer and f.TitleContainer.TitleText)
	if not title then
		title = f:CreateFontString(nil, "OVERLAY", "GameFontNormal")
		title:SetPoint("TOP", 0, -6)
	end
	f.cbTitle = title

	if not f.CloseButton then
		local ok, b = pcall(CreateFrame, "Button", nil, f, "UIPanelCloseButton")
		if ok and b then b:SetPoint("TOPRIGHT", 1, 1) end
	end

	f:SetMovable(true)
	f:SetClampedToScreen(true)
	f:EnableMouse(true)
	f:RegisterForDrag("LeftButton")
	f:SetScript("OnDragStart", f.StartMoving)
	f:SetScript("OnDragStop", f.StopMovingOrSizing)
	return f
end

-- ------------------------------------------------------------------
-- Layout helper: a simple top down flow inside one page.
-- ------------------------------------------------------------------

local function NewLayout(parent)
	return { parent = parent, y = 4 }
end

local function Place(layout, region, height, indent)
	region:ClearAllPoints()
	region:SetPoint("TOPLEFT", layout.parent, "TOPLEFT", indent or 0, -layout.y)
	layout.y = layout.y + height
end

-- ------------------------------------------------------------------
-- Widgets
-- ------------------------------------------------------------------

local function Header(layout, label)
	local fs = layout.parent:CreateFontString(nil, "ARTWORK", "GameFontNormalLarge")
	fs:SetText(label)
	Place(layout, fs, 20)
	local line = layout.parent:CreateTexture(nil, "ARTWORK")
	line:SetColorTexture(1, 0.82, 0, 0.35)
	line:SetSize(PANE_W, 1)
	Place(layout, line, 12)
end

local function Note(layout, label, indent, lines)
	local fs = layout.parent:CreateFontString(nil, "ARTWORK", "GameFontDisableSmall")
	fs:SetWidth(PANE_W - (indent or 0))
	fs:SetJustifyH("LEFT")
	fs:SetWordWrap(true)
	fs:SetText(label)
	-- GetStringHeight can report 0 before the first layout pass, so the caller says how many
	-- lines to budget for anything that wraps.
	local height = math.max((lines or 1) * 13, fs:GetStringHeight()) + 8
	Place(layout, fs, height, indent)
	return fs
end

local function Check(layout, label, tooltip, get, set, indent, width)
	local cb
	for _, template in ipairs({ "UICheckButtonTemplate", "ChatConfigCheckButtonTemplate" }) do
		local ok, made = pcall(CreateFrame, "CheckButton", NextName("Check"), layout.parent, template)
		if ok and made then cb = made break end
	end
	if not cb then
		cb = CreateFrame("CheckButton", NextName("Check"), layout.parent)
		cb:SetNormalTexture("Interface\\Buttons\\UI-CheckBox-Up")
		cb:SetPushedTexture("Interface\\Buttons\\UI-CheckBox-Down")
		cb:SetHighlightTexture("Interface\\Buttons\\UI-CheckBox-Highlight")
		cb:SetCheckedTexture("Interface\\Buttons\\UI-CheckBox-Check")
	end
	cb:SetSize(24, 24)

	local fs = cb.Text or cb.text or (cb.GetName and _G[cb:GetName() .. "Text"])
	if not fs then
		fs = cb:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
		fs:SetPoint("LEFT", cb, "RIGHT", 2, 0)
	end
	fs:SetText(label)
	fs:SetFontObject("GameFontHighlight")

	cb:SetScript("OnClick", function(self)
		set(self:GetChecked() and true or false)
		ns.Refresh()
		ns.SyncOptions()
	end)
	Tooltip(cb, label, tooltip)

	Place(layout, cb, 26, indent)
	if width then cb.cbColumnWidth = width end
	widgets[#widgets + 1] = { refresh = function() cb:SetChecked(get() and true or false) end }
	return cb
end

local SLIDER_TEMPLATES = { "MinimalSliderTemplate", "UISliderTemplate", "OptionsSliderTemplate" }

local function Slider(layout, label, minV, maxV, step, get, set, format, tooltip, indent)
	local name = NextName("Slider")
	local holder = CreateFrame("Frame", nil, layout.parent)
	holder:SetSize(PANE_W - (indent or 0), 40)

	local caption = holder:CreateFontString(nil, "ARTWORK", "GameFontHighlight")
	caption:SetPoint("TOPLEFT", 0, 0)
	caption:SetText(label)

	local value = holder:CreateFontString(nil, "ARTWORK", "GameFontNormalSmall")
	value:SetPoint("TOPRIGHT", 0, -1)

	local slider, used
	for _, template in ipairs(SLIDER_TEMPLATES) do
		local ok, made = pcall(CreateFrame, "Slider", name, holder, template)
		if ok and made then slider, used = made, template break end
	end
	if not slider then
		slider = CreateFrame("Slider", name, holder)
		slider:SetOrientation("HORIZONTAL")
		slider:SetThumbTexture("Interface\\Buttons\\UI-SliderBar-Button-Horizontal")
		used = "bare"
	end
	report["slider template"] = used

	-- OptionsSliderTemplate brings its own captions, we draw our own.
	for _, suffix in ipairs({ "Low", "High", "Text" }) do
		local extra = _G[name .. suffix]
		if extra then extra:SetText("") extra:Hide() end
	end

	slider:SetPoint("TOPLEFT", 2, -18)
	slider:SetSize(PANE_W - (indent or 0) - 6, 18)
	slider:SetMinMaxValues(minV, maxV)
	if slider.SetValueStep then slider:SetValueStep(step) end
	if slider.SetObeyStepOnDrag then pcall(slider.SetObeyStepOnDrag, slider, true) end

	local function Label(v)
		value:SetText(format and format(v) or tostring(v))
	end

	slider:SetScript("OnValueChanged", function(self, v)
		v = math.floor(v / step + 0.5) * step
		Label(v)
		if self.cbSyncing then return end
		set(v)
		ns.Refresh()
	end)
	Tooltip(slider, label, tooltip)

	Place(layout, holder, 44, indent)
	widgets[#widgets + 1] = { refresh = function()
		local v = get()
		slider.cbSyncing = true
		slider:SetValue(v)
		slider.cbSyncing = false
		Label(v)
	end }
	return slider
end

local function OpenColorPicker(r, g, b, apply)
	local picker = ColorPickerFrame
	if not picker then return false end

	local function Current()
		if picker.GetColorRGB then
			local nr, ng, nb = picker:GetColorRGB()
			if nr then return nr, ng, nb end
		end
		return r, g, b
	end

	local info = {
		r = r, g = g, b = b, hasOpacity = false,
		swatchFunc = function() apply(Current()) end,
		cancelFunc = function(previous)
			if type(previous) == "table" then
				apply(previous.r or previous[1] or r, previous.g or previous[2] or g, previous.b or previous[3] or b)
			else
				apply(r, g, b)
			end
		end,
	}

	if picker.SetupColorPickerAndShow then
		return (pcall(picker.SetupColorPickerAndShow, picker, info))
	end

	-- Older signature: fill the frame's fields in and show it.
	picker.func = info.swatchFunc
	picker.opacityFunc = nil
	picker.cancelFunc = info.cancelFunc
	picker.hasOpacity = false
	picker.previousValues = { r = r, g = g, b = b }
	local ok = pcall(picker.SetColorRGB, picker, r, g, b)
	picker:Hide()
	picker:Show()
	return ok
end

local function Color(layout, label, get, set, tooltip, indent)
	local button = CreateFrame("Button", nil, layout.parent)
	button:SetSize(PANE_W - (indent or 0), 22)

	local swatch = button:CreateTexture(nil, "ARTWORK")
	swatch:SetSize(18, 18)
	swatch:SetPoint("LEFT", 2, 0)
	swatch:SetColorTexture(1, 1, 1)

	local border = button:CreateTexture(nil, "BACKGROUND")
	border:SetPoint("TOPLEFT", swatch, "TOPLEFT", -2, 2)
	border:SetPoint("BOTTOMRIGHT", swatch, "BOTTOMRIGHT", 2, -2)
	border:SetColorTexture(0, 0, 0, 1)

	local fs = button:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
	fs:SetPoint("LEFT", swatch, "RIGHT", 8, 0)
	fs:SetText(label)

	button:SetScript("OnClick", function()
		local c = get()
		local ok = OpenColorPicker(c[1], c[2], c[3], function(r, g, b)
			set(r, g, b)
			swatch:SetColorTexture(r, g, b)
			ns.Refresh()
		end)
		report["colour picker"] = ok and "ok" or "unavailable"
		if not ok then ns.Print("this client would not open the colour picker.") end
	end)
	Tooltip(button, label, tooltip or "Click to pick a colour.")

	Place(layout, button, 26, indent)
	widgets[#widgets + 1] = { refresh = function()
		local c = get()
		swatch:SetColorTexture(c[1], c[2], c[3])
	end }
	return button
end

-- A row of small buttons standing in for a dropdown. Options are { value = , label = }.
local function Choice(layout, label, options, get, set, tooltip, indent)
	local holder = CreateFrame("Frame", nil, layout.parent)
	holder:SetSize(PANE_W - (indent or 0), 44)

	local caption = holder:CreateFontString(nil, "ARTWORK", "GameFontHighlight")
	caption:SetPoint("TOPLEFT", 0, 0)
	caption:SetText(label)

	local buttons = {}
	local x = 0
	for index, option in ipairs(options) do
		local button
		local ok, made = pcall(CreateFrame, "Button", nil, holder, "UIPanelButtonTemplate")
		if ok and made then button = made else button = CreateFrame("Button", nil, holder) end
		button:SetHeight(21)
		if not button.GetFontString or not button:GetFontString() then
			local fs = button:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
			fs:SetAllPoints()
			button:SetFontString(fs)
			button:SetNormalTexture("Interface\\Buttons\\UI-Panel-Button-Up")
			button:SetHighlightTexture("Interface\\Buttons\\UI-Panel-Button-Highlight")
		end
		button:SetText(option.label)
		local textWidth = button:GetFontString() and button:GetFontString():GetStringWidth() or 40
		button:SetWidth(math.max(44, textWidth + 18))
		button:SetPoint("TOPLEFT", x, -20)
		x = x + button:GetWidth() + 4
		button.cbValue = option.value
		button:SetScript("OnClick", function(self)
			set(self.cbValue)
			ns.Refresh()
			ns.SyncOptions()
		end)
		Tooltip(button, label, option.tooltip or tooltip)
		buttons[index] = button
	end

	Place(layout, holder, 46, indent)
	widgets[#widgets + 1] = { refresh = function()
		local current = get()
		for _, button in ipairs(buttons) do
			if button.cbValue == current then
				if button.LockHighlight then button:LockHighlight() end
				if button.SetNormalFontObject then pcall(button.SetNormalFontObject, button, "GameFontNormalSmall") end
			else
				if button.UnlockHighlight then button:UnlockHighlight() end
				if button.SetNormalFontObject then pcall(button.SetNormalFontObject, button, "GameFontDisableSmall") end
			end
		end
	end }
	return holder
end

-- ------------------------------------------------------------------
-- Pages
-- ------------------------------------------------------------------

local function TextureOptions(list)
	local out = {}
	for _, entry in ipairs(list) do
		out[#out + 1] = { value = entry.path, label = entry.label }
	end
	return out
end

local function BuildCursorPage(parent)
	local layout = NewLayout(parent)

	Header(layout, "Blizzard cursor size")
	if ns.CursorSizeSupported() then
		Choice(layout, "Hardware cursor", {
			{ value = -1, label = "Auto" },
			{ value = 0, label = "Small" },
			{ value = 1, label = "Medium" },
			{ value = 2, label = "Large" },
		}, function()
			return ns.db.applyCursorSize and ns.db.cursorSize or -1
		end, function(value)
			ns.db.applyCursorSize = value ~= -1
			ns.db.cursorSize = value
			ns.ApplyCursorSize()
		end, "Sets the game's own cursor size. Auto leaves the setting alone.")
		Note(layout, "The game's own cursor stops at 64 pixels. For anything larger use the Big pointer tab, which draws a pointer at whatever size you like.", nil, 2)
	else
		Note(layout, "This client does not expose the cursor size setting, so the size buttons are hidden. The Big pointer tab draws its own pointer at any size and works either way.", nil, 2)
	end

	Header(layout, "All effects")
	Check(layout, "Enable Cursor Beacon", "Turns every effect and readout off in one go.",
		function() return ns.db.enabled end, function(v) ns.db.enabled = v end)
	Slider(layout, "Overall size", 50, 500, 5,
		function() return math.floor((ns.db.scale or 1) * 100 + 0.5) end,
		function(v) ns.db.scale = v / 100 end,
		function(v) return v .. "%" end, "Scales the ring, dot and trail together.")
	Slider(layout, "Overall opacity", 10, 100, 5,
		function() return math.floor((ns.db.alpha or 1) * 100 + 0.5) end,
		function(v) ns.db.alpha = v / 100 end,
		function(v) return v .. "%" end)
	Choice(layout, "Draw layer", {
		{ value = "BACKGROUND", label = "Behind" },
		{ value = "MEDIUM", label = "Middle" },
		{ value = "HIGH", label = "Above UI" },
		{ value = "TOOLTIP", label = "Topmost" },
	}, function() return ns.db.strata end, function(v) ns.db.strata = v end,
		"Where the effects sit relative to the rest of the interface.")

	Header(layout, "When to show")
	Check(layout, "Only while in combat", nil,
		function() return ns.db.combatOnly end, function(v) ns.db.combatOnly = v end)
	Check(layout, "Hide while looking around with the mouse", "Hides the effects while a mouse button is held to turn the camera.",
		function() return ns.db.hideWhileMouselooking end, function(v) ns.db.hideWhileMouselooking = v end)
	Check(layout, "Fade out when the mouse stops moving", nil,
		function() return ns.db.idleFade end, function(v) ns.db.idleFade = v end)
	Slider(layout, "Fade after", 1, 10, 1,
		function() return ns.db.idleSeconds end, function(v) ns.db.idleSeconds = v end,
		function(v) return v .. "s" end, nil, 24)
end

local function BuildPointerPage(parent)
	local layout = NewLayout(parent)

	Header(layout, "Drawn pointer")
	if not ns.hasPointerArt then
		Note(layout, "This client does not carry the pointer art this feature copies, so it is switched off. Everything else in the addon still works.", nil, 2)
		return
	end
	Note(layout, "Draws a copy of the pointer at any size you like, which is how the cursor gets bigger than the 64 pixel limit on the game's own setting. The game always draws its real cursor on top of this; the Hide cursor tab is the only way around that.", nil, 4)
	Check(layout, "Draw a larger pointer", "Adds a scalable pointer under the real one.",
		function() return ns.db.pointer.enabled end, function(v) ns.db.pointer.enabled = v end)
	Choice(layout, "Shape", TextureOptions(ns.pointerArt),
		function() return ns.db.pointer.texture end, function(v) ns.db.pointer.texture = v end, nil, 24)
	Slider(layout, "Size", 32, 512, 4,
		function() return ns.db.pointer.size end, function(v) ns.db.pointer.size = v end,
		function(v) return v .. "px" end, "The game's own cursor is 32, 48 or 64 pixels. This goes to 512.", 24)
	Slider(layout, "Opacity", 10, 100, 5,
		function() return math.floor(ns.db.pointer.alpha * 100 + 0.5) end,
		function(v) ns.db.pointer.alpha = v / 100 end,
		function(v) return v .. "%" end, nil, 24)
	Color(layout, "Pointer colour", function() return ns.db.pointer.color end,
		function(r, g, b) ns.db.pointer.color = { r, g, b } end,
		"Tints the pointer. White leaves the art as the game drew it.", 24)
	Check(layout, "Dark outline behind it", "A shadow copy that keeps the pointer readable over bright ground.",
		function() return ns.db.pointer.shadow end, function(v) ns.db.pointer.shadow = v end, 24)
	Slider(layout, "Nudge sideways", -40, 40, 1,
		function() return ns.db.pointer.offsetX end, function(v) ns.db.pointer.offsetX = v end,
		function(v) return v .. "px" end, "Fine tunes where the drawn tip sits against the real one.", 24)
	Slider(layout, "Nudge up and down", -40, 40, 1,
		function() return ns.db.pointer.offsetY end, function(v) ns.db.pointer.offsetY = v end,
		function(v) return v .. "px" end, nil, 24)
end

local function BuildHidePage(parent)
	local layout = NewLayout(parent)

	Header(layout, "Hiding the game's cursor")
	Note(layout, "Nothing an addon draws can sit above the game's own cursor: it is put on screen after the whole interface, and no draw layer reaches past it. The only lever the game gives an addon is to ask for the cursor art to be dropped entirely, which is what this does.", nil, 4)
	Check(layout, "Hide the game's own cursor", "Asks the game to drop the cursor art so only the drawn pointer is left.",
		function() return ns.db.pointer.hideReal end,
		function(v)
			ns.db.pointer.hideReal = v
			-- Hiding the real cursor with nothing drawn in its place would leave nothing at all.
			if v then ns.db.pointer.enabled = true end
		end)
	Note(layout, "Two limits come with it, both from the client rather than from this addon. Out in the open world the game locks the cursor to whatever you are pointing at and ignores the request, so the real cursor still shows there. And anything you pick up rides on the cursor, so hiding pauses while you are carrying an item.", 24, 5)

	Header(layout, "Hardware cursor")
	if ns.HardwareCursorSupported() then
		Check(layout, "Turn the hardware cursor off", "The same box as Hardware Cursor in the game's video options.",
			function() return ns.db.pointer.softwareCursor end,
			function(v)
				ns.db.pointer.softwareCursor = v
				ns.ApplyHardwareCursor(true)
			end)
		Note(layout, "With the hardware cursor off the game draws the cursor itself instead of handing it to Windows, which is what lets it be hidden in more places. The cost is a little cursor lag, and it may want a restart to take hold.", 24, 4)
	else
		Note(layout, "This client does not expose the hardware cursor setting. If the hiding above does not take, look for a Hardware Cursor box in the game's video options and turn it off by hand.", nil, 3)
	end
end

local function BuildRingPage(parent)
	local layout = NewLayout(parent)

	Header(layout, "Ring")
	Check(layout, "Show the ring", nil,
		function() return ns.db.ring.enabled end, function(v) ns.db.ring.enabled = v end)
	Choice(layout, "Shape", TextureOptions(ns.UsableTextures(ns.RING_TEXTURES, "ring")),
		function() return ns.db.ring.texture end, function(v) ns.db.ring.texture = v end, nil, 24)
	Slider(layout, "Size", 8, 320, 2,
		function() return ns.db.ring.size end, function(v) ns.db.ring.size = v end,
		function(v) return v .. "px" end, nil, 24)
	Slider(layout, "Opacity", 5, 100, 5,
		function() return math.floor(ns.db.ring.alpha * 100 + 0.5) end,
		function(v) ns.db.ring.alpha = v / 100 end,
		function(v) return v .. "%" end, nil, 24)
	Color(layout, "Ring colour", function() return ns.db.ring.color end,
		function(r, g, b) ns.db.ring.color = { r, g, b } end, nil, 24)
	Slider(layout, "Spin", -6, 6, 1,
		function() return ns.db.ring.spin end, function(v) ns.db.ring.spin = v end,
		function(v) return v == 0 and "off" or (v .. " rad/s") end,
		"Rotates the ring. Negative values spin the other way.", 24)
	Check(layout, "Grow over units and buttons", "The ring swells when the cursor is over something you can click.",
		function() return ns.db.ring.hoverGrow end, function(v) ns.db.ring.hoverGrow = v end, 24)
	Slider(layout, "Grown size", 105, 250, 5,
		function() return math.floor(ns.db.ring.hoverScale * 100 + 0.5) end,
		function(v) ns.db.ring.hoverScale = v / 100 end,
		function(v) return v .. "%" end, nil, 24)

	Header(layout, "Centre dot")
	Check(layout, "Show a dot at the exact cursor point", nil,
		function() return ns.db.dot.enabled end, function(v) ns.db.dot.enabled = v end)
	Choice(layout, "Shape", TextureOptions(ns.UsableTextures(ns.DOT_TEXTURES, "dot")),
		function() return ns.db.dot.texture end, function(v) ns.db.dot.texture = v end, nil, 24)
	Slider(layout, "Size", 2, 120, 1,
		function() return ns.db.dot.size end, function(v) ns.db.dot.size = v end,
		function(v) return v .. "px" end, nil, 24)
	Color(layout, "Dot colour", function() return ns.db.dot.color end,
		function(r, g, b) ns.db.dot.color = { r, g, b } end, nil, 24)
end

local function BuildTrailPage(parent)
	local layout = NewLayout(parent)

	Header(layout, "Trail")
	Check(layout, "Show a trail behind the cursor", nil,
		function() return ns.db.trail.enabled end, function(v) ns.db.trail.enabled = v end)
	Slider(layout, "Segments", 1, 20, 1,
		function() return ns.db.trail.count end, function(v) ns.db.trail.count = v end,
		nil, "How many pieces follow the cursor.", 24)
	Slider(layout, "Segment size", 4, 160, 1,
		function() return ns.db.trail.size end, function(v) ns.db.trail.size = v end,
		function(v) return v .. "px" end, nil, 24)
	Slider(layout, "Tightness", 5, 95, 5,
		function() return math.floor(ns.db.trail.spacing * 100 + 0.5) end,
		function(v) ns.db.trail.spacing = v / 100 end,
		function(v) return v .. "%" end,
		"High values keep the trail close to the cursor, low values let it stretch out.", 24)
	Slider(layout, "Opacity", 5, 100, 5,
		function() return math.floor(ns.db.trail.alpha * 100 + 0.5) end,
		function(v) ns.db.trail.alpha = v / 100 end,
		function(v) return v .. "%" end, nil, 24)
	Check(layout, "Fade along the trail", "Each segment is fainter than the one before it.",
		function() return ns.db.trail.fade end, function(v) ns.db.trail.fade = v end, 24)
	Color(layout, "Trail colour", function() return ns.db.trail.color end,
		function(r, g, b) ns.db.trail.color = { r, g, b } end, nil, 24)
	Choice(layout, "Shape", TextureOptions(ns.UsableTextures(ns.DOT_TEXTURES, "dot")),
		function() return ns.db.trail.texture end, function(v) ns.db.trail.texture = v end, nil, 24)

	Header(layout, "Activity ring")
	Choice(layout, "Show", {
		{ value = "off", label = "Off" },
		{ value = "gcd", label = "Cooldown" },
		{ value = "cast", label = "Casting" },
		{ value = "both", label = "Both" },
	}, function() return ns.db.activity.mode end, function(v) ns.db.activity.mode = v end,
		"Sweeps a wedge around the cursor for the global cooldown, for what you are casting, or for both.")
	Slider(layout, "Size", 16, 400, 2,
		function() return ns.db.activity.size end, function(v) ns.db.activity.size = v end,
		function(v) return v .. "px" end, nil, 24)
	Slider(layout, "Opacity", 5, 100, 5,
		function() return math.floor(ns.db.activity.alpha * 100 + 0.5) end,
		function(v) ns.db.activity.alpha = v / 100 end,
		function(v) return v .. "%" end, nil, 24)
	Color(layout, "Sweep colour", function() return ns.db.activity.color end,
		function(r, g, b) ns.db.activity.color = { r, g, b } end, nil, 24)
end

local function BuildInfoPage(parent)
	local layout = NewLayout(parent)

	Header(layout, "Cursor readout")
	Check(layout, "Show information next to the cursor", nil,
		function() return ns.db.info.enabled end, function(v) ns.db.info.enabled = v end)
	Check(layout, "Only while in combat", nil,
		function() return ns.db.info.combatOnly end, function(v) ns.db.info.combatOnly = v end, 24)
	Check(layout, "Dark backing behind the text", nil,
		function() return ns.db.info.background end, function(v) ns.db.info.background = v end, 24)
	Slider(layout, "Text size", 8, 24, 1,
		function() return ns.db.info.fontSize end, function(v) ns.db.info.fontSize = v end,
		nil, nil, 24)
	Slider(layout, "Sideways offset", -200, 200, 2,
		function() return ns.db.info.offsetX end, function(v) ns.db.info.offsetX = v end,
		function(v) return v .. "px" end, nil, 24)
	Slider(layout, "Vertical offset", -200, 200, 2,
		function() return ns.db.info.offsetY end, function(v) ns.db.info.offsetY = v end,
		function(v) return v .. "px" end, nil, 24)

	Header(layout, "What to show")
	-- Two columns of checkboxes so the list stays on one screen.
	local startY = layout.y
	local half = math.ceil(#ns.INFO_FIELDS / 2)
	for index, field in ipairs(ns.INFO_FIELDS) do
		local key = field.key
		if index == half + 1 then layout.y = startY end
		Check(layout, field.label, nil,
			function() return ns.db.info.fields[key] end,
			function(v) ns.db.info.fields[key] = v end,
			index > half and (PANE_W / 2) or 0)
	end
end

local function BuildAboutPage(parent)
	local layout = NewLayout(parent)

	Header(layout, "Cursor Beacon " .. ns.version)
	Note(layout, "Adds a ring, a dot and a trail that follow your cursor, an optional sweep for the global cooldown or your current cast, and a small readout beside the pointer. It can also set the game's own cursor size.", nil, 3)
	Note(layout, "Chat commands:")
	Note(layout, "/cursor opens this window.", 12)
	Note(layout, "/cursor on and /cursor off toggle every effect.", 12)
	Note(layout, "/cursor size auto, 1, 2 or 3 sets the Blizzard cursor size.", 12)
	Note(layout, "/cursor reset restores the defaults.", 12)
	Note(layout, "/cursor debug prints what this client supports, which is worth pasting into a bug report.", 12, 2)

	local reset
	local ok, made = pcall(CreateFrame, "Button", nil, parent, "UIPanelButtonTemplate")
	reset = (ok and made) or CreateFrame("Button", nil, parent)
	reset:SetSize(160, 24)
	reset:SetText("Reset to defaults")
	reset:SetScript("OnClick", function() ns.ResetToDefaults() end)
	layout.y = layout.y + 12
	Place(layout, reset, 30)

	local debugButton
	local ok2, made2 = pcall(CreateFrame, "Button", nil, parent, "UIPanelButtonTemplate")
	debugButton = (ok2 and made2) or CreateFrame("Button", nil, parent)
	debugButton:SetSize(160, 24)
	debugButton:SetText("Print debug report")
	debugButton:SetScript("OnClick", function() SlashCmdList["CURSORBEACON"]("debug") end)
	Place(layout, debugButton, 30)
end

local PAGES = {
	{ key = "cursor", label = "Cursor", build = BuildCursorPage },
	{ key = "pointer", label = "Big pointer", build = BuildPointerPage },
	{ key = "hide", label = "Hide cursor", build = BuildHidePage },
	{ key = "ring", label = "Ring and dot", build = BuildRingPage },
	{ key = "trail", label = "Trail and sweep", build = BuildTrailPage },
	{ key = "info", label = "Information", build = BuildInfoPage },
	{ key = "about", label = "About", build = BuildAboutPage },
}

local function ShowPage(key)
	currentPage = key
	for _, entry in ipairs(PAGES) do
		if pages[entry.key] then pages[entry.key]:SetShown(entry.key == key) end
		local button = navButtons[entry.key]
		if button then
			if entry.key == key then
				if button.LockHighlight then button:LockHighlight() end
			else
				if button.UnlockHighlight then button:UnlockHighlight() end
			end
		end
	end
	ns.SyncOptions()
end

-- ------------------------------------------------------------------
-- The shared content block
-- ------------------------------------------------------------------

local function BuildContent()
	if content then return end

	content = CreateFrame("Frame", "CursorBeaconOptions", UIParent)
	content:SetSize(CONTENT_W, CONTENT_H)

	local title = content:CreateFontString(nil, "ARTWORK", "GameFontNormalLarge")
	title:SetPoint("TOPLEFT", 0, 0)
	title:SetText("Cursor Beacon")

	local subtitle = content:CreateFontString(nil, "ARTWORK", "GameFontDisableSmall")
	subtitle:SetPoint("TOPLEFT", title, "BOTTOMLEFT", 0, -2)
	subtitle:SetText("Type /cursor to open this at any time.")

	-- Navigation column
	local nav = CreateFrame("Frame", nil, content)
	nav:SetPoint("TOPLEFT", 0, -44)
	nav:SetSize(NAV_W, CONTENT_H - 44)

	local navY = 0
	for _, entry in ipairs(PAGES) do
		local button
		local ok, made = pcall(CreateFrame, "Button", nil, nav, "UIPanelButtonTemplate")
		button = (ok and made) or CreateFrame("Button", nil, nav)
		button:SetSize(NAV_W - 8, 24)
		button:SetPoint("TOPLEFT", 0, -navY)
		button:SetText(entry.label)
		button:SetScript("OnClick", function() ShowPage(entry.key) end)
		navButtons[entry.key] = button
		navY = navY + 28
	end

	local divider = content:CreateTexture(nil, "ARTWORK")
	divider:SetColorTexture(1, 1, 1, 0.12)
	divider:SetPoint("TOPLEFT", NAV_W, -44)
	divider:SetSize(1, CONTENT_H - 54)

	-- Pages
	for _, entry in ipairs(PAGES) do
		local frame = CreateFrame("Frame", nil, content)
		frame:SetPoint("TOPLEFT", PANE_X, -44)
		frame:SetSize(PANE_W, CONTENT_H - 50)
		frame:Hide()
		pages[entry.key] = frame
		local ok, err = pcall(entry.build, frame)
		report["page " .. entry.key] = ok and "ok" or ("failed: " .. tostring(err))
	end

	ShowPage("cursor")
	-- Stays out of sight until a host (the window or the options page) asks for it.
	content:Hide()
end

function ns.SyncOptions()
	if not content or not ns.db then return end
	for _, widget in ipairs(widgets) do pcall(widget.refresh) end
end

local function HostContent(host, x, y, scale)
	content:SetParent(host)
	content:ClearAllPoints()
	content:SetPoint("TOPLEFT", host, "TOPLEFT", x, y)
	content:SetScale(scale or 1)
	content:Show()
end

-- ------------------------------------------------------------------
-- Standalone window
-- ------------------------------------------------------------------

local function BuildWindow()
	if window then return end
	window = CreatePanel("CursorBeaconWindow")
	window:SetSize(CONTENT_W + 32, CONTENT_H + 52)
	window:SetPoint("CENTER")
	window:SetFrameStrata("HIGH")
	window:Hide()
	window.cbTitle:SetText("Cursor Beacon")

	window:SetScript("OnShow", function(self)
		HostContent(self, 18, -36, 1)
		ns.SyncOptions()
	end)

	tinsert(UISpecialFrames, "CursorBeaconWindow")
end

function ns.ToggleOptions()
	BuildWindow()
	if page and page:IsShown() then
		ns.Print("the options are open in the game menu, under Esc > Options > AddOns > Cursor Beacon.")
		return
	end
	if window:IsShown() then
		window:Hide()
	else
		window:Show()
		if window.Raise then window:Raise() end
	end
end

-- ------------------------------------------------------------------
-- The entry in Esc > Options > AddOns
-- ------------------------------------------------------------------

local function BuildOptionsCategory()
	if not (Settings and Settings.RegisterCanvasLayoutCategory and Settings.RegisterAddOnCategory) then
		report["options category"] = "Settings API missing, use /cursor"
		return
	end

	page = CreateFrame("Frame")
	page:Hide()
	page.name = "Cursor Beacon"
	-- The canvas mixin looks for these; ours have nothing to do because every control writes
	-- its value straight into the saved variables when it is used.
	page.OnCommit = function() end
	page.OnDefault = function() ns.ResetToDefaults() end
	page.OnRefresh = function() ns.SyncOptions() end

	local function Fit()
		local w, h = page:GetWidth() or 0, page:GetHeight() or 0
		if w <= 0 or h <= 0 then return end
		local scale = math.min(1, (w - 24) / CONTENT_W, (h - 24) / CONTENT_H)
		HostContent(page, 12, -12, scale)
	end

	page:SetScript("OnShow", function()
		if window and window:IsShown() then window:Hide() end
		Fit()
		ns.SyncOptions()
	end)
	page:SetScript("OnSizeChanged", function() if page:IsShown() then Fit() end end)

	local category = Settings.RegisterCanvasLayoutCategory(page, "Cursor Beacon")
	Settings.RegisterAddOnCategory(category)
	ns.optionsCategory = category
	report["options category"] = "ok (canvas page)"
end

function ns.SetupOptions()
	BuildContent()
	BuildWindow()
	local ok, err = pcall(BuildOptionsCategory)
	if not ok then report["options category"] = "failed: " .. tostring(err) end
	ns.SyncOptions()
end
