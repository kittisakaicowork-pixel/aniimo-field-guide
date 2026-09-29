// One 3D viewer for every place a model is shown: the Aniimo sheet (index.html), the model gallery
// (tools/model/gallery.html) and the 2D renders (tools/model/render.html), so they always match.
// three.js is passed in (the site loads it from the CDN, the tools from node_modules).
//
// Look: as close to the game as the export allows: the game's colour, normal and occlusion/roughness maps
// (a form's colour map for forms) under physically based light with a soft studio environment.
// Everything that moves or glows is done inside the model's own shader, so it can never slide against the
// texture. Sparkling: the look's own texture plus a glow and twinkling sparkles in the type's colour.
// Motion: the game files carry no skeleton or animation keys, so the idle motion is ours, built from the
// shape: breathing in the torso, the head nodding and turning, a tail swinging from its root, wings flapping
// for creatures the game says can fly or glide, flyers hovering, loose ends fluttering. Its period is the
// creature's in-game Idle clip length.

const IDLE = `uniform float uT,uP,uFly,uFold;uniform vec3 uMin,uSize;uniform mat4 uNode,uNodeInv;
vec3 rotX(vec3 p,vec3 o,float a){p-=o;float c=cos(a),s=sin(a);return o+vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
vec3 rotY(vec3 p,vec3 o,float a){p-=o;float c=cos(a),s=sin(a);return o+vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
vec3 rotZ(vec3 p,vec3 o,float a){p-=o;float c=cos(a),s=sin(a);return o+vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}
vec3 idle(vec3 p,vec3 n){
  vec3 c=uMin+uSize*.5;
  float h=clamp((p.y-uMin.y)/uSize.y,0.,1.),fx=(p.x-c.x)/(uSize.x*.5),fz=(p.z-c.z)/(uSize.z*.5);
  float ph=6.2831*uT/uP,br=sin(ph);
  float torso=smoothstep(.2,.45,h)*(1.-smoothstep(.7,.95,h))*(1.-smoothstep(.5,.9,abs(fx)));
  p.xz=c.xz+(p.xz-c.xz)*(1.+.025*br*torso);
  float tail=smoothstep(-.3,-.8,fz)*(1.-smoothstep(.75,.95,h));
  p=rotY(p,vec3(c.x,p.y,c.z-uSize.z*.2),.2*sin(ph*1.5)*tail);
  // wings: birds exported with wings spread get them folded down to the body (uFold, radians); flyers flap
  float wing=smoothstep(.45,.9,abs(fx))*smoothstep(.3,.55,h);
  vec3 sh=vec3(c.x+sign(fx)*uSize.x*.14,uMin.y+uSize.y*.62,p.z);
  p=rotZ(p,sh,-sign(fx)*uFold*smoothstep(.3,.5,abs(fx))*smoothstep(.3,.55,h));
  p=rotZ(p,sh,sign(fx)*(uFold>0.?.08:.3)*sin(ph*2.)*wing*uFly);
  float head=smoothstep(.62,.86,h);
  vec3 neck=vec3(c.x,uMin.y+uSize.y*.62,c.z);
  p=rotX(p,neck,.05*sin(ph+.8)*head);
  p=rotY(p,neck,.1*sin(ph*.37)*head);
  p.y+=uSize.y*(.008*br*h+uFly*.03*sin(ph));
  float r=length((p.xz-c.xz)/(uSize.xz*.5)),loose=.6*smoothstep(.75,1.,r)+.4*smoothstep(.88,1.,h);
  // a smooth field of position only, so parts that touch (eyes, fur, accessories) move exactly together
  p+=vec3(sin(uT*3.1+p.y*14./uSize.y),0.,cos(uT*2.7+p.x*11./uSize.x))*uSize.y*.004*loose;
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

// Soft studio light: an environment for reflections and fill, plus a key and a rim light.
export function setupScene(T, renderer, libs = {}) {
  const scene = new T.Scene();
  renderer.toneMapping = T.NeutralToneMapping ?? T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  if (libs.RoomEnvironment) {
    const pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new libs.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.9;
    pm.dispose();
  } else scene.add(new T.HemisphereLight(0xfff4e8, 0x40385a, 1.2));
  const key = new T.DirectionalLight(0xfff6ec, 1.8); key.position.set(2, 3, 2.5); scene.add(key);
  const rim = new T.DirectionalLight(0xdfe8ff, 0.9); rim.position.set(-2, 1.5, -2.5); scene.add(rim);
  return scene;
}

// Build a posed, animated model. Returns {root, box, update(t), dispose()}.
export async function buildModel(T, { GLTFLoader, MeshoptDecoder }, { url, look = {}, period = 3, base = '', motion = {} }) {
  const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
  const root = g.scene, meshes = [];
  root.traverse(o => o.isMesh && meshes.push(o));
  const box = new T.Box3().setFromObject(root);
  const mode = { '': 0, n: 0, s: 1, z: 2, d: 3 }[look.kind || ''] ?? 0;
  const U = {
    uT: { value: 0 }, uP: { value: period || 3 }, uFly: { value: motion.fly ? 1 : 0 }, uFold: { value: motion.fold || 0 },
    uMin: { value: box.min.clone() }, uSize: { value: box.getSize(new T.Vector3()) },
    uGlow: { value: new T.Color(look.glow || '#000000') }, uMode: { value: mode }, uSheen: { value: 0.35 },
  };
  const tl = new T.TextureLoader();
  // form looks use the form's own colour map; Sparkling looks keep the base or form texture underneath
  const texFid = look.texFid;
  await Promise.all(meshes.map(async o => {
    const src = o.material, m = src.clone();
    const nm = src.name || '', i = texFid && nm.startsWith('body:') ? (look.mats || []).indexOf(nm.slice(5)) : -1;
    if (i >= 0) {
      try { const map = await tl.loadAsync(`${base}3d/v/${texFid}-n-${i}.webp`); map.flipY = false; map.colorSpace = T.SRGBColorSpace; map.channel = src.map ? src.map.channel : 0; m.map = map } catch (_) {}
    }
    m.side = T.DoubleSide; m.transparent = false;
    // the colour map's alpha is mostly the game's fur-density mask, not opacity: cut only what is truly empty
    m.alphaTest = 0.06;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U, m.userData.node);
      // meshopt quantization gives every part its own node transform: move into the model's shared space,
      // deform there, and come back, so all parts use one frame and move exactly together
      sh.vertexShader = IDLE + sh.vertexShader.replace('#include <begin_vertex>',
        'vec3 transformed=(uNodeInv*vec4(idle((uNode*vec4(position,1.)).xyz,normal),1.)).xyz;');
      sh.fragmentShader = FRAG_DECL + sh.fragmentShader
        .replace('#include <map_fragment>', '#include <map_fragment>' + FRAG_TINT)
        .replace('#include <opaque_fragment>', FRAG_RIM + '\n#include <opaque_fragment>');
    };
    m.customProgramCacheKey = () => 'aniiguide-pbr';
    o.material = m;
    // this part's node transform relative to the model root
    root.updateMatrixWorld(true);
    const node = new T.Matrix4().copy(root.matrixWorld).invert().multiply(o.matrixWorld);
    m.userData.node = { uNode: { value: node }, uNodeInv: { value: node.clone().invert() } };
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
      transparent: true, depthWrite: false, toneMapped: false, blending: mode === 3 ? T.NormalBlending : T.AdditiveBlending, uniforms: { ...U, uPx: { value: 1 } },
      vertexShader: 'uniform float uT,uPx;uniform vec3 uSize;attribute float seed;varying float vA;void main(){vec4 q=modelViewMatrix*vec4(position+vec3(0.,sin(uT*.8+seed)*uSize.y*.03,0.),1.);vA=.35+.65*pow(.5+.5*sin(uT*2.2+seed*3.),2.);gl_PointSize=uPx*uSize.y*(.10+.05*sin(seed*7.))/-q.z*300.;gl_Position=projectionMatrix*q;}',
      fragmentShader: 'uniform vec3 uGlow;uniform float uMode;varying float vA;void main(){vec2 p=gl_PointCoord*2.-1.;float s=max(0.,1.-abs(p.x)*abs(p.y)*9.-dot(p,p)*.7);if(s<.02)discard;vec3 c=mix(uGlow,vec3(1.),uMode>2.5?0.:.45*s);gl_FragColor=vec4(c,s*vA);}',
    }));
    root.add(points);
  }
  return {
    root, box, uniforms: U, points,
    update(t) { U.uT.value = t },
    dispose() {
      root.traverse(o => {
        if (!o.isMesh && !o.isPoints) return;
        o.geometry.dispose();
        for (const m of [].concat(o.material)) { for (const k of ['map', 'normalMap', 'aoMap', 'roughnessMap', 'metalnessMap']) m[k] && m[k].dispose(); m.dispose() }
      });
    },
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
export async function mountViewer(el, T, libs, { url, look, period, base = '', still = false, motion = {} }) {
  const w = el.clientWidth, h = el.clientHeight;
  const r = new T.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(w, h); r.outputColorSpace = T.SRGBColorSpace;
  const scene = setupScene(T, r, libs), cam = new T.PerspectiveCamera(30, w / h, 0.01, 100);
  const m = await buildModel(T, libs, { url, look, period, base, motion });
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
    if (!alive || !r.domElement.isConnected) { ctl.dispose(); m.dispose(); scene.environment && scene.environment.dispose(); r.dispose(); return }
    if (!still) m.update((performance.now() - t0) / 1000);
    ctl.update(); r.render(scene, cam); requestAnimationFrame(tick);
  };
  tick();
  return { stop() { alive = false } };
}
