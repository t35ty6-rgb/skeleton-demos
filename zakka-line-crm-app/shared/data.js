/**
 * データ層 抽象化レイヤー
 *
 * デフォルトは localStorage 駆動 (商談前 / オフラインデモ用)。
 * 商談後、Firebase Firestore 接続に切替可能 (FirestoreAdapter を実装)。
 *
 * すべての I/O は async/Promise で統一しており、後で Firestore に置換しても呼び出し側は変更不要。
 */

import { paths, classifyCustomer, calcEarnedPoints, POINT_RULES_DEFAULT } from './schema.js';

// ─── アダプタ I/F ────────────────────────────────────────────
class Adapter {
  async get(collection, id)            { throw new Error('not implemented'); }
  async list(collection, query = {})   { throw new Error('not implemented'); }
  async set(collection, id, data)      { throw new Error('not implemented'); }
  async update(collection, id, patch)  { throw new Error('not implemented'); }
  async delete(collection, id)         { throw new Error('not implemented'); }
  onChange(collection, callback)       { return () => {}; }
}

// ─── localStorage 実装 ────────────────────────────────────────
class LocalAdapter extends Adapter {
  constructor(prefix = 'zakka-crm') { super(); this.prefix = prefix; this.subs = new Map(); }
  _key(col) { return `${this.prefix}::${col}`; }
  _read(col) {
    const raw = localStorage.getItem(this._key(col));
    return raw ? JSON.parse(raw) : {};
  }
  _write(col, obj) {
    localStorage.setItem(this._key(col), JSON.stringify(obj));
    const subs = this.subs.get(col) || [];
    subs.forEach(cb => { try { cb(); } catch(e) { console.error(e); } });
  }
  async get(col, id)            { return this._read(col)[id] || null; }
  async list(col, query = {})   {
    const all = Object.values(this._read(col));
    let res = all;
    if (query.where) {
      res = res.filter(d => Object.entries(query.where).every(([k, v]) => d[k] === v));
    }
    if (query.orderBy) {
      const [field, dir = 'asc'] = Array.isArray(query.orderBy) ? query.orderBy : [query.orderBy];
      res.sort((a, b) => {
        const av = a[field] ?? ''; const bv = b[field] ?? '';
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    if (query.limit) res = res.slice(0, query.limit);
    return res;
  }
  async set(col, id, data) {
    const all = this._read(col);
    all[id] = { ...data, id };
    this._write(col, all);
    return all[id];
  }
  async update(col, id, patch) {
    const all = this._read(col);
    if (!all[id]) throw new Error(`Not found: ${col}/${id}`);
    all[id] = { ...all[id], ...patch, updatedAt: new Date().toISOString() };
    this._write(col, all);
    return all[id];
  }
  async delete(col, id) {
    const all = this._read(col);
    delete all[id];
    this._write(col, all);
  }
  onChange(col, cb) {
    if (!this.subs.has(col)) this.subs.set(col, []);
    this.subs.get(col).push(cb);
    return () => {
      const arr = this.subs.get(col) || [];
      this.subs.set(col, arr.filter(f => f !== cb));
    };
  }
  async _wipeAll() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix + '::'))
      .forEach(k => localStorage.removeItem(k));
  }
}

// ─── Firestore 実装 雛形 (商談後に有効化) ─────────────────────
// import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, query as fbQuery, where, orderBy } from 'firebase/firestore';
// class FirestoreAdapter extends Adapter { ... }

// ─── リポジトリ (ビジネスロジック層) ─────────────────────────
export class Repo {
  constructor({ tenantId, adapter }) {
    this.tenantId = tenantId;
    this.adapter = adapter || new LocalAdapter(`zakka-crm:${tenantId}`);
  }

  // ── 顧客 ─────────────────────────
  async getCustomer(id)              { return this.adapter.get('customers', id); }
  async listCustomers(q = {})        { return this.adapter.list('customers', q); }
  async saveCustomer(c) {
    const id = c.id || _id('c');
    const now = new Date().toISOString();
    const draft = {
      ltv: 0, visits: 0, points: 0, tags: [],
      createdAt: now, updatedAt: now,
      ...c, id,
    };
    draft.tags = classifyCustomer(draft);
    return this.adapter.set('customers', id, draft);
  }
  async patchCustomer(id, patch)     { return this.adapter.update('customers', id, patch); }
  async deleteCustomer(id)           { return this.adapter.delete('customers', id); }

