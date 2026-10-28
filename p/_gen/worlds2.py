"""試作HP 追加の世界観（参考デザイン6件から起こした型）

hiraki    … 漆喰の生成り地＋左の縦ロゴ＋暗い料理写真の大ビジュアル（焼き鳥・炭火・居酒屋）
sankaku   … 写真を斜めに切って組むモザイク＋縦書きコピー（そば・和食・寿司・天ぷら）
shokutaku … 真上から撮った食卓写真に、細い枠の大きな漢字（定食・海鮮丼・町中華・食堂）
zasshi    … 雑誌の特集ページのような弾む見出しと注釈（丼・カフェ・お好み焼き・カジュアル）
yami      … 黒地の居酒屋。中央ロゴ、縦書き、矢印つきの案内リスト（炭火・焼肉・鶏・バー）
men       … クラフト紙の地に巨大な2文字と真上の丼（ラーメン・そば・中華）

どれも、色は真っ黒・真っ白を避けて少し色味を混ぜる。動きはエミル流：
 ・ease-out（cubic-bezier(.23,1,.32,1)）、触ったときの反応は200ms前後
 ・出てくるときは scale(0) からではなく .94〜.97 ＋透明度から
 ・ホバーはマウスのときだけ、押したら少し縮む、動きを減らす設定ではすぐ表示
"""
import html, re

E = lambda s: html.escape(str(s or ''), quote=True)
A = '../_assets/'

FONTS2 = {
  'hiraki':    'Zen+Kaku+Gothic+Antique:wght@500;700;900&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Outfit:wght@400;600',
  'sankaku':   'Zen+Kaku+Gothic+New:wght@400;500;700&family=Jost:wght@400;500',
  'shokutaku': 'Zen+Kaku+Gothic+Antique:wght@400;700;900&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Outfit:wght@300;500',
  'zasshi':    'Zen+Maru+Gothic:wght@500;700;900&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Outfit:wght@600;800',
  'yami':      'Dela+Gothic+One&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=Outfit:wght@300;500',
  'men':       'Zen+Kaku+Gothic+Antique:wght@700;900&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Outfit:wght@400;600',
}

# 業種ごとの大きな文字（2文字前後）と英字ラベル
KANJI = {
  'soba': '蕎麦', 'ramen': '拉麺', 'chuka': '中華', 'korean': '韓国', 'yakitori': '焼鳥', 'kushiage': '串揚',
  'sea': '鮮魚', 'oden': '煮込', 'okonomi': '鉄板', 'izakaya': '酒場', 'sushi': '寿司', 'robata': '炉端',
  'obanzai': '惣菜', 'nabe': '鍋処', 'washoku': '和食', 'tempura': '天麩', 'bar': '酒場', 'cafe': '喫茶',
  'pub': '麦酒', 'tonkatsu': '豚揚', 'yakiniku': '焼肉', 'dogs': '洋食', 'bistro': '洋食', 'morning': '朝食',
  'coffee': '珈琲', 'kaiseki': '会席', 'chicken': '鶏料',
}
EN = {
  'soba': 'Soba', 'ramen': 'Ramen', 'chuka': 'Chinese', 'korean': 'Korean', 'yakitori': 'Yakitori', 'kushiage': 'Kushiage',
  'sea': 'Seafood', 'oden': 'Oden', 'okonomi': 'Teppan', 'izakaya': 'Izakaya', 'sushi': 'Sushi', 'robata': 'Robata',
  'obanzai': 'Obanzai', 'nabe': 'Nabe', 'washoku': 'Washoku', 'tempura': 'Tempura', 'bar': 'Bar', 'cafe': 'Cafe',
  'pub': 'Pub', 'tonkatsu': 'Tonkatsu', 'yakiniku': 'Yakiniku', 'dogs': 'Diner', 'bistro': 'Bistro', 'morning': 'Breakfast',
  'coffee': 'Coffee', 'kaiseki': 'Kaiseki', 'chicken': 'Chicken',
}
G = A + 'g/'
# 世界観ごとに、業種に合う大ビジュアルを差し替える
HERO2 = {
  'hiraki':    {'yakitori': G+'salt.webp', 'izakaya': A+'img/iz-iz_grill-por.webp'},
  'sankaku':   {'soba': G+'soba_lift.webp', 'sushi': G+'kaisendon_top.webp', 'sea': G+'kaisendon_top.webp'},
  'shokutaku': {'washoku': G+'teishoku_top.webp', 'obanzai': G+'teishoku_top.webp', 'morning': G+'teishoku_top.webp', 'tonkatsu': G+'teishoku_top.webp',
                'sea': G+'kaisendon_top.webp', 'sushi': G+'kaisendon_top.webp', 'chuka': G+'chuka_top.webp', 'korean': G+'chuka_top.webp',
                'ramen': G+'chuka_top.webp', 'izakaya': G+'teishoku_top.webp', 'soba': G+'teishoku_top.webp', 'tempura': G+'teishoku_top.webp'},
  'zasshi':    {'morning': G+'don_hand.webp', 'washoku': G+'don_hand.webp', 'obanzai': G+'don_hand.webp', 'chuka': G+'chuka_top.webp', 'cafe': G+'sweets.webp'},
  'yami':      {},
  'men':       {'ramen': G+'ramen_top.webp', 'chuka': G+'ramen_top.webp', 'soba': G+'soba_lift.webp'},
}
ROOM2 = {'yami': G+'zashiki_dark.webp'}
SUB2 = {  # 世界観ごとの2枚目の主役写真
  'hiraki': {'yakitori': G+'yakitori_plate.webp', 'chicken': G+'yakitori_plate.webp', 'robata': G+'yakitori_plate.webp', 'izakaya': G+'yakitori_plate.webp'},
}
DRINK = G + 'sake_row.webp'


