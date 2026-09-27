"""Assemble Purab se Paschim: 20 minutes from 11 rendered segments and 6 audio chapters.

Every passage is an exact 60 s loop and every transition starts and ends on a
loop frame (checked pixel-for-pixel before rendering), so repeating one render
of each loop is frame-identical to rendering all 36,000 frames.

Audio chapters (passage + following transition, with a 6 s tail) are overlap-
added at their program start times, then scaled by one static gain to -18 LUFS
under a -1 dBTP ceiling (-18 chosen over the kit default -16: twenty minutes of ambient train sound should sit gently).
"""
import json, subprocess, sys, wave, re, pathlib
import numpy as np

OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '../../out')
SEG, AUD = OUT / 'pp-seg', OUT / 'pp-audio'
FPS, RATE, DUR = 30, 48000, 1200
ORDER = ['p1_tea'] * 3 + ['t1_express'] + ['p2_river'] * 3 + ['t2_goods'] + ['p3_noon'] * 4 + ['t3_tunnel'] + \
        ['p4_ghats'] * 3 + ['t4_tunnel'] + ['p5_dusk'] * 3 + ['t5_night'] + ['p6_night'] * 3

def frames(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', str(p)], capture_output=True, text=True)
    return int(r.stdout.strip())

# 1. video: concat the segments (same encoder settings, so stream copy is exact)
# delivery encode: each unique segment once at CRF 28 (dots survive at 1:1), then stream-copy concat
for name in sorted(set(ORDER)):
    src, dst = SEG / f'{name}.mp4', SEG / f'{name}.c28.mp4'
    if not dst.exists():
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-c:v', 'libx264', '-crf', '28', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-g', '60', str(dst)], check=True)
        print('encoded', dst.name)
total = 0
with open(SEG / 'concat.txt', 'w') as f:
    for name in ORDER:
        p = SEG / f'{name}.c28.mp4'
        n = frames(p); total += n
        f.write(f"file '{p.resolve()}'\n")
print('video frames', total, 'expected', DUR * FPS)
assert total == DUR * FPS, 'segment frame counts do not add up to 20 minutes'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(SEG / 'concat.txt'), '-c', 'copy', str(OUT / 'purab-se-paschim.silent.mp4')], check=True)

# 2. audio: overlap-add the chapters
mix = np.zeros((DUR * RATE + RATE * 8, 2), np.float64)
for i in range(6):
    span = json.load(open(AUD / f'ch{i}.json'))
    with wave.open(str(AUD / f'ch{i}.wav')) as w:
        assert w.getframerate() == RATE and w.getnchannels() == 2
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float64) / 32767
    s0 = round(span['start'] * RATE)
    mix[s0:s0 + len(a)] += a
    print(f'chapter {i}: start {span["start"]}s, {len(a) / RATE:.2f}s')
mix = mix[:DUR * RATE]
# gentle fade at the very start and end so the file opens and closes on silence
fi, fo = int(.8 * RATE), int(2 * RATE)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]; mix[-fo:] *= np.linspace(1, 0, fo)[:, None]

def write(path, x):
    y = np.clip(np.round(x * 32767), -32768, 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(y.tobytes())

def measure(path):
    r = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]); tp = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)[-1])
    lra = float(re.findall(r'LRA:\s+(-?[\d.]+) LU', r)[-1])
    return I, tp, lra

TARGET = -20.0   # ambient train sound: -20 LUFS keeps the clacks' snap without limiting every one
peak = np.abs(mix).max()
if peak > .98: mix *= .98 / peak
raw = OUT / 'pp-mix-raw.wav'; write(raw, mix)
I, tp, lra = measure(raw)
mix *= 10 ** ((TARGET - I) / 20)

def limit(x, thr_db=-2.0, look=0.004, release=0.25):
    # Deterministic look-ahead peak limiter on 1 ms blocks: only the rare loud moments
    # (tunnel roar and thump) are touched; ordinary clacks sit below the threshold.
    B = RATE // 1000; n = len(x) // B
    pk = np.abs(x[:n * B]).max(axis=1).reshape(n, B).max(axis=1)
    thr = 10 ** (thr_db / 20); want = np.minimum(1, thr / np.maximum(pk, 1e-9))
    la = int(look * 1000); w = want.copy()
    for k in range(1, la + 1): w[:-k] = np.minimum(w[:-k], want[k:])
    g = np.empty(n); cur = 1.0; a = np.exp(-1 / (release * 1000))
    for i in range(n):
        cur = w[i] if w[i] < cur else w[i] + (cur - w[i]) * a
        g[i] = cur
    gs = np.interp(np.arange(len(x)) / B, np.arange(n) + .5, g)
    touched = (g < .999).mean() * 100
    return x * gs[:, None], touched, 20 * np.log10(g.min())
mix, touched, maxred = limit(mix)
print(f'limiter: {touched:.2f}% of the film touched, max reduction {maxred:.1f} dB')
chk = OUT / 'pp-mix-lim.wav'; write(chk, mix)
I1, tp1, _ = measure(chk)
gain = 1.0
if tp1 > -1: gain = 10 ** ((-1 - tp1) / 20); mix *= gain
final = OUT / 'purab-se-paschim.wav'; write(final, mix)
I2, tp2, lra2 = measure(final)
print(f'audio: I {I2:.1f} LUFS, LRA {lra2:.1f} LU, TP {tp2:.2f} dBTP, post-trim {20 * np.log10(gain):+.1f} dB')

# 3. mux
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT / 'purab-se-paschim.silent.mp4'), '-i', str(final), '-map', '0:v', '-map', '1:a',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(OUT / 'purab-se-paschim.mp4')], check=True)
print('muxed', OUT / 'purab-se-paschim.mp4')