  // ── 商品 ─────────────────────────
  async getProduct(id)               { return this.adapter.get('products', id); }
  async listProducts(q = {})         { return this.adapter.list('products', q); }
  async saveProduct(p) {
    const id = p.id || _id('p');
    const now = new Date().toISOString();
    const draft = {
      stock: 0, stockBase: 0, active: true, tags: [],
      createdAt: now, updatedAt: now,
      ...p, id,
    };
    return this.adapter.set('products', id, draft);
  }
  async patchProduct(id, patch)      { return this.adapter.update('products', id, patch); }

  // ── 購入 ─────────────────────────
  async listPurchases(q = {})        { return this.adapter.list('purchases', q); }
  async listPurchasesByCustomer(customerId) {
    // 複合 Firestore index 不要のため orderBy をクライアント側で
    const items = await this.adapter.list('purchases', { where: { customerId } });
    return items.sort((a, b) => (b.purchasedAt || '').localeCompare(a.purchasedAt || ''));
  }

  /**
   * 購入を記録 (在庫減算・ポイント加算・顧客集計更新・自動メッセージ送信トリガー)
   * 本番Firestore では トランザクション+CF にする。localStorage 版は順次実行。
   */
  async recordPurchase({ customerId, lines, paymentMethod, pointsUsed = 0, note = '', isGift = false, staffId = 's_demo' }, opts = {}) {
    const customer = await this.getCustomer(customerId);
    if (!customer) throw new Error('Customer not found: ' + customerId);

    const settings = await this.getSettings();
    const rules = { ...POINT_RULES_DEFAULT, ...(settings?.point || {}) };

    // 各 line をスナップショット (商品名・カテゴリ・単価)
    const expandedLines = [];
    for (const ln of lines) {
      const p = await this.getProduct(ln.productId);
      if (!p) throw new Error('Product not found: ' + ln.productId);
      expandedLines.push({
        productId: p.id,
        productName: p.name,
        category: p.category,
        unitPrice: ln.unitPrice ?? p.price,
        qty: ln.qty,
        subtotal: (ln.unitPrice ?? p.price) * ln.qty,
      });
    }
    const subtotal = expandedLines.reduce((s, l) => s + l.subtotal, 0);
    const pointDiscount = Math.min(pointsUsed, customer.points || 0);
    const total = Math.max(0, subtotal - pointDiscount);
    const pointsEarned = calcEarnedPoints(total, customer, rules);

    const id = _id('pu');
    const now = new Date().toISOString();
    const purchase = {
      id, customerId, purchasedAt: now,
      lines: expandedLines,
      subtotal, discount: pointDiscount, pointsUsed: pointDiscount, pointsEarned,
      total, paymentMethod, staffId, note, isGift,
      createdAt: now,
    };
    await this.adapter.set('purchases', id, purchase);

    // 在庫減算
    for (const ln of expandedLines) {
      const p = await this.getProduct(ln.productId);
      await this.patchProduct(ln.productId, { stock: Math.max(0, (p.stock || 0) - ln.qty) });
    }

    // 顧客集計更新
    const newPoints = (customer.points || 0) - pointDiscount + pointsEarned;
    const newLtv = (customer.ltv || 0) + total;
    const newVisits = (customer.visits || 0) + 1;
    const draft = {
      ...customer,
      points: newPoints, ltv: newLtv, visits: newVisits,
      lastVisitAt: now,
      firstVisitAt: customer.firstVisitAt || now,
      updatedAt: now,
    };
    draft.tags = classifyCustomer(draft);
    await this.adapter.set('customers', customerId, draft);

    // 自動メッセージ送信ログ (本番では Messaging API push 呼び出し)
    if (!opts.skipAutoMessage) {
      await this.logMessage({
        customerId, direction: 'out', kind: 'auto',
        triggerId: 'purchase_thanks',
        text: `${customer.realName || customer.displayName}さま、本日はありがとうございました。${pointsEarned}P を加算しました。現在の残高は ${newPoints}P です。`,
        status: 'sent',
      });
    }

    return { purchase, customer: draft };
  }

