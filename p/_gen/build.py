#!/usr/bin/env python3
"""試作HPジェネレーター（世界観つき）

使い方:  python3 p/_gen/build.py p/_gen/shops/2026-10-29.json
  - 店ごとの内容（世界観・訴求・メニュー例など）は shops/<日付>.json に書く
  - 店の基本情報（住所・電話・評価・地図）は _data/fukui-food-*.json から読む
  - 出力は p/<ID>/index.html（ID は 's' + md5(place_id)[:8]）
"""
import glob, hashlib, html, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import worlds2

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
E = lambda s: html.escape(str(s or ''), quote=True)

# ---------------------------------------------------------------- 写真ライブラリ（業種ごと）
A = '../_assets/'
IMG = {
  'soba':     dict(hero=A+'img/ramen-soba-wide.webp', d=[A+'img/ramen-soba-sq.webp', A+'img/r2-tempura-sq.webp', A+'img/r2-nimono-sq.webp'], room=A+'img/r2-interior-sq.webp'),
  'chuka':    dict(hero=A+'img/chinese_korean-wok-wide.webp', d=[A+'img/chinese_korean-chahan_top-sq.webp', A+'img/chinese_korean-chuka_dishes-sq.webp', A+'img/ramen-gyoza-sq.webp'], room=A+'img/chinese_korean-chuka_interior-sq.webp'),
  'korean':   dict(hero=A+'img/chinese_korean-korean_dishes-wide.webp', d=[A+'img/chinese_korean-korean_dishes-sq.webp', A+'img/chinese_korean-wok-sq.webp', A+'img/iz-iz_toast-sq.webp'], room=A+'img/iz-iz_interior-sq.webp'),
  'yakitori': dict(hero=A+'g/yakitori_fire.webp', d=[A+'img/iz-iz_yakitori-sq.webp', A+'img/iz-iz_grill-por.webp', A+'img/iz-iz_toast-sq.webp'], room=A+'img/iz-iz_interior-sq.webp'),
  'kushiage': dict(hero=A+'g/kushiage.webp', d=[A+'g/kushiage.webp', A+'img/iz-iz_otsumami-sq.webp', A+'img/iz-iz_toast-sq.webp'], room=A+'img/iz-iz_interior-sq.webp'),
  'sea':      dict(hero=A+'img/r2-serve-wide.webp', d=[A+'img/r2-sashimi-sq.webp', A+'img/r2-kaisen-sq.webp', A+'img/iz-iz_otsumami-sq.webp'], room=A+'img/iz-iz_zashiki-sq.webp'),
  'oden':     dict(hero=A+'g/oden.webp', d=[A+'g/oden.webp', A+'img/r2-nimono-sq.webp', A+'img/iz-iz_otsumami-sq.webp'], room=A+'img/iz-iz_interior-sq.webp'),
  'okonomi':  dict(hero=A+'g/okonomi.webp', d=[A+'g/okonomi.webp', A+'img/ramen-gyoza-sq.webp', A+'img/iz-iz_toast-sq.webp'], room=A+'g/okonomi_in.webp'),
  'izakaya':  dict(hero=A+'img/iz-iz_exterior-wide.webp', d=[A+'img/iz-iz_course-sq.webp', A+'img/iz-iz_yakitori-sq.webp', A+'img/iz-iz_otsumami-sq.webp'], room=A+'img/iz-iz_zashiki-sq.webp'),
  'sushi':    dict(hero=A+'img/r2-serve-wide.webp', d=[A+'img/r2-kaisen-sq.webp', A+'img/r2-sashimi-sq.webp', A+'img/sushi-chef_hands-por.webp'], room=A+'img/r2-interior-sq.webp'),
  'robata':   dict(hero=A+'g/yakitori_fire.webp', d=[A+'img/iz-iz_grill-por.webp', A+'img/r2-sashimi-sq.webp', A+'img/iz-iz_toast-sq.webp'], room=A+'img/iz-iz_zashiki-sq.webp'),
  'obanzai':  dict(hero=A+'g/obanzai.webp', d=[A+'img/r2-nimono-sq.webp', A+'g/obanzai.webp', A+'img/r2-alacarte-sq.webp'], room=A+'img/r2-interior-sq.webp'),
  'nabe':     dict(hero=A+'g/motsunabe.webp', d=[A+'g/motsunabe.webp', A+'img/iz-iz_nabe-sq.webp', A+'img/iz-iz_toast-sq.webp'], room=A+'img/iz-iz_zashiki-sq.webp'),
  'washoku':  dict(hero=A+'img/r2-serve-wide.webp', d=[A+'img/r2-gozen-sq.webp', A+'img/r2-tempura-sq.webp', A+'img/iz-iz_nabe-sq.webp'], room=A+'img/r2-private-sq.webp'),
  'tempura':  dict(hero=A+'img/r2-serve-wide.webp', d=[A+'img/r2-tempura-sq.webp', A+'img/r2-alacarte-sq.webp', A+'img/iz-iz_toast-sq.webp'], room=A+'img/r2-interior-sq.webp'),
  'bar':      dict(hero=A+'g/bar_in.webp', d=[A+'g/cocktail.webp', A+'g/bar_in.webp', A+'img/iz-iz_highball_cut-thumb.webp'], room=A+'g/bar_in.webp'),
  'cafe':     dict(hero=A+'g/sweets.webp', d=[A+'g/sweets.webp', A+'g/cocktail.webp', A+'img/r2-drink-thumb.webp'], room=A+'g/bar_in.webp'),
  'pub':      dict(hero=A+'g/pub_in.webp', d=[A+'g/stout.webp', A+'g/pub_in.webp', A+'img/iz-iz_otsumami-sq.webp'], room=A+'g/pub_in.webp'),
  'tonkatsu': dict(hero=A+'g/tonkatsu.webp', d=[A+'g/tonkatsu.webp', A+'img/r2-karaage-sq.webp', A+'img/r2-gozen-sq.webp'], room=A+'img/r2-interior-sq.webp'),
  'yakiniku': dict(hero=A+'g/yakiniku.webp', d=[A+'g/yakiniku.webp', A+'img/yakiniku-bibimbap-thumb.webp', A+'img/iz-iz_toast-sq.webp'], room=A+'img/iz-iz_interior-sq.webp'),
  'dogs':     dict(hero=A+'g/hotdog.webp', d=[A+'g/hotdog.webp', A+'g/stout.webp', A+'img/r2-beer-thumb.webp'], room=A+'g/pub_in.webp'),
  'bistro':   dict(hero=A+'g/bistro.webp', d=[A+'g/bistro.webp', A+'g/cocktail.webp', A+'img/r2-alacarte-sq.webp'], room=A+'g/bar_in.webp'),
  'morning':  dict(hero=A+'g/morning.webp', d=[A+'g/morning.webp', A+'img/r2-gozen-sq.webp', A+'g/coffee.webp'], room=A+'img/r2-interior-sq.webp'),
  'coffee':   dict(hero=A+'g/coffee.webp', d=[A+'g/coffee.webp', A+'g/sweets.webp', A+'img/r2-sake-thumb.webp'], room=A+'g/coffee.webp'),
  'ramen':    dict(hero=A+'img/ramen-soba-wide.webp', d=[A+'img/ramen-ramen_bowl-sq.webp', A+'img/ramen-gyoza-sq.webp', A+'img/r2-gozen-sq.webp'], room=A+'img/r2-interior-sq.webp'),
  'kaiseki':  dict(hero=A+'img/r2-serve-wide.webp', d=[A+'img/r2-gozen-sq.webp', A+'img/r2-sashimi-sq.webp', A+'img/r2-tempura-sq.webp'], room=A+'img/r2-private-sq.webp'),
  'chicken':  dict(hero=A+'g/yakitori_fire.webp', d=[A+'img/iz-iz_yakitori-sq.webp', A+'img/r2-karaage-sq.webp', A+'img/iz-iz_toast-sq.webp'], room=A+'img/iz-iz_zashiki-sq.webp'),
}

