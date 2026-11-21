/* Renders test "site photos" with three.js: walls, pipes and columns at each stage. */
(function () {
  const T = THREE;
  // ---------- noise ----------
  function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s, oct) { let t = 0, a = 0.5, f = 1; for (let i = 0; i < (oct || 4); i++) { t += a * vnoise(x * f, y * f, s + i); a *= 0.5; f *= 2; } return t; }
  function canvasTex(w, h, paint, rep) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); const img = g.createImageData(w, h);
    paint(img.data, w, h, g);
    g.putImageData(img, 0, 0);
    if (paint.after) paint.after(g, w, h);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; t.encoding = T.sRGBEncoding;
    if (rep) t.repeat.set(rep[0], rep[1]);
    return t;
  }
  const put = (d, i, r, gg, b) => { d[i] = Math.max(0, Math.min(255, r)); d[i + 1] = Math.max(0, Math.min(255, gg)); d[i + 2] = Math.max(0, Math.min(255, b)); d[i + 3] = 255; };
  // 1 texture = 4 m x 2 m (256 px per metre)
  function blockTex() {
    return canvasTex(1024, 512, (d, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const row = Math.floor(y / 51.2), off = (row % 2) * 51.2, bx = Math.floor((x + off) / 102.4);
        const jx = (x + off) % 102.4, jy = y % 51.2;
        const joint = jx < 2.8 || jy < 2.8;
        const n = fbm(x / 9, y / 9, 3, 3), sp = hash(x, y, 7);
        let v;
        if (joint) v = 118 + n * 20;
        else { const bv = (hash(bx, row, 11) - 0.5) * 22; v = 150 + bv + (n - 0.5) * 26 + (sp > 0.985 ? -45 : 0) + (sp < 0.01 ? 25 : 0); if (jx < 5 || jy < 5) v -= 10; }
        put(d, (y * w + x) * 4, v, v - 1, v - 5);
      }
    });
  }
  function plasterTex() {
    return canvasTex(1024, 512, (d, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const m = fbm(x / 140, y / 140, 5, 4), f = hash(x, y, 9), tr = Math.sin((x + fbm(x / 60, y / 60, 2, 2) * 120) / 38) * 2;
        const v = 196 + (m - 0.5) * 26 + (f - 0.5) * 9 + tr;
        put(d, (y * w + x) * 4, v + 2, v, v - 6);
      }
    });
  }
  function paintTex() {
    return canvasTex(512, 256, (d, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const m = fbm(x / 120, y / 120, 8, 3), f = hash(x, y, 4);
        const v = (m - 0.5) * 6 + (f - 0.5) * 3;
        put(d, (y * w + x) * 4, 240 + v, 233 + v, 216 + v);
      }
    });
  }
  function floorTex() {
    const t = canvasTex(1024, 1024, (d, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const m = fbm(x / 90, y / 90, 12, 5), s = fbm(x / 20, y / 20, 13, 2), f = hash(x, y, 14);
        const v = 132 + (m - 0.5) * 40 + (s - 0.5) * 14 + (f - 0.5) * 14;
        put(d, (y * w + x) * 4, v, v - 2, v - 7);
      }
    });
    return t;
  }
  floorTex.after = null;
  function soilTex(fresh) {
    return canvasTex(1024, 1024, (d, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const m = fbm(x / 40, y / 40, fresh ? 21 : 22, 5), f = hash(x, y, 23), peb = hash(Math.floor(x / 3), Math.floor(y / 3), 24) > 0.992;
        let r = 122 + (m - 0.5) * 60 + (f - 0.5) * 24, g = 92 + (m - 0.5) * 48 + (f - 0.5) * 20, b = 64 + (m - 0.5) * 36 + (f - 0.5) * 16;
        if (fresh) { r -= 14; g -= 10; b -= 6; }
        if (peb) { r = 150 + f * 30; g = 138 + f * 28; b = 120 + f * 24; }
        put(d, (y * w + x) * 4, r, g, b);
      }
    });
  }
  function sandTex() {
    return canvasTex(512, 512, (d, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const f = hash(x, y, 31), m = fbm(x / 30, y / 30, 32, 3); const v = 186 + (m - 0.5) * 30 + (f - 0.5) * 30; put(d, (y * w + x) * 4, v, v - 12, v - 38); }
    });
  }
  function plyTex() {
    return canvasTex(512, 1024, (d, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const g = Math.sin((y + fbm(x / 50, y / 200, 41, 3) * 90) / 6) * 0.5 + 0.5, f = hash(x, y, 42);
        put(d, (y * w + x) * 4, 186 + g * 22 + (f - 0.5) * 10, 136 + g * 18 + (f - 0.5) * 10, 86 + g * 12);
      }
    });
  }
  function concreteTex(painted) {
    return canvasTex(512, 1024, (d, w, h) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const m = fbm(x / 60, y / 60, 51, 4), f = hash(x, y, 52), hole = !painted && hash(Math.floor(x / 4), Math.floor(y / 4), 53) > 0.992;
        let v = painted ? 222 + (m - 0.5) * 6 + (f - 0.5) * 3 : 160 + (m - 0.5) * 34 + (f - 0.5) * 16 - (y > 900 ? 12 : 0);
        if (!painted && (y % 300 < 3)) v -= 18;
        if (hole) v -= 60;
        put(d, (y * w + x) * 4, v, v, v - (painted ? 3 : 2));
      }
    });
  }
  function roofTex() {
    return canvasTex(256, 256, (d, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 150 + Math.sin(x / 8) * 22 + (hash(x, y, 61) - 0.5) * 8; put(d, (y * w + x) * 4, v, v + 2, v + 6); } });
  }
  function gaugeTex() {
    const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
    g.fillStyle = "#f4f4f2"; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = "#222"; g.lineWidth = 8; g.stroke();
    g.fillStyle = "#222"; g.font = "bold 22px Arial"; g.textAlign = "center";
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.75 + i * 0.15); g.fillRect(128 + Math.cos(a) * 95 - 3, 128 + Math.sin(a) * 95 - 3, 6, 6); if (i % 2 === 0) g.fillText(String(i * 2), 128 + Math.cos(a) * 72, 136 + Math.sin(a) * 72); }
    g.fillText("bar", 128, 190); g.strokeStyle = "#c0392b"; g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); const a = Math.PI * (0.75 + 5 * 0.15); g.lineTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); g.stroke();
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  }
  function tagTex() {
    const c = document.createElement("canvas"); c.width = 256; c.height = 160; const g = c.getContext("2d");
    g.fillStyle = "#d63b2f"; g.fillRect(0, 0, 256, 160); g.fillStyle = "#fff"; g.font = "bold 34px Arial"; g.textAlign = "center";
    g.fillText("TESTED", 128, 52); g.font = "bold 26px Arial"; g.fillText("10 BAR / 2 HR", 128, 96); g.fillText("OK", 128, 136);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t;
  }
  function tapeTex() {
    const c = document.createElement("canvas"); c.width = 512; c.height = 32; const g = c.getContext("2d");
    g.fillStyle = "#f2c230"; g.fillRect(0, 0, 512, 32); g.fillStyle = "#222"; g.font = "bold 18px Arial";
    for (let i = 0; i < 4; i++) g.fillText("CAUTION WATER PIPE BELOW", i * 300, 23);
    const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.encoding = T.sRGBEncoding; return t;
  }

  // ---------- scene helpers ----------
  const mat = (o) => new T.MeshStandardMaterial(Object.assign({ roughness: 0.92, metalness: 0 }, o));
  function setup(sky) {
    const scene = new T.Scene(); scene.background = new T.Color(sky || 0xdfe6ec);
    scene.add(new T.HemisphereLight(0xeef3f8, 0x6f665c, 0.75));
    const sun = new T.DirectionalLight(0xfff4e2, 1.0); sun.position.set(-6, 10, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 0.5, far: 40 }); sun.shadow.bias = -0.0004; sun.shadow.radius = 3;
    scene.add(sun);
    return scene;
  }
  function add(scene, geo, m, x, y, z, ry, rx, rz) {
    const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; o.receiveShadow = true; scene.add(o); return o;
  }
  function boxUV(w, h, d, tw, th) {   // a box whose texture is scaled to its real size (tw x th metres per texture)
    const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv, pos = g.attributes.position, nrm = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
      const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
      if (ny > 0.5) uv.setXY(i, px / tw, pz / th); else if (nx > 0.5) uv.setXY(i, pz / tw, py / th); else uv.setXY(i, px / tw, py / th);
    }
    return g;
  }
  function floor(scene, tex) {
    tex.repeat.set(6, 6);
    const f = add(scene, new T.PlaneGeometry(40, 40), mat({ map: tex }), 0, 0, 0, 0, -Math.PI / 2); f.castShadow = false;
  }
  function roof(scene) {
    const r = roofTex(); r.repeat.set(20, 20);
    const m = add(scene, new T.PlaneGeometry(40, 40), mat({ map: r, side: T.DoubleSide, metalness: 0.3, roughness: 0.6 }), 0, 7.5, 0, 0, Math.PI / 2); m.castShadow = false;
    for (let i = -3; i <= 3; i++) add(scene, new T.BoxGeometry(40, 0.35, 0.18), mat({ color: 0x55616b, metalness: 0.4, roughness: 0.5 }), 0, 7.2, i * 4);
  }
  function steelColumn(scene, x, z) {
    const m = mat({ color: 0x4f5c66, metalness: 0.45, roughness: 0.5 });
    add(scene, new T.BoxGeometry(0.3, 7.5, 0.02), m, x, 3.75, z + 0.14); add(scene, new T.BoxGeometry(0.3, 7.5, 0.02), m, x, 3.75, z - 0.14); add(scene, new T.BoxGeometry(0.02, 7.5, 0.28), m, x, 3.75, z);
  }

  // ---------- scenes ----------
  const S = {};
  S.wall = (stage, view) => {
    const scene = setup(); floor(scene, floorTex()); roof(scene);
    const tex = stage === "blockwork" ? blockTex() : stage === "plastered" ? plasterTex() : paintTex();
    const m = mat({ map: tex, roughness: stage === "painted" ? 0.75 : 0.95 });
    const side = mat({ map: blockTex(), roughness: 0.95 });
    if (view === "B") {
      add(scene, boxUV(10, 4.6, 0.23, 4, 2), m, -1, 2.3, -5.2, 0.55);
      add(scene, boxUV(6, 4.6, 0.23, 4, 2), side, 4.6, 2.3, -3.6, -1.0);
      steelColumn(scene, 3.2, -6.2);
    } else {
      add(scene, boxUV(9, 4.6, 0.23, 4, 2), m, 0.6, 2.3, -4.6, -0.22);
      add(scene, boxUV(6, 4.6, 0.23, 4, 2), side, -3.6, 2.3, -2.3, Math.PI / 2 - 0.22);
      steelColumn(scene, -3.9, -5.1);
    }
    // props, so it looks like a site
    if (stage === "blockwork") {
      const bm = mat({ map: blockTex() });
      add(scene, new T.BoxGeometry(1.1, 0.12, 1.1), mat({ color: 0x9a7a52 }), 1.8, 0.06, -2.4);
      for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) add(scene, boxUV(1.0, 0.19, 0.39, 4, 2), bm, 1.8, 0.21 + i * 0.2, -2.6 + k * 0.42);
      add(scene, new T.CylinderGeometry(0.22, 0.18, 0.32, 20), mat({ color: 0x2b2b2b }), -0.6, 0.16, -2.0);
    } else if (stage === "plastered") {
      add(scene, new T.CylinderGeometry(0.2, 0.2, 0.42, 20), mat({ color: 0xe8e8e2 }), 1.6, 0.21, -2.6);
      add(scene, new T.BoxGeometry(1.4, 0.04, 0.5), mat({ color: 0x8c6a45 }), -0.4, 0.9, -3.5, -0.2);
      add(scene, new T.BoxGeometry(0.06, 0.9, 0.06), mat({ color: 0x777777 }), -1.0, 0.45, -3.4); add(scene, new T.BoxGeometry(0.06, 0.9, 0.06), mat({ color: 0x777777 }), 0.2, 0.45, -3.6);
    } else {
      add(scene, new T.CylinderGeometry(0.17, 0.17, 0.36, 20), mat({ color: 0xf5f5f5 }), 1.6, 0.18, -2.7);
      add(scene, new T.CylinderGeometry(0.18, 0.18, 0.02, 20), mat({ color: 0x2f6f73 }), 1.6, 0.37, -2.7);
      add(scene, new T.BoxGeometry(2.2, 0.01, 1.4), mat({ color: 0xd8d2c4, roughness: 1 }), 0.4, 0.006, -3.6, -0.22);
    }
    const cam = new T.PerspectiveCamera(62, 4 / 3, 0.05, 80);
    if (view === "B") { cam.position.set(1.4, 1.55, 1.8); cam.lookAt(-0.6, 1.7, -5.2); } else { cam.position.set(-0.4, 1.55, 2.6); cam.lookAt(0.5, 1.7, -4.6); }
    return { scene, cam };
  };
  S.pipe = (stage) => {
    const scene = setup(0xcfdbe6);
    const soil = soilTex(false); soil.repeat.set(4, 4);
    const sm = mat({ map: soil, roughness: 1 });
    // ground with a trench (0.6 m wide, 0.8 m deep) running away from the camera
    add(scene, new T.BoxGeometry(14, 1, 30), sm, -7.45, -0.5, -8);
    add(scene, new T.BoxGeometry(14, 1, 30), sm, 7.45, -0.5, -8);
    if (stage === "covered") {
      const fresh = soilTex(true); fresh.repeat.set(1, 8);
      add(scene, new T.BoxGeometry(0.9, 1, 30), mat({ map: fresh, roughness: 1 }), 0, -0.47, -8);
      const tp = tapeTex(); tp.repeat.set(12, 1);
      add(scene, new T.PlaneGeometry(0.15, 30), mat({ map: tp, roughness: 0.6 }), 0.05, 0.03, -8, 0, -Math.PI / 2, 0).rotation.z = 0;
      add(scene, new T.BoxGeometry(0.05, 0.9, 0.05), mat({ color: 0xb08a5a }), 0.5, 0.45, -1.6);
      add(scene, new T.BoxGeometry(0.06, 0.12, 0.06), mat({ color: 0x2f5fc4 }), 0.5, 0.95, -1.6);
    } else {
      const sand = sandTex(); sand.repeat.set(1, 10);
      add(scene, new T.BoxGeometry(0.9, 0.12, 30), mat({ map: sand }), 0, -0.84, -8);
      const pipeM = mat({ color: 0x2f5fc4, roughness: 0.4 });
      add(scene, new T.CylinderGeometry(0.09, 0.09, 30, 28), pipeM, 0, -0.69, -8, 0, Math.PI / 2);
      for (let z = -1; z > -20; z -= 3) add(scene, new T.CylinderGeometry(0.105, 0.105, 0.14, 28), pipeM, 0, -0.69, z, 0, Math.PI / 2);
      if (stage === "tested") {
        add(scene, new T.CylinderGeometry(0.035, 0.035, 0.7, 16), mat({ color: 0xb8b8b8, metalness: 0.7, roughness: 0.3 }), 0, -0.4, -1.2);
        const gm = [mat({ color: 0x333333 }), mat({ map: gaugeTex(), roughness: 0.4 }), mat({ color: 0x333333 })];
        add(scene, new T.CylinderGeometry(0.11, 0.11, 0.05, 32), gm, 0, -0.02, -1.2, 0, Math.PI / 2 - 0.5, 0);
        add(scene, new T.PlaneGeometry(0.22, 0.14), mat({ map: tagTex(), side: T.DoubleSide }), 0.2, -0.45, -1.4, -0.3);
      }
    }
    const cam = new T.PerspectiveCamera(60, 4 / 3, 0.05, 80);
    cam.position.set(0.55, 1.45, 0.9); cam.lookAt(0, -0.75, -3.2);
    return { scene, cam };
  };
  S.column = (stage) => {
    const scene = setup(); floor(scene, floorTex()); roof(scene);
    add(scene, boxUV(14, 4.6, 0.23, 4, 2), mat({ map: blockTex() }), 0, 2.3, -9);
    if (stage === "formwork") {
      const pm = mat({ map: plyTex() });
      add(scene, boxUV(0.6, 3.2, 0.6, 0.6, 3.2), pm, 0, 1.6, -3.5);
      for (const y of [0.4, 1.2, 2.0, 2.8]) add(scene, new T.BoxGeometry(0.72, 0.08, 0.72), mat({ color: 0x8a6a3e }), 0, y, -3.5);
      for (const [dx, dz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) add(scene, new T.CylinderGeometry(0.012, 0.012, 1.0, 8), mat({ color: 0x5a3a2a, metalness: 0.5 }), dx, 3.6, -3.5 + dz);
      add(scene, new T.CylinderGeometry(0.03, 0.03, 3.4, 10), mat({ color: 0x9aa3a8, metalness: 0.6, roughness: 0.4 }), 1.1, 1.5, -3.0, 0, 0, 0.55);
      add(scene, new T.CylinderGeometry(0.03, 0.03, 3.4, 10), mat({ color: 0x9aa3a8, metalness: 0.6, roughness: 0.4 }), -1.0, 1.5, -3.2, 0, 0, -0.55);
    } else {
      const cm = mat({ map: concreteTex(stage === "finished"), roughness: stage === "finished" ? 0.7 : 0.95 });
      add(scene, boxUV(0.6, 7.2, 0.6, 0.6, 3.2), cm, 0, 3.6, -3.5);
      if (stage === "poured") { const pm = mat({ map: plyTex() }); add(scene, boxUV(0.6, 2.4, 0.04, 0.6, 3.2), pm, 1.4, 1.15, -3.0, 0.3, 0, -0.12); add(scene, boxUV(0.6, 2.4, 0.04, 0.6, 3.2), pm, 1.6, 1.15, -2.8, 0.2, 0, -0.14); }
      else add(scene, new T.BoxGeometry(0.64, 0.1, 0.64), mat({ color: 0x3d4a54 }), 0, 0.05, -3.5);
    }
    const cam = new T.PerspectiveCamera(60, 4 / 3, 0.05, 80);
    cam.position.set(-0.7, 1.55, 0.4); cam.lookAt(0.05, 1.9, -3.5);
    return { scene, cam };
  };

  let R = null;
  let SEED = 1;
  const rnd = () => { SEED = (SEED * 16807) % 2147483647; return SEED / 2147483647; };
  function handheld(cam, stage) {   // a person never stands in exactly the same spot twice
    SEED = 7 + stage.length * 131 + stage.charCodeAt(0) * 17;
    cam.position.x += (rnd() - 0.5) * 0.5; cam.position.y += (rnd() - 0.5) * 0.12; cam.position.z += (rnd() - 0.5) * 0.4;
    cam.rotation.y += (rnd() - 0.5) * 0.09; cam.rotation.x += (rnd() - 0.5) * 0.05; cam.rotation.z += (rnd() - 0.5) * 0.03;
  }
  window.renderSite = function (kind, stage, view) {
    if (!R) {
      R = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      R.setSize(1600, 1200, false); R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
      R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
      document.body.appendChild(R.domElement);
    }
    const { scene, cam } = S[kind](stage, view);
    handheld(cam, stage);
    scene.traverse((o) => { if (o.isDirectionalLight) { o.position.x += (rnd() - 0.5) * 8; o.intensity *= 0.85 + rnd() * 0.3; } });
    R.render(scene, cam);
    // phone-camera look: grain + slight vignette
    const c = document.createElement("canvas"); c.width = 1600; c.height = 1200; const g = c.getContext("2d");
    g.drawImage(R.domElement, 0, 0);
    const im = g.getImageData(0, 0, 1600, 1200), d = im.data;
    for (let y = 0; y < 1200; y++) for (let x = 0; x < 1600; x++) {
      const i = (y * 1600 + x) * 4, dx = (x - 800) / 800, dy = (y - 600) / 600, vig = 1 - 0.18 * (dx * dx + dy * dy), n = (Math.random() - 0.5) * 9;
      d[i] = d[i] * vig + n; d[i + 1] = d[i + 1] * vig + n; d[i + 2] = d[i + 2] * vig + n;
    }
    g.putImageData(im, 0, 0);
    return c.toDataURL("image/jpeg", 0.86);
  };
})();
