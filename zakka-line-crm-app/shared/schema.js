/**
 * 雑貨LINEツール - Firestore スキーマ SSOT
 *
 * 1テナント = 1店舗 (例: zakka-demo / nouto / etc.)
 * パス: /tenants/{tenantId}/...
 *
 * このファイルは admin / customer / functions すべてから import される。
 * フィールド名・enum 値・定数は ここ以外に書かない。
 */

export const SCHEMA_VERSION = 1;

// ─── 顧客タグ (admin で自由に追加可能、固定タグは UI からの抽出にのみ使う) ───
export const SYSTEM_TAGS = {
  VIP:    { id: 'vip',    label: 'VIP',    rule: 'ltv >= 50000' },
  REGUL:  { id: 'regul',  label: '常連',   rule: 'visits >= 5' },
  NEW:    { id: 'new',    label: '新規',   rule: 'visits <= 1 && createdWithinDays <= 30' },
  SLEEP:  { id: 'sleep',  label: '休眠',   rule: 'daysSinceLastVisit >= 90' },
  BIRTH:  { id: 'birth',  label: '誕生月', rule: 'birthMonth === currentMonth' },
};

// ─── ポイント計算 (テナント設定で上書き可能) ───
export const POINT_RULES_DEFAULT = {
  yenPerPoint: 100,          // ¥100 = 1P
  pointPerYen: 1,            // 1P = ¥1 値引きに使える
  redeemMinPoints: 100,      // 100P から利用可
  bonusOnBirthMonth: 2.0,    // 誕生月は 2倍
  expireDays: 365,           // 365日 利用なしで失効
};

// ─── 自動配信トリガー ───
export const AUTO_MESSAGES = {
  PURCHASE_THANKS:  { id: 'purchase_thanks',  label: '購入直後のお礼',     trigger: 'on_purchase' },
  BIRTH_MONTH:      { id: 'birth_month',      label: '誕生月クーポン',     trigger: 'monthly_at_birth' },
  SLEEP_REVIVAL:    { id: 'sleep_revival',    label: '休眠掘り起こし',     trigger: 'weekly_if_sleep' },
  POINT_EXPIRING:   { id: 'point_expiring',   label: 'ポイント失効7日前', trigger: 'daily' },
};

// ─── 支払方法 enum (実店舗POS的) ───
export const PAYMENT_METHODS = {
  CASH:    { id: 'cash',    label: '現金' },
  CARD:    { id: 'card',    label: 'クレジット' },
  PAYPAY:  { id: 'paypay',  label: 'PayPay' },
  LINEPAY: { id: 'linepay', label: 'LINE Pay' },
  OTHER:   { id: 'other',   label: 'その他' },
};

// ─── 商品カテゴリ (テナント設定で上書き可能) ───
export const PRODUCT_CATEGORIES_DEFAULT = [
  { id: 'utsuwa',  label: '器' },
  { id: 'dougu',   label: '道具' },
  { id: 'nuno',    label: '布' },
  { id: 'kodougu', label: '古道具' },
  { id: 'other',   label: 'その他' },
];

// ─── スタッフロール ───
export const STAFF_ROLES = {
  OWNER:   { id: 'owner',   label: 'オーナー', perms: ['*'] },
  STAFF:   { id: 'staff',   label: 'スタッフ', perms: ['customer:read', 'customer:write', 'purchase:write', 'product:read', 'message:send'] },
};

// ─── ドキュメント型定義 (JSDoc) ────────────────────────────────────────────

/**
 * @typedef {Object} Tenant
 * @property {string} id
 * @property {string} name              店名
 * @property {string} createdAt         ISO
 * @property {Object} settings
 * @property {Object} settings.point    POINT_RULES_DEFAULT を上書き
 * @property {Object} settings.line     LINE設定 (channelId, channelSecret, channelAccessToken, liffId)
 * @property {Array}  settings.categories
 */

/**
 * @typedef {Object} Customer
 * @property {string} id                短ID (例: c_abc123)
 * @property {string} lineUserId        LINE userId (友だち追加時に取得)
 * @property {string} displayName       LINE表示名 (デフォルト)
 * @property {string} realName          スタッフが入力する本名
 * @property {string} furigana
 * @property {string} phone
 * @property {string} email
 * @property {string} address
 * @property {string|null} birthdate    YYYY-MM-DD (年は任意)
 * @property {string} note              店長メモ (誰でも見える)
 * @property {string[]} tags            ['vip', 'oribe_fan', ...]
 * @property {number} ltv               累計購入額
 * @property {number} visits            来店回数
 * @property {number} points            保有ポイント
 * @property {string} firstVisitAt
 * @property {string} lastVisitAt
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Purchase
 * @property {string} id
 * @property {string} customerId
 * @property {string} purchasedAt       ISO datetime
 * @property {Array<PurchaseLine>} lines
 * @property {number} subtotal
 * @property {number} discount          ポイント利用 + クーポン値引
 * @property {number} pointsUsed
 * @property {number} pointsEarned
 * @property {number} total
 * @property {string} paymentMethod     PAYMENT_METHODS.id
 * @property {string} staffId
 * @property {string} note              贈答・包装等のメモ
 * @property {boolean} isGift
 * @property {string} createdAt
 */