# ---------------------------------------------------------------- 世界観ごとの書体
FONTS = {
  'washi':  'Zen+Kaku+Gothic+Antique:wght@400;500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Jost:wght@400;500',
  'sumi':   'Zen+Kaku+Gothic+New:wght@400;500;700;900&family=Outfit:wght@300;500;700',
  'kiiro':  'Dela+Gothic+One&family=Zen+Maru+Gothic:wght@500;700;900&family=Outfit:wght@600;800',
  'kawaii': 'Zen+Maru+Gothic:wght@400;500;700;900&family=Outfit:wght@500;700',
  'retro':  'Dela+Gothic+One&family=Zen+Kaku+Gothic+New:wght@500;700;900&family=Outfit:wght@500;600',
  'pub':    'Outfit:wght@300;500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700',
}

ICON = {
  'tel': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3.5h3l1.5 4-2 1.3a12 12 0 0 0 7.7 7.7l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 3 5.7a2 2 0 0 1 2-2.2Z"/></svg>',
  'pin': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>',
  'star': '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z"/></svg>',
  'ig':  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor"/></svg>',
  'arrow': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
}


def pid(place_id):
    return 's' + hashlib.md5(place_id.encode()).hexdigest()[:8]


def load_targets():
    # 訪問記録シートの元データは leads-data。_data 側にしか無い店も拾えるよう両方読む（leads-data 優先）
    keys = ['place', 'block', 'order', 'date', 'staff', 'name', 'genre', 'kind', 'town', 'addr', 'tel', 'rating', 'reviews', 'hp', 'sns', 'map', 'lat', 'lng']
    out = {}
    for sub in ('_data', 'leads-data'):
        fs = sorted(glob.glob(os.path.join(ROOT, sub, 'fukui-food-*.json')))
        if fs:
            for r in json.load(open(fs[-1]))['targets']:
                out[r[0]] = dict(zip(keys, r))
    return out


