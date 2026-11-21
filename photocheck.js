/* ==========================================================================
   photocheck.js — rule-based checks on a progress photo, all on the phone.
   Nothing here "reads" the stage of the work; it measures the photo so the
   app can tell whether it can be trusted and whether it fits the stage the
   site manager picked:
   - brightness (too dark / washed out)
   - sharpness  (variance of the Laplacian: low = blurry)
   - fingerprints (difference hashes, 64 and 256 bits: near-identical photos match)
   - texture and colour of the middle of the photo (rough block joints vs
     a smooth plastered or painted surface)
   ========================================================================== */
(function () {
  "use strict";

  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  }
  function pixels(im, w, h) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(im, 0, 0, w, h);
    return g.getImageData(0, 0, w, h).data;
  }

  async function analyse(src) {
    const im = await loadImage(src);
    const k = 320 / Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height);
    const w = Math.max(16, Math.round((im.naturalWidth || im.width) * Math.min(1, k)));
    const h = Math.max(16, Math.round((im.naturalHeight || im.height) * Math.min(1, k)));
    const d = pixels(im, w, h);
    const gray = new Float32Array(w * h);
    let lum = 0;
    for (let i = 0; i < w * h; i++) {
      const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      gray[i] = v; lum += v;
    }
    lum /= w * h;

    // sharpness: variance of the Laplacian in each of 8x8 tiles; we keep the sharpest tiles (90th percentile),
    // because a smooth painted wall has little detail even in a sharp photo, but its edges and corners do
    const TX = 8, TY = 8, tiles = [];
    for (let ty = 0; ty < TY; ty++) for (let tx = 0; tx < TX; tx++) {
      let s1 = 0, s2 = 0, n = 0;
      const xa = Math.max(1, Math.floor((tx * w) / TX)), xb = Math.min(w - 1, Math.floor(((tx + 1) * w) / TX));
      const ya = Math.max(1, Math.floor((ty * h) / TY)), yb = Math.min(h - 1, Math.floor(((ty + 1) * h) / TY));
      for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
        const i = y * w + x;
        const L = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
        s1 += L; s2 += L * L; n++;
      }
      if (n) tiles.push(s2 / n - (s1 / n) * (s1 / n));
    }
    tiles.sort((a, b) => a - b);
    const sharp = tiles.length ? tiles[Math.floor(tiles.length * 0.9)] : 0;

    // middle 60% of the photo: texture (average edge strength), lightness, colourfulness
    const x0 = Math.round(w * 0.2), x1 = Math.round(w * 0.8), y0 = Math.round(h * 0.2), y1 = Math.round(h * 0.8);
    let tex = 0, lc = 0, sat = 0, m = 0;
    for (let y = Math.max(1, y0); y < Math.min(h - 1, y1); y++) for (let x = Math.max(1, x0); x < Math.min(w - 1, x1); x++) {
      const i = y * w + x;
      tex += Math.abs(gray[i + 1] - gray[i - 1]) + Math.abs(gray[i + w] - gray[i - w]);
      lc += gray[i];
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      sat += mx ? (mx - mn) / mx : 0;
      m++;
    }
    tex = m ? tex / m : 0; lc = m ? lc / m : 0; sat = m ? sat / m : 0;

    // fingerprint: difference hash on a 9x8 grey thumbnail
    const t = pixels(im, 9, 8);
    let bits = "";
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const a = t[(y * 9 + x) * 4] + t[(y * 9 + x) * 4 + 1] + t[(y * 9 + x) * 4 + 2];
      const b = t[(y * 9 + x + 1) * 4] + t[(y * 9 + x + 1) * 4 + 1] + t[(y * 9 + x + 1) * 4 + 2];
      bits += a < b ? "1" : "0";
    }
    let hash = "";
    for (let i = 0; i < 64; i += 4) hash += parseInt(bits.slice(i, i + 4), 2).toString(16);
    // finer fingerprint: difference hash on a 17x16 thumbnail (256 bits), sees smaller changes such as new paint or a gauge
    const t2 = pixels(im, 17, 16);
    let bits2 = "";
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const a = t2[(y * 17 + x) * 4] + t2[(y * 17 + x) * 4 + 1] + t2[(y * 17 + x) * 4 + 2];
      const b = t2[(y * 17 + x + 1) * 4] + t2[(y * 17 + x + 1) * 4 + 1] + t2[(y * 17 + x + 1) * 4 + 2];
      bits2 += a < b ? "1" : "0";
    }
    let hash2 = "";
    for (let i = 0; i < 256; i += 4) hash2 += parseInt(bits2.slice(i, i + 4), 2).toString(16);

    return { lum: Math.round(lum), sharp: Math.round(sharp), tex: Math.round(tex * 10) / 10, lc: Math.round(lc), sat: Math.round(sat * 100) / 100, hash, hash2, w: im.naturalWidth || im.width, h: im.naturalHeight || im.height };
  }

  // number of different bits between two fingerprints (0 = same photo)
  function hamming(a, b) {
    if (!a || !b || a.length !== b.length) return 64;
    let n = 0;
    for (let i = 0; i < a.length; i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { n += x & 1; x >>= 1; } }
    return n;
  }

  // time the photo was taken, from the JPEG's EXIF data (null if not there)
  function exifDate(buf) {
    try {
      const v = new DataView(buf);
      if (v.getUint16(0) !== 0xFFD8) return null;
      let o = 2;
      while (o < v.byteLength - 4) {
        const mk = v.getUint16(o), len = v.getUint16(o + 2);
        if (mk === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) {
          const t = o + 10, le = v.getUint16(t) === 0x4949;
          const u16 = (p) => v.getUint16(p, le), u32 = (p) => v.getUint32(p, le);
          const readStr = (p, n) => { let s = ""; for (let i = 0; i < n - 1; i++) s += String.fromCharCode(v.getUint8(p + i)); return s; };
          const ifd = (p, want) => {
            const n = u16(p);
            for (let i = 0; i < n; i++) {
              const e = p + 2 + i * 12, tag = u16(e);
              if (want.indexOf(tag) >= 0) return { tag, val: u32(e + 8), count: u32(e + 4) };
            }
            return null;
          };
          const ifd0 = t + u32(t + 4);
          const sub = ifd(ifd0, [0x8769]);
          const dt = (sub && ifd(t + sub.val, [0x9003, 0x9004])) || ifd(ifd0, [0x0132]);
          if (!dt) return null;
          const s = readStr(t + dt.val, dt.count);   // "YYYY:MM:DD HH:MM:SS"
          const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(s);
          return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
        }
        if ((mk & 0xFF00) !== 0xFF00) break;
        o += 2 + len;
      }
    } catch (e) { /* not readable */ }
    return null;
  }

  window.PhotoCheck = { analyse, hamming, exifDate };
})();
