# Changelog

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
