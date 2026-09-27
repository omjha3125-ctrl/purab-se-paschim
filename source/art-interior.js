/* ── the coach: wall, window reveal, louvres, bars, sill, kulhad ─────────────
   Camera sits inside the compartment facing the window, eye near y 480.
   O is the opening in the wall plane (near), I the window frame (far); the four
   reveal faces between them give the wall its thickness. The view shows through
   aperture A, crossed by three horizontal steel bars (sleeper class).        */
const O = [58, 66, 1022, 874], I = [100, 108, 980, 792], A = [114, 122, 966, 778];
const LOUVRE = 22;                                  // shutter lowered this far into A
const BARS = [322, 486, 646], BAR_H = 15;
const VP = [540, 470];
const APERTURE = rrect(A[0], A[1] + LOUVRE, A[2], A[3], 20);

/* Neutral daylight colours; a passage's light scales and tints them. */
const BASE = {
  wall: C(.10, .09, 0, .05, 0), wallLow: C(.14, .13, 0, .12, .02),
  revTop: C(.12, .14, 0, .22, .08), revSide: C(.12, .12, 0, .12, .02),
  sill: C(.08, .07, 0, .04, 0), lip: C(.14, .16, 0, .22, .08),
  frame: C(.03, .05, 0, .20, .10), bar: C(.04, .10, .02, .46, .40), barTop: C(.02, .04, 0, .16, .08),
  louvre: C(.05, .07, 0, .24, .10), louvreDark: C(.07, .1, 0, .42, .26),
  cup: C(.64, .54, 0, .16, .04), cupDark: C(.60, .58, 0, .32, .12), cupIn: C(.5, .5, 0, .46, .3),
  chai: C(.46, .34, 0, .22, .05),
};
function lit(c, th) { const o = {}; for (const n of PL) o[n] = clamp((c[n] || 0) * th.gain + (th.tint[n] || 0), 0, 1); return o; }
function mixTheme(a, b, u) { return { gain: lerp(a.gain, b.gain, u), tint: mixC(a.tint, b.tint, u), spill: mixC(a.spill, b.spill, u), spillA: lerp(a.spillA, b.spillA, u) }; }

const KUL = { x: 802, base: 860, rim: 738, rR: 50, rRy: 13, bR: 35, bRy: 9 };
function kulhadBody() {
  const k = KUL, pts = [];
  const prof = [[k.rR, k.rim], [k.rR - 3, k.rim + 30], [k.rR - 8, k.rim + 70], [k.bR + 2, k.base - 12], [k.bR, k.base]];
  for (const [r, y] of prof) pts.push([k.x - r, y]);
  for (let i = 1; i < 8; i++) { const a = Math.PI - i / 8 * Math.PI; pts.push([k.x + Math.cos(a) * k.bR, k.base + Math.sin(a) * k.bRy]); }
  for (let j = prof.length - 1; j >= 0; j--) pts.push([k.x + prof[j][0], prof[j][1]]);
  for (let i = 1; i < 8; i++) { const a = i / 8 * Math.PI; pts.push([k.x + Math.cos(a) * k.rR, k.rim + Math.sin(a) * k.rRy * 0.9]); }
  return cut(pts, rngFor('pp:kulhad'), { amp: 1.1 });
}
const KUL_BODY = kulhadBody();

