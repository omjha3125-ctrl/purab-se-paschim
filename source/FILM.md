# Purab se Paschim (East to West)

20:00, 1080 × 1080, 30 fps, scored. Authoritative source: `index.html`.

## Premise

One day across India through one sleeper-class window. The train leaves the tea gardens of
Assam at dawn and runs west with the sun: the Brahmaputra in the morning, the plains at noon,
the Western Ghats in the afternoon rains, the Deccan near Pune at sunset, and the open country
under stars at night. The window's horizontal steel bars (the unmistakable Indian sleeper-coach
window) sit in front of every view. A clay kulhad of chai rides on the sill; it is full and
steaming at dawn and a little lower in every passage, and empty under the stars. The day is
measured in chai.

Why the ending belongs here: the train chases the sun from where it rises (Assam) to where it
sets (Deccan), and the night that falls is the one the traveller wakes up from at dawn. The
last passage is the quietest, and the kulhad is finally empty.

## Form: a 20-minute ambient loop film

The user asked for 20 minutes built from shorter loops whose repetition isn't noticeable.

- Six passages, each a **seamless 60 s loop**. Every time function in a passage is periodic in
  its local time `tl` with period L = 60 s: the world moves by D = V·L per loop and all
  world-anchored content is periodic in world X with period D (so every depth plane wraps at
  exactly the same instant), all oscillations have integer cycles per loop, clouds drift by a
  whole period, and the kulhad's slosh is a sum of loop-periodic sines.
- Distant ranges beyond parallax 0.03 are static: a screen period p·D below ~1600 px would put
  the same mountain twice in one frame.
