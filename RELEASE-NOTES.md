## 1.6.2

Fixed:

- **The minimap button did not open the options.** It only worked if the game's options window was
  already open, put there by something else, though closing always worked. Asking the game to go to
  a category navigates to it but does not open the window, and with the window shut that quietly
  does nothing and reports no error, so the addon believed it had worked and never tried anything
  else. The window is now opened first and then navigated, the category is asked for by its id
  rather than by itself, and each route is judged on whether the page actually ended up on screen
  instead of on whether the call raised an error. Four routes are tried in turn before falling back
  to the addon's own window, and `/cursor debug` names the one that worked.
- A failed attempt no longer leaves the game's options window hanging open on some other page.
