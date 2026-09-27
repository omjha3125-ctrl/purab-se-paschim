/* ── sound kit (studies/sound.html; rain→rainSnd, paper→paperSnd, Window Seat impulse) ── */
const RATE = 48000;
const TINY = 1e-4;                       // exponential ramps cannot reach 0
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 'F#3' -> 54. Octave 4 holds middle C. */
const note = (name) => {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  return 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};
const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10], minor: [0, 2, 3, 5, 7, 8, 10], pentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10], wholeTone: [0, 2, 4, 6, 8, 10],
};
/** Scale degree (0-based, any octave, negative allowed) to midi. */
const degree = (root, mode, d) => {
  const steps = MODES[mode], n = steps.length, oct = Math.floor(d / n), i = ((d % n) + n) % n;
  return root + oct * 12 + steps[i];
};
/** Beat grid: g.at(beat) is the film time of a beat; g.beat is one beat in seconds. */
const grid = (bpm, offset = 0) => ({ bpm, beat: 60 / bpm, at: (b) => offset + b * 60 / bpm, quantise: (t) => offset + Math.round((t - offset) * bpm / 60) * 60 / bpm });

/** Build one score. duration is the film's DUR; the buffer is exactly that long. */
function Score({ duration, rate = RATE, key = 'score', room = {} } = {}) {
  const ac = new OfflineAudioContext(2, Math.ceil(rate * duration), rate);
  const s = { ac, rate, duration, key, buffers: new Map(), stats: null };

  // Buses. The master carries only a rumble filter; loudness is set after render
  // with one static gain, because DynamicsCompressor differs between engines.
  s.master = ac.createGain();
  const rumble = ac.createBiquadFilter(); rumble.type = 'highpass'; rumble.frequency.value = 28; rumble.Q.value = .5;
  s.master.connect(rumble).connect(ac.destination);
  s.bus = {};
  for (const name of ['bed', 'fore', 'fx']) { const g = ac.createGain(); g.connect(s.master); s.bus[name] = g; }

  // Reverb: synthesised IR, normalize off so the wet level is ours. The send is
  // high-passed so bass stays dry and centred; the return is low-passed so the
  // tail does not accumulate hiss over a long film.
  const verb = ac.createConvolver(); verb.normalize = false; verb.buffer = impulse(s, key + ':room', room);
  const sendIn = ac.createBiquadFilter(); sendIn.type = 'highpass'; sendIn.frequency.value = room.sendHighpass ?? 180;
  const ret = ac.createBiquadFilter(); ret.type = 'lowpass'; ret.frequency.value = room.returnLowpass ?? 6500; ret.Q.value = .4;
  s.wet = ac.createGain(); s.wet.gain.value = room.wet ?? .28;
  sendIn.connect(verb).connect(ret).connect(s.wet).connect(s.master);
  s.sendIn = sendIn;

  /** Pan and route a node. x is a screen coordinate 0..W; pan overrides it. */
  s.place = (node, { pan = null, x = null, send = .3, bus = 'fore' } = {}) => {
    const p = ac.createStereoPanner();
    p.pan.value = pan !== null ? clamp(pan, -1, 1) : x !== null ? clamp((x - W / 2) / (W / 2), -1, 1) * .7 : 0;
    node.connect(p).connect(s.bus[bus]);
    if (send > 0) { const g = ac.createGain(); g.gain.value = send; p.connect(g).connect(sendIn); }
    return p;
  };

  /** Seeded noise, cached per key. color: white | pink | brown. */
  s.noise = (key, seconds, color = 'white') => {
    const k = `${key}|${seconds}|${color}`;
    if (s.buffers.has(k)) return s.buffers.get(k);
    const n = Math.ceil(seconds * rate), b = ac.createBuffer(1, n, rate), d = b.getChannelData(0), r = rngFor(key);
    let b0 = 0, b1 = 0, b2 = 0, low = 0;
    for (let i = 0; i < n; i++) {
      const w = r() * 2 - 1;
      if (color === 'white') d[i] = w;
      else if (color === 'brown') { low = (low + .02 * w) / 1.02; d[i] = low * 3.5; }
      else { b0 = .99765 * b0 + w * .0990460; b1 = .96300 * b1 + w * .2965164; b2 = .57000 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * .1848) * .11; }
    }
    s.buffers.set(k, b);
    return b;
  };

  /** Click-safe envelope on a gain param: linear attack from silence, hold, exponential release. */
  s.env = (param, at, { attack = .01, hold = 0, release = .3, peak = .1, end = null } = {}) => {
    const a = Math.max(attack, .003), stop = end ?? at + a + hold + release;
    param.setValueAtTime(TINY, at);
    param.linearRampToValueAtTime(Math.max(peak, TINY), at + a);
    if (hold > 0) param.setValueAtTime(Math.max(peak, TINY), at + a + hold);
    param.exponentialRampToValueAtTime(TINY, Math.min(stop, duration));
    return Math.min(stop, duration);
  };

  /** Rounded swell (sin^2 rise, sin^2 fall) peaking at fraction `peakAt` of dur. Owns its param. */
  s.swell = (param, at, dur, peak, peakAt = .45) => {
    const n = 128, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const u = i / (n - 1), v = u < peakAt ? u / peakAt : (1 - u) / (1 - peakAt); curve[i] = TINY + peak * Math.pow(Math.sin(v * Math.PI / 2), 2); }
    param.setValueCurveAtTime(curve, at, Math.max(.01, Math.min(dur, duration - at - .001)));
  };

  /** An oscillator that stops after its envelope; returns the gain node to route. */
  s.osc = (type, freq, at, stop, { detune = 0 } = {}) => {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune;
    o.start(at); o.stop(Math.min(duration, stop + .05));
    return o;
  };

  /** A buffer source that stops after `stop`. */
  s.play = (buffer, at, stop, { offset = 0, rate: pr = 1, loop = false } = {}) => {
    const src = ac.createBufferSource(); src.buffer = buffer; src.loop = loop; src.playbackRate.value = pr;
    src.start(at, offset); src.stop(Math.min(duration, stop + .05));
    return src;
  };

  /**
   * Render, then scale once to `target` LUFS, pulling back if the true peak
   * would pass `ceiling` dBTP. s.stats records what was measured and applied.
   */
  s.render = async ({ target = -16, ceiling = -1 } = {}) => {
    const buf = await ac.startRendering();
    const chs = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
    const lufs = integratedLufs(chs, rate);
    let gain = Number.isFinite(lufs) ? Math.pow(10, (target - lufs) / 20) : 1;
    const tp = truePeakLinear(chs) * gain, tpDb = 20 * Math.log10(Math.max(tp, 1e-9));
    if (tpDb > ceiling) gain *= Math.pow(10, (ceiling - tpDb) / 20);
    for (const d of chs) for (let i = 0; i < d.length; i++) d[i] *= gain;
    s.stats = { measuredLufs: lufs, gainDb: 20 * Math.log10(gain), deliveredLufs: lufs + 20 * Math.log10(gain), truePeakDb: 20 * Math.log10(Math.max(tp / (tpDb > ceiling ? Math.pow(10, (tpDb - ceiling) / 20) : 1), 1e-9)) };
    return buf;
  };
  return s;
}

