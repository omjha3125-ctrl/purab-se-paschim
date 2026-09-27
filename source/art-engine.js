/* ── Purab se Paschim ─────────────────────────────────────────────────────────
   One day across India through one sleeper-class window, dawn in Assam to
   night past Pune. Twenty minutes built from six seamless 60 s loops joined by
   five covered transitions (see FILM.md).

   Live plates (Window Seat / Passenger compositor): each frame draws continuous
   coverage into five plate canvases; compose() screens them per pixel against
   page-pinned threshold tables and multiplies onto paper.

   LOOP RULE: inside a passage every function of time reads the loop clock tl
   (0..L). World content is periodic in world X with period D = V·L, so every
   depth plane wraps at the same instant; oscillations have integer cycles per
   loop; anything that travels on its own is off-screen at tl = 0 and tl = L. */

const PL = ['yellow', 'pink', 'green', 'blue', 'indigo'];
const PG = {};
for (const n of PL) PG[n] = cv(W, W).getContext('2d', { willReadFrequently: true });
const MK = [0, 1, 2].map(() => cv(W, W).getContext('2d', { willReadFrequently: true }));

const THR = {};
function buildThr(n) {
  const sc = screenOf(n), S = sc.S, t = new Uint8Array(W * W), r = rngFor('thr:' + n);
  const R = 16, R2 = R + 2, nz = new Float32Array(R2 * R2);
  for (let i = 0; i < nz.length; i++) nz[i] = r() * 2 - 1;
  for (let y = 0; y < W; y++) {
    const fy = y / W * R, iy = fy | 0, vy = fy - iy, row = (y % S) * S;
    for (let x = 0; x < W; x++) {
      const fx = x / W * R, ix = fx | 0, vx = fx - ix, k = iy * R2 + ix;
      const m = (nz[k] * (1 - vx) + nz[k + 1] * vx) * (1 - vy) + (nz[k + R2] * (1 - vx) + nz[k + R2 + 1] * vx) * vy;
      t[y * W + x] = clamp(Math.round(sc.th[row + x % S] * 236 + 7 + m * 7 + (r() - 0.5) * 22), 2, 250);
    }
  }
  const flecks = Math.round(W * W / 650);
  for (let i = 0; i < flecks; i++) {
    const cx = r() * W, cy = r() * W, rad = 0.5 + r() * r() * 2.6, rr = rad * rad;
    for (let y = Math.max(0, Math.floor(cy - rad)); y <= Math.min(W - 1, Math.ceil(cy + rad)); y++)
      for (let x = Math.max(0, Math.floor(cx - rad)); x <= Math.min(W - 1, Math.ceil(cx + rad)); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= rr) t[y * W + x] = 255;
  }
  return t;
}
const INKM = PL.map(n => [1, 3, 5].map(i => parseInt(INK[n].substr(i, 2), 16) / 255));
const OFF = PL.map(n => REG[n].map(Math.round));
let paperPx = null, frame = null;
function compose() {
  if (!paperPx) {
    paperPx = paper.getContext('2d').getImageData(0, 0, W, W).data;
    frame = ctx.createImageData(W, W);
    for (const n of PL) THR[n] = buildThr(n);
  }
  const o = frame.data;
  o.set(paperPx);
  for (let k = 0; k < PL.length; k++) {
    const a = PG[PL[k]].getImageData(0, 0, W, W).data, th = THR[PL[k]];
    const [mr, mg, mb] = INKM[k], [dx, dy] = OFF[k];
    const x0 = Math.max(0, dx), x1 = Math.min(W, W + dx);
    for (let y = Math.max(0, dy); y < Math.min(W, W + dy); y++) {
      let j = (y - dy) * W + x0 - dx, i = (y * W + x0) * 4;
      for (let x = x0; x < x1; x++, j++, i += 4) {
        if (a[j * 4 + 3] > th[j]) { o[i] *= mr; o[i + 1] *= mg; o[i + 2] *= mb; }
      }
    }
  }
  ctx.putImageData(frame, 0, 0);
}

