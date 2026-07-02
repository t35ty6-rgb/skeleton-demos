/**
 * サン・クロレラジャパン デモテナント シードデータ
 *
 * localStorage が空なら自動で書き込む。既にデータがあれば触らない。
 * 商談前に「ブラウザで開いた瞬間に触れる状態」を実現。
 *
 * データ規模: 販売員5名 / 顧客20名 / 商品8点 / 受注42件 / 定期便12件 / 訪問記録30件 / 配信履歴6件
 */

import { db } from './data.js';

const SEED_FLAG = 'sunchlorella::seeded::v4';

export async function seedIfEmpty() {
  if (localStorage.getItem(SEED_FLAG)) return false;
  await seedAll();
  localStorage.setItem(SEED_FLAG, String(Date.now()));
  return true;
}

export async function seedForce() {
  db.reset();
  await seedAll();
  localStorage.setItem(SEED_FLAG, String(Date.now()));
}

async function seedAll() {
  const now = Date.now();
  const D = d => now - d * 86400000;

  /* ─── 販売員 5名 ─── */
  const reps = [
    { id: 'rep_sato',   name: '佐藤 恵美',   office: '京都南',     officeId: 'kyoto',  status: 'active', joinedAt: D(2400), phone: '075-000-0001', tenure: 6.5 },
    { id: 'rep_yoshi',  name: '吉川 篤',     office: '京都北',     officeId: 'kyoto',  status: 'active', joinedAt: D(3200), phone: '075-000-0002', tenure: 8.8 },
    { id: 'rep_kitano', name: '北野 誠',     office: '京都南',     officeId: 'kyoto',  status: 'active', joinedAt: D(1200), phone: '075-000-0003', tenure: 3.3 },
    { id: 'rep_murata', name: '村田 千夏',   office: '大阪梅田',   officeId: 'kansai', status: 'active', joinedAt: D(900),  phone: '06-000-0004',  tenure: 2.5 },
    { id: 'rep_takahashi', name: '高橋 実',   office: '名古屋',     officeId: 'chubu',  status: 'active', joinedAt: D(2000), phone: '052-000-0005', tenure: 5.5 },
  ];
  for (const r of reps) await db.set('reps', r.id, r);

  /* ─── 商品 8点 (公開情報のみ) ─── */
  const products = [
    { id: 'prd_a300',    name: 'サン・クロレラA 粒 300粒',   category: 'chlorella', price: 7020, subPrice: 6620, stock: 320, tag: 'p_a_grain',  desc: 'クロレラを丸ごと粒に。1回15粒×20日分の目安。', img: 'A粒' },
    { id: 'prd_a900',    name: 'サン・クロレラA 粒 900粒',   category: 'chlorella', price: 19440, subPrice: 18240, stock: 210, tag: 'p_a_grain',  desc: 'ご家族用またはお得な60日分。', img: 'A粒L' },
    { id: 'prd_apowder', name: 'サン・クロレラA パウダー',   category: 'chlorella', price: 6480, subPrice: 6080, stock: 180, tag: 'p_a_powder', desc: 'お飲み物に混ぜてどうぞ。無味に近く続けやすい。', img: 'A粉' },
    { id: 'prd_atablet', name: 'サン・クロレラA タブレット', category: 'chlorella', price: 5940, subPrice: 5540, stock: 240, tag: 'p_a_tablet', desc: 'ラムネ状で舐めやすく、外出先でもお召し上がりいただけます。', img: 'A錠' },
    { id: 'prd_drink',   name: 'クロレラドリンク 10本',      category: 'chlorella', price: 3780, subPrice: 3480, stock: 460, tag: 'p_drink',    desc: '1本30mL、朝の1杯に。冷やしても美味しくいただけます。', img: '飲' },
    { id: 'prd_plasma',  name: 'プラズマローゲン 90粒',     category: 'plasmalogen', price: 12960, subPrice: 12160, stock: 130, tag: 'p_plasma',   desc: '記憶をいたわる新習慣。1日3粒×30日分。', img: 'P' },
    { id: 'prd_agari',   name: 'アガリクス 顆粒 90包',       category: 'agaricus',    price: 15120, subPrice: 14320, stock: 90,  tag: 'p_agaricus', desc: '力強い日課に。1包を水またはぬるま湯に溶かして。', img: 'ア' },
    { id: 'prd_ukogi',   name: 'エゾウコギ 粒 240粒',       category: 'ukogi',       price: 5940, subPrice: 5540, stock: 160, tag: 'p_ukogi',    desc: '毎日のリズムを整えるハーブ由来。ロシア極東の伝統。', img: 'ウ' },
  ];
  for (const p of products) await db.set('products', p.id, p);

  /* ─── 顧客 20名 ─── */
  const customers = [
    // 北野 誠 担当 6名 (お試し用に多め)
    { id: 'cust_tanaka',   name: '田中 幸子',   age: 78, birthMonth: 7, phone: '090-000-1001', address: '京都府京都市南区久世大薮町12-3', officeId: 'kyoto',  repId: 'rep_kitano', createdAt: D(940), lastVisitAt: D(20), orderCount: 32, ltv: 224640, note: '腰痛気味。クロレラA 粒 継続32ヶ月。孫の話がお好き。' },
    { id: 'cust_yamada',   name: '山田 治',     age: 72, birthMonth: 3, phone: '090-000-1002', address: '京都府京都市南区吉祥院石原長田町5', officeId: 'kyoto',  repId: 'rep_kitano', createdAt: D(720), lastVisitAt: D(35), orderCount: 18, ltv: 152640, note: 'ドリンクと粒を交互に。朝が早いのでお届けは10時以降。' },
    { id: 'cust_matsumoto',name: '松本 美津子', age: 68, birthMonth: 11,phone: '090-000-1003', address: '京都府京都市南区上鳥羽奈須野町2-8', officeId: 'kyoto',  repId: 'rep_kitano', createdAt: D(30),  lastVisitAt: D(28), orderCount: 1,  ltv: 7020,   note: '新規。お試しセットからスタート、ご家族と相談中。' },
    { id: 'cust_kawai',    name: '河合 敏子',   age: 81, birthMonth: 5, phone: '090-000-1004', address: '京都府京都市南区久世上久世町18', officeId: 'kyoto',  repId: 'rep_kitano', createdAt: D(580), lastVisitAt: D(70), orderCount: 6,  ltv: 42120,  note: '単発購入が多い。定期便のご案内は慎重に。' },
    { id: 'cust_kobayashi',name: '小林 智之',   age: 68, birthMonth: 2, phone: '090-000-1005', address: '京都府京都市南区吉祥院石原京道町9', officeId: 'kyoto',  repId: 'rep_kitano', createdAt: D(1080),lastVisitAt: D(96), orderCount: 12, ltv: 79080,  note: '最終購入 4/2。訪問固辞気味、LINEでのご案内優先。' },
    { id: 'cust_watanabe', name: '渡邊 昭一',   age: 74, birthMonth: 8, phone: '090-000-1006', address: '京都府京都市南区西九条池ノ内町14', officeId: 'kyoto',  repId: 'rep_kitano', createdAt: D(1500),lastVisitAt: D(10), orderCount: 28, ltv: 218400, note: 'アガリクス+クロレラ併用。奥様と一緒にご継続中。' },

    // 佐藤 恵美 担当 4名
    { id: 'cust_sasaki',   name: '佐々木 まさ子',age: 82, birthMonth: 1, phone: '090-000-1007', address: '京都府京都市伏見区醍醐鍵尾町3', officeId: 'kyoto',  repId: 'rep_sato',   createdAt: D(2100),lastVisitAt: D(14), orderCount: 45, ltv: 385560, note: '長年のご継続。プラズマローゲンご興味。' },
    { id: 'cust_okamoto',  name: '岡本 昌代',   age: 71, birthMonth: 6, phone: '090-000-1008', address: '京都府京都市山科区東野狐藪町7', officeId: 'kyoto',  repId: 'rep_sato',   createdAt: D(890), lastVisitAt: D(24), orderCount: 15, ltv: 128100, note: 'パウダー派。お孫さんとご同居。' },
    { id: 'cust_maeda',    name: '前田 悦子',   age: 65, birthMonth: 9, phone: '090-000-1009', address: '京都府京都市伏見区羽束師菱川町2', officeId: 'kyoto',  repId: 'rep_sato',   createdAt: D(300), lastVisitAt: D(18), orderCount: 4,  ltv: 26160,  note: '娘さんからのご紹介。試行期間中、丁寧な説明を継続。' },
    { id: 'cust_ishida',   name: '石田 秀樹',   age: 76, birthMonth: 4, phone: '090-000-1010', address: '京都府京都市山科区大宅奥山田10', officeId: 'kyoto',  repId: 'rep_sato',   createdAt: D(1650),lastVisitAt: D(42), orderCount: 22, ltv: 189180, note: 'アガリクスと錠タイプ。奥様のケア一手。' },

    // 吉川 篤 担当 4名
    { id: 'cust_nomura',   name: '野村 和男',   age: 79, birthMonth: 12,phone: '090-000-1011', address: '京都府京都市左京区岩倉幡枝町3', officeId: 'kyoto',  repId: 'rep_yoshi',  createdAt: D(2600),lastVisitAt: D(8),  orderCount: 58, ltv: 526020, note: 'VIP顧客。奥様ともにご継続。プラズマローゲン新規開始。' },
    { id: 'cust_hashimoto',name: '橋本 靖子',   age: 73, birthMonth: 10,phone: '090-000-1012', address: '京都府京都市左京区一乗寺松原町7', officeId: 'kyoto',  repId: 'rep_yoshi',  createdAt: D(1400),lastVisitAt: D(16), orderCount: 19, ltv: 156960, note: 'エゾウコギ・アスタキサンチンご興味。' },
    { id: 'cust_uchida',   name: '内田 三郎',   age: 84, birthMonth: 3, phone: '090-000-1013', address: '京都府京都市北区西賀茂神光院町4', officeId: 'kyoto',  repId: 'rep_yoshi',  createdAt: D(3000),lastVisitAt: D(21), orderCount: 62, ltv: 621600, note: '当社最古参の一人。エピソード豊富、社報インタビュー候補。' },
    { id: 'cust_arai',     name: '荒井 千鶴子', age: 70, birthMonth: 7, phone: '090-000-1014', address: '京都府京都市北区上賀茂神山6', officeId: 'kyoto',  repId: 'rep_yoshi',  createdAt: D(560), lastVisitAt: D(112),orderCount: 8,  ltv: 62400,  note: '休眠傾向。娘さん経由で近況を伺う要あり。' },

    // 村田 千夏 (大阪梅田) 担当 3名
    { id: 'cust_ozawa',    name: '小澤 良夫',   age: 69, birthMonth: 5, phone: '090-000-1015', address: '大阪府大阪市北区中津3-2-1', officeId: 'kansai', repId: 'rep_murata', createdAt: D(420), lastVisitAt: D(11), orderCount: 9,  ltv: 74340,  note: '早朝ウォーキング。ドリンク常備。' },
    { id: 'cust_kimura',   name: '木村 節子',   age: 77, birthMonth: 8, phone: '090-000-1016', address: '大阪府大阪市福島区福島4-8-2', officeId: 'kansai', repId: 'rep_murata', createdAt: D(1100),lastVisitAt: D(31), orderCount: 24, ltv: 213840, note: '妹様も別担当でご利用。ご紹介経由。' },
    { id: 'cust_saito',    name: '斉藤 光男',   age: 66, birthMonth: 2, phone: '090-000-1017', address: '大阪府豊中市新千里東町1-4', officeId: 'kansai', repId: 'rep_murata', createdAt: D(210), lastVisitAt: D(9),  orderCount: 3,  ltv: 22140,  note: '新規。カラダを動かすお仕事、エゾウコギご案内済み。' },

    // 高橋 実 (名古屋) 担当 3名
    { id: 'cust_kondo',    name: '近藤 静子',   age: 80, birthMonth: 11,phone: '090-000-1018', address: '愛知県名古屋市中区栄3-2-1', officeId: 'chubu', repId: 'rep_takahashi',createdAt: D(1900),lastVisitAt: D(19), orderCount: 38, ltv: 342840, note: 'アスタキサンチンご興味。' },
    { id: 'cust_ando',     name: '安藤 良子',   age: 74, birthMonth: 6, phone: '090-000-1019', address: '愛知県名古屋市千種区今池1-8-9', officeId: 'chubu', repId: 'rep_takahashi',createdAt: D(760), lastVisitAt: D(38), orderCount: 12, ltv: 96120,  note: 'ご主人がご入院中、負担軽減の一手を検討。' },
    { id: 'cust_hattori',  name: '服部 弘',     age: 67, birthMonth: 4, phone: '090-000-1020', address: '愛知県名古屋市瑞穂区豊岡通2-27', officeId: 'chubu', repId: 'rep_takahashi',createdAt: D(140), lastVisitAt: D(23), orderCount: 2,  ltv: 13020,  note: '若手会員候補、SNS開設ご相談あり。' },
  ];
  for (const c of customers) await db.set('customers', c.id, c);

  /* ─── 受注履歴 (直近90日) ─── */
  const orders = [];
  const orderSpecs = [
    // customerId, daysAgo, [productIds], channel, repId (visit時のみ)
    // 直近3日 (今月分) — ダッシュボードKPIが動く見せどころ
    ['cust_sasaki',    0,  ['prd_a900', 'prd_plasma'], 'visit', 'rep_sato'],
    ['cust_nomura',    0,  ['prd_a900', 'prd_agari'],  'visit', 'rep_yoshi'],
    ['cust_tanaka',    0,  ['prd_a300'], 'line', null],
    ['cust_okamoto',   1,  ['prd_apowder'], 'line', null],
    ['cust_yamada',    1,  ['prd_drink'], 'line', null],
    ['cust_watanabe',  1,  ['prd_agari', 'prd_a900'], 'visit', 'rep_kitano'],
    ['cust_uchida',    1,  ['prd_a900'], 'visit', 'rep_yoshi'],
    ['cust_kondo',     2,  ['prd_a900', 'prd_atablet'], 'visit', 'rep_takahashi'],
    ['cust_ozawa',     2,  ['prd_drink', 'prd_a300'], 'visit', 'rep_murata'],
    ['cust_kimura',    2,  ['prd_apowder'], 'line', null],
    ['cust_hashimoto', 2,  ['prd_ukogi', 'prd_a300'], 'visit', 'rep_yoshi'],
    ['cust_ishida',    2,  ['prd_atablet', 'prd_agari'], 'visit', 'rep_sato'],
    ['cust_ando',      2,  ['prd_a300'], 'phone', null],
    ['cust_maeda',     2,  ['prd_a300'], 'web', null],
    ['cust_saito',     2,  ['prd_ukogi'], 'visit', 'rep_murata'],

    ['cust_tanaka',    3,  ['prd_a300', 'prd_drink'], 'visit', 'rep_kitano'],
    ['cust_tanaka',   33,  ['prd_a300'], 'line', null],
    ['cust_tanaka',   63,  ['prd_a300'], 'visit', 'rep_kitano'],
    ['cust_tanaka',   93,  ['prd_a300'], 'line', null],
    ['cust_yamada',   12,  ['prd_a300', 'prd_atablet'], 'visit', 'rep_kitano'],
    ['cust_yamada',   45,  ['prd_a900'], 'visit', 'rep_kitano'],
    ['cust_yamada',   78,  ['prd_drink'], 'line', null],
    ['cust_matsumoto',28,  ['prd_a300'], 'visit', 'rep_kitano'],
    ['cust_kawai',    70,  ['prd_a300'], 'visit', 'rep_kitano'],
    ['cust_kobayashi',96,  ['prd_atablet'], 'visit', 'rep_kitano'],
    ['cust_watanabe',  4,  ['prd_a900', 'prd_agari'], 'visit', 'rep_kitano'],
    ['cust_watanabe', 34,  ['prd_a300', 'prd_agari'], 'line', null],
    ['cust_watanabe', 64,  ['prd_a300', 'prd_agari'], 'visit', 'rep_kitano'],
    ['cust_sasaki',    5,  ['prd_a900', 'prd_plasma'], 'visit', 'rep_sato'],
    ['cust_sasaki',   35,  ['prd_a900'], 'line', null],
    ['cust_sasaki',   65,  ['prd_a900'], 'visit', 'rep_sato'],
    ['cust_okamoto',  14,  ['prd_apowder'], 'visit', 'rep_sato'],
    ['cust_okamoto',  44,  ['prd_apowder'], 'line', null],
    ['cust_maeda',    18,  ['prd_a300'], 'visit', 'rep_sato'],
    ['cust_ishida',   42,  ['prd_atablet', 'prd_agari'], 'visit', 'rep_sato'],
    ['cust_ishida',   72,  ['prd_atablet'], 'line', null],
    ['cust_nomura',    8,  ['prd_a900', 'prd_plasma', 'prd_agari'], 'visit', 'rep_yoshi'],
    ['cust_nomura',   38,  ['prd_a900', 'prd_agari'], 'line', null],
    ['cust_nomura',   68,  ['prd_a900', 'prd_agari'], 'visit', 'rep_yoshi'],
    ['cust_hashimoto',16,  ['prd_ukogi', 'prd_a300'], 'visit', 'rep_yoshi'],
    ['cust_hashimoto',46,  ['prd_a300'], 'line', null],
    ['cust_uchida',   21,  ['prd_a900', 'prd_agari'], 'visit', 'rep_yoshi'],
    ['cust_uchida',   51,  ['prd_a900'], 'line', null],
    ['cust_uchida',   81,  ['prd_a900'], 'visit', 'rep_yoshi'],
    ['cust_ozawa',    11,  ['prd_drink', 'prd_a300'], 'visit', 'rep_murata'],
    ['cust_ozawa',    41,  ['prd_a300'], 'line', null],
    ['cust_kimura',   31,  ['prd_apowder'], 'visit', 'rep_murata'],
    ['cust_kimura',   61,  ['prd_apowder'], 'web', null],
    ['cust_saito',     9,  ['prd_ukogi'], 'visit', 'rep_murata'],
    ['cust_kondo',    19,  ['prd_a900'], 'visit', 'rep_takahashi'],
    ['cust_kondo',    49,  ['prd_a900'], 'line', null],
    ['cust_ando',     38,  ['prd_a300'], 'visit', 'rep_takahashi'],
    ['cust_hattori',  23,  ['prd_ukogi'], 'visit', 'rep_takahashi'],
    ['cust_hattori',  53,  ['prd_atablet'], 'web', null],
    ['cust_arai',     50,  ['prd_a300'], 'phone', null],
  ];
  for (const [cid, dAgo, pids, ch, rid] of orderSpecs) {
    const items = pids.map(pid => {
      const p = products.find(x => x.id === pid);
      return { productId: pid, name: p.name, price: (ch === 'visit' ? p.subPrice : p.price), qty: 1, tag: p.tag };
    });
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const oid = 'ord_' + cid + '_' + dAgo;
    orders.push({
      id: oid, customerId: cid, repId: rid, channel: ch,
      items, total, paymentMethod: ch === 'visit' ? 'linepay' : (ch === 'web' ? 'card' : 'linepay'),
      status: 'shipped', createdAt: D(dAgo),
    });
  }
  for (const o of orders) await db.set('orders', o.id, o);

  /* ─── 定期便 (12件アクティブ) ─── */
  const subsData = [
    { id: 'sub_tanaka_a300',    customerId: 'cust_tanaka',    productId: 'prd_a300',    qty: 1, cycleDays: 30, nextDeliveryAt: D(-8),  status: 'active', createdAt: D(940), repId: 'rep_kitano' },
    { id: 'sub_yamada_a300',    customerId: 'cust_yamada',    productId: 'prd_a300',    qty: 1, cycleDays: 45, nextDeliveryAt: D(-14), status: 'active', createdAt: D(720), repId: 'rep_kitano' },
    { id: 'sub_watanabe_a900',  customerId: 'cust_watanabe',  productId: 'prd_a900',    qty: 1, cycleDays: 60, nextDeliveryAt: D(-22), status: 'active', createdAt: D(1400),repId: 'rep_kitano' },
    { id: 'sub_watanabe_agari', customerId: 'cust_watanabe',  productId: 'prd_agari',   qty: 1, cycleDays: 30, nextDeliveryAt: D(-4),  status: 'active', createdAt: D(1200),repId: 'rep_kitano' },
    { id: 'sub_sasaki_a900',    customerId: 'cust_sasaki',    productId: 'prd_a900',    qty: 1, cycleDays: 60, nextDeliveryAt: D(-25), status: 'active', createdAt: D(2100),repId: 'rep_sato' },
    { id: 'sub_okamoto_apowder',customerId: 'cust_okamoto',   productId: 'prd_apowder', qty: 1, cycleDays: 45, nextDeliveryAt: D(-12), status: 'active', createdAt: D(890), repId: 'rep_sato' },
    { id: 'sub_ishida_atablet', customerId: 'cust_ishida',    productId: 'prd_atablet', qty: 2, cycleDays: 60, nextDeliveryAt: D(-18), status: 'active', createdAt: D(1650),repId: 'rep_sato' },
    { id: 'sub_nomura_a900',    customerId: 'cust_nomura',    productId: 'prd_a900',    qty: 1, cycleDays: 45, nextDeliveryAt: D(-6),  status: 'active', createdAt: D(2600),repId: 'rep_yoshi' },
    { id: 'sub_nomura_agari',   customerId: 'cust_nomura',    productId: 'prd_agari',   qty: 1, cycleDays: 30, nextDeliveryAt: D(-2),  status: 'active', createdAt: D(2400),repId: 'rep_yoshi' },
    { id: 'sub_uchida_a900',    customerId: 'cust_uchida',    productId: 'prd_a900',    qty: 1, cycleDays: 45, nextDeliveryAt: D(-11), status: 'active', createdAt: D(3000),repId: 'rep_yoshi' },
    { id: 'sub_kimura_apowder', customerId: 'cust_kimura',    productId: 'prd_apowder', qty: 1, cycleDays: 45, nextDeliveryAt: D(-16), status: 'active', createdAt: D(1100),repId: 'rep_murata' },
    { id: 'sub_kondo_a900',     customerId: 'cust_kondo',     productId: 'prd_a900',    qty: 1, cycleDays: 60, nextDeliveryAt: D(-20), status: 'active', createdAt: D(1900),repId: 'rep_takahashi' },
  ];
  for (const s of subsData) await db.set('subscriptions', s.id, s);

  /* ─── 訪問記録 ─── */
  const visits = [];
  orderSpecs.filter(([, , , ch]) => ch === 'visit').forEach(([cid, dAgo, , , rid], i) => {
    visits.push({
      id: 'vis_' + cid + '_' + dAgo,
      customerId: cid, repId: rid, kind: 'delivery',
      note: 'お届けと近況伺い。' + ['お元気そう', 'ご家族と', 'いつもの調子', '天気の話'][i % 4],
      createdAt: (Date.now() - dAgo * 86400000),
    });
  });
  for (const v of visits) await db.set('visits', v.id, v);

  /* ─── 配信履歴 6件 ─── */
  const broadcasts = [
    { id: 'bc_1', kind: 'manual',       title: '定期便お届けのお知らせ (7月分)', segment: ['s_sub'], targetCount: 12820, openRate: 44.2, clickRate: 8.1, sentAt: D(1),  bodyPreview: 'お世話になっております。今月の定期便のお届けについてご案内いたします。' },
    { id: 'bc_2', kind: 'manual',       title: 'プラズマローゲン 会員限定¥500 OFF', segment: ['age_60','age_70','s_sub'], targetCount: 5320, openRate: 51.7, clickRate: 12.4, sentAt: D(4),  bodyPreview: '今月ご継続の皆さまへ、プラズマローゲン初回¥500 OFFのお知らせです。' },
    { id: 'bc_3', kind: 'auto_birth',   title: '7月お誕生月の皆さまへ',          segment: ['s_birthmonth'], targetCount: 862, openRate: 62.4, clickRate: 18.9, sentAt: D(7),  bodyPreview: 'お誕生月おめでとうございます。ささやかですが¥1,000クーポンをお贈りします。' },
    { id: 'bc_4', kind: 'auto_sleep',   title: '休眠60日超の皆さまへ (お伺い)',  segment: ['s_sleep60'], targetCount: 1240, openRate: 21.3, clickRate: 4.2, sentAt: D(10), bodyPreview: 'ご無沙汰しております。担当よりお伺いのご連絡です。' },
    { id: 'bc_5', kind: 'manual',       title: '関東ブロック 夏の健康フェア案内',segment: ['r_kanto'], targetCount: 8420, openRate: 34.6, clickRate: 7.2, sentAt: D(15), bodyPreview: '関東の皆さまへ、夏の健康フェア開催のお知らせです。' },
    { id: 'bc_6', kind: 'auto_sub_remind', title: '定期便お届け3日前リマインド', segment: ['s_sub'], targetCount: 986,  openRate: 71.2, clickRate: 22.0, sentAt: D(2),  bodyPreview: '3日後にお届けの定期便、お手元の在庫はいかがですか?' },
  ];
  for (const b of broadcasts) await db.set('broadcasts', b.id, b);

  /* ─── LINE メッセージ (客画面の会話) ─── */
  const msgs = [
    { id: 'msg1', customerId: 'cust_tanaka', direction: 'incoming', repId: 'rep_kitano', body: '田中さま、おはようございます。7月分の定期便のお届け、来週火曜日でご都合いかがでしょうか?', createdAt: D(0) + 9*3600*1000 + 14*60*1000 },
    { id: 'msg2', customerId: 'cust_tanaka', direction: 'outgoing', body: 'はい、火曜で大丈夫です。よろしくお願いします。', createdAt: D(0) + 9*3600*1000 + 18*60*1000 },
    { id: 'msg3', customerId: 'cust_tanaka', direction: 'incoming', repId: 'rep_kitano', body: 'ありがとうございます。それではまた火曜日に伺います。', createdAt: D(0) + 9*3600*1000 + 20*60*1000 },
    { id: 'msg4', customerId: 'cust_tanaka', direction: 'incoming', repId: 'rep_kitano', kind: 'rich', title: 'プラズマローゲン 新発売', desc: '今月ご継続の皆さまだけ、初回¥500 OFF。会員価格でお試しいただけます。', productId: 'prd_plasma', createdAt: D(0) + 9*3600*1000 + 22*60*1000 },
  ];
  for (const m of msgs) await db.set('messages', m.id, m);

  /* ─── 公式LINEアカウント (4アカ束ね) ─── */
  const channels = [
    {
      id: 'ch_sales',
      name: 'サン・クロレラ 営業部',   kind: 'sales',
      status: 'active',
      channelSecret: '',                // 本番接続時に管理画面から入力
      channelAccessToken: '',
      basicId: '@sunchlorella-sales',
      richMenuId: 'richmenu-sales',
      description: '訪問販売員と顧客の1:1連絡・受注・決済リンク送信の窓口',
      friends: 68420,                   // デモ表示値
      createdAt: D(1400),
    },
    {
      id: 'ch_cs',
      name: 'お客さまサポート',        kind: 'cs',
      status: 'active',
      channelSecret: '',
      channelAccessToken: '',
      basicId: '@sunchlorella-cs',
      richMenuId: 'richmenu-cs',
      description: '商品の使い方相談・返品交換・体調相談 の総合窓口',
      friends: 52180,
      createdAt: D(1600),
    },
    {
      id: 'ch_sub',
      name: '定期便お知らせ',          kind: 'sub',
      status: 'active',
      channelSecret: '',
      channelAccessToken: '',
      basicId: '@sunchlorella-teiki',
      richMenuId: 'richmenu-sub',
      description: '定期便継続顧客への お届け前通知・変更受付 専用',
      friends: 38240,
      createdAt: D(1200),
    },
    {
      id: 'ch_event',
      name: 'イベント・キャンペーン',  kind: 'event',
      status: 'active',
      channelSecret: '',
      channelAccessToken: '',
      basicId: '@sunchlorella-event',
      richMenuId: 'richmenu-event',
      description: '試合会場・万博・広告 経由の新規獲得と キャンペーン期間限定 配信',
      friends: 25480,
      createdAt: D(600),
    },
  ];
  for (const ch of channels) await db.set('channels', ch.id, ch);

  // 顧客に acquiredChannel を付与 (どのアカから友達追加されたか)
  const channelAttr = [
    ['cust_tanaka',   'ch_sales'],
    ['cust_yamada',   'ch_sales'],
    ['cust_matsumoto','ch_event'],
    ['cust_kawai',    'ch_sales'],
    ['cust_kobayashi','ch_sub'],
    ['cust_watanabe', 'ch_sales'],
    ['cust_sasaki',   'ch_sub'],
    ['cust_okamoto',  'ch_cs'],
    ['cust_maeda',    'ch_event'],
    ['cust_ishida',   'ch_sub'],
    ['cust_nomura',   'ch_sales'],
    ['cust_hashimoto','ch_cs'],
    ['cust_uchida',   'ch_sub'],
    ['cust_arai',     'ch_sales'],
    ['cust_ozawa',    'ch_event'],
    ['cust_kimura',   'ch_cs'],
    ['cust_saito',    'ch_event'],
    ['cust_kondo',    'ch_sales'],
    ['cust_ando',     'ch_cs'],
    ['cust_hattori',  'ch_event'],
  ];
  for (const [cid, chn] of channelAttr) {
    const c = await db.get('customers', cid);
    if (c) await db.set('customers', cid, { ...c, acquiredChannel: chn });
  }

  /* ─── キャンペーン (attribution) ─── */
  const campaigns = [
    {
      id: 'camp_default',
      name: '通常運用', kind: 'default',
      status: 'active', priority: 0,
      startAt: null, endAt: null,
      richMenuId: 'richmenu-default',
      tagToApply: null,
      landingSlug: '',
      note: '常時稼働。 他キャンペーン期間外はこちらのリッチメニュー。',
    },
    {
      id: 'camp_lakes_home_2607',
      name: '滋賀レイクス ホーム3連戦', kind: 'sports',
      status: 'active', priority: 20,
      startAt: D(1), endAt: D(-3),   // 昨日〜3日後 (デモ)
      richMenuId: 'richmenu-basketball',
      tagToApply: 'src_lakes_home_2607',
      landingSlug: 'lakes-home',
      note: 'ウカルちゃんアリーナ での ホーム試合3連戦。 会場QR + LINE友達1000名限定 ¥500 OFF。',
    },
    {
      id: 'camp_expo_kansai',
      name: '大阪・関西万博 出展', kind: 'expo',
      status: 'active', priority: 15,
      startAt: D(21), endAt: D(-90),
      richMenuId: 'richmenu-expo',
      tagToApply: 'src_expo_kansai',
      landingSlug: 'expo-kansai',
      note: '関西万博 会場QR + 万博限定パッケージ + LINE内 抽選会。',
    },
    {
      id: 'camp_meta_60plus',
      name: 'Meta広告 60代健康キャンペーン', kind: 'ads',
      status: 'active', priority: 8,
      startAt: D(35), endAt: D(-25),
      richMenuId: 'richmenu-default',
      tagToApply: 'src_meta_60plus',
      landingSlug: 'health60',
      note: 'Instagram 60代健康関心層 ターゲティング広告。 動画クリエイティブ3本 A/B。',
    },
  ];
  for (const c of campaigns) await db.set('campaigns', c.id, c);

  // キャンペーン獲得: 一部の 顧客に acquisitionCampaign を付与
  const campAttr = [
    ['cust_matsumoto', 'camp_lakes_home_2607'],
    ['cust_saito',     'camp_lakes_home_2607'],
    ['cust_hattori',   'camp_expo_kansai'],
    ['cust_maeda',     'camp_meta_60plus'],
    ['cust_ozawa',     'camp_meta_60plus'],
  ];
  for (const [cid, cmp] of campAttr) {
    const c = await db.get('customers', cid);
    if (c) await db.set('customers', cid, { ...c, acquisitionCampaign: cmp });
  }
  // 受注 の attribution.campaignId を 該当顧客の 全受注に付与
  for (const [cid, cmp] of campAttr) {
    const list = await db.list('orders', { where: { customerId: cid } });
    for (const o of list) await db.set('orders', o.id, { ...o, attribution: { campaignId: cmp } });
  }

  // campaigns.stats を 初期集計 (以降の Cloud Functions で自動加算されるが 初期表示のため)
  const allCustomers = await db.list('customers');
  const allOrders    = await db.list('orders');
  for (const cp of campaigns) {
    const acquiredCustomers = allCustomers.filter(c => c.acquisitionCampaign === cp.id);
    const acquiredIds = new Set(acquiredCustomers.map(c => c.id));
    const attrOrders  = allOrders.filter(o => o.attribution?.campaignId === cp.id || acquiredIds.has(o.customerId));
    const revenue     = attrOrders.reduce((s, o) => s + (o.total || 0), 0);
    await db.set('campaigns', cp.id, {
      ...cp,
      stats: {
        acquired: acquiredCustomers.length,
        orders:   attrOrders.length,
        revenue,
        lastAcquiredAt: acquiredCustomers.length ? Math.max(...acquiredCustomers.map(c => c.createdAt || 0)) : null,
        lastOrderAt:    attrOrders.length        ? Math.max(...attrOrders.map(o => o.createdAt || 0))        : null,
      },
    });
  }

  // channels.stats を集計 (アカ別 獲得顧客数・売上・LTV平均)
  for (const ch of channels) {
    const acqCusts = allCustomers.filter(c => c.acquiredChannel === ch.id);
    const acqIds = new Set(acqCusts.map(c => c.id));
    const chOrders = allOrders.filter(o => acqIds.has(o.customerId));
    const revenue = chOrders.reduce((s, o) => s + (o.total || 0), 0);
    await db.set('channels', ch.id, {
      ...ch,
      stats: {
        acquired: acqCusts.length,
        orders: chOrders.length,
        revenue,
        avgLtv: acqCusts.length ? Math.round(revenue / acqCusts.length) : 0,
      },
    });
  }

  /* ─── ステップ配信シナリオ (LSTEP代替) ─── */
  const scenarios = [
    {
      id: 'scn_welcome',
      name: '新規友だち歓迎シナリオ (3日プログラム)',
      trigger: 'friend_add',
      status: 'active',
      description: '友だち追加直後の 3日間で ブランドと担当を覚えていただき、 初回購入まで導く',
      steps: [
        { id: 'st1', kind: 'send', message: 'サン・クロレラ サポートへようこそ。 担当の販売員が改めてご連絡いたします。 まずは 会員証をご覧ください。' },
        { id: 'st2', kind: 'wait', waitDays: 1, waitHours: 0, waitMinutes: 0 },
        { id: 'st3', kind: 'send', message: 'ご覧いただきありがとうございます。 今日は 60年以上続く サン・クロレラ の 「ホールフード」 という考え方 をご紹介します。' },
        { id: 'st4', kind: 'wait', waitDays: 2, waitHours: 0, waitMinutes: 0 },
        { id: 'st5', kind: 'send', message: 'お試しセットを ¥1,000 OFF でご案内中です。 気になる商品をタップしてご覧ください。' },
        { id: 'st6', kind: 'tag_add', tagId: 'welcome_3day_done' },
        { id: 'st7', kind: 'end' },
      ],
      createdAt: D(30),
    },
    {
      id: 'scn_first_purchase',
      name: '初回購入 後の 継続育成シナリオ',
      trigger: 'purchase',
      triggerCondition: { orderCount: 1 },
      status: 'active',
      description: '初回購入直後のお客様に お礼→使い方→定期便のご案内 を段階的に',
      steps: [
        { id: 'st1', kind: 'send', message: 'ご購入ありがとうございました。 商品到着まで数日お待ちください。 その間 使い方の動画を1つご紹介します。' },
        { id: 'st2', kind: 'wait', waitDays: 3, waitHours: 0 },
        { id: 'st3', kind: 'send', message: '商品お手元に届きましたでしょうか。 続けて実感するには 「毎日決まった時間」 が一番のコツです。' },
        { id: 'st4', kind: 'wait', waitDays: 4, waitHours: 0 },
        { id: 'st5', kind: 'branch', branchTag: 's_sub' },
        { id: 'st6', kind: 'send', message: '定期便ご利用ありがとうございます。 次回のお届けをお楽しみに。' },
        { id: 'st7', kind: 'end' },
        { id: 'st8', kind: 'send', message: '定期便なら お得な会員価格 + お届け忘れなし。 いつでも1タップで停止できます。' },
        { id: 'st9', kind: 'end' },
      ],
      createdAt: D(60),
    },
    {
      id: 'scn_dormant_recovery',
      name: '休眠60日 復帰シナリオ',
      trigger: 'tag_added',
      triggerCondition: { tag: 's_sleep60' },
      status: 'active',
      description: '休眠タグが付いたお客様に 担当からの お伺い → 特別クーポン の 2段階復帰オファー',
      steps: [
        { id: 'st1', kind: 'send', message: 'ご無沙汰しております。 お元気でお過ごしですか。 担当より改めてご連絡いたします。' },
        { id: 'st2', kind: 'wait', waitDays: 5, waitHours: 0 },
        { id: 'st3', kind: 'branch', branchTag: 'purchased_recent' },
        { id: 'st4', kind: 'end' },
        { id: 'st5', kind: 'send', message: '復帰記念に ¥1,500 OFF クーポンをお送りしました。 期限は1週間、 定期便再開もこちらから承ります。' },
        { id: 'st6', kind: 'tag_add', tagId: 'dormant_recovery_offered' },
        { id: 'st7', kind: 'end' },
      ],
      createdAt: D(45),
    },
  ];
  for (const s of scenarios) await db.set('scenarios', s.id, {
    ...s,
    stats: { active: 0, done: 0, error: 0 },
  });

  /* ─── シナリオ 実行中 サンプル (Run: どのお客がどのステップに居るか) ─── */
  const runs = [
    { id: 'run_1', scenarioId: 'scn_welcome',          customerId: 'cust_matsumoto', currentStepIndex: 2, startedAt: D(2),  nextFireAt: D(-1), status: 'active' },
    { id: 'run_2', scenarioId: 'scn_welcome',          customerId: 'cust_saito',     currentStepIndex: 4, startedAt: D(4),  nextFireAt: D(-2), status: 'active' },
    { id: 'run_3', scenarioId: 'scn_first_purchase',   customerId: 'cust_hattori',   currentStepIndex: 1, startedAt: D(1),  nextFireAt: D(-2), status: 'active' },
    { id: 'run_4', scenarioId: 'scn_dormant_recovery', customerId: 'cust_arai',      currentStepIndex: 4, startedAt: D(6),  nextFireAt: D(-2), status: 'active' },
    { id: 'run_5', scenarioId: 'scn_welcome',          customerId: 'cust_maeda',     currentStepIndex: 6, startedAt: D(10), nextFireAt: null,  status: 'done' },
    { id: 'run_6', scenarioId: 'scn_first_purchase',   customerId: 'cust_ozawa',     currentStepIndex: 8, startedAt: D(12), nextFireAt: null,  status: 'done' },
  ];
  for (const r of runs) await db.set('scenarioRuns', r.id, r);

  // scenarios.stats を集計
  for (const s of scenarios) {
    const rs = runs.filter(r => r.scenarioId === s.id);
    await db.set('scenarios', s.id, {
      ...s,
      stats: {
        active: rs.filter(r => r.status === 'active').length,
        done:   rs.filter(r => r.status === 'done').length,
        error:  rs.filter(r => r.status === 'error').length,
      },
    });
  }

  /* ─── テナント設定 ─── */
  await db.set('settings', 'tenant', {
    id: 'tenant',
    name: 'サン・クロレラジャパン株式会社',
    officialLineName: 'サン・クロレラ サポート',
    address: '京都府京都市南区 (デモ表示用)',
    fiscalYearStart: 4,
    goals: { monthlyRevenue: 900000000 },
  });
}

/* ─── 実行時 集計ヘルパー ─── */
export function summarize(reps, customers, orders, subs) {
  const now = Date.now();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const thisMonthOrders = orders.filter(o => o.createdAt >= monthStart.getTime());
  const revenue = thisMonthOrders.reduce((s, o) => s + o.total, 0);

  const byChannel = { visit: 0, line: 0, web: 0, phone: 0 };
  thisMonthOrders.forEach(o => { byChannel[o.channel] = (byChannel[o.channel] || 0) + o.total; });

  const byRep = {};
  reps.forEach(r => byRep[r.id] = { rep: r, revenue: 0, count: 0 });
  thisMonthOrders.forEach(o => {
    if (o.repId && byRep[o.repId]) { byRep[o.repId].revenue += o.total; byRep[o.repId].count += 1; }
  });

  const active = subs.filter(s => s.status === 'active').length;
  const total = subs.length;
  const retention = total ? Math.round((active / total) * 1000) / 10 : 0;

  const friends = customers.length + 184300; // デモ的に大規模プロモの見え方に (今月+8,240)
  return {
    revenue, byChannel, byRep, retention, friends,
    thisMonthOrders,
    monthlyTarget: 900000000,
  };
}
