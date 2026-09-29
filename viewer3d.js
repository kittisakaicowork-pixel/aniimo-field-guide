// One 3D viewer for every place a model is shown: the Aniimo sheet (index.html), the model gallery
// (tools/model/gallery.html) and the 2D renders (tools/model/render.html), so they always match.
// three.js is passed in (the site loads it from the CDN, the tools from node_modules).
//
// Look: the game's own texture (a form's texture for forms), soft 3-step toon light, a thin outline.
// Everything that moves or glows is done inside the same shader as the texture, so it can never slide
// against it. Sparkling: the look's own texture plus a glow and twinkling sparkles in the type's colour.
// Motion: the game files carry no skeleton or animation keys, so the idle motion is ours: breathing,
// a slow sway that grows toward the top, loose parts (ears, tail, fur, wings) fluttering. Its period is
// the creature's in-game Idle clip length.

const IDLE = `uniform float uT,uP;uniform vec3 uMin,uSize;
vec3 idle(vec3 p,vec3 n){
  float h=clamp((p.y-uMin.y)/uSize.y,0.,1.),ph=6.2831*uT/uP,br=sin(ph);
  vec2 c=vec2(uMin.x+uSize.x*.5,uMin.z+uSize.z*.5),d=p.xz-c;
  float torso=smoothstep(.15,.45,h)*(1.-smoothstep(.65,.95,h));
  p.xz=c+d*(1.+.02*br*torso);
  float a=.04*sin(ph*.5)*h*h;d=p.xz-c;p.xz=c+vec2(d.x*cos(a)-d.y*sin(a),d.x*sin(a)+d.y*cos(a));
  p.y+=uSize.y*.01*br*h;
  float r=length(d)/max(uSize.x,uSize.z),loose=smoothstep(.3,.65,r)+.5*smoothstep(.85,1.,h);
  p+=n*uSize.y*.004*loose*sin(uT*4.+p.y*18./uSize.y+p.x*9./uSize.x);
  return p;}
`;
// mode: 0 plain, 1 Sparkling I-X, 2 Dazzling, 3 Shadow
const FRAG_DECL = `uniform vec3 uGlow;uniform float uMode,uSheen;\n`;
// In the game the 12 Sparkling types share one look and differ mostly in their glow and sparkles, so the body
// colours change only a little: Shadow a touch darker and cooler, Dazzling a touch brighter.
const FRAG_TINT = `
  if(uMode>2.5){diffuseColor.rgb=diffuseColor.rgb*.86+vec3(.01,0.,.03);}
  else if(uMode>1.5){diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.97,.9),.1);}
  else if(uMode>.5){diffuseColor.rgb=min(vec3(1.),diffuseColor.rgb*1.04);}`;
const FRAG_RIM = `
  {float f=pow(1.-abs(dot(normal,normalize(vViewPosition))),3.5);
   outgoingLight+=vec3(.35,.31,.28)*f*uSheen;
   if(uMode>.5)outgoingLight+=uGlow*f*(uMode>2.5?.6:uMode>1.5?.5:1.1);}`;

export function sceneLights(T, scene) {
  scene.add(new T.AmbientLight(0xffffff, 0.9), new T.HemisphereLight(0xfff4e8, 0x40385a, 0.7));
  const key = new T.DirectionalLight(0xffffff, 2.2); key.position.set(2, 3, 2.5); scene.add(key);
  const back = new T.DirectionalLight(0xdfe8ff, 0.8); back.position.set(-2, 1.5, -2.5); scene.add(back);
}

export function sparkleColour(look) {
  if (!look || !look.glow) return null;
  return look.glow;
}