  // ── メッセージ ───────────────────
  async listMessages(q = {})         { return this.adapter.list('messages', q); }
  async listMessagesByCustomer(customerId) {
    const items = await this.adapter.list('messages', { where: { customerId } });
    return items.sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
  }
  async logMessage(m) {
    const id = _id('m');
    const now = new Date().toISOString();
    return this.adapter.set('messages', id, { sentAt: now, ...m, id });
  }

  // ── スタッフ ─────────────────────
  async listStaff(q = {})            { return this.adapter.list('staff', q); }
  async saveStaff(s) {
    const id = s.id || _id('s');
    return this.adapter.set('staff', id, { createdAt: new Date().toISOString(), role: 'staff', ...s, id });
  }

  // ── 取り置き ─────────────────────
  async listHolds(q = {})            { return this.adapter.list('holds', q); }
  async saveHold(h) {
    const id = h.id || _id('h');
    const now = new Date().toISOString();
    return this.adapter.set('holds', id, { status: 'requested', createdAt: now, ...h, id });
  }
  async patchHold(id, patch)         { return this.adapter.update('holds', id, patch); }

  // ── レビュー ─────────────────────
  async listReviews(q = {})          { return this.adapter.list('reviews', q); }
  async saveReview(r) {
    const id = r.id || _id('r');
    return this.adapter.set('reviews', id, { status: 'pending', createdAt: new Date().toISOString(), ...r, id });
  }
  async patchReview(id, patch)       { return this.adapter.update('reviews', id, patch); }

  // ── 領収書 ───────────────────────
  async saveReceipt(r) {
    const id = r.id || _id('rc');
    return this.adapter.set('receipts', id, { issuedAt: new Date().toISOString(), ...r, id });
  }
  async listReceipts(q = {})         { return this.adapter.list('receipts', q); }

  // ── 設定 ─────────────────────────
  async getSettings()                { return (await this.adapter.get('settings', 'main')) || {}; }
  async saveSettings(s)              { return this.adapter.set('settings', 'main', s); }

  // ── 集計 ─────────────────────────
  async dashboardKPI({ from, to } = {}) {
    const purchases = await this.listPurchases({ orderBy: ['purchasedAt', 'desc'] });
    const customers = await this.listCustomers();
    const filtered = (from || to) ? purchases.filter(p => {
      const t = p.purchasedAt;
      return (!from || t >= from) && (!to || t <= to);
    }) : purchases;
    const sales = filtered.reduce((s, p) => s + p.total, 0);
    const visits = filtered.length;
    const customerSet = new Set(filtered.map(p => p.customerId));
    const aov = visits ? Math.round(sales / visits) : 0;
    const regulars = [...customerSet].filter(cid => {
      const c = customers.find(x => x.id === cid);
      return c && (c.tags || []).includes('regul');
    }).length;
    return { sales, visits, aov, regulars, customerCount: customerSet.size };
  }

