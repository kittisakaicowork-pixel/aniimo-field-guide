// Exported game meshes (OBJ) + textures -> small stylised GLB for 3d/<slug>.glb.
// The look is changed on purpose so it is not the in-game model 1:1: the mesh is simplified,
// the texture is shrunk and posterized, and the page draws it with toon shading and an outline.
//
//   cd tools/model && npm install
//   node obj2glb.mjs ../../3d/blazen.glb <Body_CA.png> <Eye_C.png> 0.6 <Body.obj> <Body_Default.obj> <Eye.obj>
//
// Blazen (10222) used the parts ending in _1515363479 (LOD2) from models/aexp_chmeshp_parm_parm1022x_asset_0 and
// T_Parmon_10222_Body_01a_CA.png / T_Parmon_10222_Eye_01a_C.png from textures2/xpt25_aexp_tc_3b71e5c3__tcpm_10222_electricmarten_tga_0.
import fs from 'fs';
import sharp from 'sharp';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { weld, simplify, dedup, prune, meshopt, reorder } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';

const [out, bodyTex, eyeTex, ratioS, ...parts] = process.argv.slice(2);
const ratio = +ratioS;

function readObj(path) {
  const v = [], vt = [], vn = [], P = [], U = [], N = [];
  for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim().split(/\s+/);
    if (t[0] === 'v') v.push(t.slice(1, 4).map(Number));
    else if (t[0] === 'vt') vt.push(t.slice(1, 3).map(Number));
    else if (t[0] === 'vn') vn.push(t.slice(1, 4).map(Number));
    else if (t[0] === 'f') {
      const c = t.slice(1).map(x => x.split('/').map(n => +n - 1));
      for (let i = 1; i + 1 < c.length; i++) for (const k of [c[0], c[i], c[i + 1]]) {
        P.push(...v[k[0]]); U.push(...(vt[k[1]] || [0, 0])); N.push(...(vn[k[2]] || [0, 1, 0]));
      }
    }
  }
  for (let i = 0; i < P.length; i += 3) { P[i] = -P[i]; N[i] = -N[i] }  // Unity is left-handed
  if (!process.env.NOFLIP) for (let i = 1; i < U.length; i += 2) U[i] = 1 - U[i];
  // mirroring flips winding
  for (let i = 0; i < P.length; i += 9) for (const A of [[P, 3], [N, 3], [U, 2]]) {
    const [arr, n] = A, a = (i / 3) * n + n, b = a + n;
    for (let j = 0; j < n; j++) { const x = arr[a + j]; arr[a + j] = arr[b + j]; arr[b + j] = x }
  }
  return { P: new Float32Array(P), U: new Float32Array(U), N: new Float32Array(N) };
}

// Stylise: shrink, flatten detail, then posterize lightness into a few bands while keeping each pixel's hue
// (per-channel posterizing turns dark browns red/green).
function rgb2hsl(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hsl2rgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}
async function toonTex(path, size) {
  const { data, info } = await sharp(path).resize(size, size).median(3).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const band = (x, n) => Math.round(x * n) / n;
  for (let i = 0; i < data.length; i += 4) {
    let [h, s, l] = rgb2hsl(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
    const [r, g, b] = hsl2rgb(Math.round(h / 15) * 15 % 360, Math.min(1, band(s, 4) * 1.1), band(l, 7));
    data[i] = r * 255; data[i + 1] = g * 255; data[i + 2] = b * 255;
  }
  return sharp(data, { raw: info }).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
}

const doc = new Document();
const buf = doc.createBuffer();
const scene = doc.createScene('Aniimo');
const mats = {};
async function mat(name, tex, size) {
  if (mats[name]) return mats[name];
  const img = doc.createTexture(name).setImage(await toonTex(tex, size)).setMimeType('image/webp');
  return mats[name] = doc.createMaterial(name).setBaseColorTexture(img).setAlphaMode('MASK').setAlphaCutoff(0.4)
    .setDoubleSided(true).setRoughnessFactor(1).setMetallicFactor(0);
}
for (const p of parts) {
  const { P, U, N } = readObj(p);
  const eye = /Eye/i.test(p);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(P).setBuffer(buf))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(N).setBuffer(buf))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(U).setBuffer(buf))
    .setMaterial(await mat(eye ? 'eye' : 'body', eye ? eyeTex : bodyTex, eye ? 128 : 512));
  scene.addChild(doc.createNode(p.split('/').pop()).setMesh(doc.createMesh().addPrimitive(prim)));
}
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 }), dedup(), prune(),
  reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
doc.createExtension(EXTTextureWebP).setRequired(true);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await io.write(out, doc);
console.log(out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
