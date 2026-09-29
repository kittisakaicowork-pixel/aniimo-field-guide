// Brightness only (never hue): render each plain model with the site's viewer, compare its mean lightness with
// a reference render of the in-game model (AniiDex, owner's permission; only the number is kept) and store a
// gain in bright.json. obj2glb.mjs multiplies the colour maps by it, so creatures whose colour maps are darker
// than they look in the game (stone, metal) come out right. Clamped to 0.85-1.7.
//   node bright.mjs <base url of render.html> picks.json <reference dir, e.g. ../cache/img/full1024>
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { stats } from './colour.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const [base, picksFile, refDir] = process.argv.slice(2);
const picks = JSON.parse(fs.readFileSync(picksFile, 'utf8'));
const outFile = path.join(path.dirname(picksFile), 'bright.json');
const out = {};
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto(base + 'render.html'); await p.waitForFunction(() => document.title === 'ready');
const tmp = path.join(os.tmpdir(), 'aniiguide-bright.png');
for (const [slug, pk] of Object.entries(picks)) {
  const ref = path.join(refDir, pk.form_of ? `f${pk.mid}.webp` : `${slug}.webp`);
  if (!fs.existsSync(ref) || !fs.existsSync(`../../3d/${slug}.glb`)) continue;
  const url = await p.evaluate(l => window.renderLook(l), { slug, mats: [], kind: '' });
  fs.writeFileSync(tmp, Buffer.from(url.split(',')[1], 'base64'));
  const [a, g] = [await stats(tmp), await stats(ref)];
  if (!a || !g) continue;
  const gain = Math.min(1.7, Math.max(0.85, g.m[0] / Math.max(1, a.m[0])));
  if (Math.abs(gain - 1) > 0.06) out[slug] = +gain.toFixed(3);
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(Object.keys(out).length, 'adjusted', JSON.stringify(out));
await b.close();
