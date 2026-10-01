#!/bin/bash
# Upload the public part of web3d_deploy/ (the 3D viewer package, not in git) to the Cloudflare R2 bucket
# aniguide-3d. Which files are public is decided by tools/r2/manifest.py (run it first): nothing the game has not
# announced goes up. Resumable: finished files are listed in tools/r2/done.txt and skipped next time.
#   python3 tools/r2/manifest.py && bash tools/r2/upload.sh      (needs `wrangler login` once)
cd "$(dirname "$0")/../../web3d_deploy" || exit 1
DONE=../tools/r2/done.txt; touch "$DONE"
up() {
  f=${1#./}
  case "$f" in
    *.html) t="text/html; charset=utf-8";; *.js) t="text/javascript; charset=utf-8";; *.json) t="application/json";;
    *.glb) t="model/gltf-binary";; *.wasm) t="application/wasm";; *.webp) t="image/webp";; *.txt) t="text/plain; charset=utf-8";;
    *) t="application/octet-stream";;
  esac
  for try in 1 2 3; do
    if wrangler r2 object put "aniguide-3d/$f" --file "$f" --content-type "$t" --remote >/dev/null 2>&1; then
      echo "$f" >> "$DONE"; return 0; fi
    sleep $((try * 5))
  done
  echo "FAILED $f" >&2
}
export -f up; export DONE
# the trimmed model list replaces the package's own, which also names unreleased models
wrangler r2 object put aniguide-3d/models/index.json --file ../tools/r2/index.json --content-type application/json --remote >/dev/null 2>&1 \
  || echo "FAILED models/index.json" >&2
grep -vxFf "$DONE" ../tools/r2/files.txt | xargs -P 8 -I{} bash -c 'up "$1"' _ {}
echo "done: $(sort -u "$DONE" | grep -cxFf ../tools/r2/files.txt) / $(wc -l < ../tools/r2/files.txt)"
