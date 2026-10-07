## 1.8.1

Fixed:

- **The activity sweep showed as a small dot that grew over a cast, whatever its size was set
  to.** It is meant to be a wedge sweeping round the cursor. The widget it is built on comes from a
  game template that pins itself to every edge of whatever holds it, and since 1.3.0 what holds it
  has been a one pixel frame at the cursor. So the sweep was one pixel's worth of frame and its
  size setting did nothing; early in a cast only a sliver of that was filled, and by the end most
  of it, which looked like a dot growing. It now drops those inherited edges and takes the size it
  is given.
- If you turned the sweep's size up trying to make it bigger, it will now really be that size.
  The default is 56 pixels.
