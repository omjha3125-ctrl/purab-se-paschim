
<script>
'use strict';
/* ── frame formats ────────────────────────────────────────────────────────────
   The film is authored on a 1080² stage. This patch widens the canvas to any
   frame (e.g. 1080×1920 portrait, 1920×1080 landscape): the stage is placed at
   (OX, OY) and the coach interior continues around it on its own plates, drawn
   in page space with the same inks, lighting and page-pinned screens, so the
   screen and paper run continuously across the seam. ?fmt=portrait|landscape */
const FMT = new URLSearchParams(location.search).get('fmt') || 'portrait';
const FW = FMT === 'landscape' ? 1920 : 1080, FH = FMT === 'landscape' ? 1080 : 1920;
const OX = (FW - W) / 2, OY = FMT === 'landscape' ? 0 : 420;
canvas.width = FW; canvas.height = FH; canvas.style.width = (FW * 720 / 1080) + 'px'; canvas.style.height = (FH * 720 / 1080) + 'px';

const EG = {}; for (const n of PL) EG[n] = cv(FW, FH).getContext('2d', { willReadFrequently: true });
let LASTTH = THEMES.dusk;
const _interior = interior; interior = function (tl, th, c, s) { LASTTH = th; _interior(tl, th, c, s); };

// paper: the stage's sheet in the middle, mirrored copies outward (seamless)
const PAPER2 = (() => {
  const c = cv(FW, FH), g = c.getContext('2d');
  for (let ty = -1; ty <= 1; ty++) for (let tx = -1; tx <= 1; tx++) {
    const x0 = OX + tx * W, y0 = OY + ty * W;
    if (x0 >= FW || y0 >= FH || x0 + W <= 0 || y0 + W <= 0) continue;
    g.save(); g.translate(x0 + (tx ? W : 0), y0 + (ty ? W : 0)); g.scale(tx ? -1 : 1, ty ? -1 : 1); g.drawImage(paper, 0, 0); g.restore();
  }
  return g.getImageData(0, 0, FW, FH).data;
})();
const THR2 = {};
function buildThr2(n) {
  const sc = screenOf(n), S = sc.S, t = new Uint8Array(FW * FH), r = rngFor('thr2:' + n);
  const R = 16, RX = Math.ceil(R * FW / 1080) + 2, RY = Math.ceil(R * FH / 1080) + 2, nz = new Float32Array(RX * RY);
  for (let i = 0; i < nz.length; i++) nz[i] = r() * 2 - 1;
  for (let y = 0; y < FH; y++) {
    const fy = y / 1080 * R, iy = fy | 0, vy = fy - iy, row = (y % S) * S;
    for (let x = 0; x < FW; x++) {
      const fx = x / 1080 * R, ix = fx | 0, vx = fx - ix, k = iy * RX + ix;
      const m = (nz[k] * (1 - vx) + nz[k + 1] * vx) * (1 - vy) + (nz[k + RX] * (1 - vx) + nz[k + RX + 1] * vx) * vy;
      t[y * FW + x] = clamp(Math.round(sc.th[row + x % S] * 236 + 7 + m * 7 + (r() - 0.5) * 22), 2, 250);
    }
  }
  const flecks = Math.round(FW * FH / 650);
  for (let i = 0; i < flecks; i++) {
    const cx = r() * FW, cy = r() * FH, rad = 0.5 + r() * r() * 2.6, rr = rad * rad;
    for (let y = Math.max(0, Math.floor(cy - rad)); y <= Math.min(FH - 1, Math.ceil(cy + rad)); y++)
      for (let x = Math.max(0, Math.floor(cx - rad)); x <= Math.min(FW - 1, Math.ceil(cx + rad)); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= rr) t[y * FW + x] = 255;
  }
  return t;
}
let frame2 = null;

