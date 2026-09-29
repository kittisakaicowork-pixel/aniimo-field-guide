// Make the variant textures planned by variants.py and the Sparkling accent colours.
//   node variants.mjs variants.json <out dir, e.g. ../../3d> [export root]
// Writes <out>/v/<formId>-<kind>-<material>.webp and <out>/variants.json (manifest + accent colours).
// A form's own game texture is used when the export has one; Sparkling looks are derived from the plain texture
// with a colour transfer (mean/spread per Lab channel) measured between reference images of the plain
// and the Sparkling/form look. The references need not line up, and only the numbers are kept.
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { DETAIL, toonTex } from './toon.mjs';

const [planFile, outDir, root = '/Volumes/Kittisak/aniimo/out'] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
fs.mkdirSync(path.join(outDir, 'v'), { recursive: true });

// ---- colour helpers (sRGB <-> Lab)
const lin = c => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const gam = c => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function lab(r, g, b) {
  r = lin(r); g = lin(g); b = lin(b);
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047), y = f(0.2126 * r + 0.7152 * g + 0.0722 * b), z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function rgb(L, A, B) {
  const y = (L + 16) / 116, x = A / 500 + y, z = y - B / 200;
  const g3 = t => t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787;
  const X = g3(x) * 0.95047, Y = g3(y), Z = g3(z) * 1.08883;
  const c = v => Math.max(0, Math.min(255, gam(v)));
  return [c(3.2406 * X - 1.5372 * Y - 0.4986 * Z), c(-0.9689 * X + 1.8758 * Y + 0.0415 * Z), c(0.0557 * X - 0.204 * Y + 1.057 * Z)];
}
async function pixels(file, size = 160) {
  const { data } = await sharp(file).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  return data;
}
async function stats(file) {  // Lab mean/sd over clearly opaque pixels (drops the soft ground shadow)
  const d = await pixels(file), s = [0, 0, 0], q = [0, 0, 0]; let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 220) { const v = lab(d[i], d[i + 1], d[i + 2]); for (let k = 0; k < 3; k++) { s[k] += v[k]; q[k] += v[k] * v[k] } n++ }
  if (n < 50) return null;
  const m = s.map(v => v / n);
  return { m, sd: q.map((v, k) => Math.sqrt(Math.max(1e-6, v / n - m[k] * m[k]))) };
}
const transfer = (a, b) => ({ m0: a.m, sd0: a.sd, m1: b.m, sd1: b.sd });
function avgT(ts) {
  const avg = f => [0, 1, 2].map(k => ts.reduce((s, t) => s + t[f][k], 0) / ts.length);
  return { m0: avg('m0'), sd0: avg('sd0'), m1: avg('m1'), sd1: avg('sd1') };
}
const recolorWith = T => data => {
  for (let i = 0; i < data.length; i += 4) {
    const v = lab(data[i], data[i + 1], data[i + 2]);
    const o = v.map((x, k) => (x - T.m0[k]) * Math.max(0.6, Math.min(1.6, T.sd1[k] / T.sd0[k])) + T.m1[k]);
    const c = rgb(Math.max(0, Math.min(100, o[0])), o[1], o[2]);
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
  }
};

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
        if (kind === 'n' && w.src[i]) { fs.writeFileSync(out, await toonTex(path.join(root, w.src[i]), DETAIL.variant)); fromGame++ }
        else if (kind === 'n' && w.base[i] !== p.mats[i]) { fs.writeFileSync(out, await toonTex(path.join(root, w.base[i]), DETAIL.variant)); fromGame++ }
        else if (T) { fs.writeFileSync(out, await toonTex(path.join(root, w.base[i]), DETAIL.variant, recolorWith(T))); derived++ }
        else ok = false;
      }
      if (ok) kinds.push(kind);
    }
    if (kinds.length) m.looks[fid] = kinds.join('');
  }
}
fs.writeFileSync(path.join(outDir, 'variants.json'), JSON.stringify(manifest));
console.log(`textures: ${fromGame} from the game, ${derived} derived`);
