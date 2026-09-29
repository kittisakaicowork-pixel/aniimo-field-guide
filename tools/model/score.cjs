// Score every candidate in candidates.json in headless Chromium and write picks.json
// (best part set per Aniimo) plus picks/<slug>.png renders for a visual check.
//   node score.cjs <base url of score.html> candidates.json picks.json [slug ...]
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const [base, candFile, outFile, ...only] = process.argv.slice(2);
  const C = JSON.parse(fs.readFileSync(candFile, 'utf8'));
  const picks = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
  fs.mkdirSync('picks', { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const slug of only.length ? only : Object.keys(C)) {
    const p = await b.newPage(); // fresh page per Aniimo keeps memory down
    await p.goto(base + 'score.html'); await p.waitForFunction(() => document.title === 'ready');
    const res = await p.evaluate(e => window.scoreSlug(e), C[slug]).catch(e => [{ score: -1, err: String(e) }]);
    await p.close();
    const top = res[0];
    if (top && top.img) fs.writeFileSync(`picks/${slug}.png`, Buffer.from(top.img.split(',')[1], 'base64'));
    picks[slug] = { mid: C[slug].mid, parts: top && top.parts, score: top && top.score, yaw: top && top.yaw,
      runner_up: res[1] ? res[1].score : null, n: res.length };
    console.log(slug.padEnd(14), (top && top.score), res[1] ? '(next ' + res[1].score + ')' : '', `${res.length} sets`);
    fs.writeFileSync(outFile, JSON.stringify(picks, null, 1));
  }
  await b.close();
})();
