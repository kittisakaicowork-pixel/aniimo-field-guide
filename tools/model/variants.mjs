// Make the form textures planned by variants.py.
//   node variants.mjs variants.json <out dir, e.g. ../../3d> [export root]
// Writes <out>/v/<formId>-n-<material>.webp and <out>/variants.json (manifest + Sparkling glow colours).
//  1. the game's own form texture, even when it covers only some materials (the rest keep the model's);
//  2. otherwise (region/night/weather forms the game recolours in its shader, with no texture of their own)
//     the model's texture moved by a colour transfer measured between reference renders of the plain look and
//     the form (AniiDex, owner's permission; only the numbers are kept).
// Every form look is then checked by eye; the ones that still look wrong go into exclude.json.
// Sparkling looks need no textures: viewer3d.js draws them over the base or form texture.
import fs from 'fs';
import path from 'path';
import { DETAIL, toonTex } from './toon.mjs';
import { stats, transfer, recolorWith } from './colour.mjs';

const [planFile, outDir, root = new URL('../../aniimo/out', import.meta.url).pathname] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const manFile = path.join(outDir, 'variants.json');
const old = fs.existsSync(manFile) ? JSON.parse(fs.readFileSync(manFile, 'utf8')) : {};
fs.rmSync(path.join(outDir, 'v'), { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'v'), { recursive: true });

const manifest = { accents: old.accents || [], glow: old.glow || [], models: {} };
const count = { game: 0, partial: 0, derived: 0, none: 0 }, how = {};
for (const [slug, p] of Object.entries(plan)) {
  const m = manifest.models[slug] = { mats: p.mats.map(t => path.basename(t).toLowerCase()), looks: {} };
  const baseRef = Object.values(p.looks).find(l => l.kind === 'base')?.ref.common;
  for (const [fid, look] of Object.entries(p.looks)) {
    const w = look.want.n;
    if (!w || !p.mats.length) continue;
    const own = w.src.map((s, i) => s || (w.base[i] !== p.mats[i] ? w.base[i] : null));
    const out = i => path.join(outDir, 'v', `${fid}-n-${i}.webp`);
    if (own.some(Boolean)) {
      for (let i = 0; i < p.mats.length; i++) fs.writeFileSync(out(i), await toonTex(path.join(root, own[i] || p.mats[i]), DETAIL.variant * 2));
      const k = own.every(Boolean) ? 'game' : 'partial'; count[k]++; how[fid] = k;
    } else if (baseRef && look.ref.common) {
      const [a, b] = [await stats(baseRef), await stats(look.ref.common)];
      if (!a || !b) { count.none++; continue }
      const T = recolorWith(transfer(a, b));
      for (let i = 0; i < p.mats.length; i++) fs.writeFileSync(out(i), await toonTex(path.join(root, p.mats[i]), DETAIL.variant * 2, T));
      count.derived++; how[fid] = 'derived';
    } else { count.none++; continue }
    m.looks[fid] = 'n';
  }
}
fs.writeFileSync(manFile, JSON.stringify(manifest));
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'variants-how.json'), JSON.stringify(how, null, 1));
console.log('form looks:', JSON.stringify(count));
