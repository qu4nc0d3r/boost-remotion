# script.json schema

Top level: `title`, `capReplace {"spoken words": "on-screen digits"}`, `scenes []`. Optional per-video overrides: `voice`, `voiceRef`, `branding {channel, sub}`, `musicVolume` (otherwise `apply_config.py` fills them from config.json).

## Scene
`id` (s01…), `label` (2–3 words), `text` (TTS-safe narration), optional:
- `chapter` – stamp top-left, e.g. "II · NGÔ QUYỀN" (also the YouTube chapter name)
- `kind: "outro"` with `items: []` – end card drawn from `config.channel.outroCard`
- `night` (dark-blue multiply), `tint` (css colour, 35 % multiply)
- `camera {zoom: [[t,z]…], focus: [x,y], pan: [[t,dx,dy]…]}`
- `shake: [[t, frames]]`
- `sfx: [[t, name, volume]]` – names: `drum` (4 war-drum hits), `hit`, `clash` (metal), `crack` (wood breaking), `hammer`, `swish0..2`
- `sky` – watercolor sky: `day` `dawn` `dusk` `night` `storm` `dry` (default `style.defaultSky`; night scenes → night; map scenes → none), `skyStrength` 0–1
- `transition` – how this scene enters: `ink` (ragged brush wipe, default `style.transition`), `scroll` (hand-scroll unrolls from the centre, wooden rods), `page` (page slides in with shadow), `fade`, `cut`
- `camera.keys: [[t, zoom, cx, cy]…]` – shots: centre the view on (cx, cy) at that zoom (1 = full frame, 1.4–1.6 = close-up on a face). Without any camera every scene drifts slowly (zoom 1→1.05) so parallax layers move; `camera.static: true` disables it
- `items []` – drawn in order, later = in front; every item accepts `depth` (0 = fixed to the screen … 1 = moves fully with the camera). Defaults: sun/moon 0.04, cloud 0.15, hills 0.35, fog 0.6, text/timeline/map/rain 0, everything else 1

Time `t` = fraction 0–1 of that scene's narration. Canvas 1920×1080 logical px; ground line usually y 860; captions cover y > 950; chapter stamp occupies x 70–600, y 40–110 for ~4 s. Most items accept `at` (appear with draw-on) and `out` (fade).