function withExt(fn) { const keep = {}; for (const n of PL) { keep[n] = PG[n]; PG[n] = EG[n]; } try { fn(); } finally { for (const n of PL) PG[n] = keep[n]; } }
function extension(th) {
  for (const n of PL) { const g = EG[n]; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, FW, FH); g.fillStyle = g.strokeStyle = '#000'; g.lineCap = g.lineJoin = 'round'; }
  const Lc = c => lit(c, th);
  withExt(() => {
    // the wall continues the stage's own ramp (flat to 700, darkening to 1080, stage coords)
    put(rect(0, 0, FW, FH), rampC([0, OY + 700, OY + W, FH], [Lc(BASE.wall), Lc(BASE.wall), Lc(BASE.wallLow), Lc(scaleC(BASE.wallLow, 1.25))]));
    if (FMT === 'landscape') {
      add(rect(0, OY + 968, FW, 5), Lc(scaleC(BASE.revTop, .8))); knock(rect(0, OY + 965, FW, 2), KALL(.5));
      for (const [x0, x1, edge] of [[0, 118, 118], [FW - 118, FW, FW - 118]]) {           // berth partitions
        put(rect(x0, 0, x1 - x0, FH), rampC([0, FH], [Lc(C(.05, .1, 0, .5, .3)), Lc(C(.06, .12, 0, .6, .42))]));
        knock(rect(edge - 2, 0, 4, FH), KALL(.55));
        const st = new Path2D(); for (let y = 60; y < FH; y += 140) { st.moveTo(x0 + 10, y); st.lineTo(x1 - 10, y); }
        strokeCov(st, 1.4, Lc(C(0, .06, 0, .3, .3)));
      }
      const hook = new Path2D(); hook.ellipse(300, 330, 9, 9, 0, 0, TAU); hook.moveTo(300, 330); hook.quadraticCurveTo(318, 370, 296, 382);
      strokeCov(hook, 5, Lc(C(.04, .06, 0, .36, .26))); knock(new Path2D('M296 324 a4 4 0 1 0 1 0'), KALL(.7));
      const ring = new Path2D(); ring.ellipse(1650, 700, 34, 10, 0, 0, TAU);
      strokeCov(ring, 5, Lc(C(.04, .06, 0, .36, .26)));
      strokeCov(pline([[1616, 700], [1616, 640]]), 4, Lc(C(.04, .06, 0, .36, .26))); strokeCov(pline([[1684, 700], [1684, 640]]), 4, Lc(C(.04, .06, 0, .36, .26)));
    } else {
      // above: underside of the upper berth, its steel edge catching light, a shadow on the wall
      put(rect(0, 0, FW, 200), rampC([0, 200], [Lc(C(.06, .12, 0, .62, .46)), Lc(C(.05, .1, 0, .52, .34))]));
      put(rect(0, 196, FW, 16), rampC([196, 212], [Lc(C(.03, .05, 0, .2, .1)), Lc(C(.04, .08, 0, .42, .3))]));
      knock(rect(0, 198, FW, 3), KALL(.7));
      add(rect(0, 212, FW, 70), rampC([212, 282], [Lc(C(.04, .06, 0, .16, .1)), KALL(0)]));
      const chain = new Path2D(); for (let y = 212; y < 330; y += 14) { chain.moveTo(90, y); chain.ellipse(90, y + 6, 3.5, 6, 0, 0, TAU); }
      strokeCov(chain, 2.2, Lc(C(.04, .06, 0, .34, .26)));
      // below: the lower berth, blue rexine with seams, a folded bedroll at one end
      const bt = 1730;
      put(rect(0, bt, FW, FH - bt), rampC([bt, bt + 30, FH], [Lc(C(.04, .08, 0, .34, .16)), Lc(C(.05, .1, .02, .5, .28)), Lc(C(.06, .12, .02, .58, .4))]));
      knock(rect(0, bt + 3, FW, 5), KALL(.45));
      const seams = new Path2D(); for (let x = 180; x < FW; x += 360) { seams.moveTo(x, bt + 16); seams.lineTo(x, FH); }
      seams.moveTo(0, bt + 40); seams.lineTo(FW, bt + 40);
      strokeCov(seams, 1.6, Lc(C(0, .05, 0, .3, .3)));
      add(rect(0, bt - 30, FW, 30), rampC([bt - 30, bt], [KALL(0), Lc(C(.04, .06, 0, .16, .1))]));
      const bx = 640, by = bt + 12;                                          // bedroll: blanket, two sheets, a pillow
      const blanket = cut([[bx, by + 40], [bx + 10, by + 4], [bx + 330, by], [bx + 346, by + 38], [bx + 336, by + 86], [bx + 6, by + 88]], rngFor('pp:blk'), { amp: 2 });
      put(blanket, Lc(C(.36, .36, 0, .28, .14)));
      const bst = new Path2D(); for (let k = 0; k < 4; k++) { bst.moveTo(bx + 20, by + 20 + k * 18); bst.lineTo(bx + 326, by + 18 + k * 18); } strokeCov(bst, 1.2, Lc(C(.1, .14, 0, .1, .06)));
      for (const [dy, w] of [[-34, 300], [-60, 290]]) { const sh = cut([[bx + 16, by + dy + 30], [bx + 20, by + dy + 4], [bx + 16 + w, by + dy + 2], [bx + 24 + w, by + dy + 28], [bx + 14 + w, by + dy + 32]], rngFor('pp:sh' + dy), { amp: 1.5 }); put(sh, Lc(C(.02, .03, 0, .05, 0))); strokeCov(sh, 1.6, Lc(C(0, .04, 0, .2, .12))); }
      const pil = cut([[bx + 60, by - 60], [bx + 70, by - 110], [bx + 240, by - 116], [bx + 262, by - 66], [bx + 160, by - 56]], rngFor('pp:pil'), { amp: 2.5 });
      put(pil, Lc(C(.04, .05, 0, .06, 0))); strokeCov(pil, 2, Lc(C(0, .05, 0, .24, .14)));
    }
  });
}

compose = function () {
  if (!frame2) { frame2 = ctx.createImageData(FW, FH); for (const n of PL) { THR2[n] = buildThr2(n); } }
  extension(LASTTH);
  const o = frame2.data; o.set(PAPER2);
  for (let k = 0; k < PL.length; k++) {
    const a = PG[PL[k]].getImageData(0, 0, W, W).data, e = EG[PL[k]].getImageData(0, 0, FW, FH).data, th = THR2[PL[k]];
    const [mr, mg, mb] = INKM[k], [dx, dy] = OFF[k];
    for (let y = 0; y < FH; y++) {
      const sy = y - dy, inY = sy - OY >= 0 && sy - OY < W;
      for (let x = 0; x < FW; x++) {
        const sx = x - dx; if (sx < 0 || sx >= FW || sy < 0 || sy >= FH) continue;
        const cov = inY && sx - OX >= 0 && sx - OX < W ? a[((sy - OY) * W + (sx - OX)) * 4 + 3] : e[(sy * FW + sx) * 4 + 3];
        if (cov > th[y * FW + x]) { const i = (y * FW + x) * 4; o[i] *= mr; o[i + 1] *= mg; o[i + 2] *= mb; }
      }
    }
  }
  ctx.putImageData(frame2, 0, 0);
};
window.__riso.ready = false;
seek(Number(new URLSearchParams(location.search).get('t')) || 0);
window.__riso.ready = true;
</script>
