#!/bin/bash
# Upload the lite viewer (lite.html + models/lite/) to the R2 bucket aniguide-3d. Resumable via tools/lite/done.txt.
cd "$(dirname "$0")/../../web3d_deploy" || exit 1
DONE=../tools/lite/done.txt; touch "$DONE"
up() {
  f=$1
  case "$f" in *.html) t="text/html; charset=utf-8";; *.json) t="application/json";; *.glb) t="model/gltf-binary";; *) t="application/octet-stream";; esac
  for try in 1 2 3; do
    if wrangler r2 object put "aniguide-3d/$f" --file "$f" --content-type "$t" --remote >/dev/null 2>&1; then echo "$f" >> "$DONE"; return 0; fi
    sleep $((try * 5))
  done
  echo "FAILED $f" >&2
}
export -f up; export DONE
{ echo lite.html; echo models/lite/index.json; find models/lite -name '*.glb' | sort; } | grep -vxFf "$DONE" | xargs -P 8 -I{} bash -c 'up "$1"' _ {}
echo "uploaded: $(sort -u "$DONE" | wc -l)"
