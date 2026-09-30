// Whole-site sweep for tools/daily.sh (and by hand): every view, every Aniimo sheet tab and form, broken images,
// JS errors, 404s. Serves the repository root itself unless a URL is given; exits 1 when anything is wrong.
//   node tools/check/audit.js                 # local build
//   node tools/check/audit.js https://…/      # a deployed copy
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };
function serve() {
  return new Promise(res => {
    const s = http.createServer((q, r) => {
      let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
      const fp = path.join(ROOT, u);
      if (!fp.startsWith(ROOT)) { r.writeHead(403); return r.end() }
      fs.readFile(fp, (e, b) => { if (e) { r.writeHead(404); return r.end('404') } r.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'application/octet-stream' }); r.end(b) });
    }).listen(0, '127.0.0.1', () => res(s));
  });
}
(async () => {
  const server = process.argv[2] ? null : await serve();
  const BASE = process.argv[2] || `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'th-TH', serviceWorkers: 'block' });
  await ctx.route(/supabase\.co/, r => r.abort()); // keep the audit out of the site's visitor stats
  const p = await ctx.newPage();
  const errs = [], bad = [];
  let where = 'load';
  p.on('pageerror', e => errs.push(`[${where}] ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/supabase|ERR_FAILED/.test(m.text())) errs.push(`[${where}] console: ${m.text().slice(0, 200)}`) });
  p.on('response', r => { if (r.status() >= 400 && !/supabase/.test(r.url())) bad.push(`${r.status()} ${r.url()} (${where})`) });
  await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const views = await p.evaluate(() => VIEWS.map(v => v.id));
  const brokenImgs = new Set();
  for (const v of views) {
    where = 'view:' + v;
    await p.evaluate(id => go(id), v); await p.waitForTimeout(v === 'map' || v === 'heist' ? 2500 : 500);
    (await p.evaluate(() => [...document.querySelectorAll('.view:not([hidden]) img')].filter(i => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:')).map(i => i.src))).forEach(s => brokenImgs.add(`${s} (${v})`));
    const len = await p.evaluate(() => { const el = document.querySelector('.view:not([hidden])'); return el ? el.innerText.trim().length : -1 });
    if (len < 40) errs.push(`[view:${v}] looks empty (${len} chars)`);
  }
  const slugs = await p.evaluate(() => ANIIMO.map(a => a.slug));
  for (const s of slugs) {
    for (const tab of ['overview', 'skills', 'forms', 'sparkling']) {
      where = `mon:${s}:${tab}`;
      await p.evaluate(([s, t]) => openMon(s, null, t), [s, tab]); await p.waitForTimeout(80);
      const r = await p.evaluate(() => { const t = (document.getElementById('dlgBody') || {}).innerText || ''; return { undef: /undefined|NaN|\[object Object\]/.test(t), len: t.length } });
      if (r.undef) errs.push(`[${where}] shows undefined/NaN`);
      if (r.len < 60) errs.push(`[${where}] almost empty`);
    }
    const nf = await p.evaluate(s => BY[s].f.length, s);
    for (let i = 0; i < nf; i++) {
      where = `mon:${s}:form${i}`;
      await p.evaluate(([s, i]) => openMon(s, i, 'overview'), [s, i]); await p.waitForTimeout(40);
      if (await p.evaluate(() => /undefined|NaN/.test(document.getElementById('dlgBody').innerText))) errs.push(`[${where}] shows undefined/NaN`);
    }
  }
  const out = { views: views.length, aniimo: slugs.length, brokenImgs: [...brokenImgs].slice(0, 20), errs: [...new Set(errs)].slice(0, 60), bad: [...new Set(bad)].slice(0, 40) };
  console.log(JSON.stringify(out, null, 1));
  await b.close(); if (server) server.close();
  process.exit(out.brokenImgs.length || out.errs.length || out.bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