function interior(tl, th, chaiLevel, steam) {
  const Lc = c => lit(c, th);
  // wall with the opening cut out; darker toward the floor
  const wall = new Path2D(); wall.rect(0, 0, W, W); wall.rect(O[0], O[1], O[2] - O[0], O[3] - O[1]);
  put(wall, rampC([0, 700, W], [Lc(BASE.wall), Lc(BASE.wall), Lc(BASE.wallLow)]), 'evenodd');
  // panel seam and a trim strip below the sill
  add(rect(0, 968, W, 5), Lc(scaleC(BASE.revTop, .8)));
  add(rect(0, 973, W, 3), KALL(0));
  knock(rect(0, 965, W, 2), KALL(.5));
  // reveals: top underside darkest, sides mid, sill top lightest
  put(poly([[O[0], O[1]], [O[2], O[1]], [I[2], I[1]], [I[0], I[1]]]), Lc(BASE.revTop));
  put(poly([[O[0], O[1]], [I[0], I[1]], [I[0], I[3]], [O[0], O[3]]]), rampC([O[1], O[3]], [Lc(BASE.revSide), Lc(scaleC(BASE.revSide, 1.25))]));
  put(poly([[O[2], O[1]], [I[2], I[1]], [I[2], I[3]], [O[2], O[3]]]), rampC([O[1], O[3]], [Lc(BASE.revSide), Lc(scaleC(BASE.revSide, 1.25))]));
  const sillP = poly([[I[0], I[3]], [I[2], I[3]], [O[2], O[3]], [O[0], O[3]]]);
  put(sillP, rampC([I[3], O[3]], [Lc(scaleC(BASE.sill, 1.3)), Lc(BASE.sill)]));
  // light from the view spills onto the sill
  if (th.spillA > 0) {
    const sp = poly([[I[0] + 30, I[3]], [I[2] - 30, I[3]], [O[2] - 60, O[3] - 8], [O[0] + 60, O[3] - 8]]);
    knock(sp, scaleC(KALL(1), th.spillA * .7));
    add(sp, scaleC(th.spill, th.spillA));
  }
  // sill lip
  put(rect(O[0] - 6, O[3], O[2] - O[0] + 12, 20), rampC([O[3], O[3] + 20], [Lc(BASE.sill), Lc(BASE.lip)]));
  knock(rect(O[0] - 6, O[3], O[2] - O[0] + 12, 2), KALL(.6));
  add(rect(O[0] - 6, O[3] + 20, O[2] - O[0] + 12, 7), Lc(scaleC(BASE.wallLow, .9)));
  // edges of the reveal catch light
  strokeKnockLine([[I[0], I[3]], [I[2], I[3]]], 2, .55);
  // aluminium frame: a channel round the aperture
  const fr = new Path2D(); fr.rect(I[0], I[1], I[2] - I[0], I[3] - I[1]); rrect(A[0], A[1], A[2], A[3], 20, fr);
  put(fr, Lc(BASE.frame), 'evenodd');
  strokeCov(rrect(A[0] - 1, A[1] - 1, A[2] + 1, A[3] + 1, 21), 3.2, Lc(C(0, .06, 0, .5, .45)));
  // louvred shutter, lowered a little
  const n = 2, hS = LOUVRE / n;
  for (let i = 0; i < n; i++) {
    const y = A[1] + i * hS;
    put(rect(A[0], y, A[2] - A[0], hS), rampC([y, y + hS], [Lc(BASE.louvre), Lc(BASE.louvreDark)]));
    knock(rect(A[0], y, A[2] - A[0], 1.6), KALL(.55));
  }
  add(rect(A[0], A[1] + LOUVRE, A[2] - A[0], 3), Lc(BASE.louvreDark));
  // bars, fixed into the frame
  for (const y of BARS) {
    const b = rect(A[0] - 10, y - BAR_H / 2, A[2] - A[0] + 20, BAR_H);
    put(b, rampC([y - BAR_H / 2, y + BAR_H / 2], [Lc(BASE.barTop), Lc(BASE.bar), Lc(scaleC(BASE.bar, 1.25))]));
    knock(rect(A[0] - 10, y - BAR_H / 2, A[2] - A[0] + 20, 2.2), KALL(.8));
    for (const x of [A[0] - 4, A[2] + 4]) put(rrect(x - 7, y - 11, x + 7, y + 11, 3), Lc(scaleC(BASE.frame, 1.3)));
  }
  kulhad(tl, th, chaiLevel, steam);
}
function strokeKnockLine(pts, w, a) { strokeKnock(pline(pts), w, a); }
function strokeKnockRect(x0, y0, x1, y1, w, a) { strokeKnock(rrect(x0, y0, x1, y1, 22), w, a); }

