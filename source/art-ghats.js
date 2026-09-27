/* ── shared outside pieces ────────────────────────────────────────────────── */
function skyC(hy, alts, cs) { return rampC(alts.map(a => hy - a).reverse(), cs.slice().reverse()); }

/* Overhead-equipment masts of the electrified line, the nearest thing outside.
   p > 1: closer than the track bed; smeared by their own speed. */
function masts(s, D, V, cov, o = {}) {
  const p = o.p || 1.25, N = Math.max(1, Math.round(D / (o.spacing || 1300)));
  const m = mask(0), d = V * p / 30 * 0.55, pos = [];
  visit('mast', N, D, s, p, 120, (k, x) => pos.push(x));
  if (!pos.length) return;
  const top = A[1] + LOUVRE - 10;
  smear(m, d, g => {
    for (const x of pos) {
      g.fillRect(x - 13, top, 26, W - top);                     // H-beam
      g.fillRect(x - 17, 604, 34, 7);                            // bracket bands
      g.fillRect(x - 17, 420, 34, 6);
      g.beginPath(); g.moveTo(x + 12, 250); g.lineTo(x + 150, 214); g.lineTo(x + 150, 222); g.lineTo(x + 12, 262); g.fill();  // cantilever
      g.beginPath(); g.moveTo(x + 12, 330); g.lineTo(x + 120, 222); g.lineTo(x + 126, 226); g.lineTo(x + 16, 338); g.fill();  // stay
    }
  });
  putM(m, cov);
  if (o.edge) {                                     // lit flange edge
    const m2 = mask(1);
    smear(m2, d, g => { for (const x of pos) g.fillRect(x - 13, top, 3.5, W - top); });
    const c = m2.canvas;
    for (const n of PL) { const g = PG[n]; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = o.edge; g.drawImage(c, 0, 0); g.restore(); }
  }
}

/* Canopy row on the ground plane at parallax p: lumpy crowns, lit rims. */
function canopyRow(key, s, D, p, top, amp, cov, rimCov, o = {}) {
  const f = pridge(key, D, o.comps || [[40, .5], [97, .35], [173, .3], [311, .2], [520, .12]]);
  const fn = x => { const X = s + (x - 540) / p; const v = f(X); return amp * (0.55 + 0.45 * Math.abs(v) + 0.25 * v); };
  const path = skylinePath(fn, top, W + 20, -20, W + 20, o.dx || 5);
  if (o.smear) {
    const m = mask(1); smear(m, o.smear, g => g.fill(path)); putM(m, cov);
  } else put(path, cov);
  if (rimCov) {
    const rim = new Path2D();
    for (let x = -20; x <= W + 20; x += 5) { const y = top - fn(x); x === -20 ? rim.moveTo(x, y) : rim.lineTo(x, y); }
    strokeCov(rim, o.rimW || 5, rimCov);
  }
  return fn;
}

/* Rain: slanting streaks, periodic in the loop (integer passes per loop). */
function rain(tl, V, n, a, o = {}) {
  const r = rngFor('rain:' + (o.key || '')), H = W + 160, Wd = W + 400, path = new Path2D();
  const vy = Math.round(62 * H / L / H * 1) * H / L * (o.fall || 1);             // ~62 passes per loop
  const kx = Math.round((V * 0.25) * L / Wd) || 1, vx = kx * Wd / L;
  for (let i = 0; i < n; i++) {
    const y0 = r() * H, x0 = r() * Wd, len = 14 + r() * 26, dep = .5 + r() * .5;
    const y = ((y0 + vy * dep * tl) % H + H) % H - 80;
    const vyy = vy * dep; // dep changes speed; keep integer passes per loop
    const passes = Math.max(1, Math.round(vyy * L / H)), yy = ((y0 + passes * H / L * tl) % H) - 80;
    const x = ((x0 - vx * tl) % Wd + Wd) % Wd - 200;
    const sl = vx / (passes * H / L);
    path.moveTo(x, yy); path.lineTo(x - len * sl, yy - len);
  }
  strokeKnock(path, o.w || 1.3, a);
  if (o.dark) strokeCov(path, .8, o.dark);
}

/* Tree crowns along a ground row at parallax p: each crown a cluster of
   lobes, tops lightened, filled down to the frame bottom so rows never gap. */