  async dailySalesSeries(days = 14) {
    const purchases = await this.listPurchases();
    const series = [];
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0,10);
      const sum = purchases
        .filter(p => p.purchasedAt.startsWith(dStr))
        .reduce((s, p) => s + p.total, 0);
      series.push({ date: dStr, sales: sum });
    }
    return series;
  }

  async todaysAttention() {
    const customers = await this.listCustomers();
    const now = new Date();
    return customers
      .map(c => ({ ...c, daysSince: c.lastVisitAt ? Math.floor((now - new Date(c.lastVisitAt))/86400000) : null }))
      .filter(c => c.tags?.includes('vip') || c.tags?.includes('sleep') || c.tags?.includes('birth'))
      .sort((a, b) => (b.ltv || 0) - (a.ltv || 0))
      .slice(0, 5);
  }

  // ── スタッフ別 売上集計 ─────────────────────
  async salesByStaff({ days = 30 } = {}) {
    const since = new Date(); since.setDate(since.getDate() - days);
    const purchases = (await this.listPurchases()).filter(p => new Date(p.purchasedAt) >= since);
    const staffList = await this.listStaff();
    const map = new Map();
    for (const p of purchases) {
      const m = map.get(p.staffId) || { staffId: p.staffId, sales: 0, count: 0 };
      m.sales += p.total; m.count++;
      map.set(p.staffId, m);
    }
    return [...map.values()].map(m => ({
      ...m,
      name: staffList.find(s => s.id === m.staffId)?.name || '不明',
      aov: m.count ? Math.round(m.sales / m.count) : 0,
    })).sort((a, b) => b.sales - a.sales);
  }

  // ── 時間帯別 売上 (0-23時) ─────────────────────
  async salesByHour({ days = 30 } = {}) {
    const since = new Date(); since.setDate(since.getDate() - days);
    const purchases = (await this.listPurchases()).filter(p => new Date(p.purchasedAt) >= since);
    const buckets = new Array(24).fill(0).map(() => ({ sales: 0, count: 0 }));
    for (const p of purchases) {
      const h = new Date(p.purchasedAt).getHours();
      buckets[h].sales += p.total; buckets[h].count++;
    }
    return buckets.map((b, h) => ({ hour: h, sales: b.sales, count: b.count }));
  }

  // ── カテゴリ別 売上 ───────────────────────
  async salesByCategory({ days = 30 } = {}) {
    const since = new Date(); since.setDate(since.getDate() - days);
    const purchases = (await this.listPurchases()).filter(p => new Date(p.purchasedAt) >= since);
    const map = new Map();
    for (const p of purchases) {
      for (const line of (p.lines || [])) {
        const m = map.get(line.category) || { category: line.category, sales: 0, qty: 0 };
        m.sales += line.subtotal || 0;
        m.qty += line.qty || 0;
        map.set(line.category, m);
      }
    }
    return [...map.values()].sort((a, b) => b.sales - a.sales);
  }

  // ── 売れ筋商品 TOP ─────────────────────────
  async topProducts({ days = 30, limit = 10 } = {}) {
    const since = new Date(); since.setDate(since.getDate() - days);
    const purchases = (await this.listPurchases()).filter(p => new Date(p.purchasedAt) >= since);
    const map = new Map();
    for (const p of purchases) {
      for (const line of (p.lines || [])) {
        const m = map.get(line.productId) || { productId: line.productId, name: line.productName, sales: 0, qty: 0 };
        m.sales += line.subtotal || 0;
        m.qty += line.qty || 0;
        map.set(line.productId, m);
      }
    }
    return [...map.values()].sort((a, b) => b.sales - a.sales).slice(0, limit);
  }

  async segmentCount(segmentFn) {
    const customers = await this.listCustomers();
    return customers.filter(segmentFn).length;
  }

  // ── 目標進捗 ─────────────────────
  async goalProgress() {
    const settings = await this.getSettings();
    const goals = settings.goals || { daily: 30000, weekly: 200000, monthly: 800000 };
    const purchases = await this.listPurchases();
    const now = new Date();
    const sod = new Date(now); sod.setHours(0,0,0,0);
    const sow = new Date(sod); sow.setDate(sow.getDate() - sod.getDay());
    const som = new Date(sod.getFullYear(), sod.getMonth(), 1);
    const sum = (since) => purchases.filter(p => new Date(p.purchasedAt) >= since).reduce((s, p) => s + p.total, 0);
    return {
      daily:   { actual: sum(sod), target: goals.daily   },
      weekly:  { actual: sum(sow), target: goals.weekly  },
      monthly: { actual: sum(som), target: goals.monthly },
    };
  }

  // ── AI おすすめ (ヒューリスティック) ─────────
  async aiSuggestions(customerId) {
    const c = await this.getCustomer(customerId);
    if (!c) return [];
    const tags = new Set(c.tags || []);
    const purchases = await this.listPurchasesByCustomer(customerId);
    const products = await this.listProducts({ where: { active: true } });
    const settings = await this.getSettings();
    const now = new Date();

    const boughtIds = new Set();
    const catCount = new Map();
    const makerCount = new Map();
    purchases.forEach(p => p.lines.forEach(l => {
      boughtIds.add(l.productId);
      catCount.set(l.category, (catCount.get(l.category) || 0) + l.qty);
      const pr = products.find(x => x.id === l.productId);
      if (pr?.maker) makerCount.set(pr.maker, (makerCount.get(pr.maker) || 0) + l.qty);
    }));

    const favCategory = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const favMaker = [...makerCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

    const suggestions = [];

    // 1. お気に入り作家の新作
    if (favMaker) {
      const fromFav = products.filter(p => p.maker === favMaker && !boughtIds.has(p.id) && p.stock > 0);
      if (fromFav[0]) {
        suggestions.push({
          iconKey: 'sparkles',
          reason: `${favMaker} さんの新作`,
          productName: fromFav[0].name,
          productId: fromFav[0].id,
          confidence: 'high',
          why: `${c.realName || c.displayName}さまは ${favMaker} さんの作品を ${makerCount.get(favMaker)}点 お持ちです`,
        });
      }
    }

    // 2. お気に入りジャンル
    if (favCategory) {
      const fromCat = products.filter(p => p.category === favCategory && !boughtIds.has(p.id) && p.stock > 0);
      if (fromCat[0]) {
        suggestions.push({
          iconKey: 'shoppingBag',
          reason: `お好みの ${this._catLabel(favCategory, settings)} ジャンル`,
          productName: fromCat[0].name,
          productId: fromCat[0].id,
          confidence: 'mid',
          why: `${this._catLabel(favCategory, settings)} を ${catCount.get(favCategory)}点 お買い上げの実績`,
        });
      }
    }

    // 3. 贈答多めなら 桐箱
    if (tags.has('gift_user')) {
      const giftProduct = products.find(p => (p.tags || []).includes('gift') && p.stock > 0);
      if (giftProduct) {
        suggestions.push({
          iconKey: 'giftBox2',
          reason: 'ご贈答に',
          productName: giftProduct.name,
          productId: giftProduct.id,
          confidence: 'mid',
          why: 'ご贈答利用が多いお客さまです',
        });
      }
    }

    // 4. お誕生月クーポン案内
    if (c.birthdate) {
      const bMonth = parseInt(c.birthdate.slice(5, 7));
      if (bMonth === now.getMonth() + 1) {
        suggestions.push({
          iconKey: 'cake',
          reason: 'お声がけ',
          productName: 'お誕生月クーポンのご案内',
          confidence: 'high',
          why: '今月お誕生月、 まだ10%OFFクーポン未使用',
        });
      }
    }

    // 5. 休眠 → 再訪誘導
    if (tags.has('sleep')) {
      const days = c.lastVisitAt ? Math.floor((now - new Date(c.lastVisitAt))/86400000) : 0;
      suggestions.push({
        iconKey: 'award',
        reason: 'お声がけ',
        productName: 'お久しぶりですね、 一言ご挨拶を',
        confidence: 'high',
        why: `${days}日ぶりのご来店です`,
      });
    }

    return suggestions.slice(0, 4);
  }

  _catLabel(catId, settings) {
    return (settings.categories || []).find(c => c.id === catId)?.label || catId;
  }

  // ── 購読 ─────────────────────────
  onCustomersChange(cb) { return this.adapter.onChange('customers', cb); }
  onPurchasesChange(cb) { return this.adapter.onChange('purchases', cb); }
  onProductsChange(cb)  { return this.adapter.onChange('products', cb); }
  onMessagesChange(cb)  { return this.adapter.onChange('messages', cb); }
  onHoldsChange(cb)     { return this.adapter.onChange('holds', cb); }
}

