# SiteBook — construction site book

A simple web app for construction companies: plan which crew goes where,
clock workers in with a photo, track materials and stock, and keep receipts,
bills and client payments in one place. It's built to be **easier than
WhatsApp and Excel**, in plain English.

> **Prototype.** Everything you enter is saved in your own browser only.
> Nothing is sent to a server.

## Try it

**Live:** https://evalim0509.github.io/construction-tracker/

Open the link. It starts on today's screen, filled with a sample company
(GCL Builders), so you can try everything straight away. Use **Viewing as** at
the top to switch between *Management*, *Site manager*, *Material buyer* and
*Construction worker*.

To enter your own data, open the **☰ menu → Clear everything, start empty**.
**☰ → Reload sample data** brings the demo back.

To run it on your own computer, download the repo and open `index.html` in a
browser. No install needed.

### Turn on the live link (one time)
1. On GitHub, open the repo → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
3. Choose branch **main** and folder **/ (root)**, then press **Save**.
4. Wait 1–2 minutes. The link above will work.

## What's inside

| File | What it is |
|---|---|
| `index.html` | The page |
| `styles.css` | All styling (colours, layout, phone layout) |
| `app.js` | All screens and logic |
| `sample-data.js` | The "Try with sample data" company (GCL Builders) |
| `factory3d.js` | The generated 3D factory / warehouse |
| `three.min.js` | 3D library (three.js r128, MIT licence) |
| `qrcode.js` | QR code maker for the site clock-in poster (qrcode-generator 1.4.4, MIT licence) |
| `PROJECT.md` | **Requirements, decisions, methodology and change log** |

## Things to try
- **Site manager:** press **Clock in / out**, tap a worker, confirm. Then **Check attendance** to approve hours or change OT (a reason is required).
- **+ Log → Receipt or cash:** type an amount and what it was for, then save.
- **Calendar:** tap a day to see which crews are where. Try booking Crew A on today's date: it's blocked because Crew A is already booked.
- **Projects:** open one, drag the 3D building, tick a phase, or press **Delay this job**.
- **Money** (as Management): tap **Where it went** to see spending by category; **Download for accountant** gives a CSV for Excel.
- **Construction worker:** switch "Viewing as" to Construction worker, tap **Scan QR code**, pick a site and a name, then **Clock in**. Switch back to Site manager and confirm them under the **To confirm** tile.
- **Project page → Site QR:** the poster workers scan at the gate.

## Blueprint progress (v0.9)
Open a project → **Blueprint** → upload a PDF or picture of the floor plan → **Trace parts** (set the scale, then tap the ends of each wall/pipe, tap each column) → the site manager uses **Progress photo** to photograph a part and move it one stage up. The app checks the photo (fresh, on site, sharp, bright, not reused) and sends doubtful or big steps to management. Progress feeds the phases, the project % and the 3D model. The sample Shah Alam Factory already has a traced plan.