function crowns(key, s, D, p, baseY, size, N, cov, o = {}) {
  const body = new Path2D(), tops = new Path2D();
  body.rect(-20, baseY, W + 40, W - baseY + 20);
  visit(key, N, D, s, p, size * 2, (k, x) => {
    const r = rngFor(key + ':' + k), sz = size * (0.7 + r() * 0.6), h = sz * (0.8 + r() * 0.5), n = 3 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) {
      const ox = (r() - .5) * sz * 1.3, oy = -h * (0.35 + r() * .5), rx = sz * (0.45 + r() * .35), ry = rx * (0.75 + r() * .2);
      body.moveTo(x + ox + rx, baseY + oy); body.ellipse(x + ox, baseY + oy, rx, ry, 0, 0, TAU);
      if (o.top) { tops.moveTo(x + ox - rx * .15 + rx * .55, baseY + oy - ry * .35); tops.ellipse(x + ox - rx * .15, baseY + oy - ry * .35, rx * .55, ry * .4, 0, 0, TAU); }
    }
    if (o.trunk) body.rect(x - sz * .05, baseY - h * .2, sz * .1, h * .4);
  });
  if (o.smear) { const m = mask(1); smear(m, o.smear, g => g.fill(body)); putM(m, cov); }
  else put(body, cov);
  if (o.top) {
    if (o.smear) { const m = mask(2); smear(m, o.smear, g => g.fill(tops)); const c = m.canvas; for (const n in o.top) { const g = PG[n]; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = o.top[n] < 0 ? 'destination-out' : 'source-over'; g.globalAlpha = Math.abs(o.top[n]); g.drawImage(c, 0, 0); g.restore(); } }
    else for (const n in o.top) { const g = PG[n]; g.globalCompositeOperation = o.top[n] < 0 ? 'destination-out' : 'source-over'; g.globalAlpha = Math.abs(o.top[n]); g.fillStyle = '#000'; g.fill(tops); g.globalAlpha = 1; }
  }
}

/* A crisp cloud or mist bank: scalloped top, soft-free, drifting whole
   periods per loop. Knocked toward paper so it reads as light. */
function bank(tl, key, y, h, bump, cycles, a, o = {}) {
  const Pc = o.period || 2400, off = fract(tl * cycles / L) * Pc * (o.dir || 1);
  const f = x => { const u = (x + off) / Pc; let v = 0; for (let k = 1; k <= 3; k++) v += Math.sin(TAU * (u * [3, 7, 13][k - 1]) + h01(key + k) * TAU) / k; return v; };
  const top = x => y - h * (.55 + .45 * f(x)) - (o.bumpH || 7) * Math.pow(Math.abs(Math.sin(Math.PI * (x + off) / bump)), .5);
  const p = new Path2D(); p.moveTo(-20, y + (o.depth || 30));
  for (let x = -20; x <= W + 20; x += 4) p.lineTo(x, top(x));
  p.lineTo(W + 20, y + (o.depth || 30)); p.closePath();
  if (o.cov) put(p, o.cov); else knock(p, KALL(a));
  if (o.floor) knock(rect(-20, y + (o.depth || 30) - 1, W + 40, 2), KALL(0));
  return top;
}

/* ── Passage 4: the Western Ghats in the afternoon rains ────────────────────
   Across a deep valley: a flat-topped basalt scarp, its black cliff band under
   the lip, forest tiers below, threads of water after the rains and one big
   falls; a mist bank lies in the valley; rain across everything.            */
