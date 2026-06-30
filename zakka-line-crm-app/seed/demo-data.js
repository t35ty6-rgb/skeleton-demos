/**
 * デモテナント 初期データ投入
 *
 * 使い方: admin/customer 画面で「デモデータを投入」ボタン押下、または初回起動時に自動投入。
 */

const today = () => new Date().toISOString();
const dayOffset = (days) => {
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString();
};
const dateOffset = (days) => dayOffset(days).slice(0, 10);

export const DEMO_TENANT_ID = 'zakka-demo';

export const DEMO_SETTINGS = {
  tenantName: 'のうと / 衣と暮らしの店',
  legalName: '',
  taxRegistrationNumber: '',
  address: '福井県',
  phone: '',
  ownerEmail: '',
  point: {
    yenPerPoint: 100,
    pointPerYen: 1,
    redeemMinPoints: 100,
    bonusOnBirthMonth: 2.0,
    expireDays: 365,
  },
  line: {
    channelId: '',
    channelSecret: '',
    channelAccessToken: '',
    liffId: '',
  },
  categories: [
    { id: 'ifuku',     label: '服' },
    { id: 'accessory', label: '装身具' },
    { id: 'bag',       label: '鞄' },
    { id: 'utsuwa',    label: '器' },
    { id: 'kurashi',   label: '暮らし道具' },
    { id: 'nuno',      label: '布' },
  ],
  goals: {
    daily:   30000,
    weekly:  200000,
    monthly: 800000,
  },
  onboardingDone: true,  // demo は完了済とみなす
  googleMapsReviewUrl: 'https://search.google.com/local/writereview?placeid=DEMO_PLACE_ID',
};

export const DEMO_STAFF = [
  { id: 's_owner',    name: 'オーナー', role: 'owner', pin: '0000', color: '#1f3328' },
  { id: 's_morisita', name: '森下',     role: 'staff', pin: '1111', color: '#2e4a3a' },
  { id: 's_tanaka',   name: '田中',     role: 'staff', pin: '2222', color: '#b25538' },
  { id: 's_kawai',    name: '川合',     role: 'staff', pin: '3333', color: '#c98a2b' },
];

