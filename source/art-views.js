/* ── shared pieces for the other passages ─────────────────────────────────── */
function sunDisc(x, y, r, core, glowR, glowCov) {
  if (glowR) { glowC(x, y, r, glowR, KALL(.75), 'destination-out'); if (glowCov) glowC(x, y, r * .8, glowR * .8, glowCov); }
  const d = cut(ringPts(x, y, r, r, 16), rngFor('pp:sun' + Math.round(x)), { amp: 1 });
  knock(d, KALL(1)); if (core) add(d, core);
}
/** A flock crossing within [t0, t1] of the loop, off-screen at both ends. */
function flock(tl, key, t0, t1, x0, x1, y, n, size, cov, o = {}) {
  if (tl < t0 || tl > t1) return;
  const u = (tl - t0) / (t1 - t0), cx = lerp(x0, x1, u), r = rngFor('pp:fl' + key), path = new Path2D();
  for (let i = 0; i < n; i++) {
    const ox = o.vee ? Math.abs(i - n / 2) * size * 2.6 : r() * size * 18, oy = o.vee ? (i - n / 2) * size * 1.2 : (r() - .5) * size * 7;
    const ph = r() * TAU, hz = (o.hz || 3) * (0.9 + r() * .2);
    const x = cx + ox * (x1 > x0 ? -1 : 1), yy = y + oy + 3 * Math.sin(tl * 1.3 + ph);
    const f = Math.sin(TAU * hz * tl + ph), tip = -f * size * .9, mid = -f * size * .3 - size * .15;
    path.moveTo(x - size, yy + tip); path.quadraticCurveTo(x - size * .4, yy + mid, x, yy); path.quadraticCurveTo(x + size * .4, yy + mid, x + size, yy + tip);
  }
  if (o.knockW) strokeKnock(path, o.knockW, 1);
  strokeCov(path, o.w || 2, cov);
}
const gy = (hy, GK, p) => hy + GK * p;
/** One object per world period, centred in frame at mid-loop: it is off-screen
   at tl = 0 and tl = L, so it may also travel on its own without a seam. */
function visitMid(key, D, s, p, fn) { const X = D * (0.5 + (h01(key) - .5) * .1); for (const m of [-1, 0, 1]) { const x = 540 + (X + m * D - s) * p; if (x > -900 && x < W + 900) fn(0, x, X); } }

/* A shade tree (Albizia): thin leaning trunk, flat layered canopy. */
function shadeTree(path, x, yb, sc, k) {
  const r = rngFor('pp:st' + k), h = (170 + r() * 90) * sc, lean = (r() - .5) * 0.18;
  const tx = x + lean * h;
  path.addPath(nib([[x, yb], [lerp(x, tx, .5) + (r() - .5) * 6 * sc, yb - h * .5], [tx, yb - h]], u => (5 - 3 * u) * sc, { per: 6 }));
  for (const [dx, a] of [[-1, .55], [1, .5]]) path.addPath(nib([[tx, yb - h * .82], [tx + dx * 40 * sc, yb - h * .95]], u => (2.6 - 1.8 * u) * sc, { per: 4 }));
  const layers = 2 + Math.floor(r() * 2);
  for (let j = 0; j < layers; j++) {
    const cy = yb - h - j * 20 * sc + 10 * sc, w = (80 + r() * 50) * sc * (1 - j * .22), hh = (12 + r() * 6) * sc, cx = tx + (r() - .5) * 30 * sc;
    const pts = [];
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; pts.push([cx + Math.cos(a) * w * (0.8 + r() * .35), cy + Math.sin(a) * hh * (a > Math.PI ? 1.1 : .6)]); }
    path.addPath(cut(pts, r, { amp: 2.5 * sc + .5 }));
  }
}

/* Long thin lenticular clouds, lit on their undersides (dawn/dusk). */
function streaks(tl, key, n, y0, y1, cov, lit) {
  const Pc = 2600, off = fract(tl / L) * Pc, r = rngFor('pp:' + key);
  for (let i = 0; i < n; i++) {
    const cx = r() * Pc, w = 120 + r() * 220, h = 5 + r() * 7, y = lerp(y0, y1, r());
    for (const m of [-1, 0, 1]) {
      const x = ((cx - off) % Pc + Pc) % Pc - 500 + m * Pc;
      if (x + w < 0 || x - w > W) continue;
      const c = cut([[x - w, y], [x - w * .4, y - h], [x + w * .3, y - h * 1.2], [x + w, y - h * .2], [x + w * .2, y + h * .4], [x - w * .5, y + h * .3]], rngFor(key + i), { amp: 1.5 });
      put(c, cov);
      strokeCov(pline([[x - w * .7, y + h * .25], [x + w * .6, y + h * .2]]), 2, lit);
    }
  }
}