def imgs(world, key, base):
    im = dict(base)
    im['hero'] = HERO2.get(world, {}).get(key, base['hero'])
    im['room'] = ROOM2.get(world, base['room'])
    im['sub'] = SUB2.get(world, {}).get(key, base['d'][0])
    return im


def lines(t):
    return '<br>'.join(E(x) for x in str(t).split('\n'))


def mix(t):
    """漢字は大きく、ひらがな・句読点は小さく（参考：焼鳥ひらき）"""
    out = []
    for ln in str(t).split('\n'):
        s = E(ln)
        s = re.sub(r'([ぁ-ゖゝゞ、。，．・！？]+)', r'<i>\1</i>', s)
        out.append(f'<span>{s}</span>')
    return ''.join(out)


def chars(t, cls='ch'):
    """1文字ずつ span にして、順番に出す（遅れは 60ms ずつ）"""
    out, n = [], 0
    for ln in str(t).split('\n'):
        row = []
        for ch in ln:
            if ch == ' ':
                row.append(' ')
                continue
            row.append(f'<span class="{cls}" style="--i:{n}">{E(ch)}</span>')
            n += 1
        out.append(f'<span class="ln">{"".join(row)}</span>')
    return ''.join(out)


def kind(s):
    return E(str(s['kind']).split('、')[0])


def nm(s, c):
    return E(c.get('short') or s['name'])


def kanji(c):
    return c.get('kanji') or KANJI.get(c['img'], '旨味')


def rate(s, ico=None):
    if not s.get('rating') or (s.get('reviews') or 0) < 3:
        return ''
    p = max(0, min(100, float(s['rating']) / 5 * 100))
    return f'<p class="rate" aria-label="Googleの口コミ {s["rating"]}（{s["reviews"]}件）"><b class="rate__n">{float(s["rating"]):.1f}</b><span class="rate__r"><span class="rate__s" style="--p:{p:.0f}%" aria-hidden="true"></span><small>Googleの口コミ {s["reviews"]}件</small></span></p>'


# 「こんなときに」の写真：場面の言葉から選ぶ（同じページで使った写真は避ける）
SC = A + 'img/'
SCENE_PICS = [
  (('ひとり', '仕事帰り', '一杯', 'カウンター', '晩ごはん', 'さっと'), [SC+'iz-iz_interior-sq.webp', SC+'r2-interior-sq.webp']),
  (('大切', 'デート', '記念', '二人', 'ゆっくり'), [SC+'r2-private-sq.webp', SC+'iz-iz_zashiki-sq.webp']),
  (('集ま', '宴会', '仲間', '飲み会', '会社', 'はしご', '乾杯', 'みんな', '友'), [SC+'iz-iz_toast-sq.webp', SC+'r2-party-sq.webp']),
  (('家族', '子ども', 'ごほうび'), [SC+'r2-party-sq.webp', SC+'iz-iz_zashiki-sq.webp']),
  (('昼', 'ランチ', 'お昼'), [SC+'r2-lunch-sq.webp', SC+'r2-serve-sq.webp']),
  (('持ち帰', 'テイクアウト', 'おうち', 'お持ち'), [SC+'r2-takeout-sq.webp']),
  (('朝', '出勤', '通勤'), [A+'g/morning.webp', SC+'r2-lunch-sq.webp']),
  (('旅', '出張', 'おみやげ', '観光', '電車', '駅', '待ち'), [SC+'iz-iz_exterior-sq.webp', SC+'r2-serve-sq.webp']),
]
SCENE_DEFAULT = [SC+'r2-serve-sq.webp', SC+'iz-iz_toast-sq.webp', SC+'r2-private-sq.webp', SC+'r2-chef-por.webp', SC+'r2-owner-thumb.webp']


