// Render the site's 2D images from 3d/ with the site's own viewer (render.html -> viewer3d.js):
// the 12 Sparkling types of every Sparkling look on the site, and plain art for creatures the game has none for.
//   node render.cjs <base url of render.html> <3d/variants.json> <cache dir, e.g. ../cache/img> [plain slug ...]
// Writes <cache>/spark-own/<formId>_<nn>.webp and <cache>/own-art/<slug>.webp.
// A Prismana look is rendered only when the game has the form's texture; otherwise the site falls back.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { chromium } = require('playwright');

(async () => {
  const [base, manFile, cacheDir, ...plain] = process.argv.slice(2);
  const man = JSON.parse(fs.readFileSync(manFile, 'utf8'));
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'raw.json'), 'utf8'));
  const picks = JSON.parse(fs.readFileSync(path.join(__dirname, 'picks.json'), 'utf8'));
  const idle = JSON.parse(fs.readFileSync(path.join(__dirname, 'idle.json'), 'utf8'));
  const sparkling = new Set(raw.sparkling);
  const sparkDir = path.join(cacheDir, 'spark-own'), artDir = path.join(cacheDir, 'own-art');
  fs.rmSync(sparkDir, { recursive: true, force: true });
  fs.mkdirSync(sparkDir, { recursive: true }); fs.mkdirSync(artDir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const save = async (url, file) => sharp(Buffer.from(url.split(',')[1], 'base64')).trim({ threshold: 1 })
    .resize(600, 600, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ top: 20, bottom: 20, left: 20, right: 20, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 88 }).toFile(file);
  let n = 0;
  for (const a of raw.aniimo) {
    const m = man.models[a.slug];
    if (!m || a.unreleased) continue;
    const period = picks[a.slug] && idle[picks[a.slug].mid];
    const looks = [];
    if (sparkling.has(a.slug) && a.full_id) looks.push([a.full_id, null]);
    for (const f of a.forms) if (f.kind === 'prismana' && sparkling.has(a.slug) && (m.looks[f.id] || '').includes('n')) looks.push([f.id, (m.fg || []).includes(f.id) ? 'own' : f.id]);
    const needArt = plain.includes(a.slug);
    if (!looks.length && !needArt) continue;
    const p = await b.newPage(); await p.goto(base + 'render.html'); await p.waitForFunction(() => document.title === 'ready');
    for (const [fid, texFid] of looks) {
      for (let t = 0; t < 12; t++) {
        const kind = t < 10 ? 's' : t === 10 ? 'z' : 'd';
        const own = texFid === 'own';  // a form with its own mesh: 3d/f<formId>.glb
        const url = await p.evaluate(l => window.renderLook(l), { slug: own ? 'f' + fid : a.slug, mats: m.mats, texFid: own ? null : texFid, kind, glow: man.glow[t], period });
        await save(url, path.join(sparkDir, `${fid}_${String(t + 1).padStart(2, '0')}.webp`)); n++;
      }
    }
    if (needArt) await save(await p.evaluate(l => window.renderLook(l), { slug: a.slug, mats: m.mats, kind: '', period }), path.join(artDir, `${a.slug}.webp`));
    await p.close();
    process.stdout.write(a.slug + ' ');
  }
  console.log(`\n${n} Sparkling images`);
  await b.close();
})();