export const DEMO_PRODUCTS = [
  // ─── 服 (主力) ───
  { id: 'p_linen_shirt',  name: 'リネンシャツ / 生成り',       maker: 'Linette (フランス)',       category: 'ifuku', price: 18800, cost: 8200, icon: 'shirt',    stock: 6,  stockBase: 12, unit: '点', tags: ['linen', '春夏'], active: true },
  { id: 'p_wool_cardi',   name: 'ウールカーディガン / 墨黒',   maker: 'Bigeard (フランス)',       category: 'ifuku', price: 32000, cost: 14500, icon: 'cardigan', stock: 3,  stockBase: 8,  unit: '点', tags: ['wool', '秋冬'], active: true },
  { id: 'p_canvas_apron', name: '帆布エプロン / 倉敷',         maker: '倉敷帆布',                  category: 'ifuku', price: 6800,  cost: 2800, icon: 'shirt',    stock: 11, stockBase: 16, unit: '点', tags: ['apron'], active: true },
  { id: 'p_linen_hat',    name: '麻のサンハット',              maker: 'Linette (フランス)',       category: 'ifuku', price: 7800,  cost: 3200, icon: 'hat',      stock: 7,  stockBase: 10, unit: '点', tags: ['linen', '夏'], active: true },
  { id: 'p_wool_socks',   name: 'ウール靴下 / 生成り',         maker: 'ノルウェー直輸入',          category: 'ifuku', price: 2400,  cost: 980,  icon: 'shirt',    stock: 18, stockBase: 24, unit: '足', tags: ['秋冬'], active: true },

  // ─── 装身具 ───
  { id: 'p_silk_scarf',   name: '絹のスカーフ / 草木染め',     maker: '西陣 上田',                 category: 'accessory', price: 9800, cost: 4200, icon: 'scarf',     stock: 5, stockBase: 8,  unit: '点', tags: ['silk', '贈答'], active: true },
  { id: 'p_brass_earring',name: '真鍮のピアス / 雫',          maker: '高岡 須磨',                 category: 'accessory', price: 3200, cost: 1100, icon: 'accessory', stock: 9, stockBase: 14, unit: '対', tags: ['brass', '贈答'], active: true },
  { id: 'p_brass_ring',   name: '真鍮の指輪 / つや消し',       maker: '高岡 須磨',                 category: 'accessory', price: 4500, cost: 1500, icon: 'accessory', stock: 8, stockBase: 12, unit: '点', tags: ['brass'], active: true },

  // ─── 鞄 ───
  { id: 'p_basket_bag',   name: '麻のカゴ鞄 / 中',             maker: 'マダガスカル直輸入',        category: 'bag', price: 14500, cost: 5800, icon: 'bag', stock: 4, stockBase: 6, unit: '点', tags: ['summer'], active: true },
  { id: 'p_leather_tote', name: '革のトート / キャメル',       maker: 'TOTE と暮らし',              category: 'bag', price: 28000, cost: 12000, icon: 'bag', stock: 3, stockBase: 5, unit: '点', tags: ['leather'], active: true },

  // ─── 器 (アクセント) ───
  { id: 'p_oribe_tori5',  name: '織部 取り皿 5寸',             maker: '青木 善之介',                category: 'utsuwa', price: 3800, cost: 1900, icon: 'utsuwa', stock: 14, stockBase: 18, unit: '点', tags: ['oribe'], active: true },
  { id: 'p_kohiki_meshi', name: '粉引 飯碗',                    maker: '中村 友也',                  category: 'utsuwa', price: 3600, cost: 1620, icon: 'utsuwa', stock: 3,  stockBase: 14, unit: '点', tags: ['kohiki'], active: true },
  { id: 'p_glass_pitcher',name: '吹きガラスのピッチャー',       maker: '辻 和美',                    category: 'utsuwa', price: 12800, cost: 5400, icon: 'utsuwa', stock: 4,  stockBase: 6, unit: '点', tags: ['glass'], active: true },

  // ─── 暮らし道具 ───
  { id: 'p_brass_tray',   name: '真鍮トレー / 月',             maker: '高岡 須磨',                 category: 'kurashi', price: 8800, cost: 3800, icon: 'dougu',  stock: 6, stockBase: 10, unit: '点', tags: ['brass'], active: true },
  { id: 'p_rattan_basket',name: '籐のかご / 蓋付き',           maker: '岡山 倉敷',                  category: 'kurashi', price: 6200, cost: 2400, icon: 'kodougu', stock: 8, stockBase: 12, unit: '点', tags: ['storage'], active: true },
  { id: 'p_kiri_box',     name: '桐箱 大 / 贈答用',             maker: '越前木箱',                  category: 'kurashi', price: 1800, cost: 700, icon: 'dougu', stock: 22, stockBase: 40, unit: '点', tags: ['贈答'], active: true },

  // ─── 布 ───
  { id: 'p_asanuno',      name: '麻布 紺 1m',                   maker: '越前麻',                     category: 'nuno', price: 1700, cost: 850, icon: 'nuno', stock: 13, stockBase: 20, unit: 'm', tags: [], active: true },
];

