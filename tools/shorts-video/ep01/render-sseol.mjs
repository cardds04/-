// EP.01 프레임 렌더러 — Playwright로 seek(t) 프레임 캡처 → ffmpeg 파이프 인코딩
import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const DUR = 52.0;
const FRAMES = Math.round(FPS * DUR);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--force-color-profile=srgb', '--disable-lcd-text', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto('file://' + path.join(DIR, 'shorts-sseol.html'));
await page.evaluate(() => document.fonts.ready);

const ff = spawn(FFMPEG, [
  '-y',
  '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-i', path.join(DIR, 'audio-sseol.wav'),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-preset', 'medium',
  '-c:a', 'aac', '-b:a', '192k',
  '-shortest', '-movflags', '+faststart',
  path.join(DIR, 'ep01-sseol.mp4'),
], { stdio: ['pipe', 'inherit', 'inherit'] });

const t0 = Date.now();
for (let i = 0; i < FRAMES; i++) {
  const t = i / FPS;
  await page.evaluate(tt => window.seek(tt), t);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 150 === 0) console.log(`frame ${i}/${FRAMES} (${((Date.now()-t0)/1000).toFixed(0)}s elapsed)`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
await browser.close();
console.log('done in', ((Date.now()-t0)/1000).toFixed(0), 'sec');
