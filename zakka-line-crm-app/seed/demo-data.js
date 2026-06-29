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
  tenantName: '雑貨と道具 のうと',
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
    { id: 'utsuwa',  label: '器' },
    { id: 'dougu',   label: '道具' },
    { id: 'nuno',    label: '布' },
    { id: 'kodougu', label: '古道具' },
  ],
};

export const DEMO_STAFF = [
  { id: 's_owner',  name: '吉田 オーナー', role: 'owner' },
  { id: 's_morisita', name: '森下', role: 'staff' },
  { id: 's_tanaka',   name: '田中', role: 'staff' },
  { id: 's_kawai',    name: '川合', role: 'staff' },
];

export const DEMO_PRODUCTS = [
  { id: 'p_oribe_tori5', name: '織部 取り皿 5寸', maker: '青木 善之介', category: 'utsuwa', price: 3800, cost: 1900, icon: '🍵', stock: 14, stockBase: 18, unit: '点', tags: ['oribe', 'shinki'], active: true },
  { id: 'p_kuri_hashi',  name: '栗の木 箸 25cm', maker: '福井木工舎',   category: 'dougu',  price: 1200, cost: 480,  icon: '🥢', stock: 21, stockBase: 50, unit: '膳', tags: [], active: true },
  { id: 'p_kohiki_meshi',name: '粉引 飯碗',       maker: '中村 友也',   category: 'utsuwa', price: 3600, cost: 1620, icon: '🪴', stock: 3,  stockBase: 14, unit: '点', tags: ['kohiki'], active: true },
  { id: 'p_oribe_guinomi',name: '織部 ぐい呑み',  maker: '青木 善之介', category: 'utsuwa', price: 2500, cost: 1100, icon: '🍶', stock: 1,  stockBase: 12, unit: '点', tags: ['oribe', 'low'], active: true },
  { id: 'p_asanuno',     name: '麻布 紺 1m',     maker: '越前麻',     category: 'nuno',   price: 1700, cost: 850,  icon: '🧵', stock: 13, stockBase: 20, unit: 'm', tags: [], active: true },
  { id: 'p_kibon',       name: '古道具 木の盆',  maker: '骨董',       category: 'kodougu', price: 4800, cost: 2200, icon: '🪵', stock: 2,  stockBase: 6, unit: '点', tags: [], active: true },
  { id: 'p_hagi_yunomi', name: '萩焼 湯呑',      maker: '大和 義人',  category: 'utsuwa', price: 2800, cost: 1200, icon: '🫖', stock: 8,  stockBase: 12, unit: '点', tags: ['hagi'], active: true },
  { id: 'p_kiri_box',    name: '桐箱 大',        maker: '越前木箱',  category: 'dougu',  price: 1800, cost: 700,  icon: '📦', stock: 22, stockBase: 40, unit: '点', tags: ['gift'], active: true },
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
    tags: ['vip', 'oribe_fan', 'kohiki_fan', 'gift_user'],
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

export async function seedDemoData(repo) {
  await repo.adapter._wipeAll?.();
  await repo.saveSettings(DEMO_SETTINGS);
  for (const s of DEMO_STAFF) await repo.saveStaff(s);
  for (const p of DEMO_PRODUCTS) await repo.saveProduct(p);
  for (const c of DEMO_CUSTOMERS) await repo.saveCustomer(c);
  for (const pu of DEMO_PURCHASES) await repo.adapter.set('purchases', pu.id, pu);
  for (const m of DEMO_MESSAGES) await repo.adapter.set('messages', m.id, m);
  for (const cp of DEMO_COUPONS) await repo.adapter.set('coupons', cp.id, cp);
}
