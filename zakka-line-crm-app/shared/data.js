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
    return this.adapter.list('purchases', { where: { customerId }, orderBy: ['purchasedAt', 'desc'] });
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
    return this.adapter.list('messages', { where: { customerId }, orderBy: ['sentAt', 'desc'] });
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

  async segmentCount(segmentFn) {
    const customers = await this.listCustomers();
    return customers.filter(segmentFn).length;
  }

  // ── 購読 ─────────────────────────
  onCustomersChange(cb) { return this.adapter.onChange('customers', cb); }
  onPurchasesChange(cb) { return this.adapter.onChange('purchases', cb); }
  onProductsChange(cb)  { return this.adapter.onChange('products', cb); }
  onMessagesChange(cb)  { return this.adapter.onChange('messages', cb); }
}

// ─── ID 生成 ─────────────────────────────────────────
function _id(prefix) {
  const ts = Date.now().toString(36).slice(-5);
  const r = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${ts}${r}`;
}

// ─── factory ─────────────────────────────────────────
export function createRepo(tenantId) {
  return new Repo({ tenantId, adapter: new LocalAdapter(`zakka-crm:${tenantId}`) });
}

export { LocalAdapter };
