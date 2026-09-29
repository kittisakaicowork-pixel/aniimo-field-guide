// Shared texture look for everything in 3d/.
// The game's colour maps (CA) are meant to be combined with the occlusion channel of the matching MOHR map
// and the game's lighting; on their own they read pale and flat. So: bake the occlusion in, keep the colour
// depth, then posterize lightly in HSL (hue kept) so the result is still not the game's texture 1:1.
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export const DETAIL = { ratio: 0.85, error: 0.0008, body: 1024, eye: 256, variant: 512, light: 20, sat: 12, hue: 5, satBoost: 1.1, ao: 0.45 };

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

// T_..._CA.png -> T_..._MOHR.png next to it, or anywhere in the export (the maps are split across folders)
let mohrIndex = null;
function findMohr(file) {
  const name = path.basename(file).replace(/_(CA|C)\.png$/i, '_MOHR.png').toLowerCase();
  const same = path.join(path.dirname(file), path.basename(file).replace(/_(CA|C)\.png$/i, '_MOHR.png'));
  if (fs.existsSync(same)) return same;
  if (!mohrIndex) {
    mohrIndex = {};
    const t2 = path.join(file.slice(0, file.indexOf('textures2') + 9));
    for (const d of fs.readdirSync(t2)) {
      let fs2; try { fs2 = fs.readdirSync(path.join(t2, d)) } catch { continue }
      for (const f of fs2) if (/_mohr\.png$/i.test(f)) mohrIndex[f.toLowerCase()] ||= path.join(t2, d, f);
    }
  }
  return mohrIndex[name] || null;
}

// file -> toon webp; `recolor(data)` may change the raw pixels first (derived Sparkling/form looks)
export async function toonTex(file, size, recolor) {
  const { data, info } = await sharp(file).resize(size, size).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const mohr = findMohr(file);
  if (mohr) {  // occlusion lives in the green channel
    const ao = await sharp(mohr).resize(size, size).extractChannel(1).raw().toBuffer();
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const k = 1 - DETAIL.ao * (1 - ao[j] / 255);
      data[i] *= k; data[i + 1] *= k; data[i + 2] *= k;
    }
  }
  if (recolor) recolor(data);
  posterize(data);
  return sharp(data, { raw: info }).webp({ quality: 88, alphaQuality: 90 }).toBuffer();
}
