## 1.9.1

Fixed:

- **The activity ring was a solid square block, not a ring.** The sweep reveals its picture like a
  clock hand, so the picture decides its shape, and it had been given a plain white square. That
  drew a square pie that filled with each cast, with a jagged edge in big steps because the square
  was only 8 pixels across, stretched. It now uses the same shape as the cursor ring (a ring, by
  default), so it is a ring that fills round the cursor, with a smooth edge. Pick a different
  shape on the Ring and dot tab and the activity ring follows it.