function viewGhats(tl, P) {
  const hy = P.hy, s = P.V * tl, D = P.V * L;
  put(rect(0, 0, W, hy + 60), skyC(hy, [0, 140, 300, 440], [C(.03, .05, 0, .06, 0), C(0, .05, 0, .12, .02), C(0, .07, 0, .22, .07), C(0, .08, 0, .3, .12)]));
  // heavy cloud: crisp dark masses with paler bellies
  bank(tl, 'gk1', hy - 330, 50, 90, 1, 0, { cov: C(0, .08, 0, .28, .16), depth: 400, period: 2600, dir: -1 });
  bank(tl, 'gk2', hy - 250, 30, 70, 2, 0, { cov: C(0, .06, 0, .18, .08), depth: 30, period: 2200, dir: -1 });
  rainShafts(tl, hy);
  // far plateau at infinity
  const far = sridge('pp:gfar', [[1300, 12], [520, 5], [180, 2]]);
  const farAlt = x => 172 + far(x) - (x > 760 ? 22 * sm((x - 760) / 60) : 0);
  put(skylinePath(farAlt, hy, hy + 80), C(.03, .12, .04, .24, .07));
  put((() => { const b = new Path2D(); for (let x = -20; x < W + 20; x += 4) b.rect(x, hy - farAlt(x) + 4, 4.2, 12 + 4 * Math.sin(x * .031)); return b; })(), C(.02, .14, .02, .32, .14));
  strokeKnock(skylineStroke(farAlt, hy, 1), 1.8, .6);
  // the scarp (p = .065)
  const pR = 0.065, R = pridge('pp:grange', D, [[1, 12], [2, 9], [3, 7], [5, 5], [9, 3], [17, 1.5]]);
  const notch = pridge('pp:gnotch', D, [[4, 1], [7, .7], [11, .5]]);
  const WX = x => s + (x - 540) / pR;
  const alt = x => { const X = WX(x); return 142 + R(X) - 30 * sm((notch(X) - .9) / .5); };
  const band1 = x => 26 + 14 * Math.abs(Math.sin(WX(x) * TAU * 23 / D));
  const alt2 = x => { const X = WX(x); return 78 + 8 * Math.sin(X * TAU * 13 / D + 1) + 5 * Math.sin(X * TAU * 31 / D); };
  const base = hy + 84;
  const rangeP = skylinePath(alt, hy, base + 60, -20, W + 20, 3);
  put(rangeP, C(.05, .12, .04, .44, .36));
  const scal = (aFn, bump, h) => x => { const X = WX(x), b = bump / pR; return aFn(x) - h * Math.pow(Math.abs(Math.sin(Math.PI * X / b)), .6); };
  withClip(rangeP, () => {
    const streak = new Path2D();
    for (let k = -1; k < 140; k++) {
      const X = Math.floor((s - 560 / pR) / 130) * 130 + k * 130, id = Math.round(X / 130);
      const x = 540 + (X - s) * pR + (h01('hs' + id) - .5) * 8;
      if (x > W + 20) break;
      const y0 = hy - alt(x) + 6;
      streak.moveTo(x, y0); streak.lineTo(x + .8, y0 + band1(x) * (.5 + h01('hl' + id) * .5));
    }
    strokeCov(streak, 1.6, C(0, .03, 0, .1, .1));
    const t1 = scal(x => alt(x) - band1(x), 34, 10);
    put(skylinePath(t1, hy, base + 60, -20, W + 20, 3), C(.3, .02, .56, .24, .06));
    strokeCov(skylineStroke(t1, hy, 1.4), 2.6, C(.46, 0, .2, 0, 0));
    const outc = new Path2D();
    for (let x = -20; x < W + 20; x += 3) {
      const X = WX(x), on = Math.sin(X * TAU * 9 / D + 2) + .5 * Math.sin(X * TAU * 29 / D);
      if (on > -.1) outc.rect(x, hy - alt2(x) - 4, 3.3, 8 + 16 * clamp(on + .1, 0, 1));
    }
    put(outc, C(.04, .12, .03, .44, .36));
    const t2 = scal(x => alt2(x) - 16, 26, 8);
    put(skylinePath(t2, hy, base + 60, -20, W + 20, 3), C(.14, .03, .64, .48, .22));
    strokeCov(skylineStroke(t2, hy, 1.4), 2.2, C(.34, 0, .16, 0, 0));
    // gullies: darker clefts down the lower slope, and crown tops catching light
    visit('pp:gully', 9, D, s, pR, 60, (k, x) => {
      const top = hy - alt2(x) + 10, w = 10 + h01('gw' + k) * 14;
      const g = new Path2D(); g.moveTo(x - w * .25, top); g.quadraticCurveTo(x - w * .1, top + 60, x - w, base + 40); g.lineTo(x + w, base + 40); g.quadraticCurveTo(x + w * .2, top + 60, x + w * .25, top); g.closePath();
      add(g, C(0, .03, .08, .16, .12));
    });
    const lt = new Path2D();
    for (let k = -1; k < 300; k++) {
      const X = Math.floor((s - 560 / pR) / 60) * 60 + k * 60, id = Math.round(X / 60), x = 540 + (X - s) * pR;
      if (x > W + 20) break;
      for (let j = 0; j < 3; j++) {
        const y = hy - alt2(x) + 14 + h01('ly' + id + j) * (alt2(x) - 10), r = 3 + h01('lr' + id + j) * 3, xx = x + j * 1.3;
        lt.moveTo(xx - r, y); lt.quadraticCurveTo(xx, y - r * 1.1, xx + r, y);
      }
    }
    strokeCov(lt, 1.8, C(.34, 0, .12, 0, 0));
    const t3 = scal(x => 30 + 6 * Math.sin(WX(x) * TAU * 7 / D), 20, 6);
    put(skylinePath(t3, hy, base + 60, -20, W + 20, 3), C(.22, .03, .58, .34, .1));
    strokeCov(skylineStroke(t3, hy, 1.4), 2, C(.36, 0, .14, 0, 0));
  });
  // threads of water and the big falls
  visit('pp:thread', 16, D, s, pR, 40, (k, x) => {
    if (h01('thr' + k) < .15) return;
    const top = hy - alt(x) + 2, len = (alt(x) - 10) * (.55 + h01('tl' + k) * .45), wv = 2 + h01('tw' + k) * 1.8;
    const pts = []; let xx = x;
    for (let y = top; y <= top + len; y += 14) { pts.push([xx, y]); xx += (h01('tj' + k + ':' + Math.round(y)) - .45) * 2.2; }
    if (pts.length < 2) return;
    knock(nib(pts, u => wv * (1 - .4 * u), { per: 3 }), KALL(.95));
    const sp = 18, vv = Math.round(160 * L / sp) * sp / L, dash = new Path2D();
    for (let y = top + ((vv * tl + h01('td' + k) * sp) % sp); y < top + len - 6; y += sp) { const i = clamp(Math.floor((y - top) / 14), 0, pts.length - 1); dash.moveTo(pts[i][0], y); dash.lineTo(pts[i][0], y + 6); }
    strokeCov(dash, 1, C(0, 0, 0, .28, .12));
  });
  falls(tl, s, D, pR, hy, alt, band1, alt2, 0.37, 13, 'f1');
  // valley floor and the mist bank lying on it
  const pF = 0.12, vf = new Path2D(); vf.rect(0, hy + 90, W, 150);
  put(vf, rampC([hy + 90, hy + 240], [C(.24, .03, .3, .1, .02), C(.3, .04, .46, .22, .06)]));
  const riv = new Path2D(), rv = pridge('pp:griver', D, [[3, 6], [7, 4], [17, 2]]);
  for (let x = -20; x <= W + 20; x += 6) { const y = hy + 118 + rv(s + (x - 540) / pF); x === -20 ? riv.moveTo(x, y) : riv.lineTo(x, y); }
  strokeKnock(riv, 4, .95);
  bank(tl, 'gmist', hy + 96, 16, 60, 1, .88, { depth: 14, period: 2000 });
  bank(tl, 'gmist2', hy - 60, 10, 50, 2, .7, { depth: 8, period: 1800, bumpH: 5 });
  // the slope below the track, three rows of crowns, nearest smeared
  crowns('pp:gt1', s, D, 0.3, hy + 148, 20, Math.round(D / 150), C(.16, .04, .58, .44, .2), { top: { yellow: .3, blue: -.25, indigo: -.15 } });
  crowns('pp:gt2', s, D, 0.58, hy + 205, 34, Math.round(D / 170), C(.12, .05, .64, .54, .3), { top: { yellow: .28, blue: -.3, indigo: -.2 }, smear: P.V * .58 / 30 * .5 });
  crowns('pp:gt3', s, D, 1.0, hy + 300, 56, Math.round(D / 200), C(.08, .06, .62, .6, .42), { top: { yellow: .2, blue: -.3, indigo: -.25 }, smear: P.V / 30 * .55 });
  masts(s, D, P.V, C(.16, .16, .02, .3, .26), { edge: .5 });
  rain(tl, P.V, 170, .45, { key: 'g' });
}
function skylineStroke(fn, hy, dy) { const p = new Path2D(); for (let x = -20; x <= W + 20; x += 4) { const y = hy - fn(x) + dy; x === -20 ? p.moveTo(x, y) : p.lineTo(x, y); } return p; }
function rainShafts(tl, hy) {
  const Pc = 2200, off = fract(tl * 1 / L) * Pc, r = rngFor('pp:shaft');
  for (let i = 0; i < 4; i++) {
    const cx = r() * Pc, w = 60 + r() * 120;
    for (const m of [-1, 0, 1]) {
      const x = ((cx - off) % Pc + Pc) % Pc - 500 + m * Pc;
      if (x + w < 0 || x - w > W) continue;
      const p = new Path2D();
      for (let k = 0; k < 26; k++) { const xx = x - w + k * w * 2 / 26 + (r() - .5) * 6; p.moveTo(xx, hy - 300); p.lineTo(xx - 22, hy - 150 - r() * 30); }
      const g = rampC([hy - 300, hy - 140], [C(0, .05, 0, .2, .12), KALL(0)]);
      for (const n of ['pink', 'blue', 'indigo']) { const G = PG[n]; G.globalCompositeOperation = 'source-over'; G.lineWidth = 2.2; G.strokeStyle = style(G, g[n]); G.stroke(p); G.strokeStyle = '#000'; }
    }
  }
}

