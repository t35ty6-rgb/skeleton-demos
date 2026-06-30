/**
 * Firebase Firestore Adapter
 *
 * shared/data.js の LocalAdapter と同じ I/F を Firestore で実装する。
 * 雑貨LINEツール (MEI) は、既存の Skel·EC project (skeleton-skel-ec-2606) に
 * collection prefix `mei_` で間借りする (Skel·EC の collection には影響なし)。
 *
 * 商談後 MEI 専用 Firebase project が確保できたら、
 * Firestore export/import で移行できる設計。
 *
 * Collection layout:
 *   mei_tenants/{tenantId}                                — テナント設定
 *   mei_tenants/{tenantId}/customers/{customerId}         — 顧客カルテ
 *   mei_tenants/{tenantId}/purchases/{purchaseId}         — 購入記録
 *   mei_tenants/{tenantId}/products/{productId}           — 商品マスタ
 *   mei_tenants/{tenantId}/staff/{staffId}                — スタッフ
 *   mei_tenants/{tenantId}/messages/{messageId}           — LINEメッセージログ
 *   mei_tenants/{tenantId}/coupons/{couponId}             — クーポン
 *   mei_tenants/{tenantId}/settings/main                  — テナント設定
 */

import {
  initializeApp, getApps
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query as fbQuery, where, orderBy, limit as fbLimit, onSnapshot,
  initializeFirestore, persistentLocalCache
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const FIREBASE_CONFIG = {
  projectId: "skeleton-skel-ec-2606",
  appId: "1:714352406083:web:5a63e15dcbf6ba185f6ef6",
  storageBucket: "skeleton-skel-ec-2606.firebasestorage.app",
  apiKey: "AIzaSyBHEuEACAfmJcqzAOv-hGA54ULajJKj9wc",
  authDomain: "skeleton-skel-ec-2606.firebaseapp.com",
  messagingSenderId: "714352406083",
};

// memory: feedback_firestore_webchannel_blocked_longpolling.md
// Chrome拡張やNW でWebChannel block されると onSnapshot だけ silent fail する。
// experimentalAutoDetectLongPolling 必須。
let _app, _db;
export function ensureFirebase() {
  if (_app) return { app: _app, db: _db };
  _app = getApps()[0] || initializeApp(FIREBASE_CONFIG);
  _db = initializeFirestore(_app, {
    experimentalAutoDetectLongPolling: true,
  });
  return { app: _app, db: _db };
}

const PREFIX = "mei_tenants";

/**
 * 雑貨LINEツール 用 Firestore Adapter
 *
 * @param {string} tenantId
 */
export class FirestoreAdapter {
  constructor(tenantId) {
    const { db } = ensureFirebase();
    this.db = db;
    this.tenantId = tenantId;
    this.subs = new Map();
  }

  _path(col, id) {
    const base = `${PREFIX}/${this.tenantId}/${col}`;
    return id ? `${base}/${id}` : base;
  }

  async get(col, id) {
    const snap = await getDoc(doc(this.db, this._path(col, id)));
    return snap.exists() ? snap.data() : null;
  }

  async list(col, query = {}) {
    let q = collection(this.db, this._path(col));
    const constraints = [];
    if (query.where) {
      Object.entries(query.where).forEach(([k, v]) => constraints.push(where(k, '==', v)));
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
    await setDoc(doc(this.db, this._path(col, id)), { ...data, id });
    return { ...data, id };
  }

  async update(col, id, patch) {
    const ref = doc(this.db, this._path(col, id));
    const current = (await getDoc(ref)).data() || {};
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await setDoc(ref, next);
    return next;
  }

  async delete(col, id) {
    await deleteDoc(doc(this.db, this._path(col, id)));
  }

  onChange(col, cb) {
    const key = col;
    if (this.subs.has(key)) return this.subs.get(key).unsubscribe;
    const q = collection(this.db, this._path(col));
    const unsub = onSnapshot(q, () => cb(), (err) => console.error('snapshot err', col, err));
    this.subs.set(key, { unsubscribe: unsub });
    return unsub;
  }

  async _wipeAll() {
    // 全collection wipe (デモ再投入用) — 順次削除
    const cols = ['customers', 'products', 'purchases', 'staff', 'messages', 'coupons', 'settings'];
    for (const c of cols) {
      const all = await this.list(c, {});
      for (const item of all) {
        await this.delete(c, item.id);
      }
    }
  }
}
