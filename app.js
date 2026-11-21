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
  const hrs = (h) => { const m = Math.round((h || 0) * 60), H = Math.floor(m / 60), M = m % 60; return M ? (H ? H + "h " : "") + M + "m" : H + "h"; };
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
    fuel: '<path d="M3 22h12M4 9h10M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.83a2 2 0 0 0-.59-1.42L18 5"/>',
    hardhat: '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5M4 15v-3a6 6 0 0 1 6-6M14 6a6 6 0 0 1 6 6v3"/>',
    coffee: '<path d="M10 2v2M14 2v2M6 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    forklift: '<path d="M12 12H5a2 2 0 0 0-2 2v5"/><circle cx="13" cy="19" r="2"/><circle cx="5" cy="19" r="2"/><path d="M8 19h3M16 2v17h6M6 12V7a2 2 0 0 1 2-2h3l5 5"/>',
    pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
    qr: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3M21 21v.01M12 7v3a2 2 0 0 1-2 2H7M3 12h.01M12 3h.01M12 16v.01M16 12h1M21 12v.01M12 21v-1"/>',
    phoneoff: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01M3 3l18 18"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    bin: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>',
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
    if (S) migrate();
  }
  // fill in fields added in later versions, so older saved data keeps working
  function migrate() {
    S.disputes = S.disputes || [];
    S.notifications = S.notifications || [];
    S.audit = S.audit || [];
    S.people.worker = S.people.worker || { siteId: null, workerId: null, lang: "en" };
    S.settings = Object.assign({ matchMinutes: 15, payDay: 7, geofenceM: 200, rounding: "exact", rejectReasons: ["Not on site", "Photo is not this worker", "Clocked in twice", "Left early without asking"] }, S.settings);
    // keep the site manager's original photo times, so later changes never overwrite them
    S.attendance.forEach((a) => { if (!a.orig && a.inPhoto && a.in && !(a.self && a.self.in === a.in)) a.orig = { in: a.in, out: a.outPhoto ? a.out : null }; });
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
  function demoFace() {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#E3E7EA"/>' +
      '<circle cx="60" cy="47" r="21" fill="#C3CBD1"/><path d="M20 120c4-27 21-40 40-40s36 13 40 40z" fill="#C3CBD1"/></svg>';
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
    tick: () => role() === "boss" || role() === "site",
    seePay: () => role() === "boss",
    manage: () => role() === "boss",
    buy: () => role() === "boss" || role() === "buyer"
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

  /* Attendance has two sides:
     - in / out / inPhoto / outPhoto : the site manager's record (wins for pay)
     - self {in, out, inPhoto, outPhoto} : the worker's own clock-in on their phone
     eff() gives the times used for pay: site manager's if there, else the worker's. */
  // r.self = worker's original times (never changed by anyone); r.orig = site manager's original photo times;
  // r.in / r.out = the site manager's time (confirmed or written). A rejected side is not used for pay.
  function eff(r) {
    const s = r.self || {};
    return { in: r.in || (r.rejectIn ? null : s.in) || null, out: r.out || (r.rejectOut ? null : s.out) || null, inPhoto: r.inPhoto || s.inPhoto || null, outPhoto: r.outPhoto || s.outPhoto || null };
  }
  const isDone = (r) => !!eff(r).out;
  const hasPhone = (w) => !!(w && w.hasPhone);
  function matchOf(r) {
    const w = worker(r.workerId), s = r.self || {};
    const tol = S.settings.matchMinutes || 15;
    if (r.rejectIn || r.rejectOut) {
      const needIn = r.rejectIn && !r.in, needOut = r.rejectOut && !r.out && r.date < today();
      if (needIn || needOut) return { key: "rej", label: (needIn ? "Clock in" : "Clock out") + " rejected, write a time", cls: "warn", flag: true };
      return { key: "rejok", label: "Site manager time used", cls: "" };
    }
    if (!s.in && !hasPhone(w)) return { key: "single", label: "Site manager only", cls: "" };
    if (s.in && !r.in) return { key: "worker", label: r.date === today() ? "Selfie in, waiting for you" : "Site manager did not confirm", cls: "warn", flag: true };
    if (r.in && !s.in) return { key: "manager", label: "Worker did not clock in", cls: "warn", flag: true };
    const d1 = Math.abs(toMin(r.in) - toMin(s.in));
    const d2 = r.out && s.out ? Math.abs(toMin(r.out) - toMin(s.out)) : 0;
    if (d1 > tol || d2 > tol) return { key: "diff", label: "Times differ by " + Math.max(d1, d2) + " min", cls: "warn", flag: true };
    if (r.date < today() && !!r.out !== !!s.out) return { key: "out", label: "Clock-out on one side only", cls: "warn", flag: true };
    return { key: "ok", label: "Matched", cls: "good" };
  }
  /* History (audit trail). Append-only: entries are never edited or deleted, and undo adds a new entry.
     Stores who did what, to which worker's day, when, with the before/after values and the reason. */
  function actor() {
    const r = role();
    if (r === "worker") { const w = me(); return { by: "worker", byName: w ? w.name : "Worker", byWorker: w ? w.id : null }; }
    return { by: r, byName: (S.people[r] || {}).name || ROLE_LABEL[r] };
  }
  function log(action, o) {
    const e = Object.assign({ id: uid("au"), at: new Date().toISOString(), date: today(), time: nowHM(), action }, actor(), o || {});
    S.audit.unshift(e);
    return e;
  }
  function auditText(a, forWorker) {
    const wn = worker(a.workerId) ? worker(a.workerId).name : "a worker";
    const w = forWorker ? "your" : esc(wn) + "'s";
    const d = a.forDate ? " (" + fmtDay(a.forDate) + ")" : "";
    const rs = a.reason ? ". Reason: “" + esc(a.reason) + "”" : "";
    const v = a.value ? esc(a.value) : "";
    switch (a.action) {
      case "self-in": return "clocked in with a selfie at " + v;
      case "self-out": return "clocked out with a selfie at " + v;
      case "photo-in": return "clocked in " + (forWorker ? "you" : esc(wn)) + " with a photo at " + v;
      case "photo-out": return "clocked out " + (forWorker ? "you" : esc(wn)) + " with a photo at " + v;
      case "confirm-in": return "confirmed " + w + " selfie clock-in (" + v + ")";
      case "confirm-out": return "confirmed " + w + " selfie clock-out (" + v + ")";
      case "approve": return "approved " + w + " day" + d + (v ? ": " + v : "");
      case "reject": return "rejected " + w + " " + (a.part === "in" ? "clock in" + (v ? " " + v : "") : a.part === "out" ? "clock out" + (v ? " " + v : "") : "whole day") + d + rs;
      case "restore": return "restored " + w + " " + (a.part === "in" ? "clock in" : a.part === "out" ? "clock out" : "day") + d + " from Rejected";
      case "change": return "wrote site manager time for " + w + " day" + d + ": " + v + rs;
      case "add": return "added " + w + " day" + d + " by hand: " + v + rs;
      case "auto": return "set " + w + " hours" + d + " back to automatic";
      case "report": return "reported a problem with " + fmtDay(a.forDate) + ": " + v;
      case "sorted": return "marked " + w + " report" + d + " as sorted";
      case "undo": return "undid: " + v;
      default: return v;
    }
  }
  const ROLE_SHORT = { boss: "management", site: "site manager", buyer: "buyer", worker: "worker" };
  function auditRow(a, forWorker) {
    const mine = forWorker && a.by === "worker";
    return '<div class="au-row"><span class="au-time num">' + esc(a.time) + '</span><span class="au-ic au-' + a.by + '">' + icon(a.action === "undo" ? "undo" : a.action === "reject" ? "x" : a.action === "report" ? "flag" : a.by === "worker" ? "camera" : "check") + "</span>" +
      '<span class="au-text">' + (mine ? "<b>You</b> " : "<b>" + esc(a.byName) + '</b> <span class="muted">(' + ROLE_SHORT[a.by] + ")</span> ") + auditText(a, forWorker) + "</span></div>";
  }
  // snapshot for Undo (attendance, reports and notifications only; the history itself is never rolled back)
  const snapshot = () => JSON.stringify({ attendance: S.attendance, disputes: S.disputes, notifications: S.notifications });
  function done(msg, snap, entries, ic) {
    save(); render();
    if (ui.sheet && ui.sheet.type === "clock") renderSheet();
    const label = entries && entries.length ? auditText(entries[0]).replace(/<[^>]+>/g, "") + (entries.length > 1 ? " and " + (entries.length - 1) + " more" : "") : msg;
    toast(msg, ic, snap ? { snap, label } : null);
  }

  // Notifications: to "site" (site manager + management) or to "worker" (one worker)
  function notify(n) { S.notifications.unshift(Object.assign({ id: uid("nt"), at: new Date().toISOString(), date: today(), time: nowHM(), read: false }, n)); if (S.notifications.length > 200) S.notifications.length = 200; }
  function myNotes() {
    if (role() === "worker") { const w = me(); return w ? S.notifications.filter((n) => n.to === "worker" && n.workerId === w.id) : []; }
    if (role() === "site") { const sid = siteId(); return S.notifications.filter((n) => n.to === "site" && n.projectId === sid); }
    if (role() === "boss") return S.notifications.filter((n) => n.to === "site");
    return [];
  }
  const unreadCount = () => myNotes().filter((n) => !n.read).length;
  const openDispute = (workerId, date) => S.disputes.find((d) => d.status === "open" && d.workerId === workerId && d.date === date);

  /* hours: automatic first, site manager's change wins */
  function calcHours(rec) {
    const s = S.settings;
    const e = eff(rec);
    if (!e.in) return null;
    if (!e.out) return { open: true };
    const raw = workedHours(e.in, e.out);
    const round = rec.round || s.rounding || "exact";
    const worked = roundHours(raw, round);
    const half = worked < s.halfDayUnder;
    const auto = { worked, raw, round, normal: Math.min(worked, s.normalHours), ot: Math.max(0, worked - s.normalHours), half };
    // older records may carry manual normal/OT numbers; newer changes are worked out from the times
    const manual = rec.adjust && rec.adjust.normal != null;
    const final = manual ? Object.assign({}, auto, { normal: +rec.adjust.normal, ot: +rec.adjust.ot, half: !!rec.adjust.half }) : auto;
    return { auto, final, changed: !!rec.adjust || !!rec.mgrReason };
  }
  // time between in and out, minus the lunch break when the day is long enough
  function workedHours(a, b) {
    const s = S.settings;
    let w = (toMin(b) - toMin(a)) / 60;
    if (w < 0) w += 24;
    if (w > s.breakAfter) w -= s.breakHours;
    return Math.max(0, w);
  }
  const ROUNDING = { exact: "Exact", "30": "Nearest 30 min", "60": "Nearest hour" };
  const roundHours = (h, k) => (k === "60" ? Math.round(h) : k === "30" ? Math.round(h * 2) / 2 : Math.round(h * 60) / 60);
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
  const MCATS = [
    { id: "materials", name: "Materials", short: "Materials", icon: "stock", kw: /cement|steel|rebar|sand|beam|concrete|paint|sheet|plywood|brick|cable|pipe|bolt|tile|mesh|timber|screw/i },
    { id: "rental", name: "Machine & equipment rental", short: "Rental", icon: "forklift", kw: /rental|rent|crane|excavator|scaffold|hire|genset/i },
    { id: "transport", name: "Transport & fuel", short: "Transport & fuel", icon: "fuel", kw: /diesel|petrol|fuel|toll|parking|transport|lorry|delivery|truck/i },
    { id: "subcon", name: "Subcontractors", short: "Subcon", icon: "hardhat", kw: /subcon|sub-con|contractor|labour supply/i },
    { id: "site", name: "Site expenses", short: "Site expenses", icon: "coffee", kw: /lunch|food|water|drink|meal|makan/i },
    { id: "tools", name: "Tools & safety gear", short: "Tools & safety", icon: "wrench", kw: /drill|tool|disc|boot|helmet|safety|glove|repair/i },
    { id: "utilities", name: "Utilities & permits", short: "Utilities", icon: "zap", kw: /electric|permit|deposit|licen|bill/i },
    { id: "office", name: "Office & admin", short: "Office", icon: "briefcase", kw: /office|stationery|printing|admin|software/i }
  ];
  const mcat = (id) => MCATS.find((c) => c.id === id) || MCATS[0];
  function moneyCat(m) {
    if (m.cat && MCATS.some((c) => c.id === m.cat)) return m.cat;
    const text = (m.what || "") + " " + (m.supplier || "");
    const order = ["rental", "transport", "subcon", "site", "tools", "utilities", "office", "materials"];
    const hit = order.find((id) => mcat(id).kw.test(text));
    return hit || "materials";
  }
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
    tile: {},
    moneyCat: "all",
    workerAway: false,
    sheet: null,
    menu: false
  };

  const TABS = [
    { id: "today", label: "Home", icon: "today" },
    { id: "calendar", label: "Calendar", icon: "calendar" },
    { id: "projects", label: "Projects", icon: "projects" },
    { id: "stock", label: "Stock", icon: "stock" },
    { id: "money", label: "Money", icon: "money" }
  ];
  const ROLE_LABEL = { boss: "Management", site: "Site manager", buyer: "Material buyer", worker: "Construction worker" };

  function route() {
    const h = (location.hash || "#/today").replace(/^#\/?/, "");
    const [name, id] = h.split("/");
    return { name: name || "today", id };
  }
  function tabOf(r) { return r.name === "project" ? "projects" : r.name; }

  function renderTop() {
    const top = $("#topbar"), bn = $("#bottomnav");
    const r = route(), t = tabOf(r);
    const isW = role() === "worker";
    document.body.classList.toggle("is-worker", isW);
    const tabs = isW ? "" : TABS.filter((x) => !(role() === "boss" && x.id === "stock")).map((x) => '<a href="#/' + x.id + '" class="' + (t === x.id ? "on" : "") + '"' + (t === x.id ? ' aria-current="page"' : "") + ">" + icon(x.icon) + "<span>" + x.label + "</span></a>").join("");
    top.innerHTML =
      '<a class="brand" href="#/today"><span class="brand-mark">' + icon("logo") + "</span><span>" + esc(S.company.name) + "<small>Site book</small></span></a>" +
      (isW ? "" : '<nav class="topnav" aria-label="Main">' + tabs + "</nav>") +
      '<div class="top-right">' +
      '<div class="role-pick"><label for="rolePick">Viewing as</label><select id="rolePick" data-change="role">' +
      Object.keys(ROLE_LABEL).map((k) => '<option value="' + k + '"' + (S.role === k ? " selected" : "") + ">" + ROLE_LABEL[k] + "</option>").join("") +
      "</select></div>" +
      (isW ? "" : role() === "boss" ? "<span></span>" : '<button class="btn btn-primary log-btn log-btn-top" data-action="open-log">' + icon("plus") + "Log</button>") +
      (role() === "buyer" ? "" : '<button class="icon-btn bell-btn" data-action="open-notes" aria-label="Notifications' + (unreadCount() ? ", " + unreadCount() + " new" : "") + '">' + icon("bell") + (unreadCount() ? '<span class="bell-n">' + Math.min(99, unreadCount()) + "</span>" : "") + "</button>") +
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
      (role() === "boss" || role() === "site" ? '<a href="#/history" role="menuitem">' + icon("history") + 'History</a><a href="#/bin" role="menuitem">' + icon("bin") + "Rejected days</a>" : "") +
      (role() === "boss" ? '<a href="#/stock" role="menuitem">' + icon("stock") + "Stock</a>" : "") +
      '<a href="#/team" role="menuitem">' + icon("users") + "Workers &amp; crews</a>" +
      '<a href="#/settings" role="menuitem">' + icon("sliders") + "Settings</a>" +
      "<hr>" +
      '<button data-action="reset-sample" role="menuitem">' + icon("refresh") + "Reload sample data</button>" +
      '<button data-action="wipe" role="menuitem">' + icon("trash") + "Clear everything, start empty</button>" +
      "</div>";
  }

  function render() {
    renderTop();
    const main = $("#main");
    const r = route();
    if (role() === "worker") { main.innerHTML = viewWorker(); after(); if (ui.sheet && /^(wclock|wreport)$/.test(ui.sheet.type)) renderSheet(); return; }
    const views = { history: viewHistory, bin: viewBin, today: viewToday, calendar: viewCalendar, projects: viewProjects, project: viewProject, stock: viewStock, money: viewMoney, attendance: viewAttendance, team: viewTeam, settings: viewSettings };
    main.innerHTML = (views[r.name] || viewToday)(r.id);
    after();
    if (ui.sheet && ui.sheet.type === "panel") renderSheet();
  }
  function after() {
    hydratePhotos();
    $$("[data-3d]").forEach((el) => {
      const p = project(el.dataset["3d"]);
      if (p) window.Factory3D.attach(el, { seed: p.id + p.name, progress: progress(p), type: p.type });
    });
    $$("details[data-fold]").forEach((d) => d.addEventListener("toggle", () => { d.open ? ui.open.add(d.dataset.fold) : ui.open.delete(d.dataset.fold); }));
    hideHoverPop();
    setupCarousel();
    if (ui.scrollToPanel) { ui.scrollToPanel = false; setTimeout(() => { const el = $(".tile-panel"); if (el) el.scrollIntoView({ block: "start" }); }, 60); }
    if (ui.pendingPanel) { const pp = ui.pendingPanel; ui.pendingPanel = null; setTimeout(() => openSheet({ type: "panel", g: pp.g, t: pp.t }), 0); }
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
  /* Icon tiles: a row of small buttons (icon, word, number). All closed at first.
     Laptop: the chosen one opens under the row. Phone: it opens as a pop-up. */
  const TILE_REG = {};
  const isPhone = () => window.matchMedia("(max-width: 760px)").matches;
  function tiles(group, items) {
    items = items.filter(Boolean);
    TILE_REG[group] = items;
    const active = ui.tile[group];
    const it = !isPhone() && items.find((x) => x.id === active);
    return '<div class="tiles">' + items.map((x) => '<button class="tile' + (it && x.id === active ? " on" : "") + (x.warn ? " warn" : "") + '" data-action="tile" data-g="' + group + '" data-t="' + x.id + '" aria-expanded="' + !!(it && x.id === active) + '">' +
      '<span class="tile-ic">' + icon(x.icon) + '</span><span class="tile-n num">' + (x.count == null ? "" : x.count) + '</span><span class="tile-label">' + x.label + "</span></button>").join("") + "</div>" +
      (it ? '<div class="tile-panel card"><div class="card-head"><h2 class="card-title">' + (it.title || it.label) + '</h2><button class="icon-btn sm" data-action="tile" data-g="' + group + '" data-t="' + it.id + '" aria-label="Close">' + icon("x") + "</button></div>" + it.body() + "</div>" : "");
  }
  const helpBtn = (text) => '<button class="help-btn" data-action="help" data-t="' + esc(text) + '" aria-label="What is this page?">?</button>';
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
  /* ---------- Today ---------- */
  function viewToday() {
    if (role() === "site") return todaySite();
    if (role() === "buyer") return todayBuyer();
    return todayBoss();
  }

  function todayBoss() {
    const t = today(), mk = t.slice(0, 7);
    const todo = [];
    const overdue = S.money.filter((m) => isOut(m) && m.status === "expected" && m.date < t);
    const week = billsDue(7).filter((m) => m.date >= t);
    const pay = overdue.concat(week);
    if (pay.length) todo.push({ cls: overdue.length ? "bad" : "warn", text: "Pay " + plural(pay.length, "bill") + ", " + RM(sum(pay, (m) => m.amount)) + (overdue.length ? ' <span class="muted">(' + overdue.length + " overdue)</span>" : ""), btn: "Pay", act: 'data-action="go-bills"' });
    S.projects.filter((p) => lateDays(p) > 0 && projectStatus(p).cls === "warn").forEach((p) => {
      const last = p.delays[p.delays.length - 1];
      todo.push({ cls: "warn", text: esc(p.name) + " is " + plural(lateDays(p), "day") + " late" + (last ? ' <span class="muted">(' + esc(last.reason.toLowerCase()) + ")</span>" : ""), btn: "Open", act: 'href="#/project/' + p.id + '"' });
    });
    const urgentBuy = S.needs.filter((n) => n.status === "to buy" && n.by <= addDays(t, 3));
    urgentBuy.slice(0, 2).forEach((n) => { const m = material(n.materialId), p = project(n.projectId); todo.push({ cls: "warn", text: "Order " + esc(m ? m.name.replace(/\s*\(.*\)/, "").toLowerCase() : "material") + (p ? " for " + esc(p.name) : "") + ' <span class="muted">(needed ' + relDay(n.by) + ")</span>", btn: "Order", act: 'data-action="need-status" data-id="' + n.id + '" data-to="ordered"' }); });
    const reports = S.disputes.filter((d) => d.status === "open");
    if (reports.length) todo.push({ cls: "warn", text: plural(reports.length, "worker report") + " about pay or hours", btn: "See", act: 'href="#/attendance"' });
    const shown = todo.slice(0, 5);

    const inSum = sum(expectedIn(30), (m) => m.amount), outSum = sum(billsDue(30), (m) => m.amount);
    return '<div class="page-head"><div><p class="greet-small">' + greeting() + ", " + esc(S.people.boss.name) + '</p><h1 class="page-title">' + (shown.length ? plural(shown.length, "thing needs", "things need") + " you today" : "Nothing needs you today") + "</h1></div></div>" +
      (shown.length ? '<div class="card todo">' + shown.map((x) => '<div class="todo-row"><span class="dot" style="background:var(--' + (x.cls === "bad" ? "red" : "amber") + ')"></span><span class="grow">' + x.text + "</span>" +
        (x.act.indexOf("href") === 0 ? "<a " + x.act + ' class="btn btn-sm btn-primary">' + x.btn + "</a>" : "<button " + x.act + ' class="btn btn-sm btn-primary">' + x.btn + "</button>") + "</div>").join("") +
        (todo.length > shown.length ? '<div class="small muted mt-8">and ' + (todo.length - shown.length) + " more</div>" : "") + "</div>" : '<div class="card todo-ok">' + icon("check") + "<span>All good. Every project is on track and no bills are due this week.</span></div>") +
      (!S.projects.length ? '<div class="card mt-16">' + empty("No projects yet.", '<br><button class="btn btn-primary" data-action="new-project">Add a project</button>') + "</div>" :
        '<div class="section"><h2 class="section-title">My projects <a class="link-btn small" href="#/projects">See all</a></h2><div class="card"><div class="list">' +
        S.projects.map((p) => {
          const st = projectStatus(p), pct = Math.round(progress(p) * 100);
          return '<a class="li li-link proj-row" href="#/project/' + p.id + '"><div class="li-main"><div class="li-title">' + esc(p.name) + '</div><div class="li-sub">' + plural(crewsAt(p.id, t).length, "crew") + ' on site today<span class="show-sm">, ' + pct + "% done</span></div></div>" +
            '<div class="pr-bar">' + pbar(progress(p)) + '</div><span class="pr-pct num small">' + pct + '%</span><span class="pr-st">' + chip(st.label, st.cls) + "</span></a>";
        }).join("") + "</div></div></div>") +
      '<a class="money-line" href="#/money"><span>Money: <b>' + RMshort(spentInMonth(mk)) + "</b> spent in " + MON_LONG[+mk.slice(5) - 1] + ". <b>" + RMshort(inSum) + "</b> coming in and <b>" + RMshort(outSum) + "</b> in bills over the next 30 days.</span>" + '<span class="link-btn small">Money ›</span></a>';
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
    const head = '<div class="page-head"><div><p class="greet-small">' + greeting() + ", " + esc(S.people.site.name) + '</p><h1 class="page-title">Today, ' + fmtDayLong(t).replace(",", "") + "</h1></div>" +
      (S.projects.length ? '<div class="role-pick"><label for="sitePick">Your site</label><select id="sitePick" data-change="site">' + S.projects.map((x) => '<option value="' + x.id + '"' + (x.id === sid ? " selected" : "") + ">" + esc(x.name) + "</option>").join("") + "</select></div>" : "") + "</div>";
    if (!p) return head + '<div class="card">' + empty("No projects yet. Ask management to add one.") + "</div>";

    const expected = expectedWorkers(sid, t);
    const recs = S.attendance.filter((a) => a.projectId === sid && a.date === t);
    const inNow = recs.filter((a) => !isDone(a)).length;
    const waiting = S.attendance.filter((a) => a.projectId === sid && a.status === "waiting" && isDone(a)).length;
    const toConfirm = recs.filter((a) => (a.self && a.self.in && !a.in) || (a.self && a.self.out && a.in && !a.out));
    const reports = S.disputes.filter((d) => d.status === "open" && d.projectId === sid);
    const crewsToday = crewsAt(sid, t);
    const needs = S.needs.filter((n) => n.projectId === sid && n.status !== "arrived" && n.by <= addDays(t, 7)).sort((a, b) => a.by.localeCompare(b.by));

    const whoList = () => crewGroupsList(expected.concat(recs.map((r) => worker(r.workerId)).filter((w) => w && !expected.includes(w))), (w) => {
      const r = recs.find((x) => x.workerId === w.id), e = r ? eff(r) : {};
      const st = !r ? chip("Not in yet", "") : e.out ? chip("Left " + e.out, "") : chip("In since " + e.in, "good");
      return '<div class="li">' + avatar(w, e.inPhoto) + '<div class="li-main"><div class="li-title">' + esc(w.name) + "</div></div>" + st + "</div>";
    });
    const confirmList = () => toConfirm.length ? '<div class="list">' + toConfirm.map((r) => {
      const w = worker(r.workerId), outSide = !!r.in;
      return '<div class="li">' + avatar(w, r.self.inPhoto) + '<div class="li-main"><div class="li-title">' + esc(w.name) + '</div><div class="li-sub">Clocked ' + (outSide ? "out" : "in") + " on own phone at " + esc(outSide ? r.self.out : r.self.in) + '</div></div><button class="btn btn-sm btn-primary" data-action="clock-confirm" data-id="' + r.id + '" data-act="' + (outSide ? "out" : "in") + '">' + icon("check") + "Confirm</button></div>";
    }).join("") + '</div><button class="btn btn-soft mt-12" data-action="confirm-all" data-site="' + sid + '">' + icon("check") + "Confirm all " + toConfirm.length + "</button>" : empty("Nobody waiting. When a worker clocks in on their own phone, they show up here.");

    const banner = toConfirm.length ? '<div class="banner"><div class="banner-pics">' + toConfirm.slice(0, 4).map((r) => img(r.self.out && r.in ? r.self.outPhoto : r.self.inPhoto, "", worker(r.workerId).name)).join("") + '</div><div class="grow"><b>' + plural(toConfirm.length, "worker") + " clocked " + (toConfirm.every((r) => r.in) ? "out" : "in") + ' with a selfie</b><div class="small muted">' + esc(toConfirm.slice(0, 3).map((r) => worker(r.workerId).name.split(" ")[0]).join(", ")) + (toConfirm.length > 3 ? " and " + (toConfirm.length - 3) + " more" : "") + ' are waiting for you to confirm.</div></div><button class="btn btn-primary btn-sm" data-action="att-review" data-site="' + sid + '">Review</button></div>' : "";
    return head + banner +
      '<div class="grid-hero">' +
      '<div class="card" style="padding:28px"><div class="muted">Today at ' + esc(p.name) + "</div>" +
      '<div class="row" style="align-items:baseline;gap:10px;margin-top:6px"><span class="num" style="font-size:48px;font-weight:500;letter-spacing:-.02em;line-height:1">' + recs.length + '</span><span class="muted" style="font-size:22px">of ' + expected.length + "</span></div>" +
      '<div class="muted">workers clocked in' + (inNow ? ", " + inNow + " on site now" : "") + "</div>" +
      '<div class="mt-16">' + pbar(expected.length ? recs.length / expected.length : 0) + "</div>" +
      '<div class="stack mt-24"><button class="btn btn-primary btn-big btn-block" data-action="open-clock">' + icon("camera") + "Clock in / out</button>" +
      '<a class="btn btn-block" href="#/attendance">' + icon("check") + "Check attendance" + (waiting ? " (" + waiting + " waiting)" : "") + "</a></div>" +
      '<div class="small muted mt-16">Crews here today: ' + (crewsToday.length ? crewsToday.map((c) => esc(c.name)).join(", ") : "none booked") + "</div></div>" +
      hero(p, true) + "</div>" +
      '<div class="section">' + tiles("site", [
        { id: "confirm", icon: "check", label: "To confirm", count: toConfirm.length, warn: toConfirm.length > 0, title: "Workers waiting for you to confirm", body: confirmList },
        { id: "who", icon: "users", label: "Who's here", count: recs.length, title: "Who is here today", body: () => whoList() || empty("No crews booked here today.") },
        { id: "mat", icon: "truck", label: "Materials", count: needs.length, title: "Materials coming this week", body: () => needs.length ? '<div class="list">' + needs.map(needRow).join("") + "</div>" : empty("Nothing due this week.") },
        { id: "progress", icon: "projects", label: "Progress", count: Math.round(progress(p) * 100) + "%", title: "Work progress", body: () => phasesHTML(p) + '<div class="row wrap mt-16"><button class="btn btn-soft" data-action="open-delay" data-id="' + p.id + '">' + icon("hourglass") + "Delay this job</button></div>" },
        { id: "reports", icon: "flag", label: "Reports", count: reports.length, warn: reports.length > 0, title: "Reports from workers", body: () => reportsList(reports) }
      ]) + "</div>";
  }

  // list of workers grouped by crew (small headings)
  function crewGroupsList(workers, rowFn) {
    const byCrew = {};
    workers.forEach((w) => { (byCrew[w.crewId] = byCrew[w.crewId] || []).push(w); });
    return Object.keys(byCrew).map((cid) => '<div class="crew-head">' + esc(crew(cid) ? crew(cid).name : "No crew") + '<span class="muted">' + byCrew[cid].length + "</span></div>" + '<div class="list">' + byCrew[cid].map(rowFn).join("") + "</div>").join("");
  }
  function reportsList(list) {
    if (!list.length) return empty("No reports. Workers can tell you about a wrong day from their own phone.");
    return '<div class="list">' + list.map((d) => { const w = worker(d.workerId); return '<div class="li"><div class="li-main"><div class="li-title">' + esc(w ? w.name : "?") + ": " + esc(d.reason) + '</div><div class="li-sub">About ' + fmtDay(d.date) + (d.note ? ". “" + esc(d.note) + "”" : "") + "</div></div>" +
      '<button class="btn btn-sm btn-soft" data-action="att-open-day" data-site="' + d.projectId + '" data-d="' + d.date + '">Open day</button>' + (can.approve() ? '<button class="btn btn-sm btn-primary" data-action="dispute-done" data-id="' + d.id + '">Sorted</button>' : "") + "</div>"; }).join("") + "</div>";
  }

  function todayBuyer() {
    const t = today();
    const week = openNeeds().filter((n) => n.by <= addDays(t, 7));
    const toBuy = week.filter((n) => n.status === "to buy");
    const low = lowStock();
    const later = openNeeds().filter((n) => n.by > addDays(t, 7));
    return '<div class="page-head"><div><p class="greet-small">' + greeting() + ", " + esc(S.people.buyer.name) + '</p><h1 class="page-title">Today, ' + fmtDayLong(t).replace(",", "") + "</h1></div></div>" +
      '<div class="grid-hero">' +
      '<div class="card" style="padding:26px"><div class="row-between"><div><div class="muted">To buy this week</div><div class="row" style="align-items:baseline;gap:10px;margin-top:4px"><span class="num" style="font-size:48px;font-weight:500;letter-spacing:-.02em;line-height:1">' + toBuy.length + '</span><span class="muted" style="font-size:20px">' + (toBuy.length === 1 ? "item" : "items") + " not ordered</span></div></div></div>" +
      '<div class="list mt-16">' + (week.length ? week.map(needRow).join("") : empty("Nothing needed this week.")) + "</div>" +
      '<button class="btn btn-soft btn-block mt-16" data-action="new-need">' + icon("plus") + "Add something to buy</button></div>" +
      '<div class="stack">' +
      '<div class="card"><div class="card-head"><h2 class="card-title">Running low in the yard</h2>' + chip(String(low.length), low.length ? "warn" : "good") + "</div>" +
      (low.length ? '<div class="list">' + low.map((m) => '<div class="li"><div class="li-main"><div class="li-title">' + esc(m.name) + '</div><div class="li-sub">Keep at least ' + m.min + " " + esc(m.unit) + '</div></div><span class="li-amt num" style="color:#B0661A">' + m.qty + " " + esc(m.unit) + '</span><button class="btn btn-sm btn-soft" data-action="new-need" data-mat="' + m.id + '">Add to buy list</button></div>').join("") + "</div>" : empty("All good.")) + "</div>" +
      '<button class="btn btn-primary btn-big btn-block" data-action="open-material" data-kind="in">' + icon("truck") + "A delivery arrived</button>" +
      "</div></div>" +
      '<div class="section">' + tiles("buyer", [
        { id: "later", icon: "calendar", label: "Needed later", count: later.length, title: "Needed after this week", body: () => later.length ? '<div class="list">' + later.map(needRow).join("") + "</div>" : empty("Nothing planned yet.") },
        { id: "ordered", icon: "truck", label: "On the way", count: S.needs.filter((n) => n.status === "ordered").length, title: "Ordered, not arrived yet", body: () => { const l = S.needs.filter((n) => n.status === "ordered"); return l.length ? '<div class="list">' + l.map(needRow).join("") + "</div>" : empty("Nothing on the way."); } },
        { id: "recent", icon: "in", label: "Deliveries", count: S.moves.filter((m) => m.kind !== "out" && m.date >= addDays(t, -7)).length, title: "Deliveries in the last 7 days", body: () => { const l = S.moves.filter((m) => m.kind !== "out" && m.date >= addDays(t, -7)).reverse(); return l.length ? '<div class="list">' + l.map((x) => { const m = material(x.materialId); return '<div class="li"><div class="li-main"><div class="li-title">' + x.qty + " " + esc(m ? m.unit : "") + " " + esc(m ? m.name : "") + '</div><div class="li-sub">' + fmtDay(x.date) + ", " + (x.projectId && project(x.projectId) ? "to " + esc(project(x.projectId).name) : "to the yard") + "</div></div></div>"; }).join("") + "</div>" : empty("No deliveries this week."); } }
      ]) + "</div>";
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
      '<div class="li-sub">' + (n.status === "ordered" ? '<span style="color:var(--blue)">Ordered</span>, ' : "") + esc(p ? p.name : "For the yard") + ", " + when + fromYard + "</div></div>" + right + "</div>";
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
  // weeks (Mon..Sun) covering a month
  function monthWeeks(ym) {
    const [y, m] = ym.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const start = addDays(toISO(first), -((first.getDay() + 6) % 7));
    const days = new Date(y, m, 0).getDate();
    const n = Math.ceil((((first.getDay() + 6) % 7) + days) / 7);
    const weeks = [];
    for (let w = 0; w < n; w++) { const row = []; for (let i = 0; i < 7; i++) row.push(addDays(start, w * 7 + i)); weeks.push(row); }
    return weeks;
  }
  const shortName = (p) => p.name.replace(/\s+(Factory|Warehouse|Extension|Workshop|Cold Storage)$/i, "").trim() || p.name;
  const monthNav = (ym, act) => { const [y, m] = ym.split("-").map(Number); return '<div class="cal-head"><button class="icon-btn sm" data-action="' + act + '" data-step="-1" aria-label="Previous month">' + icon("left") + '</button><div class="cal-month">' + MON_LONG[m - 1] + " " + y + '</div><button class="icon-btn sm" data-action="' + act + '" data-step="1" aria-label="Next month">' + icon("right") + "</button></div>"; };
  const shiftMonth = (ym, step) => { const [y, m] = ym.split("-").map(Number); return toISO(new Date(y, m - 1 + step, 1)).slice(0, 7); };

  // short point list for one day (main calendar)
  function dayList(d) {
    const sunday = S.settings.sundayOff && isSunday(d);
    let h = '<div class="pop-title">' + fmtDayLong(d) + "</div>";
    const dueSun = S.needs.filter((n) => n.by === d && n.status !== "arrived");
    if (sunday) return h + '<div class="muted small">Rest day.</div>' + (dueSun.length ? '<div class="small mt-8">Deliveries: ' + dueSun.map((n) => { const m = material(n.materialId); return n.qty + " " + esc(m.unit) + " " + esc(m.name.replace(/\s*\(.*\)/, "").toLowerCase()); }).join(", ") + "</div>" : "");
    const asg = assignmentsOn(d);
    const pids = Array.from(new Set(asg.map((a) => a.projectId)));
    h += pids.length ? '<ul class="pop-list">' + pids.map((pid) => { const p = project(pid), cs = asg.filter((a) => a.projectId === pid).map((a) => crew(a.crewId)).filter(Boolean); return '<li><span class="dot" style="background:' + p.color + '"></span><a href="#/project/' + pid + '" data-action="cal-proj" data-id="' + pid + '" data-m="' + monthKey(d) + '">' + esc(p.name) + "</a> " + '<span class="muted">' + esc(crewNames(cs)) + "</span></li>"; }).join("") + "</ul>" : '<div class="muted small">No crews booked.</div>';
    const free = freeCrews(d);
    h += '<div class="small mt-8">' + (free.length ? "Free: <b>" + esc(crewNames(free)) + "</b>" : '<span style="color:#8A5A1E">All crews busy</span>') + "</div>";
    const needs = S.needs.filter((n) => n.by === d && n.status !== "arrived");
    if (needs.length) h += '<div class="small mt-8">Deliveries: ' + needs.map((n) => { const m = material(n.materialId); return n.qty + " " + esc(m.unit) + " " + esc(m.name.replace(/\s*\(.*\)/, "").toLowerCase()); }).join(", ") + "</div>";
    if (can.manage() || role() === "site") h += '<button class="btn btn-sm btn-soft mt-12" data-action="open-assign" data-d="' + d + '">' + icon("plus") + "Book a crew</button>";
    return h;
  }

  // one month card (used side by side in the swipeable calendar)
  function monthCard(ym) {
    const t = today();
    const [yy, mm] = ym.split("-").map(Number);
    const html = monthWeeks(ym).map((wk) => {
      // one bar per project per run of consecutive days with its crews booked
      const segs = [];
      S.projects.forEach((p) => {
        let run = null;
        wk.forEach((d, i) => {
          const on = monthKey(d) === ym && assignmentsOn(d).some((a) => a.projectId === p.id);
          if (on && !run) run = { p, a: i, b: i };
          else if (on) run.b = i;
          if ((!on || i === 6) && run) { segs.push(run); run = null; }
        });
      });
      const lanes = Array.from(new Set(segs.map((x) => x.p.id)));
      const rows = lanes.length;
      const cells = wk.map((d, i) => {
        const out = monthKey(d) !== ym, sun = S.settings.sundayOff && isSunday(d);
        const free = freeCrews(d).length, needs = S.needs.filter((n) => n.by === d && n.status !== "arrived").length;
        return '<div class="cm-day' + (out ? " out" : "") + (d === t && !out ? " today" : "") + (sun ? " sun" : "") + '"' + (out ? "" : ' role="button" tabindex="0" data-action="cal-day" data-hover="day"') + ' data-d="' + d + '" style="grid-column:' + (i + 1) + ";grid-row:1 / span " + (rows + 2) + '">' +
          (out ? "" : '<span class="cm-n">' + parse(d).getDate() + "</span>" + (needs ? '<span class="cm-truck" title="Delivery due">' + icon("truck") + "</span>" : "") +
          (!sun && S.crews.length ? '<span class="cm-free' + (free ? "" : " none") + '">' + (free ? free + " free" : "All busy") + "</span>" : "")) + "</div>";
      }).join("");
      const bars = segs.map((x) => {
        const cs = Array.from(new Set(wk.slice(x.a, x.b + 1).flatMap((d) => assignmentsOn(d).filter((a) => a.projectId === x.p.id).map((a) => a.crewId)))).map(crew).filter(Boolean);
        return '<a class="cm-bar" href="#/project/' + x.p.id + '" data-action="cal-proj" data-id="' + x.p.id + '" data-m="' + ym + '" style="--c:' + x.p.color + ";grid-column:" + (x.a + 1) + " / " + (x.b + 2) + ";grid-row:" + (lanes.indexOf(x.p.id) + 2) + '" title="' + esc(x.p.name + ": " + crewNames(cs) + ". Open its calendar.") + '">' + esc(x.b > x.a ? x.p.name : shortName(x.p)) + "</a>";
      }).join("");
      return '<div class="cm-week" style="grid-template-rows:30px ' + (rows ? "repeat(" + rows + ", 18px) " : "") + '18px">' + cells + bars + "</div>";
    }).join("");
    return '<section class="card cm cm-month" data-ym="' + ym + '"><h2 class="cm-title">' + MON_LONG[mm - 1] + " " + yy + '</h2><div class="cm-dows">' + ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => "<span>" + x + "</span>").join("") + "</div>" + html + "</section>";
  }
  // months shown in the carousel: 3 back, 11 ahead
  function calMonths() { const out = []; for (let i = -3; i <= 11; i++) out.push(shiftMonth(monthKey(today()), i)); return out; }

  function viewCalendar() {
    const months = calMonths();
    if (months.indexOf(ui.calMonth) < 0) ui.calMonth = monthKey(today());
    return '<div class="page-head"><div><h1 class="page-title">Calendar' + helpBtn("Each coloured bar is a project, running across the days its crews work there. Swipe sideways (or drag, or use the arrows) to see other months. Hover over a day (tap on a phone) to see the projects, crews and deliveries. Tap a project to open its own calendar.") + "</h1></div>" +
      (can.manage() || role() === "site" ? '<button class="btn btn-primary btn-sm" data-action="open-assign">' + icon("users") + "Book a crew</button>" : "") + "</div>" +
      '<div class="row-between" style="margin-bottom:12px"><div class="cal-head"><button class="icon-btn sm" data-action="car-step" data-step="-1" aria-label="Previous month">' + icon("left") + '</button><button class="icon-btn sm" data-action="car-step" data-step="1" aria-label="Next month">' + icon("right") + '</button></div><button class="btn btn-sm" data-action="cal-today">Today</button></div>' +
      '<div class="cal-car" id="calCar">' + months.map(monthCard).join("") + "</div>";
  }

  /* carousel: start at the chosen month, remember where the user swiped to, drag with a mouse */
  function setupCarousel() {
    const car = $("#calCar"); if (!car) return;
    const cardAt = (ym) => car.querySelector('[data-ym="' + ym + '"]');
    const first = cardAt(ui.calMonth);
    if (first) car.scrollLeft = first.offsetLeft - car.offsetLeft;
    let tmr = 0;
    car.addEventListener("scroll", () => {
      clearTimeout(tmr);
      tmr = setTimeout(() => {
        const cards = Array.from(car.children);
        const x = car.scrollLeft;
        let best = cards[0];
        cards.forEach((c) => { if (Math.abs(c.offsetLeft - car.offsetLeft - x) < Math.abs(best.offsetLeft - car.offsetLeft - x)) best = c; });
        ui.calMonth = best.dataset.ym;
      }, 120);
    }, { passive: true });
    // mouse drag (touch and trackpads scroll natively)
    let drag = null;
    car.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      drag = { x: e.clientX, left: car.scrollLeft, moved: false };
    });
    window.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; car.classList.add("dragging"); hideHoverPop(); }
      if (drag.moved) car.scrollLeft = drag.left - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!drag) return;
      const moved = drag.moved, startLeft = drag.left;
      drag = null;
      if (!moved) return;
      car.classList.remove("dragging");
      // settle on the nearest month, leaning in the direction of the drag
      const cards = Array.from(car.children), w = cards[0].offsetWidth + 16;
      const dir = car.scrollLeft > startLeft ? 0.35 : -0.35;
      const idx = Math.max(0, Math.min(cards.length - 1, Math.round(car.scrollLeft / w + dir)));
      car.scrollTo({ left: cards[idx].offsetLeft - car.offsetLeft, behavior: "smooth" });
      // swallow the click that ends a drag
      const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); window.removeEventListener("click", stop, true); };
      window.addEventListener("click", stop, true);
      setTimeout(() => window.removeEventListener("click", stop, true), 50);
    });
  }
  function carStep(step) {
    const car = $("#calCar"); if (!car) return;
    const months = calMonths();
    const i = Math.max(0, Math.min(months.length - 1, months.indexOf(ui.calMonth) + step));
    ui.calMonth = months[i];
    const c = car.querySelector('[data-ym="' + ui.calMonth + '"]');
    if (c) car.scrollTo({ left: c.offsetLeft - car.offsetLeft, behavior: "smooth" });
  }

  /* one floating hover list (laptops), so it is never cut off by the carousel edges */
  let hoverTmr = 0;
  function showHoverPop(el) {
    const pop = $("#hoverPop");
    const d = el.dataset.d;
    pop.innerHTML = el.classList.contains("pc-day") ? projDayList(project(route().id), d) : dayList(d);
    pop.hidden = false;
    const r = el.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = Math.min(window.innerWidth - pw - 12, Math.max(12, r.left));
    let top = r.bottom + 4;
    if (top + ph > window.innerHeight - 12) top = Math.max(12, r.top - ph - 4);
    pop.style.left = left + "px"; pop.style.top = top + "px";
  }
  function hideHoverPop() { const pop = $("#hoverPop"); if (pop) pop.hidden = true; }

  /* project calendar: crews here / elsewhere / free, deliveries with a stock check */
  function projDayList(p, d) {
    const sunday = S.settings.sundayOff && isSunday(d);
    let h = '<div class="pop-title">' + fmtDayLong(d) + "</div>";
    const needsSun = S.needs.filter((n) => n.projectId === p.id && n.by === d);
    if (sunday && !needsSun.length) return h + '<div class="muted small">Rest day.</div>';
    if (sunday) h += '<div class="muted small">Rest day. A delivery is still due:</div>';
    const asg = assignmentsOn(d);
    const here = asg.filter((a) => a.projectId === p.id).map((a) => crew(a.crewId)).filter(Boolean);
    const other = asg.filter((a) => a.projectId !== p.id);
    const free = freeCrews(d);
    h += '<ul class="pop-list">' +
      (sunday ? "" : '<li><span class="key k-here"></span><b>Here:</b> ' + (here.length ? esc(crewNames(here)) + ' <span class="muted">(' + sum(here, (c) => crewWorkers(c.id).length) + " people)</span>" : '<span class="muted">none</span>') + "</li>" +
      '<li><span class="key k-else"></span><b>Other projects:</b> ' + (other.length ? other.map((a) => esc(crew(a.crewId).name) + ' <span class="muted">(' + esc(shortName(project(a.projectId))) + ")</span>").join(", ") : '<span class="muted">none</span>') + "</li>" +
      '<li><span class="key k-free"></span><b>Free:</b> ' + (free.length ? esc(crewNames(free)) : '<span class="muted">none</span>') + "</li></ul>");
    const needs = S.needs.filter((n) => n.projectId === p.id && n.by === d);
    if (needs.length) {
      h += '<div class="pop-sub">Materials due</div><ul class="pop-list">' + needs.map((n) => {
        const m = material(n.materialId); if (!m) return "";
        const short = n.qty - m.qty;
        const stock = n.status === "arrived" ? '<span style="color:var(--green)">Arrived</span>' : m.qty >= n.qty ? "Yard has " + m.qty + ' <span style="color:var(--green)">✓ enough</span>' : 'Yard has ' + m.qty + ' <span style="color:#8A5A1E">→ short ' + short + "</span>";
        return "<li><b>" + n.qty.toLocaleString("en-MY") + " " + esc(m.unit) + "</b> " + esc(m.name) + '<div class="small">' + stock + (n.status !== "arrived" ? ', <span class="muted">' + (n.status === "ordered" ? "ordered" : "not ordered") + "</span>" : "") + "</div>" +
          (n.status === "to buy" && can.buy() ? '<button class="btn btn-sm btn-primary mt-8" data-action="need-status" data-id="' + n.id + '" data-to="ordered">Mark ordered</button>' : "") + "</li>";
      }).join("") + "</ul>";
    }
    return h;
  }
  function projCalendar(p) {
    const ym = ui.projCalMonth || monthKey(today() >= p.start && today() <= p.end ? today() : p.start);
    ui.projCalMonth = ym;
    const t = today(), total = S.crews.length || 1;
    const cells = monthWeeks(ym).map((wk) => wk.map((d, i) => {
      const out = monthKey(d) !== ym, sun = S.settings.sundayOff && isSunday(d);
      const inRange = d >= p.start && d <= p.end;
      const asg = assignmentsOn(d), here = asg.filter((a) => a.projectId === p.id).length, other = asg.length - here, free = Math.max(0, total - asg.length);
      const needs = S.needs.filter((n) => n.projectId === p.id && n.by === d && n.status !== "arrived");
      const shortN = needs.some((n) => { const m = material(n.materialId); return m && m.qty < n.qty && n.status === "to buy"; });
      return '<div class="pc-day' + (out ? " out" : "") + (d === t ? " today" : "") + (sun ? " sun" : "") + (!inRange ? " off" : "") + '" role="button" tabindex="0" data-action="pc-day" data-hover="pday" data-d="' + d + '">' +
        '<span class="cm-n">' + parse(d).getDate() + "</span>" + (needs.length ? '<span class="cm-truck' + (shortN ? " short" : "") + '" title="' + (shortN ? "Delivery due, yard is short" : "Delivery due") + '">' + icon("truck") + "</span>" : "") +
        (!sun && !out ? '<div class="crew-bar" aria-label="' + here + " here, " + other + " elsewhere, " + free + ' free"><span class="cb-here" style="width:' + (here / total) * 100 + '%"></span><span class="cb-else" style="width:' + (other / total) * 100 + '%"></span></div><span class="pc-num">' + here + "/" + total + "</span>" : "") +
        "</div>";
    }).join("")).join("");
    return '<div class="row-between wrap" style="margin-bottom:10px">' + monthNav(ym, "pc-month") +
      '<div class="pc-legend"><span><i class="key k-here"></i>This project</span><span><i class="key k-else"></i>Other projects</span><span><i class="key k-free"></i>Free</span><span>' + icon("truck") + "Delivery</span></div></div>" +
      '<div class="cm-dows">' + ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => "<span>" + x + "</span>").join("") + '</div><div class="pc-grid">' + cells + "</div>" +
      (ui.calBack ? '<a class="back mt-12" href="#/calendar">' + icon("left") + "Back to the main calendar</a>" : "");
  }

  /* ---------- Projects ---------- */
  function viewProjects() {
    const head = '<div class="page-head"><div><h1 class="page-title">Projects</h1></div>' +
      (can.manage() ? '<button class="btn btn-primary" data-action="new-project">' + icon("plus") + "New project</button>" : "") + "</div>";
    if (!S.projects.length) return head + '<div class="card">' + empty("No projects yet.", can.manage() ? '<br><button class="btn btn-primary" data-action="new-project">Add your first project</button>' : "") + "</div>";
    const t = today();
    const finished = (p) => p.phases.length && p.phases.every((x) => x.done);
    const groups = [
      ["Running", S.projects.filter((p) => !finished(p) && p.start <= t)],
      ["Starting soon", S.projects.filter((p) => !finished(p) && p.start > t)],
      ["Finished", S.projects.filter(finished)]
    ];
    return head + groups.filter((g) => g[1].length).map((g) => '<div class="group-title">' + g[0] + '<span class="muted">' + g[1].length + "</span></div>" + projCards(g[1])).join("");
  }
  function projCards(list) {
    return '<div class="proj-grid" style="margin-bottom:22px">' + list.map((p) => {
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
    if (ui.lastProj !== id) { ui.lastProj = id; if (!ui.calJump) ui.projCalMonth = null; }
    ui.calJump = false;
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

    return (ui.calBack ? '<a class="back" href="#/calendar">' + icon("left") + "Calendar</a>" : '<a class="back" href="#/projects">' + icon("left") + "Projects</a>") +
      '<div class="page-head" style="margin-top:6px"><div><h1 class="page-title">' + esc(p.name) + '</h1><p class="page-sub">' + esc(p.client) + ", " + esc(p.location) + "</p></div>" +
      '<div class="row wrap">' + (can.tick() ? '<button class="btn" data-action="open-delay" data-id="' + p.id + '">' + icon("hourglass") + "Delay this job</button>" : "") +
      '<button class="btn" data-action="project-photo" data-id="' + p.id + '">' + icon("image") + (p.photo ? "Change site photo" : "Add site photo") + "</button></div></div>" +
      '<div class="grid-hero">' + hero(p, false) +
      '<div class="stack"><div class="card"><div class="card-head"><h2 class="card-title">Timeline</h2>' + chip(st.label, st.cls) + "</div>" + timelineHTML(p) + "</div>" +
      '<div class="card"><div class="card-head"><h2 class="card-title">Work phases</h2><span class="muted small">' + p.phases.filter((x) => x.done).length + " of " + p.phases.length + " done</span></div>" + phasesHTML(p) + "</div></div></div>" +
      '<div class="section">' + tiles("project", [
        { id: "cal", icon: "calendar", label: "Calendar", title: "Calendar, " + esc(p.name), body: () => projCalendar(p) },
        { id: "delays", icon: "hourglass", label: "Delays", count: p.delays.length, warn: lateDays(p) > 0, title: p.delays.length ? "Delays, " + plural(lateDays(p), "day") + " in total" : "Delays",
          body: () => (p.delays.length ? '<div class="list">' + p.delays.slice().reverse().map((d) => '<div class="li"><div class="li-main"><div class="li-title">+' + plural(d.days, "day") + ", " + esc(d.reason) + '</div><div class="li-sub">' + fmtDate(d.date) + (d.note ? ". " + esc(d.note) : "") + " Logged by " + esc(ROLE_LABEL[d.by] || d.by).toLowerCase() + ".</div></div></div>").join("") + "</div>" : empty("No delays logged.")) + (can.tick() ? '<button class="btn btn-soft mt-12" data-action="open-delay" data-id="' + p.id + '">' + icon("hourglass") + "Delay this job</button>" : "") },
        { id: "crews", icon: "users", label: "Crews", count: crewsAt(id, t).length, title: "Crews", body: () => myAsg.length ? '<div class="list">' + myAsg.map((a) => { const c = crew(a.crewId); return '<div class="li"><div class="li-main"><div class="li-title">' + esc(c ? c.name : "?") + ' <span class="muted small">' + esc(c ? c.trade : "") + '</span></div><div class="li-sub">' + fmtDate(a.from) + " to " + fmtDate(a.to) + "</div></div>" + (a.from <= t && a.to >= t ? chip("Here now", "good") : a.from > t ? chip("Coming", "info") : chip("Finished", "")) + "</div>"; }).join("") + "</div>" : empty("No crews booked.") },
        { id: "mat", icon: "truck", label: "Materials", count: openN.length, title: "Materials", body: () => needs.length ? '<div class="list">' + needs.map(needRow).join("") + "</div>" : empty("No materials planned.") },
        { id: "att", icon: "camera", label: "Attendance", count: recsToday.length, title: "Attendance today", body: () => recsToday.length ? crewGroupsList(recsToday.map((r) => worker(r.workerId)).filter(Boolean), (w) => { const r = recsToday.find((x) => x.workerId === w.id), e = eff(r); return '<div class="li">' + avatar(w, e.inPhoto) + '<div class="li-main"><div class="li-title">' + esc(w.name) + '</div><div class="li-sub">In ' + e.in + (e.out ? ", out " + e.out : "") + "</div></div>" + (e.out ? chip(hoursText(calcHours(r)), "") : chip("On site", "good")) + "</div>"; }) + '<a class="btn btn-soft mt-12" href="#/attendance" data-action="att-for" data-id="' + id + '">Check attendance</a>' : empty("Nobody clocked in yet today.") },
        can.seeMoney() ? { id: "money", icon: "money", label: "Money", count: RMshort(spent + labour), title: "Money", body: () => '<div class="list">' +
          '<div class="li"><div class="li-main">Contract value</div><span class="li-amt num">' + RM(p.value) + "</span></div>" +
          '<div class="li"><div class="li-main">Spent (receipts and paid bills)</div><span class="li-amt num">' + RM(spent) + "</span></div>" +
          '<div class="li"><div class="li-main">Labour (approved attendance)</div><span class="li-amt num">' + RM(Math.round(labour)) + "</span></div>" +
          '<div class="li"><div class="li-main">Received from client</div><span class="li-amt num" style="color:var(--green)">' + RM(received) + "</span></div>" +
          '<div class="li"><div class="li-main">Still expected from client</div><span class="li-amt num">' + RM(expIn) + "</span></div></div>" +
          '<div class="mt-12">' + pbar(p.value ? Math.min(1, (spent + labour) / p.value) : 0, "blue") + '<div class="small muted mt-8">' + Math.round(p.value ? ((spent + labour) / p.value) * 100 : 0) + "% of contract value used, " + Math.round(progress(p) * 100) + "% of work done.</div></div>" } : null,
        can.tick() ? { id: "qr", icon: "qr", label: "Site QR", title: "Clock-in QR code for this site", body: () => qrPoster(p) } : null
      ]) + "</div>";
  }
  function siteLink(p) { return location.href.split("#")[0] + "#/w/" + p.id; }
  function qrSvg(text) {
    if (!window.qrcode) return '<p class="muted">QR code could not be made on this device.</p>';
    const q = window.qrcode(0, "M"); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true, alt: "QR code" });
  }
  function qrPoster(p) {
    return '<div class="qr-wrap"><div class="qr-box">' + qrSvg(siteLink(p)) + "</div><div>" +
      '<p style="font-size:17px;font-weight:500">Print this and stick it at the site gate.</p>' +
      '<p class="muted mt-8">Workers scan it with their phone camera. It opens SiteBook for ' + esc(p.name) + ', they pick their name once, then clock in with a selfie.</p>' +
      '<div class="row wrap mt-16"><button class="btn btn-primary" data-action="print-qr" data-id="' + p.id + '">' + icon("download") + 'Print poster</button></div>' +
      '<p class="tiny muted mt-12">Link: ' + esc(siteLink(p)) + "</p></div></div>";
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
    const sub = [showCat ? catName(catOf(m)) : "", low ? '<span style="color:#8A5A1E;font-weight:500">Low</span>' : "", "Min " + m.min, soon.length ? soon.length + " requested" : ""].filter(Boolean).join(", ");
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

    const head = '<div class="page-head"><div><h1 class="page-title">Stock' + helpBtn("In the yard: what you have in stock, by category. To buy: what the sites still need. Tap a material to see its last movements.") + "</h1></div>" +
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

  // receipts / bills in one folder per category, with a total on each
  function moneyGroups(list, prefix) {
    return MCATS.map((c) => {
      const ms = list.filter((m) => moneyCat(m) === c.id);
      if (!ms.length) return "";
      return fold(prefix + c.id, '<span class="fold-ic">' + icon(c.icon) + "</span>" + esc(c.name), plural(ms.length, "entry", "entries"), RMshort(sum(ms, (m) => m.amount)), ms.map(moneyRow).join(""), { cls: "flat" });
    }).join("");
  }
  function moneyChips(list) {
    const counts = {};
    list.forEach((m) => { const c = moneyCat(m); counts[c] = (counts[c] || 0) + 1; });
    if (ui.moneyCat !== "all" && !counts[ui.moneyCat]) ui.moneyCat = "all";
    const b = (id, label, n) => '<button class="fchip ' + (ui.moneyCat === id ? "on" : "") + '" data-action="money-cat" data-cat="' + id + '">' + esc(label) + '<span class="n">' + n + "</span></button>";
    return '<div class="chips">' + b("all", "All", list.length) + MCATS.filter((c) => counts[c.id]).map((c) => b(c.id, c.short, counts[c.id])).join("") + "</div>";
  }
  function receiptsBody(list, emptyText) {
    if (!list.length) return empty(emptyText);
    const shown = ui.moneyCat === "all" ? null : list.filter((m) => moneyCat(m) === ui.moneyCat);
    return moneyChips(list) + (shown ? '<div class="card flat-card">' + shown.map(moneyRow).join("") + "</div>" : moneyGroups(list, "mc-"));
  }

  function viewMoney() {
    const mk = ui.moneyMonth;
    const [y, mo] = mk.split("-").map(Number);
    const pf = (m) => !ui.moneyProject || (ui.moneyProject === "none" ? !m.projectId : m.projectId === ui.moneyProject);
    const projSel = '<select class="input pill-select" data-change="moneyProject" aria-label="Filter by project"><option value="">All projects</option>' +
      S.projects.map((p) => '<option value="' + p.id + '"' + (ui.moneyProject === p.id ? " selected" : "") + ">" + esc(p.name) + "</option>").join("") +
      '<option value="none"' + (ui.moneyProject === "none" ? " selected" : "") + ">Office / no project</option></select>";
    const monthNav = '<div class="cal-head"><button class="icon-btn" data-action="money-month" data-step="-1" aria-label="Previous month">' + icon("left") + '</button><div class="cal-month" style="min-width:150px">' + MON_LONG[mo - 1] + " " + y + '</div><button class="icon-btn" data-action="money-month" data-step="1" aria-label="Next month">' + icon("right") + "</button></div>";
    const receipts = S.money.filter((m) => m.status === "paid" && monthKey(m.date) === mk && pf(m)).sort((a, b) => b.date.localeCompare(a.date));

    if (!can.seeMoney()) {
      const mine = receipts.filter((m) => m.by === role() && isOut(m));
      return '<div class="page-head"><div><h1 class="page-title">Money' + helpBtn("Receipts and cash you logged, by category. Company totals are only shown to management.") + "</h1></div>" +
        '<button class="btn btn-primary" data-action="open-receipt">' + icon("camera") + "Snap a receipt</button></div>" +
        '<div class="row-between wrap" style="margin-bottom:16px">' + monthNav + projSel + "</div>" +
        receiptsBody(mine, "You have not logged anything this month.");
    }

    const spentList = receipts.filter(isOut);
    const spent = sum(spentList, (m) => m.amount);
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
    const net6 = sum(weeks, (w) => w.inn - w.out);
    const flow = () => '<div class="dark-card"><div class="row small muted" style="gap:14px;margin-bottom:6px"><span class="row" style="gap:6px"><span class="dot" style="background:#8DB8B3"></span>Coming in</span><span class="row" style="gap:6px"><span class="dot" style="background:#A3B4CF"></span>Bills</span></div>' +
      weeks.map((w, i) => '<div class="flow-row"><span class="muted">' + (i === 0 ? "This week" : "From " + fmtDay(w.a).slice(4)) + '</span><div class="flow-bars"><span style="width:' + (w.inn / maxW) * 100 + '%;background:#8DB8B3"></span><span style="width:' + (w.out / maxW) * 100 + '%;background:#A3B4CF"></span></div><span class="num small" style="text-align:right">' + (w.inn - w.out >= 0 ? "+" : "−") + RMshort(Math.abs(w.inn - w.out)) + "</span></div>").join("") +
      '</div>';

    // where the money went
    const byCat = MCATS.map((c) => ({ c, v: sum(spentList.filter((m) => moneyCat(m) === c.id), (m) => m.amount) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
    const maxC = byCat.length ? byCat[0].v : 1;
    const spending = () => byCat.length ? byCat.map((x) => '<button class="spend-row" data-action="money-cat-open" data-cat="' + x.c.id + '"><span class="tile-ic sm">' + icon(x.c.icon) + '</span><span class="spend-name">' + esc(x.c.name) + '</span><span class="bar blue"><span style="width:' + (x.v / maxC) * 100 + '%"></span></span><span class="num spend-amt">' + RMshort(x.v) + ' <span class="muted small">' + Math.round((x.v / (spent || 1)) * 100) + "%</span></span></button>").join("") + '<p class="tiny muted mt-12">Tap a category to see its receipts.</p>' : empty("Nothing spent in " + MON_LONG[mo - 1] + ".");

    return '<div class="page-head"><div><h1 class="page-title">Money' + helpBtn("Receipts, bills to pay and money expected from clients. Use “Download for accountant” to send the list to your accountant. Wages are not included in the cash plan yet.") + "</h1></div>" +
      '<div class="row wrap"><button class="btn" data-action="export-csv">' + icon("download") + "Download for accountant</button>" +
      '<button class="btn btn-primary" data-action="open-receipt">' + icon("camera") + "Snap a receipt</button></div></div>" +
      '<div class="row-between wrap" style="margin-bottom:16px">' + monthNav + projSel + "</div>" +
      '<div class="stats">' +
      '<div class="stat"><div class="stat-label">Spent in ' + MON[mo - 1] + '</div><div class="stat-value num"><span class="unit">RM</span>' + Math.round(spent).toLocaleString("en-MY") + '</div><div class="stat-foot">' + plural(spentList.length, "receipt") + "</div></div>" +
      '<div class="stat"><div class="stat-label">Received in ' + MON[mo - 1] + '</div><div class="stat-value num" style="color:var(--green)"><span class="unit">RM</span>' + Math.round(got).toLocaleString("en-MY") + '</div><div class="stat-foot">From clients</div></div>' +
      '<div class="stat"><div class="stat-label">Expected in, next 30 days</div><div class="stat-value num"><span class="unit">RM</span>' + Math.round(exp30).toLocaleString("en-MY") + '</div><div class="stat-foot">Not received yet</div></div>' +
      "</div>" +
      tiles("money", [
        { id: "bills", icon: "calendar", label: "Bills to pay", count: bills.length, warn: bills.some((b) => b.date < today()), title: "Bills to pay, " + RMshort(sum(bills, (m) => m.amount)), body: () => (bills.length ? moneyGroups(bills, "mb-") : empty("No unpaid bills.")) + '<button class="btn btn-soft mt-12" data-action="open-receipt" data-kind="bill">' + icon("plus") + "Add a bill</button>" },
        { id: "in", icon: "in", label: "Coming in", count: incoming.length, title: "Money expected from clients, " + RMshort(sum(incoming, (m) => m.amount)), body: () => (incoming.length ? '<div class="card flat-card">' + incoming.map(moneyRow).join("") + "</div>" : empty("Nothing expected.")) + '<button class="btn btn-soft mt-12" data-action="open-receipt" data-kind="in">' + icon("plus") + "Add expected payment</button>" },
        { id: "receipts", icon: "receipt", label: "Receipts", count: spentList.length, title: "Receipts in " + MON_LONG[mo - 1], body: () => receiptsBody(spentList, "Nothing logged this month.") },
        { id: "spend", icon: "pie", label: "Where it went", count: byCat.length ? Math.round((byCat[0].v / (spent || 1)) * 100) + "%" : "", title: "Where the money went in " + MON_LONG[mo - 1], body: spending },
        { id: "cash", icon: "chart", label: "Next 6 weeks", count: (net6 >= 0 ? "+" : "−") + RMshort(Math.abs(net6)), title: "Cash for the next 6 weeks", body: flow }
      ]);
  }

  /* ---------- Attendance check ---------- */
  function waitingDays(sid) {
    const m = {};
    S.attendance.forEach((a) => { if (a.projectId === sid && a.status === "waiting" && isDone(a)) m[a.date] = (m[a.date] || 0) + 1; });
    return Object.keys(m).sort().map((d) => ({ d, n: m[d] }));
  }
  function defaultAttSite() { return role() === "site" ? siteId() : (activeProjects()[0] || S.projects[0] || {}).id; }
  // open on today whenever anyone clocked in today; otherwise the latest day still waiting for a check
  function pickAttDate(sid) {
    if (S.attendance.some((a) => a.projectId === sid && a.date === today())) return today();
    const w = waitingDays(sid); return w.length ? w[w.length - 1].d : today();
  }
  const needsConfirm = (r) => !!(r.self && ((r.self.in && !r.in && !r.rejectIn) || (r.self.out && r.in && !r.out && !r.rejectOut)));
  const partRejected = (r) => !!(r.rejectIn || r.rejectOut);

  // one plain status per worker
  function attStatus(r) {
    const mt = matchOf(r);
    if (r.status === "rejected") return { label: "Rejected", cls: "bad" };
    if (r.status === "approved") return { label: "Approved", cls: "good" };
    if (needsConfirm(r)) return { label: r.date === today() ? "Waiting for you" : "Not confirmed", cls: "warn" };
    if (mt.key === "rej") return { label: mt.label, cls: "warn" };
    if (mt.key === "diff") return { label: mt.label.replace("Times differ by", "Times differ"), cls: "warn" };
    if (mt.key === "manager") return { label: "No selfie from worker", cls: "warn" };
    if (mt.key === "out") return { label: "Check clock-out", cls: "warn" };
    if (!isDone(r)) return { label: "On site", cls: "info" };
    return { label: can.approve() ? "Ready to approve" : "Waiting for site manager", cls: "" };
  }
  const isTodo = (r) => r.status === "waiting" && (needsConfirm(r) || !!matchOf(r).flag);

  // compact row; tap to see the photos and Change / Reject
  function attRow(r) {
    const w = worker(r.workerId); if (!w) return "";
    const h = calcHours(r), e = eff(r), s = r.self || {}, st = attStatus(r), done = !!e.out;
    const dsp = openDispute(r.workerId, r.date);
    const fid = "att-" + r.id;
    const time = done ? e.in + "–" + e.out : "In " + (e.in || "");
    let btn = "", approveInBody = false;
    if (can.approve()) {
      if (needsConfirm(r) && r.date === today()) { btn = '<button class="btn btn-sm btn-primary" data-action="clock-confirm" data-id="' + r.id + '" data-act="' + (r.in ? "out" : "in") + '">' + (r.in ? "Confirm out" : "Confirm") + "</button>"; approveInBody = r.status === "waiting" && done; }
      else if (r.status === "waiting" && done) btn = '<button class="btn btn-sm btn-primary" data-action="att-ok" data-id="' + r.id + '">Approve</button>';
    }
    const icons = (s.in ? '<span class="mini-ic" title="Clocked in with a selfie">' + icon("camera") + "</span>" : "") +
      (!hasPhone(w) ? '<span class="mini-ic" title="No smartphone, clocked in by site manager">' + icon("phoneoff") + "</span>" : "") +
      (dsp ? '<span class="mini-ic warn" title="Worker report">' + icon("flag") + "</span>" : "");
    const both = s.in && r.in;
    const body =
      '<div class="ct ct-solo"><div class="ct-row ct-head"><span>Clock in</span><span>Clock out</span></div><div class="ct-row">' + timeCell(r, "in", true) + timeCell(r, "out", true) + "</div></div>" +
      (done && h ? '<div class="small">Duration ' + durLine(r) + (r.mgrReason ? ' <span class="muted">Site manager: “' + esc(r.mgrReason) + "”</span>" : "") + (can.seePay() && r.status !== "rejected" ? ' <span class="muted">Pay ' + RM(Math.round(payFor(r))) + "</span>" : "") + "</div>" : "") +
      (dsp ? '<div class="report">' + icon("flag") + "<div><b>" + esc(w.name.split(" ")[0]) + " says: " + esc(dsp.reason) + "</b>" + (dsp.note ? "<br>“" + esc(dsp.note) + "”" : "") + "</div>" + (can.approve() ? '<button class="btn btn-sm" data-action="dispute-done" data-id="' + dsp.id + '">Sorted</button>' : "") + "</div>" : "") +
      (r.status === "rejected" && r.rejectReason ? '<div class="report">' + icon("x") + "<div><b>Whole day rejected:</b> " + esc(r.rejectReason) + "</div></div>" : "") +
      (r.note ? '<div class="small muted">' + esc(r.note) + "</div>" : "") +
      (r.status === "rejected" && can.approve() ? '<div class="row wrap" style="gap:8px"><button class="btn btn-sm btn-primary" data-action="att-restore" data-id="' + r.id + '" data-part="day">' + icon("undo") + "Restore day</button></div>" :
      can.approve() ? '<div class="row wrap" style="gap:8px">' + (approveInBody ? '<button class="btn btn-sm btn-soft" data-action="att-ok" data-id="' + r.id + '">Approve</button>' : "") +
        (r.rejectIn ? '<button class="btn btn-sm btn-soft" data-action="att-restore" data-id="' + r.id + '" data-part="in">' + icon("undo") + "Restore clock in</button>" : "") +
        (r.rejectOut ? '<button class="btn btn-sm btn-soft" data-action="att-restore" data-id="' + r.id + '" data-part="out">' + icon("undo") + "Restore clock out</button>" : "") +
        '<button class="btn btn-sm btn-soft" data-action="att-edit" data-id="' + r.id + '">' + icon("edit") + "Write my time</button>" +
        '<button class="btn btn-sm btn-danger" data-action="att-no" data-id="' + r.id + '">' + icon("x") + "Reject</button></div>" : "") +
      recHistory(r);
    return '<details class="arow' + (ui.attFocus === r.workerId ? " focus" : "") + '" data-fold="' + fid + '"' + (ui.open.has(fid) || ui.attFocus === r.workerId ? " open" : "") + "><summary>" +
      '<span class="arow-pic">' + img(e.inPhoto, "", w.name) + "</span>" +
      '<span class="li-main"><span class="arow-name">' + esc(w.name) + icons + '</span><span class="arow-sub">' + esc(time) + " " + chip(st.label, st.cls) + "</span></span>" +
      btn + '</summary><div class="arow-body">' + body + "</div></details>";
  }

  /* Clock in | Clock out table. Big time, small date. The worker's original time always stays visible. */
  function timeCell(r, side, withPhoto) {
    const s = r.self || {}, og = r.orig || {};
    const wT = s[side], mT = r[side], oT = og[side];
    const rej = side === "in" ? r.rejectIn : r.rejectOut;
    const fin = eff(r)[side];
    const photo = side === "in" ? (s.inPhoto || r.inPhoto) : (s.outPhoto || r.outPhoto);
    let src = "";
    if (wT && mT && wT !== mT) src = "Worker " + esc(wT) + (rej ? " (rejected)" : "") + ", site manager wrote " + esc(mT);
    else if (wT && mT) src = "Selfie, confirmed";
    else if (wT) src = rej ? "Worker " + esc(wT) + ", rejected" : "Selfie, not confirmed yet";
    else if (mT) src = oT && oT !== mT ? "Photo " + esc(oT) + ", site manager wrote " + esc(mT) : oT ? "Site manager photo" : "Written by site manager";
    return '<div class="ct-cell' + (rej && !mT ? " rej" : "") + '">' + (withPhoto ? '<div class="ct-photo">' + (photo ? img(photo, "", side === "in" ? "Clock in photo" : "Clock out photo") : '<div class="photo-missing">No photo</div>') + "</div>" : "") +
      '<div class="ct-time num">' + (fin ? esc(fin) : rej ? '<s>' + esc(wT || oT || "") + "</s>" : "–") + "</div>" +
      '<div class="ct-date">' + fmtDay(r.date) + "</div>" +
      (src ? '<div class="ct-src">' + src + "</div>" : !fin ? '<div class="ct-src">' + (side === "out" ? "Not out yet" : "No clock-in") + "</div>" : "") +
      (rej ? '<div class="ct-rej">Rejected: ' + esc(rej.reason) + "</div>" : "") + "</div>";
  }
  function durLine(r) {
    const h = calcHours(r);
    if (!h) return "";
    if (h.open) return '<span class="muted">Still on site</span>';
    return "<b>" + hrs(h.final.worked) + "</b>" + (h.auto.round !== "exact" ? ' <span class="muted">(' + ROUNDING[h.auto.round].toLowerCase() + ", exact " + hrs(h.auto.raw) + ")</span>" : "") + ' <span class="muted">' + esc(hoursText(h)) + "</span>";
  }
  // rows of days; opts.names shows the worker's name in the first column
  function ctTable(recs, opts) {
    opts = opts || {};
    const head = '<div class="ct-row ct-head' + (opts.names ? " named" : "") + '">' + (opts.names ? "<span>Worker</span>" : "") + "<span>" + (opts.inLabel || "Clock in") + "</span><span>" + (opts.outLabel || "Clock out") + "</span></div>";
    return '<div class="ct">' + head + recs.map((r) => {
      const w = worker(r.workerId), st = opts.status ? opts.status(r) : attStatus(r);
      const meta = '<div class="ct-meta">' + (opts.names ? '<b class="ct-name">' + esc(w ? w.name : "?") + "</b>" : "") + '<span class="ct-dur">' + durLine(r) + "</span> " + chip(st.label, st.cls) + "</div>";
      return '<div class="ct-row' + (opts.names ? " named" : "") + '">' + meta + timeCell(r, "in", opts.photos) + timeCell(r, "out", opts.photos) + "</div>";
    }).join("") + "</div>";
  }

  function recHistory(r) {
    const list = S.audit.filter((a) => a.recId === r.id || (a.workerId === r.workerId && a.forDate === r.date && !a.recId));
    if (!list.length) return "";
    return '<div class="au-mini"><div class="day-sec-title">' + icon("history", ' style="width:14px;height:14px;vertical-align:-2px"') + " History</div>" + list.slice(0, 8).map((a) => auditRow(a)).join("") + "</div>";
  }

  /* ---------- History page (audit trail) ---------- */
  function viewHistory() {
    if (!(role() === "boss" || role() === "site")) return '<div class="card">' + empty("History is for management and site managers.") + "</div>";
    const tab = ui.auTab || "times", q = (ui.auQ || "").toLowerCase();
    const tabs = '<div class="tiles att-tabs">' + [["times", "Clock times"], ["actions", "All actions"]].map((x) => '<button class="tile' + (tab === x[0] ? " on" : "") + '" data-action="au-tab" data-t="' + x[0] + '"><span class="tile-label">' + x[1] + "</span></button>").join("") + "</div>";
    const search = '<div class="search">' + icon("search") + '<input class="input" type="search" placeholder="Search a worker' + (tab === "actions" ? " or person" : "") + '" value="' + esc(ui.auQ || "") + '" data-input="auQ" aria-label="Search"></div>';
    const head = backLink() + '<div class="page-head"><div><h1 class="page-title">History' + helpBtn("Clock times: every worker's clock in and clock out, with the worker's original time kept next to any time the site manager wrote. All actions: every button pressed by site managers and workers, with the reason. Nothing here can be edited or deleted, so workers are protected.") + "</h1></div>" +
      (can.seePay() ? '<button class="btn btn-sm" data-action="au-csv">' + icon("download") + "Download</button>" : "") + "</div>" + tabs + search;
    if (tab === "times") {
      const from = addDays(today(), -30);
      const recs = S.attendance.filter((a) => a.date >= from && (role() === "boss" || a.projectId === siteId()) && (!q || ((worker(a.workerId) || {}).name || "").toLowerCase().includes(q)))
        .sort((a, b) => b.date.localeCompare(a.date) || (eff(b).in || "").localeCompare(eff(a).in || ""));
      const days = {};
      recs.slice(0, 400).forEach((a) => { (days[a.date] = days[a.date] || []).push(a); });
      return head + (Object.keys(days).length ? Object.keys(days).sort().reverse().map((d) => '<div class="crew-head">' + (d === today() ? "Today" : fmtDayLong(d)) + '<span class="muted">' + days[d].length + "</span></div>" + '<div class="card ct-card">' + ctTable(days[d], { names: true }) + "</div>").join("") : '<div class="card">' + empty("No clock-ins found.") + "</div>");
    }
    const f = ui.auFilter || "all";
    const list = S.audit.filter((a) => (f === "all" || a.by === f) && (!q || ((worker(a.workerId) || {}).name || "").toLowerCase().includes(q) || (a.byName || "").toLowerCase().includes(q)));
    const chipB = (k, l) => '<button class="fchip ' + (f === k ? "on" : "") + '" data-action="au-filter" data-f="' + k + '">' + l + "</button>";
    const days = {};
    list.slice(0, 300).forEach((a) => { (days[a.date] = days[a.date] || []).push(a); });
    return head + '<div class="chips mt-12">' + chipB("all", "Everyone") + chipB("site", "Site manager") + chipB("worker", "Workers") + chipB("boss", "Management") + "</div>" +
      (Object.keys(days).length ? Object.keys(days).sort().reverse().map((d) => '<div class="crew-head">' + (d === today() ? "Today" : fmtDayLong(d)) + '<span class="muted">' + days[d].length + '</span></div><div class="card alist au-list">' + days[d].map((a) => auditRow(a)).join("") + "</div>").join("") : '<div class="card">' + empty("Nothing recorded yet.") + "</div>");
  }
  const backLink = (label, href) => href ? '<a class="back" href="' + href + '">' + icon("left") + esc(label) + "</a>" : '<button class="back" data-action="go-back">' + icon("left") + esc(label || "Back") + "</button>";

  /* ---------- Rejected bin ---------- */
  function viewBin() {
    if (!(role() === "boss" || role() === "site")) return '<div class="card">' + empty("Only for management and site managers.") + "</div>";
    const list = S.attendance.filter((a) => (a.status === "rejected" || partRejected(a)) && (role() === "boss" || a.projectId === siteId())).sort((a, b) => b.date.localeCompare(a.date));
    const what = (r) => r.status === "rejected" ? "Whole day" : r.rejectIn && r.rejectOut ? "Clock in and clock out" : r.rejectIn ? "Clock in" : "Clock out";
    const reason = (r) => r.status === "rejected" ? r.rejectReason : (r.rejectIn || r.rejectOut).reason;
    const restore = (r) => !can.approve() ? "" : r.status === "rejected" ? '<button class="btn btn-sm btn-primary" data-action="att-restore" data-id="' + r.id + '" data-part="day">' + icon("undo") + "Restore</button>" :
      (r.rejectIn ? '<button class="btn btn-sm btn-primary" data-action="att-restore" data-id="' + r.id + '" data-part="in">' + icon("undo") + "Restore in</button>" : "") + (r.rejectOut ? '<button class="btn btn-sm btn-primary" data-action="att-restore" data-id="' + r.id + '" data-part="out">' + icon("undo") + "Restore out</button>" : "");
    return backLink("Check attendance", "#/attendance") +
      '<div class="page-head"><div><h1 class="page-title">Rejected' + helpBtn("Clock-ins, clock-outs and whole days the site manager rejected. Nothing is deleted. Restore one if it was rejected by mistake. Every reject and restore is in History.") + "</h1></div></div>" +
      (list.length ? '<div class="card alist">' + list.map((r) => { const w = worker(r.workerId), e = eff(r); return '<div class="li">' + '<span class="arow-pic">' + img(e.inPhoto, "", w ? w.name : "") + '</span><div class="li-main"><div class="li-title">' + esc(w ? w.name : "?") + ' <span class="chip bad">' + what(r) + '</span></div><div class="li-sub">' + fmtDay(r.date) + ", " + esc(project(r.projectId) ? project(r.projectId).name : "") + (reason(r) ? ". “" + esc(reason(r)) + "”" : "") + '</div></div><div class="row" style="gap:6px">' + restore(r) + "</div></div>"; }).join("") + "</div>" : '<div class="card">' + empty("Nothing rejected.") + "</div>");
  }

  // one short line listing other days that still need a look (waiting records and/or worker reports)
  function otherDaysLine(sid, d, reports) {
    const m = {};
    waitingDays(sid).forEach((x) => { if (x.d !== d) (m[x.d] = m[x.d] || { n: 0, r: 0 }).n = x.n; });
    reports.forEach((x) => { (m[x.date] = m[x.date] || { n: 0, r: 0 }).r++; });
    const days = Object.keys(m).sort().reverse();
    if (!days.length) return "";
    return '<div class="wait-days small"><span class="muted">Other days:</span>' + days.map((k) => '<button class="chip warn" data-action="att-goto" data-d="' + k + '">' + fmtDay(k) + (m[k].n ? ", " + m[k].n + " waiting" : "") + (m[k].r ? (m[k].n ? " + report" : ", report") : "") + "</button>").join("") + "</div>";
  }

  function viewAttendance() {
    const sid = ui.attSite || defaultAttSite();
    ui.attSite = sid;
    const d = ui.attDate;
    const p = project(sid);
    const focus = (r) => (ui.attFocus && r.workerId === ui.attFocus ? -1 : 0);
    const order = (r) => (isTodo(r) ? 0 : r.status === "waiting" && isDone(r) ? 1 : r.status === "waiting" ? 2 : r.status === "approved" ? 3 : 4);
    const recs = S.attendance.filter((a) => a.projectId === sid && a.date === d).sort((a, b) => focus(a) - focus(b) || order(a) - order(b));
    const expected = expectedWorkers(sid, d);
    const missing = expected.filter((w) => !recs.some((r) => r.workerId === w.id));
    const rejected = recs.filter((r) => r.status === "rejected" || partRejected(r));
    const live = recs.filter((r) => r.status !== "rejected");
    const todo = live.filter(isTodo);
    const easy = recs.filter((r) => r.status === "waiting" && isDone(r) && !matchOf(r).flag && !needsConfirm(r));
    let tab = ui.attFilter;
    if (["todo", "all", "missing", "rejected"].indexOf(tab) < 0) tab = todo.length ? "todo" : "all";
    const otherReports = S.disputes.filter((x) => x.status === "open" && x.projectId === sid && x.date !== d);

    const controls = '<div class="att-controls"><div class="date-step"><button class="icon-btn sm" data-action="att-day" data-step="-1" aria-label="Previous day">' + icon("left") + '</button><b>' + (d === today() ? "Today" : fmtDay(d)) + '</b><button class="icon-btn sm" data-action="att-day" data-step="1" aria-label="Next day"' + (d >= today() ? " disabled" : "") + ">" + icon("right") + "</button></div>" +
      '<select class="input pill-select" data-change="attSite" aria-label="Site">' + S.projects.map((x) => '<option value="' + x.id + '"' + (x.id === sid ? " selected" : "") + ">" + esc(x.name) + "</option>").join("") + "</select></div>";
    const tabs = '<div class="tiles att-tabs">' + [["todo", "To do", todo.length, todo.length > 0], ["all", "Everyone", live.length], ["missing", "Not in", missing.length], ["rejected", "Rejected", rejected.length]].map((x) =>
      '<button class="tile' + (tab === x[0] ? " on" : "") + (x[3] ? " warn" : "") + '" data-action="att-filter" data-f="' + x[0] + '"><span class="tile-label">' + x[1] + '</span><span class="tile-n">' + x[2] + "</span></button>").join("") + "</div>";
    const wages = can.seePay() ? '<p class="att-wages small"><span class="muted">Wages for the day (approved)</span> <b class="num">' + RM(Math.round(sum(recs.filter((r) => r.status === "approved"), payFor))) + "</b></p>" : "";
    const missingRow = (w) => { const dsp = openDispute(w.id, d); return '<div class="li">' + avatar(w) + '<div class="li-main"><div class="li-title">' + esc(w.name) + (dsp ? '<span class="mini-ic warn" title="Worker report: ' + esc(dsp.reason) + '">' + icon("flag") + "</span>" : "") + '</div><div class="li-sub">' + esc(crew(w.crewId) ? crew(w.crewId).name : "") + "</div></div>" + (can.approve() ? '<button class="btn btn-sm btn-soft" data-action="att-add" data-w="' + w.id + '">Add by hand</button>' : "") + "</div>"; };
    const byCrew = (list) => {
      const g = {};
      list.forEach((r) => { const c = (worker(r.workerId) || {}).crewId || "none"; (g[c] = g[c] || []).push(r); });
      return Object.keys(g).map((c) => '<div class="crew-head">' + esc(crew(c) ? crew(c).name : "Other") + '<span class="muted">' + g[c].length + '</span></div><div class="card alist">' + g[c].map(attRow).join("") + "</div>").join("");
    };
    let list;
    if (tab === "todo") list = todo.length ? '<div class="card alist">' + todo.map(attRow).join("") + "</div>" : '<div class="card">' + empty("Nothing to do. Everyone is confirmed.") + "</div>";
    else if (tab === "missing") list = missing.length ? '<div class="card alist">' + missing.map(missingRow).join("") + "</div>" : '<div class="card">' + empty("Everyone booked here clocked in.") + "</div>";
    else if (tab === "rejected") list = rejected.length ? '<div class="card alist">' + rejected.map(attRow).join("") + '</div><p class="small muted mt-12">Rejected days are never deleted. Restore one if it was a mistake. <a class="link-btn small" href="#/bin">All rejected days</a></p>' : '<div class="card">' + empty("Nothing rejected on this day.", '<br><a class="btn btn-soft btn-sm" href="#/bin">' + icon("bin") + "All rejected days</a>") + "</div>";
    else list = live.length ? byCrew(live) : '<div class="card">' + empty(isSunday(d) ? "Sunday. Rest day." : "Nobody clocked in at this site on this day.") + "</div>";

    const help = can.approve() ? "To do: workers waiting for you to confirm, or where your time and the worker's differ by more than " + S.settings.matchMinutes + " minutes. Hours are worked out automatically, but you have the final say. Tap a worker to see the photos, change the hours or reject the day."
      : "Only the site manager can confirm, approve or change attendance. Tap a worker to see the photos.";
    return '<div class="page-head"><div><h1 class="page-title">Check attendance' + helpBtn(help) + "</h1></div>" +
      (can.approve() && easy.length ? '<button class="btn btn-primary btn-sm" data-action="att-all">' + icon("check") + "Approve " + easy.length + " ready</button>" : "") + "</div>" +
      controls + otherDaysLine(sid, d, otherReports) + (p ? tabs + wages : "") + list;
  }

  /* ---------- Construction worker (own phone) ---------- */
  // Worker screen words. Everything except English is a DRAFT: a native speaker must check it before real use.
  const LANGS = { en: "English", ms: "Bahasa Malaysia", bn: "বাংলা (Bengali)", ne: "नेपाली (Nepali)", id: "Bahasa Indonesia", my: "မြန်မာ (Burmese)" };
  const T = {
    en: { myHistory: "My history", myHistorySub: "Everything done to your days", today: "Today", notYet: "Not yet", hi: "Hi", clockIn: "Clock in", clockOut: "Clock out", inSince: "In since", doneToday: "Done for today", confirmed: "Site manager confirmed", waitingConfirm: "Waiting for site manager to confirm", tomorrow: "Tomorrow", restDay: "Rest day", noJob: "Not booked yet", myPay: "My pay this month", days: "days", ot: "OT", checked: "checked", waiting: "waiting", dayRate: "Day rate", otRate: "OT per hour", payDay: "Pay day", myDays: "My days", wrong: "Something wrong? Tell site manager", takePhoto: "Take a selfie", confirm: "Confirm", retake: "Retake", onSite: "You are at the site", notOnSite: "You are not at the site. Go to the site to clock in.", send: "Send", whichDay: "Which day?", whatsWrong: "What is wrong?", wrongTime: "Wrong time", missingDay: "Day missing", wrongOT: "Wrong OT", other: "Other", sent: "Sent to site manager", language: "Language", scanQR: "Scan the QR code at the site gate", scan: "Scan QR code", whoAreYou: "Who are you?", notYou: "Not you?", approved: "Checked", rejected: "Not paid", hours: "hours", note: "Tell us more (optional)", noDays: "No days yet this month." },
    ms: { myHistory: "Sejarah saya", myHistorySub: "Semua perubahan pada hari kerja anda", today: "Hari ini", notYet: "Belum", hi: "Hai", clockIn: "Masuk kerja", clockOut: "Keluar kerja", inSince: "Masuk sejak", doneToday: "Selesai hari ini", confirmed: "Disahkan oleh pengurus tapak", waitingConfirm: "Menunggu pengesahan pengurus tapak", tomorrow: "Esok", restDay: "Hari rehat", noJob: "Belum dijadualkan", myPay: "Gaji saya bulan ini", days: "hari", ot: "OT", checked: "disahkan", waiting: "menunggu", dayRate: "Kadar harian", otRate: "OT sejam", payDay: "Hari gaji", myDays: "Hari kerja saya", wrong: "Ada masalah? Beritahu pengurus tapak", takePhoto: "Ambil swafoto", confirm: "Sahkan", retake: "Ambil semula", onSite: "Anda berada di tapak", notOnSite: "Anda tiada di tapak. Pergi ke tapak untuk masuk kerja.", send: "Hantar", whichDay: "Hari apa?", whatsWrong: "Apa masalahnya?", wrongTime: "Masa salah", missingDay: "Hari tiada", wrongOT: "OT salah", other: "Lain-lain", sent: "Dihantar kepada pengurus tapak", language: "Bahasa", scanQR: "Imbas kod QR di pintu masuk tapak", scan: "Imbas kod QR", whoAreYou: "Siapa anda?", notYou: "Bukan anda?", approved: "Disahkan", rejected: "Tidak dibayar", hours: "jam", note: "Ceritakan lagi (pilihan)", noDays: "Belum ada hari kerja bulan ini." },
    id: { myHistory: "Riwayat saya", myHistorySub: "Semua perubahan pada hari kerja Anda", today: "Hari ini", notYet: "Belum", hi: "Halo", clockIn: "Absen masuk", clockOut: "Absen pulang", inSince: "Masuk sejak", doneToday: "Selesai hari ini", confirmed: "Dikonfirmasi manajer lapangan", waitingConfirm: "Menunggu konfirmasi manajer lapangan", tomorrow: "Besok", restDay: "Hari libur", noJob: "Belum dijadwalkan", myPay: "Gaji saya bulan ini", days: "hari", ot: "lembur", checked: "dikonfirmasi", waiting: "menunggu", dayRate: "Upah harian", otRate: "Lembur per jam", payDay: "Hari gajian", myDays: "Hari kerja saya", wrong: "Ada yang salah? Beri tahu manajer lapangan", takePhoto: "Ambil swafoto", confirm: "Konfirmasi", retake: "Ulangi", onSite: "Anda berada di lokasi", notOnSite: "Anda tidak di lokasi. Pergi ke lokasi untuk absen.", send: "Kirim", whichDay: "Hari apa?", whatsWrong: "Apa yang salah?", wrongTime: "Jam salah", missingDay: "Hari hilang", wrongOT: "Lembur salah", other: "Lainnya", sent: "Terkirim ke manajer lapangan", language: "Bahasa", scanQR: "Pindai kode QR di gerbang lokasi", scan: "Pindai kode QR", whoAreYou: "Siapa Anda?", notYou: "Bukan Anda?", approved: "Dikonfirmasi", rejected: "Tidak dibayar", hours: "jam", note: "Ceritakan lebih lanjut (opsional)", noDays: "Belum ada hari kerja bulan ini." },
    bn: { myHistory: "আমার ইতিহাস", myHistorySub: "আপনার কাজের দিনে করা সব পরিবর্তন", today: "আজ", notYet: "এখনও না", hi: "হ্যালো", clockIn: "কাজ শুরু", clockOut: "কাজ শেষ", inSince: "শুরু হয়েছে", doneToday: "আজকের কাজ শেষ", confirmed: "সাইট ম্যানেজার নিশ্চিত করেছেন", waitingConfirm: "সাইট ম্যানেজারের নিশ্চিতকরণের অপেক্ষায়", tomorrow: "আগামীকাল", restDay: "ছুটির দিন", noJob: "এখনও ঠিক হয়নি", myPay: "এই মাসে আমার বেতন", days: "দিন", ot: "ওভারটাইম", checked: "নিশ্চিত", waiting: "অপেক্ষায়", dayRate: "দৈনিক মজুরি", otRate: "প্রতি ঘণ্টা ওভারটাইম", payDay: "বেতনের দিন", myDays: "আমার কাজের দিন", wrong: "কিছু ভুল? সাইট ম্যানেজারকে জানান", takePhoto: "সেলফি তুলুন", confirm: "নিশ্চিত করুন", retake: "আবার তুলুন", onSite: "আপনি সাইটে আছেন", notOnSite: "আপনি সাইটে নেই। কাজ শুরু করতে সাইটে যান।", send: "পাঠান", whichDay: "কোন দিন?", whatsWrong: "কী ভুল?", wrongTime: "সময় ভুল", missingDay: "দিন বাদ পড়েছে", wrongOT: "ওভারটাইম ভুল", other: "অন্যান্য", sent: "সাইট ম্যানেজারকে পাঠানো হয়েছে", language: "ভাষা", scanQR: "সাইটের গেটে QR কোড স্ক্যান করুন", scan: "QR কোড স্ক্যান করুন", whoAreYou: "আপনি কে?", notYou: "আপনি নন?", approved: "নিশ্চিত", rejected: "বেতন হবে না", hours: "ঘণ্টা", note: "আরও বলুন (ঐচ্ছিক)", noDays: "এই মাসে এখনও কোনো দিন নেই।" },
    ne: { myHistory: "मेरो इतिहास", myHistorySub: "तपाईंका कामका दिनमा गरिएका सबै परिवर्तन", today: "आज", notYet: "अझै छैन", hi: "नमस्ते", clockIn: "काम सुरु", clockOut: "काम सकियो", inSince: "सुरु भएको", doneToday: "आजको काम सकियो", confirmed: "साइट म्यानेजरले पुष्टि गर्नुभयो", waitingConfirm: "साइट म्यानेजरको पुष्टिको पर्खाइमा", tomorrow: "भोलि", restDay: "बिदाको दिन", noJob: "अझै तय भएको छैन", myPay: "यो महिनाको मेरो तलब", days: "दिन", ot: "ओभरटाइम", checked: "पुष्टि भयो", waiting: "पर्खाइमा", dayRate: "दैनिक ज्याला", otRate: "प्रति घण्टा ओभरटाइम", payDay: "तलब आउने दिन", myDays: "मेरा कामका दिन", wrong: "केही गलत छ? साइट म्यानेजरलाई भन्नुहोस्", takePhoto: "सेल्फी खिच्नुहोस्", confirm: "पुष्टि गर्नुहोस्", retake: "फेरि खिच्नुहोस्", onSite: "तपाईं साइटमा हुनुहुन्छ", notOnSite: "तपाईं साइटमा हुनुहुन्न। काम सुरु गर्न साइटमा जानुहोस्।", send: "पठाउनुहोस्", whichDay: "कुन दिन?", whatsWrong: "के गलत छ?", wrongTime: "समय गलत", missingDay: "दिन छुट्यो", wrongOT: "ओभरटाइम गलत", other: "अन्य", sent: "साइट म्यानेजरलाई पठाइयो", language: "भाषा", scanQR: "साइटको गेटमा QR कोड स्क्यान गर्नुहोस्", scan: "QR कोड स्क्यान गर्नुहोस्", whoAreYou: "तपाईं को हो?", notYou: "तपाईं होइन?", approved: "पुष्टि भयो", rejected: "तलब हुँदैन", hours: "घण्टा", note: "थप भन्नुहोस् (ऐच्छिक)", noDays: "यो महिना अझै कुनै दिन छैन।" },
    my: { myHistory: "ကျွန်ုပ်၏ မှတ်တမ်း", myHistorySub: "သင့်အလုပ်ရက်များအတွက် ပြောင်းလဲမှုအားလုံး", today: "ဒီနေ့", notYet: "မရှိသေး", hi: "မင်္ဂလာပါ", clockIn: "အလုပ်ဝင်", clockOut: "အလုပ်ဆင်း", inSince: "ဝင်ချိန်", doneToday: "ဒီနေ့ အလုပ်ပြီးပါပြီ", confirmed: "ဆိုက်မန်နေဂျာ အတည်ပြုပြီး", waitingConfirm: "ဆိုက်မန်နေဂျာ အတည်ပြုရန် စောင့်နေသည်", tomorrow: "မနက်ဖြန်", restDay: "အနားယူရက်", noJob: "မသတ်မှတ်ရသေး", myPay: "ဒီလ ကျွန်ုပ်၏ လစာ", days: "ရက်", ot: "အချိန်ပို", checked: "အတည်ပြုပြီး", waiting: "စောင့်ဆိုင်းဆဲ", dayRate: "နေ့စား လုပ်ခ", otRate: "တစ်နာရီ အချိန်ပိုခ", payDay: "လစာထုတ်ရက်", myDays: "ကျွန်ုပ်၏ အလုပ်ရက်များ", wrong: "မှားနေလား? ဆိုက်မန်နေဂျာကို ပြောပါ", takePhoto: "ဆယ်လ်ဖီ ရိုက်ပါ", confirm: "အတည်ပြုပါ", retake: "ပြန်ရိုက်ပါ", onSite: "သင် ဆိုက်တွင် ရှိနေသည်", notOnSite: "သင် ဆိုက်တွင် မရှိပါ။ အလုပ်ဝင်ရန် ဆိုက်သို့ သွားပါ။", send: "ပို့ပါ", whichDay: "ဘယ်နေ့လဲ?", whatsWrong: "ဘာမှားနေလဲ?", wrongTime: "အချိန် မှားသည်", missingDay: "ရက် ကျန်နေသည်", wrongOT: "အချိန်ပို မှားသည်", other: "အခြား", sent: "ဆိုက်မန်နေဂျာထံ ပို့ပြီးပါပြီ", language: "ဘာသာစကား", scanQR: "ဆိုက်ဂိတ်ရှိ QR ကုဒ်ကို စကင်ဖတ်ပါ", scan: "QR ကုဒ် စကင်ဖတ်ပါ", whoAreYou: "သင် ဘယ်သူလဲ?", notYou: "သင် မဟုတ်ဘူးလား?", approved: "အတည်ပြုပြီး", rejected: "လစာ မရ", hours: "နာရီ", note: "ထပ်ပြောပါ (မဖြစ်မနေမဟုတ်)", noDays: "ဒီလ အလုပ်ရက် မရှိသေးပါ။" }
  };
  const W = () => S.people.worker;
  const me = () => worker(W().workerId);
  const wlang = () => (me() && me().lang) || W().lang || "en";
  const tr = (k) => (T[wlang()] && T[wlang()][k]) || T.en[k] || k;
  function wTodayRec() { const w = me(); return w ? S.attendance.find((a) => a.workerId === w.id && a.date === today()) : null; }
  function payDayFor(mk) { const [y, m] = mk.split("-").map(Number); return toISO(new Date(y, m, S.settings.payDay || 7)); }
  function workerMonth(w, mk) {
    const recs = S.attendance.filter((a) => a.workerId === w.id && monthKey(a.date) === mk && isDone(a)).sort((a, b) => b.date.localeCompare(a.date));
    let days = 0, ot = 0, checked = 0, waiting = 0;
    recs.forEach((r) => {
      if (r.status === "rejected") return;
      const f = calcHours(r).final;
      days += f.half ? 0.5 : 1; ot += f.ot;
      if (r.status === "approved") checked += payFor(r); else waiting += payFor(r);
    });
    return { recs, days, ot, checked, waiting };
  }
  function langPick() {
    return '<label class="lang-pick">' + icon("globe") + '<select data-change="wlang" aria-label="Language">' + Object.keys(LANGS).map((k) => '<option value="' + k + '"' + (wlang() === k ? " selected" : "") + ">" + LANGS[k] + "</option>").join("") + "</select></label>";
  }

  function viewWorker() {
    const st = W();
    const head = (title, sub) => '<div class="w-head"><div><h1 class="greet">' + title + "</h1>" + (sub ? '<p class="page-sub">' + sub + "</p>" : "") + "</div>" + langPick() + "</div>";
    if (!st.siteId || !project(st.siteId)) {
      return '<div class="w-wrap">' + head(tr("scanQR")) +
        '<div class="card w-scan"><div class="w-qr">' + icon("qr") + "</div>" +
        '<button class="w-big" data-action="w-scan">' + icon("camera") + "<span>" + tr("scan") + "</span></button>" +
        '<p class="small muted mt-16" style="text-align:center">Demo: on a real phone the camera opens and reads the poster at the gate. Here you pick the site instead.</p></div></div>';
    }
    const site = project(st.siteId);
    if (!me()) {
      const t = today();
      const here = expectedWorkers(site.id, t);
      const q = (ui.wq || "").toLowerCase();
      const list = here.concat(S.workers.filter((w) => !here.includes(w))).filter((w) => !q || w.name.toLowerCase().includes(q));
      return '<div class="w-wrap">' + head(tr("whoAreYou"), esc(site.name)) +
        '<div class="search">' + icon("search") + '<input class="input" type="search" placeholder="Type your name" value="' + esc(ui.wq || "") + '" data-input="wq" aria-label="Your name"></div>' +
        '<div class="w-people mt-16">' + list.slice(0, q ? 40 : 24).map((w) => '<button class="w-person" data-action="w-pick" data-w="' + w.id + '">' + avatar(w) + "<span>" + esc(w.name) + '<small class="muted">' + esc(crew(w.crewId) ? crew(w.crewId).name : "") + "</small></span></button>").join("") + "</div></div>";
    }
    const w = me(), r = wTodayRec(), s = (r && r.self) || {};
    const t = today(), tm = addDays(t, 1);
    const asg = assignmentsOn(tm).find((a) => a.crewId === w.crewId);
    const tomorrowTxt = S.settings.sundayOff && isSunday(tm) ? tr("restDay") : asg ? esc(project(asg.projectId).name) : tr("noJob");
    let big;
    if (!s.in) big = '<button class="w-big" data-action="w-clock" data-act="in">' + icon("camera") + "<span>" + tr("clockIn") + "</span></button>";
    else if (!s.out) big = '<button class="w-big out" data-action="w-clock" data-act="out">' + icon("camera") + "<span>" + tr("clockOut") + "</span><small>" + tr("inSince") + " " + esc(s.in) + "</small></button>";
    else big = '<div class="w-big done">' + icon("check") + "<span>" + tr("doneToday") + "</span><small>" + esc(s.in) + " – " + esc(s.out) + "</small></div>";
    const confirmLine = s.in ? '<div class="card w-today"><div class="w-today-head">' + tr("today") + '</div><div class="att-photos">' +
      "<figure>" + img(s.inPhoto, "", tr("clockIn")) + "<figcaption>" + tr("clockIn") + " " + esc(s.in) + "</figcaption></figure>" +
      "<figure>" + (s.out ? img(s.outPhoto, "", tr("clockOut")) : '<div class="photo-missing">' + tr("notYet") + "</div>") + "<figcaption>" + tr("clockOut") + " " + (s.out ? esc(s.out) : "–") + "</figcaption></figure></div>" +
      (needsConfirm(r) ? '<div class="w-status wait">' + icon("clock") + tr("waitingConfirm") + "</div>" : '<div class="w-status">' + icon("check") + tr("confirmed") + (r.confirmedIn ? " " + esc(s.out && r.confirmedOut ? r.confirmedOut : r.confirmedIn) : "") + "</div>") + "</div>" : "";
    const mk = monthKey(t), m = workerMonth(w, mk);
    const hourly = w.dayRate / S.settings.normalHours * S.settings.otRate;
    const dayRows = m.recs.length ? ctTable(m.recs, { inLabel: tr("clockIn"), outLabel: tr("clockOut"), status: (x) => x.status === "approved" ? { label: tr("approved") + (can.seePay() ? "" : ", " + RM(Math.round(payFor(x)))), cls: "good" } : x.status === "rejected" ? { label: tr("rejected") + (x.rejectReason ? ": " + x.rejectReason : ""), cls: "bad" } : { label: tr("waiting") + ", " + RM(Math.round(payFor(x))), cls: "warn" } }) : empty(tr("noDays"));
    return '<div class="w-wrap">' +
      '<div class="w-head"><div><h1 class="greet">' + tr("hi") + " " + esc(w.name.replace(/^(Md\.|Mohd)\s+/, "").split(" ")[0]) + '</h1><p class="page-sub">' + esc(site.name) + ", " + fmtDay(t) + ' <button class="link-btn small" data-action="w-notme">' + tr("notYou") + "</button></p></div>" + langPick() + "</div>" +
      big + confirmLine +
      '<div class="card w-tomorrow">' + icon("calendar") + "<span><span class=\"muted\">" + tr("tomorrow") + "</span><b>" + tomorrowTxt + "</b></span></div>" +
      '<div class="card w-pay"><div class="muted">' + tr("myPay") + '</div><div class="w-pay-num num">' + RM(Math.round(m.checked + m.waiting)) + "</div>" +
      '<div class="w-pay-grid"><div><b class="num">' + m.days + "</b><span>" + tr("days") + '</span></div><div><b class="num">' + hrs(m.ot) + "</b><span>" + tr("ot") + '</span></div><div><b class="num">' + RMshort(Math.round(m.checked)) + "</b><span>" + tr("checked") + '</span></div><div><b class="num">' + RMshort(Math.round(m.waiting)) + "</b><span>" + tr("waiting") + "</span></div></div>" +
      '<div class="w-rates small"><span>' + tr("dayRate") + " <b>" + RM(w.dayRate) + "</b></span><span>" + tr("otRate") + " <b>" + RM(Math.round(hourly * 100) / 100) + "</b></span><span>" + tr("payDay") + " <b>" + fmtDay(payDayFor(mk)) + "</b></span></div></div>" +
      fold("w-days", tr("myDays"), MON_LONG[+mk.slice(5) - 1], "", dayRows) +
      fold("w-history", tr("myHistory"), tr("myHistorySub"), "", (() => { const l = S.audit.filter((a) => a.workerId === w.id).slice(0, 40); return l.length ? '<div class="au-list">' + l.map((a) => '<div class="au-day muted tiny">' + fmtDay(a.date) + "</div>" + auditRow(a, true)).join("") + "</div>" : empty("–"); })()) +
      '<button class="btn btn-block btn-big mt-16" data-action="w-report">' + icon("flag") + tr("wrong") + "</button>" +
      "</div>";
  }

  /* ---------- Workers & crews ---------- */
  function viewTeam() {
    const t = today();
    return backLink() + '<div class="page-head"><div><h1 class="page-title">Workers &amp; crews</h1></div>' +
      (can.manage() ? '<div class="row wrap"><button class="btn" data-action="new-crew">' + icon("plus") + 'New crew</button><button class="btn btn-primary" data-action="new-worker">' + icon("plus") + "Add worker</button></div>" : "") + "</div>" +
      S.crews.map((c) => {
        const ws = crewWorkers(c.id);
        const a = assignmentsOn(t).find((x) => x.crewId === c.id);
        return fold("crew-" + c.id, esc(c.name) + ' <span class="muted" style="font-weight:400">' + esc(c.trade) + "</span>", a ? "Today at " + esc(project(a.projectId).name) : "Free today", String(ws.length),
          '<div class="list">' + ws.map((w) => '<div class="li">' + avatar(w) + '<div class="li-main"><div class="li-title">' + esc(w.name) + (w.id === c.leaderId ? ' <span class="chip teal">Leader</span>' : "") + '</div><div class="li-sub">' + esc(w.phone || "") + (hasPhone(w) ? ", clocks in on own phone" : ", no smartphone") + ", " + esc(LANGS[w.lang || "en"]) + "</div></div>" + (can.seePay() ? '<span class="muted small">' + RM(w.dayRate) + " a day</span>" : "") + "</div>").join("") + "</div>");
      }).join("") +
      '<div class="section"><h2 class="section-title">Crew bookings' + (can.manage() || role() === "site" ? ' <button class="btn btn-sm btn-primary" data-action="open-assign">Book a crew</button>' : "") + '</h2><div class="card"><div class="list">' +
      (S.assignments.length ? S.assignments.slice().sort((a, b) => a.from.localeCompare(b.from)).map((a) => { const c = crew(a.crewId), p = project(a.projectId); if (!c || !p) return ""; return '<div class="li"><span class="dot" style="background:' + p.color + '"></span><div class="li-main"><div class="li-title">' + esc(c.name) + " at " + esc(p.name) + '</div><div class="li-sub">' + fmtDate(a.from) + " to " + fmtDate(a.to) + "</div></div>" + (a.to < t ? chip("Finished", "") : a.from <= t ? chip("Now", "good") : chip("Coming", "info")) + (can.manage() ? '<button class="icon-btn" style="width:38px;height:38px;box-shadow:none;background:var(--bg)" data-action="asg-del" data-id="' + a.id + '" aria-label="Remove booking">' + icon("trash") + "</button>" : "") + "</div>"; }).join("") : empty("No bookings yet.")) +
      "</div></div></div>";
  }

  /* ---------- Settings ---------- */
  function viewSettings() {
    const s = S.settings;
    const dis = can.manage() ? "" : " disabled";
    return backLink() + '<div class="page-head"><div><h1 class="page-title">Settings' + helpBtn(can.manage() ? "Rules used to work out hours, overtime and pay, and how long worker photos are kept." : "Only management can change these.") + "</h1></div></div>" +
      '<div class="grid-2"><div class="card"><h2 class="card-title">Working hours</h2>' +
      '<label class="field"><span>Company name</span><input class="input" data-setting="company" value="' + esc(S.company.name) + '"' + dis + "></label>" +
      '<label class="field"><span>Normal hours in a full day</span><input class="input" type="number" step="0.5" min="1" data-setting="normalHours" value="' + s.normalHours + '"' + dis + "></label>" +
      '<label class="field"><span>Lunch break <em>(hours, taken off if they worked more than ' + s.breakAfter + " hours)</em></span><input class=\"input\" type=\"number\" step=\"0.25\" min=\"0\" data-setting=\"breakHours\" value=\"" + s.breakHours + '"' + dis + "></label>" +
      '<label class="field"><span>Counts as half day if under <em>(hours)</em></span><input class="input" type="number" step="0.5" min="0" data-setting="halfDayUnder" value="' + s.halfDayUnder + '"' + dis + "></label>" +
      '<label class="field"><span>Overtime pay rate <em>(1.5 = time and a half)</em></span><input class="input" type="number" step="0.25" min="1" data-setting="otRate" value="' + s.otRate + '"' + dis + "></label>" +
      '<label class="field"><span>Flag attendance when worker and site manager times differ by more than <em>(minutes)</em></span><input class="input" type="number" min="1" data-setting="matchMinutes" value="' + s.matchMinutes + '"' + dis + "></label>" +
      '<label class="field"><span>Pay day <em>(day of the next month)</em></span><input class="input" type="number" min="1" max="28" data-setting="payDay" value="' + s.payDay + '"' + dis + "></label>" +
      '<label class="field"><span>Duration rounding <em>(default; the site manager can change it per day)</em></span><select class="input" data-setting="rounding"' + dis + ">" + Object.keys(ROUNDING).map((k) => '<option value="' + k + '"' + ((s.rounding || "exact") === k ? " selected" : "") + ">" + ROUNDING[k] + "</option>").join("") + "</select></label>" +
      '<p class="small muted mt-12">Example with these rules: in 08:00, out 19:00 = ' + hoursText(calcHours({ in: "08:00", out: "19:00" })) + ".</p></div>" +
      '<div class="stack"><div class="card"><h2 class="card-title">Worker photos and privacy</h2>' +
      '<label class="field"><span>Keep clock-in photos for this many days after the pay month ends</span><input class="input" type="number" min="1" data-setting="photoKeepDays" value="' + s.photoKeepDays + '"' + dis + "></label>" +
      '<p class="small muted mt-12">Photos are only used to confirm attendance and pay (PDPA). Example: a photo taken on 3 November is kept until ' + fmtDate(addDays("2026-11-30", s.photoKeepDays)) + ", then deleted automatically.</p></div>" +
      '<div class="card"><h2 class="card-title">Saved reject reasons</h2><div class="list mt-8">' + (s.rejectReasons || []).map((x, i) => '<div class="li"><div class="li-main">' + esc(x) + "</div>" + (can.manage() || can.approve() ? '<button class="icon-btn sm" data-action="reason-del" data-i="' + i + '" aria-label="Remove reason">' + icon("trash") + "</button>" : "") + "</div>").join("") + "</div>" +
        (can.manage() || can.approve() ? '<div class="row mt-12" style="gap:8px"><input class="input" data-input-reason placeholder="Add a reason"><button class="btn" data-action="reason-add">' + icon("plus") + "Add</button></div>" : "") + "</div>" +
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
    daylist(s) { return sheetHead("") + '<div class="pop-in-sheet">' + dayList(s.d) + "</div>"; },
    pday(s) { const p = project(s.pid); return sheetHead("") + '<div class="pop-in-sheet">' + projDayList(p, s.d) + "</div>" + (isPhone() ? '<button class="btn btn-soft mt-16" data-action="pc-back">' + icon("left") + "Back to " + esc(p.name) + " calendar</button>" : ""); },
    reject(s) {
      const r = S.attendance.find((a) => a.id === s.recId), w = worker(r.workerId), sf = r.self || {}, e = eff(r);
      const part = val("part", "");
      const tIn = sf.in || r.in || (r.orig || {}).in, tOut = sf.out || r.out || (r.orig || {}).out;
      const parts = [["in", "Clock in" + (tIn ? " " + tIn : "")]].concat(tOut ? [["out", "Clock out " + tOut]] : []).concat([["day", "Whole day"]]);
      const presets = S.settings.rejectReasons || [];
      const reason = val("reason", "");
      const explain = part === "in" ? "The clock-in time won't be used. Write your own clock-in time afterwards, otherwise the day stays in To do." :
        part === "out" ? "The clock-out time won't be used. Write your own clock-out time afterwards, otherwise the day stays in To do." :
        part === "day" ? "The whole day will not be paid. It goes to Rejected, where you can restore it." : "";
      return sheetHead("Reject") + '<p class="muted">' + esc(w.name) + ", " + fmtDayLong(r.date) + ". The worker sees the reason. Nothing is deleted.</p>" +
        '<div class="field"><span>What are you rejecting?</span><div class="choice-row">' + parts.map((x) => '<button type="button" class="choice ' + (part === x[0] ? "on" : "") + '" data-action="pick" data-k="part" data-v="' + x[0] + '">' + esc(x[1]) + "</button>").join("") + "</div>" + (explain ? '<div class="form-note">' + explain + "</div>" : "") + "</div>" +
        '<div class="field"><span>Why</span><div class="choice-row">' + presets.map((x) => '<button type="button" class="choice ' + (reason === x ? "on" : "") + '" data-action="pick" data-k="reason" data-v="' + esc(x) + '">' + esc(x) + "</button>").join("") +
        '<button type="button" class="choice ' + (reason === "__new" ? "on" : "") + '" data-action="pick" data-k="reason" data-v="__new">' + icon("plus", ' style="width:15px;height:15px;vertical-align:-2px"') + " Other reason</button></div></div>" +
        (reason === "__new" ? '<label class="field"><span>Type the reason</span><input class="input" data-f="custom" value="' + esc(val("custom", "")) + '" placeholder="e.g. Clocked in from the car park" autofocus></label>' +
          '<div class="field"><span>Save this reason for next time?</span>' + choiceRow("savePreset", ["Yes, save it", "No, just this once"], val("savePreset", "Yes, save it")) + "</div>" : "") +
        errBox() + '<div class="sheet-foot"><button class="btn btn-soft btn-big" data-action="close-sheet">Cancel</button><button class="btn btn-danger btn-big" data-action="reject-save">' + icon("x") + "Reject</button></div>";
    },
    help(s) { return sheetHead("How this page works") + '<p class="help-text">' + esc(s.text) + "</p>"; },
    notes() {
      const list = myNotes().slice(0, 40);
      const W_ = role() === "worker";
      const text = (n) => {
        const w = worker(n.workerId), name = w ? esc(w.name) : "A worker", site = project(n.projectId) ? esc(project(n.projectId).name) : "";
        if (n.type === "selfie-in") return "<b>" + name + "</b> clocked in with a selfie at " + n.time + (site ? ", " + site : "");
        if (n.type === "selfie-out") return "<b>" + name + "</b> clocked out with a selfie at " + n.time + (site ? ", " + site : "");
        if (n.type === "report") return "<b>" + name + "</b> reported: " + esc(n.text || "") + (n.forDate ? " (" + fmtDay(n.forDate) + ")" : "");
        if (n.type === "confirmed") return W_ ? "<b>" + tr("confirmed") + "</b> " + n.time : "<b>" + name + "</b> confirmed at " + n.time;
        if (n.type === "rejected") return "<b>" + tr("rejected") + "</b>: " + fmtDay(n.forDate) + ". “" + esc(n.text || "") + "”";
        if (n.type === "restored") return "<b>" + fmtDay(n.forDate) + "</b>: " + (W_ ? tr("waiting") : "restored");
        if (n.type === "changed") return "<b>" + fmtDay(n.forDate) + "</b>: " + esc(n.text || "");
        return esc(n.text || "");
      };
      return sheetHead(W_ ? '<span style="display:inline-flex;gap:8px;align-items:center">' + icon("bell", ' style="width:22px;height:22px"') + "</span>" : "Notifications") +
        (list.length ? '<div class="list">' + list.map((n) => '<button class="note' + (n.read ? "" : " unread") + '" data-action="note-open" data-id="' + n.id + '">' +
          (n.photo ? img(n.photo, "thumb-sm", "") : '<span class="thumb-sm photo-missing">' + icon(n.type === "report" ? "flag" : "check", ' style="width:18px;height:18px"') + "</span>") +
          '<span class="li-main"><span class="note-t">' + text(n) + '</span><span class="li-sub">' + (n.date === today() ? "Today" : fmtDay(n.date)) + "</span></span>" + (n.read ? "" : '<span class="dot" style="background:var(--blue)"></span>') + "</button>").join("") + "</div>" : empty(W_ ? "–" : "No notifications yet. You will see one here when a worker clocks in with a selfie."));
    },
    panel(s) {
      const it = (TILE_REG[s.g] || []).find((x) => x.id === s.t);
      return it ? sheetHead(it.title || it.label) + it.body() : sheetHead("");
    },
    scan() {
      return sheetHead("Which site gate are you at?") + '<p class="muted">Demo only. A real phone reads the QR poster instead.</p><div class="w-people mt-16">' +
        S.projects.map((p) => '<button class="w-person" data-action="w-site" data-id="' + p.id + '"><span class="avatar">' + icon("projects", ' style="width:22px;height:22px"') + "</span><span>" + esc(p.name) + '<small class="muted">' + esc(p.location) + "</small></span></button>").join("") + "</div>";
    },
    wclock(s) {
      const site = project(W().siteId), w = me();
      const title = s.act === "in" ? tr("clockIn") : tr("clockOut");
      if (s.step === "confirm") {
        return sheetHead(title) + '<img class="clock-preview" src="' + (photoSync(s.photo) || s.photo) + '" alt="Selfie">' +
          '<p style="text-align:center;font-size:22px;margin-top:16px"><b style="font-weight:500">' + esc(s.time) + '</b><br><span class="muted" style="font-size:16px">' + esc(w.name) + ", " + esc(site.name) + "</span></p>" +
          '<div class="sheet-foot"><button class="btn btn-soft btn-big" data-action="w-photo">' + tr("retake") + '</button><button class="btn btn-primary btn-big" data-action="w-save">' + icon("check") + tr("confirm") + "</button></div>";
      }
      const away = ui.workerAway;
      return sheetHead(title) +
        '<div class="w-loc ' + (away ? "bad" : "") + '">' + icon(away ? "alert" : "pin") + "<span>" + (away ? tr("notOnSite") : tr("onSite") + "<br><small>" + esc(site.name) + ", within " + S.settings.geofenceM + " m</small>") + "</span></div>" +
        '<button class="w-big mt-16" data-action="w-photo"' + (away ? " disabled" : "") + ">" + icon("camera") + "<span>" + tr("takePhoto") + "</span></button>" +
        '<p class="small muted mt-16" style="text-align:center">Demo: the location check is pretend. <button class="link-btn small" data-action="w-away">' + (away ? "Pretend I am at the site" : "Pretend I am not at the site") + "</button></p>";
    },
    wreport() {
      const w = me();
      const days = S.attendance.filter((a) => a.workerId === w.id && a.date >= addDays(today(), -20)).map((a) => a.date);
      for (let i = 0; i < 7; i++) { const d = addDays(today(), -i); if (!isSunday(d) && !days.includes(d)) days.push(d); }
      const uniq = Array.from(new Set(days)).sort().reverse();
      const reasons = [["wrongTime", tr("wrongTime")], ["missingDay", tr("missingDay")], ["wrongOT", tr("wrongOT")], ["other", tr("other")]];
      return sheetHead(tr("wrong")) +
        '<label class="field"><span>' + tr("whichDay") + '</span><select class="input" data-f="date">' + uniq.map((d) => '<option value="' + d + '"' + (val("date", uniq[0]) === d ? " selected" : "") + ">" + fmtDay(d) + "</option>").join("") + "</select></label>" +
        '<div class="field"><span>' + tr("whatsWrong") + '</span><div class="choice-row">' + reasons.map(([k, l]) => '<button type="button" class="choice ' + (val("reason") === k ? "on" : "") + '" data-action="pick" data-k="reason" data-v="' + k + '">' + esc(l) + "</button>").join("") + "</div></div>" +
        '<label class="field"><span>' + tr("note") + '</span><textarea class="input" data-f="note">' + esc(val("note", "")) + "</textarea></label>" +
        errBox() + '<div class="sheet-foot"><button class="btn btn-primary btn-big" data-action="w-report-save">' + icon("check") + tr("send") + "</button></div>";
    },
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
      const pending = recs.filter((a) => (a.self && a.self.in && !a.in) || (a.self && a.self.out && a.in && !a.out));
      const row = (w) => {
        const r = recs.find((x) => x.workerId === w.id), sf = (r && r.self) || {};
        let right, sub = hasPhone(w) ? "" : "No phone";
        const tap = (act, label, cls) => '<button class="btn ' + cls + '" data-action="clock-confirm" data-id="' + r.id + '" data-act="' + act + '">' + icon("check") + label + "</button>";
        if (!r) right = '<button class="btn btn-primary" data-action="clock-pick" data-w="' + w.id + '" data-act="in">' + icon("camera") + "Clock in</button>";
        else if (!r.in) { right = tap("in", "Confirm", "btn-primary"); sub = "Clocked in on own phone at " + sf.in; }
        else if (!r.out && sf.out) { right = tap("out", "Confirm out", "btn-blue"); sub = "Clocked out on own phone at " + sf.out; }
        else if (!r.out) { right = hasPhone(w) ? tap("out", "Clock out", "btn-blue") : '<button class="btn btn-blue" data-action="clock-pick" data-w="' + w.id + '" data-act="out">' + icon("camera") + "Clock out</button>"; sub = "In since " + r.in; }
        else right = '<span class="muted small">' + r.in + "–" + r.out + "</span>";
        return '<div class="worker-row">' + avatar(w, r && eff(r).inPhoto) + '<div class="li-main"><div class="li-title">' + esc(w.name) + "</div>" + (sub ? '<div class="li-sub">' + esc(sub) + "</div>" : "") + "</div>" + right + "</div>";
      };
      const match = (w) => !q || w.name.toLowerCase().includes(q);
      const listA = exp.filter(match), listB = others.filter(match);
      return sheetHead("Clock in / out") +
        (!S.flags.privacySeen ? '<div class="form-note row" style="align-items:flex-start;gap:12px"><div class="grow">A photo is taken each time a worker clocks in or out. Photos are only used to check attendance and pay, and are deleted ' + S.settings.photoKeepDays + ' days after the pay month ends.</div><button class="btn btn-sm" data-action="privacy-ok">Got it</button></div>' : "") +
        '<label class="field"><span>Site</span><select class="input" data-change="clockSite">' + projOptions(sid) + "</select></label>" +
        '<div class="search mt-12">' + icon("search") + '<input class="input" type="search" placeholder="Type a name" value="' + esc(s.q || "") + '" data-input="clockQ" aria-label="Find worker" autofocus></div>' +
        (pending.length && !q ? '<div class="form-note row" style="gap:12px"><div class="grow">' + plural(pending.length, "worker") + ' clocked themselves on their phone and ' + (pending.length === 1 ? "is" : "are") + ' waiting for you.</div><button class="btn btn-sm btn-primary" data-action="confirm-all" data-site="' + sid + '">Confirm all</button></div>' : "") +
        '<div class="mt-12">' + (listA.length ? crewGroupsList(listA, row) : !q ? '<p class="muted small">No crew is booked here today.</p>' : "") +
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
        (kind !== "in" ? '<div class="field"><span>Category</span><div class="cat-grid">' + MCATS.map((c) => '<button type="button" class="cat-btn ' + (val("cat") === c.id ? "on" : "") + '" data-action="pick" data-k="cat" data-v="' + c.id + '">' + icon(c.icon) + "<span>" + esc(c.short) + "</span></button>").join("") + "</div></div>" : "") +
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
      const e0 = r ? eff(r) : {};
      const inT = val("in", (r && r.in) || e0.in || "08:00"), outT = val("out", (r && r.out) || e0.out || "17:00");
      const round = val("round", (r && r.round) || S.settings.rounding || "exact");
      const raw = workedHours(inT, outT);
      const preview = calcHours({ in: inT, out: outT, round });
      return sheetHead(r ? "Write site manager time" : "Add by hand") +
        '<p class="muted">' + esc(w.name) + ", " + fmtDayLong(r ? r.date : ui.attDate) + "</p>" +
        (r ? '<div class="field"><span>Original times <em>(these stay on record and cannot be changed)</em></span><div class="ct ct-solo"><div class="ct-row ct-head"><span>Clock in</span><span>Clock out</span></div><div class="ct-row">' + timeCell(r, "in") + timeCell(r, "out") + "</div></div></div>" : "") +
        '<div class="grid-2" style="gap:12px"><label class="field"><span>Site manager clock in</span><input class="input" type="time" data-f="in" data-rerender="1" value="' + esc(inT) + '"></label><label class="field"><span>Site manager clock out</span><input class="input" type="time" data-f="out" data-rerender="1" value="' + esc(outT) + '"></label></div>' +
        '<label class="field"><span>Duration</span><select class="input" data-f="round" data-rerender="1">' + Object.keys(ROUNDING).map((k) => '<option value="' + k + '"' + (round === k ? " selected" : "") + ">" + ROUNDING[k] + ": " + hrs(roundHours(raw, k)) + "</option>").join("") + "</select></label>" +
        '<div class="form-note">Paid as: <b>' + esc(hoursText(preview)) + "</b>" + (raw !== preview.auto.worked ? " (exact " + hrs(raw) + ")" : "") + "</div>" +
        '<label class="field"><span>Reason <em>(required if your time is different)</em></span><input class="input" data-f="reason" value="' + esc(val("reason", (r && r.mgrReason) || (r ? "" : "Forgot to clock in"))) + '" placeholder="e.g. Left at 6pm, forgot to clock out"></label>' +
        errBox() +
        '<div class="sheet-foot"><button class="btn btn-primary btn-big" data-action="att-edit-save">' + icon("check") + "Save and approve</button></div>";
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
        '<div class="field"><span>Can clock in on their own smartphone?</span>' + choiceRow("hasPhone", ["Yes", "No"], val("hasPhone", "Yes")) + "</div>" +
        '<label class="field"><span>Language for their screen</span><select class="input" data-f="lang">' + Object.keys(LANGS).map((k) => '<option value="' + k + '"' + (val("lang", "en") === k ? " selected" : "") + ">" + LANGS[k] + "</option>").join("") + "</select></label>" +
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
  function toast(msg, ic, undo) {
    const t = $("#toast");
    ui.undo = undo || null;
    t.innerHTML = icon(ic || "check") + "<span>" + msg + "</span>" + (undo ? '<button class="toast-undo" data-action="undo">' + icon("undo") + "Undo</button>" : "");
    t.classList.add("show");
    t.classList.toggle("has-undo", !!undo);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove("show"); t.classList.remove("has-undo"); ui.undo = null; }, undo ? 8000 : 3200);
  }
  function fail(msg) { ui.sheet.err = msg; renderSheet(); }
  function commit(msg, undo) { save(); closeSheet(); render(); if (msg) toast(msg, null, undo); }

  function askConfirm(title, text, yes, danger, onYes) { openSheet({ type: "confirm", title, text, yes, danger, onYes }); }

  async function loadSample() {
    await PhotoDB.clear();
    S = window.SampleData.buildSampleData();
    migrate();
    ui.open.clear();
    save(); purgeOldPhotos();
    location.hash = "#/today";
    render();
    toast("Sample data loaded. Try switching “Viewing as” at the top.");
  }

  const A = {
    "load-sample": loadSample,
    "reset-sample"() { ui.menu = false; askConfirm("Reload sample data?", "This replaces everything on this device with fresh sample data.", "Reload", false, loadSample); },
    wipe() { ui.menu = false; askConfirm("Clear everything and start empty?", "All projects, workers, photos and receipts on this device will be deleted, so you can enter your own. This cannot be undone.", "Delete everything", true, async () => { await PhotoDB.clear(); S = window.SampleData.buildEmptyData(); ui.open.clear(); ui.tile = {}; save(); closeSheet(); location.hash = "#/today"; render(); toast("Everything cleared. Start by adding a project under Projects."); }); },
    "confirm-yes"() { const fn = ui.sheet && ui.sheet.onYes; if (fn) fn(); },
    menu() { ui.menu = !ui.menu; renderTop(); },
    "close-sheet": closeSheet,
    "open-log"() { openSheet({ type: "log" }); },

    zoom(el) {
      if (el.closest("#sheet")) return;
      const src = el.getAttribute("src");
      if (src && src !== BLANK) openSheet({ type: "zoom", src });
    },
    tile(el) {
      const g = el.dataset.g, t = el.dataset.t;
      if (isPhone()) { openSheet({ type: "panel", g, t }); return; }
      ui.tile[g] = ui.tile[g] === t ? null : t; render();
    },
    "money-cat"(el) { ui.moneyCat = el.dataset.cat; render(); },
    "money-cat-open"(el) {
      ui.moneyCat = el.dataset.cat;
      if (isPhone()) { closeSheet(); openSheet({ type: "panel", g: "money", t: "receipts" }); } else { ui.tile.money = "receipts"; render(); }
    },
    "print-qr"(el) {
      const p = project(el.dataset.id);
      const w = window.open("", "_blank");
      if (!w) return toast("Allow pop-ups to print the poster.", "alert");
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Clock-in QR, ' + esc(p.name) + '</title><style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px;color:#16232E}svg{width:70vmin;height:70vmin}h1{font-size:40px;margin:0 0 6px}p{font-size:22px;margin:6px 0}</style></head><body><h1>' + esc(p.name) + "</h1><p>Scan to clock in / out</p>" + qrSvg(siteLink(p)) + "<p>" + esc(S.company.name) + "</p><script>setTimeout(function(){print()},300)<\/script></body></html>");
      w.document.close();
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
      const s = ui.sheet, t = today(), w = worker(s.workerId), snap = snapshot();
      const ref = await storePhoto(s.photo);
      let rid = null;
      if (s.action === "in") {
        rid = uid("at");
        S.attendance.push({ id: rid, workerId: w.id, projectId: s.siteId, date: t, in: s.time, out: null, inPhoto: ref, outPhoto: null, orig: { in: s.time, out: null }, status: "waiting", adjust: null, note: "" });
      } else {
        const r = S.attendance.find((a) => a.workerId === w.id && a.date === t && a.projectId === s.siteId && a.in && !a.out);
        if (r) { r.out = s.time; r.outPhoto = ref; rid = r.id; r.orig = r.orig || {}; if (!r.orig.out) r.orig.out = s.time; }
      }
      const e = log(s.action === "in" ? "photo-in" : "photo-out", { workerId: w.id, recId: rid, projectId: s.siteId, forDate: t, value: s.time });
      s.step = "list"; s.q = ""; s.photo = null;
      done(esc(w.name) + (s.action === "in" ? " clocked in at " : " clocked out at ") + s.time, snap, [e]);
    },

    "open-notes"() { ui.menu = false; openSheet({ type: "notes" }); setTimeout(() => { myNotes().forEach((n) => { n.read = true; }); save(); renderTop(); }, 400); },
    "note-open"(el) {
      const n = S.notifications.find((x) => x.id === el.dataset.id); if (!n) return;
      n.read = true; save(); closeSheet();
      if (role() === "worker") { render(); return; }
      ui.attSite = n.projectId; ui.attDate = n.forDate || n.date; ui.attPicked = true;
      const r = S.attendance.find((a) => a.workerId === n.workerId && a.date === ui.attDate);
      ui.attFilter = n.type === "report" ? "all" : r && isTodo(r) ? "todo" : "all";
      ui.attFocus = n.workerId;
      if (location.hash === "#/attendance") render(); else location.hash = "#/attendance";
    },
    help(el) { openSheet({ type: "help", text: el.dataset.t }); },
    "au-tab"(el) { ui.auTab = el.dataset.t; render(); },
    "go-back"() { if (history.length > 1) history.back(); else location.hash = "#/today"; },
    "reason-del"(el) { S.settings.rejectReasons.splice(+el.dataset.i, 1); save(); render(); toast("Reason removed."); },
    "reason-add"() { const inp = $('[data-input-reason]'); const v = inp && inp.value.trim(); if (!v) return; if (S.settings.rejectReasons.indexOf(v) < 0) S.settings.rejectReasons.push(v); save(); render(); toast("Reason saved."); },
    "au-filter"(el) { ui.auFilter = el.dataset.f; render(); },
    "au-csv"() {
      const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
      const rows = [["Date", "Time", "Who", "Role", "Action", "Worker", "For day", "Details", "Reason"]].concat(S.audit.map((a) => [fmtDate(a.date), a.time, a.byName, ROLE_SHORT[a.by], a.action, (worker(a.workerId) || {}).name || "", a.forDate ? fmtDate(a.forDate) : "", a.value || "", a.reason || ""]));
      const blob = new Blob(["\ufeff" + rows.map((r) => r.map(q).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = S.company.name.replace(/\W+/g, "-") + "-history.csv";
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 2000);
      toast("Downloaded " + S.audit.length + " history entries.", "download");
    },
    "att-filter"(el) { ui.attFilter = el.dataset.f; ui.attFocus = null; render(); },
    "att-review"(el) { ui.attSite = el.dataset.site; ui.attDate = today(); ui.attFilter = "todo"; ui.attPicked = true; location.hash = "#/attendance"; },
    "clock-confirm"(el) {
      const r = S.attendance.find((a) => a.id === el.dataset.id); if (!r) return;
      const w = worker(r.workerId), tm = nowHM(), snap = snapshot();
      // confirming = agreeing with the worker's selfie time; we also keep when it was confirmed
      if (el.dataset.act === "in") { r.in = (r.self && r.self.in) || tm; r.confirmedIn = tm; } else { r.out = (r.self && r.self.out) || tm; r.confirmedOut = tm; }
      notify({ type: "confirmed", to: "worker", workerId: r.workerId, projectId: r.projectId });
      const e = log(el.dataset.act === "in" ? "confirm-in" : "confirm-out", { workerId: r.workerId, recId: r.id, projectId: r.projectId, forDate: r.date, value: el.dataset.act === "in" ? r.in : r.out });
      done(esc(w.name) + " confirmed", snap, [e]);
    },
    "confirm-all"(el) {
      const tm = nowHM(), snap = snapshot(), entries = [];
      const list = S.attendance.filter((a) => a.projectId === el.dataset.site && a.date === today() && a.self && ((a.self.in && !a.in) || (a.self.out && a.in && !a.out)));
      list.forEach((a) => {
        const isIn = !a.in;
        if (isIn) { a.in = a.self.in || tm; a.confirmedIn = tm; } else { a.out = a.self.out || tm; a.confirmedOut = tm; }
        notify({ type: "confirmed", to: "worker", workerId: a.workerId, projectId: a.projectId });
        entries.push(log(isIn ? "confirm-in" : "confirm-out", { workerId: a.workerId, recId: a.id, projectId: a.projectId, forDate: a.date, value: isIn ? a.in : a.out }));
      });
      done("Confirmed " + plural(list.length, "worker") + ".", snap, entries);
    },
    "dispute-done"(el) {
      const d = S.disputes.find((x) => x.id === el.dataset.id); if (!d) return;
      const snap = snapshot(); d.status = "sorted";
      done("Marked as sorted.", snap, [log("sorted", { workerId: d.workerId, projectId: d.projectId, forDate: d.date })]);
    },
    undo() {
      const u = ui.undo; if (!u) return;
      const o = JSON.parse(u.snap);
      S.attendance = o.attendance; S.disputes = o.disputes; S.notifications = o.notifications;
      log("undo", { value: u.label });
      ui.undo = null; save(); render();
      if (ui.sheet && ui.sheet.type === "clock") renderSheet();
      toast("Undone. It is still recorded in History.", "undo");
    },
    "att-restore"(el) {
      const r = S.attendance.find((a) => a.id === el.dataset.id); if (!r) return;
      const snap = snapshot(), part = el.dataset.part || "day";
      if (part === "day") r.status = "waiting"; else delete r[part === "in" ? "rejectIn" : "rejectOut"];
      r.restoredAt = new Date().toISOString();
      notify({ type: "restored", to: "worker", workerId: r.workerId, projectId: r.projectId, forDate: r.date });
      const what = part === "day" ? "day" : part === "in" ? "clock in" : "clock out";
      done(esc(worker(r.workerId).name) + "'s " + what + " restored. Waiting for a check again.", snap, [log("restore", { workerId: r.workerId, recId: r.id, projectId: r.projectId, forDate: r.date, part })]);
    },
    "reject-save"() {
      const f = F(), r = S.attendance.find((a) => a.id === ui.sheet.recId); if (!r) return;
      if (!f.part) return fail("Choose what you are rejecting: clock in, clock out or the whole day.");
      let reason = f.reason === "__new" ? (f.custom || "").trim() : f.reason;
      if (!reason) return fail(f.reason === "__new" ? "Type the reason." : "Pick a reason. The worker will see it.");
      if (f.reason === "__new" && (f.savePreset || "Yes, save it").indexOf("Yes") === 0 && S.settings.rejectReasons.indexOf(reason) < 0) S.settings.rejectReasons.push(reason);
      const snap = snapshot(), sf = r.self || {}, og = r.orig || {}, at = new Date().toISOString();
      let value = "", msg;
      if (f.part === "day") { r.status = "rejected"; r.rejectReason = reason; r.rejectedAt = at; msg = esc(worker(r.workerId).name) + "'s whole day moved to Rejected."; }
      else {
        const side = f.part, key = side === "in" ? "rejectIn" : "rejectOut";
        value = sf[side] || r[side] || og[side] || "";
        r[key] = { reason, at, time: value };
        // the rejected time stops counting; any time copied from it is cleared so the site manager writes their own
        if (r[side] && (r[side] === sf[side] || r[side] === og[side])) r[side] = null;
        if (r.status === "approved") r.status = "waiting";
        msg = esc(worker(r.workerId).name) + "'s " + (side === "in" ? "clock in" : "clock out") + " rejected. Write your own time with “Write my time”.";
      }
      notify({ type: "rejected", to: "worker", workerId: r.workerId, projectId: r.projectId, forDate: r.date, text: (f.part === "day" ? "" : (f.part === "in" ? "Clock in " : "Clock out ") + value + ": ") + reason });
      const e = log("reject", { workerId: r.workerId, recId: r.id, projectId: r.projectId, forDate: r.date, reason, part: f.part, value });
      closeSheet();
      done(msg, snap, [e], "x");
    },
    "att-open-day"(el) { closeSheet(); ui.attSite = el.dataset.site; ui.attDate = el.dataset.d; ui.attPicked = true; if (location.hash === "#/attendance") render(); else location.hash = "#/attendance"; },

    /* construction worker */
    "w-scan"() { openSheet({ type: "scan" }); },
    "w-site"(el) { W().siteId = el.dataset.id; save(); closeSheet(); render(); },
    "w-pick"(el) { W().workerId = el.dataset.w; ui.wq = ""; save(); render(); toast("Welcome, " + esc(worker(el.dataset.w).name) + "."); },
    "w-notme"() { W().workerId = null; save(); render(); },
    "w-clock"(el) { openSheet({ type: "wclock", act: el.dataset.act }); },
    "w-away"() { ui.workerAway = !ui.workerAway; renderSheet(); },
    "w-photo"() {
      const s = ui.sheet, w = me();
      const go = (ph) => { if (!ph) return; s.photo = ph; s.time = nowHM(); s.step = "confirm"; renderSheet(); };
      if (!("ontouchstart" in window)) go("demo-face:" + w.id); else takePhoto("user").then(go);
    },
    async "w-save"() {
      const s = ui.sheet, w = me(), t = today(), sid = W().siteId;
      const ref = await storePhoto(s.photo);
      let r = S.attendance.find((a) => a.workerId === w.id && a.date === t);
      if (!r) { r = { id: uid("at"), workerId: w.id, projectId: sid, date: t, in: null, out: null, inPhoto: null, outPhoto: null, self: null, status: "waiting", adjust: null, note: "" }; S.attendance.push(r); }
      r.self = r.self || {};
      w.hasPhone = true; // they just used their own phone
      if (s.act === "in") { r.self.in = s.time; r.self.inPhoto = ref; r.self.inLoc = "on site"; }
      else { r.self.out = s.time; r.self.outPhoto = ref; r.self.outLoc = "on site"; }
      notify({ type: s.act === "in" ? "selfie-in" : "selfie-out", to: "site", workerId: w.id, projectId: r.projectId, photo: ref, time: s.time });
      log(s.act === "in" ? "self-in" : "self-out", { workerId: w.id, recId: r.id, projectId: r.projectId, forDate: t, value: s.time });
      save(); closeSheet(); render(); toast((s.act === "in" ? tr("clockIn") : tr("clockOut")) + " " + s.time + ". " + tr("waitingConfirm") + ".");
      window.scrollTo(0, 0);
    },
    "w-report"() { openSheet({ type: "wreport" }); },
    "w-report-save"() {
      const f = F(), w = me();
      if (!f.reason) return fail(tr("whatsWrong"));
      const date = f.date || today();
      const rec = S.attendance.find((a) => a.workerId === w.id && a.date === date);
      S.disputes.push({ id: uid("ds"), workerId: w.id, date, projectId: rec ? rec.projectId : W().siteId, reason: T.en[f.reason], note: (f.note || "").trim(), status: "open", at: new Date().toISOString() });
      log("report", { workerId: w.id, projectId: rec ? rec.projectId : W().siteId, forDate: date, value: T.en[f.reason] + ((f.note || "").trim() ? ", “" + f.note.trim() + "”" : "") });
      notify({ type: "report", to: "site", workerId: w.id, projectId: rec ? rec.projectId : W().siteId, text: T.en[f.reason] + ((f.note || "").trim() ? ", “" + f.note.trim() + "”" : ""), forDate: date });
      commit(tr("sent"));
    },

    /* receipts & money */
    "open-receipt"(el) { openSheet({ type: "receipt", kind: el && el.dataset.kind }); },
    "receipt-photo"() { takePhoto("environment").then((p) => { if (p) { F().photo = p; renderSheet(); } }); },
    async "receipt-save"() {
      const f = F(), kind = f.kind || ui.sheet.kind || "spent";
      const amount = parseFloat(f.amount);
      if (!(amount > 0)) return fail("Type the amount, for example 125.50.");
      if (!(f.what || "").trim()) return fail(kind === "in" ? "Say what the payment is for." : "Say what you paid for, for example “Cement, 50 bags”.");
      if (kind !== "in" && !f.cat) return fail("Pick a category, for example Materials or Transport &amp; fuel.");
      const photo = f.photo ? await storePhoto(f.photo) : null;
      const pid = f.projectId != null ? f.projectId : (role() === "site" ? siteId() : "");
      S.money.push({
        id: uid("mo"), dir: kind === "in" ? "in" : "out", status: kind === "spent" ? "paid" : "expected",
        date: f.date || (kind === "spent" ? today() : addDays(today(), 14)), amount, what: f.what.trim(), projectId: pid || null,
        cat: kind === "in" ? null : f.cat,
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
      const head = ["Date", "Type", "Status", "Category", "Description", "Project", "Amount (RM)", "Paid by", "Supplier / client", "Receipt / invoice no.", "Has photo", "Logged by", "Note"];
      const typ = (m) => (m.dir === "in" ? "Money in" : m.status === "paid" ? "Money out" : "Bill");
      const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
      const csv = [head].concat(rows.map((m) => [fmtDate(m.date), typ(m), m.status === "paid" ? (m.dir === "in" ? "Received" : "Paid") : "Not yet", m.dir === "in" ? "Client payment" : mcat(moneyCat(m)).name, m.what, project(m.projectId) ? project(m.projectId).name : "Office / no project", m.amount.toFixed(2), m.paidBy || "", m.supplier || "", m.ref || "", m.photo ? "Yes" : "No", ROLE_LABEL[m.by] || m.by, m.note || ""])).map((r) => r.map(q).join(",")).join("\r\n");
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
    "car-step"(el) { carStep(+el.dataset.step); },
    "cal-today"() { const months = calMonths(); carStep(months.indexOf(monthKey(today())) - months.indexOf(ui.calMonth)); },
    "cal-day"(el, e) {
      hideHoverPop();
      // laptop: the hover list already shows; a click (or a tap on a phone) opens it as a pop-up
      openSheet({ type: "daylist", d: el.dataset.d });
    },
    "cal-proj"(el) {
      closeSheet();
      ui.calBack = true; ui.calJump = true; ui.projCalMonth = el.dataset.m || null; ui.tile.project = "cal"; ui.lastProj = el.dataset.id;
      ui.pendingPanel = isPhone() ? { g: "project", t: "cal" } : null;
      ui.scrollToPanel = !isPhone();
      if (location.hash === "#/project/" + el.dataset.id) render(); else location.hash = "#/project/" + el.dataset.id;
    },
    "pc-month"(el) { ui.projCalMonth = shiftMonth(ui.projCalMonth, +el.dataset.step); if (ui.sheet && ui.sheet.type === "panel") renderSheet(); render(); },
    "pc-day"(el) { hideHoverPop(); openSheet({ type: "pday", d: el.dataset.d, pid: route().id }); },
    "pc-back"() { openSheet({ type: "panel", g: "project", t: "cal" }); },
    "go-bills"() { ui.tile.money = "bills"; ui.pendingPanel = isPhone() ? { g: "money", t: "bills" } : null; location.hash = "#/money"; },
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
      S.workers.push({ id: uid("w"), name: f.name.trim(), crewId: f.crewId || S.crews[0].id, dayRate: parseFloat(f.dayRate) || 0, phone: f.phone || "", hasPhone: (f.hasPhone || "Yes") === "Yes", lang: f.lang || "en" });
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
    "att-goto"(el) { ui.attDate = el.dataset.d; ui.attFilter = null; ui.attFocus = null; render(); },
    "att-day"(el) { const d = addDays(ui.attDate, +el.dataset.step); if (d <= today()) { ui.attDate = d; ui.attFilter = null; ui.attFocus = null; render(); } },
    "att-ok"(el) {
      const r = S.attendance.find((a) => a.id === el.dataset.id); if (!r) return;
      const snap = snapshot(); r.status = "approved";
      done("Approved " + esc(worker(r.workerId).name) + ".", snap, [log("approve", { workerId: r.workerId, recId: r.id, projectId: r.projectId, forDate: r.date, value: hoursText(calcHours(r)) })]);
    },
    "att-no"(el) { openSheet({ type: "reject", recId: el.dataset.id }); },
    "att-all"() {
      const snap = snapshot();
      const list = S.attendance.filter((a) => a.projectId === ui.attSite && a.date === ui.attDate && a.status === "waiting" && isDone(a) && !matchOf(a).flag && !needsConfirm(a));
      const entries = list.map((a) => { a.status = "approved"; return log("approve", { workerId: a.workerId, recId: a.id, projectId: a.projectId, forDate: a.date, value: hoursText(calcHours(a)) }); });
      done("Approved " + plural(list.length, "record") + ".", snap, entries);
    },
    "att-edit"(el) { openSheet({ type: "attEdit", recId: el.dataset.id }); },
    "att-add"(el) { openSheet({ type: "attEdit", workerId: el.dataset.w }); },
    "att-auto"() {
      const r = S.attendance.find((a) => a.id === ui.sheet.recId);
      const snap = snapshot(); r.adjust = null;
      const e = log("auto", { workerId: r.workerId, recId: r.id, projectId: r.projectId, forDate: r.date });
      closeSheet(); done("Back to automatic hours.", snap, [e]);
    },
    "att-edit-save"() {
      const s = ui.sheet, f = F();
      let r = s.recId ? S.attendance.find((a) => a.id === s.recId) : null;
      const e0 = r ? eff(r) : {};
      const inT = f.in || (r && r.in) || e0.in || "08:00", outT = f.out || (r && r.out) || e0.out || "17:00";
      const round = f.round || (r && r.round) || S.settings.rounding || "exact";
      const reason = (f.reason != null ? f.reason : (r && r.mgrReason) || (r ? "" : "Forgot to clock in")).trim();
      const changed = !r || inT !== e0.in || outT !== e0.out;
      if (changed && !reason) return fail("Write a short reason. The worker can see it.");
      const snap = snapshot(), isNew = !r;
      if (!r) {
        r = { id: uid("at"), workerId: s.workerId, projectId: ui.attSite, date: ui.attDate, in: null, out: null, inPhoto: null, outPhoto: null, orig: null, status: "waiting", adjust: null, note: "Added by hand" };
        S.attendance.push(r);
      }
      const sf = r.self || {};
      r.in = inT; r.out = outT; r.round = round; r.status = "approved";
      if (reason) r.mgrReason = reason;
      if (r.adjust && r.adjust.normal != null) r.adjust = null; // times now decide the hours
      const after = calcHours(r);
      const parts = [];
      if (isNew) parts.push(inT + "–" + outT);
      else {
        if (inT !== e0.in) parts.push("clock in " + inT + (sf.in ? " (worker's own " + sf.in + " kept)" : e0.in ? " (was " + e0.in + ")" : ""));
        if (outT !== e0.out) parts.push("clock out " + outT + (sf.out ? " (worker's own " + sf.out + " kept)" : e0.out ? " (was " + e0.out + ")" : ""));
      }
      if (round !== "exact") parts.push(ROUNDING[round].toLowerCase());
      parts.push("paid " + hoursText(after));
      const e = log(isNew ? "add" : "change", { workerId: r.workerId, recId: r.id, projectId: r.projectId, forDate: r.date, value: parts.join(", "), reason });
      notify({ type: "changed", to: "worker", workerId: r.workerId, projectId: r.projectId, forDate: r.date, text: e.value + (reason ? " (" + reason + ")" : "") });
      closeSheet();
      done("Saved and approved: " + esc(worker(r.workerId).name) + ", " + hoursText(after) + ".", snap, [e]);
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

  // floating hover list for calendar days (only where a mouse can hover)
  const canHover = () => window.matchMedia("(hover: hover) and (min-width: 761px)").matches;
  document.addEventListener("mouseover", (e) => {
    if (!canHover()) return;
    const pop = $("#hoverPop");
    if (pop && pop.contains(e.target)) { clearTimeout(hoverTmr); return; }
    const el = e.target.closest("[data-hover]");
    if (el && !(e.target.closest(".cm-bar")) && !document.querySelector(".cal-car.dragging")) { clearTimeout(hoverTmr); hoverTmr = setTimeout(() => showHoverPop(el), 120); return; }
    clearTimeout(hoverTmr); hoverTmr = setTimeout(hideHoverPop, 200);
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
    if (el.dataset.input === "auQ") {
      ui.auQ = el.value; render();
      const n = $('[data-input="auQ"]'); n.focus(); try { n.setSelectionRange(el.value.length, el.value.length); } catch (x) { /* ok */ }
    }
    if (el.dataset.input === "wq") {
      ui.wq = el.value; render();
      const n = $('[data-input="wq"]'); n.focus(); try { n.setSelectionRange(el.value.length, el.value.length); } catch (x) { /* ok */ }
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
    if (c === "role") { S.role = el.value; save(); ui.attSite = null; ui.attFilter = null; ui.attFocus = null; enterRoute(); render(); toast("Now viewing as " + ROLE_LABEL[S.role].toLowerCase() + "." + (unreadCount() ? " You have " + plural(unreadCount(), "new notification") + "." : "")); }
    if (c === "site") { S.people.site.siteId = el.value; save(); render(); }
    if (c === "wlang") { if (me()) me().lang = el.value; W().lang = el.value; save(); render(); }
    if (c === "moneyProject") { ui.moneyProject = el.value; render(); }
    if (c === "calProject") { ui.calProject = el.value; render(); }
    if (c === "attSite") { ui.attSite = el.value; ui.attDate = pickAttDate(el.value); ui.attFilter = null; render(); }
    if (c === "clockSite" && ui.sheet) { ui.sheet.siteId = el.value; renderSheet(); }
    if (el.dataset.setting) {
      const k = el.dataset.setting;
      if (k === "company") S.company.name = el.value.trim() || S.company.name;
      else if (k === "rounding") S.settings.rounding = el.value;
      else { const v = parseFloat(el.value); if (!isNaN(v) && v >= 0) S.settings[k] = v; }
      save(); render(); toast("Saved.");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (ui.sheet) closeSheet(); else if (ui.menu) { ui.menu = false; renderTop(); } }
  });

  function enterRoute() {
    // a scanned site QR code opens #/w/<site id>: switch to the worker screen for that site
    if (S && route().name === "w") {
      S.role = "worker";
      if (project(route().id) && W().siteId !== route().id) { W().siteId = route().id; }
      save();
      history.replaceState(null, "", "#/today");
    }
    if (S && route().name === "attendance") {
      if (!ui.attPicked) { ui.attSite = ui.attSite || defaultAttSite(); ui.attDate = pickAttDate(ui.attSite); }
      ui.attPicked = false;
    }
  }
  window.addEventListener("hashchange", () => { ui.menu = false; if (ui.sheet) closeSheet(); if (!ui.calJump) ui.calBack = false; enterRoute(); render(); window.scrollTo(0, 0); });

  /* ======================================================================
     9. Start
     ====================================================================== */
  load();
  const firstVisit = !S;
  if (firstVisit) { S = window.SampleData.buildSampleData(); migrate(); save(); }
  purgeOldPhotos();
  enterRoute();
  render();
  if (firstVisit) setTimeout(() => toast("This is sample data for GCL Builders. Switch “Viewing as” to see each role."), 600);
  // expose for debugging in the browser console
  window.SiteBook = { get data() { return S; }, calcHours, matchOf, render };
})();