WEST = {'pub', 'bar', 'bistro', 'dogs', 'cafe', 'coffee'}
WEST_PICS = [A+'g/pub_in.webp', A+'g/bar_in.webp', A+'g/cocktail.webp', A+'g/stout.webp', A+'g/coffee.webp', A+'g/sweets.webp', A+'g/bistro.webp']


def scene_pics(c, im):
    used = {im.get('hero'), im.get('room'), im.get('sub'), *im['d']}
    out = []
    for t, d in c['scenes']:
        if c['img'] in WEST:
            cands = WEST_PICS
        else:
            cands = [p for keys, ps in SCENE_PICS if any(k in t + d for k in keys) for p in ps] + SCENE_DEFAULT
        pick = next((p for p in cands if p not in used), SCENE_DEFAULT[0])
        used.add(pick)
        out.append(pick)
    return out


def scenes_ph(c, im):
    pics = scene_pics(c, im)
    return ''.join(
        f'<li class="sc rv" style="--d:{i*0.09:.2f}s"><figure><img src="{pics[i]}" alt="" loading="lazy"></figure><div class="sc__t"><h3>{E(t)}</h3><p>{E(d)}</p></div></li>'
        for i, (t, d) in enumerate(c['scenes']))


NOTE = '<p class="note">※ 写真と内容はイメージです。実際のお品書きに差し替えます。</p>'


def scenes(c, cls='rv'):
    return ''.join(f'<li class="{cls}" style="--d:{i*0.07:.2f}s"><h3>{E(t)}</h3><p>{E(d)}</p></li>' for i, (t, d) in enumerate(c['scenes']))


# ================================================================ hiraki
def body_hiraki(s, c, im, ICON):
    tel = f'<a class="hk-tel" href="tel:{E(s["tel"])}"><small>ご予約・お問い合わせ</small>{ICON["tel"]}<b>{E(s["tel"])}</b></a>' if s.get('tel') else ''
    tabs = (f'<a href="tel:{E(s["tel"])}">{ICON["tel"]}<span>電話で予約</span></a>' if s.get('tel') else '') + f'<a href="{E(s["map"])}" target="_blank" rel="noopener">{ICON["pin"]}<span>地図を見る</span></a>'
    en = EN.get(c['img'], 'Japanese')
    dishes = ''.join(
        f'<li class="hk-dish rv" style="--d:{i*0.08:.2f}s"><figure><img src="{im["d"][i % 3]}" alt="{E(n)}" loading="lazy"></figure><div><h3>{E(n)}</h3><p>{E(note)}</p></div></li>'
        for i, (n, note) in enumerate(c['dishes']))
    return f'''
<div class="hk-rail" aria-hidden="true"><p class="hk-rail__logo">{E(c.get("short_v") or c.get("short") or s["name"])}</p><p class="hk-rail__tag">{E(s["town"])}の{kind(s)}</p></div>
<nav class="hk-tabs" aria-label="予約と地図">{tabs}</nav>
<section class="hk-hero" id="top">
  <figure class="hk-hero__ph"><img src="{im["hero"]}" alt="" fetchpriority="high"></figure>
  <div class="hk-hero__name"><span class="hk-hero__k">{kind(s)}</span><h1>{E(c.get("short_v") or c.get("short") or s["name"])}</h1></div>
  {tel}
  <div class="hk-hero__rate">{rate(s, ICON["star"])}</div>
</section>
<section class="hk-intro">
  <figure class="hk-intro__ph reveal-clip"><img src="{im["d"][0]}" alt="" loading="lazy"></figure>
  <h2 class="hk-catch rv">{mix(c["catch"])}</h2>
  <p class="hk-vtext rv" style="--d:.15s">{lines(c["lead"])}<br><br>{lines(c["about"])}</p>
  <div class="hk-plate"><span class="hk-plate__band"></span><span class="hk-plate__en">{E(en)}</span><img class="rv" src="{im["sub"]}" alt="" loading="lazy"></div>
</section>
<div class="hk-slant" aria-hidden="true"></div>
<section class="hk-menu" id="menu"><div class="wrap"><h2 class="hk-h rv"><span>Menu</span>おすすめの品</h2><ul class="hk-menu__list">{dishes}</ul>{NOTE}</div></section>
<section class="hk-panel" id="about"><div class="hk-panel__in">
  <figure class="hk-panel__ph rv"><img src="{im["room"]}" alt="" loading="lazy"></figure>
  <div class="hk-panel__t rv" style="--d:.1s"><p class="hk-panel__en"><span>About</span></p><h2>お店のこと</h2><p>{lines(c["about"])}</p></div>
</div></section>
<section class="hk-scene" id="scene"><div class="wrap"><h2 class="hk-h rv"><span>Scene</span>こんなときに</h2><ol class="hk-scene__list">{scenes_ph(c, im)}</ol></div></section>'''


