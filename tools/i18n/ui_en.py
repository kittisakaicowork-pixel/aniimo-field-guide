"""Writes i18n-en.js (the site's English UI) from tools/i18n/ui_en.json.

Keys are the Thai text with Latin runs and numbers replaced by {}; values are English and may
reorder with {0},{1}. Find untranslated text in the browser with window.__i18nMissing() while the
site is in English. Run from the repository root: python3 tools/i18n/ui_en.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
data = json.loads((ROOT / "tools/i18n/ui_en.json").read_text(encoding="utf-8"))
head = ("/* English for the site UI (source: tools/i18n/ui_en.json). Keys are the Thai text with "
        "names/numbers replaced by {}; values may reorder with {0},{1}. */\n")
body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
(ROOT / "i18n-en.js").write_text(head + "window.UI_EN=" + body + ";\n", encoding="utf-8")
print("wrote i18n-en.js,", len(data), "strings")
