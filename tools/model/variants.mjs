// Make the form textures planned by variants.py.
//   node variants.mjs variants.json <out dir, e.g. ../../3d> [export root]
// Writes <out>/v/<formId>-n-<material>.webp and <out>/variants.json (manifest + Sparkling glow colours).
// Only the game's own form textures are used. A form without one gets no 3D look (the site shows its art):
// guessing a form's colours from the base texture drifted badly. Sparkling looks need no textures at all,
// viewer3d.js draws them over the base or form texture; the glow colours per type come from the old
// manifest (measured hues) and stay as they are.
import fs from 'fs';
import path from 'path';
import { DETAIL, toonTex } from './toon.mjs';

const [planFile, outDir, root = new URL('../../aniimo/out', import.meta.url).pathname] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const manFile = path.join(outDir, 'variants.json');
const old = fs.existsSync(manFile) ? JSON.parse(fs.readFileSync(manFile, 'utf8')) : {};
fs.rmSync(path.join(outDir, 'v'), { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'v'), { recursive: true });

const manifest = { accents: old.accents || [], glow: old.glow || [], models: {} };
let written = 0, skipped = 0;
for (const [slug, p] of Object.entries(plan)) {
  const m = manifest.models[slug] = { mats: p.mats.map(t => path.basename(t).toLowerCase()), looks: {} };
  for (const [fid, look] of Object.entries(p.looks)) {
    const w = look.want.n;
    if (!w) continue;
    // the form's own texture for every material (src), or a form-specific base texture found by variants.py
    const srcs = w.src.map((s, i) => s || (w.base[i] !== p.mats[i] ? w.base[i] : null));
    if (!srcs.length || srcs.some(s => !s)) { skipped++; continue }
    for (let i = 0; i < srcs.length; i++)
      fs.writeFileSync(path.join(outDir, 'v', `${fid}-n-${i}.webp`), await toonTex(path.join(root, srcs[i]), DETAIL.variant * 2));
    m.looks[fid] = 'n'; written++;
  }
}
fs.writeFileSync(manFile, JSON.stringify(manifest));
console.log(`form looks: ${written} from the game, ${skipped} without a game texture (art only)`);