// Build a posed, animated model. Returns {root, box, update(t), dispose()}.
export async function buildModel(T, { GLTFLoader, MeshoptDecoder }, { url, look = {}, period = 3, base = '' }) {
  const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
  const root = g.scene, meshes = [];
  root.traverse(o => o.isMesh && meshes.push(o));
  const box = new T.Box3().setFromObject(root);
  const mode = { '': 0, n: 0, s: 1, z: 2, d: 3 }[look.kind || ''] ?? 0;
  const U = {
    uT: { value: 0 }, uP: { value: period || 3 }, uMin: { value: box.min.clone() }, uSize: { value: box.getSize(new T.Vector3()) },
    uGlow: { value: new T.Color(look.glow || '#000000') }, uMode: { value: mode }, uSheen: { value: 1 },
  };
  const ramp = new T.DataTexture(new Uint8Array([125, 125, 125, 255, 200, 200, 200, 255, 255, 255, 255, 255]), 3, 1);
  ramp.minFilter = ramp.magFilter = T.NearestFilter; ramp.needsUpdate = true;
  const outline = new T.ShaderMaterial({
    side: T.BackSide, uniforms: U,
    vertexShader: IDLE + 'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(idle(position,normal)+normal*uSize.y*.0035,1.);}',
    fragmentShader: 'void main(){gl_FragColor=vec4(.11,.09,.15,1.);}',
  });
  const tl = new T.TextureLoader();
  // form looks use the form's own texture; Sparkling looks keep the base or form texture underneath
  const texFid = look.texFid, texKind = texFid ? 'n' : null;
  await Promise.all(meshes.map(async o => {
    let map = o.material.map;
    const nm = o.material.name || '', i = texKind && nm.startsWith('body:') ? (look.mats || []).indexOf(nm.slice(5)) : -1;
    if (i >= 0) {
      try { map = await tl.loadAsync(`${base}3d/v/${texFid}-${texKind}-${i}.webp`); map.flipY = false; map.colorSpace = T.SRGBColorSpace } catch (_) {}
    }
    const m = new T.MeshToonMaterial({ map, gradientMap: ramp, alphaTest: 0.4, side: T.DoubleSide });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = IDLE + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed=idle(vec3(position),normal);');
      sh.fragmentShader = FRAG_DECL + sh.fragmentShader
        .replace('#include <map_fragment>', '#include <map_fragment>' + FRAG_TINT)
        .replace('#include <opaque_fragment>', FRAG_RIM + '\n#include <opaque_fragment>');
    };
    m.customProgramCacheKey = () => 'aniiguide-toon';
    o.material = m;
    o.add(new T.Mesh(o.geometry, outline));
  }));
  // sparkles: points around the body that twinkle, in the type's colour
  let points = null;
  if (mode) {
    const n = 26, pos = new Float32Array(n * 3), seed = new Float32Array(n);
    const c = box.getCenter(new T.Vector3()), s = U.uSize.value;
    let k = 7; const rnd = () => (k = (k * 16807) % 2147483647) / 2147483647;
    for (let j = 0; j < n; j++) {
      const a = rnd() * Math.PI * 2, rr = 0.45 + rnd() * 0.25;
      pos.set([c.x + Math.cos(a) * s.x * rr, box.min.y + s.y * (0.1 + rnd() * 0.95), c.z + Math.sin(a) * s.z * rr], j * 3); seed[j] = rnd() * 6.28;
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('seed', new T.BufferAttribute(seed, 1));
    points = new T.Points(geo, new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: mode === 3 ? T.NormalBlending : T.AdditiveBlending, uniforms: { ...U, uPx: { value: 1 } },
      vertexShader: 'uniform float uT,uPx;uniform vec3 uSize;attribute float seed;varying float vA;void main(){vec4 q=modelViewMatrix*vec4(position+vec3(0.,sin(uT*.8+seed)*uSize.y*.03,0.),1.);vA=.35+.65*pow(.5+.5*sin(uT*2.2+seed*3.),2.);gl_PointSize=uPx*uSize.y*(.10+.05*sin(seed*7.))/-q.z*300.;gl_Position=projectionMatrix*q;}',
      fragmentShader: 'uniform vec3 uGlow;uniform float uMode;varying float vA;void main(){vec2 p=gl_PointCoord*2.-1.;float s=max(0.,1.-abs(p.x)*abs(p.y)*9.-dot(p,p)*.7);if(s<.02)discard;vec3 c=mix(uGlow,vec3(1.),uMode>2.5?0.:.45*s);gl_FragColor=vec4(c,s*vA);}',
    }));
    root.add(points);
  }
  return {
    root, box, uniforms: U, points,
    update(t) { U.uT.value = t },
    dispose() { root.traverse(o => { if (o.isMesh || o.isPoints) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.map && m.map.dispose(); m.dispose() }) } }) },
  };
}

// Fit the camera so the whole creature fills the frame the same way for every model.
export function frame(T, cam, box, yaw = 0.6, fill = 0.82) {
  const s = box.getSize(new T.Vector3());
  const w = Math.abs(s.x * Math.cos(yaw)) + Math.abs(s.z * Math.sin(yaw)), d = Math.abs(s.x * Math.sin(yaw)) + Math.abs(s.z * Math.cos(yaw));
  const t = Math.tan(T.MathUtils.degToRad(cam.fov / 2));
  const dist = Math.max(s.y / 2 / t, w / 2 / (t * cam.aspect)) / fill + d * 0.15;  // fit the front, not the far back
  cam.position.set(0, s.y * 0.06, dist); cam.lookAt(0, 0, 0); cam.near = dist / 50; cam.far = dist * 10; cam.updateProjectionMatrix();
  return dist;
}

// The interactive viewer used on the site and in the gallery.
export async function mountViewer(el, T, libs, { url, look, period, base = '', still = false }) {
  const w = el.clientWidth, h = el.clientHeight;
  const r = new T.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(w, h); r.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, w / h, 0.01, 100);
  sceneLights(T, scene);
  const m = await buildModel(T, libs, { url, look, period, base });
  if (!el.isConnected) { m.dispose(); r.dispose(); return null }
  const c = m.box.getCenter(new T.Vector3());
  m.root.position.sub(c); m.root.rotation.y = 0.6; scene.add(m.root);
  if (m.points) m.points.material.uniforms.uPx.value = r.getPixelRatio() * h / 400;
  const dist = frame(T, cam, m.box, 0.6);
  const ctl = new libs.OrbitControls(cam, r.domElement);
  ctl.enablePan = false; ctl.enableDamping = true; ctl.autoRotate = !still; ctl.autoRotateSpeed = 1.2; ctl.minDistance = dist * 0.45; ctl.maxDistance = dist * 2.2;
  el.replaceChildren(r.domElement);
  const t0 = performance.now();
  let alive = true;
  const tick = () => {
    if (!alive || !r.domElement.isConnected) { ctl.dispose(); m.dispose(); r.dispose(); return }
    if (!still) m.update((performance.now() - t0) / 1000);
    ctl.update(); r.render(scene, cam); requestAnimationFrame(tick);
  };
  tick();
  return { stop() { alive = false } };
}