# ================================================================ sankaku
def body_sankaku(s, c, im, ICON):
    ph = [im['hero'], im['d'][0], im['d'][1], im['d'][2]]
    cl = str(c['catch']).split('\n')
    vc = ''.join(f'<span style="--i:{i}">{E(x)}</span>' for i, x in enumerate(cl))
    dishes = ''.join(
        f'<li class="sk-dish rv" style="--d:{i*0.08:.2f}s"><figure><img src="{im["d"][i % 3]}" alt="{E(n)}" loading="lazy"></figure><h3>{E(n)}</h3><p>{E(note)}</p></li>'
        for i, (n, note) in enumerate(c['dishes']))
    return f'''
<section class="sk-hero" id="top">
  <div class="sk-mosaic">
    <figure class="sk-p sk-p1"><img src="{ph[0]}" alt="" fetchpriority="high"></figure>
    <figure class="sk-p sk-p2"><img src="{ph[1]}" alt=""></figure>
    <figure class="sk-p sk-p3"><img src="{ph[2]}" alt=""></figure>
    <svg class="sk-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 80 L80 0 M18 100 L59 59 M40 100 L70 70 M40 40 L100 100" vector-effect="non-scaling-stroke"/></svg>
    <div class="sk-copy"><p class="sk-name">{nm(s, c)}</p><h1 class="sk-catch">{vc}</h1></div>
    <div class="sk-tag" aria-hidden="true">{E(kanji(c))}</div>
  </div>
  <div class="sk-under wrap"><p>{E(s["town"])}・{kind(s)}</p>{rate(s, ICON["star"])}</div>
</section>
<section class="sk-lead"><div class="wrap sk-lead__in"><p class="sk-lead__v rv">{lines(c["lead"])}</p><figure class="sk-lead__ph reveal-clip"><img src="{im["room"]}" alt="" loading="lazy"></figure></div></section>
<section class="sk-menu" id="menu"><div class="wrap"><h2 class="sk-h rv">おすすめ</h2><ul class="sk-menu__list">{dishes}</ul>{NOTE}</div></section>
<section class="sk-scene" id="scene"><div class="wrap sk-scene__in"><h2 class="sk-h rv">こんなときに</h2><ol class="sk-scene__list">{scenes_ph(c, im)}</ol></div></section>
<section class="sk-about" id="about"><div class="wrap sk-about__in rv"><h2 class="sk-h">お店のこと</h2><p>{lines(c["about"])}</p></div></section>'''


