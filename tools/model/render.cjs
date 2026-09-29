// Render the site's 2D images from 3d/: 12 Sparkling types per look, and plain art for creatures the game
// has no Research Book art for.
//   node render.cjs <base url of render.html> <3d/variants.json> <cache dir, e.g. ../cache/img> [plain slug ...]
// Writes <cache>/spark-own/<formId>_<nn>.webp (640px) and <cache>/own-art/<slug>.webp.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { chromium } = require('playwright');

// measured accents are muddy averages; keep their hue, lift them to glow colours
function vivid(hex, kind) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = !d ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
  const [s, l] = kind === 'd' ? [0.55, 0.32] : kind === 'z' ? [0.35, 0.88] : [0.8, 0.62];
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [R, G, B] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [R, G, B].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

(async () => {
  const [base, manFile, cacheDir, ...plain] = process.argv.slice(2);
  const man = JSON.parse(fs.readFileSync(manFile, 'utf8'));
  const accents = man.accents.map((h, n) => vivid(h, n === 10 ? 'z' : n === 11 ? 'd' : 's'));
  console.log('accents', accents.join(' '));
  const sparkDir = path.join(cacheDir, 'spark-own'), artDir = path.join(cacheDir, 'own-art');
  fs.mkdirSync(sparkDir, { recursive: true }); fs.mkdirSync(artDir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const save = async (url, file) => sharp(Buffer.from(url.split(',')[1], 'base64')).trim({ threshold: 1 })
    .resize(600, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ top: 20, bottom: 20, left: 20, right: 20, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 86 }).toFile(file);
  let n = 0;
  for (const [slug, m] of Object.entries(man.models)) {
    const p = await b.newPage(); await p.goto(base + 'render.html'); await p.waitForFunction(() => document.title === 'ready');
    for (const [fid, kinds] of Object.entries(m.looks)) {
      if (!/[szd]/.test(kinds)) continue;
      for (let t = 0; t < 12; t++) {
        const kind = t < 10 ? 's' : t === 10 ? 'z' : 'd';
        if (!kinds.includes(kind)) continue;
        const url = await p.evaluate(l => window.renderLook(l), { slug, mats: m.mats, fid, kind, accent: accents[t] });
        await save(url, path.join(sparkDir, `${fid}_${String(t + 1).padStart(2, '0')}.webp`)); n++;
      }
    }
    if (plain.includes(slug)) await save(await p.evaluate(l => window.renderLook(l), { slug, mats: m.mats, kind: '' }), path.join(artDir, `${slug}.webp`));
    await p.close();
    process.stdout.write(slug + ' ');
  }
  man.glow = accents;  // the site's 3D view uses the same colours
  fs.writeFileSync(manFile, JSON.stringify(man));
  console.log(`\n${n} Sparkling images`);
  await b.close();
})();