def lines(txt):
    return '<br>'.join(E(x) for x in str(txt).split('\n'))


def vlines(txt):
    return ''.join(f'<span>{E(x)}</span>' for x in str(txt).split('\n'))


# ---------------------------------------------------------------- 共通パーツ
def ribbon(s):
    return f'<div class="ribbon"><b>{E(s["name"])}様</b>のための試作ページです<span>メニュー・写真・価格はイメージです</span></div>'


def rating(s):
    if not s.get('rating') or (s.get('reviews') or 0) < 3:
        return ''
    return f'<p class="rate">{ICON["star"]}<b>{s["rating"]}</b><span>Googleの口コミ {s["reviews"]}件</span></p>'


def header(s, c):
    nav = '<a href="#menu">おすすめ</a><a href="#scene">使い方</a><a href="#about">お店のこと</a><a href="#info">アクセス</a>'
    tel = f'<a class="hd__tel btn btn--s" href="tel:{E(s["tel"])}">{ICON["tel"]}<span>{E(s["tel"])}</span></a>' if s.get('tel') else '<a class="hd__tel btn btn--s" href="#info">アクセス</a>'
    return f'<header class="hd"><a class="hd__brand" href="#top">{E(c.get("short") or s["name"])}</a><nav class="hd__nav">{nav}</nav>{tel}</header>'


def info(s, c):
    rows = [('住所', E(s['addr']).replace('〒', '〒'))]
    rows.append(('電話', f'<a href="tel:{E(s["tel"])}">{E(s["tel"])}</a>' if s.get('tel') else '<span class="tbd">〔要確認〕</span>'))
    rows.append(('営業時間', '<span class="tbd">〔要確認〕</span>'))
    rows.append(('定休日', '<span class="tbd">〔要確認〕</span>'))
    dl = ''.join(f'<dt>{k}</dt><dd>{v}</dd>' for k, v in rows)
    sns = ''
    if s.get('sns') and 'instagram' in s['sns']:
        sns = f'<a class="btn btn--ghost" href="{E(s["sns"])}" target="_blank" rel="noopener">{ICON["ig"]}<span>Instagram</span></a>'
    return f'''<section class="info" id="info"><div class="wrap info__in">
  <h2 class="h2 rv">アクセス</h2>
  <dl class="info__dl rv">{dl}</dl>
  <div class="info__btns rv"><a class="btn" href="{E(s["map"])}" target="_blank" rel="noopener">{ICON["pin"]}<span>Googleマップで開く</span></a>{sns}</div>
</div></section>'''


def cta(s, c):
    tel = f'<a class="btn btn--big" href="tel:{E(s["tel"])}">{ICON["tel"]}<span>電話で予約する</span></a>' if s.get('tel') else f'<a class="btn btn--big" href="{E(s["map"])}" target="_blank" rel="noopener">{ICON["pin"]}<span>お店の場所を見る</span></a>'
    return f'<section class="cta"><div class="wrap cta__in rv"><p class="cta__t">{lines(c["cta"])}</p>{tel}</div></section>'