# ================================================================ shokutaku
def body_shokutaku(s, c, im, ICON):
    k = kanji(c)
    frames = ''.join(f'<span class="st-k" style="--i:{i}"><b>{E(ch)}</b></span>' for i, ch in enumerate(k))
    en = EN.get(c['img'], 'Japanese')
    labels = ''.join(
        f'<div class="st-label st-label--{i+1}" style="--i:{i}"><b>{E(c["dishes"][i][0])}</b><small>{E(c["dishes"][i][1])}</small></div>'
        for i in range(2))
    dishes = ''.join(
        f'<li class="st-dish rv" style="--d:{i*0.08:.2f}s"><figure><img src="{im["d"][i % 3]}" alt="{E(n)}" loading="lazy"></figure><div class="st-dish__t"><h3>{E(n)}</h3><p>{E(note)}</p></div></li>'
        for i, (n, note) in enumerate(c['dishes']))
    dots = ''.join(f'<i class="{x}"></i>' for x in ['x', 'f', 'x', '', 'x', ''])
    return f'''
<section class="st-hero" id="top">
  <figure class="st-hero__ph"><img src="{im["hero"]}" alt="" fetchpriority="high"></figure>
  <div class="st-dots" aria-hidden="true">{dots}</div>
  <div class="st-title"><p class="st-title__name">{nm(s, c)}</p><h1 class="st-title__k" aria-label="{E(k)}">{frames}</h1><p class="st-title__en">{E(en)} · {E(s["town"])}</p></div>
  {labels}
</section>
<section class="st-lead"><div class="wrap narrow"><p class="st-catch rv">{mix(c["catch"])}</p><p class="st-lead__t rv" style="--d:.1s">{lines(c["lead"])}</p>{rate(s, ICON["star"])}</div></section>
<section class="st-menu" id="menu"><div class="wrap"><h2 class="st-h rv"><span>お品書き</span></h2><ul class="st-menu__list">{dishes}</ul>{NOTE}</div></section>
<section class="st-scene" id="scene"><div class="wrap"><h2 class="st-h rv"><span>こんなときに</span></h2><ol class="st-scene__list">{scenes_ph(c, im)}</ol></div></section>
<section class="st-about" id="about"><div class="wrap st-about__in"><figure class="st-about__ph reveal-clip"><img src="{im["room"]}" alt="" loading="lazy"></figure><div class="rv"><h2 class="st-h st-h--l"><span>お店のこと</span></h2><p>{lines(c["about"])}</p></div></div></section>'''


# ================================================================ zasshi
def body_zasshi(s, c, im, ICON):
    head = chars(c['catch'])
    note_t = c['scenes'][0][0]
    dishes = ''.join(
        f'<li class="zs-dish rv" style="--d:{i*0.08:.2f}s"><span class="zs-num">{i+1}</span><figure><img src="{im["d"][i % 3]}" alt="{E(n)}" loading="lazy"></figure><h3>{E(n)}</h3><p>{E(note)}</p></li>'
        for i, (n, note) in enumerate(c['dishes']))
    sc = ''.join(f'<li class="rv" style="--d:{i*0.07:.2f}s"><b>{i+1}</b><div><h3>{E(t)}</h3><p>{E(d)}</p></div></li>' for i, (t, d) in enumerate(c['scenes']))
    return f'''
<section class="zs-hero" id="top">
  <figure class="zs-hero__ph"><img src="{im["hero"]}" alt="" fetchpriority="high"></figure>
  <p class="zs-intro">{lines(c["lead"])}</p>
  <div class="zs-anno" aria-hidden="true"><span>{E(note_t)}</span></div>
  <h1 class="zs-head" style="--n:{max(len(x) for x in str(c["catch"]).split(chr(10)))}" aria-label="{E(str(c["catch"]).replace(chr(10), ""))}">{head}</h1>
  <p class="zs-box"><span>{E(c["dishes"][0][0])}</span></p>
  <p class="zs-shop"><b>{nm(s, c)}</b><span>{E(s["town"])}・{kind(s)}</span></p>
</section>
<section class="zs-lead"><div class="wrap zs-lead__in"><p class="zs-lead__q rv">{lines(c["cta"])}</p><div class="rv" style="--d:.1s"><p>{lines(c["about"])}</p>{rate(s, ICON["star"])}</div></div></section>
<section class="zs-menu" id="menu"><div class="wrap"><h2 class="zs-h rv"><span>おすすめ</span><small>Menu</small></h2><ul class="zs-menu__list">{dishes}</ul>{NOTE}</div></section>
<section class="zs-scene" id="scene"><div class="wrap zs-scene__in"><h2 class="zs-h rv"><span>こんな日に</span><small>Scene</small></h2><ol class="zs-scene__list">{scenes_ph(c, im)}</ol></div></section>
<section class="zs-about" id="about"><div class="wrap zs-about__in"><figure class="zs-about__ph rv"><img src="{im["room"]}" alt="" loading="lazy"></figure><div class="rv" style="--d:.1s"><h2 class="zs-h"><span>お店のこと</span><small>About</small></h2><p>{lines(c["about"])}</p></div></div></section>'''