- Five **covered transitions** of 12 s each (Window Seat's covered switch): the time of day and
  the place change only while the window is fully covered, by an opposing express, a goods
  train, or a tunnel. The goods wagons have coupling gaps that show the view, so its switch time
  is computed as the first moment near mid-cover with no gap on screen (`goodsSwitch`).
- The kulhad's chai level and steam change only during transitions, eased over the 12 s
  (0.92 → 0.08 across the day), so every loop stays exact. A passing train adds slosh (`SHAKE`). Passage A keeps running under the cover from its loop start; passage B
  arrives exactly at its loop start, so both seams are exact.
- The HTML is a real 20-minute film: `seek(T)` maps global time to (passage, loop time) or
  (transition, u). Because each loop is exactly periodic, the MP4 is assembled by rendering one
  instance of each loop and each transition and concatenating them; the result is frame-
  identical to rendering all 36,000 frames.
- The score is **not** looped: it is rendered per passage at full length with seeded
  variation, so the ear never hears a repeat.

| # | Passage | Hour | Loops | Place and what happens |
|---|---|---|---|---|
| 1 | Tea garden dawn | ~5:45 | 3 | Assam: pink-gold dawn, blue Meghalaya hills, mist in the rows, tall thin shade trees over flat-topped tea bushes, pluckers with baskets, egrets lifting. Steam from the full kulhad. |
| T1 | Opposing express | | 12 s | Blue ICF coaches with open windows and faces rush past. |
| 2 | Brahmaputra morning | ~8:30 | 3 | Flood plain with the wide river, sandbars (chars), country boats, bamboo clumps, egrets. |
| T2 | Goods train | | 12 s | Brown BOXN wagons. |
| 3 | Plains at noon | ~12:30 | 4 | Paddy squares with water glints, toddy palms, a village with a small temple shikhara, cumulus towers. |
| T3 | Tunnel | | 12 s | Into the Ghats. |
| 4 | Western Ghats rain | ~15:30 | 3 | Monsoon green; stepped basalt scarps, a tall waterfall in tiers, cloud in the valley, the train on a ledge. |
| T4 | Tunnel | | 12 s | Out onto the plateau. |
| 5 | Deccan sunset | ~18:15 | 3 | Flat-topped fort hill, reservoir reflecting the sun, jowar fields, a banyan, birds going home. |
| T5 | Night express | | 12 s | Lit windows streaming past in the dusk. |
| 6 | Night & stars | ~21:30 | 3 | Indigo sky full of stars, crescent moon, dark fields, a village's lamps, fireflies. Kulhad empty. |

Total: 19 loops × 60 s + 5 × 12 s = 1200 s.

## Composition and print

- Fixed camera inside the coach, facing the window. Coach wall (pale blue laminate, overprint
  shadow) frames the aperture; three horizontal steel bars cross the view at fixed rows; the
  sill carries the kulhad at lower right. The wall and bars are the fixed anchor and the one
  cropped foreground occluder in every frame.
- Five plates: yellow, pink, green, blue, indigo (live plates, Window Seat's compositor).
  Orange comes from yellow+pink, dark greens from green+blue, night from blue+indigo. No black.
- Horizon at y ≈ 560 inside the window; ground in true perspective (ground parallax grows
  linearly below the horizon), so fields fan toward a vanishing point.

## Clocks

- V_near: world units/s per passage (plains faster, Ghats slower on the gradient).
- Rail joints: a knock every 0.6 s (100 per loop), shaking the view 1 px and the chai surface.

## Build notes

- Sources: `art-*.js` are the working files; `build.py` inlines them between the ART markers so
  `index.html` stays one self-contained file. `index.html` is authoritative for delivery.
- Style settled after several passes on the Ghats hero frame: crisp layered silhouettes with lit
  rim strokes (Window Seat's poster language), few blurred hazes; a warm cream coach wall; a thin
  lowered shutter; three steel bars that every composition is laid out around.
- The in-page player plays live (it cannot buffer 36,000 frames) and has a passage menu; it is
  silent. The MP4 carries the score.

## Sound direction

First built as a raga-of-the-hour score (tanpura, bansuri, santoor). The user heard the draft
and asked for **no music, only sound effects that give a satisfying train-travel feel**, so the
music was removed (its code remains in `art-score.js`, unused).

The soundtrack is now the journey itself:
- **Rail joints:** "ta-dak" pairs on the picture's own 0.6 s grid (the same `knockAt` clock
  that shakes the view and the chai), each hit synthesised individually with seeded variation
  in level, pitch and timing (±3 ms), 8% heavier joints. Louder and more reverberant in tunnels.
- **Roll:** steel-on-steel band noise, the carriage body's low rumble, a faint singing of the rails.
- **Window:** gusty wind through the open barred window, stronger at speed.
- **Coach:** loose fittings ticking; the kulhad clinking on the sill now and then (more when a
  train blasts past).
- **Outside:** dawn birds, river lap and drops, noon cicadas, monsoon rain and falls, a distant
  temple bell and birds at sunset, crickets at night.
- **Transitions:** passing express with a two-tone horn falling in pitch, wheelset clatter and
  roar; goods train heavier and slower; tunnel pressure thump, darker roar, whoosh out.
- Rendered per chapter (passage + transition) at full length, never looped; beds hand over with
  0.5 s crossfades; joint clicks never double at seams (global 0.6 s grid). Mastered to −18 LUFS.

## References and honesty

Reference photos could not be downloaded in this workspace (network allowlist). Shapes are
drawn from general knowledge of the subjects: ICF sleeper windows with horizontal bars;
Albizia shade trees over flat-pruned tea; Dudhsagar-type tiered falls on the Ghats; Sinhagad-
type flat-topped Deccan trap hills with stepped strata. Treat these as informed stylisation,
not observed studies.

## Risks

- 60 s loops played 3–4 times: a very attentive viewer may notice a landmark returning.
  Mitigation: distinctive features placed once per loop, non-looped score.
- Render cost: ~10,800 loop frames + 1,800 transition frames on 2 cores.

## Verification

- `verify.mjs`: seek pure in t at 11 program times; Chromium only (Firefox unavailable in the
  build workspace; the tool's Firefox pass fell back to Chromium).
- Loop exactness (custom check): for every passage, frames at tl = 0, 13.4, 59.9 are
  pixel-identical to the same tl one loop later; every transition's first frame is identical to
  its passage's loop start and its last to the next passage's loop start. Frame change across
  each loop wrap is in the range of ordinary adjacent frames.
- Final MP4: 1200.000 s, 36,000 frames, 1080 × 1080 h264 (CRF 28 per unique segment, stream-
  copy concat), AAC 192 kb/s 48 kHz stereo, 979 MB. Full decode succeeded.
- Pop scan (quality-bar recipe, all 36,000 frames at 180 px): 0 hits, 0 hard cuts. Seam frames
  change about 2× their local median (each segment starts on a keyframe) but stay far under the
  pop threshold.
- Audio: I −20.1 LUFS, LRA 3.2 LU, TP −1.8 dBTP. A look-ahead limiter (assembly) touched 13%
  of the film, up to 7.4 dB, mostly heavy joint hits and the tunnels. Chapter handoffs are
  within ~2 dB of their surroundings (no dropouts); tunnels swell ~8 dB by design.
- Inspected: hero frames of all six passages at 1:1 and reduced; strips through all five
  transitions; a contact sheet of the final MP4. Nobody has listened: levels and spectra were
  measured, not heard. Listen at 0:30 (dawn), 3:02 (express horn), 10:26 (tunnel), 11:10 (rain),
  18:30 (night crickets).

## Remaining weaknesses

- Tea rows read as stylised stripes more than individual bushes; pluckers are tiny.
- The Ghats' lower slope is still a broad single green; the scarp reads small at display size.
- Tunnel interiors are mostly flat dark for ~5 s.
- The night's window-light patches on the embankment read a little like teeth.
- 60 s loops play 3–4 times; a very attentive viewer can notice a landmark (the temple, the
  banyan, the big falls) returning.
- The soundtrack is synthesised; its realism is unjudged by ear. The unused music code is still
  in `art-score.js`.