## Items
| type | fields |
|---|---|
| `stick` (v2 look: brush-stroke limbs, face, costume, shadow) | `mood` or `moods: [[t,mood]]` – `neutral happy sad angry scared shout talk dead` (default follows the pose: cry→sad, fight/run→angry, cheer→happy, talk→talk, dead→dead…); `outfit` `none sash tunic robe armor` + optional `+cape` (default by hat: general→armor+cape, king→robe+cape, hanking/hanofficial/hair→robe, hood→tunic+cape, han/conical→tunic, band→sash), `outfitColor`; `dust` (default on while running); `shadow` (default true); plus: `x`,`y` (feet) or `path: [[t,x,y]…]`; `scale` (1 ≈ 210 px, main characters 1.3–1.5); `facing` 1/-1, `faces: [[t,dir]]`; `pose` + `poses: [[t,name]]` (10-frame blend); `hat`; `weapon`; `team: "viet"\|"han"` (han → enemy-colour cap); `color` ("red" = accent, "han" = enemy, or css); `label`, `labelAt`, `labelOut` |
| `crowd` | stick fields + `n`, `cols`, `dx`, `dy` (row offset, negative = further back), `rowShift`, `jitter`, `weapons: [...]` cycled |
| `boat` | `variant: "han"` (junk, 2 sails) / `"viet"` (rowing canoe, `sail: true` optional); `path: [[t,x,0]]` (y follows the scene's water level; `float: false` + `y` otherwise); `scale`, `facing`, `faces`, `crew`, `crewPose`, `hat`, `color`, `stuck: t` (freezes at that water height and tilts `tilt` deg; crew → `stuckPose`, default panic), `stuckShift`, `sink: t`, `phase` |
| `water` | `level: [[t,y]…]` (tide), `x1`, `x2`, `color`, `opacity` – put it AFTER stakes and boats |
| `stakes` | `x1`,`x2`,`n`,`base` (riverbed y),`h`,`lean` (deg, + = tips to the right), `at`,`span` (staggered appearance) |
| `bank` | foreground land after the water: `x1`,`x2`,`y`,`side` ("left"/"right"),`slope`,`fill` |
| `bed`, `ground`, `hills` | `y` (+ `x1`,`x2`; hills `h`,`seed`,`fill`,`opacity`) |
| `reeds` | `x1`,`x2`,`y`,`n`,`h` |
| `tree`, `house`, `throne`, `tent` (`color` flag), `palace` (`sign`, `color` roof) | `x`,`y` (base), `scale` |
| `sun`, `moon` | `x`,`y`,`r` · `cloud` `x`,`y`,`scale`,`drift` · `fire` `x`,`y`,`scale` |
| `text` | `text` (`\n` ok), `style` "title" (Playfair) \| "hand" (Patrick Hand) \| "stamp" (boxed, accent) \| "body", `size`, `color`, `x`,`y`, `w` (stamp box width), `rotate`, `anchor` |
| `bubble` | `text`, `x`,`y`, `size`, `w`, `tail: [dx,dy]`, `color` |
| `arrow` | `points: [[x,y]…]` (drawn on over `dur` frames), `color`, `w`, `nohead`, `opacity` |
| `timeline` | `y`,`x1`,`x2`, `marks: [{x, year, label, color, at}]` |
| `volley` | arrow rain `x1,y1 → x2,y2`, `n`, `waves`, `gap`, `fly`, `arc`, `spread` |
| `splash` | `x`,`y`,`at` |
| `fire` | `x`,`y`,`scale`,`at`,`out`; `glow` (warm light, default true), `glowR` (radius, 230), `sparks` (default true) |
| `smoke` | rising watercolor puffs: `x`,`y`,`scale`,`at`,`out`,`drift` (px sideways, 60),`height` (260),`n`,`period`,`color` |
| `fog` | drifting soft bands: `y`,`n`,`opacity` (0.5),`color`,`at`,`out` |
| `rain` | full-screen rain: `n` (90),`angle` (12°),`at`,`out` |
| `water` extras | `foam` (white caps, default true), `deep` (bottom colour of the gradient) |
| `map` | antique map panel (use as the only big item of a scene): `preset: "bac-bo"` (Northern Vietnam + Guangdong + Hainan, rivers, border), `extent: [lon0, lon1, lat0, lat1]` (keep lon span × 0.93 ≈ 1.93 × lat span), `box: [x,y,w,h]` (default 150,70,1620,840), `title`, `seaLabel`/`seaAt: [lon,lat]`, `places: [{name (preset place) or lonlat: [lon,lat] or x,y, label, at, color: "red"/"han", star, pulse, dx, dy, anchor, size}]`, `routes: [{points: [place name or [lon,lat] or [x,y]…], color, at, dur (frames, 60), w, icon: "arrow"/"boat", label}]`. Preset places: Đại La, Thăng Long, Cổ Loa, Đường Lâm, Ái Châu, Hoa Lư, Chi Lăng, Bạch Đằng, Hạ Long, Hải Môn, Quảng Châu. Routes over water must follow sea waypoints (e.g. Quảng Châu → [113.0,21.9] → [111.6,21.1] → [110.45,20.15] → [109.3,20.5] → [108.3,20.9] → [107.4,20.7] → Bạch Đằng) |

Poses – static: `stand point raise cheer kneel bow dead fallen sit think cry fear stab shoot give carry hold`; animated: `walk march run carrywalk row hammer fight cheer cry talk panic shootcycle swim`.
Hats: `none band conical general king han hanofficial hanking hair hood`.
Weapons: `none sword dagger spear flag torch bow scroll oar hammer log gift`.

Chapter scenes get a big brush-stroke banner ("CHƯƠNG II / NGÔ QUYỀN") that flies into the corner stamp (`style.chapterCard`, text split on " · ").

## Layout rules that avoid rework
- Pair a moving `path` with walk/run and switch to a static pose where the path ends.
- Seat a figure on a throne: throne `y` = ground, figure `y` ≈ ground − 18, `pose: "sit"`.
- River scenes: water level 620–660 = high tide, 860–880 = low tide; stakes `base` 1010, `h` 240–260; a boat of scale 0.7 touches the stake tips when the water is ≈ 740–780.
- People on a river bank need a `bank` item drawn after `water`, otherwise they appear to stand in the river.
- Keep big titles out of the top-left chapter stamp and labels short (1–3 words).
- Use a `map` scene whenever the narration moves armies or fleets between places; use `camera.keys` close-ups (zoom 1.4–1.5 on the speaker/victim) at emotional beats; give battle scenes `smoke`, `fire`, `volley`, `sky: "dusk"`/`"storm"`; quiet scenes `fog` + `sky: "dawn"`.
- Opponent direction stays consistent across scenes (e.g. invaders always sail right→left, `facing: -1`).

## Extending the engine
New props: add a component to `src/props.tsx` (use `useScene()`, `drawOn`, `vis`, `track`, `DrawPath`, `sketchLine`, colours from `sketch.tsx`) and a `case` in `src/SceneView.tsx`. New poses: add to `STATIC` or `poseAt` in `src/Stickman.tsx` (limb angles: 0 = down, 90 = forward, 180 = up; forearm/shin relative to the upper segment; torso/head + = lean forward). New hats/weapons: `Hat` / `Weapon` switch in the same file. Document additions in this file and offer to repackage the plugin.
