/* AniiGuide Liquid Glass: a glass bottom bar on phones and tablets, a glass shortcut dock and search pill on computers.
   Loaded after the page has fully shown (see index.html), only where WebGL works and motion is welcome.
   Library: vendor/liquid-glass (Liquid Glass JS by dashersw, MIT) + vendor/html2canvas-pro (MIT).
   The library draws the glass from a photo of the page, so the photo is retaken after each page change. */
(function () {
  const EN = typeof LANG !== 'undefined' && LANG === 'en';
  const T = (th, en) => (EN ? en : th);
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'vendor/liquid-glass/glass.css?v=1'; document.head.appendChild(css);
  window.glassControls = { edgeIntensity: .015, rimIntensity: .06, baseIntensity: .01, edgeDistance: .15, rimDistance: .8, baseDistance: .1, cornerBoost: .02, rippleEffect: .08, blurRadius: 6, tintOpacity: .25 };
  const PHONE_TABS = [['home', T('หน้าแรก', 'Home')], ['dex', 'Aniilog'], ['map', T('แผนที่', 'Map')], ['builder', T('บิลด์', 'Build')], ['more', T('เพิ่มเติม', 'More')]];
  const DESK = [['dex', T('รายชื่อ Aniimo', 'Aniimo list')], ['map', T('แผนที่', 'Map')], ['tier', 'Tier List'], ['builder', T('ตัวจัดบิลด์', 'Build planner')], ['codes', T('โค้ด', 'Codes')]];
  let busy = false, timer = 0;
  function reset() {
    ['lgDock', 'lgSearch', 'lgDockD', 'lgSearchD'].forEach(id => document.getElementById(id)?.remove());
    Container.instances.length = 0; Container.pageSnapshot = null; Container.isCapturing = false; Container.waitingForSnapshot.length = 0;
  }
  function build() {
    if (busy) return; busy = true;
    try {
      reset();
      const cur = (location.hash.slice(1) || 'home').split('?')[0];
      if (innerWidth < 960) {
        const host = document.createElement('div'); host.id = 'lgDock'; document.body.appendChild(host);
        const dock = new Container({ type: 'pill', borderRadius: 28, tintOpacity: .22 }); host.appendChild(dock.element);
        PHONE_TABS.forEach(([id, label]) => {
          const b = new Button({ text: label, size: 13, type: 'pill', tintOpacity: .12, onClick: () => { if (id === 'more') document.getElementById('moreBtn').click(); else go(id) } });
          if (id === cur) b.element.classList.add('on'); dock.addChild(b);
        });
        const hero = cur === 'home' && document.querySelector('#mhome .mh-hero');
        if (hero && getComputedStyle(hero).display !== 'none') {
          const w = document.createElement('div'); w.id = 'lgSearch'; hero.appendChild(w);
          w.appendChild(new Button({ text: '🔍  ' + T('ค้นหา Aniimo หรือสกิล…', 'Search Aniimo or skills…'), size: 15, type: 'pill', tintOpacity: .18, onClick: () => document.getElementById('gq').focus() }).element);
        }
      } else {
        const host = document.createElement('div'); host.id = 'lgDockD'; document.body.appendChild(host);
        const dock = new Container({ type: 'pill', borderRadius: 34, tintOpacity: .2 }); host.appendChild(dock.element);
        DESK.forEach(([id, label]) => dock.addChild(new Button({ text: label, size: 15, type: 'pill', tintOpacity: .1, onClick: () => go(id) })));
        const hs = cur === 'home' && document.querySelector('[data-view="home"] .hsearch');
        if (hs) {
          const w = document.createElement('div'); w.id = 'lgSearchD'; hs.insertAdjacentElement('afterend', w);
          w.appendChild(new Button({ text: '🔍  ' + T('ค้นหา Aniimo หรือสกิล', 'Search Aniimo or skills') + '   /', size: 17, type: 'pill', tintOpacity: .16, onClick: () => document.getElementById('gq').focus() }).element);
        }
      }
      document.documentElement.classList.add('lg-on');
    } catch (e) { console.warn('glass', e); reset(); document.documentElement.classList.remove('lg-on') }
    setTimeout(() => { busy = false }, 800);
  }
  const later = ms => { clearTimeout(timer); timer = setTimeout(build, ms) };
  addEventListener('hashchange', () => later(700));
  addEventListener('popstate', () => later(700));
  let w0 = innerWidth; addEventListener('resize', () => { if ((innerWidth < 960) !== (w0 < 960)) later(400); w0 = innerWidth });
  new MutationObserver(() => { if (!document.querySelector('[data-theme]')) return; later(300) }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  build();
})();
