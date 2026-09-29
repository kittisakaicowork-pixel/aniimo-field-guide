// Make the variant textures planned by variants.py and the Sparkling accent colours.
//   node variants.mjs variants.json <out dir, e.g. ../../3d> [export root]
// Writes <out>/v/<formId>-<kind>-<material>.webp and <out>/variants.json (manifest + accent colours).
// A form's own game texture is used when the export has one; Sparkling looks are derived from the plain texture
// with a colour transfer (mean/spread per Lab channel) measured between reference images of the plain
// and the Sparkling/form look. The references need not line up, and only the numbers are kept.
import fs from 'fs';
import path from 'path';
import { DETAIL, toonTex } from './toon.mjs';
import { stats, transfer, avgT, recolorWith, pixels, chain } from './colour.mjs';

const [planFile, outDir, root = '/Volumes/Kittisak/aniimo/out'] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
// colour match to the reference (match.mjs) goes first, like the base model's textures
const matchFile = path.join(path.dirname(new URL(import.meta.url).pathname), 'match.json');
const MATCH = fs.existsSync(matchFile) ? JSON.parse(fs.readFileSync(matchFile, 'utf8')) : {};
fs.mkdirSync(path.join(outDir, 'v'), { recursive: true });

// ---- 1. measure transfers per look, and Sparkling accent colours (types line up with each other)
const TYPES = { s: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], z: [10], d: [11] };
const measured = {}, global = { s: [], z: [], d: [], n: [] };
const accent = Array.from({ length: 12 }, () => ({ r: 0, g: 0, b: 0, w: 0 }));
for (const [slug, p] of Object.entries(plan)) {
  const baseCommon = p.looks[Object.keys(p.looks)[0]]?.ref.common;
  for (const [fid, look] of Object.entries(p.looks)) {
    const c = look.ref.common && await stats(look.ref.common);
    const T = measured[fid] = {};
    if (look.want.n && c && baseCommon && look.ref.common !== baseCommon) {
      const b = await stats(baseCommon); if (b) { T.n = transfer(b, c); global.n.push(T.n) }
    }
    if (look.ref.spark.length === 12 && c) {
      for (const k of ['s', 'z', 'd']) {
        const ts = [];
        for (const n of TYPES[k]) { const t = await stats(look.ref.spark[n]); if (t) ts.push(transfer(c, t)) }
        if (ts.length) { T[k] = avgT(ts); global[k].push(T[k]) }
      }
      // accents: pixels where one type departs from the per-pixel median of types I-X
      const P = await Promise.all(look.ref.spark.map(f => pixels(f, 120)));
      for (let i = 0; i < P[0].length; i += 4) {
        const med = [0, 1, 2].map(k => P.slice(0, 10).map(q => q[i + k]).sort((a, b) => a - b)[5]);
        for (let n = 0; n < 12; n++) {
          const q = P[n]; if (q[i + 3] < 60) continue;
          const dist = Math.abs(q[i] - med[0]) + Math.abs(q[i + 1] - med[1]) + Math.abs(q[i + 2] - med[2]);
          if (dist > 90) { const w = dist; accent[n].r += q[i] * w; accent[n].g += q[i + 1] * w; accent[n].b += q[i + 2] * w; accent[n].w += w }
        }
      }
    }
  }
}
const G = Object.fromEntries(Object.entries(global).map(([k, v]) => [k, v.length ? avgT(v) : null]));
const hex = a => '#' + [a.r, a.g, a.b].map(v => Math.round(v / Math.max(1, a.w)).toString(16).padStart(2, '0')).join('');
const accents = accent.map(hex);
console.log('accents', accents.join(' '), '| samples', Object.fromEntries(Object.entries(global).map(([k, v]) => [k, v.length])));

// ---- 2. write textures
const manifest = { accents, models: {} };
let fromGame = 0, derived = 0;
for (const [slug, p] of Object.entries(plan)) {
  const M = MATCH[slug] ? recolorWith(MATCH[slug]) : null;
  const m = manifest.models[slug] = { mats: p.mats.map(t => path.basename(t).toLowerCase()), looks: {} };
  for (const [fid, look] of Object.entries(p.looks)) {
    const kinds = [];
    for (const [kind, w] of Object.entries(look.want)) {
      const T = measured[fid][kind] || G[kind];
      let ok = true;
      for (let i = 0; i < p.mats.length; i++) {
        const out = path.join(outDir, 'v', `${fid}-${kind}-${i}.webp`);
        // game Shiny/DarkShiny/WhiteShiny maps are shader inputs (masks), not the colours players see,
        // so Sparkling looks are always derived; only a form's own texture is used as is
        if (kind === 'n' && w.src[i]) { fs.writeFileSync(out, await toonTex(path.join(root, w.src[i]), DETAIL.variant, M)); fromGame++ }
        else if (kind === 'n' && w.base[i] !== p.mats[i]) { fs.writeFileSync(out, await toonTex(path.join(root, w.base[i]), DETAIL.variant, M)); fromGame++ }
        else if (T) { fs.writeFileSync(out, await toonTex(path.join(root, w.base[i]), DETAIL.variant, chain(M, recolorWith(T)))); derived++ }
        else ok = false;
      }
      if (ok) kinds.push(kind);
    }
    if (kinds.length) m.looks[fid] = kinds.join('');
  }
}
fs.writeFileSync(path.join(outDir, 'variants.json'), JSON.stringify(manifest));
console.log(`textures: ${fromGame} from the game, ${derived} derived`);
