"""ポスター型の試作HP（雑誌の表紙＋特集の組み方）を、手作りした3店のページを型にして全店分つくる。

  mincho … 炭のえん（s69781bbe）型：大きな明朝の1文字＋縦書きのキャッチ（参考：焼鳥ひらき）
  soba   … そば処 越前屋（s2290a13f）型：極太の縦書き店名＋肩書き＋読みがな（参考：そば処 東家）
  chuka  … 中華料理 ISSEI（s2cd0badb）型：中央に極太の店名、両脇に英字（参考：中華そば七八）

使い方:  python3 p/_gen/poster.py         （poster_shops.SHOPS の全店）
         python3 p/_gen/poster.py 善甚 よしな（一部だけ）
表紙写真は p/_assets/g/cv_<ID>.webp（店ごとに1枚）。
"""
import os, re, sys, html
sys.path.insert(0, os.path.dirname(__file__))
import build, worlds2
from poster_shops import SHOPS
from pmap import all_shops, pid

E = lambda s: html.escape(str(s or ''), quote=True)
P = os.path.join(build.ROOT, 'p')
TPL = {'mincho': 's69781bbe', 'soba': 's2290a13f', 'chuka': 's2cd0badb'}
KANA = re.compile(r'[ぁ-ゖゝゞー、。，．・！？「」―…]')


def tpl_head(v):
    src = open(os.path.join(P, TPL[v], 'index.html'), encoding='utf-8').read()
    links = re.findall(r'<link [^>]*fonts\.googleapis\.com/css2[^>]*>', src)
    style = re.search(r'<style>(.*?)</style>', src, re.S).group(1)
    return links, style


def dark(hexc, k=.72):
    h = hexc.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    r, g, b = (int(x * (1 - k) + 18 * k) for x in (r, g, b))
    return f'#{r:02X}{g:02X}{b:02X}'


EXTRA = '''
/* --- 全店共通の追加（poster.py） --- */
.tel{font-family:var(--f-num);font-size:22px;letter-spacing:.06em;text-decoration:none}
.btn--line,.btn--ig{background:transparent!important;color:var(--ink)!important;border:1.5px solid var(--ink)}
@media (max-width:820px){.spbar{display:grid;grid-template-columns:1fr}.spbar.sp2{grid-template-columns:1fr 1fr}.spbar a+a{border-left:1px solid rgba(255,255,255,.2)}}
.tz__main{font-size:min(clamp(96px,10vw,156px),var(--tzmax,999px))!important}
@media (max-width:820px){.tz__main{font-size:min(84px,var(--tzsp,999px))!important}}
.c78__logo{font-size:min(clamp(64px,8.6vw,132px),var(--lgmax,999px))!important;white-space:nowrap}
@media (max-width:820px){.c78__logo{font-size:min(64px,var(--lgsp,999px))!important}}
.cover__sumi:not(.en){font-size:calc(clamp(190px,26vw,380px)*var(--sc,1))!important}
.cover__sumi:not(.en) small{font-size:var(--sm,.3em)!important}
@media (max-width:820px){.cover__sumi:not(.en){font-size:calc(132px*var(--sc,1))!important}}
.cover__sumi.en{writing-mode:horizontal-tb;font-family:"Instrument Serif",serif;font-weight:400;font-size:clamp(84px,10.5vw,164px);line-height:.9;letter-spacing:-.01em;margin:0;align-self:flex-start;clip-path:none;animation:pop 1s var(--ease) .15s both;max-width:6em}
.cover__sumi.en small{display:block;font-size:.42em;letter-spacing:.02em;font-style:italic;margin-top:.12em;color:var(--shu)}
@keyframes pop{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.cover__left.en{flex-direction:column;justify-content:flex-start;gap:24px}
.cover__left.en .cover__copy{writing-mode:horizontal-tb;padding-top:0;white-space:normal}
@media (max-width:820px){.cover__sumi:not(.en){font-size:calc(clamp(190px,26vw,380px)*var(--sc,1))!important}
.cover__sumi:not(.en) small{font-size:var(--sm,.3em)!important}
@media (max-width:820px){.cover__sumi:not(.en){font-size:calc(132px*var(--sc,1))!important}}
.cover__sumi.en{font-size:68px}}
'''


