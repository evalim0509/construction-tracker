# SiteBook: requirements, methodology and change log

This file is the single record of **what** we are building, **why**, **how**
decisions were made, and **every change**. Update it with every release.

- Product name (working): **SiteBook**
- First target customer: **GCL Builders** (Malaysia)
- Stage: **Clickable prototype (option A)**, for design review and showing to customers
- Live link: GitHub Pages from the `main` branch (see README for setup)

---

## 1. The problem

Construction companies run jobs through **WhatsApp groups and Excel files**.
Each piece of information sits somewhere different: attendance photos in one
chat, receipts in another, material lists in a spreadsheet, the schedule on a
whiteboard. Management can't see cash flow or project status in one place, and
compiling everything for payroll and the accountant is a headache.

**Positioning:** very easy to use, not a complicated ERP, no enterprise
licence. Transparent, reliable, trustworthy and cheap. It has to feel
**easier than WhatsApp and Excel**, or nobody will use it.

## 2. Who uses it

| Role | Device | What they do every day |
|---|---|---|
| **Construction worker** (v0.3) | Own phone, if they have one | Scans the site QR code, clocks in and out with a selfie, sees their days, hours and pay, reports a wrong day |
| **Site manager** | Phone on site | Clocks workers in/out with a photo, checks and approves hours, logs receipts and material use, ticks off work phases, logs delays |
| **Material buyer** | Phone or laptop | Sees what to buy this week, marks orders and deliveries, watches low stock |
| **Senior management** | Laptop | Watches cash flow, spending, projects running late, bills due |

Workers **with** a smartphone clock themselves in (v0.3). Workers **without**
one are clocked in by the site manager with a photo, as before.

## 3. Requirements (from the Q&A with the client)

### Must have (built in this prototype)
1. **Calendar** showing which crews work on which project each day, how many crews are free, and what materials are due that day.
2. **Double-booking is blocked.** A crew can't be on two projects on the same day.
3. **Delays:** jobs can be pushed back by hand, with a reason (rain, material late, etc.). The finish date moves and the delay is recorded.
4. **Attendance:** each worker clocks in and out on the site manager's phone with a **photo**. Start time, end time and half days are recorded.
5. **Hours and OT are calculated automatically, but the site manager has the final say.** Any change needs a written reason and is labelled "Changed by site manager".
6. **Photo retention:** attendance photos are kept for **30 days after the pay month closes**, then deleted automatically. A PDPA notice is shown on first use.
7. **Materials and stock:** yard stock counts, low-stock warnings, material in/out, deliveries straight to site, and a buy list per project with statuses (not ordered → ordered → arrived).
8. **Ledger (money):** snap a receipt photo and log the details, log cash payments, log **bills to pay later** and **money expected from clients**. Management sees cash flow for the next 30 days and the next 6 weeks. It does **not** replace accounting software: there is a **"Download for accountant" CSV** export.
9. **Role-based home screens** and a "Viewing as" switcher for the demo.
10. **"Try with sample data"** button so anyone can try it immediately.
11. Plain English, minimal, lots of white space, details hidden in expand/collapse, mobile responsive.

### Assumed (client said "assume" — revisit with GCL)
- 50 workers in 5 crews of 10. Crews are fixed groups with a leader.
- Sunday is a rest day (no bookings, no attendance expected).
- Pay is a **daily rate**. Hourly rate = daily rate ÷ normal hours. OT = 1.5× hourly.
- Normal day = 8 hours; a 1-hour lunch break is taken off if they worked more than 5 hours; under 5 hours counts as a half day.
- Pay month = calendar month.
- There is a central yard (warehouse). Materials can also go straight to site.
- Each project uses the same 6 standard phases (piling → handover). Progress % = phases done ÷ 6.
- Malaysia: RM currency, DD/MM/YYYY dates, English only.

