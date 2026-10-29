"""ひより型（このプロジェクトの最初の見本「和食ひより」の作り）で試作HPを作る。

出力は p/<ID>/b/index.html（A＝ひらき型は p/<ID>/index.html のまま）。
元のページ washoku-hiyori/index.html をそのまま型にして、店ごとの言葉と写真だけ差し替える。
共通の素材（料理人・女将・鯛やアジの絵・自転車・CSS・JS）は p/_assets/hy/ にまとめてある。

使い方:  python3 p/_gen/hiyori.py "まンまや おちょkitchen" 善甚
         python3 p/_gen/hiyori.py            全店
"""
import os, re, sys, html
sys.path.insert(0, os.path.dirname(__file__))
import build
from poster_shops import SHOPS
from pmap import all_shops, pid
from hiraki import name_parts, KIND, CUT, WEST

E = lambda s: html.escape(str(s or ''), quote=True)
ROOT = build.ROOT
SRC = os.path.join(ROOT, 'washoku-hiyori', 'index.html')
A = '../../_assets/'
HY = A + 'hy/'
FISHY = {'washoku', 'sea', 'sushi', 'soba', 'morning', 'obanzai', 'kaiseki', 'tempura', 'oden', 'nabe', 'izakaya', 'robata'}


def lines_v(t, width=13):
    """縦書きの本文用に、句読点で区切って短い行にする"""
    out = []
    for part in re.split(r'(?<=[。、！？])', t.replace('\n', '')):
        part = part.strip()
        if not part:
            continue
        while len(part) > width:
            out.append(part[:width]); part = part[width:]
        if out and len(out[-1]) + len(part) <= width and not out[-1].endswith('。'):
            out[-1] += part
        else:
            out.append(part)
    return '<br>'.join(E(x) for x in out[:8])


def genre(img, s):
    k = str(s['kind']).split('、')[0]
    for w in ('定食', '居酒屋', '寿司', 'そば', '焼肉', '焼き鳥', 'とんかつ', '中華', 'カフェ', 'おでん', 'お好み焼き', '洋食', 'バー', '和食'):
        if w in k:
            return w
    return KIND.get(img, '料理')


