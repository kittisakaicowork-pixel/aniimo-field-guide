// Exported game meshes (OBJ) + textures -> stylised GLB for 3d/<slug>.glb.
// The look is changed on purpose so it is not the in-game model 1:1: the mesh is lightly simplified,
// the texture is posterized (hue kept, lightness/saturation in bands), and the page draws it with
// toon shading and an outline.
//
//   cd tools/model && npm install
//   node obj2glb.mjs picks.json <slug> ../../3d/<slug>.glb [export root, default ../../aniimo/out (git-ignored copy of the export)]
//
// picks.json comes from candidates.py + score.cjs: for each Aniimo, the part set (mesh + texture per part)
// whose render is closest to the site's art.
import fs from 'fs';
import path from 'path';
import { DETAIL, toonTex, normalTex, ormTex, emissiveTex } from './toon.mjs';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { weld, simplify, dedup, prune, meshopt, reorder } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';

const [picksFile, slug, out, root = new URL('../../aniimo/out', import.meta.url).pathname] = process.argv.slice(2);
const pick = JSON.parse(fs.readFileSync(picksFile, 'utf8'))[slug];
if (!pick || !pick.parts) { console.error('no pick for', slug); process.exit(1) }
// brightness gain from bright.mjs (lightness only, hue untouched), for colour maps that are darker than the game shows
const brightFile = path.join(path.dirname(picksFile), 'bright.json');
const gain = fs.existsSync(brightFile) ? JSON.parse(fs.readFileSync(brightFile, 'utf8'))[slug] || 1 : 1;
const brighten = gain === 1 ? null : d => { for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = Math.min(255, d[i + c] * gain) };

// OBJ -> one {P, U, N} per group ("<mesh>_0", "_1", ...: the game's submeshes), in file order
function readObj(file) {
  const v = [], vt = [], vn = [], groups = [];
  let g = null;
  const start = () => (g = { P: [], U: [], N: [] }, groups.push(g));
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim().split(/\s+/);
    if (t[0] === 'v') v.push(t.slice(1, 4).map(Number));
    else if (t[0] === 'vt') vt.push(t.slice(1, 3).map(Number));
    else if (t[0] === 'vn') vn.push(t.slice(1, 4).map(Number));
    else if (t[0] === 'g') start();
    else if (t[0] === 'f') {
      if (!g) start();
      const c = t.slice(1).map(x => x.split('/').map(n => +n - 1));
      for (let i = 1; i + 1 < c.length; i++) for (const k of [c[0], c[i + 1], c[i]]) {  // reversed: we mirror X below
        g.P.push(-v[k[0]][0], v[k[0]][1], v[k[0]][2]);  // Unity is left-handed
        const n = vn[k[2]] || [0, 1, 0]; g.N.push(-n[0], n[1], n[2]);
        const u = vt[k[1]] || [0, 0]; g.U.push(u[0], 1 - u[1]);  // OBJ UVs start bottom-left, glTF top-left
      }
    }
  }
  return groups.filter(x => x.P.length).map(x => ({ P: new Float32Array(x.P), U: new Float32Array(x.U), N: new Float32Array(x.N) }));
}

const doc = new Document();
const buf = doc.createBuffer();
const scene = doc.createScene('Aniimo');
const mats = {};
const pendingMats = {};
function pending(tex) {  // material now, textures filled in by matsReady()
  return pendingMats[tex] ||= doc.createMaterial('tmp');
}
async function matsReady() {
  for (const [tex, m] of Object.entries(pendingMats)) {
    const real = await mat(tex);
    for (const p of m.listParents()) if (p.propertyType === 'Primitive') p.setMaterial(real);
    m.dispose();
  }
  return mats;
}
async function mat(tex) {
  if (mats[tex]) return mats[tex];
  const eye = /_Eye/i.test(tex), file = path.join(root, tex);
  const img = doc.createTexture(path.basename(tex)).setImage(await toonTex(file, eye ? DETAIL.eye : DETAIL.body, eye ? null : brighten)).setMimeType('image/webp');
  const m = doc.createMaterial(eye ? 'eye' : 'body:' + path.basename(tex).toLowerCase()).setBaseColorTexture(img).setAlphaMode('MASK').setAlphaCutoff(0.4)
    .setDoubleSided(true).setRoughnessFactor(1).setMetallicFactor(0);
  const size = eye ? DETAIL.eye : DETAIL.maps;
  const nrm = await normalTex(file, size);
  if (nrm) m.setNormalTexture(doc.createTexture('n:' + path.basename(tex)).setImage(nrm).setMimeType('image/webp'));
  const orm = await ormTex(file, size);
  if (orm) {
    const t = doc.createTexture('orm:' + path.basename(tex)).setImage(orm).setMimeType('image/webp');
    m.setOcclusionTexture(t).setMetallicRoughnessTexture(t).setMetallicFactor(0);  // MOHR's R is not reliably metalness
  }
  const em = await emissiveTex(file, size);
  if (em) m.setEmissiveTexture(doc.createTexture('e:' + path.basename(tex)).setImage(em).setMimeType('image/webp')).setEmissiveFactor([1, 1, 1]);
  return mats[tex] = m;
}
// a part is [obj, texture] (same texture for every submesh) or [obj, [texture or null per submesh]] (submesh.py)
for (const [obj, texs] of pick.parts) {
  const mesh = doc.createMesh();
  readObj(path.join(root, obj)).forEach((g, i) => {
    const tex = Array.isArray(texs) ? texs[i] : texs;
    if (!tex) return;  // an effect layer the game draws with its own shader: left out
    mesh.addPrimitive(doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(g.P).setBuffer(buf))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(g.N).setBuffer(buf))
      .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(g.U).setBuffer(buf))
      .setMaterial(pending(tex)));
  });
  if (mesh.listPrimitives().length) scene.addChild(doc.createNode(path.basename(obj)).setMesh(mesh));
}
await matsReady();
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: DETAIL.ratio, error: DETAIL.error }), dedup(), prune(),
  reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
doc.createExtension(EXTTextureWebP).setRequired(true);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await io.write(out, doc);
console.log(slug, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