/** Synthesised room: pre-delay, a few early taps, then a noise tail that darkens as it decays. */
function impulse(s, key, { seconds = 2.2, decay = .6, predelay = .015, early = [[.007, .6], [.013, .45], [.021, .35], [.029, .28], [.037, .2]], damp = .65 } = {}) {
  const rate = s.rate, n = Math.ceil(rate * (seconds + predelay)), b = s.ac.createBuffer(2, n, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch), r = rngFor(`${key}:${ch}`), start = Math.floor(predelay * rate);
    let lp = 0;
    for (let i = start; i < n; i++) {
      const t = (i - start) / rate, a = lerp(.15, damp + .3, clamp(t / seconds, 0, 1));   // one-pole lowpass closing over the tail
      lp = lp * a + (r() * 2 - 1) * (1 - a);
      d[i] = lp * Math.exp(-t / (decay * .45)) * Math.min(1, t / .004);
    }
    early.forEach(([t, g], k) => { const i = Math.floor((t + (ch ? .0011 * (k % 2) : 0)) * rate); if (i < n) d[i] += g * (k % 2 ? -1 : 1); });
    let e = 0; for (let i = 0; i < n; i++) e += d[i] * d[i];
    const norm = .85 / Math.sqrt(e); for (let i = 0; i < n; i++) d[i] *= norm;   // Window Seat's normalisation
  }
  return b;
}

/* Loudness inside the page, so a film can normalise itself; tools/lib/audio.mjs
   is the reference implementation and audio.mjs verifies the result. */
function integratedLufs(chs, rate) {
  const K = Math.tan(Math.PI * 1681.974450955533 / rate), Vh = Math.pow(10, 3.999843853973347 / 20), Vb = Math.pow(Vh, .4996667741545416), Q = .7071752369554196, a0 = 1 + K / Q + K * K;
  const shelf = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0];
  const K2 = Math.tan(Math.PI * 38.13547087602444 / rate), Q2 = .5003270373238773, a02 = 1 + K2 / Q2 + K2 * K2;
  const hp = [1, -2, 1, 2 * (K2 * K2 - 1) / a02, (1 - K2 / Q2 + K2 * K2) / a02];
  const filt = (x, [b0, b1, b2, a1, a2]) => { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
  const k = chs.map(c => filt(filt(c, shelf), hp)), w = Math.round(.4 * rate), h = Math.round(.1 * rate), blocks = [];
  for (let st = 0; st + w <= k[0].length; st += h) { let z = 0; for (const c of k) { let acc = 0; for (let i = st; i < st + w; i++) acc += c[i] * c[i]; z += acc / w; } blocks.push(z); }
  const lufs = (z) => -.691 + 10 * Math.log10(Math.max(z, 1e-20));
  const abs = blocks.filter(z => lufs(z) > -70); if (!abs.length) return -Infinity;
  const rel = lufs(abs.reduce((a, b) => a + b, 0) / abs.length) - 10, kept = abs.filter(z => lufs(z) > rel);
  return kept.length ? lufs(kept.reduce((a, b) => a + b, 0) / kept.length) : -Infinity;
}
function truePeakLinear(chs) {
  const L = 4, taps = 48, h = []; for (let m = 0; m < taps; m++) { const x = (m - 23.5) / L; h.push((x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)) * (.42 - .5 * Math.cos(2 * Math.PI * m / 47) + .08 * Math.cos(4 * Math.PI * m / 47))); }
  const ph = Array.from({ length: L }, (_, p) => { const v = []; for (let k = 0; k < 12; k++) v.push(h[k * L + p]); const sum = v.reduce((a, b) => a + b, 0); return v.map(x => x / sum); });
  let peak = 0;
  for (const c of chs) for (let i = 0; i < c.length; i++) for (let p = 0; p < L; p++) { let acc = 0; for (let k = 0; k < 12; k++) { const j = i - k + 6; if (j >= 0 && j < c.length) acc += ph[p][k] * c[j]; } if (Math.abs(acc) > peak) peak = Math.abs(acc); }
  return peak;
}

/** Base64 16-bit stereo WAV of an AudioBuffer: the renderAudio() return value. */
function wavBase64(buf) {
  const n = buf.length, bytes = 44 + n * 4, dv = new DataView(new ArrayBuffer(bytes));
  const ascii = (o, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i)); };
  ascii(0, 'RIFF'); dv.setUint32(4, bytes - 8, true); ascii(8, 'WAVEfmt '); dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true); dv.setUint16(22, 2, true); dv.setUint32(24, buf.sampleRate, true);
  dv.setUint32(28, buf.sampleRate * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true);
  ascii(36, 'data'); dv.setUint32(40, n * 4, true);
  const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  for (let i = 0; i < n; i++) { dv.setInt16(44 + i * 4, Math.round(clamp(L[i], -1, 1) * 32767), true); dv.setInt16(46 + i * 4, Math.round(clamp(R[i], -1, 1) * 32767), true); }
  const u8 = new Uint8Array(dv.buffer); let str = '';
  for (let i = 0; i < u8.length; i += 0x8000) str += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(str);
}

/* Instruments. `o.hit` places the peak; otherwise `at` is the onset. */
const onset = (at, o, attack) => o.hit !== undefined ? o.hit - attack : at;

/** Sustained chord: detuned voices through a lowpass that opens slowly. Bed bus by default. */
function pad(s, at, end, notes, o = {}) {
  const { level = .05, attack = 1, release = 1.4, cutoff = 1400, open = 600, type = 'triangle', spread = .8, send = .5, bus = 'bed' } = o;
  const env = s.ac.createGain(), f = s.ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = .4;
  f.frequency.setValueAtTime(cutoff, at); f.frequency.linearRampToValueAtTime(cutoff + open, at + attack * 1.6);
  env.gain.setValueAtTime(TINY, at); env.gain.linearRampToValueAtTime(level, at + attack);
  env.gain.setValueAtTime(level, Math.max(at + attack, end - release)); env.gain.linearRampToValueAtTime(TINY, Math.min(end, s.duration));
  f.connect(env); s.place(env, { send, bus, pan: 0 });
  notes.forEach((n, i) => [-5, 5].forEach((det, j) => {
    const p = s.ac.createStereoPanner(); p.pan.value = notes.length > 1 ? (i / (notes.length - 1) - .5) * spread : 0;
    const g = s.ac.createGain(); g.gain.value = j ? .55 : .45;
    s.osc(j ? 'sine' : type, hz(n), at, end, { detune: det }).connect(g).connect(p).connect(f);
  }));
}

/** Additive struck tone. partials: [ratio, amplitude, decay seconds]. strike adds a noise contact. */
function struck(s, at, midi, partials, o = {}) {
  const { level = .1, attack = .004, pan = 0, x = null, send = .45, strike = 0, strikeHz = 3000, bus = 'fore' } = o;
  const t0 = onset(at, o, attack), f0 = hz(midi), sum = s.ac.createGain(); sum.gain.value = 1;
  let longest = 0;
  partials.forEach(([ratio, amp, decay]) => {
    const g = s.ac.createGain(); const stop = s.env(g.gain, t0, { attack, release: decay, peak: level * amp }); longest = Math.max(longest, stop);
    s.osc('sine', f0 * ratio, t0, stop).connect(g).connect(sum);
  });
  if (strike > 0) {                       // 3 ms of filtered noise is what reads as contact
    const g = s.ac.createGain(), f = s.ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = strikeHz; f.Q.value = 1.2;
    s.env(g.gain, t0, { attack: .001, release: .012, peak: level * strike });
    s.play(s.noise(s.key + ':strike', .05), t0, t0 + .03).connect(f).connect(g).connect(sum);
  }
  s.place(sum, { pan: x === null ? pan : null, x, send, bus });
  return longest;
}
const mallet = (s, at, midi, o = {}) => struck(s, at, midi, [[1, 1, o.decay ?? .9], [3.93, .28, .25], [9.72, .08, .1]], { strike: .5, strikeHz: 2600, ...o });
const glass = (s, at, midi, o = {}) => struck(s, at, midi, [[1, 1, o.decay ?? 1.7], [2.001, .12, 1.1], [3.98, .03, .6]], { attack: .02, ...o });
const bell = (s, at, midi, o = {}) => struck(s, at, midi, [[1, 1, o.decay ?? 3], [1.5, .35, 2.2], [2, .5, 2.6], [2.4, .25, 1.8], [3, .3, 1.6], [4.2, .14, 1.1], [5.4, .08, .8]], { attack: .003, strike: .25, strikeHz: 5000, ...o });
const musicBox = (s, at, midi, o = {}) => struck(s, at, midi, [[1, 1, o.decay ?? .6], [2, .2, .3], [3, .12, .2]], { attack: .002, strike: .35, strikeHz: 4200, ...o });