export const DEMO_CUSTOMERS = [
  {
    id: 'c_seto',
    lineUserId: 'U_demo_seto',
    displayName: 'みか',
    realName: '瀬戸 美佳',
    furigana: 'せと みか',
    phone: '090-1234-5678',
    email: 'mika@example.com',
    address: '福井県福井市',
    birthdate: `${new Date().getFullYear()}-07-08`.replace(/^(\d{4})/, (m, y) => (parseInt(y) - 42)),
    note: 'ご長女が来年大学進学。一人暮らしのお祝いに、土鍋とご飯茶碗を探されていた。萩焼の入荷時に必ずお声がけする約束。',
    tags: ['vip', 'linen_fan', 'brass_fan', 'gift_user'],
    ltv: 62400, visits: 14, points: 624,
    firstVisitAt: dayOffset(720),
    lastVisitAt:  dayOffset(108),
    createdAt:    dayOffset(720),
    updatedAt:    today(),
  },
  {
    id: 'c_fujita',
    lineUserId: 'U_demo_fujita',
    displayName: 'さおり',
    realName: '藤田 さおり',
    furigana: 'ふじた さおり',
    phone: '090-2345-6789',
    address: '福井県鯖江市',
    birthdate: '1992-11-04',
    note: 'お子さま (小4・小1) の入学・進級時に必ず来店。器より布・小物寄り。',
    tags: ['kids_user', 'sleep'],
    ltv: 38200, visits: 9, points: 382,
    firstVisitAt: dayOffset(500),
    lastVisitAt:  dayOffset(95),
    createdAt:    dayOffset(500),
    updatedAt:    today(),
  },
  {
    id: 'c_okazaki',
    lineUserId: 'U_demo_okazaki',
    displayName: 'たくろう',
    realName: '岡崎 拓郎',
    furigana: 'おかざき たくろう',
    phone: '090-3456-7890',
    address: '福井県福井市',
    birthdate: '1975-05-22',
    note: '萩焼の取り寄せ問い合わせ中 (6/15)。入荷したら必ず連絡する。',
    tags: ['regul', 'hagi_fan', 'request_pending'],
    ltv: 48900, visits: 11, points: 489,
    firstVisitAt: dayOffset(600),
    lastVisitAt:  dayOffset(15),
    createdAt:    dayOffset(600),
    updatedAt:    today(),
  },
  {
    id: 'c_furukawa',
    lineUserId: 'U_demo_furukawa',
    displayName: 'マリ',
    realName: '古川 真理子',
    furigana: 'ふるかわ まりこ',
    phone: '090-4567-8901',
    address: '福井県大野市',
    birthdate: '1962-03-12',
    note: '茶道のお稽古を月3回。茶碗・茶筅・棗を定期購入。先生筋へのご贈答も。',
    tags: ['vip', 'regul', 'tea_user', 'gift_user'],
    ltv: 84600, visits: 18, points: 846,
    firstVisitAt: dayOffset(820),
    lastVisitAt:  dayOffset(8),
    createdAt:    dayOffset(820),
    updatedAt:    today(),
  },
  {
    id: 'c_nakamura',
    lineUserId: 'U_demo_nakamura',
    displayName: 'だいすけ',
    realName: '中村 大輔',
    furigana: 'なかむら だいすけ',
    phone: '080-5678-9012',
    address: '福井県福井市',
    birthdate: '1988-09-30',
    note: '同僚へのお祝い (結婚) の品を探しに初来店 (6/28)。桐箱対応で織部のぐい呑みを購入。',
    tags: ['new', 'gift_user'],
    ltv: 6800, visits: 1, points: 68,
    firstVisitAt: dayOffset(2),
    lastVisitAt:  dayOffset(2),
    createdAt:    dayOffset(2),
    updatedAt:    today(),
  },
];