function cloudBands(tl, hy, bands) {
  for (const b of bands) {
    const Pc = W + 900, off = fract(tl * b.wind / L) * Pc, r = rngFor('pp:' + b.key), path = new Path2D();
    for (let i = 0; i < 7; i++) {
      const cx = r() * Pc, w = 180 + r() * 320, h = b.h * (.6 + r() * .6), y = b.y + (r() - .5) * b.h;
      for (const m of [-1, 0, 1]) {
        const x = ((cx - off) % Pc + Pc) % Pc - 450 + m * Pc;
        if (x + w < -40 || x - w > W + 40) continue;
        path.moveTo(x + w, y); path.ellipse(x, y, w, h, 0, 0, TAU);
      }
    }
    add(path, b.cov);
  }
}

function valleyCloud(tl, hy) {
  const Pc = 1500, off = fract(tl * 1 / L) * Pc, r = rngFor('pp:vcl');
  for (let i = 0; i < 9; i++) {
    const cx = r() * Pc, w = 90 + r() * 200, h = 16 + r() * 26, y = hy + 40 + r() * 60 - (r() < .35 ? 110 + r() * 60 : 0);
    for (const m of [-1, 0, 1]) {
      const x = ((cx + off) % Pc + Pc) % Pc - 200 + m * Pc;
      if (x + w * 1.4 < 0 || x - w * 1.4 > W) continue;
      for (const n of PL) {
        const g = PG[n]; g.save(); g.translate(x, y); g.scale(1, h / w);
        g.globalCompositeOperation = 'destination-out';
        g.fillStyle = radial(g, 0, 0, w * .15, w * 1.2, .72, 0); g.fillRect(-w * 1.3, -w * 1.3, w * 2.6, w * 2.6);
        g.restore();
      }
    }
  }
}