/** Plucked string, Karplus-Strong written straight into a buffer so the recurrence is exact. */
function pluck(s, at, midi, o = {}) {
  const { level = .12, dur = 1.6, bright = .5, damp = .996, pan = 0, x = null, send = .35, bus = 'fore', key = 'pluck' } = o;
  const t0 = onset(at, o, .002), rate = s.rate, N = Math.max(2, Math.round(rate / hz(midi))), n = Math.ceil(rate * dur);
  const b = s.ac.createBuffer(1, n, rate), d = b.getChannelData(0), r = rngFor(`${s.key}:${key}:${midi}:${at.toFixed(3)}`);
  let lp = 0;
  for (let i = 0; i < N; i++) { const w = r() * 2 - 1; lp = lp * (1 - bright) + w * bright; d[i] = lp; }   // pick brightness
  for (let i = N; i < n; i++) d[i] = damp * .5 * (d[i - N] + d[i - N - 1 < 0 ? 0 : i - N - 1]);
  const g = s.ac.createGain(); g.gain.setValueAtTime(TINY, t0); g.gain.linearRampToValueAtTime(level, t0 + .002);
  g.gain.setValueAtTime(level, t0 + dur - .12); g.gain.linearRampToValueAtTime(TINY, t0 + dur);
  s.play(b, t0, t0 + dur).connect(g); s.place(g, { pan: x === null ? pan : null, x, send, bus });
}

/** Two-operator FM: ratio 1 with a falling index is an electric piano, 3.5-7 is a bell. */
function fm(s, at, midi, o = {}) {
  const { level = .1, ratio = 1, index = 4, indexEnd = .6, indexDecay = .25, attack = .004, release = 1.4, pan = 0, x = null, send = .4, bus = 'fore', lowpass = 0 } = o;
  const t0 = onset(at, o, attack), f0 = hz(midi), g = s.ac.createGain();
  const stop = s.env(g.gain, t0, { attack, release, peak: level });
  const car = s.osc('sine', f0, t0, stop), mod = s.osc('sine', f0 * ratio, t0, stop), depth = s.ac.createGain();
  depth.gain.setValueAtTime(f0 * index, t0); depth.gain.exponentialRampToValueAtTime(Math.max(f0 * indexEnd, TINY), t0 + indexDecay);
  mod.connect(depth).connect(car.frequency);
  if (lowpass) { const f = s.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass; car.connect(f).connect(g); } else car.connect(g);
  s.place(g, { pan: x === null ? pan : null, x, send, bus });
}

/** Additive organ held from at to end. drawbars: [ratio, amplitude]. */
function organ(s, at, end, midi, o = {}) {
  const { level = .05, attack = .06, release = .12, drawbars = [[.5, .5], [1, 1], [2, .6], [3, .3], [4, .25], [6, .1], [8, .06]], pan = 0, send = .5, bus = 'bed' } = o;
  const g = s.ac.createGain(); g.gain.setValueAtTime(TINY, at); g.gain.linearRampToValueAtTime(level, at + attack);
  g.gain.setValueAtTime(level, Math.max(at + attack, end - release)); g.gain.linearRampToValueAtTime(TINY, Math.min(end, s.duration));
  const norm = 1 / drawbars.reduce((a, [, amp]) => a + amp, 0);
  drawbars.forEach(([ratio, amp]) => { const v = s.ac.createGain(); v.gain.value = amp * norm; s.osc('sine', hz(midi) * ratio, at, end).connect(v).connect(g); });
  s.place(g, { pan, send, bus });
}

/** Sub bass: sine with a short pitch drop, centred and dry. */
function sub(s, at, midi, o = {}) {
  const { level = .09, attack = .03, release = 1.2, drop = 12 } = o;
  const t0 = onset(at, o, attack), g = s.ac.createGain(), stop = s.env(g.gain, t0, { attack, release, peak: level });
  const osc = s.osc('sine', hz(midi + drop), t0, stop); osc.frequency.exponentialRampToValueAtTime(hz(midi), t0 + .04);
  osc.connect(g); s.place(g, { pan: 0, send: 0, bus: 'bed' });
}

/** Clock tick: a millisecond of noise through a narrow band. Alternate `freq` for tick-tock. */
function tick(s, at, o = {}) {
  const { level = .08, freq = 4200, q = 9, decay = .012, pan = 0, send = .15 } = o;
  const g = s.ac.createGain(), f = s.ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  s.env(g.gain, at, { attack: .0008, release: decay, peak: level });
  s.play(s.noise(s.key + ':tick', .1), at, at + decay + .01).connect(f).connect(g); s.place(g, { pan, send, bus: 'fx' });
}

/** Band-swept noise following a motion: from -> to Hz, loudest at `peakAt` of dur. A whoosh or a breath. */
function breath(s, at, dur, o = {}) {
  const { level = .08, from = 420, to = 1000, back = null, q = .5, peakAt = .42, pan = 0, x = null, send = .5, color = 'pink', key = 'breath' } = o;
  const g = s.ac.createGain(), f = s.ac.createBiquadFilter(), soft = s.ac.createBiquadFilter();
  f.type = 'bandpass'; f.Q.value = q; soft.type = 'lowpass'; soft.frequency.value = 2400; soft.Q.value = .4;
  f.frequency.setValueAtTime(from, at); f.frequency.exponentialRampToValueAtTime(to, at + dur * peakAt);
  f.frequency.exponentialRampToValueAtTime(back ?? from, at + dur);
  s.swell(g.gain, at, dur, level, peakAt);
  s.play(s.noise(`${s.key}:${key}`, dur + .1, color), at, at + dur).connect(f).connect(soft).connect(g);
  s.place(g, { pan: x === null ? pan : null, x, send, bus: 'fx' });
}

/** Wind from at to end: bandpassed noise whose centre and level wander on a seeded slow walk. */
function wind(s, at, end, o = {}) {
  const { level = .06, centre = 520, sweep = 320, gust = .6, whistle = .12, pan = 0, send = .35, key = 'wind', rise = 1.5, fall = 1.5 } = o;
  const dur = end - at, rate = s.rate;
  // The slow walk is a buffer, so the gusts are as seeded as everything else.
  const walk = s.ac.createBuffer(1, Math.ceil(rate * dur), rate), d = walk.getChannelData(0), r = rngFor(`${s.key}:${key}:walk`);
  let v = 0, target = 0, k = 0;
  for (let i = 0; i < d.length; i++) { if (k-- <= 0) { target = r() * 2 - 1; k = Math.floor(rate * (.4 + r() * 1.4)); } v += (target - v) * 1.5e-5; d[i] = v; }
  const walkSrc = s.play(walk, at, end), toHz = s.ac.createGain(), toGain = s.ac.createGain();
  toHz.gain.value = sweep; toGain.gain.value = gust * level;
  const f = s.ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = centre; f.Q.value = .9;
  const g = s.ac.createGain(); g.gain.setValueAtTime(TINY, at); g.gain.linearRampToValueAtTime(level, at + rise);
  g.gain.setValueAtTime(level, Math.max(at + rise, end - fall)); g.gain.linearRampToValueAtTime(TINY, Math.min(end, s.duration));
  walkSrc.connect(toHz).connect(f.frequency); walkSrc.connect(toGain).connect(g.gain);
  s.play(s.noise(`${s.key}:${key}`, Math.min(dur, 8), 'brown'), at, end, { loop: true }).connect(f).connect(g);
  if (whistle > 0) { const w = s.ac.createBiquadFilter(); w.type = 'bandpass'; w.frequency.value = centre * 4; w.Q.value = 4; const wg = s.ac.createGain(); wg.gain.value = whistle; f.connect(w).connect(wg).connect(g); }
  s.place(g, { pan, send, bus: 'fx' });
}

