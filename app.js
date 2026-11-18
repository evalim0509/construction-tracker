/* ==========================================================================
   SiteBook — app.js
   Plain JavaScript, no build step. Data lives in this browser:
   - everything except photos -> localStorage
   - photos                   -> IndexedDB
   Screens are rendered from functions that return HTML strings.
   Clicks are handled in one place via data-action attributes.
   ========================================================================== */
(function () {
  "use strict";

  /* ======================================================================
     1. Small helpers
     ====================================================================== */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = (p) => (p || "") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const pad = (n) => String(n).padStart(2, "0");
  const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);

  // dates are stored as "YYYY-MM-DD" strings (local time)
  const toISO = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const today = () => toISO(new Date());
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return toISO(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const fmtDate = (s) => { if (!s) return ""; const d = parse(s); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(); };
  const fmtDay = (s) => { const d = parse(s); return DOW[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()]; };
  const fmtDayLong = (s) => { const d = parse(s); return DOW_LONG[d.getDay()] + ", " + d.getDate() + " " + MON_LONG[d.getMonth()]; };
  const isSunday = (s) => parse(s).getDay() === 0;
  const monthKey = (s) => s.slice(0, 7);
  const relDay = (s) => {
    const n = diffDays(today(), s);
    if (n === 0) return "today";
    if (n === 1) return "tomorrow";
    if (n === -1) return "yesterday";
    if (n > 1 && n < 7) return "on " + DOW_LONG[parse(s).getDay()];
    if (n < 0) return Math.abs(n) + " days ago";
    return "on " + fmtDay(s);
  };
  const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  const toMin = (hm) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };

  const RM = (n, opts) => {
    const v = Number(n) || 0;
    const whole = Math.abs(v - Math.round(v)) < 0.005;
    const s = Math.abs(v).toLocaleString("en-MY", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
    return (v < 0 ? "−" : "") + "RM " + s;
  };
  const RMshort = (n) => {
    const v = Math.abs(Number(n) || 0);
    if (v >= 1e6) return "RM " + (v / 1e6).toFixed(v >= 1e7 ? 1 : 2).replace(/\.?0+$/, "") + "m";
    if (v >= 1e4) return "RM " + Math.round(v / 1000) + "k";
    return RM(v);
  };
  const plural = (n, one, many) => n + " " + (n === 1 ? one : (many || one + "s"));
  const hrs = (h) => { const v = Math.round(h * 4) / 4; return (v % 1 === 0 ? v : v.toFixed(2).replace(/0$/, "")) + "h"; };
  const initials = (name) => name.replace(/^(Md\.|Mohd)\s+/i, "").split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();

  /* ---------- icons (Lucide-style outlines) ---------- */
  const ICONS = {
    today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    projects: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1M12 18h1M7 18h1"/>',
    stock: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    money: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>',
    arrow: '<path d="M7 17 17 7M8 7h9v9"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    hourglass: '<path d="M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    in: '<path d="M17 7 7 17M16 17H7V8"/>',
    out: '<path d="M7 17 17 7M8 7h9v9"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    logo: '<path d="M5 20V11l5 3.4V11l5 3.4V6h4v14z" fill="#fff" stroke="none"/>'
  };
  const icon = (name, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || "") + ">" + (ICONS[name] || "") + "</svg>";

  /* ======================================================================
     2. Data store
     ====================================================================== */
  const KEY = "sitebook-data-v1";
  let S = null;

  function load() {
    try { const raw = localStorage.getItem(KEY); S = raw ? JSON.parse(raw) : null; } catch (e) { S = null; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast("Could not save on this device. Storage may be full.", "alert"); }
  }

  /* ---------- photos in IndexedDB ---------- */
  const photoCache = new Map();
  const PhotoDB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res) => {
        try {
          const rq = indexedDB.open("sitebook-photos", 1);
          rq.onupgradeneeded = () => rq.result.createObjectStore("photos");
          rq.onsuccess = () => { this.db = rq.result; res(this.db); };
          rq.onerror = () => res(null);
        } catch (e) { res(null); }
      });
    },
    async put(id, data) {
      photoCache.set(id, data);
      const db = await this.open(); if (!db) return;
      return new Promise((res) => { const tx = db.transaction("photos", "readwrite"); tx.objectStore("photos").put(data, id); tx.oncomplete = res; tx.onerror = res; });
    },
    async get(id) {
      if (photoCache.has(id)) return photoCache.get(id);
      const db = await this.open(); if (!db) return null;
      return new Promise((res) => {
        const rq = db.transaction("photos").objectStore("photos").get(id);
        rq.onsuccess = () => { if (rq.result) photoCache.set(id, rq.result); res(rq.result || null); };
        rq.onerror = () => res(null);
      });
    },
    async del(id) {
      photoCache.delete(id);
      const db = await this.open(); if (!db) return;
      db.transaction("photos", "readwrite").objectStore("photos").delete(id);
    },
    async clear() {
      photoCache.clear();
      const db = await this.open(); if (!db) return;
      db.transaction("photos", "readwrite").objectStore("photos").clear();
    }
  };

  async function storePhoto(dataUrl) {
    if (!dataUrl) return null;
    if (dataUrl.startsWith("demo-")) return dataUrl;
    const id = uid("ph_");
    await PhotoDB.put(id, dataUrl);
    return id;
  }

  /* demo photos are drawn, never stored */
  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function demoFace(key) {
    const h = hashStr(key);
    const bgs = ["#CFE3E2", "#D9E2F2", "#E4DDF0", "#DCE8D9", "#EFE3CF", "#E2E6EA"];
    const skins = ["#8D5A3B", "#B07A55", "#C9946B", "#6E4630", "#D8A47F", "#A0694A"];
    const hats = ["#F2C230", "#F5F5F2", "#3563C4", "#F2C230", "#E8E8E3"];
    const bg = bgs[h % bgs.length], skin = skins[(h >> 3) % skins.length], hat = hats[(h >> 5) % hats.length];
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="' + bg + '"/>' +
      '<rect x="0" y="86" width="120" height="40" fill="#9BB0BF"/><path d="M14 120c4-22 22-32 46-32s42 10 46 32z" fill="#C8F04A"/><path d="M52 90h16v30H52z" fill="#7F93A3"/>' +
      '<circle cx="60" cy="60" r="22" fill="' + skin + '"/><path d="M34 52c0-16 12-26 26-26s26 10 26 26z" fill="' + hat + '"/><rect x="30" y="50" width="60" height="6" rx="3" fill="' + hat + '"/>' +
      '<circle cx="52" cy="62" r="2.2" fill="#222"/><circle cx="68" cy="62" r="2.2" fill="#222"/><path d="M53 71q7 5 14 0" stroke="#222" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<text x="114" y="114" font-family="sans-serif" font-size="8" text-anchor="end" fill="#55636F">DEMO</text></svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function demoReceipt(key) {
    const h = hashStr(key);
    let lines = "";
    for (let i = 0; i < 6; i++) lines += '<rect x="22" y="' + (52 + i * 12) + '" width="' + (40 + ((h >> i) % 30)) + '" height="4" rx="2" fill="#C4CCD3"/><rect x="' + (88 + (i % 2) * 4) + '" y="' + (52 + i * 12) + '" width="14" height="4" rx="2" fill="#C4CCD3"/>';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160"><rect width="120" height="160" fill="#E9EDF0"/>' +
      '<path d="M14 8h92v138l-6-4-6 4-6-4-6 4-6-4-6 4-6-4-6 4-6-4-6 4-6-4-6 4-6-4-6 4z" fill="#fff"/>' +
      '<rect x="34" y="20" width="52" height="7" rx="3.5" fill="#3D4B57"/><rect x="42" y="32" width="36" height="4" rx="2" fill="#C4CCD3"/>' + lines +
      '<rect x="22" y="128" width="30" height="6" rx="3" fill="#3D4B57"/><rect x="74" y="128" width="28" height="6" rx="3" fill="#3D4B57"/></svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function photoSync(ref) {
    if (!ref) return null;
    if (ref.startsWith("demo-face:")) return demoFace(ref);
    if (ref.startsWith("demo-receipt:")) return demoReceipt(ref);
    if (ref.startsWith("data:")) return ref;
    return photoCache.get(ref) || null;
  }
  const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  function img(ref, cls, alt) {
    if (!ref) return '<div class="' + cls + ' photo-missing">No photo</div>';
    if (ref === "expired") return '<div class="' + cls + ' photo-missing">Photo deleted (older than ' + S.settings.photoKeepDays + ' days)</div>';
    const src = photoSync(ref);
    return '<img class="' + cls + '" alt="' + esc(alt || "") + '" src="' + (src || BLANK) + '"' + (src ? "" : ' data-ref="' + esc(ref) + '"') + ' data-action="zoom" data-src-ref="' + esc(ref) + '">';
  }
  async function hydratePhotos() {
    for (const el of $$("img[data-ref]")) {
      const src = await PhotoDB.get(el.dataset.ref);
      if (src) { el.src = src; el.removeAttribute("data-ref"); }
    }
  }

  /* camera / file picker -> small JPEG */
  function takePhoto(facing) {
    return new Promise((resolve) => {
      const inp = $("#camInput");
      inp.value = "";
      inp.setAttribute("capture", facing === "user" ? "user" : "environment");
      let settled = false;
      const done = (v) => { if (settled) return; settled = true; inp.onchange = null; inp.oncancel = null; resolve(v); };
      inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return done(null); compress(f).then(done, () => done(null)); };
      inp.oncancel = () => done(null);
      inp.click();
    });
  }
  function compress(file, max) {
    max = max || 720;
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const im = new Image();
        im.onload = () => {
          const k = Math.min(1, max / Math.max(im.width, im.height));
          const c = document.createElement("canvas");
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.72));
        };
        im.onerror = reject;
        im.src = fr.result;
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  /* attendance photos: keep for N days after the pay month closes */
  function photoKeepUntil(dateIso) {
    const d = parse(dateIso);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return addDays(toISO(monthEnd), S.settings.photoKeepDays);
  }
  function purgeOldPhotos() {
    let changed = false;
    const t = today();
    S.attendance.forEach((a) => {
      if (photoKeepUntil(a.date) < t) {
        ["inPhoto", "outPhoto"].forEach((k) => {
          if (a[k] && a[k] !== "expired") { if (!a[k].startsWith("demo-")) PhotoDB.del(a[k]); a[k] = "expired"; changed = true; }
        });
      }
    });
    if (changed) save();
  }

  /* ======================================================================
     3. Business rules (derived data)
     ====================================================================== */
  const byId = (list, id) => list.find((x) => x.id === id);
  const project = (id) => byId(S.projects, id);
  const crew = (id) => byId(S.crews, id);
  const worker = (id) => byId(S.workers, id);
  const material = (id) => byId(S.materials, id);
  const role = () => S.role;
  const can = {
    seeMoney: () => role() === "boss",
    approve: () => role() === "site",
    tick: () => role() !== "buyer",
    seePay: () => role() === "boss",
    manage: () => role() === "boss",
    buy: () => role() !== "site"
  };

  function progress(p) { return p.phases.length ? p.phases.filter((x) => x.done).length / p.phases.length : 0; }
  function lateDays(p) { return Math.max(0, diffDays(p.originalEnd || p.end, p.end)); }
  function nextPhase(p) { return p.phases.find((x) => !x.done); }
  function projectStatus(p) {
    const t = today();
    if (p.phases.length && p.phases.every((x) => x.done)) return { label: "Finished", cls: "good" };
    if (p.start > t) return { label: "Starts " + relDay(p.start), cls: "" };
    if (p.end < t) return { label: "Past finish date", cls: "bad" };
    const late = lateDays(p);
    if (late > 0) return { label: plural(late, "day") + " late", cls: "warn" };
    return { label: "On time", cls: "good" };
  }
  function activeProjects() { const t = today(); return S.projects.filter((p) => p.start <= t && !(p.phases.length && p.phases.every((x) => x.done))); }

  function assignmentsOn(d) {
    if (S.settings.sundayOff && isSunday(d)) return [];
    return S.assignments.filter((a) => a.from <= d && a.to >= d);
  }
  function crewsAt(projectId, d) { return assignmentsOn(d).filter((a) => a.projectId === projectId).map((a) => crew(a.crewId)).filter(Boolean); }
  function freeCrews(d) { const busy = new Set(assignmentsOn(d).map((a) => a.crewId)); return S.crews.filter((c) => !busy.has(c.id)); }
  function crewWorkers(crewId) { return S.workers.filter((w) => w.crewId === crewId); }
  function expectedWorkers(projectId, d) { return crewsAt(projectId, d).flatMap((c) => crewWorkers(c.id)); }

  function lowStock() { return S.materials.filter((m) => m.qty <= m.min); }
  function openNeeds() { return S.needs.filter((n) => n.status !== "arrived").sort((a, b) => a.by.localeCompare(b.by)); }

  /* hours: automatic first, site manager's change wins */
  function calcHours(rec) {
    const s = S.settings;
    if (!rec.in) return null;
    if (!rec.out) return { open: true };
    let worked = (toMin(rec.out) - toMin(rec.in)) / 60;
    if (worked < 0) worked += 24;
    if (worked > s.breakAfter) worked -= s.breakHours;
    worked = Math.max(0, worked);
    const half = worked < s.halfDayUnder;
    const auto = { worked, normal: Math.min(worked, s.normalHours), ot: Math.max(0, Math.floor((worked - s.normalHours) * 2) / 2), half };
    const final = rec.adjust ? Object.assign({}, auto, { normal: +rec.adjust.normal, ot: +rec.adjust.ot, half: !!rec.adjust.half }) : auto;
    return { auto, final, changed: !!rec.adjust };
  }
  function hoursText(h) {
    if (!h) return "";
    if (h.open) return "Still on site";
    const f = h.final;
    return (f.half ? "Half day, " : "") + hrs(f.normal) + " normal" + (f.ot > 0 ? " + " + hrs(f.ot) + " OT" : "");
  }
  function payFor(rec) {
    const h = calcHours(rec); const w = worker(rec.workerId);
    if (!h || h.open || !w || rec.status === "rejected") return 0;
    const f = h.final;
    const hourly = w.dayRate / S.settings.normalHours;
    return (f.half ? w.dayRate / 2 : w.dayRate) + f.ot * hourly * S.settings.otRate;
  }

  /* money */
  const isOut = (m) => m.dir === "out";
  function spentInMonth(mk) { return sum(S.money.filter((m) => isOut(m) && m.status === "paid" && monthKey(m.date) === mk), (m) => m.amount); }
  function expectedIn(days) { const lim = addDays(today(), days); return S.money.filter((m) => m.dir === "in" && m.status === "expected" && m.date <= lim); }
  function billsDue(days) { const lim = addDays(today(), days); return S.money.filter((m) => isOut(m) && m.status === "expected" && m.date <= lim); }

  /* ======================================================================
     4. UI state + shell
     ====================================================================== */
  const ui = {
    open: new Set(),             // which folds are open
    selDay: today(),
    calMonth: today().slice(0, 7),
    stockTab: "yard",
    stockCat: "all",
    calProject: "",
    stockQ: "",
    moneyMonth: today().slice(0, 7),
    moneyProject: "",
    attDate: today(),
    attSite: null,
    heroMode: {},
    sheet: null,
    menu: false
  };

  const TABS = [
    { id: "today", label: "Today", icon: "today" },
    { id: "calendar", label: "Calendar", icon: "calendar" },
    { id: "projects", label: "Projects", icon: "projects" },
    { id: "stock", label: "Stock", icon: "stock" },
    { id: "money", label: "Money", icon: "money" }
  ];
  const ROLE_LABEL = { boss: "Management", site: "Site manager", buyer: "Material buyer" };

  function route() {
    const h = (location.hash || "#/today").replace(/^#\/?/, "");
    const [name, id] = h.split("/");
    return { name: name || "today", id };
  }
  function tabOf(r) { return r.name === "project" ? "projects" : r.name; }

  function renderTop() {
    const top = $("#topbar"), bn = $("#bottomnav");
    if (!S) {
      top.innerHTML = '<a class="brand" href="#/today"><span class="brand-mark">' + icon("logo") + '</span><span>SiteBook<small>for construction teams</small></span></a>';
      bn.innerHTML = ""; $("#fab") && $("#fab").remove();
      return;
    }
    const r = route(), t = tabOf(r);
    const tabs = TABS.map((x) => '<a href="#/' + x.id + '" class="' + (t === x.id ? "on" : "") + '"' + (t === x.id ? ' aria-current="page"' : "") + ">" + icon(x.icon) + "<span>" + x.label + "</span></a>").join("");
    top.innerHTML =
      '<a class="brand" href="#/today"><span class="brand-mark">' + icon("logo") + "</span><span>" + esc(S.company.name) + "<small>Site book</small></span></a>" +
      '<nav class="topnav" aria-label="Main">' + tabs + "</nav>" +
      '<div class="top-right">' +
      '<div class="role-pick"><label for="rolePick">Viewing as</label><select id="rolePick" data-change="role">' +
      Object.keys(ROLE_LABEL).map((k) => '<option value="' + k + '"' + (S.role === k ? " selected" : "") + ">" + ROLE_LABEL[k] + "</option>").join("") +
      "</select></div>" +
      '<button class="btn btn-primary log-btn log-btn-top" data-action="open-log">' + icon("plus") + "Log</button>" +
      '<button class="icon-btn" data-action="menu" aria-label="More options" aria-expanded="' + ui.menu + '">' + icon("menu") + "</button>" +
      (ui.menu ? menuHTML() : "") +
      "</div>";
    bn.innerHTML = tabs;
    if (!$("#fab")) {
      const f = document.createElement("button");
      f.id = "fab"; f.className = "btn btn-primary fab"; f.dataset.action = "open-log";
      f.innerHTML = icon("plus") + "Log";
      document.body.appendChild(f);
    }
  }
  function menuHTML() {
    return '<div class="menu" role="menu">' +
      '<a href="#/attendance" role="menuitem">' + icon("clock") + "Check attendance</a>" +
      '<a href="#/team" role="menuitem">' + icon("users") + "Workers &amp; crews</a>" +
      '<a href="#/settings" role="menuitem">' + icon("sliders") + "Settings</a>" +
      "<hr>" +
      '<button data-action="reset-sample" role="menuitem">' + icon("refresh") + "Reload sample data</button>" +
      '<button data-action="wipe" role="menuitem">' + icon("trash") + "Clear everything</button>" +
      "</div>";
  }

  function render() {
    renderTop();
    const main = $("#main");
    if (!S) { main.innerHTML = viewWelcome(); after(); return; }
    const r = route();
    const views = { today: viewToday, calendar: viewCalendar, projects: viewProjects, project: viewProject, stock: viewStock, money: viewMoney, attendance: viewAttendance, team: viewTeam, settings: viewSettings };
    main.innerHTML = (views[r.name] || viewToday)(r.id);
    after();
  }
  function after() {
    hydratePhotos();
    $$("[data-3d]").forEach((el) => {
      const p = S ? project(el.dataset["3d"]) : null;
      if (p) window.Factory3D.attach(el, { seed: p.id + p.name, progress: progress(p), type: p.type });
      else window.Factory3D.attach(el, { seed: "welcome", progress: 0.62, type: "factory" });
    });
    $$("details[data-fold]").forEach((d) => d.addEventListener("toggle", () => { d.open ? ui.open.add(d.dataset.fold) : ui.open.delete(d.dataset.fold); }));
  }

  /* ---------- shared bits ---------- */
  function fold(id, title, sub, right, body, opts) {
    opts = opts || {};
    const open = ui.open.has(id) || (opts.defaultOpen && !ui.open.has("closed:" + id));
    return '<details class="fold ' + (opts.cls || "") + '" data-fold="' + id + '"' + (open ? " open" : "") + ">" +
      '<summary><div class="grow"><div class="fold-title">' + title + "</div>" + (sub ? '<div class="fold-sub">' + sub + "</div>" : "") + "</div>" +
      (right ? '<div class="fold-num num">' + right + "</div>" : "") +
      '<span class="chev">' + icon("down") + "</span></summary>" +
      '<div class="fold-body">' + body + "</div></details>";
  }
  const chip = (label, cls, ic) => '<span class="chip ' + (cls || "") + '">' + (ic ? icon(ic) : "") + esc(label) + "</span>";
  const pbar = (v, cls) => '<div class="bar ' + (cls || "") + '"><span style="width:' + Math.round(v * 100) + '%"></span></div>';
  const empty = (text, btn) => '<div class="empty">' + text + (btn || "") + "</div>";
  const avatar = (w, ref) => '<div class="avatar">' + (ref && ref !== "expired" ? img(ref, "", w.name) : esc(initials(w.name))) + "</div>";
  function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }

  function timelineHTML(p) {
    const t = today();
    const span = Math.max(1, diffDays(p.start, p.end));
    const pos = (d) => Math.max(0, Math.min(100, (diffDays(p.start, d) / span) * 100));
    const late = lateDays(p);
    const doneW = progress(p) * 100;
    return '<div class="timeline"><div class="tl-track">' +
      '<div class="tl-done" style="width:' + doneW + '%"></div>' +
      (late ? '<div class="tl-late" style="left:' + pos(p.originalEnd) + '%;right:0"></div>' : "") +
      (t >= p.start && t <= p.end ? '<div class="tl-today" style="left:' + pos(t) + '%" title="Today"></div>' : "") +
      '</div><div class="tl-labels"><div><span class="muted">Start</span><b>' + fmtDate(p.start) + "</b></div>" +
      (late ? '<div style="text-align:center"><span class="muted">First planned end</span><b>' + fmtDate(p.originalEnd) + "</b></div>" : "") +
      '<div style="text-align:right"><span class="muted">' + (late ? "New end" : "End") + "</span><b>" + fmtDate(p.end) + "</b></div></div></div>";
  }

  function hero(p, compact) {
    const mode = ui.heroMode[p.id] || (p.photo ? "photo" : "3d");
    const pct = Math.round(progress(p) * 100);
    const st = projectStatus(p);
    const np = nextPhase(p);
    return '<div class="hero"' + (compact ? ' style="min-height:360px"' : "") + ">" +
      (mode === "photo" && p.photo ? img(p.photo, "hero-photo", p.name + " site photo") : '<div class="hero-3d" data-3d="' + p.id + '"></div>') +
      '<div class="hero-info"><div class="glass"><div class="hero-name">' + esc(p.name) + '</div><div class="muted small">' + esc(p.location) + "</div></div>" +
      '<div class="glass" style="text-align:right"><div class="hero-pct num">' + pct + '<span style="font-size:22px">%</span></div><div class="muted tiny">done</div></div></div>' +
      (mode === "3d" ? '<div class="hero-hint">Drag to turn</div>' : "") +
      '<div class="hero-foot"><div class="glass row-between wrap" style="gap:10px"><div class="grow"><div class="small muted">' + (np ? "Now working on" : "All phases done") + '</div><div style="font-weight:500">' + esc(np ? np.name : "Ready for handover") + "</div></div>" +
      chip(st.label, st.cls) +
      (compact ? '<a class="btn btn-sm btn-dark" href="#/project/' + p.id + '">Open project</a>' : "") +
      (!compact && p.photo ? '<div class="seg-mini"><button class="' + (mode === "photo" ? "on" : "") + '" data-action="hero-mode" data-id="' + p.id + '" data-mode="photo">Photo</button><button class="' + (mode === "3d" ? "on" : "") + '" data-action="hero-mode" data-id="' + p.id + '" data-mode="3d">3D</button></div>' : "") +
      "</div></div></div>";
  }

  /* ======================================================================
     5. Screens
     ====================================================================== */
  function viewWelcome() {
    return '<section class="welcome">' +
      "<div><h1>Your jobs, workers, stock and money in one place.</h1>" +
      "<p>Clock workers in with a photo, see who is free on which day, know what to buy, and keep every receipt — without chasing WhatsApp groups and Excel files.</p>" +
      '<ul class="welcome-list">' +
      "<li>" + icon("check") + "Clock in a worker in two taps</li>" +
      "<li>" + icon("check") + "Snap a receipt and it goes to the right project</li>" +
      "<li>" + icon("check") + "See which crews are free on any day</li></ul>" +
      '<div class="row wrap mt-24" style="gap:12px"><button class="btn btn-primary btn-big" data-action="load-sample">Try with sample data</button>' +
      '<button class="btn btn-big btn-line" data-action="start-empty">Start empty</button></div>' +
      '<p class="small muted" style="font-size:14px">Prototype. Everything you enter stays in this browser on this device.</p></div>' +
      '<div class="hero"><div class="hero-3d" data-3d="welcome"></div><div class="hero-hint" style="bottom:22px">Drag to turn</div></div>' +
      "</section>";
  }

  /* ---------- Today ---------- */
  function viewToday() {
    if (role() === "site") return todaySite();
    if (role() === "buyer") return todayBuyer();
    return todayBoss();
  }

  function todayBoss() {
    const t = today(), mk = t.slice(0, 7);
    const spent = spentInMonth(mk);
    const expIn = expectedIn(30);
    const low = lowStock();
    const act = activeProjects();
    const busiest = act.slice().sort((a, b) => crewsAt(b.id, t).length - crewsAt(a.id, t).length || progress(b) - progress(a))[0] || S.projects[0];
    const receiptsCount = S.money.filter((m) => isOut(m) && m.status === "paid" && monthKey(m.date) === mk).length;

    const attn = [];
    S.projects.filter((p) => lateDays(p) > 0 && projectStatus(p).cls === "warn").forEach((p) => {
      const last = p.delays[p.delays.length - 1];
      attn.push({ tag: "Late", cls: "warn", text: esc(p.name) + " is " + plural(lateDays(p), "day") + " behind" + (last ? ' <span class="muted">(' + esc(last.reason.toLowerCase()) + ")</span>" : ""), href: "#/project/" + p.id });
    });
    const overdue = S.money.filter((m) => isOut(m) && m.status === "expected" && m.date < t);
    if (overdue.length) attn.push({ tag: "Overdue", cls: "bad", text: plural(overdue.length, "bill") + " past due, " + RM(sum(overdue, (m) => m.amount)), href: "#/money" });
    const week = billsDue(7).filter((m) => m.date >= t);
    if (week.length) attn.push({ tag: "Pay", cls: "info", text: plural(week.length, "bill") + " due this week, " + RM(sum(week, (m) => m.amount)), href: "#/money" });
    const urgentBuy = S.needs.filter((n) => n.status === "to buy" && n.by <= addDays(t, 3));
    if (urgentBuy.length) attn.push({ tag: "Buy", cls: "warn", text: plural(urgentBuy.length, "material") + " needed in the next 3 days not ordered yet", href: "#/stock" });
    const waiting = S.attendance.filter((a) => a.status === "waiting" && a.out).length;
    if (waiting) attn.push({ tag: "Check", cls: "", text: plural(waiting, "attendance record") + " waiting for the site manager", href: "#/attendance" });

    const inSum = sum(expIn, (m) => m.amount), outList = billsDue(30), outSum = sum(outList, (m) => m.amount);
    const maxV = Math.max(inSum, outSum, 1);

    return '<div class="page-head"><div><h1 class="greet">' + greeting() + ", " + esc(S.people.boss.name) + '</h1><p class="page-sub">' + fmtDayLong(t) + ". Here is every site at a glance.</p></div></div>" +
      '<div class="stats">' +
      '<a class="stat" href="#/money"><div class="stat-label">Spent this month' + icon("arrow") + '</div><div class="stat-value num"><span class="unit">RM</span>' + Math.round(spent).toLocaleString("en-MY") + '</div><div class="stat-foot">' + plural(receiptsCount, "receipt") + " in " + MON_LONG[+mk.slice(5) - 1] + "</div></a>" +
      '<a class="stat" href="#/money"><div class="stat-label">Money expected in' + icon("arrow") + '</div><div class="stat-value num"><span class="unit">RM</span>' + Math.round(inSum).toLocaleString("en-MY") + '</div><div class="stat-foot">' + plural(expIn.length, "client payment") + " in the next 30 days</div></a>" +
      '<a class="stat ' + (low.length ? "warn" : "") + '" href="#/stock"><div class="stat-label">Low stock' + icon("arrow") + '</div><div class="stat-value num">' + low.length + '<span class="unit" style="margin-left:6px">items</span></div><div class="stat-foot">' + (low.length ? esc(low.slice(0, 2).map((m) => m.name.replace(/\s*\(.*\)/, "")).join(", ")) + (low.length > 2 ? " and more" : "") : "Everything above minimum") + "</div></a>" +
      "</div>" +
      '<div class="grid-hero">' +
      (busiest ? hero(busiest, true) : '<div class="card">' + empty("No projects yet.", '<br><button class="btn btn-primary" data-action="new-project">Add a project</button>') + "</div>") +
      '<div class="stack">' +
      '<div class="card"><div class="card-head"><h2 class="card-title">Needs your attention</h2>' + chip(String(attn.length), attn.length ? "warn" : "good") + "</div>" +
      (attn.length ? attn.slice(0, 5).map((a) => '<a class="attn" href="' + a.href + '"><span class="attn-tag ' + a.cls + '">' + a.tag + '</span><span class="grow small">' + a.text + "</span></a>").join("") : empty("Nothing needs you right now.")) + "</div>" +
      '<div class="dark-card"><div class="row-between"><div><div class="muted small">Next 30 days</div><div style="font-size:30px;font-weight:300;letter-spacing:-.02em" class="num">' + (inSum - outSum >= 0 ? "+" : "−") + RMshort(inSum - outSum).replace("RM ", "RM ") + '</div></div><div class="muted tiny" style="text-align:right">money in<br>minus bills</div></div>' +
      '<div class="flow-row"><span class="muted">Coming in</span><div class="flow-bars"><span style="width:' + (inSum / maxV) * 100 + '%;background:#5FC2B4"></span></div><span class="num">' + RMshort(inSum) + "</span></div>" +
      '<div class="flow-row"><span class="muted">Bills to pay</span><div class="flow-bars"><span style="width:' + (outSum / maxV) * 100 + '%;background:#8FA8E8"></span></div><span class="num">' + RMshort(outSum) + "</span></div>" +
      '<div class="muted tiny mt-8">Wages are not included yet.</div></div>' +
      "</div></div>" +
      '<div class="section"><h2 class="section-title">Projects <a class="link-btn small" href="#/projects">See all</a></h2><div class="card"><div class="list">' +
      S.projects.map((p) => {
        const st = projectStatus(p);
        const pct = Math.round(progress(p) * 100);
        return '<a class="li li-link proj-row" href="#/project/' + p.id + '"><div class="li-main"><div class="li-title">' + esc(p.name) + '</div><div class="li-sub">' + plural(crewsAt(p.id, t).length, "crew") + ' on site today<span class="show-sm">, ' + pct + "% done</span></div></div>" +
          '<div class="pr-bar">' + pbar(progress(p)) + '</div><span class="pr-pct num small">' + pct + '%</span><span class="pr-st">' + chip(st.label, st.cls) + "</span></a>";
      }).join("") + "</div></div></div>";
  }

  function siteId() {
    let id = S.people.site.siteId;
    if (!project(id)) { id = (activeProjects()[0] || S.projects[0] || {}).id; S.people.site.siteId = id; }
    return id;
  }

  function todaySite() {
    const t = today();
    const sid = siteId();
    const p = project(sid);
    const head = '<div class="page-head"><div><h1 class="greet">' + greeting() + ", " + esc(S.people.site.name) + '</h1><p class="page-sub">' + fmtDayLong(t) + "</p></div>" +
      (S.projects.length ? '<div class="role-pick"><label for="sitePick">Your site</label><select id="sitePick" data-change="site">' + S.projects.map((x) => '<option value="' + x.id + '"' + (x.id === sid ? " selected" : "") + ">" + esc(x.name) + "</option>").join("") + "</select></div>" : "") + "</div>";
    if (!p) return head + '<div class="card">' + empty("No projects yet. Ask management to add one.") + "</div>";

    const expected = expectedWorkers(sid, t);
    const recs = S.attendance.filter((a) => a.projectId === sid && a.date === t);
    const inNow = recs.filter((a) => !a.out).length;
    const waiting = S.attendance.filter((a) => a.projectId === sid && a.status === "waiting" && a.out).length;
    const crewsToday = crewsAt(sid, t);
    const needs = S.needs.filter((n) => n.projectId === sid && n.status !== "arrived" && n.by <= addDays(t, 7)).sort((a, b) => a.by.localeCompare(b.by));

    const whoList = expected.concat(recs.map((r) => worker(r.workerId)).filter((w) => w && !expected.includes(w))).map((w) => {
      const r = recs.find((x) => x.workerId === w.id);
      const st = !r ? chip("Not in yet", "") : r.out ? chip("Left " + r.out, "") : chip("In since " + r.in, "good");
      return '<div class="li">' + avatar(w, r && r.inPhoto) + '<div class="li-main"><div class="li-title">' + esc(w.name) + '</div><div class="li-sub">' + esc(crew(w.crewId) ? crew(w.crewId).name : "") + "</div></div>" + st + "</div>";
    }).join("");

    return head +
      '<div class="grid-hero">' +
      '<div class="card" style="padding:28px"><div class="muted">Today at ' + esc(p.name) + "</div>" +
      '<div class="row" style="align-items:baseline;gap:10px;margin-top:6px"><span class="num" style="font-size:64px;font-weight:300;letter-spacing:-.04em;line-height:1">' + recs.length + '</span><span class="muted" style="font-size:22px">of ' + expected.length + "</span></div>" +
      '<div class="muted">workers clocked in' + (inNow ? ", " + inNow + " on site now" : "") + "</div>" +
      '<div class="mt-16">' + pbar(expected.length ? recs.length / expected.length : 0) + "</div>" +
      '<div class="stack mt-24"><button class="btn btn-primary btn-big btn-block" data-action="open-clock">' + icon("camera") + "Clock in / out</button>" +
      '<a class="btn btn-block" href="#/attendance">' + icon("check") + "Check attendance" + (waiting ? " (" + waiting + " waiting)" : "") + "</a></div>" +
      '<div class="small muted mt-16">Crews here today: ' + (crewsToday.length ? crewsToday.map((c) => esc(c.name)).join(", ") : "none booked") + "</div></div>" +
      hero(p, true) + "</div>" +
      '<div class="section">' +
      fold("site-who", "Who is here today", plural(recs.length, "worker") + " clocked in", "", whoList || empty("No crews booked here today."), {}) +
      fold("site-mat", "Materials coming this week", needs.length ? plural(needs.length, "item") : "Nothing due", "", needs.length ? '<div class="list">' + needs.map(needRow).join("") + "</div>" : empty("Nothing due this week."), {}) +
      fold("site-phases", "Work progress", p.phases.filter((x) => x.done).length + " of " + p.phases.length + " phases done", Math.round(progress(p) * 100) + "%", phasesHTML(p) + '<div class="row wrap mt-16"><button class="btn btn-soft" data-action="open-delay" data-id="' + p.id + '">' + icon("hourglass") + "Delay this job</button></div>", {}) +
      "</div>";
  }

  function todayBuyer() {
    const t = today();
    const week = openNeeds().filter((n) => n.by <= addDays(t, 7));
    const toBuy = week.filter((n) => n.status === "to buy");
    const low = lowStock();
    const later = openNeeds().filter((n) => n.by > addDays(t, 7));
    return '<div class="page-head"><div><h1 class="greet">' + greeting() + ", " + esc(S.people.buyer.name) + '</h1><p class="page-sub">' + fmtDayLong(t) + "</p></div></div>" +
      '<div class="grid-hero">' +
      '<div class="card" style="padding:26px"><div class="row-between"><div><div class="muted">To buy this week</div><div class="row" style="align-items:baseline;gap:10px;margin-top:4px"><span class="num" style="font-size:60px;font-weight:300;letter-spacing:-.04em;line-height:1">' + toBuy.length + '</span><span class="muted" style="font-size:20px">' + (toBuy.length === 1 ? "item" : "items") + " not ordered</span></div></div></div>" +
      '<div class="list mt-16">' + (week.length ? week.map(needRow).join("") : empty("Nothing needed this week.")) + "</div>" +
      '<button class="btn btn-soft btn-block mt-16" data-action="new-need">' + icon("plus") + "Add something to buy</button></div>" +
      '<div class="stack">' +
      '<div class="card"><div class="card-head"><h2 class="card-title">Running low in the yard</h2>' + chip(String(low.length), low.length ? "warn" : "good") + "</div>" +
      (low.length ? '<div class="list">' + low.map((m) => '<div class="li"><div class="li-main"><div class="li-title">' + esc(m.name) + '</div><div class="li-sub">Keep at least ' + m.min + " " + esc(m.unit) + '</div></div><span class="li-amt num" style="color:#B0661A">' + m.qty + " " + esc(m.unit) + '</span><button class="btn btn-sm btn-soft" data-action="new-need" data-mat="' + m.id + '">Add to buy list</button></div>').join("") + "</div>" : empty("All good.")) + "</div>" +
      '<button class="btn btn-primary btn-big btn-block" data-action="open-material" data-kind="in">' + icon("truck") + "A delivery arrived</button>" +
      "</div></div>" +
      '<div class="section">' + fold("buy-later", "Needed later", plural(later.length, "item") + " after this week", "", later.length ? '<div class="list">' + later.map(needRow).join("") + "</div>" : empty("Nothing planned yet."), {}) + "</div>";
  }

  function needRow(n) {
    const m = material(n.materialId), p = project(n.projectId);
    if (!m) return "";
    const t = today();
    const late = n.status !== "arrived" && n.by < t;
    const when = "needed " + (late ? '<b style="color:var(--red);font-weight:500">' + relDay(n.by) + "</b>" : relDay(n.by));
    let right = "";
    if (n.status === "arrived") right = chip("Arrived", "good", "check");
    else if (n.status === "to buy") right = can.buy() ? '<button class="btn btn-sm btn-primary" data-action="need-status" data-id="' + n.id + '" data-to="ordered">Mark ordered</button>' : '<span class="small" style="color:#B0661A">Not ordered</span>';
    else right = '<button class="btn btn-sm btn-blue" data-action="need-status" data-id="' + n.id + '" data-to="arrived">Mark arrived</button>';
    const fromYard = n.status !== "arrived" && m.qty >= n.qty && can.buy() ? ' <button class="link-btn small" data-action="need-yard" data-id="' + n.id + '">Send from yard instead</button>' : "";
    return '<div class="li need-row"><div class="li-main"><div class="li-title">' + n.qty.toLocaleString("en-MY") + " " + esc(m.unit) + " " + esc(m.name) + "</div>" +
      '<div class="li-sub">' + (n.status === "ordered" ? '<span style="color:var(--blue)">Ordered</span>, ' : "") + esc(p ? p.name : "For the yard") + ", " + when + (n.note ? ". " + esc(n.note) : "") + fromYard + "</div></div>" + right + "</div>";
  }

  function phasesHTML(p) {
    const np = nextPhase(p);
    return p.phases.map((ph) => {
      const isNow = np && np.id === ph.id;
      return '<div class="phase ' + (ph.done ? "done" : "") + '">' +
        '<button class="tick ' + (ph.done ? "on" : isNow ? "now" : "") + '" ' + (can.tick() ? 'data-action="tick" data-id="' + p.id + '" data-ph="' + ph.id + '"' : "disabled") + ' aria-label="' + (ph.done ? "Mark not done: " : "Mark done: ") + esc(ph.name) + '">' + icon("check") + "</button>" +
        '<div class="li-main"><div class="li-title">' + esc(ph.name) + '</div><div class="li-sub">' + (ph.done ? "Done " + fmtDate(ph.doneOn) : isNow ? "Working on this now" : "Not started") + "</div></div></div>";
    }).join("");
  }

  /* ---------- Calendar ---------- */
  function dayInfo(d) {
    const asg = assignmentsOn(d);
    const projIds = Array.from(new Set(asg.map((a) => a.projectId)));
    const free = freeCrews(d);
    const needs = S.needs.filter((n) => n.by === d && n.status !== "arrived" && (!ui.calProject || n.projectId === ui.calProject));
    const mine = ui.calProject ? asg.filter((a) => a.projectId === ui.calProject).map((a) => crew(a.crewId)).filter(Boolean) : [];
    return { asg, projIds, free, needs, mine, sunday: S.settings.sundayOff && isSunday(d) };
  }
  // "Crew A, Crew D" -> "Crews A and D"
  function crewNames(cs) {
    const names = cs.map((c) => c.name);
    if (!names.length) return "";
    if (names.length === 1) return names[0];
    if (names.every((n) => /^Crew \S+$/.test(n))) {
      const k = names.map((n) => n.slice(5));
      return "Crews " + k.slice(0, -1).join(", ") + " and " + k[k.length - 1];
    }
    return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  }
  function cellLine(info) {
    if (info.sunday) return "";
    if (ui.calProject) return info.mine.length ? '<span class="cal-free">' + esc(crewNames(info.mine)) + "</span>" : "";
    if (!S.crews.length) return "";
    return info.free.length ? '<span class="cal-free">' + info.free.length + " free</span>" : '<span class="cal-free none">All busy</span>';
  }
  function viewCalendar() {
    const t = today();
    const [y, m] = ui.calMonth.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday first
    const gridStart = addDays(toISO(first), -startOffset);
    const daysInMonth = new Date(y, m, 0).getDate();
    const cells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    let grid = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => '<div class="cal-dow">' + d + "</div>").join("");
    for (let i = 0; i < cells; i++) {
      const d = addDays(gridStart, i);
      const out = monthKey(d) !== ui.calMonth;
      const info = dayInfo(d);
      const cls = ["cal-day", out ? "out" : "", d === t ? "today" : "", d === ui.selDay ? "sel" : "", info.sunday ? "sun" : "", info.mine.length && !out ? "hit" : ""].join(" ");
      grid += '<button class="' + cls + '" data-action="sel-day" data-d="' + d + '" aria-label="' + fmtDayLong(d) + '"><span class="cal-n">' + parse(d).getDate() + "</span>" +
        (!out && info.needs.length ? '<span class="cal-mat" title="Delivery due">' + icon("truck") + "</span>" : "") +
        (out ? "" : cellLine(info)) + "</button>";
    }

    // phone: week strip around selected day
    const sel = ui.selDay;
    const wkStart = addDays(sel, -((parse(sel).getDay() + 6) % 7));
    let strip = "";
    for (let i = 0; i < 7; i++) {
      const d = addDays(wkStart, i), info = dayInfo(d);
      const line = info.sunday ? "&nbsp;" : ui.calProject ? (info.mine.length ? '<i class="wk-on"></i>' : "&nbsp;") : info.free.length ? info.free.length + " free" : '<b class="none">Busy</b>';
      strip += '<button class="wk-day ' + (d === t ? "today " : "") + (d === sel ? "sel " : "") + (info.mine.length ? "hit" : "") + '" data-action="sel-day" data-d="' + d + '"><span class="dow">' + DOW[parse(d).getDay()] + '</span><span class="n">' + parse(d).getDate() + '</span><span class="wk-free">' + line + "</span></button>";
    }

    const filter = '<select class="input pill-select" data-change="calProject" aria-label="Show one project">' +
      '<option value="">All projects</option>' + S.projects.map((p) => '<option value="' + p.id + '"' + (ui.calProject === p.id ? " selected" : "") + ">" + esc(p.name) + "</option>").join("") + "</select>";
    return '<div class="page-head"><div><h1 class="page-title">Calendar</h1><p class="page-sub">' + (ui.calProject ? "Days with a crew at " + esc(project(ui.calProject).name) + " are shaded." : "How many crews are free each day. Tap a day to see who goes where.") + "</p></div>" +
      (can.manage() || role() === "site" ? '<button class="btn btn-primary" data-action="open-assign">' + icon("users") + "Book a crew</button>" : "") + "</div>" +
      '<div class="row-between wrap" style="margin-bottom:16px">' + filter +
      '<div class="cal-head desktop-only"><button class="icon-btn" data-action="cal-month" data-step="-1" aria-label="Previous month">' + icon("left") + '</button><div class="cal-month">' + MON_LONG[m - 1] + " " + y + '</div><button class="icon-btn" data-action="cal-month" data-step="1" aria-label="Next month">' + icon("right") + "</button>" +
      '<button class="btn btn-sm" data-action="cal-today">Today</button></div>' +
      '<div class="cal-head mobile-only"><button class="icon-btn" data-action="cal-week" data-step="-7" aria-label="Previous week">' + icon("left") + '</button><div class="cal-month">' + parse(wkStart).getDate() + " " + MON[parse(wkStart).getMonth()] + " – " + parse(addDays(wkStart, 6)).getDate() + " " + MON[parse(addDays(wkStart, 6)).getMonth()] + '</div><button class="icon-btn" data-action="cal-week" data-step="7" aria-label="Next week">' + icon("right") + "</button>" +
      '<button class="btn btn-sm" data-action="cal-today">Today</button></div></div>' +
      '<div class="cal-layout"><div><div class="cal-grid">' + grid + '</div><div class="week-strip">' + strip + "</div></div>" +
      '<div class="card day-panel">' + dayPanel(sel) + "</div></div>";
  }

  function dayPanel(d) {
    const info = dayInfo(d);
    let html = "<h3>" + fmtDayLong(d) + "</h3>";
    if (info.sunday) return html + '<p class="muted mt-8">Rest day.</p>';
    const allNeeds = S.needs.filter((n) => n.by === d && n.status !== "arrived");
    html += '<div class="day-stats"><div class="day-stat"><b class="num' + (info.free.length ? "" : " warn") + '">' + info.free.length + "</b><span>" + (info.free.length === 1 ? "crew free" : "crews free") + '</span></div><div class="day-stat"><b class="num">' + allNeeds.length + "</b><span>" + (allNeeds.length === 1 ? "delivery due" : "deliveries due") + "</span></div></div>";
    html += '<div class="day-sec"><div class="day-sec-title">Who goes where</div><div class="where">';
    info.projIds.forEach((pid) => {
      const cs = info.asg.filter((a) => a.projectId === pid).map((a) => crew(a.crewId)).filter(Boolean);
      html += '<a class="where-row' + (ui.calProject === pid ? " on" : "") + '" href="#/project/' + pid + '"><span>' + esc(project(pid).name) + '</span><span class="muted">' + esc(crewNames(cs)) + "</span></a>";
    });
    if (info.free.length) html += '<div class="where-row"><span>Free</span><span class="free">' + esc(crewNames(info.free)) + "</span></div>";
    if (!info.projIds.length && !info.free.length) html += '<p class="muted small">No crews yet.</p>';
    html += "</div></div>";
    if (allNeeds.length) {
      html += '<div class="day-sec"><div class="day-sec-title">Deliveries due</div><div class="where">' + allNeeds.map((n) => {
        const m = material(n.materialId), p = project(n.projectId);
        return '<div class="where-row"><span>' + n.qty.toLocaleString("en-MY") + " " + esc(m.unit) + " " + esc(m.name.replace(/\s*\(.*\)/, "")) + '<span class="muted small" style="display:block">' + esc(p ? p.name : "Yard") + "</span></span>" + (n.status === "ordered" ? '<span class="muted small">Ordered</span>' : '<span class="small" style="color:#B0661A">Not ordered</span>') + "</div>";
      }).join("") + "</div></div>";
    }
    if (can.manage() || role() === "site") html += '<button class="btn btn-soft btn-block mt-16" data-action="open-assign" data-d="' + d + '">' + icon("plus") + "Book a crew</button>";
    return html;
  }

  /* ---------- Projects ---------- */
  function viewProjects() {
    const head = '<div class="page-head"><div><h1 class="page-title">Projects</h1><p class="page-sub">' + plural(activeProjects().length, "project") + " running now.</p></div>" +
      (can.manage() ? '<button class="btn btn-primary" data-action="new-project">' + icon("plus") + "New project</button>" : "") + "</div>";
    if (!S.projects.length) return head + '<div class="card">' + empty("No projects yet.", can.manage() ? '<br><button class="btn btn-primary" data-action="new-project">Add your first project</button>' : "") + "</div>";
    return head + '<div class="proj-grid">' + S.projects.map((p) => {
      const st = projectStatus(p), np = nextPhase(p);
      const pic = p.photo ? img(p.photo, "", p.name) : '<img alt="" src="' + window.Factory3D.thumb({ seed: p.id + p.name, progress: progress(p), type: p.type }) + '">';
      return '<a class="proj-card" href="#/project/' + p.id + '"><div class="proj-img">' + pic + "</div>" +
        '<div class="proj-body"><div class="row-between"><div class="proj-name">' + esc(p.name) + "</div>" + chip(st.label, st.cls) + "</div>" +
        '<div class="muted small">' + esc(p.location) + "</div>" +
        '<div class="row" style="gap:10px">' + '<div class="grow">' + pbar(progress(p)) + '</div><span class="num small">' + Math.round(progress(p) * 100) + "%</span></div>" +
        '<div class="small"><span class="muted">' + (np ? "Next: " : "") + "</span>" + esc(np ? np.name : "All phases done") + "</div></div></a>";
    }).join("") + "</div>";
  }

  function viewProject(id) {
    const p = project(id);
    if (!p) return '<a class="back" href="#/projects">' + icon("left") + "Projects</a>" + '<div class="card mt-16">' + empty("This project was not found.") + "</div>";
    const t = today();
    const st = projectStatus(p);
    const recsToday = S.attendance.filter((a) => a.projectId === id && a.date === t);
    const needs = S.needs.filter((n) => n.projectId === id).sort((a, b) => a.by.localeCompare(b.by));
    const openN = needs.filter((n) => n.status !== "arrived");
    const myAsg = S.assignments.filter((a) => a.projectId === id).sort((a, b) => a.from.localeCompare(b.from));
    const money = S.money.filter((m) => m.projectId === id);
    const spent = sum(money.filter((m) => isOut(m) && m.status === "paid"), (m) => m.amount);
    const received = sum(money.filter((m) => m.dir === "in" && m.status === "paid"), (m) => m.amount);
    const expIn = sum(money.filter((m) => m.dir === "in" && m.status === "expected"), (m) => m.amount);
    const labour = sum(S.attendance.filter((a) => a.projectId === id && a.status === "approved"), payFor);

    return '<a class="back" href="#/projects">' + icon("left") + "Projects</a>" +
      '<div class="page-head" style="margin-top:6px"><div><h1 class="page-title">' + esc(p.name) + '</h1><p class="page-sub">' + esc(p.client) + ", " + esc(p.location) + "</p></div>" +
      '<div class="row wrap">' + (can.tick() ? '<button class="btn" data-action="open-delay" data-id="' + p.id + '">' + icon("hourglass") + "Delay this job</button>" : "") +
      '<button class="btn" data-action="project-photo" data-id="' + p.id + '">' + icon("image") + (p.photo ? "Change site photo" : "Add site photo") + "</button></div></div>" +
      '<div class="grid-hero">' + hero(p, false) +
      '<div class="stack"><div class="card"><div class="card-head"><h2 class="card-title">Timeline</h2>' + chip(st.label, st.cls) + "</div>" + timelineHTML(p) + "</div>" +
      '<div class="card"><div class="card-head"><h2 class="card-title">Work phases</h2><span class="muted small">' + p.phases.filter((x) => x.done).length + " of " + p.phases.length + " done</span></div>" + phasesHTML(p) + "</div></div></div>" +
      '<div class="section">' +
      fold("pj-delays-" + id, "Delays", p.delays.length ? plural(lateDays(p), "day") + " in total" : "No delays", "", p.delays.length ? '<div class="list">' + p.delays.slice().reverse().map((d) => '<div class="li"><div class="li-main"><div class="li-title">+' + plural(d.days, "day") + ", " + esc(d.reason) + '</div><div class="li-sub">' + fmtDate(d.date) + (d.note ? ". " + esc(d.note) : "") + " Logged by " + esc(ROLE_LABEL[d.by] || d.by).toLowerCase() + ".</div></div></div>").join("") + "</div>" : empty("No delays logged.")) +
      fold("pj-crews-" + id, "Crews", plural(crewsAt(id, t).length, "crew") + " here today", "", myAsg.length ? '<div class="list">' + myAsg.map((a) => { const c = crew(a.crewId); return '<div class="li"><div class="li-main"><div class="li-title">' + esc(c ? c.name : "?") + ' <span class="muted small">' + esc(c ? c.trade : "") + '</span></div><div class="li-sub">' + fmtDate(a.from) + " to " + fmtDate(a.to) + "</div></div>" + (a.from <= t && a.to >= t ? chip("Here now", "good") : a.from > t ? chip("Coming", "info") : chip("Finished", "")) + "</div>"; }).join("") + "</div>" : empty("No crews booked.")) +
      fold("pj-mat-" + id, "Materials", openN.length ? plural(openN.length, "item") + " still to come" : "Nothing outstanding", "", needs.length ? '<div class="list">' + needs.map(needRow).join("") + "</div>" : empty("No materials planned.")) +
      fold("pj-att-" + id, "Attendance today", plural(recsToday.length, "worker") + " clocked in", "", recsToday.length ? '<div class="list">' + recsToday.map((r) => { const w = worker(r.workerId); return '<div class="li">' + avatar(w, r.inPhoto) + '<div class="li-main"><div class="li-title">' + esc(w.name) + '</div><div class="li-sub">In ' + r.in + (r.out ? ", out " + r.out : "") + "</div></div>" + (r.out ? chip(hoursText(calcHours(r)), "") : chip("On site", "good")) + "</div>"; }).join("") + '</div><a class="btn btn-soft mt-12" href="#/attendance" data-action="att-for" data-id="' + id + '">Check attendance</a>' : empty("Nobody clocked in yet today.")) +
      (can.seeMoney() ? fold("pj-money-" + id, "Money", "Contract " + RM(p.value), "", '<div class="list">' +
        '<div class="li"><div class="li-main">Contract value</div><span class="li-amt num">' + RM(p.value) + "</span></div>" +
        '<div class="li"><div class="li-main">Spent (receipts and paid bills)</div><span class="li-amt num">' + RM(spent) + "</span></div>" +
        '<div class="li"><div class="li-main">Labour (approved attendance)</div><span class="li-amt num">' + RM(Math.round(labour)) + "</span></div>" +
        '<div class="li"><div class="li-main">Received from client</div><span class="li-amt num" style="color:var(--green)">' + RM(received) + "</span></div>" +
        '<div class="li"><div class="li-main">Still expected from client</div><span class="li-amt num">' + RM(expIn) + "</span></div></div>" +
        '<div class="mt-12">' + pbar(p.value ? Math.min(1, (spent + labour) / p.value) : 0, "blue") + '<div class="small muted mt-8">' + Math.round(p.value ? ((spent + labour) / p.value) * 100 : 0) + "% of contract value used, " + Math.round(progress(p) * 100) + "% of work done.</div></div>") : "") +
      "</div>";
  }

  /* ---------- Stock ---------- */
  const CATS = [
    { id: "concrete", name: "Cement & concrete", kw: /cement|sand|aggregate|concrete|grout|premix/i },
    { id: "walls", name: "Roof & walls", kw: /roof|cladding|brick|block|gutter|insulation/i },
    { id: "steel", name: "Steel", kw: /rebar|steel|beam|brc|mesh|bolt|plate|angle|channel/i },
    { id: "formwork", name: "Formwork & scaffold", kw: /plywood|formwork|timber|scaffold|prop/i },
    { id: "mep", name: "Plumbing & electrical", kw: /pipe|pvc|cable|wire|electric|socket|switch|fitting/i },
    { id: "finish", name: "Paint & finishing", kw: /paint|tile|adhesive|plaster|skim|sealant/i },
    { id: "safety", name: "Safety", kw: /helmet|safety|boot|vest|glove|harness/i },
    { id: "other", name: "Other" }
  ];
  const catName = (id) => (CATS.find((c) => c.id === id) || CATS[CATS.length - 1]).name;
  function catOf(m) {
    if (m.cat && CATS.some((c) => c.id === m.cat)) return m.cat;
    const c = CATS.find((x) => x.kw && x.kw.test(m.name));
    return c ? c.id : "other";
  }
  const isLow = (m) => m.qty <= m.min;

  function matRow(m, showCat) {
    const low = isLow(m);
    const recent = S.moves.filter((x) => x.materialId === m.id).slice(-4).reverse();
    const soon = S.needs.filter((n) => n.materialId === m.id && n.status !== "arrived");
    const fid = "mat-" + m.id;
    const sub = [showCat ? catName(catOf(m)) : "", low ? '<span style="color:#B0661A">Running low, keep at least ' + m.min + "</span>" : "", soon.length ? soon.length + (soon.length > 1 ? " sites need it" : " site needs it") : ""].filter(Boolean).join(". ");
    return '<details class="mrow" data-fold="' + fid + '"' + (ui.open.has(fid) ? " open" : "") + "><summary>" +
      '<div class="li-main"><div class="li-title">' + esc(m.name) + "</div>" + (sub ? '<div class="li-sub">' + sub + "</div>" : "") + "</div>" +
      '<span class="mat-qty num' + (low ? " low" : "") + '">' + m.qty.toLocaleString("en-MY") + '</span><span class="mat-unit muted small">' + esc(m.unit) + "</span>" +
      '<span class="chev">' + icon("down") + "</span></summary>" +
      '<div class="mrow-body">' +
      (recent.length ? '<div class="day-sec-title">Last movements</div><div class="list">' + recent.map((x) => '<div class="li"><div class="li-main small">' + (x.kind === "in" ? "Arrived at yard" : x.kind === "direct" ? "Delivered to " + esc(project(x.projectId) ? project(x.projectId).name : "site") : "Sent to " + esc(project(x.projectId) ? project(x.projectId).name : "site")) + '<div class="li-sub">' + fmtDate(x.date) + (x.note ? ", " + esc(x.note) : "") + '</div></div><span class="li-amt num">' + (x.kind === "out" ? "−" : "+") + x.qty + "</span></div>").join("") + "</div>" : '<p class="muted small">No movements yet.</p>') +
      '<div class="row wrap mt-12"><button class="btn btn-sm btn-primary" data-action="open-material" data-kind="in" data-mat="' + m.id + '">Material in</button><button class="btn btn-sm btn-soft" data-action="open-material" data-kind="out" data-mat="' + m.id + '">Material out</button>' +
      (can.buy() ? '<button class="btn btn-sm btn-soft" data-action="new-need" data-mat="' + m.id + '">Add to buy list</button>' : "") + "</div></div></details>";
  }

  function viewStock() {
    const q = ui.stockQ.trim().toLowerCase();
    const buy = ui.stockTab === "buy";
    const needs = openNeeds();
    const matchQ = (m) => !q || m.name.toLowerCase().includes(q) || catName(catOf(m)).toLowerCase().includes(q);
    const sortM = (a, b) => (isLow(a) ? 0 : 1) - (isLow(b) ? 0 : 1) || a.name.localeCompare(b.name);
    const low = S.materials.filter(isLow);

    // filter chips
    const base = buy ? needs.map((n) => material(n.materialId)).filter(Boolean) : S.materials;
    const counts = {};
    base.forEach((m) => { const c = catOf(m); counts[c] = (counts[c] || 0) + 1; });
    if (ui.stockCat !== "all" && ui.stockCat !== "low" && !counts[ui.stockCat]) ui.stockCat = "all";
    if (buy && ui.stockCat === "low") ui.stockCat = "all";
    const fchip = (id, label, n, cls) => '<button class="fchip ' + (ui.stockCat === id ? "on " : "") + (cls || "") + '" data-action="stock-cat" data-cat="' + id + '">' + esc(label) + (n != null ? '<span class="n">' + n + "</span>" : "") + "</button>";
    const chips = '<div class="chips" role="toolbar" aria-label="Categories">' + fchip("all", "All", base.length) +
      (!buy && low.length ? fchip("low", "Running low", low.length, "warn") : "") +
      CATS.filter((c) => counts[c.id]).map((c) => fchip(c.id, c.name, counts[c.id])).join("") + "</div>";

    const head = '<div class="page-head"><div><h1 class="page-title">Stock</h1><p class="page-sub">What is in the yard, and what the sites still need.</p></div>' +
      '<div class="row wrap"><button class="btn" data-action="open-material" data-kind="out">' + icon("out") + "Material out</button>" +
      '<button class="btn btn-primary" data-action="open-material" data-kind="in">' + icon("in") + "Material in</button></div></div>";
    const bar = '<div class="stock-bar"><div class="seg"><button class="' + (!buy ? "on" : "") + '" data-action="stock-tab" data-tab="yard">In the yard</button><button class="' + (buy ? "on" : "") + '" data-action="stock-tab" data-tab="buy">To buy (' + needs.length + ")</button></div>" +
      '<div class="search grow">' + icon("search") + '<input class="input" type="search" placeholder="Search, e.g. cement or rebar" value="' + esc(ui.stockQ) + '" data-input="stockQ" aria-label="Search materials">' + (q ? '<button class="search-clear" data-action="stock-clear" aria-label="Clear search">' + icon("x") + "</button>" : "") + "</div></div>";

    const inCat = (m) => ui.stockCat === "all" || (ui.stockCat === "low" ? isLow(m) : catOf(m) === ui.stockCat);

    if (buy) {
      const list = needs.filter((n) => { const m = material(n.materialId); return m && inCat(m) && matchQ(m); });
      const wk = addDays(today(), 7);
      const soon = list.filter((n) => n.by <= wk), later = list.filter((n) => n.by > wk);
      const group = (title, arr) => arr.length ? '<div class="group-title">' + title + '<span class="muted">' + arr.length + "</span></div>" + '<div class="card" style="padding:6px 22px"><div class="list">' + arr.map(needRow).join("") + "</div></div>" : "";
      return head + bar + chips +
        (list.length ? group("Needed this week", soon) + group("Needed later", later) : '<div class="card">' + empty(q ? "Nothing on the buy list matches “" + esc(ui.stockQ) + "”." : "Nothing on the buy list.") + "</div>") +
        (can.buy() ? '<button class="btn btn-soft mt-16" data-action="new-need">' + icon("plus") + "Add something to buy</button>" : "");
    }

    const list = S.materials.filter((m) => inCat(m) && matchQ(m)).sort(sortM);
    if (!S.materials.length) return head + bar + '<div class="card">' + empty("No materials yet.", '<br><button class="btn btn-primary" data-action="open-material" data-kind="in">Add the first delivery</button>') + "</div>";
    if (!list.length) return head + bar + chips + '<div class="card">' + empty("No material matches “" + esc(ui.stockQ) + "”.", '<br><button class="btn btn-soft" data-action="stock-clear">Clear search</button>') + "</div>";

    // searching or one category picked: a short flat list
    if (q || ui.stockCat !== "all") {
      return head + bar + chips + (q ? '<p class="small muted" style="margin:-4px 0 10px">' + plural(list.length, "result") + "</p>" : "") +
        '<div class="card" style="padding:6px 22px">' + list.map((m) => matRow(m, !!q || ui.stockCat === "low")).join("") + "</div>";
    }
    // everything: one folder per category, closed by default
    return head + bar + chips + CATS.filter((c) => counts[c.id]).map((c) => {
      const ms = S.materials.filter((m) => catOf(m) === c.id).sort(sortM);
      const nLow = ms.filter(isLow).length;
      return fold("cat-" + c.id, esc(c.name), plural(ms.length, "item") + (nLow ? ', <span style="color:#B0661A">' + nLow + " running low</span>" : ""), "", ms.map((m) => matRow(m, false)).join(""));
    }).join("");
  }

  /* ---------- Money ---------- */
  function moneyRow(m) {
    const p = project(m.projectId);
    const fid = "mo-" + m.id;
    const t = today();
    const overdue = m.status === "expected" && m.date < t;
    const sub = (m.status === "expected" ? (m.dir === "in" ? "Expected " : "Due ") + (overdue ? '<b style="color:var(--red)">' + relDay(m.date) + "</b>" : relDay(m.date)) : fmtDate(m.date)) + ", " + esc(p ? p.name : "Office / no project");
    let actions = "";
    if (m.status === "expected" && can.seeMoney()) actions = '<button class="btn btn-sm ' + (m.dir === "in" ? "btn-primary" : "btn-blue") + '" data-action="money-paid" data-id="' + m.id + '">' + (m.dir === "in" ? "Mark received" : "Mark paid") + "</button>";
    return '<details class="mrow" data-fold="' + fid + '"' + (ui.open.has(fid) ? " open" : "") + "><summary>" +
      (m.photo ? img(m.photo, "thumb-sm", "Receipt") : '<div class="thumb-sm photo-missing">' + icon(m.dir === "in" ? "in" : "receipt", ' style="width:20px;height:20px"') + "</div>") +
      '<div class="li-main"><div class="li-title">' + esc(m.what) + '</div><div class="li-sub">' + sub + "</div></div>" +
      '<span class="li-amt num" style="' + (m.dir === "in" ? "color:var(--green)" : "") + '">' + (m.dir === "in" ? "+" : "") + RM(m.amount) + "</span>" +
      '<span class="chev">' + icon("down") + "</span></summary>" +
      '<div class="mrow-body"><div class="grid-2" style="gap:12px">' +
      (m.photo ? "<div>" + img(m.photo, "thumb", "Receipt").replace('class="thumb"', 'class="thumb" style="width:100%;height:auto;max-height:240px;object-fit:contain"') + "</div>" : "") +
      '<div class="list small">' +
      (m.supplier ? '<div class="li"><span class="muted grow">' + (m.dir === "in" ? "From" : "Paid to") + "</span>" + esc(m.supplier) + "</div>" : "") +
      (m.ref ? '<div class="li"><span class="muted grow">Receipt / invoice no.</span>' + esc(m.ref) + "</div>" : "") +
      (m.paidBy && m.status === "paid" ? '<div class="li"><span class="muted grow">Paid by</span>' + esc(m.paidBy) + "</div>" : "") +
      '<div class="li"><span class="muted grow">Logged by</span>' + esc(ROLE_LABEL[m.by] || m.by) + "</div>" +
      (m.note ? '<div class="li"><span class="muted grow">Note</span>' + esc(m.note) + "</div>" : "") +
      "</div></div>" +
      '<div class="row wrap mt-12">' + actions + (can.seeMoney() || m.by === role() ? '<button class="btn btn-sm btn-danger" data-action="money-del" data-id="' + m.id + '">' + icon("trash") + "Delete</button>" : "") + "</div></div></details>";
  }

  function viewMoney() {
    const mk = ui.moneyMonth;
    const [y, mo] = mk.split("-").map(Number);
    const pf = (m) => !ui.moneyProject || (ui.moneyProject === "none" ? !m.projectId : m.projectId === ui.moneyProject);
    const projSel = '<select class="input" style="min-height:44px;border-radius:999px;width:auto" data-change="moneyProject" aria-label="Filter by project"><option value="">All projects</option>' +
      S.projects.map((p) => '<option value="' + p.id + '"' + (ui.moneyProject === p.id ? " selected" : "") + ">" + esc(p.name) + "</option>").join("") +
      '<option value="none"' + (ui.moneyProject === "none" ? " selected" : "") + ">Office / no project</option></select>";
    const monthNav = '<div class="cal-head"><button class="icon-btn" data-action="money-month" data-step="-1" aria-label="Previous month">' + icon("left") + '</button><div class="cal-month" style="min-width:150px">' + MON_LONG[mo - 1] + " " + y + '</div><button class="icon-btn" data-action="money-month" data-step="1" aria-label="Next month">' + icon("right") + "</button></div>";
    const receipts = S.money.filter((m) => m.status === "paid" && monthKey(m.date) === mk && pf(m)).sort((a, b) => b.date.localeCompare(a.date));

    if (!can.seeMoney()) {
      const mine = receipts.filter((m) => m.by === role());
      return '<div class="page-head"><div><h1 class="page-title">Money</h1><p class="page-sub">Receipts and cash you logged. Company totals are only shown to management.</p></div>' +
        '<button class="btn btn-primary" data-action="open-receipt">' + icon("camera") + "Snap a receipt</button></div>" +
        '<div class="row-between wrap" style="margin-bottom:16px">' + monthNav + projSel + "</div>" +
        '<div class="card" style="padding:8px 22px">' + (mine.length ? mine.map(moneyRow).join("") : empty("You have not logged anything this month.")) + "</div>";
    }

    const spent = sum(receipts.filter(isOut), (m) => m.amount);
    const got = sum(receipts.filter((m) => m.dir === "in"), (m) => m.amount);
    const bills = S.money.filter((m) => isOut(m) && m.status === "expected" && pf(m)).sort((a, b) => a.date.localeCompare(b.date));
    const incoming = S.money.filter((m) => m.dir === "in" && m.status === "expected" && pf(m)).sort((a, b) => a.date.localeCompare(b.date));
    const exp30 = sum(incoming.filter((m) => m.date <= addDays(today(), 30)), (m) => m.amount);

    // next 6 weeks cash view
    const wk0 = addDays(today(), -((parse(today()).getDay() + 6) % 7));
    let maxW = 1; const weeks = [];
    for (let i = 0; i < 6; i++) {
      const a = addDays(wk0, i * 7), b = addDays(a, 6);
      const inn = sum(incoming.filter((m) => (i === 0 ? m.date <= b : m.date >= a && m.date <= b)), (m) => m.amount);
      const out = sum(bills.filter((m) => (i === 0 ? m.date <= b : m.date >= a && m.date <= b)), (m) => m.amount);
      maxW = Math.max(maxW, inn, out); weeks.push({ a, inn, out });
    }
    const flow = weeks.map((w, i) => '<div class="flow-row"><span class="muted">' + (i === 0 ? "This week" : "From " + fmtDay(w.a).slice(4)) + '</span><div class="flow-bars"><span style="width:' + (w.inn / maxW) * 100 + '%;background:#5FC2B4"></span><span style="width:' + (w.out / maxW) * 100 + '%;background:#8FA8E8"></span></div><span class="num small" style="text-align:right">' + (w.inn - w.out >= 0 ? "+" : "−") + RMshort(Math.abs(w.inn - w.out)) + "</span></div>").join("");

    return '<div class="page-head"><div><h1 class="page-title">Money</h1><p class="page-sub">Receipts, bills to pay and client payments. Not a replacement for your accounting software: download the list for your accountant.</p></div>' +
      '<div class="row wrap"><button class="btn" data-action="export-csv">' + icon("download") + "Download for accountant</button>" +
      '<button class="btn btn-primary" data-action="open-receipt">' + icon("camera") + "Snap a receipt</button></div></div>" +
      '<div class="row-between wrap" style="margin-bottom:16px">' + monthNav + projSel + "</div>" +
      '<div class="stats">' +
      '<div class="stat"><div class="stat-label">Spent in ' + MON[mo - 1] + '</div><div class="stat-value num"><span class="unit">RM</span>' + Math.round(spent).toLocaleString("en-MY") + '</div><div class="stat-foot">' + plural(receipts.filter(isOut).length, "receipt") + "</div></div>" +
      '<div class="stat"><div class="stat-label">Received in ' + MON[mo - 1] + '</div><div class="stat-value num" style="color:var(--green)"><span class="unit">RM</span>' + Math.round(got).toLocaleString("en-MY") + '</div><div class="stat-foot">From clients</div></div>' +
      '<div class="stat"><div class="stat-label">Expected in, next 30 days</div><div class="stat-value num"><span class="unit">RM</span>' + Math.round(exp30).toLocaleString("en-MY") + '</div><div class="stat-foot">Not received yet</div></div>' +
      "</div>" +
      '<div class="dark-card" style="margin-bottom:16px"><div class="row-between wrap"><div><div style="font-size:18px;font-weight:500">Cash for the next 6 weeks</div><div class="muted small">Client payments coming in vs bills to pay, week by week.</div></div><div class="row small muted" style="gap:14px"><span class="row" style="gap:6px"><span class="dot" style="background:#5FC2B4"></span>Coming in</span><span class="row" style="gap:6px"><span class="dot" style="background:#8FA8E8"></span>Bills</span></div></div><div class="mt-12">' + flow + "</div></div>" +
      fold("money-bills", "Bills to pay", plural(bills.length, "bill") + (bills.some((b) => b.date < today()) ? ", some overdue" : ""), RMshort(sum(bills, (m) => m.amount)), '<div style="margin:0 -2px">' + (bills.length ? bills.map(moneyRow).join("") : empty("No unpaid bills.")) + '</div><button class="btn btn-soft mt-12" data-action="open-receipt" data-kind="bill">' + icon("plus") + "Add a bill</button>", { defaultOpen: true }) +
      fold("money-in", "Money expected in", plural(incoming.length, "client payment"), RMshort(sum(incoming, (m) => m.amount)), (incoming.length ? incoming.map(moneyRow).join("") : empty("Nothing expected.")) + '<button class="btn btn-soft mt-12" data-action="open-receipt" data-kind="in">' + icon("plus") + "Add expected payment</button>") +
      fold("money-receipts", "Receipts and payments in " + MON_LONG[mo - 1], plural(receipts.length, "entry", "entries"), "", receipts.length ? receipts.map(moneyRow).join("") : empty("Nothing logged this month."), { defaultOpen: true });
  }

  /* ---------- Attendance check ---------- */
  function waitingDays(sid) {
    const m = {};
    S.attendance.forEach((a) => { if (a.projectId === sid && a.status === "waiting" && a.out) m[a.date] = (m[a.date] || 0) + 1; });
    return Object.keys(m).sort().map((d) => ({ d, n: m[d] }));
  }
  function defaultAttSite() { return role() === "site" ? siteId() : (activeProjects()[0] || S.projects[0] || {}).id; }
  function pickAttDate(sid) { const w = waitingDays(sid); return w.length ? w[w.length - 1].d : today(); }
  function viewAttendance() {
    const sid = ui.attSite || defaultAttSite();
    ui.attSite = sid;
    const d = ui.attDate;
    const p = project(sid);
    const order = (r) => (r.status === "waiting" && r.out ? 0 : r.status === "waiting" ? 1 : r.status === "approved" ? 2 : 3);
    const recs = S.attendance.filter((a) => a.projectId === sid && a.date === d).sort((a, b) => order(a) - order(b));
    const expected = expectedWorkers(sid, d);
    const missing = expected.filter((w) => !recs.some((r) => r.workerId === w.id));
    const waiting = recs.filter((r) => r.status === "waiting" && r.out);
    const approved = recs.filter((r) => r.status === "approved").length;
    const sitePick = '<select class="input" style="min-height:44px;border-radius:999px;width:auto" data-change="attSite" aria-label="Site">' + S.projects.map((x) => '<option value="' + x.id + '"' + (x.id === sid ? " selected" : "") + ">" + esc(x.name) + "</option>").join("") + "</select>";
    const nav = '<div class="cal-head"><button class="icon-btn" data-action="att-day" data-step="-1" aria-label="Previous day">' + icon("left") + '</button><div class="cal-month" style="min-width:150px">' + (d === today() ? "Today" : fmtDay(d)) + '</div><button class="icon-btn" data-action="att-day" data-step="1" aria-label="Next day"' + (d >= today() ? " disabled" : "") + ">" + icon("right") + "</button></div>";

    const cards = recs.map((r) => {
      const w = worker(r.workerId); if (!w) return "";
      const h = calcHours(r);
      const st = r.status === "approved" ? chip("Approved", "good", "check") : r.status === "rejected" ? chip("Rejected", "bad") : !r.out ? chip("On site", "info") : chip("Waiting for check", "warn");
      const pay = can.seePay() && r.out && r.status !== "rejected" ? '<span class="muted small">Pay ' + RM(Math.round(payFor(r))) + "</span>" : "";
      return '<div class="att-card ' + r.status + '"><div class="row-between"><div class="row" style="gap:10px;min-width:0"><div class="li-main"><div class="li-title">' + esc(w.name) + '</div><div class="li-sub">' + esc(crew(w.crewId) ? crew(w.crewId).name : "") + "</div></div></div>" + st + "</div>" +
        '<div class="att-photos"><figure>' + img(r.inPhoto, "", w.name + " clock in") + "<figcaption>In " + esc(r.in) + "</figcaption></figure><figure>" + (r.out ? img(r.outPhoto, "", w.name + " clock out") : '<div class="photo-missing">Not out yet</div>') + "<figcaption>" + (r.out ? "Out " + esc(r.out) : "&nbsp;") + "</figcaption></figure></div>" +
        '<div class="row-between wrap"><div class="att-hours">' + esc(hoursText(h)) + (h && h.changed ? ' <span class="chip info" title="' + esc(r.adjust.reason || "") + '">Changed by site manager</span>' : h && !h.open ? ' <span class="muted small">(automatic)</span>' : "") + "</div>" + pay + "</div>" +
        (r.note ? '<div class="small muted">' + esc(r.note) + "</div>" : "") +
        (can.approve() ? '<div class="att-actions">' + (r.status !== "approved" ? '<button class="btn btn-sm btn-primary" data-action="att-ok" data-id="' + r.id + '"' + (!r.out ? " disabled" : "") + ">" + icon("check") + "Approve</button>" : "") +
          '<button class="btn btn-sm btn-soft" data-action="att-edit" data-id="' + r.id + '">' + icon("edit") + "Change</button>" +
          (r.status !== "rejected" ? '<button class="btn btn-sm btn-danger" data-action="att-no" data-id="' + r.id + '" aria-label="Reject">' + icon("x") + "</button>" : "") + "</div>" : "") +
        "</div>";
    }).join("");

    return '<div class="page-head"><div><h1 class="page-title">Check attendance</h1><p class="page-sub">' + (can.approve() ? "Look at each photo and the hours. Hours are worked out automatically, but you have the final say." : "Only the site manager can approve or change attendance. You can see everything here.") + "</p></div>" +
      (can.approve() && waiting.length ? '<button class="btn btn-primary" data-action="att-all">' + icon("check") + (waiting.length === 1 ? "Approve 1 waiting" : "Approve all " + waiting.length + " waiting") + "</button>" : "") + "</div>" +
      '<div class="row-between wrap" style="margin-bottom:16px">' + nav + sitePick + "</div>" +
      (waitingDays(sid).filter((x) => x.d !== d).length ? '<div class="wait-days small"><span class="muted">Also waiting for a check:</span>' + waitingDays(sid).filter((x) => x.d !== d).map((x) => '<button class="chip warn" data-action="att-goto" data-d="' + x.d + '">' + fmtDay(x.d) + " (" + x.n + ")</button>").join("") + "</div>" : "") +
      (p ? '<div class="card" style="margin-bottom:16px"><div class="row wrap" style="gap:20px"><div><span class="num" style="font-size:28px;font-weight:300">' + recs.length + '</span> <span class="muted">clocked in</span></div><div><span class="num" style="font-size:28px;font-weight:300">' + approved + '</span> <span class="muted">approved</span></div><div><span class="num" style="font-size:28px;font-weight:300">' + waiting.length + '</span> <span class="muted">waiting</span></div><div><span class="num" style="font-size:28px;font-weight:300">' + missing.length + '</span> <span class="muted">did not clock in</span></div>' +
        (can.seePay() ? '<div class="grow" style="text-align:right"><span class="muted">Wages for the day</span> <b class="num" style="font-weight:500">' + RM(Math.round(sum(recs.filter((r) => r.status === "approved"), payFor))) + "</b></div>" : "") + "</div></div>" : "") +
      (recs.length ? '<div class="att-grid">' + cards + "</div>" : '<div class="card">' + empty(isSunday(d) ? "Sunday. Rest day." : "Nobody clocked in at this site on this day.") + "</div>") +
      (missing.length ? '<div class="section">' + fold("att-missing", "Did not clock in", plural(missing.length, "worker") + " from the crews booked here", "", '<div class="list">' + missing.map((w) => '<div class="li">' + avatar(w) + '<div class="li-main"><div class="li-title">' + esc(w.name) + '</div><div class="li-sub">' + esc(crew(w.crewId).name) + "</div></div>" + (can.approve() ? '<button class="btn btn-sm btn-soft" data-action="att-add" data-w="' + w.id + '">Add by hand</button>' : "") + "</div>").join("") + "</div>") + "</div>" : "");
  }

  /* ---------- Workers & crews ---------- */
  function viewTeam() {
    const t = today();
    return '<div class="page-head"><div><h1 class="page-title">Workers &amp; crews</h1><p class="page-sub">' + plural(S.workers.length, "worker") + " in " + plural(S.crews.length, "crew") + ".</p></div>" +
      (can.manage() ? '<div class="row wrap"><button class="btn" data-action="new-crew">' + icon("plus") + 'New crew</button><button class="btn btn-primary" data-action="new-worker">' + icon("plus") + "Add worker</button></div>" : "") + "</div>" +
      S.crews.map((c) => {
        const ws = crewWorkers(c.id);
        const a = assignmentsOn(t).find((x) => x.crewId === c.id);
        return fold("crew-" + c.id, esc(c.name) + ' <span class="muted" style="font-weight:400">' + esc(c.trade) + "</span>", a ? "Today at " + esc(project(a.projectId).name) : "Free today", String(ws.length),
          '<div class="list">' + ws.map((w) => '<div class="li">' + avatar(w) + '<div class="li-main"><div class="li-title">' + esc(w.name) + (w.id === c.leaderId ? ' <span class="chip teal">Leader</span>' : "") + '</div><div class="li-sub">' + esc(w.phone || "") + "</div></div>" + (can.seePay() ? '<span class="muted small">' + RM(w.dayRate) + " a day</span>" : "") + "</div>").join("") + "</div>");
      }).join("") +
      '<div class="section"><h2 class="section-title">Crew bookings' + (can.manage() || role() === "site" ? ' <button class="btn btn-sm btn-primary" data-action="open-assign">Book a crew</button>' : "") + '</h2><div class="card"><div class="list">' +
      (S.assignments.length ? S.assignments.slice().sort((a, b) => a.from.localeCompare(b.from)).map((a) => { const c = crew(a.crewId), p = project(a.projectId); if (!c || !p) return ""; return '<div class="li"><span class="dot" style="background:' + p.color + '"></span><div class="li-main"><div class="li-title">' + esc(c.name) + " at " + esc(p.name) + '</div><div class="li-sub">' + fmtDate(a.from) + " to " + fmtDate(a.to) + "</div></div>" + (a.to < t ? chip("Finished", "") : a.from <= t ? chip("Now", "good") : chip("Coming", "info")) + (can.manage() ? '<button class="icon-btn" style="width:38px;height:38px;box-shadow:none;background:var(--bg)" data-action="asg-del" data-id="' + a.id + '" aria-label="Remove booking">' + icon("trash") + "</button>" : "") + "</div>"; }).join("") : empty("No bookings yet.")) +
      "</div></div></div>";
  }

  /* ---------- Settings ---------- */
  function viewSettings() {
    const s = S.settings;
    const dis = can.manage() ? "" : " disabled";
    return '<div class="page-head"><div><h1 class="page-title">Settings</h1><p class="page-sub">' + (can.manage() ? "Rules used to work out hours and overtime." : "Only management can change these.") + "</p></div></div>" +
      '<div class="grid-2"><div class="card"><h2 class="card-title">Working hours</h2>' +
      '<label class="field"><span>Company name</span><input class="input" data-setting="company" value="' + esc(S.company.name) + '"' + dis + "></label>" +
      '<label class="field"><span>Normal hours in a full day</span><input class="input" type="number" step="0.5" min="1" data-setting="normalHours" value="' + s.normalHours + '"' + dis + "></label>" +
      '<label class="field"><span>Lunch break <em>(hours, taken off if they worked more than ' + s.breakAfter + " hours)</em></span><input class=\"input\" type=\"number\" step=\"0.25\" min=\"0\" data-setting=\"breakHours\" value=\"" + s.breakHours + '"' + dis + "></label>" +
      '<label class="field"><span>Counts as half day if under <em>(hours)</em></span><input class="input" type="number" step="0.5" min="0" data-setting="halfDayUnder" value="' + s.halfDayUnder + '"' + dis + "></label>" +
      '<label class="field"><span>Overtime pay rate <em>(1.5 = time and a half)</em></span><input class="input" type="number" step="0.25" min="1" data-setting="otRate" value="' + s.otRate + '"' + dis + "></label>" +
      '<p class="small muted mt-12">Example with these rules: in 08:00, out 19:00 = ' + hoursText(calcHours({ in: "08:00", out: "19:00" })) + ".</p></div>" +
      '<div class="stack"><div class="card"><h2 class="card-title">Worker photos and privacy</h2>' +
      '<label class="field"><span>Keep clock-in photos for this many days after the pay month ends</span><input class="input" type="number" min="1" data-setting="photoKeepDays" value="' + s.photoKeepDays + '"' + dis + "></label>" +
      '<p class="small muted mt-12">Photos are only used to confirm attendance and pay (PDPA). Example: a photo taken on 3 November is kept until ' + fmtDate(addDays("2026-11-30", s.photoKeepDays)) + ", then deleted automatically.</p></div>" +
      '<div class="card"><h2 class="card-title">Data on this device</h2><p class="small muted mt-8">This prototype saves everything in this browser only. Nothing is sent to a server.</p>' +
      '<div class="row wrap mt-16"><button class="btn btn-soft" data-action="reset-sample">' + icon("refresh") + 'Reload sample data</button><button class="btn btn-danger" data-action="wipe">' + icon("trash") + "Clear everything</button></div></div></div></div>";
  }

  /* ======================================================================
     6. Sheets (pop-up forms)
     ====================================================================== */
  function openSheet(state) { ui.sheet = Object.assign({ f: {} }, state); renderSheet(); $("#sheetWrap").hidden = false; document.body.style.overflow = "hidden"; setTimeout(() => { const el = $("#sheet [autofocus]"); if (el && window.innerWidth > 760) el.focus(); }, 60); }
  function closeSheet() { ui.sheet = null; $("#sheetWrap").hidden = true; document.body.style.overflow = ""; }
  function renderSheet() {
    const s = ui.sheet; if (!s) return;
    const fn = SHEETS[s.type];
    const el = $("#sheet");
    const scroll = el.scrollTop;
    el.className = "sheet" + (s.wide ? " wide" : "");
    el.innerHTML = fn(s);
    el.scrollTop = scroll;
    hydratePhotos();
  }
  const sheetHead = (title) => '<div class="sheet-head"><h2>' + title + '</h2><button class="icon-btn" style="box-shadow:none;background:var(--bg)" data-action="close-sheet" aria-label="Close">' + icon("x") + "</button></div>";
  const F = () => ui.sheet.f;
  const val = (k, d) => (F()[k] != null ? F()[k] : d);
  const projOptions = (sel, withNone, noneLabel) => (withNone ? '<option value="">' + (noneLabel || "Office / no project") + "</option>" : "") + S.projects.map((p) => '<option value="' + p.id + '"' + (sel === p.id ? " selected" : "") + ">" + esc(p.name) + "</option>").join("");
  const choiceRow = (name, opts, cur) => '<div class="choice-row">' + opts.map((o) => '<button type="button" class="choice ' + (cur === o ? "on" : "") + '" data-action="pick" data-k="' + name + '" data-v="' + esc(o) + '">' + esc(o) + "</button>").join("") + "</div>";
  const errBox = () => (ui.sheet.err ? '<div class="form-error">' + ui.sheet.err + "</div>" : "");

  const SHEETS = {
    log() {
      const tile = (act, ic, title, sub) => '<button class="log-tile" data-action="' + act + '"><span class="ic">' + icon(ic) + "</span><span><b>" + title + "</b><span>" + sub + "</span></span></button>";
      return sheetHead("What do you want to log?") +
        '<div class="log-tiles">' +
        tile("open-clock", "camera", "Clock in / out", "Worker arrives or leaves") +
        tile("open-receipt", "receipt", "Receipt or cash", "Snap it, type the amount") +
        tile("open-material", "truck", "Material in / out", "Delivery or used on site") +
        tile("open-delay", "hourglass", "Delay a job", "Rain, late material…") +
        "</div>";
    },

    clock(s) {
      const t = today();
      const sid = s.siteId;
      if (s.step === "confirm") {
        const w = worker(s.workerId);
        return sheetHead(s.action === "in" ? "Clock in" : "Clock out") +
          '<img class="clock-preview" src="' + (photoSync(s.photo) || s.photo) + '" alt="Photo of ' + esc(w.name) + '">' +
          '<p style="text-align:center;font-size:20px;margin-top:16px"><b style="font-weight:500">' + esc(w.name) + "</b><br>" +
          '<span class="muted">' + (s.action === "in" ? "Clocking in" : "Clocking out") + " at " + esc(s.time) + ", " + esc(project(sid).name) + "</span></p>" +
          '<div class="sheet-foot"><button class="btn btn-soft btn-big" data-action="clock-retake">Retake photo</button><button class="btn btn-primary btn-big" data-action="clock-save">' + icon("check") + "Confirm</button></div>";
      }
      const recs = S.attendance.filter((a) => a.projectId === sid && a.date === t);
      const exp = expectedWorkers(sid, t);
      const q = (s.q || "").toLowerCase();
      const others = S.workers.filter((w) => !exp.includes(w));
      const row = (w) => {
        const r = recs.find((x) => x.workerId === w.id);
        let right;
        if (!r) right = '<button class="btn btn-primary" data-action="clock-pick" data-w="' + w.id + '" data-act="in">' + icon("camera") + "Clock in</button>";
        else if (!r.out) right = '<button class="btn btn-blue" data-action="clock-pick" data-w="' + w.id + '" data-act="out">' + icon("camera") + "Clock out</button>";
        else right = '<span class="muted small">' + r.in + "–" + r.out + "</span>";
        return '<div class="worker-row">' + avatar(w, r && r.inPhoto) + '<div class="li-main"><div class="li-title">' + esc(w.name) + '</div><div class="li-sub">' + esc(crew(w.crewId) ? crew(w.crewId).name : "") + (r && !r.out ? ", in since " + r.in : "") + "</div></div>" + right + "</div>";
      };
      const match = (w) => !q || w.name.toLowerCase().includes(q);
      const listA = exp.filter(match), listB = others.filter(match);
      return sheetHead("Clock in / out") +
        (!S.flags.privacySeen ? '<div class="form-note row" style="align-items:flex-start;gap:12px"><div class="grow">A photo is taken each time a worker clocks in or out. Photos are only used to check attendance and pay, and are deleted ' + S.settings.photoKeepDays + ' days after the pay month ends.</div><button class="btn btn-sm" data-action="privacy-ok">Got it</button></div>' : "") +
        '<label class="field"><span>Site</span><select class="input" data-change="clockSite">' + projOptions(sid) + "</select></label>" +
        '<div class="search mt-12">' + icon("search") + '<input class="input" type="search" placeholder="Type a name" value="' + esc(s.q || "") + '" data-input="clockQ" aria-label="Find worker" autofocus></div>' +
        '<div class="mt-12">' + (listA.length ? '<div class="day-sec-title">Booked here today</div>' + listA.map(row).join("") : !q ? '<p class="muted small">No crew is booked here today.</p>' : "") +
        (listB.length && (q || !listA.length) ? '<div class="day-sec-title mt-16">Other workers</div>' + listB.slice(0, q ? 50 : 15).map(row).join("") : "") +
        (q && !listA.length && !listB.length ? '<p class="muted">Nobody called “' + esc(s.q) + "”.</p>" : "") + "</div>" +
        '<p class="small muted mt-16">No camera on this computer? <button class="link-btn small" data-action="clock-demo-toggle">' + (s.demoPhoto ? "Using demo photos, tap to use camera" : "Use demo photos instead") + "</button></p>";
    },

    receipt(s) {
      const kind = val("kind", s.kind || "spent");
      const isSpent = kind === "spent";
      return sheetHead("Receipt or cash") +
        '<div class="seg full mt-12"><button class="' + (kind === "spent" ? "on" : "") + '" data-action="pick" data-k="kind" data-v="spent">I paid</button><button class="' + (kind === "bill" ? "on" : "") + '" data-action="pick" data-k="kind" data-v="bill">Bill to pay later</button>' +
        (can.seeMoney() ? '<button class="' + (kind === "in" ? "on" : "") + '" data-action="pick" data-k="kind" data-v="in">Money coming in</button>' : "") + "</div>" +
        (kind !== "in" ? '<div class="field"><span>Photo of the ' + (isSpent ? "receipt" : "invoice") + ' <em>(recommended)</em></span><button type="button" class="photo-box" data-action="receipt-photo">' + (val("photo") ? '<img src="' + val("photo") + '" alt="Receipt photo">' : icon("camera") + "Snap a photo") + "</button></div>" : "") +
        '<label class="field"><span>Amount</span><div class="input-money"><input class="input num" inputmode="decimal" type="number" step="0.01" min="0" placeholder="0.00" data-f="amount" value="' + esc(val("amount", "")) + '" autofocus></div></label>' +
        '<label class="field"><span>' + (kind === "in" ? "What is it for" : "What did you pay for") + '</span><input class="input" placeholder="' + (kind === "in" ? "e.g. Progress claim #6" : "e.g. Cement, 50 bags") + '" data-f="what" value="' + esc(val("what", "")) + '"></label>' +
        '<label class="field"><span>Project</span><select class="input" data-f="projectId">' + projOptions(val("projectId", role() === "site" ? siteId() : ""), true) + "</select></label>" +
        (isSpent ? '<div class="field"><span>Paid by</span>' + choiceRow("paidBy", ["Cash", "Bank transfer", "Card"], val("paidBy", "Cash")) + "</div>" :
          '<label class="field"><span>' + (kind === "in" ? "Expected on" : "Due on") + '</span><input class="input" type="date" data-f="date" value="' + esc(val("date", addDays(today(), 14))) + '"></label>') +
        fold("receipt-more", "More details", "Supplier, receipt number, note", "",
          '<label class="field" style="margin-top:0"><span>' + (kind === "in" ? "From (client)" : "Supplier / shop") + '</span><input class="input" data-f="supplier" value="' + esc(val("supplier", "")) + '"></label>' +
          '<label class="field"><span>Receipt / invoice no.</span><input class="input" data-f="ref" value="' + esc(val("ref", "")) + '"></label>' +
          (isSpent ? '<label class="field"><span>Date paid</span><input class="input" type="date" data-f="date" value="' + esc(val("date", today())) + '"></label>' : "") +
          '<label class="field"><span>Note</span><textarea class="input" data-f="note">' + esc(val("note", "")) + "</textarea></label>", { cls: "flat" }) +
        errBox() +
        '<div class="sheet-foot"><button class="btn btn-primary btn-big" data-action="receipt-save">' + icon("check") + "Save</button></div>";
    },

    material(s) {
      const kind = val("kind", s.kind || "in");
      const mid = val("materialId", s.mat || (S.materials[0] ? S.materials[0].id : "__new"));
      const m = material(mid);
      const qty = val("qty", "");
      const direct = val("direct", false);
      const warn = kind === "out" && m && +qty > m.qty ? '<div class="form-warn">The yard only has ' + m.qty + " " + esc(m.unit) + ". Saving will show a negative number until the count is fixed.</div>" : "";
      return sheetHead("Material in / out") +
        '<div class="seg full mt-12"><button class="' + (kind === "in" ? "on" : "") + '" data-action="pick" data-k="kind" data-v="in">' + icon("in", ' style="width:17px;height:17px;vertical-align:-3px"') + ' Arrived</button><button class="' + (kind === "out" ? "on" : "") + '" data-action="pick" data-k="kind" data-v="out">' + icon("out", ' style="width:17px;height:17px;vertical-align:-3px"') + " Used or sent to site</button></div>" +
        '<label class="field"><span>Which material</span><select class="input" data-f="materialId" data-rerender="1">' + CATS.map((c) => { const ms = S.materials.filter((x) => catOf(x) === c.id); return ms.length ? '<optgroup label="' + esc(c.name) + '">' + ms.map((x) => '<option value="' + x.id + '"' + (x.id === mid ? " selected" : "") + ">" + esc(x.name) + " (yard: " + x.qty + " " + esc(x.unit) + ")</option>").join("") + "</optgroup>" : ""; }).join("") + '<option value="__new"' + (mid === "__new" ? " selected" : "") + ">+ A new material</option></select></label>" +
        (mid === "__new" ? '<div class="grid-2" style="gap:12px"><label class="field"><span>Name</span><input class="input" data-f="newName" value="' + esc(val("newName", "")) + '" placeholder="e.g. Tile adhesive"></label><label class="field"><span>Counted in</span><input class="input" data-f="newUnit" value="' + esc(val("newUnit", "")) + '" placeholder="bags, pcs, tonnes"></label></div>' +
          '<label class="field"><span>Category</span><select class="input" data-f="newCat"><option value="">Choose for me</option>' + CATS.map((c) => '<option value="' + c.id + '"' + (val("newCat") === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>").join("") + "</select></label>" : "") +
        '<div class="field"><span>How many' + (m ? " " + esc(m.unit) : "") + '</span><div class="stepper"><button type="button" data-action="qty-step" data-step="-1" aria-label="Less">−</button><input class="input num" type="number" inputmode="numeric" min="0" data-f="qty" value="' + esc(qty) + '" placeholder="0" autofocus><button type="button" data-action="qty-step" data-step="1" aria-label="More">+</button></div></div>' +
        '<label class="field"><span>' + (kind === "out" ? "Which project" : "Project <em>(only if it went straight to site)</em>") + '</span><select class="input" data-f="projectId" data-rerender="1">' + projOptions(val("projectId", kind === "out" && role() === "site" ? siteId() : ""), true, kind === "out" ? "Choose a project" : "No, it went to the yard") + "</select></label>" +
        (kind === "in" && val("projectId", "") ? '<div class="form-note">Goes straight to site, so the yard count will not change.</div>' : "") +
        '<label class="field"><span>Note <em>(optional)</em></span><input class="input" data-f="note" value="' + esc(val("note", "")) + '" placeholder="e.g. Delivery order no. or supplier"></label>' +
        warn + errBox() +
        '<div class="sheet-foot"><button class="btn btn-primary btn-big" data-action="material-save">' + icon("check") + "Save</button></div>";
    },

    delay(s) {
      const pid = val("projectId", s.id || (role() === "site" ? siteId() : (activeProjects()[0] || {}).id));
      const p = project(pid);
      const days = +val("days", 1);
      return sheetHead("Delay a job") +
        '<label class="field"><span>Which job</span><select class="input" data-f="projectId" data-rerender="1">' + projOptions(pid) + "</select></label>" +
        '<div class="field"><span>How many days</span><div class="stepper"><button type="button" data-action="days-step" data-step="-1" aria-label="Fewer days">−</button><input class="input num" type="number" min="1" data-f="days" data-rerender="1" value="' + days + '"><button type="button" data-action="days-step" data-step="1" aria-label="More days">+</button></div></div>' +
        '<div class="field"><span>Why</span>' + choiceRow("reason", ["Rain", "Material late", "Not enough workers", "Client changed plans", "Machine broke down", "Other"], val("reason", "")) + "</div>" +
        '<label class="field"><span>Details <em>(optional)</em></span><textarea class="input" data-f="note" placeholder="What happened?">' + esc(val("note", "")) + "</textarea></label>" +
        (p ? '<div class="form-note">New finish date: <b>' + fmtDate(addDays(p.end, days || 0)) + "</b> (was " + fmtDate(p.end) + ").</div>" : "") +
        errBox() +
        '<div class="sheet-foot"><button class="btn btn-primary btn-big" data-action="delay-save">' + icon("check") + "Save delay</button></div>";
    },

    assign(s) {
      const from = val("from", s.d || today());
      const free = freeCrews(from);
      return sheetHead("Book a crew") +
        '<label class="field"><span>Crew</span><select class="input" data-f="crewId" data-rerender="1">' + S.crews.map((c) => '<option value="' + c.id + '"' + (val("crewId", (free[0] || S.crews[0] || {}).id) === c.id ? " selected" : "") + ">" + esc(c.name) + ", " + esc(c.trade) + (free.includes(c) ? " (free)" : "") + "</option>").join("") + "</select></label>" +
        '<label class="field"><span>Project</span><select class="input" data-f="projectId">' + projOptions(val("projectId", (activeProjects()[0] || {}).id)) + "</select></label>" +
        '<div class="grid-2" style="gap:12px"><label class="field"><span>From</span><input class="input" type="date" data-f="from" data-rerender="1" value="' + esc(from) + '"></label><label class="field"><span>To</span><input class="input" type="date" data-f="to" value="' + esc(val("to", addDays(from, 13))) + '"></label></div>' +
        '<div class="form-note">Free on ' + fmtDay(from) + ": " + (free.length ? free.map((c) => esc(c.name)).join(", ") : "no crews") + ".</div>" +
        errBox() +
        '<div class="sheet-foot"><button class="btn btn-primary btn-big" data-action="assign-save">' + icon("check") + "Book crew</button></div>";
    },

    attEdit(s) {
      const r = s.recId ? S.attendance.find((a) => a.id === s.recId) : null;
      const w = worker(r ? r.workerId : s.workerId);
      const inT = val("in", r ? r.in : "08:00"), outT = val("out", r && r.out ? r.out : "17:00");
      const auto = calcHours({ in: inT, out: outT }).auto;
      const cur = r && r.adjust ? r.adjust : null;
      return sheetHead(r ? "Change attendance" : "Add by hand") +
        '<p class="muted">' + esc(w.name) + ", " + fmtDayLong(r ? r.date : ui.attDate) + "</p>" +
        '<div class="grid-2" style="gap:12px"><label class="field"><span>Time in</span><input class="input" type="time" data-f="in" data-rerender="1" value="' + esc(inT) + '"></label><label class="field"><span>Time out</span><input class="input" type="time" data-f="out" data-rerender="1" value="' + esc(outT) + '"></label></div>' +
        '<div class="form-note">Automatic: ' + esc(hoursText({ final: auto })) + ".</div>" +
        '<div class="grid-2" style="gap:12px"><label class="field"><span>Normal hours</span><input class="input" type="number" step="0.5" min="0" data-f="normal" value="' + esc(val("normal", cur ? cur.normal : auto.normal)) + '"></label><label class="field"><span>OT hours</span><input class="input" type="number" step="0.5" min="0" data-f="ot" value="' + esc(val("ot", cur ? cur.ot : auto.ot)) + '"></label></div>' +
        '<div class="field"><span>Day</span>' + choiceRow("dayType", ["Full day", "Half day"], val("dayType", (cur ? cur.half : auto.half) ? "Half day" : "Full day")) + "</div>" +
        '<label class="field"><span>Reason <em>(required, so the boss knows why)</em></span><input class="input" data-f="reason" value="' + esc(val("reason", cur ? cur.reason : r ? "" : "Forgot to clock in")) + '" placeholder="e.g. Forgot to clock out, left at 6pm"></label>' +
        errBox() +
        '<div class="sheet-foot">' + (cur ? '<button class="btn btn-soft btn-big" data-action="att-auto">Use automatic</button>' : "") + '<button class="btn btn-primary btn-big" data-action="att-edit-save">' + icon("check") + "Save and approve</button></div>";
    },

    need(s) {
      return sheetHead("Add something to buy") +
        '<label class="field"><span>Material</span><select class="input" data-f="materialId">' + S.materials.map((x) => '<option value="' + x.id + '"' + (val("materialId", s.mat) === x.id ? " selected" : "") + ">" + esc(x.name) + "</option>").join("") + "</select></label>" +
        '<label class="field"><span>How many</span><input class="input num" type="number" min="1" data-f="qty" value="' + esc(val("qty", "")) + '" autofocus></label>' +
        '<label class="field"><span>For which project</span><select class="input" data-f="projectId">' + projOptions(val("projectId", ""), true, "The yard (stock up)") + "</select></label>" +
        '<label class="field"><span>Needed by</span><input class="input" type="date" data-f="by" value="' + esc(val("by", addDays(today(), 5))) + '"></label>' +
        '<label class="field"><span>Note <em>(optional)</em></span><input class="input" data-f="note" value="' + esc(val("note", "")) + '"></label>' +
        errBox() + '<div class="sheet-foot"><button class="btn btn-primary btn-big" data-action="need-save">' + icon("check") + "Add to buy list</button></div>";
    },

    project() {
      return sheetHead("New project") +
        '<label class="field"><span>Project name</span><input class="input" data-f="name" value="' + esc(val("name", "")) + '" placeholder="e.g. Kajang Warehouse" autofocus></label>' +
        '<label class="field"><span>Client</span><input class="input" data-f="client" value="' + esc(val("client", "")) + '"></label>' +
        '<label class="field"><span>Location</span><input class="input" data-f="location" value="' + esc(val("location", "")) + '"></label>' +
        '<div class="field"><span>Type of building</span>' + choiceRow("type", ["Factory", "Warehouse"], val("type", "Factory")) + "</div>" +
        '<div class="grid-2" style="gap:12px"><label class="field"><span>Start</span><input class="input" type="date" data-f="start" value="' + esc(val("start", today())) + '"></label><label class="field"><span>Planned finish</span><input class="input" type="date" data-f="end" value="' + esc(val("end", addDays(today(), 180))) + '"></label></div>' +
        '<label class="field"><span>Contract value</span><div class="input-money"><input class="input num" type="number" min="0" data-f="value" value="' + esc(val("value", "")) + '"></div></label>' +
        errBox() + '<div class="sheet-foot"><button class="btn btn-primary btn-big" data-action="project-save">' + icon("check") + "Create project</button></div>";
    },

    worker() {
      return sheetHead("Add worker") +
        '<label class="field"><span>Full name</span><input class="input" data-f="name" value="' + esc(val("name", "")) + '" autofocus></label>' +
        '<label class="field"><span>Crew</span><select class="input" data-f="crewId">' + S.crews.map((c) => '<option value="' + c.id + '"' + (val("crewId") === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>").join("") + "</select></label>" +
        '<label class="field"><span>Day rate</span><div class="input-money"><input class="input num" type="number" min="0" data-f="dayRate" value="' + esc(val("dayRate", "")) + '"></div></label>' +
        '<label class="field"><span>Phone <em>(optional)</em></span><input class="input" type="tel" data-f="phone" value="' + esc(val("phone", "")) + '"></label>' +
        errBox() + '<div class="sheet-foot"><button class="btn btn-primary btn-big" data-action="worker-save">' + icon("check") + "Add worker</button></div>";
    },

    crew() {
      return sheetHead("New crew") +
        '<label class="field"><span>Crew name</span><input class="input" data-f="name" value="' + esc(val("name", "Crew " + String.fromCharCode(65 + S.crews.length))) + '" autofocus></label>' +
        '<label class="field"><span>What they do</span><input class="input" data-f="trade" value="' + esc(val("trade", "")) + '" placeholder="e.g. Plastering"></label>' +
        errBox() + '<div class="sheet-foot"><button class="btn btn-primary btn-big" data-action="crew-save">' + icon("check") + "Create crew</button></div>";
    },

    zoom(s) { return sheetHead("Photo") + '<div class="lightbox"><img src="' + s.src + '" alt="Photo"></div>'; },

    confirm(s) {
      return sheetHead(s.title) + '<p class="muted mt-8">' + s.text + "</p>" +
        '<div class="sheet-foot"><button class="btn btn-soft btn-big" data-action="close-sheet">Cancel</button><button class="btn btn-big ' + (s.danger ? "btn-danger" : "btn-primary") + '" data-action="confirm-yes">' + s.yes + "</button></div>";
    }
  };

  /* ======================================================================
     7. Actions
     ====================================================================== */
  let toastTimer = 0;
  function toast(msg, ic) {
    const t = $("#toast");
    t.innerHTML = icon(ic || "check") + "<span>" + msg + "</span>";
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }
  function fail(msg) { ui.sheet.err = msg; renderSheet(); }
  function commit(msg) { save(); closeSheet(); render(); if (msg) toast(msg); }

  function askConfirm(title, text, yes, danger, onYes) { openSheet({ type: "confirm", title, text, yes, danger, onYes }); }

  async function loadSample() {
    await PhotoDB.clear();
    S = window.SampleData.buildSampleData();
    ui.open.clear();
    save(); purgeOldPhotos();
    location.hash = "#/today";
    render();
    toast("Sample data loaded. Try switching “Viewing as” at the top.");
  }

  const A = {
    "load-sample": loadSample,
    "start-empty"() { S = window.SampleData.buildEmptyData(); save(); location.hash = "#/projects"; render(); toast("Empty app ready. Start by adding a project."); },
    "reset-sample"() { ui.menu = false; askConfirm("Reload sample data?", "This replaces everything on this device with fresh sample data.", "Reload", false, loadSample); },
    wipe() { ui.menu = false; askConfirm("Clear everything?", "All projects, workers, photos and receipts on this device will be deleted. This cannot be undone.", "Delete everything", true, async () => { await PhotoDB.clear(); localStorage.removeItem(KEY); S = null; closeSheet(); location.hash = "#/today"; render(); }); },
    "confirm-yes"() { const fn = ui.sheet && ui.sheet.onYes; if (fn) fn(); },
    menu() { ui.menu = !ui.menu; renderTop(); },
    "close-sheet": closeSheet,
    "open-log"() { openSheet({ type: "log" }); },

    zoom(el) {
      if (el.closest("#sheet")) return;
      const src = el.getAttribute("src");
      if (src && src !== BLANK) openSheet({ type: "zoom", src });
    },
    "hero-mode"(el) { ui.heroMode[el.dataset.id] = el.dataset.mode; render(); },
    pick(el) { F()[el.dataset.k] = el.dataset.v; ui.sheet.err = null; renderSheet(); },
    "privacy-ok"() { S.flags.privacySeen = true; save(); renderSheet(); },

    /* clock in / out */
    "open-clock"() { openSheet({ type: "clock", siteId: role() === "site" ? siteId() : (activeProjects()[0] || S.projects[0] || {}).id, q: "", demoPhoto: !("ontouchstart" in window) }); if (!S.projects.length) { closeSheet(); toast("Add a project first.", "alert"); } },
    "clock-demo-toggle"() { ui.sheet.demoPhoto = !ui.sheet.demoPhoto; renderSheet(); },
    "clock-pick"(el) {
      const s = ui.sheet; s.workerId = el.dataset.w; s.action = el.dataset.act;
      const go = (photo) => { if (!photo) return; s.photo = photo; s.time = nowHM(); s.step = "confirm"; renderSheet(); };
      if (s.demoPhoto) go("demo-face:" + s.workerId);
      else takePhoto("user").then(go);
    },
    "clock-retake"() {
      const s = ui.sheet;
      if (s.demoPhoto) { s.step = "list"; renderSheet(); return; }
      takePhoto("user").then((p) => { if (p) { s.photo = p; s.time = nowHM(); renderSheet(); } });
    },
    async "clock-save"() {
      const s = ui.sheet, t = today(), w = worker(s.workerId);
      const ref = await storePhoto(s.photo);
      if (s.action === "in") {
        S.attendance.push({ id: uid("at"), workerId: w.id, projectId: s.siteId, date: t, in: s.time, out: null, inPhoto: ref, outPhoto: null, status: "waiting", adjust: null, note: "" });
      } else {
        const r = S.attendance.find((a) => a.workerId === w.id && a.date === t && a.projectId === s.siteId && !a.out);
        if (r) { r.out = s.time; r.outPhoto = ref; }
      }
      save();
      toast(esc(w.name) + (s.action === "in" ? " clocked in at " : " clocked out at ") + s.time);
      s.step = "list"; s.q = ""; s.photo = null;
      renderSheet(); render();
    },

    /* receipts & money */
    "open-receipt"(el) { openSheet({ type: "receipt", kind: el && el.dataset.kind }); },
    "receipt-photo"() { takePhoto("environment").then((p) => { if (p) { F().photo = p; renderSheet(); } }); },
    async "receipt-save"() {
      const f = F(), kind = f.kind || ui.sheet.kind || "spent";
      const amount = parseFloat(f.amount);
      if (!(amount > 0)) return fail("Type the amount, for example 125.50.");
      if (!(f.what || "").trim()) return fail(kind === "in" ? "Say what the payment is for." : "Say what you paid for, for example “Cement, 50 bags”.");
      const photo = f.photo ? await storePhoto(f.photo) : null;
      const pid = f.projectId != null ? f.projectId : (role() === "site" ? siteId() : "");
      S.money.push({
        id: uid("mo"), dir: kind === "in" ? "in" : "out", status: kind === "spent" ? "paid" : "expected",
        date: f.date || (kind === "spent" ? today() : addDays(today(), 14)), amount, what: f.what.trim(), projectId: pid || null,
        paidBy: kind === "spent" ? (f.paidBy || "Cash") : "", supplier: f.supplier || "", ref: f.ref || "", note: f.note || "", photo, by: role()
      });
      const p = project(pid);
      commit((kind === "in" ? "Expected payment saved: " : kind === "bill" ? "Bill saved: " : "Saved: ") + RM(amount) + " for " + esc(f.what.trim()) + (p ? ", " + esc(p.name) : ""));
    },
    "money-paid"(el) {
      const m = S.money.find((x) => x.id === el.dataset.id); if (!m) return;
      m.status = "paid"; m.date = today(); m.paidBy = m.paidBy || "Bank transfer";
      save(); render(); toast(m.dir === "in" ? "Marked as received: " + RM(m.amount) : "Marked as paid: " + RM(m.amount));
    },
    "money-del"(el) {
      const m = S.money.find((x) => x.id === el.dataset.id); if (!m) return;
      askConfirm("Delete this entry?", esc(m.what) + ", " + RM(m.amount) + ". This cannot be undone.", "Delete", true, () => {
        if (m.photo && !m.photo.startsWith("demo-")) PhotoDB.del(m.photo);
        S.money = S.money.filter((x) => x.id !== m.id); commit("Deleted.");
      });
    },
    "money-month"(el) { const [y, m] = ui.moneyMonth.split("-").map(Number); const d = new Date(y, m - 1 + +el.dataset.step, 1); ui.moneyMonth = toISO(d).slice(0, 7); render(); },
    "export-csv"() {
      const mk = ui.moneyMonth;
      const rows = S.money.filter((m) => monthKey(m.date) === mk || m.status === "expected").sort((a, b) => a.date.localeCompare(b.date));
      const head = ["Date", "Type", "Status", "Description", "Project", "Amount (RM)", "Paid by", "Supplier / client", "Receipt / invoice no.", "Has photo", "Logged by", "Note"];
      const typ = (m) => (m.dir === "in" ? "Money in" : m.status === "paid" ? "Money out" : "Bill");
      const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
      const csv = [head].concat(rows.map((m) => [fmtDate(m.date), typ(m), m.status === "paid" ? (m.dir === "in" ? "Received" : "Paid") : "Not yet", m.what, project(m.projectId) ? project(m.projectId).name : "Office / no project", m.amount.toFixed(2), m.paidBy || "", m.supplier || "", m.ref || "", m.photo ? "Yes" : "No", ROLE_LABEL[m.by] || m.by, m.note || ""])).map((r) => r.map(q).join(",")).join("\r\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = S.company.name.replace(/\W+/g, "-") + "-money-" + mk + ".csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast("Downloaded " + rows.length + " entries. Open it in Excel or send it to your accountant.", "download");
    },

    /* materials */
    "open-material"(el) { openSheet({ type: "material", kind: el && el.dataset.kind, mat: el && el.dataset.mat }); },
    "qty-step"(el) { const f = F(); f.qty = Math.max(0, (parseFloat(f.qty) || 0) + +el.dataset.step); renderSheet(); },
    "days-step"(el) { const f = F(); f.days = Math.max(1, (parseInt(f.days, 10) || 1) + +el.dataset.step); renderSheet(); },
    "material-save"() {
      const s = ui.sheet, f = F(), kind = f.kind || s.kind || "in";
      let mid = f.materialId || s.mat || (S.materials[0] ? S.materials[0].id : "__new");
      const qty = parseFloat(f.qty);
      if (!(qty > 0)) return fail("Type how many.");
      if (mid === "__new") {
        if (!(f.newName || "").trim()) return fail("Type the name of the new material.");
        const m = { id: uid("m"), name: f.newName.trim(), unit: (f.newUnit || "pcs").trim(), qty: 0, min: 0 };
        m.cat = f.newCat || catOf(m);
        S.materials.push(m); mid = m.id;
      }
      const m = material(mid);
      const pid = f.projectId != null ? f.projectId : (kind === "out" && role() === "site" ? siteId() : "");
      if (kind === "out" && !pid) return fail("Choose which project the material went to.");
      const moveKind = kind === "in" ? (pid ? "direct" : "in") : "out";
      if (moveKind === "in") m.qty += qty;
      if (moveKind === "out") m.qty -= qty;
      S.moves.push({ id: uid("mv"), date: today(), materialId: mid, qty, kind: moveKind, projectId: pid || null, note: f.note || "", by: role() });
      commit(moveKind === "direct" ? qty + " " + esc(m.unit) + " of " + esc(m.name) + " delivered to " + esc(project(pid).name) : moveKind === "in" ? "Added " + qty + " " + esc(m.unit) + ". Yard now has " + m.qty + "." : "Took out " + qty + " " + esc(m.unit) + ". Yard now has " + m.qty + ".");
    },
    "need-status"(el) {
      const n = S.needs.find((x) => x.id === el.dataset.id); if (!n) return;
      n.status = el.dataset.to;
      if (n.status === "arrived") S.moves.push({ id: uid("mv"), date: today(), materialId: n.materialId, qty: n.qty, kind: n.projectId ? "direct" : "in", projectId: n.projectId || null, note: "Delivery for buy list", by: role() });
      if (n.status === "arrived" && !n.projectId) material(n.materialId).qty += n.qty;
      save(); render(); toast(n.status === "ordered" ? "Marked as ordered." : "Marked as arrived.");
    },
    "need-yard"(el) {
      const n = S.needs.find((x) => x.id === el.dataset.id); const m = n && material(n.materialId); if (!m) return;
      m.qty -= n.qty; n.status = "arrived";
      S.moves.push({ id: uid("mv"), date: today(), materialId: m.id, qty: n.qty, kind: "out", projectId: n.projectId, note: "Sent from yard", by: role() });
      save(); render(); toast("Sent " + n.qty + " " + esc(m.unit) + " from the yard. " + m.qty + " left.");
    },
    "new-need"(el) { if (!S.materials.length) return toast("Add a material first with “Material in”.", "alert"); openSheet({ type: "need", mat: el && el.dataset.mat }); },
    "need-save"() {
      const f = F(), qty = parseFloat(f.qty);
      if (!(qty > 0)) return fail("Type how many are needed.");
      S.needs.push({ id: uid("n"), materialId: f.materialId || ui.sheet.mat || S.materials[0].id, qty, projectId: f.projectId || null, by: f.by || addDays(today(), 5), status: "to buy", note: f.note || "" });
      commit("Added to the buy list.");
    },
    "stock-tab"(el) { ui.stockTab = el.dataset.tab; render(); },
    "stock-cat"(el) { ui.stockCat = el.dataset.cat; render(); },
    "stock-clear"() { ui.stockQ = ""; render(); const n = $('[data-input="stockQ"]'); if (n) n.focus(); },

    /* projects */
    tick(el) {
      const p = project(el.dataset.id), ph = p && p.phases.find((x) => x.id === el.dataset.ph); if (!ph) return;
      ph.done = !ph.done; ph.doneOn = ph.done ? today() : null;
      save(); render(); toast(ph.done ? "“" + esc(ph.name) + "” marked done. Project is " + Math.round(progress(p) * 100) + "% done." : "“" + esc(ph.name) + "” marked not done.");
    },
    "open-delay"(el) { if (!S.projects.length) return toast("Add a project first.", "alert"); openSheet({ type: "delay", id: el && el.dataset.id }); },
    "delay-save"() {
      const s = ui.sheet, f = F();
      const p = project(f.projectId || s.id || (role() === "site" ? siteId() : (activeProjects()[0] || {}).id));
      const days = parseInt(f.days || 1, 10);
      if (!p) return fail("Choose a job.");
      if (!(days > 0)) return fail("Type how many days.");
      if (!f.reason) return fail("Pick a reason, so management knows why.");
      if (!p.originalEnd) p.originalEnd = p.end;
      p.end = addDays(p.end, days);
      p.delays.push({ id: uid("d"), date: today(), days, reason: f.reason, note: f.note || "", by: role() });
      commit(esc(p.name) + " delayed by " + plural(days, "day") + ". New finish date " + fmtDate(p.end) + ".");
    },
    "new-project"() { openSheet({ type: "project" }); },
    "project-save"() {
      const f = F();
      if (!(f.name || "").trim()) return fail("Give the project a name.");
      const start = f.start || today(), end = f.end || addDays(today(), 180);
      if (end < start) return fail("The finish date is before the start date.");
      const colors = ["#0F7F82", "#3563C4", "#7A5CC9", "#4F8F5B", "#B9832F", "#C0587E", "#2B7A9E"];
      const id = uid("p");
      S.projects.push({ id, name: f.name.trim(), client: f.client || "", location: f.location || "", type: (f.type || "Factory").toLowerCase(), start, end, originalEnd: end, value: parseFloat(f.value) || 0,
        phases: ["Site clearing & piling", "Foundation & ground slab", "Steel structure", "Roofing & wall cladding", "M&E (electrical, plumbing, fire)", "Finishing & handover"].map((n, i) => ({ id: id + "-ph" + i, name: n, done: false, doneOn: null })),
        delays: [], color: colors[S.projects.length % colors.length] });
      if (!S.people.site.siteId) S.people.site.siteId = id;
      save(); closeSheet(); location.hash = "#/project/" + id; toast("Project created.");
    },
    "project-photo"(el) {
      const p = project(el.dataset.id);
      takePhoto("environment").then(async (ph) => { if (!ph) return; if (p.photo) PhotoDB.del(p.photo); p.photo = await storePhoto(ph); ui.heroMode[p.id] = "photo"; save(); render(); toast("Site photo saved."); });
    },

    /* calendar & crews */
    "sel-day"(el) { ui.selDay = el.dataset.d; if (monthKey(ui.selDay) !== ui.calMonth) ui.calMonth = monthKey(ui.selDay); render(); },
    "cal-month"(el) { const [y, m] = ui.calMonth.split("-").map(Number); const d = new Date(y, m - 1 + +el.dataset.step, 1); ui.calMonth = toISO(d).slice(0, 7); ui.selDay = monthKey(today()) === ui.calMonth ? today() : toISO(d); render(); },
    "cal-week"(el) { ui.selDay = addDays(ui.selDay, +el.dataset.step); ui.calMonth = monthKey(ui.selDay); render(); },
    "cal-today"() { ui.selDay = today(); ui.calMonth = monthKey(today()); render(); },
    "open-assign"(el) { if (!S.crews.length || !S.projects.length) return toast("Add a crew and a project first.", "alert"); openSheet({ type: "assign", d: el && el.dataset.d }); },
    "assign-save"() {
      const s = ui.sheet, f = F();
      const from = f.from || s.d || today();
      const free = freeCrews(from);
      const crewId = f.crewId || (free[0] || S.crews[0]).id;
      const projectId = f.projectId || (activeProjects()[0] || S.projects[0]).id;
      const to = f.to || addDays(from, 13);
      if (to < from) return fail("The end date is before the start date.");
      const clash = S.assignments.find((a) => a.crewId === crewId && a.from <= to && a.to >= from);
      if (clash) return fail("<b>" + esc(crew(crewId).name) + " is already booked</b> at " + esc(project(clash.projectId).name) + " from " + fmtDate(clash.from) + " to " + fmtDate(clash.to) + ". Pick other dates or another crew.");
      S.assignments.push({ id: uid("a"), crewId, projectId, from, to });
      commit(esc(crew(crewId).name) + " booked at " + esc(project(projectId).name) + " from " + fmtDate(from) + " to " + fmtDate(to) + ".");
    },
    "asg-del"(el) { const a = S.assignments.find((x) => x.id === el.dataset.id); askConfirm("Remove this booking?", esc(crew(a.crewId).name) + " at " + esc(project(a.projectId).name) + ".", "Remove", true, () => { S.assignments = S.assignments.filter((x) => x.id !== a.id); commit("Booking removed."); }); },
    "new-worker"() { if (!S.crews.length) return toast("Create a crew first.", "alert"); openSheet({ type: "worker" }); },
    "worker-save"() {
      const f = F();
      if (!(f.name || "").trim()) return fail("Type the worker's name.");
      S.workers.push({ id: uid("w"), name: f.name.trim(), crewId: f.crewId || S.crews[0].id, dayRate: parseFloat(f.dayRate) || 0, phone: f.phone || "" });
      commit(esc(f.name.trim()) + " added.");
    },
    "new-crew"() { openSheet({ type: "crew" }); },
    "crew-save"() {
      const f = F(); const name = (f.name || "Crew " + String.fromCharCode(65 + S.crews.length)).trim();
      if (!name) return fail("Give the crew a name.");
      S.crews.push({ id: uid("c"), name, trade: f.trade || "", leaderId: null });
      commit(esc(name) + " created.");
    },

    /* attendance check */
    "att-for"(el) { ui.attSite = el.dataset.id; ui.attDate = pickAttDate(el.dataset.id); ui.attPicked = true; },
    "att-goto"(el) { ui.attDate = el.dataset.d; render(); },
    "att-day"(el) { const d = addDays(ui.attDate, +el.dataset.step); if (d <= today()) { ui.attDate = d; render(); } },
    "att-ok"(el) { const r = S.attendance.find((a) => a.id === el.dataset.id); r.status = "approved"; save(); render(); toast("Approved."); },
    "att-no"(el) { const r = S.attendance.find((a) => a.id === el.dataset.id); r.status = "rejected"; save(); render(); toast("Rejected. This day will not be paid.", "x"); },
    "att-all"() {
      const list = S.attendance.filter((a) => a.projectId === ui.attSite && a.date === ui.attDate && a.status === "waiting" && a.out);
      list.forEach((a) => { a.status = "approved"; });
      save(); render(); toast("Approved " + plural(list.length, "record") + ".");
    },
    "att-edit"(el) { openSheet({ type: "attEdit", recId: el.dataset.id }); },
    "att-add"(el) { openSheet({ type: "attEdit", workerId: el.dataset.w }); },
    "att-auto"() {
      const r = S.attendance.find((a) => a.id === ui.sheet.recId);
      r.adjust = null; commit("Back to automatic hours.");
    },
    "att-edit-save"() {
      const s = ui.sheet, f = F();
      let r = s.recId ? S.attendance.find((a) => a.id === s.recId) : null;
      const inT = f.in || (r ? r.in : "08:00"), outT = f.out || (r && r.out ? r.out : "17:00");
      if (!inT || !outT) return fail("Fill in both times.");
      const auto = calcHours({ in: inT, out: outT }).auto;
      const reason = (f.reason != null ? f.reason : (r && r.adjust ? r.adjust.reason : r ? "" : "Forgot to clock in")).trim();
      const normal = f.normal != null ? +f.normal : (r && r.adjust ? r.adjust.normal : auto.normal);
      const ot = f.ot != null ? +f.ot : (r && r.adjust ? r.adjust.ot : auto.ot);
      const half = f.dayType ? f.dayType === "Half day" : (r && r.adjust ? r.adjust.half : auto.half);
      const changedTimes = !r || inT !== r.in || outT !== r.out;
      const changedHours = normal !== auto.normal || ot !== auto.ot || half !== auto.half;
      if ((changedTimes || changedHours) && !reason) return fail("Write a short reason for the change.");
      if (!r) {
        r = { id: uid("at"), workerId: s.workerId, projectId: ui.attSite, date: ui.attDate, in: inT, out: outT, inPhoto: null, outPhoto: null, status: "approved", adjust: null, note: "Added by hand: " + reason };
        S.attendance.push(r);
      }
      r.in = inT; r.out = outT; r.status = "approved";
      r.adjust = changedHours || changedTimes ? { normal, ot, half, by: "site", reason } : r.adjust;
      if (r.adjust && !changedHours && !changedTimes && reason) r.adjust.reason = reason;
      commit("Saved and approved: " + esc(worker(r.workerId).name) + ", " + hoursText(calcHours(r)) + ".");
    }
  };

  /* ======================================================================
     8. Events
     ====================================================================== */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (ui.menu && !e.target.closest(".menu") && !(el && el.dataset.action === "menu")) { ui.menu = false; renderTop(); }
    if (!el) return;
    const fn = A[el.dataset.action];
    if (!fn) return;
    if (el.tagName === "BUTTON" || el.dataset.action !== "att-for") e.preventDefault();
    if (el.dataset.action === "att-for") { fn(el, e); location.hash = "#/attendance"; return; }
    fn(el, e);
  });

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.f && ui.sheet) {
      F()[el.dataset.f] = el.type === "checkbox" ? el.checked : el.value;
      ui.sheet.err = null;
      if (el.dataset.rerender && el.tagName !== "SELECT") { /* re-render on change instead, to keep typing smooth */ }
      if (ui.sheet.type === "material" && el.dataset.f === "qty") {
        // live warning without stealing focus
        const w = $("#sheet .form-warn"); const m = material(val("materialId", ui.sheet.mat || (S.materials[0] || {}).id));
        const need = (val("kind", ui.sheet.kind || "in") === "out") && m && +el.value > m.qty;
        if (need && !w) { renderSheet(); const q = $('#sheet [data-f="qty"]'); q.focus(); q.setSelectionRange && q.type !== "number" && q.setSelectionRange(99, 99); }
        if (!need && w) w.remove();
      }
    }
    if (el.dataset.input === "stockQ") {
      ui.stockQ = el.value;
      const pos = el.selectionStart;
      render();
      const n = $('[data-input="stockQ"]'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { /* search inputs */ }
    }
    if (el.dataset.input === "clockQ" && ui.sheet) {
      ui.sheet.q = el.value;
      renderSheet();
      const n = $('#sheet [data-input="clockQ"]'); n.focus(); try { n.setSelectionRange(el.value.length, el.value.length); } catch (x) { /* ok */ }
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.f && ui.sheet) {
      F()[el.dataset.f] = el.value;
      if (el.dataset.rerender) renderSheet();
    }
    const c = el.dataset.change;
    if (c === "role") { S.role = el.value; save(); ui.attSite = null; enterRoute(); render(); toast("Now viewing as " + ROLE_LABEL[S.role].toLowerCase() + "."); }
    if (c === "site") { S.people.site.siteId = el.value; save(); render(); }
    if (c === "moneyProject") { ui.moneyProject = el.value; render(); }
    if (c === "calProject") { ui.calProject = el.value; render(); }
    if (c === "attSite") { ui.attSite = el.value; ui.attDate = pickAttDate(el.value); render(); }
    if (c === "clockSite" && ui.sheet) { ui.sheet.siteId = el.value; renderSheet(); }
    if (el.dataset.setting) {
      const k = el.dataset.setting;
      if (k === "company") S.company.name = el.value.trim() || S.company.name;
      else { const v = parseFloat(el.value); if (!isNaN(v) && v >= 0) S.settings[k] = v; }
      save(); render(); toast("Saved.");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (ui.sheet) closeSheet(); else if (ui.menu) { ui.menu = false; renderTop(); } }
  });

  function enterRoute() {
    if (S && route().name === "attendance") {
      if (!ui.attPicked) { ui.attSite = ui.attSite || defaultAttSite(); ui.attDate = pickAttDate(ui.attSite); }
      ui.attPicked = false;
    }
  }
  window.addEventListener("hashchange", () => { ui.menu = false; if (ui.sheet) closeSheet(); enterRoute(); render(); window.scrollTo(0, 0); });

  /* ======================================================================
     9. Start
     ====================================================================== */
  load();
  if (S) purgeOldPhotos();
  enterRoute();
  render();
  // expose for debugging in the browser console
  window.SiteBook = { get data() { return S; }, calcHours, render };
})();
