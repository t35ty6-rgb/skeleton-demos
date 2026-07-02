/**
 * Fukutetsu Rally · データストア (localStorage / Firestore 切替)
 *
 * MEI と同じパターンで、 skel-ec-2606 project に collection prefix
 * `fukutetsu_` で間借り。契約後は 福鉄専用 project に export/import で移行可。
 *
 * Collection layout:
 *   fukutetsu_rallies/{rallyId}                            — ラリー設定
 *   fukutetsu_rallies/{rallyId}/participants/{userId}      — 参加者
 *   fukutetsu_rallies/{rallyId}/stamps/{stampId}           — 押印ログ
 *   fukutetsu_rallies/{rallyId}/fraud/{docId}              — 圏外読取試行
 *   fukutetsu_spots/{spotCode}                             — スポットマスタ
 *   fukutetsu_pushes/{pushId}                              — セグメント配信ログ
 *
 * memory: feedback_firestore_webchannel_blocked_longpolling
 *  → experimentalAutoDetectLongPolling 必須
 */

import {
  initializeApp, getApps
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc,
  query as fbQuery, where, orderBy, limit as fbLimit, onSnapshot, serverTimestamp,
  initializeFirestore
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const FIREBASE_CONFIG = {
  projectId: "skeleton-skel-ec-2606",
  appId: "1:714352406083:web:5a63e15dcbf6ba185f6ef6",
  storageBucket: "skeleton-skel-ec-2606.firebasestorage.app",
  apiKey: "AIzaSyBHEuEACAfmJcqzAOv-hGA54ULajJKj9wc",
  authDomain: "skeleton-skel-ec-2606.firebaseapp.com",
  messagingSenderId: "714352406083",
};

const RALLY_ID = "FT-2026-Summer";
const PREFIX = "fukutetsu_rallies";
const LS_STAMPS = "ftr01_stamps_v3";
const LS_USER = "ftr01_user_v3";

let _app, _db;
function ensureFirebase() {
  if (_app) return { app: _app, db: _db };
  _app = getApps()[0] || initializeApp(FIREBASE_CONFIG);
  _db = initializeFirestore(_app, { experimentalAutoDetectLongPolling: true });
  return { app: _app, db: _db };
}

// ────────────────────── LocalStore ──────────────────────
export class LocalStore {
  constructor(){ this.backend = "local"; this.rallyId = RALLY_ID; }
  async loadUser(){
    try { return JSON.parse(localStorage.getItem(LS_USER) || "null"); }
    catch(e){ return null; }
  }
  async saveUser(user){
    localStorage.setItem(LS_USER, JSON.stringify(user));
    return user;
  }
  async listStamps(userId){
    try { return JSON.parse(localStorage.getItem(LS_STAMPS) || "[]"); }
    catch(e){ return []; }
  }
  async saveStamp(userId, stamp){
    const list = await this.listStamps(userId);
    list.push(stamp);
    localStorage.setItem(LS_STAMPS, JSON.stringify(list));
    return stamp;
  }
  async clearStamps(userId){
    localStorage.setItem(LS_STAMPS, "[]");
  }
  async logFraud(entry){
    // localStorage は 匿名不正ログ 保存しない (端末個別のため)
    return null;
  }
}

// ────────────────────── FirestoreStore ──────────────────────
export class FirestoreStore {
  constructor(){
    this.backend = "firestore";
    this.rallyId = RALLY_ID;
    const { db } = ensureFirebase();
    this.db = db;
  }
  _partDoc(userId){
    return doc(this.db, PREFIX, this.rallyId, "participants", userId);
  }
  _stampsCol(){
    return collection(this.db, PREFIX, this.rallyId, "stamps");
  }
  _fraudCol(){
    return collection(this.db, PREFIX, this.rallyId, "fraud");
  }
  async loadUser(userId){
    if (!userId) return null;
    const snap = await getDoc(this._partDoc(userId));
    return snap.exists() ? snap.data() : null;
  }
  async saveUser(user){
    if (!user || !user.userId) return user;
    await setDoc(this._partDoc(user.userId), {
      ...user,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return user;
  }
  async listStamps(userId){
    if (!userId) return [];
    const q = fbQuery(this._stampsCol(), where("userId", "==", userId), orderBy("time", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  }
  async saveStamp(userId, stamp){
    const rec = {
      ...stamp,
      userId,
      rallyId: this.rallyId,
      valid: true,
      createdAt: serverTimestamp(),
    };
    await addDoc(this._stampsCol(), rec);
    return rec;
  }
  async clearStamps(userId){
    if (!userId) return;
    const q = fbQuery(this._stampsCol(), where("userId", "==", userId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  }
  async logFraud(entry){
    return addDoc(this._fraudCol(), {
      ...entry,
      rallyId: this.rallyId,
      createdAt: serverTimestamp(),
    });
  }
  // admin stats (集計)
  async statsToday(){
    const start = new Date(); start.setHours(0,0,0,0);
    const q = fbQuery(this._stampsCol(), where("createdAt", ">=", start));
    const snap = await getDocs(q);
    const users = new Set();
    snap.docs.forEach(d => users.add(d.data().userId));
    return { participants: users.size, stamps: snap.size };
  }
  async statsTotal(){
    const snap = await getDocs(this._stampsCol());
    const users = new Set();
    const spotCounts = {};
    snap.docs.forEach(d => {
      const s = d.data();
      users.add(s.userId);
      spotCounts[s.code] = (spotCounts[s.code] || 0) + 1;
    });
    return { participants: users.size, stamps: snap.size, spotCounts };
  }
  async recentActs(n = 10){
    const q = fbQuery(this._stampsCol(), orderBy("createdAt", "desc"), fbLimit(n));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  }
  onStamps(callback){
    const q = fbQuery(this._stampsCol(), orderBy("createdAt", "desc"), fbLimit(20));
    return onSnapshot(q, snap => {
      callback(snap.docs.map(d => d.data()));
    });
  }
}

// ────────────────────── factory ──────────────────────
export function createStore(backend = "local"){
  return backend === "firestore" ? new FirestoreStore() : new LocalStore();
}

// Boot: config <meta> または window flag で backend 選択
const backendMeta = document.querySelector('meta[name="fukutetsu-backend"]');
const backend = (window.FUKUTETSU_BACKEND || (backendMeta && backendMeta.content) || "local").toLowerCase();
window.fukutetsuStore = createStore(backend);
window.dispatchEvent(new Event("fukutetsu-store-ready"));
console.log("[fukutetsu] store backend:", backend);