/* ── Passage 1: tea garden at dawn, Assam ───────────────────────────────── */
function viewTea(tl, P) {
  const hy = P.hy, s = P.V * tl, D = P.V * L, GK = 120;
  put(rect(0, 0, W, hy + 40), skyC(hy, [0, 60, 170, 330, 480], [C(.5, .26, 0, 0, 0), C(.34, .3, 0, .02, 0), C(.14, .3, 0, .1, 0), C(.02, .2, 0, .22, .04), C(0, .14, 0, .3, .1)]));
  streaks(tl, 'tcl', 7, hy - 380, hy - 210, C(.1, .4, 0, .1, 0), C(.4, .12, 0, 0, 0));
  sunDisc(330, hy - 150, 30, C(.34, .06, 0, 0, 0), 200, C(.28, .1, 0, 0, 0));
  // far ranges at infinity: Meghalaya hills, two layers, mist at the foot
  const f1 = sridge('pp:tf1', [[700, 26], [260, 11], [90, 4]]), f2 = sridge('pp:tf2', [[520, 18], [200, 8], [70, 3]]);
  put(skylinePath(x => 118 + f1(x) + 30 * Math.exp(-(((x - 760) / 180) ** 2)), hy, hy + 40), C(.04, .22, 0, .2, .04));
  strokeCov(skylineStroke(x => 118 + f1(x) + 30 * Math.exp(-(((x - 760) / 180) ** 2)), hy, 1), 2, C(.3, .2, 0, 0, 0));
  put(skylinePath(x => 66 + f2(x), hy, hy + 40), C(.02, .24, 0, .3, .1));
  strokeCov(skylineStroke(x => 66 + f2(x), hy, 1), 2, C(.34, .24, 0, 0, 0));
  bank(tl, 'tm1', hy - 6, 8, 400, 1, .7, { depth: 12, period: 2200, bumpH: 2 });
  // distant line of shade trees along the horizon (p = .06)
  const far = new Path2D();
  visit('pp:tft', Math.round(D * .06 / 34), D, s, .06, 60, (k, x) => shadeTree(far, x, hy + 6, .3 + h01('fs' + k) * .1, 'f' + k));
  put(far, C(.04, .26, .1, .34, .14));
  // the garden: rows of flat-pruned bushes following the ground, lit from the dawn side
  put(rect(0, hy, W, W - hy + 20), rampC([hy, W], [C(.26, .08, .4, .14, .02), C(.2, .06, .62, .34, .12)]));
  const und = pridge('pp:tund', D, [[2, 1], [5, .5], [11, .25]]);
  let y = hy + 5, i = 0;
  const rows = [];
  while (y < A[3] + 40) { rows.push(y); y += 4 + (y - hy) * 0.24; i++; }
  const lit = new Path2D(), dark = new Path2D();
  for (let r = 0; r < rows.length; r++) {
    const yr = rows[r], p = (yr - hy) / GK, bw = 90 * p + 2, hgt = Math.max(2, 26 * p);
    const top = new Path2D(); let first = true;
    const pts = [];
    for (let x = -20; x <= W + 20; x += Math.max(3, bw / 5)) {
      const X = s + (x - 540) / Math.max(p, .01), yy = yr - und(X) * 10 * p - hgt * (.55 + .45 * Math.pow(Math.abs(Math.sin(Math.PI * X / 90)), .45));
      pts.push([x, yy]);
    }
    const band = new Path2D(); band.moveTo(-20, yr + hgt * .4);
    for (const [x, yy] of pts) band.lineTo(x, yy);
    band.lineTo(W + 20, yr + hgt * .4); band.closePath();
    put(band, rampC([yr - hgt, yr + hgt * .4], [mixC(C(.46, .12, .4, .04, 0), C(.4, .1, .54, .12, 0), clamp(p / 1.4, 0, 1)), mixC(C(.2, .1, .56, .28, .08), C(.1, .08, .64, .44, .2), clamp(p / 1.4, 0, 1))]));
    const rim = pline(pts);
    strokeCov(rim, Math.max(1, 2.6 * p), C(.56, .2, .06, 0, 0));
    dark.moveTo(-20, yr + hgt * .6); dark.lineTo(W + 20, yr + hgt * .6);
  }
  strokeCov(dark, 1.2, C(0, .04, .1, .2, .1));
  // pluckers among the rows (p = .4), baskets on their backs
  visit('pp:pluck', 4, D, s, .4, 40, (k, x) => {
    const yb = gy(hy, GK, .4) - 2, sc = .4 * 1.4, sway = Math.sin(lw(9 + k) * tl + k) * 1.5;
    const body = new Path2D(); body.addPath(cut([[x - 6 * sc, yb], [x - 5 * sc, yb - 22 * sc], [x, yb - 30 * sc], [x + 5 * sc, yb - 22 * sc], [x + 6 * sc, yb]], rngFor('pb' + k), { amp: .4 }));
    const head = new Path2D(); head.ellipse(x + sway * .3, yb - 34 * sc, 3.6 * sc, 4 * sc, 0, 0, TAU);
    const bas = new Path2D(); bas.moveTo(x - 2 * sc, yb - 34 * sc); bas.lineTo(x + 12 * sc, yb - 36 * sc); bas.lineTo(x + 6 * sc, yb - 10 * sc); bas.closePath();
    put(bas, C(.34, .22, .1, .24, .08));
    put(body, [C(.2, .52, 0, .04, 0), C(.52, .24, 0, 0, 0), C(.1, .1, .1, .4, .1), C(.44, .44, 0, 0, 0)][k % 4]);
    put(head, C(.3, .3, 0, .3, .2));
  });
  // shade trees across the garden at three depths; the nearest pass fast
  for (const [p, n, cov, sm_] of [[.28, 5, C(.08, .2, .28, .36, .12), 0], [.55, 4, C(.06, .18, .34, .44, .18), 0], [1.1, 3, C(.04, .14, .38, .52, .28), 1]]) {
    const tr = new Path2D();
    visit('pp:tst' + p, Math.max(1, Math.round(D * p / (p > 1 ? 1500 : 620))), D, s, p, 260 * p, (k, x) => shadeTree(tr, x, gy(hy, GK, p) + 2, p, 's' + p + k));
    if (sm_) { const m = mask(1); smear(m, P.V * p / 30 * .5, g => g.fill(tr)); putM(m, cov); }
    else put(tr, cov);
  }
  flock(tl, 'egret1', 14, 44, -80, W + 260, hy - 230, 6, 6, C(0, .06, 0, .1, 0), { knockW: 4.2, w: 1, hz: 1.6 });
  masts(s, D, P.V, C(.1, .22, .02, .3, .2), { edge: .5 });
}

