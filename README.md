# Cursor Beacon

Makes the mouse cursor easy to find. Cursor Beacon can resize the game's own cursor, draw a ring,
a dot and a trail that follow it, sweep a wedge around it for the global cooldown or your current
cast, and show a small readout beside the pointer.

Everything is configured from a Blizzard style options page at
**Esc > Options > AddOns > Cursor Beacon**. The minimap button and `/cursor` both open it there.

The minimap button opens the options on a left click, turns every effect on and off on a right
click, and can be dragged around the rim. Turn it off with "Show a minimap button" on the Cursor
tab or with `/cursor minimap`. If a client will not open its own options window, the addon falls
back to a window of its own, which `/cursor window` also opens on demand.

## What it does

**Cursor size.** Sets the game's accessibility cursor size (32, 48 or 64 pixels) so the hardware
pointer itself gets bigger. Leave it on Auto and the addon does not touch the setting at all.

**Big pointer.** The game's own setting stops at 64 pixels. For anything larger, Cursor Beacon can
draw a copy of the pointer at any size from 32 to 512 pixels, in a choice of the game's own cursor
shapes, with a colour tint, an optional dark outline and two nudge sliders. Each shape knows where
its hotspot is, so an arrow hangs its tip on the cursor while the crosshair centres on it.

**The real cursor is always on top, and that cannot be changed.** The game puts its own cursor on
screen after the whole interface is drawn, so there is no layer above it for an addon to draw into
and no draw layer setting that reaches it. Hiding it does not work either: this client refuses any
cursor art that is not one of its own and paints a black square instead, and replacing cursor art
has been blocked since Cataclysm. What does help is on the Real cursor tab: set the game's cursor
to its smallest and the drawn pointer large, and the small arrow sits inside the big one's
silhouette near the tip rather than beside it.

**Ring.** A coloured ring around the cursor, with a choice of shapes, size, opacity, colour and an
optional slow spin. It can swell when the cursor is over a unit or a button, which makes clickable
things obvious at a glance.

**Centre dot.** A small mark at the exact cursor point, with its own shape, size and colour.

**Trail.** Up to twenty segments that chase the cursor. Tightness controls how closely they follow,
and the trail can taper and fade along its length. The smoothing is corrected for frame time, so it
looks the same at 30 frames a second as at 144.

**Activity sweep.** A cooldown style wedge around the cursor showing the global cooldown, the spell
you are casting or channelling, or both.

**Cursor readout.** A short block of text beside the pointer: target name and level, a combat
warning, map coordinates, frame rate, latency and the clock. Target health, your health and your
power come as small bars under the text, because this client hands those values over as something
an addon may draw but may not read. A bar takes the value exactly as the game gives it, so it works
either way; where a client does allow reading, the bar also carries a percentage.

**Keeping up.** The game puts its own cursor where the mouse is right now, while anything an addon
draws is positioned during the frame and only reaches the screen on the next one, so it trails
behind while you move. "Keep up with the cursor" pushes the drawn art forward along the direction of
travel by about one frame of movement to close that gap. It is on by default.

**When to show.** Any of it can be limited to combat, hidden while you hold a mouse button to turn
the camera, and faded out when the mouse stops moving. There is a shared size, opacity and draw
layer for everything.

## Commands

| Command | What it does |
| --- | --- |
| `/cursor` | Opens the options in the game menu |
| `/cursor window` | Opens them in a window of their own instead |
| `/cursor on`, `/cursor off` | Toggles every effect |
| `/cursor size auto\|1\|2\|3` | Sets the Blizzard cursor size |
| `/cursor minimap` | Shows or hides the minimap button |
| `/cursor test` | Runs the activity sweep for four seconds |
| `/cursor reset` | Restores the defaults |
| `/cursor debug` | Prints what resolved on this client |

`/cursorbeacon` works anywhere `/cursor` does.

## Notes for this client

The Forever beta client sometimes hands an addon a blank settings table on login even when a good
file is on disk. Cursor Beacon keeps an account wide mirror of each character's settings and adopts
it when the character's own table comes back empty, so a login does not wipe your setup.

Nothing here is guaranteed to exist on every build, so every optional piece is probed once and the
result is recorded. `/cursor debug` prints that list: which shapes resolved, whether the cursor size
setting exists, whether the cooldown sweep could be built and which slider art was used. Paste that
into any bug report.

The options page is registered as a canvas category and holds only the addon's own widgets. It does
not create Settings proxy settings, because those taint Blizzard code paths on this client. Asking
the game to open its options window is a separate matter: the minimap button and `/cursor` do that,
and if it ever causes trouble, `/cursor window` opens the addon's own window instead and touches
nothing of the game's.