def footer(s, c):
    return f'<footer class="ft"><p class="ft__name">{E(s["name"])}</p><p class="ft__addr">{E(s["town"])}・{E(s["kind"].split("、")[0])}</p><small>このページは試作です／制作 スケルトン株式会社</small></footer>'


def spbar(s):
    a = f'<a href="tel:{E(s["tel"])}">{ICON["tel"]}電話</a>' if s.get('tel') else ''
    return f'<div class="spbar">{a}<a href="{E(s["map"])}" target="_blank" rel="noopener">{ICON["pin"]}地図</a></div>'


def dishes_cards(c, im, cls='dish'):
    out = []
    for i, (n, note) in enumerate(c['dishes']):
        out.append(f'<li class="{cls} rv" style="--d:{i*0.08:.2f}s"><figure><img src="{im["d"][i % 3]}" alt="{E(n)}" loading="lazy"></figure><h3>{E(n)}</h3><p>{E(note)}</p></li>')
    return ''.join(out)


def scenes_list(c):
    return ''.join(f'<li class="rv" style="--d:{i*0.08:.2f}s"><h3>{E(t)}</h3><p>{E(d)}</p></li>' for i, (t, d) in enumerate(c['scenes']))


# ---------------------------------------------------------------- 世界観ごとの本体
def body_washi(s, c, im):
    return f'''
<section class="hero" id="top"><div class="hero__in">
  <div class="hero__name rv"><p>{E(s["kind"].split("、")[0])}</p><h1>{vlines(c["short_v"] if c.get("short_v") else c.get("short") or s["name"])}</h1></div>
  <figure class="hero__ph reveal-clip"><img src="{im["hero"]}" alt="" fetchpriority="high"></figure>
  <div class="hero__copy rv"><p class="catch">{lines(c["catch"])}</p>{rating(s)}</div>
</div></section>
<section class="lead"><div class="wrap narrow rv"><p class="lead__t">{lines(c["lead"])}</p></div></section>
<section class="menu" id="menu"><div class="wrap"><h2 class="h2 rv">おすすめ</h2><ul class="menu__list">{dishes_cards(c, im)}</ul><p class="note">※ 写真と内容はイメージです。実際のお品書きに差し替えます。</p></div></section>
<section class="scene" id="scene"><div class="wrap scene__in"><h2 class="h2 rv">こんなときに</h2><ol class="scene__list">{scenes_list(c)}</ol></div></section>
<section class="about" id="about"><div class="wrap about__in"><figure class="about__ph reveal-clip"><img src="{im["room"]}" alt="" loading="lazy"></figure><div class="about__t rv"><h2 class="h2">お店のこと</h2><p>{lines(c["about"])}</p></div></div></section>'''


def body_sumi(s, c, im):
    return f'''
<section class="hero" id="top"><figure class="hero__bg"><img src="{im["hero"]}" alt="" fetchpriority="high"></figure>
  <div class="hero__in"><p class="hero__kind rv">{E(s["kind"].split("、")[0])}／{E(s["town"])}</p><h1 class="hero__name rv" style="--d:.1s">{E(c.get("short") or s["name"])}</h1><p class="catch rv" style="--d:.2s">{lines(c["catch"])}</p>{rating(s)}</div>
  <a class="hero__scroll" href="#menu" aria-label="下へ"><span></span></a>
</section>
<section class="lead"><div class="wrap narrow rv"><p class="lead__t">{lines(c["lead"])}</p></div></section>
<section class="menu" id="menu"><div class="wrap"><h2 class="h2 rv">今夜の一品</h2></div><ul class="menu__rail" tabindex="0" aria-label="おすすめ（横にスクロールできます）">{dishes_cards(c, im)}</ul><div class="wrap"><p class="note">※ 写真と内容はイメージです。実際のお品書きに差し替えます。</p></div></section>
<section class="about" id="about"><figure class="about__ph"><img src="{im["room"]}" alt="" loading="lazy" data-par></figure><div class="about__t rv"><h2 class="h2">お店のこと</h2><p>{lines(c["about"])}</p></div></section>
<section class="scene" id="scene"><div class="wrap"><h2 class="h2 rv">こんな夜に</h2><ol class="scene__list">{scenes_list(c)}</ol></div></section>'''


