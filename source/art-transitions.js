/* ── covered switches ─────────────────────────────────────────────────────────
   Passage A keeps running from its loop start (tl = u); passage B arrives at
   its loop start (tl = u − TR, wrapped). The place, hour and light change only
   while the cover fills the window, so both seams are exact and the switch
   itself is never seen. Each cover has an entry edge and an exit edge that
   sweep right→left (everything outside moves left). */
let SHAKE = 0;                                    // extra slosh while a train blasts past

const TRX = {
  express:      { t0: 2.2, t1: 9.6, v: 1500, sw: 6.0 },
  goods:        { t0: 2.0, t1: 10.0, v: 1100, sw: null },
  tunnel:       { t0: 2.6, t1: 9.0, v: 900, sw: 5.8 },
  nightExpress: { t0: 2.2, t1: 9.6, v: 1500, sw: 6.0 },
};
/* Screen x of the cover's leading (left) and trailing (right) edges at u. */
function coverEdges(T, u) {
  const lead = W + 40 - T.v * (u - T.t0), len = T.v * (T.t1 - T.t0) - (W + 80);
  return { lead, trail: lead + len + W + 80, len: len + W + 80 };
}
/* Goods train: switch while no coupling gap is on screen. */
const GOODS = { wl: 1620, gap: 70 };
function goodsSwitch() {
  const T = TRX.goods;
  for (let u = 5.8; u < 8; u += 1 / 60) {
    const { lead } = coverEdges(T, u); let clear = lead < A[0] - 40;
    for (let x = lead + GOODS.wl; x < lead + T.v * (T.t1 - T.t0); x += GOODS.wl + GOODS.gap) if (x + GOODS.gap > A[0] - 30 && x < A[2] + 30) clear = false;
    if (clear) return u;
  }
  return 6;
}
TRX.goods.sw = goodsSwitch();

function transition(seg, u) {
  const T = TRX[seg.type], A_ = PASSES[seg.i], B_ = PASSES[seg.i + 1];
  const tA = u, tB = ((u - TR) % L + L) % L;
  if (u < T.sw) drawView(seg.i, tA); else drawView(seg.i + 1, tB);
  const { lead, trail } = coverEdges(T, u);
  const cover = clamp(Math.min((A[2] - lead) / (A[2] - A[0]), (trail - A[0]) / (A[2] - A[0])), 0, 1);
  SHAKE = seg.type === 'tunnel' ? 0 : cover;
  if (seg.type === 'express') train(u, T, lead, trail, false);
  else if (seg.type === 'nightExpress') train(u, T, lead, trail, true);
  else if (seg.type === 'goods') goods(u, T, lead, trail);
  else tunnel(u, T, lead, trail);
  const w = sm((u - (T.sw - 1.5)) / 3), th = mixTheme(THEMES[A_.theme], THEMES[B_.theme], w);
  const dim = seg.type === 'tunnel' ? .75 : .35;
  const thd = { gain: th.gain * (1 + .3 * cover * dim), tint: sumC(th.tint, scaleC(C(.02, .03, 0, .12, .1), cover * dim)), spill: th.spill, spillA: th.spillA * (1 - cover) };
  interior(u, thd, lerp(A_.chai, B_.chai, sm(u / TR)), lerp(A_.steam, B_.steam, sm(u / TR)));
  SHAKE = 0;
}

/* An opposing express: loco first, then blue ICF coaches with barred windows,
   passengers glimpsed inside, all smeared by the closing speed. */
