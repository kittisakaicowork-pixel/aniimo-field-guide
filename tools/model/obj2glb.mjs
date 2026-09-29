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
import { DETAIL, toonTex } from './toon.mjs';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { weld, simplify, dedup, prune, meshopt, reorder } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';

const [picksFile, slug, out, root = new URL('../../aniimo/out', import.meta.url).pathname] = process.argv.slice(2);
const pick = JSON.parse(fs.readFileSync(picksFile, 'utf8'))[slug];
if (!pick || !pick.parts) { console.error('no pick for', slug); process.exit(1) }

function readObj(file) {
  const v = [], vt = [], vn = [], P = [], U = [], N = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim().split(/\s+/);
    if (t[0] === 'v') v.push(t.slice(1, 4).map(Number));
    else if (t[0] === 'vt') vt.push(t.slice(1, 3).map(Number));
    else if (t[0] === 'vn') vn.push(t.slice(1, 4).map(Number));
    else if (t[0] === 'f') {
      const c = t.slice(1).map(x => x.split('/').map(n => +n - 1));
      for (let i = 1; i + 1 < c.length; i++) for (const k of [c[0], c[i + 1], c[i]]) {  // reversed: we mirror X below
        P.push(-v[k[0]][0], v[k[0]][1], v[k[0]][2]);  // Unity is left-handed
        const n = vn[k[2]] || [0, 1, 0]; N.push(-n[0], n[1], n[2]);
        const u = vt[k[1]] || [0, 0]; U.push(u[0], 1 - u[1]);  // OBJ UVs start bottom-left, glTF top-left
      }
    }
  }
  return { P: new Float32Array(P), U: new Float32Array(U), N: new Float32Array(N) };
}

const doc = new Document();
const buf = doc.createBuffer();
const scene = doc.createScene('Aniimo');
const mats = {};
async function mat(tex) {
  if (mats[tex]) return mats[tex];
  const eye = /_Eye/i.test(tex);
  const img = doc.createTexture(path.basename(tex)).setImage(await toonTex(path.join(root, tex), eye ? DETAIL.eye : DETAIL.body)).setMimeType('image/webp');
  return mats[tex] = doc.createMaterial(eye ? 'eye' : 'body:' + path.basename(tex).toLowerCase()).setBaseColorTexture(img).setAlphaMode('MASK').setAlphaCutoff(0.4)
    .setDoubleSided(true).setRoughnessFactor(1).setMetallicFactor(0);
}
for (const [obj, tex] of pick.parts) {
  const { P, U, N } = readObj(path.join(root, obj));
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(P).setBuffer(buf))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(N).setBuffer(buf))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(U).setBuffer(buf))
    .setMaterial(await mat(tex));
  scene.addChild(doc.createNode(path.basename(obj)).setMesh(doc.createMesh().addPrimitive(prim)));
}
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: DETAIL.ratio, error: DETAIL.error }), dedup(), prune(),
  reorder({ encoder: MeshoptEncoder }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
doc.createExtension(EXTTextureWebP).setRequired(true);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await io.write(out, doc);
console.log(slug, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
