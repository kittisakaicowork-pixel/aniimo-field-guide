#!/bin/bash
# Daily data update, run on this Mac by the Claude desktop app's scheduled task "aniguide-daily-update"
# (launchd cannot: macOS does not let background jobs read ~/Desktop). It runs here because the game data it
# builds from (gamedata/, ~1 GB, not in git) only lives on this Mac.
#
#   1. re-download AniiDex's list and event pages (plus a few of the oldest pages, politely) -> tools/raw.json
#   2. rebuild data.js, the Transmog sets and the search pages
#   3. publish only when the data really changed and the whole-site audit passes; otherwise put everything back
#
# The log is tools/daily.log; a macOS notification says what happened. Run it by hand the same way:
#   bash tools/daily.sh
set -uo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
cd "$(dirname "$0")/.." || exit 1
LOG=tools/daily.log
exec >>"$LOG" 2>&1
echo "== $(date '+%F %T')"

say() { echo "$1"; osascript -e "display notification \"$1\" with title \"AniiGuide อัปเดตรายวัน\"" >/dev/null 2>&1 || true; }
# the files this job writes; anything else in the working tree is someone's work in progress and is left alone
OUT=(data.js sw.js sitemap.xml a p img tools/sets.json)
undo() { git checkout -q -- "${OUT[@]}" 2>/dev/null; }
fail() { say "ไม่ได้อัปเดต: $1 (ดู tools/daily.log)"; undo; exit 1; }

[ "$(git branch --show-current)" = main ] || { say "ข้าม: ไม่ได้อยู่บน branch main"; exit 0; }
if ! git diff --quiet -- "${OUT[@]}" || ! git diff --cached --quiet; then
  say "ข้าม: มีไฟล์ที่ยังแก้ค้างอยู่ (commit หรือเก็บก่อน)"; exit 0
fi
git pull -q --ff-only || fail "ดึงโค้ดล่าสุดจาก GitHub ไม่ได้"

count() { node -e "global.window={};require('./data.js');console.log(window.ANIIMO.length)" 2>/dev/null || echo 0; }
before=$(count)

python3 tools/scrape.py --daily || fail "ดึงข้อมูลจาก AniiDex ไม่สำเร็จ"
python3 tools/sets.py || fail "สร้างชุดแต่งตัวไม่สำเร็จ"
python3 tools/build.py | tee /tmp/aniguide-build.txt || fail "build ไม่สำเร็จ"
untranslated=$(sed -nE 's/.*untranslated ([0-9]+).*/\1/p' /tmp/aniguide-build.txt)

node --check data.js || fail "data.js เสีย"
after=$(count)
[ "$after" -ge "$before" ] || fail "จำนวน Aniimo ลดลงจาก $before เหลือ $after"

# The build writes the scrape time into data.js every run; only publish when something else changed.
# (Collected into a variable: with pipefail, grep -q stopping early would make the whole pipe look failed.)
changed=$(git diff -U0 -- data.js tools/sets.json | grep '^[-+][^-+]' | grep -v '^[-+]window.META=' | cut -c1-40)
changed+=$(git status --porcelain -- img)
if [ -z "$changed" ]; then say "ข้อมูลเหมือนเดิม ไม่มีอะไรต้องอัปเดต"; undo; exit 0; fi
echo "changed:"; echo "$changed" | sort -u

python3 tools/seo.py || fail "สร้างหน้าค้นหาไม่สำเร็จ"
node tools/check/audit.js || fail "ตรวจเว็บแล้วเจอปัญหา"

# new cache name so visitors' offline copy picks up the new data
v=$(sed -nE "s/.*'aniimo-v([0-9]+)'.*/\1/p" sw.js)
sed -i '' "s/'aniimo-v$v'/'aniimo-v$((v + 1))'/" sw.js

git add -A -- "${OUT[@]}"
git commit -q -m "Daily data update $(date +%F)" || fail "commit ไม่สำเร็จ"
git push -q origin main || fail "push ขึ้น GitHub ไม่สำเร็จ"
msg="อัปเดตข้อมูลขึ้นเว็บแล้ว (Aniimo $after ตัว)"
# new game text shows in English until it is translated (tools/i18n/missing.json -> th.json)
[ "${untranslated:-0}" -gt 0 ] && msg+=" · มีข้อความใหม่ $untranslated ข้อความที่ยังไม่แปล"
say "$msg"
