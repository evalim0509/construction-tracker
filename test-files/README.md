# Test files for the Blueprint tab

Sample files to try the blueprint workflow end to end. They are **for testing only** (made up, not for construction).

| File | What it is |
|---|---|
| `klang-warehouse-floor-plans.pdf` | 2-page A3 drawing, 1:200. Page 1 = ground floor (48 m × 24 m warehouse, office, toilets, store, pipes, 18 columns). Page 2 = level 1 office mezzanine. |
| `klang-warehouse-ground-floor.png` | Page 1 as a picture, to test uploading an image instead of a PDF. |
| `tracing-guide.png` | Page 1 with the wall, pipe and column names marked, and the tracing order, so the names you trace match the photos. |
| `site-photos/` | Progress photos (rendered, realistic lighting): Wall 1 and Wall 2 at each stage, Pipe 2 laid → pressure-tested → covered, a column formwork → poured → finished, plus two bad photos. |

## Important: progress photos are taken with the app's own camera
Since v0.10 the app opens its own camera view (no gallery, no file upload), so a laptop cannot take progress photos (it can review and approve). To test with these photos: open a photo on your laptop screen and **point the phone at the screen** in the app's camera, then tap Take photo. All the checks run as they would on site. (Pointing at a screen passing the checks is itself one of the limits: management review is there for that.)

## Steps
1. Open **Klang Warehouse** → **Blueprint** tab → **Upload a blueprint** → choose the PDF → pick **Page 1** → name it *Ground floor*.
2. **Set scale:** tap both ends of the **48 000** dimension line at the top, type **48** (metres; if you type 48000 the app reads it as millimetres). Then **check the scale**: tap both ends of the **24 000** dimension on the left, type **24**. It should say less than 1% off.
2b. On a phone, **touch and hold** on the plan to get the magnifier, slide to the exact corner, let go.
3. **Trace** using `tracing-guide.png` (after the columns, tap **Split long walls into panels**: W1 becomes W1a–W1f at the columns; the photo names below then apply to W1a, W2a…): Wall tool, tap corners 1 → 2 → 3 → 4 → 1, then Stop (W1–W4); then W5–W9; Pipe tool for P1–P4; Column tool on the 18 black squares.
4. (Optional) **Add floor** → PDF page 2 → *Level 1*, trace its 5 walls. Check the 3D view stacks it on top.
5. **Progress photo** → choose **Wall 1** → upload `W1-wall-1-blockwork.jpg` → Save. Then `W1-wall-2-plastered.jpg`, then `W1-wall-3-painted.jpg` (the last one goes to management because Wall 1 reaches 100%).
6. **Try the checks:**

| Do this | Expected |
|---|---|
| Wall 2 → `W2-wall-1-blockwork.jpg`, then `W2-wall-2-plastered.jpg` | Both save normally |
| Wall 2 → choose *Painted* but upload `W2-wall-1-blockwork.jpg` again | Amber: "Looks darker than the last photo…" → sent to management |
| Any part → `BAD-blurry.jpg` | Red: "Too blurry" – cannot save |
| Any part → `BAD-too-dark.jpg` | Red: "Too dark" – cannot save |
| Wall 3 → upload a photo you already used for Wall 1 | Red: "Same photo as Wall 1…" – cannot save |
| A photo downloaded more than 10 minutes ago | Red: "Taken … ago" – cannot save |
| Pipe 2 → `P2-pipe-1-laid.jpg` → `P2-pipe-2-pressure-tested.jpg` → `P2-pipe-3-covered.jpg` | Saves; the last one goes to management (100%) |
| Column (any) → `column-1-formwork-up.jpg` → `column-2-…` → `column-3-…` | Saves; the last one goes to management |

**Testing many stages in one sitting:** the app sends photos to management when one day adds more than 10% of the project (anti-cheating rule), so on a test day several photos will say "Management approves this". Either approve them as Management (the next stage of that part waits until you do), or, while testing only, raise the limit in **Settings → Blueprint stages** (e.g. to 100) and put it back afterwards.

7. Switch to **Management** → Blueprint page → **Approve** or **Send back** the waiting photos. Check the project %, the phase timeline ("…% built") and the **3D** view change.

## How these files were made
`tools/make_plan.py` draws the PDF (Python + reportlab). `tools/scene.js` + `tools/render_sites.js` render the site photos with three.js in a headless browser (Node + Playwright), with hand-held camera movement and changing light between stages, then add phone-camera grain. The two BAD photos are a blurred and a darkened copy.
