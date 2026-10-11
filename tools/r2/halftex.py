"""Half-size copies of the large 3D textures (>= 1024 px) for the viewer inside the guide (web3d_deploy/gtexh/).
The full-screen viewer keeps the originals. Writes gtexh/list.json with the names that have a half copy.
   python3 tools/r2/halftex.py      then upload gtexh/ with: bash tools/r2/upload_half.sh"""
import os, json, collections, concurrent.futures as cf
from pathlib import Path
from PIL import Image
PKG = Path(__file__).resolve().parent.parent.parent / "web3d_deploy"
FILES = Path(__file__).resolve().parent / "files.txt"

def one(f):
    try:
        src = PKG / "gtex" / f
        im = Image.open(src); w, h = im.size
        if max(w, h) < 1024:
            return None
        out = PKG / "gtexh" / f
        im.resize((max(1, w // 2), max(1, h // 2)), Image.LANCZOS).save(out, "WEBP", quality=88, method=5, exact=True)
        return (f, src.stat().st_size, out.stat().st_size, w)
    except Exception as e:
        return ("ERR", f, str(e))

if __name__ == "__main__":
    (PKG / "gtexh").mkdir(exist_ok=True)
    names = [l.strip()[5:] for l in FILES.read_text().splitlines() if l.startswith("gtex/")]
    with cf.ProcessPoolExecutor(8) as ex:
        res = [r for r in ex.map(one, names, chunksize=16) if r]
    err = [r for r in res if r[0] == "ERR"]; res = [r for r in res if r[0] != "ERR"]
    (PKG / "gtexh" / "list.json").write_text(json.dumps(sorted(r[0] for r in res)))
    print("half copies", len(res), "errors", len(err), err[:3])
    print("original MB %.1f  half MB %.1f" % (sum(r[1] for r in res) / 1e6, sum(r[2] for r in res) / 1e6))
    print(collections.Counter(r[3] for r in res))
