// Match each model's colours to a reference render of the creature: render the plain model (render.html), compare
// its Lab mean/spread with the reference (AniiDex's full-body image, used for comparison only: just these six
// numbers are kept, the image itself is never copied into the site or the model), and store the transfer in match.json. obj2glb.mjs applies it to the body
// textures, so the model reads like the game instead of the pale raw colour maps.
//   node match.mjs <base url of render.html> picks.json match.json <reference dir, e.g. ../cache/img/full1024> [slug ...]
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { stats, transfer } from './colour.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const [base, picksFile, outFile, artDir, ...only] = process.argv.slice(2);
const picks = JSON.parse(fs.readFileSync(picksFile, 'utf8'));
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.goto(base + 'render.html'); await p.waitForFunction(() => document.title === 'ready');
const tmp = path.join(os.tmpdir(), 'aniiguide-match.png');
for (const slug of only.length ? only : Object.keys(picks)) {
  const art = path.join(artDir, `${slug}.webp`);
  if (!fs.existsSync(art)) continue;
  const url = await p.evaluate(l => window.renderLook(l), { slug, mats: [], kind: '' });
  fs.writeFileSync(tmp, Buffer.from(url.split(',')[1], 'base64'));
  const [a, g] = [await stats(tmp), await stats(art)];
  if (a && g) out[slug] = transfer(a, g);
  process.stdout.write(slug + ' ');
}
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(`\n${Object.keys(out).length} matched`);
await b.close();