def page(name, c, s, d, p):
    src = open(SRC, encoding='utf-8').read()
    img = c['img']
    lib = build.IMG[img]
    fix = lambda u: u.replace('../_assets/', A)
    d0i, d1i, d2i = (fix(x) for x in lib['d'])
    main, sub = name_parts(name, d, c, s)
    town = s.get('town') or '福井市'
    kind = str(s['kind']).split('、')[0]
    g = genre(img, s)
    tel = s.get('tel') or ''
    tel_n = re.sub(r'\D', '', tel)
    mapu = E(s['map'])
    ig = s.get('sns') if s.get('sns') and 'instagram' in s['sns'] else ''
    dishes, sc = c['dishes'], c['scenes']
    west = img in WEST
    cut = CUT.get(img, CUT['izakaya'])[0]
    ill = HY + 'tai.jpg' if img in FISHY else A + f'h/{cut}.webp'
    room = A + ('h/hk_bar.webp' if west else 'h/hk_counter.webp')
    table = A + ('h/hk_bar.webp' if west else 'h/hk_table.webp')
    body = lines_v(c['lead'] + c['about'])
    t = src
    R = [
        ('<html lang="ja">', '<html lang="ja">\n<!-- poster: hiyori.py で作るページ（ひより型）。build.py で上書きしない -->'),
        ('<title>和食 ひより｜〇〇市の定食・地魚料理のお店</title>', f'<title>{E(s["name"])}｜福井市{E(town)}の{E(kind)}（試作ページ）</title>'),
        ('〇〇市の和食 ひより。市場で選んだ地魚と毎朝のだしでつくる日替わり御膳、海鮮丼、お弁当・お持ち帰り。', f'{E(s["name"])}（福井市{E(town)}）のホームページ試作イメージです。'),
        ('href="assets/style.css?v=4"', f'href="{HY}style.css?v=3"'), ('src="assets/main.js?v=3"', f'src="{HY}main.js?v=3"'),
        ('<b>2026.10.20</b>秋のおまかせコース、はじめました', '<b>2026.10.29</b>ホームページ（試作）をつくりました'),
        ('<b>2026.10.05</b>ご宴会のご予約を受け付けています', f'<b>2026.10.20</b>{E(dishes[0][0])}、ご用意しています'),
        ('<b>2026.09.28</b>10月の定休日のお知らせ', f'<b>2026.10.05</b>{E(sc[2][0])}のご相談も承ります'),
        ('<time>2026.10.20</time><span>秋のおまかせコース、はじめました</span>', '<time>2026.10.29</time><span>ホームページ（試作）をつくりました</span>'),
        ('<time>2026.10.05</time><span>ご宴会のご予約を受け付けています</span>', f'<time>2026.10.20</time><span>{E(dishes[0][0])}、ご用意しています</span>'),
        ('<time>2026.09.28</time><span>10月の定休日のお知らせ</span>', f'<time>2026.10.05</time><span>{E(sc[2][0])}のご相談も承ります</span>'),
        ('aria-label="和食 ひより トップへ"', f'aria-label="{E(s["name"])} トップへ"'),
        ('<span class="logo__sub">旬の地魚</span>', f'<span class="logo__sub">{E(town)}の{E(g)}</span>'),
        ('<span class="logo__main">和食ひより</span>', f'<span class="logo__main">{E(main)}</span>'),
        ('<small>LINEで受付中</small>', '<small>お電話で受付中</small>' if tel else '<small>地図はこちら</small>'),
        ('<span class="vline rv">定食は定食でも</span>', f'<span class="vline rv">{E(g)}は{E(g)}でも</span>'),
        ('<span class="vline rv" style="--d:.35s">ひよりの定食。</span>', f'<span class="vline rv" style="--d:.35s">{E(main)}の{E(g)}。</span>'),
        ('<span class="vline vline--pale rv" style="--d:.7s">地魚と郷土の味。</span>', f'<span class="vline vline--pale rv" style="--d:.7s">{E(c["catch"].split(chr(10))[0].rstrip("、。"))}</span>'),
        ('src="img/tai.jpg" alt="鯛の塩焼きのイラスト"', f'src="{ill}" alt="{E(dishes[0][0])}"'),
        ('毎朝のだしと、市場で選んだ地魚。<br>食べたことはありますか？<br>なつかしい家庭の味を<br>覚えていますか？<br>ひよりでは<br>日替わり御膳や海鮮丼など<br>季節の料理をそろえています。<br>料理人が心をこめて仕上げます。<br>家族で囲める、まちの食堂です。<br>今日もお待ちしています。', body + '<br>今日もお待ちしています。'),
        ('旬の地魚と郷土料理のお店', f'{E(town)}の{E(g)}のお店'), ('定食は定食でも、ひよりの定食', f'{E(g)}は{E(g)}でも、{E(main)}の{E(g)}'),
        ('<span>ひより</span>', f'<span>{E(main)}</span>'),
        ('<p class="en-v en-v--w">Take Out</p><h2><span>ひよりの味を</span><span>ご家庭でも。</span></h2>', f'<p class="en-v en-v--w">Recommend</p><h2><span>{E(main)}の</span><span>おすすめ。</span></h2>'),
        ('毎朝仕込むお弁当とお惣菜。ご家族の晩ごはんや集まりの席にもどうぞ。前日までのご予約で、人数分ご用意します。', f'{E(dishes[0][0])}は、{E(dishes[0][1])}。{E(dishes[1][0])}も、{E(dishes[1][1])}。'),
        ('<a href="#reserve" class="obtn obtn--w rv" style="--d:.3s">お品書きを見る <i>＞</i></a>', '<a href="#reserve" class="obtn obtn--w rv" style="--d:.3s">ご予約・お問い合わせ <i>＞</i></a>'),
        ('お持ち帰りのご案内 <i>＞</i>', 'お品書きを見る <i>＞</i>'),
        ('<p class="en-v en-v--w">Lunch</p><h2><span>毎日かわる</span><span>ひよりの一膳。</span></h2>', f'<p class="en-v en-v--w">Scene</p><h2><span>{E(sc[0][0])}も</span><span>{E(sc[2][0])}も。</span></h2>'),
        ('市場で選んだ地魚と季節の野菜。主菜に小鉢と味噌汁がついた日替わり御膳を、手ごろな価格でご用意しています。', f'{E(sc[0][1])}。{E(sc[1][0])}は、{E(sc[1][1])}。{E(sc[2][1])}。'),
        ('<h2><span>女将の</span><span>ひより日記</span></h2>', f'<h2><span>お店の</span><span>{E(main)}日記</span></h2>'),
        ('「看板の海鮮丼」について', f'「{E(dishes[0][0])}」について'), ('［特別企画］店主対談：ひよりの流儀', f'{E(dishes[1][0])}ができるまで'),
        ('からあげの日、はじめます', f'{E(dishes[2][0])}のこと'), ('お弁当のご注文が増えています', f'{E(sc[2][0])}のご案内'), ('仕込みの朝の風景', '仕込みの風景'),
        ('焼き魚定食が人気です', f'{E(dishes[0][0])}が人気です'), ('お祝いの鯛、ご予約受付中', '季節のおすすめが入りました'), ('運動会のお弁当承ります', f'{E(sc[1][0])}も大歓迎です'),
        ('ひよりとは', f'{E(main)}とは'), ('女将のひより日記', f'{E(main)}日記'), ('女将の日記', f'{E(main)}日記'),
        ('<small>Take Out</small>お持ち帰り', '<small>Recommend</small>おすすめ'), ('<small>Lunch</small>日替わり御膳', '<small>Scene</small>こんなときに'),
        ('<li><a href="#takeout">お持ち帰り</a></li><li><a href="#lunch">お品書き</a></li>', '<li><a href="#takeout">おすすめ</a></li><li><a href="#lunch">こんなときに</a></li>'),
        ('href="https://www.google.com/maps"', f'href="{mapu}"'),
        ('〒000-0000<br>〇〇県〇〇市〇〇町1-2-3', E(s['addr']).replace(' ', '<br>', 1)),
        ('〇〇線「〇〇駅」より徒歩3分', '〔要確認〕'), ('11:30〜14:00 / 17:00〜22:00<br>※ラストオーダーは閉店30分前', '〔要確認〕'),
        ('<dd class="chk">水曜日</dd>', '<dd class="chk">〔要確認〕</dd>'), ('<dd class="chk">5台</dd>', '<dd class="chk">〔要確認〕</dd>'),
        ('<a href="#reserve" class="obtn obtn--line">LINEで予約する <i>＞</i></a>',
         f'<a href="{E(ig)}" target="_blank" rel="noopener" class="obtn obtn--line">Instagramを見る <i>＞</i></a>' if ig else f'<a href="{mapu}" target="_blank" rel="noopener" class="obtn obtn--line">Googleマップで見る <i>＞</i></a>'),
        ('<p class="ft__logo">和食ひより</p>', f'<p class="ft__logo">{E(main)}</p>'),
        ('© 2026 Washoku Hiyori', f'© {E(s["name"])}　このページは試作です／制作 スケルトン株式会社'),
        ('<a href="#reserve">LINEで予約</a>', f'<a href="{E(ig)}" target="_blank" rel="noopener">Instagram</a>' if ig else f'<a href="{mapu}" target="_blank" rel="noopener">地図を見る</a>'),
        ('alt="カウンターに立つ店主と料理人"', 'alt="お店の様子"'),
    ]
    for a, b in R:
        if a not in t:
            print('  型に無い:', a[:30])
        t = t.replace(a, b)
    t = re.sub(r'<script type="application/ld\+json">.*?</script>\s*', '', t, flags=re.S)
    # 電話番号
    if tel:
        t = t.replace('000-000-0000', E(tel)).replace('tel:0000000000', 'tel:' + tel_n)
    else:
        t = re.sub(r'<a href="tel:0000000000" class="hd__tel">.*?</a>', '', t, flags=re.S)
        t = t.replace('<a href="tel:0000000000" class="gnav__tel">000-000-0000</a>', '')
        t = t.replace('<a href="tel:0000000000" class="reserve__tel chk">000-000-0000</a>', f'<a href="{mapu}" class="reserve__tel chk" target="_blank" rel="noopener" style="font-size:.6em">お店の場所</a>')
        t = t.replace('<a href="tel:0000000000">電話する</a>', f'<a href="{mapu}" target="_blank" rel="noopener">地図</a>')
    # 写真
    photos = {'img/hero.jpg': A + f'g/cv_{p}.webp', 'img/bento.jpg': d1i, 'img/karaage.jpg': d2i, 'img/don.jpg': d0i,
              'img/kitchen.jpg': room, 'img/counter.jpg': table}
    for a, b in photos.items():
        t = t.replace(f'src="{a}"', f'src="{b}"')
    t = re.sub(r'src="img/([a-z\-]+\.jpg)"', lambda m: f'src="{HY}{m.group(1)}"', t)
    t = re.sub(r'alt="[^"]*(?:鯖|海鮮丼|お弁当|唐揚げ|焼き魚)[^"]*"', 'alt=""', t)
    t = t.replace('loading="lazy"', 'loading="eager"')
    left = [w for w in ('ひより', '〇〇', 'Hiyori', '000-000') if w in t.split('-->', 1)[1]]
    if left:
        print('  残り:', name, left)
    return t


def main(only):
    A_ = all_shops()
    T = build.load_targets()
    n = 0
    for name, d in SHOPS.items():
        if only and name not in only:
            continue
        c = A_[name]
        s = T.get(c['place'])
        if not s:
            continue
        p = pid(c['place'])
        os.makedirs(os.path.join(ROOT, 'p', p, 'b'), exist_ok=True)
        open(os.path.join(ROOT, 'p', p, 'b', 'index.html'), 'w', encoding='utf-8').write(page(name, c, s, d, p))
        n += 1
    print(n, '店つくりました（ひより型 /b/）')


if __name__ == '__main__':
    main(sys.argv[1:])
