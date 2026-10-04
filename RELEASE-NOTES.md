## 1.7.0

Added:

- **Spell effect tab: a real 3D spell missile that follows the cursor.** Pick Shadow Bolt, Arcane
  Missiles, Fireball, Frostbolt, Ice, Wrath, Holy, Lightning or Shadow Fireball, and the game draws
  that spell's own missile model at the cursor. It leaves its own trail, because the missile's
  ribbon and sparks stay where they were let go as it moves, the same way the spell streaks across
  the world when it is cast. Size, opacity, and an option to point the missile the way the cursor
  is moving. It follows the same rules as everything else: combat only, hiding while you turn the
  camera, fading when the mouse stops, and the Keep up slider.
- The effect lines up with the cursor exactly, at any resolution and UI scale, and the same for
  every spell. Older cursor addons that draw spell models do it with a number tuned by hand for
  each model and each screen size; this one asks the game where points land on screen and works
  the mapping out from that, measuring again whenever the screen or the UI scale changes.
- Only the spells this client actually has are offered. `/cursor debug` lists how many it
  accepted, how the 3D scene was set up and what the measurement found.

Changed:

- A row of choice buttons in the options now wraps onto another line when it runs out of room,
  instead of running off the side of the page.