function train(u, T, lead, trail, night) {
  const d = T.v / 30 * .5, CL = 1480, body = mask(0), win = mask(1), band = mask(2);
  const locoL = 1250;
  const draw = (g, fn) => { smear(g, d, fn); };
  // body silhouette: nose slant at the lead, square tail
  draw(body, g => {
    g.beginPath(); g.moveTo(lead + 70, A[1] - 20); g.lineTo(trail, A[1] - 20); g.lineTo(trail, A[3] + 30); g.lineTo(lead, A[3] + 30); g.lineTo(lead + 20, 330); g.closePath(); g.fill();
  });
  const bodyCov = night ? C(0, .06, 0, .56, .5) : C(.02, .06, 0, .56, .3);
  const locoCov = night ? C(.3, .5, 0, .2, .24) : C(.5, .62, 0, .06, .04);
  putM(body, bodyCov);
  // loco: red body, cab windscreen, yellow stripe
  const lm = mask(2);
  draw(lm, g => { g.beginPath(); g.moveTo(lead + 70, A[1] - 20); g.lineTo(lead + locoL, A[1] - 20); g.lineTo(lead + locoL, A[3] + 30); g.lineTo(lead, A[3] + 30); g.lineTo(lead + 20, 330); g.closePath(); g.fill(); });
  putM(lm, locoCov);
  const lw2 = mask(2);
  draw(lw2, g => { g.fillRect(lead + 60, 250, 160, 90); g.fillRect(lead + 300, 262, 110, 70); g.fillRect(lead + 460, 262, 110, 70); });
  putM(lw2, night ? C(.5, .2, 0, 0, 0) : C(.04, .1, 0, .5, .4));
  const ls = mask(2);
  draw(ls, g => { g.fillRect(lead + 10, 540, locoL - 10, 22); g.fillRect(lead + 10, 600, locoL - 10, 8); });
  putM(ls, night ? C(.4, .1, 0, .1, .1) : C(.7, .08, 0, 0, 0));
  // coaches
  const coaches = [];
  for (let x = lead + locoL + 60; x < trail; x += CL + 60) coaches.push(x);
  draw(band, g => { for (const x of coaches) { g.fillRect(x, 500, Math.min(CL, trail - x), 16); } });
  const cream = night ? C(.1, .06, 0, .2, .2) : C(.16, .1, 0, .06, 0);
  putM(band, cream);
  draw(win, g => {
    for (const x of coaches) for (let j = 0; j < 7; j++) { const wx = x + 90 + j * 190; if (wx + 140 > trail) break; g.fillRect(wx, 262, 140, 190); }
    for (let i = 1; i < coaches.length + 1; i++) { const x = (coaches[i] || trail) - 60; g.fillRect(x, A[1] - 20, 60, A[3] - A[1] + 60); }  // vestibules
  });
  putM(win, night ? C(.62, .24, 0, .02, 0) : C(.04, .14, 0, .5, .44));
  // bars across the windows and passengers inside
  const fig = mask(2);
  draw(fig, g => {
    for (let ci = 0; ci < coaches.length; ci++) for (let j = 0; j < 7; j++) {
      const x = coaches[ci], wx = x + 90 + j * 190; if (wx + 140 > trail) break;
      for (const by of [300, 350, 400]) g.fillRect(wx, by, 140, 6);
      const k = ci * 7 + j, r = h01('pax' + k);
      if (r < .7) { const hx = wx + 30 + r * 80; g.beginPath(); g.ellipse(hx, 370, 18, 22, 0, 0, TAU); g.fill(); g.fillRect(hx - 30, 392, 60, 60); }
    }
  });
  putM(fig, night ? C(.2, .3, 0, .3, .3) : C(.1, .14, 0, .4, .3));
  // underframe and wheels, darkest
  const uf = mask(2);
  draw(uf, g => { g.fillRect(lead, 700, trail - lead, 90); });
  putM(uf, night ? C(0, .06, 0, .64, .64) : C(.04, .1, 0, .5, .5));
}

/* Covered goods wagons (BCN): rust boxes with ribs and doors; coupling gaps
   show the view through, so the switch waits for a gap-free moment. */
