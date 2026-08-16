// MapsLeads サイト案 プレビュー (v0.8.0 · 8 style + 多section HP + 実写真)
// popup 側 から chrome.storage.session に "ml_mockup_rows" で 店舗配列 が入る
// 左 sidebar で 店 選択 → 右 preview で 1ページ サイト案 生成

const els = {
  sidebar: document.getElementById('sidebar'),
  storeList: document.getElementById('storeList'),
  main: document.getElementById('main'),
  emptyState: document.getElementById('emptyState'),
  preview: document.getElementById('preview'),
  btnPrint: document.getElementById('btnPrint'),
  stylePickerGrid: document.getElementById('stylePickerGrid'),
};

let rows = [];
let selectedIdx = -1;
let currentStyle = 'A'; // A-H
let userStyleOverride = false; // true = user manually picked, don't auto-switch on store change

// ==== 業種 別 画像 bank (実 写真 URL) ====
// 素材 出所:
// - salon: skeleton-demos/mapsleads-mockup-demo/images/salon/ (kaguya HP 実素材 24枚)
// - 他 業種: Unsplash CDN (freely hotlinkable、 photo id 固定 で 安定)
const IMAGE_BANK = {
  salon: {
    hero: 'images/salon/header_main_01.jpg',
    about: 'images/salon/interior_01.jpg',
    gallery: [
      'images/salon/interior_02.jpg', 'images/salon/interior_03.jpg', 'images/salon/interior_04.jpg',
      'images/salon/style_01.jpg', 'images/salon/style_02.jpg', 'images/salon/style_03.jpg',
    ],
    staff: [
      { photo: 'images/salon/stylist_osaka.jpg', name: '大坂', role: 'Owner Stylist', bio: '経験 15 年。 顔立ち と 骨格 に 合わせた 骨格補正 カット が 得意。' },
      { photo: 'images/salon/stylist_nomura.jpg', name: '野村', role: 'Color Specialist', bio: 'イルミナ カラー · アディクシー カラー 認定。 白髪 も 透明感 も 相談 OK。' },
    ],
  },
  sushi: {
    hero: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=1600&q=80',
    about: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
      'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&q=80',
      'https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1?w=800&q=80',
      'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=800&q=80',
      'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&q=80',
      'https://images.unsplash.com/photo-1563612116625-3012372fccce?w=800&q=80',
    ],
    staff: [
      { photo: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=600&q=80', name: '大将', role: '大将 · 板前 30年', bio: '築地 の 老舗 で 修行 15 年。 毎朝 の 仕入れ に は 妥協 しない。' },
      { photo: 'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=600&q=80', name: '若旦那', role: '副板前', bio: '会席 · 一品 料理 担当。 季節 感 の ある 器 選び も 手掛ける。' },
    ],
  },
  cafe: {
    hero: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1600&q=80',
    about: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',
      'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=800&q=80',
      'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80',
      'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&q=80',
    ],
    staff: [
      { photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80', name: '店主', role: 'Barista · Owner', bio: '毎朝 手回し ロースター で 焙煎。 豆 に 合わせて 抽出 温度 を 変えます。' },
      { photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80', name: 'ケーキ 担当', role: 'Pâtissier', bio: '季節 の フルーツ を 使った 週替わり ケーキ を 毎日 焼き上げます。' },
    ],
  },
  nail: {
    hero: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1600&q=80',
    about: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1571290274554-6a2eaa771e5f?w=800&q=80',
      'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
      'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80',
      'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80',
      'https://images.unsplash.com/photo-1608228088998-57828365d486?w=800&q=80',
    ],
    staff: [
      { photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80', name: 'オーナー', role: 'Nail Artist', bio: 'JNA 認定講師。 ブライダル · イベント 対応 も 得意。' },
      { photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80', name: 'デザイナー', role: 'Designer', bio: '毎月 100 種 以上 の デザイン サンプル を ご用意 して います。' },
    ],
  },
  gym: {
    hero: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80',
    about: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
      'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',
      'https://images.unsplash.com/photo-1594737625785-a6cbdabd333c?w=800&q=80',
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80',
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',
    ],
    staff: [
      { photo: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=600&q=80', name: 'ヘッドトレーナー', role: 'Certified Personal Trainer', bio: 'NSCA-CPT 認定。 リハビリ 領域 も 対応。' },
      { photo: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=600&q=80', name: '管理栄養士', role: 'Registered Dietitian', bio: '食事 指導 と メンタル コーチ 兼任。 LINE で 毎日 フィードバック。' },
    ],
  },
  japanese: {
    hero: 'https://images.unsplash.com/photo-1580442151529-343f2f6e0e27?w=1600&q=80',
    about: 'https://images.unsplash.com/photo-1583224944844-5b268c057b72?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
      'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&q=80',
      'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=800&q=80',
      'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=800&q=80',
      'https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1?w=800&q=80',
      'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800&q=80',
    ],
    staff: [
      { photo: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=600&q=80', name: '料理長', role: '日本 料理 · 京料理 25 年', bio: '京都 の 料亭 で 修行。 季節 の 器 と 献立 で もてなします。' },
      { photo: 'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=600&q=80', name: '接客 責任者', role: 'ホール マネージャー', bio: '和 の しつらえ と 気配り。 お名前 と 好み を 覚えて お迎え します。' },
    ],
  },
  restaurant: {
    hero: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80',
    about: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80',
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      'https://images.unsplash.com/photo-1547573854-74d2a71d0826?w=800&q=80',
    ],
    staff: [
      { photo: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&q=80', name: 'シェフ', role: 'Executive Chef', bio: 'イタリア · フィレンツェ の 三ツ星 で 5 年 修行。 地元 食材 が 主役。' },
      { photo: 'https://images.unsplash.com/photo-1622505091018-0fd63656b7bc?w=600&q=80', name: 'ソムリエ', role: 'Sommelier', bio: '国産 ワイン と ペアリング を 得意 と します。' },
    ],
  },
};
function pickImageBank(cat) {
  if (!cat) return IMAGE_BANK.salon; // fallback
  if (/寿司|鮨/.test(cat)) return IMAGE_BANK.sushi;
  if (/割烹|料亭|懐石|和食|日本料理/.test(cat)) return IMAGE_BANK.japanese;
  if (/カフェ|喫茶|パン|ベーカリー|cafe/i.test(cat)) return IMAGE_BANK.cafe;
  if (/ネイル|nail/i.test(cat)) return IMAGE_BANK.nail;
  if (/ジム|フィットネス|パーソナル|ヨガ|ピラティス/.test(cat)) return IMAGE_BANK.gym;
  if (/イタリアン|フレンチ|ビストロ|レストラン/.test(cat)) return IMAGE_BANK.restaurant;
  return IMAGE_BANK.salon; // salon がベスト generic (実写真 が 一番豊富)
}

// ==== 業種 → style 自動 選択 ====
function pickStyleForCategory(cat) {
  if (!cat) return 'A';
  const c = cat;
  // 高級 系 salon / エステ → B luxury
  if (/高級|プレミアム|VIP|luxury/i.test(c)) return 'B';
  // 医療 系 → C minimal
  if (/歯科|クリニック|医院|病院|dental|clinic/i.test(c)) return 'C';
  // 和食 / 寿司 / 蕎麦 / 割烹 / 料亭 → E 和
  if (/和食|寿司|鮨|蕎麦|そば|うどん|割烹|料亭|懐石|居酒屋|日本料理/.test(c)) return 'E';
  // ホステル / 旅館 / 民泊 → E 和
  if (/ホステル|旅館|民宿|民泊|温泉|宿/.test(c)) return 'E';
  // 着物 → E
  if (/着物|呉服|振袖/.test(c)) return 'E';
  // ネイル / まつげ → G pastel
  if (/ネイル|まつげ|まつ毛|アイラッシュ|nail|eyelash/i.test(c)) return 'G';
  // エステ (一般) → G pastel (高級 は 上 で B に fall)
  if (/エステ|フェイシャル/.test(c)) return 'G';
  // 美容室 / ヘア → A signature (default) — 高級 なら owner が B に 手動切替
  if (/美容|サロン|ヘア|hair|beauty/i.test(c)) return 'A';
  // カフェ / パン → D warm cream
  if (/カフェ|喫茶|パン|ベーカリー|スイーツ|cafe|bakery/i.test(c)) return 'D';
  // フィットネス / ジム → H photo bold
  if (/ジム|フィットネス|パーソナル|ヨガ|ピラティス|gym|fitness/i.test(c)) return 'H';
  // ラーメン / 大衆 中華 / 焼肉 → H photo bold
  if (/ラーメン|中華|焼肉|定食|食堂|ハンバーガー/.test(c)) return 'H';
  // レストラン / イタリアン / フレンチ (高級) → F editorial
  if (/イタリアン|フレンチ|ビストロ|レストラン/.test(c)) return 'F';
  // その他 → A
  return 'A';
}

// ==== 業種 別 の 想定 サービス辞書 ====
// キーは カテゴリ に 含まれる 部分文字列 (順番 に マッチ、 最初 hit 優先)
const SERVICE_TEMPLATES = [
  {
    match: ['美容', 'サロン', 'ヘア', 'beauty'],
    services: [
      { icon: '✂️', name: 'カット', desc: '骨格 と 髪質 に 合わせた 骨格補正 カット。 スタイリング しやすい 仕上がり。', price: '¥4,400 〜' },
      { icon: '🎨', name: 'カラー', desc: 'イルミナ カラー · アディクシー カラー を 主軸。 白髪 · 透明感 も 相談 OK。', price: '¥6,600 〜' },
      { icon: '💧', name: 'トリートメント', desc: 'oggi otto · aujua など 髪質別 に 選べる ケア メニュー。', price: '¥3,300 〜' },
    ],
  },
  {
    match: ['ネイル', 'nail'],
    services: [
      { icon: '💅', name: 'ワンカラー', desc: 'シンプル な 定番 メニュー。 短い 時間 で 仕上げます。', price: '¥5,500 〜' },
      { icon: '✨', name: 'アート', desc: 'デザイン 込み。 ブライダル · イベント 対応 も 可能。', price: '¥7,700 〜' },
      { icon: '🪞', name: 'フット', desc: '角質 ケア + カラー まで 一気通貫。 夏 前 の 定番 コース。', price: '¥6,600 〜' },
    ],
  },
  {
    match: ['まつげ', 'まつ毛', 'アイ', 'eye'],
    services: [
      { icon: '👁', name: 'まつげ パーマ', desc: '自まつげ を 傷めない 上向き カール。 3-4週間 持続。', price: '¥5,500 〜' },
      { icon: '✨', name: 'まつげ エクステ', desc: 'シングル / ボリューム 両対応。 目元 の 印象 を 自然に 底上げ。', price: '¥6,600 〜' },
      { icon: '💧', name: 'アイブロウ', desc: 'ワックス + トリミング + 色味 相談 込み。', price: '¥3,300 〜' },
    ],
  },
  {
    match: ['エステ', 'マッサージ', 'リラク', 'spa'],
    services: [
      { icon: '💆', name: '全身 リラクゼーション', desc: '60分 / 90分 コース。 疲労 · 肩こり · 腰まわり を 集中 ケア。', price: '¥6,600 〜' },
      { icon: '🌿', name: 'アロマ ボディ', desc: 'オイル トリートメント。 香り は 5種類 から お選び いただけます。', price: '¥8,800 〜' },
      { icon: '✨', name: 'フェイシャル', desc: '毛穴 · くすみ · たるみ の 悩み 別 メニュー。', price: '¥7,700 〜' },
    ],
  },
  {
    match: ['カフェ', 'cafe', '喫茶'],
    services: [
      { icon: '☕', name: '自家焙煎 コーヒー', desc: '毎朝 焙煎 する スペシャルティ。 シングル オリジン 3種類 常備。', price: '¥550 〜' },
      { icon: '🍰', name: '手作り スイーツ', desc: '季節 の フルーツ を 使った 週替わり ケーキ + 定番 焼き菓子。', price: '¥660 〜' },
      { icon: '🥪', name: 'ランチ プレート', desc: '11:30 - 14:00 限定。 スープ · サラダ · メイン + ドリンク セット。', price: '¥1,320 〜' },
    ],
  },
  {
    match: ['ラーメン', '中華', '食堂', 'そば', 'うどん'],
    services: [
      { icon: '🍜', name: '定番 メニュー', desc: '看板 メニュー。 スープ から 麺 まで 店内 仕込み。', price: '¥880 〜' },
      { icon: '🥟', name: 'サイド', desc: '餃子 · 唐揚げ · 半チャーハン 等。 セット で お得。', price: '¥440 〜' },
      { icon: '🍶', name: 'ドリンク', desc: 'ソフト ドリンク から 地酒 · ビール まで。', price: '¥330 〜' },
    ],
  },
  {
    match: ['寿司', '鮨', '割烹', '料亭', '懐石', '和食', '日本料理'],
    services: [
      { icon: '🍣', name: 'おまかせ 握り', desc: '旬 の ネタ を 大将 が 見繕う。 8-12 貫 の コース。', price: '¥5,500 〜' },
      { icon: '🥢', name: '会席 コース', desc: '前菜 · 造り · 焼物 · 揚物 · 椀物 の 一汁三菜 に 甘味 まで。', price: '¥8,800 〜' },
      { icon: '🍶', name: '地酒 · ワイン', desc: '北陸 の 地酒 中心 に 20 銘柄 常備。 料理 に 合わせて ご提案 します。', price: '¥660 〜' },
    ],
  },
  {
    match: ['ホステル', '旅館', '民宿', '民泊', '宿'],
    services: [
      { icon: '🛏', name: '客室 · ドミトリー', desc: '個室 と ドミトリー を 選べる。 全室 wifi · 個別 コンセント。', price: '¥3,300 〜' },
      { icon: '🍚', name: '朝食 · 夕食', desc: '地元 の 食材 を 使った 家庭料理。 朝食 付き · 夕食 別注文 も 可。', price: '朝食 込み' },
      { icon: '♨️', name: '共用 スペース', desc: 'ラウンジ · キッチン · 洗濯機 を 自由 に お使い いただけます。', price: '無料' },
    ],
  },
  {
    match: ['ジム', 'フィットネス', 'パーソナル', 'ヨガ', 'ピラティス'],
    services: [
      { icon: '💪', name: 'パーソナル トレーニング', desc: '目標 と 現状 に 合わせた オーダーメイド の 60 分。 マンツーマン 指導。', price: '¥8,800 〜' },
      { icon: '🏃', name: '月額 通い放題', desc: '自主 トレーニング 用 に ジム 設備 を 使い放題。', price: '¥16,500 / 月' },
      { icon: '🥗', name: '食事 指導', desc: 'LINE で 毎日 の 食事 を 送って 頂き、 管理栄養士 が フィードバック。', price: '¥3,300 / 月' },
    ],
  },
  {
    match: ['イタリアン', 'フレンチ', 'ビストロ', 'レストラン'],
    services: [
      { icon: '🍽', name: 'ディナー コース', desc: '前菜 · パスタ / スープ · メイン · デザート の 4 皿 コース。', price: '¥6,600 〜' },
      { icon: '🍷', name: 'ワイン ペアリング', desc: 'ソムリエ が 各 皿 に 合わせて グラス で 提案。', price: '¥3,300 〜' },
      { icon: '🌿', name: 'ランチ コース', desc: '平日 限定。 前菜 · メイン · コーヒー 付き の 2 皿 コース。', price: '¥2,200 〜' },
    ],
  },
  {
    match: ['歯科', 'デンタル', 'dental'],
    services: [
      { icon: '🦷', name: '一般 歯科', desc: '虫歯 · 歯周病 の 予防 と 治療。 痛み に 配慮 した 麻酔 対応。', price: '相談 の うえ' },
      { icon: '✨', name: 'ホワイトニング', desc: 'オフィス · ホーム 両方 に 対応。 段階 別 プラン あり。', price: '¥16,500 〜' },
      { icon: '🪥', name: '定期 検診', desc: '3-6ヶ月 に 一度 の クリーニング + 口腔 チェック。', price: '¥3,300 〜' },
    ],
  },
];
const DEFAULT_SERVICES = [
  { icon: '⭐', name: '基本 メニュー A', desc: '主力 メニュー の 説明 が ここ に 入ります。 実際 の 内容 に 差し替えて ください。', price: '¥3,300 〜' },
  { icon: '✨', name: '基本 メニュー B', desc: '2 番目 の メニュー。 対象 · 効果 · 所要時間 を 明記 する と 予約 に つながります。', price: '¥5,500 〜' },
  { icon: '🎁', name: 'おすすめ / セット', desc: '初回 限定 プラン や セット 割 を 置く 枠。 「まず これ」 の 導線 に。', price: '¥7,700 〜' },
];

function servicesForCategory(cat) {
  if (!cat) return DEFAULT_SERVICES;
  const lc = cat.toLowerCase();
  for (const t of SERVICE_TEMPLATES) {
    if (t.match.some((k) => cat.includes(k) || lc.includes(k.toLowerCase()))) return t.services;
  }
  return DEFAULT_SERVICES;
}

// ==== 業種 別 の hero コピー ====
function heroCopyForCategory(cat, area) {
  const areaTxt = area || '地域';
  if (!cat) return { eyebrow: 'LOCAL BUSINESS', h1line: `${areaTxt}で、<em>あなたに</em>いちばん近い お店。`, sub: 'アクセス · 営業時間 · メニュー が 一目でわかる。 予約 は お電話 で 承ります。' };
  // 順序 注意: ネイル/まつげ を 美容/サロン より 先 に (「ネイルサロン」 が HAIR SALON に 誤 hit する 防止)
  if (/ネイル/.test(cat)) return { eyebrow: 'NAIL SALON', h1line: `${areaTxt}で、<em>指先まで</em>整える 時間。`, sub: 'デザイン 相談 から 定期 ケア まで。 忙しい 日常 の 中 に、 自分 を いたわる 60 分 を。' };
  if (/まつげ|まつ毛|アイ/.test(cat)) return { eyebrow: 'EYELASH SALON', h1line: `${areaTxt}で、<em>自然に映える</em>目元 に。`, sub: 'あなた の 骨格 と 目 の 形 に 合わせて、 一本 一本 デザイン する まつげ 施術。' };
  if (/美容|サロン|ヘア/.test(cat)) return { eyebrow: 'HAIR SALON', h1line: `${areaTxt}で、<em>あなただけの</em>髪型 を。`, sub: 'マンツーマン カウンセリング と 骨格補正 カットで、 毎日 の セット が 楽 に なる 髪型 を ご提案 します。' };
  if (/エステ|マッサージ|リラク/.test(cat)) return { eyebrow: 'RELAXATION', h1line: `${areaTxt}で、<em>力を抜ける</em>90 分。`, sub: '国家資格 保持 の セラピスト が、 その 日 の 疲れ に 合わせて 施術 を 組み立てます。' };
  if (/カフェ|喫茶|cafe/i.test(cat)) return { eyebrow: 'CAFÉ', h1line: `${areaTxt}で、<em>あの一杯</em>に会いに。`, sub: '自家焙煎 の コーヒー と、 毎日 手作り の スイーツ · ランチ を お楽しみ ください。' };
  if (/寿司|鮨|割烹|料亭|懐石|和食|日本料理/.test(cat)) return { eyebrow: 'JAPANESE CUISINE', h1line: `${areaTxt}で、<em>その日の海</em>と 向き合う。`, sub: '毎朝 市場 に 通う 大将 が、 その 日 に しか 出せない 一皿 を お出し します。 静かな 時間 の 中 で どうぞ。' };
  if (/ホステル|旅館|民宿|民泊|宿/.test(cat)) return { eyebrow: 'STAY', h1line: `${areaTxt}に、<em>もう一つの</em>家 を。`, sub: '個室 と ドミトリー、 共用 ラウンジ と キッチン。 その 街 に 暮らす ように 過ごせる 宿 です。' };
  if (/ジム|フィットネス|パーソナル|ヨガ|ピラティス/.test(cat)) return { eyebrow: 'PERSONAL TRAINING', h1line: `${areaTxt}で、<em>限界 を</em>更新 する。`, sub: '目標 と 現状 を 一緒 に 見て、 60 分 の 型 を 作る。 マンツーマン だから、 続く。' };
  if (/イタリアン|フレンチ|ビストロ|レストラン/.test(cat)) return { eyebrow: 'RESTAURANT', h1line: `${areaTxt}で、<em>特別 な</em>夜 に。`, sub: '季節 の 食材 と ソムリエ が 選ぶ ペアリング。 大切 な 人 と、 記念 の 一日 を。' };
  if (/ラーメン|そば|うどん|中華|食堂/.test(cat)) return { eyebrow: 'RESTAURANT', h1line: `${areaTxt}で、<em>毎日 通える</em>味 を。`, sub: 'スープ から 麺 まで 自家製。 昔ながら の 味 を、 今日 の 空腹 に。' };
  if (/歯科|デンタル/.test(cat)) return { eyebrow: 'DENTAL CLINIC', h1line: `${areaTxt}で、<em>痛くない</em>歯科 を。`, sub: '予防 中心 の 診療 方針。 説明 と 相談 に 時間 を かけ、 納得 の 治療 を 進めます。' };
  return { eyebrow: cat.toUpperCase(), h1line: `${areaTxt}の<em>${cat}</em>。`, sub: '地域 の お客様 に 長く 愛される 店 を 目指しています。 詳細 は お気軽 に お問い合わせ ください。' };
}

// ==== HP 生成 ====
function renderMockHP(row) {
  const name = row.name || '店舗名';
  const cat = row.category || '';
  const area = row.area || '';
  const phone = row.phone || '';
  const address = row.addressFull || '';
  const hours = row.hours || '';
  const rating = row.rating || '';
  const reviewCount = row.reviewCount || '';

  // XSS 対策: heroCopyForCategory の 戻り値 は innerHTML で 挿入 されるので、area/cat を エスケープ済み で 渡す
  const hero = heroCopyForCategory(escapeHtml(cat), escapeHtml(area));
  const services = servicesForCategory(cat);
  const images = pickImageBank(cat);

  const mapsSrc = address
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : '';

  // trust bar の 値: rating / reviewCount / hours / area
  const trust = [
    rating ? { num: rating, lbl: '評価 (Google)' } : { num: '★★★★☆', lbl: '評価' },
    reviewCount ? { num: reviewCount, lbl: '口コミ 件数' } : { num: '—', lbl: '口コミ' },
    { num: cat || '専門店', lbl: '業種' },
    { num: area || '地域密着', lbl: 'エリア' },
  ];

  // News (静的 サンプル · 業種 汎用)
  const news = [
    { date: '2026.08.10', tag: 'お知らせ', title: '公式 サイト を リニューアル しました' },
    { date: '2026.07.28', tag: 'メニュー', title: '夏 の 新メニュー を 追加しました' },
    { date: '2026.07.15', tag: 'お知らせ', title: 'お盆 期間 の 営業 について' },
  ];

  // Testimonials (業種 汎用)
  const testimonials = [
    { rating: 5, text: '接客 が とても 丁寧 で、 相談 に も じっくり 時間 を 取って くださいました。 また 伺います。', author: 'Y.T. 様 (30代 · 女性)' },
    { rating: 5, text: '仕上がり が 想像以上 で 大満足 です。 予約 も 取り やすくて 助かって います。', author: 'K.M. 様 (40代 · 女性)' },
    { rating: 4, text: '初めて でしたが、 スタッフ の 方 の 対応 が 良く、 リラックス できました。', author: 'S.A. 様 (20代 · 男性)' },
  ];

  return `
  <div class="preview-toolbar">
    <div class="dots"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div></div>
    <div class="url">${escapeHtml(name)}.example.com</div>
    <div style="width:80px"></div>
  </div>
  <div class="proposal-badge">PROPOSAL PREVIEW · MapsLeads · Style ${escapeHtml(currentStyle)}</div>
  <div class="mock" data-style="${escapeAttr(currentStyle)}">

    <nav class="nav">
      <div class="nav-brand">${escapeHtml(name)}</div>
      <div class="nav-links">
        <a href="#about">CONCEPT</a>
        <a href="#services">MENU</a>
        <a href="#gallery">GALLERY</a>
        <a href="#staff">STAFF</a>
        <a href="#news">NEWS</a>
        <a href="#access">ACCESS</a>
      </div>
      <button class="nav-cta">${phone ? '電話する' : '予約する'}</button>
    </nav>

    ${(() => {
      // B (luxury dark) と F (editorial dark serif) は 意図的 dark hero、 写真なし で 世界観 確保
      // 他 6 style は 全画面 実写真 hero + overlay
      const isPhotoHero = !['B', 'F'].includes(currentStyle);
      // cafe は 明るい 写真 が 多い ので overlay を 濃く
      const isCafe = /カフェ|cafe/i.test(cat);
      const ov1 = isCafe ? '0.45' : '0.35';
      const ov2 = isCafe ? '0.65' : '0.55';
      const heroClass = isPhotoHero ? 'hero hero-photo' : 'hero';
      const heroStyle = isPhotoHero
        ? `style="background-image: linear-gradient(rgba(0,0,0,${ov1}), rgba(0,0,0,${ov2})), url('${escapeAttr(images.hero)}');"`
        : '';
      return `<section class="${heroClass}" ${heroStyle}>
      <div class="hero-inner">
        <div class="hero-eyebrow">${hero.eyebrow}</div>
        <h1 class="hero-h1">${hero.h1line}</h1>
        <p class="hero-sub">${escapeHtml(hero.sub)}</p>
        <div class="hero-cta-row">
          ${phone ? `<a class="btn-primary" href="tel:${escapeAttr(phone)}">📞 ${escapeHtml(phone)}</a>` : `<a class="btn-primary" href="#contact">お問い合わせ</a>`}
          <a class="btn-ghost" href="#access">アクセス を 見る</a>
        </div>
      </div>
    </section>`;
    })()}

    <div class="trust">
      ${trust.map((t) => `<div><div class="num">${escapeHtml(String(t.num))}</div><div class="lbl">${escapeHtml(t.lbl)}</div></div>`).join('')}
    </div>

    <section class="section about" id="about">
      <div class="section-inner">
        <div class="section-eyebrow">CONCEPT</div>
        <h2 class="section-h2"><em>${escapeHtml(name)}</em>について</h2>
        <p class="section-lead">
          ${escapeHtml(area)}${area ? 'に構える' : ''}${escapeHtml(cat || 'お店')}です。
          お客様 一人ひとり の 悩み や ライフスタイル に 合わせた ご提案 を 大切 に、 地域 の 皆様 と 長く お付き合い できる お店 を 目指して います。
        </p>
        <div class="about-grid">
          <div class="about-photo" style="background-image: url('${escapeAttr(images.about)}');"></div>
          <div class="about-body">
            <h3>大切 に している こと</h3>
            <p>
              初めて の 方 に も、 何度 も 通って くださる 方 に も、 その 日 の 気分 と 悩み に 合わせた 対応 を 心がけて います。 「お店 に 来る」 こと 自体 が 楽しみ に なる、 そんな 時間 を お届け します。
            </p>
            <ul>
              <li>マンツーマン の 丁寧 な カウンセリング</li>
              <li>初めて の 方 も 安心 の 少人数 制</li>
              <li>${cat ? cat + ' 一筋 の 熟練 スタッフ' : '経験 豊富 な スタッフ'} が 対応</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="section services" id="services">
      <div class="section-inner">
        <div class="section-eyebrow">MENU</div>
        <h2 class="section-h2"><em>メニュー</em>のご案内</h2>
        <p class="section-lead">
          代表 的 な メニュー を ご紹介 します。 詳細 · 所要時間 は お電話 で ご確認 ください。
        </p>
        <div class="svc-grid">
          ${services.map((s) => `
            <div class="svc-card">
              <div class="svc-icon">${s.icon}</div>
              <h4>${escapeHtml(s.name)}</h4>
              <p>${escapeHtml(s.desc)}</p>
              <div class="price">${escapeHtml(s.price)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="section gallery" id="gallery">
      <div class="section-inner">
        <div class="section-eyebrow">GALLERY</div>
        <h2 class="section-h2"><em>店内 · 作品</em>の 雰囲気</h2>
        <p class="section-lead">
          店内 · メニュー · スタイル の 一部 を ご紹介 します。
        </p>
        <div class="gallery-grid">
          ${images.gallery.map((src) => `<div class="gallery-item" style="background-image: url('${escapeAttr(src)}');"></div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section staff" id="staff">
      <div class="section-inner">
        <div class="section-eyebrow">STAFF</div>
        <h2 class="section-h2"><em>スタッフ</em>紹介</h2>
        <p class="section-lead">
          お客様 に 寄り添い、 一人ひとり を 大切 に する スタッフ を ご紹介 します。
        </p>
        <div class="staff-grid">
          ${images.staff.map((s) => `
            <div class="staff-card">
              <div class="staff-photo" style="background-image: url('${escapeAttr(s.photo)}');"></div>
              <div class="staff-body">
                <div class="staff-name">${escapeHtml(s.name)}</div>
                <div class="staff-role">${escapeHtml(s.role)}</div>
                <p class="staff-bio">${escapeHtml(s.bio)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="section testimonial" id="voices">
      <div class="section-inner">
        <div class="section-eyebrow">VOICES</div>
        <h2 class="section-h2"><em>お客様</em>の 声</h2>
        <div class="voice-grid">
          ${testimonials.map((v) => `
            <div class="voice-card">
              <div class="voice-stars">${'★'.repeat(v.rating)}${'☆'.repeat(5 - v.rating)}</div>
              <p class="voice-text">${escapeHtml(v.text)}</p>
              <div class="voice-author">${escapeHtml(v.author)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="section news" id="news">
      <div class="section-inner">
        <div class="section-eyebrow">NEWS</div>
        <h2 class="section-h2"><em>お知らせ</em></h2>
        <div class="news-list">
          ${news.map((n) => `
            <div class="news-item">
              <div class="news-date">${escapeHtml(n.date)}</div>
              <div class="news-tag">${escapeHtml(n.tag)}</div>
              <div class="news-title">${escapeHtml(n.title)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section class="section access" id="access">
      <div class="section-inner">
        <div class="section-eyebrow">ACCESS</div>
        <h2 class="section-h2"><em>アクセス</em>と 営業時間</h2>
        <div class="access-grid">
          <div class="access-info">
            <dl>
              ${address ? `<dt>住所</dt><dd>${escapeHtml(address)}</dd>` : ''}
              ${phone ? `<dt>電話</dt><dd><a href="tel:${escapeAttr(phone)}">${escapeHtml(phone)}</a></dd>` : ''}
              ${hours ? `<dt>営業</dt><dd>${escapeHtml(hours)}</dd>` : ''}
              ${cat ? `<dt>業種</dt><dd>${escapeHtml(cat)}</dd>` : ''}
            </dl>
          </div>
          <div class="map-embed">
            ${mapsSrc ? `<iframe src="${escapeAttr(mapsSrc)}" loading="lazy"></iframe>` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-3);font-size:12px;">住所 情報 なし</div>`}
          </div>
        </div>
      </div>
    </section>

    <section class="cta-final" id="contact">
      <div class="cta-final-inner">
        <h2>まずは お電話 で、<br>お気軽 に ご相談 ください</h2>
        <p>予約 · メニュー の 相談 · 初めて の 方 の 質問 も 大歓迎 です。</p>
        ${phone ? `<a class="btn-primary" href="tel:${escapeAttr(phone)}">📞 ${escapeHtml(phone)} に電話する</a>` : `<a class="btn-primary" href="#">お問い合わせ</a>`}
      </div>
    </section>

    <footer class="foot">
      <div class="foot-brand">${escapeHtml(name)}</div>
      ${address ? `<div class="foot-addr">${escapeHtml(address)}</div>` : ''}
      ${phone ? `<div class="foot-addr">TEL: ${escapeHtml(phone)}</div>` : ''}
      <div class="foot-copy">© ${new Date().getFullYear()} ${escapeHtml(name)} — Site proposal generated by MapsLeads</div>
    </footer>

  </div>
  `;
}

// ==== sidebar ====
function renderSidebar() {
  if (!rows.length) {
    els.storeList.innerHTML = '<div style="padding:16px;font-size:12px;color:var(--ink-3);text-align:center;">店舗 データ が 見つかりません。<br>MapsLeads で 収集 → 「サイト案 を 作る」 を 押して ください。</div>';
    els.btnPrint.disabled = true;
    return;
  }
  els.storeList.innerHTML = rows.map((r, i) => `
    <div class="store-item ${i === selectedIdx ? 'active' : ''}" data-idx="${i}">
      <div class="si-name">${escapeHtml(r.name || '(名称 なし)')}</div>
      <div class="si-meta">
        ${r.category ? `<span class="si-cat">${escapeHtml(r.category)}</span>` : ''}
        ${r.rating ? `<span class="si-rating">★ ${escapeHtml(r.rating)}</span>` : ''}
        ${r.area ? `<span>${escapeHtml(r.area)}</span>` : ''}
      </div>
    </div>
  `).join('');
  els.storeList.querySelectorAll('.store-item').forEach((el) => {
    el.addEventListener('click', () => selectStore(parseInt(el.dataset.idx, 10)));
  });
}

function selectStore(idx) {
  if (idx < 0 || idx >= rows.length) return;
  selectedIdx = idx;
  // user が 手動 で style 選ばない 間 は 業種 で 自動選択
  if (!userStyleOverride) {
    currentStyle = pickStyleForCategory(rows[idx].category || '');
    updateStylePickerActive();
  }
  renderSidebar();
  els.emptyState.hidden = true;
  els.preview.hidden = false;
  els.preview.innerHTML = renderMockHP(rows[idx]);
  els.btnPrint.disabled = false;
  els.main.scrollTop = 0;
}

function updateStylePickerActive() {
  if (!els.stylePickerGrid) return;
  els.stylePickerGrid.querySelectorAll('.sp-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.style === currentStyle);
  });
}

function bindStylePicker() {
  if (!els.stylePickerGrid) return;
  els.stylePickerGrid.querySelectorAll('.sp-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      currentStyle = chip.dataset.style;
      userStyleOverride = true;
      updateStylePickerActive();
      if (selectedIdx >= 0) {
        els.preview.innerHTML = renderMockHP(rows[selectedIdx]);
      }
    });
  });
}

// ==== utils ====
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s) {
  return escapeHtml(s);
}

// ==== print ====
els.btnPrint.addEventListener('click', () => {
  if (selectedIdx < 0) return;
  window.print();
});

// ==== init (standalone demo mode · chrome API 排除、window.SAMPLE_ROWS 使用) ====
(function () {
  if (Array.isArray(window.SAMPLE_ROWS)) rows = window.SAMPLE_ROWS;
  bindStylePicker();
  updateStylePickerActive();
  renderSidebar();
  if (rows.length > 0) selectStore(0);
})();