/* ── plate drawing ── put owns the value, add overprints, knock clears ── */
function resetPlates() {
  for (const g of [...PL.map(n => PG[n]), ...MK]) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, W);
    g.fillStyle = g.strokeStyle = '#000'; g.lineCap = g.lineJoin = 'round';
  }
}
const setAll = (a, b, c, d, e, f) => { for (const n of PL) PG[n].setTransform(a, b, c, d, e, f); };
function style(g, c) {
  if (typeof c === 'number') { g.globalAlpha = clamp(c, 0, 1); return '#000'; }
  g.globalAlpha = 1;
  const gr = c.x0 !== undefined ? g.createLinearGradient(c.x0, c.y0, c.x1, c.y1)
    : g.createLinearGradient(0, c.ys[0], 0, c.ys[c.ys.length - 1]);
  const at = c.at || c.ys.map(y => (y - c.ys[0]) / (c.ys[c.ys.length - 1] - c.ys[0]));
  at.forEach((u, i) => gr.addColorStop(clamp(u, 0, 1), 'rgba(0,0,0,' + clamp(c.as[i], 0, 1) + ')'));
  return gr;
}
function put(path, cov, rule) {
  for (const n of PL) {
    const g = PG[n];
    g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1; g.fillStyle = '#000';
    g.fill(path, rule || 'nonzero');
    const c = cov[n];
    if (c) { g.globalCompositeOperation = 'lighter'; g.fillStyle = style(g, c); g.fill(path, rule || 'nonzero'); }
  }
}
function add(path, cov, rule) {
  for (const n in cov) {
    const g = PG[n], c = cov[n];
    if (!c) continue;
    g.globalCompositeOperation = 'source-over'; g.fillStyle = style(g, c); g.fill(path, rule || 'nonzero');
  }
}
function knock(path, cov, rule) {
  for (const n in cov) {
    const g = PG[n];
    if (!cov[n]) continue;
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = style(g, cov[n]); g.fill(path, rule || 'nonzero');
  }
}
const KALL = a => ({ yellow: a, pink: a, green: a, blue: a, indigo: a });
function strokeOn(n, path, w, a, op) {
  const g = PG[n];
  g.globalCompositeOperation = op || 'source-over'; g.globalAlpha = clamp(a, 0, 1); g.lineWidth = w; g.strokeStyle = '#000';
  g.stroke(path); g.globalAlpha = 1;
}
function strokeCov(path, w, cov) { for (const n in cov) if (cov[n]) strokeOn(n, path, w, cov[n]); }
function strokeKnock(path, w, a) { for (const n of PL) strokeOn(n, path, w, a, 'destination-out'); }
function radial(g, x, y, r0, r1, a0, a1) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  gr.addColorStop(0, 'rgba(0,0,0,' + a0 + ')'); gr.addColorStop(1, 'rgba(0,0,0,' + a1 + ')');
  return gr;
}
function glow(n, x, y, r0, r1, a, op) {
  const g = PG[n];
  g.globalCompositeOperation = op || 'source-over'; g.globalAlpha = 1;
  g.fillStyle = radial(g, x, y, r0, r1, clamp(a, 0, 1), 0);
  g.fillRect(x - r1, y - r1, r1 * 2, r1 * 2);
}
function glowC(x, y, r0, r1, cov, op) { for (const n in cov) if (cov[n]) glow(n, x, y, r0, r1, cov[n], op); }
function mask(i) {
  const g = MK[i];
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.clearRect(0, 0, W, W); g.fillStyle = g.strokeStyle = '#000';
  return g;
}
function smear(m, d, draw) {
  const n = clamp(Math.ceil(Math.abs(d) / 3), 1, 12);
  m.globalCompositeOperation = 'lighter'; m.globalAlpha = 1 / n;
  for (let i = 0; i < n; i++) { m.save(); m.translate(n > 1 ? d * (i / (n - 1) - 0.5) : 0, 0); draw(m); m.restore(); }
  m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1;
}
function putM(m, cov) {
  const c = m.canvas;
  for (const n of PL) {
    const g = PG[n];
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out'; g.drawImage(c, 0, 0);
    const a = cov[n];
    if (a) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = clamp(a, 0, 1); g.drawImage(c, 0, 0); }
    g.restore();
  }
}
function withClip(path, fn) {
  for (const n of PL) { PG[n].save(); PG[n].clip(path); }
  fn();
  for (const n of PL) PG[n].restore();
}
const C = (y = 0, p = 0, g = 0, b = 0, i = 0) => ({ yellow: y, pink: p, green: g, blue: b, indigo: i });
function mixC(a, b, u) { const o = {}; for (const n of PL) o[n] = lerp(a[n] || 0, b[n] || 0, u); return o; }
function scaleC(a, k) { const o = {}; for (const n of PL) o[n] = clamp((a[n] || 0) * k, 0, 1); return o; }
function sumC(a, b) { const o = {}; for (const n of PL) o[n] = clamp((a[n] || 0) + (b[n] || 0), 0, 1); return o; }
/** Vertical ramp: ys top→bottom and one C per stop. */
function rampC(ys, cs) { const o = {}; for (const n of PL) o[n] = { x0: 0, y0: ys[0], x1: 0, y1: ys[ys.length - 1], at: ys.map(y => (y - ys[0]) / (ys[ys.length - 1] - ys[0])), as: cs.map(c => c[n] || 0) }; return o; }
function poly(pts) { const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; }
function pline(pts) { const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); return p; }
function rect(x, y, w, h) { const p = new Path2D(); p.rect(x, y, w, h); return p; }
function rrect(x0, y0, x1, y1, r, p) {
  p = p || new Path2D();
  p.moveTo(x0 + r, y0); p.arcTo(x1, y0, x1, y1, r); p.arcTo(x1, y1, x0, y1, r);
  p.arcTo(x0, y1, x0, y0, r); p.arcTo(x0, y0, x1, y0, r); p.closePath();
  return p;
}
const fract = x => x - Math.floor(x);
const sm = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const h01 = k => mulberry32(hash(k))();
const life01 = (v, e) => sm(v / e) * sm((1 - v) / e);