/* A falls from the scarp's lip, over both cliff bands, into the valley cloud. */
function falls(tl, s, D, pR, hy, alt, band1, alt2, frac, wid, key) {
  const X = frac * D;
  let x0 = null;
  for (const m of [-1, 0, 1]) { const x = 540 + (X + m * D - s) * pR; if (x > -100 && x < W + 100) x0 = x; }
  if (x0 === null) return;
  const top = hy - alt(x0) - 2, b1 = top + band1(x0), y2 = hy - alt2(x0), bot = hy + 92;
  // free fall down the upper cliff, a skip on the bench, then down the slope
  const pts = [[x0, top], [x0 + 1, top + (b1 - top) * .5], [x0 + 3, b1], [x0 + 9, b1 + 12], [x0 + 12, (b1 + y2) / 2], [x0 + 10, y2], [x0 + 14, y2 + 18], [x0 + 16, (y2 + bot) / 2], [x0 + 18, bot]];
  const w = u => wid * (u < .22 ? 0.35 + u * 1.4 : 0.55 + 0.7 * u) * (1 + 0.14 * Math.sin(u * 19 + 1));
  const rib = nib(pts, w, { per: 6 });
  knock(rib, KALL(1));
  add(rib, { blue: { x0: x0 - wid, y0: 0, x1: x0 + wid * 2, y1: 0, at: [0, .55, 1], as: [0, .05, .2] } });
  const lanes = new Path2D(), sp = 22, vv = Math.round(170 * L / sp) * sp / L, c = curve(pts, false, 6);
  const at = y => { for (let i = 1; i < c.length; i++) if (c[i][1] >= y) { const u = (y - c[i - 1][1]) / Math.max(1e-6, c[i][1] - c[i - 1][1]); return lerp(c[i - 1][0], c[i][0], u); } return c[c.length - 1][0]; };
  for (let j = 0; j < 5; j++) {
    const off = h01(key + 'ln' + j) * sp;
    for (let y = top - sp + ((vv * tl + off) % sp); y < bot - 8; y += sp) {
      if (y < top) continue;
      const u = (y - top) / (bot - top), cx = at(y) + (j / 4 - .5) * w(u) * 1.2;
      lanes.moveTo(cx, y); lanes.lineTo(cx + .5, y + 7 + 6 * u);
    }
  }
  strokeCov(lanes, 1.2, C(0, 0, 0, .28, .1));
  for (const [yy, rr] of [[b1 + 8, 22], [y2 + 12, 30], [bot - 4, 70]]) {
    const br = 0.85 + 0.15 * Math.sin(lw(3) * tl + h01(key + yy) * TAU);
    glowC(at(yy) + 4, yy, 3, rr * br, KALL(.7), 'destination-out');
  }
}