/* ── Passage 2: the Brahmaputra in the morning ──────────────────────────── */
function viewRiver(tl, P) {
  const hy = P.hy, s = P.V * tl, D = P.V * L, GK = 150;
  put(rect(0, 0, W, hy + 30), skyC(hy, [0, 90, 250, 450], [C(.12, .06, 0, .06, 0), C(.04, .03, 0, .14, 0), C(0, .02, 0, .26, .03), C(0, .02, 0, .34, .06)]));
  cumulus(tl, hy, { n: 6, scale: .45, key: 'rcu', lift: 60 });
  // the far bank: pale hills, then a dark tree line
  const f1 = sridge('pp:rf1', [[800, 14], [300, 6], [100, 2]]);
  const hA = x => 96 + f1(x) * 2 + 60 * Math.exp(-(((x - 300) / 220) ** 2)) + 30 * Math.exp(-(((x - 850) / 160) ** 2));
  const f2 = sridge('pp:rf2', [[500, 10], [180, 5], [60, 2]]), hB = x => 50 + f2(x) + 20 * Math.exp(-(((x - 620) / 160) ** 2));
  put(skylinePath(hA, hy, hy + 20), C(.02, .14, 0, .22, .06));
  strokeKnock(skylineStroke(hA, hy, 1), 1.6, .5);
  put(skylinePath(hB, hy, hy + 20), C(.08, .1, .12, .3, .12));
  strokeCov(skylineStroke(hB, hy, 1), 2, C(.3, .1, 0, 0, 0));
  const tl1 = pridge('pp:rtl', D, [[30, 1], [70, .5], [150, .3], [300, .2]]);
  const pT = .045, tlFn = x => { const X = s + (x - 540) / pT; return 9 + 5 * tl1(X) + 3 * Math.pow(Math.abs(Math.sin(X * TAU * 400 / D)), .5); };
  put(skylinePath(tlFn, hy, hy + 6), C(.14, .06, .4, .3, .1));
  // water: sky reflected, darker toward us, horizontal glints world-anchored
  put(rect(0, hy + 4, W, 220), rampC([hy + 4, hy + 60, hy + 220], [C(.04, .03, .02, .2, .03), C(.06, .04, .02, .24, .04), C(.04, .03, .06, .36, .12)]));
  // the hills mirrored, broken by ripple rows
  const refl = new Path2D(); refl.moveTo(-20, hy + 4);
  for (let x = -20; x <= W + 20; x += 4) refl.lineTo(x, hy + 6 + hA(x) * .42 + 1.5 * Math.sin(x * .09 + lw(3) * tl));
  refl.lineTo(W + 20, hy + 4); refl.closePath();
  add(refl, C(.02, .08, 0, .12, .04));
  const refl2 = new Path2D(); refl2.moveTo(-20, hy + 4);
  for (let x = -20; x <= W + 20; x += 4) refl2.lineTo(x, hy + 6 + hB(x) * .42 + 1.5 * Math.sin(x * .11 + lw(4) * tl));
  refl2.lineTo(W + 20, hy + 4); refl2.closePath();
  add(refl2, C(.04, .04, .06, .12, .05));
  const gl = new Path2D();
  for (let r = 0; r < 40; r++) {
    const y = hy + 8 + r * r * .12 + r * 1.5, p = (y - hy) / GK;
    if (y > hy + 200) break;
    visit('pp:gl' + r, 8, D, s, Math.max(p, .02), 60, (k, x) => { const w = (20 + h01('gw' + r + k) * 60) * p + 4; gl.moveTo(x - w, y); gl.lineTo(x + w, y); });
  }
  strokeKnock(gl, 1.6, .7);
  // sandbars (chars) lying low on the water, grass on their backs
  for (const [p, n] of [[.08, 5], [.14, 4], [.3, 2]]) visit('pp:char' + p, n, D, s, p, 1600 * p, (k, x) => {
    const y = gy(hy, GK, p), w = (1600 + h01('cw' + k) * 2200) * p, h = 9 * p + 3;
    const bar = cut([[x - w, y], [x - w * .6, y - h], [x + w * .5, y - h * 1.2], [x + w, y], [x + w * .3, y + h * .5], [x - w * .5, y + h * .4]], rngFor('ch' + p + k), { amp: 1.5 });
    put(bar, C(.36, .16, 0, .06, 0)); strokeCov(pline([[x - w * .8, y - h * .9], [x + w * .6, y - h]]), 1.6, C(.5, .2, 0, 0, 0));
    const gr = cut([[x - w * .5, y - h * .8], [x, y - h * 2.2], [x + w * .4, y - h * 1.1], [x + w * .2, y - h * .6]], rngFor('cg' + p + k), { amp: 1.4 });
    put(gr, C(.3, .04, .34, .1, 0));
    strokeKnock(pline([[x - w * .9, y + h * .45], [x + w * .8, y + h * .45]]), 1.4, .8);
  });
  // country boats: one poled along the far water, one moored with a sail
  boats(tl, s, D, hy, GK);
  // near bank: kash grass in white plume and bamboo clumps
  const nb = pridge('pp:rnb', D, [[60, 1], [140, .5], [320, .3]]);
  const nbFn = x => -168 + 10 * nb(s + (x - 540) / .9);
  put(skylinePath(nbFn, hy, W + 20), rampC([hy + 150, A[3]], [C(.24, .06, .5, .3, .1), C(.16, .06, .56, .42, .2)]));
  strokeCov(skylineStroke(nbFn, hy, 1), 3, C(.42, .06, .16, 0, 0));
  bamboo(s, D, hy + 190, .8, P.V);
  kash(s, D, hy + 205, 1.1, P.V, tl);
  flock(tl, 'egret2', 20, 50, W + 60, -300, hy - 150, 7, 5, C(0, .05, 0, .1, 0), { knockW: 3.6, w: 1, hz: 1.7 });
  masts(s, D, P.V, C(.14, .16, .02, .3, .22), { edge: .5 });
}
function boats(tl, s, D, hy, GK) {
  for (const [p, key, drift, sail] of [[.16, 'b1', 38, false], [.3, 'b2', 0, true]]) {
    (drift ? (f => visitMid('pp:boat' + key, D, s, p, f)) : (f => visit('pp:boat' + key, 1, D, s, p, 300, f)))((k, x0) => {
      const x = x0 + drift * p * (tl - L / 2), y = gy(hy, GK, p), sc = p * 2.2, bob = Math.sin(lw(11) * tl + k) * sc;
      const hull = new Path2D(); hull.moveTo(x - 60 * sc, y - 9 * sc + bob); hull.quadraticCurveTo(x, y + 4 * sc + bob, x + 60 * sc, y - 11 * sc + bob); hull.lineTo(x + 50 * sc, y - 5 * sc + bob); hull.quadraticCurveTo(x, y + 1 * sc + bob, x - 52 * sc, y - 4 * sc + bob); hull.closePath();
      const hood = new Path2D(); hood.moveTo(x - 18 * sc, y - 6 * sc + bob); hood.quadraticCurveTo(x, y - 26 * sc + bob, x + 20 * sc, y - 6 * sc + bob); hood.closePath();
      put(hood, C(.36, .2, .04, .16, .04));
      put(hull, C(.1, .2, .02, .36, .3));
      // reflection
      const rf = new Path2D(); rf.moveTo(x - 50 * sc, y + 2 * sc + bob); rf.lineTo(x + 50 * sc, y + 2 * sc + bob); rf.lineTo(x + 40 * sc, y + 9 * sc); rf.lineTo(x - 40 * sc, y + 9 * sc); rf.closePath();
      add(rf, C(0, .06, 0, .14, .1));
      if (!sail) {                                   // boatman with his pole
        const lean = Math.sin(lw(6) * tl) * .15;
        const man = new Path2D(); man.addPath(nib([[x + 36 * sc, y - 10 * sc + bob], [x + 34 * sc + lean * 10 * sc, y - 30 * sc + bob]], u => 2.6 * sc, { per: 3 }));
        man.ellipse(x + 34 * sc + lean * 10 * sc, y - 34 * sc + bob, 2.6 * sc, 3 * sc, 0, 0, TAU);
        man.addPath(nib([[x + 50 * sc, y + 14 * sc], [x + 26 * sc + lean * 20 * sc, y - 44 * sc + bob]], u => .9 * sc, { per: 2 }));
        put(man, C(.1, .16, 0, .4, .3));
      } else {
        const sl = new Path2D(); sl.moveTo(x - 4 * sc, y - 8 * sc + bob); sl.lineTo(x - 4 * sc, y - 70 * sc + bob); sl.lineTo(x + 34 * sc, y - 62 * sc + bob); sl.lineTo(x + 30 * sc, y - 12 * sc + bob); sl.closePath();
        put(sl, C(.34, .12, 0, .04, 0));
        strokeCov(pline([[x - 4 * sc, y - 4 * sc + bob], [x - 4 * sc, y - 74 * sc + bob]]), 1.4 * sc, C(0, .1, 0, .4, .3));
      }
    });
  }
}
function bamboo(s, D, yb, p, V) {
  const path = new Path2D();
  visit('pp:bam', Math.round(D * p / 900), D, s, p, 300, (k, x) => {
    const r = rngFor('pp:bm' + k), n = 9 + Math.floor(r() * 6);
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1) - .5) * 1.4 + (r() - .5) * .2, len = (180 + r() * 120) * p, bend = a * 1.4;
      const pts = [[x + (r() - .5) * 20 * p, yb], [x + Math.sin(a) * len * .5, yb - Math.cos(a) * len * .5], [x + Math.sin(bend) * len, yb - Math.cos(bend) * len * .8]];
      path.addPath(nib(pts, u => (4 - 3 * u) * p, { per: 6 }));
      const tip = pts[2];
      for (let j = 0; j < 5; j++) { const lx = tip[0] - Math.sin(bend) * j * 14 * p, ly = tip[1] + Math.cos(bend) * j * 12 * p; path.addPath(nib([[lx, ly], [lx + (8 + r() * 12) * p * Math.sign(a || 1), ly + 10 * p]], wLeaf(2.4 * p), { per: 4 })); }
    }
  });
  const m = mask(1); smear(m, V * p / 30 * .5, g => g.fill(path)); putM(m, C(.24, .06, .56, .36, .12));
}
function kash(s, D, yb, p, V, tl) {
  const stems = new Path2D(), plumes = new Path2D();
  visit('pp:kash', Math.round(D * p / 26), D, s, p, 80, (k, x) => {
    const h = (60 + h01('kh' + k) * 110) * p, sway = Math.sin(lw(13) * tl + k * .7) * 7 * p, tx = x + sway + (h01('kl' + k) - .5) * 30 * p;
    stems.addPath(nib([[x, yb + 40], [lerp(x, tx, .5), yb - h * .5], [tx, yb - h]], u => 1.3 * p, { per: 3 }));
    const bend = .5 + h01('kb' + k) * .6, len = (26 + h01('kz' + k) * 20) * p;
    for (let j = 0; j < 5; j++) {                    // a plume is many silky strands
      const a = -Math.PI / 2 + (j / 4 - .5) * .5 + bend * .4, ex = tx + Math.cos(a) * len + sway * .5, ey = yb - h + Math.sin(a) * len;
      plumes.addPath(nib([[tx, yb - h + 4 * p], [lerp(tx, ex, .5) + 3 * p, lerp(yb - h, ey, .5)], [ex, ey]], wSwell(2.6 * p, .55, .4), { per: 5 }));
    }
  });
  const d = V * p / 30 * .5;
  const m = mask(1); smear(m, d, g => g.fill(stems)); putM(m, C(.34, .08, .36, .18, .06));
  const m2 = mask(2); smear(m2, d, g => g.fill(plumes));
  const c = m2.canvas;
  for (const n of PL) { const g = PG[n]; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = .85; g.drawImage(c, 0, 0); if (n === 'pink' || n === 'yellow') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = .08; g.drawImage(c, 0, 0); } g.restore(); }
}

