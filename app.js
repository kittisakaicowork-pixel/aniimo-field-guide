/* AniiGuide app (was inline in index.html; loaded with defer after data.js, thumbs.js, content.js) */
/* ===== theme ===== */
(function(){
  const root=document.documentElement,btn=document.getElementById('themeBtn'),meta=document.querySelector('meta[name=theme-color]');
  const mq=matchMedia('(prefers-color-scheme: dark)');
  let saved=null;try{saved=localStorage.getItem('aniimo-theme')}catch(_){}
  if(saved!=='dark')saved='light'; // soft light look by default; dark stays one tap away
  root.setAttribute('data-theme',saved);
  const isDark=()=>root.getAttribute('data-theme')?root.getAttribute('data-theme')==='dark':mq.matches;
  const sync=()=>{btn.setAttribute('aria-label',isDark()?'เปลี่ยนเป็นโหมดสว่าง':'เปลี่ยนเป็นโหมดมืด');meta.content=isDark()?'#0B1426':'#1E9BEB'};
  btn.addEventListener('click',()=>{const n=isDark()?'light':'dark';root.setAttribute('data-theme',n);try{localStorage.setItem('aniimo-theme',n)}catch(_){}sync()});
  mq.addEventListener&&mq.addEventListener('change',sync);sync();
})();

/* images: mark loaded (or failed) so CSS can fade them in */
{const mark=e=>{const t=e.target;if(t&&t.tagName==='IMG')t.classList.add('in')};document.addEventListener('load',mark,true);document.addEventListener('error',mark,true)}

/* ===== data ===== */
const LOC=(()=>{try{return localStorage.getItem('aniimo-lang')==='en'?'en-GB':'th-TH'}catch(_){return 'th-TH'}})();
const E=[{k:'fire',th:'ไฟ',en:'Fire'},{k:'water',th:'น้ำ',en:'Water'},{k:'grass',th:'พืช',en:'Grass'},{k:'lightning',th:'สายฟ้า',en:'Lightning'},{k:'ice',th:'น้ำแข็ง',en:'Ice'},{k:'earth',th:'ดิน',en:'Earth'},{k:'wind',th:'ลม',en:'Wind'},{k:'light',th:'แสง',en:'Light'},{k:'dark',th:'มืด',en:'Dark'}];
if(LOC==='en-GB')E.forEach(e=>e.th=e.en);
const EK=Object.fromEntries(E.map(e=>[e.k,e]));
const M={fire:{s:['grass','ice'],r:['fire','water','earth','light']},water:{s:['fire','earth'],r:['water','grass','ice','light']},grass:{s:['water','earth'],r:['fire','grass','light']},lightning:{s:['water','wind'],r:['lightning','ice','earth']},ice:{s:['water','lightning'],r:['fire','ice','earth']},earth:{s:['fire','ice'],r:['water','grass','earth','dark']},wind:{s:['grass','dark'],r:['lightning','wind']},light:{s:['wind','dark'],r:['lightning','light']},dark:{s:['grass','lightning','light'],r:['water','wind']}};
const mult=(a,d)=>M[a].s.includes(d)?1.6:M[a].r.includes(d)?0.625:1;
const fmt=v=>'×'+(Math.round(v*1000)/1000);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const badge=k=>EK[k]?`<span class="ebadge" style="--c:var(--${k})"><img src="img/ui/el-${k}.webp" alt="" width="16" height="16">${EK[k].th}</span>`:'';
const ROLE_IC={DPS:'dps',Break:'break',Support:'support',Heal:'heal',Regen:'regen'};
const roleChip=r=>ROLE_IC[r]?`<span class="rchip"><img src="img/ui/role-${ROLE_IC[r]}.webp" alt="" width="14" height="14">${r}</span>`:`<span class="rchip">${r||'—'}</span>`;
const KIND={region:'ภูมิภาค',prismana:'Prismana',rain:'ฝน/พายุ',thunder:'พายุฟ้าคะนอง',snow:'หิมะ',night:'กลางคืน'};
const SLOT={atk:'โจมตีปกติ',s1:'สกิล 1',s2:'สกิล 2',s3:'สกิล 3',s4:'สกิล 4',ult:'อัลติเมต'};
const DMG={p:'กายภาพ',m:'เวท','':'ไม่ทำดาเมจ'};
let LANG='th';try{LANG=localStorage.getItem('aniimo-lang')||'th'}catch(_){}
/* official Thai names (wiki.aniimo.com/th); a.name follows the site language, a.en / a.th keep both */
const NAMES_TH=window.NAMES_TH||{};
(window.ANIIMO||[]).forEach(a=>{a.en=a.name;a.th=NAMES_TH[a.slug]||'';if(LANG==='th'&&a.th)a.name=a.th});
const nameHit=(a,q)=>(a.en+' '+a.th).toLowerCase().includes(q);
const A=(window.ANIIMO||[]).filter(a=>!a.u).sort((a,b)=>{const na=+a.no,nb=+b.no;return (na>9000)-(nb>9000)||na-nb});
const UNREL=(window.ANIIMO||[]).filter(a=>a.u);
const BY=Object.fromEntries(A.concat(UNREL).map(a=>[a.slug,a]));
const SK=window.SKILLS||{};const SPR=window.SPRITE||{cols:15,rows:15};
const EVO=(window.EVO||[]).filter(([s,d])=>BY[s]&&BY[d]);
/* evolution lines: real routes first; creatures with no recorded route fall back to their art-id family */
const LINES=(()=>{const p={};const f=x=>p[x]===x?x:(p[x]=f(p[x]));A.forEach(a=>p[a.slug]=a.slug);
  const linked=new Set();EVO.forEach(([s,d])=>{if(p[s]&&p[d]){p[f(s)]=f(d);linked.add(s);linked.add(d)}});
  const fam={};A.forEach(a=>{if(!linked.has(a.slug)&&a.ord&&a.ord<60000){const k=Math.floor(a.ord/10);if(fam[k])p[f(a.slug)]=f(fam[k]);else fam[k]=a.slug}});
  const g={},SO={Lumin:0,Gamma:1,Nova:2,Legendary:3};A.forEach(a=>{(g[f(a.slug)]=g[f(a.slug)]||[]).push(a)});
  const out={};Object.values(g).forEach(l=>{l.sort((x,y)=>(SO[x.st]??2)-(SO[y.st]??2)||x.ord-y.ord);l.forEach(a=>out[a.slug]=l)});return out})();
const TH=p=>(window.THUMB&&window.THUMB[p])||p;
if(Array.isArray(window.NEWS))window.NEWS.sort((x,y)=>y.date.localeCompare(x.date)); // newest first, whatever order content.js has
const numLabel=a=>(+a.no>9000?'พิเศษ':'#'+a.no);
const skillsOf=slug=>((SK[slug]||{}).s||[]).map(s=>({n:s[0],k:s[1],e:s[2],t:s[3],mi:s[4],cost:s[5],cd:s[6],r:s[7],ix:s[8],d:s[9],g:s[10]||[]}));
const skColors=slug=>{const c=[];skillsOf(slug).forEach(s=>{if(s.e&&!c.includes(s.e))c.push(s.e)});return c};
const SPK=window.SPARK||{cols:10,rows:1,e:[]};

const SPK_IDX={};SPK.e.forEach(([s,fi],i)=>{SPK_IDX[s+'|'+(fi==null?'':fi)]=i});
const hasSpark=slug=>(slug+'|') in SPK_IDX;
const STYPES=['Type I','Type II','Type III','Type IV','Type V','Type VI','Type VII','Type VIII','Type IX','Type X','Dazzling','Shadow'];
const STYPE_TH=['แบบ I','แบบ II','แบบ III','แบบ IV','แบบ V','แบบ VI','แบบ VII','แบบ VIII','แบบ IX','แบบ X','Dazzling','Shadow'];
function sprStyle(n,idx,big){const c=idx%SPK.cols,r=Math.floor(idx/SPK.cols);return `background-image:url(spark-${big?'':'s-'}${String(n).padStart(2,'0')}.webp);background-size:${SPK.cols*100}% ${SPK.rows*100}%;background-position:${c/(SPK.cols-1)*100}% ${SPK.rows>1?r/(SPK.rows-1)*100:0}%`}
function orb(s,sm){
  const col=s.ix%SPR.cols,row=Math.floor(s.ix/SPR.cols);
  const bg=s.ix>=0?`background-size:${SPR.cols*100}% ${SPR.rows*100}%;background-position:${col/(SPR.cols-1)*100}% ${row/(SPR.rows-1)*100}%`:'background:none';
  return `<span class="orb${sm?' sm':''}${s.r?' rare':''}" style="--c:var(--${s.e||'neutral'})" title="${esc(s.n)} · ${EK[s.e]?EK[s.e].th:''}"><span style="${bg}"></span></span>`;
}
const TRM=window.TH||{};const META=window.META||{};
const tr=t=>(t&&LANG==='th'&&TRM[t])||t||'';
const WORK_TH={Hauling:'ขนของ',Artisanship:'งานช่าง',Leisure:'สันทนาการ',Perfumery:'ทำน้ำหอม'};
const workLabel=w=>(WORK_TH[w[0]]||('งานธาตุ'+(EK[w[0].toLowerCase()]?EK[w[0].toLowerCase()].th:w[0])))+' Lv.'+w[1];
const BOSSES=window.BOSSES||[];const REGIONS=window.REGIONS||{};
const TIERMAP={};
const ALLSK=[];A.forEach(a=>skillsOf(a.slug).forEach(s=>ALLSK.push({a,s})));


/* ===== navigation ===== */
const GROUPS=[
 {id:'start',th:'เริ่มต้น',d:'อ่านก่อนเล่น'},
 {id:'info',th:'ข่าวและข้อมูล',d:'ข่าวทางการ วิดีโอ FAQ'},
 {id:'mon',th:'Aniimo',d:'ข้อมูลสัตว์ทุกตัว'},
 {id:'world',th:'โลกของเกม',d:'แผนที่ บอส อีเวนต์ ไอเท็ม'},
 {id:'tools',th:'เครื่องมือ',d:'วางแผนและบันทึก'},
 {id:'more',th:'อื่น ๆ',d:''}];
const VIEWS=[
 {id:'home',th:'หน้าแรก',ic:'home',tab:1},
 {id:'news',th:'ข่าวและแพตช์โน้ต',ic:'news',g:'info',d:'อัปเดต 1.1 และแพตช์ล่าสุด'},
 {id:'media',th:'วิดีโอและไทม์ไลน์',ic:'play',g:'info',d:'ตัวอย่างเกมทางการ'},
 {id:'faq',th:'คำถามที่พบบ่อย',ic:'help',g:'info',d:'เซิร์ฟเวอร์ จอดำ รางวัล'},
 {id:'glossary',th:'อภิธานศัพท์',ic:'book',g:'info',d:'คำศัพท์ในเกม'},
 {id:'howto',th:'ไกด์วิธีหา',ic:'book',g:'start',d:'ตั๋ว Chaos, Lumin Amber, Prismana, เปล่งประกาย'},
 {id:'pskills',th:'สกิลผู้เล่น',ic:'skill',g:'start',d:'สกิลและพรสวรรค์ของผู้เล่นตามยศ'},
 {id:'beginner',th:'มือใหม่',ic:'star',g:'start',d:'ตัวเลือกที่ย้อนไม่ได้ ควรทำ/ไม่ควรทำ'},
 {id:'daily',th:'เช็กลิสต์รายวัน',ic:'check',g:'start',d:'ติ๊กงานรายวัน รายสัปดาห์ รีเซ็ตเอง'},
 {id:'growth',th:'แนวทางพัฒนา',ic:'up',g:'start',d:'พัฒนา Aniimo และใช้ทรัพยากรให้คุ้ม'},
 {id:'guide',th:'ข้อมูลเกม',ic:'book',g:'start',d:'ระบบหลัก สเปกเครื่อง ปุ่มควบคุม มือถือ'},
 {id:'dex',th:'รายชื่อ Aniimo',ic:'dex',g:'mon',tab:1,tabTh:'Aniimo',d:A.length+' ตัว ค่าสถานะ สายวิวัฒนาการ'},
 {id:'skills',th:'สกิลและสีธาตุ',ic:'skill',g:'mon',d:'สกิลทุกตัวแยกตามสีธาตุ'},
 {id:'forms',th:'ร่างพิเศษ',ic:'forms',g:'mon',d:'ร่างตามพื้นที่ สภาพอากาศ Prismana'},
 {id:'sparkling',th:'เปล่งประกาย',ic:'spark',g:'mon',d:'12 แบบต่อร่าง'},
 {id:'tier',th:'Tier List',ic:'tier',g:'mon',d:'จัดอันดับความแรง'},
 {id:'elements',th:'ตารางธาตุ',ic:'elem',g:'mon',d:'แพ้ทาง ×1.6 และเครื่องคิด'},
 {id:'map',th:'แผนที่ทวีป',ic:'map',g:'world',tab:1,tabTh:'แผนที่',d:'หีบ ไข่ วัตถุดิบ บอส 4,334 จุด'},
 {id:'regions',th:'ภูมิภาค',ic:'pin',g:'world',d:'14 ภูมิภาคและจุดเกิด'},
 {id:'whisperwake',th:'Whisperwake Isles',ic:'star',g:'world',d:'พื้นที่ใหม่ 29 ต.ค. · Aniimo 10 ตัว'},
 {id:'bosses',th:'บอส Alpha / Omega',ic:'boss',g:'world',d:'จุดอ่อนและตัวที่ควรใช้'},
 {id:'duels',th:'ดวล Pathfinder',ic:'team',g:'world',d:'62 จุด เลเวลและรางวัล'},
 {id:'eggs',th:'ล่าไข่',ic:'egg',g:'world',d:'ไข่ 141 จุด แยกชนิดและภูมิภาค'},
 {id:'heist',th:'Operation: Egg Heist',ic:'lock',g:'world',d:'คู่มือโหมดขโมยไข่ และแผนที่ Lost Isles'},
 {id:'sanctums',th:'Sanctum',ic:'layers',g:'world',d:'17 แห่ง และ Lost Sanctum'},
 {id:'events',th:'อีเวนต์',ic:'cal',g:'world',d:'นับถอยหลังตามเวลาไทย'},
 {id:'items',th:'ไอเท็ม',ic:'bag',g:'world',d:'658 ชิ้นพร้อมวิธีหา'},
 {id:'helditems',th:'Held Item และ Rune',ic:'gift',g:'mon',d:'ผล ตัวที่เหมาะ และวิธีหา'},
 {id:'homeland',th:'งานใน Homeland',ic:'home',g:'world',d:'ตัวไหนเหมาะกับงานไหน'},
 {id:'buffs',th:'ของกินและบัฟ',ic:'up',g:'world',d:'บัฟดาเมจ ป้องกัน ฮีล ซื้อที่ไหน'},
 {id:'cosmetics',th:'ชุดแต่งตัว',ic:'spark',g:'world',d:'ชุด เครื่องประดับ และวิธีได้'},
 {id:'systems',th:'ระบบเชิงลึก',ic:'layers',g:'world',d:'ยศ บ้าน ไข่ ร้านค้า ดันเจี้ยน Interlink'},
 {id:'builder',th:'ตัวจัดบิลด์',ic:'calc',g:'tools',d:'สกิล Held Item และ Rune ของแต่ละตัว'},
 {id:'builds',th:'บิลด์แนะนำ',ic:'star',g:'mon',d:'ไอเท็มและ Rune ที่เกมแนะนำ'},
 {id:'ranking',th:'จัดอันดับค่าสถานะ',ic:'chart',g:'mon',d:'เรียง Aniimo ตาม HP ATK DEF'},
 {id:'sets',th:'ชุดแต่งตัว',ic:'layers',g:'mon',d:'Transmog ทุกเซ็ตและทุกสี'},
 {id:'team',th:'จัดทีม',ic:'team',g:'tools',tab:1,d:'วิเคราะห์จุดแข็งจุดอ่อนของทีม'},
 {id:'planner',th:'วางแผนวัสดุ',ic:'calc',g:'tools',d:'รวมวัสดุที่ต้องใช้'},
 {id:'compare',th:'เปรียบเทียบ',ic:'compare',g:'tools',d:'เทียบ 3 ตัวแบบเคียงกัน'},
 {id:'collection',th:'เช็กลิสต์สะสม',ic:'check',g:'tools',d:'ติ๊กตัวที่จับได้'},
 {id:'history',th:'ประวัติการใช้งาน',ic:'clock',g:'tools',d:'ที่ดูล่าสุดและคำค้นหา'},
 {id:'codes',th:'โค้ดแลกของ',ic:'gift',g:'more',d:'กดคัดลอกได้เลย'},
 {id:'community',th:'ชุมชน',ic:'team',g:'more',d:'บิลด์จากผู้เล่น โค้ดแปลนบ้าน หาเพื่อนเล่น'},
 {id:'feedback',th:'ส่งคำแนะนำ',ic:'chat',g:'more',d:'แนะนำฟีเจอร์ แจ้งข้อมูลผิด'},
 {id:'support',th:'สนับสนุนเว็บ',ic:'star',g:'more',d:'ช่วยให้เว็บอยู่ต่อ'},
 {id:'privacy',th:'นโยบายความเป็นส่วนตัว',ic:'lock',hidden:1},
 {id:'admin',th:'หลังบ้าน',ic:'chart',hidden:1}];
const navItem=(v,cls)=>`<button type="button" class="${cls}" data-go="${v.id}"><svg><use href="#i-${v.ic}"/></svg><span>${v.th}</span></button>`;
document.getElementById('side').innerHTML=navItem(VIEWS[0],'navbtn')+GROUPS.map(g=>`<p class="grp">${g.th}</p>`+VIEWS.filter(v=>v.g===g.id).map(v=>navItem(v,'navbtn')).join('')).join('')+`<div class="foot"><button type="button" class="adentry" data-go="admin"><svg><use href="#i-lock"/></svg>หลังบ้าน</button><span>แฟนเมด · ข้อมูลจาก <a href="https://aniidex.com/" target="_blank" rel="noopener">AniiDex</a> · ${esc(META.scraped||'')}</span></div>`;
document.getElementById('topnav').innerHTML=`<a class="tn-b" href="#home" data-go="home">หน้าแรก</a>`+GROUPS.map(g=>{const vs=VIEWS.filter(v=>v.g===g.id);return vs.length?`<div class="tn-g"><button type="button" class="tn-b" aria-haspopup="true">${g.th}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6"/></svg></button><div class="tn-m">${vs.map(v=>navItem(v,'navbtn')).join('')}${g.id==='more'?`<button type="button" class="navbtn" data-go="admin"><svg><use href="#i-lock"/></svg><span>หลังบ้าน</span></button>`:''}</div></div>`:''}).join('');
document.getElementById('tabbar').innerHTML=VIEWS.filter(v=>v.tab).map(v=>navItem({...v,th:v.tabTh||v.th},'')).join('')+`<button type="button" id="moreBtn"><svg><use href="#i-more"/></svg><span>เพิ่มเติม</span></button>`;
document.getElementById('menuInner').innerHTML='<div class="grab"></div>'+GROUPS.map(g=>`<div class="mgrp"><p>${g.th}</p><div class="mtiles">${VIEWS.filter(v=>v.g===g.id).map(v=>`<button type="button" data-go="${v.id}"><svg><use href="#i-${v.ic}"/></svg>${v.th}</button>`).join('')}</div></div>`).join('')+'<button type="button" class="adentry" data-go="admin" style="justify-self:center"><svg><use href="#i-lock"/></svg>หลังบ้าน</button>';
const FEAT=[
 {id:'dex',d:`${A.length} ตัว พร้อมค่าสถานะ สกิล และสายวิวัฒนาการ`},
 {id:'map',d:'หีบ ไข่ วัตถุดิบ และบอส 4,334 จุด'},
 {id:'team',d:'จัดทีม ดูจุดอ่อน แล้วแชร์เป็นลิงก์'},
 {id:'tier',d:'อันดับความแรง และโหวตจากผู้เล่น'},
 {id:'events',d:'อีเวนต์ที่เปิดอยู่ นับถอยหลังตามเวลาไทย'},
 {id:'beginner',d:'สิ่งที่ห้ามพลาดก่อนเริ่มเล่น'}];
document.getElementById('homeFeat').innerHTML=FEAT.map(f=>{const v=VIEWS.find(x=>x.id===f.id);return `<button type="button" data-go="${v.id}"><span class="ic"><svg><use href="#i-${v.ic}"/></svg></span><b>${v.th}</b><small>${f.d}</small></button>`}).join('');
document.getElementById('homeGroups').innerHTML=GROUPS.map(g=>{const vs=VIEWS.filter(v=>v.g===g.id&&!FEAT.some(f=>f.id===v.id));return vs.length?`<div><h3>${g.th}</h3>${vs.map(v=>`<button type="button" data-go="${v.id}">${v.th}</button>`).join('')}</div>`:''}).join('');
addEventListener('keydown',e=>{if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target;if(t&&(t.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(t.tagName)))return;e.preventDefault();const g=document.getElementById('gq');g.focus();g.scrollIntoView({block:'nearest'})});

document.getElementById('hsearch').addEventListener('click',()=>{const g=document.getElementById('gq');g.focus();g.scrollIntoView({block:'nearest'})});
const menu=document.getElementById('menu');
document.getElementById('moreBtn').addEventListener('click',()=>menu.showModal());
menu.addEventListener('click',e=>{if(e.target===menu)menu.close()});
let current='home';
const RENDERED=new Set();
function ensureRendered(id){if(RENDERED.has(id))return;RENDERED.add(id);const f={dex:()=>renderDex(),skills:()=>renderSkills(),sparkling:()=>renderSpark(),forms:()=>renderForms(),tier:()=>renderTiers(),team:()=>renderTeam(),collection:()=>renderCollection(),compare:()=>renderCompare(),bosses:()=>renderBosses(),regions:()=>renderRegions(),whisperwake:()=>renderWW(),map:()=>renderMap(),events:()=>renderEvents(),items:()=>renderItems(),systems:()=>renderSystems(),planner:()=>renderPlanner(),history:()=>renderHistory(),news:()=>renderNews(),duels:()=>withMap(renderDuels),sanctums:()=>withMap(renderSanctums),daily:()=>renderDaily2(),helditems:()=>renderHeld(),homeland:()=>renderHome2(),buffs:()=>renderBuffs(),cosmetics:()=>renderCos(),eggs:()=>withMap(renderEggs),heist:()=>renderHeist(),media:()=>renderMedia(),faq:()=>renderFaq(),glossary:()=>renderGloss(),admin:()=>renderAdmin()}[id];f&&f()}
function go(id,push){
  if(!VIEWS.some(v=>v.id===id))id='home';
  if(id!==current){const pg=document.getElementById('progress');if(pg){pg.classList.remove('go');void pg.offsetWidth;pg.classList.add('go')}}
  if(id!=='admin'){histAdd('views',id);track('view',id)}if(id!=='feedback'&&id!=='admin'&&typeof fbLastPage!=='undefined')fbLastPage=id;if(id==='history'||id==='admin'||id==='news')RENDERED.delete(id);if(id==='home'&&typeof renderHomeRecent==='function')renderHomeRecent();
  ensureRendered(id);
  if(id==='builder'&&typeof renderBuilder==='function')setTimeout(renderBuilder); // deferred: a deep link runs this before the builder's state exists
  if(id==='builds'&&typeof renderBuilds==='function')renderBuilds();
  if(id==='sets'&&typeof renderSets==='function')renderSets();
  if(id==='ranking'&&typeof renderStats==='function')renderStats();
  if(id==='pskills'&&typeof renderPSkills==='function')renderPSkills();
  if(typeof nextUp==='function')nextUp(id);
  if(id==='community'&&typeof cmLoad==='function')setTimeout(cmLoad);
  if(id==='items'&&!window.ITEMS_MORE&&!window.__imore){window.__imore=1;const sc=document.createElement('script');sc.src='items-more.js?v=5e610bf3cd';
    sc.onload=()=>{const have=new Set(ITEMS.map(i=>i.slug));(window.ITEMS_MORE||[]).forEach(i=>{if(!have.has(i.slug)){ITEMS.push(i);ITEM_BY_NAME[i.n.toLowerCase()]=ITEM_BY_NAME[i.n.toLowerCase()]||i}});
      const c=document.getElementById('ic');if(c){const cats=new Set([...c.options].map(o=>o.value));[...new Set(ITEMS.map(i=>i.c))].filter(x=>!cats.has(x)).forEach(x=>c.insertAdjacentHTML('beforeend',`<option value="${esc(x)}">${esc(CAT_TH[x]||x)}</option>`))}
      if(current==='items'&&typeof renderItems==='function')renderItems()};document.head.appendChild(sc)}
  current=id;if(typeof setTitle==='function'&&LANG!=='en')setTitle(id);
  document.querySelectorAll('.view').forEach(s=>s.hidden=s.dataset.view!==id);
  if(id==='map'&&MV.ready)setTimeout(mapSize,0);
  document.querySelectorAll('[data-go]').forEach(b=>{if(b.closest('.side,.tabbar,#menu,.topnav'))b.setAttribute('aria-current',b.dataset.go===id?'page':'false')});
  const more=document.getElementById('moreBtn');more.setAttribute('aria-current',VIEWS.find(v=>v.id===id).tab?'false':'page');
  if(push!==false&&location.hash!=='#'+id){try{history.pushState(null,'','#'+id)}catch(_){location.hash=id}}
  try{localStorage.setItem('aniimo-view',id)}catch(_){}
  if(menu.open)menu.close();
  window.scrollTo({top:0});
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(!b)return;e.preventDefault();go(b.dataset.go)});
function route(){
  const h=location.hash.slice(1);
  if(typeof dlg!=='undefined'&&dlg.open&&!BY[h])dlg.close(); // browser back from an Aniimo page
  if(/^s-/.test(h)){go('systems',false);setTimeout(()=>{const el=document.getElementById(h);el&&el.scrollIntoView()},0);return}
  if(/^b-/.test(h)||/^g-(steps|personality|spend|road)$/.test(h)){go(h.startsWith('b-')?'beginner':'growth',false);setTimeout(()=>{const el=document.getElementById(h);el&&el.scrollIntoView()},0);return}
  if(h.startsWith('h-')&&document.getElementById(h)){go('howto',false);const d=document.getElementById(h);d.open=true;setTimeout(()=>d.scrollIntoView(),0);return}
  if(h.startsWith('g-')){go('guide',false);setTimeout(()=>{const el=document.getElementById(h);el&&el.scrollIntoView()},0);return}
  if(h.startsWith('news-')){go('news',false);renderNews(h.slice(5));return}
  if(/^sync-[A-Za-z0-9]{20,40}$/.test(h)){SYNC.code=h.slice(5);syncSave();try{history.replaceState(null,'','#collection')}catch(_){}go('collection',false);syncPull(true).then(()=>toast('เชื่อมรหัสซิงก์แล้ว ข้อมูลตรงกับอีกเครื่องแล้ว'));return}
  if(h==='stats'||h==='stats-demo'||h==='admin-demo'){if(h!=='stats')AD.demo=true;go('admin',false);return}
  if(h.startsWith('team-')){loadTeamCode(h);go('team',false);return}
  if(h.startsWith('region-')){go('regions',false);setTimeout(()=>{const el=document.getElementById(h);el&&el.scrollIntoView()},0);return}
  if(BY[h]){go('dex',false);openMon(h);return}
  if(h.startsWith('builder-')){go('builder',false);setTimeout(()=>{bldLoad(h);renderBuilder()});return} // after the script has set up the builder
  if(VIEWS.some(v=>v.id===h)){go(h,false);return}
  let last=null;try{last=localStorage.getItem('aniimo-view')}catch(_){}
  go(last||'home',false);
}
addEventListener('popstate',route);addEventListener('hashchange',route);
document.querySelectorAll('.gnav a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const el=document.getElementById(a.getAttribute('href').slice(1));el&&el.scrollIntoView({behavior:'smooth',block:'start'})}));

/* ===== global search ===== */
const gq=document.getElementById('gq'),gres=document.getElementById('gres');
function gsearch(){
  const q=gq.value.trim().toLowerCase();if(!q){gres.hidden=true;return}
  const mons=A.filter(a=>nameHit(a,q)||a.no===q).slice(0,6).map(a=>`<button type="button" data-open="${a.slug}"><img decoding="async" src="${TH(a.i)}" alt=""><span><b>${esc(a.name)}</b><small>${numLabel(a)} · ${a.e.map(k=>EK[k].th).join(' / ')}</small></span></button>`);
  const sks=ALLSK.filter(x=>x.s.n.toLowerCase().includes(q)).slice(0,6).map(({a,s})=>`<button type="button" data-open="${a.slug}" data-tab="skills">${orb(s,true)}<span><b>${esc(s.n)}</b><small>สกิลของ ${esc(a.name)} · ${SLOT[s.k]||s.k}</small></span></button>`);
  gres.innerHTML=mons.concat(sks).join('')||'<p class="small muted" style="padding:8px">ไม่พบผลลัพธ์</p>';gres.hidden=false;
}
gq.addEventListener('input',gsearch);gq.addEventListener('focus',gsearch);
document.addEventListener('click',e=>{if(!e.target.closest('.gsearch'))gres.hidden=true;else if(e.target.closest('.gresults button')){if(gq.value.trim().length>1){histAdd('searches',gq.value.trim());track('search',gq.value.trim().toLowerCase())}gres.hidden=true;gq.value=''}});
gq.addEventListener('keydown',e=>{if(e.key==='Escape'){gq.value='';gres.hidden=true}if(e.key==='Enter'){const f=gres.querySelector('button');f&&f.click()}});

/* ===== dex ===== */
const de=document.getElementById('de');de.innerHTML+=E.map(e=>`<option value="${e.k}">${e.th}</option>`).join('');
const dq=document.getElementById('dq'),dr=document.getElementById('dr'),ds=document.getElementById('ds'),dp=document.getElementById('dp'),dsp=document.getElementById('dsp');
const hasPr=a=>a.f.some(f=>f.k==='prismana');
const dw=document.getElementById('dw'),dc=document.getElementById('dc');
dw.innerHTML+=['Hauling','Artisanship','Leisure','Perfumery'].map(k=>`<option value="${k}">${WORK_TH[k]}</option>`).join('')+E.map(e=>`<option value="${e.en}">งานธาตุ${e.th}</option>`).join('');
function renderDex(){
  const q=dq.value.trim().toLowerCase().replace(/^#/,'');
  const list=A.filter(a=>(!q||nameHit(a,q)||a.no.includes(q))&&(!de.value||a.e.includes(de.value))&&(!dr.value||a.r===dr.value)&&(!ds.value||a.st===ds.value)&&(!dp.checked||hasPr(a))&&(!dsp.checked||hasSpark(a.slug))&&(!dw.value||(a.w||[]).some(w=>w[0]===dw.value))&&(!dc.value||(dc.value==='have')===!!COL.d.c[a.slug]));
  document.getElementById('dcount').textContent=`แสดง ${list.length} จาก ${A.length} ตัว`;
  document.getElementById('dexGrid').innerHTML=list.map(a=>`<button class="mon" type="button" data-open="${a.slug}" style="--c:var(--${a.e[0]||'neutral'})">
    ${hasPr(a)?'<span class="flag pr">Prismana</span>':''}${hasSpark(a.slug)?'<span class="flag sp">✦</span>':''}${a.u?'<span class="flag un">ยังไม่เปิด</span>':a.f.length?`<span class="flag fc">${a.f.length+1} ร่าง</span>`:''}
    <span class="pic"><img decoding="async" src="${TH(a.i)}" alt="${esc(a.name)}" loading="lazy" class="${a.cut?'cut':''}">${COL.d.c[a.slug]?'<span class="caught" title="จับแล้ว">✓</span>':''}</span>
    <span class="info"><span class="no">${numLabel(a)}</span><span class="nm">${esc(a.name)}</span>
    <span class="row">${a.e.map(badge).join('')}</span>
    <span class="meta"><span class="rmeta">${roleChip(a.r)}<small>${a.st}</small></span><span class="dots" title="สีสกิล">${skColors(a.slug).map(k=>`<i style="background:var(--${k})"></i>`).join('')}</span></span></span></button>`).join('')||'<p class="muted">ไม่พบ Aniimo ที่ตรงกับตัวกรอง</p>';
}
[dq,de,dr,ds,dp,dsp,dw,dc].forEach(el=>el.addEventListener(el.type==='search'?'input':'change',renderDex));

/* ===== detail sheet ===== */
const dlg=document.getElementById('dlg'),dlgBody=document.getElementById('dlgBody');
const STAT=['HP','ATK','PDEF','MDEF','REGEN','BREAK'],STAT_L={PDEF:'P.DEF',MDEF:'M.DEF'};
let dState={slug:null,form:null,tab:'overview'};
function skillCard(s){
  const nums=[s.mi&&s.mi!=='0'?`<span class="chip">พลัง ${esc(s.mi)}</span>`:'',s.cost&&s.cost!=='0'?`<span class="chip">${s.k==='ult'?'เกจ':'EP'} ${esc(s.cost)}</span>`:'',s.cd?`<span class="chip">คูลดาวน์ ${esc(s.cd)}</span>`:''].join('');
  return `<div class="skill" style="--c:var(--${s.e||'neutral'})">${orb(s)}<div><h4>${esc(s.n)}</h4>
   <div class="pills">${badge(s.e)}<span class="chip">${SLOT[s.k]||s.k}</span>${s.t?`<span class="chip">${DMG[s.t]}</span>`:''}${s.r?'<span class="chip" style="background:color-mix(in srgb,var(--sun) 35%,var(--sunk))">Rare</span>':''}${s.g.map(g=>`<span class="chip">${esc(g)}</span>`).join('')}${nums}</div>
   ${s.d?`<p>${esc(tr(s.d))}</p>`:''}</div></div>`;
}
function openMon(slug,formIdx,tab,spark){
  const a=BY[slug];if(!a)return;
  if(dState.slug!==slug||!dlg.open){histAdd('mons',slug);track('mon',slug)}
  dState={slug,form:formIdx==null||formIdx===''?null:+formIdx,tab:tab||(dState.slug===slug?dState.tab:'overview'),spark:spark||null};
  renderDetail();if(!dlg.open)dlg.showModal();
  if(location.hash!=='#'+slug){try{history.pushState(null,'','#'+slug)}catch(_){}} // every Aniimo has its own link
}
function evoInfo(a){
  const rs=EVO.filter(([s,d])=>s===a.slug||d===a.slug);if(!rs.length)return '';
  return `<div><p class="eyebrow" style="margin-bottom:8px">เงื่อนไขวิวัฒนาการ</p><ul class="infolist">${rs.map(([s,d,c,k])=>`<li><b>${esc(BY[s]?BY[s].name:s)} → ${esc(BY[d]?BY[d].name:d)}</b><ul class="crit">${c.map(x=>`<li>${esc(tr(x))}</li>`).join('')}</ul>${k.length?`<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">${k.map(([n,q])=>`<span class="chip">${itemRef(n)} ×${q}</span>`).join('')}</div>`:''}</li>`).join('')}</ul></div>`;
}
function spawnInfo(a){
  const sp=a.sp||{};if(!sp.r||!sp.r.length)return '';
  return `<div><p class="eyebrow" style="margin-bottom:8px">จุดเกิด</p>${sp.c?`<p class="small" style="margin-bottom:8px"><b>เงื่อนไข:</b> ${esc(tr(sp.c))}</p>`:''}<ul class="infolist">${sp.r.map(([n,lv])=>`<li><button type="button" class="region-btn" data-region="${esc(n)}">${esc(n)}</button> <span class="chip">Lv. ${esc(lv)}</span></li>`).join('')}</ul></div>`;
}
function bioInfo(a){
  const b=a.b;if(!b)return '';
  const mv={fly:'บินได้',climb:'ปีนได้',glide:'ร่อนได้'},rows=[];
  if(b.h)rows.push(['ส่วนสูง',`${b.h} ม.`]);if(b.w)rows.push(['น้ำหนัก',`${b.w} กก.`]);
  rows.push(['เพศ',b.g?`♂ ${b.g[0]}% · ♀ ${b.g[1]}%`:'ไม่มีเพศ']);
  const m=Object.keys(b.mv||{});if(m.length)rows.push(['การเคลื่อนที่',m.map(k=>mv[k]).join(' · ')]);
  if(b.sr)rows.push(['โอกาสเจอร่างเปล่งประกาย',`1 ใน ${b.sr.toLocaleString(LOC)}`]);
  return `<div><p class="eyebrow" style="margin-bottom:8px">ข้อมูลตัว</p><table class="plain">${rows.map(([k,v])=>`<tr><td class="muted">${k}</td><td>${v}</td></tr>`).join('')}</table></div>`;
}
function radar(vals,labels,max,colors,fmt){
  const n=vals.length,R=74,cx=110,cy=100,pt=(i,r)=>[cx+r*Math.sin(2*Math.PI*i/n),cy-r*Math.cos(2*Math.PI*i/n)];
  const ring=f=>vals.map((_,i)=>pt(i,R*f).join(',')).join(' ');
  const shape=vals.map((v,i)=>pt(i,R*Math.min(1,v/max)).join(',')).join(' ');
  return `<svg class="radar" viewBox="0 0 220 200" role="img" aria-label="${labels.map((l,i)=>l+' '+fmt(vals[i])).join(', ')}">${[.25,.5,.75,1].map(f=>`<polygon points="${ring(f)}" class="rd-g"/>`).join('')}${vals.map((_,i)=>`<line x1="${cx}" y1="${cy}" x2="${pt(i,R)[0]}" y2="${pt(i,R)[1]}" class="rd-g"/>`).join('')}<polygon points="${shape}" class="rd-v"/>${vals.map((v,i)=>{const [x,y]=pt(i,R+17);return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"${colors?` fill="var(--${colors[i]})"`:''}><tspan x="${x}" dy="-.45em" class="rl">${labels[i]}</tspan><tspan x="${x}" dy="1.15em" class="rn">${fmt(v)}</tspan></text>`}).join('')}</svg>`;
}
function radarsInfo(a,els){
  const st=a.s&&a.s.HP?`<div class="rbox"><p class="eyebrow">ค่าสถานะ</p>${radar(STAT.map(k=>a.s[k]),STAT.map(k=>STAT_L[k]||k),130,null,v=>v)}</div>`:'';
  const m=E.map(x=>els.reduce((v,d)=>v*mult(x.k,d),1));
  const df=`<div class="rbox"><p class="eyebrow">การป้องกัน · ยิ่งห่างจากกลางยิ่งแพ้ทาง</p>${radar(m,E.map(x=>x.th),1.6*1.6>Math.max(...m)?Math.max(1.6,...m):Math.max(...m),E.map(x=>x.k),v=>'×'+(Math.round(v*1000)/1000))}</div>`;
  return `<div class="radars">${st}${df}</div>`;
}
function monNav(a){ // previous / next by number, so a visitor from search keeps browsing
  const L=A.filter(x=>!x.u),i=L.indexOf(a);if(i<0)return '';
  const pv=L[(i-1+L.length)%L.length],nx=L[(i+1)%L.length];
  const btn=(x,dir)=>`<button type="button" class="mnav ${dir}" data-open="${x.slug}"><img src="${TH(x.i)}" alt=""><span><small>${dir==='prev'?'← ก่อนหน้า':'ถัดไป →'} ${numLabel(x)}</small><b>${esc(x.th||x.name)}</b></span></button>`;
  return `<div class="mnavs">${btn(pv,'prev')}${btn(nx,'next')}</div>`;
}
function foodInfo(a){
  const fs=a.b&&a.b.fs,F=window.FOOD||[];if(!fs||!F.length)return '';
  const dur=m=>{const d=Math.floor(m/1440),h=Math.floor(m%1440/60),mi=Math.round(m%60);return [d&&d+' วัน',h&&h+' ชม.',!d&&mi&&mi+' นาที'].filter(Boolean).join(' ')||'< 1 นาที'};
  return `<div><p class="eyebrow" style="margin-bottom:8px">อาหารในบ้าน · กิน ${fs} พลังงาน/นาที</p><div class="ftable"><table class="plain"><thead><tr><th>อาหาร</th><th>อิ่มได้นาน</th><th style="text-align:right">พลังงาน</th></tr></thead><tbody>${F.map(([th,en,e])=>`<tr><td>${esc(LANG==='en'?en:th)}</td><td>${dur(e/fs)}</td><td style="text-align:right">${e.toLocaleString(LOC)}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function homeInfo(a){
  if(!a.w||!a.w.length)return '';
  return `<div><p class="eyebrow" style="margin-bottom:8px">งานใน Homeland</p><div style="display:flex;gap:6px;flex-wrap:wrap">${a.w.map(w=>`<span class="chip">${workLabel(w)}</span>`).join('')}</div></div>`;
}
function itemsInfo(a){
  if(!a.it||!a.it.length)return '';
  return `<div><p class="eyebrow" style="margin-bottom:8px">Held Item แนะนำ</p><ul class="infolist">${a.it.map(([n,e])=>`<li><b>${itemRef(n)}</b>${e?`<div class="small muted" style="margin-top:2px">${esc(tr(e))}</div>`:''}</li>`).join('')}</ul></div>`;
}
function renderDetail(){
  const a=BY[dState.slug],cur=dState.form==null?null:a.f[dState.form];
  const img=cur?(cur.i||a.i):a.i,els=cur?cur.e:a.e,line=LINES[a.slug]||[a];
  const weak=E.filter(x=>els.reduce((v,d)=>v*mult(x.k,d),1)>1).map(x=>x.k);
  const resist=E.filter(x=>els.reduce((v,d)=>v*mult(x.k,d),1)<1).map(x=>x.k);
  const sks=skillsOf(a.slug),traits=(SK[a.slug]||{}).t||[],cols=skColors(a.slug);
  const spKey=a.slug+'|'+(dState.form==null?'':dState.form),spIdx=SPK_IDX[spKey],spAny=hasSpark(a.slug);
  if(dState.spark&&spIdx==null)dState.spark=null;
  const m3=window.M3D&&M3D.m[a.slug];
  const tabs=[['overview','ภาพรวม'],['skills',`สกิล (${sks.length})`],['forms',`ร่าง (${a.f.length+1})`]].concat(spAny?[['sparkling','✦ เปล่งประกาย']]:[],m3?[['3d','3D']]:[]);
  let pane='';
  if(dState.tab==='overview'){
    pane=`${a.u?'':voteBox(a.slug)}<p>${esc(tr(a.d))}</p>
    <div class="small"><b>แพ้ทาง:</b> ${weak.map(badge).join(' ')||'—'}<br><b>ต้านได้:</b> ${resist.map(badge).join(' ')||'—'}</div>
    ${a.s&&a.s.HP?`<div><p class="eyebrow" style="margin-bottom:8px">ค่าสถานะพื้นฐาน</p><div class="stats">${STAT.map(k=>`<div class="stat"><span>${STAT_L[k]||k}</span><span class="bar"><i style="width:${Math.min(100,a.s[k]/130*100)}%"></i></span><b>${a.s[k]}</b></div>`).join('')}</div></div>`:''}
    ${line.length>1?`<div><p class="eyebrow" style="margin-bottom:8px">สายวิวัฒนาการ</p><div class="thumbs">${line.map(x=>`<button type="button" data-open="${x.slug}" aria-current="${x===a}"><img decoding="async" src="${TH(x.i)}" alt="" class="${x.cut?'cut':''}">${esc(x.name)}<small class="muted">${x.st}</small></button>`).join('')}</div></div>`:''}
    ${traits.length?`<div style="display:grid;gap:8px"><p class="eyebrow">Trait</p>${traits.map(t=>`<div class="trait"><h4>${esc(t[0])} <span class="chip" style="font-family:var(--body)">${esc(t[1])}</span></h4><p>${esc(tr(t[2]))}</p></div>`).join('')}</div>`:''}
    ${radarsInfo(a,els)}${bioInfo(a)}${evoInfo(a)}${spawnInfo(a)}${homeInfo(a)}${foodInfo(a)}${setsInfo(a)}${itemsInfo(a)}${monNav(a)}`;
  }else if(dState.tab==='skills'){
    pane=`<div><p class="eyebrow" style="margin-bottom:8px">สีสกิลของ ${esc(a.name)}</p><div class="palette">${cols.map(k=>`<span class="swatch"><i style="background:var(--${k})"></i>${EK[k].th} · ${sks.filter(s=>s.e===k).length} สกิล</span>`).join('')}</div></div>
    <div style="display:grid;gap:10px">${sks.map(skillCard).join('')}</div>`;
  }else if(dState.tab==='3d'&&m3){
    // the viewer is a separate app on R2; it loads only when this tab opens
    const file=(cur&&m3.f&&m3.f[cur.id])||m3.b,src=`${M3D.url}/index.html?file=${encodeURIComponent(file)}&v=${M3D.v||1}`,emb=src+'&embed=1';  // v: new viewer build past Cloudflare's month-long cache
    pane=`<div class="m3d"><iframe src="${emb}" title="โมเดล 3D ของ ${esc(a.name)}" allow="fullscreen"></iframe></div>
    <p class="small muted">หมุนด้วยการลาก ซูมด้วยล้อเมาส์หรือสองนิ้ว กดปุ่ม ☰ มุมขวาบนของกรอบเพื่อเลือกร่าง เปล่งประกาย ชุดแต่งตัว และท่าทาง · <a href="${src}" target="_blank" rel="noopener">เปิดเต็มจอ</a>${cur&&!(m3.f&&m3.f[cur.id])?' · ร่างนี้ยังไม่มีโมเดล แสดงร่างปกติแทน':''}</p>`;
  }else if(dState.tab==='sparkling'){
    const spForms=a.f.map((f,i)=>i).filter(i=>SPK_IDX[a.slug+'|'+i]!=null);
    pane=`${spForms.length?`<div class="seg" role="group" aria-label="เลือกร่าง"><button type="button" data-open="${a.slug}" data-form="" data-tab="sparkling" aria-pressed="${dState.form==null}">ร่างปกติ</button>${spForms.map(i=>`<button type="button" data-open="${a.slug}" data-form="${i}" data-tab="sparkling" aria-pressed="${dState.form===i}">${a.f[i].k==='prismana'?'Prismana':esc(a.f[i].n)}</button>`).join('')}</div>`:''}
    ${spIdx==null?'<p class="muted">ร่างนี้ยังไม่มีข้อมูลร่างเปล่งประกาย เลือกร่างปกติหรือ Prismana</p>':`<div class="spkgrid"><button type="button" data-spk="0" aria-current="${!dState.spark}"><img decoding="async" src="${TH(cur&&cur.i?cur.i:a.i)}" alt="" style="width:78px;height:78px;object-fit:contain">ทั่วไป</button>${STYPES.map((t,i)=>{const key=a.slug+'|'+(dState.form==null?'':dState.form)+'|'+(i+1),on=!!COL.d.s[key];return `<button type="button" data-spk="${i+1}" aria-current="${dState.spark===i+1}"><span class="spr" style="${sprStyle(i+1,spIdx)}" role="img" aria-label="${esc(a.name)} ${t}"></span>${STYPE_TH[i]}${a.u?'':`<span class="own-tick" role="button" tabindex="0" data-col="s" data-key="${key}" aria-pressed="${on}" aria-label="มี ${STYPE_TH[i]} แล้ว">${on?'✓':''}</span>`}</button>`}).join('')}</div>
    <p class="small muted">กดแต่ละแบบเพื่อดูภาพใหญ่ด้านซ้าย กดวงกลมมุมขวาบนเพื่อติ๊กว่ามีแล้ว</p>`}`;
  }else{
    pane=`<div class="thumbs"><button type="button" data-open="${a.slug}" data-form="" aria-current="${!cur}"><img decoding="async" src="${TH(a.i)}" alt="" class="${a.cut?'cut':''}">ปกติ<small class="muted">${a.e.map(k=>EK[k].th).join('/')}</small></button>
      ${a.f.map((f,i)=>`<button type="button" data-open="${a.slug}" data-form="${i}" aria-current="${cur===f}">${f.i?`<img decoding="async" src="${TH(f.i)}" alt="">`:'<span style="height:56px;display:grid;place-items:center" class="muted">—</span>'}${esc(f.n)}<small class="muted">${KIND[f.k]} · ${f.e.map(k=>EK[k].th).join('/')}</small></button>`).join('')}</div>
      ${a.f.length?'':'<p class="muted">Aniimo ตัวนี้ยังไม่มีร่างพิเศษ</p>'}`;
  }
  dlgBody.innerHTML=`<div class="dlg">
   <div class="hero-pic"><button type="button" class="dback" onclick="document.getElementById('dlg').close()" aria-label="กลับ">← กลับ</button>${a.f.length?`<div class="fsw" role="group" aria-label="เลือกร่าง"><button type="button" data-open="${a.slug}" data-form="" aria-pressed="${!cur}" title="ร่างปกติ"><img src="${TH(a.i)}" alt=""></button>${a.f.map((f,i)=>`<button type="button" data-open="${a.slug}" data-form="${i}" aria-pressed="${cur===f}" title="${esc(f.n)}">${f.i?`<img src="${TH(f.i)}" alt="">`:`<span>${esc(f.n.slice(0,2))}</span>`}</button>`).join('')}</div>`:''}${dState.spark&&spIdx!=null?(META.full&&SPK.ids?`<img src="spk/${SPK.ids[spIdx]}_${String(dState.spark).padStart(2,'0')}.webp" alt="${esc(a.name)} ${STYPES[dState.spark-1]}">`:`<span class="spr" style="${sprStyle(dState.spark,spIdx,1)}" role="img" aria-label="${esc(a.name)} ${STYPES[dState.spark-1]}"></span>`):`<img src="${img}" alt="${esc(a.name)}" class="${!cur&&a.cut?'cut':''}">`}<span class="fname">${cur?KIND[cur.k]+' · '+esc(cur.n):'ร่างปกติ'}${dState.spark?' · ✦ '+STYPES[dState.spark-1]:''}</span></div>
   <div class="body">
    <div><p class="eyebrow">${numLabel(a)} · ${a.st}${a.u?' · ยังไม่เปิดให้จับ':''}</p><h3 id="dlgTitle">${esc(a.name)}</h3>${a.th&&a.th!==a.en?`<p class="muted small">${esc(LANG==='th'?a.en:a.th)}</p>`:''}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${els.map(badge).join('')}${roleChip(a.r)}<span class="dots" style="margin-left:4px" title="สีสกิล">${cols.map(k=>`<i style="background:var(--${k})"></i>`).join('')}</span></div>
    <div class="dactions">${a.u?'':`<button type="button" data-col="${cur?'f':'c'}" data-key="${cur?a.slug+'|'+dState.form:a.slug}" aria-pressed="${!!(cur?COL.d.f[a.slug+'|'+dState.form]:COL.d.c[a.slug])}">${(cur?COL.d.f[a.slug+'|'+dState.form]:COL.d.c[a.slug])?'✓ จับแล้ว':'+ จับแล้ว'}${cur?' (ร่างนี้)':''}</button>`}<button type="button" data-cmp-add="${a.slug}">${CMP.includes(a.slug)?'✓ อยู่ในการเปรียบเทียบ':'+ เปรียบเทียบ'}</button><button type="button" data-team-add="${a.slug}">+ ใส่ทีม</button><button type="button" data-share="${a.slug}">แชร์</button></div>
    <div class="dtabs" role="tablist">${tabs.map(([k,l])=>`<button type="button" role="tab" data-dtab="${k}" aria-selected="${dState.tab===k}">${l}</button>`).join('')}</div>
    ${pane}
   </div></div>`;
  const b=dlg.querySelector('.body');if(b)b.scrollTop=0;dlg.querySelector('.dlg').scrollTop=0;
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-dtab]');if(t){dState.tab=t.dataset.dtab;renderDetail();return}
  const sk=e.target.closest('[data-spk]');if(sk){dState.spark=+sk.dataset.spk||null;renderDetail();return}
  const b=e.target.closest('[data-open]');if(!b)return;
  const slug=b.dataset.open;const same=dState.slug===slug&&dlg.open;
  openMon(slug,b.dataset.form,b.dataset.tab||(same?dState.tab:(b.dataset.form!=null&&b.dataset.form!==''?'overview':undefined)),b.dataset.spark?+b.dataset.spark:null);
});
document.getElementById('dlgClose').addEventListener('click',()=>dlg.close());
dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
dlg.addEventListener('close',()=>{dState.tab='overview';delete dState.boss;if(BY[location.hash.slice(1)]){try{history.pushState(null,'','#'+current)}catch(_){}}});

/* ===== skills view ===== */
let skMode='by',skEl='',skLimit=60;
const skElBox=document.getElementById('skEl');
skElBox.innerHTML=`<button type="button" data-e="" aria-pressed="true">ทุกสี</button>`+E.map(e=>`<button type="button" data-e="${e.k}" aria-pressed="false"><i style="background:var(--${e.k})"></i>${e.th}</button>`).join('');
const skq=document.getElementById('skq'),skk=document.getElementById('skk'),skt=document.getElementById('skt'),skr=document.getElementById('skr');
function skMatch(a,s,q){return (!skEl||s.e===skEl)&&(!skk.value||s.k===skk.value)&&(!skt.value||(skt.value==='-'?!s.t:s.t===skt.value))&&(!skr.value||s.r)&&(!q||s.n.toLowerCase().includes(q)||nameHit(a,q))}
function renderSkills(){
  const q=skq.value.trim().toLowerCase();
  const by=document.getElementById('skBy'),all=document.getElementById('skAll'),more=document.getElementById('skMore');
  by.hidden=skMode!=='by';all.hidden=skMode!=='all';
  if(skMode==='by'){
    const rows=A.map(a=>{const ss=skillsOf(a.slug).filter(s=>skMatch(a,s,q));return {a,ss,cols:skColors(a.slug)}}).filter(r=>r.ss.length);
    document.getElementById('skCount').textContent=`${rows.length} ตัว · ${rows.reduce((n,r)=>n+r.ss.length,0)} สกิล`;
    by.innerHTML=rows.map(({a,ss,cols})=>`<div class="crow">
      <button type="button" class="own" data-open="${a.slug}" data-tab="skills"><img decoding="async" src="${TH(a.i)}" alt=""><span><b>${esc(a.name)}</b><small>${a.e.map(k=>EK[k].th).join(' / ')} · ${a.r}</small></span></button>
      <div class="orbs">${ss.map(s=>`<span style="display:grid;justify-items:center;gap:3px;font-size:.66rem;color:var(--ink-2);width:52px;text-align:center;line-height:1.15">${orb(s)}${SLOT[s.k]||s.k}</span>`).join('')}</div>
      <div class="palette">${cols.map(k=>`<span class="swatch"><i style="background:var(--${k})"></i>${EK[k].th}</span>`).join('')}</div></div>`).join('')||'<p class="muted">ไม่พบสกิลที่ตรงกับตัวกรอง</p>';
    more.hidden=true;
  }else{
    const list=ALLSK.filter(({a,s})=>skMatch(a,s,q));
    document.getElementById('skCount').textContent=`${list.length} สกิล`;
    all.innerHTML=list.slice(0,skLimit).map(({a,s})=>`<div class="skrow" style="--c:var(--${s.e||'neutral'})">${orb(s)}
      <div><h4>${esc(s.n)}</h4><div class="pills">${badge(s.e)}<span class="chip">${SLOT[s.k]||s.k}</span>${s.t?`<span class="chip">${DMG[s.t]}</span>`:''}${s.r?'<span class="chip" style="background:color-mix(in srgb,var(--sun) 35%,var(--sunk))">Rare</span>':''}</div></div>
      <div class="ownwrap"><button type="button" class="own" data-open="${a.slug}" data-tab="skills"><img decoding="async" src="${TH(a.i)}" alt=""><span>${esc(a.name)}</span></button></div>
      <div class="nums">${s.mi&&s.mi!=='0'?`<span class="chip">พลัง ${esc(s.mi)}</span>`:''}${s.cost&&s.cost!=='0'?`<span class="chip">${s.k==='ult'?'เกจ':'EP'} ${esc(s.cost)}</span>`:''}${s.cd?`<span class="chip">CD ${esc(s.cd)}</span>`:''}</div>
      ${s.d?`<details><summary>รายละเอียด</summary>${esc(tr(s.d))}</details>`:''}</div>`).join('')||'<p class="muted">ไม่พบสกิลที่ตรงกับตัวกรอง</p>';
    more.hidden=list.length<=skLimit;more.textContent=`แสดงเพิ่ม (อีก ${list.length-skLimit})`;
  }
}
document.getElementById('skMode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;skMode=b.dataset.m;skLimit=60;document.querySelectorAll('#skMode button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderSkills()});
skElBox.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;skEl=b.dataset.e;skLimit=60;skElBox.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderSkills()});
[skq,skk,skt,skr].forEach(el=>el.addEventListener(el.type==='search'?'input':'change',()=>{skLimit=60;renderSkills()}));
document.getElementById('skMore').addEventListener('click',()=>{skLimit+=60;renderSkills()});

/* ===== sparkling view ===== */
let spType=1;
const spTypeBox=document.getElementById('spType'),spq=document.getElementById('spq'),spf=document.getElementById('spf');
spTypeBox.innerHTML=STYPES.map((t,i)=>`<button type="button" data-st="${i+1}" aria-pressed="${i===0}">${i<10?t.replace('Type ',''):t}</button>`).join('');
function renderSpark(){
  const q=spq.value.trim().toLowerCase();
  const list=SPK.e.map(([s,fi],i)=>({a:BY[s],fi,i})).filter(x=>x.a&&(!q||nameHit(x.a,q))&&(spf.value==='all'||(spf.value==='base'?x.fi==null:x.fi!=null)));
  document.getElementById('spCount').textContent=`${STYPES[spType-1]} · ${list.length} ร่าง`;
  document.getElementById('sgrid').innerHTML=list.map(({a,fi,i})=>`<button type="button" class="scard" data-open="${a.slug}" data-form="${fi==null?'':fi}" data-tab="sparkling" data-spark="${spType}"><span class="sparkle-flag">✦ ${STYPE_TH[spType-1]}</span><span class="pic"><span class="spr" style="${sprStyle(spType,i)}" role="img" aria-label="${esc(a.name)} ${STYPES[spType-1]}"></span></span><span class="info"><b>${esc(a.name)}</b><small>${fi==null?'ร่างปกติ':a.f[fi].k==='prismana'?'Prismana':esc(a.f[fi].n)} · ${(fi==null?a.e:a.f[fi].e).map(k=>EK[k].th).join('/')}</small></span></button>`).join('')||'<p class="muted">ไม่พบ Aniimo</p>';
}
spTypeBox.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;spType=+b.dataset.st;spTypeBox.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderSpark()});
[spq,spf].forEach(el=>el.addEventListener(el.type==='search'?'input':'change',renderSpark));

/* ===== forms ===== */
const FORMS=[];A.forEach(a=>a.f.forEach((f,idx)=>FORMS.push({a,f,idx})));
const fseg=document.getElementById('fseg'),fgrid=document.getElementById('fgrid');let fk='all';
fseg.innerHTML=['all','prismana','region','rain','thunder','snow','night'].map(k=>{const n=k==='all'?FORMS.length:FORMS.filter(x=>x.f.k===k).length;return `<button type="button" data-k="${k}" aria-pressed="${k==='all'}">${k==='all'?'ทั้งหมด':KIND[k]} (${n})</button>`}).join('');
function renderForms(){fgrid.innerHTML=FORMS.filter(x=>fk==='all'||x.f.k===fk).map(({a,f,idx})=>`<button type="button" class="fcard k-${f.k}" data-open="${a.slug}" data-form="${idx}"><span class="pic">${f.i?`<img decoding="async" src="${TH(f.i)}" alt="${esc(a.name)} ร่าง ${esc(f.n)}" loading="lazy">`:'<span class="none">ยังไม่มีภาพ</span>'}</span><span class="info"><b>${esc(a.name)}</b><small>${KIND[f.k]} · ${esc(f.n)}</small><span style="display:flex;gap:3px;flex-wrap:wrap">${f.e.map(badge).join('')}</span></span></button>`).join('')}
fseg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;fk=b.dataset.k;fseg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderForms()});

/* ===== elements ===== */
document.getElementById('elems').innerHTML=E.map(e=>`<div class="epill" style="background:var(--${e.k})">${e.th}<small>${e.en}</small></div>`).join('');
let h='<thead><tr><th class="corner">โจมตี ↓ / ป้องกัน →</th>'+E.map(e=>`<th><span class="dot" style="background:var(--${e.k})"></span>${e.th}</th>`).join('')+'</tr></thead><tbody>';
E.forEach(a=>{h+=`<tr><th class="rowh"><span class="dot" style="background:var(--${a.k})"></span>${a.th}</th>`;E.forEach(d=>{const m=mult(a.k,d.k);h+=`<td class="${m>1?'x2':m<1?'xh':'x1'}" title="${a.th} → ${d.th}">${m===1?'1':m===1.6?'1.6':'.625'}</td>`});h+='</tr>'});
document.getElementById('tc').innerHTML=h+'</tbody>';
const opts=E.map(e=>`<option value="${e.k}">${e.th} (${e.en})</option>`).join('');
const atk=document.getElementById('atk'),d1=document.getElementById('def1'),d2=document.getElementById('def2'),res=document.getElementById('res');
atk.innerHTML=opts;d1.innerHTML=opts;d2.innerHTML='<option value="">— ไม่มี —</option>'+opts;atk.value='ice';d1.value='water';d2.value='wind';
function calc(){let v=mult(atk.value,d1.value);if(d2.value&&d2.value!==d1.value)v*=mult(atk.value,d2.value);res.innerHTML=fmt(v)+'<small>'+(v>1?'ได้เปรียบ':v<1?'ถูกต้าน':'ปกติ')+'</small>';res.style.color=v>1?'var(--good)':v<1?'var(--bad)':'var(--ink)'}
[atk,d1,d2].forEach(s=>s.addEventListener('change',calc));document.getElementById('calc').addEventListener('submit',e=>e.preventDefault());calc();

/* ===== tier ===== */
const T={
 S:['Besauce','Fulmintis','Helion','Ignitis','Inferlupa','Lunara','Pawney','Prismana Glacy','Prismana Turbo','Rookey','Somniwing','Sparkelf','Stellarys','Turbo'],
 A:['Blazen','Cornet','Dreaple','Eklue','Eko','Fenmane','Flamerion','Fragrancier','Geoclaw','Gracewing','Helgon','Hexxin','Infergon','Luminelle','Sherro','Squashel','Tromber','Tubster','Prismana Blazen','Prismana Cornet','Prismana Fenmane','Prismana Fulmintis','Prismana Grizbo','Prismana Hexxin','Prismana Ignitis','Prismana Pawney','Prismana Sherro','Prismana Stellarys'],
 B:['Chirpi','Erlath','Flutternym','Glacy','Glynsera','Grizbo','Irisal','Leafy','Magmarex','Melloblum','Minespine','Panpanta','Scorchhowl','Thornblade','Tuckin','Waleetle','Wisptis','Prismana Glynsera','Prismana Infergon','Prismana Luminelle','Prismana Panpanta','Prismana Scorchhowl','Prismana Thornblade','Prismana Waleetle'],
 C:['Baleetle','Bouldus','Budsquire','Celestis','Cubbo','Dewy','Fahloo','Fentuft','Geodeback','Helmut','Hummin','Nimbi','Piopiota','Pomawk','Pranky','Shrubclaw','Sparki'],
 D:['Bailite','Bolty','Bonesky','Budclaw','Bulbly','Cozite','Emberpup','Fenrier','Flameruff','Jawling','Lavazar','Pebbling','Pomegg','Popota','Sheldon','Shelly','Skippy','Susuta','Veilfloat']};
const tiersEl=document.getElementById('tiers'),q=document.getElementById('q');let tf='all';
function tierChip(n,term){
  const pr=n.startsWith('Prismana '),a=BY[(pr?n.slice(9):n).toLowerCase()];
  let fi='';if(pr&&a){const i=a.f.findIndex(f=>f.k==='prismana');if(i>=0)fi=i}
  const img=a?(fi!==''&&a.f[fi].i?a.f[fi].i:a.i):'';
  let lab=esc(n);if(term){const i=n.toLowerCase().indexOf(term);lab=esc(n.slice(0,i))+'<mark>'+esc(n.slice(i,i+term.length))+'</mark>'+esc(n.slice(i+term.length))}
  return a?`<button type="button" class="tn${pr?' pr':''}" data-open="${a.slug}"${fi!==''?` data-form="${fi}"`:''}><img decoding="async" src="${TH(img)}" alt="" loading="lazy">${lab}</button>`:`<span class="tn" style="padding-left:10px">${lab}</span>`;
}
var tierRole=''; // var: a #tier link renders before this line runs
const roleOk=n=>{if(!tierRole)return true;const a=BY[(n.startsWith('Prismana ')?n.slice(9):n).toLowerCase()];return !!a&&a.r===tierRole};
function renderTiers(){const term=q.value.trim().toLowerCase();let html='';
  if(TV.src==='vote'){const groups={S:[],A:[],B:[],C:[],D:[]},res=TV.res||{};A.filter(a=>!a.u).forEach(a=>{const t=tvTier(res[a.slug]);if(t)groups[t].push(a)});
    for(const t of Object.keys(groups)){if(tf!=='all'&&tf!==t)continue;const list=groups[t].filter(a=>(!term||nameHit(a,term))&&(!tierRole||a.r===tierRole));if(!list.length)continue;
      html+=`<div class="trow"><div class="t t-${t}">${t}</div><div class="names">${list.map(a=>`<button type="button" class="tn" data-open="${a.slug}"><img decoding="async" src="${TH(a.i)}" alt="" loading="lazy">${esc(a.name)}<span class="vc">${res[a.slug].n}</span></button>`).join('')}</div></div>`}
    tiersEl.innerHTML=html||`<p class="muted">${TV.err?'โหลดผลโหวตไม่สำเร็จ':'ยังมีโหวตไม่พอ ช่วยกันโหวตได้ในหน้ารายละเอียดของแต่ละตัว'}</p>`;return}
  for(const t of Object.keys(T)){if(tf!=='all'&&tf!==t)continue;const list=T[t].filter(n=>(!term||n.toLowerCase().includes(term))&&roleOk(n));if(term&&!list.length)continue;html+=`<div class="trow"><div class="t t-${t}">${t}</div><div class="names">${list.map(n=>tierChip(n,term)).join('')}</div></div>`}tiersEl.innerHTML=html||'<p class="muted">ไม่พบชื่อนี้ใน Tier List</p>'}
q.addEventListener('input',renderTiers);
document.getElementById('tierRole').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;tierRole=b.dataset.r;document.querySelectorAll('#tierRole button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderTiers()});
document.getElementById('seg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;tf=b.dataset.t;document.querySelectorAll('#seg button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderTiers()});

/* ===== codes ===== */
const C=(window.CODES&&window.CODES.codes||[]).map(x=>[x.code,x.reward,x.expired]);
const cl=document.getElementById('codeList');
if(window.CODES&&window.CODES.codes_checked)document.getElementById('codesChecked').textContent=new Date(window.CODES.codes_checked+'T00:00:00').toLocaleDateString(LOC,{day:'numeric',month:'short',year:'numeric'});
cl.innerHTML=C.map(([c,r,x])=>`<div class="code${x?' expired':''}"><code>${c}</code>${x?'<span class="small muted">หมดอายุ</span>':`<button type="button" data-c="${c}">คัดลอก</button>`}<span class="rw">${r}</span></div>`).join('');
cl.addEventListener('click',e=>{const b=e.target.closest('button[data-c]');if(!b)return;const c=b.dataset.c;const ok=()=>{b.textContent='คัดลอกแล้ว';b.classList.add('done');setTimeout(()=>{b.textContent='คัดลอก';b.classList.remove('done')},1600)};const fb=()=>{const r=document.createRange();r.selectNodeContents(b.previousElementSibling);const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='เลือกแล้ว กด Ctrl+C'};try{navigator.clipboard.writeText(c).then(ok,fb)}catch(_){fb()}});

/* ===== team builder ===== */
const TIER={};Object.entries(T).forEach(([t,ns])=>ns.forEach(n=>{if(!n.startsWith('Prismana ')){const s=n.toLowerCase();TIER[s]=TIER[s]||t}}));
const TIER_PTS={S:4,A:3,B:2,C:1,D:0};
const PARTNERS=window.PARTNERS||{};
const ROLES=['DPS','Break','Support','Heal','Regen'];
let team=[null,null,null,null],pickSlot=0,pickTarget='team';
try{const s=JSON.parse(localStorage.getItem('aniimo-team')||'null');if(Array.isArray(s)&&s.length===4)team=s.map(m=>m&&BY[m.slug]?{slug:m.slug,form:m.form==null?null:m.form}:null)}catch(_){}
const saveTeam=()=>{try{localStorage.setItem('aniimo-team',JSON.stringify(team))}catch(_){}};
const memEls=m=>{const a=BY[m.slug];return m.form!=null&&a.f[m.form]?a.f[m.form].e:a.e};
const takes=(atkEl,els)=>els.reduce((v,d)=>v*mult(atkEl,d),1);
function analyze(members){
  const ms=members.filter(Boolean);
  const roles={};ROLES.forEach(r=>roles[r]=ms.filter(m=>BY[m.slug].r===r).length);
  const skEls=[];ms.forEach(m=>skColors(m.slug).forEach(k=>{if(!skEls.includes(k))skEls.push(k)}));
  const cov=E.map(d=>({k:d.k,best:skEls.length?Math.max(...skEls.map(a=>mult(a,d.k))):0}));
  const weak=E.map(x=>{const w=ms.filter(m=>takes(x.k,memEls(m))>1).length,r=ms.filter(m=>takes(x.k,memEls(m))<1).length;return {k:x.k,w,r,risk:w>=2&&r===0}});
  const roleScore=(roles.DPS?14:0)+((roles.Heal||roles.Regen)?12:0)+((roles.Support)?7:0)+((roles.Break)?7:0);
  const covScore=Math.round(cov.filter(c=>c.best>1).length/9*35);
  const weakScore=ms.length?Math.max(0,25-weak.filter(w=>w.risk).length*7-weak.filter(w=>w.w>=3).length*4):0;
  return {ms,roles,skEls,cov,weak,score:ms.length?roleScore+covScore+weakScore:0};
}
function candScore(a,members){
  const cur=analyze(members),next=analyze(members.map((m,i)=>i===members.indexOf(null)?{slug:a.slug,form:null}:m));
  let s=(TIER_PTS[TIER[a.slug]]??1)*1.5,why=[];
  if(!cur.roles[a.r]&&a.r!=='—'){s+=a.r==='DPS'||a.r==='Heal'||a.r==='Regen'?5:3;why.push('เติมบทบาท '+a.r)}
  const newCov=next.cov.filter((c,i)=>c.best>1&&!(cur.cov[i].best>1)).map(c=>c.k);
  if(newCov.length){s+=newCov.length*1.2;why.push('ตีแพ้ทาง '+newCov.map(k=>EK[k].th).join(' ')+' เพิ่ม')}
  const fixed=cur.weak.filter((w,i)=>w.risk&&!next.weak[i].risk).map(w=>w.k);
  if(fixed.length){s+=fixed.length*2;why.push('ช่วยต้าน '+fixed.map(k=>EK[k].th).join(' '))}
  const pal=members.filter(Boolean).some(m=>(PARTNERS[m.slug]||[]).includes(a.slug)||(PARTNERS[a.slug]||[]).includes(m.slug));
  if(pal){s+=3;why.push('คู่หูแนะนำของสมาชิก')}
  if(TIER[a.slug]==='S')why.push('Tier S');
  return {a,s,why};
}
function suggestions(members,n){
  if(!members.includes(null))return [];
  const taken=new Set(members.filter(Boolean).map(m=>m.slug));
  return A.filter(a=>!a.u&&!taken.has(a.slug)&&a.r!=='—').map(a=>candScore(a,members)).sort((x,y)=>y.s-x.s).slice(0,n);
}
function renderTeam(){
  const slots=document.getElementById('slots');
  slots.innerHTML=team.map((m,i)=>{
    if(!m)return `<button type="button" class="slot empty" data-pick="${i}"><span class="plus">+</span>ช่องที่ ${i+1}<small class="muted">เลือก Aniimo</small></button>`;
    const a=BY[m.slug],f=m.form!=null?a.f[m.form]:null,img=f&&f.i?f.i:a.i;
    return `<div class="slot"><span class="no">${i+1}</span><button type="button" class="rm" data-rm="${i}" aria-label="เอา ${esc(a.name)} ออก">×</button>
      <button type="button" class="pic" data-pick="${i}" style="border:0;cursor:pointer" aria-label="เปลี่ยนตัวในช่อง ${i+1}"><img src="${img}" alt="${esc(a.name)}" class="${!f&&a.cut?'cut':''}"></button>
      <div class="info"><button type="button" class="nm" data-open="${a.slug}">${esc(a.name)}</button>
      <div class="row">${memEls(m).map(badge).join('')}${roleChip(a.r)}</div>
      ${a.f.length?`<select data-form-slot="${i}" aria-label="ร่างของ ${esc(a.name)}"><option value="">ร่างปกติ</option>${a.f.map((x,j)=>`<option value="${j}" ${m.form===j?'selected':''}>${KIND[x.k]} · ${esc(x.n)}</option>`).join('')}</select>`:''}
      <div class="row" title="สกิลของตัวนี้">${skillsOf(a.slug).map(s=>orb(s,true)).join('')}</div></div></div>`;
  }).join('');
  const r=analyze(team);
  document.getElementById('tmMeter').style.width=r.score+'%';
  document.getElementById('tmScoreTxt').textContent=r.ms.length?`${r.score} / 100`:'ยังไม่มีสมาชิก';
  document.getElementById('tmRoles').innerHTML=ROLES.map(x=>`<span class="role-pill${r.roles[x]?' on':''}">${x}<b>${r.roles[x]}</b></span>`).join('');
  const adv=[];
  if(!r.ms.length)adv.push(['warn','เริ่มจากเลือกตัว DPS หลัก 1 ตัว หรือโหลดทีมตัวอย่างด้านล่าง']);
  else{
    if(!r.roles.DPS)adv.push(['bad','ยังไม่มีตัวทำดาเมจหลัก (DPS)']);
    if(!r.roles.Heal&&!r.roles.Regen)adv.push(['bad','ยังไม่มีตัวฮีลหรือฟื้นพลัง (Heal / Regen) ทีมจะยืนระยะยาก']);
    if(!r.roles.Support)adv.push(['warn','ไม่มี Support ช่วยบัฟทีม']);
    if(!r.roles.Break)adv.push(['warn','ไม่มี Break ช่วยทำลายเกราะบอส']);
    if(r.roles.DPS>=3)adv.push(['warn','DPS มากเกินไป ลองเปลี่ยน 1 ตัวเป็นสายสนับสนุน']);
    if(r.roles.DPS&&(r.roles.Heal||r.roles.Regen)&&r.roles.Support)adv.push(['ok','บทบาทสมดุลดี มีทั้งดาเมจ ฟื้นฟู และบัฟ']);
  }
  document.getElementById('tmAdvice').innerHTML=adv.map(([c,t])=>`<li class="${c==='ok'?'':c}">${t}</li>`).join('');
  document.getElementById('tmPalette').innerHTML=r.skEls.map(k=>{const n=r.ms.reduce((c,m)=>c+skillsOf(m.slug).filter(s=>s.e===k).length,0);return `<span class="swatch"><i style="background:var(--${k})"></i>${EK[k].th} · ${n}</span>`}).join('')||'<span class="small muted">ยังไม่มีสกิล</span>';
  const syn=[];
  const pk=new Set(),pairs=[];r.ms.forEach(m=>(PARTNERS[m.slug]||[]).forEach(p=>{const k=[m.slug,p].sort().join('|');if(p!==m.slug&&r.ms.some(x=>x.slug===p)&&!pk.has(k)){pk.add(k);pairs.push(`${BY[m.slug].name} + ${BY[p].name}`)}}));
  pairs.forEach(p=>syn.push(['ok','คู่หูแนะนำ: '+p]));
  const elCount={};r.ms.forEach(m=>BY[m.slug].e.forEach(k=>elCount[k]=(elCount[k]||0)+1));
  Object.entries(elCount).filter(([,n])=>n>=3).forEach(([k])=>syn.push(['ok',`ทีมธาตุ${EK[k].th}เป็นหลัก เหมาะกับตัวบัฟธาตุเดียวกัน`]));
  if(r.ms.some(m=>m.slug==='luminelle')&&elCount.lightning>=2)syn.push(['ok','Luminelle เด่นในทีมสายฟ้า']);
  if(r.ms.length&&r.skEls.length<=1)syn.push(['warn','สีสกิลมีสีเดียว ศัตรูที่ต้านธาตุนี้จะรับมือยาก']);
  document.getElementById('tmSyn').innerHTML=syn.map(([c,t])=>`<li class="${c==='ok'?'':c}">${esc(t)}</li>`).join('');
  document.getElementById('tmCov').innerHTML=r.cov.map(c=>`<div class="${c.best>1?'hit':''}"><i style="background:var(--${c.k})"></i>${EK[c.k].th}<b>${c.best?fmt(c.best):'—'}</b></div>`).join('');
  document.getElementById('tmCovTxt').textContent=`${r.cov.filter(c=>c.best>1).length} / 9 ธาตุ`;
  document.getElementById('tmWeak').innerHTML=r.weak.map(w=>`<div class="${w.risk?'risk':w.r&&!w.w?'safe':''}" title="แพ้ทาง ${w.w} ตัว · ต้านได้ ${w.r} ตัว"><i style="background:var(--${w.k})"></i>${EK[w.k].th}<b>แพ้ ${w.w}</b><small class="muted">${w.r?'ต้าน '+w.r:'&nbsp;'}</small></div>`).join('');
  const risky=r.weak.filter(w=>w.risk).length;
  document.getElementById('tmWeakTxt').textContent=r.ms.length?(risky?`เสี่ยง ${risky} ธาตุ`:'ไม่มีจุดอ่อนซ้ำ'):'';
  const sug=suggestions(team,6);
  document.getElementById('tmSug').innerHTML=sug.length?sug.map(({a,why})=>`<div class="sug"><img decoding="async" src="${TH(a.i)}" alt="" class="${a.cut?'cut':''}"><div><b>${esc(a.name)}</b><small>${a.e.map(k=>EK[k].th).join('/')} · ${a.r}${TIER[a.slug]?' · Tier '+TIER[a.slug]:''}</small><small>${esc(why.slice(0,3).join(' · ')||'ตัวเลือกที่สมดุล')}</small></div><button type="button" data-add="${a.slug}">เพิ่ม</button></div>`).join(''):'<p class="small muted">ทีมเต็มแล้ว เอาตัวออก 1 ช่องเพื่อดูคำแนะนำ</p>';
  saveTeam();
}
const PRESETS=[
 {n:'สายฟ้าบัฟ',d:'Fulmintis ทำดาเมจ ได้บัฟจาก Luminelle และ Dazmand ส่วน Gracewing คอยฮีล',m:['fulmintis','luminelle','dazmand','gracewing']},
 {n:'เวทมืดระเบิดดาเมจ',d:'Stellarys กับคู่หูแนะนำ Hexxin และ Fragrancier เสริม Break ด้วย Inferlupa',m:['stellarys','inferlupa','hexxin','fragrancier']},
 {n:'ตัวเริ่มต้นแสง',d:'Helion นำทีม มี Rookey ทำ Break, Turbo บัฟ และ Gracewing ฮีล',m:['helion','rookey','turbo','gracewing']},
 {n:'Break หนักล้มบอส',d:'ทำลายเกราะเร็ว ฟื้นพลังด้วย Somniwing',m:['inferlupa','rookey','geoclaw','somniwing']},
 {n:'Egg Heist ยืนระยะ',d:'DPS สายแข็งแรง Pawney พร้อมบัฟ ฮีล และฟื้นพลังครบ',m:['pawney','turbo','gracewing','somniwing']},
 {n:'สีสกิลครบหลายธาตุ',d:'ครอบคลุม ไฟ มืด ลม น้ำ ดิน ตีแพ้ทางได้กว้าง',m:['ignitis','sherro','eklue','leafy']}];
document.getElementById('presets').innerHTML=PRESETS.map((p,i)=>`<button type="button" class="preset" data-preset="${i}"><span class="faces">${p.m.map(s=>BY[s]?`<img decoding="async" src="${TH(BY[s].i)}" alt="${esc(BY[s].name)}">`:'').join('')}</span><b>${p.n}</b><small>${p.d}</small></button>`).join('');
const pick=document.getElementById('pick'),pq=document.getElementById('pq'),pe=document.getElementById('pe'),pr=document.getElementById('pr');
pe.innerHTML+=E.map(e=>`<option value="${e.k}">${e.th}</option>`).join('');
function renderPick(){
  const q=pq.value.trim().toLowerCase(),taken=new Set(pickTarget==='compare'?CMP:team.filter(Boolean).map(m=>m.slug));
  document.getElementById('pgrid').innerHTML=A.filter(a=>(!q||nameHit(a,q))&&(!pe.value||a.e.includes(pe.value))&&(!pr.value||a.r===pr.value)).map(a=>`<button type="button" data-choose="${a.slug}" ${taken.has(a.slug)?'disabled':''}><img decoding="async" src="${TH(a.i)}" alt="" class="${a.cut?'cut':''}" loading="lazy"><b style="font-weight:500">${esc(a.name)}</b><span style="display:flex;gap:3px">${a.e.map(badge).join('')}</span><small class="muted">${a.r}${a.u?' · ยังไม่เปิด':''}</small></button>`).join('')||'<p class="muted">ไม่พบ Aniimo</p>';
}
[pq,pe,pr].forEach(el=>el.addEventListener(el.type==='search'?'input':'change',renderPick));
document.getElementById('pickClose').addEventListener('click',()=>pick.close());
pick.addEventListener('click',e=>{if(e.target===pick)pick.close()});
const tmMsg=t=>{const el=document.getElementById('tmMsg');el.textContent=t;clearTimeout(tmMsg.t);tmMsg.t=setTimeout(()=>el.textContent='',2200)};
document.addEventListener('click',e=>{
  const p=e.target.closest('[data-pick]');if(p){pickTarget='team';pickSlot=+p.dataset.pick;pq.value='';renderPick();pick.showModal();return}
  const c=e.target.closest('[data-choose]');if(c){pick.close();if(pickTarget==='compare'){cmpAdd(c.dataset.choose)}else{team[pickSlot]={slug:c.dataset.choose,form:null};renderTeam()}return}
  const rm=e.target.closest('[data-rm]');if(rm){team[+rm.dataset.rm]=null;renderTeam();return}
  const ad=e.target.closest('[data-add]');if(ad){const i=team.indexOf(null);if(i>=0){team[i]={slug:ad.dataset.add,form:null};renderTeam();tmMsg('เพิ่ม '+BY[ad.dataset.add].name+' แล้ว')}return}
  const ps=e.target.closest('[data-preset]');if(ps){const p=PRESETS[+ps.dataset.preset];team=p.m.map(s=>BY[s]?{slug:s,form:null}:null);renderTeam();tmMsg('โหลดทีม “'+p.n+'” แล้ว');document.getElementById('slots').scrollIntoView({behavior:'smooth',block:'start'});return}
});
document.getElementById('slots').addEventListener('change',e=>{const s=e.target.closest('[data-form-slot]');if(!s)return;team[+s.dataset.formSlot].form=s.value===''?null:+s.value;renderTeam()});
document.getElementById('tmClear').addEventListener('click',()=>{team=[null,null,null,null];renderTeam();tmMsg('ล้างทีมแล้ว')});
document.getElementById('tmAuto').addEventListener('click',()=>{let n=0;while(team.includes(null)){const s=suggestions(team,1)[0];if(!s)break;team[team.indexOf(null)]={slug:s.a.slug,form:null};n++}renderTeam();tmMsg(n?`เติม ${n} ตัวตามคำแนะนำแล้ว`:'ทีมเต็มแล้ว')});
document.getElementById('tmCopy').addEventListener('click',()=>{
  const r=analyze(team);if(!r.ms.length){tmMsg('ยังไม่มีสมาชิกในทีม');return}
  const txt='ทีม Aniimo: '+r.ms.map(m=>{const a=BY[m.slug],f=m.form!=null?a.f[m.form]:null;return a.name+(f?` (${f.n})`:'')+` [${a.r}]`}).join(' / ')+` · คะแนน ${r.score}/100`;
  try{navigator.clipboard.writeText(txt).then(()=>tmMsg('คัดลอกแล้ว'),()=>tmMsg(txt))}catch(_){tmMsg(txt)}
});

/* ===== collection tracker =====
   Saved per viewer: in the Artifact viewer it syncs to this person's private db document
   (data/users/<id>/collection); everywhere else it stays in this browser. */
const COL={d:{c:{},f:{},s:{}},mode:'local',ref:null,timer:null,writing:false,again:false};
try{const x=JSON.parse(localStorage.getItem('aniimo-collection')||'null');if(x&&typeof x==='object')COL.d={c:x.c||{},f:x.f||{},s:x.s||{}}}catch(_){}
COL.saveLocal=()=>{try{localStorage.setItem('aniimo-collection',JSON.stringify(COL.d))}catch(_){}};
COL.flush=async()=>{
  COL.timer=null;if(!COL.ref)return;
  if(COL.writing){COL.again=true;return}
  COL.writing=true;
  try{await COL.ref.set({c:COL.d.c,f:COL.d.f,s:COL.d.s,v:1})}
  catch(e){if(e&&['invalid_argument','not_granted','revoked','capability_disabled','capability_removed'].includes(e.code)){COL.ref=null;COL.mode='local';colRefresh()}}
  COL.writing=false;if(COL.again){COL.again=false;COL.flush()}
};
COL.push=()=>{if(!COL.ref)return;clearTimeout(COL.timer);COL.timer=setTimeout(COL.flush,700)};
COL.toggle=(kind,key)=>{const m=COL.d[kind];if(m[key])delete m[key];else m[key]=1;COL.saveLocal();COL.push();if(typeof syncPush==='function')syncPush()};
(async()=>{try{
  const c=window.claude;if(!c||!c.use)return;
  const [db,user]=await Promise.all([c.use('db'),c.use('user')]);if(!db||!user)return;
  const id=await user.id();if(!id)return;
  COL.ref=db.doc('data/users/'+id+'/collection');COL.mode='cloud';colRefresh();
  COL.ref.onSnapshot(snap=>{
    if(COL.timer||COL.writing||(snap.metadata&&snap.metadata.hasPendingWrites))return;
    if(snap.exists){const d=snap.data()||{};COL.d={c:{...(d.c||{})},f:{...(d.f||{})},s:{...(d.s||{})}};COL.saveLocal();colRefresh(true)}
  },()=>{COL.ref=null;COL.mode='local';colRefresh()});
}catch(_){}})();
function colModeUI(){
  const chip=document.getElementById('colMode'),txt=document.getElementById('colModeTxt');
  if(chip){chip.textContent=COL.mode==='cloud'?'☁ บันทึกในบัญชี':'บันทึกในเบราว์เซอร์นี้';txt.textContent=COL.mode==='cloud'?'เปิดจากเครื่องไหนที่ล็อกอินบัญชีเดียวกันก็เห็นความคืบหน้าเดียวกัน':'ข้อมูลอยู่ในเบราว์เซอร์นี้เท่านั้น ใช้โค้ดสำรองเพื่อย้ายไปเครื่องอื่น'}
}
function colRefresh(changed){
  colModeUI();
  if(RENDERED.has('collection')&&current==='collection')renderCollection();
  if(changed){if(RENDERED.has('dex'))renderDex();if(dlg.open&&!dState.boss)renderDetail()}
}
const RELEASED=A.filter(a=>!a.u);
function colTotals(){
  const base=RELEASED.length,forms=RELEASED.reduce((n,a)=>n+a.f.length,0),spk=SPK.e.length*12;
  const hb=RELEASED.filter(a=>COL.d.c[a.slug]).length,hf=Object.keys(COL.d.f).length,hs=Object.keys(COL.d.s).length;
  return [['ร่างปกติ',hb,base],['ร่างพิเศษ',hf,forms],['ร่างเปล่งประกาย',hs,spk]];
}
const ce=document.getElementById('ce');ce.innerHTML+=E.map(e=>`<option value="${e.k}">${e.th}</option>`).join('');
function renderCollection(){
  syncBox('syncBoxCol');
  colModeUI();
  document.getElementById('colStats').innerHTML=colTotals().map(([l,h,t])=>`<div class="colstat"><small>${l}</small><b>${h} / ${t}</b><div class="meter"><i style="width:${t?Math.round(h/t*100):0}%"></i></div><small>${t?Math.round(h/t*100):0}%</small></div>`).join('');
  const q=document.getElementById('cq').value.trim().toLowerCase(),cf=document.getElementById('cf').value;
  const rows=RELEASED.filter(a=>(!q||nameHit(a,q))&&(!ce.value||a.e.includes(ce.value))).map(a=>{
    const spkN=SPK.e.filter(([s])=>s===a.slug).length*12,spkH=Object.keys(COL.d.s).filter(k=>k.startsWith(a.slug+'|')).length;
    const fH=a.f.filter((f,i)=>COL.d.f[a.slug+'|'+i]).length;
    const done=!!COL.d.c[a.slug]&&fH===a.f.length&&spkH===spkN;
    return {a,spkN,spkH,done};
  }).filter(r=>!cf||(cf==='done')===r.done);
  document.getElementById('colRows').innerHTML=rows.map(({a,spkN,spkH,done})=>`<div class="colrow${done?' done':''}">
    <button type="button" class="own" data-open="${a.slug}"><img decoding="async" loading="lazy" src="${TH(a.i)}" alt=""><span><b>${esc(a.name)}</b><small>${numLabel(a)} · ${a.e.map(k=>EK[k].th).join('/')}</small></span></button>
    <div class="ticks"><button type="button" class="tick" data-col="c" data-key="${a.slug}" aria-pressed="${!!COL.d.c[a.slug]}"><img decoding="async" loading="lazy" src="${TH(a.i)}" alt="">ปกติ</button>${a.f.map((f,i)=>`<button type="button" class="tick" data-col="f" data-key="${a.slug}|${i}" aria-pressed="${!!COL.d.f[a.slug+'|'+i]}">${f.i?`<img decoding="async" loading="lazy" src="${TH(f.i)}" alt="">`:''}${esc(f.n)}</button>`).join('')}</div>
    ${spkN?`<button type="button" class="spkcount" data-open="${a.slug}" data-tab="sparkling">✦ ${spkH}/${spkN}</button>`:'<span></span>'}</div>`).join('')||'<p class="muted">ไม่พบ Aniimo ที่ตรงกับตัวกรอง</p>';
}
['cq','cf'].forEach(id=>document.getElementById(id).addEventListener(id==='cq'?'input':'change',renderCollection));ce.addEventListener('change',renderCollection);
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-col]');if(!t)return;
  e.preventDefault();e.stopPropagation();
  COL.toggle(t.dataset.col,t.dataset.key);
  if(RENDERED.has('collection')&&current==='collection')renderCollection();
  if(RENDERED.has('dex'))renderDex();
  if(dlg.open&&!dState.boss)renderDetail();
},true);
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('own-tick')){e.preventDefault();e.target.click()}});
const colMsg=t=>{const el=document.getElementById('colMsg');el.textContent=t;clearTimeout(colMsg.t);colMsg.t=setTimeout(()=>el.textContent='',2600)};
document.getElementById('colExport').addEventListener('click',()=>{
  const code='ANIIMO1:'+btoa(unescape(encodeURIComponent(JSON.stringify(COL.d))));
  try{navigator.clipboard.writeText(code).then(()=>colMsg('คัดลอกโค้ดสำรองแล้ว'),()=>{document.getElementById('colImportBox').hidden=false;document.getElementById('colImport').value=code;colMsg('คัดลอกข้อความในช่องด้านล่างเอง')})}catch(_){document.getElementById('colImportBox').hidden=false;document.getElementById('colImport').value=code}
});
document.getElementById('colImportBtn').addEventListener('click',()=>{document.getElementById('colImportBox').hidden=false;document.getElementById('colImport').focus()});
document.getElementById('colImportCancel').addEventListener('click',()=>{document.getElementById('colImportBox').hidden=true});
document.getElementById('colImportGo').addEventListener('click',()=>{
  const raw=document.getElementById('colImport').value.trim();
  try{if(!raw.startsWith('ANIIMO1:'))throw 0;const d=JSON.parse(decodeURIComponent(escape(atob(raw.slice(8)))));if(!d||typeof d!=='object')throw 0;
    COL.d={c:d.c||{},f:d.f||{},s:d.s||{}};COL.saveLocal();COL.push();if(typeof syncPush==='function')syncPush();document.getElementById('colImportBox').hidden=true;renderCollection();if(RENDERED.has('dex'))renderDex();colMsg('นำเข้าแล้ว')}
  catch(_){colMsg('โค้ดไม่ถูกต้อง ต้องขึ้นต้นด้วย ANIIMO1:')}
});

/* ===== compare ===== */
let CMP=[];try{CMP=JSON.parse(localStorage.getItem('aniimo-compare')||'[]').filter(s=>BY[s]).slice(0,3)}catch(_){}
const saveCmp=()=>{try{localStorage.setItem('aniimo-compare',JSON.stringify(CMP))}catch(_){}};
function cmpAdd(slug){if(!CMP.includes(slug)){if(CMP.length>=3)CMP.shift();CMP.push(slug);saveCmp()}if(current==='compare'||RENDERED.has('compare'))renderCompare()}
Object.entries(T).forEach(([t,ns])=>ns.forEach(n=>{if(!n.startsWith('Prismana ')){const k=n.toLowerCase();TIERMAP[k]=TIERMAP[k]||t}}));
function renderCompare(){
  const wrap=document.getElementById('cmpWrap'),L=CMP.map(s=>BY[s]);
  if(!L.length){wrap.innerHTML='<div class="panel" style="border:0"><p class="muted">ยังไม่ได้เลือก กด “+ เพิ่ม Aniimo” หรือกด “+ เปรียบเทียบ” ในหน้ารายละเอียดของตัวที่สนใจ</p></div>';return}
  const best=k=>Math.max(...L.map(a=>(a.s&&a.s[k])||0));
  const row=(label,cells)=>`<tr><th>${label}</th>${cells.join('')}</tr>`;
  const weakOf=a=>E.filter(x=>a.e.reduce((v,d)=>v*mult(x.k,d),1)>1).map(x=>x.k);
  const resOf=a=>E.filter(x=>a.e.reduce((v,d)=>v*mult(x.k,d),1)<1).map(x=>x.k);
  wrap.innerHTML=`<table class="cmp"><tbody>
   ${row('',L.map(a=>`<td><div class="head"><button type="button" data-open="${a.slug}" style="border:0;background:none;cursor:pointer"><img src="${TH(a.i)}" alt=""></button><b style="font-family:var(--display);font-weight:500">${esc(a.name)}</b><button type="button" class="rm" data-cmp-rm="${a.slug}">เอาออก</button></div></td>`))}
   ${row('ธาตุ',L.map(a=>`<td>${a.e.map(badge).join(' ')}</td>`))}
   ${row('บทบาท / ขั้น',L.map(a=>`<td>${a.r} · ${a.st}</td>`))}
   ${row('Tier',L.map(a=>`<td>${TIERMAP[a.slug]||'—'}</td>`))}
   ${STAT.map(k=>row(STAT_L[k]||k,L.map(a=>{const v=(a.s&&a.s[k])||0;return `<td class="${v&&v===best(k)&&L.length>1?'best':''}"><div class="mini-bar"><span><i style="width:${Math.min(100,v/130*100)}%"></i></span><b>${v||'—'}</b></div></td>`}))).join('')}
   ${row('รวม',L.map(a=>{const t=STAT.reduce((n,k)=>n+((a.s&&a.s[k])||0),0);return `<td><b>${t||'—'}</b></td>`}))}
   ${row('สกิล',L.map(a=>`<td><div style="display:flex;gap:6px;flex-wrap:wrap">${skillsOf(a.slug).map(s=>orb(s,true)).join('')}</div></td>`))}
   ${row('แพ้ทาง',L.map(a=>`<td>${weakOf(a).map(badge).join(' ')||'—'}</td>`))}
   ${row('ต้านได้',L.map(a=>`<td>${resOf(a).map(badge).join(' ')||'—'}</td>`))}
   ${row('จุดเกิด',L.map(a=>`<td class="small">${(a.sp&&a.sp.r||[]).map(([n,lv])=>`${esc(n)} (Lv. ${esc(lv)})`).join('<br>')||'—'}</td>`))}
   ${row('Homeland',L.map(a=>`<td class="small">${(a.w||[]).map(workLabel).join('<br>')||'—'}</td>`))}
  </tbody></table>`;
}
document.getElementById('cmpAdd').addEventListener('click',()=>{pickTarget='compare';pq.value='';renderPick();pick.showModal()});
document.getElementById('cmpClear').addEventListener('click',()=>{CMP=[];saveCmp();renderCompare()});
document.addEventListener('click',e=>{
  const r=e.target.closest('[data-cmp-rm]');if(r){CMP=CMP.filter(s=>s!==r.dataset.cmpRm);saveCmp();renderCompare();return}
  const ad=e.target.closest('[data-cmp-add]');if(ad){cmpAdd(ad.dataset.cmpAdd);dlg.close();go('compare');return}
  const ta=e.target.closest('[data-team-add]');if(ta){const i=team.indexOf(null);dlg.close();go('team');if(i<0){tmMsg('ทีมเต็มแล้ว เอาตัวออก 1 ช่องก่อน');return}team[i]={slug:ta.dataset.teamAdd,form:null};renderTeam();tmMsg('เพิ่ม '+BY[ta.dataset.teamAdd].name+' แล้ว');return}
  const rg=e.target.closest('[data-region]');if(rg){if(dlg.open)dlg.close();go('regions');const el=document.getElementById(regionId(rg.dataset.region));if(el)setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),30);return}
  const bo=e.target.closest('[data-boss]');if(bo){openBoss(bo.dataset.boss);return}
});

/* ===== bosses ===== */
let bossKind='';
const bossImg=b=>BY[b.species]?TH(BY[b.species].i):'';
function renderBosses(){
  document.getElementById('bossGrid').innerHTML=BOSSES.filter(b=>!bossKind||b.kind===bossKind).map(b=>`<button type="button" class="bcard" data-boss="${b.slug}"><img decoding="async" loading="lazy" src="${bossImg(b)}" alt=""><span><b>${esc(b.name)}</b><small>${esc(b.region||'')}${b.lv?' · Lv. '+esc(b.lv):''}</small>
    <span class="row"><span class="ebadge kind-${b.kind.toLowerCase()}">${b.kind}</span>${badge(b.el)}</span>
    <span class="row">แพ้ ${b.weak.map(badge).join('')}</span></span></button>`).join('');
}
document.getElementById('bossSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;bossKind=b.dataset.b;document.querySelectorAll('#bossSeg button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderBosses()});
function bossCounters(b){
  return RELEASED.filter(a=>a.r!=='—').map(a=>{
    const hits=skColors(a.slug).filter(c=>b.weak.includes(c)),def=b.el?a.e.reduce((v,d)=>v*mult(b.el,d),1):1;
    let sc=(hits.length?3:0)+(def<1?2:def>1?-2:0)+((TIER_PTS[TIERMAP[a.slug]]??1)*0.8);const why=[];
    if(hits.length)why.push('สกิล'+hits.map(k=>EK[k].th).join('/')+'ตีแพ้ทาง');if(def<1)why.push('รับดาเมจเบา');if(def>1)why.push('ระวัง: แพ้ทางบอส');if(TIERMAP[a.slug])why.push('Tier '+TIERMAP[a.slug]);
    return {a,sc,why};
  }).sort((x,y)=>y.sc-x.sc).slice(0,8);
}
function openBoss(slug){
  const b=BOSSES.find(x=>x.slug===slug);if(!b)return;
  dState={boss:slug,tab:'overview'};
  const sp=BY[b.species];
  dlgBody.innerHTML=`<div class="dlg">
   <div class="hero-pic">${sp?`<img src="${sp.i}" alt="${esc(b.name)}" class="${sp.cut?'cut':''}">`:''}<span class="fname">${esc(b.region||'')}</span></div>
   <div class="body">
    <div><p class="eyebrow">${b.kind} · Lv. ${esc(b.lv||'—')}</p><h3 id="dlgTitle">${esc(b.name)}</h3></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${badge(b.el)}${b.respawn?`<span class="chip">เกิดใหม่ทุก ${esc(b.respawn)}</span>`:''}${b.claim?`<span class="chip">รับรางวัลใช้ Primegy ${b.claim}</span>`:''}</div>
    ${b.d?`<p>${esc(tr(b.d))}</p>`:''}
    <div class="small"><b>จุดอ่อน:</b> ${b.weak.map(badge).join(' ')||'—'}<br><b>ต้านได้:</b> ${b.strong.map(badge).join(' ')||'—'}</div>
    ${b.region?`<p class="small"><b>พื้นที่:</b> <button type="button" class="region-btn" data-region="${esc(b.region)}">${esc(b.region)}</button></p>`:''}
    <div><p class="eyebrow" style="margin-bottom:8px">Aniimo ที่แนะนำให้ใช้สู้</p><div class="sugs">${bossCounters(b).map(({a,why})=>`<div class="sug" style="grid-template-columns:48px 1fr"><img src="${TH(a.i)}" alt="" style="width:48px;height:48px"><div><button type="button" data-open="${a.slug}" style="border:0;background:none;padding:0;cursor:pointer;text-align:left;color:var(--ink)"><b>${esc(a.name)}</b></button><small>${a.e.map(k=>EK[k].th).join('/')} · ${a.r}</small><small>${esc(why.join(' · '))}</small></div></div>`).join('')}</div><p class="small muted" style="margin-top:6px">คำนวณจากสีสกิลที่ตีจุดอ่อนบอส การรับดาเมจจากธาตุบอส และ Tier List เป็นแนวทางคร่าว ๆ</p></div>
    ${b.stats&&b.stats.length?`<div><p class="eyebrow" style="margin-bottom:8px">ค่าสถานะตามเลเวล</p><div class="scroll-x" style="border:0"><table class="bstats"><thead><tr><th>Lv.</th><th>HP</th><th>ATK</th><th>P.DEF</th><th>M.DEF</th><th>BREAK</th></tr></thead><tbody>${b.stats.map(r=>`<tr><td>${r.lv}</td><td>${r.HP.toLocaleString()}</td><td>${r.ATK}</td><td>${r.PDEF}</td><td>${r.MDEF}</td><td>${r.BREAK}</td></tr>`).join('')}</tbody></table></div></div>`:''}
    ${b.first&&b.first.length?`<div><p class="eyebrow" style="margin-bottom:8px">รางวัลเคลียร์ครั้งแรก</p><div style="display:flex;gap:6px;flex-wrap:wrap">${b.first.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div></div>`:''}
    ${b.every&&b.every.length?`<div><p class="eyebrow" style="margin-bottom:8px">รางวัลทุกครั้ง</p><div style="display:flex;gap:6px;flex-wrap:wrap">${b.every.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div></div>`:''}
    ${sp?`<button type="button" class="btn" data-open="${sp.slug}">ดูข้อมูล ${esc(sp.name)}</button>`:''}
   </div></div>`;
  if(!dlg.open)dlg.showModal();
}


/* ===== interactive map ===== */
const MV={x:0,y:0,s:1,on:new Set(),reg:true,sel:null,img:null,ico:null,ready:false,pending:null};
const MEL={Electric:'lightning',Rock:'earth',Holy:'light'};
const mEl=n=>MEL[n]||String(n||'').toLowerCase();
const mTr=t=>(t&&LANG==='th'&&((window.MAP&&MAP.th[t])||TRM[t]))||t||'';
let mapCv,mapCtx;
function renderMap(){
  mapCv=document.getElementById('mapCv');mapCtx=mapCv.getContext('2d');
  if(MV.ready||MV.booting){if(MV.ready){mapLayersUI();setTimeout(mapSize,0)}return}MV.booting=true;
  const boot=()=>{
    const img=new Image(),ico=new Image();let n=0;const done=()=>{if(++n<2)return;MV.img=img;MV.ico=ico;try{const t=document.createElement('canvas');t.width=t.height=1;const x=t.getContext('2d');x.drawImage(img,0,0,8,8,0,0,1,1);const d=x.getImageData(0,0,1,1).data;MV.sea=`rgb(${d[0]},${d[1]},${d[2]})`;document.getElementById('mapStage').style.background=MV.sea}catch(_){}MV.ready=true;document.getElementById('mapLoad').hidden=true;mapSize();mapFit();if(MV.pending){const f=MV.pending;MV.pending=null;f()}};
    img.onload=ico.onload=done;img.onerror=ico.onerror=()=>{document.getElementById('mapLoad').textContent='โหลดภาพแผนที่ไม่สำเร็จ'};
    img.src='map.webp';ico.src='map-icons.webp';
    let saved=null;try{saved=JSON.parse(localStorage.getItem('aniimo-map-layers')||'null')}catch(_){}
    MAP.layers.forEach((l,i)=>{if(saved?saved.includes(l.id):l.on)MV.on.add(i)});
    MAP.count=MAP.layers.map(()=>0);MAP.m.forEach(m=>MAP.count[m[0]]++);
    mapLayersUI();
  };
  if(window.MAP)boot();else{const sc=document.createElement('script');sc.src='map.js?v=5e610bf3cd';sc.onload=boot;sc.onerror=()=>{document.getElementById('mapLoad').textContent='โหลดข้อมูลแผนที่ไม่สำเร็จ'};document.head.appendChild(sc)}
}
function mapSaveLayers(){try{localStorage.setItem('aniimo-map-layers',JSON.stringify([...MV.on].map(i=>MAP.layers[i].id)))}catch(_){}}
function mapLayersUI(){
  const cats=[];MAP.layers.forEach((l,i)=>{let c=cats.find(c=>c.n===l.c);if(!c)cats.push(c={n:l.c,th:l.cth,ls:[]});c.ls.push(i)});
  const ic=l=>`background-position:${-(l.ic*22)}px 0;background-size:${MAP.icons*22}px 22px`;
  document.getElementById('mapLayers').innerHTML=cats.map(c=>{const onN=c.ls.filter(i=>MV.on.has(i)).length;
    return `<details class="lcat"${onN?' open':''}><summary>${esc(c.th)} <small>${onN}/${c.ls.length}</small><button type="button" class="lall" data-mcat="${esc(c.n)}">${onN===c.ls.length?'ปิด':'เปิด'}ทั้งหมด</button></summary>
    ${c.ls.map(i=>{const l=MAP.layers[i];return `<label class="lrow"><input type="checkbox" data-mlayer="${i}"${MV.on.has(i)?' checked':''}><i style="${ic(l)}"></i>${esc(LANG==='th'?l.th:l.n)}<small>${MAP.count[i]}</small></label>`}).join('')}</details>`}).join('');
}
function mapSize(){const st=document.getElementById('mapStage');if(MV.ready){const b=contBounds(),w=st.clientWidth;st.style.height=Math.round(Math.max(380,Math.min(innerHeight*.8,w*(b.y1-b.y0)/(b.x1-b.x0))))+'px'}const r=mapCv.getBoundingClientRect(),d=window.devicePixelRatio||1;mapCv.width=Math.max(1,r.width*d|0);mapCv.height=Math.max(1,r.height*d|0);mapDraw()}
/* the view is cropped to the continent: land markers give its bounds (region outlines run out to the image frame over the sea) */
let CB=null;
function contBounds(){if(CB)return CB;let x0=1,y0=1,x1=0,y1=0;
  MAP.m.forEach(m=>{const x=m[1]/1e4,y=m[2]/1e4;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)});const p=.015;return CB={x0:x0-p,y0:y0-p,x1:x1+p,y1:y1+p}}
const fitScale=()=>{const b=contBounds();return Math.min(mapCv.clientWidth/(b.x1-b.x0),mapCv.clientHeight/(b.y1-b.y0))};
function mapFit(){const b=contBounds(),r=mapCv.getBoundingClientRect();MV.s=fitScale();MV.x=r.width/2-(b.x0+b.x1)/2*MV.s;MV.y=r.height/2-(b.y0+b.y1)/2*MV.s;mapDraw()}
const MINS=()=>fitScale(),MAXS=()=>fitScale()*12;
function mapClamp(){const b=contBounds(),W=mapCv.clientWidth,H=mapCv.clientHeight,s=MV.s;
  const cx=(lo,hi,size,off)=>{const a=off+lo*s,z=off+hi*s;if(z-a<=size)return size/2-(lo+hi)/2*s;return Math.min(-lo*s,Math.max(size-hi*s,off))};
  MV.x=cx(b.x0,b.x1,W,MV.x);MV.y=cx(b.y0,b.y1,H,MV.y)}
function mapZoom(f,cx,cy){const r=mapCv.getBoundingClientRect();if(cx==null){cx=r.width/2;cy=r.height/2}const ns=Math.max(MINS(),Math.min(MAXS(),MV.s*f));f=ns/MV.s;MV.x=cx-(cx-MV.x)*f;MV.y=cy-(cy-MV.y)*f;MV.s=ns;mapDraw()}
function mapCenter(x,y,s){const r=mapCv.getBoundingClientRect();if(s)MV.s=Math.max(MV.s,s);MV.x=r.width/2-x*MV.s;MV.y=r.height/2-y*MV.s;mapDraw()}
const mSmall=l=>l.c==='Collection'||l.c==='Materials';
function mapVisible(){const r=mapCv.getBoundingClientRect(),pad=20,out=[];
  for(const m of MAP.m){if(!MV.on.has(m[0]))continue;const x=MV.x+m[1]/1e4*MV.s,y=MV.y+m[2]/1e4*MV.s;if(x<-pad||y<-pad||x>r.width+pad||y>r.height+pad)continue;out.push([m,x,y])}return out}
let mapRaf=0;
function mapDraw(){if(MV.ready)mapClamp();if(mapRaf)return;mapRaf=requestAnimationFrame(()=>{mapRaf=0;mapPaint()})}
function mapPaint(){
  if(!MV.ready)return;const c=mapCtx,d=window.devicePixelRatio||1,W=mapCv.width/d,H=mapCv.height/d;
  c.setTransform(d,0,0,d,0,0);c.fillStyle=MV.sea||'#16324d';c.fillRect(0,0,W,H);
  c.imageSmoothingQuality='high';c.drawImage(MV.img,MV.x,MV.y,MV.s,MV.s);
  if(MV.reg){c.lineWidth=1.5;c.strokeStyle='rgba(255,255,255,.55)';c.setLineDash([5,4]);
    for(const [n,pts] of Object.entries(MAP.regions)){c.beginPath();if(MV.sel&&MV.sel.region===n){c.beginPath();pts.forEach(([x,y],i)=>{const X=MV.x+x/100*MV.s,Y=MV.y+y/100*MV.s;i?c.lineTo(X,Y):c.moveTo(X,Y)});c.closePath();c.fillStyle='rgba(98,195,250,.18)';c.fill();c.beginPath()}
      const edge=(a,b)=>(a[0]<.3&&b[0]<.3)||(a[0]>99.7&&b[0]>99.7)||(a[1]<.3&&b[1]<.3)||(a[1]>70.5&&b[1]>70.5);
      pts.concat([pts[0]]).forEach((q,i,arr)=>{const X=MV.x+q[0]/100*MV.s,Y=MV.y+q[1]/100*MV.s;if(i&&!edge(arr[i-1],q))c.lineTo(X,Y);else c.moveTo(X,Y)});c.stroke()}
    c.setLineDash([]);
    if(MV.s<Math.min(W,H)*4){c.font='600 13px Mitr, sans-serif';c.textAlign='center';c.textBaseline='middle';
      for(const [n,pts] of Object.entries(MAP.regions)){let sx=0,sy=0;pts.forEach(([x,y])=>{sx+=x;sy+=y});const X=MV.x+sx/pts.length/100*MV.s,Y=MV.y+sy/pts.length/100*MV.s;
        c.lineWidth=3.5;c.strokeStyle='rgba(8,24,40,.8)';c.strokeText(n,X,Y);c.fillStyle='#fff';c.fillText(n,X,Y)}}}
  const zoomed=MV.s>Math.min(W,H)*2.2,cell=MAP.cell;
  for(const [m,x,y] of mapVisible()){const l=MAP.layers[m[0]],sz=mSmall(l)&&!zoomed?14:22,sel=MV.sel&&MV.sel.m===m;
    c.beginPath();c.arc(x,y,sz/2+(sel?4:1.5),0,7);c.fillStyle=sel?'#F6C343':'rgba(10,28,46,.85)';c.fill();
    c.drawImage(MV.ico,l.ic*cell,0,cell,cell,x-sz/2,y-sz/2,sz,sz)}
  if(MV.hl)for(const m of MV.hl){const l=MAP.layers[m[0]],x=MV.x+m[1]/1e4*MV.s,y=MV.y+m[2]/1e4*MV.s;
    c.beginPath();c.arc(x,y,16,0,7);c.fillStyle='#F6C343';c.fill();c.lineWidth=2;c.strokeStyle='#0a1c2e';c.stroke();c.drawImage(MV.ico,l.ic*cell,0,cell,cell,x-12,y-12,24,24)}
}
function mapHit(px,py){let best=null,bd=18*18;for(const [m,x,y] of mapVisible().concat((MV.hl||[]).map(m=>[m,MV.x+m[1]/1e4*MV.s,MV.y+m[2]/1e4*MV.s]))){const d=(x-px)**2+(y-py)**2;if(d<bd){bd=d;best=m}}return best}
function inPoly(x,y,pts){let o=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)o=!o}return o}
const mRw=a=>(a||[]).map(([n,q])=>`<span class="chip">${esc(n)} ×${Number(q).toLocaleString()}</span>`).join('');
function mapShow(m){
  const box=document.getElementById('mapInfo'),o=MAP.info[m[3]],l=MAP.layers[m[0]];MV.sel={m};
  const sp=(o.k==='alpha'||o.k==='omega')&&speciesOf(o.t);
  const els=(lab,a)=>a&&a.length?`<div class="rw"><small class="muted">${lab}</small> ${a.map(e=>badge(mEl(e))||`<span class="chip">${esc(e)}</span>`).join('')}</div>`:'';
  box.innerHTML=`<button type="button" class="x" aria-label="ปิด" data-mapclose>×</button>
   ${sp?`<div class="who"><img src="${TH(sp.i)}" alt=""><div><h3>${esc(o.t)}</h3><span class="muted small">${esc(LANG==='th'?l.th:l.n)}${o.lv?` · Lv. ${o.lv[0]}–${o.lv[1]}`:''}</span></div></div>`:`<h3>${esc(mTr(o.t))}</h3><span class="muted small">${esc(LANG==='th'?l.th:l.n)}${o.lv?` · Lv. ${o.lv[0]}–${o.lv[1]}`:''}</span>`}
   ${o.d?`<p>${esc(mTr(o.d)).replace(/(Respawn|Refresh) interval:\s*(\d+)s/,'เกิดใหม่ทุก $2 วินาที')}</p>`:''}
   ${o.el?`<div class="rw"><small class="muted">ธาตุ</small> ${badge(mEl(o.el))}</div>`:''}${els('ธาตุที่ได้เปรียบ',o.rec)}${els('ไม่ควรใช้',o.bad)}
   ${o.ch?`<p>ผู้ท้าชิง ${o.ch} · หีบ ${o.cht||0} ใบ</p>`:''}
   ${o.first?`<div class="rw"><small class="muted">รางวัลเคลียร์ครั้งแรก</small> ${mRw(o.first)}</div>`:''}
   ${o.rw?`<div class="rw"><small class="muted">รางวัล${o.cost?` (ใช้ ${esc(o.cost[0])} ${o.cost[1]})`:''}</small> ${mRw(o.rw)}</div>`:''}
   ${(o.st||[]).map((st,i)=>`<div class="rw"><small class="muted">ด่าน ${i+1}${st.lv?` · แนะนำ Lv. ${st.lv}`:''}</small> ${st.rec.map(e=>badge(mEl(e))).join('')} ${mRw(st.rw)}</div>`).join('')}
   ${sp?`<div><button type="button" class="chip" data-open="${sp.slug}" style="cursor:pointer">ดูข้อมูล ${esc(sp.name)}</button></div>`:''}`;
  box.hidden=false;mapDraw();
}
function mapShowRegion(n){
  const box=document.getElementById('mapInfo'),lv=(MAP.rmeta[n]||{}).lv;MV.sel={region:n};
  const ms=A.filter(a=>(a.sp&&a.sp.r||[]).some(([r])=>r===n));
  box.innerHTML=`<button type="button" class="x" aria-label="ปิด" data-mapclose>×</button><h3>${esc(n)}</h3>${lv&&lv[0]?`<span class="muted small">Lv. ${lv[0]}–${lv[1]}</span>`:''}
   ${REGIONS[n]?`<p>${esc(tr(REGIONS[n]))}</p>`:''}
   <div class="rmons">${ms.slice(0,24).map(a=>`<button type="button" data-open="${a.slug}"><img src="${TH(a.i)}" alt="">${esc(a.name)}</button>`).join('')}</div>
   <div><button type="button" class="chip" data-region="${esc(n)}" style="cursor:pointer">ดูรายละเอียดภูมิภาค</button></div>`;
  box.hidden=false;mapDraw();
}
function mapFocusRegion(n){const pts=MAP.regions[n];if(!pts)return;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;pts.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)});
  const r=mapCv.getBoundingClientRect(),s=Math.min(r.width/((x1-x0)/100),r.height/((y1-y0)/100))*.85;MV.s=Math.max(MINS(),Math.min(MAXS(),s));mapCenter((x0+x1)/200,(y0+y1)/200);mapShowRegion(n)}
(()=>{
  const st=document.getElementById('mapStage'),pts=new Map();let moved=0,last=null,pinch=0;
  const cv=()=>document.getElementById('mapCv');
  st.addEventListener('pointerdown',e=>{if(e.target!==cv()||!MV.ready)return;cv().setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);moved=0;last=[e.clientX,e.clientY];if(pts.size===2){const [a,b]=[...pts.values()];pinch=Math.hypot(a[0]-b[0],a[1]-b[1])}cv().classList.add('drag')});
  st.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,[e.clientX,e.clientY]);
    if(pts.size===2){const [a,b]=[...pts.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),r=cv().getBoundingClientRect();if(pinch){mapZoom(d/pinch,(a[0]+b[0])/2-r.left,(a[1]+b[1])/2-r.top)}pinch=d;moved=99;return}
    const dx=e.clientX-last[0],dy=e.clientY-last[1];last=[e.clientX,e.clientY];moved+=Math.abs(dx)+Math.abs(dy);MV.x+=dx;MV.y+=dy;mapDraw()});
  const up=e=>{if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);if(pts.size<2)pinch=0;if(pts.size===1)last=[...pts.values()][0];if(pts.size)return;cv().classList.remove('drag');
    if(moved<6){const r=cv().getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top,m=mapHit(px,py);
      if(m)mapShow(m);else{const x=(px-MV.x)/MV.s*100,y=(py-MV.y)/MV.s*100,n=Object.keys(MAP.regions).find(n=>inPoly(x,y,MAP.regions[n]));if(n)mapShowRegion(n);else{MV.sel=null;document.getElementById('mapInfo').hidden=true;mapDraw()}}}};
  st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
  st.addEventListener('wheel',e=>{if(!MV.ready)return;e.preventDefault();const r=cv().getBoundingClientRect();mapZoom(Math.exp(-e.deltaY*(e.deltaMode?0.05:0.0018)),e.clientX-r.left,e.clientY-r.top)},{passive:false});
  document.getElementById('mapIn').addEventListener('click',()=>mapZoom(1.6));
  document.getElementById('mapOut').addEventListener('click',()=>mapZoom(1/1.6));
  document.getElementById('mapFit').addEventListener('click',()=>mapFit());
  window.addEventListener('resize',()=>{if(MV.ready&&current==='map')mapSize()});
  document.getElementById('mapLayers').addEventListener('change',e=>{const i=+e.target.dataset.mlayer;if(e.target.checked)MV.on.add(i);else MV.on.delete(i);mapSaveLayers();mapDraw();
    const d=e.target.closest('details'),sm=d.querySelector('summary small'),ids=[...d.querySelectorAll('[data-mlayer]')].map(x=>+x.dataset.mlayer),n=ids.filter(i=>MV.on.has(i)).length;sm.textContent=`${n}/${ids.length}`;d.querySelector('.lall').textContent=(n===ids.length?'ปิด':'เปิด')+'ทั้งหมด'});
  document.getElementById('mapLayers').addEventListener('click',e=>{const b=e.target.closest('[data-mcat]');if(!b)return;e.preventDefault();const ids=MAP.layers.map((l,i)=>l.c===b.dataset.mcat?i:-1).filter(i=>i>=0),all=ids.every(i=>MV.on.has(i));ids.forEach(i=>all?MV.on.delete(i):MV.on.add(i));mapSaveLayers();mapLayersUI();mapDraw()});
  document.getElementById('mapAll').addEventListener('click',()=>{MAP.layers.forEach((l,i)=>MV.on.add(i));mapSaveLayers();mapLayersUI();mapDraw()});
  document.getElementById('mapNone').addEventListener('click',()=>{MV.on.clear();mapSaveLayers();mapLayersUI();mapDraw()});
  document.getElementById('mapReg').addEventListener('click',e=>{MV.reg=!MV.reg;e.currentTarget.setAttribute('aria-pressed',MV.reg);mapDraw()});
  document.getElementById('mapQ').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase(),box=document.getElementById('mapRes');if(MV.hl&&!q){MV.hl=null;mapDraw()}if(!window.MAP||q.length<2){box.innerHTML='';return}
    const hits=[];Object.keys(MAP.regions).forEach(n=>{if(n.toLowerCase().includes(q))hits.push(`<button type="button" data-mapregion="${esc(n)}">${esc(n)}<small>ภูมิภาค</small></button>`)});
    const byName={};MAP.m.forEach((m,k)=>{const o=MAP.info[m[3]],l=MAP.layers[m[0]];const hay=(o.t+' '+mTr(o.t)+' '+l.n+' '+l.th).toLowerCase();if(hay.includes(q))(byName[o.t+'|'+m[0]]=byName[o.t+'|'+m[0]]||[]).push(k)});
    Object.entries(byName).slice(0,40).forEach(([key,ks])=>{const m=MAP.m[ks[0]],o=MAP.info[m[3]],l=MAP.layers[m[0]];hits.push(`<button type="button" data-mapm="${ks.join(',')}">${esc(mTr(o.t))}<small>${esc(LANG==='th'?l.th:l.n)}${ks.length>1?` · ${ks.length} จุด`:''}</small></button>`)});
    box.innerHTML=hits.join('')||'<p class="muted small">ไม่พบ</p>'});
  document.getElementById('mapRes').addEventListener('click',e=>{const b=e.target.closest('[data-mapm]');if(!b)return;const ks=b.dataset.mapm.split(',').map(Number),ms=ks.map(k=>MAP.m[k]);MV.hl=ms;
    const r=mapCv.getBoundingClientRect();if(ms.length===1){mapCenter(ms[0][1]/1e4,ms[0][2]/1e4,Math.min(r.width,r.height)*4);mapShow(ms[0])}
    else{let x0=1,y0=1,x1=0,y1=0;ms.forEach(m=>{x0=Math.min(x0,m[1]/1e4);y0=Math.min(y0,m[2]/1e4);x1=Math.max(x1,m[1]/1e4);y1=Math.max(y1,m[2]/1e4)});
      MV.s=Math.max(MINS(),Math.min(MAXS(),Math.min(r.width/Math.max(x1-x0,.05),r.height/Math.max(y1-y0,.05))*.8));mapCenter((x0+x1)/2,(y0+y1)/2);mapShow(ms[0])}});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-mapclose]')){MV.sel=null;document.getElementById('mapInfo').hidden=true;mapDraw();return}
    const b=e.target.closest('[data-mapregion]');if(!b)return;const n=b.dataset.mapregion;if(dlg.open)dlg.close();go('map');
    const f=()=>mapFocusRegion(n);if(MV.ready)f();else MV.pending=f});
})();

/* ===== regions ===== */
const regionId=n=>'region-'+n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function renderRegions(){
  const by={};A.forEach(a=>(a.sp&&a.sp.r||[]).forEach(([n,lv])=>{(by[n]=by[n]||[]).push({a,lv})}));
  const names=Object.keys(REGIONS).sort((x,y)=>{const mn=n=>Math.min(...(by[n]||[{lv:'99'}]).map(o=>parseInt(o.lv)||99));return mn(x)-mn(y)});
  document.getElementById('regionGrid').innerHTML=names.map(n=>{const ms=(by[n]||[]).sort((x,y)=>(parseInt(x.lv)||0)-(parseInt(y.lv)||0));const bs=BOSSES.filter(b=>b.region===n);
    return `<article class="rcard" id="${regionId(n)}"><h3>${esc(n)}</h3><div><button type="button" class="chip" data-mapregion="${esc(n)}" style="cursor:pointer">ดูบนแผนที่</button></div><p>${esc(tr(REGIONS[n]))}</p>
     <div class="rmons">${ms.map(({a,lv})=>`<button type="button" data-open="${a.slug}"><img decoding="async" loading="lazy" src="${TH(a.i)}" alt="">${esc(a.name)} <small>Lv. ${esc(lv)}</small></button>`).join('')}</div>
     ${bs.length?`<div class="rmons">${bs.map(b=>`<button type="button" data-boss="${b.slug}"><img decoding="async" loading="lazy" src="${bossImg(b)}" alt="">${esc(b.name)} <small>บอส</small></button>`).join('')}</div>`:''}</article>`}).join('');
}
document.getElementById('g-world').innerHTML=Object.keys(REGIONS).sort().map(n=>`<button type="button" class="region" data-region="${esc(n)}" style="cursor:pointer;text-align:left">${esc(n)}<small>ดู Aniimo ในพื้นที่</small></button>`).join('')+'<div class="region">เมืองลอยฟ้า<small>ศูนย์กลางผู้เล่น</small></div><div class="region">Lost Isles<small>Egg Heist</small></div>';

/* ===== team sharing ===== */
const SHARE_BASE=(location.protocol.startsWith('http')&&!/claude|anthropic/.test(location.hostname))?location.href.split('#')[0]:'https://claude.ai/artifact/1fs4HPXEF2Q35Y7VTSsnub';
const teamCode=()=>'team-'+team.map(m=>m?m.slug+(m.form!=null?'~'+m.form:''):'_').join('.');
function loadTeamCode(code){
  const parts=String(code).replace(/^.*#/,'').replace(/^team-/,'').split('.').slice(0,4);
  const t=parts.map(p=>{const [sl,fi]=p.split('~');const a=BY[sl];if(!a)return null;const f=fi!=null&&a.f[+fi]?+fi:null;return {slug:sl,form:f}});
  while(t.length<4)t.push(null);team=t;saveTeam();if(RENDERED.has('team'))renderTeam();
}
/* ===== share the team as a picture: 1080×1080 card with the four Aniimo, their elements, the team score and the
   site address, so a post in a group carries the site's name. Phones get the share sheet, computers a download. */
async function teamCard(){
  const ms=team.filter(Boolean);if(!ms.length)return null;
  const W=1080,c=document.createElement('canvas');c.width=c.height=W;const g=c.getContext('2d');
  const css=getComputedStyle(document.documentElement),col=k=>css.getPropertyValue('--'+k).trim()||'#888';
  const font=(w,px)=>`${w} ${px}px Mitr, "IBM Plex Sans Thai", "Noto Sans Thai", sans-serif`;
  try{await document.fonts.ready}catch(_){}
  const bg=g.createLinearGradient(0,0,W,W);bg.addColorStop(0,'#1c1440');bg.addColorStop(.6,'#2a2370');bg.addColorStop(1,'#10A7E6');g.fillStyle=bg;g.fillRect(0,0,W,W);
  g.fillStyle='rgba(255,255,255,.9)';for(let i=0;i<60;i++){const x=(i*397)%W,y=(i*211)%W,r=(i%3)+1;g.globalAlpha=.15+(i%5)/10;g.beginPath();g.arc(x,y,r,0,7);g.fill()}g.globalAlpha=1;
  g.fillStyle='#fff';g.font=font(700,64);g.fillText('ทีมของฉัน',70,130);
  const r=analyze(team);g.font=font(500,34);g.fillStyle='rgba(255,255,255,.85)';g.fillText(`คะแนนทีม ${r.score} / 100 · ${ROLES.filter(x=>r.roles[x]).join(' · ')}`,70,190);
  const load=src=>new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src});
  const cw=450,ch=330;
  for(let i=0;i<4;i++){
    const x=70+(i%2)*(cw+40),y=240+Math.floor(i/2)*(ch+40),m=team[i];
    g.fillStyle='rgba(255,255,255,.1)';g.beginPath();g.roundRect(x,y,cw,ch,32);g.fill();g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=2;g.stroke();
    if(!m){g.fillStyle='rgba(255,255,255,.4)';g.font=font(500,30);g.fillText('ว่าง',x+cw/2-30,y+ch/2+10);continue}
    const a=BY[m.slug],f=m.form!=null?a.f[m.form]:null,im=await load(f&&f.i?f.i:a.i);
    if(im){const s=Math.min(230/im.width,230/im.height);g.drawImage(im,x+(cw-im.width*s)/2,y+18,im.width*s,im.height*s)}
    g.fillStyle='#fff';g.font=font(700,36);const nm=(LANG==='en'?a.name:(a.th||a.name))+(f?' · '+f.n:'');g.fillText(nm.length>18?nm.slice(0,17)+'…':nm,x+28,y+ch-50);
    let ex=x+28;g.font=font(500,24);memEls(m).forEach(k=>{const t=EK[k].th,w=g.measureText(t).width+34;g.fillStyle=col(k);g.beginPath();g.roundRect(ex,y+ch-36,w,30,15);g.fill();g.fillStyle='#fff';g.fillText(t,ex+17,y+ch-13);ex+=w+8});
  }
  g.fillStyle='#fff';g.font=font(700,40);g.fillText('aniiguide.trade',70,W-58);
  g.font=font(400,26);g.fillStyle='rgba(255,255,255,.8)';const t='คู่มือ Aniimo ภาษาไทย · จัดทีม Combo';g.fillText(t,W-70-g.measureText(t).width,W-62);
  return new Promise(res=>c.toBlob(res,'image/png'));
}
document.getElementById('tmShot').addEventListener('click',async()=>{
  if(!team.some(Boolean)){tmMsg('ยังไม่มีสมาชิกในทีม');return}
  tmMsg('กำลังทำรูป…');
  const blob=await teamCard();if(!blob){tmMsg('ทำรูปไม่สำเร็จ');return}
  const file=new File([blob],'aniiguide-team.png',{type:'image/png'}),url=SHARE_BASE+'#'+teamCode();
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'ทีม Aniimo ของฉัน',text:'จัดทีมที่ '+url});tmMsg('');return}}catch(e){if(e&&e.name==='AbortError'){tmMsg('');return}}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='aniiguide-team.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  tmMsg('บันทึกรูปแล้ว เอาไปโพสต์ได้เลย');
});
/* ===== support page: the PromptPay QR shows only once the owner adds img/donate-qr.* (build.py puts its path in META.donate) ===== */
{const q=window.META&&META.donate;if(q){document.getElementById('supQr').hidden=false;document.getElementById('supQrImg').src=q}}
document.getElementById('supShare').addEventListener('click',async()=>{
  const url='https://aniiguide.trade/';
  try{if(navigator.share){await navigator.share({title:'AniiGuide คู่มือเกม Aniimo ภาษาไทย',url});return}}catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(url);toast('คัดลอกลิงก์แล้ว วางแชร์ได้เลย')}catch(_){toast(url)}
});
setTimeout(()=>{const v=document.getElementById('privVisitor');if(v)v.textContent=VISITOR||'—'}); // VISITOR is declared further down
document.getElementById('tmLink').addEventListener('click',()=>{
  if(!team.some(Boolean)){tmMsg('ยังไม่มีสมาชิกในทีม');return}
  const url=SHARE_BASE+'#'+teamCode();
  try{navigator.clipboard.writeText(url).then(()=>tmMsg('คัดลอกลิงก์แล้ว'),()=>tmMsg(url))}catch(_){tmMsg(url)}
});
document.getElementById('tmCodeBtn').addEventListener('click',()=>{const b=document.getElementById('tmCodeBox');b.hidden=!b.hidden;if(!b.hidden)document.getElementById('tmCode').value=teamCode()});
document.getElementById('tmCodeGo').addEventListener('click',()=>{const v=document.getElementById('tmCode').value.trim();if(!/team-/.test(v)){tmMsg('โค้ดทีมต้องขึ้นต้นด้วย team-');return}loadTeamCode(v);renderTeam();tmMsg('โหลดทีมแล้ว')});

/* ===== language ===== */
const langBtn=document.getElementById('langBtn');
const syncLang=()=>{langBtn.textContent=LANG==='th'?'EN':'ไทย';langBtn.setAttribute('aria-label',LANG==='th'?'Switch to English':'เปลี่ยนเป็นภาษาไทย');document.documentElement.lang=LANG};
langBtn.addEventListener('click',()=>{const next=LANG==='th'?'en':'th';try{localStorage.setItem('aniimo-lang',next)}catch(_){}location.reload()});
syncLang();

/* ===== beginner checklists (this browser; synced when a sync code is set) ===== */
let GC={};try{GC=JSON.parse(localStorage.getItem('aniimo-guide-checks')||'{}')}catch(_){}
function applyGuideChecks(){
  document.querySelectorAll('.checklist[data-list]').forEach(list=>{const id=list.dataset.list;
    list.querySelectorAll('li').forEach((li,i)=>{const cb=li.querySelector('input[type=checkbox]');if(!cb)return;const key=id+':'+i;cb.id='chk-'+id+'-'+i;cb.dataset.gc=key;cb.checked=!!GC[key];li.classList.toggle('done',cb.checked)})});
}
applyGuideChecks();
document.addEventListener('change',e=>{const cb=e.target.closest('[data-gc]');if(!cb)return;const key=cb.dataset.gc;if(cb.checked)GC[key]=1;else delete GC[key];cb.closest('li').classList.toggle('done',cb.checked);
  try{localStorage.setItem('aniimo-guide-checks',JSON.stringify(GC))}catch(_){}if(typeof syncPush==='function')syncPush()});

/* ===== items ===== */
const ITEMS=(window.ITEMS&&window.ITEMS.list)||[];const ISPR=window.ITEMS||{cols:10,rows:1};
const ITEM_BY_NAME=Object.fromEntries(ITEMS.map(i=>[i.n.toLowerCase(),i]));
const CAT_TH={'Evolution Material':'วัสดุวิวัฒนาการ','Held Item':'Held Item','Aniipod':'Aniipod','Currency':'สกุลเงิน / ของแลก','Training':'ฝึก Aniimo','EXP':'EXP','Materials':'วัสดุ','Quest Item':'ไอเท็มเควสต์','Mutation Mark':'Mutation Mark','Skill Material':'วัสดุสกิล','Resonance Material':'วัสดุ Resonance','Heal':'ฟื้นฟู','Trait Item':'ไอเท็ม Trait','Fruit':'ผลไม้','Rare Item':'ไอเท็มหายาก','Home materials':'วัสดุบ้าน','Change Form':'เปลี่ยนร่าง','Furniture':'สิ่งก่อสร้างบัฟในบ้าน'};
const Q_TH={Common:'ทั่วไป',Uncommon:'ไม่ธรรมดา',Rare:'Rare',Epic:'Epic',Legendary:'Legendary',Prismatic:'Prismatic'};
const SRC_TH={'Defeat Alphas':'ชนะบอส Alpha','Defeat Omega':'ชนะบอส Omega','Chest':'หีบสมบัติ','Mysterious Vendor':'Mysterious Vendor (ร้านสุ่มรายวัน)','Pawprint Shop':'Pawprint Shop','Elite Training':'Elite Training','Furniture Store':'ร้านเฟอร์นิเจอร์','Outpost vendor':'ร้านค้า Outpost','Shop':'ร้านค้า','Companion Handbook':'Companion Handbook','Premium Custom Pack':'แพ็กเติมเงิน (Premium Custom Pack)','Upgrade Level':'รางวัลเลื่อนเลเวล','Stamp Rush Shop':'Stamp Rush Shop','Badge Shop':'Badge Shop','Credit Shop':'ร้าน Credit','Complete Quests':'ทำเควสต์','Breezy Plains Branch':'Branch ใน Breezy Plains','Whisperwake Isles Branch':'Branch ใน Whisperwake Isles','Repeat clears in 1 place':'เคลียร์ดินแดนซ้ำ (1 แห่ง)','Repeat clears in 7 Territories':'เคลียร์ดินแดนซ้ำ (7 แห่ง)','Holo-Battle Sim':'Holo-Battle Sim','Shop · Glimmer':'ร้านค้า (จ่าย Glimmer)','Shop · Companion Handbook':'ร้าน Companion Handbook','Purchase at Super Claw':'ซื้อที่ Super Claw','Home Production':'ผลิตในบ้าน','Super Claw':'Super Claw','Holo-Shop':'Holo-Shop','Courses':'Courses (Elite Training)','View Catch Completion Progress':'รางวัลความคืบหน้าการจับ','Pathfinder Challenge':'Pathfinder Challenge','Glimmer Purchase':'ซื้อด้วย Glimmer','Item Exchange':'แลกไอเท็ม','Daily Activity Quests':'ภารกิจ Daily Activity','Weekly Nurturing Delivery':'แพ็ก Weekly Nurturing Delivery','Sanctum Clear':'เคลียร์ Sanctum','Open Omega chest':'เปิดหีบ Omega (Primegy 50)','Open Alpha chest':'เปิดหีบ Alpha','Holo-Battle Interlink':'Holo-Battle Interlink','Purchase at Aniimart':'ซื้อที่ Aniimart','Coilstrike Club':'Coilstrike Club','Champion’s Gift':'แพ็ก Champion’s Gift','Pick up':'เก็บจากพื้น','Weekly Value Supplies':'แพ็ก Weekly Value Supplies','Aniimo Catches Report':'รายงานการจับ Aniimo','Home Shop':'ร้านในบ้าน','Weekly Sparkling':'แพ็ก Weekly Sparkling','Produce Aniipods in Homeland':'ผลิต Aniipod ในบ้าน','Produce EXP items in Home':'ผลิตไอเท็ม EXP ในบ้าน','Aniimo dispatch':'ส่ง Aniimo ออกสำรวจ','Lumin Energy':'Lumin Energy','Sanctum':'Sanctum','Report Alpha Aniimo':'รายงาน Alpha Aniimo','Stump':'ตอไม้','World Exploration - Dirt Mound':'กองดินในโลก','Go to Shop':'ร้านค้าในเกม','Shop · Item':'ร้านค้า (จ่าย Lumin Crystal)','Adventure Pack':'แพ็ก Adventure Pack','Season Keepsakes':'แพ็ก Season Keepsakes','Release Aniimo':'ปล่อย Aniimo','Clay Pot':'ไหดินเผา','Aniilog Level':'เลเวล Aniilog','Nurture':'Nurture','Stamp Rush':'Stamp Rush','Season Achievement':'ความสำเร็จของซีซัน','Catch New Aniimo':'จับ Aniimo ชนิดใหม่','Obtain Lumin Amber':'เก็บ Lumin Amber','Egg':'ไข่','Holo-Battle Sim Rewards':'รางวัล Holo-Battle Sim','Operation: Egg Heist Shop':'ร้าน Operation: Egg Heist','Operation: Egg Heist':'Operation: Egg Heist','Lumin Amber':'Lumin Amber','Weekly Nurturing':'แพ็ก Weekly Nurturing','Dig':'ขุด','Legendary Journey Shop':'ร้าน Legendary Journey','Shop Purchase':'ซื้อในร้าน','Legendary Journey Event':'อีเวนต์ Legendary Journey','Defeat Aniimo in the Lost Sanctum':'ชนะ Aniimo ใน Lost Sanctum','Main Story':'เนื้อเรื่องหลัก','Journey Quests':'เควสต์ Journey','Alpha First Clear':'ชนะ Alpha ครั้งแรก','Elite Pathfinder Challenge':'Elite Pathfinder Challenge','Silver Badges':'Silver Badge','RV Level Up':'อัปเลเวล RV','Home Tilling Chest':'หีบจากการไถดินในบ้าน','Home Index':'ดัชนีบ้าน','Events':'อีเวนต์','Departure Gift':'แพ็ก Departure Gift','Helmut’s Gift':'ของขวัญจาก Helmut','Helmut’s Gift of Thanks':'ของขวัญขอบคุณจาก Helmut','Rookey’s Gift of Thanks':'ของขวัญขอบคุณจาก Rookey','Release Inferlupa':'ปล่อย Inferlupa','Defeat Flameruff: Elite':'ชนะ Flameruff: Elite','Shell':'เปลือกหอย'};
const srcLabel=d=>{if(SRC_TH[d])return SRC_TH[d];const m=d.match(/^Craft: (.+)$/);if(m)return 'สร้าง: '+m[1];return d.replace(/ ↗ —$/,'')};
function itemIcon(it,big){if(it.ix<0)return it.img?`<span class="iicon q-${it.q}" style="background:url(${it.img}) center/contain no-repeat"></span>`:`<span class="iicon q-${it.q}"></span>`;const c=it.ix%ISPR.cols,r=Math.floor(it.ix/ISPR.cols);return `<span class="iicon q-${it.q}" style="background-image:url(items.webp);background-size:${ISPR.cols*100}% ${ISPR.rows*100}%;background-position:${c/(ISPR.cols-1)*100}% ${ISPR.rows>1?r/(ISPR.rows-1)*100:0}%"></span>`}
const itemRef=n=>{const it=ITEM_BY_NAME[String(n).toLowerCase()];return it?`<button type="button" class="itemlink" data-item="${esc(n)}">${itemIcon(it)}${esc(n)}</button>`:esc(n)}; // icon + name everywhere an item is mentioned
const ic=document.getElementById('ic'),iq=document.getElementById('iq'),iqq=document.getElementById('iqq');
ic.innerHTML+=[...new Set(ITEMS.map(i=>i.c))].sort((a,b)=>(CAT_TH[a]||a).localeCompare(CAT_TH[b]||b,'th')).map(c=>`<option value="${esc(c)}">${esc(CAT_TH[c]||c)}</option>`).join('');
function itemCard(i,hit,extra){return `<article class="icard${hit?' hit':''}" id="item-${esc(i.slug)}">
    <div class="top">${itemIcon(i)}<div><b>${esc(i.n)}</b><small>${esc(CAT_TH[i.c]||i.c)} · ${esc(Q_TH[i.q]||i.q)}</small></div></div>
    ${i.d?`<p>${esc(tr(i.d))}</p>`:''}
    ${i.src.length?`<div><p class="eyebrow" style="margin-bottom:6px">วิธีหา</p><ul class="srcs">${i.src.map(([k,d,cost,where,note])=>`<li><span>${esc(srcLabel(d||k))}</span>${cost.length?`<span class="cost">— ${cost.map(([a,n])=>`${esc(a)} ${itemRef(n)}`).join(', ')}</span>`:''}${where&&where!==d?`<span class="cost">· ${esc(where.replace(/^.*? · /,''))}</span>`:''}${note?`<span class="cost">· ${esc(tr(note))}</span>`:''}</li>`).join('')}</ul></div>`:'<p class="small muted">ยังไม่มีข้อมูลแหล่งที่มา</p>'}
    ${extra||''}
    <a class="small" href="https://aniidex.com/items/${esc(i.slug)}/" target="_blank" rel="noopener">ดูแผนที่จุดขายบน AniiDex ↗</a></article>`}
function renderItems(focus){
  const q=iq.value.trim().toLowerCase();
  const iall=document.getElementById('iall');const list=ITEMS.filter(i=>(!q||i.n.toLowerCase().includes(q))&&(!ic.value||i.c===ic.value)&&(!iqq.value||i.q===iqq.value)&&(iall.value==='all'||i.f||q||focus));
  document.getElementById('iCount').textContent=`${list.length} จาก ${ITEMS.length} ไอเท็ม`;
  document.getElementById('iGrid').innerHTML=list.map(i=>itemCard(i,focus&&i.n===focus)).join('')||'<p class="muted">ไม่พบไอเท็ม ลองล้างตัวกรอง</p>';
  if(focus){const el=document.querySelector('.icard.hit');el&&setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'center'}),40)}
}
[iq,ic,iqq,document.getElementById('iall')].forEach(el=>el.addEventListener(el.type==='search'?'input':'change',()=>renderItems()));
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-item]');if(!b)return;
  e.preventDefault();const name=b.dataset.item;if(dlg.open)dlg.close();histAdd('items',name);track('item',name);
  go('items');iq.value='';ic.value='';iqq.value='';renderItems(ITEM_BY_NAME[name.toLowerCase()]?ITEM_BY_NAME[name.toLowerCase()].n:null);
});

/* ===== events ===== */
const EVENTS=window.EVENTS||[];const UPCOMING=window.UPCOMING||[];
let evKind='event';
const scrapedAt=META.scraped?new Date(META.scraped+'T12:00:00Z'):null;
function approxDate(rel){
  if(!scrapedAt||!rel)return '';const d=(rel.match(/(\d+)d/)||[0,0])[1]*1,h=(rel.match(/(\d+)h/)||[0,0])[1]*1,m=(rel.match(/(\d+)m/)||[0,0])[1]*1;
  const t=new Date(scrapedAt.getTime()+((d*24+h)*60+m)*60000);return t.toLocaleDateString(LOC,{day:'numeric',month:'short'});
}
const EV_KIND_TH={event:'อีเวนต์',gameplay:'โหมดกิจกรรม',upcoming:'กำลังจะมา',ended:'จบแล้ว'};
document.getElementById('evSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;evKind=b.dataset.k;document.querySelectorAll('#evSeg button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderEvents()});

/* ===== server time (Asia-Pacific) =====
   AniiDex pages are fetched from the Europe view; event dates are the same calendar days on every
   server, but each server switches at 04:00 of its own time zone. Asia-Pacific is UTC+8 → 03:00 in Thailand. */
const SRV={name:'Asia-Pacific',tz:8,reset:4};
const MON={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Sept:8,Oct:9,Nov:10,Dec:11};
const SCRAPED_TS=META.scraped_at?Date.parse(META.scraped_at):(META.scraped?Date.parse(META.scraped+'T12:00:00Z'):Date.now());
const srvResetAt=(y,m,d)=>Date.UTC(y,m,d,SRV.reset-SRV.tz);
function parseDay(s){
  const m=String(s).trim().match(/(\d+)\s+([A-Za-z]+)/);if(!m||MON[m[2]]==null)return null;
  const ref=new Date(SCRAPED_TS);let y=ref.getUTCFullYear();const M=MON[m[2]];
  if(M<ref.getUTCMonth()-6)y++;if(M>ref.getUTCMonth()+6)y--;return srvResetAt(y,M,+m[1]);
}
const parseRange=r=>{const p=String(r).split('–');return [parseDay(p[0]),parseDay(p[1])]};
const relMs=rel=>{const g=k=>+((String(rel).match(new RegExp('(\\d+)'+k))||[0,0])[1]);return ((g('d')*24+g('h'))*60+g('m'))*60000};
function euRelToAsia(rel){const euAt=SCRAPED_TS+relMs(rel);const d=new Date(euAt-4*3600000);return srvResetAt(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())}
const thTime=ts=>new Date(ts).toLocaleString(LOC,{timeZone:'Asia/Bangkok',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+(LOC==='en-GB'?'':' น.');
function fmtLeft(ms){const en=LOC==='en-GB';if(ms<=0)return en?'now':'ตอนนี้';const m=Math.floor(ms/60000),d=Math.floor(m/1440),h=Math.floor(m%1440/60),mi=m%60;return en?(d?`${d}d ${h}h`:h?`${h}h ${mi}m`:`${mi}m`):(d?`${d} วัน ${h} ชม.`:h?`${h} ชม. ${mi} นาที`:`${mi} นาที`)}
function nextDailyReset(now){const d=new Date(now+SRV.tz*3600000);let t=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),SRV.reset)-SRV.tz*3600000;if(t<=now)t+=86400000;return t}
function nextHatchHaste(now){ // Friday 04:00 → Monday 04:00, server time
  const d=new Date(now+SRV.tz*3600000);const dow=d.getUTCDay();
  const fri=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-((dow+2)%7),SRV.reset)-SRV.tz*3600000;
  const end=fri+3*86400000;if(now<end&&now>=fri)return {live:true,start:fri,end};return {live:false,start:fri+7*86400000,end:end+7*86400000};
}
function nextInterlink(now){ // Holo-Battle Interlink: Thursday 04:00 → Monday 04:00, server time
  const d=new Date(now+SRV.tz*3600000);const dow=d.getUTCDay();
  const thu=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-((dow+3)%7),SRV.reset)-SRV.tz*3600000;
  const end=thu+4*86400000;if(now<end&&now>=thu)return {live:true,start:thu,end};return {live:false,start:thu+7*86400000,end:end+7*86400000};
}
function eventWindow(e,now){
  if(e.dates&&e.dates.length){
    const runs=e.dates.map(x=>{const [s,t]=parseRange(x.dates);return {name:x.name,s,t}}).filter(r=>r.s&&r.t);
    const cur=runs.find(r=>now>=r.s&&now<r.t),next=runs.find(r=>r.s>now);
    if(cur)return {state:'live',start:cur.s,end:cur.t,run:cur.name,next};
    if(next)return {state:'upcoming',start:next.s,end:next.t,run:next.name};
    const last=runs[runs.length-1];if(last)return {state:'ended',start:last.s,end:last.t,run:last.name};
  }
  if(e.starts){const s=euRelToAsia(e.starts);const up=UPCOMING.find(u=>u.name===e.t);const t=up?parseRange(up.dates)[1]:null;return {state:now<s?'upcoming':(t&&now>=t?'ended':'live'),start:s,end:t}}
  if(e.ends){const t=euRelToAsia(e.ends);return {state:now<t?'live':'ended',end:t}}
  return {state:e.kind==='ended'?'ended':'always'};
}

/* ===== events (replaces the Europe-time version) ===== */
function renderEvents(){
  try{renderEvCal()}catch(_){}
  const now=Date.now();
  const rs=nextDailyReset(now),hh=nextHatchHaste(now),hi=nextInterlink(now);
  document.getElementById('evNote').innerHTML=`อ้างอิงเซิร์ฟเวอร์ <b>${SRV.name}</b> (UTC+8) · อีเวนต์เปลี่ยนตอนรีเซ็ต 04:00 เวลาเซิร์ฟเวอร์ = <b>03:00 น. เวลาไทย</b> · ข้อมูล ณ ${esc(META.scraped||'')} ควรเช็กในเกมอีกครั้ง`;
  const strip=`<div class="evstrip"><div class="chip">รีเซ็ตรายวันถัดไป <b>${thTime(rs)}</b> · อีก ${fmtLeft(rs-now)}</div><div class="chip">Hatch Haste ${hh.live?`<b style="color:var(--good)">กำลังจัด</b> ถึง ${thTime(hh.end)}`:`รอบถัดไป <b>${thTime(hh.start)}</b> (อีก ${fmtLeft(hh.start-now)})`}</div><div class="chip">Holo-Battle Interlink ${hi.live?`<b style="color:var(--good)">เปิดอยู่</b> ถึง ${thTime(hi.end)}`:`เปิดรอบถัดไป <b>${thTime(hi.start)}</b> (อีก ${fmtLeft(hi.start-now)})`}</div><div class="chip">Mysterious Vendor เติมของ ${thTime(rs)}</div></div>`;
  const rows=EVENTS.map(e=>({e,w:eventWindow(e,now)}));
  const want={event:r=>r.e.kind!=='gameplay'&&r.w.state==='live'||(r.e.kind==='event'&&r.w.state==='always'),upcoming:r=>r.w.state==='upcoming',gameplay:r=>r.e.kind==='gameplay'&&r.w.state!=='ended'&&r.w.state!=='upcoming',ended:r=>r.w.state==='ended'}[evKind];
  const list=rows.filter(want).sort((a,b)=>(a.w.end||9e15)-(b.w.end||9e15));
  document.getElementById('evGrid').innerHTML=strip+list.map(({e,w})=>`<article class="ecard">
    <div class="when">${EV_KIND_TH[e.kind]||''}${w.state==='live'&&w.end?` · <span class="live">จบ ${thTime(w.end)} (อีก ${fmtLeft(w.end-now)})</span>`:''}${w.state==='upcoming'?` · เริ่ม ${thTime(w.start)} (อีก ${fmtLeft(w.start-now)})`:''}${w.state==='ended'&&w.end?` · จบแล้ว ${thTime(w.end)}`:''}</div>
    <h4>${esc(e.t)}${(w.run||e.run)&&(w.run||e.run)!==e.t?`<br><small class="muted" style="font-family:var(--body);font-size:.8rem">${esc(w.run||e.run)}</small>`:''}</h4>
    ${e.d?`<p>${esc(tr(e.d))}</p>`:''}
    ${e.rw.length?`<div style="display:flex;gap:5px;flex-wrap:wrap">${e.rw.map(([n,name])=>`<span class="chip">${itemRef(name)} ×${esc(n)}</span>`).join('')}</div>`:''}
    ${e.rules.length?`<details><summary>กติกา (${e.rules.length} ข้อ)</summary><ol>${e.rules.map(r=>`<li>${esc(tr(r).replace(/^\d+\.\s*/,''))}</li>`).join('')}</ol></details>`:''}
    ${e.dates&&e.dates.length?`<details><summary>รอบของอีเวนต์ (เวลาไทย)</summary><ul style="margin:6px 0 0;padding-left:1.1em">${e.dates.map(x=>{const [s,t]=parseRange(x.dates);const st=now>=t?'จบแล้ว':now>=s?'<b style="color:var(--good)">กำลังจัด</b>':'รอบถัดไป';return `<li>${esc(x.name)} · ${s?thTime(s):''} – ${t?thTime(t):''} · ${st}</li>`}).join('')}</ul></details>`:''}
    <a class="small" href="https://aniidex.com/events/${esc(e.slug)}/" target="_blank" rel="noopener">รายละเอียดบน AniiDex ↗</a></article>`).join('')+(list.length?'':'<p class="muted">ไม่มีรายการในหมวดนี้</p>');
  // timeline = scraped upcoming list + every scheduled run in the event data + editorial dates (content.js), not yet ended
  const seen=new Set(),up=[];
  const add=(name,dates,at)=>{const [s0,t]=parseRange(dates);const s=at?Date.parse(at):s0;const key=name+'|'+dates;if(!s||seen.has(key)||(t&&now>=t))return;seen.add(key);up.push({name,s,t})};
  UPCOMING.forEach(u=>add(u.name,u.dates));
  EVENTS.forEach(e=>(e.dates||[]).forEach(x=>add(x.name==='Stage'?e.t:x.name,x.dates)));
  (window.UPCOMING_EXTRA||[]).forEach(u=>add(u.name,u.dates,u.at));
  up.sort((a,b)=>a.s-b.s);
  document.getElementById('evTimeline').innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px"><button type="button" class="btn" data-ics="interlink">📅 เตือน Holo-Battle Interlink ทุกสัปดาห์</button><button type="button" class="btn" data-ics="haste">📅 เตือน Hatch Haste ทุกศุกร์</button></div>`+up.map(({name,s,t})=>`<div class="tl"><b>${thTime(s)}</b><span>${esc(name)} · ถึง ${t?thTime(t):'—'} · ${now>=s?'<b style="color:var(--good)">กำลังจัด</b>':'อีก '+fmtLeft(s-now)}${now<s?` <button type="button" class="itemlink small" data-ics-ev="${esc(name)}|${s}|${t||s+3600e3}">เพิ่มลงปฏิทิน</button>`:''}</span></div>`).join('')||'<p class="muted">ไม่มีข้อมูลตาราง</p>';
}
setInterval(()=>{if(current==='events'&&!document.hidden)renderEvents()},60000);

/* ===== territories & boss rush ===== */
const TERR=window.TERR||[],RUSH=window.RUSH||[];
const speciesOf=name=>A.find(a=>name&&name.split(' ').includes(a.en));
const RUSH_TH={Melee:'ระยะประชิด',Ranged:'ระยะไกล','Basic Attack Damage':'ดาเมจโจมตีปกติ','Sustained Skill':'สกิลต่อเนื่อง','Shield Break':'ทำลายโล่','High-Frequency Damage':'ดาเมจถี่','P.DMG':'ดาเมจกายภาพ','M.DMG':'ดาเมจเวท','Fire Debuff':'ดีบัฟไฟ','Water Debuff':'ดีบัฟน้ำ','Ice Debuff':'ดีบัฟน้ำแข็ง','Lightning Debuff':'ดีบัฟสายฟ้า','Earth Debuff':'ดีบัฟดิน',Fly:'บิน',Tunnel:'มุดดิน',Pound:'ทุบ',Rock:'หิน','Magical Damage':'ดาเมจเวท'};
const rushTh=s=>String(s).split(' · ').map(x=>RUSH_TH[x.trim()]||x).join(' · ');
function renderSystems(){
  document.getElementById('terrGrid').innerHTML=TERR.map(t=>{const sp=speciesOf(t.name);return `<button type="button" class="bcard" data-terr="${esc(t.slug)}"><img decoding="async" loading="lazy" src="${sp?TH(sp.i):''}" alt=""><span><b>${esc(t.name)}</b><small>Lv. ${t.level} · ${esc(t.players||'1–4')} คน</small><span class="row">${badge(t.element)}</span><span class="row">แพ้ ${t.weak.map(badge).join('')}</span></span></button>`}).join('')||'<p class="muted">ไม่มีข้อมูล</p>';
  document.getElementById('rushGrid').innerHTML=RUSH.map(r=>{const sp=speciesOf(r.name);return `<button type="button" class="bcard" data-rush="${esc(r.slug)}"><img decoding="async" loading="lazy" src="${sp?TH(sp.i):''}" alt=""><span><b>${esc(r.name)}</b><small>Lv. ${r.level} · ${esc(rushTh(r.variants[0]||''))}</small><span class="row">${badge(r.element)} ${r.favoured?`<span class="chip">ได้เปรียบ: ${esc(rushTh(r.favoured))}</span>`:''}</span><span class="row">แพ้ ${r.weak.map(badge).join('')}</span></span></button>`}).join('')||'<p class="muted">ไม่มีข้อมูล</p>';
}
function counterList(el,weak){
  return bossCounters({el,weak:weak||[]}).map(({a,why})=>`<div class="sug" style="grid-template-columns:48px 1fr"><img src="${TH(a.i)}" alt="" style="width:48px;height:48px"><div><button type="button" data-open="${a.slug}" style="border:0;background:none;padding:0;cursor:pointer;text-align:left;color:var(--ink)"><b>${esc(a.name)}</b></button><small>${a.e.map(k=>EK[k].th).join('/')} · ${a.r}</small><small>${esc(why.join(' · '))}</small></div></div>`).join('');
}
const rewardChips=list=>list.map(x=>{const m=String(x).match(/^(.*?) ×(.+)$/);return `<span class="chip">${m?itemRef(m[1])+' ×'+esc(m[2]):esc(x)}</span>`}).join('');
function openTerr(slug){
  const t=TERR.find(x=>x.slug===slug);if(!t)return;const sp=speciesOf(t.name);dState={boss:slug,tab:'overview'};
  dlgBody.innerHTML=`<div class="dlg"><div class="hero-pic">${sp?`<img src="${sp.i}" alt="">`:''}<span class="fname">Territory · Lv. ${t.level}</span></div><div class="body">
    <div><p class="eyebrow">ดันเจี้ยน · ${esc(t.players||'1–4')} คน</p><h3 id="dlgTitle">${esc(t.name)}</h3></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${badge(t.element)}<span class="chip">เลเวลคงที่ ${t.level}</span></div>
    <p>${esc(tr(t.desc))}</p>
    <div class="small"><b>จุดอ่อน:</b> ${t.weak.map(badge).join(' ')||'—'}<br><b>ต้านได้:</b> ${t.strong.map(badge).join(' ')||'—'}</div>
    <div><p class="eyebrow" style="margin-bottom:8px">Aniimo ที่แนะนำ</p><div class="sugs">${counterList(t.element,t.weak)}</div></div>
    <div><p class="eyebrow" style="margin-bottom:8px">รางวัลเคลียร์ซ้ำ</p><div style="display:flex;gap:6px;flex-wrap:wrap">${rewardChips(t.repeat)}</div></div>
    ${t.helper.length?`<div><p class="eyebrow" style="margin-bottom:8px">รางวัลผู้ช่วย</p><div style="display:flex;gap:6px;flex-wrap:wrap">${rewardChips(t.helper)}</div></div>`:''}
    ${t.rare.length?`<div><p class="eyebrow" style="margin-bottom:8px">รางวัลหายาก (โอกาส ${t.rare_chance}%)</p><div style="display:flex;gap:6px;flex-wrap:wrap">${rewardChips(t.rare)}</div></div>`:''}
    <a class="small" href="https://aniidex.com/bosses/${esc(t.slug)}/" target="_blank" rel="noopener">ดูบน AniiDex ↗</a></div></div>`;
  if(!dlg.open)dlg.showModal();
}
function openRush(slug){
  const r=RUSH.find(x=>x.slug===slug);if(!r)return;const sp=speciesOf(r.name);dState={boss:slug,tab:'overview'};
  dlgBody.innerHTML=`<div class="dlg"><div class="hero-pic">${sp?`<img src="${sp.i}" alt="">`:''}<span class="fname">Boss Rush · Lv. ${r.level}</span></div><div class="body">
    <div><p class="eyebrow">Boss Rush</p><h3 id="dlgTitle">${esc(r.name)}</h3></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${badge(r.element)}${r.favoured?`<span class="chip">ได้เปรียบ: ${esc(rushTh(r.favoured))}</span>`:''}${r.less?`<span class="chip">เสียเปรียบ: ${esc(rushTh(r.less))}</span>`:''}</div>
    ${r.variants.length?`<div><p class="eyebrow" style="margin-bottom:8px">รูปแบบด่านในแต่ละรอบ</p><div style="display:flex;gap:6px;flex-wrap:wrap">${r.variants.map(v=>`<span class="chip">${esc(rushTh(v))}</span>`).join('')}</div></div>`:''}
    <div class="small"><b>จุดอ่อน:</b> ${r.weak.map(badge).join(' ')||'—'}<br><b>ต้านได้:</b> ${r.strong.map(badge).join(' ')||'—'}</div>
    ${r.stats&&r.stats.HP?`<div><p class="eyebrow" style="margin-bottom:8px">ค่าสถานะ Lv. ${r.stats.lv}</p><table class="bstats"><thead><tr><th>HP</th><th>ATK</th><th>P.DEF</th><th>M.DEF</th><th>BREAK</th></tr></thead><tbody><tr><td>${r.stats.HP.toLocaleString()}</td><td>${r.stats.ATK}</td><td>${r.stats.PDEF}</td><td>${r.stats.MDEF}</td><td>${r.stats.BREAK}</td></tr></tbody></table></div>`:''}
    <div><p class="eyebrow" style="margin-bottom:8px">Aniimo ที่แนะนำ</p><div class="sugs">${counterList(r.element,r.weak)}</div></div>
    <a class="small" href="https://aniidex.com/bosses/${esc(r.slug)}/" target="_blank" rel="noopener">ดูบน AniiDex ↗</a></div></div>`;
  if(!dlg.open)dlg.showModal();
}
document.addEventListener('click',e=>{const t=e.target.closest('[data-terr]');if(t){openTerr(t.dataset.terr);return}const r=e.target.closest('[data-rush]');if(r)openRush(r.dataset.rush)});

/* ===== material planner ===== */
const plFrom=document.getElementById('plFrom'),plTo=document.getElementById('plTo'),plMode=document.getElementById('plMode');
plFrom.innerHTML=RELEASED.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(a=>`<option value="${a.slug}">${esc(a.name)} (${a.st})</option>`).join('');
const evoNext=s=>EVO.filter(e=>e[0]===s);
function reachable(from){const out=[from],q=[from];while(q.length){const s=q.shift();evoNext(s).forEach(e=>{if(!out.includes(e[1])){out.push(e[1]);q.push(e[1])}})}return out}
function pathTo(from,to){const prev={},q=[from],seen=new Set([from]);while(q.length){const s=q.shift();if(s===to)break;evoNext(s).forEach(e=>{if(!seen.has(e[1])){seen.add(e[1]);prev[e[1]]=e;q.push(e[1])}})}const out=[];let c=to;while(prev[c]){out.unshift(prev[c]);c=prev[c][0]}return out}
function syncTargets(){const r=reachable(plFrom.value);plTo.innerHTML=r.map(s=>`<option value="${s}">${esc(BY[s]?BY[s].name:s)}${s===plFrom.value?' (ไม่วิวัฒนาการ)':''}</option>`).join('');plTo.value=r[r.length-1]}
function familyCrystal(slug){const line=LINES[slug]||[BY[slug]];for(const a of line){const n=a.en+' Dewdrop Crystal';if(ITEM_BY_NAME[n.toLowerCase()])return n}return null}
function planFor(from,to){
  const steps=from===to?[]:pathTo(from,to);const mats={};const add=(n,q,why)=>{(mats[n]=mats[n]||{n,q:0,why:new Set()}).q+=q;mats[n].why.add(why)};
  steps.forEach(([s,d,c,k])=>k.forEach(([n,q])=>add(n,q,'วิวัฒนาการ')));
  ((SK[to]||{}).up||[]).forEach(([n,q])=>add(n,q,'อัปสกิล'));
  return {steps,mats};
}
function srcSummary(name){const it=ITEM_BY_NAME[String(name).toLowerCase()];if(!it||!it.src.length)return '<span class="muted">—</span>';return it.src.slice(0,3).map(([k,d])=>esc(srcLabel(d||k))).join(' · ')+(it.src.length>3?` <span class="muted">+${it.src.length-3}</span>`:'')}
function renderPlanner(){
  const out=document.getElementById('plOut');const team=plMode.value==='team';plFrom.disabled=plTo.disabled=team;
  let blocks=[];const total={};
  const members=team?team.filter(Boolean).map(m=>({from:m.slug,to:m.slug})):[{from:plFrom.value,to:plTo.value}];
  if(team&&!members.length){out.innerHTML='<div class="panel"><p class="muted">ยังไม่มีสมาชิกในทีม ไปจัดทีมก่อน</p><button type="button" class="btn" data-go="team">ไปหน้าจัดทีม</button></div>';return}
  members.forEach(({from,to})=>{
    const a=BY[to]||BY[from];const {steps,mats}=planFor(from,to);Object.values(mats).forEach(m=>{(total[m.n]=total[m.n]||{n:m.n,q:0,why:new Set()}).q+=m.q;m.why.forEach(w=>total[m.n].why.add(w))});
    const fc=familyCrystal(to);
    blocks.push(`<div class="panel"><h3><img src="${TH(a.i)}" alt="" style="width:40px;height:40px;object-fit:contain">${esc(BY[from].name)}${from!==to?' → '+esc(a.name):''}</h3>
      ${steps.length?`<ul class="infolist">${steps.map(([s,d,c,k])=>`<li><b>${esc(BY[s].name)} → ${esc(BY[d].name)}</b><ul class="crit">${c.map(x=>`<li>${esc(tr(x))}</li>`).join('')}</ul>${k.length?`<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">${k.map(([n,q])=>`<span class="chip">${itemRef(n)} ×${q}</span>`).join('')}</div>`:''}</li>`).join('')}</ul>`:(team?'':'<p class="small muted">ไม่มีขั้นวิวัฒนาการ (หรือยังไม่มีข้อมูลเส้นทาง)</p>')}
      <div class="small" style="display:grid;gap:6px">
        <div><b>Resonance:</b> ${fc?itemRef(fc):'Dewdrop Crystal ของตระกูล'} หรือ ${itemRef('Precious Dewdrop Crystal')} และวัสดุจากบอส Alpha/Omega รายสัปดาห์</div>
        <div><b>Capability Awakening:</b> ${itemRef('Star Dust')}</div>
        ${a.it&&a.it.length?`<div><b>Held Item แนะนำ:</b> ${a.it.map(([n])=>itemRef(n)).join(', ')}</div>`:''}
        <div><b>ท้ายเกม:</b> ${itemRef('Capafruit')} (ครั้งเดียวต่อตัว)</div>
      </div></div>`);
  });
  const rows=Object.values(total).sort((a,b)=>b.q-a.q);
  out.innerHTML=`<div class="panel"><h3>วัสดุรวม${team?'ของทั้งทีม':''}</h3>${rows.length?`<div class="scroll-x" style="border:0"><table class="plain" style="min-width:560px"><tr><th>วัสดุ</th><th>จำนวน</th><th>ใช้กับ</th><th>หาได้จาก</th></tr>${rows.map(m=>`<tr><td>${itemRef(m.n)}</td><td><b>×${m.q}</b></td><td>${[...m.why].join(', ')}</td><td class="small">${srcSummary(m.n)}</td></tr>`).join('')}</table></div>`:'<p class="small muted">ไม่ต้องใช้วัสดุวิวัฒนาการหรืออัปสกิลเพิ่ม</p>'}
    <p class="small muted">วัสดุอัปสกิลนับจากสกิลที่อัปเกรดได้ของร่างเป้าหมาย ส่วนวัสดุเลเวลขึ้นกับเลเวลปัจจุบัน จึงไม่ได้รวมไว้</p></div>`+blocks.join('');
}
plFrom.addEventListener('change',()=>{syncTargets();renderPlanner()});[plTo,plMode].forEach(el=>el.addEventListener('change',renderPlanner));
plFrom.value=BY.helion?'helion':RELEASED[0].slug;syncTargets();

/* ===== install / offline ===== */
let deferred=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;document.getElementById('installBox').hidden=false});
document.getElementById('installBtn').addEventListener('click',async()=>{if(!deferred)return;deferred.prompt();try{await deferred.userChoice}catch(_){}deferred=null;document.getElementById('installBox').hidden=true});
try{if('serviceWorker' in navigator&&/^(localhost|127\.0\.0\.1|\[::1\])$|\.github\.io$|(^|\.)aniiguide\.trade$/.test(location.hostname))navigator.serviceWorker.register('sw.js').catch(()=>{})}catch(_){}


/* ===== usage history (this browser only) and anonymous visit stats ===== */
const HIST_MAX=40;
let HIST=null;
function histLoad(){if(HIST)return HIST;HIST={mons:[],items:[],searches:[],views:[],counts:{},since:Date.now()};try{const x=JSON.parse(localStorage.getItem('aniimo-history')||'null');if(x&&typeof x==='object')HIST={...HIST,...x}}catch(_){}return HIST}
function histSave(){try{localStorage.setItem('aniimo-history',JSON.stringify(HIST))}catch(_){}}
function histAdd(kind,key){
  const h=histLoad();if(!key)return;
  if(kind==='views'){h.counts[key]=(h.counts[key]||0)+1;if(key==='home'||key==='history'){histSave();return}}
  h[kind]=[[key,Date.now()]].concat(h[kind].filter(x=>x[0]!==key)).slice(0,HIST_MAX);histSave();
  if(kind==='mons'&&current==='home')renderHomeRecent();
}
const ago=t=>{const en=LOC==='en-GB';const m=Math.round((Date.now()-t)/60000);if(m<1)return en?'just now':'เมื่อสักครู่';if(m<60)return en?m+' min ago':m+' นาทีก่อน';const h=Math.round(m/60);if(h<24)return en?h+' h ago':h+' ชม.ก่อน';const d=Math.round(h/24);return d<30?(en?d+' days ago':d+' วันก่อน'):new Date(t).toLocaleDateString(LOC,{day:'numeric',month:'short'})};
function renderHomeRecent(){
  const box=document.getElementById('homeRecent');if(!box)return;const ms=histLoad().mons.filter(([s])=>BY[s]).slice(0,12);box.hidden=!ms.length;
  document.getElementById('homeRecentList').innerHTML=ms.map(([s])=>`<button type="button" data-open="${s}"><img decoding="async" src="${TH(BY[s].i)}" alt="">${esc(BY[s].name)}</button>`).join('');
}
function renderHistory(){
  const h=histLoad(),out=document.getElementById('histOut');
  const ms=h.mons.filter(([s])=>BY[s]),its=h.items,ss=h.searches;
  const vs=Object.entries(h.counts).filter(([k])=>k!=='home'&&k!=='history'&&VIEWS.some(v=>v.id===k)).sort((a,b)=>b[1]-a[1]).slice(0,8);const vmax=vs.length?vs[0][1]:1;
  if(!ms.length&&!its.length&&!ss.length&&!vs.length){out.innerHTML='<div class="panel"><p class="muted">ยังไม่มีประวัติ ลองเปิดดู Aniimo สักตัว หรือค้นหาจากช่องค้นหาด้านบน แล้วกลับมาที่หน้านี้</p><div><button type="button" class="btn primary" data-go="dex">ไปที่รายชื่อ Aniimo</button></div></div>';return}
  out.innerHTML=
   (ms.length?`<div><h3>Aniimo ที่ดูล่าสุด<small>${ms.length} ตัว</small></h3><div class="hmons">${ms.map(([s,t])=>`<button type="button" data-open="${s}"><img decoding="async" loading="lazy" src="${TH(BY[s].i)}" alt="">${esc(BY[s].name)}<small>${ago(t)}</small></button>`).join('')}</div></div>`:'')
   +(its.length?`<div><h3>ไอเท็มที่เปิดดู<small>${its.length} ชิ้น</small></h3><div class="hlist">${its.map(([n,t])=>`<button type="button" data-item="${esc(n)}">${esc(n)}<small>${ago(t)}</small></button>`).join('')}</div></div>`:'')
   +(ss.length?`<div><h3>คำที่ค้นหา</h3><div class="hlist">${ss.map(([q,t])=>`<button type="button" data-hq="${esc(q)}">"${esc(q)}"<small>${ago(t)}</small></button>`).join('')}</div></div>`:'')
   +(vs.length?`<div><h3>หน้าที่เปิดบ่อย<small>ตั้งแต่ ${new Date(h.since).toLocaleDateString(LOC,{day:'numeric',month:'short',year:'numeric'})}</small></h3><div class="hbars">${vs.map(([k,n])=>`<button type="button" class="hbar" data-go="${k}"><span>${esc(VIEWS.find(v=>v.id===k).th)}</span><span class="t"><i style="width:${Math.round(n/vmax*100)}%"></i></span><b>${n}</b></button>`).join('')}</div></div>`:'')
   +`<div class="hclear" id="histClearBox"><button type="button" class="btn" id="histClear">ล้างประวัติทั้งหมด</button></div>`;
}
document.addEventListener('click',e=>{
  const q=e.target.closest('[data-hq]');if(q){const g=document.getElementById('gq');g.value=q.dataset.hq;g.focus();gsearch();return}
  if(e.target.closest('#histClear')){document.getElementById('histClearBox').innerHTML='<span class="small">ลบประวัติทั้งหมดในเบราว์เซอร์นี้?</span><button type="button" class="btn primary" id="histClearYes">ลบเลย</button><button type="button" class="btn" id="histClearNo">ยกเลิก</button>';return}
  if(e.target.closest('#histClearNo')){renderHistory();return}
  if(e.target.closest('#histClearYes')){HIST=null;try{localStorage.removeItem('aniimo-history')}catch(_){}renderHistory();renderHomeRecent();return}
});

/* ===== anonymous usage records → the owner's Supabase database =====
   Sends only: what was opened (page / Aniimo / item / search word), a random visitor id kept in
   this browser, device type, browser language and time zone. No names, no cookies, no IP stored.
   Runs only on the public site so local testing is not counted. */
const SB={url:'https://gmammzjwpkencuxgzmqu.supabase.co',key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYW1temp3cGtlbmN1eGd6bXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1ODE4MTIsImV4cCI6MjEwNjE1NzgxMn0.KZTw4zk5cNDz3i7WLjnbf9VllfT5NzM-vAh8U5_8EVQ'}; // anon key: public by design, insert-only (see tools/admin/supabase.sql)
const SB_ON=!!SB.url&&/\.github\.io$|(^|\.)aniiguide\.trade$/.test(location.hostname);
let VISITOR='';try{VISITOR=localStorage.getItem('aniimo-visitor')||'';if(!VISITOR){VISITOR=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)).slice(0,36);localStorage.setItem('aniimo-visitor',VISITOR)}}catch(_){}
const DEVICE=/iPad|Tablet/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&innerWidth>=768&&innerWidth<1100)?'tablet':/Mobi|Android|iPhone/i.test(navigator.userAgent)?'phone':'desktop';
let TZ='';try{TZ=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(_){}
/* A visit (session) is one tab; it ends after 30 minutes without activity. It counts as "used" once the
   visitor opens 2+ different pages, opens an Aniimo/item, searches, or stays 10+ s on a visible page after tapping,
   scrolling or typing, or stays 3+ minutes even without touching anything; that sends one 'engage' row. 'leave' rows carry the visit's active seconds so far.
   The owner's own device (logged in to the back office) is not counted. */
const SES=(()=>{let s=null;try{s=JSON.parse(sessionStorage.getItem('aniimo-ses')||'null')}catch(_){}
  if(!s||!Array.isArray(s.pages)||Date.now()-s.last>30*60000)s={id:(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)).slice(0,36),pages:[],active:0,engaged:'',touched:false};
  s.last=Date.now();return s})();
const sesSave=()=>{SES.last=Date.now();try{sessionStorage.setItem('aniimo-ses',JSON.stringify(SES))}catch(_){}};
let SB_SESS=true; // false once the database turns out not to have the session column yet (engagement.sql not run)
const isOwner=()=>typeof AD!=='undefined'&&!!AD.s;
function sbInsert(row){return fetch(SB.url+'/rest/v1/events',{method:'POST',keepalive:true,headers:{apikey:SB.key,Authorization:'Bearer '+SB.key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(row)})}
function track(kind,key){
  if(kind==='view'){if(!SES.pages.includes(key))SES.pages.push(key);if(SES.pages.length>=2)engage('pages')} // distinct pages, so a reload is not a second page
  else if(kind==='mon'||kind==='item')engage('open');else if(kind==='search')engage('search');
  sesSave();
  if(!SB_ON||!key||isOwner())return;
  if(!SB_SESS&&(kind==='engage'||kind==='leave'))return;
  const row={kind,key:String(key).slice(0,80),visitor:VISITOR||null,device:DEVICE,lang:(navigator.language||'').slice(0,12),tz:TZ.slice(0,40)};
  if(SB_SESS)row.session=SES.id;
  try{sbInsert(row).then(r=>{if(r.status===400&&row.session){SB_SESS=false;if(kind!=='engage'&&kind!=='leave'){delete row.session;sbInsert(row).catch(()=>{})}}}).catch(()=>{})}catch(_){}
}
function engage(reason){if(SES.engaged)return;SES.engaged=reason;sesSave();track('engage',reason)}
{ // active time: seconds with the tab visible; any tap, key, wheel or scroll marks the visit as touched
  const touch=()=>{if(!SES.touched){SES.touched=true;sesSave()}};
  ['pointerdown','keydown','wheel'].forEach(t=>addEventListener(t,touch,{passive:true,capture:true}));
  addEventListener('scroll',()=>{if(scrollY>120)touch()},{passive:true});
  setInterval(()=>{if(document.hidden||SES.active>=10800)return;SES.active++;if(SES.touched&&SES.active>=10)engage('active');if(SES.active>=180)engage('long');if(SES.active%5===0)sesSave();if(SES.active%60===0)leave()},1000); // every active minute too, so the back office sees visits still open
  let sent=-1;const leave=()=>{if(SES.active!==sent){sent=SES.active;sesSave();track('leave',String(SES.active))}};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)leave()});addEventListener('pagehide',leave);
}

renderHomeRecent();

/* ===== back office: site stats (owner only) =====
   The owner logs in with the Supabase account e-mail/password; the database only answers
   stats_summary() for that account. Visitors never see any numbers. */
const AD={s:null,demo:false,range:7,busy:false,tab:'overview'};
try{AD.s=JSON.parse(sessionStorage.getItem('aniimo-admin')||localStorage.getItem('aniimo-admin')||'null')}catch(_){}
const fmtN=n=>Number(n||0).toLocaleString(LOC);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function adSave(s,remember){AD.s=s;try{sessionStorage.removeItem('aniimo-admin');localStorage.removeItem('aniimo-admin');if(s)(remember||s.remember?localStorage:sessionStorage).setItem('aniimo-admin',JSON.stringify(s))}catch(_){}}
async function sbAuth(body,grant){
  const r=await fetch(SB.url+'/auth/v1/token?grant_type='+grant,{method:'POST',headers:{apikey:SB.key,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(r.status===400?'badlogin':'net');
  return {access:j.access_token,refresh:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000-60000,email:(j.user||{}).email||''};
}
async function sbSession(){
  if(!AD.s)throw new Error('nologin');
  if(Date.now()>AD.s.exp){try{const n=await sbAuth({refresh_token:AD.s.refresh},'refresh_token');adSave({...n,remember:AD.s.remember})}catch(_){adSave(null);throw new Error('nologin')}}
  return AD.s.access;
}
async function sbRpc(fn,args){
  const tok=await sbSession();
  const r=await fetch(SB.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:SB.key,Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify(args||{})});
  if(r.status===401){adSave(null);throw new Error('nologin')}
  const j=r.status===204?null:await r.json().catch(()=>null);
  if(!r.ok){if(j&&(j.code==='PGRST202'||j.code==='42883'))throw new Error('nofeedback');if(j&&j.code==='42501')throw new Error('notowner');throw new Error('net')}
  return j;
}
const FB={filter:'new',items:null,err:''};
const DEMO_FB=[{id:3,at:new Date(Date.now()-3600e3).toISOString(),topic:'idea',message:'อยากให้มีตารางเปรียบเทียบ Held Item ว่าตัวไหนเหมาะกับบทบาทอะไร',contact:'ชื่อในเกม: Mintz',page:'items',status:'new'},{id:2,at:new Date(Date.now()-26*3600e3).toISOString(),topic:'data',message:'จุดเกิดของ Bolty ในภูมิภาค Blitzwood เลเวลน่าจะเป็น 18-22 ไม่ใช่ 15-20',contact:null,page:'dex',status:'read'},{id:1,at:new Date(Date.now()-3*86400e3).toISOString(),topic:'bug',message:'แผนที่บนไอแพดซูมแล้วกระตุกนิดหน่อย',contact:'fb.com/example',page:'map',status:'done'}];
async function loadFeedback(){
  if(AD.demo){FB.items=DEMO_FB.filter(f=>FB.filter==='all'||f.status===FB.filter);FB.err='';return}
  try{FB.items=await sbRpc('feedback_list',{lim:100,only_status:FB.filter==='all'?null:FB.filter})||[];FB.err=''}
  catch(e){FB.items=[];FB.err=e.message}
}
function feedbackPanel(){
  const st={new:'ใหม่',read:'อ่านแล้ว',done:'จัดการแล้ว'};
  const body=FB.err==='nofeedback'?'<p class="dnote">ยังไม่ได้ติดตั้งระบบคำแนะนำในฐานข้อมูล ให้รันไฟล์ tools/admin/feedback.sql ใน Supabase SQL Editor</p>'
   :FB.err?'<p class="dnote">โหลดคำแนะนำไม่สำเร็จ</p>'
   :(FB.items||[]).map(f=>`<div class="fbitem ${f.status}"><div class="meta"><span class="chip">${esc(FB_TOPIC[f.topic]||f.topic)}</span><span>${new Date(f.at).toLocaleString(LOC,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>${f.page?`<span>จากหน้า ${esc((VIEWS.find(v=>v.id===f.page)||{}).th||f.page)}</span>`:''}<span>· ${st[f.status]}</span></div>
      <p>${esc(f.message)}</p>${f.contact?`<div class="meta">ติดต่อกลับ: <b style="color:var(--ink)">${esc(f.contact)}</b></div>`:''}
      <div class="acts">${f.status!=='read'?`<button type="button" class="btn" data-fb="${f.id}" data-s="read">อ่านแล้ว</button>`:''}${f.status!=='done'?`<button type="button" class="btn" data-fb="${f.id}" data-s="done">จัดการแล้ว</button>`:''}${f.status!=='new'?`<button type="button" class="btn" data-fb="${f.id}" data-s="new">ทำเป็นใหม่</button>`:''}<button type="button" class="btn" data-fb="${f.id}" data-s="delete">ลบ</button></div></div>`).join('')||'<p class="dnote">ไม่มีคำแนะนำในหมวดนี้</p>';
  return `<div class="dpanel" id="fbPanel"><h3>คำแนะนำจากผู้ใช้<small>${FB.filter==='new'?'ยังไม่ได้อ่าน':''}</small></h3>
    <div class="seg fbseg" id="fbFilter">${[['new','ใหม่'],['read','อ่านแล้ว'],['done','จัดการแล้ว'],['all','ทั้งหมด']].map(([k,l])=>`<button type="button" data-f="${k}" aria-pressed="${FB.filter===k}">${l}</button>`).join('')}</div>
    <div class="fblist">${body}</div></div>`;
}
async function refreshFeedback(){await loadFeedback();const el=document.getElementById('fbPanel');if(el)el.outerHTML=feedbackPanel()}
async function sbStats(days){
  const tok=await sbSession();
  const r=await fetch(SB.url+'/rest/v1/rpc/stats_summary',{method:'POST',headers:{apikey:SB.key,Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({days})});
  if(r.status===401){adSave(null);throw new Error('nologin')}
  const j=await r.json().catch(()=>null);
  if(!r.ok){if(j&&j.code==='42501')throw new Error('notowner');throw new Error('net')}
  return j;
}
async function sbEngage(days){
  const tok=await sbSession();
  const r=await fetch(SB.url+'/rest/v1/rpc/stats_engagement',{method:'POST',headers:{apikey:SB.key,Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({days})});
  const j=await r.json().catch(()=>null);
  if(!r.ok)throw new Error(r.status===404||(j&&j.code==='PGRST202')?'missing':'net');
  return j;
}
function demoEngage(days,d){
  const cut=Math.floor(d.daily.length*.4); // older days come from the pre-session history
  const daily=d.daily.map((x,i)=>{const s=Math.round(x.n*.55),e=Math.round(s*(.56+seed(x.day+'e')*.14)),old=i<cut;return {day:x.day,s,e,es:old?s:0,ee:old?e:0}});
  const S=daily.reduce((a,x)=>a+x.s,0),E=daily.reduce((a,x)=>a+x.e,0),ES=daily.reduce((a,x)=>a+x.es,0),EE=daily.reduce((a,x)=>a+x.ee,0);
  const land=[['home',.46,.58],['dex',.14,.74],['codes',.12,.31],['map',.09,.81],['events',.06,.52],['tier',.05,.63],['beginner',.04,.7],['whisperwake',.04,.45]];
  return {since:daily[cut]?daily[cut].day+'T00:00:00+07:00':null,sessions:S,engaged:E,est_sessions:ES,est_engaged:EE,avg_pages:3.4,avg_secs_engaged:262,median_secs_engaged:148,daily,
    devices:[['phone',.66,.57],['desktop',.26,.74],['tablet',.08,.61]].map(([k,f,r])=>({key:k,s:Math.round(S*f),e:Math.round(S*f*r)})),
    landing:land.map(([k,f,r])=>({key:k,s:Math.round(S*f),e:Math.round(S*f*r)})),
    reasons:[{key:'pages',n:Math.round(E*.48)},{key:'open',n:Math.round(E*.22)},{key:'active',n:Math.round(E*.15)},{key:'long',n:Math.round(E*.09)},{key:'search',n:Math.round(E*.06)}],
    time:[[0,.12],[1,.24],[2,.12],[3,.1],[4,.17],[5,.15],[6,.1]].map(([k,f])=>({key:k,n:Math.round(S*f)}))};
}
const fmtSecs=n=>{n=Math.round(n||0);const en=LOC==='en-GB';if(n<60)return en?`${n}s`:`${n} วินาที`;const m=Math.floor(n/60),s=n%60;return en?`${m}m ${s}s`:`${m} นาที${s?` ${s} วินาที`:''}`};
const pct=(a,b)=>b?Math.round(a/b*100):0;
const pctRow=(label,p)=>`<div class="rrow" style="grid-template-columns:minmax(0,1.6fr) minmax(40px,1fr) 48px;cursor:default"><span class="nm">${esc(label)}</span><span class="t"><i style="width:${p}%"></i></span><b>${p}%</b></div>`;
const ENG_WHY={pages:'เปิดมากกว่า 1 หน้า',open:'เปิดดู Aniimo หรือไอเท็ม',search:'ค้นหา',active:'อยู่ 10 วินาทีขึ้นไปและมีการกด เลื่อน หรือพิมพ์',long:'อยู่ในเว็บ 3 นาทีขึ้นไป'};
const TIME_TH={0:'ไม่ทราบ (ข้อมูลเก่า เปิดหน้าเดียว)',1:'ไม่ถึง 10 วินาที',2:'10–30 วินาที',3:'30 วินาที–1 นาที',4:'1–3 นาที',5:'3–10 นาที',6:'มากกว่า 10 นาที'};
function engSvg(days){
  const W=640,H=190,L=40,B=26,T=14,mx=Math.max(1,...days.map(d=>d.s)),step=Math.pow(10,Math.floor(Math.log10(mx))),top=Math.ceil(mx/step)*step||1;
  const bw=(W-L-8)/days.length,y=v=>T+(H-T-B)*(1-v/top),every=days.length>16?Math.ceil(days.length/10):1,px=v=>(H-T-B)*v/top;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="ใช้งานจริงกับออกโดยไม่ได้ใช้งาน รายวัน">${[0,top/2,top].map(t=>`<line class="gl" x1="${L}" x2="${W-4}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${L-6}" y="${y(t)+4}" text-anchor="end">${fmtN(Math.round(t))}</text>`).join('')}
   ${days.map((d,i)=>{const x=L+i*bw+bw*.16,w=bw*.68,dt=new Date(d.day+'T00:00:00Z'),es=d.es||0,ee=d.ee||0;
     // stacked from the bottom: measured real use, estimated real use, measured quick exits, estimated quick exits
     const parts=[['ee',d.e-ee],['ee est',ee],['eb',(d.s-d.e)-(es-ee)],['eb est',es-ee]];let base=0;
     const rects=parts.map(([c,v])=>{if(v<=0)return '';const r=`<rect class="${c}" x="${x}" y="${y(base+v)}" width="${w}" height="${px(v)}" rx="2"/>`;base+=v;return r}).join('');
     return `<g><title>${dt.toLocaleDateString(LOC,{weekday:'short',day:'numeric',month:'short'})}: ใช้งานจริง ${fmtN(d.e)} · ออกโดยไม่ได้ใช้งาน ${fmtN(d.s-d.e)}${es?` (ประมาณจากข้อมูลเก่า ${fmtN(es)} รอบ)`:''}</title>${rects}</g>${(days.length-1-i)%every===0?`<text class="ax" x="${x+w/2}" y="${H-8}" text-anchor="middle">${dt.getUTCDate()}</text>`:''}`}).join('')}</svg>`;
}
function engagePanel(e,rl){
  if(!e||e.err==='missing')return `<div class="dpanel"><h3>ใช้งานจริง vs ออกโดยไม่ได้ใช้งาน</h3><p class="muted">ยังไม่ได้ติดตั้งในฐานข้อมูล เปิด Supabase → SQL Editor แล้วรันไฟล์ <code>tools/admin/engagement.sql</code> ครั้งเดียว ตัวเลขจะเริ่มนับตั้งแต่ตอนนั้น</p></div>`;
  if(e.err)return `<div class="dpanel"><h3>ใช้งานจริง vs ออกโดยไม่ได้ใช้งาน</h3><p class="muted">โหลดข้อมูลส่วนนี้ไม่สำเร็จ กดรีเฟรชเพื่อลองใหม่</p></div>`;
  const S=e.sessions||0,E=e.engaged||0,Bn=S-E,ES=e.est_sessions||0,byDay={};(e.daily||[]).forEach(d=>byDay[d.day]=d);
  const days=AD.demo?e.daily:fillDays((e.daily||[]).map(d=>({day:d.day,n:d.s,u:d.e})),AD.range).map(d=>({...(byDay[d.day]||{}),day:d.day,s:d.n,e:d.u}));
  const landing=(e.landing||[]).filter(r=>VIEWS.some(v=>v.id===r.key));
  return `<div class="dpanel engage"><h3>ใช้งานจริง vs ออกโดยไม่ได้ใช้งาน<small>นับเป็นรอบการเข้าเว็บ · ${rl}</small></h3>
    <div class="kpis">
      <div class="kpi"><small>รอบการเข้าเว็บ</small><b>${fmtN(S)}</b><span>เฉลี่ย ${e.avg_pages||0} หน้าต่อรอบ${ES?` · ประมาณจากข้อมูลเก่า ${fmtN(ES)}`:''}</span></div>
      <div class="kpi good"><small>ใช้งานจริง</small><b>${fmtN(E)}</b><span>${pct(E,S)}% ของทุกรอบ</span></div>
      <div class="kpi bad"><small>ออกโดยไม่ได้ใช้งาน</small><b>${fmtN(Bn)}</b><span>${pct(Bn,S)}% ออกไปโดยไม่ได้ใช้งาน</span></div>
      <div class="kpi"><small>เวลาใช้งานของคนที่ใช้จริง</small><b>${e.median_secs_engaged!=null?fmtSecs(e.median_secs_engaged):'—'}</b><span>ค่ากลาง · เฉลี่ย ${e.avg_secs_engaged!=null?fmtSecs(e.avg_secs_engaged):'—'}</span></div>
    </div>
    <div class="esplit" role="img" aria-label="ใช้งานจริง ${pct(E,S)}%"><i style="width:${pct(E,S)}%"></i></div>
    <div class="trend">${engSvg(days)}<p class="dnote"><span class="lg ee"></span>ใช้งานจริง <span class="lg eb"></span>ออกโดยไม่ได้ใช้งาน${ES?' · สีจางคือค่าประมาณจากข้อมูลเก่า':''} · ชี้ที่แท่งเพื่อดูตัวเลข</p></div>
    <div class="dgrid">
      <div class="dpanel flat"><h3>หน้าแรกที่เข้ามา<small>% ที่ออกโดยไม่ได้ใช้งาน</small></h3><div class="rank">${rankList(landing.map(r=>({...r,n:r.s})),r=>{const v=VIEWS.find(x=>x.id===r.key),bp=pct(r.s-r.e,r.s);return `<button type="button" class="rrow" data-go="${r.key}" style="grid-template-columns:28px minmax(0,1.6fr) minmax(40px,1fr) 48px"><span class="ico"><svg><use href="#i-${v.ic}"/></svg></span><span class="nm">${esc(v.th)} <small class="muted">${fmtN(r.s)} รอบ</small></span><span class="t"><i class="bad" style="width:${bp}%"></i></span><b>${bp}%</b></button>`})}</div></div>
      <div class="dpanel flat"><h3>อยู่ในเว็บนานแค่ไหน<small>จำนวนรอบ</small></h3><div class="rank">${rankList((e.time||[]).map(r=>({...r})),(r,p)=>plainRow(TIME_TH[r.key]||r.key,p,r.n))}</div></div>
      <div class="dpanel flat"><h3>ใช้งานจริงแยกตามอุปกรณ์</h3><div class="rank">${rankList((e.devices||[]).map(r=>({...r,n:r.s})),r=>pctRow(`${DEV_TH[r.key]||r.key} · ${fmtN(r.s)} รอบ`,pct(r.e,r.s)))}</div></div>
      <div class="dpanel flat"><h3>นับว่าใช้งานจริงเพราะ<small>สิ่งแรกที่ทำ</small></h3><div class="rank">${rankList(e.reasons||[],(r,p)=>plainRow(ENG_WHY[r.key]||r.key,p,r.n))}</div></div>
    </div>
    ${ES?`<p class="warnbox" style="margin:0">รวมค่าประมาณจากข้อมูลเก่า ${fmtN(ES)} รอบ (ใช้งานจริง ${fmtN(e.est_engaged||0)}) ก่อน${e.since?` ${new Date(e.since).toLocaleDateString(LOC,{day:'numeric',month:'short',year:'numeric'})}`:'เริ่มเก็บแบบใหม่'} ข้อมูลเก่าไม่มีเวลาที่อยู่ในหน้า จึงดูจากหน้าที่เปิด การค้นหา และช่วงเวลาระหว่างการกดครั้งแรกถึงครั้งสุดท้าย คนที่เปิดหน้าเดียวแล้วอ่านนานอาจถูกนับเป็นออกโดยไม่ได้ใช้งาน และช่วงนั้นยังนับการเข้าเว็บของเจ้าของด้วย</p>`:''}
    <p class="dnote">"ใช้งานจริง" คือรอบที่เปิดมากกว่า 1 หน้า (ไม่นับการรีเฟรช) เปิดดู Aniimo หรือไอเท็ม ค้นหา อยู่ 10 วินาทีขึ้นไปและมีการกด เลื่อน หรือพิมพ์ หรืออยู่ในเว็บ 3 นาทีขึ้นไปแม้อ่านหน้าเดียว นอกนั้นนับเป็น "ออกโดยไม่ได้ใช้งาน" · รอบการเข้าเว็บหมดเมื่อไม่มีการใช้งาน 30 นาที · ไม่นับเครื่องที่ล็อกอินหลังบ้าน${e.since?` · เริ่มเก็บแบบใหม่ ${new Date(e.since).toLocaleDateString(LOC,{day:'numeric',month:'short',year:'numeric'})}`:''}</p>
  </div>`;
}
const DEV_TH={phone:'มือถือ',tablet:'แท็บเล็ต',desktop:'คอมพิวเตอร์',unknown:'ไม่ทราบ'};
const LANG_TH={th:'ไทย',en:'อังกฤษ',ja:'ญี่ปุ่น',zh:'จีน',ko:'เกาหลี',lo:'ลาว',vi:'เวียดนาม',ms:'มาเลย์',id:'อินโดนีเซีย'};

/* sample data in the same shape as stats_summary(), for previewing the layout */
const seed=str=>{let h=2166136261;for(const c of str)h=Math.imul(h^c.charCodeAt(0),16777619);return ((h>>>0)%1000)/1000};
function demoData(days){
  const now=Date.now(),daily=[...Array(days)].map((_,i)=>{const d=new Date(now-(days-1-i)*86400000),wk=[1.25,.9,.85,.88,.95,1.15,1.35][d.getUTCDay()],n=Math.round((330+i*(160/days))*wk*(.85+seed(d.toISOString().slice(0,10))*.3));return {day:d.toISOString().slice(0,10),n,u:Math.round(n*.4)}});
  const views=daily.reduce((n,d)=>n+d.n,0);
  const VW={dex:1,map:.82,team:.55,events:.5,beginner:.46,items:.4,skills:.36,bosses:.3,tier:.28,codes:.26,collection:.22,regions:.2};
  const top=(o,f)=>Object.entries(o).map(([k,w])=>({key:k,n:Math.round(f*w*(.85+seed(k)*.3))})).sort((a,b)=>b.n-a.n);
  const mons={};RELEASED.forEach(a=>{mons[a.slug]=({S:1,A:.55,B:.3,C:.16,D:.1}[TIER[a.slug]]||.08)*(.4+seed(a.slug)*.9)});
  return {views,visitors:Math.round(views*.36),today:daily[days-1].n,today_visitors:daily[days-1].u,searches:Math.round(views*.2),mon_views:Math.round(views*.55),daily,
    top_views:top(VW,views*.6),top_mons:top(mons,views*.12).slice(0,10),
    top_items:top({'Night Stone':1,'Sparkling Cube':.8,'Capafruit':.7,'Aniipod Ultra':.6,'Star Dust':.45,'Prismatic Stone':.4},views*.03),
    top_searches:top({stellarys:1,helion:.8,'night stone':.6,lunara:.55,fulmintis:.4,'egg heist':.35,turbo:.3},views*.04),
    devices:[{key:'phone',n:Math.round(views*.24)},{key:'desktop',n:Math.round(views*.09)},{key:'tablet',n:Math.round(views*.03)}],
    langs:[{key:LOC,n:Math.round(views*.31)},{key:'en-US',n:Math.round(views*.04)},{key:'lo-LA',n:Math.round(views*.01)}],
    zones:[{key:'Asia/Bangkok',n:Math.round(views*.3)},{key:'Asia/Vientiane',n:Math.round(views*.02)},{key:'Asia/Singapore',n:Math.round(views*.015)}]};
}
function trendSvg(days){
  const W=640,H=210,L=40,B=28,T=20,mx=Math.max(1,...days.map(d=>d.n)),step=Math.pow(10,Math.floor(Math.log10(mx)));const top=Math.ceil(mx/step)*step||1;
  const bw=(W-L-8)/days.length,y=v=>T+(H-T-B)*(1-v/top),every=days.length>16?Math.ceil(days.length/10):1,showVal=days.length<=14;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="การเข้าชมรายวัน">${[0,top/2,top].map(t=>`<line class="gl" x1="${L}" x2="${W-4}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${L-6}" y="${y(t)+4}" text-anchor="end">${fmtN(Math.round(t))}</text>`).join('')}
   ${days.map((d,i)=>{const x=L+i*bw+bw*.16,w=bw*.68,h=Math.max(d.n?2:0,(H-T-B)*d.n/top),dt=new Date(d.day+'T00:00:00Z');
     return `<rect class="bar${i===days.length-1?' today':''}" x="${x}" y="${y(d.n)}" width="${w}" height="${h}" rx="3"><title>${dt.toLocaleDateString(LOC,{weekday:'short',day:'numeric',month:'short'})}: ${fmtN(d.n)} ครั้ง · ${fmtN(d.u)} คน</title></rect>${showVal&&d.n?`<text class="val" x="${x+w/2}" y="${y(d.n)-4}" text-anchor="middle">${fmtN(d.n)}</text>`:''}${(days.length-1-i)%every===0?`<text class="ax" x="${x+w/2}" y="${H-10}" text-anchor="middle">${dt.getUTCDate()}</text>`:''}`}).join('')}</svg>`;
}
function fillDays(list,days){const m={};(list||[]).forEach(d=>m[d.day]=d);const tz=7*3600000;const out=[...Array(days)].map((_,i)=>{const day=new Date(Date.now()+tz-(days-1-i)*86400000).toISOString().slice(0,10);return m[day]||{day,n:0,u:0}});
  if(days>=365){const i=out.findIndex(d=>d.n>0);return i>0?out.slice(i):out} // all time: start at the first day with data
  return out}
function rankList(rows,render){const mx=Math.max(1,...rows.map(r=>r.n));return rows.map(r=>render(r,Math.round(r.n/mx*100))).join('')||'<p class="dnote">ยังไม่มีข้อมูลในช่วงนี้</p>'}
const bar=(pct,n)=>`<span class="t"><i style="width:${pct}%"></i></span><b>${fmtN(n)}</b>`;
const plainRow=(label,pct,n)=>`<div class="rrow" style="grid-template-columns:minmax(0,1.6fr) minmax(40px,1fr) 60px;cursor:default"><span class="nm">${esc(label)}</span>${bar(pct,n)}</div>`;
function adminLogin(msg){
  const out=document.getElementById('adOut');
  if(!SB.url){out.innerHTML=`<div class="dpanel adlogin" style="max-width:460px"><span class="ic"><svg><use href="#i-lock"/></svg></span><h3>หลังบ้านยังไม่ได้เชื่อมฐานข้อมูล</h3><p class="muted">เจ้าของเว็บต้องสร้างฐานข้อมูล Supabase และใส่ค่าการเชื่อมต่อก่อน ระหว่างนี้ดูหน้าตาด้วยข้อมูลสมมติได้</p><button type="button" class="btn" id="adDemo">ดูตัวอย่างด้วยข้อมูลสมมติ</button></div>`;return}
  out.innerHTML=`<form class="dpanel adlogin" id="adForm" style="max-width:420px">
   <span class="ic"><svg><use href="#i-lock"/></svg></span><h3>เข้าสู่หลังบ้าน</h3>
   ${msg?`<p class="warnbox" style="margin:0">${msg}</p>`:''}
   <label for="adEmail">อีเมล<input type="email" id="adEmail" autocomplete="username" required></label>
   <label for="adPw">รหัสผ่าน<input type="password" id="adPw" autocomplete="current-password" required></label>
   <label for="adRemember" style="display:flex;flex-direction:row;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="adRemember"> จำการเข้าสู่ระบบในเครื่องนี้</label>
   <button type="submit" class="btn primary" id="adGo">เข้าสู่หลังบ้าน</button>
   <p class="dnote">ใช้เครื่องสาธารณะ ไม่ต้องติ๊กจำ และกดออกจากระบบทุกครั้ง</p></form>`;
  setTimeout(()=>{const i=document.getElementById('adEmail');i&&i.focus()},50);
}
async function renderAdmin(quiet){
  const out=document.getElementById('adOut');
  if(!AD.demo&&(!SB.url||!AD.s)){adminLogin();return}
  if(AD.busy)return;AD.busy=true;
  const sk='<div class="skel" style="width:60%"></div>';
  if(!quiet)out.innerHTML=`<div class="kpis">${[1,2,3,4].map(()=>`<div class="kpi">${sk}${sk}</div>`).join('')}</div><div class="dpanel">${sk}</div>`;
  try{
    const d=AD.demo?demoData(AD.range):await sbStats(AD.range);await loadFeedback();
    const eg=AD.demo?demoEngage(AD.range,d):await sbEngage(AD.range).catch(e=>({err:e.message}));
    const days=AD.demo?d.daily:fillDays(d.daily,AD.range);
    const rl={1:'วันนี้',7:'7 วันล่าสุด',30:'30 วันล่าสุด',90:'90 วันล่าสุด',365:'ตั้งแต่เริ่มเก็บข้อมูล'}[AD.range];
    const views=(d.top_views||[]).filter(r=>VIEWS.some(v=>v.id===r.key)&&r.key!=='admin').slice(0,10);
    const mons=(d.top_mons||[]).filter(r=>BY[r.key]);
    const vh=document.querySelector('[data-view="admin"] .vhead');if(vh)vh.hidden=true;
    const S=(eg&&!eg.err&&eg.sessions)||0,EG=(eg&&!eg.err&&eg.engaged)||0,BO=S-EG,ok=eg&&!eg.err;
    const newFb=(FB.items||[]).filter(f=>f.status==='new');
    const RULE='นับรอบนั้นว่า “ใช้งานจริง” เมื่อมีอย่างใดอย่างหนึ่ง: เปิดตั้งแต่ 2 หน้าที่ต่างกันขึ้นไป · เปิดดู Aniimo หรือไอเท็ม · ค้นหา · อยู่บนหน้าที่เปิดเห็นอยู่ 10 วินาทีขึ้นไปหลังแตะ เลื่อน หรือพิมพ์ · หรืออยู่ครบ 3 นาที นอกนั้นนับเป็น “ออกโดยไม่ได้ใช้งาน”';
    const kpi=(lab,val,unit,sub,cls='')=>`<div class="akpi ${cls}"><small>${lab}</small><b>${val}<i>${unit}</i></b><span>${sub}</span></div>`;
    const tabs=[['overview','ภาพรวม','grid'],['usage','การใช้งาน','chart'],['search','การค้นหา','search'],['feedback','คำแนะนำ','chat'],['posts','โพสต์โซเชียล','news'],['community','ชุมชน','team']];
    const range=`<div class="aseg" id="adRange" role="group" aria-label="ช่วงเวลา">${[[1,'วันนี้'],[7,'7 วัน'],[30,'30 วัน'],[90,'90 วัน'],[365,'ทั้งหมด']].map(([n,l])=>`<button type="button" data-r="${n}" aria-pressed="${AD.range===n}">${l}</button>`).join('')}</div>`;
    const meta=`<div class="ameta"><span>อัปเดต ${new Date().toLocaleTimeString(LOC,{hour:'2-digit',minute:'2-digit'})} · รีเฟรชเองทุก 1 นาที</span>${AD.demo?'<button type="button" class="abtn" id="adExitDemo">ออกจากข้อมูลตัวอย่าง</button>':`<span>${esc(AD.s.email||'')}</span><button type="button" class="abtn" id="adRefresh">รีเฟรช</button><button type="button" class="abtn" id="adLogout">ออกจากระบบ</button>`}</div>`;
    const quality=ok?`<div class="acard">
        <div class="ahead"><h3>คุณภาพการเข้าใช้งาน</h3><small>${rl} · นับเป็นรอบ</small></div>
        <div class="aqual"><div><b>${fmtN(EG)}<i>รอบ</i></b><span class="g">ใช้งานจริง · ${pct(EG,S)}%</span></div><div><b>${fmtN(BO)}<i>รอบ</i></b><span>ออกโดยไม่ได้ใช้งาน · ${pct(BO,S)}%</span></div></div>
        <div class="abar" role="img" aria-label="ใช้งานจริง ${pct(EG,S)}%"><i style="width:${pct(EG,S)}%"></i></div>
        <details class="arule" open><summary>ⓘ เกณฑ์ “ใช้งานจริง” คืออะไร</summary><p>${RULE} · หนึ่งรอบจบเมื่อไม่มีการใช้งานต่อเนื่อง 30 นาที หรือปิดแท็บ</p></details>
        <div class="asep"></div>
        <small class="amute">เวลาใช้งานของรอบที่ใช้งานจริง · ค่ากลาง</small>
        <b class="abig">${eg.median_secs_engaged!=null?fmtSecs(eg.median_secs_engaged):'—'}</b>
        <small class="amute">ค่าเฉลี่ย ${eg.avg_secs_engaged!=null?fmtSecs(eg.avg_secs_engaged):'—'} · ค่าเฉลี่ยสูงกว่าเพราะมีบางรอบเปิดค้างไว้นาน</small><small class="amute">นับเฉพาะเวลาที่หน้าเว็บเปิดอยู่บนจอ เบราว์เซอร์ส่งเวลาทุก 1 นาที หน้านี้ดึงใหม่ทุก 1 นาที · เป็นค่ากลางของทั้งช่วงที่เลือก เลือก “วันนี้” เพื่อดูตัวเลขที่ขยับเร็ว</small></div>`
      :`<div class="acard"><div class="ahead"><h3>คุณภาพการเข้าใช้งาน</h3></div><p class="amute">${eg&&eg.err==='missing'?'ยังไม่ได้ติดตั้งในฐานข้อมูล: รัน tools/admin/engagement.sql ใน Supabase SQL Editor':'โหลดข้อมูลส่วนนี้ไม่สำเร็จ กดรีเฟรชเพื่อลองใหม่'}</p></div>`;
    const fbCard=`<div class="acard"><div class="ahead"><h3>คำแนะนำจากผู้ใช้</h3>${newFb.length?`<span class="apill">ใหม่ ${newFb.length}</span>`:''}</div>
        ${newFb.length?newFb.slice(0,3).map(f=>`<div class="afb"><small>${esc(FB_TOPIC[f.topic]||f.topic)} · ${new Date(f.at).toLocaleDateString(LOC,{day:'numeric',month:'short'})}</small><p>${esc(f.message.slice(0,120))}${f.message.length>120?'…':''}</p></div>`).join(''):'<div class="aempty"><b>ไม่มีคำแนะนำใหม่</b><span>ไม่มีรายการในหมวดนี้</span></div>'}
        <button type="button" class="abtn" data-adtab="feedback">${newFb.length?'ดูทั้งหมด':'ดูสถานะอื่น'}</button></div>`;
    const topMon=mons[0],topSearch=(d.top_searches||[])[0],topView=views[0];
    const interest=`<div class="acard"><div class="ahead"><h3>เนื้อหาที่คนสนใจ</h3><small>${rl}</small></div>
        <div class="arow"><span>Aniimo อันดับ 1</span><b>${topMon?`<button type="button" class="alink" data-open="${topMon.key}">${esc(BY[topMon.key].th||BY[topMon.key].name)}</button> · ${fmtN(topMon.n)} ครั้ง`:'—'}</b></div>
        <div class="arow"><span>คำค้นยอดนิยม</span><b>${topSearch?`“${esc(topSearch.key)}” · ${fmtN(topSearch.n)} ครั้ง`:'—'}</b></div>
        <div class="arow"><span>หน้ายอดนิยม</span><b>${topView?`${esc(VIEWS.find(v=>v.id===topView.key).th)} · ${fmtN(topView.n)} ครั้ง`:'—'}</b></div></div>`;
    let app=null;if(AD.demo)app={installs:12,installs_all:31,app_users:24,app_users_all:40};else try{app=await sbRpc('stats_app',{days:AD.range})}catch(_){}
    const appRows=app?`<div class="arow"><span>ติดตั้งเป็นแอป (${rl})</span><b>${fmtN(app.installs)} คน</b></div><div class="arow"><span>เปิดใช้ผ่านแอป (${rl})</span><b>${fmtN(app.app_users)} คน</b></div>`:'<div class="arow"><span>ผู้ใช้แอป</span><b class="amute">รัน community.sql เพื่อเริ่มนับ</b></div>';
    const today=`<div class="acard"><div class="ahead"><h3>ข้อมูลวันนี้</h3><small>เวลาไทย</small></div>
        <div class="arow"><span>ผู้ใช้</span><b>${fmtN(d.today_visitors)} คน</b></div>
        <div class="arow"><span>เปิดหน้าเว็บ</span><b>${fmtN(d.today)} ครั้ง</b></div>${appRows}</div>`;
    const units='<p class="anote">คน = ผู้ใช้ไม่ซ้ำ (นับจากรหัสสุ่มของเบราว์เซอร์) · รอบ = การเข้าเว็บหนึ่งครั้ง จบเมื่อไม่มีการใช้งาน 30 นาที · ครั้ง = จำนวนการเปิดหน้า การเปิดดู หรือการค้นหา</p>';
    let body='';
    if(AD.tab==='usage')body=`<div class="acard"><div class="ahead"><h3>การเข้าชมรายวัน</h3><small>${rl} · แท่งสีอ่อนคือวันนี้ · ชี้ที่แท่งเพื่อดูจำนวนคน</small></div><div class="trend">${trendSvg(days)}</div></div>
      ${engagePanel(eg,rl)}
      <div class="agrid2">
        <div class="acard"><div class="ahead"><h3>หน้าที่เปิดมากที่สุด</h3><small>ครั้ง</small></div><div class="rank">${rankList(views,(r,pct)=>{const v=VIEWS.find(x=>x.id===r.key);return `<button type="button" class="rrow" data-go="${r.key}"><span class="ico"><svg><use href="#i-${v.ic}"/></svg></span><span class="nm">${esc(v.th)}</span>${bar(pct,r.n)}</button>`})}</div></div>
        <div class="acard"><div class="ahead"><h3>อุปกรณ์</h3><small>คน</small></div><div class="rank">${rankList(d.devices||[],(r,pct)=>plainRow(DEV_TH[r.key]||r.key,pct,r.n))}</div></div>
        <div class="acard"><div class="ahead"><h3>ภาษาและเขตเวลา</h3><small>คน</small></div><div class="rank">${rankList(d.langs||[],(r,pct)=>plainRow('ภาษา'+(LANG_TH[String(r.key).slice(0,2)]||' '+r.key),pct,r.n))}${rankList(d.zones||[],(r,pct)=>plainRow(String(r.key).replace('_',' '),pct,r.n))}</div></div>
      </div>`;
    else if(AD.tab==='search')body=`<div class="agrid2">
        <div class="acard"><div class="ahead"><h3>คำที่คนค้นหา</h3><small>ครั้ง</small></div><div class="rank">${rankList(d.top_searches||[],(r,pct)=>plainRow('"'+r.key+'"',pct,r.n))}</div></div>
        <div class="acard"><div class="ahead"><h3>Aniimo ที่คนเปิดดู</h3><small>ครั้ง</small></div><div class="rank">${rankList(mons,(r,pct)=>`<button type="button" class="rrow" data-open="${r.key}"><img src="${TH(BY[r.key].i)}" alt=""><span class="nm">${esc(BY[r.key].th||BY[r.key].name)}</span>${bar(pct,r.n)}</button>`)}</div></div>
        <div class="acard"><div class="ahead"><h3>ไอเท็มที่คนเปิดดู</h3><small>ครั้ง</small></div><div class="rank">${rankList(d.top_items||[],(r,pct)=>plainRow(r.key,pct,r.n))}</div></div>
      </div>`;
    else if(AD.tab==='feedback')body=feedbackPanel();
    else if(AD.tab==='posts')body=socialPosts();
    else if(AD.tab==='community'){if(!CMA.items)await cmaLoad();body=communityPanel()}
    else body=`<div class="akpis">
        ${kpi('ผู้ใช้',fmtN(d.visitors),'คน',`เปิดหน้าเว็บ ${fmtN(d.views)} ครั้ง`)}
        ${kpi('รอบการเข้าเว็บ',ok?fmtN(S):'—','รอบ',ok?`เฉลี่ย ${eg.avg_pages||0} หน้าต่อรอบ${eg.est_sessions?' · บางส่วนเป็นค่าประมาณ':''}`:'ยังไม่มีข้อมูล')}
        ${kpi('เปิดดู Aniimo',fmtN(d.mon_views),'ครั้ง',topMon?'อันดับ 1: '+esc(BY[topMon.key].th||BY[topMon.key].name):'—')}
        ${kpi('การค้นหา',fmtN(d.searches),'ครั้ง',topSearch?'คำยอดฮิต: '+esc(topSearch.key):'—')}
      </div>
      <div class="agrid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">${quality}${fbCard}</div>
      <div class="agrid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">${interest}${today}</div>`;
    const title={overview:'ภาพรวมเว็บไซต์',usage:'การใช้งาน',search:'การค้นหา',feedback:'คำแนะนำจากผู้ใช้',posts:'โพสต์โซเชียล',community:'ชุมชน'}[AD.tab]||'ภาพรวมเว็บไซต์';
    out.innerHTML=`<div class="adws">
      <aside class="aside"><div class="abrand"><b>aniiguide</b><small>ADMIN WORKSPACE</small></div>
        <nav>${tabs.map(([k,l,ic])=>`<button type="button" data-adtab="${k}" aria-current="${AD.tab===k}"><svg><use href="#i-${ic}"/></svg>${l}${k==='feedback'&&newFb.length?`<em>${newFb.length}</em>`:''}</button>`).join('')}</nav></aside>
      <div class="amain">
        ${AD.demo?'<div class="ademo"><b>ข้อมูลตัวอย่าง</b> ตัวเลขในหน้านี้สร้างขึ้นเพื่อดูหน้าตา ไม่ใช่ข้อมูลจริง</div>':''}
        <header class="atop"><div><p class="aeye">${(AD.tab||'overview').toUpperCase()}</p><h2>${title}</h2><p class="amute">ข้อมูล ${rl} · เวลาไทย</p></div><span class="apill">ผู้ดูแล</span></header>
        <div class="abarline">${range}${meta}</div>
        ${body}
        ${units}
      </div></div>`;
  }catch(e){
    if(e.message==='nologin')adminLogin('เซสชันหมดอายุ เข้าสู่ระบบอีกครั้ง');
    else if(e.message==='notowner'){adSave(null);adminLogin('บัญชีนี้ไม่มีสิทธิ์ดูหลังบ้าน')}
    else out.innerHTML=`<div class="dpanel"><h3>โหลดสถิติไม่สำเร็จ</h3><p class="muted">เชื่อมต่อฐานข้อมูลไม่ได้ ตรวจอินเทอร์เน็ตแล้วกดลองใหม่</p><div><button type="button" class="btn" id="adRefresh">ลองใหม่</button></div></div>`;
  }finally{AD.busy=false}
}
setInterval(()=>{if(current==='admin'&&!document.hidden&&AD.s&&!AD.demo&&!AD.busy&&document.querySelector('#adOut .adws'))renderAdmin(true)},60000);
let adTries=0;
document.addEventListener('submit',async e=>{if(e.target.id!=='adForm')return;e.preventDefault();
  const email=document.getElementById('adEmail').value.trim(),pw=document.getElementById('adPw').value,btn=document.getElementById('adGo');if(!email||!pw)return;
  btn.disabled=true;btn.textContent='กำลังเข้าสู่ระบบ…';if(adTries>=3)await sleep(Math.min(8000,1000*2**(adTries-3)));
  try{const remember=document.getElementById('adRemember').checked;const s=await sbAuth({email,password:pw},'password');adTries=0;adSave({...s,remember},remember);AD.demo=false;renderAdmin()}
  catch(err){adTries++;adminLogin(err.message==='badlogin'?'อีเมลหรือรหัสผ่านไม่ถูกต้อง':'เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง')}});
document.addEventListener('click',e=>{
  if(e.target.closest('#adDemo')){AD.demo=true;renderAdmin();return}
  if(e.target.closest('#adExitDemo')){AD.demo=false;renderAdmin();return}
  if(e.target.closest('#adRefresh')){renderAdmin();return}
  const ff=e.target.closest('#fbFilter [data-f]');if(ff){FB.filter=ff.dataset.f;refreshFeedback();return}
  const fa=e.target.closest('[data-fb]');if(fa){
    if(fa.dataset.s==='delete'&&!fa.dataset.sure){fa.dataset.sure='1';fa.textContent='กดอีกครั้งเพื่อลบ';return}
    const id=+fa.dataset.fb,s=fa.dataset.s;
    if(AD.demo){const i=DEMO_FB.findIndex(x=>x.id===id);if(i>=0){if(s==='delete')DEMO_FB.splice(i,1);else DEMO_FB[i].status=s}refreshFeedback();return}
    fa.disabled=true;sbRpc('feedback_set',{fid:id,new_status:s}).then(refreshFeedback).catch(()=>{fa.disabled=false;fa.textContent='ไม่สำเร็จ ลองใหม่'});return}
  if(e.target.closest('#adLogout')){if(AD.s)fetch(SB.url+'/auth/v1/logout',{method:'POST',headers:{apikey:SB.key,Authorization:'Bearer '+AD.s.access}}).catch(()=>{});adSave(null);renderAdmin();return}
  const r=e.target.closest('#adRange [data-r]');if(r){AD.range=+r.dataset.r;renderAdmin()}
  const at=e.target.closest('[data-adtab]');if(at){AD.tab=at.dataset.adtab;renderAdmin(true);return}
});

/* ===== Pathfinder duels & Sanctums (from the map data) ===== */
function withMap(fn){if(window.MAP){fn();return}const sc=document.createElement('script');sc.src='map.js?v=5e610bf3cd';sc.onload=fn;sc.onerror=()=>{};document.head.appendChild(sc)}
function regionAt(m){const x=m[1]/100,y=m[2]/100;return Object.keys(MAP.regions).find(n=>inPoly(x,y,MAP.regions[n]))||''}
const mapBtn=i=>`<button type="button" class="chip" data-mapm-go="${i}" style="cursor:pointer">ดูบนแผนที่</button>`;
const elBadges=a=>(a||[]).map(e=>badge(mEl(e))).join('');
const rwChips=a=>(a||[]).map(([n,q])=>`<span class="chip">${itemRef(n)} ×${Number(q).toLocaleString()}</span>`).join('');
function renderDuels(){
  const q=document.getElementById('duQ').value.trim().toLowerCase(),kind=document.getElementById('duKind').value,sort=document.getElementById('duSort').value;
  const rows=MAP.m.map((m,i)=>({m,i,o:MAP.info[m[3]]})).filter(x=>x.o.k==='pathfinder'||x.o.k==='elite-pathfinder').map(x=>({...x,region:regionAt(x.m),lv:Math.min(...(x.o.st||[{lv:99}]).map(s=>s.lv||99))}))
    .filter(x=>(!kind||x.o.k===kind)&&(!q||(x.region+' '+JSON.stringify(x.o.st)).toLowerCase().includes(q)))
    .sort((a,b)=>sort==='region'?a.region.localeCompare(b.region)||a.lv-b.lv:a.lv-b.lv);
  document.getElementById('duCount').textContent=`${rows.length} จุด`;
  document.getElementById('duGrid').innerHTML=rows.map(({i,o,region})=>`<article class="ducard"><h3>${o.k==='elite-pathfinder'?'<span class="chip elite">Elite</span>':''}${esc(region||'ไม่ทราบภูมิภาค')}</h3>
    ${(o.st||[]).map((s,k)=>`<div class="st"><b>ด่าน ${k+1}${s.lv?` · แนะนำ Lv. ${s.lv}`:''}</b>${s.rec&&s.rec.length?`<div class="rw"><small class="muted">ธาตุที่ได้เปรียบ</small> ${elBadges(s.rec)}</div>`:''}${s.rw&&s.rw.length?`<div class="rw">${rwChips(s.rw)}</div>`:''}</div>`).join('')}
    <div>${mapBtn(i)}</div></article>`).join('')||'<p class="muted">ไม่พบ</p>';
}
['duQ','duKind','duSort'].forEach(id=>document.getElementById(id).addEventListener(id==='duQ'?'input':'change',()=>window.MAP&&renderDuels()));
function renderSanctums(){
  const rows=MAP.m.map((m,i)=>({m,i,o:MAP.info[m[3]]})).filter(x=>x.o.k==='sanctum').map(x=>({...x,region:regionAt(x.m)})).sort((a,b)=>a.region.localeCompare(b.region));
  document.getElementById('scGrid').innerHTML=rows.map(({i,o,region})=>`<article class="ducard"><h3>${esc(o.t.replace(/^Sanctum: /,''))}</h3>
    <div class="rw"><span class="chip">${esc(region)}</span><span class="chip">${o.ch>1?`${o.ch} คน`:'เล่นคนเดียว'}</span><span class="chip">หีบ ${o.cht||0} ใบ</span></div>
    <p class="small muted">${esc(mTr(o.d))}</p><div>${mapBtn(i)}</div></article>`).join('');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-mapm-go]');if(!b)return;const m=MAP.m[+b.dataset.mapmGo];go('map');
  const f=()=>{MV.on.add(m[0]);mapLayersUI();const r=mapCv.getBoundingClientRect();mapCenter(m[1]/1e4,m[2]/1e4,fitScale()*4);mapShow(m)};if(MV.ready)f();else MV.pending=f});

/* ===== egg hunt (egg spawns from the Idyll map data) ===== */
let egKind='';
const eggLayer=()=>MAP.layers.findIndex(l=>l.id==='type_Egg');
function renderEggs(){
  const ek=ITEMS.filter(i=>/Egg/.test(i.c));document.getElementById('egKinds').textContent=' '+ek.length+' แบบ';document.getElementById('egItems').innerHTML=ek.map(i=>itemCard(i)).join('');
  const L=eggLayer(),rows=MAP.m.filter(m=>m[0]===L).map(m=>({t:MAP.info[m[3]].t,region:regionAt(m)}));
  document.getElementById('egTotal').textContent=rows.length.toLocaleString();
  const kinds={};rows.forEach(r=>kinds[r.t]=(kinds[r.t]||0)+1);
  document.getElementById('egSeg').innerHTML=[['',rows.length],...Object.entries(kinds).sort((a,b)=>b[1]-a[1])].map(([k,n])=>`<button type="button" data-egk="${esc(k)}" aria-pressed="${k===egKind}">${k?esc(k):'ทุกชนิด'} <small>${n}</small></button>`).join('');
  const by={};rows.filter(r=>!egKind||r.t===egKind).forEach(r=>{const g=by[r.region||'']=by[r.region||'']||{};g[r.t]=(g[r.t]||0)+1});
  const total=g=>Object.values(g).reduce((a,b)=>a+b,0);
  document.getElementById('egGrid').innerHTML=Object.entries(by).sort((a,b)=>total(b[1])-total(a[1])).map(([region,g])=>`<article class="ducard"><h3>${esc(region||'ไม่ทราบภูมิภาค')}<span class="chip">${total(g)} จุด</span></h3>
    <div class="rw">${Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`<span class="chip">${itemRef(t)} ×${n}</span>`).join('')}</div>
    ${region?`<div><button type="button" class="chip" data-eggmap="${esc(region)}" style="cursor:pointer">ดูบนแผนที่</button></div>`:''}</article>`).join('')||'<p class="muted">ไม่พบ</p>';
}
// open the map with only the egg layer on (not saved as the visitor's layer choice)
function eggMap(region){go('map');const f=()=>{MV.on=new Set([eggLayer()]);mapLayersUI();if(region){mapFocusRegion(region);document.getElementById('mapInfo').hidden=true}else mapFit()};if(MV.ready)f();else MV.pending=f}
document.addEventListener('click',e=>{
  const k=e.target.closest('[data-egk]');if(k){egKind=k.dataset.egk;renderEggs();return}
  const b=e.target.closest('[data-eggmap]');if(b){withMap(()=>eggMap(b.dataset.eggmap))}
});

/* ===== Egg Heist maps: Lost Isles island and Lost Sanctum layouts (heist.js, AniiLog data used with permission) ===== */
const HV={mode:'island',diff:'normal',lay:'',on:{},x:0,y:0,s:1,imgs:{},bg:{},ico:null,ready:false,booting:false,sel:null};
let hvCv,hvCtx;
const hvTr=t=>(t&&LANG==='th'&&window.HEIST&&HEIST.th[t])||t||'';
function renderHeist(){
  const hg=document.getElementById('hgList');if(hg&&!hg.innerHTML)hg.innerHTML=[['Gear','อุปกรณ์'],['Chip','ชิป'],['Repair Item','ของซ่อม']].map(([c,l])=>{const list=ITEMS.filter(i=>i.c===c);return `<details class="more"${c==='Gear'?' open':''}><summary>${l} ${list.length} ชิ้น</summary><div class="igrid">${list.map(i=>itemCard(i)).join('')}</div></details>`}).join('');
  hvCv=document.getElementById('hvCv');hvCtx=hvCv.getContext('2d');
  if(HV.ready){setTimeout(hvSize,0);return}if(HV.booting)return;HV.booting=true;
  const fail=()=>{document.getElementById('hvLoad').textContent='โหลดแผนที่ไม่สำเร็จ'};
  const sc=document.createElement('script');sc.src='heist.js?v=5e610bf3cd';sc.onerror=fail;
  sc.onload=()=>{const ico=new Image();ico.onerror=fail;ico.onload=()=>{
    HV.ico=ico;HV.ready=true;
    const busy=new Set(['egg_lesser_chest','egg_loot_pile','sanctum_chest','sanctum_loot_pile']); // plain chests and piles crowd the map; off at first
    HV.on.island=new Set(HEIST.island.layers.map((l,i)=>busy.has(l.id)?-1:i).filter(i=>i>=0));
    HV.on.sanctum=new Set(HEIST.slayers.map((l,i)=>busy.has(l.id)?-1:i).filter(i=>i>=0));
    hvSetDiff('normal');hvShow()};ico.src='heist/icons.webp'};
  document.head.appendChild(sc);
}
function hvMap(){ // the map on screen: image, layers, markers after the difficulty filter
  if(HV.mode==='island'){const I=HEIST.island;return {src:'heist/island.webp',w:I.w,h:I.h,layers:I.layers,m:I.m,on:HV.on.island}}
  const L=HEIST.layouts[HV.lay];return {src:`heist/s/${HV.lay}.webp`,w:L.w,h:L.h,layers:HEIST.slayers,m:L.m.filter(r=>!r[4]||r[4].includes(HV.diff)),on:HV.on.sanctum};
}
function hvShow(){
  const M=hvMap(),load=document.getElementById('hvLoad');HV.sel=null;document.getElementById('hvInfo').hidden=true;hvUI();
  const show=()=>{load.hidden=true;hvSize();hvFit()};
  if(HV.imgs[M.src]){show();return}
  load.hidden=false;load.innerHTML='<span class="spin"></span>กำลังโหลดแผนที่…';
  const img=new Image();img.onload=()=>{HV.imgs[M.src]=img;
    try{const t=document.createElement('canvas');t.width=t.height=1;const x=t.getContext('2d');x.drawImage(img,0,0,4,4,0,0,1,1);const d=x.getImageData(0,0,1,1).data;HV.bg[M.src]=`rgb(${d[0]},${d[1]},${d[2]})`}catch(_){}
    if(hvMap().src===M.src)show()};
  img.onerror=()=>{load.textContent='โหลดภาพแผนที่ไม่สำเร็จ'};img.src=M.src;
}
function hvSetDiff(k){
  HV.diff=k;const D=HEIST.diffs.find(d=>d.k===k),tot=D.lay.reduce((a,[,w])=>a+w,0);
  if(!D.lay.some(([id])=>id===HV.lay))HV.lay=D.lay[0][0];
  document.getElementById('hvDiff').innerHTML=HEIST.diffs.map(d=>`<button type="button" data-hvdiff="${d.k}" aria-pressed="${d.k===k}">${esc(d.n)}</button>`).join('');
  document.getElementById('hvKey').textContent=`เปิดด้วย ${D.key} · ห้องสุ่ม 1 จาก ${D.lay.length} แบบทุกรอบ`;
  document.getElementById('hvLays').innerHTML=D.lay.map(([id,w])=>`<button type="button" data-hvlay="${id}" aria-pressed="${id===HV.lay}"><img src="heist/s/${id}.webp" alt="" loading="lazy"><span>No. ${HEIST.layouts[id].n}<small>${Math.round(w/tot*100)}%</small></span></button>`).join('');
}
function hvUI(){
  document.getElementById('hvSanctumBar').hidden=HV.mode!=='sanctum';
  document.querySelectorAll('#hvMode [data-hvmode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.hvmode===HV.mode));
  const M=hvMap(),count=M.layers.map(()=>0);M.m.forEach(r=>count[r[0]]++);
  const cats=[];M.layers.forEach((l,i)=>{if(!count[i])return;let c=cats.find(c=>c.n===l.c);if(!c)cats.push(c={n:l.c,th:l.cth,ls:[]});c.ls.push(i)});
  const ic=l=>`background-image:url(heist/icons.webp);background-position:${-(l.ic*22)}px 0;background-size:${HEIST.icons*22}px 22px`;
  document.getElementById('hvLayers').innerHTML=cats.map(c=>`<details class="lcat" open><summary>${esc(LANG==='th'?c.th:c.n)} <small>${c.ls.filter(i=>M.on.has(i)).length}/${c.ls.length}</small></summary>
    ${c.ls.map(i=>{const l=M.layers[i];return `<label class="lrow"><input type="checkbox" data-hvlayer="${i}"${M.on.has(i)?' checked':''}><i style="${ic(l)}"></i>${esc(LANG==='th'?l.th:l.n)}<small>${count[i]}</small></label>`}).join('')}</details>`).join('');
}
function hvSize(){if(!hvCv)return;const st=document.getElementById('hvStage');if(HV.ready){const M=hvMap(),w=st.clientWidth;st.style.height=Math.round(Math.max(300,Math.min(innerHeight*.75,w*M.h/M.w)))+'px'}const r=hvCv.getBoundingClientRect(),d=window.devicePixelRatio||1;hvCv.width=Math.max(1,r.width*d|0);hvCv.height=Math.max(1,r.height*d|0);hvDraw()}
const hvFitS=()=>{const M=hvMap();return Math.min(hvCv.clientWidth/M.w,hvCv.clientHeight/M.h)};
function hvFit(){const M=hvMap();HV.s=hvFitS();HV.x=(hvCv.clientWidth-M.w*HV.s)/2;HV.y=(hvCv.clientHeight-M.h*HV.s)/2;hvDraw()}
function hvZoom(f,cx,cy){if(cx==null){cx=hvCv.clientWidth/2;cy=hvCv.clientHeight/2}const fit=hvFitS(),ns=Math.max(fit*.9,Math.min(fit*8,HV.s*f));f=ns/HV.s;HV.x=cx-(cx-HV.x)*f;HV.y=cy-(cy-HV.y)*f;HV.s=ns;hvDraw()}
function hvVisible(){const M=hvMap();return M.m.filter(r=>M.on.has(r[0]))}
function hvDraw(){
  if(!HV.ready||!hvCtx)return;const M=hvMap(),img=HV.imgs[M.src],d=window.devicePixelRatio||1,c=hvCtx;
  c.setTransform(d,0,0,d,0,0);c.fillStyle=HV.bg[M.src]||'#141018';c.fillRect(0,0,hvCv.clientWidth,hvCv.clientHeight);if(!img)return;
  c.imageSmoothingQuality='high';c.drawImage(img,HV.x,HV.y,M.w*HV.s,M.h*HV.s);
  const z=(hvCv.clientWidth<520?.75:1)*(HV.mode==='island'?26:22),cell=HEIST.cell;
  for(const r of hvVisible()){const X=HV.x+r[1]/1e4*M.w*HV.s,Y=HV.y+r[2]/1e4*M.h*HV.s,l=M.layers[r[0]];
    if(HV.sel===r){c.beginPath();c.arc(X,Y,z*.75,0,7);c.fillStyle='rgba(255,255,255,.9)';c.fill()}
    c.drawImage(HV.ico,l.ic*cell,0,cell,cell,X-z/2,Y-z/2,z,z)}
}
function hvHit(px,py){const M=hvMap(),v=hvVisible();let best=null,bd=16*16;
  for(const r of v){const dx=HV.x+r[1]/1e4*M.w*HV.s-px,dy=HV.y+r[2]/1e4*M.h*HV.s-py,dd=dx*dx+dy*dy;if(dd<bd){bd=dd;best=r}}return best}
function hvInfo(r){
  const box=document.getElementById('hvInfo');HV.sel=r;hvDraw();if(!r){box.hidden=true;return}
  const M=hvMap(),l=M.layers[r[0]],o=HEIST.info[r[3]];
  box.innerHTML=`<button type="button" class="x" data-hvclose aria-label="ปิด">×</button><h3>${esc(o.t===l.n?(LANG==='th'?l.th:l.n):hvTr(o.t))}</h3><span class="muted small">${esc(LANG==='th'?l.th:l.n)}${r[4]?` · ${r[4].map(k=>(HEIST.diffs.find(d=>d.k===k)||{}).n||k).join(' / ')}`:''}</span>
    ${o.d?`<p>${esc(hvTr(o.d))}</p>`:''}${o.sp?`<div class="rw">${o.sp.map(([n,p])=>`<span class="chip">${esc(n)}${p!=null?` · ${p}%`:''}</span>`).join('')}</div>`:''}`;
  box.hidden=false;
}
{ // pan with one pointer, pinch with two, tap to pick a marker
  const pts=new Map();let moved=0,pinch=null;
  const cv=document.getElementById('hvCv');
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=0;
    if(pts.size===2){const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)}}cv.classList.add('drag')});
  cv.addEventListener('pointermove',e=>{const p=pts.get(e.pointerId);if(!p||!HV.ready)return;
    if(pts.size===2&&pinch){p.x=e.clientX;p.y=e.clientY;const [a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y),r=cv.getBoundingClientRect();hvZoom(d/pinch.d,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);pinch.d=d;moved=99;return}
    const dx=e.clientX-p.x,dy=e.clientY-p.y;moved+=Math.abs(dx)+Math.abs(dy);HV.x+=dx;HV.y+=dy;p.x=e.clientX;p.y=e.clientY;hvDraw()});
  const up=e=>{if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);if(pts.size<2)pinch=null;if(!pts.size)cv.classList.remove('drag');
    if(moved<6&&HV.ready){const r=cv.getBoundingClientRect();hvInfo(hvHit(e.clientX-r.left,e.clientY-r.top))}};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  cv.addEventListener('wheel',e=>{if(!HV.ready)return;e.preventDefault();const r=cv.getBoundingClientRect();hvZoom(e.deltaY<0?1.2:1/1.2,e.clientX-r.left,e.clientY-r.top)},{passive:false});
}
document.addEventListener('click',e=>{
  let b=e.target.closest('[data-hvmode]');if(b&&HV.ready){HV.mode=b.dataset.hvmode;hvShow();return}
  b=e.target.closest('[data-hvdiff]');if(b){hvSetDiff(b.dataset.hvdiff);hvShow();return}
  b=e.target.closest('[data-hvlay]');if(b){HV.lay=b.dataset.hvlay;hvSetDiff(HV.diff);hvShow();return}
  b=e.target.closest('[data-hvz]');if(b&&HV.ready){b.dataset.hvz==='fit'?hvFit():hvZoom(+b.dataset.hvz);return}
  if(e.target.closest('[data-hvclose]'))hvInfo(null);
});
document.addEventListener('change',e=>{const b=e.target.closest('[data-hvlayer]');if(!b)return;const M=hvMap(),i=+b.dataset.hvlayer;b.checked?M.on.add(i):M.on.delete(i);hvUI();hvDraw()});
addEventListener('resize',()=>{if(current==='heist'&&HV.ready)hvSize()});

/* ===== daily & weekly checklist (ticks per reset period; this browser, plus cloud sync when set up) ===== */
const DAILY_LIST=[
 {id:'act',t:'Daily Activity ให้ถึง 500 แต้ม',n:'ล็อกอิน ใช้ Primegy 60 จับ Aniimo 5 ตัว ถ่ายรูป Aniimo 1 รูป เก็บ Season Stamp 50 และซื้อของ 1 ชิ้น ได้ไข่ Incredible Egg, Aniipod และ Glimmer'},
 {id:'pack',t:'รับ Daily Supply Pack',n:'ใช้ Primegy 50 ได้ Safari 250 และวัสดุ (ยศ Student III ขึ้นไป)'},
 {id:'primegy',t:'ใช้ Primegy อย่าให้เต็ม',n:'ฟื้น 1 หน่วยทุก 6 นาที เต็มที่ 300 ใช้กับบอส Alpha หรือหีบ Holo-Battle Sim'},
 {id:'home',t:'Homeland: เก็บผลผลิตและส่งคำสั่งซื้อ',n:'คำสั่งซื้อรีเฟรช 03:00 และ 15:00 น. เวลาไทย เช็กอาหารของคนงานด้วย ไม่อย่างนั้นจะผลิตช้าลง',go:'homeland'},
 {id:'hatch',t:'Hatchinator: เก็บตัวที่ฟักแล้ว ใส่ไข่ใหม่ และลูบไข่',n:'ลูบไข่ทุกวันช่วยให้ฟักเร็วขึ้น',go:'eggs'},
 {id:'vendor',t:'ดู Mysterious Vendor และ Curio Corner',n:'ของเปลี่ยนทุกวัน Curio Corner รีเฟรชฟรีได้ 1 ครั้ง'},
 {id:'nurture',t:'Nurture ฟรี 3 ครั้ง',n:'ที่ Nurturing Bloom (ผ่าน Breezy Plains Branch)'},
 {id:'heist',t:'Operation: Egg Heist 1 รอบ',n:'หนีสำเร็จครั้งแรกของวันได้คะแนนระดับ 2 เท่า',go:'heist'},
 {id:'tea',t:'Star-Crossed Tea Party',n:'เปิด 17:00–01:00 น. เวลาไทย นั่งในร้านเพื่อรับ Voxel Coin และ Stamp'},
 {id:'friends',t:'เพิ่ม Affinity กับเพื่อน',n:'คุยหรือให้ของขวัญ ได้สูงสุด 100 แต้มต่อวัน'},
 {id:'codes',t:'เช็กโค้ดแลกของใหม่',n:'กดดูโค้ดล่าสุดในเว็บนี้',go:'codes'}];
const WEEKLY_LIST=[
 {id:'boss',t:'บอส Alpha / Omega 3 ครั้ง',n:'ครั้งละ Primegy 50 ได้วัสดุ Resonance และ Capability Awakening',go:'bosses'},
 {id:'stamp',t:'Season Stamp ให้ถึง 1,000',n:'เพดานต่อสัปดาห์ ได้จาก Daily Activity และกิจกรรมต่าง ๆ'},
 {id:'sim',t:'Holo-Battle Sim รับ Training Incentives',n:'รางวัลรีเฟรชทุกสัปดาห์ เคลียร์ระดับยากสุดแล้วรับของระดับต่ำกว่าได้หมด',go:'systems'},
 {id:'interlink',t:'Holo-Battle Interlink',n:'เปิดพฤหัส 03:00 – จันทร์ 02:59 น. เก็บดาวให้ครบก่อนปิด',go:'systems'},
 {id:'companion',t:'Companion Handbook',n:'ใช้ Primegy 200 จับ 30 ตัว และล็อกอิน 3 วัน'},
 {id:'iris',t:'เก็บ Iris Petal ประจำสัปดาห์',n:'Legendary Journey: Irisalis ถึง 10 ธ.ค.',until:'2026-12-10'},
 {id:'claw',t:'Super Claw: Aniipod จำกัดรายสัปดาห์',n:'Aniipod Hyper และ Aniipod Track ที่ Astra'},
 {id:'haste',t:'ฟักไข่ช่วง Hatch Haste',n:'ศุกร์–อาทิตย์ เวลาฟักลดครึ่งหนึ่ง ใส่ไข่ที่ฟักนานไว้ช่วงนี้'}];
function lastReset(now,weekly){const d=new Date(now+SRV.tz*3600000);let t=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),SRV.reset)-SRV.tz*3600000;if(t>now)t-=86400000;
  if(weekly){const wd=new Date(t+SRV.tz*3600000).getUTCDay();t-=((wd+6)%7)*86400000}return t}
let DL={};try{DL=JSON.parse(localStorage.getItem('aniimo-daily')||'{}')}catch(_){}
function dlState(){const now=Date.now(),d=lastReset(now),w=lastReset(now,true);
  if(!DL.d||DL.d.p!==d)DL.d={p:d,done:{}};if(!DL.w||DL.w.p!==w)DL.w={p:w,done:{}};return DL}
function dlSave(){try{localStorage.setItem('aniimo-daily',JSON.stringify(DL))}catch(_){}if(typeof syncPush==='function')syncPush()}
function renderDaily2(){
  const st=dlState(),now=Date.now(),nextW=lastReset(now,true)+7*86400000;
  const col=(title,list,k,next)=>{const items=list.filter(x=>!x.until||now<Date.parse(x.until+'T00:00:00+07:00')),done=items.filter(x=>st[k].done[x.id]).length;
    return `<div class="dpanel dlcol"><h3>${title}<small>${done}/${items.length} · ล้างใน ${fmtLeft(next-now)}</small></h3><div class="dlbar"><i style="width:${items.length?done/items.length*100:0}%"></i></div>
     <ul class="checklist">${items.map(x=>`<li class="${st[k].done[x.id]?'done':''}"><input type="checkbox" data-dl="${k}:${x.id}"${st[k].done[x.id]?' checked':''} aria-label="ทำแล้ว"><div><b>${esc(x.t)}</b><br><span class="small muted">${esc(x.n)}</span>${x.go?` <button type="button" class="itemlink small" data-go="${x.go}">ไปที่หน้า</button>`:''}</div></li>`).join('')}</ul></div>`};
  document.getElementById('dlBoard').innerHTML=col('รายวัน',DAILY_LIST,'d',nextDailyReset(now))+col('รายสัปดาห์',WEEKLY_LIST,'w',nextW);
  if(typeof syncBox==='function')syncBox('syncBoxDaily');
}
document.addEventListener('change',e=>{const c=e.target.closest('[data-dl]');if(!c)return;const [k,id]=c.dataset.dl.split(':');dlState();if(c.checked)DL[k].done[id]=1;else delete DL[k].done[id];dlSave();
  const all=(k==='d'?DAILY_LIST:WEEKLY_LIST).filter(x=>!x.until||Date.now()<Date.parse(x.until+'T00:00:00+07:00')).every(x=>DL[k].done[x.id]);
  renderDaily2();if(c.checked&&all){toast(k==='d'?'ครบทุกงานของวันนี้แล้ว เก่งมาก!':'ครบงานรายสัปดาห์แล้ว!');burst(innerWidth/2,innerHeight/2,30)}});
setInterval(()=>{if(current==='daily'&&!document.hidden)renderDaily2()},60000);

/* ===== Held Items & Runes ===== */
const HELD_FX={},HELD_BY={};A.forEach(a=>(a.it||[]).forEach(([n,d])=>{HELD_FX[n]=d;(HELD_BY[n]=HELD_BY[n]||[]).push(a)}));
function renderHeld(){
  const q=(document.getElementById('hiQ').value||'').trim().toLowerCase(),ql=document.getElementById('hiQual').value;
  const held=ITEMS.filter(i=>i.c==='Held Item'&&(!ql||i.q===ql)&&(!q||(i.n+' '+(HELD_FX[i.n]||'')+' '+tr(HELD_FX[i.n]||'')).toLowerCase().includes(q)))
    .sort((a,b)=>(HELD_BY[b.n]||[]).length-(HELD_BY[a.n]||[]).length);
  document.getElementById('hiGrid').innerHTML=held.map(i=>{const by=HELD_BY[i.n]||[],fx=HELD_FX[i.n];
    return itemCard(fx&&!i.d?{...i,d:fx}:i,false,by.length?`<div><p class="eyebrow" style="margin-bottom:6px">เว็บแนะนำให้ ${by.length} ตัวถือ</p><div class="rmons">${by.slice(0,10).map(a=>`<button type="button" data-open="${a.slug}"><img decoding="async" loading="lazy" src="${TH(a.i)}" alt="">${esc(a.name)}</button>`).join('')}</div></div>`:'')}).join('')||'<p class="muted">ไม่พบ</p>';
  const runes=ITEMS.filter(i=>i.c==='Held Item - Rune'&&(!q||i.n.toLowerCase().includes(q))&&(!ql||i.q===ql)),groups={};
  runes.forEach(i=>{const k=i.n.replace(/^(Common|Uncommon|Rare|Epic|Legendary|Advanced|Superior|Basic|Elite|Perfect|Premium)\s+/i,'').replace(/\s*Rune.*$/i,'')||'อื่น ๆ';(groups[k]=groups[k]||[]).push(i)});
  document.getElementById('hiRunes').innerHTML=Object.entries(groups).sort().map(([k,list])=>`<div class="rune"><b>${esc(k)}</b><div>${list.map(i=>`<span class="chip">${itemRef(i.n)} <small class="muted">${esc(Q_TH[i.q]||i.q)}</small></span>`).join('')}</div><small class="muted">หาได้จาก: ${esc([...new Set(list.flatMap(i=>i.src.map(x=>srcLabel(x[1]||x[0]))))].slice(0,4).join(' · ')||'—')}</small></div>`).join('')||'<p class="muted">ไม่พบ</p>';
}
['hiQ','hiQual'].forEach(id=>document.getElementById(id).addEventListener(id==='hiQ'?'input':'change',renderHeld));

/* ===== Homeland work ===== */
let hmJob='';
function renderHome2(){
  const jobs={};A.forEach(a=>(a.w||[]).forEach(([k,l])=>{(jobs[k]=jobs[k]||[]).push({a,l})}));
  const keys=Object.keys(jobs).sort((x,y)=>jobs[y].length-jobs[x].length);if(!hmJob)hmJob=keys[0];
  const lab=k=>LANG==='en'?(EK[k.toLowerCase()]?k+' work':k):WORK_TH[k]||('งานธาตุ'+(EK[k.toLowerCase()]?EK[k.toLowerCase()].th:k));
  document.getElementById('hmSeg').innerHTML=keys.map(k=>`<button type="button" data-hm="${esc(k)}" aria-pressed="${k===hmJob}">${esc(lab(k))} <small>${jobs[k].length}</small></button>`).join('');
  const list=jobs[hmJob].sort((x,y)=>y.l-x.l||(TIER_PTS[TIERMAP[y.a.slug]]??0)-(TIER_PTS[TIERMAP[x.a.slug]]??0));
  document.getElementById('hmGrid').innerHTML=[...new Set(list.map(x=>x.l))].map(l=>`<div class="gsec"><h3>${esc(lab(hmJob))} Lv. ${l}<small class="muted"> ${list.filter(x=>x.l===l).length} ตัว</small></h3><div class="rmons">${list.filter(x=>x.l===l).map(({a})=>`<button type="button" data-open="${a.slug}"><img decoding="async" loading="lazy" src="${TH(a.i)}" alt="">${esc(a.name)} <small>${(a.w||[]).filter(w=>w[0]!==hmJob).map(w=>esc(lab(w[0]))+' '+w[1]).join(', ')}</small></button>`).join('')}</div></div>`).join('');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-hm]');if(b){hmJob=b.dataset.hm;renderHome2()}});

/* ===== buffs & food ===== */
const BF_KIND=[['break','BREAK',/BREAK/],['dmg','ดาเมจ',/damage|DMG|ATK|attack/i],['def','ป้องกัน',/DEF|defen|shield|resist/i],['hp','HP และฮีล',/HP|heal|recover|restor|regen/i],['move','เคลื่อนที่และสำรวจ',/speed|stamina|jump|glide|swim|move/i],['other','อื่น ๆ',/./]];
let bfKind='';
function bfOf(i){const t=i.d||'';for(const [k,,re] of BF_KIND)if(re.test(t))return k;return 'other'}
function renderBuffs(){
  const list=ITEMS.filter(i=>['Buff','Aniimo Food','Heal','Throwable - Beneficial'].includes(i.c));
  const cnt={};list.forEach(i=>{const k=bfOf(i);cnt[k]=(cnt[k]||0)+1});
  document.getElementById('bfSeg').innerHTML=[['','ทั้งหมด'],...BF_KIND.map(([k,l])=>[k,l])].filter(([k])=>!k||cnt[k]).map(([k,l])=>`<button type="button" data-bf="${k}" aria-pressed="${k===bfKind}">${l} <small>${k?cnt[k]:list.length}</small></button>`).join('');
  document.getElementById('bfGrid').innerHTML=list.filter(i=>!bfKind||bfOf(i)===bfKind).map(i=>itemCard(i)).join('');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-bf]');if(b){bfKind=b.dataset.bf;renderBuffs()}});

/* ===== cosmetics ===== */
const OUTFITS=[
 ['Sunlit Meadow','รางวัลลงทะเบียนล่วงหน้า ได้ทุกคนที่เข้าเกมช่วงเปิดตัว (ยอดลงทะเบียนเกิน 40 ล้าน)'],
 ['ชุดฟรี 4 ชุด','ได้จากเนื้อเรื่อง กิจกรรมในบ้าน และการล็อกอินสะสม (ประกาศเปิดเกมบนมือถือ)'],
 ['Radiant Waveglow','ชุดใหม่ในอัปเดต 1.1 ราคา 980 Lumin Crystal ที่ Shop - Featured'],
 ['Laurel Moon Blessing','แพ็ก 280 Lumin Crystal มีเฟอร์นิเจอร์ Floral Moon Jukebox และเครื่องประดับ Laurel Lantern'],
 ['Emberpup Set','ได้ทันทีเมื่อปลดล็อกอีเวนต์ Set Off Together! (เติมเงินจำนวนใดก็ได้)'],
 ['เครื่องประดับ Aniimo','สะสม Aniimo ให้ถึงเป้าใน Aniilog และซื้อที่ร้าน Lumen ใน Astra (300 Voxel Coin)']];
function renderCos(){
  document.getElementById('cosOutfits').innerHTML=OUTFITS.map(([n,d])=>`<article class="card"><h3>${esc(n)}</h3><p>${esc(d)}</p></article>`).join('');
  document.getElementById('cosGrid').innerHTML=ITEMS.filter(i=>i.c==='Appearance').map(i=>itemCard(i)).join('');
}

/* ===== Whisperwake Isles (coming area; content.js WHISPERWAKE) ===== */
const WW=window.WHISPERWAKE||{slugs:[],confirmed:[],datamined:[],prep:[],sources:[]};
const WW_OPEN=WW.opens?Date.parse(WW.opens):0;
function renderWWCountdown(){
  const now=Date.now(),el=document.getElementById('wwCountdown');if(!el||!WW_OPEN)return;
  el.innerHTML=now<WW_OPEN?`<p class="eyebrow">เปิดในอีก</p><b>${fmtLeft(WW_OPEN-now)}</b><span>${thTime(WW_OPEN)} เวลาไทย · หลังปิดปรับปรุง</span><div><button type="button" class="btn" data-ics-ev="Whisperwake Isles เปิด (Aniimo)|${WW_OPEN}|${WW_OPEN+3600e3}">📅 เพิ่มลงปฏิทิน</button></div>`
    :`<p class="eyebrow">เปิดแล้ว</p><b>Whisperwake Isles</b><span>เปิดเมื่อ ${thTime(WW_OPEN)} เวลาไทย ข้อมูลในหน้านี้อาจยังไม่ตรงกับเกม</span>`;
}
function renderWW(){
  renderWWCountdown();
  const li=t=>`<li>${esc(t)}</li>`;
  document.getElementById('wwConfirmed').innerHTML=WW.confirmed.map(li).join('');
  document.getElementById('wwDatamined').innerHTML=WW.datamined.map(li).join('');
  const roster=WW.slugs.map(s=>BY[s]).filter(Boolean);
  document.getElementById('wwGrid').innerHTML=roster.map(a=>`<button class="mon" type="button" data-open="${a.slug}"><span class="flag un">${a.u?'เร็ว ๆ นี้':'เปิดแล้ว'}</span>
    <span class="pic"><img decoding="async" src="${TH(a.i)}" alt="${esc(a.name)}" loading="lazy" class="${a.cut?'cut':''}"></span>
    <span class="info"><span class="no">${numLabel(a)}</span><span class="nm">${esc(a.name)}</span><span class="row">${a.e.map(badge).join('')}</span></span></button>`).join('');
  // how many of the new species each attacking element hits for more than ×1
  const els=E.map(({k})=>({k,hit:roster.filter(a=>a.e.reduce((v,d)=>v*mult(k,d),1)>1).length,res:roster.filter(a=>a.e.reduce((v,d)=>v*mult(k,d),1)<1).length})).sort((x,y)=>y.hit-x.hit||x.res-y.res);
  const best=els.filter(x=>x.hit).slice(0,3).map(x=>x.k);
  document.getElementById('wwElNote').textContent=`นับจาก Aniimo ใหม่ ${roster.length} ชนิด ว่าสกิลแต่ละธาตุตีแรงขึ้น (×1.6 ขึ้นไป) หรือโดนต้าน กี่ชนิด`;
  document.getElementById('wwEl').innerHTML=els.map(x=>`<div class="row"><span>${badge(x.k)}</span><span class="bar"><i style="width:${roster.length?x.hit/roster.length*100:0}%;background:var(--${x.k})"></i></span><small>ได้เปรียบ ${x.hit} · โดนต้าน ${x.res}</small></div>`).join('');
  document.getElementById('wwSugs').innerHTML=best.length?`<p class="eyebrow" style="grid-column:1/-1;margin:6px 0 0">Aniimo ที่มีตอนนี้และมีสกิล${best.map(k=>EK[k].th).join(' / ')}</p>`+counterList(null,best):'';
  document.getElementById('wwPrep').innerHTML=WW.prep.map(([h,t])=>`<article class="card"><h3>${esc(h)}</h3><p>${esc(t)}</p></article>`).join('');
  document.getElementById('wwSources').innerHTML=WW.sources.map(([t,u])=>`<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('');
}
setInterval(()=>{if(current==='whisperwake'&&!document.hidden)renderWWCountdown()},60000);

/* ===== news, media, FAQ, glossary (content.js) ===== */
const NEWS=(window.NEWS||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)),FAQ=window.FAQ||[],GLOSS=window.GLOSSARY||[],VIDEOS=window.VIDEOS||[],ROAD=window.ROADMAP||[],OLINKS=window.LINKS||[];
const NTYPE={update:'อัปเดตใหญ่',patch:'แพตช์โน้ต',news:'ประกาศ'};
const RTAG={official:'<span class="rtag official">ทางการ</span>',community:'<span class="rtag community">จากผู้เล่น</span>'};
const thDate=(iso,o)=>new Date(iso+'T00:00:00+07:00').toLocaleDateString(LOC,o||{day:'numeric',month:'short',year:'numeric'});
let newsKind='';
function renderNews(openId){
  const list=document.getElementById('newsList'),art=document.getElementById('newsArticle'),seg=document.getElementById('newsSeg');
  const n=openId&&NEWS.find(x=>x.id===openId);
  list.hidden=!!n;seg.hidden=!!n;art.hidden=!n;
  if(n){
    art.innerHTML=`<div><button type="button" class="btn" id="newsBack">← ข่าวทั้งหมด</button></div>
     <div class="meta"><span class="ntype ${n.type}">${NTYPE[n.type]}</span>${RTAG[n.tag]||''}<span class="dnote">${thDate(n.date)}</span></div>
     <h2>${esc(n.title)}</h2><p class="lede">${esc(n.lede)}</p>
     ${n.sections.map(sec=>`<section><h3>${esc(sec.h)}</h3><ul>${sec.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></section>`).join('')}
     <p class="dnote">ที่มา: <a href="${esc(n.source)}" target="_blank" rel="noopener">ประกาศทางการ ↗</a> · สรุปและแปลโดยเว็บนี้ รายละเอียดทั้งหมดอ่านได้ที่ต้นฉบับ</p>`;
    window.scrollTo({top:0});return;
  }
  list.innerHTML=NEWS.slice().sort((x,y)=>y.date.localeCompare(x.date)).filter(x=>!newsKind||x.type===newsKind).map(x=>{const d=new Date(x.date+'T00:00:00+07:00');return `<button type="button" class="ncard" data-news="${x.id}">
    <span class="dt"><b>${d.getDate()}</b><small>${d.toLocaleDateString(LOC,{month:'short',year:'2-digit'})}</small></span>
    <span><span class="meta"><span class="ntype ${x.type}">${NTYPE[x.type]}</span>${RTAG[x.tag]||''}</span><h3>${esc(x.title)}</h3><p>${esc(x.lede)}</p></span></button>`}).join('');
}
document.getElementById('newsSeg').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;newsKind=b.dataset.k;document.querySelectorAll('#newsSeg button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderNews()});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-news]');if(b){const id=b.dataset.news;if(current!=='news')go('news',false);try{history.pushState(null,'','#news-'+id)}catch(_){}renderNews(id);track('item','news:'+id);return}
  if(e.target.closest('#newsBack')){try{history.pushState(null,'','#news')}catch(_){}renderNews()}
});
function renderMedia(){
  document.getElementById('videoGrid').innerHTML=VIDEOS.map(v=>`<div class="vcard"><div class="fr"><button type="button" data-yt="${v.id}" style="background-image:url(https://i.ytimg.com/vi/${v.id}/hqdefault.jpg)" aria-label="เล่นวิดีโอ ${esc(v.t)}"><span>▶</span></button></div><p>${esc(v.t)}</p></div>`).join('');
  document.getElementById('officialLinks').innerHTML=OLINKS.map(l=>`<a class="btn" href="${esc(l.u)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit">${esc(l.t)} ↗</a>`).join('');
  const today=new Date().toISOString().slice(0,10);
  document.getElementById('roadList').innerHTML=ROAD.map(r=>`<li class="${r.done||r.d<=today?'done':''}"><span class="d">${thDate(r.d,{day:'numeric',month:'short',year:'2-digit'})}</span><i></i><span>${esc(r.t)}</span></li>`).join('');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-yt]');if(!b)return;const f=document.createElement('iframe');f.src=`https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0`;f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.allowFullscreen=true;f.title='YouTube';b.replaceWith(f)});
function renderFaq(){
  const q=(document.getElementById('faqQ').value||'').trim().toLowerCase();
  document.getElementById('faqList').innerHTML=FAQ.filter(f=>!q||(f.q+' '+f.a).toLowerCase().includes(q)).map(f=>`<details><summary><span>${esc(f.q)}</span>${RTAG[f.tag]||''}</summary><p>${esc(f.a)}</p></details>`).join('')||'<p class="muted">ไม่พบคำถามนี้ <a href="#feedback" data-go="feedback">ส่งคำถามมาได้</a></p>';
}
document.getElementById('faqQ').addEventListener('input',renderFaq);
function renderGloss(){
  const q=(document.getElementById('glQ').value||'').trim().toLowerCase();
  document.getElementById('glList').innerHTML=GLOSS.filter(([t,d])=>!q||(t+' '+d).toLowerCase().includes(q)).map(([t,d])=>`<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')||'<p class="muted">ไม่พบคำนี้</p>';
}
document.getElementById('glQ').addEventListener('input',renderGloss);

/* ===== community tier-list votes (owner's Supabase; one vote per browser per Aniimo) ===== */
const TV={src:'game8',res:null,mine:{},loading:false,err:''};
try{TV.mine=JSON.parse(localStorage.getItem('aniimo-tier-votes')||'{}')}catch(_){}
const TIER_SCORE={S:5,A:4,B:3,C:2,D:1},TIER_COL={S:'#E0493F',A:'#EE8A2B',B:'#2F9BD8',C:'#3C9F77',D:'#7A8CA3'};
async function sbCall(fn,args){const r=await fetch(SB.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:SB.key,Authorization:'Bearer '+SB.key,'Content-Type':'application/json'},body:JSON.stringify(args||{})});if(!r.ok)throw new Error(r.status);return r.status===204?null:r.json()}
async function tvLoad(force){if(!SB.url||(TV.res&&!force)||TV.loading)return;TV.loading=true;try{TV.res=await sbCall('tier_results');TV.err=''}catch(e){TV.err='x';TV.res=TV.res||{}}TV.loading=false}
const tvTier=r=>{if(!r||r.n<3)return null;const avg=(r.S*5+r.A*4+r.B*3+r.C*2+r.D)/r.n;return avg>=4.5?'S':avg>=3.5?'A':avg>=2.5?'B':avg>=1.5?'C':'D'};
function voteBox(slug){
  const r=(TV.res||{})[slug],mine=TV.mine[slug],tier=tvTier(r);
  const dist=r&&r.n?['S','A','B','C','D'].map(k=>`<i style="width:${r[k]/r.n*100}%;background:${TIER_COL[k]}" title="${k}: ${r[k]}"></i>`).join(''):'';
  return `<div class="vote" id="voteBox" data-slug="${slug}"><div class="row"><b style="font-family:var(--display)">โหวต Tier ของคุณ</b>${['S','A','B','C','D'].map(k=>`<button type="button" data-v="${k}" aria-pressed="${mine===k}">${k}</button>`).join('')}</div>
    <span class="small muted">${r&&r.n?`ผู้เล่นโหวต ${r.n} คน${tier?` · เฉลี่ยอยู่ Tier <b style="color:${TIER_COL[tier]}">${tier}</b>`:' · ต้องมีอย่างน้อย 3 โหวตถึงจะจัดอันดับ'}`:'ยังไม่มีใครโหวตตัวนี้ เป็นคนแรกเลย'}</span>${dist?`<div class="dist">${dist}</div>`:''}</div>`;
}
document.addEventListener('click',async e=>{
  const b=e.target.closest('#voteBox [data-v]');if(!b)return;
  const slug=b.closest('#voteBox').dataset.slug,v=b.dataset.v,prev=TV.mine[slug],next=prev===v?null:v;
  if(!SB.url||!VISITOR)return;
  TV.mine[slug]=next||undefined;if(!next)delete TV.mine[slug];try{localStorage.setItem('aniimo-tier-votes',JSON.stringify(TV.mine))}catch(_){}
  const r=(TV.res=TV.res||{})[slug]||(TV.res[slug]={S:0,A:0,B:0,C:0,D:0,n:0});if(prev){r[prev]--;r.n--}if(next){r[next]++;r.n++}
  document.getElementById('voteBox').outerHTML=voteBox(slug);
  try{await sbCall('tier_vote',{p_visitor:VISITOR,p_slug:slug,p_tier:next});if(RENDERED.has('tier')&&TV.src==='vote')renderTiers()}catch(_){}
});
document.getElementById('tierSrc').addEventListener('click',async e=>{const b=e.target.closest('[data-s]');if(!b)return;TV.src=b.dataset.s;document.querySelectorAll('#tierSrc button').forEach(x=>x.setAttribute('aria-pressed',x===b));
  document.getElementById('tierNote').innerHTML=TV.src==='vote'?'จัดอันดับจากโหวตของผู้เล่นเว็บนี้ (อย่างน้อย 3 โหวตต่อตัว) กดที่ Aniimo แล้วโหวตได้ในหน้ารายละเอียด':'อ้างอิงจาก Game8 (ก.ย. 2026) กดที่ชื่อเพื่อดูข้อมูล แต่ละเว็บจัดอันดับต่างกันเล็กน้อย';
  if(TV.src==='vote')await tvLoad(true);renderTiers()});
tvLoad().then(()=>{if(dlg.open&&document.getElementById('voteBox'))renderDetail()});

/* ===== feedback from users → owner's Supabase (insert-only for visitors) ===== */
const FB_TOPIC={idea:'แนะนำฟีเจอร์',data:'ข้อมูลผิด / ไม่ครบ',bug:'เว็บมีปัญหา',other:'อื่น ๆ'};
let fbTopic='idea',fbLastPage='home';
document.getElementById('fbTopic').addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(!b)return;fbTopic=b.dataset.t;document.querySelectorAll('#fbTopic button').forEach(x=>x.setAttribute('aria-pressed',x===b))});
document.getElementById('fbMsg').addEventListener('input',e=>{document.getElementById('fbCount').textContent=`${e.target.value.length} / 1000`});
document.getElementById('fbForm').addEventListener('submit',async e=>{
  e.preventDefault();const out=document.getElementById('fbMsgOut'),btn=document.getElementById('fbSend');
  const msg=document.getElementById('fbMsg').value.trim(),contact=document.getElementById('fbContact').value.trim();
  if(document.getElementById('fbWebsite').value){out.textContent='ส่งแล้ว ขอบคุณครับ';return}
  if(msg.length<3){out.textContent='พิมพ์ข้อความอย่างน้อย 3 ตัวอักษร';return}
  let last=0;try{last=+localStorage.getItem('aniimo-fb-last')||0}catch(_){}
  if(Date.now()-last<60000){out.textContent='เพิ่งส่งไป รอสักครู่แล้วค่อยส่งอีกครั้ง';return}
  if(!SB.url){out.textContent='ระบบรับคำแนะนำยังไม่พร้อม';return}
  btn.disabled=true;out.textContent='กำลังส่ง…';
  try{
    const r=await fetch(SB.url+'/rest/v1/feedback',{method:'POST',headers:{apikey:SB.key,Authorization:'Bearer '+SB.key,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify({topic:fbTopic,message:msg.slice(0,1000),contact:contact.slice(0,100)||null,page:fbLastPage.slice(0,40),visitor:VISITOR||null})});
    if(!r.ok)throw new Error(r.status);
    try{localStorage.setItem('aniimo-fb-last',String(Date.now()))}catch(_){}
    document.getElementById('fbMsg').value='';document.getElementById('fbContact').value='';document.getElementById('fbCount').textContent='0 / 1000';
    out.textContent='ส่งแล้ว ขอบคุณที่ช่วยแนะนำครับ';
  }catch(err){out.textContent='ส่งไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่'}
  finally{btn.disabled=false}
});


/* ===== home: now in game (latest update, live events, next area, newest code) ===== */
function renderHomeNow(){
  const el=document.getElementById('homeNow');if(!el)return;const now=Date.now(),cards=[];
  const up=NEWS.find(n=>n.type==='update');
  if(up)cards.push(`<button type="button" data-news="${up.id}"><span class="k">อัปเดตล่าสุด</span><b>${esc(up.title.split(':')[0])}</b><small>${thDate(up.date)} · อ่านสรุป</small></button>`);
  const live=EVENTS.map(e=>({e,w:eventWindow(e,now)})).filter(x=>x.e.kind!=='gameplay'&&x.w.state==='live').sort((a,b)=>(a.w.end||9e15)-(b.w.end||9e15));
  const soon=live.find(x=>x.w.end);
  cards.push(`<button type="button" data-go="events"><span class="k">อีเวนต์</span><b>เปิดอยู่ ${live.length} อีเวนต์</b><small>${soon?`${esc(soon.e.t)} จบในอีก ${fmtLeft(soon.w.end-now)}`:'ดูตารางอีเวนต์'}</small></button>`);
  if(WW_OPEN&&now<WW_OPEN)cards.push(`<button type="button" data-go="whisperwake"><span class="k">พื้นที่ใหม่</span><b>Whisperwake Isles</b><small>เปิดในอีก ${fmtLeft(WW_OPEN-now)}</small></button>`);
  const codes=C.filter(c=>!c[2]);
  if(codes.length)cards.push(`<div class="hcode"><span class="k">โค้ดของขวัญ</span><span class="row"><code>${esc(codes[0][0])}</code><button type="button" id="heroCopy">คัดลอก</button></span><small><a href="#codes" data-go="codes">ใช้ได้อีก ${codes.length} โค้ด ดูทั้งหมด</a></small></div>`);
  el.innerHTML=cards.join('');
}
document.addEventListener('click',e=>{const b=e.target.closest('#heroCopy');if(!b)return;const code=document.querySelector('#homeNow code').textContent;try{navigator.clipboard.writeText(code).then(()=>{b.textContent='คัดลอกแล้ว'},()=>{b.textContent=code})}catch(_){b.textContent=code}});
(()=>{
  const el=document.getElementById('heroEvents');if(!el)return;
  const live=EVENTS.filter(e=>e.kind==='event'),pics=live.filter(e=>e.img).slice(0,3);
  const left=t=>(t||'').replace(/(\d+)d/,'$1 วัน').replace(/(\d+)h/,'$1 ชม.').replace(/(\d+)m/,'$1 นาที');
  if(!pics.length)return;
  el.innerHTML=`<div class="hev-h"><b>อีเวนต์ที่กำลังจัด ${live.length} รายการ</b><a href="#events" data-go="events">อีเวนต์ ›</a></div><div class="hev-row">${pics.map(e=>`<button type="button" class="hev-c" data-go="events"><span class="hev-pic"><img src="${e.img}" alt="" loading="lazy"><b>${esc(tr(e.t))}</b></span><small>${e.ends?'⏱ เหลือ '+left(e.ends):'เปิดตลอด'}</small></button>`).join('')}</div>`;
})();
renderHomeNow();setInterval(()=>{if(current==='home'&&!document.hidden)renderHomeNow()},60000);
/* ===== fun: confetti, toasts, reveal on scroll, card tilt, count-up, hero parallax, Aniimo of the day, logo easter egg ===== */
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches,FINE=matchMedia('(hover: hover) and (pointer: fine)').matches;
const FXC=['var(--accent)','var(--peach)','var(--sun)','var(--good)','var(--accent-2)','var(--water)'];
function burst(x,y,n=18){if(RM)return;
  for(let i=0;i<n;i++){const p=document.createElement('i');p.className='fxp'+(i%3?'':' star');p.style.cssText=`left:${x}px;top:${y}px;background:${FXC[i%FXC.length]}`;document.body.appendChild(p);
    const a=Math.random()*Math.PI*2,d=40+Math.random()*70,dx=Math.cos(a)*d,dy=Math.sin(a)*d-30;
    p.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy+50}px)) rotate(${Math.random()*540-270}deg) scale(.6)`,opacity:0}],{duration:700+Math.random()*400,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=()=>p.remove()}}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.remove('on');void t.offsetWidth;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),1900)}
// celebrate: caught toggles, checklist ticks, copied codes
document.addEventListener('click',e=>{const t=e.target.closest('[data-col]');if(!t)return;
  const on=t.dataset.col==='c'?COL.d.c[t.dataset.key]:COL.d.f[t.dataset.key];if(on){burst(e.clientX,e.clientY);toast('จับแล้ว ✓')}},true);
document.addEventListener('change',e=>{const c=e.target;if(c.matches&&c.matches('.checklist input')&&c.checked){const r=c.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,12)}});
document.addEventListener('click',e=>{const b=e.target.closest('#heroCopy,button[data-c]');if(!b)return;const r=b.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,14);toast('คัดลอกโค้ดแล้ว ไปแลกในเกมได้เลย')});
// cards float up as they scroll into view
const RV_SEL='.feat>button,.hnow>*,.daily,.card,.ducard,.ecard,.rcard,.bcard,.mon,.fcard,.slot,.tl,.checklist li,.hall>div';
const rvIO=!RM&&'IntersectionObserver' in window?new IntersectionObserver(es=>{let k=0;es.forEach(en=>{if(!en.isIntersecting)return;const el=en.target;rvIO.unobserve(el);el.style.transitionDelay=Math.min(k++*45,360)+'ms';el.classList.add('rv-in');setTimeout(()=>{el.classList.remove('rv','rv-in');el.style.transitionDelay=''},900)})},{rootMargin:'0px 0px -40px 0px'}):null;
function reveal(){if(!rvIO)return;const v=document.querySelector(`.view[data-view="${current}"]`);if(!v)return;
  v.querySelectorAll(RV_SEL).forEach(el=>{if(el.dataset.rv)return;el.dataset.rv=1;if(el.getBoundingClientRect().top<innerHeight)return;el.classList.add('rv');rvIO.observe(el)})}
new MutationObserver(()=>{cancelAnimationFrame(reveal.f);reveal.f=requestAnimationFrame(reveal)}).observe(document.querySelector('main'),{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
// 3D tilt with a glare on Aniimo and feature cards (mouse only)
if(FINE&&!RM){
  document.addEventListener('pointermove',e=>{const c=e.target.closest('.mon,.feat>button,.daily .dart');if(tilt.c&&tilt.c!==c)tilt(null);if(!c)return;tilt.c=c;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    c.classList.add('tilt');c.style.setProperty('--rx',((.5-y)*10).toFixed(2)+'deg');c.style.setProperty('--ry',((x-.5)*12).toFixed(2)+'deg');c.style.setProperty('--gx',(x*100).toFixed(1)+'%');c.style.setProperty('--gy',(y*100).toFixed(1)+'%')});
  document.addEventListener('pointerleave',()=>tilt(null));
}
function tilt(c){if(tilt.c){tilt.c.classList.remove('tilt');tilt.c.style.removeProperty('--rx');tilt.c.style.removeProperty('--ry')}tilt.c=c}
// numbers count up the first time they appear
function countUp(el){if(RM||el.dataset.counted)return;el.dataset.counted=1;
  const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())&&!/\d/.test(n.nodeValue));if(!n)return;
  const m=n.nodeValue.match(/\d[\d,]*/);const to=+m[0].replace(/,/g,''),comma=m[0].includes(',');if(!to||to<4)return;
  const node=n,before=node.nodeValue.slice(0,m.index),after=node.nodeValue.slice(m.index+m[0].length),t0=performance.now();
  const step=t=>{const k=Math.min(1,(t-t0)/800),v=Math.round(to*(1-Math.pow(1-k,3)));node.nodeValue=before+(comma?v.toLocaleString('en-US'):v)+after;if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)}
const cuIO='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){cuIO.unobserve(en.target);countUp(en.target)}}),{threshold:.6}):null;
function countAll(){if(!cuIO)return;document.querySelectorAll('.hnow b,.feat small,#egTotal,#dcount').forEach(el=>{if(!el.dataset.cuo){el.dataset.cuo=1;cuIO.observe(el)}})}
// hero: the background picture drifts a little with the mouse
{const hero=document.querySelector('.hero3'),bg=hero&&hero.querySelector('.hbg img');
  if(bg&&FINE&&!RM)hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;bg.style.translate=`${(-x*16).toFixed(1)}px ${(-y*10).toFixed(1)}px`});
}
// Aniimo of the day, with a slot-machine reroll
function dailyPick(){const d=new Date(Date.now()+7*3600e3).toISOString().slice(0,10);let h=0;for(const c of d)h=(h*31+c.charCodeAt(0))>>>0;return RELEASED[h%RELEASED.length]}
function renderDaily(a,rolled){
  const el=document.getElementById('homeDaily');if(!el)return;const desc=String(tr(a.d)||'').split(/(?<=[.!?。])\s|\n/)[0];
  el.innerHTML=`<button type="button" class="dart" data-open="${a.slug}" aria-label="ดู ${esc(a.name)}"><img src="${a.i}" alt="${esc(a.name)}" class="${a.cut?'cut':''}"></button>
    <div class="dtxt"><p class="eyebrow">${numLabel(a)} · ${a.st}${a.r&&a.r!=='—'?' · '+a.r:''}</p><h3>${esc(a.name)}</h3><div class="row">${a.e.map(badge).join('')}</div>${desc?`<p class="muted">${esc(desc)}</p>`:''}
    <div class="dbtns"><button type="button" class="btn primary" data-open="${a.slug}">ดูรายละเอียด</button><button type="button" class="btn" id="dailyRoll">🎲 สุ่มตัวอื่น</button></div></div>`;
  if(rolled){const r=el.querySelector('.dart').getBoundingClientRect();el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');burst(r.left+r.width/2,r.top+r.height/2,16)}
}
document.addEventListener('click',e=>{if(!e.target.closest('#dailyRoll'))return;const el=document.getElementById('homeDaily'),img=el.querySelector('.dart img');
  const end=RELEASED[Math.random()*RELEASED.length|0];if(RM){renderDaily(end,true);return}
  let n=0;el.classList.add('rolling');const spin=()=>{const a=RELEASED[Math.random()*RELEASED.length|0];img.src=TH(a.i);if(++n<12)setTimeout(spin,40+n*12);else{el.classList.remove('rolling');renderDaily(end,true)}};spin()});
renderDaily(dailyPick());
// easter egg: tap the logo five times quickly for an Aniimo parade
{let taps=[];document.querySelector('.appbar .logo').addEventListener('click',()=>{const now=Date.now();taps=taps.filter(t=>now-t<1500);taps.push(now);if(taps.length<5)return;taps=[];
  toast('เจอไข่อีสเตอร์แล้ว! ขบวนพาเหรด Aniimo มาแล้ว');if(RM)return;
  const row=RELEASED.slice().sort(()=>Math.random()-.5).slice(0,8);
  row.forEach((a,i)=>{const im=document.createElement('img');im.src=TH(a.i);im.alt='';im.className='parade';im.style.animationDelay=(i*.28)+'s';document.body.appendChild(im);setTimeout(()=>im.remove(),5200+i*280)})})}
setInterval(countAll,1200);countAll();

/* ===== bring people back: what's new since last visit, calendar reminders, sharing, page titles ===== */
const SITE_URL='https://aniiguide.trade/';
function whatsNew(){
  const el=document.getElementById('whatsNew');if(!el)return;
  const now=Date.now(),live=EVENTS.filter(e=>e.kind!=='gameplay'&&eventWindow(e,now).state==='live').map(e=>e.slug),codes=C.filter(c=>!c[2]).map(c=>c[0]),news=NEWS.map(n=>n.id);
  let diff=null;try{diff=JSON.parse(sessionStorage.getItem('aniimo-new')||'null')}catch(_){}
  if(!diff){let seen=null;try{seen=JSON.parse(localStorage.getItem('aniimo-seen')||'null')}catch(_){}
    diff=seen?{t:seen.t,news:NEWS.filter(n=>!seen.news.includes(n.id)).map(n=>n.id),codes:codes.filter(c=>!seen.codes.includes(c)),ev:live.filter(x=>!seen.ev.includes(x))}:{};
    try{sessionStorage.setItem('aniimo-new',JSON.stringify(diff));localStorage.setItem('aniimo-seen',JSON.stringify({t:now,news,codes,ev:live}))}catch(_){}}
  const bits=[];
  if(diff.codes&&diff.codes.length)bits.push(`<button type="button" data-go="codes"><b>${diff.codes.length}</b> โค้ดใหม่</button>`);
  if(diff.news&&diff.news.length)bits.push(`<button type="button" data-news="${diff.news[0]}"><b>${diff.news.length}</b> ข่าวใหม่</button>`);
  if(diff.ev&&diff.ev.length)bits.push(`<button type="button" data-go="events"><b>${diff.ev.length}</b> อีเวนต์เริ่มใหม่</button>`);
  el.hidden=!bits.length||sessionStorage.getItem('aniimo-new-x')==='1';
  el.innerHTML=bits.length?`<span>มีอะไรใหม่ตั้งแต่ครั้งก่อน${diff.t?` (${new Date(diff.t).toLocaleDateString(LOC,{day:'numeric',month:'short'})})`:''}</span>${bits.join('')}<button type="button" class="x" id="wnX" aria-label="ปิด">×</button>`:'';
}
document.addEventListener('click',e=>{if(e.target.closest('#wnX')){try{sessionStorage.setItem('aniimo-new-x','1')}catch(_){}document.getElementById('whatsNew').hidden=true}});
whatsNew();
// calendar files (.ics) the visitor saves to their own calendar
const icsT=t=>new Date(t).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
function icsSave(name,body){const txt=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//AniiGuide//TH','CALSCALE:GREGORIAN',...body,'END:VCALENDAR'].join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/calendar'}));a.download=name+'.ics';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);toast('บันทึกไฟล์ปฏิทินแล้ว เปิดไฟล์เพื่อเพิ่มลงปฏิทิน')}
const icsEv=(title,s,t,extra=[])=>['BEGIN:VEVENT','UID:'+icsT(s)+'-'+title.replace(/\W/g,'').slice(0,20)+'@aniiguide','DTSTAMP:'+icsT(Date.now()),'DTSTART:'+icsT(s),'DTEND:'+icsT(t),'SUMMARY:'+title.replace(/[,;]/g,' '),'URL:'+SITE_URL,...extra,'BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY','DESCRIPTION:'+title.replace(/[,;]/g,' '),'END:VALARM','END:VEVENT'];
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-ics-ev]');if(b){const [n,s,t]=b.dataset.icsEv.split('|');icsSave('aniimo',icsEv(n,+s,+t));return}
  const w=e.target.closest('[data-ics]');if(!w)return;const now=Date.now();
  if(w.dataset.ics==='interlink'){const i=nextInterlink(now),s=i.live?i.start+7*86400e3:i.start;icsSave('aniimo-interlink',icsEv('Aniimo: Holo-Battle Interlink เปิด',s,s+3600e3,['RRULE:FREQ=WEEKLY']))}
  else{const h=nextHatchHaste(now),s=h.live?h.start+7*86400e3:h.start;icsSave('aniimo-hatch-haste',icsEv('Aniimo: Hatch Haste (ฟักไข่เร็ว x2)',s,s+3600e3,['RRULE:FREQ=WEEKLY']))}
});
// share an Aniimo: its own page (with a preview image) when the site has one
document.addEventListener('click',async e=>{const b=e.target.closest('[data-share]');if(!b)return;const a=BY[b.dataset.share];if(!a)return;
  const url=SITE_URL+'a/'+a.slug+'/',data={title:a.name+' · AniiGuide',text:`${a.name} ใน Aniimo: ธาตุ ค่าสถานะ สกิล และที่อยู่`,url};
  try{if(navigator.share){await navigator.share(data);return}}catch(_){return}
  try{await navigator.clipboard.writeText(url);toast('คัดลอกลิงก์แล้ว วางแชร์ได้เลย')}catch(_){toast(url)}});
// page titles follow the page (nicer tabs, bookmarks and history)
const setTitle=id=>{const v=VIEWS.find(x=>x.id===id);document.title=(id==='home'||!v?'AniiGuide — คู่มือเกม Aniimo ภาษาไทย':v.th+' · AniiGuide')};

/* ===== sync across devices with a sync code (Supabase sync_get / sync_put; tools/admin/sync.sql) =====
   The newer side wins: a device pulls the saved copy when it is newer than its own last change, else pushes. */
const SYNC={code:'',local:0,remote:0,state:'',t:null};
try{Object.assign(SYNC,JSON.parse(localStorage.getItem('aniimo-sync')||'{}'))}catch(_){}
const syncSave=()=>{try{localStorage.setItem('aniimo-sync',JSON.stringify({code:SYNC.code,local:SYNC.local,remote:SYNC.remote}))}catch(_){}};
const syncData=()=>({v:1,col:COL.d,daily:DL,guide:GC});
function syncApply(d){if(!d)return;
  if(d.col)COL.d={c:d.col.c||{},f:d.col.f||{},s:d.col.s||{}};COL.saveLocal();
  if(d.daily){DL=d.daily;try{localStorage.setItem('aniimo-daily',JSON.stringify(DL))}catch(_){}}
  if(d.guide){GC=d.guide;try{localStorage.setItem('aniimo-guide-checks',JSON.stringify(GC))}catch(_){}applyGuideChecks()}
  if(RENDERED.has('collection'))renderCollection();if(RENDERED.has('dex'))renderDex();if(RENDERED.has('daily'))renderDaily2();
}
async function syncNow(){if(!SYNC.code)return;try{const at=await sbCall('sync_put',{p_code:SYNC.code,p_data:syncData()});SYNC.remote=Date.parse(at)||Date.now();SYNC.state='ok'}catch(_){SYNC.state='err'}syncSave();syncBoxes()}
function syncPush(){SYNC.local=Date.now();syncSave();if(!SYNC.code)return;clearTimeout(SYNC.t);SYNC.t=setTimeout(syncNow,1200)}
async function syncPull(adopt){if(!SYNC.code)return;
  try{const r=await sbCall('sync_get',{p_code:SYNC.code});
    if(!r||!r.data){await syncNow();return}
    const at=Date.parse(r.at);
    if(adopt||at>SYNC.local){syncApply(r.data);SYNC.local=at;SYNC.remote=at;SYNC.state='ok';syncSave();syncBoxes()}
    else if(SYNC.local>at)await syncNow();else{SYNC.state='ok';syncBoxes()}
  }catch(_){SYNC.state='err';syncBoxes()}}
const newSyncCode=()=>{const a='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789',r=new Uint32Array(24);crypto.getRandomValues(r);return [...r].map(x=>a[x%a.length]).join('')};
function syncBox(id){const el=document.getElementById(id);if(!el)return;
  el.innerHTML=SYNC.code?`<div class="panel sync"><b>☁ ซิงก์ข้ามเครื่องเปิดอยู่</b><p class="small muted">${SYNC.state==='err'?'เชื่อมต่อไม่ได้ จะลองใหม่ตอนติ๊กครั้งถัดไป':SYNC.remote?'บันทึกล่าสุด '+new Date(SYNC.remote).toLocaleString(LOC,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'กำลังซิงก์…'} · เช็กลิสต์สะสม เช็กลิสต์รายวัน และเช็กลิสต์มือใหม่</p>
      <div class="row"><button type="button" class="btn primary" data-sync="copy">คัดลอกลิงก์ไปเปิดบนเครื่องอื่น</button><button type="button" class="btn" data-sync="off">เลิกซิงก์บนเครื่องนี้</button></div>
      <p class="small muted">รหัส: <code>${esc(SYNC.code.slice(0,4))}…${esc(SYNC.code.slice(-4))}</code> · ใครมีลิงก์นี้จะเห็นและแก้เช็กลิสต์ของคุณได้ อย่าแชร์ในที่สาธารณะ</p></div>`
   :`<div class="panel sync"><b>☁ ซิงก์ข้ามเครื่อง</b><p class="small muted">เล่นทั้งมือถือและคอม? สร้างรหัสซิงก์แล้วเปิดลิงก์เดียวกันบนอีกเครื่อง เช็กลิสต์สะสม เช็กลิสต์รายวัน และเช็กลิสต์มือใหม่จะตรงกันทุกเครื่อง ไม่ต้องสมัครสมาชิก</p>
      <div class="row"><button type="button" class="btn primary" data-sync="new">สร้างรหัสซิงก์</button><input type="text" data-sync-in placeholder="หรือวางรหัส / ลิงก์จากเครื่องอื่น" aria-label="รหัสซิงก์"><button type="button" class="btn" data-sync="use">ใช้รหัสนี้</button></div></div>`}
function syncBoxes(){['syncBoxCol','syncBoxDaily'].forEach(syncBox)}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-sync]');if(!b)return;const k=b.dataset.sync;
  if(k==='new'){SYNC.code=newSyncCode();SYNC.state='';syncSave();await syncNow();toast('สร้างรหัสซิงก์แล้ว กดคัดลอกลิงก์ไปเปิดบนอีกเครื่อง');burst(e.clientX,e.clientY,14)}
  else if(k==='use'){const v=(b.parentNode.querySelector('[data-sync-in]').value||'').trim().replace(/^.*#sync-/,'');if(!/^[A-Za-z0-9]{20,40}$/.test(v)){toast('รหัสไม่ถูกต้อง');return}SYNC.code=v;syncSave();await syncPull(true);toast('ดึงข้อมูลจากรหัสนี้แล้ว')}
  else if(k==='copy'){const url=SITE_URL+'#sync-'+SYNC.code;try{await navigator.clipboard.writeText(url);toast('คัดลอกลิงก์แล้ว เปิดลิงก์นี้บนอีกเครื่อง')}catch(_){toast(url)}}
  else if(k==='off'){SYNC.code='';SYNC.remote=0;syncSave();toast('เลิกซิงก์แล้ว ข้อมูลในเครื่องนี้ยังอยู่')}
  syncBoxes();
});
if(SYNC.code)syncPull(false);
addEventListener('focus',()=>{if(SYNC.code&&Date.now()-(SYNC.pulled||0)>60000){SYNC.pulled=Date.now();syncPull(false)}});

/* ===== whole-site English (i18n-en.js) ===== */
const UI_EN=window.UI_EN||{};
const HAS_TH=/[฀-๿]/,LATIN=/[A-Za-z0-9][A-Za-z0-9 .,'’%×+\-\/:&!?#()"“”]*[A-Za-z0-9%)"”]|[A-Za-z0-9]/g;
function i18nKey(t){const parts=[];const k=t.replace(/\s+/g,' ').trim().replace(LATIN,m=>{parts.push(m);return '{}'});return [k,parts]}
function i18nText(t){if(!t||!HAS_TH.test(t))return null;const [k,parts]=i18nKey(t);const v=UI_EN[k];if(v==null)return null;let i=0;const out=v.replace(/\{(\d*)\}/g,(_,n)=>n!==''?(parts[+n]??''):(parts[i++]??''));const lead=t.match(/^\s*/)[0],trail=t.match(/\s*$/)[0];return lead+out+trail}
const I18N_ATTR=['placeholder','aria-label','title','alt'];
function i18nWalk(root){
  if(LANG!=='en'||!root)return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);let n=root;
  do{if(n.nodeType===3){const v=i18nText(n.nodeValue);if(v!=null)n.nodeValue=v}
    else if(n.nodeType===1){if(n.tagName==='SCRIPT'||n.tagName==='STYLE')continue;for(const a of I18N_ATTR){const x=n.getAttribute&&n.getAttribute(a);if(x){const v=i18nText(x);if(v!=null)n.setAttribute(a,v)}}}}while((n=w.nextNode()));
}
if(LANG==='en'){
  document.title='AniiGuide — Aniimo guide';
  i18nWalk(document.body);
  new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData'){const v=i18nText(m.target.nodeValue);if(v!=null)m.target.nodeValue=v}else m.addedNodes.forEach(x=>i18nWalk(x))}}).observe(document.body,{childList:true,subtree:true,characterData:true});
}
/* dev helper: list Thai phrases on screen that have no English yet */
window.__i18nMissing=()=>{const out=new Set();const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);let n;while((n=w.nextNode())){if(n.nodeType===3){if(HAS_TH.test(n.nodeValue)&&n.parentElement&&!/SCRIPT|STYLE/.test(n.parentElement.tagName)){const [k]=i18nKey(n.nodeValue);if(!(k in UI_EN))out.add(k)}}else for(const a of I18N_ATTR){const x=n.getAttribute(a);if(x&&HAS_TH.test(x)){const [k]=i18nKey(x);if(!(k in UI_EN))out.add(k)}}}return [...out]};
route();
{const hide=()=>{const b=document.getElementById('boot');if(!b||b.classList.contains('done'))return;b.classList.add('done');setTimeout(()=>b.remove(),500)};requestAnimationFrame(hide);setTimeout(hide,400)} // splash off once the first page is drawn (timer covers background tabs)

/* ===== home: wiki cards, picks, latest news; site footer ===== */
(()=>{
  const rel=ANIIMO.filter(a=>!a.u),forms=rel.reduce((n,a)=>n+a.f.length,0),skills=new Set(Object.values(SKILLS).flatMap(x=>x.s.map(s=>s[0]))).size;
  const W=[['map','แผนที่ทวีป Idyll','4,334 จุด','หีบ ไข่ วัตถุดิบ บอส ด่าน Pathfinder พร้อมขอบเขตภูมิภาค'],
    ['dex','รายชื่อ Aniimo',`${rel.length} ตัว · ${forms} ร่าง`,'ค่าสถานะ สกิล วิวัฒนาการ จุดเกิด และไอเท็มแนะนำ'],
    ['builder','ตัวจัดบิลด์','ใหม่','เลือกสกิล Held Item และ Rune ให้ Aniimo แต่ละตัว แล้วแชร์ลิงก์'],
    ['tier','Tier List','โหวตได้','อันดับความนิยมและความเก่งของ Aniimo'],
    ['helditems','Held Item และ Rune',`${(Array.isArray(ITEMS)?ITEMS:ITEMS.list).length.toLocaleString(LOC)} ไอเท็ม`,'ไอเท็มทั้งหมด พร้อมวิธีหาและผลของไอเท็ม'],
    ['elements','ตารางธาตุ','81 คู่','ธาตุไหนแพ้ทางธาตุไหน พร้อมเครื่องคำนวณดาเมจ'],
    ['skills','สกิล',`${skills} สกิล`,'สกิลทุกตัวพร้อมสีธาตุ พลัง EP และคูลดาวน์'],
    ['sets','ชุดแต่งตัว Aniimo','Transmog','ชุดแต่งตัวของ Aniimo แต่ละตัวและสีทั้งหมด']].filter(w=>VIEWS.some(v=>v.id===w[0]));
  const faces=n=>rel.filter(a=>!a.cut).slice(0,n).map(a=>`<img src="${TH(a.i)}" alt="" loading="lazy">`).join('');
  const PREV={dex:`<span class="wp faces">${faces(3)}</span>`,tier:'<span class="wp tiers"><i>S</i><i>A</i><i>B</i><i>C</i><i>D</i></span>',
    builder:'<span class="wp ring"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18"/><circle cx="22" cy="22" r="18" class="v"/></svg><b>70</b></span>',
    elements:`<span class="wp els">${E.map(e=>`<img src="img/ui/el-${e.k}.webp" alt="" loading="lazy">`).join('')}</span>`,
    skills:`<span class="wp els">${E.slice(0,5).map(e=>`<i style="background:var(--${e.k})"></i>`).join('')}</span>`,
    sets:`<span class="wp faces">${((window.SETS||[])[0]||{sets:[]}).sets.slice(0,3).map(x=>x.bust?`<img src="${x.bust}" alt="" loading="lazy">`:'').join('')}</span>`,
    map:'<span class="wp pins"><i></i><i></i><i></i></span>',helditems:'<span class="wp tiers"><i>R</i><i>E</i><i>L</i></span>'};
  const itemN=(window.META&&META.items_total)||(Array.isArray(ITEMS)?ITEMS:ITEMS.list).length,ptsN=(window.MAPSTAT&&MAPSTAT.n)||4334;
  const setD=(id,t)=>{const el=document.getElementById(id);if(el)el.textContent=t};
  setD('dWiki',`Aniimo ทั้ง ${rel.length} ตัวพร้อม ${forms} ร่าง ค่าสถานะ สกิล และวิวัฒนาการ แผนที่ทวีป Idyll ${ptsN.toLocaleString(LOC)} จุด ไอเท็ม ${itemN.toLocaleString(LOC)} ชิ้น Tier List และบิลด์ แยกเป็นหน้าละเรื่อง อัปเดตตามข้อมูลเกมทุกวัน`);
  setD('dTools','จัดทีมและดูจุดอ่อน วางแผนวัสดุอัปเลเวล เช็กลิสต์งานรายวันและ Aniimo ที่สะสม ทุกอย่างบันทึกไว้ในเครื่องของคุณ ไม่ต้องสมัครสมาชิก');
  setD('dPicks',`6 ตัวจากทั้งหมด ${rel.length} ตัว เปลี่ยนทุกวัน กดดูร่าง ค่าสถานะ สกิล วิวัฒนาการ และแหล่งที่พบ`);
  setD('dFaq','คำตอบสั้น ๆ เรื่องตัวเกม เซิร์ฟเวอร์ และการเริ่มเล่น');
  const TOOLS=[['team','จัดทีม Combo','4 ตัว','เลือก Aniimo 4 ตัว ดูบทบาท ธาตุที่ตีแพ้ทาง จุดอ่อน และแชร์ทีมเป็นรูป'],['daily','เช็กลิสต์รายวัน','รีเซ็ต 03:00','งานรายวันและรายสัปดาห์ ติ๊กแล้วจำไว้ให้'],
    ['planner','วางแผนวัสดุ','คำนวณ','ต้องใช้ของเท่าไรถึงเลเวลหรือขั้นที่ต้องการ'],['collection','เช็กลิสต์สะสม','ซิงก์ได้','ติ๊ก Aniimo และร่างที่จับแล้ว ซิงก์ข้ามเครื่องด้วยรหัส'],
    ['compare','เปรียบเทียบ','สูงสุด 4 ตัว','เทียบค่าสถานะ ธาตุ และสกิลแบบเคียงข้างกัน'],['ranking','จัดอันดับค่าสถานะ','ใหม่','เรียง Aniimo ตาม HP ATK DEF หรือผลรวม']].filter(w=>VIEWS.some(v=>v.id===w[0]));
  const ht=document.getElementById('homeTools');if(ht)ht.innerHTML=TOOLS.map(([id,t,b,d])=>`<button type="button" class="wcard" data-go="${id}"><span class="wtop"><svg><use href="#i-${(VIEWS.find(v=>v.id===id)||{}).ic||'star'}"/></svg><b>${t}</b><em>${b}</em></span><small>${d}</small></button>`).join('');
  const hf=document.getElementById('homeFaq');if(hf)hf.innerHTML=(window.FAQ||[]).slice(0,5).map(f=>`<details class="hfq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
  document.getElementById('homeWiki').innerHTML=W.map(([id,t,b,d],i)=>`<button type="button" class="wcard${i<1?' big':''}" data-go="${id}">${PREV[id]||''}<span class="wtop"><svg><use href="#i-${(VIEWS.find(v=>v.id===id)||{}).ic||'star'}"/></svg><b>${t}</b><em>${b}</em></span><small>${d}</small></button>`).join('');
  const day=Math.floor(Date.now()/864e5),pool=rel.filter(a=>!a.cut);
  const picks=Array.from({length:6},(_,i)=>pool[(day*7+i*13)%pool.length]);
  document.getElementById('homePicks').innerHTML=picks.map(a=>`<button type="button" class="pick" data-open="${a.slug}"><span class="no">${numLabel(a)}</span><img src="${TH(a.i)}" alt="" loading="lazy"><b>${esc(a.th||a.name)}</b><span style="display:flex;gap:3px;justify-content:center">${a.e.map(badge).join('')}</span><small class="muted">${a.r}</small></button>`).join('');
  const N=(window.NEWS||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
  document.getElementById('homeNews').innerHTML=N.map(n=>`<a class="hncard" href="#news-${n.id}"><small class="muted">${new Date(n.date+'T00:00:00+07:00').toLocaleDateString(LOC,{day:'numeric',month:'long',year:'numeric'})}</small><b>${esc(n.title)}</b><span class="small muted">${esc(n.lede||'')}</span></a>`).join('');
  document.getElementById('sitefoot').innerHTML=`<div class="sf-brand"><b class="wm"><svg class="brandmark" viewBox="0 0 260 72" aria-hidden="true"><use href="img/aniiguide-logo.svg?v=4#wordmark"></use></svg><span class="sr">AniiGuide</span></b><p class="small muted">คู่มือเกม Aniimo ภาษาไทย แฟนเมด ไม่เกี่ยวข้องกับ Pawprint Studio · ภาพตัวละคร แผนที่ อีเวนต์ และบอสใช้โดยได้รับอนุญาตจาก <a href="https://aniidex.com/" target="_blank" rel="noopener">AniiDex</a></p><p class="small"><a href="#privacy" data-go="privacy">นโยบายความเป็นส่วนตัว</a> · <a href="#support" data-go="support">สนับสนุนเว็บ</a></p></div>`+GROUPS.map(g=>{const vs=VIEWS.filter(v=>v.g===g.id);return vs.length?`<div><p class="sf-h">${g.th}</p>${vs.map(v=>`<a href="#${v.id}" data-go="${v.id}">${v.th}</a>`).join('')}</div>`:''}).join('');
})();

/* ===== builder + recommended builds ===== */
const BLD_RUNES=ITEMS.filter(i=>i.c==='Held Item - Rune').map(i=>i.n);
const BLD_HELD=[...new Set(A.flatMap(a=>(a.it||[]).map(x=>x[0]).concat(a.rec&&a.rec.h?[a.rec.h[0]]:[])))].sort();
const BLD_FX=Object.fromEntries(A.flatMap(a=>(a.it||[]).map(x=>[x[0],x[1]])));
const BLD={slug:'',lv:60,sk:[],held:'',runes:[]};
const bldSaved=()=>{try{return JSON.parse(localStorage.getItem('aniimo-builds')||'[]')}catch(_){return []}};
function bldCode(){return 'builder-'+[BLD.slug,BLD.lv,BLD.sk.join('.'),BLD_HELD.indexOf(BLD.held),BLD.runes.map(r=>BLD_RUNES.indexOf(r)).join('.')].join('~')}
function bldLoad(h){const [slug,lv,sk,he,ru]=h.slice(8).split('~');if(!BY[slug])return;Object.assign(BLD,{slug,lv:+lv||60,sk:(sk||'').split('.').filter(x=>x!=='').map(Number),held:BLD_HELD[+he]||'',runes:(ru||'').split('.').filter(x=>x!=='').map(i=>BLD_RUNES[+i]).filter(Boolean)})}
function bldUseRec(a){BLD.held=a.rec&&a.rec.h?a.rec.h[0]:'';BLD.runes=a.rec&&a.rec.r?[a.rec.r[0]]:[];}
function renderBuilder(){
  const el=document.getElementById('bld');if(!el)return;
  const rel=A.filter(a=>!a.u).slice().sort((x,y)=>(x.th||x.name).localeCompare(y.th||y.name,'th'));
  if(!BLD.slug){BLD.slug=rel[0].slug;bldUseRec(rel[0])}
  const a=BY[BLD.slug],sks=skillsOf(a.slug).filter(s=>s.k!=='atk');
  BLD.sk=BLD.sk.filter(i=>i<sks.length);
  const fx=BLD_FX[BLD.held]||'',m=fx.match(/gain ([\d.]+) additional (\w+) per level/i);
  const bonus=m?{k:m[2].toUpperCase(),v:+m[1]*BLD.lv}:null;
  const statRows=STAT.map(k=>{const add=bonus&&(bonus.k===k||(bonus.k==='DEF'&&k==='PDEF'))?bonus.v:0;return `<div class="stat"><span>${STAT_L[k]||k}</span><span class="bar"><i style="width:${Math.min(100,a.s[k]/130*100)}%"></i></span><b>${a.s[k]}${add?` <em class="plus">+${Math.round(add*10)/10}</em>`:''}</b></div>`}).join('');
  el.innerHTML=`<div class="bld-l">
    <label>Aniimo<select id="bldMon">${rel.map(x=>`<option value="${x.slug}"${x.slug===a.slug?' selected':''}>${esc(x.th||x.name)} · ${esc(x.name)}</option>`).join('')}</select></label>
    <div class="bld-pic"><img src="${TH(a.i)}" alt=""><div><b>${esc(a.th||a.name)}</b><div style="display:flex;gap:4px;margin-top:4px">${a.e.map(badge).join('')}${roleChip(a.r)}</div></div></div>
    <label>เลเวล <b id="bldLvV">${BLD.lv}</b><input type="range" id="bldLv" min="1" max="100" value="${BLD.lv}"></label>
    <label>Held Item<select id="bldHeld"><option value="">— ไม่ใส่ —</option>${BLD_HELD.map(n=>`<option${n===BLD.held?' selected':''}>${esc(n)}</option>`).join('')}</select></label>
    ${fx?`<p class="small muted">${esc(tr(fx))}</p>`:''}
    <label>Rune (สูงสุด 4)<select id="bldRune"><option value="">+ เพิ่ม Rune</option>${BLD_RUNES.map(n=>`<option>${esc(n)}</option>`).join('')}</select></label>
    <div class="bld-runes">${BLD.runes.map((r,i)=>`<span class="chip">${itemRef(r)}<button type="button" class="x" data-rrm="${i}" aria-label="เอาออก">×</button></span>`).join('')||'<span class="small muted">ยังไม่ได้ใส่ Rune</span>'}</div>
    <div class="bld-act"><button type="button" class="btn" id="bldRec">ใช้บิลด์ที่เกมแนะนำ</button><button type="button" class="btn" id="bldToCm">แชร์ในชุมชน</button><button type="button" class="btn primary" id="bldShare">คัดลอกลิงก์บิลด์</button><button type="button" class="btn" id="bldSave">บันทึก</button></div>
    ${bldSaved().length?`<div><p class="eyebrow" style="margin:6px 0">บิลด์ที่บันทึกไว้</p><div class="bld-saved">${bldSaved().map((b,i)=>`<span class="chip"><button type="button" class="itemlink" data-bopen="${esc(b.code)}">${esc(b.name)}</button><button type="button" class="x" data-bdel="${i}" aria-label="ลบ">×</button></span>`).join('')}</div></div>`:''}
  </div>
  <div class="bld-r">
    <div><p class="eyebrow" style="margin-bottom:8px">ค่าสถานะที่เลเวล ${BLD.lv}${bonus?` · ${esc(BLD.held)}`:''}</p><div class="stats">${statRows}</div><p class="small muted" style="margin-top:6px">ตัวเลขหลักคือค่าพื้นฐานของสายพันธุ์ ส่วน +ตัวเลขคือที่ Held Item เพิ่มตามเลเวล</p></div>
    <div><p class="eyebrow" style="margin-bottom:8px">สกิล ${BLD.sk.length}/4 · กดเพื่อเลือก</p><div class="bld-sk">${sks.map((s,i)=>`<button type="button" class="bsk" data-bsk="${i}" aria-pressed="${BLD.sk.includes(i)}">${skillCard(s)}</button>`).join('')}</div></div>
  </div>`;
}
document.addEventListener('change',e=>{
  if(e.target.id==='bldMon'){BLD.slug=e.target.value;BLD.sk=[];bldUseRec(BY[BLD.slug]);renderBuilder()}
  else if(e.target.id==='bldHeld'){BLD.held=e.target.value;renderBuilder()}
  else if(e.target.id==='bldRune'){const v=e.target.value;if(v&&BLD.runes.length<4)BLD.runes.push(v);renderBuilder()}
  else if(e.target.id==='be'||e.target.id==='bq')renderBuilds();
});
document.addEventListener('input',e=>{if(e.target.id==='bldLv'){BLD.lv=+e.target.value;renderBuilder()}else if(e.target.id==='bq')renderBuilds()});
document.addEventListener('click',e=>{
  const t=e.target;
  const sk=t.closest('[data-bsk]');if(sk){const i=+sk.dataset.bsk,j=BLD.sk.indexOf(i);if(j>=0)BLD.sk.splice(j,1);else if(BLD.sk.length<4)BLD.sk.push(i);renderBuilder();return}
  const rr=t.closest('[data-rrm]');if(rr){BLD.runes.splice(+rr.dataset.rrm,1);renderBuilder();return}
  if(t.closest('#bldRec')){bldUseRec(BY[BLD.slug]);renderBuilder();return}
  if(t.closest('#bldShare')){const u=location.href.split('#')[0]+'#'+bldCode();navigator.clipboard&&navigator.clipboard.writeText(u);toast('คัดลอกลิงก์บิลด์แล้ว');return}
  if(t.closest('#bldSave')){const l=bldSaved();const a=BY[BLD.slug];l.unshift({name:(a.th||a.name)+(BLD.held?' · '+BLD.held:''),code:bldCode()});try{localStorage.setItem('aniimo-builds',JSON.stringify(l.slice(0,20)))}catch(_){}renderBuilder();toast('บันทึกบิลด์แล้ว');return}
  const bo=t.closest('[data-bopen]');if(bo){bldLoad(bo.dataset.bopen);renderBuilder();return}
  const bd=t.closest('[data-bdel]');if(bd){const l=bldSaved();l.splice(+bd.dataset.bdel,1);try{localStorage.setItem('aniimo-builds',JSON.stringify(l))}catch(_){}renderBuilder();return}
  const ob=t.closest('[data-bbuild]');if(ob){const a=BY[ob.dataset.bbuild];BLD.slug=a.slug;BLD.sk=[];bldUseRec(a);go('builder');renderBuilder();return}
});
// var: the first route can render this view before the script reaches these lines
var SQ,SPICK;
function renderSets(){
  SQ=SQ||{2:'หายาก',3:'หายาก',4:'มหากาพย์',5:'ตำนาน'};SPICK=SPICK||{};
  const b=document.getElementById('setsBody');if(!b)return;
  const L=window.SETS||[];
  b.innerHTML=L.map(x=>{
    const a=BY[x.slug];if(!a)return '';
    const pk=SPICK[x.slug]||(SPICK[x.slug]={k:x.sets[0].k,c:x.sets[0].pieces[0]&&x.sets[0].imgs[x.sets[0].pieces[0].id]?x.sets[0].pieces[0].id:x.colours[0].id});
    const st=x.sets.find(s=>s.k===pk.k)||x.sets[0],col=x.colours.find(c=>c.id===pk.c)||x.colours[0];
    const nm=o=>esc(LANG==='en'?o.en:o.th),pct=o=>o.o.length?o.o.map(v=>v+'%').join(' / '):'—';
    const groups=[3,4,5].map(q=>{const cs=x.colours.filter(c=>c.q===q);return cs.length?`<p class="small"><span class="qtag q${q}">${SQ[q]}</span> <span class="muted">${cs.length} สี · สุ่มได้สีละ ${cs[0].o[0]}%</span></p><div class="swrow">${cs.map(c=>`<button type="button" class="sw q${c.q}" data-sset="${x.slug}" data-sc="${c.id}" aria-pressed="${c.id===col.id}" title="${nm(c)}" aria-label="${nm(c)}">${st.imgs[c.id]?`<img src="${st.imgs[c.id]}" alt="" loading="lazy">`:''}</button>`).join('')}</div>`:''}).join('');
    return `<div class="sset"><div>
      <div class="stabs">${x.sets.map(s=>`<button type="button" class="stab" data-sset="${x.slug}" data-sk="${s.k}" aria-pressed="${s.k===st.k}">${s.bust?`<img src="${s.bust}" alt="">`:''}${nm(s)}</button>`).join('')}</div>
      <figure class="sstage" style="margin:0"><img src="${st.imgs[col.id]||''}" alt="${esc((a.th||a.name)+' '+st.th+' · '+col.th)}"><figcaption><b>${nm(st)}</b> · ${nm(col)}</figcaption></figure>
    </div><div>
      <h3 style="margin:0 0 4px"><button type="button" style="border:0;background:none;padding:0;font:inherit;color:var(--accent);cursor:pointer" data-open="${x.slug}">${esc(a.th||a.name)}</button></h3>
      <p class="small muted" style="margin:0 0 10px">${x.sets.length} เซ็ต · ${x.colours.length} สี</p>
      <p class="eyebrow" style="margin-bottom:6px">${nm(st)} <span class="qtag q${st.q}">${st.base?'ร่างเริ่มต้น':'เซ็ต'+SQ[st.q]}</span></p>
      ${st.base?'<p class="small muted">รูปลักษณ์ตั้งต้นของ '+esc(a.th||a.name)+' ไม่ต้องสุ่ม</p>':`<table class="plain spieces"><thead><tr><th>ช่อง</th><th>ชิ้น</th><th style="text-align:right">โอกาสสุ่ม (ล็อก 0/1/2/3 ช่อง)</th></tr></thead><tbody>${st.pieces.map(p=>`<tr><td>${esc(p.tn)}</td><td>${nm(p)} <span class="qtag q${p.q}">${SQ[p.q]}</span></td><td style="text-align:right" class="small">${pct(p)}</td></tr>`).join('')}</tbody></table>`}
      <p class="eyebrow" style="margin:14px 0 4px">สี</p>${groups}
      ${x.rule?`<p class="small muted">สุ่มแต่ละครั้งใช้ ${esc(LANG==='en'?x.rule.item[1]:x.rule.item[0])} ${x.rule.lock.map((n,i)=>i?`ล็อก ${i} ช่อง ${n} ชิ้น`:`${n} ชิ้น`).join(' · ')} ล็อกได้สูงสุด ${x.rule.max} ช่อง ยิ่งล็อกมากโอกาสได้ชิ้นระดับสูงยิ่งเพิ่ม</p>`:''}
    </div></div>`}).join('')||'<p class="muted">ยังไม่มีชุดแต่งตัว</p>';
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-sset]');if(!t)return;
  const p=SPICK[t.dataset.sset]||(SPICK[t.dataset.sset]={});
  if(t.dataset.sk)p.k=t.dataset.sk;if(t.dataset.sc)p.c=+t.dataset.sc;renderSets();
});
function setsInfo(a){
  const x=(window.SETS||[]).find(s=>s.slug===a.slug);if(!x)return '';
  return `<div><p class="eyebrow" style="margin-bottom:8px">ชุดแต่งตัว · ${x.sets.length} เซ็ต ${x.colours.length} สี</p><div class="stabs">${x.sets.map(s=>`<span class="stab" style="cursor:default">${s.bust?`<img src="${s.bust}" alt="">`:''}${esc(LANG==='en'?s.en:s.th)}</span>`).join('')}</div><button type="button" class="btn" onclick="document.getElementById('dlg').close();go('sets')">ดูทุกชุดและทุกสี</button></div>`;
}
/* ===== stats ranking ===== */
var STS={k:'TOTAL',dir:-1}; // var: a #ranking link renders before this line runs
function renderStats(){
  STS=STS||{k:'TOTAL',dir:-1};
  const t=document.getElementById('stTable');if(!t)return;
  const se=document.getElementById('ste');if(!se.options.length)se.innerHTML='<option value="">ทุกธาตุ</option>'+E.map(x=>`<option value="${x.k}">${x.th}</option>`).join('');
  const q=(document.getElementById('stq').value||'').trim().toLowerCase(),ek=se.value,rk=document.getElementById('str').value,sk=document.getElementById('sts').value;
  const tot=a=>STAT.reduce((n,k)=>n+(a.s[k]||0),0),val=(a,k)=>k==='TOTAL'?tot(a):(a.s[k]||0);
  const list=A.filter(a=>!a.u&&a.s&&a.s.HP&&(!q||nameHit(a,q))&&(!ek||a.e.includes(ek))&&(!rk||a.r===rk)&&(!sk||a.st===sk)).sort((x,y)=>(val(x,STS.k)-val(y,STS.k))*STS.dir||x.no.localeCompare(y.no));
  const max={};STAT.concat('TOTAL').forEach(k=>max[k]=Math.max(1,...A.filter(a=>a.s&&a.s.HP).map(a=>val(a,k))));
  const head=STAT.concat('TOTAL').map(k=>`<th data-sk="${k}" class="${STS.k===k?'on':''}" style="text-align:right;cursor:pointer">${k==='TOTAL'?'รวม':STAT_L[k]||k}${STS.k===k?(STS.dir<0?' ↓':' ↑'):''}</th>`).join('');
  t.innerHTML=`<thead><tr><th>#</th><th>Aniimo</th>${head}</tr></thead><tbody>${list.map((a,i)=>`<tr><td class="small muted">${i+1}</td><td><button type="button" class="stn" data-open="${a.slug}"><img src="${TH(a.i)}" alt="" loading="lazy"><span><b>${esc(a.th||a.name)}</b><span class="row">${a.e.map(badge).join('')}${roleChip(a.r)}</span></span></button></td>${STAT.concat('TOTAL').map(k=>`<td style="text-align:right"><span class="stv" style="--w:${Math.round(val(a,k)/max[k]*100)}%">${val(a,k)}</span></td>`).join('')}</tr>`).join('')}</tbody>`;
}
document.addEventListener('click',e=>{const h=e.target.closest('#stTable th[data-sk]');if(!h)return;const k=h.dataset.sk;STS=STS.k===k?{k,dir:-STS.dir}:{k,dir:-1};renderStats()});
['stq','ste','str','sts'].forEach(id=>{const el=document.getElementById(id);el&&el.addEventListener(el.tagName==='INPUT'?'input':'change',renderStats)});

/* ===== event calendar: four weeks from this Monday, one bar per event (Thai time) ===== */
function renderEvCal(){
  const el=document.getElementById('evCal');if(!el||typeof eventWindow!=='function')return;
  const now=Date.now(),d0=new Date();d0.setHours(0,0,0,0);d0.setDate(d0.getDate()-((d0.getDay()+6)%7));const start=+d0,DAY=864e5,N=28;
  const rows=[];
  EVENTS.filter(e=>e.kind!=='gameplay').forEach(e=>{const w=eventWindow(e,now);if((w.state==='live'||w.state==='upcoming')&&w.end)rows.push({t:tr(e.t),s:w.start||now,e:w.end,live:w.state==='live'})});
  (window.UPCOMING||[]).forEach(u=>{const [s,t]=parseRange(u.dates);if(s&&t&&!rows.some(r=>r.t===u.name&&Math.abs(r.s-s)<DAY))rows.push({t:u.name,s,e:t,live:false})});
  const vis=rows.filter(r=>r.e>start&&r.s<start+N*DAY).sort((a,b)=>a.s-b.s).slice(0,18);
  if(!vis.length){el.innerHTML='';return}
  const DN=['จ','อ','พ','พฤ','ศ','ส','อา'],today=Math.floor((now-start)/DAY);
  el.innerHTML=`<div class="cal" style="--n:${N}"><div class="cal-days">${Array.from({length:N},(_,i)=>{const d=new Date(start+i*DAY);return `<span class="${i===today?'on':''}${i%7===0?' wk':''}"><small>${DN[i%7]}</small>${d.getDate()}</span>`}).join('')}</div>
    ${vis.map(r=>{const a=Math.max(0,Math.floor((r.s-start)/DAY)),b=Math.min(N,Math.ceil((r.e-start)/DAY));return `<div class="cal-row"><span class="cal-bar${r.live?' live':''}" style="grid-column:${a+1}/${Math.max(a+2,b+1)}" title="${esc(r.t)}">${esc(r.t)}</span></div>`}).join('')}</div>`;
}

/* ===== player skills & talents ===== */
var psKind='';
function renderPSkills(){
  const el=document.getElementById('psList');if(!el)return;const L=window.PSKILLS||[];
  const TT={Student:'นักเรียน',Wayfarer:'นักเดินทาง',Trailblazer:'ผู้บุกเบิก'};
  const first=p=>p.lv[0]?p.lv[0][0]:'';const order=t=>{const [n,w]=t.split(' ');return ['Student','Wayfarer','Trailblazer','Explorer','Pioneer'].indexOf(w)*10+['I','II','III','IV','V'].indexOf(n)};
  const groups={};L.filter(p=>!psKind||p.k===psKind).forEach(p=>{(groups[first(p)]=groups[first(p)]||[]).push(p)});
  el.innerHTML=Object.keys(groups).sort((a,b)=>order(a)-order(b)).map(t=>{const [n,w]=t.split(' ');return `<div class="gsec"><h3>ยศ ${esc(TT[w]||w)} ${n} <small class="muted">${esc(t)}</small></h3><div class="psgrid">${groups[t].map(p=>`<div class="dpanel ps"><div class="ps-h"><b>${esc(LANG==='en'||!p.th?p.n:p.th)}</b><span class="chip ${p.k}">${p.k==='active'?'สกิลกดใช้':'พรสวรรค์'}</span></div>${p.th&&LANG!=='en'?`<small class="muted">${esc(p.n)}</small>`:''}<p>${esc(LANG==='en'||!p.dth?p.d:p.dth)}</p>${p.mx>1||p.lv.length>1?`<div class="small muted">เลเวลสูงสุด ${p.mx}</div><div class="pslv">${p.lv.map((x,i)=>`<span>Lv${i+1}: ยศ ${esc(TT[x[0].split(' ')[1]]||x[0].split(' ')[1])} ${x[0].split(' ')[0]} · ${x[1]} ใบ</span>`).join('')}</div>`:`<div class="small muted">ใช้ Report Card ${p.lv[0]?p.lv[0][1]:1} ใบ</div>`}</div>`).join('')}</div></div>`}).join('')||'<p class="muted">ยังไม่มีข้อมูล</p>';
}
document.addEventListener('click',e=>{const b=e.target.closest('#psSeg button');if(!b)return;psKind=b.dataset.k;document.querySelectorAll('#psSeg button').forEach(x=>x.setAttribute('aria-pressed',x===b));renderPSkills()});

/* ===== support: why, live numbers, optional goal; gentle nudge for regular visitors ===== */
(()=>{
  const el=document.getElementById('supWhy');if(!el)return;
  const D=(window.CODES&&CODES.donate)||{},rel=ANIIMO.filter(a=>!a.u).length,items=(window.META&&META.items_total)||(Array.isArray(ITEMS)?ITEMS:ITEMS.list).length;
  const goal=+D.goal||0,raised=Math.min(+D.raised||0,goal),gp=goal?Math.round(raised/goal*100):0;
  el.innerHTML=`<div class="sw-grid"><div><h3>เงินสนับสนุนใช้กับอะไร</h3><ul>
      <li><b>ค่าโดเมน</b> aniiguide.trade ที่ต้องต่ออายุทุกปี</li>
      <li><b>ที่เก็บไฟล์</b> โมเดล 3D และรูปทั้งหมด เมื่อคนเข้าเยอะจนเกินโควต้าฟรี</li>
      <li><b>เวลาทำเว็บ</b> แปลข้อมูลเกมเป็นไทย สรุปข่าว เพิ่มเครื่องมือใหม่</li></ul></div>
    <div><h3>ตอนนี้เว็บทำอะไรให้แล้ว</h3><div class="sw-stats"><span><b>${rel}</b>Aniimo</span><span><b>${items.toLocaleString(LOC)}</b>ไอเท็ม</span><span><b>${((window.MAPSTAT&&MAPSTAT.n)||4337).toLocaleString(LOC)}</b>จุดบนแผนที่</span><span><b>ทุกวัน</b>อัปเดตข้อมูล</span></div>
      <p class="small muted">ไม่มีโฆษณา ไม่ต้องสมัคร ใช้ได้ทุกฟีเจอร์ฟรี เงินสนับสนุนไม่ได้ปลดล็อกอะไรเพิ่ม</p></div></div>
    ${goal?`<div class="sw-goal"><div class="sw-gh"><b>${esc(D.for||'เป้าหมาย')}</b><span>${raised.toLocaleString(LOC)} / ${goal.toLocaleString(LOC)} บาท · ${gp}%</span></div><div class="sw-bar"><i style="width:${gp}%"></i></div></div>`:''}`;
})();
const NUDGE={days:[],last:0};
try{Object.assign(NUDGE,JSON.parse(localStorage.getItem('aniimo-nudge')||'{}'))}catch(_){}
{const d=new Date().toISOString().slice(0,10);if(!NUDGE.days.includes(d)){NUDGE.days=NUDGE.days.concat(d).slice(-60);try{localStorage.setItem('aniimo-nudge',JSON.stringify(NUDGE))}catch(_){}}}
function nudge(){ // regular visitors only (3+ days), once per 14 days, never on the support or admin pages
  if(!(window.META&&META.donate)||NUDGE.days.length<3||Date.now()-NUDGE.last<14*864e5||current==='support'||current==='admin')return;
  const n=document.getElementById('nudge');if(!n||!n.hidden)return;
  document.getElementById('nudgeDays').textContent=NUDGE.days.length;n.hidden=false;
  NUDGE.last=Date.now();try{localStorage.setItem('aniimo-nudge',JSON.stringify(NUDGE))}catch(_){}track('view','nudge');
}
document.addEventListener('click',e=>{
  if(e.target.closest('#nudgeX,#nudgeLater,#nudgeGo')){document.getElementById('nudge').hidden=true;if(e.target.closest('#nudgeGo'))track('view','nudge-go');return}
  if(e.target.closest('#heroCopy,[data-c],#tmShot,#bldSave,#supShare'))setTimeout(nudge,1200); // right after something useful
});
setTimeout(()=>{if(current==='home')nudge()},25000); // or after a while on the home page
/* ===== "ไปต่อ": related pages under every page, so a visitor who came for one thing sees what else is here ===== */
var NEXT; // filled below; a deep link can call nextUp() before this line runs
NEXT={codes:['events','daily','dex','team'],events:['codes','daily','map','news'],dex:['tier','team','builder','ranking'],tier:['dex','team','builds','ranking'],
  map:['eggs','bosses','events','regions'],news:['events','codes','whisperwake'],items:['helditems','builds','eggs'],helditems:['builds','builder','items'],
  team:['builder','tier','elements'],builder:['builds','team','helditems'],builds:['builder','team','tier'],daily:['codes','events','collection'],
  beginner:['howto','daily','growth','pskills'],howto:['beginner','map','events'],whisperwake:['dex','map','events'],bosses:['team','elements','map'],
  ranking:['dex','tier','compare'],sets:['dex','cosmetics'],pskills:['beginner','howto','growth']};
function nextUp(id){
  if(id==='home'||id==='admin')return;
  if(!NEXT){setTimeout(()=>nextUp(id));return}
  const sec=document.querySelector(`.view[data-view="${id}"]`);if(!sec)return;
  let box=sec.querySelector(':scope > .nextup');
  if(!box){box=document.createElement('nav');box.className='nextup';box.setAttribute('aria-label','ไปต่อ');sec.appendChild(box)}
  const ids=((NEXT||{})[id]||['codes','events','dex','team']).filter(x=>x!==id&&VIEWS.some(v=>v.id===x)).slice(0,4);
  box.innerHTML=`<p class="eyebrow">ไปต่อ</p><div class="nu">${ids.map(x=>{const v=VIEWS.find(y=>y.id===x);return `<button type="button" data-go="${x}"><svg><use href="#i-${v.ic||'star'}"/></svg><span><b>${esc(v.th)}</b><small>${esc(v.d||'')}</small></span></button>`}).join('')}</div>`;
}

/* ===== social posts for the owner: Thai text built from today's data, ready to copy ===== */
function socialPosts(){
  const site='https://aniiguide.trade',D=(window.CODES||{}),codes=(D.codes||[]).filter(c=>!c.expired);
  const dt=x=>new Date(x+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short'});
  const now=Date.now(),left=t=>(t||'').replace(/(\d+)d/,'$1 วัน').replace(/(\d+)h/,'$1 ชม.').replace(/(\d+)m/,'$1 นาที');
  const live=EVENTS.filter(e=>e.kind==='event'&&e.ends).slice(0,6),up=(window.UPCOMING||[]).slice(0,5);
  const P=[];
  P.push(['โค้ดที่ยังใช้ได้',`🎁 โค้ด Aniimo ที่ยังใช้ได้ (เช็ก ${D.codes_checked?dt(D.codes_checked):'ล่าสุด'})\n\n${codes.slice(0,10).map(c=>`▫️ ${c.code} — ${c.reward}`).join('\n')}\n\nแลกที่ Settings → Account → Gift Code Redemption\nกดคัดลอกโค้ดได้ที่ 👉 ${site}/p/codes/\n\n#Aniimo #โค้ดAniimo #AniiGuide`]);
  P.push(['อีเวนต์ที่กำลังจัด',`📅 อีเวนต์ Aniimo ตอนนี้ (เวลาไทย)\n\n${live.map(e=>`🔸 ${tr(e.t)} — เหลือ ${left(e.ends)}`).join('\n')}${up.length?`\n\nกำลังจะมา\n${up.map(u=>`🔹 ${u.name} · ${u.dates}`).join('\n')}`:''}\n\nปฏิทินและรายละเอียดครบ 👉 ${site}/#events\n\n#Aniimo #อีเวนต์Aniimo`]);
  const n=(window.NEWS||[])[0];
  if(n)P.push(['ข่าวล่าสุด',`📰 ${n.title}\n\n${n.lede}\n\nอ่านสรุปภาษาไทย 👉 ${site}/p/news/${n.id}/\n\n#Aniimo #ข่าวAniimo`]);
  if(typeof WW_OPEN!=='undefined'&&WW_OPEN&&now<WW_OPEN){const d=Math.ceil((WW_OPEN-now)/864e5);P.push(['นับถอยหลัง Whisperwake Isles',`🏝️ อีก ${d} วัน Whisperwake Isles เปิด!\n\nพื้นที่ใหม่พร้อม Aniimo ใหม่ เตรียมตัวยังไง ดูรายชื่อและธาตุที่ควรเตรียมได้ที่ 👉 ${site}/#whisperwake\n\n#Aniimo #WhisperwakeIsles`])}
  const a=ANIIMO.filter(x=>!x.u)[Math.floor(now/864e5)%ANIIMO.filter(x=>!x.u).length];
  if(a)P.push(['Aniimo ประจำวัน',`✨ Aniimo ประจำวัน: ${a.th||a.name} (${a.name})\nธาตุ ${a.e.map(k=>EK[k].th).join(' / ')} · บทบาท ${a.r}\n\nดูสกิล ค่าสถานะ ร่าง และโมเดล 3D 👉 ${site}/a/${a.slug}/\n\n#Aniimo #AniiGuide`]);
  return `<div class="acard"><div class="ahead"><h3>โพสต์พร้อมแชร์</h3><small>สร้างจากข้อมูลวันนี้ · กดคัดลอกแล้ววางในเพจ กลุ่ม หรือ LINE OA</small></div>
    <p class="amute">โพสต์สม่ำเสมอ โดยเฉพาะวันที่มีโค้ดหรืออีเวนต์ใหม่ ช่วยให้คนกลับมาเว็บมากที่สุด ลิงก์ในโพสต์พาไปหน้าที่ตรงเรื่องเลย</p></div>
    ${P.map(([h,t],i)=>`<div class="acard"><div class="ahead"><h3>${h}</h3><button type="button" class="abtn" data-copypost="${i}">คัดลอก</button></div><textarea class="apost" id="post${i}" rows="${Math.min(14,t.split('\n').length+1)}" readonly>${esc(t)}</textarea></div>`).join('')}`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-copypost]');if(!b)return;const t=document.getElementById('post'+b.dataset.copypost);
  try{navigator.clipboard.writeText(t.value).then(()=>{b.textContent='คัดลอกแล้ว'})}catch(_){t.select()}});

/* ===== community: approved posts for everyone, a form that sends posts for the owner to check ===== */
var CM={kind:'question',lists:{},err:'',prefill:null,open:{}};
const CM_TAGS={general:'ทั่วไป',team:'ทีมและบิลด์',catch:'จับและเลี้ยง',heist:'Egg Heist',boss:'บอส',home:'Homeland',event:'อีเวนต์',bug:'ปัญหาในเกม'};
const SRV_TH={asia:'Asia-Pacific',america:'Americas',europe:'Europe'};
async function cmLoad(force){
  const k=CM.kind;if(!SB.url){CM.err='off';cmRender();return}
  if(CM.lists[k]&&!force){cmRender();return}
  document.getElementById('cmList').innerHTML='<p class="muted">กำลังโหลด…</p>';
  try{CM.lists[k]=await sbCall('community_list',{only_kind:k,lim:60})||[];CM.err=''}catch(e){CM.err=String(e.message)==='404'?'missing':'net'}
  cmRender();
}
function cmCard(p){
  const d=p.data||{},when=new Date(p.at).toLocaleDateString(LOC,{day:'numeric',month:'short'});
  const srv=p.server?`<span class="chip">${esc(SRV_TH[p.server]||p.server)}</span>`:'';
  const rp=`<div class="cm-rp"><button type="button" class="btn" data-cmrep="${p.id}">💬 ${p.replies?`${p.replies} คำตอบ`:'ตอบกลับ'}</button><div class="cm-replies" id="cmr-${p.id}" hidden></div></div>`;
  if(p.kind==='question'||p.kind==='talk')return `<article class="dpanel cm-card ${p.kind}"><div class="cm-h"><div><b>${p.kind==='question'?'❓ ':''}${esc(p.title)}</b><small>${when}</small></div>${d.tag&&CM_TAGS[d.tag]?`<span class="chip">${CM_TAGS[d.tag]}</span>`:''}</div>${p.body?`<p>${esc(p.body)}</p>`:''}${rp}</article>`;
  if(p.kind==='build'){const a=BY[d.slug];return `<article class="dpanel cm-card"><div class="cm-h">${a?`<img src="${TH(a.i)}" alt="">`:''}<div><b>${esc(p.title)}</b><small>${a?esc(a.th||a.name)+' · ':''}${when}</small></div></div>${p.body?`<p>${esc(p.body)}</p>`:''}${d.code&&/^builder-/.test(d.code)?`<a class="btn" href="#${esc(d.code)}">เปิดในตัวจัดบิลด์</a>`:''}${rp}</article>`}
  if(p.kind==='home')return `<article class="dpanel cm-card"><div class="cm-h"><div><b>${esc(p.title)}</b><small>${when}</small></div>${srv}</div>${d.code?`<div class="cm-code"><code>${esc(d.code)}</code><button type="button" class="btn" data-cmcopy="${esc(d.code)}">คัดลอก</button></div>`:''}${p.body?`<p>${esc(p.body)}</p>`:''}${rp}</article>`;
  return `<article class="dpanel cm-card"><div class="cm-h"><div><b>${esc(p.title)}</b><small>${d.ign?esc(d.ign)+' · ':''}${when}</small></div>${srv}</div>${d.uid?`<div class="cm-code"><span class="small muted">UID</span><code>${esc(d.uid)}</code><button type="button" class="btn" data-cmcopy="${esc(d.uid)}">คัดลอก</button></div>`:''}${p.body?`<p>${esc(p.body)}</p>`:''}${rp}</article>`;
}
function cmRender(){
  const el=document.getElementById('cmList');if(!el)return;
  if(CM.err==='missing'||CM.err==='off'){el.innerHTML='<p class="muted">ระบบชุมชนกำลังเปิดเร็ว ๆ นี้</p>';return}
  if(CM.err){el.innerHTML='<p class="muted">โหลดโพสต์ไม่สำเร็จ ลองใหม่อีกครั้ง</p>';return}
  const L=CM.lists[CM.kind]||[];
  el.innerHTML=L.length?L.map(cmCard).join(''):`<p class="muted">ยังไม่มีโพสต์ในหมวดนี้ เป็นคนแรกที่โพสต์ได้เลย</p>`;
}
function cmForm(){
  const f=document.getElementById('cmForm'),k=CM.kind,pf=CM.prefill||{};
  const srv=`<label>เซิร์ฟเวอร์<select name="server"><option value="asia">Asia-Pacific</option><option value="america">Americas</option><option value="europe">Europe</option></select></label>`;
  const opts=ANIIMO.filter(a=>!a.u).map(a=>`<option value="${a.slug}" ${pf.slug===a.slug?'selected':''}>${esc(a.th||a.name)}</option>`).join('');
  const tagSel=`<label>หมวด<select name="tag">${Object.entries(CM_TAGS).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label>`;
  const fields={question:`${tagSel}<label>คำถาม<input name="title" maxlength="80" required placeholder="เช่น Aniimo ตัวไหนเหมาะกับ Egg Heist ระดับ Chaos"></label><label>รายละเอียด<textarea name="body" maxlength="1000" rows="4" placeholder="ตอนนี้มีตัวไหน เล่นถึงไหนแล้ว"></textarea></label>`,
    talk:`${tagSel}<label>หัวข้อ<input name="title" maxlength="80" required placeholder="เช่น ใครได้ Prismana จาก Vein Abundance บ้าง"></label><label>ข้อความ<textarea name="body" maxlength="1000" rows="4"></textarea></label>`,
    build:`<label>Aniimo<select name="slug">${opts}</select></label><label>ชื่อบิลด์<input name="title" maxlength="80" required placeholder="เช่น หมาป่าโลกันตร์สาย Break ล้มบอสไว"></label>
      <label>โค้ดบิลด์ (จากปุ่ม "แชร์ในชุมชน" ในตัวจัดบิลด์)<input name="code" maxlength="300" value="${esc(pf.code||'')}" placeholder="builder-…"></label><label>อธิบายการใช้<textarea name="body" maxlength="1000" rows="4" placeholder="ใช้สกิลไหนก่อน เหมาะกับบอสหรือโหมดไหน"></textarea></label>`,
    home:`${srv}<label>โค้ดแปลนบ้าน<input name="code" maxlength="100" required></label><label>ชื่อแปลน<input name="title" maxlength="80" required placeholder="เช่น บ้านฟาร์มเก็บของครบ"></label><label>รายละเอียด<textarea name="body" maxlength="1000" rows="3" placeholder="ต้องใช้เลเวลบ้านเท่าไร เด่นตรงไหน"></textarea></label>`,
    friend:`${srv}<label>UID ในเกม<input name="uid" maxlength="20" inputmode="numeric" pattern="[0-9]{6,20}" required></label><label>ชื่อในเกม (ไม่บังคับ)<input name="ign" maxlength="30"></label><label>หัวข้อ<input name="title" maxlength="80" required placeholder="เช่น หาทีม Egg Heist ระดับ Chaos ช่วงค่ำ"></label><label>รายละเอียด<textarea name="body" maxlength="500" rows="3" placeholder="เล่นช่วงไหน อยากเล่นอะไรด้วยกัน"></textarea></label>`};
  f.innerHTML=`<h3>โพสต์ใหม่ · ${{question:'ถามตอบ',talk:'พูดคุย',build:'บิลด์',home:'โค้ดแปลนบ้าน',friend:'หาเพื่อนเล่น'}[k]}</h3>${fields[k]}<input name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
    <p class="small muted">โพสต์จะขึ้นเว็บหลังผู้ดูแลตรวจ ห้ามใส่เบอร์โทร อีเมล ลิงก์ หรือข้อมูลส่วนตัว และห้ามซื้อขายบัญชีหรือของในเกม</p>
    <div class="cm-act"><button type="submit" class="btn primary">ส่งโพสต์</button><button type="button" class="btn" id="cmCancel">ยกเลิก</button><span class="small" id="cmMsg" aria-live="polite"></span></div>`;
  f.hidden=false;CM.prefill=null;
}
document.addEventListener('click',e=>{
  const t=e.target;
  const sb=t.closest('#cmSeg button');if(sb){CM.kind=sb.dataset.k;document.querySelectorAll('#cmSeg button').forEach(x=>x.setAttribute('aria-pressed',x===sb));document.getElementById('cmForm').hidden=true;cmLoad();return}
  if(t.closest('#cmNew')){cmForm();return}
  if(t.closest('#cmCancel')){document.getElementById('cmForm').hidden=true;return}
  const cp=t.closest('[data-cmcopy]');if(cp){try{navigator.clipboard.writeText(cp.dataset.cmcopy).then(()=>{cp.textContent='คัดลอกแล้ว'})}catch(_){}return}
  if(t.closest('#bldToCm')){CM.kind='build';CM.prefill={slug:BLD.slug,code:bldCode()};go('community');document.querySelectorAll('#cmSeg button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.k==='build'));cmForm();return}
});
document.addEventListener('submit',async e=>{
  if(e.target.id!=='cmForm')return;e.preventDefault();
  const f=e.target,v=n=>(f.elements[n]?f.elements[n].value:'').trim(),msg=document.getElementById('cmMsg'),btn=f.querySelector('[type=submit]');
  if(v('website')){msg.textContent='ส่งแล้ว รอผู้ดูแลตรวจ';return}
  if(/https?:\/\/|www\.|@[a-z0-9]|\b0\d{8,9}\b/i.test(v('title')+' '+v('body'))){msg.textContent='ห้ามใส่ลิงก์ อีเมล หรือเบอร์โทร';return}
  const k=CM.kind,data=k==='build'?{slug:v('slug'),code:/^builder-[\w~.-]+$/.test(v('code'))?v('code'):''}:k==='home'?{code:v('code')}:k==='friend'?{uid:v('uid'),ign:v('ign')}:{tag:v('tag')};
  const row={kind:k,title:v('title'),body:v('body'),data,server:(k==='home'||k==='friend')?v('server'):null,visitor:VISITOR||null};
  if(row.title.length<3){msg.textContent='ใส่หัวข้ออย่างน้อย 3 ตัวอักษร';return}
  btn.disabled=true;msg.textContent='กำลังส่ง…';
  try{
    const r=await fetch(SB.url+'/rest/v1/community_posts',{method:'POST',headers:{apikey:SB.key,Authorization:'Bearer '+SB.key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(row)});
    if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.code==='54000'?'many':r.status===404?'missing':'net')}
    msg.textContent='ส่งแล้ว ผู้ดูแลจะตรวจและขึ้นเว็บเร็ว ๆ นี้ ขอบคุณที่แชร์ครับ';f.querySelectorAll('input,textarea').forEach(x=>{if(x.name!=='code'||k!=='build')x.value=''});
  }catch(err){msg.textContent=err.message==='many'?'ส่งถี่เกินไป ลองใหม่ในอีกสักครู่':err.message==='missing'?'ระบบชุมชนยังไม่เปิด':'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง'}
  btn.disabled=false;
});

/* ===== community replies: approved ones under each post, a form to send one (checked by the owner first) ===== */
async function cmReplies(pid){
  const box=document.getElementById('cmr-'+pid);if(!box)return;
  box.innerHTML='<p class="small muted">กำลังโหลด…</p>';
  let L=[];try{L=await sbCall('community_replies_list',{pid})||[]}catch(_){}
  box.innerHTML=`${L.map(r=>`<div class="cm-reply"><p>${esc(r.body)}</p><small>${new Date(r.at).toLocaleDateString(LOC,{day:'numeric',month:'short'})}</small></div>`).join('')||'<p class="small muted">ยังไม่มีคำตอบ</p>'}
    <form class="cm-rform" data-rpost="${pid}"><textarea name="body" maxlength="1000" rows="2" required placeholder="เขียนคำตอบ (ผู้ดูแลจะตรวจก่อนขึ้นเว็บ)"></textarea><input name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true"><div class="cm-act"><button type="submit" class="btn primary">ส่งคำตอบ</button><span class="small" aria-live="polite"></span></div></form>`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cmrep]');if(!b)return;const id=b.dataset.cmrep,box=document.getElementById('cmr-'+id);if(!box)return;box.hidden=!box.hidden;if(!box.hidden)cmReplies(id)});
document.addEventListener('submit',async e=>{
  const f=e.target.closest('.cm-rform');if(!f)return;e.preventDefault();
  const msg=f.querySelector('[aria-live]'),btn=f.querySelector('[type=submit]'),body=f.elements.body.value.trim();
  if(f.elements.website.value){msg.textContent='ส่งแล้ว รอผู้ดูแลตรวจ';return}
  if(body.length<2){msg.textContent='พิมพ์อย่างน้อย 2 ตัวอักษร';return}
  if(/https?:\/\/|www\.|@[a-z0-9]|\b0\d{8,9}\b/i.test(body)){msg.textContent='ห้ามใส่ลิงก์ อีเมล หรือเบอร์โทร';return}
  btn.disabled=true;msg.textContent='กำลังส่ง…';
  try{const r=await fetch(SB.url+'/rest/v1/community_replies',{method:'POST',headers:{apikey:SB.key,Authorization:'Bearer '+SB.key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({post_id:+f.dataset.rpost,body,visitor:VISITOR||null})});
    if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.code==='54000'?'many':r.status===404?'missing':'net')}
    f.elements.body.value='';msg.textContent='ส่งแล้ว คำตอบจะขึ้นหลังผู้ดูแลตรวจ ขอบคุณครับ'}
  catch(err){msg.textContent=err.message==='many'?'ส่งถี่เกินไป ลองใหม่ในอีกสักครู่':err.message==='missing'?'ระบบตอบกลับยังไม่เปิด':'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง'}
  btn.disabled=false;
});

/* ===== back office: community moderation ===== */
var CMA={filter:'pending',items:null,err:'',mode:'posts'};
async function cmaLoad(){
  if(AD.demo&&CMA.mode==='replies'){CMA.items=[{id:9,at:new Date().toISOString(),body:'ใช้ตัวธาตุไฟคู่กับตัวฮีลจะผ่านง่ายขึ้น',status:'pending',post_title:'ตัวไหนเหมาะกับ Egg Heist',post_kind:'question'}];CMA.err='';return}
  if(AD.demo){CMA.items=[{id:1,at:new Date().toISOString(),kind:'friend',title:'หาทีม Egg Heist ช่วงค่ำ',body:'เล่นทุกวัน 2 ทุ่ม',data:{uid:'412000273795',ign:'Pathfinder'},server:'asia',status:'pending'}];CMA.err='';return}
  try{CMA.items=await sbRpc(CMA.mode==='replies'?'community_admin_replies':'community_admin_list',{only_status:CMA.filter==='all'?null:CMA.filter,lim:200})||[];CMA.err=''}catch(e){CMA.items=[];CMA.err=e.message}
}
function communityPanel(){
  const st={pending:'รอตรวจ',approved:'อนุมัติแล้ว',rejected:'ไม่อนุมัติ',all:'ทั้งหมด'},kn={build:'บิลด์',home:'แปลนบ้าน',friend:'หาเพื่อน',question:'ถามตอบ',talk:'พูดคุย'};
  const head=`<div class="acard"><div class="ahead"><h3>ตรวจโพสต์ชุมชน</h3><small>โพสต์ขึ้นเว็บเมื่อกดอนุมัติเท่านั้น</small></div><div class="aseg"><button type="button" data-cmam="posts" aria-pressed="${CMA.mode==='posts'}">โพสต์</button><button type="button" data-cmam="replies" aria-pressed="${CMA.mode==='replies'}">คำตอบ</button></div><div class="aseg" id="cmaFilter">${Object.entries(st).map(([k,l])=>`<button type="button" data-cmaf="${k}" aria-pressed="${CMA.filter===k}">${l}</button>`).join('')}</div></div>`;
  if(CMA.err==='nofeedback')return head+`<div class="acard"><p class="amute">ยังไม่ได้ติดตั้ง${CMA.mode==='replies'?'ระบบคำตอบ':'ระบบชุมชน'}ในฐานข้อมูล: เปิด Supabase → SQL Editor แล้วรันไฟล์ tools/admin/${CMA.mode==='replies'?'community2.sql':'community.sql'} ครั้งเดียว</p></div>`;
  if(CMA.mode==='replies'){const L=CMA.items||[];return head+(L.length?L.map(r=>`<div class="acard"><div class="ahead"><h3>ตอบ: ${esc(r.post_title||'')}</h3><small>${kn[r.post_kind]||''} · ${new Date(r.at).toLocaleString(LOC,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small></div><p>${esc(r.body)}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${r.status!=='approved'?`<button type="button" class="abtn" data-cmar="${r.id}" data-s="approved">อนุมัติ</button>`:''}${r.status!=='rejected'?`<button type="button" class="abtn" data-cmar="${r.id}" data-s="rejected">ไม่อนุมัติ</button>`:''}<button type="button" class="abtn" data-cmar="${r.id}" data-s="delete">ลบ</button></div></div>`).join(''):'<div class="acard"><div class="aempty"><b>ไม่มีคำตอบ</b><span>ไม่มีรายการในหมวดนี้</span></div></div>')}
  if(CMA.err)return head+'<div class="acard"><p class="amute">โหลดโพสต์ไม่สำเร็จ กดรีเฟรชเพื่อลองใหม่</p></div>';
  const L=CMA.items||[];
  return head+(L.length?L.map(p=>`<div class="acard"><div class="ahead"><h3>${esc(p.title)}</h3><small>${kn[p.kind]||p.kind} · ${new Date(p.at).toLocaleString(LOC,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}${p.server?' · '+esc(SRV_TH[p.server]||p.server):''}</small></div>
      ${p.body?`<p>${esc(p.body)}</p>`:''}<p class="amute">${esc(JSON.stringify(p.data||{}))}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${p.status!=='approved'?`<button type="button" class="abtn" data-cma="${p.id}" data-s="approved">อนุมัติ</button>`:''}${p.status!=='rejected'?`<button type="button" class="abtn" data-cma="${p.id}" data-s="rejected">ไม่อนุมัติ</button>`:''}<button type="button" class="abtn" data-cma="${p.id}" data-s="delete">ลบ</button></div></div>`).join(''):'<div class="acard"><div class="aempty"><b>ไม่มีโพสต์</b><span>ไม่มีรายการในหมวดนี้</span></div></div>');
}
document.addEventListener('click',async e=>{
  const f=e.target.closest('[data-cmaf]');if(f){CMA.filter=f.dataset.cmaf;await cmaLoad();renderAdmin(true);return}
  const md=e.target.closest('[data-cmam]');if(md){CMA.mode=md.dataset.cmam;await cmaLoad();renderAdmin(true);return}
  const rr=e.target.closest('[data-cmar]');if(rr){if(rr.dataset.s==='delete'&&!rr.dataset.sure){rr.dataset.sure='1';rr.textContent='กดอีกครั้งเพื่อลบ';return}
    if(AD.demo){CMA.items=CMA.items.filter(x=>x.id!==+rr.dataset.cmar);renderAdmin(true);return}
    rr.disabled=true;try{await sbRpc('community_reply_set',{rid:+rr.dataset.cmar,new_status:rr.dataset.s});CM.lists={};await cmaLoad();renderAdmin(true)}catch(_){rr.disabled=false;rr.textContent='ไม่สำเร็จ ลองใหม่'}return}
  const b=e.target.closest('[data-cma]');if(!b)return;
  if(b.dataset.s==='delete'&&!b.dataset.sure){b.dataset.sure='1';b.textContent='กดอีกครั้งเพื่อลบ';return}
  if(AD.demo){CMA.items=CMA.items.filter(x=>x.id!==+b.dataset.cma);renderAdmin(true);return}
  b.disabled=true;try{await sbRpc('community_set',{pid:+b.dataset.cma,new_status:b.dataset.s});CM.lists={};await cmaLoad();renderAdmin(true)}catch(_){b.disabled=false;b.textContent='ไม่สำเร็จ ลองใหม่'}
});

/* ===== installed-app users: logged as views 'app-installed' (once) and 'app-open' (once per visit) ===== */
function logApp(key){if(!SB_ON||isOwner())return;try{sbInsert({kind:'view',key,visitor:VISITOR||null,device:DEVICE,lang:(navigator.language||'').slice(0,12),tz:TZ.slice(0,40)}).catch(()=>{})}catch(_){}}
addEventListener('appinstalled',()=>logApp('app-installed'));
setTimeout(()=>{const app=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  if(app){try{if(!sessionStorage.getItem('aniimo-appopen')){sessionStorage.setItem('aniimo-appopen','1');logApp('app-open')}}catch(_){}}},2000);
/* phones: the Aniimo list's filters fold behind one button that shows how many are on */
{const btn=document.getElementById('dFilt');if(btn){const bar=btn.closest('.bar-tools'),more=document.getElementById('dexMore'),n=document.getElementById('dFiltN');
  const count=()=>{const k=['de','dr','ds','dw','dc'].filter(id=>{const el=document.getElementById(id);return el&&el.value}).length+['dp','dsp'].filter(id=>{const el=document.getElementById(id);return el&&el.checked}).length;n.hidden=!k;n.textContent=k};
  btn.addEventListener('click',()=>{const on=!bar.classList.contains('open');bar.classList.toggle('open',on);more&&more.classList.toggle('open',on);btn.setAttribute('aria-expanded',on)});
  ['de','dr','ds','dw','dc','dp','dsp'].forEach(id=>{const el=document.getElementById(id);el&&el.addEventListener('change',count)});count()}}
function renderBuilds(){
  const g=document.getElementById('bgrid');if(!g)return;
  const be=document.getElementById('be');if(!be.options.length)be.innerHTML='<option value="">ทุกธาตุ</option>'+E.map(x=>`<option value="${x.k}">${x.th}</option>`).join('');
  const q=(document.getElementById('bq').value||'').trim().toLowerCase(),ek=be.value;
  const list=A.filter(a=>!a.u&&a.rec&&(!ek||a.e.includes(ek))&&(!q||nameHit(a,q)));
  g.innerHTML=list.map(a=>`<div class="bcard2"><button type="button" class="bpic" data-open="${a.slug}"><img src="${TH(a.i)}" alt="" loading="lazy"></button><div><b>${esc(a.th||a.name)}</b><div style="display:flex;gap:3px;margin:3px 0">${a.e.map(badge).join('')}${roleChip(a.r)}</div>
    ${a.rec.h?`<p class="small"><span class="muted">Held Item:</span> ${itemRef(a.rec.h[0])}${LANG==='th'?` <span class="muted">(${esc(a.rec.h[1])})</span>`:''}</p>`:''}
    ${a.rec.r?`<p class="small"><span class="muted">Rune:</span> ${itemRef(a.rec.r[0])}</p>`:''}
    <button type="button" class="btn" data-bbuild="${a.slug}" style="margin-top:6px">เปิดในตัวจัดบิลด์</button></div></div>`).join('')||'<p class="muted">ไม่พบ</p>';
}
