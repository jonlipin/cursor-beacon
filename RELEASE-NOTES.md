## 1.11.0 - 2026-10-10

Added:

- **A Look tab with a window style**: Automatic, Blizzard or Dark. Automatic uses EllesmereUI's look
  when it is running and Blizzard's otherwise. Dark is a flat dark style built in and needs no
  other addon. A line under the choice says which style is drawn now and what a reload would
  change, and a Dark background opacity slider sets how much of the world shows through it,
  grayed out unless Dark is chosen. Switching from Blizzard to a drawn style happens at once;
  leaving a drawn style takes a reload, and the addon offers one.
- The style applies to the addon's own window, the one `/cursor window` opens: its backdrop, title
  bar and close button. The controls inside keep the game's look, because they are the same ones
  the game's options window shows. The minimap button and everything drawn at the cursor stay as
  they are.
- **EllesmereUI support**: under its look the window follows EllesmereUI's style and accent color.
- `/cursor style auto`, `blizzard` or `dark` sets the window style from chat, or steps to the next
  one on its own.

Fixed:

- The close button on the addon's own window works in combat. It used to be refused with
  "Interface action blocked".
- The minimap button stays where a minimap button collector, such as EllesmereUI's, puts it,
  instead of jumping back to the rim of the map.

Changed:

- American spelling throughout: the Color, Pointer color, Ring color, Dot color and Trail color
  settings, the Center dot section, and the rest of the text you read.
