"""The one way the tools download from AniiDex.

AniiDex's owner allowed scraping the site for this guide on two terms (email, Sep 2026):
  - player profile pages are excluded,
  - keep the request rate low.
So every AniiDex request goes through get(): profile-looking URLs are refused outright, and requests are
spaced at least GAP seconds apart, one at a time. Files already downloaded are never fetched again.
"""
import re
import subprocess
import threading
import time
from pathlib import Path

GAP = 1.5  # seconds between AniiDex requests
UA = "Mozilla/5.0 (AniiGuide fan project; low-rate, with the owner's permission)"
PROFILE = re.compile(r"aniidex\.com/(?:[a-z]{2}/)?(?:players?|profiles?|users?|u|trainers?|accounts?)(?:/|$)", re.I)
_lock = threading.Lock()
_last = [0.0]


def is_aniidex(url):
    return "aniidex.com" in url


def get(url, dest, extra=()):
    """Download url to dest (cached). Returns True when dest exists afterwards."""
    dest = Path(dest)
    if dest.exists() and dest.stat().st_size > 400:
        return True
    if PROFILE.search(url):
        raise ValueError(f"refusing an AniiDex player profile page: {url}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    with _lock:  # one request at a time, spaced out
        if is_aniidex(url):
            wait = _last[0] + GAP - time.time()
            if wait > 0:
                time.sleep(wait)
        subprocess.run(["curl", "-s", "-f", "-L", "-g", "-A", UA, *extra, "-o", str(dest), url])
        if is_aniidex(url):
            _last[0] = time.time()
    ok = dest.exists() and dest.stat().st_size > 400
    if not ok and dest.exists():
        dest.unlink()
    return ok