function kulhad(tl, th, level, steam) {
  const k = KUL, Lc = c => lit(c, th);
  // contact shadow falls toward us (the light is the window behind the cup)
  const sh = new Path2D(); sh.ellipse(k.x + 4, k.base + 5, k.bR + 18, k.bRy + 5, 0, 0, TAU);
  add(sh, Lc(C(.04, .06, 0, .22, .12)));
  put(KUL_BODY, { ...(() => { const o = {}; const a = Lc(BASE.cup), b = Lc(BASE.cupDark); for (const n of PL) o[n] = { x0: k.x - k.rR, y0: 0, x1: k.x + k.rR, y1: 0, at: [0, .35, .7, 1], as: [b[n], a[n], a[n], b[n] * 1.08] }; return o; })() });
  // rough clay: a few darker rings from the wheel, and grit
  const rings = new Path2D();
  for (const [yy, a] of [[k.rim + 24, .5], [k.rim + 58, .4], [k.rim + 90, .35]]) {
    const u = (yy - k.rim) / (k.base - k.rim), r = lerp(k.rR, k.bR, u) - 2;
    rings.moveTo(k.x - r, yy); rings.quadraticCurveTo(k.x, yy + 7 + a * 4, k.x + r, yy);
  }
  strokeCov(rings, 1.4, Lc(C(.1, .12, 0, .12, .06)));
  const grit = new Path2D(), gr = rngFor('pp:grit');
  for (let i = 0; i < 70; i++) { const u = gr(), y = lerp(k.rim + 16, k.base - 4, u), r = lerp(k.rR, k.bR, u) - 4, x = k.x + (gr() * 2 - 1) * r; grit.moveTo(x + 1, y); grit.arc(x, y, .6 + gr() * .9, 0, TAU); }
  knock(grit, KALL(.35));
  // rim: the opening, dark inside, a lit lip
  const open = new Path2D(); open.ellipse(k.x, k.rim, k.rR - 5, k.rRy - 3, 0, 0, TAU);
  put(open, Lc(BASE.cupIn));
  // chai surface, sloshing with the rail joints
  if (level > 0.02) {
    const y = k.rim + 6 + (1 - level) * 60, rx = lerp(k.bR + 4, k.rR - 7, level), ry = rx * .24;
    const tilt = (0.035 * lwave('pp:slosh', tl, 4, 11, 3) + 0.018 * knockAt(tl) * Math.sin(lw(100) * tl * 0.5)) * (1 + 2.5 * SHAKE) + 0.05 * SHAKE * Math.sin(tl * 9.4);
    const bob = 1.2 * lwave('pp:bob', tl, 5, 13, 3) * (1 + SHAKE);
    withClip(open, () => {
      const s = new Path2D(); s.ellipse(k.x, y + bob, rx, ry, tilt, 0, TAU);
      put(s, Lc(BASE.chai));
      const hl = new Path2D(); hl.ellipse(k.x - rx * .2, y + bob - ry * .35, rx * .55, ry * .28, tilt, 0, TAU);
      knock(hl, KALL(.45));
    });
  }
  const lip = new Path2D(); lip.ellipse(k.x, k.rim, k.rR - 1, k.rRy, 0, Math.PI * 1.02, Math.PI * 1.98);
  strokeKnock(lip, 2.2, .7);
  const lipF = new Path2D(); lipF.ellipse(k.x, k.rim, k.rR - 1, k.rRy, 0, Math.PI * .05, Math.PI * .95);
  strokeCov(lipF, 2, Lc(C(.1, .14, 0, .1, .04)));
  // steam: wisps rising and leaning with the draught from the window
  if (steam > 0.01) {
    for (let j = 0; j < 4; j++) {
      const ph = fract(tl * 5 / L + j / 4 + h01('st' + j) * .1), a = life01(ph, .3) * steam;
      if (a < .01) continue;
      const pts = [], y0 = k.rim - 2, hgt = 150;
      for (let i = 0; i <= 12; i++) {
        const u = i / 12, yy = y0 - u * hgt * (0.4 + ph);
        const xx = k.x + (h01('sx' + j) - .5) * 40 - u * u * 60 * (0.5 + ph) + 10 * Math.sin(u * 5 + tl * lw(7) + j * 2) * u;
        pts.push([xx, yy]);
      }
      const rib = nib(pts, u => (1.5 + 6 * u) * (1 - u * .6), { per: 4 });
      knock(rib, KALL(.28 * a));
    }
  }
}
