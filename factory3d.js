/* ==========================================================================
   factory3d.js — a randomly generated 3D factory / warehouse for the demo.
   Each project gets its own building (seeded by project id) and the model
   shows progress: bare steel frame -> walls going up (teal) -> finished.
   One shared WebGL renderer for the live view, one for still thumbnails,
   so we never run out of WebGL contexts.
   ========================================================================== */
(function () {
  "use strict";

  const COLORS = {
    // greys only (v0.4): reads like an architect's model, not a toy
    ground: 0xE9EDF0, slab: 0xD6DBDF, steel: 0x535E67, wall: 0xEEF0F2, roof: 0xB9C0C6,
    current: 0x8A959E, glass: 0x3A444C, office: 0xE4E7EA, crane: 0xA9B1B7, blue: 0x8C979F,
    teal: 0x9FA9B1, pallet: 0xC9CDD0, rebar: 0x6B737A, edge: 0x2B3944, truck: 0xF2F4F5
  };

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = hash(String(seed));
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const hasGL = (function () {
    try {
      if (!window.THREE) return false;
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
    } catch (e) { return false; }
  })();

  /* ---------- building from a traced blueprint ----------
     opts.plan = { floors: [{ elev, w, d, parts: [{ id, type, x1, z1, x2, z2, look, h }] }] } in metres.
     Walls rise as they progress: look 0 = faint outline on the floor, 1 = grey blockwork,
     2 = smooth plaster, 3 = painted. Pipes are lines at knee height; columns are posts. */
  function blockTexture() {
    const T = window.THREE;
    if (blockTexture.t) return blockTexture.t;
    const c = document.createElement("canvas"); c.width = 128; c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#5F686F"; g.fillRect(0, 0, 128, 64);
    g.fillStyle = "#8E979E";
    for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) g.fillRect(col * 64 + (row % 2) * 32 + 2, row * 16 + 2, 60, 12);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping;
    blockTexture.t = t;
    return t;
  }
  function buildPlanModel(plan) {
    const T = window.THREE;
    const g = new T.Group();
    const edgeMat = new T.LineBasicMaterial({ color: COLORS.edge, transparent: true, opacity: 0.18 });
    // not started: see-through wall with clear edges; waiting for approval: amber edges
    const ghostEdge = new T.LineBasicMaterial({ color: 0x5B6873, transparent: true, opacity: 0.55 });
    const waitEdge = new T.LineBasicMaterial({ color: 0xD08A2E });
    const footMat = (pend) => mat(pend ? "footW" : "foot", () => std(pend ? 0xD08A2E : 0x7D8A94));
    const mats = {};
    const mat = (key, make) => mats[key] || (mats[key] = make());
    const std = (hex, extra) => { const m = new T.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0.02 }, extra || {})); m.color.setHex(hex).convertSRGBToLinear(); return m; };
    const WALL = [
      () => mat("w0", () => std(0xA9B6C0, { transparent: true, opacity: 0.16, depthWrite: false })),
      () => mat("w1", () => { const m = std(0xFFFFFF); m.map = blockTexture(); return m; }),
      () => mat("w2", () => std(0xC3C9CE)),
      () => mat("w3", () => std(0xEBDDC2))
    ];
    const PIPE = [0xC4CCD2, 0x8A959E, 0x3563C4, 0x2E8B57];
    const COL = [0xC4CCD2, 0xB08A5A, 0x8C959C, 0x77828B];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, top = 0;
    const fl = plan.floors || [];
    fl.forEach((f) => f.parts.forEach((pt) => { minX = Math.min(minX, pt.x1, pt.x2); maxX = Math.max(maxX, pt.x1, pt.x2); minZ = Math.min(minZ, pt.z1, pt.z2); maxZ = Math.max(maxZ, pt.z1, pt.z2); }));
    if (!isFinite(minX)) { minX = 0; maxX = 20; minZ = 0; maxZ = 12; }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const ground = new T.Mesh(new T.PlaneGeometry(Math.max(400, (maxX - minX) * 4), Math.max(400, (maxZ - minZ) * 4)), new T.ShadowMaterial({ opacity: 0.12 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    fl.forEach((f) => {
      const y0 = f.elev || 0;
      // floor slab under the traced area
      const slab = new T.Mesh(new T.BoxGeometry(maxX - minX + 2, 0.2, maxZ - minZ + 2), mat("slab", () => std(COLORS.slab)));
      slab.position.set(0, y0 - 0.1, 0); slab.receiveShadow = true; g.add(slab);
      f.parts.forEach((pt) => {
        const x1 = pt.x1 - cx, z1 = pt.z1 - cz, x2 = pt.x2 - cx, z2 = pt.z2 - cz;
        const len = Math.max(0.05, Math.hypot(x2 - x1, z2 - z1)), ang = Math.atan2(z2 - z1, x2 - x1);
        let m;
        if (pt.type === "wall") {
          const h = pt.h || 4;
          if (pt.look === 0) {   // footprint strip on the floor, so the plan reads even from far away
            const foot = new T.Mesh(new T.BoxGeometry(len, 0.12, 0.3), footMat(pt.pending));
            foot.position.set((x1 + x2) / 2, y0 + 0.06, (z1 + z2) / 2); foot.rotation.y = -ang; foot.userData.partId = pt.id; g.add(foot);
          }
          m = new T.Mesh(new T.BoxGeometry(len, h, 0.22), WALL[Math.min(3, pt.look)]());
          if (pt.look === 1) { m.material = m.material.clone(); m.material.map = blockTexture().clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(len / 1.6, h / 0.8); }
          m.position.set((x1 + x2) / 2, y0 + h / 2, (z1 + z2) / 2);
          m.rotation.y = -ang;
          top = Math.max(top, y0 + h);
        } else if (pt.type === "pipe") {
          m = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, len, 10), mat("p" + pt.look, () => std(PIPE[Math.min(3, pt.look)], pt.look ? {} : { transparent: true, opacity: 0.6 })));
          m.rotation.z = Math.PI / 2; const wrap = new T.Group(); wrap.add(m); wrap.rotation.y = -ang;
          wrap.position.set((x1 + x2) / 2, y0 + 0.35, (z1 + z2) / 2);
          m.userData.partId = pt.id; m.castShadow = true;
          g.add(wrap);
          return;
        } else {
          const h = (pt.h || 4) * (pt.look === 1 ? 0.6 : 1);
          m = new T.Mesh(new T.BoxGeometry(0.45, h, 0.45), mat("c" + pt.look + "-" + h, () => std(COL[Math.min(3, pt.look)], pt.look ? {} : { transparent: true, opacity: 0.25, depthWrite: false })));
          m.position.set(x1, y0 + h / 2, z1);
          top = Math.max(top, y0 + h);
        }
        m.castShadow = true; m.receiveShadow = true;
        m.userData.partId = pt.id;
        m.add(new T.LineSegments(new T.EdgesGeometry(m.geometry, 20), pt.pending ? waitEdge : pt.look > 0 ? edgeMat : ghostEdge));
        if (pt.look === 0) m.castShadow = false;
        g.add(m);
      });
    });
    const W = maxX - minX, D = maxZ - minZ;
    g.userData.radius = Math.sqrt(Math.pow(W / 2 + 3, 2) + Math.pow(D / 2 + 3, 2) + Math.pow(Math.max(4, top) / 2, 2));
    g.userData.cy = Math.max(2, top) * 0.3;
    g.userData.zoom = 0.72;   // fill more of the view than the generic model, without cutting it off
    return g;
  }

  /* ---------- building ---------- */
  function buildModel(opts) {
    if (opts.plan) return buildPlanModel(opts.plan);
    const T = window.THREE;
    const r = rng(opts.seed || "x");
    const p = clamp(opts.progress == null ? 0.5 : opts.progress, 0, 1);
    const isWarehouse = opts.type === "warehouse";
    const g = new T.Group();
    const matCache = {};
    const edgeMat = new T.LineBasicMaterial({ color: COLORS.edge, transparent: true, opacity: 0.16 });

    function mat(color, extra) {
      const key = color + JSON.stringify(extra || {});
      if (!matCache[key]) {
        const m = new T.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0.02 }, extra || {}));
        m.color.setHex(color).convertSRGBToLinear();
        matCache[key] = m;
      }
      return matCache[key];
    }
    function add(geo, color, x, y, z, extra, noEdges) {
      const m = new T.Mesh(geo, mat(color, extra));
      m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      if (!noEdges) {
        const e = new T.LineSegments(new T.EdgesGeometry(geo, 20), edgeMat);
        m.add(e);
      }
      g.add(m);
      return m;
    }
    const box = (w, h, d) => new T.BoxGeometry(w, h, d);

    const L = 16 + r() * 8;           // length (x)
    const W = isWarehouse ? 11 + r() * 4 : 9 + r() * 3; // width (z)
    const H = isWarehouse ? 6.5 + r() * 1.5 : 5 + r() * 1.5;

    // ground + slab
    const ground = new T.Mesh(new T.PlaneGeometry(160, 160), new T.ShadowMaterial({ opacity: 0.13 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    add(box(L + 14, 0.35, W + 12), COLORS.slab, 2, 0.175, 0, null, false);
    const base = 0.35;

    // progress → how much is built
    const frameF = clamp(0.12 + p * 1.5, 0.12, 1);    // steel frame
    const roofF = clamp((p - 0.18) / 0.55, 0, 1);      // roof
    const clad = clamp((p - 0.3) / 0.55, 0, 1);        // finished walls
    const bays = Math.max(5, Math.round(L / 3));
    const bayL = L / bays;
    const x0 = -L / 2;

    for (let i = 0; i <= bays; i++) {
      if (i / bays > frameF + 1e-6) break;
      const x = x0 + i * bayL;
      add(box(0.28, H, 0.28), COLORS.steel, x, base + H / 2, W / 2);
      add(box(0.28, H, 0.28), COLORS.steel, x, base + H / 2, -W / 2);
      add(box(0.22, 0.32, W), COLORS.steel, x, base + H, 0);
    }
    // eave beams along the frame
    const frameLen = Math.min(L, Math.floor(frameF * bays) * bayL);
    if (frameLen > 0) {
      add(box(frameLen, 0.24, 0.24), COLORS.steel, x0 + frameLen / 2, base + H, W / 2);
      add(box(frameLen, 0.24, 0.24), COLORS.steel, x0 + frameLen / 2, base + H, -W / 2);
    }

    const cladBays = Math.floor(clad * bays);
    const currentBays = p < 0.97 ? Math.min(bays - cladBays, frameF >= 1 ? 2 : 1) : 0;
    for (let i = 0; i < bays; i++) {
      const cx = x0 + i * bayL + bayL / 2;
      let color = null, extra = null;
      if (i < cladBays) color = COLORS.wall;
      else if (i < cladBays + currentBays && (i + 1) / bays <= frameF + 1e-6) { color = COLORS.current; extra = { transparent: true, opacity: 0.88 }; }
      if (color == null) continue;
      add(box(bayL - 0.05, H - 0.1, 0.14), color, cx, base + H / 2, W / 2, extra);
      add(box(bayL - 0.05, H - 0.1, 0.14), color, cx, base + H / 2, -W / 2, extra);
      // loading doors / window band on finished bays
      if (color === COLORS.wall) {
        if (isWarehouse && i % 2 === 1) add(box(bayL * 0.55, H * 0.55, 0.06), COLORS.steel, cx, base + H * 0.28, W / 2 + 0.1, null, true);
        if (!isWarehouse) add(box(bayL * 0.8, 0.5, 0.06), COLORS.glass, cx, base + H * 0.72, W / 2 + 0.1, { roughness: 0.3, metalness: 0.4 }, true);
      }
    }
    if (cladBays > 0) add(box(0.14, H - 0.1, W), COLORS.wall, x0, base + H / 2, 0);
    if (cladBays >= bays) add(box(0.14, H - 0.1, W), COLORS.wall, x0 + L, base + H / 2, 0);

    // roof
    const roofBays = Math.floor(roofF * bays);
    for (let i = 0; i < roofBays; i++) {
      const sx = x0 + i * bayL;
      if (!isWarehouse) {
        // sawtooth roof (classic factory)
        const s = new T.Shape();
        s.moveTo(0, 0); s.lineTo(bayL, 0); s.lineTo(bayL, 1.5); s.lineTo(0, 0);
        const geo = new T.ExtrudeGeometry(s, { depth: W + 0.4, bevelEnabled: false });
        const m = add(geo, COLORS.roof, sx, base + H + 0.16, -W / 2 - 0.2);
        m.castShadow = true;
        add(box(0.06, 1.3, W + 0.2), COLORS.glass, sx + bayL - 0.05, base + H + 0.86, 0, { roughness: 0.3, metalness: 0.4 }, true);
      } else {
        // gable roof
        const s = new T.Shape();
        s.moveTo(-W / 2 - 0.4, 0); s.lineTo(W / 2 + 0.4, 0); s.lineTo(0, 1.9); s.lineTo(-W / 2 - 0.4, 0);
        const geo = new T.ExtrudeGeometry(s, { depth: bayL, bevelEnabled: false });
        const m = add(geo, COLORS.roof, sx, base + H + 0.16, 0);
        m.rotation.y = Math.PI / 2;
        m.position.x = sx; m.position.z = 0; // after the 90° turn the extrusion runs along +x
      }
    }

    // office block at the front end
    const oL = 4 + r() * 2, oW = W * (0.55 + r() * 0.2), floors = 2 + Math.floor(r() * 2), fh = 3.1;
    const ox = x0 - oL / 2 - 0.2, oz = W / 2 - oW / 2 + 1;
    if (p > 0.08) {
      const built = p > 0.45 ? floors : Math.max(1, Math.round(floors * p * 2));
      for (let f = 0; f < built; f++) {
        const y = base + f * fh + fh / 2;
        if (p > 0.45) {
          add(box(oL, fh - 0.05, oW), COLORS.office, ox, y, oz);
          add(box(oL * 0.86, 0.9, 0.06), COLORS.glass, ox, y + 0.25, oz + oW / 2 + 0.03, { roughness: 0.25, metalness: 0.5 }, true);
          add(box(0.06, 0.9, oW * 0.7), COLORS.glass, ox - oL / 2 - 0.03, y + 0.25, oz, { roughness: 0.25, metalness: 0.5 }, true);
        } else {
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => add(box(0.25, fh, 0.25), COLORS.steel, ox + a * oL / 2, y, oz + b * oW / 2));
          add(box(oL, 0.2, oW), COLORS.slab, ox, y + fh / 2, oz);
        }
      }
    }

    // factory extras: silos + stack
    if (!isWarehouse) {
      const n = 1 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const cyl = new T.CylinderGeometry(1.1, 1.1, 6 + r() * 2, 28);
        const h = cyl.parameters.height;
        add(cyl, p > 0.6 ? COLORS.wall : COLORS.roof, x0 + L + 2.4, base + h / 2, -W / 2 + 1.6 + i * 2.6);
      }
      if (p > 0.5) {
        const st = new T.CylinderGeometry(0.35, 0.45, 11, 16);
        add(st, COLORS.steel, x0 + L * 0.7, base + 5.5, -W / 2 - 1.4);
      }
    } else {
      // trucks at the dock
      for (let i = 0; i < 2; i++) {
        if (p < 0.5) break;
        const tx = x0 + bayL * (1.5 + i * 3);
        add(box(1.8, 2.1, 4.8), COLORS.truck, tx, base + 1.2, W / 2 + 4.4);
        add(box(1.8, 1.6, 1.4), COLORS.blue, tx, base + 0.95, W / 2 + 7.5);
      }
    }

    // site cabins (containers) + material stacks
    add(box(5, 2.4, 2.2), COLORS.teal, x0 + L * 0.35, base + 1.2, W / 2 + 4.6);
    add(box(5, 2.4, 2.2), COLORS.blue, x0 + L * 0.35 + 5.4, base + 1.2, W / 2 + 4.6);
    for (let i = 0; i < 4; i++) {
      add(box(1.4, 0.7 + r() * 0.6, 1.2), COLORS.pallet, x0 + L * 0.6 + i * 1.7, base + 0.5, W / 2 + 3.2, null, false);
    }
    for (let i = 0; i < 6; i++) add(box(6, 0.12, 0.12), COLORS.rebar, x0 + L * 0.55 + 3, base + 0.1 + i * 0.13, -W / 2 - 3.2 - (i % 2) * 0.14, null, true);

    // tower crane while building
    if (p < 0.92) {
      const cx = x0 + L * (0.25 + r() * 0.4), cz = -W / 2 - 3.5, ch = 17;
      const mast = add(box(0.8, ch, 0.8), COLORS.crane, cx, base + ch / 2, cz, { roughness: 0.6 });
      const jib = new T.Group(); jib.position.set(cx, base + ch, cz);
      const j1 = new T.Mesh(box(16, 0.6, 0.6), mat(COLORS.crane)); j1.position.set(5, 0.3, 0); j1.castShadow = true;
      const j2 = new T.Mesh(box(5, 0.6, 0.6), mat(COLORS.crane)); j2.position.set(-4.5, 0.3, 0);
      const cw = new T.Mesh(box(1.6, 1.4, 1.2), mat(COLORS.steel)); cw.position.set(-6, -0.2, 0);
      const cab = new T.Mesh(box(1.2, 1.2, 1.2), mat(COLORS.wall)); cab.position.set(0.9, -0.6, 0);
      const top = new T.Mesh(box(0.5, 2.2, 0.5), mat(COLORS.crane)); top.position.set(0, 1.4, 0);
      const cable = new T.Mesh(box(0.05, 7, 0.05), mat(COLORS.edge)); cable.position.set(9, -3.2, 0);
      const hook = new T.Mesh(box(1.2, 0.6, 0.9), mat(COLORS.steel)); hook.position.set(9, -6.8, 0);
      [j1, j2, cw, cab, top, cable, hook].forEach((m) => { m.add(new T.LineSegments(new T.EdgesGeometry(m.geometry), edgeMat)); jib.add(m); });
      jib.rotation.y = r() * Math.PI * 2;
      g.add(jib);
      g.userData.jib = jib;
      mast.userData.isCrane = true;
    }

    g.userData.size = Math.max(L + 14, W + 12);
    const tall = p < 0.92 ? 19 : 10;
    g.userData.radius = Math.sqrt(Math.pow((L + 16) / 2, 2) + Math.pow((W + 12) / 2, 2) + Math.pow(tall / 2, 2));
    g.userData.cy = tall * 0.32;
    g.position.x = -2;
    return g;
  }

  function makeScene() {
    const T = window.THREE;
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xffffff, 0xB9C4CC, 0.62));
    const sun = new T.DirectionalLight(0xffffff, 1.05);
    sun.position.set(22, 34, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 1; sc.far = 100;
    sun.shadow.bias = -0.0008;
    sun.shadow.radius = 4;
    scene.add(sun);
    scene.add(new T.AmbientLight(0xffffff, 0.12));
    return scene;
  }

  function makeRenderer(preserve) {
    const T = window.THREE;
    const rd = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!preserve });
    rd.setClearColor(0x000000, 0);
    rd.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    rd.shadowMap.enabled = true;
    rd.shadowMap.type = T.PCFSoftShadowMap;
    rd.outputEncoding = T.sRGBEncoding;
    return rd;
  }

  function disposeGroup(g) {
    g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  function placeCamera(cam, model, aspect, zoom) {
    const r = model.userData.radius || 20;
    const vf = (cam.fov * Math.PI) / 180;
    const hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    // blueprint models: fit the whole building (a long building on a tall, narrow phone view needs the full sphere)
    const z = zoom || (model.userData.zoom ? (aspect < 1 ? 1.0 : model.userData.zoom) : 0.82);
    const d = (r / Math.sin(Math.min(vf, hf) / 2)) * z;
    const dir = new window.THREE.Vector3(0.74, 0.5, 0.86).normalize();
    cam.position.set(dir.x * d, dir.y * d + (model.userData.cy || 3), dir.z * d);
    cam.lookAt(0, model.userData.cy || 3, 0);
    // near/far follow the model's size, so a building of any size stays inside the view
    cam.near = Math.max(0.05, d / 2000); cam.far = Math.max(400, d + r * 4); cam.updateProjectionMatrix();
  }

  /* ---------- live view (one shared renderer) ---------- */
  const live = { renderer: null, scene: null, camera: null, model: null, key: "", host: null, raf: 0, rotY: -0.5, drag: null, ro: null, onPick: null, opts: null, lost: false };

  // on screen? measured each frame (an IntersectionObserver can lag behind on iPhones when pages change)
  function onScreen(el) { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < (window.innerHeight || 800); }

  /* Phones throw away the 3D drawing surface (WebGL context) when another app takes over, e.g. the camera
     for a photo. A lost surface draws nothing, so we drop it and build a fresh one. */
  function dropRenderer() {
    if (!live.renderer) return;
    cancelAnimationFrame(live.raf); live.raf = 0;
    const cv = live.renderer.domElement;
    if (cv.parentNode) cv.parentNode.removeChild(cv);
    if (live.ro) live.ro.disconnect();
    try { live.renderer.dispose(); } catch (e) { /* already gone */ }
    if (live.model) { try { disposeGroup(live.model); } catch (e) { /* already gone */ } }
    Object.assign(live, { renderer: null, scene: null, camera: null, model: null, key: "", host: null, ro: null, lost: false });
  }
  function revive() {   // rebuild the 3D after a lost surface, if it is on the page
    const host = live.host, opts = live.opts;
    dropRenderer();
    if (host && host.isConnected && opts) attach(host, opts);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    if (live.renderer && (live.lost || live.renderer.getContext().isContextLost())) setTimeout(revive, 150);
    if (thumbR && thumbR.getContext().isContextLost()) { try { thumbR.dispose(); } catch (e) { /* gone */ } thumbR = null; }
  });

  function loop() {
    live.raf = requestAnimationFrame(loop);
    if (!live.renderer || live.lost || !live.host || !live.host.isConnected || document.hidden || !onScreen(live.host)) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!live.drag && !reduce && !live.onPick) live.rotY += 0.0018;
    if (live.model) {
      live.model.rotation.y = live.rotY;
      if (live.model.userData.jib && !reduce) live.model.userData.jib.rotation.y += 0.002;
    }
    live.renderer.render(live.scene, live.camera);
  }

  function resize() {
    if (!live.host) return;
    const w = live.host.clientWidth || 300, h = live.host.clientHeight || 300;
    live.renderer.setSize(w, h, false);
    live.camera.aspect = w / h;
    live.camera.updateProjectionMatrix();
    if (live.model) placeCamera(live.camera, live.model, w / h);
  }

  // never leave an empty box: if 3D cannot start, say so (and how to retry)
  function attach(host, opts) {
    try { attach3D(host, opts); }
    catch (e) {
      dropRenderer();
      if (host) host.innerHTML = '<div style="height:100%;display:grid;place-items:center;text-align:center;padding:16px;color:#5B6873;font-size:14px">3D could not start on this device (' + String(e && e.message || e).replace(/[<>&]/g, "") + ').<br>Close other tabs or reload the page to try again.</div>';
    }
  }
  function attach3D(host, opts) {
    if (!host) return;
    if (!hasGL) { host.innerHTML = fallbackSVG(opts); return; }
    const T = window.THREE;
    if (live.renderer && (live.lost || live.renderer.getContext().isContextLost())) dropRenderer();
    live.opts = opts;
    if (!live.renderer) {
      live.renderer = makeRenderer(false);
      live.scene = makeScene();
      live.camera = new T.PerspectiveCamera(30, 1, 0.1, 400);
      const cv = live.renderer.domElement;
      cv.setAttribute("aria-label", "3D model of the building. Drag to turn it.");
      cv.setAttribute("role", "img");
      cv.addEventListener("pointerdown", (e) => { live.drag = { x: e.clientX, y: e.clientY, r: live.rotY, moved: false }; cv.setPointerCapture(e.pointerId); });
      cv.addEventListener("pointermove", (e) => { if (live.drag) { if (Math.abs(e.clientX - live.drag.x) > 5) live.drag.moved = true; live.rotY = live.drag.r + (e.clientX - live.drag.x) * 0.008; } });
      // a tap (no drag) on a wall, pipe or column of a blueprint model opens it
      cv.addEventListener("pointerup", (e) => {
        const d = live.drag;
        if (!d || d.moved || !live.onPick || !live.model) return;
        const r = cv.getBoundingClientRect();
        const ray = new T.Raycaster();
        ray.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), live.camera);
        const hit = ray.intersectObject(live.model, true).find((h) => h.object.userData.partId);
        if (hit) live.onPick(hit.object.userData.partId);
      });
      const end = () => { live.drag = null; };
      cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
      live.ro = new ResizeObserver(resize);
      cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); live.lost = true; setTimeout(() => { if (!document.hidden && live.lost) revive(); }, 400); });
      loop();
    }
    live.onPick = opts.onPick || null;
    const key = [opts.seed, Math.round((opts.progress || 0) * 100), opts.type, opts.planKey || ""].join("|");
    if (live.key !== key) {
      if (live.model) { live.scene.remove(live.model); disposeGroup(live.model); }
      live.model = buildModel(opts);
      live.scene.add(live.model);
      live.key = key;
      resize();
    }
    if (live.host !== host) {
      if (live.host) live.ro.unobserve(live.host);
      live.host = host;
      live.ro.observe(host);
    }
    if (live.renderer.domElement.parentNode !== host) host.appendChild(live.renderer.domElement);
    resize();
  }

  /* ---------- still thumbnails ---------- */
  const thumbCache = {};
  let thumbR = null, thumbScene = null, thumbCam = null;
  function thumb(opts, w, h) {
    w = w || 640; h = h || 360;
    const key = [opts.seed, Math.round((opts.progress || 0) * 100), opts.type, opts.planKey || "", w, h].join("|");
    if (thumbCache[key]) return thumbCache[key];
    if (!hasGL) return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(fallbackSVG(opts));
    const T = window.THREE;
    if (thumbR && thumbR.getContext().isContextLost()) { try { thumbR.dispose(); } catch (e) { /* gone */ } thumbR = null; }
    if (!thumbR) {
      thumbR = makeRenderer(true);
      thumbR.setPixelRatio(1.5);
      thumbScene = makeScene();
      thumbCam = new T.PerspectiveCamera(30, w / h, 0.1, 400);
    }
    thumbR.setSize(w, h, false);
    thumbCam.aspect = w / h; thumbCam.updateProjectionMatrix();
    const m = buildModel(opts);
    m.rotation.y = -0.55;
    thumbScene.add(m);
    placeCamera(thumbCam, m, w / h, 0.74);
    thumbR.render(thumbScene, thumbCam);
    const url = thumbR.domElement.toDataURL("image/png");
    thumbScene.remove(m); disposeGroup(m);
    thumbCache[key] = url;
    return url;
  }

  /* ---------- no-WebGL fallback: simple line drawing ---------- */
  function fallbackSVG(opts) {
    const p = clamp(opts && opts.progress != null ? opts.progress : 0.5, 0, 1);
    const w = Math.round(60 + p * 180);
    return '<svg viewBox="0 0 400 260" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#5B6873" stroke-width="2" stroke-linejoin="round">' +
      '<path d="M40 210h320" stroke="#C9D2D8"/>' +
      '<path d="M70 210V120l40 30v-30l40 30v-30l40 30v-30l40 30v60z" fill="#F5F7F8"/>' +
      '<path d="M270 210v-90h50v90" fill="#E6EBEE"/><path d="M280 140h30M280 160h30M280 180h30" stroke="#2C3E50"/>' +
      '<rect x="70" y="214" width="' + w + '" height="8" rx="4" fill="#0F7F82" stroke="none"/>' +
      '<path d="M330 210V60h6v150M300 64h70" stroke="#E0B341" stroke-width="3"/></svg>';
  }

  window.Factory3D = { attach, thumb, hasGL, fallbackSVG };
})();