export const DEMO_PURCHASES = [
  // 瀬戸さま 過去履歴 4件
  {
    id: 'pu_seto_1',
    customerId: 'c_seto',
    purchasedAt: dayOffset(108),
    lines: [
      { productId: 'p_kohiki_meshi', productName: '粉引 飯碗', category: 'utsuwa', unitPrice: 3600, qty: 2, subtotal: 7200 },
    ],
    subtotal: 7200, discount: 0, pointsUsed: 0, pointsEarned: 72,
    total: 7200, paymentMethod: 'cash', staffId: 's_morisita',
    note: '母の日のご贈答 / 包装あり', isGift: true,
    createdAt: dayOffset(108),
  },
  {
    id: 'pu_seto_2',
    customerId: 'c_seto',
    purchasedAt: dayOffset(160),
    lines: [
      { productId: 'p_kibon', productName: '古道具 木の盆', category: 'kodougu', unitPrice: 4800, qty: 1, subtotal: 4800 },
    ],
    subtotal: 4800, discount: 0, pointsUsed: 0, pointsEarned: 48,
    total: 4800, paymentMethod: 'card', staffId: 's_owner',
    note: 'お正月用にとお持ち帰り', isGift: false,
    createdAt: dayOffset(160),
  },
  {
    id: 'pu_seto_3',
    customerId: 'c_seto',
    purchasedAt: dayOffset(205),
    lines: [
      { productId: 'p_oribe_guinomi', productName: '織部 ぐい呑み', category: 'utsuwa', unitPrice: 2520, qty: 5, subtotal: 12600 },
    ],
    subtotal: 12600, discount: 0, pointsUsed: 0, pointsEarned: 126,
    total: 12600, paymentMethod: 'card', staffId: 's_morisita',
    note: 'ご主人へのお歳暮 / 桐箱対応', isGift: true,
    createdAt: dayOffset(205),
  },
  {
    id: 'pu_seto_4',
    customerId: 'c_seto',
    purchasedAt: dayOffset(255),
    lines: [
      { productId: 'p_asanuno', productName: '麻布 紺 1m', category: 'nuno', unitPrice: 1700, qty: 2, subtotal: 3400 },
    ],
    subtotal: 3400, discount: 0, pointsUsed: 0, pointsEarned: 34,
    total: 3400, paymentMethod: 'cash', staffId: 's_tanaka',
    note: '食卓敷きとして', isGift: false,
    createdAt: dayOffset(255),
  },
  // 中村さま 初回購入
  {
    id: 'pu_nakamura_1',
    customerId: 'c_nakamura',
    purchasedAt: dayOffset(2),
    lines: [
      { productId: 'p_oribe_guinomi', productName: '織部 ぐい呑み', category: 'utsuwa', unitPrice: 2500, qty: 2, subtotal: 5000 },
      { productId: 'p_kiri_box', productName: '桐箱 大', category: 'dougu', unitPrice: 1800, qty: 1, subtotal: 1800 },
    ],
    subtotal: 6800, discount: 0, pointsUsed: 0, pointsEarned: 68,
    total: 6800, paymentMethod: 'card', staffId: 's_owner',
    note: '同僚ご結婚祝い / 桐箱対応', isGift: true,
    createdAt: dayOffset(2),
  },
  // 古川さま 直近 3件
  {
    id: 'pu_furu_1', customerId: 'c_furukawa', purchasedAt: dayOffset(8),
    lines: [{ productId: 'p_hagi_yunomi', productName: '萩焼 湯呑', category: 'utsuwa', unitPrice: 2800, qty: 3, subtotal: 8400 }],
    subtotal: 8400, discount: 0, pointsUsed: 0, pointsEarned: 84, total: 8400, paymentMethod: 'cash', staffId: 's_owner', note: 'お稽古の生徒さんへ', isGift: true, createdAt: dayOffset(8),
  },
  {
    id: 'pu_furu_2', customerId: 'c_furukawa', purchasedAt: dayOffset(45),
    lines: [{ productId: 'p_kohiki_meshi', productName: '粉引 飯碗', category: 'utsuwa', unitPrice: 3600, qty: 3, subtotal: 10800 }],
    subtotal: 10800, discount: 0, pointsUsed: 0, pointsEarned: 108, total: 10800, paymentMethod: 'card', staffId: 's_kawai', note: '', isGift: false, createdAt: dayOffset(45),
  },
  // 岡崎さま 直近
  {
    id: 'pu_oka_1', customerId: 'c_okazaki', purchasedAt: dayOffset(15),
    lines: [{ productId: 'p_oribe_tori5', productName: '織部 取り皿 5寸', category: 'utsuwa', unitPrice: 3800, qty: 4, subtotal: 15200 }],
    subtotal: 15200, discount: 0, pointsUsed: 0, pointsEarned: 152, total: 15200, paymentMethod: 'cash', staffId: 's_morisita', note: '', isGift: false, createdAt: dayOffset(15),
  },
];

