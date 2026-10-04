## 1.8.0

Added:

- **Over thirty spell effects to choose from**, up from eleven, grouped by school. Shadow: Shadow
  Bolt, Death Coil, Haunt, Soul Shatter, Shadow Missile, Shadow Fireball. Fire: Fireball,
  Pyroblast, Firebolt, Blue Fireball, Blue Pyroblast, Fel Fireball, Fel Pyroblast, Meteor. Frost
  and water: Frostbolt, Ice, Ice Lance, Waterbolt. Arcane: Arcane Missiles, Arcane Barrage, Arcane
  Shot, Spellsteal. Nature: Wrath, Lightning, Lightning Streak, Poison Shot. Holy: Holy, Penance.
  And Blood Bolt and Snowball. Only the ones the client actually has are offered.
- **Particle density.** A new slider layers up to five copies of the missile on the same spot.
  Each copy lets go its own sparks, and spell sparks add their light together, so more copies give
  a thicker, brighter trail. The game has no setting for how many particles a spell lets go, which
  is why it is done this way. Each copy is one more model for the game to draw.

Changed:

- Nothing is loaded at login any more to find out which spells the client has. The effect is off
  by default, so that check now waits until the effect is first switched on or its options tab is
  first opened, and runs once.
