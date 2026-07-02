/**
 * データ層 抽象化 — LocalStorage / Firestore の 2バックエンドをスイッチ
 *
 * `shared/config.js` の backend が 'local' なら LocalAdapter、
 * 'firebase' なら FirestoreAdapter を透過的に返す。 呼出側 (rep/customer/admin)
 * は同じ非同期 I/F (get/list/set/update/delete/onChange) を叩けばよい。
 *
 * 本番切替は setConfig({ backend:'firebase', tenantId:'xxx' }) の 1行で完了。
 */

import { getConfig } from './config.js';

const PREFIX = 'sunchlorella::v1';

/* ─── LocalStorage Adapter (デモ・オフライン用) ─── */
class LocalAdapter {
  constructor(tenantId) {
    this.tenantId = tenantId || 'demo';
    this.subs = new Map();
  }
  _ns(col) { return `${PREFIX}::${this.tenantId}::${col}`; }
  _read(col) {
    try { return JSON.parse(localStorage.getItem(this._ns(col)) || '{}'); }
    catch { return {}; }
  }
  _write(col, obj) {
    localStorage.setItem(this._ns(col), JSON.stringify(obj));
    const cbs = this.subs.get(col) || [];
    cbs.forEach(cb => { try { cb(); } catch(e) { console.error(e); } });
    window.dispatchEvent(new CustomEvent('sunchlorella:change', { detail: { col } }));
  }
  async get(col, id) { return this._read(col)[id] || null; }
  async list(col, query = {}) {
    let res = Object.values(this._read(col));
    if (query.where) res = res.filter(d =>
      Object.entries(query.where).every(([k, v]) => d[k] === v));
    if (query.orderBy) {
      const [field, dir = 'asc'] = Array.isArray(query.orderBy) ? query.orderBy : [query.orderBy];
      res.sort((a, b) => {
        const av = a[field] ?? ''; const bv = b[field] ?? '';
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ?  1 : -1;
        return 0;
      });
    }
    if (query.limit) res = res.slice(0, query.limit);
    return res;
  }
  async set(col, id, data) {
    const all = this._read(col);
    const now = Date.now();
    all[id] = { createdAt: all[id]?.createdAt || now, ...data, id, updatedAt: now };
    this._write(col, all);
    return all[id];
  }
  async update(col, id, patch) {
    const all = this._read(col);
    if (!all[id]) throw new Error(`${col}/${id} not found`);
    all[id] = { ...all[id], ...patch, id, updatedAt: Date.now() };
    this._write(col, all);
    return all[id];
  }
  async delete(col, id) {
    const all = this._read(col);
    delete all[id];
    this._write(col, all);
  }
  async batchSet(col, records) {
    for (const r of records) {
      if (!r.id) throw new Error('id required in batchSet');
      await this.set(col, r.id, r);
    }
  }
  onChange(col, cb) {
    if (!this.subs.has(col)) this.subs.set(col, []);
    this.subs.get(col).push(cb);
    const off = e => { if (!e || e.detail?.col === col) cb(); };
    window.addEventListener('sunchlorella:change', off);
    return () => {
      this.subs.set(col, (this.subs.get(col) || []).filter(x => x !== cb));
      window.removeEventListener('sunchlorella:change', off);
    };
  }
  reset() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(`${PREFIX}::${this.tenantId}::`))
      .forEach(k => localStorage.removeItem(k));
    this.subs.forEach(cbs => cbs.forEach(cb => cb()));
    window.dispatchEvent(new CustomEvent('sunchlorella:change'));
  }
  async _wipeAll() { this.reset(); }
}

/* ─── Adapter Factory ─── */
let _adapter = null;
async function ensureAdapter() {
  if (_adapter) return _adapter;
  const cfg = getConfig();
  if (cfg.backend === 'firebase') {
    const { FirestoreAdapter } = await import('./firebase-adapter.js');
    _adapter = new FirestoreAdapter(cfg.tenantId);
  } else {
    _adapter = new LocalAdapter(cfg.tenantId);
  }
  return _adapter;
}

/* ─── Public facade (呼出側は これしか触らない) ─── */
export const db = {
  async get(col, id)           { return (await ensureAdapter()).get(col, id); },
  async list(col, q = {})      { return (await ensureAdapter()).list(col, q); },
  async set(col, id, data)     { return (await ensureAdapter()).set(col, id, data); },
  async update(col, id, patch) { return (await ensureAdapter()).update(col, id, patch); },
  async delete(col, id)        { return (await ensureAdapter()).delete(col, id); },
  async batchSet(col, records) { return (await ensureAdapter()).batchSet(col, records); },
  onChange(col, cb) {
    let unsub = () => {};
    ensureAdapter().then(a => { unsub = a.onChange(col, cb); });
    return () => unsub();
  },
  async reset() {
    const a = await ensureAdapter();
    if (typeof a.reset === 'function') a.reset();
    else await a._wipeAll?.();
  },
  async _adapter() { return ensureAdapter(); },
};

/* ─── Session (端末ローカル: 現在の rep/customer) ─── */
export const session = {
  get repId()      { return localStorage.getItem(PREFIX + '::session::repId') || 'rep_kitano'; },
  set repId(v)     { localStorage.setItem(PREFIX + '::session::repId', v); },
  get customerId() { return localStorage.getItem(PREFIX + '::session::customerId') || 'cust_tanaka'; },
  set customerId(v){ localStorage.setItem(PREFIX + '::session::customerId', v); },
  clear() {
    localStorage.removeItem(PREFIX + '::session::repId');
    localStorage.removeItem(PREFIX + '::session::customerId');
  },
};

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