def stars(r):
    n = int(float(r) + .5)
    return '★' * n + '☆' * (5 - n)


def copy_spans(t):
    out, i = [], 0
    for ln in t.split('\n'):
        row = []
        for ch in ln:
            k = ' class="k"' if KANA.match(ch) else ''
            row.append(f'<span{k} style="--i:{i}">{E(ch)}</span>')
            i += 1
        out.append(''.join(row))
    return '<br>'.join(out)


def rate_box(s):
    if not s.get('rating') or (s.get('reviews') or 0) < 3:
        return ''
    return f'<p class="cover__rate"><b>{float(s["rating"]):.1f}</b><span><i>{stars(s["rating"])}</i><br>Googleの口コミ {s["reviews"]}件</span></p>'


def cover(v, s, c, d, pidv):
    img = f'../_assets/g/cv_{pidv}.webp'
    alt = E(c['dishes'][0][0])
    rate = rate_box(s)
    lead = '<br>'.join(E(x) for x in c['lead'].split('\n'))
    if v == 'chuka':
        logo, el, er, pill, sl, sr = d['name']
        n = len(logo.replace(' ', ''))
        st = f' style="--lgmax:{int(780 / max(n, 1))}px;--lgsp:{int(330 / max(n, 1))}px"' if n > 4 else ''
        pills = ''.join(f'<span>{E(ch)}</span>' for ch in pill)
        return f'''<section class="c78" id="top">
  <div class="c78__head">
    <p class="c78__en">{E(el)}</p>
    <h1 class="c78__logo" aria-label="{E(s["name"])}"{st}>{E(logo)}</h1>
    <p class="c78__en">{E(er)}</p>
  </div>
  <p class="c78__pill">{pills}</p>
  <div class="c78__stage">
    <p class="c78__side c78__side--l" aria-hidden="true">{E(sl)}</p>
    <figure class="c78__ph"><img src="{img}" alt="{alt}" fetchpriority="high">
      {rate}</figure>
    <p class="c78__side c78__side--r" aria-hidden="true">{E(sr)}</p>
  </div>
  <h2 class="c78__catch">{'<br>'.join(E(x) for x in c['catch'].split(chr(10)))}</h2>
  <p class="c78__lead">{lead}</p>
</section>'''
    mast = d.get('mast') or ('Fukui', build.E(s['kind']).split('、')[0], '')
    m = ''.join(f'<span>{E(x)}</span>' for x in mast)
    en = ''
    if v == 'soba':
        main, sub, ruby = d['name']
        n = len(main)
        st = f' style="--tzmax:{int(560 / n)}px;--tzsp:{int(300 / n)}px"' if n > 3 else ''
        h1 = (f'<h1 class="tz" aria-label="{E(s["name"])}"><span class="tz__main"{st}>{E(main)}</span>'
              f'<span class="tz__sub">{E(sub)}</span>' + (f'<span class="tz__ruby">{E(ruby)}</span>' if ruby and ruby != main else '') + '</h1>')
    else:
        a, b = d['name']
        if re.match(r'[A-Za-z]', a):
            en = ' en'
            h1 = f'<h1 class="cover__sumi en" aria-label="{E(s["name"])}">{E(a)}' + (f'<small>{E(b.strip())}</small>' if b.strip() else '') + '</h1>'
        else:
            na, nb = len(a), len(b.replace(' ', ''))
            sc = 1 if na == 1 else round(min(1, 1.3 / na), 3)
            em = .3 if nb <= 3 else round(max(.15, .95 / nb), 3)
            st = f' style="--sc:{sc};--sm:{em}em"'
            h1 = f'<h1 class="cover__sumi" aria-label="{E(s["name"])}"{st}>{E(a)}<small>{E(b)}</small></h1>'
    return f'''<section class="cover" id="top">
  <div class="cover__mast">{m}</div>
  <div class="cover__left{en}">
    {h1}
    <h2 class="cover__copy" aria-label="{E(c["catch"].replace(chr(10), ""))}">{copy_spans(c["catch"])}</h2>
    <p class="cover__kind">{E(mast[1])}</p>
  </div>
  <figure class="cover__ph"><img src="{img}" alt="{alt}" fetchpriority="high">
    {rate}
    <p class="anno">{E(d["anno"])}</p>
  </figure>
  <div class="cover__foot"><p>{lead}</p></div>
</section>'''