/** Rain from at to end: seeded droplet ticks through resonators over a low wash. */
function rainSnd(s, at, end, o = {}) {
  const { level = .05, density = 260, wash = .5, bright = 4200, pan = 0, send = .3, key = 'rain', rise = 1, fall = 1 } = o;
  const dur = end - at, rate = s.rate, n = Math.ceil(rate * dur), b = s.ac.createBuffer(1, n, rate), d = b.getChannelData(0), r = rngFor(`${s.key}:${key}`);
  for (let count = Math.floor(density * dur); count > 0; count--) {
    const i0 = Math.floor(r() * n), f = 1800 + r() * 4200, decay = rate * (.004 + r() * .01), amp = .25 + r() * .75, len = Math.min(n - i0, Math.floor(decay * 5));
    for (let i = 0; i < len; i++) d[i0 + i] += amp * Math.sin(i / rate * f * 2 * Math.PI) * Math.exp(-i / decay);
  }
  const g = s.ac.createGain(); g.gain.setValueAtTime(TINY, at); g.gain.linearRampToValueAtTime(level, at + rise);
  g.gain.setValueAtTime(level, Math.max(at + rise, end - fall)); g.gain.linearRampToValueAtTime(TINY, Math.min(end, s.duration));
  const f = s.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = bright * 1.8; f.Q.value = .5;
  s.play(b, at, end).connect(f).connect(g);
  if (wash > 0) { const w = s.ac.createBiquadFilter(); w.type = 'lowpass'; w.frequency.value = bright * .5; const wg = s.ac.createGain(); wg.gain.value = wash * .5; s.play(s.noise(`${s.key}:${key}:wash`, Math.min(dur, 6), 'pink'), at, end, { loop: true }).connect(w).connect(wg).connect(g); }
  s.place(g, { pan, send, bus: 'fx' });
}

/** Water drop: a contact tick and a rising chirp (Farnell's bubble). Lower `f0` is a bigger drop. */
function drop(s, at, o = {}) {
  const { level = .1, f0 = 900, rise = 1.8, dur = .11, pan = 0, x = null, send = .5, tick: tk = .3 } = o;
  const t0 = onset(at, o, .002), rate = s.rate, n = Math.ceil(rate * dur), b = s.ac.createBuffer(1, n, rate), d = b.getChannelData(0);
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / rate; ph += 2 * Math.PI * f0 * (1 + rise * t / dur) / rate; d[i] = Math.sin(ph) * Math.exp(-t / (dur * .3)) * Math.min(1, t / .002); }
  const g = s.ac.createGain(); g.gain.value = level; s.play(b, t0, t0 + dur).connect(g);
  if (tk > 0) { const c = s.ac.createGain(), f = s.ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500; s.env(c.gain, t0, { attack: .0006, release: .006, peak: level * tk }); s.play(s.noise(s.key + ':droptick', .05), t0, t0 + .02).connect(f).connect(c).connect(g); }
  s.place(g, { pan: x === null ? pan : null, x, send, bus: 'fx' });
}

/** Struck material: an exciter through parallel modes. The exciter's speed is what reads as hard or soft. */
const MATERIALS = {
  wood: { modes: [[1, 1, .09], [2.8, .5, .06], [4.3, .3, .04]], exciter: 3200, burst: .003, q: 14 },
  metal: { modes: [[1, 1, 1.4], [1.6, .6, 1.1], [2.3, .5, .9], [3.4, .35, .7], [4.8, .2, .5]], exciter: 7000, burst: .002, q: 28 },
  stone: { modes: [[1, 1, .045], [1.7, .6, .035], [2.6, .4, .025]], exciter: 2200, burst: .006, q: 4 },
  felt: { modes: [[1, 1, .05], [2.1, .3, .03]], exciter: 500, burst: .02, q: 2 },
  card: { modes: [[1, 1, .04], [2.2, .5, .03], [3.1, .3, .02]], exciter: 1800, burst: .005, q: 5 },
};
function contact(s, at, o = {}) {
  const { material = 'wood', f0 = 220, level = .12, pan = 0, x = null, send = .4, key = 'contact' } = o;
  const m = MATERIALS[material], t0 = onset(at, o, .001), sum = s.ac.createGain();
  const ex = s.ac.createGain(), exF = s.ac.createBiquadFilter(); exF.type = 'lowpass'; exF.frequency.value = m.exciter; exF.Q.value = .7;
  s.env(ex.gain, t0, { attack: .0005, release: m.burst, peak: 1 });
  s.play(s.noise(`${s.key}:${key}`, .1), t0, t0 + .05).connect(exF).connect(ex);
  m.modes.forEach(([ratio, amp, decay]) => {
    const f = s.ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = f0 * ratio; f.Q.value = m.q;
    const g = s.ac.createGain(); s.env(g.gain, t0, { attack: .001, release: decay, peak: level * amp * (m.q > 8 ? 2.5 : 1.2) });
    ex.connect(f).connect(g).connect(sum);
  });
  const thud = s.ac.createGain(); s.env(thud.gain, t0, { attack: .001, release: .05, peak: level * .5 });
  const o2 = s.osc('sine', f0 * .5, t0, t0 + .08); o2.frequency.exponentialRampToValueAtTime(f0 * .3, t0 + .05); o2.connect(thud).connect(sum);
  s.place(sum, { pan: x === null ? pan : null, x, send, bus: 'fx' });
}

/** Paper: grains of ring-modulated noise. kind: slide | turn | flick | tear. */
function paperSnd(s, at, o = {}) {
  const { kind = 'slide', level = .07, dur = kind === 'flick' ? .06 : kind === 'turn' ? .3 : .5, pan = 0, x = null, send = .3, key = 'paper' } = o;
  const rate = s.rate, n = Math.ceil(rate * (dur + .05)), b = s.ac.createBuffer(1, n, rate), d = b.getChannelData(0), r = rngFor(`${s.key}:${key}:${kind}:${at.toFixed(3)}`);
  const densityAt = (u) => kind === 'tear' ? .6 + .4 * Math.cos(u * Math.PI * 2) : kind === 'turn' ? Math.sin(u * Math.PI) : kind === 'flick' ? (u < .3 ? 1 : 0) : .8 + .2 * Math.sin(u * 7);
  const bandAt = (u) => kind === 'tear' ? lerp(6000, 2500, u) : kind === 'turn' ? lerp(1200, 4500, Math.sin(u * Math.PI)) : 3500;
  for (let i = 0; i < n;) {
    const u = i / (rate * dur), len = Math.floor(rate * (.002 + r() * .006)), f = bandAt(u) * (.6 + r() * .9), amp = densityAt(clamp(u, 0, 1)) * (r() < .75 ? 1 : 0);
    for (let k = 0; k < len && i + k < n; k++) { const w = Math.sin(Math.PI * k / len); d[i + k] += amp * w * (r() * 2 - 1) * Math.sin(k / rate * f * 2 * Math.PI); }
    i += Math.max(1, Math.floor(len * (kind === 'tear' ? .5 : .8)));
  }
  const g = s.ac.createGain(), f = s.ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = kind === 'flick' ? 1500 : 700;
  const body = s.ac.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 900; body.gain.value = kind === 'tear' ? 5 : 3; body.Q.value = 1;
  s.env(g.gain, at, { attack: kind === 'flick' ? .001 : .02, hold: Math.max(0, dur - .08), release: .06, peak: level });
  s.play(b, at, at + dur + .05).connect(f).connect(body).connect(g);
  if (kind === 'flick') { const p = s.ac.createGain(); s.env(p.gain, at, { attack: .001, release: .02, peak: level * .6 }); s.osc('sine', 1500, at, at + .03).connect(p).connect(g); }
  s.place(g, { pan: x === null ? pan : null, x, send, bus: 'fx' });
}