# ================================================================ yami
def body_yami(s, c, im, ICON):
    en = EN.get(c['img'], 'Japanese')
    cl = str(c['catch']).split('\n')
    vc = ''.join(f'<span class="rvc" style="--d:{i*0.25:.2f}s">{E(x)}</span>' for i, x in enumerate(cl))
    links = ''.join(f'<li><a href="#menu"><span>{E(n)}</span>{ICON["arrow"]}</a></li>' for n, _ in c['dishes'])
    dishes = ''.join(
        f'<li class="ym-dish rv" style="--d:{i*0.08:.2f}s"><figure><img src="{im["d"][i % 3]}" alt="{E(n)}" loading="lazy"></figure><h3>{E(n)}</h3><p>{E(note)}</p></li>'
        for i, (n, note) in enumerate(c['dishes']))
    return f'''
<section class="ym-hero" id="top">
  <figure class="ym-hero__ph"><img src="{im["hero"]}" alt="" fetchpriority="high"></figure>
  <div class="ym-logo"><p class="ym-logo__k">{E(s["town"])}の{kind(s)}</p><h1>{nm(s, c)}</h1><p class="ym-logo__en">{E(en)}</p>{rate(s, ICON["star"])}</div>
</section>
<section class="ym-room">
  <figure class="ym-room__ph"><img src="{im["room"]}" alt="" loading="lazy" data-par></figure>
  <div class="ym-room__t"><p class="ym-room__v">{vc}</p><p class="ym-room__s rv" style="--d:.3s">{lines(c["lead"])}</p></div>
</section>
<section class="ym-guide"><div class="wrap ym-guide__in">
  <ul class="ym-links rv">{links}</ul>
  <div class="ym-guide__t rv" style="--d:.1s"><p class="ym-guide__s">{E(c["dishes"][0][1])}</p><h2>{E(c["dishes"][0][0])}</h2><p>{lines(c["about"])}</p></div>
</div></section>
<section class="ym-menu" id="menu"><div class="wrap"><h2 class="ym-h rv"><span>Menu</span>おすすめ</h2><ul class="ym-menu__list">{dishes}</ul>{NOTE}</div></section>
<section class="ym-scene" id="scene"><div class="wrap"><h2 class="ym-h rv"><span>Scene</span>こんな夜に</h2><ol class="ym-scene__list">{scenes_ph(c, im)}</ol></div></section>
<section class="ym-about" id="about"><div class="wrap narrow rv"><h2 class="ym-h"><span>About</span>お店のこと</h2><p>{lines(c["about"])}</p></div></section>'''


# ================================================================ men
def body_men(s, c, im, ICON):
    k = kanji(c)
    k1, k2 = (k[0], k[1:]) if len(k) > 1 else (k, '')
    bowls = ''.join(
        f'<li class="mn-bowl rv" style="--d:{i*0.1:.2f}s"><figure><img src="{im["d"][i % 3]}" alt="{E(n)}" loading="lazy"></figure><h3>{E(n)}</h3><p>{E(note)}</p></li>'
        for i, (n, note) in enumerate(c['dishes']))
    return f'''
<section class="mn-hero" id="top">
  <p class="mn-water" aria-hidden="true">{E(k)}{E(k)}</p>
  <div class="mn-stage">
    <span class="mn-big mn-big--l">{E(k1)}</span>
    <figure class="mn-bowl0"><img src="{im["hero"]}" alt="" fetchpriority="high"></figure>
    <span class="mn-big mn-big--r">{E(k2)}</span>
  </div>
  <div class="mn-title"><h1>{nm(s, c)}</h1><p>{E(s["town"])}・{kind(s)}</p>{rate(s, ICON["star"])}</div>
</section>
<section class="mn-lead"><div class="wrap mn-lead__in">
  <p class="mn-lead__v rv">{lines(c["catch"])}</p>
  <div class="mn-lead__t rv" style="--d:.12s"><p>{lines(c["lead"])}</p></div>
  <figure class="mn-lead__ph reveal-clip"><img src="{im["d"][0]}" alt="" loading="lazy"></figure>
</div></section>
<section class="mn-menu" id="menu"><div class="wrap"><h2 class="mn-h rv">おすすめ</h2><ul class="mn-menu__list">{bowls}</ul>{NOTE}</div></section>
<section class="mn-scene" id="scene"><div class="wrap"><h2 class="mn-h rv">こんなときに</h2><ol class="mn-scene__list">{scenes_ph(c, im)}</ol></div></section>
<section class="mn-about" id="about"><div class="wrap mn-about__in"><figure class="mn-about__ph rv"><img src="{im["room"]}" alt="" loading="lazy"></figure><div class="rv" style="--d:.1s"><h2 class="mn-h mn-h--l">お店のこと</h2><p>{lines(c["about"])}</p></div></div></section>'''


BODY2 = dict(hiraki=body_hiraki, sankaku=body_sankaku, shokutaku=body_shokutaku, zasshi=body_zasshi, yami=body_yami, men=body_men)
