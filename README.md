# Cursor Beacon

Makes the mouse cursor easy to find. Cursor Beacon can resize the game's own cursor, draw a ring,
a dot and a trail that follow it, sweep a wedge around it for the global cooldown or your current
cast, and show a small readout beside the pointer.

Everything is configured from a Blizzard style options page at
**Esc > Options > AddOns > Cursor Beacon**, or from the same controls in a standalone window with
`/cursor`.

## What it does

**Cursor size.** Sets the game's accessibility cursor size (32, 48 or 64 pixels) so the hardware
pointer itself gets bigger. Leave it on Auto and the addon does not touch the setting at all.

**Big pointer.** The game's own setting stops at 64 pixels. For anything larger, Cursor Beacon can
draw a copy of the pointer at any size from 32 to 512 pixels, in a choice of the game's own cursor
shapes, with a colour tint, an optional dark outline and two nudge sliders. Each shape knows where
its hotspot is, so an arrow hangs its tip on the cursor while the crosshair centres on it.

**Hiding the real cursor.** The game puts its own cursor on screen after the whole interface, and
no draw layer an addon can reach goes past it, so nothing can be drawn over it. The only lever the
API gives an addon is to ask for the cursor art to be dropped, and the Hide cursor tab does that.
Two limits come with it, both from the client: out in the open world the game locks the cursor to
whatever you are pointing at and ignores the request, so the real cursor still shows there, and
hiding pauses while you are carrying something so you can see what you picked up. The same tab can
turn off the hardware cursor (the Hardware Cursor box in the game's video options), which makes the
game draw the cursor itself and lets it be hidden in more places, at the cost of a little lag.

**Ring.** A coloured ring around the cursor, with a choice of shapes, size, opacity, colour and an
optional slow spin. It can swell when the cursor is over a unit or a button, which makes clickable
things obvious at a glance.

**Centre dot.** A small mark at the exact cursor point, with its own shape, size and colour.

**Trail.** Up to twenty segments that chase the cursor. Tightness controls how closely they follow,
and the trail can taper and fade along its length. The smoothing is corrected for frame time, so it
looks the same at 30 frames a second as at 144.

**Activity sweep.** A cooldown style wedge around the cursor showing the global cooldown, the spell
you are casting or channelling, or both.

**Cursor readout.** A short block of text beside the pointer. Pick any of: target name and level,
target health, your health, your power, a combat warning, map coordinates, frame rate, latency and
the clock.

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
| `/cursor` | Opens the options window |
| `/cursor on`, `/cursor off` | Toggles every effect |
| `/cursor size auto\|1\|2\|3` | Sets the Blizzard cursor size |
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
not create Settings proxy settings and never opens the Settings panel from addon code, because both
of those taint Blizzard code paths on this client.