/** Riser into `hit`: pitch, cutoff and gain climb together, then stop for the accent to land. */
function riser(s, hit, dur, o = {}) {
  const { level = .06, from = 110, to = 880, pan = 0, send = .5, type = 'sawtooth', key = 'riser' } = o;
  const t0 = hit - dur, g = s.ac.createGain(), f = s.ac.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2;
  f.frequency.setValueAtTime(from * 3, t0); f.frequency.exponentialRampToValueAtTime(to * 4, hit);
  g.gain.setValueAtTime(TINY, t0); g.gain.exponentialRampToValueAtTime(level, hit - .02); g.gain.linearRampToValueAtTime(TINY, hit + .01);
  const osc = s.osc(type, from, t0, hit); osc.frequency.exponentialRampToValueAtTime(to, hit); osc.connect(f).connect(g);
  const n = s.ac.createGain(); n.gain.setValueAtTime(TINY, t0); n.gain.exponentialRampToValueAtTime(level * .6, hit - .02); n.gain.linearRampToValueAtTime(TINY, hit + .01);
  s.play(s.noise(`${s.key}:${key}`, dur + .1, 'pink'), t0, hit).connect(f).connect(n);
  s.place(g, { pan, send, bus: 'fx' }); s.place(n, { pan, send, bus: 'fx' });
}

/** Room tone across the whole film: what keeps a quiet picture from sounding like a dropout. */
function air(s, o = {}) {
  const { level = .012, key = 'air', highpass = 110, lowpass = 1800, rise = .8, fall = 1.2, from = 0, to = s.duration } = o;
  const b = s.ac.createBuffer(2, Math.ceil(s.rate * Math.min(to - from, 12)), s.rate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch), r = rngFor(`${s.key}:${key}:${ch}`); let low = 0; for (let i = 0; i < d.length; i++) { low = low * .982 + (r() * 2 - 1) * .018; d[i] = low * (.9 + .1 * Math.sin(i / s.rate * .39 + ch)); } }
  const hp = s.ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = highpass; const lp = s.ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lowpass;
  const g = s.ac.createGain(); g.gain.setValueAtTime(TINY, from); g.gain.linearRampToValueAtTime(level, from + rise);
  g.gain.setValueAtTime(level, Math.max(from + rise, to - fall)); g.gain.linearRampToValueAtTime(TINY, Math.min(to, s.duration));
  s.play(b, from, to, { loop: true }).connect(hp).connect(lp).connect(g); s.place(g, { pan: 0, send: .3, bus: 'bed' });
}

/* ── end sound kit ── */

/* ── the score: the raga of the hour ─────────────────────────────────────────
   Hindustani music keeps time of day, and so does this film. Sa is D; each
   passage takes the colour of a raga of its hour, the same five-note contour
   (the motif) runs through all of them, and a tanpura drone never stops.
   Nothing is looped: each chapter (a passage plus the transition after it) is
   rendered at full length with seeded variation, then chapters are laid end
   to end with their tails overlapping. The rail joints are the picture's own
   knocks (0.6 s pairs), so sound and shake share one clock.               */
const SA = 62;                                               // D4
const RAGAS = {
  tea:   { name: 'Bhairav',  scale: [0, 1, 4, 5, 7, 8, 11], vadi: 8,  lead: 'flute',   amb: 'birds' },
  river: { name: 'Bilawal',  scale: [0, 2, 4, 5, 7, 9, 11], vadi: 9,  lead: 'santoor', amb: 'water' },
  noon:  { name: 'Sarang',   scale: [0, 2, 5, 7, 10],       vadi: 2,  lead: 'flute',   amb: 'cicada' },
  ghats: { name: 'Desh',     scale: [0, 2, 5, 7, 11, 10, 9],vadi: 2,  lead: 'flute',   amb: 'rain' },
  dusk:  { name: 'Yaman',    scale: [0, 2, 4, 6, 7, 9, 11], vadi: 4,  lead: 'santoor', amb: 'bell' },
  night: { name: 'Malkauns', scale: [0, 3, 5, 8, 10],       vadi: 5,  lead: 'flute',   amb: 'crickets' },
};
const MOTIF = [0, 1, 2, 4, 2, 1, 0];                         // steps through each raga's scale
const deg = (R, d) => { const n = R.scale.length, o = Math.floor(d / n); return SA + 12 * o + R.scale[((d % n) + n) % n]; };

/** Tanpura: Pa–Sa–Sa–low Sa, plucked forever; long Karplus strings with a buzz. */
function tanpura(s, at, end, o = {}) {
  const { level = .03, key = 'tan', fadeIn = 2, fadeOut = 3, pa = 7 } = o, cyc = 4.6, r = rngFor(s.key + key);
  const bus = s.ac.createGain(); bus.gain.setValueAtTime(TINY, at); bus.gain.linearRampToValueAtTime(1, at + fadeIn);
  bus.gain.setValueAtTime(1, Math.max(at + fadeIn, end - fadeOut)); bus.gain.linearRampToValueAtTime(TINY, Math.min(end, s.duration));
  const hp = s.ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 60; const tlp = s.ac.createBiquadFilter(); tlp.type = 'lowpass'; tlp.frequency.value = 1900; tlp.Q.value = .4; bus.connect(hp).connect(tlp);
  s.place(tlp, { pan: 0, send: .5, bus: 'bed' });
  const notes = [SA - 12 + pa - 12 + 12, SA - 12, SA - 12, SA - 24];
  for (let t = at; t < end - 1; t += cyc * (0.98 + r() * .04)) {
    notes.forEach((m, j) => {
      const tt = t + j * cyc / 4 + (r() - .5) * .04, dur = Math.min(5.5, s.duration - tt - .05);
      if (tt >= end || dur < .5) return;
      const N = Math.max(2, Math.round(s.rate / hz(m))), n = Math.ceil(s.rate * dur), b = s.ac.createBuffer(1, n, s.rate), d = b.getChannelData(0), rr = rngFor(`${s.key}:${key}:${tt.toFixed(3)}`);
      let lp = 0; for (let i = 0; i < N; i++) { const w = rr() * 2 - 1; lp = lp * .6 + w * .4; d[i] = lp; }
      for (let i = N; i < n; i++) d[i] = .9991 * .5 * (d[i - N] + d[i - N - 1 < 0 ? 0 : i - N - 1]);
      let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i])); pk = pk || 1;
      for (let i = 0; i < n; i++) { const v = d[i] / pk; d[i] = .8 * v + .2 * Math.tanh(3 * v); }   // jawari: a soft buzz on the output, outside the loop
      const g = s.ac.createGain(); g.gain.setValueAtTime(TINY, tt); g.gain.linearRampToValueAtTime(level * (j === 3 ? 1.2 : 1), tt + .004); g.gain.setValueAtTime(level, tt + dur - .3); g.gain.linearRampToValueAtTime(TINY, tt + dur);
      const p = s.ac.createStereoPanner(); p.pan.value = (j % 2 ? .18 : -.18);
      s.play(b, tt, tt + dur).connect(g).connect(p).connect(bus);
    });
  }
}

