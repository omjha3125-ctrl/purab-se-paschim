// Render a riso film at a non-square frame: node renderfmt.mjs film.html fmt from to out.mp4 [stillOnly]
import path from 'node:path'; import url from 'node:url'; import { spawn } from 'node:child_process';
import { launch } from '/home/claude/riso/riso-windowseat-main/tools/lib/browser.mjs';
const [film, fmt, from, to, out, still] = process.argv.slice(2);
const [FW, FH] = fmt === 'landscape' ? [1920, 1080] : [1080, 1920];
const b = await launch('chromium');
const page = await b.newPage({ viewport: { width: FW * 2 / 3, height: FH * 2 / 3 }, deviceScaleFactor: 1.5 });
await page.goto(url.pathToFileURL(path.resolve(film)).href + '?fmt=' + fmt, { waitUntil: 'load' });
await page.waitForFunction(() => window.__riso && window.__riso.ready === true, null, { timeout: 300000 });
if (still) { for (const t of still.split(',')) { await page.evaluate(t => window.__riso.seek(t), Number(t)); await page.screenshot({ path: out.replace('.mp4', `-${t}.png`) }); } await b.close(); process.exit(0); }
const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-i', 'pipe:0', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const n = Math.round((Number(to) - Number(from)) * 30), t0 = Date.now();
for (let f = 0; f < n; f++) {
  await page.evaluate(t => window.__riso.seek(t), Number(from) + f / 30);
  const buf = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 90 === 0) console.log(fmt, f, '/', n, ((Date.now() - t0) / 1000 / (f + 1)).toFixed(2), 's/frame');
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', out);