def page(name, c, s, d, pidv):
    v = d['v']
    links, style = tpl_head(v)
    shu, kin = d['c']
    style = re.sub(r'--shu:#[0-9A-Fa-f]{6};--kin:#[0-9A-Fa-f]{6};', f'--shu:{shu};--kin:{kin};', style, count=1)
    dk = dark(shu)
    style = style.replace('%231C2733', '%23' + dk[1:])
    style += f'\n.menu{{background:{dk}!important}}\n' + EXTRA
    if v == 'mincho':
        links = links + ['<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">']

    base = build.IMG[c['img']]
    im = worlds2.imgs('poster', c['img'], base)
    feat_img = base['d'][0]
    plate_img = base['d'][1] if base['d'][1] != feat_img else base['hero']
    end_img = next((x for x in base['d'][1:] + [base['room']] if x not in (feat_img, plate_img)), base['room'])
    im2 = dict(im, hero=plate_img, sub=feat_img, d=[feat_img, plate_img, end_img])
    pics = worlds2.scene_pics(c, im2)

    short = c.get('short') or s['name']
    mapu = E(s['map'])
    tel = s.get('tel')
    big = d['big']
    fh = ''.join(f'<span>{x}</span>' for x in (re.sub(r'([ぁ-ゖ、。！？]+)', r'<i>\1</i>', E(t)) for t in d['fh']))
    body = (c['lead'] + c['about']).replace('\n', '')
    dishes = ''.join(f'<li><b>{i+1}</b><div><h3>{E(a)}</h3><p>{E(b)}。</p></div></li>' for i, (a, b) in enumerate(c['dishes']))
    scenes = ''.join(
        f'<li class="rv"{"" if i == 0 else f" style=\"--d:.{i}s\""}><figure><img src="{pics[i]}" alt="" loading="lazy"></figure><h3><b>0{i+1}</b>{E(t)}</h3><p>{E(dd)}。</p></li>'
        for i, (t, dd) in enumerate(c['scenes']))
    ig = s.get('sns') if s.get('sns') and 'instagram' in s['sns'] else ''
    btns = ''
    if tel:
        btns += f'<a class="btn" href="tel:{E(tel)}">電話する</a>'
    if ig:
        btns += f'<a class="btn btn--ig" href="{E(ig)}" target="_blank" rel="noopener">Instagram</a>'
    btns += f'<a class="btn{" btn--line" if tel else ""}" href="{mapu}" target="_blank" rel="noopener">Googleマップで開く</a>'
    teldd = f'<a class="tel" href="tel:{E(tel)}">{E(tel)}</a>' if tel else '〔要確認〕'
    endsmall = (d.get('mast') or ('', '', d['name'][2] if v == 'chuka' else ''))[2]
    if v == 'chuka':
        endsmall = d['name'][2] if re.match(r'[A-Za-z]', d['name'][2]) and 'Fukui' not in d['name'][2] else d['name'][1]
    spbar = (f'<div class="spbar sp2"><a href="tel:{E(tel)}">電話する</a><a href="{mapu}" target="_blank" rel="noopener">お店の場所を見る</a></div>' if tel
             else f'<div class="spbar"><a href="{mapu}" target="_blank" rel="noopener">お店の場所を見る</a></div>')
    kindtxt = E(str(s['kind']).split('、')[0])

    return f'''<!doctype html>
<!-- poster: poster.py で作るページ。build.py で上書きしない（custom 扱い） -->
<html lang="ja"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>{E(s["name"])}｜{E(s.get("town") or "福井市")}の{kindtxt}（試作ページ）</title>
<meta name="description" content="{E(s["name"])}（福井市{E(s.get("town") or "")}）のホームページ試作イメージです。">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{chr(10).join(links)}
<style>{style}</style>
</head>
<body>
<p class="proto"><b>{E(s["name"])}様</b>の試作ページ｜写真・メニューはイメージです</p>

<header class="hd">
  <a class="hd__logo" href="#top">{E(short)}</a>
  <nav class="hd__nav"><a href="#feature">{E(big)}のこと</a><a href="#menu">品書き</a><a href="#scene">こんなときに</a><a href="#data">お店の場所</a></nav>
  <a class="hd__map" href="{mapu}" target="_blank" rel="noopener">地図を見る</a>
</header>

<main>
{cover(v, s, c, d, pidv)}

<section class="sec" id="feature">
  <div class="feat">
    <div>
      <p class="kicker rv">Feature</p>
      <h2 class="feat__h rv" style="--d:.08s">{fh}</h2>
      <div class="feat__body rv" style="--d:.16s"><p>{E(body)}</p></div>
      <p class="feat__quote rv" style="--d:.24s">「{E(d["q"]).replace("、", "、<br>", 1)}」<small>── {E(s["name"])}</small></p>
    </div>
    <div class="feat__ph rv" style="--d:.12s">
      <span class="big" aria-hidden="true">{E(big)}</span>
      <figure><img src="{feat_img}" alt="{E(c["dishes"][0][0])}" loading="lazy"></figure>
      <p class="cap"><b>01</b>{E(c["dishes"][0][0])}。{E(c["dishes"][0][1])}。（写真はイメージです）</p>
    </div>
  </div>
</section>

<section class="sec menu" id="menu">
  <div class="menu__in">
    <div class="plate rv" id="plate">
      <img src="{plate_img}" alt="{E(c["dishes"][1][0])}" loading="lazy">
    </div>
    <div class="rv" style="--d:.12s">
      <p class="kicker">Menu</p>
      <h2 class="menu__h">品書き</h2>
      <ol class="list">{dishes}</ol>
      <p class="note">※ 写真と内容はイメージです。実際のお品書きに差し替えます。</p>
    </div>
  </div>
</section>

<section class="sec" id="scene">
  <div class="scenes">
    <p class="kicker rv">Scene</p>
    <h2 class="scenes__h rv">こんなときに、どうぞ。</h2>
    <ol class="scenes__list">{scenes}</ol>
  </div>
</section>

<section class="sec" id="data" style="padding-top:20px">
  <div class="data">
    <div class="rv"><p class="data__name">{E(short)}</p><p class="data__kind">{E(s["name"])} ／ {kindtxt}</p></div>
    <div class="rv" style="--d:.1s">
      <dl>
        <dt>Address</dt><dd>{E(s["addr"])}</dd>
        <dt>Tel</dt><dd{"" if tel else ' class="tbd"'}>{teldd}</dd>
        <dt>Open</dt><dd class="tbd">〔要確認〕</dd>
        <dt>Closed</dt><dd class="tbd">〔要確認〕</dd>
      </dl>
      <div class="btns">{btns}</div>
    </div>
  </div>
</section>

<section class="end">
  <img src="{end_img}" alt="" loading="lazy">
  <p class="end__t rv">{"<br>".join(E(x) for x in c["cta"].split(chr(10)))}<small>{E(endsmall)}</small></p>
</section>
</main>
<footer class="ft">このページは試作です／制作 スケルトン株式会社</footer>
{spbar}
<script>
(() => {{
  if (window.self !== window.top) document.documentElement.classList.add('still');
  const els = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window) || document.documentElement.classList.contains('still') || matchMedia('(prefers-reduced-motion: reduce)').matches) {{ els.forEach(e => e.classList.add('in')); return; }}
  const io = new IntersectionObserver(en => en.forEach(x => {{ if (x.isIntersecting) {{ x.target.classList.add('in'); io.unobserve(x.target); }} }}), {{ rootMargin: '0px 0px -12% 0px' }});
  els.forEach(e => io.observe(e));
}})();
</script>
</body></html>
'''


def main(only):
    A = all_shops()
    T = build.load_targets()
    n = 0
    for name, d in SHOPS.items():
        if only and name not in only:
            continue
        c = A[name]
        s = T.get(c['place'])
        if not s:
            print('対象リストに無い:', name); continue
        p = pid(c['place'])
        if not os.path.exists(os.path.join(P, '_assets', 'g', f'cv_{p}.webp')):
            print('表紙写真が無い:', name, p); continue
        os.makedirs(os.path.join(P, p), exist_ok=True)
        open(os.path.join(P, p, 'index.html'), 'w', encoding='utf-8').write(page(name, c, s, d, p))
        n += 1
    print(n, '店つくりました')


if __name__ == '__main__':
    main(sys.argv[1:])