function goods(u, T, lead, trail) {
  const d = T.v / 30 * .5, box = mask(0), rib = mask(1), txt = mask(2);
  const wagons = []; for (let x = lead; x < trail - 200; x += GOODS.wl + GOODS.gap) wagons.push(x);
  smear(box, d, g => { for (const x of wagons) g.fillRect(x, A[1] - 20, Math.min(GOODS.wl, trail - x), A[3] - A[1] + 60); });
  putM(box, C(.36, .5, 0, .24, .16));
  smear(rib, d, g => { for (const x of wagons) { for (let k = 0; k < 15; k++) { const rx = x + 40 + k * 104; if (rx > trail) break; g.fillRect(rx, A[1] - 20, 9, A[3] - A[1] + 60); } g.fillRect(x, 238, GOODS.wl, 10); g.fillRect(x + 620, 300, 380, 360); } });
  putM(rib, C(.32, .52, 0, .34, .26));
  smear(txt, d, g => { for (const x of wagons) { g.fillRect(x + 150, 420, 200, 14); g.fillRect(x + 150, 446, 150, 14); g.fillRect(x + 1180, 420, 240, 14); } });
  const c = txt.canvas;
  for (const n of PL) { const G = PG[n]; G.save(); G.setTransform(1, 0, 0, 1, 0, 0); G.globalCompositeOperation = 'destination-out'; G.globalAlpha = .85; G.drawImage(c, 0, 0); G.restore(); }
  const uf = mask(2); smear(uf, d, g => { for (const x of wagons) g.fillRect(x, 700, GOODS.wl, 90); }); putM(uf, C(.2, .3, 0, .4, .4));
}

/* A tunnel: the portal's stone ring sweeps in, then darkness with the lining
   rushing by and a lamp niche now and then, then the far portal's light. */
function tunnel(u, T, lead, trail) {
  const inner = new Path2D(); inner.rect(Math.max(-20, lead), A[1] - 20, Math.min(W + 20, trail) - Math.max(-20, lead), A[3] - A[1] + 60);
  if (lead > W + 20 || trail < -20) return;
  put(inner, C(.02, .08, .02, .6, .62));
  withClip(inner, () => {                          // lining courses and lamp niches
    for (const n of ['blue', 'indigo']) { const G = PG[n]; G.save(); G.translate(540, 640); G.scale(1, .45); G.globalCompositeOperation = 'destination-out'; G.fillStyle = radial(G, 0, 0, 60, 520, n === 'blue' ? .3 : .36, 0); G.fillRect(-600, -600, 1200, 1200); G.restore(); }
    add(rect(0, 420, W, 360), rampC([420, 778], [KALL(0), C(.12, .06, 0, 0, 0)]));
    const d = T.v / 30 * .5, m = mask(0), s = T.v * u;
    smear(m, d, g => { for (let k = Math.floor((s - 200) / 240); k < (s + W + 200) / 240; k++) { const x = k * 240 - s + 540; g.fillRect(x, A[1] - 20, 5, A[3] - A[1] + 60); } for (const y of [240, 380, 520, 660]) g.fillRect(-20, y, W + 40, 3); });
    const c = m.canvas; for (const n of ['blue', 'indigo']) { const G = PG[n]; G.save(); G.setTransform(1, 0, 0, 1, 0, 0); G.globalCompositeOperation = 'destination-out'; G.globalAlpha = .4; G.drawImage(c, 0, 0); G.restore(); }
    for (let k = Math.floor((s - 300) / 1350); k < (s + W + 300) / 1350; k++) {
      const x = k * 1350 - s + 540;
      glowC(x, 420, 4, 130, { blue: .5, indigo: .55, green: .1 }, 'destination-out'); glowC(x, 420, 2, 90, { yellow: .3, pink: .12 });
      const lm = mask(1); smear(lm, T.v / 30 * .5, g => g.fillRect(x - 5, 410, 10, 18)); putM(lm, C(.5, .1, 0, 0, 0));
    }
  });
  // portal rings at both edges: dressed stone voussoirs
  for (const [ex, dir] of [[lead, -1], [trail, 1]]) {
    if (ex < -200 || ex > W + 200) continue;
    const ring = new Path2D(); ring.rect(ex + (dir < 0 ? -70 : 0), A[1] - 20, 70, A[3] - A[1] + 60);
    const m = mask(2); smear(m, T.v / 30 * .5, g => g.fill(ring)); putM(m, C(.2, .24, .02, .36, .3));
    const st = mask(2); smear(st, T.v / 30 * .5, g => { for (let y = A[1]; y < A[3] + 20; y += 44) g.fillRect(ex + (dir < 0 ? -70 : 0), y, 70, 4); });
    const c = st.canvas; for (const n of PL) { const G = PG[n]; G.save(); G.setTransform(1, 0, 0, 1, 0, 0); G.globalCompositeOperation = 'destination-out'; G.globalAlpha = .5; G.drawImage(c, 0, 0); G.restore(); }
  }
}
