/* ── the day: passages, transitions, one authoritative program ───────────── */
const THEMES = {
  dawn:   { gain: 1.0,  tint: C(.02, .10, 0, .02, .01), spill: C(.2, .16, 0, 0, 0), spillA: .25 },
  morn:   { gain: .95,  tint: C(.03, .02, 0, 0, 0),     spill: C(.14, .02, 0, 0, 0), spillA: .35 },
  noon:   { gain: .85,  tint: C(.02, 0, 0, 0, 0),       spill: C(.08, 0, 0, 0, 0), spillA: .5 },
  rain:   { gain: 1.1,  tint: C(0, .01, .02, .06, .03), spill: C(0, 0, .04, .04, 0), spillA: .15 },
  dusk:   { gain: 1.0,  tint: C(.16, .14, 0, 0, 0),     spill: C(.4, .26, 0, 0, 0), spillA: .45 },
  night:  { gain: 1.35, tint: C(0, .03, 0, .34, .30),   spill: C(0, 0, 0, .1, .05), spillA: .0 },
};
const PASSES = [
  { id: 'tea',   name: 'Tea garden dawn, Assam',        loops: 3, V: 560, hy: 590, theme: 'dawn',  chai: .92, steam: 1,   view: (tl, P) => viewTea(tl, P) },
  { id: 'river', name: 'Brahmaputra morning',           loops: 3, V: 700, hy: 530, theme: 'morn',  chai: .8,  steam: .55, view: (tl, P) => viewRiver(tl, P) },
  { id: 'noon',  name: 'Plains at noon',                loops: 4, V: 820, hy: 540, theme: 'noon',  chai: .66, steam: 0,   view: (tl, P) => viewNoon(tl, P) },
  { id: 'ghats', name: 'Western Ghats in the rain',     loops: 3, V: 480, hy: 540, theme: 'rain',  chai: .52, steam: 0,   view: (tl, P) => viewGhats(tl, P) },
  { id: 'dusk',  name: 'Deccan sunset near Pune',       loops: 3, V: 640, hy: 575, theme: 'dusk',  chai: .36, steam: 0,   view: (tl, P) => viewDusk(tl, P) },
  { id: 'night', name: 'Night and stars',               loops: 3, V: 600, hy: 600, theme: 'night', chai: .08, steam: 0,   view: (tl, P) => viewNight(tl, P) },
];
const TRANS = ['express', 'goods', 'tunnel', 'tunnel', 'nightExpress'];
const PROG = (() => {
  const out = []; let t = 0;
  PASSES.forEach((P, i) => {
    out.push({ kind: 'pass', i, start: t, end: t + P.loops * L }); t += P.loops * L;
    if (i < TRANS.length) { out.push({ kind: 'tr', i, type: TRANS[i], start: t, end: t + TR }); t += TR; }
  });
  return out;
})();
const PROG_END = PROG[PROG.length - 1].end;          // 1200

function segAt(T) {
  for (const s of PROG) if (T < s.end) return s;
  return PROG[PROG.length - 1];
}
function drawView(i, tl) {
  const P = PASSES[i], jy = 0.9 * knockAt(tl) - 0.4;
  setAll(1, 0, 0, 1, 0, jy);
  P.view(tl, P);
  setAll(1, 0, 0, 1, 0, 0);
}
function drawArt(T) {
  resetPlates();
  const seg = segAt(T);
  if (seg.kind === 'pass') {
    const P = PASSES[seg.i], tl = (T - seg.start) % L;
    drawView(seg.i, tl);
    interior(tl, THEMES[P.theme], P.chai, P.steam);
  } else {
    transition(seg, T - seg.start);
  }
  compose();
}
const SHOTS = PROG.map(s => s.kind === 'pass'
  ? { id: PASSES[s.i].id, start: s.start, end: s.end, readAt: s.start + 20, action: PASSES[s.i].name + ` (${PASSES[s.i].loops} × ${L}s loop)`, transition: 'loop' }
  : { id: 'tr-' + s.type + '-' + s.i, start: s.start, end: s.end, readAt: s.start + TR / 2, action: 'covered switch: ' + s.type, transition: s.type });

