// Textures for everything in 3d/, as close to the game as the export allows (the licensor is fine with an
// unmodified look): the colour map as is, plus the game's normal map and its MOHR map repacked for glTF
// (occlusion/roughness/metalness), which the viewer renders with physically based light.
// posterize()/ao are kept for the older toon look (TOON='{"light":32,"ao":0.45}').
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export const DETAIL = { ratio: 0.85, error: 0.0008, body: 1024, eye: 256, variant: 512, light: 0, sat: 16, hue: 3, satBoost: 1.0, ao: 0, maps: 1024,
  ...(process.env.TOON ? JSON.parse(process.env.TOON) : {}) };  // TOON='{"light":0}' for experiments

export function rgb2hsl(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, Math.min(1, s), l];
}
export function hsl2rgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}

export function posterize(data) {
  const band = (x, n) => Math.round(x * n) / n;
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgb2hsl(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
    const [r, g, b] = hsl2rgb(Math.round(h / DETAIL.hue) * DETAIL.hue % 360, band(Math.min(1, s * DETAIL.satBoost), DETAIL.sat), band(l, DETAIL.light));
    data[i] = r * 255; data[i + 1] = g * 255; data[i + 2] = b * 255;
  }
  return data;
}

// T_..._CA.png -> T_..._<suffix>.png next to it, or anywhere in the export (the maps are split across folders)
let sibIndex = null;
export function findSibling(file, suffix) {
  const swap = n => n.replace(/_(CA|C)\.png$/i, `_${suffix}.png`);
  const same = path.join(path.dirname(file), swap(path.basename(file)));
  if (fs.existsSync(same)) return same;
  if (!sibIndex) {
    sibIndex = {};
    const t2 = file.slice(0, file.indexOf('textures2') + 9);
    for (const d of fs.readdirSync(t2)) {
      let fs2; try { fs2 = fs.readdirSync(path.join(t2, d)) } catch { continue }
      for (const f of fs2) if (/_(mohr|n|e)\.png$/i.test(f)) sibIndex[f.toLowerCase()] ||= path.join(t2, d, f);
    }
  }
  return sibIndex[swap(path.basename(file)).toLowerCase()] || null;
}
const findMohr = file => findSibling(file, 'MOHR');

// Unity normal maps keep X in alpha and Y in green; rebuild a standard RGB tangent-space normal map.
export async function normalTex(file, size) {
  const n = findSibling(file, 'N');
  if (!n) return null;
  const { data, info } = await sharp(n).resize(size, size).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(size * size * 3);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    const x = data[i + 3] / 127.5 - 1, y = data[i + 1] / 127.5 - 1, z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    out[j] = (x * 0.5 + 0.5) * 255; out[j + 1] = (y * 0.5 + 0.5) * 255; out[j + 2] = (z * 0.5 + 0.5) * 255;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality: 90 }).toBuffer();
}

// E: what glows in the game (flames, crystals, eyes). null when it is all black.
export async function emissiveTex(file, size) {
  const e = findSibling(file, 'E');
  if (!e) return null;
  const img = sharp(e).resize(size, size).removeAlpha();
  const { channels } = await img.clone().stats();
  if (Math.max(...channels.map(c => c.max)) < 24) return null;
  return img.webp({ quality: 88 }).toBuffer();
}

// MOHR (R metallic, G occlusion, B height, A roughness) -> glTF ORM (R occlusion, G roughness, B metalness)
export async function ormTex(file, size) {
  const m = findMohr(file);
  if (!m) return null;
  const { data, info } = await sharp(m).resize(size, size).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(size * size * 3);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) { out[j] = data[i + 1]; out[j + 1] = data[i + 3]; out[j + 2] = data[i] }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality: 90 }).toBuffer();
}

// file -> toon webp; `recolor(data)` may change the raw pixels first (derived Sparkling/form looks)
export async function toonTex(file, size, recolor) {
  const { data, info } = await sharp(file).resize(size, size).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const mohr = findMohr(file);
  if (mohr && DETAIL.ao) {  // occlusion lives in the green channel (toon look only; PBR uses the ORM map)
    const ao = await sharp(mohr).resize(size, size).extractChannel(1).raw().toBuffer();
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const k = 1 - DETAIL.ao * (1 - ao[j] / 255);
      data[i] *= k; data[i + 1] *= k; data[i + 2] *= k;
    }
  }
  if (recolor) recolor(data);
  if (DETAIL.light) posterize(data);
  return sharp(data, { raw: info }).webp({ quality: 88, alphaQuality: 90 }).toBuffer();
}