/* ── Passage 3: the plains at noon ──────────────────────────────────────── */
function viewNoon(tl, P) {
  const hy = P.hy, s = P.V * tl, D = P.V * L, GK = 110;
  put(rect(0, 0, W, hy + 30), skyC(hy, [0, 80, 240, 440], [C(.06, .02, 0, .08, 0), C(0, 0, 0, .2, .02), C(0, 0, 0, .36, .06), C(0, .02, 0, .46, .12)]));
  cumulus(tl, hy);
  // horizon trees and a village with a temple (p = .09)
  const tlf = pridge('pp:ntl', D, [[25, 1], [60, .6], [140, .3], [320, .2]]);
  const pT = .05, tlFn = x => { const X = s + (x - 540) / pT; return 12 + 6 * tlf(X) + 4 * Math.pow(Math.abs(Math.sin(X * TAU * 500 / D)), .5); };
  put(skylinePath(tlFn, hy, hy + 6), C(.12, .06, .36, .28, .08));
  village(tl, s, D, hy, GK);
  // paddies: a grid on the ground plane; young green, flooded, ripening
  paddies(s, D, hy, GK, tl);
  // palms: toddy and coconut at several depths
  for (const [p, n] of [[.3, 6], [.6, 4], [1.15, 2]]) {
    const path = new Path2D();
    visit('pp:palm' + p, Math.max(1, Math.round(D * p / 1100)), D, s, p, 300 * p, (k, x) => palm(path, x, gy(hy, GK, p) + 2, p, 'n' + p + k, tl));
    const cov = mixC(C(.18, .06, .44, .34, .12), C(.1, .06, .56, .5, .26), clamp(p, 0, 1));
    if (p > 1) { const m = mask(1); smear(m, P.V * p / 30 * .5, g => g.fill(path)); putM(m, cov); } else put(path, cov);
  }
  // a man with an umbrella walking the bund (p = .35), crossing once per loop
  visitMid('pp:umb', D, s, .35, (k, x0) => {
    const x = x0 + 24 * .35 * (tl - 30), yb = gy(hy, GK, .35) - 1, sc = .35 * 1.6, step = Math.sin(lw(70) * tl) * 2 * sc;
    const b = new Path2D(); b.addPath(nib([[x, yb - 26 * sc], [x, yb - 8 * sc]], u => 3 * sc, { per: 2 }));
    b.addPath(nib([[x, yb - 9 * sc], [x - 3 * sc + step, yb]], u => 1.4 * sc, { per: 2 })); b.addPath(nib([[x, yb - 9 * sc], [x + 3 * sc - step, yb]], u => 1.4 * sc, { per: 2 }));
    put(b, C(.08, .08, 0, .34, .24));
    const u = new Path2D(); u.moveTo(x - 14 * sc, yb - 32 * sc); u.quadraticCurveTo(x, yb - 46 * sc, x + 14 * sc, yb - 32 * sc); u.closePath();
    put(u, C(0, .1, 0, .46, .4));
  });
  flock(tl, 'kite', 8, 58, W + 100, -200, 260, 1, 12, C(.04, .1, 0, .36, .3), { hz: .5, w: 3.2 });
  masts(s, D, P.V, C(.14, .14, .02, .3, .22), { edge: .55, spacing: 1500 });
}
function cumulus(tl, hy, o = {}) {
  const Pc = 2600, off = fract(tl / L) * Pc, r = rngFor('pp:' + (o.key || 'cu')), sc = o.scale || 1;
  for (let i = 0; i < (o.n || 4); i++) {
    const cx = r() * Pc, w = (110 + r() * 110) * sc, h = (70 + r() * 80) * sc, yb = hy - 150 - r() * 70 - (o.lift || 0) * r();
    for (const m of [-1, 0, 1]) {
      const x = ((cx - off) % Pc + Pc) % Pc - 600 + m * Pc;
      if (x + w * 1.6 < 0 || x - w * 1.6 > W) continue;
      const pts = [[x - w * 1.4, yb], [x - w * 1.1, yb - h * .35], [x - w * .6, yb - h * .6], [x - w * .3, yb - h], [x + w * .2, yb - h * .9], [x + w * .5, yb - h * .6], [x + w * .9, yb - h * .45], [x + w * 1.4, yb]];
      const cl = cut(pts, rngFor((o.key || 'cu') + i), { amp: 6 * sc });
      knock(cl, KALL(1));
      const belly = new Path2D(); belly.rect(x - w * 1.5, yb - h * .28, w * 3, h * .3);
      withClip(cl, () => { add(belly, C(0, .02, 0, .14, .04)); });
      strokeCov(pline([[x - w * 1.35, yb], [x + w * 1.35, yb]]), 2, C(0, .03, 0, .2, .06));
    }
  }
}
function village(tl, s, D, hy, GK) {
  const p = .09;
  visit('pp:vil', 1, D, s, p, 500, (k, x) => {
    const yb = hy + 3, huts = new Path2D(), roofs = new Path2D();
    for (let i = 0; i < 9; i++) {
      const hx = x - 260 * p * 3 + i * 60 * p * 3 + h01('vh' + i) * 20, w = 22 + h01('vw' + i) * 16, h = 12 + h01('vt' + i) * 6;
      huts.rect(hx - w / 2, yb - h, w, h);
      roofs.moveTo(hx - w / 2 - 3, yb - h); roofs.lineTo(hx, yb - h - 10); roofs.lineTo(hx + w / 2 + 3, yb - h); roofs.closePath();
    }
    put(huts, C(.34, .14, 0, .08, 0));
    put(roofs, C(.36, .4, 0, .14, .04));
    // the shikhara: stacked curving tower, white, with a saffron flag
    const tx = x + 30, th = 64, sh = new Path2D();
    sh.moveTo(tx - 16, yb); sh.lineTo(tx - 15, yb - 18); sh.quadraticCurveTo(tx - 13, yb - th * .8, tx, yb - th); sh.quadraticCurveTo(tx + 13, yb - th * .8, tx + 15, yb - 18); sh.lineTo(tx + 16, yb); sh.closePath();
    knock(sh, KALL(1)); add(sh, { blue: { x0: tx - 16, y0: 0, x1: tx + 16, y1: 0, at: [0, .5, 1], as: [.04, .04, .22] } });
    strokeCov(pline([[tx - 12, yb - 30], [tx + 12, yb - 30]]), 1.2, C(0, .06, 0, .2, .06));
    strokeCov(pline([[tx - 9, yb - 46], [tx + 9, yb - 46]]), 1.2, C(0, .06, 0, .2, .06));
    const fl = new Path2D(), wv = Math.sin(lw(40) * tl) * 3;
    fl.moveTo(tx, yb - th - 12); fl.lineTo(tx + 20, yb - th - 8 + wv); fl.lineTo(tx, yb - th - 3); fl.closePath();
    put(fl, C(.7, .5, 0, 0, 0));
    strokeCov(pline([[tx, yb - th], [tx, yb - th - 14]]), 1.2, C(0, .1, 0, .3, .2));
    const bn = new Path2D(); bn.ellipse(x - 70, yb - 22, 38, 22, 0, 0, TAU); bn.ellipse(x - 40, yb - 26, 30, 20, 0, 0, TAU);
    put(bn, C(.1, .06, .42, .34, .12));
  });
}
function paddies(s, D, hy, GK, tl) {
  put(rect(0, hy + 2, W, W), C(.34, .04, .44, .14, .02));
  const cols = 36, colW = D / cols, rowsY = [], groups = [new Path2D(), new Path2D(), new Path2D()], bunds = new Path2D();
  let y = hy + 4; while (y < A[3] + 20) { rowsY.push(y); y += 5 + (y - hy) * .38; }
  for (let r = 0; r < rowsY.length - 1; r++) {
    const ya = rowsY[r], yb = rowsY[r + 1], pa = (ya - hy) / GK, pb = (yb - hy) / GK;
    const X0 = s + (-40 - 540) / pb, X1 = s + (W + 40 - 540) / pb;
    for (let c = Math.floor(X0 / colW) - 1; c * colW < X1 + colW; c++) {
      const cc = ((c % cols) + cols) % cols, xa = c * colW + (h01('px' + cc) - .5) * colW * .3, xb = (c + 1) * colW + (h01('px' + ((cc + 1) % cols)) - .5) * colW * .3;
      const kind = Math.floor(h01('pk' + cc + ':' + r) * 3);
      const q = poly([[540 + (xa - s) * pa, ya], [540 + (xb - s) * pa, ya], [540 + (xb - s) * pb, yb], [540 + (xa - s) * pb, yb]]);
      groups[kind].addPath(q);
      bunds.moveTo(540 + (xa - s) * pa, ya); bunds.lineTo(540 + (xa - s) * pb, yb);
    }
    bunds.moveTo(-20, ya); bunds.lineTo(W + 20, ya);
  }
  put(groups[0], C(.4, .02, .52, .1, 0));             // young paddy
  put(groups[1], C(.06, .02, .06, .18, .02));         // flooded, the sky in it
  put(groups[2], C(.56, .1, .22, .04, 0));            // ripening
  withClip(groups[1], () => {                          // glints in the flooded squares
    const g = new Path2D();
    for (let r = 0; r < rowsY.length - 1; r++) { const y = (rowsY[r] + rowsY[r + 1]) / 2, p = (y - hy) / GK; visit('pp:pg' + r, 14, D, s, Math.max(p, .02), 40, (k, x) => { const w = 30 * p + 3; g.moveTo(x - w, y); g.lineTo(x + w, y); }); }
    strokeKnock(g, 1.6, .9);
  });
  strokeCov(bunds, 1.6, C(.2, .14, 0, .06, 0));
}
function palm(path, x, yb, sc, key, tl) {
  const r = rngFor('pp:pm' + key), toddy = r() < .45, h = (toddy ? 260 : 230) * sc * (0.85 + r() * .3);
  const lean = toddy ? (r() - .5) * .06 : (r() - .3) * .35, tx = x + lean * h, sway = Math.sin(lw(5) * tl + r() * TAU) * 3 * sc;
  path.addPath(nib([[x, yb], [x + lean * h * .3, yb - h * .5], [tx + sway, yb - h]], u => (5.5 - 2 * u) * sc, { per: 8 }));
  if (toddy) {
    const n = 16;
    for (let i = 0; i < n; i++) { const a = -Math.PI * (i / (n - 1)) + (r() - .5) * .15, len = (38 + r() * 10) * sc; path.addPath(nib([[tx + sway, yb - h], [tx + sway + Math.cos(a) * len, yb - h + Math.sin(a) * len * .85]], wLeaf(4.5 * sc, .7), { per: 4 })); }
    const hd = new Path2D(); hd.ellipse(tx + sway, yb - h + 4 * sc, 11 * sc, 8 * sc, 0, 0, TAU); path.addPath(hd);
  } else {
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * .1 - Math.PI * .8 * (i / (n - 1)) + (r() - .5) * .2, len = (70 + r() * 25) * sc, droop = 26 * sc;
      const ex = tx + sway + Math.cos(a) * len, ey = yb - h + Math.sin(a) * len * .5 + droop;
      path.addPath(nib([[tx + sway, yb - h], [tx + sway + Math.cos(a) * len * .55, yb - h + Math.sin(a) * len * .45 - 6 * sc], [ex, ey]], wLeaf(6 * sc, .5), { per: 6 }));
    }
  }
}