/* ── loop and program clocks ──────────────────────────────────────────────── */
const L = 60, TR = 12;
const lw = k => TAU * k / L;                      // k cycles per loop
function lwave(key, tl, kmin, kmax, n) {
  const r = rngFor(key); let v = 0;
  for (let j = 0; j < n; j++) { const k = kmin + Math.floor(r() * (kmax - kmin + 1)); v += Math.sin(lw(k) * tl + r() * TAU); }
  return v / n;
}
/** Seeded objects spread over world period D at parallax p; fn(k, x, X). */
function visit(key, N, D, s, p, margin, fn) {
  const X0 = s + (-margin - 540) / p, X1 = s + (W + margin - 540) / p;
  for (let k = 0; k < N; k++) {
    const base = (k + h01(key + ':' + k) * 0.85) * D / N;
    for (let X = base + Math.ceil((X0 - base) / D) * D; X <= X1; X += D) fn(k, 540 + (X - s) * p, X);
  }
}
/** Periodic ridge in world X with period D: comps [[cycles per D, amp]]. */
function pridge(key, D, comps) {
  const r = rngFor(key), cs = comps.map(([k, a]) => [TAU * k / D, a, r() * TAU]);
  return X => cs.reduce((s, [w, a, ph]) => s + a * Math.sin(w * X + ph), 0);
}
/** Static screen-space ridge (for layers at infinity). */
function sridge(key, comps) {
  const r = rngFor(key), cs = comps.map(([wl, a]) => [TAU / wl, a, r() * TAU]);
  return x => cs.reduce((s, [w, a, ph]) => s + a * Math.sin(w * x + ph), 0);
}
/** Terrace a profile: flat benches and short steep cliffs (Deccan trap). */
function terrace(v, step, sharp) { const q = v / step, f = fract(q); return (Math.floor(q) + Math.pow(sm(f), sharp || 4)) * step; }
function skylinePath(fn, hy, floorY, x0, x1, dx) {
  const p = new Path2D(); x0 = x0 === undefined ? -20 : x0; x1 = x1 === undefined ? W + 20 : x1; dx = dx || 4;
  p.moveTo(x0, floorY);
  for (let x = x0; x <= x1; x += dx) p.lineTo(x, hy - fn(x));
  p.lineTo(x1, floorY); p.closePath();
  return p;
}
/** Rail joints: a pair of knocks every 0.6 s (100 per loop). */
function knockAt(tl) {
  const v = fract(tl / 0.6), a = Math.exp(-v * 0.6 / 0.07), b = v > 0.2 ? Math.exp(-(v - 0.2) * 0.6 / 0.07) : 0;
  return (a + 0.8 * b);
}