// ─── ID 生成 ─────────────────────────────────────────
function _id(prefix) {
  const ts = Date.now().toString(36).slice(-5);
  const r = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${ts}${r}`;
}

// ─── factory ─────────────────────────────────────────
/**
 * モードを自動判定して Repo を返す:
 * - production (*.web.app / *.firebaseapp.com / 本番カスタムドメイン) → Firestore
 * - localhost / file:// / その他 → localStorage
 * URL パラメータ ?mode=local / ?mode=fb で明示切替可能
 */
export async function createRepo(tenantId) {
  const params = new URLSearchParams(globalThis.location?.search || '');
  const forced = params.get('mode');
  const host = globalThis.location?.hostname || '';
  const isProd =
    host.endsWith('.web.app') ||
    host.endsWith('.firebaseapp.com') ||
    host.endsWith('.skeleton-inc.jp') ||
    host.endsWith('.nouto.app');
  const useFirestore = forced === 'fb' || (forced !== 'local' && isProd);

  let adapter;
  if (useFirestore) {
    const { FirestoreAdapter } = await import('./firebase-adapter.js');
    adapter = new FirestoreAdapter(tenantId);
  } else {
    adapter = new LocalAdapter(`zakka-crm:${tenantId}`);
  }
  return new Repo({ tenantId, adapter });
}

export { LocalAdapter };
