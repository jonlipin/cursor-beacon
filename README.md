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
