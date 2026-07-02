/**
 * サン・クロレラ 統合LINE OS - 動的設定
 *
 * 起動時に window.SUNCHLORELLA_CONFIG があればそれを、
 * なければ localStorage の設定を、それもなければデフォルトを使う。
 *
 * 本番Hosting: firebase.hosting init 済み Firebase Hosting reserved URL `/__/firebase/init.json`
 *                が Firebase config を差し込むので、ここでは fallback (project=間借り) だけ持つ。
 */

const STORAGE_KEY = 'sunchlorella::config';

/**
 * デフォルト設定 (デモ環境で使う値)
 *
 * projectId は "skeleton-skel-ec-2606" に間借り、
 * サン・クロレラ専用collection prefix `sunchlorella_tenants/{tenantId}/…`
 * (Skel·EC / MEI と競合しない)。
 *
 * 本番テナントに切り替える時は setConfig() で上書き。
 */
const DEFAULT_CONFIG = {
  tenantId: 'sunchlorella-demo',
  tenantLabel: 'サン・クロレラジャパン (デモ)',
  backend: 'local',      // 'local' (localStorage) or 'firebase'
  firebase: {
    projectId: 'skeleton-skel-ec-2606',
    appId: '1:714352406083:web:5a63e15dcbf6ba185f6ef6',
    apiKey: 'AIzaSyBHEuEACAfmJcqzAOv-hGA54ULajJKj9wc',
    authDomain: 'skeleton-skel-ec-2606.firebaseapp.com',
    storageBucket: 'skeleton-skel-ec-2606.firebasestorage.app',
    messagingSenderId: '714352406083',
  },
  // 本番接続時に有効化 — LIFF SDK / Stripe Checkout
  liff: {
    enabled: false,
    liffId: '',
  },
  stripe: {
    enabled: false,
    publishableKey: '',
    successUrl: '',
    cancelUrl: '',
  },
  functions: {
    region: 'asia-northeast1',
    // Callable / HTTPS Functions URL prefix — Hosting rewrites 経由で /api/*
    baseUrl: '/api',
  },
  branding: {
    displayName: 'サン・クロレラ サポート',
    officeName: 'サン・クロレラジャパン株式会社',
  },
};

let _config = null;
export function getConfig() {
  if (_config) return _config;
  const injected = typeof window !== 'undefined' ? window.SUNCHLORELLA_CONFIG : null;
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch { return null; }
  })();
  _config = deepMerge(DEFAULT_CONFIG, stored || {}, injected || {});
  // URL param upgrade — ?backend=firebase&tenant=xxx
  if (typeof location !== 'undefined') {
    const p = new URLSearchParams(location.search);
    if (p.get('backend')) _config.backend = p.get('backend');
    if (p.get('tenant'))  _config.tenantId = p.get('tenant');
  }
  return _config;
}

export function setConfig(patch, { persist = true } = {}) {
  _config = deepMerge(getConfig(), patch);
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_config)); }
    catch (e) { console.warn('setConfig persist failed', e); }
  }
  return _config;
}

export function clearConfig() {
  _config = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

/**
 * Firebase 側で自動生成される /__/firebase/init.json を取り込むヘルパー
 * (Firebase Hosting は同じ project に deploy されると init.json を配信する)
 */
export async function autoDetectHosted() {
  // Firebase Hosting 特有の /__/firebase/init.json は
  // web.app / firebaseapp.com のホスト名でのみ配信される。
  // localhost / GitHub Pages では 404 になり console.error が出るだけなので叩かない。
  if (typeof location === 'undefined') return false;
  const host = location.hostname;
  if (!/\.(web\.app|firebaseapp\.com)$/.test(host)) return false;
  try {
    const r = await fetch('/__/firebase/init.json', { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      setConfig({ backend: 'firebase', firebase: { ...j } });
      return true;
    }
  } catch {}
  return false;
}

function deepMerge(...objs) {
  const out = {};
  for (const o of objs.filter(Boolean)) {
    for (const [k, v] of Object.entries(o)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = deepMerge(out[k] || {}, v);
      } else if (v !== undefined) {
        out[k] = v;
      }
    }
  }
  return out;
}
