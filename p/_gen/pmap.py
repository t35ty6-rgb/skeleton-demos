import json,hashlib,sys,os
sys.path.insert(0,os.path.dirname(__file__))
import poster_shops as P
def pid(p): return 's'+hashlib.md5(p.encode()).hexdigest()[:8]
def all_shops():
    out={}
    for f in ['2026-10-29.json','2026-10-29b.json','2026-10-30.json']:
        d=json.load(open(os.path.join(os.path.dirname(__file__),'shops',f)))
        for s in d['shops']: out[s['short']]=s
    return out