### Not in this prototype (later)
- Real logins, multiple companies, cloud database, sync between phones (option B).
- Wages in the cash-flow forecast.
- Payroll export and payslips.
- Bahasa Malaysia.
- LHDN e-Invoice (MyInvois) fields.
- Offline mode (client said there is internet on site).

## 4. Who can see and do what

| | Management | Site manager | Material buyer |
|---|---|---|---|
| Company money totals, contract values, cash flow | ✅ | ❌ | ❌ |
| Log receipts / cash | ✅ | ✅ (sees only their own) | ✅ (sees only their own) |
| Mark bills paid / money received | ✅ | ❌ | ❌ |
| Clock workers in/out | ✅ | ✅ | ✅ |
| **Approve / change attendance** | ❌ view only | ✅ **final say** | ❌ |
| See wages and pay per worker | ✅ | ❌ | ❌ |
| Tick work phases, log delays | ✅ | ✅ | ❌ |
| Mark materials ordered, send from yard | ✅ | ❌ | ✅ |
| Book crews | ✅ | ✅ | ❌ |
| Add projects, workers, crews; change settings | ✅ | ❌ | ❌ |

**Construction worker (v0.3):** sees only their own screen: clock in/out, their own days, hours, pay, day rate, pay day, and where they work tomorrow. They can send a report about a wrong day. No access to anything else.

## 5. Methodology

1. **Challenge the brief first.** Before any code, the idea was put through
   harsh business questions: who pays, why switch from WhatsApp/Excel, who
   logs attendance, does "ledger" mean accounting or cash tracking, will stock
   counts really be kept up to date. The answers shaped the scope.
2. **Design questions before building.** The client chose every main UI
   direction (colour, font, pictures, navigation, log button, home screens,
   calendar style, attendance flow). See section 6.
3. **Build the daily loop, not features in isolation.** Every screen answers
   "what do I need to do right now?" for one role.
4. **Logging must be faster than WhatsApp.** One "+ Log" button on every
   screen, four big choices, at most 4 required fields, photo first.
5. **Hide detail, don't delete it.** Lists show one line and one number; tap
   to expand.
6. **Prototype on real-looking data.** Sample data is generated around
   today's date so the demo always looks current.
7. **Test in a real browser** on desktop (1360px) and phone (390px) widths,
   and run every logging flow end to end before each release.
8. **Write everything down here.**

## 6. UI decisions (chosen by the client)

