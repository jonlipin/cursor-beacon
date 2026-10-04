## 1.7.1

Fixed:

- **The spell effect would not go small enough.** Its size slider now reaches 5%, down from 20%,
  and in steps of 1. More importantly, the whole effect now shrinks, not just the missile. Size
  used to scale the missile model, but a spell's sparks and ribbon keep their own size when the
  model is scaled, so a small missile still dragged a full sized trail behind it. Size now moves
  the game's camera nearer or further instead, which shrinks or grows everything in the effect
  evenly. The effect still lines up exactly with the cursor at every size, since it is measured
  again whenever the size changes.
