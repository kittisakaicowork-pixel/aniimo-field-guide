// Colour transfer in Lab: measure mean/spread of two images, move a texture's colours from one to the other.
import sharp from 'sharp';

const lin = c => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const gam = c => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
export function lab(r, g, b) {
  r = lin(r); g = lin(g); b = lin(b);
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047), y = f(0.2126 * r + 0.7152 * g + 0.0722 * b), z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export function rgb(L, A, B) {
  const y = (L + 16) / 116, x = A / 500 + y, z = y - B / 200;
  const g3 = t => t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787;
  const X = g3(x) * 0.95047, Y = g3(y), Z = g3(z) * 1.08883;
  const c = v => Math.max(0, Math.min(255, gam(v)));
  return [c(3.2406 * X - 1.5372 * Y - 0.4986 * Z), c(-0.9689 * X + 1.8758 * Y + 0.0415 * Z), c(0.0557 * X - 0.204 * Y + 1.057 * Z)];
}
export async function pixels(file, size = 160) {
  const { data } = await sharp(file).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  return data;
}
export async function stats(file) {  // Lab mean/sd over clearly opaque pixels (drops the soft ground shadow)
  const d = await pixels(file), s = [0, 0, 0], q = [0, 0, 0]; let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 220) { const v = lab(d[i], d[i + 1], d[i + 2]); for (let k = 0; k < 3; k++) { s[k] += v[k]; q[k] += v[k] * v[k] } n++ }
  if (n < 50) return null;
  const m = s.map(v => v / n);
  return { m, sd: q.map((v, k) => Math.sqrt(Math.max(1e-6, v / n - m[k] * m[k]))) };
}
export const transfer = (a, b) => ({ m0: a.m, sd0: a.sd, m1: b.m, sd1: b.sd });
export function avgT(ts) {
  const avg = f => [0, 1, 2].map(k => ts.reduce((s, t) => s + t[f][k], 0) / ts.length);
  return { m0: avg('m0'), sd0: avg('sd0'), m1: avg('m1'), sd1: avg('sd1') };
}
export const recolorWith = T => data => {
  for (let i = 0; i < data.length; i += 4) {
    const v = lab(data[i], data[i + 1], data[i + 2]);
    const o = v.map((x, k) => (x - T.m0[k]) * Math.max(0.6, Math.min(1.6, T.sd1[k] / T.sd0[k])) + T.m1[k]);
    const c = rgb(Math.max(0, Math.min(100, o[0])), o[1], o[2]);
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
  }
};


// run several recolours in order
export const chain = (...fs) => data => { for (const f of fs) if (f) f(data) };
