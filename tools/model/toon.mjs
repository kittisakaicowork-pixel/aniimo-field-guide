// Shared texture look for everything in 3d/: posterize in HSL (hue kept, lightness/saturation in bands)
// so the textures are not the game's 1:1. Per-channel posterizing turns dark browns red/green, hence HSL.
import sharp from 'sharp';

export const DETAIL = { ratio: 0.85, error: 0.0008, body: 1024, eye: 256, variant: 512, light: 12, sat: 6, hue: 10 };

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

// raw RGBA pixels (Buffer) -> posterized in place
export function posterize(data) {
  const band = (x, n) => Math.round(x * n) / n;
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgb2hsl(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
    const [r, g, b] = hsl2rgb(Math.round(h / DETAIL.hue) * DETAIL.hue % 360, band(s, DETAIL.sat), band(l, DETAIL.light));
    data[i] = r * 255; data[i + 1] = g * 255; data[i + 2] = b * 255;
  }
  return data;
}

// file -> toon webp; `recolor(data)` may change the raw pixels first (derived Sparkling/form looks)
export async function toonTex(file, size, recolor) {
  const { data, info } = await sharp(file).resize(size, size).median(3).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  if (recolor) recolor(data);
  posterize(data);
  return sharp(data, { raw: info }).webp({ quality: 85, alphaQuality: 90 }).toBuffer();
}
