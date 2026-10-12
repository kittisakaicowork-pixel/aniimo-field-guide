// Idle-only copies of the 3D animation files (web3d_deploy/models/anims/idle/<name>.glb): the skeleton nodes plus the
// "Idle" clip, ~50 KB instead of several MB, so the viewer can show a model at once and fetch the other clips after.
//   node tools/r2/idleanim.js        (reads tools/r2/files.txt for the public animation files)
const fs = require('fs'), path = require('path');
const PKG = path.join(__dirname, '../../web3d_deploy');
const files = fs.readFileSync(path.join(__dirname, 'files.txt'), 'utf8').split('\n').filter(f => /^models\/anims\/[^/]+\.glb$/.test(f));
fs.mkdirSync(path.join(PKG, 'models/anims/idle'), { recursive: true });
let made = 0, skipped = 0, bytes = 0;
for (const f of files) {
  const b = fs.readFileSync(path.join(PKG, f));
  const jl = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + jl).toString());
  const binStart = 20 + jl + 8, bin = b.slice(binStart, binStart + b.readUInt32LE(20 + jl));
  const idle = (j.animations || []).find(a => a.name === 'Idle');
  if (!idle) { skipped++; continue; }
  const accMap = new Map(), accs = [], views = [], parts = []; let off = 0;
  const take = i => {
    if (accMap.has(i)) return accMap.get(i);
    const a = { ...j.accessors[i] }, bv = j.bufferViews[a.bufferView];
    const data = bin.slice((bv.byteOffset || 0), (bv.byteOffset || 0) + bv.byteLength);
    const pad = (4 - (off % 4)) % 4; if (pad) { parts.push(Buffer.alloc(pad)); off += pad; }
    views.push({ buffer: 0, byteOffset: off, byteLength: bv.byteLength, ...(bv.byteStride ? { byteStride: bv.byteStride } : {}) });
    parts.push(data); off += bv.byteLength;
    a.bufferView = views.length - 1; accs.push(a); accMap.set(i, accs.length - 1); return accs.length - 1;
  };
  const anim = { name: 'Idle', samplers: idle.samplers.map(s => ({ ...s, input: take(s.input), output: take(s.output) })), channels: idle.channels };
  const out = { asset: j.asset, scene: j.scene, scenes: j.scenes, nodes: j.nodes, animations: [anim], accessors: accs, bufferViews: views, buffers: [{ byteLength: off }] };
  for (const k of ['extensionsUsed', 'extras']) if (j[k]) out[k] = j[k];
  let js = Buffer.from(JSON.stringify(out)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
  let bn = Buffer.concat(parts); bn = Buffer.concat([bn, Buffer.alloc((4 - bn.length % 4) % 4)]);
  const hdr = Buffer.alloc(12); hdr.writeUInt32LE(0x46546C67, 0); hdr.writeUInt32LE(2, 4); hdr.writeUInt32LE(12 + 8 + js.length + 8 + bn.length, 8);
  const c1 = Buffer.alloc(8); c1.writeUInt32LE(js.length, 0); c1.writeUInt32LE(0x4E4F534A, 4);
  const c2 = Buffer.alloc(8); c2.writeUInt32LE(bn.length, 0); c2.writeUInt32LE(0x004E4942, 4);
  const glb = Buffer.concat([hdr, c1, js, c2, bn]);
  fs.writeFileSync(path.join(PKG, 'models/anims/idle', path.basename(f)), glb); made++; bytes += glb.length;
}
console.log(`idle files ${made} · no Idle clip ${skipped} · total ${(bytes / 1e6).toFixed(1)} MB`);