/** Bansuri: one breath per phrase, notes joined by meend (glides), vibrato on held notes. */
function flute(s, t0, notes, o = {}) {
  const { level = .05, pan = .15, send = .55 } = o;
  let t = t0; const total = notes.reduce((a, [, d]) => a + d, 0), end = t0 + total;
  const osc = s.osc('triangle', hz(notes[0][0]), t0, end + .4), osc2 = s.osc('sine', hz(notes[0][0]) * 2, t0, end + .4);
  const vib = s.osc('sine', 5.1, t0, end + .4), vg = s.ac.createGain(); vg.gain.setValueAtTime(0, t0);
  vib.connect(vg); vg.connect(osc.frequency);
  const g = s.ac.createGain(), lp = s.ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = .3;
  const g2 = s.ac.createGain(); g2.gain.value = .12;
  osc.connect(lp); osc2.connect(g2).connect(lp); lp.connect(g);
  g.gain.setValueAtTime(TINY, t0); g.gain.linearRampToValueAtTime(level, t0 + .18);
  for (let i = 0; i < notes.length; i++) {
    const [m, d] = notes[i], f = hz(m);
    if (i) { const pf = hz(notes[i - 1][0]), gl = Math.min(.12, d * .3); osc.frequency.setValueAtTime(pf, t); osc.frequency.exponentialRampToValueAtTime(f, t + gl); osc2.frequency.setValueAtTime(pf * 2, t); osc2.frequency.exponentialRampToValueAtTime(f * 2, t + gl); }
    if (d > .7) { vg.gain.setValueAtTime(0, t + .3); vg.gain.linearRampToValueAtTime(f * .006, t + Math.min(d, .9)); vg.gain.setValueAtTime(f * .006, t + d - .05); vg.gain.linearRampToValueAtTime(0, t + d); }
    g.gain.setValueAtTime(level * (i === notes.length - 1 ? .9 : 1), t + d * .6);
    t += d;
  }
  g.gain.linearRampToValueAtTime(level * .7, end - .1); g.gain.exponentialRampToValueAtTime(TINY, end + .35);
  // breath: noise through a band near the tone
  const br = s.ac.createGain(), bf = s.ac.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = hz(notes[0][0]) * 2.2; bf.Q.value = 1.4;
  s.env(br.gain, t0, { attack: .12, hold: total - .2, release: .3, peak: level * .35 });
  s.play(s.noise(s.key + ':breath', 12, 'pink'), t0, end + .35, { offset: (t0 * 7.3) % 5, loop: true }).connect(bf).connect(br);
  s.place(g, { pan, send, bus: 'fore' }); s.place(br, { pan, send: send * .6, bus: 'fore' });
}

/** Santoor: hammered paired courses, bright partials, soft rolls on long notes. */
function santoor(s, at, midi, o = {}) {
  const { level = .05, roll = 0, pan = -.2 } = o, P = [[1, 1, 2.4], [2.003, .32, 1.3], [3.01, .16, .8], [4.2, .07, .45]];
  const hits = roll > 0 ? Math.round(roll * 11) : 1;
  for (let k = 0; k < hits; k++) {
    const t = at + k / 11, l = level * (k ? .45 + .25 * Math.sin(k) : 1);
    for (const det of [-.035, .035]) struck(s, t, midi + det, P, { level: l * .6, strike: .4, strikeHz: 3800, pan: pan + det * 2, send: .5 });
  }
}

/** A phrase generator: the motif's contour through the raga, varied by seed. */
function phrase(R, r, len, lo) {
  const out = []; let d = lo;
  const shape = MOTIF.map(v => v + Math.floor(r() * 2) - (r() < .25 ? 1 : 0));
  for (let i = 0; i < len; i++) {
    d = lo + shape[i % shape.length] + (i >= shape.length ? 2 : 0);
    const dur = i === len - 1 ? 1.6 + r() * 1.4 : [.45, .6, .9, 1.2][Math.floor(r() * 4)];
    out.push([deg(R, d), dur]);
  }
  out.push([deg(R, lo + (r() < .5 ? 0 : R.scale.indexOf(R.vadi) >= 0 ? R.scale.indexOf(R.vadi) : 2)), 2 + r()]);
  return out;
}

/** Rail: the picture's joint knocks (pairs every 0.6 s) and the carriage's rumble. */
function rails(s, at, end, o = {}) {
  // One 1.2 s buffer holds two knock pairs (metal click, wooden thud) and loops
  // on the picture's 0.6 s grid: the same clock that shakes the view.
  const { level = .05, speed = 1, key = 'rail' } = o, rate = s.rate, n = Math.round(1.2 * rate);
  const b = s.ac.createBuffer(2, n, rate), r = rngFor(s.key + key);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (const [t0, f0, dec, amp] of [[.003, 330, .05, .5], [.123, 190, .035, .7], [.603, 322, .05, .46], [.723, 196, .035, .66]]) {
      const i0 = Math.round(t0 * rate), len = Math.round(dec * 6 * rate), pan = ch ? (f0 > 250 ? .9 : 1.1) : (f0 > 250 ? 1.1 : .9);
      for (let i = 0; i < len && i0 + i < n; i++) {
        const t = i / rate, e = Math.exp(-t / dec), nz = (r() * 2 - 1) * Math.exp(-t / .002);
        d[i0 + i] += amp * pan * (e * (Math.sin(TAU * f0 * t) + .5 * Math.sin(TAU * f0 * 1.6 * t + 1) + .3 * Math.sin(TAU * f0 * 2.3 * t + 2)) * .5 + nz * .6);
      }
    }
  }
  const t0 = Math.ceil(at / 1.2) * 1.2, lp = s.ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  const g = s.ac.createGain(); g.gain.setValueAtTime(TINY, at); g.gain.linearRampToValueAtTime(level, at + 1.5); g.gain.setValueAtTime(level, Math.max(at + 1.5, end - 1.5)); g.gain.linearRampToValueAtTime(TINY, end);
  s.play(b, t0, end, { loop: true }).connect(lp).connect(g); s.place(g, { pan: 0, send: .1, bus: 'fx' });
  const g2 = s.ac.createGain(), lp2 = s.ac.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 160 + 90 * speed;
  g2.gain.setValueAtTime(TINY, at); g2.gain.linearRampToValueAtTime(level * .9, at + 1.5); g2.gain.setValueAtTime(level * .9, Math.max(at + 1.5, end - 1.5)); g2.gain.linearRampToValueAtTime(TINY, end);
  s.play(s.noise(s.key + ':rumble', 10, 'brown'), at, end, { loop: true }).connect(lp2).connect(g2); s.place(g2, { pan: 0, send: .05, bus: 'bed' });
}

/** Monsoon rain heard from inside a coach: a soft, muffled wash (no ticking
   highs), a low rumble on the roof, and now and then a heavier drip on the
   window frame. The wash breathes on a seeded slow walk. */
function softRain(s, at, end, r) {
  const rate = s.rate, dur = end - at, fade = 3;
  const bus = s.ac.createGain(); bus.gain.setValueAtTime(TINY, at); bus.gain.linearRampToValueAtTime(1, at + fade); bus.gain.setValueAtTime(1, end - fade); bus.gain.linearRampToValueAtTime(TINY, end);
  s.place(bus, { pan: 0, send: .15, bus: 'fx' });
  const walk = s.ac.createBuffer(1, Math.ceil(rate * dur), rate), d = walk.getChannelData(0), wr = rngFor(s.key + ':rainwalk');
  let v = 0, target = 0, k = 0; for (let i = 0; i < d.length; i++) { if (k-- <= 0) { target = wr() * 2 - 1; k = Math.floor(rate * (1.5 + wr() * 3)); } v += (target - v) * 4e-6; d[i] = v; }
  const layer = (color, secs, hp, lpF, lvl, key) => {
    const h = s.ac.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp;
    const l = s.ac.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lpF; l.Q.value = .4;
    const l2 = s.ac.createBiquadFilter(); l2.type = 'lowpass'; l2.frequency.value = lpF * 1.3; l2.Q.value = .4;
    const g = s.ac.createGain(); g.gain.value = lvl;
    const mod = s.ac.createGain(); mod.gain.value = lvl * .35; s.play(walk, at, end).connect(mod).connect(g.gain);
    s.play(s.noise(s.key + key, secs, color), at, end, { loop: true }).connect(h).connect(l).connect(l2).connect(g).connect(bus);
  };
  layer('pink', 13, 250, 1700, .05, ':rainwash');           // the wash against the coach
  layer('brown', 11, 40, 260, .05, ':rainroof');            // drumming on the roof, felt more than heard
  for (let t = at + 2; t < end - 2; t += .35 + r() * 1.4) {  // heavier drips on the window frame
    contact(s, t, { material: 'felt', f0: 260 + r() * 220, level: .012 + r() * .014, pan: (r() - .5) * .8, send: .2, key: 'drip' });
  }
}

