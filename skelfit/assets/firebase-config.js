/**
 * SkelFit — Firebase config placeholder.
 *
 * 本番 Firebase project を provision したら 以下 の 値 を 埋める:
 *   - Firebase console → Project settings → General → Your apps → Web app SDK snippet
 *
 * 空 のまま だと SDK は demo mode に fallback して、 seed に近い データ を 見せる。
 */
window.SKELFIT_FIREBASE_CONFIG = {
  // 例:
  // apiKey: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx",
  // authDomain: "skelfit-saas.firebaseapp.com",
  // projectId: "skelfit-saas",
  // storageBucket: "skelfit-saas.appspot.com",
  // messagingSenderId: "123456789012",
  // appId: "1:123456789012:web:xxxxxxxxxxxxxxxxxx",
};

/**
 * LIFF ID (LINE Developers Console → LIFF タブ で 発行)
 * 空 だと LIFF SDK 初期化 スキップ、 デフォルト customer で 表示。
 */
window.SKELFIT_LIFF_ID = "";

/**
 * Cloud Functions region + base URL (region 固定: asia-northeast1)
 */
window.SKELFIT_FUNCTIONS_BASE = "";
// 例: "https://asia-northeast1-skelfit-saas.cloudfunctions.net"

/**
 * このファイル が 「本物 の 設定」 か 判定 する helper.
 */
window.SKELFIT_IS_CONFIGURED = function () {
  const c = window.SKELFIT_FIREBASE_CONFIG || {};
  return !!(c.apiKey && c.projectId);
};
