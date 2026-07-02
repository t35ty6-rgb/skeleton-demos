/**
 * サン・クロレラ 統合LINE OS - 認証ラッパー
 *
 * backend=firebase の時のみ有効。 localモードは常に「ゲスト」で通す。
 *
 * role モデル (Firestore users collection):
 *   users/{uid} = { role: 'admin' | 'rep' | 'customer', repId?, tenantId }
 *
 * ログイン画面は admin/rep 共通。 サインイン時に role で表示制御。
 */

import { getConfig } from './config.js';

/**
 * Firebase Auth を必要な時だけロード (localモードでは import しない)。
 */
async function fireAuthAPI() {
  const { fireAuth } = await import('./firebase-adapter.js');
  return fireAuth;
}

const localState = {
  user: null,
  listeners: new Set(),
};

/**
 * 現在ユーザー (Firebaseなら auth.currentUser、localなら擬似ゲスト)
 */
export async function currentUser() {
  const cfg = getConfig();
  if (cfg.backend !== 'firebase') {
    return localState.user || { uid: 'demo', email: 'demo@sunchlorella.local', role: 'admin', tenantId: cfg.tenantId };
  }
  const auth = await fireAuthAPI();
  return auth.currentUser();
}

/**
 * ユーザーの role/tenantId を取得 (Firestore users doc)
 */
export async function currentClaims() {
  const cfg = getConfig();
  const u = await currentUser();
  if (!u) return null;
  if (cfg.backend !== 'firebase') {
    return { uid: u.uid, role: u.role || 'admin', tenantId: cfg.tenantId };
  }
  // Custom claims (Cloud Functions 側で setCustomUserClaims 済み)
  const tokenResult = await u.getIdTokenResult();
  return {
    uid: u.uid,
    email: u.email,
    role: tokenResult.claims.role || 'admin',
    tenantId: tokenResult.claims.tenantId || cfg.tenantId,
    repId: tokenResult.claims.repId || null,
  };
}

export async function signInWithEmail(email, password) {
  const cfg = getConfig();
  if (cfg.backend !== 'firebase') {
    localState.user = { uid: 'demo', email, role: 'admin', tenantId: cfg.tenantId };
    localState.listeners.forEach(cb => cb(localState.user));
    return localState.user;
  }
  const auth = await fireAuthAPI();
  const { user } = await auth.signInEmail(email, password);
  return user;
}

export async function signOut() {
  const cfg = getConfig();
  if (cfg.backend !== 'firebase') {
    localState.user = null;
    localState.listeners.forEach(cb => cb(null));
    return;
  }
  const auth = await fireAuthAPI();
  return auth.signOut();
}

export function onAuthChange(cb) {
  const cfg = getConfig();
  if (cfg.backend !== 'firebase') {
    localState.listeners.add(cb);
    cb(localState.user);
    return () => localState.listeners.delete(cb);
  }
  let unsub = () => {};
  fireAuthAPI().then(auth => {
    unsub = auth.onChange(cb);
  });
  return () => unsub();
}

/**
 * 要ログイン画面を出すべきか?
 *   - backend=firebase なら currentUser==null で true
 *   - local なら常に false (デモは自由に触れる)
 */
export async function requiresLogin() {
  const cfg = getConfig();
  if (cfg.backend !== 'firebase') return false;
  const u = await currentUser();
  return !u;
}

/**
 * LIFF SDK を必要に応じて読み込む (customer 画面のみ)。
 * memory: feedback_femoon_booking_url_must_be_liff.md
 *   LIFF URL 経由でしか profile.userId が取れない、 raw URLで開かれると customerOk=false。
 */
export async function ensureLiff() {
  const cfg = getConfig();
  if (!cfg.liff.enabled || !cfg.liff.liffId) return null;
  if (window.liff && window.liff.isInClient) return window.liff;
  await loadScript('https://static.line-scdn.net/liff/edge/2/sdk.js');
  await window.liff.init({ liffId: cfg.liff.liffId });
  if (!window.liff.isLoggedIn()) {
    window.liff.login({ redirectUri: location.href });
    return null;
  }
  const profile = await window.liff.getProfile();
  return { liff: window.liff, profile };
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
