# Changelog

## 1.1.0

Larger cursor options.

Added:

- Big pointer tab. Draws a copy of the game's pointer art at any size from 32 to 512 pixels, which
  is how the cursor gets past the 64 pixel ceiling on the game's own cursor size setting. Choose
  the shape (arrow, cast, hand, attack, grab, quest or crosshair), the size, the colour tint and
  the opacity, with an optional dark outline behind it and two nudge sliders for lining the drawn
  tip up with the real one. Each shape knows where its own hotspot is, so an arrow hangs its tip on
  the cursor while the crosshair centres on it.
- The pointer size is an absolute pixel size, so the overall size slider does not drag it around.

Changed:

- Wider size ranges everywhere: overall size now reaches 500 percent (was 300), the ring 320 pixels
  (was 128), the centre dot 120 (was 40), trail segments 160 (was 64) and the activity sweep 400
  (was 160).
- The Cursor tab now says where the game's own 64 pixel limit is and points at the Big pointer tab.

Fixed:

- `/cursor debug` counted its own fallback art, so a client with none of a shape set reported
  "1 of 7 available" instead of "0 of 7".

## 1.0.0

First release.

Added:

- Blizzard cursor size control (Auto, Small, Medium, Large) through the accessibility cursor
  setting, with Auto leaving the setting untouched.
- Cursor ring with a choice of shapes, size, opacity, colour, optional spin, and optional growth
  when the cursor is over a unit or a button.
- Centre dot with its own shape, size and colour.
- Cursor trail of up to twenty segments, with tightness, taper, fade and colour. The smoothing is
  frame rate independent.
- Activity sweep around the cursor for the global cooldown, the current cast or channel, or both.
- Cursor readout beside the pointer: target name and level, target health, your health, your power,
  a combat warning, map coordinates, frame rate, latency and the clock, with offset, text size and
  an optional dark backing.
- Shared controls for size, opacity and draw layer, plus combat only, hide while turning the camera
  with the mouse, and fade out when the mouse stops.
- Options in Esc > Options > AddOns > Cursor Beacon and in a standalone window on `/cursor`. Both
  share one set of controls.
- `/cursor`, `/cursor on`, `/cursor off`, `/cursor size`, `/cursor reset` and `/cursor debug`.
- Account wide mirror of each character's settings, adopted when the client hands back a blank
  saved variables table on login.
- Self reporting: every optional API and template is probed once and listed by `/cursor debug`.