function ambience(s, kind, at, end, r) {
  if (kind === 'birds') for (let t = at + 2; t < end - 2; t += 1.4 + r() * 3.2) {
    const f = 2600 + r() * 1800, n = 2 + Math.floor(r() * 4), pan = (r() - .5) * 1.4;
    for (let k = 0; k < n; k++) { const g = s.ac.createGain(), o = s.osc('sine', f, t + k * .09, t + k * .09 + .07); o.frequency.setValueAtTime(f * (1 + r() * .3), t + k * .09); o.frequency.exponentialRampToValueAtTime(f * .8, t + k * .09 + .06); s.env(g.gain, t + k * .09, { attack: .005, release: .05, peak: .009 }); o.connect(g); s.place(g, { pan, send: .6, bus: 'fx' }); }
  }
  if (kind === 'water') { wind(s, at, end, { level: .02, centre: 380, sweep: 160, whistle: 0, key: 'lap' }); for (let t = at + 1; t < end - 1; t += 1.5 + r() * 3) drop(s, t, { level: .02, f0: 500 + r() * 500, pan: (r() - .5) * 1.2 }); }
  if (kind === 'cicada') { const g = s.ac.createGain(), o = s.osc('sine', 4700, at, end), m = s.osc('square', 38, at, end), mg = s.ac.createGain(); mg.gain.value = .5; m.connect(mg).connect(g.gain); g.gain.setValueAtTime(0, at); const e = s.ac.createGain(); e.gain.setValueAtTime(TINY, at); e.gain.linearRampToValueAtTime(.006, at + 4); e.gain.setValueAtTime(.006, end - 4); e.gain.linearRampToValueAtTime(TINY, end); o.connect(g).connect(e); s.place(e, { pan: .5, send: .4, bus: 'fx' }); }
  if (kind === 'rain') { softRain(s, at, end, r); wind(s, at, end, { level: .014, centre: 240, sweep: 120, whistle: 0, key: 'falls' }); }
  if (kind === 'bell') { for (const t of [at + 40, at + 118]) if (t < end - 6) { bell(s, t, SA - 5, { level: .03, decay: 5, pan: -.5, send: .8 }); bell(s, t + 2.6, SA - 5, { level: .022, decay: 5, pan: -.5, send: .8 }); } ambience(s, 'birds', at + 20, at + 60, r); }
  if (kind === 'crickets') for (let t = at + 1; t < end - 1; t += 1.6 + r() * 2.4) {
    const f = 4200 + r() * 900, pan = (r() - .5) * 1.6;
    for (let k = 0; k < 3; k++) { const g = s.ac.createGain(), o = s.osc('sine', f, t + k * .06, t + k * .06 + .04); s.env(g.gain, t + k * .06, { attack: .004, release: .03, peak: .006 }); o.connect(g); s.place(g, { pan, send: .5, bus: 'fx' }); }
  }
}

/** Transition sound, read from the same cover timing as the picture. */
function transitionSound(s, type, at) {
  const T = TRX[type], t0 = at + T.t0, t1 = at + T.t1;
  if (type === 'tunnel') {
    sub(s, t0 + .1, SA - 38, { level: .12, release: 1.6, drop: 5 });
    const g = s.ac.createGain(), lp = s.ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    g.gain.setValueAtTime(TINY, t0 - .3); g.gain.linearRampToValueAtTime(.09, t0 + .5); g.gain.setValueAtTime(.09, t1 - .4); g.gain.linearRampToValueAtTime(TINY, t1 + .8);
    s.play(s.noise(s.key + ':tunnel', 10, 'brown'), t0 - .3, t1 + .8, { loop: true }).connect(lp).connect(g); s.place(g, { pan: 0, send: .7, bus: 'fx' });
    breath(s, t1 - .6, 1.8, { level: .05, from: 300, to: 1400, back: 500, key: 'tunnelout' });
    return;
  }
  const night = type === 'nightExpress', goods = type === 'goods';
  breath(s, t0 - .8, 2.4, { level: .07, from: 300, to: 2000, back: 700, key: 'whoosh1', pan: .6 });
  const g = s.ac.createGain(), bp = s.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = goods ? 300 : 520; bp.Q.value = .5;
  g.gain.setValueAtTime(TINY, t0); g.gain.linearRampToValueAtTime(.07, t0 + .3); g.gain.setValueAtTime(.07, t1 - .3); g.gain.linearRampToValueAtTime(TINY, t1 + .5);
  s.play(s.noise(s.key + ':roar' + type, 10, 'pink'), t0, t1 + .5, { loop: true }).connect(bp).connect(g); s.place(g, { pan: 0, send: .3, bus: 'fx' });
  const clack = goods ? 1 / 4.2 : 1 / 7;                       // wheelsets passing
  for (let t = t0 + .1; t < t1; t += clack) contact(s, t, { material: 'metal', f0: goods ? 240 : 300, level: .035, pan: .2 - (t - t0) / (t1 - t0) * .4, send: .1, key: 'pass' });
  if (!goods) {                                                // the loco's two-tone horn, Doppler falling
    const hg = s.ac.createGain(), hl = s.ac.createBiquadFilter(); hl.type = 'lowpass'; hl.frequency.value = 1700;
    const ht = at + T.t0 - 1.2;
    s.env(hg.gain, ht, { attack: .15, hold: 1.5, release: .6, peak: night ? .03 : .04 });
    for (const f of [311, 392]) { const o = s.osc('sawtooth', f * 1.03, ht, ht + 2.4); o.frequency.setValueAtTime(f * 1.03, ht + 1.2); o.frequency.exponentialRampToValueAtTime(f * .95, ht + 1.9); o.connect(hl); }
    hl.connect(hg); s.place(hg, { pan: .5, send: .5, bus: 'fx' });
  }
}

/* ── SFX-only soundtrack (the user asked for no music) ───────────────────────
   The sound of the journey itself: wheels over rail joints on the picture's
   own 0.6 s grid ("ta-dak" as the two axles of a bogie cross each joint), the
   roll of steel on steel, wind through the open barred window, small rattles
   in the coach and the kulhad on the sill, the place outside, and the trains
   and tunnels of the transitions. Every hit is synthesised individually with
   seeded variation, so nothing audibly repeats over twenty minutes.        */

/** Wheel-over-joint knocks as heard from inside the coach: no tones, just
   broadband thumps through the floor. Each axle crossing a joint is a short burst
   of noise through a low body resonance (the bogie and floor), darker and duller
   than a click; the two axles of a bogie make the "dhak-dhak" 0.12 s apart. */
