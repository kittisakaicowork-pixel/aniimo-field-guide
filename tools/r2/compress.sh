#!/bin/bash
# Re-upload the 3D files that compress well (animations, mesh sidecars, lighting data) gzip-encoded, with a
# one-week browser cache. Browsers unpack them by themselves; a first model downloads about half as much.
# Only files already listed in tools/r2/files.txt (the public set) are touched. Resumable via gz_done.txt.
#   bash tools/r2/compress.sh
cd "$(dirname "$0")/../../web3d_deploy" || exit 1
DONE=../tools/r2/gz_done.txt; touch "$DONE"; TMP=$(mktemp -d)
gz() {
  f=$1; out="$TMP/$(echo "$f" | tr / _)"
  gzip -9c "$f" > "$out" || return 1
  for try in 1 2 3; do
    if wrangler r2 object put "aniguide-3d/$f" --file "$out" --content-type "$2" --content-encoding gzip \
         --cache-control "public, max-age=604800" --remote >/dev/null 2>&1; then
      echo "$f" >> "$DONE"; rm -f "$out"; return 0; fi
    sleep $((try * 5))
  done
  echo "FAILED $f" >&2
}
export -f gz; export DONE TMP
grep -E '^models/anims/.*\.glb$' ../tools/r2/files.txt | grep -vxFf "$DONE" | xargs -P 6 -I{} bash -c 'gz "$1" model/gltf-binary' _ {}
grep -E '^models/game/.*\.bin$' ../tools/r2/files.txt | grep -vxFf "$DONE" | xargs -P 6 -I{} bash -c 'gz "$1" application/octet-stream' _ {}
rm -rf "$TMP"
echo "compressed: $(sort -u "$DONE" | wc -l)"