/* ── Passage 5: sunset over the Deccan near Pune ─────────────────────────── */
function viewDusk(tl, P) {
  const hy = P.hy, s = P.V * tl, D = P.V * L, GK = 120;
  put(rect(0, 0, W, hy + 30), skyC(hy, [0, 50, 140, 280, 460], [C(.72, .46, 0, 0, 0), C(.54, .5, 0, 0, 0), C(.24, .46, 0, .06, 0), C(.04, .32, 0, .22, .06), C(0, .24, 0, .32, .14)]));
  // sun rays fanning from the disc, like the print tradition
  const sx = 610, sy = hy - 64;
  const rays = new Path2D(), rr = rngFor('pp:rays');
  for (let i = 0; i < 18; i++) { const a = -Math.PI * (i + .5) / 18, w = .05 + rr() * .03, l = 700; rays.moveTo(sx, sy); rays.lineTo(sx + Math.cos(a - w) * l, sy + Math.sin(a - w) * l); rays.lineTo(sx + Math.cos(a + w) * l, sy + Math.sin(a + w) * l); rays.closePath(); }
  const rg = { yellow: .16 * (0.9 + .1 * Math.sin(lw(2) * tl)), pink: .06 };
  withClip(rect(0, 0, W, hy), () => add(rays, rg));
  bank(tl, 'dk1', hy - 250, 10, 60, 1, 0, { cov: C(.2, .46, 0, .14, .04), depth: 8, period: 2600 });
  bank(tl, 'dk2', hy - 190, 7, 50, 2, 0, { cov: C(.44, .52, 0, .04, 0), depth: 5, period: 2000 });
  sunDisc(sx, sy, 38, C(.5, .1, 0, 0, 0), 210, C(.4, .2, 0, 0, 0));
  // the fort hill at infinity: long flat top, scarps, walls along the crest
  const fh = sridge('pp:dfh', [[900, 10], [300, 4], [90, 1.5]]);
  const fAlt = x => (x > 60 && x < 540 ? 96 + fh(x) * .5 - 50 * (1 - sm((x - 60) / 70)) - 50 * sm((x - 470) / 70) : 40 + fh(x) * .8) + 6;
  put(skylinePath(fAlt, hy, hy + 40), C(.08, .34, 0, .3, .16));
  const walls = new Path2D();
  for (let x = 130; x < 480; x += 7) { const y = hy - fAlt(x); walls.rect(x, y - 7, 5, 7); }
  walls.rect(260, hy - fAlt(260) - 16, 16, 16); walls.rect(390, hy - fAlt(390) - 14, 13, 14);
  put(walls, C(.08, .34, 0, .3, .16));
  strokeCov(skylineStroke(fAlt, hy, 1), 2.4, C(.6, .4, 0, 0, 0));
  // a lower mesa, nearer (p = .04)
  const ms = pridge('pp:dms', D, [[1, 10], [3, 6], [7, 3]]);
  const mAlt = x => terrace(26 + ms(s + (x - 540) / .04), 18, 5);
  put(skylinePath(mAlt, hy, hy + 30), C(.06, .38, .02, .38, .24));
  strokeCov(skylineStroke(mAlt, hy, 1), 2, C(.54, .36, 0, 0, 0));
  // the reservoir with the sun's column
  put(rect(0, hy + 2, W, 60), rampC([hy + 2, hy + 62], [C(.6, .44, 0, 0, 0), C(.3, .4, 0, .14, .04)]));
  const col = new Path2D();
  for (let r = 0; r < 16; r++) {
    const y = hy + 5 + r * 3.6, ph = h01('sc' + r) * TAU, w = (40 - r * 1.4) * (0.75 + 0.25 * Math.sin(lw(3 + (r % 3)) * tl + ph));
    col.moveTo(sx - w, y); col.lineTo(sx + w, y);
  }
  strokeKnock(col, 2, 1);
  strokeCov(pline([[-20, hy + 62], [W + 20, hy + 62]]), 3, C(.2, .3, .02, .3, .2));
  // jowar fields toward us, darkening; a banyan; the near stalks
  put(rect(0, hy + 62, W, W), rampC([hy + 62, A[3]], [C(.2, .4, .06, .3, .18), C(.14, .38, .1, .46, .34)]));
  const fr = new Path2D();
  for (let r = 0; r < 14; r++) { const y = hy + 66 + r * r * .9 + r * 4, p = (y - hy) / GK; visit('pp:dfr' + r, 10, D, s, Math.max(.05, p), 60, (k, x) => { const w = 90 * p; fr.moveTo(x - w, y); fr.lineTo(x + w, y); }); }
  strokeCov(fr, 1.6, C(.4, .3, 0, 0, 0));
  visit('pp:banyan', 1, D, s, .26, 500, (k, x) => {
    const yb = gy(hy, GK, .26), sc = .26 * 2.6, bn = new Path2D();
    const pts = []; for (let i = 0; i < 20; i++) { const a = Math.PI + i / 19 * Math.PI; pts.push([x + Math.cos(a) * 120 * sc * (0.85 + h01('bp' + i) * .3), yb - 54 * sc + Math.sin(a) * 44 * sc * (0.8 + h01('bq' + i) * .4)]); }
    pts.push([x + 110 * sc, yb - 44 * sc]); pts.push([x - 110 * sc, yb - 44 * sc]);
    bn.addPath(cut(pts, rngFor('pp:bany'), { amp: 3 }));
    for (let i = 0; i < 9; i++) { const rx = x + (i / 8 - .5) * 190 * sc; bn.addPath(nib([[rx, yb - 46 * sc], [rx + (h01('br' + i) - .5) * 4 * sc, yb]], u => (i % 4 === 0 ? 6 : 1.4) * sc, { per: 3 })); }
    put(bn, C(.1, .4, .08, .46, .36));
  });
  // cattle and a herder heading home along the bund (p = .42)
  visitMid('pp:cattle', D, s, .42, (k, x0) => {
    const yb = gy(hy, GK, .42), sc = .42 * 1.3, x = x0 + 14 * .42 * (tl - 30), herd = new Path2D();
    for (let i = 0; i < 5; i++) {
      const cx = x + i * 30 * sc * 2.2, st = Math.sin(lw(40) * tl + i) * 2 * sc;
      herd.addPath(cut([[cx - 14 * sc, yb - 10 * sc], [cx + 10 * sc, yb - 11 * sc], [cx + 18 * sc, yb - 14 * sc], [cx + 20 * sc, yb - 9 * sc], [cx + 12 * sc, yb - 5 * sc], [cx - 14 * sc, yb - 5 * sc]], rngFor('cw' + i), { amp: .5 }));
      for (const lx of [-11, -7, 7, 11]) herd.addPath(nib([[cx + lx * sc, yb - 5 * sc], [cx + lx * sc + (lx > 0 ? st : -st), yb]], u => 1.1 * sc, { per: 2 }));
    }
    herd.addPath(nib([[x - 24 * sc, yb], [x - 24 * sc, yb - 20 * sc]], u => 2.6 * sc, { per: 2 })); herd.ellipse(x - 24 * sc, yb - 23 * sc, 2.6 * sc, 3 * sc, 0, 0, TAU);
    herd.addPath(nib([[x - 18 * sc, yb], [x - 28 * sc, yb - 30 * sc]], u => .8 * sc, { per: 2 }));
    put(herd, C(.08, .36, .04, .44, .36));
  });
  flock(tl, 'home1', 10, 40, -120, W + 300, hy - 300, 7, 7, C(.06, .3, 0, .42, .34), { vee: true, hz: 2.2, w: 2.2 });
  flock(tl, 'home2', 34, 58, -120, W + 240, hy - 220, 5, 5, C(.06, .3, 0, .42, .34), { vee: true, hz: 2.6, w: 1.8 });
  // jowar stalks right beside the track, black against the glow
  const st = new Path2D();
  visit('pp:jow', Math.round(D * 1.2 / 40), D, s, 1.2, 60, (k, x) => {
    const h = 120 + h01('jh' + k) * 90, tx = x + (h01('jl' + k) - .5) * 24, yb = A[3] + 30;
    st.addPath(nib([[x, yb], [tx, yb - h]], u => 2.4 - u, { per: 3 }));
    st.ellipse(tx, yb - h - 8, 4, 10, (h01('ja' + k) - .5) * .5, 0, TAU);
    st.addPath(nib([[tx, yb - h * .5], [tx + 26 * (h01('jf' + k) - .5) * 2, yb - h * .5 + 14]], wLeaf(3), { per: 3 }));
  });
  const m = mask(1); smear(m, P.V * 1.2 / 30 * .5, g => g.fill(st)); putM(m, C(.12, .38, .1, .54, .46));
  masts(s, D, P.V, C(.12, .4, .04, .48, .42), { edge: 0 });
}

