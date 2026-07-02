/**
 * サン・クロレラジャパン LINE統合SaaS スキーマ SSOT
 *
 * 1テナント = サン・クロレラジャパン (tenantId: 'sunchlorella')
 * このファイルは rep / customer / admin すべてから import される。
 * フィールド名・enum 値・定数は ここ以外に書かない。
 */

export const TENANT_ID = 'sunchlorella';
export const TENANT_LABEL = 'サン・クロレラジャパン';
export const SCHEMA_VERSION = 1;

/* ─── 販売員 (訪問販売員) ─── */
export const REP_STATUS = {
  ACTIVE:  { id: 'active',  label: '稼働中' },
  LEAVE:   { id: 'leave',   label: '休職中' },
  RETIRED: { id: 'retired', label: '退職' },
};

/* ─── 顧客ランク ─── */
export const CUSTOMER_RANK = {
  A:      { id: 'A',      label: 'A (優良継続)',    color: 'leaf' },
  B:      { id: 'B',      label: 'B (継続)',        color: 'sun' },
  C:      { id: 'C',      label: 'C (新規/単発)',   color: 'ink' },
  DORM:   { id: 'dorm',   label: '休眠',            color: 'alert' },
};

/* ─── セグメントタグ (LSTEP代替の絞り込み軸) ─── */
export const TAG_GROUPS = {
  AGE: {
    label: '年代',
    tags: [
      { id: 'age_50', label: '50代' },
      { id: 'age_60', label: '60代' },
      { id: 'age_70', label: '70代' },
      { id: 'age_80', label: '80代以上' },
    ],
  },
  PRODUCT: {
    label: '主要ご利用商品',
    tags: [
      { id: 'p_a_grain',    label: 'クロレラA 粒' },
      { id: 'p_a_powder',   label: 'クロレラA パウダー' },
      { id: 'p_a_tablet',   label: 'クロレラA タブレット' },
      { id: 'p_drink',      label: 'ドリンク' },
      { id: 'p_plasma',     label: 'プラズマローゲン' },
      { id: 'p_agaricus',   label: 'アガリクス' },
      { id: 'p_ukogi',      label: 'エゾウコギ' },
      { id: 'p_astaxanthin',label: 'アスタキサンチン' },
    ],
  },
  STATUS: {
    label: 'ご継続状況',
    tags: [
      { id: 's_sub',        label: '定期便継続中' },
      { id: 's_new30',      label: '初回購入から30日以内' },
      { id: 's_sleep60',    label: '休眠 60日以上' },
      { id: 's_birthmonth', label: '誕生月' },
      { id: 's_vip',        label: 'LTV¥100万以上' },
    ],
  },
  REGION: {
    label: '担当営業所',
    tags: [
      { id: 'r_kyoto',    label: '京都本部' },
      { id: 'r_kanto',    label: '関東ブロック' },
      { id: 'r_kansai',   label: '関西ブロック' },
      { id: 'r_chubu',    label: '中部ブロック' },
      { id: 'r_kyushu',   label: '九州ブロック' },
    ],
  },
};

/* ─── 商品カテゴリ ─── */
export const PRODUCT_CATEGORIES = [
  { id: 'chlorella',   label: 'クロレラ' },
  { id: 'plasmalogen', label: 'プラズマローゲン' },
  { id: 'agaricus',    label: 'アガリクス' },
  { id: 'ukogi',       label: 'エゾウコギ' },
  { id: 'astaxanthin', label: 'アスタキサンチン' },
  { id: 'anserine',    label: 'アンセリン' },
];

/* ─── 受注チャネル (この案件の本丸) ─── */
export const CHANNELS = {
  VISIT:  { id: 'visit',  label: '訪問販売', color: 'leaf' },
  LINE:   { id: 'line',   label: 'LINE EC',  color: 'sun' },
  WEB:    { id: 'web',    label: '自社EC',   color: 'earth' },
  PHONE:  { id: 'phone',  label: '電話注文', color: 'ink' },
};

/* ─── 定期便 状態 ─── */
export const SUB_STATUS = {
  ACTIVE:  { id: 'active',  label: 'ご継続中' },
  PAUSED:  { id: 'paused',  label: 'スキップ中' },
  STOPPED: { id: 'stopped', label: '停止' },
};

/* ─── 配信 種別 ─── */
export const BROADCAST_KIND = {
  MANUAL: { id: 'manual', label: '手動セグメント' },
  AUTO_BIRTH:  { id: 'auto_birth',  label: '自動: 誕生月' },
  AUTO_SLEEP:  { id: 'auto_sleep',  label: '自動: 休眠掘り起こし' },
  AUTO_SUB_REMIND: { id: 'auto_sub_remind', label: '自動: 定期便お届け前' },
};

