#!/usr/bin/env python3
"""素材（紙・漆喰・クラフト・墨の筆・煙・水彩）と和柄を、型ごとの色で組み込む CSS を作る。
出力: p/_assets/w/deco.css（全ページで読み込む）
和柄は SVG をその場で描くので、色を変えて何度でも使える。
"""
import os, urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
M = '../m/'  # w/ から見た素材フォルダ


def svg_uri(svg):
    return 'url("data:image/svg+xml,' + urllib.parse.quote(svg, safe=" =:/'(),") + '")'


def seigaiha(fg, bg, w=1.1):
    """青海波：手前の波が奥の波を隠すように、地の色で塗ってから線を引く"""
    def wave(cx, cy):
        rings = ''.join(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{bg if r == 20 else "none"}" stroke="{fg}" stroke-width="{w}"/>' for r in (20, 15, 10, 5))
        return rings
    body = wave(0, 0) + wave(40, 0) + wave(20, 10) + wave(0, 20) + wave(40, 20) + wave(20, 30)
    return svg_uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='40' height='20' viewBox='0 10 40 20'>{body}</svg>")


def shippo(fg, w=1):
    """七宝：重なり合う円"""
    c = ''.join(f'<circle cx="{x}" cy="{y}" r="20" fill="none" stroke="{fg}" stroke-width="{w}"/>' for x, y in [(0, 0), (40, 0), (0, 40), (40, 40), (20, 20)])
    return svg_uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>{c}</svg>")


def kikko(fg, w=1):
    """亀甲：六角形のつながり"""
    p = 'M0 9 L15.6 0 L31.2 9 L31.2 27 L15.6 36 L0 27 Z M15.6 36 L15.6 54 M0 27 L-15.6 36 M31.2 27 L46.8 36'
    return svg_uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='31.2' height='54'><path d='{p}' fill='none' stroke='{fg}' stroke-width='{w}'/><path d='M15.6 36 L0 45 L0 63 M15.6 36 L31.2 45 L31.2 63' fill='none' stroke='{fg}' stroke-width='{w}'/></svg>")


def ichimatsu(a, b, s=14):
    """市松：2色の石畳"""
    return svg_uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='{s*2}' height='{s*2}'><rect width='{s*2}' height='{s*2}' fill='{b}'/><rect width='{s}' height='{s}' fill='{a}'/><rect x='{s}' y='{s}' width='{s}' height='{s}' fill='{a}'/></svg>")


def dots(fg, r=1.6, gap=9):
    """網点"""
    return svg_uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='{gap}' height='{gap}'><circle cx='{gap/2}' cy='{gap/2}' r='{r}' fill='{fg}'/></svg>")


def yagasuri(a, b):
    """矢絣"""
    return svg_uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='40' height='48'><rect width='40' height='48' fill='{b}'/><path d='M0 0 L20 12 L20 36 L0 24Z M20 12 L40 0 L40 24 L20 36Z' fill='{a}'/><path d='M0 24 L20 36 L20 48 L0 48Z' fill='{a}' opacity='.0'/></svg>")


CSS = []
add = CSS.append

add('''/* ===== 素材と色（make_deco.py で生成） ===== */
.tex-washi{background-image:url(../m/washi.webp);background-size:600px}
.brush{position:relative}
.brush::before{content:"";position:absolute;left:-24px;right:-40px;top:50%;height:1.5em;transform:translateY(-46%) rotate(-1.5deg);background:var(--brush-c,var(--ac));-webkit-mask:url(../m/brush.webp) center/100% 100% no-repeat;mask:url(../m/brush.webp) center/100% 100% no-repeat;opacity:var(--brush-o,.9);z-index:-1}
.tape{position:absolute;width:96px;height:26px;background:var(--tape-c,rgba(255,214,102,.85));transform:rotate(var(--tape-r,-6deg));box-shadow:0 2px 6px -2px rgba(0,0,0,.25);z-index:3}
.tape::before,.tape::after{content:"";position:absolute;top:0;bottom:0;width:6px;background:inherit;-webkit-mask:linear-gradient(90deg,#000 50%,transparent 50%) 0 0/6px 4px;mask:linear-gradient(0deg,#000 50%,transparent 50%) 0 0/6px 4px}
.tape::before{left:-5px}.tape::after{right:-5px}
@keyframes smoke-drift{from{transform:translate3d(-3%,4%,0) scale(1.05)}to{transform:translate3d(3%,-4%,0) scale(1.12)}}
''')

# ---------------------------------------------------------------- 焼鳥ひらき：漆喰の本物の質感＋朱・からし・藍
add(f'''.w-hiraki{{--ac2:#C8912F;--ac3:#2C3E50;background-color:#F2ECE3;background-image:url(../m/plaster.webp);background-size:900px}}
.w-hiraki .hk-rail{{background:#EFE8DE url(../m/plaster.webp) 0 0/900px}}
.w-hiraki .hk-menu{{background-color:#2A2422;background-image:{shippo('rgba(200,145,47,.16)')};background-size:44px}}
.w-hiraki .hk-h span{{color:var(--ac2)}}
.w-hiraki .hk-menu .hk-h span{{color:#E3B25E}}
.w-hiraki .hk-h{{isolation:isolate}}
.w-hiraki .hk-catch{{position:relative;isolation:isolate}}
.w-hiraki .hk-catch::after{{content:"";position:absolute;left:-30px;bottom:-.25em;width:min(520px,90%);height:.9em;background:var(--ac2);opacity:.28;-webkit-mask:url(../m/brush.webp) center/100% 100% no-repeat;mask:url(../m/brush.webp) center/100% 100% no-repeat;z-index:-1}}
.w-hiraki .hk-scene{{background:linear-gradient(180deg,transparent,rgba(44,62,80,.06))}}
.w-hiraki .hk-scene__list h3{{border-color:var(--ac2)}}
.w-hiraki .hk-dish h3::before{{content:"";display:inline-block;width:8px;height:8px;background:var(--ac2);margin-right:10px;vertical-align:.18em;rotate:45deg}}
.w-hiraki .hk-panel__in{{background-color:#2A2422;background-image:{kikko('rgba(242,236,227,.06)')}}}
.w-hiraki .cta{{background:#2A2422 {seigaiha('rgba(200,145,47,.22)', '#2A2422')} 0 0/48px 24px}}
''')

# ---------------------------------------------------------------- 斜めモザイク：和紙＋藍・朱・抹茶の三色、青海波
add(f'''.w-sankaku{{--ac2:#2E4A68;--ac3:#6F7F45;background-color:#FCFBF8;background-image:url(../m/washi.webp);background-size:600px}}
.w-sankaku .sk-lead{{position:relative;isolation:isolate}}
.w-sankaku .sk-lead::before{{content:"";position:absolute;right:-6%;top:6%;width:min(760px,70%);aspect-ratio:16/9;background:url(../m/wash.webp) center/cover;mix-blend-mode:multiply;opacity:.55;z-index:-1;pointer-events:none}}
.w-sankaku .sk-scene{{background-color:#EEF1F4;background-image:{seigaiha('#D9E0E8', '#EEF1F4')};background-size:48px 24px}}
.w-sankaku .sk-scene .sk-h{{display:inline-flex;background:#EEF1F4;padding:6px 16px 6px 0}}
.w-sankaku .sk-h::before{{background:var(--ac2)}}
.w-sankaku .sk-dish:nth-child(1) h3{{color:var(--ac)}}.w-sankaku .sk-dish:nth-child(2) h3{{color:var(--ac2)}}.w-sankaku .sk-dish:nth-child(3) h3{{color:var(--ac3)}}
.w-sankaku .sk-tag{{color:var(--ac2)}}
.w-sankaku .cta{{background:#24211D {seigaiha('rgba(252,251,248,.10)', '#24211D')} 0 0/48px 24px}}
''')

# ---------------------------------------------------------------- 食卓と漢字：クラフト紙・市松・藍
add(f'''.w-shokutaku{{--ac2:#2F4A64;--ac3:#C79A3A}}
.w-shokutaku .st-menu{{background:#E9DCC6 url(../m/kraft.webp) 0 0/700px;position:relative}}
.w-shokutaku .st-menu::before{{content:"";position:absolute;left:0;right:0;top:0;height:14px;background:{ichimatsu('#2F4A64', '#F5F0E8', 7)}}}
.w-shokutaku .st-scene{{background-color:#F0EAE0;background-image:{kikko('rgba(47,74,100,.10)')}}}
.w-shokutaku .st-h span{{border-color:var(--ac2)}}
.w-shokutaku .st-scene .st-h span{{background:#F0EAE0}}
.w-shokutaku .st-dish__t{{border-color:var(--ac2)}}
.w-shokutaku .st-dish__t h3{{color:var(--ac2)}}
.w-shokutaku .st-lead{{background:url(../m/washi.webp) 0 0/600px}}
.w-shokutaku .st-catch{{color:var(--ac2)}}
.w-shokutaku .cta{{background:#2F4A64 {ichimatsu('rgba(255,255,255,.05)', 'transparent', 22)}}}
''')

# ---------------------------------------------------------------- 雑誌：色ブロック・網点・マスキングテープ
add(f'''.w-zasshi{{--ac2:#2E8C82;--ac3:#F4C542}}
.w-zasshi .zs-menu{{background-color:#FFF4D6;background-image:{dots('rgba(210,85,46,.16)', 1.4, 10)}}}
.w-zasshi .zs-scene{{background:#DDEFEA}}
.w-zasshi .zs-scene__list .sc{{position:relative}}
.w-zasshi .zs-scene__list .sc::before{{content:"";position:absolute;left:50%;top:-12px;width:90px;height:24px;translate:-50% 0;rotate:-4deg;background:rgba(244,197,66,.85);z-index:2}}
.w-zasshi .zs-scene__list .sc:nth-child(2)::before{{background:rgba(46,140,130,.7);rotate:5deg}}
.w-zasshi .zs-scene__list .sc:nth-child(3)::before{{background:rgba(210,85,46,.7)}}
.w-zasshi .zs-h span{{background:linear-gradient(transparent 60%,color-mix(in srgb,var(--ac3) 70%,transparent) 60%)}}
.w-zasshi .zs-scene .zs-h small{{color:var(--ac2)}}
.w-zasshi .zs-dish:nth-child(2) .zs-num{{background:var(--ac2)}}.w-zasshi .zs-dish:nth-child(3) .zs-num{{background:var(--ac3);color:#262220}}
.w-zasshi .zs-lead__q::before{{background:linear-gradient(var(--ac),var(--ac3))}}
.w-zasshi .cta{{background:#262220 {dots('rgba(244,197,66,.22)', 1.6, 12)}}}
''')

# ---------------------------------------------------------------- 夜の居酒屋：煙のゆらぎ・金と朱・亀甲
add(f'''.w-yami{{--ac2:#C8452E}}
.w-yami .ym-hero::before{{content:"";position:absolute;inset:-10%;z-index:1;background:url(../m/smoke.webp) center/cover;mix-blend-mode:screen;opacity:.35;animation:smoke-drift 18s ease-in-out infinite alternate;pointer-events:none}}
.w-yami .ym-guide{{background-color:#211D1A;background-image:{kikko('rgba(200,160,98,.08)')}}}
.w-yami .ym-links a:nth-child(n){{border-left-color:var(--ac)}}
.w-yami .ym-links li:nth-child(2) a{{border-left-color:var(--ac2)}}
.w-yami .ym-dish h3::after{{content:"";display:block;width:28px;height:2px;margin-top:10px;background:linear-gradient(90deg,var(--ac),var(--ac2))}}
.w-yami .ym-scene__list li:nth-child(2) h3{{border-color:var(--ac2)}}
.w-yami .cta{{background:#221E1B {seigaiha('rgba(200,160,98,.14)', '#221E1B')} 0 0/48px 24px}}
''')

# ---------------------------------------------------------------- クラフト×丼：本物のクラフト紙・朱の筆・市松
add(f'''.w-men{{--ac2:#C79A3A;background-color:#E8DDCB;background-image:url(../m/kraft.webp);background-size:700px}}
.w-men .mn-h{{isolation:isolate;display:block}}
.w-men .mn-menu .mn-h::before,.w-men .mn-lead .mn-lead__v{{position:relative}}
.w-men .mn-menu .mn-h{{position:relative;width:fit-content;margin-left:auto;margin-right:auto;color:#FFF6EE;padding:0 20px}}
.w-men .mn-menu .mn-h::before{{content:"";position:absolute;inset:-18px -60px;background:var(--ac);-webkit-mask:url(../m/brush.webp) center/100% 100% no-repeat;mask:url(../m/brush.webp) center/100% 100% no-repeat;z-index:-1}}
.w-men .mn-menu .mn-h::after{{display:none}}
.w-men .mn-scene{{background:#2D241D {ichimatsu('rgba(232,221,203,.04)', 'transparent', 26)}}}
.w-men .mn-scene .mn-h::after{{background:var(--ac2)}}
.w-men .mn-bowl figure{{box-shadow:0 0 0 6px #E8DDCB,0 0 0 7.5px var(--ac2),0 24px 40px -24px rgba(45,36,29,.5)}}
.w-men .cta{{background:var(--ac) {ichimatsu('rgba(0,0,0,.07)', 'transparent', 18)}}}
''')

# ---------------------------------------------------------------- 既存の6型にも同じ考え方で
add(f'''.w-washi{{--ac2:#B08A3E;background-image:url(../m/washi.webp);background-size:600px}}
.w-washi .scene{{background-color:#F1EDE4;background-image:{shippo('rgba(176,138,62,.14)')};background-size:44px}}
.w-washi .lead__t::after{{background:var(--ac)}}
.w-washi .dish h3{{border-color:color-mix(in srgb,var(--ac2) 45%,transparent)}}
.w-washi .cta{{background:#1F1C19 {seigaiha('rgba(251,250,246,.08)', '#1F1C19')} 0 0/48px 24px}}
.w-sumi .hero::before{{content:"";position:absolute;inset:-10%;z-index:1;background:url(../m/smoke.webp) center/cover;mix-blend-mode:screen;opacity:.3;animation:smoke-drift 20s ease-in-out infinite alternate;pointer-events:none}}
.w-sumi .scene{{background-image:{kikko('rgba(239,231,218,.05)')}}}
.w-kiiro .menu{{background-image:{dots('rgba(26,23,18,.10)', 1.5, 10)}}}
.w-kiiro .scene{{background-color:#FFF5D1}}
.w-kawaii .hero{{position:relative;isolation:isolate}}
.w-kawaii .hero::before{{content:"";position:absolute;right:-10%;top:-10%;width:70%;aspect-ratio:16/9;background:url(../m/wash.webp) center/cover;mix-blend-mode:multiply;opacity:.6;z-index:-1;pointer-events:none}}
.w-retro .scene{{background-image:{dots('rgba(255,255,255,.10)', 1.4, 9)}}}
''')

open(os.path.join(ROOT, 'p', '_assets', 'w', 'deco.css'), 'w').write('\n'.join(CSS))
print('deco.css', sum(len(x) for x in CSS))