def body_kiiro(s, c, im):
    words = c.get('marquee') or [s['name'], c['dishes'][0][0], c['dishes'][1][0]]
    mq = ''.join(f'<span>{E(w)}</span><i>●</i>' for w in words) * 3
    return f'''
<section class="hero" id="top"><div class="hero__in">
  <div class="hero__copy"><p class="hero__kind rv">{E(s["town"])}の{E(s["kind"].split("、")[0])}</p><h1 class="hero__name rv" style="--d:.08s">{E(c.get("short") or s["name"])}</h1><p class="catch rv" style="--d:.16s">{lines(c["catch"])}</p>{rating(s)}</div>
  <figure class="hero__ph rv" style="--d:.1s"><img src="{im["hero"]}" alt="" fetchpriority="high"><span class="sticker">{E(c.get("sticker") or "名物あり")}</span></figure>
</div></section>
<div class="marq" aria-hidden="true"><div class="marq__t">{mq}</div></div>
<section class="lead"><div class="wrap narrow rv"><p class="lead__t">{lines(c["lead"])}</p></div></section>
<section class="menu" id="menu"><div class="wrap"><h2 class="h2 rv">これ食べて！</h2><ul class="menu__list">{dishes_cards(c, im)}</ul><p class="note">※ 写真と内容はイメージです。実際のお品書きに差し替えます。</p></div></section>
<section class="scene" id="scene"><div class="wrap"><h2 class="h2 rv">こんな時に、どうぞ</h2><ol class="scene__list">{scenes_list(c)}</ol></div></section>
<section class="about" id="about"><div class="wrap about__in"><figure class="about__ph rv"><img src="{im["room"]}" alt="" loading="lazy"></figure><div class="about__t rv"><h2 class="h2">お店のこと</h2><p>{lines(c["about"])}</p></div></div></section>'''


def body_kawaii(s, c, im):
    return f'''
<section class="hero" id="top"><div class="hero__in">
  <figure class="hero__ph rv"><img src="{im["hero"]}" alt="" fetchpriority="high"></figure>
  <div class="hero__copy"><p class="hero__kind rv">{E(s["town"])}・{E(s["kind"].split("、")[0])}</p><h1 class="hero__name rv" style="--d:.08s">{E(c.get("short") or s["name"])}</h1><p class="catch rv" style="--d:.16s">{lines(c["catch"])}</p>{rating(s)}</div>
</div><svg class="wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40 C 240 90 480 0 720 40 S 1200 80 1440 30 L1440 80 L0 80Z"/></svg></section>
<section class="lead"><div class="wrap narrow rv"><p class="lead__t">{lines(c["lead"])}</p></div></section>
<section class="menu" id="menu"><div class="wrap"><h2 class="h2 rv">おすすめ</h2><ul class="menu__list">{dishes_cards(c, im)}</ul><p class="note">※ 写真と内容はイメージです。実際のメニューに差し替えます。</p></div></section>
<section class="scene" id="scene"><div class="wrap"><h2 class="h2 rv">こんなときに</h2><ol class="scene__list">{scenes_list(c)}</ol></div></section>
<section class="about" id="about"><div class="wrap about__in"><figure class="about__ph rv"><img src="{im["room"]}" alt="" loading="lazy"></figure><div class="about__t rv"><h2 class="h2">お店のこと</h2><p>{lines(c["about"])}</p></div></div></section>'''


