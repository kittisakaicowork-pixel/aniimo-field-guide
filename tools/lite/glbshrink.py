"""Shrink a glTF binary to the site's standard: textures re-encoded as WebP (max 1024 px, EXT_texture_webp), nothing else touched."""
import json, struct, io
from PIL import Image
MAXPX = 1024
def shrink(src, dst, maxpx=MAXPX, q=85):
    b = open(src, 'rb').read()
    assert b[:4] == b'glTF'
    pos = 12; js = None; bin_ = b''
    while pos < len(b):
        n, t = struct.unpack('<II', b[pos:pos+8]); d = b[pos+8:pos+8+n]; pos += 8+n
        if t == 0x4E4F534A: js = json.loads(d)
        elif t == 0x004E4942: bin_ = d
    bvs = js['bufferViews']; new = {}
    for i, im in enumerate(js.get('images', [])):
        if 'bufferView' not in im: continue
        raw = bin_[bvs[im['bufferView']].get('byteOffset', 0):][:bvs[im['bufferView']]['byteLength']]
        pil = Image.open(io.BytesIO(raw)); pil.load()
        w, h = pil.size
        if max(w, h) > maxpx:
            k = maxpx / max(w, h); pil = pil.resize((max(1, round(w*k)), max(1, round(h*k))), Image.LANCZOS)
        if pil.mode not in ('RGB', 'RGBA'): pil = pil.convert('RGBA' if 'A' in pil.mode or pil.mode == 'P' else 'RGB')
        o = io.BytesIO(); pil.save(o, 'WEBP', quality=q, method=4); new[im['bufferView']] = o.getvalue()
        im['mimeType'] = 'image/webp'
    for t in js.get('textures', []):
        if 'source' in t:
            t.setdefault('extensions', {})['EXT_texture_webp'] = {'source': t.pop('source')}
    if new:
        for k in ('extensionsUsed',):
            js.setdefault(k, [])
            if 'EXT_texture_webp' not in js[k]: js[k].append('EXT_texture_webp')
        js.setdefault('extensionsRequired', [])
        if 'EXT_texture_webp' not in js['extensionsRequired']: js['extensionsRequired'].append('EXT_texture_webp')
    out = bytearray()
    for i, v in enumerate(bvs):
        data = new.get(i, bin_[v.get('byteOffset', 0):v.get('byteOffset', 0)+v['byteLength']])
        while len(out) % 4: out.append(0)
        v['byteOffset'] = len(out); v['byteLength'] = len(data); out += data
    while len(out) % 4: out.append(0)
    js['buffers'] = [{'byteLength': len(out)}]
    j = json.dumps(js, separators=(',', ':')).encode(); j += b' ' * (-len(j) % 4)
    total = 12 + 8 + len(j) + 8 + len(out)
    with open(dst, 'wb') as f:
        f.write(b'glTF' + struct.pack('<II', 2, total)); f.write(struct.pack('<II', len(j), 0x4E4F534A) + j)
        f.write(struct.pack('<II', len(out), 0x004E4942) + bytes(out))
    return len(b), total
if __name__ == '__main__':
    import sys; print(shrink(sys.argv[1], sys.argv[2]))