| # | Question | Decision |
|---|---|---|
| U1 | Overall style | Look of the BuildFlow reference (soft grey, white cards, big numbers, greeting), calm emptiness of the pipe reference, mobile layout of the first reference |
| U2 | Colour | **Teal and blue** for a calm, stable feel. Orange/amber **only** for "needs attention", red only for problems |
| U3 | Font | Rounded modern sans: **Outfit** |
| U4 | Pictures | Site photo uploaded by the site manager; a generated **3D factory/warehouse** until one is uploaded |
| U5 | Navigation | 5 tabs with icon + word: Today, Calendar, Projects, Stock, Money. Top bar on laptop, bottom bar on phone |
| U6 | Logging | One **"+ Log"** button → Clock in/out, Receipt or cash, Material in/out, Delay a job |
| U7 | Home screen | Different for each role |
| U8 | Management numbers | Spent this month, Money expected in, Low stock |
| U9 | Calendar | Month grid on laptop, week strip on phone; tap a day for details. **v0.2:** no coloured project dots (they don't scale past a few projects); each day shows only "X free" / "All busy" and a delivery icon. A project picker shades that project's days |
| U10 | Attendance | Tap name → selfie → confirm. Hours automatic, site manager has final say |
| U11 | Receipt | Photo + amount + what for + project + paid by; everything else under "More details" |
| U12 | Progress | Tick off phases; % calculated |
| U13 | Detail | Expand/collapse everywhere |
| U16 | Stock | **v0.2:** materials grouped into categories (folders, closed by default), category chips, "Running low" chip, and a search box that works on both tabs |
| U17 | Lists | **v0.2:** columns line up (progress bars start at the same place); fewer labels per row |
| U14 | Language | English |
| U15 | Dark mode | Skipped |
| T1 | Branch | Push to `main` |
| T2 | Hosting | GitHub Pages |
| T3 | Tech | Plain HTML/CSS/JS, data saved in the browser |
| T4 | Demo company | GCL Builders |
| C1 | Categories (v0.3) | Receipts and bills by spending category; attendance and clock-in list by crew; projects by Running / Starting soon / Finished |
| C2 | Receipt categories | Materials, Machine & equipment rental, Transport & fuel, Subcontractors, Site expenses, Tools & safety gear, Utilities & permits, Office & admin |
| C3 | Picking a category | **Required**, tap one of 8 big buttons |
| C4 | Spending breakdown | Yes, "Where it went" for management |
| P1 | Sections | Icon tiles with a word and a number, never icon-only |
| P2 | Opening a tile | Opens under the row on a laptop, as a pop-up on a phone. All closed at first |
| P3 | Where | Everywhere (project page, site manager and buyer home, Money) |
| W0 | Worker phones | Some have smartphones, some don't. Both are supported |
| W1 | Dual count | Worker clocks in with a selfie; site manager confirms with one tap |
| W2 | Times differ (> 15 min) | Flagged amber; the **site manager's time is paid** |
| W3 | Only one side recorded | Flagged for the site manager to decide |
| W4 | Location | Must be within 200 m of the site (simulated in the prototype) |
| W5 | Worker sees | Days and hours incl. OT, estimated pay, day rate, pay day |
| W6 | Report button | Yes, "Something wrong? Tell site manager" |
| W7 | Tomorrow | Yes, shows tomorrow's site |
| W8 | Language | Worker picks: English, Bahasa Malaysia, Bengali, Nepali, Indonesian, Burmese (all but English are **drafts**) |
| W9 | Worker sign-in | **QR code poster at the site gate**, then pick your name once |
| W10 | Match status | Yes: green "Matched", amber "Times differ" / "Only worker clocked in" / "Worker did not clock in" |
| V1 | Corners (v0.4) | Tight: 8px cards, 6px buttons |
| V2 | Colours | Dark ink buttons, muted teal for progress, toned-down status colours |
| V3 | Surfaces | White page, thin grey borders, no shadows |
| V4 | Font | IBM Plex Sans |
| V5 | 3D building | Same model in grey only |
| V6 | Status labels | Small dot + text |
| V7 | Navigation | Left sidebar on laptop, docked bar on phone |
| V8 | Demo worker pictures | Grey photo placeholders |
| V9 | Headings | Page name first ("Today, Friday 20 November"), small greeting above |
| V10 | Section tiles | Tabs with icons, counts and an underline |
| Pay | Pay day | 7th of the next month (Employment Act: within 7 days of the month ending) |

### Design tokens (v0.4 professional theme)
| Token | Value | Use |
|---|---|---|
| Page | `#FFFFFF` | Page background |
| Soft fill | `#F3F5F7` | Fills inside cards (inputs, counters, selected menu item) |
| Line | `#E1E5E9` | 1px borders around cards and rows (no shadows) |
| Ink | `#16232E` | Text, **main buttons**, active tab underline |
| Muted teal | `#2F6F73` | Progress bars and small accents only |
| Muted blue | `#3E5C8A` | Info, "ordered", clock out |
| Amber | `#B7791F` | Needs attention only (late, low stock) |
| Red | `#A63D35` | Problems only (overdue, rejected) |
| Green | `#3B6B55` | Done, matched |
| Slate | `#1A2733` | The one dark card (cash flow) |

- **Font:** IBM Plex Sans (Noto Sans for Bengali, Devanagari and Myanmar scripts). Numbers at medium weight with tabular figures.
- **Corners:** cards 8px, buttons and inputs 6px, small counters 4px. No pill shapes.
- **Status labels:** small coloured dot + text.
- **Sections:** tabs with an icon, word and count; the open one is underlined.
- **Navigation:** left sidebar on laptop and tablet; flat top bar with the Log button and a flat bottom bar docked to the edge on phones.

## 7. How it works (technical)

- **No build step.** `index.html` loads `styles.css`, `three.min.js` (3D library, MIT, bundled locally), `factory3d.js`, `sample-data.js` and `app.js`.
- **Updates reach phones straight away:** `index.html` links every file with a version number (`app.js?v=0.5.0`). Bump it on each release so browsers don't keep showing an old cached copy (GitHub Pages lets browsers cache files for 10 minutes).
- **Data:** everything except photos is one JSON object in `localStorage` (`sitebook-data-v1`). Photos are compressed to ~720px JPEG and kept in **IndexedDB** (`sitebook-photos`).
- **Screens** are functions returning HTML; clicks are handled in one place through `data-action` attributes.
- **3D buildings** (`factory3d.js`): each project gets its own randomly generated factory (sawtooth roof, silos) or warehouse (gable roof, loading docks), seeded by the project id. The model shows progress: steel frame → walls going up (teal) → finished, with a tower crane until 92%. One shared WebGL view plus one for still thumbnails. Falls back to a line drawing if WebGL is not available.
- **Camera:** on phones the photo button opens the camera directly (`capture`). On a laptop without a camera, "Use demo photos" is on by default.

### Data model (short)
```
projects     id, name, client, location, type, start, end, originalEnd, value, phases[], delays[], photo, color
crews        id, name, trade, leaderId
workers      id, name, crewId, dayRate, phone, hasPhone, lang
assignments  id, crewId, projectId, from, to          (crew bookings; overlap is blocked)
attendance   id, workerId, projectId, date,
             in, out, inPhoto, outPhoto            (site manager's side; wins for pay)
             self{in, out, inPhoto, outPhoto, inLoc} (worker's own phone; second count)
             status(waiting|approved|rejected), adjust{normal,ot,half,reason}
disputes     id, workerId, date, projectId, reason, note, status(open|sorted)
notifications id, type(selfie-in|selfie-out|report|confirmed|rejected|restored|changed), to(site|worker), workerId, projectId, photo, date, time, read
audit        id, date, time, by(site|worker|boss), byName, action, workerId, recId, projectId, forDate, value, reason   (append-only)
materials    id, name, unit, qty (in yard), min, cat (category; guessed from the name if missing)
needs        id, projectId, materialId, qty, by, status(to buy|ordered|arrived)
moves        id, date, materialId, qty, kind(in|out|direct), projectId
money        id, dir(in|out), status(paid|expected), date, amount, what, cat, projectId, paidBy, supplier, ref, photo, by
settings     normalHours, breakHours, breakAfter, halfDayUnder, otRate, photoKeepDays, sundayOff, matchMinutes, payDay, geofenceM
```

### Hours rule
```
worked = out − in − (lunch break if worked > 5h)
normal = min(worked, 8)
OT     = worked − 8, rounded down to the half hour
half day if worked < 5h
pay    = day rate (or half) + OT × (day rate ÷ 8) × 1.5
```
If the site manager changes anything, their numbers replace the automatic ones and a reason is stored.

### Two-sided attendance rule (v0.3)
```
times used for pay = site manager's times, else the worker's own
Matched           both sides within 15 min (in and out)          → green, "Approve all matched" covers it
Times differ      more than 15 min apart                          → amber, site manager's time paid unless changed
Only worker       worker clocked in, site manager never confirmed → amber, site manager decides
Worker didn't     worker has a phone but didn't clock in          → amber, site manager decides
Site manager only worker has no phone                             → neutral, not flagged
```

## 8. Business risks still open (be honest with yourself)

1. **Data on one device.** The prototype can't be shared between the site manager's phone and the boss's laptop. That needs option B (backend), which brings monthly hosting costs and the work of building logins.
2. **Will site managers really clock 20 people in every morning?** Test with GCL: time how long it takes per worker. If it's over 10 seconds, consider a group photo plus tick boxes.
3. **Stock counts drift.** They only stay right if every delivery and every "material out" is logged. Watch whether the buyer keeps it up for 3 weeks.
4. **Pricing undecided.** Decide before the second customer, e.g. per company per month, with a free tier for 1 site.
5. **Competitors** (Buildertrend, Procore, Fieldwire, Jobber, local payroll apps). Our edge is simplicity, Malaysian context and price. Don't add features that erode simplicity.
6. **Workers clocking in from home.** The prototype only pretends to check location. The real version must check the phone's GPS against the site and save the distance with each clock-in. GPS can be faked on rooted phones, which is why the site manager's tap still matters.
7. **Translations are drafts.** Bengali, Nepali, Indonesian, Burmese and Bahasa Malaysia text must be checked by a native speaker before workers use it. Wrong wording about pay causes disputes.
8. **QR sign-in is weak identity.** Anyone who picks a name on a shared phone can clock in as someone else. The selfie and the site manager's tap are the real proof. The production version should lock a phone to one worker after the first sign-in.
9. **The history is only as safe as where it is stored.** In this prototype it lives in the browser, and "Clear everything" wipes it. The real version must keep it on the server, append-only, with no delete button for anyone, including management. Otherwise it can't protect workers in a pay dispute.
10. **PDPA:** worker photos are personal data. The production version needs a written consent notice for workers and a proper retention job on the server.
11. **e-Invoicing (LHDN MyInvois)** is being phased in. Accountants will ask for supplier TIN and e-invoice numbers. Plan fields for it before production.

## 9. Change log

### v0.5.0 — 20 Nov 2026 — history (audit trail), undo, Rejected bin
Client request: "audit trail of what the site manager and construction workers did, an undo button, and a trash place for rejected workers in case the manager pressed it by accident; the audit trail is to protect the workers".
- **History (☰ menu → History)** for management and site managers. It records every attendance action: worker selfie clock-in/out, site manager photo clock-in/out, confirm, approve, approve all, change hours (exact before → after values, e.g. "OT 1h → 3h"), add by hand, back to automatic, reject, restore, worker reports, report sorted, and undo. Each entry has who, their role, date, time, which worker's day and the reason.
  - **Can't be edited or deleted.** Undo adds a new "undid: …" entry instead of removing anything.
  - Grouped by day, with a search box (worker or person) and filters: Everyone, Site manager, Workers, Management.
  - **Download** (management) as a CSV file, e.g. as evidence in a pay dispute.
  - Each worker row on Check attendance shows that day's history when opened.
- **Workers see their own history** ("My history" on the worker screen): every clock-in, confirmation, change, rejection and restore of their days, with the reason. They are also notified when their day is changed, rejected or restored.
- **Undo:** after confirm, approve, approve all, change, add by hand, reject, restore, photo clock-in/out or sorting a report, the message at the bottom shows an **Undo** button for 8 seconds.
- **Rejecting needs a reason** (Not on site, Photo is not this worker, Clocked in twice, Left early without asking, Other, plus optional details). The worker sees the reason in "My days".
- **Rejected bin:** rejected days leave the Everyone list and go to a new **Rejected** tab (per day) and a **Rejected days** page (☰ menu, all days). They are never deleted, and **Restore** puts a day back to waiting for a check.
- Sample data includes about 190 history entries for the last few days.
- History text is in English only on the worker screen for now (the buttons stay translated).

### v0.4.3 — 20 Nov 2026 — less text everywhere, compact attendance list
Client feedback: "it still looks very messy and cluttered, the words are everywhere". Six changes, each approved one by one:
1. **Explanations behind a ? button.** The sentences under page titles (Check attendance, Calendar, Stock, Money, Settings) moved into a small **?** next to the title. Count lines ("4 projects running now", "50 workers in 5 crews") and "Every site at a glance" are gone.
2. **One compact control row** on Check attendance: small ‹ Today › arrows on the left, the site picker on the right.
3. **Workers are compact rows**: small selfie, name, time, one status and one button (Confirm / Approve). Tap a row to see the big photos, hours, pay (management) and Change / Reject.
4. **One status per worker** in plain words: Waiting for you, On site, Ready to approve, Times differ 29 min, No selfie from worker, Approved, Rejected. A camera icon marks a selfie, a crossed-out phone icon marks a worker without a smartphone, and a flag marks a worker report.
5. **3 tabs**: To do (waiting for you or needs a look), Everyone (grouped by crew), Not in. Opens on To do when there is something to do.
6. **Same clean-up on other pages**: shorter stock rows ("Low, Min 120, 1 requested"), buy-list rows without notes, and fewer words on the cash card.

Also:
- **Rule change: tapping Confirm now agrees with the worker's selfie time.** The time the site manager confirmed is saved separately ("Selfie times confirmed by site manager at 16:32"). Before, the tap time replaced the selfie time, so every late confirmation was flagged as "times differ". Times are now only flagged when both sides recorded times independently.
- **Updates show straight away:** every file link in `index.html` carries the version number, so phones don't keep an old cached copy.

### v0.4.2 — 20 Nov 2026 — tidier attendance filters on phones
Client feedback: "this part of the UI on mobile looks cluttered".
- On phones, the attendance numbers (Clocked in, Took a selfie, Waiting for you, To look at, Did not clock in) are now one row of compact filter buttons you can swipe sideways, label first, then the number. On laptops they stay as one row of numbers.
- "Wages for the day" moved to its own small line under the filters.
- "Also waiting for a check" and "Worker reports on other days" are merged into one line, "Other days: Thu 19 Nov, 19 waiting + report", which also swipes sideways on phones.

### v0.4.1 — 20 Nov 2026 — worker selfies show up straight away, notifications
Client feedback: "after I take the selfie to clock in it doesn't appear anywhere; only after clock out does it appear for the site manager. I want the clock-in selfie to show for both the worker and the site manager, with a notification, and a filter to see who took a selfie."
- **Bug fixed:** Check attendance used to open on the latest day with *finished* records (usually yesterday), so a worker who had only clocked in was not visible. It now opens on **today** whenever anyone clocked in today.
- **Worker screen:** a new **Today** card shows the worker's own clock-in selfie and time, then the clock-out selfie, with "Waiting for site manager to confirm" or "Site manager confirmed 08:03". Translated into all 6 worker languages (drafts).
- **Notifications (bell with a red count)** for the site manager and management:
  - "Agus Santoso clocked in with a selfie at 07:58, Shah Alam Factory" (with the selfie), the same for clock-out, and worker reports.
  - Tapping one opens Check attendance on that day, filtered, with that worker's card first and outlined.
  - Workers get a notification when the site manager confirms them.
  - Switching "Viewing as" says how many new notifications are waiting.
- **Site manager Today screen:** a banner "4 workers clocked in with a selfie" with their photos and a **Review** button.
- **Check attendance filters:** the numbers at the top are now buttons: *clocked in*, *took a selfie*, *waiting for you*, *to look at*, *did not clock in*.
- Cards waiting for the site manager have their own **Confirm** / **Confirm out** button. Selfie times are labelled "In 07:58, selfie".
- A worker who clocks in on their own phone is automatically marked as having a phone.

### v0.4.0 — 20 Nov 2026 — professional look
Client feedback: "rounded corners, bright colours and 3D looks make it look like a kids app; I don't feel professionalism and serious business". Each change was shown as a before/after image and approved one by one (V1 to V10 in section 6).
- **Corners:** cards 8px, buttons 6px. No more pill-shaped buttons, chips or menus.
- **Colours:** main buttons are dark ink instead of bright teal. Teal is muted and only used for progress. Status colours are toned down.
- **Surfaces:** white page, thin grey borders around cards, no floating shadows or glow under buttons.
- **Font:** IBM Plex Sans instead of Outfit. Big numbers at medium weight and a calmer size.
- **3D building:** same generated model, now in greys only (no yellow crane or blue containers). The flat background replaces the gradient.
- **Status labels:** small dot + text ("● On time", "● 12 days late") instead of filled coloured pills.
- **Navigation:** left sidebar on laptop and tablet (menu, "Viewing as", Log button, ☰ menu at the bottom). On phones, a flat top bar holds the Log button and the bottom bar is docked to the edge. The floating round button is gone.
- **Demo worker pictures:** plain grey photo placeholders instead of cartoon faces.
- **Headings:** a small "Good afternoon, Mr. Lim" above a bold "Today, Friday 20 November". Other page titles are smaller and semibold.
- **Section tiles** are now tabs (icon, word, count) with an underline on the open one. On phones a tab still opens as a pop-up.

### v0.3.1 — 20 Nov 2026 — opens straight on "Good morning"
Client feedback: "I don't want the first page to be import data, I want it to be like Good morning xxx, here's today".
- Removed the welcome screen ("Try with sample data / Start empty").
- A first visit fills the app with the GCL Builders sample company and opens directly on the **Today** screen ("Good morning, Mr. Lim. Here is every site at a glance."). A short message says it's sample data and points to "Viewing as".
- **☰ menu → Clear everything, start empty** wipes the sample data so a company can enter its own. The Today screen then shows "No projects yet" with an **Add a project** button.
- **☰ menu → Reload sample data** brings the demo back.

### v0.3.0 — 20 Nov 2026 — categories everywhere, icon tiles, construction worker role
Client feedback: "everything should have categories, I don't want long lists", "sections collapsed by default and shown as icons, no long tabs", "add a construction worker role, super simple, clock in with a photo, clock out, track salary; attendance counted by both worker and site manager for accuracy".
- **Icon tiles** replace the long expand bars on the project page, site manager home, buyer home and Money page. Each tile shows an icon, one word and a number. All are closed at first. On a laptop the chosen tile opens under the row; on a phone it opens as a pop-up.
- **Receipt categories:** 8 categories with icons. Picking one is required when logging a receipt or bill (one tap). Receipts and bills are shown in one folder per category with a total. Category chips filter the list. The accountant CSV has a new Category column.
- **"Where it went"** (management): one bar per category for the month, with total and %. Tap a bar to open that category's receipts.
- **Attendance by crew:** Check attendance shows one folder per crew (counts, waiting, "to look at", missing). The clock-in list and "Who's here" are grouped by crew too.
- **Projects page** grouped into Running / Starting soon / Finished.
- **New role: Construction worker.**
  - Opens by scanning the site's **QR poster** (new "Site QR" tile on each project, with a Print poster button). The worker picks their name once.
  - One giant **Clock in / Clock out** button. A simulated location check ("You are at the site, within 200 m") comes before the selfie.
  - Shows "Site manager confirmed" or "Waiting for site manager", **where they work tomorrow**, **pay this month** (days, OT, checked and waiting amounts), day rate, OT rate, **pay day (7th)**, and a "My days" list.
  - **"Something wrong? Tell site manager"** sends a report (wrong time, day missing, wrong OT, other) that the site manager sees on the attendance card, under the new "Reports" tile, and as a "Needs your attention" item for management.
  - **6 languages** for the worker screen (English, Bahasa Malaysia, Bengali, Nepali, Indonesian, Burmese). All but English are drafts. Noto fonts load for Bengali, Nepali and Burmese scripts.
- **Two-sided attendance:** workers with a phone clock themselves in; the site manager confirms with one tap (new "To confirm" tile and "Confirm all"). Workers without a phone are clocked in by the site manager with a photo, as before. Each card shows a match status. **"Approve N matched"** only approves the green ones; amber ones need a look.
- **Settings:** new "flag when times differ by more than X minutes" and "pay day".
- **Workers:** new "can clock in on own phone" and "language" fields.
- Sample data: about 60% of workers have phones, each worker has a language, realistic mismatches and two open worker reports, and 4 more receipts so every category has entries.
- Older saved data still works: missing fields are filled in on load, and receipts without a category are guessed from their description.

### v0.2.0 — 18 Nov 2026 — cleaner calendar, stock categories, aligned lists
Client feedback: "bars should start on the same line", "calendar and side panel too cluttered, too many dots and colours", "stock needs categories and search, not an endless list".
- **Projects list (Today):** rows now use fixed columns, so every progress bar starts and ends at the same place, whatever the status label says. On phones the bar is hidden and "% done" moves under the name.
- **Calendar:**
  - Removed the coloured project dots and the colour legend.
  - Each day shows one plain line: "2 free" or "All busy" (amber), plus a truck icon when a delivery is due. Sundays and days outside the month show only the date.
  - New **project picker** ("All projects" ▾): choose one project to shade its days and show which crews are there. This works the same with 5 projects or 50.
  - The side panel is now short: two numbers (crews free, deliveries due), a "Who goes where" list (project → "Crews A and D", then "Free → Crew E"), deliveries only when there are some, and one "Book a crew" button.
- **Stock:**
  - **Search box** at the top that works on both "In the yard" and "To buy" (searches names and categories, with a clear button).
  - **Categories:** Cement & concrete, Roof & walls, Steel, Formwork & scaffold, Plumbing & electrical, Paint & finishing, Safety, Other.
  - The "All" view shows one folder per category (item count and how many are running low). Tap a category chip for a short list. **Running low** chip lists everything under minimum.
  - The "To buy" list is grouped into **Needed this week** and **Needed later**. Each row has one button (Mark ordered / Mark arrived) instead of a status label plus a button; "Ordered" now shows in the description.
  - "Add new material" asks for a category (or picks one from the name). The material picker groups options by category.
  - Sample data grows to 31 materials so the categories have real content.

### v0.1.0 — 17 Nov 2026 — first clickable prototype
- Welcome screen with **Try with sample data** and **Start empty** (removed in v0.3.1).
- Sample company GCL Builders: 5 projects, 5 crews, 50 workers, 2 weeks of attendance with demo selfies, 16 materials, buy list, receipts, bills and client payments, all relative to today's date.
- **Today** screen for each role: management (3 numbers, 3D hero of the busiest site, needs your attention, 30-day cash), site manager (clocked-in count, Clock in/out, check attendance, materials this week, phases), buyer (to buy this week, low stock, delivery button).
- **+ Log** button with 4 flows: clock in/out with photo, receipt or cash, material in/out, delay a job.
- **Calendar:** month grid (laptop) and week strip (phone), project dots, free-crew count, material icon, day detail panel, crew booking with **double-booking blocked**.
- **Projects:** cards with generated 3D thumbnails, project page with 3D/photo hero, timeline with delay marker, tickable phases, delays, crews, materials, attendance and money (management only).
- **Stock:** yard list with search and low-stock warning, recent movements, buy list with ordered/arrived and "send from yard".
- **Money:** spent / received / expected-in numbers, 6-week cash view, bills to pay, money expected in, receipts with photos, filter by project and month, **CSV download for the accountant**.
- **Check attendance:** photo in/out, automatic hours and OT, approve / reject / change with reason, approve all, add by hand, "did not clock in" list, wages per day for management. Opens on the latest day that still needs checking.
- **Workers & crews**, crew bookings list, **Settings** for hour rules and photo retention.
- Photos deleted automatically 30 days after the pay month closes; PDPA notice on first clock-in.
- three.js bundled locally so the 3D view works without a CDN.
- Tested on desktop and phone sizes; all logging flows tested end to end.
