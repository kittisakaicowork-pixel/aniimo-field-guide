import json, re, os, sys, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(__file__))
from glbshrink import shrink
ROOT = '/Users/saseeroy/Desktop/aniimo/'
SRC = ROOT + 'tools/compare/drive/'
OUT = ROOT + 'web3d_deploy/models/lite/'
M = json.load(open(ROOT + 'tools/compare/manifest.json'))
def slug(s): return re.sub(r'[^A-Za-z0-9._-]+', '_', s).strip('_') or 'x'
jobs = []; entries = []
for e in M:
    if e['cur'] or not e['new']: continue          # already on the site -> untouched
    cat = e['cat']; creature = cat in ('Aniimo', 'Creature อื่น')
    m = re.match(r'^(.*?)\s*\((.*)\)\s*$', e['name']); name_en = (m.group(1) if m else e['name']); name_th = m.group(2) if m else ''
    files = []
    for g in e['new']:
        f = g['f']
        if creature:
            mm = re.match(r'^(.+?)_(\d+)(_Shiny)?\.glb$', f, re.I)
            if not mm: continue
            lab = ('Sparkling ' if mm.group(3) else '') + ('ปกติ' if len(mm.group(2)) <= 5 else 'ร่าง ' + mm.group(2))
            fid = mm.group(2); spark = bool(mm.group(3))
        else:
            lab = f[:-4]; fid = None; spark = False
        out = f"{slug(cat)}/{slug(e['key'])}/{slug(f)}"
        files.append({'f': out, 'lab': lab, 'id': fid, 'sp': spark})
        jobs.append((SRC + g['p'], OUT + out))
    if files:
        entries.append({'cat': cat, 'key': e['key'] if cat != 'Aniimo' else e['key'], 'name': e['name'] if cat == 'Aniimo' else name_en, 'th': name_th, 'no': e.get('no'), 'files': files})
print(len(entries), 'entries', len(jobs), 'files')
def work(j):
    s, d = j
    if os.path.exists(d): return (os.path.getsize(s), os.path.getsize(d), None)
    os.makedirs(os.path.dirname(d), exist_ok=True)
    try:
        a, b = shrink(s, d + '.tmp'); os.replace(d + '.tmp', d); return (a, b, None)
    except Exception as ex:
        return (0, 0, f'{s}: {ex}')
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    tot = [0, 0]; errs = []
    with cf.ProcessPoolExecutor(6) as ex:
        for i, (a, b, er) in enumerate(ex.map(work, jobs, chunksize=4)):
            tot[0] += a; tot[1] += b
            if er: errs.append(er)
            if i % 50 == 0: print(i, 'of', len(jobs), 'in %.1f GB out %.2f GB' % (tot[0]/1e9, tot[1]/1e9), flush=True)
    for en in entries:
        for f in en['files']:
            p = OUT + f['f']; f['mb'] = round(os.path.getsize(p)/1e6, 1) if os.path.exists(p) else None
    json.dump(entries, open(OUT + 'index.json', 'w'), ensure_ascii=False)
    print('DONE in %.1f GB -> out %.2f GB, errors %d' % (tot[0]/1e9, tot[1]/1e9, len(errs))); print('\n'.join(errs[:10]))
