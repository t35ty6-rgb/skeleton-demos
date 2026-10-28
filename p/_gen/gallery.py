#!/usr/bin/env python3
"""試作HPの一覧ページ（p/gallery/index.html）を作る。
並びは訪問記録と同じ leads-data の予定日・ブロック・順番。試作HPが無い店は「未作成」で出す。
使い方: python3 p/_gen/gallery.py 2026-10-29 2026-10-30
"""
import glob, hashlib, html, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
E = lambda s: html.escape(str(s or ''), quote=True)
TAG = {'washi': '白・和モダン', 'sumi': '黒系', 'kiiro': '黄色系', 'kawaii': 'かわいい系', 'retro': '昭和レトロ', 'pub': '深緑パブ',
       'hiraki': '漆喰×炭火', 'sankaku': '斜めモザイク', 'shokutaku': '食卓と漢字', 'zasshi': '雑誌の特集', 'yami': '夜の居酒屋', 'men': 'クラフト×丼'}
STAFF = {'A': '拓郎', 'B': 'ひかる'}
WEEK = '月火水木金土日'


def main(dates):
    import datetime
    rows = json.load(open(sorted(glob.glob(os.path.join(ROOT, 'leads-data', 'fukui-food-*.json')))[-1]))['targets']
    secs = []
    for d in dates:
        day = sorted([r for r in rows if r[3] == d], key=lambda r: (r[1], r[2]))
        cards = []
        for r in day:
            pid = 's' + hashlib.md5(r[0].encode()).hexdigest()[:8]
            f = os.path.join(ROOT, 'p', pid, 'index.html')
            who = STAFF.get(r[4], r[4])
            meta = f'{E(who)}・{E(str(r[7]).split("、")[0])}・{E(r[8])}'
            if os.path.exists(f):
                m = re.search(r'class="w-(\w+)', open(f).read())
                w = m.group(1) if m else 'washi'
                cards.append(f'<a class="card" href="../{pid}/" target="_blank" rel="noopener"><div class="frame"><iframe src="../{pid}/" loading="lazy" tabindex="-1" title="{E(r[5])}"></iframe></div><div class="meta"><span class="tag t-{w}">{TAG.get(w, w)}</span><b>{E(r[5])}</b><small>{meta}</small></div></a>')
            else:
                cards.append(f'<div class="card card--none"><div class="frame frame--none"><span>試作HPなし</span></div><div class="meta"><span class="tag t-none">未作成</span><b>{E(r[5])}</b><small>{meta}</small></div></div>')
        dt = datetime.date.fromisoformat(d)
        secs.append(f'<section><h2>{dt.month}/{dt.day}（{WEEK[dt.weekday()]}）訪問分<span>{len(day)}軒</span></h2><div class="grid">{"".join(cards)}</div></section>')
    page = f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>試作HP一覧</title>
<link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@500;700;900&display=swap" rel="stylesheet">
<style>
:root{{--bg:#F7F5F0;--fg:#1F1C19;--sub:#6B645C;--line:#E2DCD1}}
*{{box-sizing:border-box;margin:0;padding:0}}body{{background:var(--bg);color:var(--fg);font-family:"Zen Kaku Gothic New",sans-serif;letter-spacing:.03em}}
header{{padding:40px 28px 10px;max-width:1400px;margin:0 auto}}h1{{font-size:28px;font-weight:900}}header p{{color:var(--sub);font-size:14px;margin-top:6px}}
section{{max-width:1400px;margin:0 auto;padding:30px 28px}}h2{{font-size:20px;font-weight:900;margin-bottom:18px;display:flex;gap:12px;align-items:baseline}}h2 span{{font-size:13px;color:var(--sub);font-weight:500}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:22px}}
.card{{text-decoration:none;color:inherit;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;transition:transform .2s cubic-bezier(.23,1,.32,1),box-shadow .2s}}
.card:active{{transform:scale(.98)}}
@media (hover:hover) and (pointer:fine){{a.card:hover{{transform:translateY(-3px);box-shadow:0 14px 30px -18px rgba(0,0,0,.35)}}}}
.frame{{position:relative;aspect-ratio:9/13;overflow:hidden;background:#eee}}
.frame iframe{{position:absolute;top:0;left:0;width:390px;height:563px;border:0;transform-origin:0 0;transform:scale(var(--s,.64));pointer-events:none}}
.frame--none{{display:grid;place-items:center;color:var(--sub);font-size:13px;background:repeating-linear-gradient(135deg,#F1EEE8 0 10px,#ECE8E0 10px 20px)}}
.meta{{padding:12px 14px 14px;display:grid;gap:4px}}.meta b{{font-size:14.5px;line-height:1.4}}.meta small{{font-size:12px;color:var(--sub)}}
.tag{{justify-self:start;font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px}}
.t-washi{{background:#F1EDE4;color:#6B3A2C}}.t-sumi{{background:#15120F;color:#EFE7DA}}.t-kiiro{{background:#FFD23F;color:#1A1712}}.t-kawaii{{background:#FFE6E0;color:#B24C55}}.t-retro{{background:#0E4472;color:#E9E4D0}}.t-pub{{background:#13271E;color:#C9A45C}}
.t-hiraki{{background:#B0462A;color:#FFF8F2}}.t-sankaku{{background:#24211D;color:#FCFBF8}}.t-shokutaku{{background:#8C4A2F;color:#FFF9F3}}.t-zasshi{{background:#D2552E;color:#FFF}}.t-yami{{background:#1A1715;color:#C8A062}}.t-men{{background:#E8DDCB;color:#2D241D}}.t-none{{background:#E6E1D8;color:#6B645C}}
</style></head><body><header><h1>試作HP一覧</h1><p>訪問記録と同じ並びです。カードを押すと、その店の試作HPが開きます（スマホで見たときの表示）。</p></header>{"".join(secs)}
<script>
// カードの幅に合わせて中身を縮める
const fit=()=>document.querySelectorAll('.frame').forEach(f=>f.style.setProperty('--s',(f.clientWidth/390).toFixed(4)));addEventListener('resize',fit);fit();
</script></body></html>
'''
    os.makedirs(os.path.join(ROOT, 'p', 'gallery'), exist_ok=True)
    open(os.path.join(ROOT, 'p', 'gallery', 'index.html'), 'w').write(page)
    print('gallery ok', dates)


if __name__ == '__main__':
    main(sys.argv[1:])
