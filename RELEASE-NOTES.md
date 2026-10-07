## 1.9.2

Fixed:

- **The activity ring drew a black square behind itself.** The game's own ring pictures are glows
  on black, made to be added on top of what is behind them, and the sweep can only lay a picture
  over the screen, so the black showed. The addon now ships its own ring: plain white with a clear
  middle and clear corners, so the sweep colour tints it to any colour you like and nothing is
  drawn around it. It no longer follows the cursor ring's shape, which 1.9.1 tried; none of those
  shapes suit a sweep.

**After updating, quit the game and start it again** rather than just reloading the interface. The
ring is a new file, and the game only notices new files when it starts.