def body_retro(s, c, im):
    words = c.get('marquee') or [s['name'], c['dishes'][0][0]]
    mq = ''.join(f'<span>{E(w)}</span><i></i>' for w in words) * 4
    cl = str(c['catch']).split('\n')
    vcatch = ''.join(f'<span class="vl rvc" style="--d:{i*0.3:.1f}s">{E(x)}</span>' for i, x in enumerate(cl))
    return f'''
<section class="hero" id="top">
  <div class="hero__logo rv{" is-long" if len(c.get("short") or s["name"])>6 else ""}"><span class="hero__sub">{E(s["town"])}の{E(s["kind"].split("、")[0])}</span><h1>{E(c.get("short") or s["name"])}</h1></div>
  <div class="hero__wave"><div class="hero__band"></div><figure class="hero__ph"><img src="{im["hero"]}" alt="" fetchpriority="high"></figure></div>
</section>
<section class="vcatch"><p class="vcatch__v">{vcatch}</p>{rating(s)}</section>
<div class="marq" aria-hidden="true"><div class="marq__t">{mq}</div></div>
<section class="lead"><div class="wrap narrow rv"><p class="lead__t">{lines(c["lead"])}</p></div></section>
<section class="menu" id="menu"><div class="wrap"><h2 class="h2 rv">名物</h2><ul class="menu__list">{dishes_cards(c, im)}</ul><p class="note">※ 写真と内容はイメージです。実際のお品書きに差し替えます。</p></div></section>
<section class="scene" id="scene"><div class="wrap"><h2 class="h2 rv">こんな時に</h2><ol class="scene__list">{scenes_list(c)}</ol></div></section>
<section class="about" id="about"><div class="wrap about__in"><figure class="about__ph rv"><img src="{im["room"]}" alt="" loading="lazy"></figure><div class="about__t rv"><h2 class="h2">お店のこと</h2><p>{lines(c["about"])}</p></div></div></section>'''


def body_pub(s, c, im):
    return f'''
<section class="hero" id="top"><figure class="hero__bg"><img src="{im["hero"]}" alt="" fetchpriority="high"></figure>
  <div class="hero__in"><p class="hero__kind rv">{E(s["town"])}／{E(s["kind"].split("、")[0])}</p><h1 class="hero__name rv" style="--d:.1s">{E(c.get("short") or s["name"])}</h1><p class="catch rv" style="--d:.2s">{lines(c["catch"])}</p>{rating(s)}</div>
</section>
<section class="lead"><div class="wrap narrow rv"><p class="lead__t">{lines(c["lead"])}</p></div></section>
<section class="menu" id="menu"><div class="wrap menu__in"><figure class="menu__ph rv"><img src="{im["d"][0]}" alt="" loading="lazy"></figure><div class="board rv"><h2 class="h2">Tonight</h2><ul>{"".join(f"<li><b>{E(n)}</b><span>{E(note)}</span></li>" for n, note in c["dishes"])}</ul><p class="note">※ 内容はイメージです。実際のメニューに差し替えます。</p></div></div></section>
<section class="scene" id="scene"><div class="wrap"><h2 class="h2 rv">こんな夜に</h2><ol class="scene__list">{scenes_list(c)}</ol></div></section>
<section class="about" id="about"><div class="wrap about__in"><figure class="about__ph rv"><img src="{im["room"]}" alt="" loading="lazy"></figure><div class="about__t rv"><h2 class="h2">お店のこと</h2><p>{lines(c["about"])}</p></div></div></section>'''


BODY = dict(washi=body_washi, sumi=body_sumi, kiiro=body_kiiro, kawaii=body_kawaii, retro=body_retro, pub=body_pub)
FONTS.update(worlds2.FONTS2)


def page(s, c):
    w = c['world']
    im = IMG[c['img']]
    if w in worlds2.BODY2:
        im = worlds2.imgs(w, c['img'], im)
        if c.get('hero'):
            im['hero'] = A + c['hero']
        main_html = worlds2.BODY2[w](s, c, im, ICON)
    else:
        main_html = BODY[w](s, c, im)
    title = f'{s["name"]}｜福井市{s["town"]}の{s["kind"].split("、")[0]}（試作ページ）'
    desc = f'{s["name"]}（福井市{s["town"]}）のホームページ試作イメージです。'
    return f'''<!doctype html>
<html lang="ja"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>{E(title)}</title><meta name="description" content="{E(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family={FONTS[w]}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../_assets/w/base.css"><link rel="stylesheet" href="../_assets/w/{w}.css">
</head>
<body class="w-{w} pal-{E(c.get("pal", "a"))}">
{ribbon(s)}
{header(s, c)}
<main>{main_html}
{info(s, c)}
{cta(s, c)}
</main>
{footer(s, c)}
{spbar(s)}
<script src="../_assets/w/base.js" defer></script>
</body></html>
'''


def main(spec_path):
    T = load_targets()
    spec = json.load(open(spec_path))
    out = []
    for c in spec['shops']:
        s = T[c['place']]
        d = os.path.join(ROOT, 'p', pid(c['place']))
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w').write(page(s, c))
        out.append((pid(c['place']), s['name'], c['world']))
    for o in out:
        print(*o)


if __name__ == '__main__':
    main(sys.argv[1])
