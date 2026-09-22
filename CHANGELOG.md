# Changelog

## 1.3.0

The drawn art keeps up with the cursor.

The game puts its own cursor where the mouse is right now. Anything an addon draws is positioned
during the frame and only reaches the screen on the next one, so it sits a frame behind and the gap
opens up the faster you move.

Added:

- "Keep up with the cursor" on the Cursor tab. It pushes the drawn art forward along the direction
  you are moving by about one frame of travel, which cancels that delay. On at 100 percent by
  default; raise it if it still trails, lower it if it overshoots, set it to zero for the old
  behaviour. A cap keeps a warp across the screen from flinging the art off.

Changed:

- The ring, the dot, the pointer, its shadow and the activity sweep now ride one small frame that
  moves with the cursor, instead of each being re-anchored on its own every frame. The draw loop
  went from about fourteen layout changes a frame to one plus one per live trail segment, and the
  pieces can no longer drift apart from each other on a busy frame.
- Sizes and opacities are only written when they actually change, rather than every frame.
- The options window is taller so the Cursor tab fits its new control.

## 1.2.0

Getting the drawn pointer on top of the game's own cursor.

The game puts its cursor on screen after the whole interface, and no draw layer an addon can reach
goes past it, so there is no way to draw over it. The only lever the API gives an addon is to ask
for the cursor art to be dropped. That is what this release adds.

Added:

- Hide cursor tab, with a switch that hides the game's own cursor so only the drawn pointer is
  left. Turning it on turns the drawn pointer on as well, so there is always something to see.
- A switch for the hardware cursor, the same setting as the Hardware Cursor box in the game's video
  options. With it off the game draws the cursor itself, which is what lets it be hidden in more
  places, at the cost of a little cursor lag.
- Both tabs say plainly where the limits are: out in the open world the game locks the cursor to
  whatever you are pointing at and ignores the request, so the real cursor still shows there.

Safeguards:

- Hiding pauses while you are carrying something on the cursor, so you can still see what you
  picked up.
- The cursor comes back whenever the drawn pointer is not showing, when the option is switched off,
  and at logout.
- A client that refuses the request switches the option off rather than leaving you without a
  cursor, and `/cursor debug` records what happened.

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
