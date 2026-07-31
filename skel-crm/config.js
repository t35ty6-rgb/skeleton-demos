// Skel·CRM prod mode config (2026-07-31 skel-crm-oa-02 setup by Jobs)
// このファイル は demo mode を 無効 化 して 実 Firebase に 接続 する。
// SDK config 値 は skel-crm-oa-02 Firebase project の Web App から取得 済。
window.__CRM_CONFIG = {
  demo: false,
  firebase: {
    apiKey: 'AIzaSyC0DuIYlSEpRkgFf4O7RZgwlbI5Hck526E',
    authDomain: 'skel-crm-oa-02.firebaseapp.com',
    projectId: 'skel-crm-oa-02',
    storageBucket: 'skel-crm-oa-02.firebasestorage.app',
    messagingSenderId: '286006809928',
    appId: '1:286006809928:web:ff101baac3875999ec0f7d',
  },
  functionsRegion: 'asia-northeast1',
  defaultTenantId: 'demo',
  enableGoogleLogin: true,
  liffId: '',
  enableAnonymousMemberAuth: true,
};