/* ── Passage 6: night, the open country under stars ─────────────────────── */
const STARS = (() => { const r = rngFor('pp:stars'), o = []; for (let i = 0; i < 420; i++) { const x = r() * W, y = 120 + r() * 470; const band = Math.exp(-(((y - 640 + x * .55) / 90) ** 2)); if (r() > .45 + band * .55 && i > 140) continue; o.push({ x, y, r: .6 + r() * r() * 2.2, k: 1 + Math.floor(r() * 5), ph: r() * TAU }); } return o; })();
function viewNight(tl, P) {
  const hy = P.hy, s = P.V * tl, D = P.V * L, GK = 120;
  put(rect(0, 0, W, hy + 30), skyC(hy, [0, 50, 160, 480], [C(0, .14, 0, .44, .3), C(0, .08, 0, .52, .44), C(0, .05, 0, .58, .56), C(0, .04, 0, .62, .64)]));
  // the Milky Way: a soft lighter band, then the stars
  for (const n of ['blue', 'indigo']) { const g = PG[n]; g.save(); g.translate(540, 300); g.rotate(-0.5); g.scale(1, .16); g.globalCompositeOperation = 'destination-out'; g.fillStyle = radial(g, 0, 0, 40, 620, n === 'blue' ? .16 : .22, 0); g.fillRect(-700, -700, 1400, 1400); g.restore(); }
  const st = new Path2D();
  for (const S of STARS) { const tw = 0.8 + 0.2 * Math.sin(lw(S.k) * tl + S.ph), r = S.r * tw; st.moveTo(S.x + r, S.y); st.arc(S.x, S.y, r, 0, TAU); }
  knock(st, KALL(1)); add(st, C(.05, 0, 0, 0, 0));
  // a crescent moon
  const mx = 820, my = 250, mR = 26, moon = new Path2D(); moon.arc(mx, my, mR, 0, TAU); const bite = new Path2D(); bite.arc(mx - 11, my - 6, mR * .92, 0, TAU);
  glowC(mx, my, mR, 110, { blue: .3, indigo: .3 }, 'destination-out');
  knock(moon, KALL(1)); add(moon, C(.16, .02, 0, 0, 0));
  add(bite, C(0, .08, 0, .6, .6)); withClip(bite, () => put(bite, C(0, .06, 0, .6, .62)));
  // horizon: low hills, the glow of a town, its lights (p = .05)
  const hl = sridge('pp:nhl', [[600, 12], [230, 5], [80, 2]]);
  glowC(260, hy - 6, 20, 220, { indigo: .3, blue: .22 }, 'destination-out'); glowC(260, hy - 6, 10, 160, { pink: .1, yellow: .08 });
  put(skylinePath(x => 34 + hl(x), hy, hy + 30), C(0, .1, 0, .6, .58));
  const tn = new Path2D();
  visit('pp:town', 40, D, s, .05, 40, (k, x) => { const y = hy + 1 + h01('ty' + k) * 5, r = .9 + h01('tr' + k) * 1.2; tn.moveTo(x + r, y); tn.arc(x, y, r, 0, TAU); });
  knock(tn, KALL(1)); add(tn, C(.5, .1, 0, 0, 0));
  // fields in the dark, tree clumps, village lamps (p = .18)
  put(rect(0, hy + 8, W, W), rampC([hy + 8, A[3]], [C(0, .1, .04, .6, .58), C(0, .08, .1, .66, .68)]));
  const trees = new Path2D();
  visit('pp:ntr', 9, D, s, .2, 160, (k, x) => { const yb = gy(hy, GK, .2), r = rngFor('nt' + k); for (let j = 0; j < 4; j++) { const rx = (18 + r() * 20), ox = (r() - .5) * 50; trees.moveTo(x + ox + rx, yb - rx * .7); trees.ellipse(x + ox, yb - rx * .7, rx, rx * .8, 0, 0, TAU); } });
  put(trees, C(0, .08, .1, .68, .7));
  const lamps = new Path2D(), halos = [];
  visit('pp:lamp', 7, D, s, .22, 60, (k, x) => { const y = gy(hy, GK, .22) - 4 - h01('ly' + k) * 6; lamps.moveTo(x + 2.4, y); lamps.arc(x, y, 2.4, 0, TAU); halos.push([x, y]); });
  for (const [x, y] of halos) { glowC(x, y, 2, 30, { blue: .5, indigo: .5 }, 'destination-out'); glowC(x, y, 1, 22, { yellow: .4, pink: .1 }); }
  knock(lamps, KALL(1)); add(lamps, C(.6, .12, 0, 0, 0));
  // fireflies over the near ditch: slow blinks, integer cycles per loop
  const ff = new Path2D(), ffh = [];
  const rr = rngFor('pp:ff');
  for (let i = 0; i < 26; i++) {
    const bx = rr() * W, by = hy + 60 + rr() * 110, k = 2 + Math.floor(rr() * 4), ph = rr() * TAU;
    const b = Math.sin(lw(k) * tl + ph); if (b < .3) continue;
    const a = sm((b - .3) / .7), x = bx + 30 * Math.sin(lw(1 + (i % 3)) * tl + ph), y = by + 12 * Math.sin(lw(2 + (i % 2)) * tl + ph * 2), r = 1.2 + a * 1.6;
    ff.moveTo(x + r, y); ff.arc(x, y, r, 0, TAU); ffh.push([x, y, a]);
  }
  for (const [x, y, a] of ffh) glowC(x, y, 1, 14, { blue: .4 * a, indigo: .4 * a }, 'destination-out');
  knock(ff, KALL(1)); add(ff, C(.62, 0, .12, 0, 0));
  // our own lit windows thrown onto the embankment beside us: fixed on screen,
  // the ground inside them streaming past
  const patches = new Path2D(), pw = 260, gap = 330, ybT = A[3] - 70;
  for (let x = -60; x < W + 200; x += gap) patches.addPath(poly([[x, ybT], [x + pw, ybT], [x + pw + 26, A[3] + 20], [x - 26, A[3] + 20]]));
  withClip(patches, () => {
    knock(rect(0, ybT, W, 120), rampC([ybT, ybT + 30, A[3]], [{ blue: .15, indigo: .2 }, { blue: .4, indigo: .46, green: .1 }, { blue: .4, indigo: .46, green: .1 }]));
    add(rect(0, ybT, W, 120), C(.2, .06, .06, .06, 0));
    const gr = new Path2D();
    visit('pp:ngr', Math.round(D * 1.3 / 14), D, s, 1.3, 40, (k, x) => { const y = ybT + 6 + h01('gy' + k) * 90, h = 8 + h01('gh' + k) * 16; gr.moveTo(x, y); gr.lineTo(x + 3, y - h); });
    const m = mask(1); m.lineWidth = 2; smear(m, P.V * 1.3 / 30 * .6, g => { g.lineWidth = 2; g.strokeStyle = '#000'; g.stroke(gr); });
    const c = m.canvas; for (const n of ['green', 'blue', 'indigo']) { const g = PG[n]; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = n === 'green' ? .5 : .3; g.drawImage(c, 0, 0); g.restore(); }
  });
  masts(s, D, P.V, C(0, .1, .04, .62, .62), { edge: 0 });
}
