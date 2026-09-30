# Hong Kong Mahjong

A four-player Hong Kong style mahjong minigame: you sit at the bottom of a 3D
table, three computer players take the other seats, and hands are scored in
faan on the classic old-style ladder.

The tiles — every tile-face texture and the 3D tile model — come from
[JoeriKaiser/fmahjongg](https://github.com/JoeriKaiser/fmahjongg), along with the
component patterns they are rendered with. See [Credits](#credits). That project
is a mahjong *solitaire* game; the four-player game engine here (turn order,
calls, win detection, faan scoring, the computer players) is new.

```bash
npm install
npm run dev        # http://localhost:5173
npm run sim 8      # headless: four computer players run 8 games, checks invariants
```

## Playing

- You draw a tile, then click any tile in your hand to discard it.
- Play passes counter-clockwise: **You → Right → Across → Left**.
- When someone discards, any legal call you can make appears as a button:
  **pung** or **kong** on any discard, **chow** only on the tile discarded by
  the player to your left, or **win**. A win outranks a pung/kong, which
  outranks a chow.
- Four of a kind in hand can be declared as a concealed kong; a drawn tile that
  matches your own exposed pung can be added to it — and another player holding
  the winning tile may rob that kong.
- Flowers and seasons are set aside automatically and replaced from the back of
  the wall.
- The **Hand reading** panel tells you how many tiles you are from ready, and
  which tiles you are waiting on once you are.

### Call buttons

**Chow**, **Pung**, **Kong** and **Win** sit under the table and light up the
moment that call is available — green for a set, amber for a win, with the faan
the hand would score. Where a tile makes more than one chow, the button opens a
short menu of the runs to choose from. **Pass** lights up whenever a discard is
yours to claim.

They also cover your own turn: Kong lights up for four of a kind in hand (or a
tile that matches your exposed pung), and Win for a self draw.

### Settings

The gear button opens settings mid-game; the same options are on the title
screen:

- **Table speed** — how long the computer players take over each move:
  **Relaxed**, **Normal**, **Brisk** or **Blitz**. It only paces the opponents;
  your own turn always waits for you.
- **Call buttons** — show or hide the bar. With it hidden, the options still
  appear as buttons the moment a call is available.

Both are remembered on the device.

### URL options

`?play=1` deals immediately, `?seed=42` replays a specific deal, `?faan=3` and
`?hands=8` set the options, `?speed=2` (or `?fast=1` for Blitz) sets the table
speed, and `?auto=1` lets the computer play your seat too — a demo mode, handy
for watching the table play itself. In a dev build the store is on `window.game`
for poking at a hand from the console.

## Scoring

Hands are scored in faan, capped at the 13-faan limit, and paid on the ladder
`0→1, 1→2, 2→4, 3→8, 4→16, 5→24, 6→32, 7→48, 8→64, 9→96, 10→128, 11→192,
12→256, 13→384`. On a self-draw all three opponents pay; on a discard the
discarder pays.

Implemented patterns:

| Faan | Pattern |
| --- | --- |
| 1 | All Chows, fully concealed, self-draw, dragon pung, seat/round wind pung, own flower or season, last tile of the wall, robbing a kong, win on a kong replacement |
| 2 | Self-drawn and concealed, a full set of four flowers or seasons |
| 3 | All Pungs, Half Flush |
| 5 | Small Three Dragons |
| 7 | Full Flush |
| 8 | Great Three Dragons |
| 10 | Small Four Winds, All Honours, Mixed Orphans, Nine Gates |
| 13 | Great Four Winds, All Terminals, Four Kongs, Thirteen Orphans |

The minimum faan needed to declare a hand is chosen on the title screen: 0
(chicken hands allowed), 1, or the classic Hong Kong 3.

## Layout

```
src/game/        pure rules engine — no React, no rendering
  tiles.ts       the 34 playable kinds, bonus tiles, texture names
  melds.ts       hand decomposition, win detection, shanten, chow shapes
  scoring.ts     faan patterns and the points ladder
  ai.ts          discard choice (shanten + ukeire) and call policy
  wall.ts        the 144-tile wall
src/store/       zustand state machine driving a hand start to finish
src/components/three/  the 3D table: tile model, seat layout, camera and lights
src/components/hud/    title screen, in-game panels, call buttons, settings, results
scripts/sim.ts   headless four-computer-player simulation used as a smoke test
scripts/shot.mjs screenshots the running app through Chrome DevTools Protocol,
                 with optional clicks and `js:` steps to drive it
```

The table is laid out in *seat-local* space — each seat sits at `+Z` looking at
the origin, and its group is rotated by `seat * 90°`. Every row has to stay
inside that seat's wedge (`|x| < z`) or it collides with the neighbouring seat's
tiles at the corners of the table. Discard, meld and bonus tiles are counter-
rotated so their faces always read from the camera.

## Credits

All tile artwork in this game comes from
**[JoeriKaiser/fmahjongg](https://github.com/JoeriKaiser/fmahjongg)** by Joeri
Kaiser, an open-source mahjong solitaire app. Taken from that project:

- `public/textures/Regular/*.png` — the 42 tile-face textures: the three suits,
  the winds and dragons, and the flower and season bonus tiles.
- `public/textures/models/tile.glb` — the tile model, whose two meshes (body and
  face) this game renders the same way, with the same scale and orientation.
- `src/components/ui/*` and `src/lib/utils.ts` — the shadcn/ui primitives, plus
  the Tailwind v4 theme that `src/App.css` is built from.
- The React Three Fiber setup — canvas, lighting and per-tile mesh structure —
  follows that project's `TileInstances` and `MahjongGame` components.

The one piece of tile art that is *not* from upstream is the white dragon: it
ships as a blank texture in that set, which is indistinguishable from a failed
load, so `tileAssets.ts` draws it the traditional way instead — an empty field
inside a blue frame, generated onto a canvas at runtime.

The upstream repository carries no licence file, so if you plan to redistribute
this, ask Joeri Kaiser about the terms for the tile assets first.