/* ─── 支払方法 ─── */
export const PAYMENT_METHODS = {
  LINEPAY:  { id: 'linepay',  label: 'LINE Pay' },
  CARD:     { id: 'card',     label: 'クレジットカード' },
  COD:      { id: 'cod',      label: '代金引換' },
  BANK:     { id: 'bank',     label: '銀行振込' },
};

/* ─── 訪問記録 種別 ─── */
export const VISIT_KIND = {
  DELIVERY: { id: 'delivery', label: 'お届け' },
  CHECK:    { id: 'check',    label: 'お伺い (体調確認)' },
  NEW:      { id: 'new',      label: '新規訪問' },
  FOLLOWUP: { id: 'followup', label: '未購入フォロー' },
};

/* ─── ヘルパー: 顧客ランク自動判定 ─── */
export function autoRank(customer) {
  const now = Date.now();
  const daysSinceLast = customer.lastVisitAt
    ? Math.floor((now - customer.lastVisitAt) / 86400000) : 9999;
  if (daysSinceLast >= 90) return 'DORM';
  if ((customer.ltv || 0) >= 200000 && daysSinceLast <= 45) return 'A';
  if ((customer.orderCount || 0) >= 3) return 'B';
  return 'C';
}

/* ─── ヘルパー: 顧客が属するタグ一覧を自動算出 ─── */
export function autoTags(customer, orders = [], subs = []) {
  const tags = new Set();
  const age = customer.age;
  if (age >= 50 && age < 60) tags.add('age_50');
  else if (age >= 60 && age < 70) tags.add('age_60');
  else if (age >= 70 && age < 80) tags.add('age_70');
  else if (age >= 80) tags.add('age_80');
  const office = customer.officeId;
  if (office === 'kyoto')  tags.add('r_kyoto');
  if (office === 'kanto')  tags.add('r_kanto');
  if (office === 'kansai') tags.add('r_kansai');
  if (office === 'chubu')  tags.add('r_chubu');
  if (office === 'kyushu') tags.add('r_kyushu');
  if (subs.some(s => s.customerId === customer.id && s.status === 'active')) tags.add('s_sub');
  const daysSinceLast = customer.lastVisitAt
    ? (Date.now() - customer.lastVisitAt) / 86400000 : 9999;
  if (daysSinceLast >= 60) tags.add('s_sleep60');
  const created = customer.createdAt || 0;
  if ((Date.now() - created) / 86400000 <= 30 && (customer.orderCount || 0) <= 1) tags.add('s_new30');
  const birth = customer.birthMonth;
  if (birth && birth === (new Date().getMonth() + 1)) tags.add('s_birthmonth');
  if ((customer.ltv || 0) >= 1000000) tags.add('s_vip');
  const productTags = new Set();
  orders.filter(o => o.customerId === customer.id).forEach(o => (o.items || []).forEach(i => {
    if (i.tag) productTags.add(i.tag);
  }));
  productTags.forEach(t => tags.add(t));
  return [...tags];
}

/* ─── ヘルパー: 配信対象顧客抽出 ─── */
export function filterCustomers(customers, selectedTagIds, orders, subs) {
  if (!selectedTagIds.length) return customers;
  const groups = {};
  Object.values(TAG_GROUPS).forEach(g => g.tags.forEach(t => {
    const groupKey = Object.entries(TAG_GROUPS).find(([, v]) => v === g)[0];
    groups[t.id] = groupKey;
  }));
  const byGroup = {};
  selectedTagIds.forEach(t => {
    const g = groups[t];
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(t);
  });
  return customers.filter(c => {
    const ct = autoTags(c, orders, subs);
    return Object.values(byGroup).every(orTags => orTags.some(t => ct.includes(t)));
  });
}

/* ─── ヘルパー: 通貨/日付 表示 ─── */
export const fmt = {
  yen: n => '¥' + Math.round(n).toLocaleString('ja-JP'),
  yenShort: n => {
    if (n >= 100000000) return '¥' + (n / 100000000).toFixed(2).replace(/\.?0+$/, '') + '億';
    if (n >= 10000)     return '¥' + (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    return '¥' + Math.round(n).toLocaleString('ja-JP');
  },
  date: t => {
    if (!t) return '—';
    const d = new Date(t);
    return `${d.getFullYear()}/${(d.getMonth()+1)}/${d.getDate()}`;
  },
  dateShort: t => {
    if (!t) return '—';
    const d = new Date(t);
    return `${d.getMonth()+1}/${d.getDate()}`;
  },
  time: t => {
    if (!t) return '—';
    const d = new Date(t);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
  },
  daysAgo: t => {
    if (!t) return '—';
    const d = Math.floor((Date.now() - t) / 86400000);
    if (d === 0) return '今日';
    if (d === 1) return '昨日';
    if (d < 30) return `${d}日前`;
    if (d < 365) return `${Math.floor(d/30)}ヶ月前`;
    return `${Math.floor(d/365)}年前`;
  },
};
