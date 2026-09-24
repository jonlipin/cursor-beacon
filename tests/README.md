# Offline harness

`cursortest.js` runs the addon's Lua outside the game. It stubs the parts of the WoW API the addon
touches, loads the four Lua files, and walks the main paths: the saved variables, the draw loop,
the readout, the options, the minimap button and the slash commands.

It exists because this addon is developed against a client that cannot easily be scripted, and
because several of its bugs were the kind that show up as "nothing happened" in game rather than as
an error. Every one of those is now a check here.

## Running it

Needs Node and [fengari](https://github.com/fengari-lua/fengari):

```
npm install fengari
node cursortest.js [path-to-addon-folder]
```

The path defaults to `C:/Users/jonli/cursor-beacon/`. It prints `RESULT pass=N fail=0` at the end
and names any check that failed.

## Modes

Each mode makes the stubbed client less capable, to prove the addon degrades instead of breaking.

| Flag | What it simulates |
| --- | --- |
| *(none)* | A capable client where everything resolves |
| `--bare` | Every UI template is missing, so all the fallback chains are exercised |
| `--noart` | The `Interface\CURSOR` art is absent, so the big pointer must switch itself off |
| `--nomathatan2` | Only the game's degree based `atan2` exists, not the radian based `math.atan2` |
| `--verbose` | Prints what the addon writes to chat |

## Things it deliberately models

- **Protected unit values.** `SECRET_UNITS` makes health and power come back as values a widget
  will accept but arithmetic will not, which is what the real client does.
- **Degree based trig globals.** The game adds an `atan2` answering in degrees alongside the
  radian based `math.atan2`. Mixing them up sent the minimap button spinning once already.
- **Hidden frames stop ticking.** Only shown frames get their OnUpdate called.
- **Layout cost.** `SETPOINTS` counts anchor changes per frame so the draw loop cannot quietly get
  more expensive.