/**
 * @typedef {Object} PurchaseLine
 * @property {string} productId
 * @property {string} productName       スナップショット (商品改名後も追跡可能に)
 * @property {string} category
 * @property {number} unitPrice
 * @property {number} qty
 * @property {number} subtotal
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {string} maker             作家名
 * @property {string} category          PRODUCT_CATEGORIES.id
 * @property {number} price
 * @property {number} cost              原価 (粗利計算用)
 * @property {string} icon              絵文字 (UIサンプル用、後で画像URL対応)
 * @property {number} stock             現在在庫
 * @property {number} stockBase         基準在庫 (棚いっぱい時の量)
 * @property {string} unit              点 / 膳 / m / etc.
 * @property {string} note
 * @property {string[]} tags            ['shinki', 'oribe', ...]
 * @property {boolean} active
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Staff
 * @property {string} id
 * @property {string} name
 * @property {string} role              STAFF_ROLES.id
 * @property {string} createdAt
 */

/**
 * @typedef {Object} MessageLog
 * @property {string} id
 * @property {string} customerId
 * @property {'in'|'out'} direction
 * @property {'auto'|'manual'|'segment'} kind
 * @property {string} text
 * @property {string} triggerId         AUTO_MESSAGES.id (自動の場合)
 * @property {string} sentAt
 * @property {string} staffId           手動配信の場合
 * @property {'sent'|'failed'|'read'} status
 */

/**
 * @typedef {Object} Coupon
 * @property {string} id
 * @property {string} code
 * @property {string} label
 * @property {'percent'|'amount'} kind
 * @property {number} value
 * @property {string} expireAt
 * @property {string[]} customerIds     紐づくお客 (誕生日クーポン等)
 * @property {boolean} used
 * @property {string} usedAt
 * @property {string} createdAt
 */

// ─── Firestore パス helper ─────────────────────────────────────────
export const paths = {
  tenant:       (t)                  => `tenants/${t}`,
  customers:    (t)                  => `tenants/${t}/customers`,
  customer:     (t, id)              => `tenants/${t}/customers/${id}`,
  purchases:    (t)                  => `tenants/${t}/purchases`,
  purchase:     (t, id)              => `tenants/${t}/purchases/${id}`,
  products:     (t)                  => `tenants/${t}/products`,
  product:      (t, id)              => `tenants/${t}/products/${id}`,
  staff:        (t)                  => `tenants/${t}/staff`,
  messages:     (t)                  => `tenants/${t}/messages`,
  coupons:      (t)                  => `tenants/${t}/coupons`,
  customerCoupons: (t, customerId)   => `tenants/${t}/customers/${customerId}/coupons`,
};

// ─── 集計用 ヘルパー ─────────────────────────────────────────────
export function classifyCustomer(c, now = new Date()) {
  const tags = new Set(c.tags || []);
  const ltv = c.ltv || 0;
  const visits = c.visits || 0;
  const last = c.lastVisitAt ? new Date(c.lastVisitAt) : null;
  const daysSince = last ? Math.floor((now - last) / 86400000) : 9999;
  const createdDays = c.createdAt ? Math.floor((now - new Date(c.createdAt)) / 86400000) : 0;

  if (ltv >= 50000) tags.add('vip');
  else tags.delete('vip');
  if (visits >= 5) tags.add('regul'); else tags.delete('regul');
  if (visits <= 1 && createdDays <= 30) tags.add('new'); else tags.delete('new');
  if (daysSince >= 90) tags.add('sleep'); else tags.delete('sleep');

  if (c.birthdate) {
    const bMonth = parseInt(c.birthdate.slice(5, 7), 10);
    if (bMonth === now.getMonth() + 1) tags.add('birth'); else tags.delete('birth');
  }
  return [...tags];
}

export function calcEarnedPoints(amount, customer, rules = POINT_RULES_DEFAULT, now = new Date()) {
  const base = Math.floor(amount / rules.yenPerPoint);
  const isBirthMonth = customer.birthdate &&
    parseInt(customer.birthdate.slice(5, 7), 10) === now.getMonth() + 1;
  return isBirthMonth ? Math.floor(base * rules.bonusOnBirthMonth) : base;
}