function clack(s, from, to, o = {}) {
  const { level = .22, speed = 1, key = 'clack', loud = () => 1 } = o, rate = s.rate;
  const n = Math.ceil((to - from + .6) * rate), b = s.ac.createBuffer(2, n, rate), L_ = b.getChannelData(0), R_ = b.getChannelData(1), r = rngFor(s.key + key);
  const hit = (t, amp, dark, pan) => {
    const i0 = Math.round((t - from) * rate); if (i0 < 0 || i0 >= n) return;
    const len = Math.min(n - i0, Math.round(.12 * rate));
    // two-pole resonators for the body (low) and the rail/wheel (mid), both heavily damped
    const res = (f, q) => { const w = TAU * f / rate, rr = Math.exp(-w / (2 * q)); return { a1: 2 * rr * Math.cos(w), a2: -rr * rr, y1: 0, y2: 0 }; };
    const body = res(70 + 25 * r(), 1.6), thud = res(160 + 60 * r(), 1.2), mid = res(700 + 500 * r() * (1 - dark), .9);
    const gl = amp * (1 - Math.max(0, pan)), gr = amp * (1 + Math.min(0, pan));
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const tt = i / rate, ex = (r() * 2 - 1) * Math.exp(-tt / (.004 + .004 * dark));        // the impact: a few ms of noise
      lp = lp * .6 + ex * .4;
      const step = (R, x) => { const y = x + R.a1 * R.y1 + R.a2 * R.y2; R.y2 = R.y1; R.y1 = y; return y; };
      const v = .9 * step(body, lp) * .08 + .6 * step(thud, lp) * .1 + .5 * step(mid, ex) * .12 * (1 - .5 * dark);
      const e = Math.min(1, tt / .001) * Math.exp(-tt / .045);
      L_[i0 + i] += v * e * gl; R_[i0 + i] += v * e * gr;
    }
  };
  for (let t = Math.ceil(from / .6 - 1e-9) * .6; t < to; t += .6) {
    const heavy = r() < .1 ? 1.4 : 1, a = level * (.75 + r() * .4) * heavy * loud(t), dark = .5 + r() * .5;
    hit(t + (r() - .5) * .008, a, dark, -.2 + r() * .1);
    hit(t + .12 + (r() - .5) * .008, a * (.8 + r() * .25), dark, .05 + r() * .15);
  }
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L_[i]), Math.abs(R_[i]));
  const norm = pk > 0 ? .9 / pk : 1; for (let i = 0; i < n; i++) { L_[i] *= norm; R_[i] *= norm; }
  const lp = s.ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400 + 300 * speed; lp.Q.value = .5;
  const g = s.ac.createGain(); g.gain.value = level * 1.9;
  s.play(b, from, to + .6).connect(lp).connect(g); s.place(g, { pan: 0, send: .08, bus: 'fx' });
  return g;
}

/** The roll: steel on steel and the carriage body, with slow swells. */
function roll(s, from, to, o = {}) {
  const { level = .05, speed = 1, key = 'roll', fade = .5 } = o;
  const env = (g, lvl) => { g.gain.setValueAtTime(TINY, from); g.gain.linearRampToValueAtTime(lvl, from + fade); g.gain.setValueAtTime(lvl, Math.max(from + fade, to - fade)); g.gain.linearRampToValueAtTime(TINY, to); };
  const g1 = s.ac.createGain(), lp1 = s.ac.createBiquadFilter(); lp1.type = 'lowpass'; lp1.frequency.value = 150 + 60 * speed; env(g1, level * .6);
  s.play(s.noise(s.key + ':body', 11, 'brown'), from, to, { loop: true }).connect(lp1).connect(g1); s.place(g1, { pan: 0, send: 0, bus: 'bed' });
  const g2 = s.ac.createGain(), bp = s.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520 + 180 * speed; bp.Q.value = .7; env(g2, level * .8);
  s.play(s.noise(s.key + ':rail', 13, 'pink'), from, to, { loop: true }).connect(bp).connect(g2); s.place(g2, { pan: .05, send: .05, bus: 'bed' });
  // a faint singing of the rails, drifting in pitch
  const g3 = s.ac.createGain(), bp3 = s.ac.createBiquadFilter(); bp3.type = 'bandpass'; bp3.frequency.value = 1900; bp3.Q.value = 9; env(g3, level * .16);
  s.play(s.noise(s.key + ':sing', 9, 'white'), from, to, { loop: true }).connect(bp3).connect(g3); s.place(g3, { pan: -.1, send: .1, bus: 'bed' });
}

/** Coach life: loose fittings ticking and, now and then, the kulhad on the sill. */
function rattles(s, from, to, r, shake = () => 0) {
  for (let t = from + 1 + r() * 2; t < to - .5; t += 1.2 + r() * 3.5) tick(s, t, { level: .02 + .03 * r(), freq: 2600 + r() * 3000, q: 6, decay: .02, pan: (r() - .5) * 1.2, send: .1 });
  for (let t = from + 6 + r() * 10; t < to - 1; t += 9 + r() * 16) {
    const k = 1 + shake(t) * 3, n = shake(t) > .3 ? 3 : 1;
    for (let j = 0; j < n; j++) struck(s, t + j * .09, 83 + r() * 2, [[1, 1, .05], [2.3, .5, .03], [3.9, .25, .02]], { level: .012 * k, strike: .6, strikeHz: 2500, pan: .45, send: .15, bus: 'fx' });
  }
}

/** One chapter: passage i and the transition after it, plus a tail for overlap. */
const CH_TAIL = 6;
function chapterSpan(i) {
  const p = PROG.find(x => x.kind === 'pass' && x.i === i), tr = PROG.find(x => x.kind === 'tr' && x.i === i);
  return { start: p.start, passEnd: p.end, end: tr ? tr.end : p.end, tr };
}
async function renderChapter(i, limit) {
  const P = PASSES[i], R = RAGAS[P.id], sp = chapterSpan(i), len = sp.end - sp.start, last = i === PASSES.length - 1;
  const s = Score({ duration: limit || (len + (last ? 0 : CH_TAIL)), key: 'pp:sfx' + i, room: { seconds: 1.6, decay: .5, wet: .04 } });
  const r = rngFor('pp:sfx:' + i), pl = sp.passEnd - sp.start, speed = P.V / 700, bedEnd = len + (last ? 0 : .5);
  const trT = sp.tr ? TRX[sp.tr.type] : null, inTunnel = t => sp.tr && sp.tr.type === 'tunnel' ? sm((t - pl - trT.t0) / .5) * (1 - sm((t - pl - trT.t1 + .3) / .6)) : 0;
  const passing = t => sp.tr && sp.tr.type !== 'tunnel' ? sm((t - pl - trT.t0) / .4) * (1 - sm((t - pl - trT.t1) / .4)) : 0;
  air(s, { level: .008, from: 0, to: bedEnd, rise: i ? .5 : 1.5, fall: .5 });
  clack(s, i ? 0 : .8, len, { level: .2, speed, loud: t => 1 + .9 * inTunnel(t) + .3 * passing(t) });
  roll(s, 0, bedEnd, { level: .05, speed, fade: i ? .5 : 1.5 });
  wind(s, 0, bedEnd, { level: .03 + .016 * speed, centre: 900 + 250 * speed, sweep: 300, gust: .7, whistle: .05, key: 'window', rise: i ? .5 : 1.5, fall: .5 });
  rattles(s, 0, len, r, passing);
  if (R.amb === 'bell') { for (const t of [40, 118]) { bell(s, t, 57, { level: .022, decay: 5, pan: -.5, send: .7 }); bell(s, t + 2.6, 57, { level: .016, decay: 5, pan: -.5, send: .7 }); } ambience(s, 'birds', 20, 60, r); }
  else ambience(s, R.amb, 0, pl + 3, r);
  if (sp.tr) transitionSound(s, sp.tr.type, pl);
  if (last) { const g = s.master.gain; g.setValueAtTime(1, len - 10); g.linearRampToValueAtTime(TINY, len - .05); }
  return s.ac.startRendering();
}
window.__rp = { renderChapter: async (i, lim) => wavBase64(await renderChapter(i, lim)), chapterSpan, count: () => PASSES.length };
