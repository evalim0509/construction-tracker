/* ==========================================================================
   sample-data.js — "Try with sample data"
   Builds a realistic GCL Builders company around TODAY's date, so the demo
   always looks current: 5 projects, 5 crews, 50 workers, 2 weeks of
   attendance, stock, deliveries, receipts, bills and client payments.
   Fictional suppliers and clients only.
   ========================================================================== */
(function () {
  "use strict";

  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function addDays(base, n) { const d = new Date(base); d.setDate(d.getDate() + n); return iso(d); }
  function rnd(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hm(mins) { return pad(Math.floor(mins / 60)) + ":" + pad(mins % 60); }

  // guess the worker's language from the name (sample data only)
  function langFor(n) {
    if (/^(Md\.|Rafiqul|Jamal|Nazrul|Shamim|Iqbal|Mizanur|Anwar Hossain|Abdul Malek)/.test(n)) return "bn";
    if (/(Thapa|Gurung|Shrestha|Tamang|Bikash Rai|Lama|Hari Prasad|Ram Bahadur)/.test(n)) return "ne";
    if (/(Santoso|Hartono|Kurniawan|Wijaya|Prasetyo|Susilo|Hartanto|Sudira|Saputra)/.test(n)) return "id";
    if (/(Aung|Min Thu|Kyaw|Thein)/.test(n)) return "my";
    if (/(Rahim|Hafiz|Ismail|Arif|Yusri|Azman|Sabri|Zulkifli|Nor Aini|Faisal)/.test(n)) return "ms";
    return "en";
  }

  function buildSampleData() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const D = (n) => addDays(now, n);
    const r = rnd(20261117);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];

    const PHASES = ["Site clearing & piling", "Foundation & ground slab", "Steel structure", "Roofing & wall cladding", "M&E (electrical, plumbing, fire)", "Finishing & handover"];
    const mkPhases = (pid, doneCount) => PHASES.map((name, i) => ({ id: pid + "-ph" + i, name, done: i < doneCount, doneOn: i < doneCount ? D(-120 + i * 18) : null }));

    const projects = [
      { id: "p1", name: "Shah Alam Factory", client: "Sinar Packaging Sdn Bhd", location: "Seksyen 26, Shah Alam", type: "factory",
        start: D(-130), end: D(62), originalEnd: D(62), value: 4800000, phases: mkPhases("p1", 3), delays: [], color: "#0F7F82" },
      { id: "p2", name: "Klang Warehouse", client: "Pelabuhan Jaya Logistics", location: "Pulau Indah, Klang", type: "warehouse",
        start: D(-75), end: D(128), originalEnd: D(116), value: 3200000, phases: mkPhases("p2", 2),
        delays: [
          { id: "d1", date: D(-34), days: 5, reason: "Rain", note: "Heavy rain for most of the week, piling stopped.", by: "site" },
          { id: "d2", date: D(-12), days: 7, reason: "Material late", note: "Steel beams from supplier came 1 week late.", by: "site" }
        ], color: "#3563C4" },
      { id: "p3", name: "Senai Factory Extension", client: "Johor Precision Parts", location: "Senai, Johor", type: "factory",
        start: D(-210), end: D(24), originalEnd: D(4), value: 2650000, phases: mkPhases("p3", 5),
        delays: [{ id: "d3", date: D(-40), days: 20, reason: "Client changed plans", note: "Client added a second loading bay. Extra works approved.", by: "boss" }], color: "#7A5CC9" },
      { id: "p4", name: "Nilai Cold Storage", client: "Fresh Hub Distribution", location: "Nilai, Negeri Sembilan", type: "warehouse",
        start: D(-24), end: D(215), originalEnd: D(215), value: 5900000, phases: mkPhases("p4", 0), delays: [], color: "#4F8F5B" },
      { id: "p5", name: "Rawang Workshop", client: "Tekno Fabrication", location: "Rawang, Selangor", type: "factory",
        start: D(16), end: D(180), originalEnd: D(180), value: 1750000, phases: mkPhases("p5", 0), delays: [], color: "#B9832F" }
    ];
    // phase 1 of Nilai in progress, mark nothing done; fix doneOn for p3 later phases
    projects[2].phases.forEach((ph, i) => { if (ph.done) ph.doneOn = D(-200 + i * 38); });
    projects[1].phases.forEach((ph, i) => { if (ph.done) ph.doneOn = D(-60 + i * 22); });
    projects[0].phases.forEach((ph, i) => { if (ph.done) ph.doneOn = D(-110 + i * 30); });

    const crewDefs = [
      { id: "c1", name: "Crew A", trade: "Structure & concrete", names: ["Rahim Osman", "Mohd Hafiz", "Agus Santoso", "Budi Hartono", "Md. Karim Uddin", "Rafiqul Islam", "Suresh Kumar", "Ram Bahadur Thapa", "Tan Ah Kow", "Jamal Hossain"] },
      { id: "c2", name: "Crew B", trade: "Steel erection", names: ["Wong Kar Fai", "Dedi Kurniawan", "Sanjay Gurung", "Md. Shahid Alam", "Aung Ko Ko", "Kumar Raj", "Ismail Yusof", "Hendra Wijaya", "Abdul Malek", "Bikash Rai"] },
      { id: "c3", name: "Crew C", trade: "Roofing & cladding", names: ["Arif Hakimi", "Eko Prasetyo", "Min Thu", "Ratan Shrestha", "Nazrul Islam", "Lim Boon Huat", "Yusri Ahmad", "Joko Susilo", "Hari Prasad", "Shamim Ahmed"] },
      { id: "c4", name: "Crew D", trade: "M&E", names: ["Vinod Pillai", "Azman Ali", "Chan Kok Leong", "Rudi Hartanto", "Kyaw Zin", "Manoj Tamang", "Faisal Rahman", "Ng Wei Jie", "Iqbal Hossain", "Sabri Hassan"] },
      { id: "c5", name: "Crew E", trade: "Finishing", names: ["Zulkifli Daud", "Nor Aini Kassim", "Wayan Sudira", "Prem Lama", "Mizanur Rahman", "Goh Siew Lan", "Aditya Saputra", "Thein Htike", "Raju Muthu", "Anwar Hossain"] }
    ];
    const crews = crewDefs.map((c) => ({ id: c.id, name: c.name, trade: c.trade, leaderId: c.id + "w0" }));
    const workers = [];
    crewDefs.forEach((c) => c.names.forEach((n, i) => {
      workers.push({ id: c.id + "w" + i, name: n, crewId: c.id, dayRate: i === 0 ? 170 : 95 + Math.round(r() * 6) * 10, phone: "01" + Math.floor(10000000 + r() * 89999999),
        hasPhone: i === 0 || r() < 0.62, lang: langFor(n) });
    }));

    const assignments = [
      { id: "a1", crewId: "c1", projectId: "p1", from: D(-45), to: D(10) },
      { id: "a2", crewId: "c1", projectId: "p4", from: D(14), to: D(70) },
      { id: "a3", crewId: "c2", projectId: "p2", from: D(-30), to: D(26) },
      { id: "a4", crewId: "c3", projectId: "p3", from: D(-28), to: D(5) },
      { id: "a5", crewId: "c3", projectId: "p1", from: D(11), to: D(42) },
      { id: "a6", crewId: "c4", projectId: "p1", from: D(-12), to: D(45) },
      { id: "a7", crewId: "c5", projectId: "p3", from: D(-34), to: D(-1) },
      { id: "a8", crewId: "c5", projectId: "p2", from: D(3), to: D(50) },
      { id: "a9", crewId: "c2", projectId: "p5", from: D(30), to: D(80) }
    ];

    const materials = [
      { id: "m1", cat: "concrete", name: "Cement (50kg bag)", unit: "bags", qty: 64, min: 120 },
      { id: "m2", cat: "concrete", name: "River sand", unit: "tonnes", qty: 38, min: 20 },
      { id: "m3", cat: "concrete", name: "Aggregate 20mm", unit: "tonnes", qty: 45, min: 25 },
      { id: "m17", cat: "concrete", name: "Non-shrink grout (25kg)", unit: "bags", qty: 40, min: 15 },
      { id: "m4", cat: "steel", name: "Rebar Y12 (12m)", unit: "bars", qty: 420, min: 200 },
      { id: "m5", cat: "steel", name: "Rebar Y16 (12m)", unit: "bars", qty: 180, min: 150 },
      { id: "m6", cat: "steel", name: "BRC mesh A10", unit: "sheets", qty: 96, min: 60 },
      { id: "m7", cat: "steel", name: "Steel I-beam 300mm", unit: "pcs", qty: 14, min: 20 },
      { id: "m9", cat: "steel", name: "Anchor bolts M20", unit: "boxes", qty: 22, min: 10 },
      { id: "m18", cat: "steel", name: "Steel base plate 20mm", unit: "pcs", qty: 36, min: 12 },
      { id: "m8", cat: "walls", name: "Metal roof sheet 0.48mm", unit: "pcs", qty: 260, min: 100 },
      { id: "m11", cat: "walls", name: "Bricks", unit: "pcs", qty: 8200, min: 5000 },
      { id: "m19", cat: "walls", name: "Concrete blocks 100mm", unit: "pcs", qty: 1400, min: 800 },
      { id: "m20", cat: "walls", name: "Roof insulation roll", unit: "rolls", qty: 26, min: 10 },
      { id: "m21", cat: "walls", name: "Metal gutter (6m)", unit: "lengths", qty: 18, min: 10 },
      { id: "m10", cat: "formwork", name: "Plywood formwork 18mm", unit: "sheets", qty: 150, min: 80 },
      { id: "m16", cat: "formwork", name: "Scaffolding frames", unit: "sets", qty: 120, min: 60 },
      { id: "m22", cat: "formwork", name: "Timber 2\" x 4\"", unit: "pcs", qty: 310, min: 150 },
      { id: "m23", cat: "formwork", name: "Steel props", unit: "pcs", qty: 85, min: 40 },
      { id: "m13", cat: "mep", name: "PVC pipe 4\" (6m)", unit: "lengths", qty: 74, min: 40 },
      { id: "m14", cat: "mep", name: "Electrical cable 2.5mm", unit: "rolls", qty: 31, min: 20 },
      { id: "m24", cat: "mep", name: "Conduit pipe 20mm", unit: "lengths", qty: 140, min: 60 },
      { id: "m25", cat: "mep", name: "Pipe fittings (elbows, tees)", unit: "boxes", qty: 12, min: 6 },
      { id: "m12", cat: "finish", name: "Wall paint (18L)", unit: "pails", qty: 9, min: 15 },
      { id: "m26", cat: "finish", name: "Floor tiles 600x600", unit: "boxes", qty: 64, min: 30 },
      { id: "m27", cat: "finish", name: "Tile adhesive (25kg)", unit: "bags", qty: 30, min: 20 },
      { id: "m28", cat: "finish", name: "Skim coat (20kg)", unit: "bags", qty: 45, min: 20 },
      { id: "m15", cat: "safety", name: "Safety helmets", unit: "pcs", qty: 18, min: 10 },
      { id: "m29", cat: "safety", name: "Safety vests", unit: "pcs", qty: 22, min: 15 },
      { id: "m30", cat: "safety", name: "Work gloves", unit: "pairs", qty: 8, min: 30 },
      { id: "m31", cat: "safety", name: "Safety harness", unit: "pcs", qty: 12, min: 6 }
    ];

    const needs = [
      { id: "n1", projectId: "p1", materialId: "m8", qty: 180, by: D(2), status: "ordered", note: "Roofing starts next week" },
      { id: "n2", projectId: "p1", materialId: "m1", qty: 200, by: D(1), status: "to buy", note: "For ground slab at office block" },
      { id: "n3", projectId: "p2", materialId: "m7", qty: 24, by: D(4), status: "to buy", note: "" },
      { id: "n4", projectId: "p2", materialId: "m9", qty: 6, by: D(4), status: "to buy", note: "" },
      { id: "n5", projectId: "p3", materialId: "m12", qty: 20, by: D(3), status: "ordered", note: "Final coat, colour: Silver Grey" },
      { id: "n6", projectId: "p1", materialId: "m14", qty: 12, by: D(6), status: "to buy", note: "M&E crew" },
      { id: "n7", projectId: "p4", materialId: "m4", qty: 300, by: D(12), status: "to buy", note: "Piling caps" },
      { id: "n8", projectId: "p4", materialId: "m10", qty: 60, by: D(13), status: "to buy", note: "" },
      { id: "n9", projectId: "p2", materialId: "m16", qty: 40, by: D(9), status: "ordered", note: "" },
      { id: "n10", projectId: "p1", materialId: "m13", qty: 30, by: D(-2), status: "arrived", note: "" },
      { id: "n11", projectId: "p3", materialId: "m11", qty: 1500, by: D(-4), status: "arrived", note: "" }
    ];

    const moves = [];
    const mv = (d, materialId, qty, kind, projectId, note, by) => moves.push({ id: "mv" + moves.length, date: D(d), materialId, qty, kind, projectId: projectId || null, note: note || "", by: by || "buyer" });
    mv(-20, "m1", 300, "in", null, "From Seng Huat Hardware");
    mv(-18, "m1", 120, "out", "p1", "Column casting");
    mv(-15, "m4", 400, "in", null, "Mega Steel Trading");
    mv(-14, "m4", 180, "out", "p1", "", "site");
    mv(-12, "m1", 60, "out", "p3", "", "site");
    mv(-10, "m8", 300, "in", null, "");
    mv(-9, "m8", 40, "out", "p3", "", "site");
    mv(-8, "m7", 30, "in", null, "Late delivery from supplier");
    mv(-7, "m7", 16, "out", "p2", "", "site");
    mv(-6, "m12", 12, "out", "p3", "", "site");
    mv(-5, "m11", 1500, "out", "p3", "", "site");
    mv(-4, "m1", 56, "out", "p1", "Office block footing", "site");
    mv(-3, "m13", 30, "out", "p1", "", "site");
    mv(-2, "m16", 40, "out", "p2", "", "site");
    mv(-1, "m14", 8, "out", "p1", "", "site");

    // ---- attendance: last 14 days + today ----
    const attendance = [];
    const r2 = rnd(424242);
    const crewProject = (crewId, dateIso) => { const a = assignments.find((x) => x.crewId === crewId && x.from <= dateIso && x.to >= dateIso); return a ? a.projectId : null; };
    for (let back = 14; back >= 0; back--) {
      const dIso = D(-back);
      const dow = new Date(now.getTime() - back * 86400000).getDay();
      if (dow === 0) continue; // Sunday rest day
      workers.forEach((w) => {
        const pid = crewProject(w.crewId, dIso);
        if (!pid) return;
        const present = r() < (back === 0 ? 0.86 : 0.94);
        if (!present) return;
        const inM = 7 * 60 + 32 + Math.floor(r() * 44);
        let outM = 17 * 60 + Math.floor(r() * 25);
        const roll = r();
        if (roll < 0.3) outM = 18 * 60 + 30 + Math.floor(r() * 4) * 30;
        else if (roll < 0.34) outM = 12 * 60 + 30 + Math.floor(r() * 30);
        const rec = {
          id: "at" + attendance.length, workerId: w.id, projectId: pid, date: dIso,
          in: hm(inM), out: back === 0 ? null : hm(outM),
          inPhoto: "demo-face:" + w.id, outPhoto: back === 0 ? null : "demo-face:" + w.id,
          status: back >= 2 ? "approved" : "waiting", adjust: null, note: ""
        };
        if (back >= 2 && r() < 0.04) { rec.status = "rejected"; rec.note = "Not on site at clock-in time. Checked with crew leader."; }
        if (back >= 2 && rec.status === "approved" && r() < 0.06) {
          rec.adjust = { normal: 8, ot: 1, half: false, by: "site", reason: "Stayed back 1 hour only, forgot to clock out." };
        }
        // the worker's own clock-in on their phone (second count)
        if (w.hasPhone) {
          const jit = () => Math.floor(r2() * 13) - 6;
          rec.self = { in: hm(inM + jit()), out: back === 0 ? null : hm(outM + jit()), inPhoto: "demo-face:" + w.id, outPhoto: back === 0 ? null : "demo-face:" + w.id, inLoc: "on site", outLoc: back === 0 ? null : "on site" };
          const roll2 = r2();
          if (back <= 1 && roll2 < 0.08) rec.self.in = hm(inM - 25 - Math.floor(r2() * 20));            // times differ
          else if (back === 1 && roll2 < 0.13) { rec.in = null; rec.inPhoto = null; rec.out = null; rec.outPhoto = null; } // manager forgot to confirm
          else if (back === 1 && roll2 < 0.17) rec.self = null;                                           // worker forgot
          else if (back === 0 && roll2 < 0.3) { rec.in = null; rec.inPhoto = null; }                       // waiting for the site manager today
        }
        attendance.push(rec);
      });
    }

    // ---- reports from workers ----
    const disputes = [];
    const lastWork = (minBack) => { for (let b = minBack; b < 10; b++) { const d = D(-b); if (new Date(now.getTime() - b * 86400000).getDay() !== 0) return d; } return D(-minBack); };
    const yd = lastWork(1), d3 = lastWork(3);
    const r1 = attendance.find((a) => a.projectId === "p1" && a.date === yd && a.self && a.in && workers.find((w) => w.id === a.workerId).crewId === "c1");
    if (r1) disputes.push({ id: "ds1", workerId: r1.workerId, date: yd, projectId: "p1", reason: "Wrong OT", note: "I stayed until 8pm to finish the formwork.", status: "open", at: new Date().toISOString() });
    const missW = workers.find((w) => w.crewId === "c4" && w.hasPhone && w.id !== "c4w0");
    if (missW) {
      for (let i = attendance.length - 1; i >= 0; i--) if (attendance[i].workerId === missW.id && attendance[i].date === d3) attendance.splice(i, 1);
      disputes.push({ id: "ds2", workerId: missW.id, date: d3, projectId: "p1", reason: "Day missing", note: "I was on site but my phone battery died.", status: "open", at: new Date().toISOString() });
    }

    // ---- money ----
    const money = [];
    const mo = (o) => money.push(Object.assign({ id: "mo" + money.length, photo: null, supplier: "", ref: "", note: "", by: "boss" }, o));
    const receipts = [
      [-1, 1250, "Cement, 50 bags", "p1", "Bank transfer", "Seng Huat Hardware", "site", "materials"],
      [-1, 86, "Lunch for crew (overtime)", "p1", "Cash", "Restoran Ali Maju", "site", "site"],
      [-2, 420, "Diesel for generator", "p2", "Card", "Petrol station", "site", "transport"],
      [-3, 18000, "Crane rental, 2 weeks", "p1", "Bank transfer", "Kuat Crane Services", "boss", "rental"],
      [-4, 3560, "Safety boots and helmets", "", "Card", "Safe Gear Supplies", "buyer", "tools"],
      [-5, 42800, "Ready-mix concrete G30, 160 m³", "p1", "Bank transfer", "Batu Mix Concrete Sdn Bhd", "boss", "materials"],
      [-6, 64.5, "Toll and parking", "p3", "Cash", "", "site", "transport"],
      [-6, 14500, "Plastering subcontractor, week 2", "p3", "Bank transfer", "Kemas Plaster Works", "boss", "subcon"],
      [-7, 9600, "Scaffolding rental", "p2", "Bank transfer", "Tegap Scaffold", "buyer", "rental"],
      [-8, 215, "Drill bits and cutting discs", "p3", "Cash", "Seng Huat Hardware", "site", "tools"],
      [-9, 27400, "Steel I-beams, 30 pcs", "p2", "Bank transfer", "Mega Steel Trading", "buyer", "materials"],
      [-10, 1180, "Water truck", "p4", "Cash", "Air Bersih Transport", "site", "site"],
      [-11, 6800, "Paint, 20 pails", "p3", "Bank transfer", "Warna Jaya Paints", "buyer", "materials"],
      [-12, 350, "Diesel for excavator", "p4", "Cash", "Petrol station", "site", "transport"],
      [-13, 380, "Printer ink and paper", "", "Card", "Kedai Alat Tulis Ria", "boss", "office"],
      [-14, 15200, "Rebar Y12, 400 bars", "", "Bank transfer", "Mega Steel Trading", "buyer", "materials"],
      [-15, 2750, "Electrical cable and fittings", "p1", "Card", "Elektrik Maju", "buyer", "materials"],
      [-16, 650, "Building permit renewal", "p2", "Bank transfer", "Local council", "boss", "utilities"],
      [-17, 98, "Drinking water for site", "p2", "Cash", "", "site", "site"],
      [-19, 12600, "Excavator rental", "p4", "Bank transfer", "Kuat Crane Services", "boss", "rental"],
      [-20, 9800, "Electrical subcontractor, first payment", "p1", "Bank transfer", "Voltec Wiring Sdn Bhd", "boss", "subcon"],
      [-22, 4300, "Roof sheets transport", "p3", "Bank transfer", "Laju Lorry Services", "buyer", "transport"],
      [-25, 1500, "Site office electricity deposit", "p4", "Bank transfer", "", "boss", "utilities"],
      [-28, 34500, "Metal roof sheets, 300 pcs", "", "Bank transfer", "Atap Steel Industries", "buyer", "materials"],
      [-33, 7400, "Plywood formwork", "p1", "Bank transfer", "Kayu Emas Timber", "buyer", "materials"],
      [-38, 22100, "Ready-mix concrete G25", "p2", "Bank transfer", "Batu Mix Concrete Sdn Bhd", "boss", "materials"],
      [-44, 530, "Generator repair", "p2", "Cash", "Bengkel Kuasa", "site", "tools"]
    ];
    receipts.forEach(([d, amt, what, pid, paidBy, supplier, by, cat], i) => mo({
      dir: "out", status: "paid", date: D(d), amount: amt, what, projectId: pid || null, paidBy, supplier, by, cat,
      ref: amt > 1000 ? "INV-" + (4100 + i * 7) : "", photo: "demo-receipt:" + i
    }));
    // bills to pay
    [[5, 86400, "Steel I-beams and bolts", "p2", "Mega Steel Trading", "INV-4471", "materials"],
     [3, 18000, "Crane rental, next 2 weeks", "p1", "Kuat Crane Services", "INV-0932", "rental"],
     [9, 42800, "Ready-mix concrete G30", "p1", "Batu Mix Concrete Sdn Bhd", "INV-2210", "materials"],
     [14, 9600, "Scaffolding rental", "p2", "Tegap Scaffold", "INV-118", "rental"],
     [7, 3200, "Site electricity (temporary supply)", "p4", "Electricity provider", "ACC-55102", "utilities"],
     [-2, 6100, "Roofing screws and flashing", "p3", "Atap Steel Industries", "INV-7781", "materials"],
     [10, 22000, "Electrical subcontractor, second payment", "p1", "Voltec Wiring Sdn Bhd", "PC-002", "subcon"],
     [24, 61200, "Metal roof sheets, Shah Alam", "p1", "Atap Steel Industries", "QUO-7802", "materials"]
    ].forEach(([d, amt, what, pid, supplier, ref, cat]) => mo({ dir: "out", status: "expected", date: D(d), amount: amt, what, projectId: pid, supplier, ref, cat, paidBy: "Bank transfer" }));
    // client payments
    [[12, 640000, "Progress claim #5", "p1", "Sinar Packaging Sdn Bhd"],
     [20, 410000, "Progress claim #3", "p2", "Pelabuhan Jaya Logistics"],
     [16, 175000, "Deposit (10%)", "p5", "Tekno Fabrication"],
     [45, 132500, "Retention release (5%)", "p3", "Johor Precision Parts"],
     [28, 590000, "Progress claim #1", "p4", "Fresh Hub Distribution"]
    ].forEach(([d, amt, what, pid, supplier]) => mo({ dir: "in", status: "expected", date: D(d), amount: amt, what, projectId: pid, supplier, ref: "" }));
    [[-18, 580000, "Progress claim #4", "p1", "Sinar Packaging Sdn Bhd"],
     [-25, 365000, "Progress claim #2", "p2", "Pelabuhan Jaya Logistics"],
     [-9, 290000, "Progress claim #6", "p3", "Johor Precision Parts"]
    ].forEach(([d, amt, what, pid, supplier]) => mo({ dir: "in", status: "paid", date: D(d), amount: amt, what, projectId: pid, supplier, ref: "", paidBy: "Bank transfer" }));

    return {
      version: 1,
      sample: true,
      createdAt: new Date().toISOString(),
      company: { name: "GCL Builders" },
      people: { boss: { name: "Mr. Lim" }, site: { name: "Faizal", siteId: "p1" }, buyer: { name: "Mei Ling" }, worker: { siteId: null, workerId: null, lang: "en" } },
      role: "boss",
      settings: { normalHours: 8, breakHours: 1, breakAfter: 5, otRate: 1.5, halfDayUnder: 5, photoKeepDays: 30, sundayOff: true, matchMinutes: 15, payDay: 7, geofenceM: 200 },
      flags: { privacySeen: false },
      projects, crews, workers, assignments, materials, needs, moves, attendance, money, disputes
    };
  }

  function buildEmptyData() {
    return {
      version: 1, sample: false, createdAt: new Date().toISOString(),
      company: { name: "My Company" },
      people: { boss: { name: "Boss" }, site: { name: "Site manager", siteId: null }, buyer: { name: "Buyer" }, worker: { siteId: null, workerId: null, lang: "en" } },
      role: "boss",
      settings: { normalHours: 8, breakHours: 1, breakAfter: 5, otRate: 1.5, halfDayUnder: 5, photoKeepDays: 30, sundayOff: true, matchMinutes: 15, payDay: 7, geofenceM: 200 },
      flags: { privacySeen: false },
      projects: [], crews: [], workers: [], assignments: [], materials: [], needs: [], moves: [], attendance: [], money: [], disputes: []
    };
  }

  window.SampleData = { buildSampleData, buildEmptyData };
})();
