# Finding and picking photos

## Source

`pipeline/candidates.py` queries the Openverse API (`license_type=commercial` → CC0, PDM, CC BY, CC BY-SA; no NC/ND) and keeps up to 8 results per query with min side ≥ 600 px and aspect ≤ 2.2. Results mostly come from Flickr (1024 px on the long side) and Wikimedia (large). Sheets are written to `pipeline/cand/<scene>_<n>.jpg`, metadata to `pipeline/cand/db.json`.

Quirks already handled in the scripts:
- Openverse anonymous `page_size` must be ≤ 20 (else 401).
- Openverse's thumbnail proxy often returns 424 → thumbs are built from the source URL (Flickr `_n.jpg`, Wikimedia `/thumb/…/330px-…`).
- Wikimedia only serves standard thumb widths (330, 960, 1280…); other widths → 400. Full-size originals trigger 429 quickly → fetch_picks uses the 1280 px thumb and backs off.
- `candidates.py <sceneId> …` re-runs only those scenes (after editing their queries).

## Review

`python3 pipeline/review.py pages <dir>` → pages of 4 slots (2 scenes), each slot showing 8 numbered candidates. Read every page.

Pick 2 images per scene; picks may come from either slot of the same scene (e.g. `"s01": ["s01_1:1", "s01_1:5"]`). Write `pipeline/picks.json`:

```json
{"s01": ["s01_1:1", "s01_1:5"], "s02": ["s02_1:6", "s02_2:1"]}
```

Selection rules:
- Literal match to the narration beat first; mood second.
- Reject: maps, diagrams, logos/signage-dominant shots, visible watermarks, screenshots, cartoons or illustrations, famous characters, identifiable private people in close-up as the main subject, heavy text, sexualized or gory content, near-duplicates of an image already chosen.
- Prefer: clear subject, strong light, landscape or square orientation (both layouts crop to fit), a mix of wide and close shots across the video.
- Image 1 (background) should read well darkened and blurred at the edges; image 2 (cutout, 960×720 crop) should have its subject centred.

If a slot has nothing usable, change that query to something more concrete and rerun `candidates.py <id>`.

## After fetching

`python3 pipeline/fetch_picks.py` downloads to `public/img/<scene>_<n>.jpg` (≤ 1600 px) and writes `pipeline/credits.json`. Run `review.py picks` to catch duplicates (a failed download used to reuse the previous image — the script now prints `FAILED` instead) and eyeball the full set.