export const DEMO_MESSAGES = [
  {
    id: 'm_seto_birth_2606',
    customerId: 'c_seto', direction: 'out', kind: 'auto', triggerId: 'birth_month',
    text: '瀬戸さま、お誕生月おめでとうございます。店内10%OFFクーポンをお送りしました。期限は7月末です。',
    sentAt: dayOffset(1), status: 'sent',
  },
  {
    id: 'm_seto_q',
    customerId: 'c_seto', direction: 'in', kind: 'manual',
    text: '次の織部の入荷はいつごろですか？',
    sentAt: dayOffset(76), status: 'read',
  },
  {
    id: 'm_seto_r',
    customerId: 'c_seto', direction: 'out', kind: 'manual',
    text: '瀬戸さま、お問い合わせありがとうございます。青木さんから来月中旬に新作が届く予定です。入荷次第ご連絡します。— 森下',
    sentAt: dayOffset(75), status: 'sent', staffId: 's_morisita',
  },
];

export const DEMO_HOLDS = [
  {
    id: 'h_oka_hagi',
    customerId: 'c_okazaki',
    productId: 'p_hagi_yunomi',
    productName: '萩焼 湯呑',
    qty: 4,
    estimatedPrice: 11200,
    note: '入荷時にお声がけ希望、 ご贈答用 (桐箱対応)',
    status: 'confirmed',
    requestedAt: dayOffset(12),
    expireAt: dayOffset(-14).slice(0, 10),
    createdAt: dayOffset(12),
  },
  {
    id: 'h_seto_new',
    customerId: 'c_seto',
    productId: 'p_oribe_tori5',
    productName: '織部 取り皿 5寸 (新作)',
    qty: 2,
    estimatedPrice: 7600,
    note: '新作の入荷次第',
    status: 'requested',
    requestedAt: dayOffset(1),
    expireAt: dayOffset(-21).slice(0, 10),
    createdAt: dayOffset(1),
  },
];

export const DEMO_COUPONS = [
  {
    id: 'cp_seto_birth',
    code: 'BIRTH2026',
    label: '誕生月10%OFF',
    kind: 'percent',
    value: 10,
    expireAt: dateOffset(-31),
    customerIds: ['c_seto'],
    used: false,
    createdAt: dayOffset(1),
  },
];

export const DEMO_REVIEWS = [
  {
    id: 'rv_1',
    customerId: 'c_furukawa',
    rating: 5,
    text: '茶道の生徒さんへのご贈答品を相談しました。 丁寧に選んでくださって、 桐箱も用意していただきました。 また伺います。',
    status: 'approved',
    sharedToGoogle: true,
    createdAt: dayOffset(6),
  },
  {
    id: 'rv_2',
    customerId: 'c_seto',
    rating: 5,
    text: '織部の新作を取り置きしてくださり、 ありがとうございました。 LINE で連絡もらえるのが助かります。',
    status: 'pending',
    sharedToGoogle: false,
    createdAt: dayOffset(2),
  },
];

export async function seedDemoData(repo) {
  await repo.adapter._wipeAll?.();
  await repo.saveSettings(DEMO_SETTINGS);
  for (const s of DEMO_STAFF) await repo.saveStaff(s);
  for (const p of DEMO_PRODUCTS) await repo.saveProduct(p);
  for (const c of DEMO_CUSTOMERS) await repo.saveCustomer(c);
  for (const pu of DEMO_PURCHASES) await repo.adapter.set('purchases', pu.id, pu);
  for (const m of DEMO_MESSAGES) await repo.adapter.set('messages', m.id, m);
  for (const cp of DEMO_COUPONS) await repo.adapter.set('coupons', cp.id, cp);
  for (const h of DEMO_HOLDS) await repo.adapter.set('holds', h.id, h);
  for (const rv of DEMO_REVIEWS) await repo.adapter.set('reviews', rv.id, rv);
}
