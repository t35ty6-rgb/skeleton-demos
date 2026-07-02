/**
 * データ層 抽象化レイヤー (localStorage 駆動)
 *
 * すべての I/O は Promise。 後で Firebase Firestore に置換しても呼出側は変更不要。
 * 3画面 (rep / customer / admin) がこの1つの store を共有し、
 * 「販売員が受注→客画面に履歴が増える→本社KPIが動く」 を実現する。
 */

const PREFIX = 'sunchlorella::v1';

const subs = new Map();
function _key(col) { return `${PREFIX}::${col}`; }
function _read(col) {
  const raw = localStorage.getItem(_key(col));
  return raw ? JSON.parse(raw) : {};
}
function _write(col, obj) {
  localStorage.setItem(_key(col), JSON.stringify(obj));
  const cbs = subs.get(col) || [];
  cbs.forEach(cb => { try { cb(); } catch(e) { console.error(e); } });
  window.dispatchEvent(new CustomEvent('sunchlorella:change', { detail: { col } }));
}

export const db = {
  async get(col, id)          { return _read(col)[id] || null; },
  async list(col, query = {}) {
    let res = Object.values(_read(col));
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
  },
  async set(col, id, data) {
    const all = _read(col);
    all[id] = { ...data, id };
    _write(col, all);
    return all[id];
  },
  async update(col, id, patch) {
    const all = _read(col);
    if (!all[id]) throw new Error(`${col}/${id} not found`);
    all[id] = { ...all[id], ...patch, id };
    _write(col, all);
    return all[id];
  },
  async delete(col, id) {
    const all = _read(col);
    delete all[id];
    _write(col, all);
  },
  onChange(col, cb) {
    if (!subs.has(col)) subs.set(col, []);
    subs.get(col).push(cb);
    const off = e => { if (!e || e.detail?.col === col) cb(); };
    window.addEventListener('sunchlorella:change', off);
    return () => {
      subs.set(col, (subs.get(col) || []).filter(x => x !== cb));
      window.removeEventListener('sunchlorella:change', off);
    };
  },
  reset() {
    Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
    subs.forEach(cbs => cbs.forEach(cb => cb()));
    window.dispatchEvent(new CustomEvent('sunchlorella:change'));
  },
};

/* ─── 現在ログイン中の販売員/顧客 (デモ用: rep が誰か切替) ─── */
export const session = {
  get repId()    { return localStorage.getItem(PREFIX + '::session::repId') || 'rep_kitano'; },
  set repId(v)   { localStorage.setItem(PREFIX + '::session::repId', v); },
  get customerId() { return localStorage.getItem(PREFIX + '::session::customerId') || 'cust_tanaka'; },
  set customerId(v) { localStorage.setItem(PREFIX + '::session::customerId', v); },
};

/* ─── ID 生成 ─── */
export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
