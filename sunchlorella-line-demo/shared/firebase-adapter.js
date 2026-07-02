/**
 * サン・クロレラ 統合LINE OS - Firestore Adapter
 *
 * shared/data.js の LocalAdapter と同じ非同期 I/F を Firestore で実装する。
 * multi-tenant: `sunchlorella_tenants/{tenantId}/{collection}/{docId}` に格納。
 *
 * Skel·EC (旧skel_ec_*) / MEI (mei_tenants) と衝突しない prefix を採用。
 * 本番専用 Firebase project へ移行する時は Firestore export → import で移行可能。
 *
 * 使用 SDK: Firebase Web SDK v10 (ES modules, CDN)。
 */

import {
  initializeApp, getApps
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  collection, query as fbQuery, where, orderBy, limit as fbLimit,
  onSnapshot, initializeFirestore, serverTimestamp, writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  signInWithCustomToken,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { getConfig } from './config.js';

/* ─── Prefix (multi-tenant SSOT) ─── */
export const TENANT_PREFIX = 'sunchlorella_tenants';

/**
 * Firebase を1度だけ初期化する。
 * memory: feedback_firestore_webchannel_blocked_longpolling.md
 *   Chrome拡張・NW で WebChannel が silent block されるので長ポーリング自動検知必須。
 */
let _app, _db, _auth;
export function ensureFirebase() {
  if (_app && _db) return { app: _app, db: _db, auth: _auth };
  const cfg = getConfig();
  if (!cfg.firebase?.apiKey) throw new Error('firebase config missing');
  _app  = getApps()[0] || initializeApp(cfg.firebase);
  _db   = initializeFirestore(_app, { experimentalAutoDetectLongPolling: true });
  _auth = getAuth(_app);
  return { app: _app, db: _db, auth: _auth };
}

export class FirestoreAdapter {
  constructor(tenantId) {
    if (!tenantId) throw new Error('tenantId required');
    const { db } = ensureFirebase();
    this.db = db;
    this.tenantId = tenantId;
    this.snapshotUnsubs = new Map();
  }

  _basePath(col, id) {
    const base = `${TENANT_PREFIX}/${this.tenantId}/${col}`;
    return id ? `${base}/${id}` : base;
  }

  async get(col, id) {
    const snap = await getDoc(doc(this.db, this._basePath(col, id)));
    return snap.exists() ? snap.data() : null;
  }

  async list(col, query = {}) {
    let q = collection(this.db, this._basePath(col));
    const constraints = [];
    if (query.where) {
      Object.entries(query.where).forEach(([k, v]) =>
        constraints.push(where(k, '==', v)));
    }
    if (query.orderBy) {
      const [field, dir = 'asc'] = Array.isArray(query.orderBy) ? query.orderBy : [query.orderBy];
      constraints.push(orderBy(field, dir));
    }
    if (query.limit) constraints.push(fbLimit(query.limit));
    if (constraints.length) q = fbQuery(q, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  }

  async set(col, id, data) {
    if (!id) throw new Error('id required');
    const payload = { ...data, id, updatedAt: Date.now() };
    if (data.createdAt == null) payload.createdAt = Date.now();
    await setDoc(doc(this.db, this._basePath(col, id)), payload);
    return payload;
  }

  async update(col, id, patch) {
    const ref = doc(this.db, this._basePath(col, id));
    await updateDoc(ref, { ...patch, updatedAt: Date.now() });
    const cur = await getDoc(ref);
    return cur.data();
  }

  async delete(col, id) {
    await deleteDoc(doc(this.db, this._basePath(col, id)));
  }

  /** batch upsert (顧客CSVインポート等) */
  async batchSet(col, records) {
    const chunks = [];
    for (let i = 0; i < records.length; i += 400) chunks.push(records.slice(i, i + 400));
    for (const chunk of chunks) {
      const batch = writeBatch(this.db);
      chunk.forEach(r => {
        if (!r.id) throw new Error('id required in batchSet');
        batch.set(doc(this.db, this._basePath(col, r.id)), { ...r, updatedAt: Date.now() });
      });
      await batch.commit();
    }
  }

  /**
   * Realtime subscription (onSnapshot ラッパー)。
   * returns unsubscribe() 関数。
   */
  onChange(col, cb) {
    const key = col;
    if (this.snapshotUnsubs.has(key)) this.snapshotUnsubs.get(key)();
    const q = collection(this.db, this._basePath(col));
    const unsub = onSnapshot(q,
      () => cb(),
      err => console.error(`[Firestore] onSnapshot(${col}) error`, err),
    );
    this.snapshotUnsubs.set(key, unsub);
    return () => {
      unsub();
      this.snapshotUnsubs.delete(key);
    };
  }

  /**
   * 全 collection wipe (デモ用途)。 本番顧客用途では使わない。
   */
  async _wipeAll() {
    const cols = ['reps','customers','products','orders','subscriptions','visits','messages','broadcasts','settings'];
    for (const c of cols) {
      const items = await this.list(c);
      const batch = writeBatch(this.db);
      items.forEach(x => batch.delete(doc(this.db, this._basePath(c, x.id))));
      if (items.length) await batch.commit();
    }
  }
}

/* ─── Auth Wrapper ─── */
export const fireAuth = {
  async signInEmail(email, password) {
    const { auth } = ensureFirebase();
    return signInWithEmailAndPassword(auth, email, password);
  },
  async signInCustomToken(token) {
    const { auth } = ensureFirebase();
    return signInWithCustomToken(auth, token);
  },
  async signOut() {
    const { auth } = ensureFirebase();
    return signOut(auth);
  },
  onChange(cb) {
    const { auth } = ensureFirebase();
    return onAuthStateChanged(auth, cb);
  },
  currentUser() {
    return ensureFirebase().auth.currentUser;
  },
};

/* ─── Callable helper (Cloud Functions httpsCallable 経由) ─── */
/**
 * Cloud Functions 呼出。
 * - firebase Auth 済みなら Bearer IDToken を付ける
 * - LIFF 経由 (customer 画面) なら opts.liffIdToken を渡す → x-liff-id-token
 * - tenant は必ずURLに載せる (multi-tenant)
 */
export async function callFunction(name, payload = {}, opts = {}) {
  const cfg = getConfig();
  const user = fireAuth.currentUser();
  const idToken = user ? await user.getIdToken() : null;
  const url = `${cfg.functions.baseUrl}/${name}?tenant=${encodeURIComponent(cfg.tenantId)}`;
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = 'Bearer ' + idToken;
  if (opts.liffIdToken) headers['x-liff-id-token'] = opts.liffIdToken;
  const r = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const text = await r.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { text }; }
  if (!r.ok) {
    const err = new Error(body.error || `HTTP ${r.status}`);
    err.status = r.status; err.body = body;
    throw err;
  }
  return body;
}
