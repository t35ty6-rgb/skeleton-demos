// 三崎屋電工AI — SPA アプリケーションロジック
(() => {
'use strict';

// ============================ Store ============================
const KEY = 'misakiya-denko-ai::v2::';
const STORE_KEYS = ['works', 'favorites', 'recent', 'notices', 'courses', 'progress', 'quizzes', 'users', 'currentUserId', 'read', 'categories'];

const store = {
  works: [], favorites: {}, recent: {}, notices: [], courses: [], progress: {}, quizzes: {}, users: [], read: {}, categories: [],
  currentUserId: 'u1',

  load() {
    let hasAny = false;
    for (const k of STORE_KEYS) {
      const raw = localStorage.getItem(KEY + k);
      if (raw != null) { try { this[k] = JSON.parse(raw); hasAny = true; } catch {} }
    }
    if (!hasAny) this.seed();
  },
  save(...keys) {
    const ks = keys.length ? keys : STORE_KEYS;
    for (const k of ks) localStorage.setItem(KEY + k, JSON.stringify(this[k]));
  },
  seed() {
    const S = window.SEED;
    this.works = JSON.parse(JSON.stringify(S.works));
    this.favorites = JSON.parse(JSON.stringify(S.favorites));
    this.recent = JSON.parse(JSON.stringify(S.recent));
    this.notices = JSON.parse(JSON.stringify(S.notices));
    this.courses = JSON.parse(JSON.stringify(S.courses));
    this.progress = JSON.parse(JSON.stringify(S.progress));
    this.quizzes = JSON.parse(JSON.stringify(S.quizzes));
    this.users = JSON.parse(JSON.stringify(S.users));
    this.categories = JSON.parse(JSON.stringify(S.categories));
    this.read = JSON.parse(JSON.stringify(S.read));
    this.currentUserId = 'u1';
    this.save();
  },
  reset() { for (const k of STORE_KEYS) localStorage.removeItem(KEY + k); this.seed(); },
  export() { const o = {}; for (const k of STORE_KEYS) o[k] = this[k]; return JSON.stringify(o, null, 2); },
  import(json) {
    const o = JSON.parse(json);
    for (const k of STORE_KEYS) if (k in o) this[k] = o[k];
    this.save();
  },

  // helpers
  user(id) { return this.users.find(u => u.id === (id || this.currentUserId)); },
  work(id) { return this.works.find(w => w.id === id); },
  category(id) { return this.categories.find(c => c.id === id); },
  course(id) { return this.courses.find(c => c.id === id); },

  isFav(workId, userId) { return (this.favorites[userId || this.currentUserId] || []).includes(workId); },
  toggleFav(workId) {
    const uid = this.currentUserId;
    const list = this.favorites[uid] = this.favorites[uid] || [];
    const idx = list.indexOf(workId);
    if (idx >= 0) list.splice(idx, 1); else list.unshift(workId);
    this.save('favorites');
    return idx < 0; // now on
  },

  pushRecent(workId) {
    const uid = this.currentUserId;
    const list = this.recent[uid] = this.recent[uid] || [];
    const existing = list.findIndex(r => r.workId === workId);
    if (existing >= 0) list.splice(existing, 1);
    list.unshift({ workId, ts: Date.now() });
    if (list.length > 30) list.length = 30;
    this.save('recent');
    const w = this.work(workId); if (w) { w.views = (w.views || 0) + 1; this.save('works'); }
  },

  progressOf(userId, courseId) {
    const key = `${userId}_${courseId}`;
    return this.progress[key] = this.progress[key] || { chaptersDone: [], quizScores: {} };
  },
  toggleChapter(userId, courseId, idx) {
    const p = this.progressOf(userId, courseId);
    const i = p.chaptersDone.indexOf(idx);
    if (i >= 0) p.chaptersDone.splice(i, 1); else p.chaptersDone.push(idx);
    this.save('progress');
  },
  saveQuizScore(userId, workId, score) {
    // find enrolled courses containing this workId
    for (const c of this.courses) {
      if (c.chapters.some(ch => ch.workId === workId)) {
        const p = this.progressOf(userId, c.id);
        p.quizScores[workId] = Math.max(p.quizScores[workId] || 0, score);
      }
    }
    this.save('progress');
  },

  isRead(noticeId, userId) { return (this.read[userId || this.currentUserId] || []).includes(noticeId); },
  markRead(noticeId) {
    const uid = this.currentUserId;
    const list = this.read[uid] = this.read[uid] || [];
    if (!list.includes(noticeId)) list.push(noticeId);
    this.save('read');
  },
  unreadCount() {
    const uid = this.currentUserId;
    const read = this.read[uid] || [];
    return this.notices.filter(n => !read.includes(n.id)).length;
  },

  pendingCount() { return this.works.filter(w => w.status === 'pending').length; },
};

// ============================ Utilities ============================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === false || v == null) continue;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtDate = d => {
  if (!d) return '';
  const dt = typeof d === 'number' ? new Date(d) : new Date(d);
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
};
const fmtRelative = ts => {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'たった今';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
  return fmtDate(ts);
};
const uid = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function toast(msg, kind = '') {
  const root = $('#toast-root');
  root.innerHTML = '';
  const t = h('div', { class: 'toast ' + kind }, msg);
  root.append(t);
  setTimeout(() => t.remove(), 2600);
}

function modal(title, bodyEl, actions = null) {
  return new Promise(resolve => {
    const back = h('div', { class: 'modal-back', onclick: e => { if (e.target === back) close(false); } });
    const box = h('div', { class: 'modal' });
    if (title) box.append(h('div', { class: 'modal-h' }, title));
    box.append(h('div', { class: 'modal-body' }, bodyEl));
    const actionsRow = h('div', { class: 'modal-actions' });
    if (!actions) {
      actionsRow.append(
        h('button', { class: 'btn btn-secondary', onclick: () => close(false) }, 'キャンセル'),
        h('button', { class: 'btn btn-primary', onclick: () => close(true) }, 'OK')
      );
    } else actions(actionsRow, close);
    box.append(actionsRow);
    back.append(box);
    $('#modal-root').append(back);
    function close(v) { back.remove(); resolve(v); }
  });
}

async function confirmModal(title, msg) {
  return modal(title, h('div', {}, msg));
}

// ============================ Icons (SVG builders) ============================
const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12 12 3l9 9"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1L3.2 9.4l6.1-.9L12 3z"/></svg>',
  starOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1L3.2 9.4l6.1-.9L12 3z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>',
  db: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v4H4z"/><path d="M4 12h16v4H4z"/><path d="M4 20h10"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" stroke="none"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7V13"/><path d="M12 17h.01"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2 2 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  dwg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 3v18"/></svg>',
  img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5-8 8"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-2 2"/><path d="M14 10a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l2-2"/></svg>',
  wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 1 5 5l-1.4 1.4-5-5z"/><path d="m18.3 12.7-9.6 9.6a2 2 0 0 1-2.8-2.8l9.6-9.6z"/></svg>',
  up2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 15 7-7 7 7"/></svg>',
  down2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>',
  approve: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  reject: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
  export: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>',
  import: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
};

// ============================ Thumbnail SVG factory ============================
function thumbSVG(kind) {
  const svgs = {
    panel: `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="pg1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="200" height="150" fill="url(#pg1)"/><rect x="55" y="20" width="90" height="110" fill="#e2e8f0" stroke="#64748b"/><rect x="65" y="30" width="70" height="14" fill="#f8fafc" stroke="#94a3b8"/><rect x="65" y="50" width="70" height="8" fill="#f59e0b"/><rect x="65" y="62" width="70" height="8" fill="#ef4444"/><rect x="65" y="74" width="70" height="8" fill="#10b981"/><rect x="65" y="86" width="70" height="8" fill="#3b82f6"/><rect x="65" y="98" width="34" height="22" fill="#cbd5e1" stroke="#64748b"/><rect x="101" y="98" width="34" height="22" fill="#cbd5e1" stroke="#64748b"/><circle cx="82" cy="109" r="2" fill="#1e293b"/><circle cx="118" cy="109" r="2" fill="#1e293b"/></svg>`,
    breaker: `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><rect width="200" height="150" fill="#1e293b"/><g stroke="#94a3b8" fill="#334155"><rect x="60" y="30" width="80" height="90" rx="3"/><rect x="70" y="42" width="60" height="16" fill="#f59e0b"/><rect x="70" y="62" width="60" height="16" fill="#e2e8f0"/><rect x="70" y="82" width="60" height="16" fill="#e2e8f0"/><rect x="70" y="102" width="60" height="10" fill="#0ea5e9"/></g><circle cx="90" cy="50" r="3" fill="#dc2626"/><circle cx="110" cy="50" r="3" fill="#dc2626"/></svg>`,
    light: `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="lg1" cx="50%" cy="30%" r="50%"><stop offset="0" stop-color="#fef9c3"/><stop offset="1" stop-color="#0f172a"/></radialGradient></defs><rect width="200" height="150" fill="url(#lg1)"/><rect x="30" y="30" width="140" height="18" fill="#e2e8f0" stroke="#64748b"/><path d="M40 48 L60 100 L140 100 L160 48 Z" fill="#fef3c7" opacity="0.85"/><line x1="100" y1="48" x2="100" y2="20" stroke="#94a3b8" stroke-width="2"/></svg>`,
    cable: `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><rect width="200" height="150" fill="#0f172a"/><g><path d="M0 75 Q60 40 100 75 T200 75" stroke="#f59e0b" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M0 75 Q60 40 100 75 T200 75" stroke="#dc2626" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="100" cy="75" r="14" fill="#e2e8f0" stroke="#94a3b8"/><circle cx="100" cy="75" r="7" fill="#dc2626"/></g></svg>`,
    meter: `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><rect width="200" height="150" fill="#0f172a"/><rect x="55" y="25" width="90" height="100" rx="4" fill="#334155" stroke="#94a3b8"/><circle cx="100" cy="65" r="24" fill="#e2e8f0"/><path d="M100 65 L118 55" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/><circle cx="100" cy="65" r="3" fill="#0f172a"/><rect x="70" y="100" width="60" height="14" fill="#f59e0b"/><text x="100" y="111" text-anchor="middle" fill="#0f172a" font-size="9" font-weight="800" font-family="Inter">MEG 500V</text></svg>`,
    pas: `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><rect width="200" height="150" fill="#1e293b"/><rect x="90" y="0" width="20" height="150" fill="#78716c"/><rect x="60" y="35" width="80" height="55" fill="#e2e8f0" stroke="#64748b"/><rect x="65" y="42" width="30" height="8" fill="#0ea5e9"/><rect x="105" y="42" width="30" height="8" fill="#0ea5e9"/><circle cx="80" cy="65" r="8" fill="#dc2626"/><circle cx="120" cy="65" r="8" fill="#10b981"/><rect x="65" y="80" width="70" height="6" fill="#94a3b8"/></svg>`,
    cubicle: `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><rect width="200" height="150" fill="#0f172a"/><g stroke="#94a3b8" fill="#475569"><rect x="30" y="20" width="45" height="110"/><rect x="80" y="20" width="45" height="110"/><rect x="130" y="20" width="45" height="110"/></g><g fill="#f59e0b"><rect x="35" y="30" width="35" height="8"/><rect x="85" y="30" width="35" height="8"/><rect x="135" y="30" width="35" height="8"/></g><g fill="#e2e8f0"><rect x="35" y="50" width="35" height="20"/><rect x="85" y="50" width="35" height="20"/><rect x="135" y="50" width="35" height="20"/></g><text x="100" y="120" text-anchor="middle" fill="#f8fafc" font-size="9" font-weight="900" font-family="Inter">CUBICLE HV</text></svg>`,
    rack: `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><rect width="200" height="150" fill="#1e3a5f"/><g fill="#334155" stroke="#94a3b8"><rect x="10" y="30" width="14" height="90"/><rect x="176" y="30" width="14" height="90"/></g><g stroke="#64748b"><line x1="24" y1="45" x2="176" y2="45"/><line x1="24" y1="70" x2="176" y2="70"/><line x1="24" y1="95" x2="176" y2="95"/></g><g stroke="#f59e0b" stroke-width="4" fill="none" stroke-linecap="round"><path d="M20 47 L180 47"/><path d="M20 72 L180 72"/><path d="M20 97 L180 97"/></g><g stroke="#0ea5e9" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M20 50 L180 50"/><path d="M20 75 L180 75"/></g></svg>`,
    'hv-panel': `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><rect width="200" height="150" fill="#0f172a"/><rect x="45" y="15" width="110" height="120" fill="#334155" stroke="#94a3b8"/><rect x="52" y="22" width="96" height="16" fill="#dc2626"/><text x="100" y="34" text-anchor="middle" fill="#fff" font-size="8" font-weight="900" font-family="Inter">HV DANGER</text><g fill="#e2e8f0"><rect x="52" y="46" width="42" height="30" stroke="#64748b"/><rect x="102" y="46" width="42" height="30" stroke="#64748b"/><rect x="52" y="82" width="42" height="30" stroke="#64748b"/><rect x="102" y="82" width="42" height="30" stroke="#64748b"/></g><circle cx="73" cy="61" r="5" fill="#f59e0b"/><circle cx="123" cy="61" r="5" fill="#f59e0b"/><circle cx="73" cy="97" r="5" fill="#10b981"/><circle cx="123" cy="97" r="5" fill="#10b981"/></svg>`,
    'power-panel': `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><rect width="200" height="150" fill="#1e293b"/><rect x="50" y="15" width="100" height="120" fill="#e2e8f0" stroke="#64748b"/><rect x="58" y="24" width="84" height="18" fill="#0f172a"/><text x="100" y="37" text-anchor="middle" fill="#f8fafc" font-size="9" font-weight="800" font-family="Inter">3φ 380V</text><g fill="#f59e0b" stroke="#0f172a"><rect x="58" y="50" width="26" height="18"/><rect x="87" y="50" width="26" height="18"/><rect x="116" y="50" width="26" height="18"/></g><g fill="#3b82f6" stroke="#0f172a"><rect x="58" y="74" width="26" height="18"/><rect x="87" y="74" width="26" height="18"/><rect x="116" y="74" width="26" height="18"/></g><rect x="58" y="98" width="84" height="24" fill="#cbd5e1" stroke="#64748b"/></svg>`,
    elb: `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><rect width="200" height="150" fill="#0f172a"/><rect x="65" y="30" width="70" height="90" fill="#334155" stroke="#94a3b8"/><rect x="72" y="38" width="56" height="14" fill="#dc2626"/><text x="100" y="49" text-anchor="middle" fill="#fff" font-size="7" font-weight="900" font-family="Inter">ELB TEST</text><circle cx="100" cy="70" r="10" fill="#0f172a" stroke="#e2e8f0" stroke-width="1.5"/><path d="M97 70 L100 74 L104 66" stroke="#10b981" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="72" y="88" width="56" height="8" fill="#0ea5e9"/><rect x="72" y="100" width="56" height="8" fill="#0ea5e9"/></svg>`,
    ground: `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="soilg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#78716c"/><stop offset="1" stop-color="#292524"/></linearGradient></defs><rect width="200" height="150" fill="#0f172a"/><rect y="60" width="200" height="90" fill="url(#soilg)"/><rect x="95" y="30" width="10" height="90" fill="#78716c"/><rect x="95" y="30" width="10" height="35" fill="#f59e0b"/><line x1="100" y1="20" x2="100" y2="30" stroke="#10b981" stroke-width="3"/><g fill="#10b981"><rect x="90" y="15" width="20" height="4"/><rect x="93" y="10" width="14" height="4"/><rect x="96" y="5" width="8" height="4"/></g></svg>`,
    'ctrl-panel': `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><rect width="200" height="150" fill="#1e293b"/><rect x="50" y="20" width="100" height="110" fill="#e2e8f0" stroke="#64748b"/><rect x="58" y="30" width="84" height="30" fill="#0f172a"/><g fill="#10b981"><rect x="62" y="34" width="20" height="6"/><rect x="86" y="34" width="20" height="6"/><rect x="110" y="34" width="28" height="6"/></g><g fill="#f59e0b"><rect x="62" y="44" width="30" height="10"/></g><g fill="#3b82f6" stroke="#0f172a"><rect x="58" y="68" width="18" height="18"/><rect x="80" y="68" width="18" height="18"/><rect x="102" y="68" width="18" height="18"/><rect x="124" y="68" width="18" height="18"/></g><rect x="58" y="94" width="84" height="30" fill="#cbd5e1"/></svg>`,
    meter2: `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><rect width="200" height="150" fill="#1e293b"/><rect x="55" y="20" width="90" height="110" rx="6" fill="#f8fafc" stroke="#94a3b8"/><rect x="65" y="30" width="70" height="30" fill="#0f172a"/><text x="100" y="49" text-anchor="middle" fill="#10b981" font-size="14" font-weight="900" font-family="Inter">18.4</text><text x="100" y="58" text-anchor="middle" fill="#94a3b8" font-size="6" font-family="Inter">kWh</text><g stroke="#94a3b8" fill="#e2e8f0"><rect x="65" y="70" width="70" height="10"/></g><g fill="#3b82f6"><rect x="65" y="70" width="42" height="10"/></g><circle cx="75" cy="100" r="6" fill="#dc2626"/><text x="100" y="118" text-anchor="middle" fill="#64748b" font-size="8" font-weight="700" font-family="Inter">SMART METER</text></svg>`,
    default: `<svg class="bg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="dg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#475569"/><stop offset="1" stop-color="#0f172a"/></linearGradient></defs><rect width="200" height="150" fill="url(#dg)"/><g stroke="#f59e0b" stroke-width="4" fill="none" stroke-linecap="round"><path d="M100 50 L85 80 L100 80 L92 110"/></g></svg>`,
  };
  return svgs[kind] || svgs.default;
}

// ============================ Sidebar & Topbar ============================
function renderSidebar() {
  const sb = $('#sidebar');
  const pending = store.pendingCount();
  const routeName = router.current.name;

  const navItem = (name, label, iconKey, badge) => `
    <a class="nav-item ${routeName === name ? 'is-active' : ''}" data-nav="${name}">
      ${I[iconKey]} ${esc(label)}
      ${badge ? `<span class="nav-badge">${badge}</span>` : ''}
    </a>`;

  sb.innerHTML = `
    <div class="brand">
      <div class="brand-mark">${I.bolt}</div>
      <div>
        <div class="brand-name">三崎屋電工AI</div>
        <div class="brand-tag">技術を未来へ、人を育てる</div>
      </div>
    </div>
    <nav class="nav-group">
      ${navItem('home', 'ホーム', 'home')}
      ${navItem('search', '作業を探す', 'search')}
      ${navItem('favorites', 'お気に入り', 'starOutline')}
      ${navItem('recent', '最近の閲覧', 'clock')}
      ${navItem('mypage', 'マイページ', 'user')}
    </nav>
    <div class="nav-group" style="margin-top:14px">
      <div class="nav-heading">業務</div>
      ${navItem('approve', '承認・確認', 'check', pending || null)}
      ${navItem('database', 'データベース', 'db')}
      ${navItem('courses', '教材モード', 'book')}
      ${navItem('admin', '管理メニュー', 'gear')}
    </div>
    <div class="sidebar-status">
      <div class="status-dot"></div>
      現場サーバ 同期済 · ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
    </div>`;

  sb.querySelectorAll('[data-nav]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    router.go(a.dataset.nav);
  }));
}

function renderTopbar() {
  const tb = $('#topbar');
  const user = store.user();
  const unread = store.unreadCount();
  tb.innerHTML = `
    <div class="search">
      ${I.search}
      <input placeholder="キーワード・品番・現場名で検索" id="tbSearch" autocomplete="off">
    </div>
    <div class="top-tools">
      <button class="icon-btn" title="お知らせ" data-nav="notices">
        ${I.bell}
        ${unread ? `<span class="badge">${unread}</span>` : ''}
      </button>
      <button class="icon-btn" title="ヘルプ">${I.help}</button>
      <div class="user" id="userMenu">
        <div class="avatar ${user.avatarClass}">${esc(user.initials)}</div>
        <div>
          <div class="user-name">${esc(user.name)}</div>
          <div class="user-role">${esc(user.role)}</div>
        </div>
        ${I.chev}
      </div>
    </div>`;

  const sIn = $('#tbSearch');
  sIn.addEventListener('keydown', e => {
    if (e.key === 'Enter') router.go('search', { q: sIn.value });
  });

  $('[data-nav="notices"]').addEventListener('click', () => router.go('notices'));

  // user dropdown
  const um = $('#userMenu');
  let open = false;
  um.addEventListener('click', e => {
    e.stopPropagation();
    if (open) { closeDD(); return; }
    open = true;
    const dd = h('div', { class: 'dropdown' });
    dd.innerHTML = `
      <div class="dd-heading">アカウント</div>
      ${store.users.map(u => `
        <div class="dd-item ${u.id === store.currentUserId ? 'is-current' : ''}" data-uid="${u.id}">
          <div class="avatar ${u.avatarClass}" style="width:26px;height:26px;font-size:10px">${esc(u.initials)}</div>
          <div>
            <div style="font-size:12.5px">${esc(u.name)}</div>
            <div style="font-size:10.5px;color:var(--dim);font-weight:600">${esc(u.role)}</div>
          </div>
        </div>`).join('')}
      <div class="dd-sep"></div>
      <div class="dd-item" data-a="admin">${I.gear}<span>管理メニュー</span></div>
      <div class="dd-item" data-a="reset">${I.reset}<span>データをリセット</span></div>`;
    um.append(dd);
    dd.querySelectorAll('[data-uid]').forEach(el => el.addEventListener('click', () => {
      store.currentUserId = el.dataset.uid; store.save('currentUserId');
      toast(`${store.user().name} に切替えました`, 'success');
      closeDD(); render();
    }));
    dd.querySelector('[data-a="admin"]').addEventListener('click', () => { closeDD(); router.go('admin'); });
    dd.querySelector('[data-a="reset"]').addEventListener('click', async () => {
      closeDD();
      const ok = await confirmModal('データをリセット', h('div', {}, '全ての作業・お気に入り・進捗が初期シードデータに戻ります。よろしいですか?'));
      if (ok) { store.reset(); toast('リセットしました', 'success'); render(); }
    });
    function closeDD() { open = false; dd.remove(); document.removeEventListener('click', onDoc); }
    function onDoc(ev) { if (!um.contains(ev.target)) closeDD(); }
    setTimeout(() => document.addEventListener('click', onDoc), 0);
  });
}

// ============================ Router ============================
const router = {
  current: { name: 'home', params: {} },
  go(name, params = {}) {
    const qs = new URLSearchParams(params).toString();
    location.hash = `#${name}${qs ? '?' + qs : ''}`;
  },
  parse() {
    const hash = location.hash.slice(1) || 'home';
    const [pathPart, qs] = hash.split('?');
    const parts = pathPart.split('/');
    const params = {};
    if (qs) new URLSearchParams(qs).forEach((v, k) => params[k] = v);
    // hash forms: home / work/:id / work/:id/edit / new / course/:id / course/:id/quiz/:workId / search / etc
    const name = parts[0] || 'home';
    if (parts[1]) params.id = parts[1];
    if (parts[2]) params.sub = parts[2];
    if (parts[3]) params.subId = parts[3];
    return { name, params };
  },
};

// ============================ Views ============================
function render() {
  router.current = router.parse();
  renderSidebar();
  renderTopbar();
  const view = $('#view');
  view.innerHTML = '';
  view.className = 'view';
  const { name, params } = router.current;
  const map = {
    home: viewHome,
    search: viewSearch,
    favorites: viewFavorites,
    recent: viewRecent,
    mypage: viewMypage,
    approve: viewApprove,
    database: viewDatabase,
    notices: viewNotices,
    notice: viewNoticeDetail,
    courses: viewCoursesTop,
    course: viewCourseDetail,
    quiz: viewQuiz,
    admin: viewAdmin,
    work: params.sub === 'edit' ? viewWorkEdit : viewWorkDetail,
    new: viewWorkNew,
  };
  const fn = map[name] || viewHome;
  fn(view, params);
  window.scrollTo({ top: 0, behavior: 'instant' });
}
window.addEventListener('hashchange', render);

// ============================ Reusable UI pieces ============================
// Difficulty ladder — 5 squares, level-colored (signature element, replaces ★)
function difficultyBar(n, small = false) {
  const level = Math.max(1, Math.min(5, n));
  return `<span class="diff ${small ? 'diff-sm' : ''}" data-level="${level}" title="難易度 ${level} / 5">
    <span class="diff-cell"></span><span class="diff-cell"></span><span class="diff-cell"></span><span class="diff-cell"></span><span class="diff-cell"></span>
  </span>`;
}

// Rendered as informational list row (not decorative card)
function workCard(w, seq) {
  const isFav = store.isFav(w.id);
  const cat = store.category(w.category);
  const item = h('div', { class: 'reco-item', 'data-cat': w.category });
  item.innerHTML = `
    <div class="reco-num">${(seq ?? 0) < 9 ? '0' + ((seq ?? 0) + 1) : ((seq ?? 0) + 1)}</div>
    <div class="reco-body">
      <div class="reco-title">${esc(w.title)}</div>
      <div class="reco-meta">
        <span class="reco-cat">${esc(cat ? cat.name : '')}</span>
        ${difficultyBar(w.difficulty, true)}
        <span>· ${fmtDate(w.updatedAt).slice(5)}</span>
      </div>
    </div>
    <button class="reco-fav ${isFav ? 'is-on' : ''}" data-fav="${w.id}" title="お気に入り" aria-label="お気に入り">
      ${isFav ? I.star : I.starOutline}
    </button>`;
  item.addEventListener('click', e => {
    if (e.target.closest('[data-fav]')) return;
    router.go('work/' + w.id);
  });
  item.querySelector('[data-fav]').addEventListener('click', e => {
    e.stopPropagation();
    const on = store.toggleFav(w.id);
    render();
    toast(on ? 'お気に入りに追加しました' : 'お気に入りから外しました', 'success');
  });
  return item;
}

function searchCard(w, seq) {
  const card = h('div', { class: 'sr-card', 'data-cat': w.category });
  card.innerHTML = `
    <div class="sr-num">${(seq ?? 0) < 9 ? '0' + ((seq ?? 0) + 1) : ((seq ?? 0) + 1)}</div>
    <div class="sr-info">
      <div class="sr-name">${esc(w.title)}</div>
      <div class="sr-sub">${esc(w.site || '—')} · ${esc((store.category(w.category) || {}).name || '')}</div>
      <div class="sr-tags">
        ${w.steps.length ? '<span class="sr-tag">手順書</span>' : ''}
        ${w.videoUrl ? '<span class="sr-tag">動画</span>' : ''}
        ${(w.resources || []).some(r => r.type === 'pdf' || r.type === 'dwg') ? '<span class="sr-tag">図面</span>' : ''}
        ${w.status === 'pending' ? '<span class="sr-tag" style="background:var(--warn-soft);color:#5c3f0f;border-color:#e9c884">承認待ち</span>' : ''}
      </div>
    </div>
    <div class="sr-right">
      <span class="sr-date">${fmtDate(w.updatedAt)}</span>
      <span class="sr-diff-lbl">難易度 ${difficultyBar(w.difficulty)}</span>
    </div>`;
  card.addEventListener('click', () => router.go('work/' + w.id));
  return card;
}

// ============================ View: Home ============================
function viewHome(root) {
  const uid = store.currentUserId;
  const publishedWorks = store.works.filter(w => w.status === 'published');
  const reco = [...publishedWorks].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 4);
  const recent = (store.recent[uid] || []).slice(0, 4);
  const unreadNotices = store.notices.slice(0, 4);

  // stats
  const now = new Date();
  const thisMonth = publishedWorks.filter(w => {
    const d = new Date(w.updatedAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const totalViews = publishedWorks.reduce((s, w) => s + (w.views || 0), 0);
  const learners = Object.keys(store.progress).length;
  const avgTime = publishedWorks.reduce((s, w) => s + (parseInt(w.duration) || 2), 0) / (publishedWorks.length || 1);

  const keywordCounts = {};
  publishedWorks.forEach(w => (w.tags || []).forEach(t => keywordCounts[t] = (keywordCounts[t] || 0) + 1));
  const kws = Object.entries(keywordCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // build layout
  const grid = h('div', { class: 'home-grid' });
  const left = h('div', { class: 'col' });
  const right = h('div', { class: 'col' });

  // Left: Recommended
  const recoCard = h('section', { class: 'card' });
  recoCard.innerHTML = `<header class="card-h">
    <div class="card-h-title">おすすめの作業</div>
    <a class="link-more" data-more>すべて見る ${I.right}</a>
  </header><div class="reco"><div class="reco-grid" id="recoGrid"></div></div>`;
  left.append(recoCard);
  const recoGrid = recoCard.querySelector('#recoGrid');
  reco.forEach((w, i) => recoGrid.append(workCard(w, i)));
  recoCard.querySelector('[data-more]').addEventListener('click', () => router.go('search'));

  // Left: two-col lists (recent + notices)
  const twoCol = h('section', { class: 'two-col' });

  const recentCard = h('div', { class: 'card' });
  recentCard.innerHTML = `<header class="card-h">
    <div class="card-h-title">最近の閲覧</div>
    <a class="link-more" data-more>すべて見る ${I.right}</a>
  </header><div class="list" id="recentList"></div>`;
  recentCard.querySelector('[data-more]').addEventListener('click', () => router.go('recent'));
  const rl = recentCard.querySelector('#recentList');
  if (recent.length === 0) {
    rl.innerHTML = `<div class="empty" style="padding:20px 0"><div>まだ閲覧履歴がありません</div></div>`;
  } else {
    recent.forEach(r => {
      const w = store.work(r.workId);
      if (!w) return;
      const it = h('div', { class: 'list-item' });
      it.innerHTML = `
        <span class="list-icon li-doc">D</span>
        <span class="list-title">${esc(w.title)}</span>
        <span class="list-date">${fmtRelative(r.ts)}</span>`;
      it.addEventListener('click', () => router.go('work/' + w.id));
      rl.append(it);
    });
  }

  const noticeCard = h('div', { class: 'card' });
  noticeCard.innerHTML = `<header class="card-h">
    <div class="card-h-title">お知らせ</div>
    <a class="link-more" data-more>すべて見る ${I.right}</a>
  </header><div class="list" id="noticeList"></div>`;
  noticeCard.querySelector('[data-more]').addEventListener('click', () => router.go('notices'));
  const nl = noticeCard.querySelector('#noticeList');
  unreadNotices.forEach(n => {
    const it = h('div', { class: 'list-item' });
    const pillCls = n.type === 'new' ? 'pill-new' : n.type === 'warn' ? 'pill-warn' : 'pill-info';
    const pillLbl = n.type === 'new' ? 'NEW' : n.type === 'warn' ? '重要' : '連絡';
    const unread = !store.isRead(n.id);
    it.innerHTML = `
      <span class="pill ${pillCls}">${pillLbl}</span>
      <span class="list-title" style="${unread ? 'font-weight:800' : ''}">${unread ? '<span class="pill-dot"></span>' : ''}${esc(n.title)}</span>
      <span class="list-date">${fmtDate(n.createdAt).slice(5)}</span>`;
    it.addEventListener('click', () => router.go('notice/' + n.id));
    nl.append(it);
  });

  twoCol.append(recentCard, noticeCard);
  left.append(twoCol);

  // Left: Stats — inline KPI row (hero-metric REPLACED per impeccable rules)
  const statsCard = h('section', { class: 'card' });
  statsCard.innerHTML = `
    <header class="card-h"><div class="card-h-title">今月の実績</div></header>
    <div class="stats-inline">
      <span class="kpi"><span class="kpi-label">新規登録</span><span class="kpi-value">${thisMonth}</span><span class="kpi-unit">件</span><span class="kpi-delta">+${Math.max(0, thisMonth - 8)}</span></span>
      <span class="kpi"><span class="kpi-label">閲覧数</span><span class="kpi-value">${totalViews}</span><span class="kpi-delta">+31%</span></span>
      <span class="kpi"><span class="kpi-label">学習中</span><span class="kpi-value">${learners}</span><span class="kpi-unit">人</span></span>
      <span class="kpi"><span class="kpi-label">平均学習</span><span class="kpi-value">${avgTime.toFixed(1)}</span><span class="kpi-unit">時間</span></span>
    </div>
    <div class="kw-row">
      <span class="kw-row-label">よく検索されている</span>
      ${kws.map(([k]) => `<span class="kw-tag" data-kw="${esc(k)}">${esc(k)}</span>`).join('')}
    </div>`;
  statsCard.querySelectorAll('[data-kw]').forEach(el =>
    el.addEventListener('click', () => router.go('search', { q: el.dataset.kw }))
  );
  left.append(statsCard);

  // Right: Detail pane (highlighted work = first reco)
  const highlight = reco[0];
  if (highlight) right.append(buildDetailCard(highlight));

  // Also: search + training side by side (like mockup row 2)
  grid.append(left, right);
  root.append(grid);

  // Row 2: search preview + training
  const row2 = h('div', { style: 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;margin-top:16px' });
  row2.append(buildSearchPreview(), buildTrainingCard());
  root.append(row2);

  // responsive fix for row2
  if (window.innerWidth < 1180) row2.style.gridTemplateColumns = '1fr';
}

// ============================ Home: search preview ============================
function buildSearchPreview() {
  const card = h('section', { class: 'card' });
  const q = '分電盤 交換';
  const results = filterWorks(q);
  const kwCount = {};
  store.works.forEach(w => (w.tags || []).forEach(t => kwCount[t] = (kwCount[t] || 0) + 1));
  const kws = Object.entries(kwCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

  card.innerHTML = `
    <div class="sr-h">
      <a class="back-link" data-b>${I.left}戻る</a>
      <div class="sr-title-wrap"><div class="sr-title">検索結果 <small>(${results.length})</small></div></div>
      <div class="sr-input-wrap">${I.search}<input class="sr-input" id="qIn" value="${esc(q)}"></div>
      <button class="btn btn-primary btn-sm" id="doSearch">検索</button>
      <button class="btn btn-ghost btn-sm">${I.filter}絞り込み</button>
    </div>
    <div class="sr-tabs">
      <button class="sr-tab is-active">すべて <span class="cnt">(${results.length})</span></button>
      <button class="sr-tab">手順書 <span class="cnt">(${results.filter(w => w.steps.length).length})</span></button>
      <button class="sr-tab">動画 <span class="cnt">(${results.filter(w => w.videoUrl).length})</span></button>
      <button class="sr-tab">図面 <span class="cnt">(${results.filter(w => (w.resources || []).some(r => r.type !== 'link')).length})</span></button>
    </div>
    <div class="sr-body">
      <div class="sr-list" id="srList"></div>
      <aside class="sr-side">
        <div class="sr-side-h">キーワード</div>
        <div class="sr-kw">
          ${kws.map(([k, c]) => `<div class="sr-kw-item" data-kw="${esc(k)}"><span>${esc(k)}</span><span class="n">(${c})</span></div>`).join('')}
        </div>
      </aside>
    </div>`;
  const list = card.querySelector('#srList');
  results.slice(0, 3).forEach((w, i) => list.append(searchCard(w, i)));
  card.querySelector('#qIn').addEventListener('keydown', e => {
    if (e.key === 'Enter') router.go('search', { q: e.target.value });
  });
  card.querySelector('#doSearch').addEventListener('click', () => {
    router.go('search', { q: card.querySelector('#qIn').value });
  });
  card.querySelector('[data-b]').addEventListener('click', () => router.go('home'));
  card.querySelectorAll('[data-kw]').forEach(el => el.addEventListener('click', () => router.go('search', { q: el.dataset.kw })));
  return card;
}

// ============================ Home: training card ============================
function buildTrainingCard() {
  const card = h('section', { class: 'card' });
  const uid = store.currentUserId;
  // find best "in-progress" course
  const enrolled = store.courses.map(c => {
    const p = store.progress[`${uid}_${c.id}`];
    const done = p ? p.chaptersDone.length : 0;
    return { c, done, total: c.chapters.length, ratio: done / c.chapters.length };
  });
  const current = enrolled.find(e => e.done > 0 && e.done < e.total) || enrolled[0];

  card.innerHTML = `
    <div class="kz-h">
      <div class="kz-h-icon">${I.book}</div>
      <div class="kz-h-title">教材モード</div>
    </div>
    <div class="kz-body">
      <div>
        <div class="kz-section-h"><div class="kz-section-title">学習中のコース</div></div>
        <div class="now-learning">
          <div class="nl-info">
            <div class="nl-eyebrow">受講中</div>
            <div class="nl-name">${esc(current.c.name)}</div>
            <div class="nl-progress"><div class="nl-progress-fill" style="width:${(current.ratio * 100).toFixed(0)}%"></div></div>
            <div class="nl-progress-lbl"><span>${current.done} / ${current.total} 章</span><span>${(current.ratio * 100).toFixed(0)}%</span></div>
          </div>
          <button class="nl-cta" data-cont="${current.c.id}">学習を続ける</button>
        </div>
      </div>
      <div>
        <div class="kz-section-h">
          <div class="kz-section-title">コース一覧</div>
          <a class="link-more" data-all>すべて見る ${I.right}</a>
        </div>
        <div class="course-grid">
          ${enrolled.map(e => {
            const isCurrent = e.done > 0 && e.done < e.total;
            const done = e.done === e.total;
            const badge = done ? 'done' : (e.done > 0 ? 'hi' : '');
            const badgeLbl = done ? '完了' : (e.done > 0 ? '受講中' : '未受講');
            const pb = done ? 'pb-green' : (e.done > 0 && e.c.badge === 'basic' ? 'pb-blue' : (e.done > 0 ? 'pb-orange' : 'pb-muted'));
            return `<div class="course" data-course="${e.c.id}">
              <div class="course-badge ${badge}">${badgeLbl}</div>
              <div class="course-name">${esc(e.c.name)}</div>
              <div class="course-meta">${esc(e.c.level)} · 全${e.total}章</div>
              <div class="course-progress">
                <div class="course-progress-bar"><span class="${pb}" style="width:${(e.ratio * 100).toFixed(0)}%"></span></div>
                <div class="course-progress-lbl"><span>${e.done}/${e.total}</span><span>${(e.ratio * 100).toFixed(0)}%</span></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div>
        <div class="kz-section-h"><div class="kz-section-title">学習メニュー</div></div>
        <div class="menu-grid">
          <button class="menu" data-menu="video"><div class="menu-icon mi-blue">${I.play}</div><div class="menu-lbl">動画を見る</div></button>
          <button class="menu" data-menu="docs"><div class="menu-icon mi-orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg></div><div class="menu-lbl">手順書で学ぶ</div></button>
          <button class="menu" data-menu="quiz"><div class="menu-icon mi-green">${I.help}</div><div class="menu-lbl">クイズで確認</div></button>
          <button class="menu" data-menu="checklist"><div class="menu-icon mi-purple">${I.check}</div><div class="menu-lbl">現場で試す<br><span style="font-weight:500;color:var(--dim);font-size:10px">（チェックリスト）</span></div></button>
        </div>
      </div>
      ${buildTestRow(uid, current.c.id)}
    </div>`;
  card.querySelector('[data-cont]').addEventListener('click', () => router.go('course/' + card.querySelector('[data-cont]').dataset.cont));
  card.querySelector('[data-all]').addEventListener('click', () => router.go('courses'));
  card.querySelectorAll('[data-course]').forEach(el => el.addEventListener('click', () => router.go('course/' + el.dataset.course)));
  card.querySelectorAll('[data-menu]').forEach(el => el.addEventListener('click', () => router.go('courses')));
  const testBtn = card.querySelector('[data-test]');
  if (testBtn) testBtn.addEventListener('click', () => router.go('quiz/' + testBtn.dataset.test));
  return card;
}

function buildTestRow(uid, cid) {
  const p = store.progress[`${uid}_${cid}`];
  if (!p || Object.keys(p.quizScores).length === 0) {
    return `<div>
      <div class="kz-section-h" style="margin-bottom:8px"><div class="kz-section-title">理解度テスト</div></div>
      <div class="test-row" style="background:var(--surface-2);border-color:var(--rule)">
        <div class="test-info">
          <div class="test-lbl" style="color:var(--dim)">テスト未受験</div>
          <div class="test-name" style="color:var(--ink)">コースを進めるとテストが受けられます</div>
        </div>
      </div>
    </div>`;
  }
  const latest = Object.entries(p.quizScores).sort()[Object.keys(p.quizScores).length - 1];
  const w = store.work(latest[0]);
  const score = latest[1];
  const pass = score >= 70;
  return `<div>
    <div class="kz-section-h" style="margin-bottom:8px"><div class="kz-section-title">理解度テスト</div></div>
    <div class="test-row">
      <div class="test-info">
        <div class="test-lbl">直近の受験</div>
        <div class="test-name">${esc(w ? w.title : '')} テスト</div>
        <div class="test-stat">正解率 <b>${score}</b>%（合格ライン 70%）${pass ? ' · 合格' : ' · 再受験推奨'}</div>
      </div>
      <button class="btn-retest" data-test="${latest[0]}">再テスト</button>
    </div>
  </div>`;
}

// ============================ View: Work Detail ============================
function buildDetailCard(w) {
  const uid = store.currentUserId;
  const isFav = store.isFav(w.id);
  const author = store.user(w.author);
  const approver = store.user(w.approver);

  const card = h('section', { class: 'card', id: 'detailCard' });

  const statusBanner = w.status === 'draft' ? `<div class="status-banner status-draft">${I.edit}下書き · 承認申請前</div>`
    : w.status === 'pending' ? `<div class="status-banner status-pending">${I.clock}承認待ち · ${esc(approver ? approver.name : '担当者')} が確認中</div>`
    : '';

  card.innerHTML = `
    <div class="detail-h">
      <a class="back-link" data-back>${I.left}戻る</a>
      <div class="detail-title">${esc(w.title)}</div>
      <button class="btn-fav ${isFav ? 'is-on' : ''}" data-fav>${I.star}${isFav ? 'お気に入り済' : 'お気に入り'}</button>
      <button class="btn-share" data-share>${I.share}共有</button>
      <button class="btn btn-secondary btn-sm" data-edit>${I.edit}編集</button>
    </div>
    ${statusBanner}
    <div class="chip-row">
      <button class="chip is-active" data-mode="doc">手順書</button>
      <button class="chip" data-mode="video">動画</button>
      <button class="chip" data-mode="dwg">図面</button>
      <button class="chip" data-mode="tips">コツ・注意点</button>
    </div>
    <div class="detail-body">
      <div class="video" id="videoBox">
        ${w.videoUrl ? renderVideo(w.videoUrl) : `<div class="video-placeholder">${I.play}<div>動画未登録</div><div style="margin-top:6px;font-weight:500">編集 → 動画URL を YouTube から貼り付けると再生できます</div></div>`}
      </div>
      <div class="summary">
        <div class="summary-h">
          <span>作業の概要</span>
          <span style="font-size:11px;color:var(--dim);font-weight:600">閲覧 ${w.views || 0}</span>
        </div>
        <div class="summary-row"><span class="summary-k">難易度</span><span class="summary-v">${difficultyBar(w.difficulty)}</span></div>
        <div class="summary-row"><span class="summary-k">想定時間</span><span class="summary-v">${esc(w.duration || '—')}</span></div>
        <div class="summary-row"><span class="summary-k">現場</span><span class="summary-v">${esc(w.site || '—')}</span></div>
        <div class="summary-row"><span class="summary-k">カテゴリ</span><span class="summary-v">${esc((store.category(w.category) || {}).name || '—')}</span></div>
        <div class="summary-row"><span class="summary-k">更新日</span><span class="summary-v">${fmtDate(w.updatedAt)}</span></div>
        <div class="summary-row"><span class="summary-k">作成者</span><span class="summary-v">${esc(author ? author.name : '—')}</span></div>
        <div class="summary-row"><span class="summary-k">承認者</span><span class="summary-v">${esc(approver ? approver.name : '—')}<span style="color:var(--dim);font-weight:600"> ${approver && approver.role !== '管理者' ? `（${approver.role}）` : ''}</span></span></div>
      </div>
    </div>
    <div class="sub-tabs" id="subTabs">
      <button class="sub-tab is-active" data-tab="steps">手順一覧 <small style="color:var(--dim);margin-left:3px">(${w.steps.length})</small></button>
      <button class="sub-tab" data-tab="tools">使用工具・材料</button>
      <button class="sub-tab" data-tab="resources">図面・資料</button>
      <button class="sub-tab" data-tab="tips">注意点・コツ</button>
      <button class="sub-tab" data-tab="history">関連履歴</button>
    </div>
    <div class="detail-lower" id="lowerContent"></div>`;

  const lower = card.querySelector('#lowerContent');

  function renderTab(tab) {
    lower.innerHTML = '';
    if (tab === 'steps') {
      const g = h('div', { class: 'detail-lower-grid' });
      const steps = h('div', { class: 'steps' });
      if (w.steps.length === 0) {
        steps.innerHTML = `<div class="empty" style="padding:24px 0">${I.book}<div>手順がまだ登録されていません</div></div>`;
      } else {
        w.steps.forEach((s, i) => {
          steps.append(h('div', { class: 'step' },
            h('div', { class: 'step-no' }, i + 1),
            h('div', { class: 'step-body' },
              h('div', { class: 'step-title' }, s.title),
              s.desc ? h('div', { class: 'step-desc' }, s.desc) : null,
              s.note ? h('div', { class: 'step-note' }, s.note) : null,
            )
          ));
        });
      }
      g.append(steps, buildRelatedBlock(w));
      lower.append(g);
    } else if (tab === 'tools') {
      const wrap = h('div', {});
      wrap.append(h('div', { class: 'related-h' }, '使用工具'));
      if (w.tools.length === 0) wrap.append(h('div', { class: 'empty', style: 'padding:20px 0' }, '登録なし'));
      else {
        const g = h('div', { class: 'tools-grid' });
        w.tools.forEach(t => g.append(h('div', { class: 'tool' }, h('span', { html: I.wrench }), h('span', { class: 'tool-name' }, t.name), h('span', { class: 'tool-qty' }, t.qty))));
        wrap.append(g);
      }
      wrap.append(h('div', { class: 'related-h', style: 'margin-top:16px' }, '使用材料'));
      if (w.materials.length === 0) wrap.append(h('div', { class: 'empty', style: 'padding:20px 0' }, '登録なし'));
      else {
        const g = h('div', { class: 'tools-grid' });
        w.materials.forEach(t => g.append(h('div', { class: 'tool' }, h('span', { html: I.wrench }), h('span', { class: 'tool-name' }, t.name), h('span', { class: 'tool-qty' }, t.qty))));
        wrap.append(g);
      }
      lower.append(wrap);
    } else if (tab === 'resources') {
      const wrap = h('div', {});
      wrap.append(h('div', { class: 'related-h' }, '添付資料'));
      if (w.resources.length === 0) wrap.append(h('div', { class: 'empty', style: 'padding:20px 0' }, '添付資料はありません'));
      else {
        const list = h('div', { class: 'rel-list' });
        w.resources.forEach(r => {
          const it = h('div', { class: 'rel-item' });
          const iconCls = r.type === 'pdf' ? 'pdf' : r.type === 'dwg' ? 'dwg' : r.type === 'img' ? 'img' : 'link';
          const iconSvg = r.type === 'pdf' ? I.pdf : r.type === 'dwg' ? I.dwg : r.type === 'img' ? I.img : I.link;
          it.innerHTML = `<div class="rel-icon ${iconCls}">${iconSvg}</div><div class="rel-title">${esc(r.name)}</div><div class="rel-meta">${esc(r.meta || r.type.toUpperCase())}</div>`;
          it.addEventListener('click', () => {
            if (r.url) window.open(r.url, '_blank');
            else toast('URL 未登録 — 編集画面でリンクを追加できます');
          });
          list.append(it);
        });
        wrap.append(list);
      }
      lower.append(wrap);
    } else if (tab === 'tips') {
      const wrap = h('div', {});
      wrap.append(h('div', { class: 'related-h' }, 'コツ・ポイント'));
      if (w.tips.length === 0) wrap.append(h('div', { class: 'empty', style: 'padding:20px 0' }, '登録なし'));
      else {
        const list = h('div', { class: 'tips-list' });
        w.tips.forEach(t => list.append(h('div', { class: 'tip' }, t)));
        wrap.append(list);
      }
      wrap.append(h('div', { class: 'related-h', style: 'margin-top:16px' }, '注意点・危険予知'));
      if (w.cautions.length === 0) wrap.append(h('div', { class: 'empty', style: 'padding:20px 0' }, '登録なし'));
      else {
        const list = h('div', { class: 'tips-list' });
        w.cautions.forEach(t => list.append(h('div', { class: 'caution' }, t)));
        wrap.append(list);
      }
      lower.append(wrap);
    } else if (tab === 'history') {
      const wrap = h('div', {});
      wrap.append(h('div', { class: 'related-h' }, '更新履歴'));
      if (w.history.length === 0) wrap.append(h('div', { class: 'empty', style: 'padding:20px 0' }, '履歴なし'));
      else {
        const list = h('div', { class: 'history' });
        w.history.forEach(hi => list.append(h('div', { class: 'hist' },
          h('div', { class: 'hist-time' }, hi.time),
          h('div', { class: 'hist-body' },
            h('div', { class: 'hist-who' }, hi.who),
            h('div', { class: 'hist-what' }, hi.what),
          )
        )));
        wrap.append(list);
      }
      lower.append(wrap);
    }
  }
  renderTab('steps');

  card.querySelectorAll('#subTabs [data-tab]').forEach(t => t.addEventListener('click', e => {
    card.querySelectorAll('#subTabs .sub-tab').forEach(x => x.classList.remove('is-active'));
    t.classList.add('is-active');
    renderTab(t.dataset.tab);
  }));

  card.querySelectorAll('[data-mode]').forEach(c => c.addEventListener('click', e => {
    card.querySelectorAll('[data-mode]').forEach(x => x.classList.remove('is-active'));
    c.classList.add('is-active');
    const activeTab = { doc: 'steps', video: 'steps', dwg: 'resources', tips: 'tips' }[c.dataset.mode];
    card.querySelectorAll('#subTabs .sub-tab').forEach(x => x.classList.remove('is-active'));
    card.querySelector(`[data-tab="${activeTab}"]`).classList.add('is-active');
    renderTab(activeTab);
    if (c.dataset.mode === 'video') card.querySelector('#videoBox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));

  card.querySelector('[data-back]').addEventListener('click', () => history.back());
  card.querySelector('[data-fav]').addEventListener('click', () => {
    const on = store.toggleFav(w.id);
    toast(on ? 'お気に入りに追加しました' : 'お気に入りから外しました', 'success');
    render();
  });
  card.querySelector('[data-share]').addEventListener('click', () => {
    const url = location.origin + location.pathname + '#work/' + w.id;
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('URL をコピーしました', 'success'));
    else toast(url);
  });
  card.querySelector('[data-edit]').addEventListener('click', () => router.go('work/' + w.id + '/edit'));

  return card;
}

function buildRelatedBlock(w) {
  const wrap = h('div', { class: 'related-block' });
  const rel = h('div', {});
  rel.innerHTML = `<div class="related-h">関連データ</div>`;
  const list = h('div', { class: 'rel-list' });
  if (w.resources.length === 0) {
    list.innerHTML = '<div class="empty" style="padding:12px 0;font-size:11.5px">添付なし</div>';
  } else {
    w.resources.slice(0, 4).forEach(r => {
      const iconCls = r.type === 'pdf' ? 'pdf' : r.type === 'dwg' ? 'dwg' : r.type === 'img' ? 'img' : 'link';
      const iconSvg = r.type === 'pdf' ? I.pdf : r.type === 'dwg' ? I.dwg : r.type === 'img' ? I.img : I.link;
      const it = h('div', { class: 'rel-item' });
      it.innerHTML = `<div class="rel-icon ${iconCls}">${iconSvg}</div><div class="rel-title">${esc(r.name)}</div><div class="rel-meta">${esc(r.meta || '')}</div>`;
      list.append(it);
    });
  }
  rel.append(list);
  wrap.append(rel);

  const rel2 = h('div', {});
  rel2.innerHTML = `<div class="related-h">関連する作業</div>`;
  const ul = h('ul', { class: 'rel-links' });
  const related = (w.relatedIds || []).map(id => store.work(id)).filter(Boolean).slice(0, 5);
  if (related.length === 0) {
    ul.innerHTML = '<div class="empty" style="padding:12px 0;font-size:11.5px">なし</div>';
  } else {
    related.forEach(r => {
      const li = h('li', {}, r.title);
      li.addEventListener('click', () => router.go('work/' + r.id));
      ul.append(li);
    });
  }
  rel2.append(ul);
  wrap.append(rel2);
  return wrap;
}

function renderVideo(url) {
  // parse YouTube URL
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  if (m) return `<iframe src="https://www.youtube.com/embed/${m[1]}?rel=0" allowfullscreen title="動画"></iframe>`;
  // Vimeo
  const v = url.match(/vimeo\.com\/(\d+)/);
  if (v) return `<iframe src="https://player.vimeo.com/video/${v[1]}" allowfullscreen title="動画"></iframe>`;
  // Direct video URL
  if (/\.(mp4|webm|mov)$/i.test(url)) return `<video controls src="${esc(url)}" style="position:absolute;inset:0;width:100%;height:100%;background:#000"></video>`;
  return `<div class="video-placeholder">${I.play}<div>再生できない URL 形式です</div><div style="margin-top:4px"><code style="background:#fff;color:var(--ink);padding:2px 6px;border-radius:3px;font-size:10px">${esc(url)}</code></div></div>`;
}

function viewWorkDetail(root, params) {
  const w = store.work(params.id);
  if (!w) {
    root.innerHTML = `<div class="empty">${I.reject}<div>作業が見つかりません</div></div>`;
    return;
  }
  store.pushRecent(w.id);
  root.append(h('div', { class: 'crumbs' },
    h('a', { onclick: () => router.go('home') }, 'ホーム'), ' / ',
    h('a', { onclick: () => router.go('database') }, 'データベース'), ' / ',
    h('span', {}, w.title)
  ));
  root.append(buildDetailCard(w));
}

// ============================ View: Search / list ============================
function filterWorks(q, opts = {}) {
  const query = (q || '').trim().toLowerCase();
  const kws = query ? query.split(/\s+/) : [];
  return store.works.filter(w => {
    if (opts.status && w.status !== opts.status) return false;
    if (opts.status == null && w.status === 'draft') return false;
    if (opts.category && w.category !== opts.category) return false;
    if (kws.length === 0) return true;
    const hay = [w.title, w.site, ...(w.tags || []), (store.category(w.category) || {}).name || '', w.description || ''].join(' ').toLowerCase();
    return kws.every(k => hay.includes(k));
  });
}

function viewSearch(root, params) {
  const q = params.q || '';
  const cat = params.category || '';
  const tab = params.tab || 'all';

  const wrapper = h('section', { class: 'card' });
  wrapper.innerHTML = `
    <div class="sr-h">
      <div class="page-title" style="font-size:18px">作業を探す</div>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <div class="sr-input-wrap">${I.search}<input class="sr-input" id="qIn" placeholder="キーワード" value="${esc(q)}"></div>
        <button class="btn btn-primary btn-sm" id="doSearch">検索</button>
        <button class="btn btn-secondary btn-sm" id="newBtn">${I.plus}新しい作業</button>
      </div>
    </div>
    <div class="toolbar">
      <span style="font-size:11.5px;color:var(--dim);font-weight:700">カテゴリ:</span>
      <button class="cat-chip ${!cat ? 'on' : ''}" data-cat="">すべて</button>
      ${store.categories.map(c => `<button class="cat-chip ${cat === c.id ? 'on' : ''}" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}
    </div>
    <div class="sr-tabs" id="srTabs"></div>
    <div class="sr-body">
      <div class="sr-list" id="srList"></div>
      <aside class="sr-side">
        <div class="sr-side-h">タグ</div>
        <div class="sr-kw" id="kwList"></div>
      </aside>
    </div>`;
  root.append(wrapper);

  function refresh() {
    const results = filterWorks(q, { category: cat || null });
    const perTab = {
      all: results,
      doc: results.filter(w => w.steps.length),
      video: results.filter(w => w.videoUrl),
      dwg: results.filter(w => (w.resources || []).some(r => r.type === 'pdf' || r.type === 'dwg')),
    };
    const active = perTab[tab] || perTab.all;

    wrapper.querySelector('#srTabs').innerHTML = `
      <button class="sr-tab ${tab === 'all' ? 'is-active' : ''}" data-tab="all">すべて <span class="cnt">(${perTab.all.length})</span></button>
      <button class="sr-tab ${tab === 'doc' ? 'is-active' : ''}" data-tab="doc">手順書 <span class="cnt">(${perTab.doc.length})</span></button>
      <button class="sr-tab ${tab === 'video' ? 'is-active' : ''}" data-tab="video">動画 <span class="cnt">(${perTab.video.length})</span></button>
      <button class="sr-tab ${tab === 'dwg' ? 'is-active' : ''}" data-tab="dwg">図面 <span class="cnt">(${perTab.dwg.length})</span></button>`;

    const list = wrapper.querySelector('#srList');
    list.innerHTML = '';
    if (active.length === 0) {
      list.append(h('div', { class: 'empty' }, h('div', { html: I.search }), h('div', {}, '該当なし。キーワードを変えて試してみてください。')));
    } else active.forEach((w, i) => list.append(searchCard(w, i)));

    // keywords sidebar
    const kwCount = {};
    filterWorks('', { category: cat || null }).forEach(w => (w.tags || []).forEach(t => kwCount[t] = (kwCount[t] || 0) + 1));
    const kws = Object.entries(kwCount).sort((a, b) => b[1] - a[1]).slice(0, 12);
    wrapper.querySelector('#kwList').innerHTML = kws.map(([k, c]) =>
      `<div class="sr-kw-item" data-kw="${esc(k)}"><span>${esc(k)}</span><span class="n">(${c})</span></div>`
    ).join('');

    wrapper.querySelectorAll('#srTabs [data-tab]').forEach(el => el.addEventListener('click', () => router.go('search', { q, category: cat, tab: el.dataset.tab })));
    wrapper.querySelectorAll('[data-kw]').forEach(el => el.addEventListener('click', () => router.go('search', { q: el.dataset.kw, category: cat })));
  }

  refresh();

  wrapper.querySelector('#qIn').addEventListener('keydown', e => {
    if (e.key === 'Enter') router.go('search', { q: e.target.value, category: cat, tab });
  });
  wrapper.querySelector('#doSearch').addEventListener('click', () => router.go('search', { q: wrapper.querySelector('#qIn').value, category: cat, tab }));
  wrapper.querySelectorAll('[data-cat]').forEach(el => el.addEventListener('click', () => router.go('search', { q, category: el.dataset.cat, tab })));
  wrapper.querySelector('#newBtn').addEventListener('click', () => router.go('new'));
}

// ============================ Favorites / Recent ============================
function viewFavorites(root) {
  const uid = store.currentUserId;
  const favIds = store.favorites[uid] || [];
  const works = favIds.map(id => store.work(id)).filter(Boolean);
  root.append(h('div', { class: 'page-h' }, h('div', { class: 'page-title' }, 'お気に入り'), h('div', { style: 'color:var(--dim);font-weight:700;font-size:13px' }, `${works.length} 件`)));
  if (works.length === 0) {
    root.append(h('section', { class: 'card' }, h('div', { class: 'empty' }, h('div', { html: I.starOutline }), h('div', {}, 'まだお気に入りがありません。'), h('div', { style: 'margin-top:4px;font-size:12px' }, '作業詳細ページの★アイコンで登録できます。'))));
    return;
  }
  const grid = h('div', { class: 'db-grid' });
  works.forEach((w, i) => grid.append(workCard(w, i)));
  const card = h('section', { class: 'card' });
  card.append(grid);
  root.append(card);
}

function viewRecent(root) {
  const uid = store.currentUserId;
  const list = store.recent[uid] || [];
  root.append(h('div', { class: 'page-h' }, h('div', { class: 'page-title' }, '最近の閲覧'), h('div', { style: 'color:var(--dim);font-weight:700;font-size:13px' }, `${list.length} 件`)));
  const card = h('section', { class: 'card' });
  if (list.length === 0) {
    card.append(h('div', { class: 'empty' }, h('div', { html: I.clock }), h('div', {}, 'まだ閲覧履歴がありません。')));
  } else {
    const box = h('div', { class: 'list', style: 'padding:8px 18px' });
    list.forEach(r => {
      const w = store.work(r.workId);
      if (!w) return;
      const it = h('div', { class: 'list-item' });
      it.innerHTML = `
        <span class="list-icon li-doc">D</span>
        <span class="list-title">${esc(w.title)}</span>
        <span style="color:var(--dim);font-size:11px;font-weight:600">${esc((store.category(w.category) || {}).name || '')}</span>
        <span class="list-date">${fmtRelative(r.ts)}</span>`;
      it.addEventListener('click', () => router.go('work/' + w.id));
      box.append(it);
    });
    card.append(box);
  }
  root.append(card);
}

// ============================ Mypage ============================
function viewMypage(root) {
  const u = store.user();
  const uid = store.currentUserId;
  const authored = store.works.filter(w => w.author === uid);
  const favs = (store.favorites[uid] || []).length;
  const recent = (store.recent[uid] || []).length;
  const learnedChapters = Object.entries(store.progress)
    .filter(([k]) => k.startsWith(uid + '_'))
    .reduce((s, [, p]) => s + p.chaptersDone.length, 0);

  const hero = h('div', { class: 'mp-hero' });
  hero.innerHTML = `
    <div class="mp-avatar">${esc(u.initials)}</div>
    <div>
      <div class="mp-name">${esc(u.name)}</div>
      <div class="mp-role">${esc(u.role)} · ${esc(u.title || '')}</div>
      <div class="mp-metrics">
        <div><div class="mp-metric-v">${authored.length}</div><div class="mp-metric-l">投稿した手順書</div></div>
        <div><div class="mp-metric-v">${favs}</div><div class="mp-metric-l">お気に入り</div></div>
        <div><div class="mp-metric-v">${recent}</div><div class="mp-metric-l">閲覧履歴</div></div>
        <div><div class="mp-metric-v">${learnedChapters}</div><div class="mp-metric-l">学習した章</div></div>
      </div>
    </div>`;
  root.append(hero);

  const authoredCard = h('section', { class: 'card' });
  authoredCard.innerHTML = `<header class="card-h"><div class="card-h-title">投稿した手順書 <small>(${authored.length})</small></div>
    <button class="btn btn-primary btn-sm" data-new>${I.plus}新規追加</button></header>`;
  const grid = h('div', { class: 'db-grid' });
  if (authored.length === 0) grid.innerHTML = '<div class="empty">まだ投稿がありません</div>';
  else authored.forEach(w => grid.append(workCard(w)));
  authoredCard.append(grid);
  authoredCard.querySelector('[data-new]').addEventListener('click', () => router.go('new'));
  root.append(authoredCard);

  // Course progress
  const courseCard = h('section', { class: 'card' });
  courseCard.innerHTML = `<header class="card-h"><div class="card-h-title">学習進捗</div></header><div style="padding:14px 18px 18px 18px"><div class="course-grid" id="cGrid"></div></div>`;
  const cg = courseCard.querySelector('#cGrid');
  store.courses.forEach(c => {
    const p = store.progress[`${uid}_${c.id}`] || { chaptersDone: [] };
    const ratio = p.chaptersDone.length / c.chapters.length;
    const el = h('div', { class: 'course' });
    el.innerHTML = `
      <div class="course-badge ${ratio === 1 ? 'done' : ratio > 0 ? 'hi' : ''}">${ratio === 1 ? '完了' : ratio > 0 ? '受講中' : '未受講'}</div>
      <div class="course-name">${esc(c.name)}</div>
      <div class="course-meta">${esc(c.level)} · 全${c.chapters.length}章</div>
      <div class="course-progress">
        <div class="course-progress-bar"><span class="${ratio === 1 ? 'pb-green' : 'pb-blue'}" style="width:${(ratio * 100).toFixed(0)}%"></span></div>
        <div class="course-progress-lbl"><span>${p.chaptersDone.length}/${c.chapters.length}</span><span>${(ratio * 100).toFixed(0)}%</span></div>
      </div>`;
    el.addEventListener('click', () => router.go('course/' + c.id));
    cg.append(el);
  });
  root.append(courseCard);
}

// ============================ Notices ============================
function viewNotices(root) {
  const uid = store.currentUserId;
  const read = store.read[uid] || [];
  root.append(h('div', { class: 'page-h' }, h('div', { class: 'page-title' }, 'お知らせ'), h('div', { style: 'color:var(--dim);font-weight:700;font-size:13px' }, `未読 ${store.unreadCount()} / 全 ${store.notices.length}`)));
  const card = h('section', { class: 'card' });
  const box = h('div', { class: 'notice-list' });
  store.notices.forEach(n => {
    const unread = !read.includes(n.id);
    const row = h('div', { class: 'notice-row ' + (unread ? 'unread' : '') });
    const pillCls = n.type === 'new' ? 'pill-new' : n.type === 'warn' ? 'pill-warn' : 'pill-info';
    const pillLbl = n.type === 'new' ? 'NEW' : n.type === 'warn' ? '重要' : '連絡';
    row.innerHTML = `
      <span class="pill ${pillCls}">${pillLbl}</span>
      <div class="notice-body">
        <div class="notice-title">${unread ? '<span class="pill-dot"></span>' : ''}${esc(n.title)}</div>
        <div class="notice-desc">${esc(n.body)}</div>
      </div>
      <div class="notice-date">${fmtDate(n.createdAt)}</div>`;
    row.addEventListener('click', () => router.go('notice/' + n.id));
    box.append(row);
  });
  card.append(box);
  root.append(card);
}

function viewNoticeDetail(root, params) {
  const n = store.notices.find(x => x.id === params.id);
  if (!n) { root.innerHTML = '<div class="empty">お知らせが見つかりません</div>'; return; }
  store.markRead(n.id);
  const pillCls = n.type === 'new' ? 'pill-new' : n.type === 'warn' ? 'pill-warn' : 'pill-info';
  const pillLbl = n.type === 'new' ? 'NEW' : n.type === 'warn' ? '重要' : '連絡';
  const card = h('section', { class: 'card' });
  card.innerHTML = `
    <div class="detail-h">
      <a class="back-link" data-back>${I.left}戻る</a>
      <div class="detail-title">${esc(n.title)}</div>
    </div>
    <div style="padding:18px 22px 22px 22px">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
        <span class="pill ${pillCls}">${pillLbl}</span>
        <span style="color:var(--dim);font-size:12px;font-weight:600">${fmtDate(n.createdAt)}</span>
      </div>
      <div style="font-size:14px;line-height:1.8;color:var(--ink-2);white-space:pre-wrap">${esc(n.body)}</div>
      ${n.workId ? `<div style="margin-top:18px"><button class="btn btn-primary" data-goto>関連手順書を開く ${I.right}</button></div>` : ''}
    </div>`;
  card.querySelector('[data-back]').addEventListener('click', () => history.back());
  if (n.workId) card.querySelector('[data-goto]').addEventListener('click', () => router.go('work/' + n.workId));
  root.append(card);
}

// ============================ Approve ============================
function viewApprove(root) {
  const pending = store.works.filter(w => w.status === 'pending');
  root.append(h('div', { class: 'page-h' }, h('div', { class: 'page-title' }, '承認・確認'), h('div', { style: 'color:var(--dim);font-weight:700;font-size:13px' }, `${pending.length} 件が承認待ち`)));
  const card = h('section', { class: 'card' });
  if (pending.length === 0) {
    card.append(h('div', { class: 'empty' }, h('div', { html: I.check }), h('div', {}, '承認待ちはありません')));
  } else {
    const tbl = h('table', { class: 'app-table' });
    tbl.innerHTML = `<thead><tr><th>タイトル</th><th>カテゴリ</th><th>提出者</th><th>提出日</th><th>操作</th></tr></thead><tbody></tbody>`;
    const tb = tbl.querySelector('tbody');
    pending.forEach(w => {
      const author = store.user(w.author);
      const cat = store.category(w.category);
      const tr = h('tr', {});
      tr.innerHTML = `
        <td><a style="color:var(--primary);font-weight:800" data-open>${esc(w.title)}</a></td>
        <td>${esc(cat ? cat.name : '—')}</td>
        <td>${esc(author ? author.name : '—')}</td>
        <td style="color:var(--dim);font-family:var(--font-latin);font-size:12px">${fmtDate(w.updatedAt)}</td>
        <td><div class="app-actions">
          <button class="btn btn-primary btn-sm" data-approve>${I.approve}承認</button>
          <button class="btn btn-danger btn-sm" data-reject>${I.reject}差戻し</button>
        </div></td>`;
      tr.querySelector('[data-open]').addEventListener('click', () => router.go('work/' + w.id));
      tr.querySelector('[data-approve]').addEventListener('click', async () => {
        const ok = await confirmModal('承認確認', h('div', {}, `「${w.title}」を承認して公開しますか?`));
        if (!ok) return;
        w.status = 'published';
        w.approver = store.currentUserId;
        w.updatedAt = new Date().toISOString().slice(0, 10);
        w.history = w.history || [];
        w.history.unshift({ time: fmtDate(Date.now()).slice(5), who: store.user().name, what: '承認して公開しました' });
        store.save('works');
        toast('承認しました', 'success');
        render();
      });
      tr.querySelector('[data-reject]').addEventListener('click', async () => {
        const ok = await confirmModal('差戻し確認', h('div', {}, `「${w.title}」を差戻しますか? (下書きに戻ります)`));
        if (!ok) return;
        w.status = 'draft';
        w.history = w.history || [];
        w.history.unshift({ time: fmtDate(Date.now()).slice(5), who: store.user().name, what: '差戻ししました' });
        store.save('works');
        toast('差戻ししました');
        render();
      });
      tb.append(tr);
    });
    card.append(tbl);
  }
  root.append(card);
}

// ============================ Database ============================
function viewDatabase(root) {
  const state = { cat: '', q: '' };
  root.append(h('div', { class: 'page-h' },
    h('div', {}, h('div', { class: 'page-title' }, 'データベース'), h('div', { class: 'page-sub' }, '全ての作業手順書を一覧できます')),
    h('button', { class: 'btn btn-primary', onclick: () => router.go('new') }, h('span', { html: I.plus }), '新しい作業を追加')
  ));
  const card = h('section', { class: 'card' });
  card.innerHTML = `
    <div class="db-toolbar">
      <div class="sr-input-wrap" style="max-width:280px">${I.search}<input class="sr-input" id="dbq" placeholder="タイトル・タグで検索"></div>
      <div class="db-filters" id="dbCat">
        <button class="cat-chip on" data-cat="">すべて</button>
        ${store.categories.map(c => `<button class="cat-chip" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}
      </div>
      <div class="db-count" id="dbCount"></div>
    </div>
    <div class="db-grid" id="dbGrid"></div>`;
  root.append(card);
  const grid = card.querySelector('#dbGrid');
  const cnt = card.querySelector('#dbCount');
  function refresh() {
    const works = filterWorks(state.q, { category: state.cat || null });
    grid.innerHTML = '';
    if (works.length === 0) grid.innerHTML = '<div class="empty" style="grid-column:1/-1">該当する作業がありません</div>';
    else works.forEach((w, i) => grid.append(workCard(w, i)));
    cnt.textContent = `${works.length} 件`;
  }
  refresh();
  card.querySelector('#dbq').addEventListener('input', e => { state.q = e.target.value; refresh(); });
  card.querySelectorAll('#dbCat [data-cat]').forEach(el => el.addEventListener('click', () => {
    card.querySelectorAll('#dbCat [data-cat]').forEach(x => x.classList.remove('on'));
    el.classList.add('on');
    state.cat = el.dataset.cat;
    refresh();
  }));
}

// ============================ Courses ============================
function viewCoursesTop(root) {
  const uid = store.currentUserId;
  root.append(h('div', { class: 'page-h' },
    h('div', {}, h('div', { class: 'page-title' }, '教材モード'), h('div', { class: 'page-sub' }, '若手技術者の育成カリキュラム'))));
  const enrolled = store.courses.map(c => {
    const p = store.progress[`${uid}_${c.id}`];
    const done = p ? p.chaptersDone.length : 0;
    return { c, done, total: c.chapters.length, ratio: done / c.chapters.length };
  });
  const current = enrolled.find(e => e.done > 0 && e.done < e.total) || enrolled[0];

  const nl = h('section', { class: 'card', style: 'padding:0' });
  nl.innerHTML = `<div class="kz-body">
    <div class="now-learning">
      <div class="nl-thumb">${I.book}</div>
      <div class="nl-info">
        <div class="nl-eyebrow">受講中</div>
        <div class="nl-name">${esc(current.c.name)}</div>
        <div style="font-size:12px;color:#cbd5e1;margin-top:4px">${esc(current.c.description || '')}</div>
        <div class="nl-progress"><div class="nl-progress-fill" style="width:${(current.ratio * 100).toFixed(0)}%"></div></div>
        <div class="nl-progress-lbl"><span>Chapter ${current.done} / ${current.total}</span><span>${(current.ratio * 100).toFixed(0)}%</span></div>
      </div>
      <button class="nl-cta" data-cont>学習を続ける</button>
    </div>
  </div>`;
  nl.querySelector('[data-cont]').addEventListener('click', () => router.go('course/' + current.c.id));
  root.append(nl);

  const list = h('section', { class: 'card' });
  list.innerHTML = `<header class="card-h"><div class="card-h-title">コース一覧</div></header>
    <div style="padding:14px 18px 18px 18px"><div class="course-grid" id="cGrid"></div></div>`;
  const cg = list.querySelector('#cGrid');
  enrolled.forEach(e => {
    const done = e.done === e.total;
    const el = h('div', { class: 'course' });
    el.innerHTML = `
      <div class="course-badge ${done ? 'done' : e.done > 0 ? 'hi' : ''}">${done ? '完了' : e.done > 0 ? '受講中' : '未受講'}</div>
      <div class="course-name">${esc(e.c.name)}</div>
      <div class="course-meta">${esc(e.c.level)} · 全${e.total}章</div>
      <div style="font-size:11px;color:var(--dim);font-weight:500;line-height:1.5;margin:6px 0">${esc(e.c.description || '')}</div>
      <div class="course-progress">
        <div class="course-progress-bar"><span class="${done ? 'pb-green' : e.c.badge === 'basic' ? 'pb-blue' : 'pb-orange'}" style="width:${(e.ratio * 100).toFixed(0)}%"></span></div>
        <div class="course-progress-lbl"><span>${e.done}/${e.total}</span><span>${(e.ratio * 100).toFixed(0)}%</span></div>
      </div>`;
    el.addEventListener('click', () => router.go('course/' + e.c.id));
    cg.append(el);
  });
  root.append(list);
}

function viewCourseDetail(root, params) {
  const c = store.course(params.id);
  if (!c) { root.innerHTML = '<div class="empty">コースが見つかりません</div>'; return; }
  const uid = store.currentUserId;
  const p = store.progressOf(uid, c.id);

  root.append(h('div', { class: 'crumbs' },
    h('a', { onclick: () => router.go('courses') }, '教材モード'), ' / ', h('span', {}, c.name)));

  const card = h('section', { class: 'card' });
  const ratio = p.chaptersDone.length / c.chapters.length;
  card.innerHTML = `
    <div class="detail-h">
      <a class="back-link" data-back>${I.left}戻る</a>
      <div>
        <div class="detail-title">${esc(c.name)}</div>
        <div style="font-size:12.5px;color:var(--dim);font-weight:600;margin-top:2px">${esc(c.level)} · ${esc(c.description || '')}</div>
      </div>
    </div>
    <div style="padding:14px 18px 0 18px">
      <div class="quiz-progress" style="margin-bottom:0">
        <div class="quiz-q">進捗 <b>${(ratio * 100).toFixed(0)}%</b></div>
        <div class="quiz-progress-bar"><span style="width:${(ratio * 100).toFixed(0)}%"></span></div>
        <div style="font-size:12px;font-weight:700;color:var(--primary-hi);font-family:var(--font-latin)">${p.chaptersDone.length} / ${c.chapters.length}</div>
      </div>
    </div>
    <div style="padding:16px 18px 18px 18px"><div class="chapter-list" id="chList"></div></div>`;
  const cl = card.querySelector('#chList');
  c.chapters.forEach((ch, i) => {
    const isDone = p.chaptersDone.includes(i);
    const w = ch.workId ? store.work(ch.workId) : null;
    const el = h('div', { class: 'chapter ' + (isDone ? 'done' : '') });
    el.innerHTML = `
      <div class="chap-check ${isDone ? 'on' : ''}" title="完了マーク">${isDone ? I.approve : I.check.replace('<svg', '<svg style="opacity:.3"')}</div>
      <div class="chap-body">
        <div class="chap-title">${esc(ch.title)}</div>
        <div class="chap-meta">${w ? '関連手順書: ' + esc(w.title) : 'ドキュメント / 講義'}</div>
      </div>
      <div class="chap-len">${ch.duration}分</div>
      ${w ? `<button class="chap-go" data-w="${w.id}">開く ${I.right}</button>` : `<button class="chap-go" style="background:var(--surface-2);color:var(--dim)" disabled>—</button>`}`;
    el.querySelector('.chap-check').addEventListener('click', e => {
      e.stopPropagation();
      store.toggleChapter(uid, c.id, i);
      toast(isDone ? '未完了に戻しました' : '完了しました', 'success');
      render();
    });
    const goBtn = el.querySelector('[data-w]');
    if (goBtn) goBtn.addEventListener('click', e => { e.stopPropagation(); router.go('work/' + w.id); });
    cl.append(el);
  });
  card.querySelector('[data-back]').addEventListener('click', () => router.go('courses'));
  root.append(card);

  // Quizzes available
  const quizWorks = c.chapters.filter(ch => ch.workId && store.quizzes[ch.workId]).map(ch => store.work(ch.workId)).filter(Boolean);
  const uniq = Array.from(new Map(quizWorks.map(w => [w.id, w])).values());
  if (uniq.length) {
    const qCard = h('section', { class: 'card' });
    qCard.innerHTML = `<header class="card-h"><div class="card-h-title">理解度テスト</div></header>
      <div style="padding:8px 18px 18px 18px;display:flex;flex-direction:column;gap:8px" id="qList"></div>`;
    const ql = qCard.querySelector('#qList');
    uniq.forEach(w => {
      const score = p.quizScores[w.id];
      const pass = score >= 70;
      const row = h('div', { class: 'test-row', style: 'background:' + (score == null ? 'var(--surface-2)' : pass ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)' : 'linear-gradient(135deg,#fef3c7,#fde68a)') + ';border-color:' + (score == null ? 'var(--rule)' : pass ? '#6ee7b7' : '#fcd34d') });
      row.innerHTML = `
        <div class="test-info">
          <div class="test-lbl" style="color:${score == null ? 'var(--dim)' : pass ? '#065f46' : '#b45309'}">${score == null ? '未受験' : pass ? '合格' : '再受験推奨'}</div>
          <div class="test-name" style="color:${score == null ? 'var(--ink)' : pass ? '#065f46' : '#78350f'}">${esc(w.title)} テスト</div>
          <div class="test-stat" style="color:${score == null ? 'var(--dim)' : pass ? '#065f46' : '#78350f'}">${score == null ? '未受験' : `正解率 <b>${score}</b>%（合格ライン 70%）`}</div>
        </div>
        <button class="btn-retest" style="background:${score == null ? 'var(--primary)' : pass ? '#065f46' : '#78350f'};color:${score == null ? '#fff' : pass ? '#a7f3d0' : '#fbbf24'}" data-quiz="${w.id}">${score == null ? '受験する' : '再テスト'}</button>`;
      row.querySelector('[data-quiz]').addEventListener('click', () => router.go('quiz/' + w.id));
      ql.append(row);
    });
    root.append(qCard);
  }
}

// ============================ Quiz ============================
function viewQuiz(root, params) {
  const workId = params.id;
  const w = store.work(workId);
  const questions = store.quizzes[workId];
  if (!w || !questions || questions.length === 0) {
    root.innerHTML = '<div class="empty">このテストは準備中です</div>';
    return;
  }
  const state = {
    idx: 0,
    picks: [],
    submitted: false,
  };
  const shell = h('div', { class: 'quiz-shell' });
  const cardHdr = h('div', { class: 'crumbs' },
    h('a', { onclick: () => history.back() }, '戻る'), ' / ',
    h('span', {}, `${w.title} テスト`));
  shell.append(cardHdr);
  const progressBar = h('div', { class: 'quiz-progress' });
  const card = h('section', { class: 'card' });
  shell.append(progressBar, card);
  root.append(shell);

  function renderQ() {
    if (state.idx >= questions.length) return renderResult();
    const q = questions[state.idx];
    const pct = ((state.idx) / questions.length * 100).toFixed(0);
    progressBar.innerHTML = `
      <div class="quiz-q">問<b>${state.idx + 1}</b> / ${questions.length}</div>
      <div class="quiz-progress-bar"><span style="width:${pct}%"></span></div>
      <div style="font-size:12px;font-weight:700;color:var(--primary-hi);font-family:var(--font-latin)">${pct}%</div>`;
    card.innerHTML = `<div class="quiz-card">
      <div class="quiz-qtxt">${esc(q.q)}</div>
      <div class="quiz-choices" id="qc"></div>
      <div class="quiz-actions">
        <button class="btn btn-secondary" ${state.idx === 0 ? 'disabled' : ''} data-prev>${I.left}前の問題</button>
        <div style="font-size:11.5px;color:var(--dim);font-weight:600">回答を選ぶと次へ</div>
        <button class="btn btn-primary" data-next ${state.picks[state.idx] == null ? 'disabled' : ''}>${state.idx === questions.length - 1 ? '採点する' : '次の問題'}${I.right}</button>
      </div>
    </div>`;
    const qc = card.querySelector('#qc');
    q.choices.forEach((c, i) => {
      const div = h('div', { class: 'quiz-choice ' + (state.picks[state.idx] === i ? 'picked' : '') });
      div.innerHTML = `<div class="quiz-letter">${String.fromCharCode(65 + i)}</div><div>${esc(c)}</div>`;
      div.addEventListener('click', () => {
        state.picks[state.idx] = i;
        renderQ();
      });
      qc.append(div);
    });
    card.querySelector('[data-prev]').addEventListener('click', () => { if (state.idx > 0) { state.idx--; renderQ(); } });
    card.querySelector('[data-next]').addEventListener('click', () => {
      if (state.picks[state.idx] == null) return;
      state.idx++;
      renderQ();
    });
  }

  function renderResult() {
    const correct = questions.reduce((s, q, i) => s + (state.picks[i] === q.answer ? 1 : 0), 0);
    const score = Math.round(correct / questions.length * 100);
    const pass = score >= 70;
    store.saveQuizScore(store.currentUserId, workId, score);
    progressBar.innerHTML = `
      <div class="quiz-q">結果</div>
      <div class="quiz-progress-bar"><span style="width:100%"></span></div>
      <div style="font-size:12px;font-weight:700;color:var(--primary-hi);font-family:var(--font-latin)">100%</div>`;
    card.innerHTML = `<div class="quiz-result">
      <div class="quiz-score ${pass ? 'pass' : 'fail'}">${score}<span style="font-size:24px">%</span></div>
      <div class="quiz-score-lbl">${correct} / ${questions.length} 問正解</div>
      <div class="quiz-verdict ${pass ? 'pass' : 'fail'}">${pass ? '合格 · 現場で試してみましょう' : '不合格 · 復習してから再受験を'}</div>
      <div class="quiz-summary">合格ライン 70%</div>
      <div style="margin-top:26px;display:flex;gap:8px;justify-content:center">
        <button class="btn btn-secondary" data-review>解答を見直す</button>
        <button class="btn btn-primary" data-retry>もう一度受験する</button>
        <button class="btn btn-ghost" data-back>戻る</button>
      </div>
    </div>`;
    card.querySelector('[data-retry]').addEventListener('click', () => { state.idx = 0; state.picks = []; renderQ(); });
    card.querySelector('[data-back]').addEventListener('click', () => history.back());
    card.querySelector('[data-review]').addEventListener('click', () => {
      const wrap = h('div', {});
      questions.forEach((q, i) => {
        const pick = state.picks[i];
        wrap.append(h('div', { style: 'margin-bottom:14px' },
          h('div', { class: 'quiz-qtxt', style: 'font-size:14px;margin-bottom:8px' }, `問${i + 1}. ${q.q}`),
          h('div', { class: 'quiz-choices' }, ...q.choices.map((c, ci) => {
            const div = h('div', { class: 'quiz-choice ' + (ci === q.answer ? 'correct' : (ci === pick && pick !== q.answer ? 'wrong' : '')) });
            div.innerHTML = `<div class="quiz-letter">${String.fromCharCode(65 + ci)}</div><div>${esc(c)}</div>`;
            return div;
          })),
          h('div', { class: 'quiz-explain' }, q.explain || '')
        ));
      });
      modal('解答と解説', wrap, (row, close) => {
        row.append(h('button', { class: 'btn btn-primary', onclick: () => close(true) }, '閉じる'));
      });
    });
  }
  renderQ();
}

// ============================ Admin ============================
function viewAdmin(root) {
  root.append(h('div', { class: 'page-h' }, h('div', { class: 'page-title' }, '管理メニュー'), h('div', { class: 'page-sub' }, 'テナント設定・データ管理')));

  const grid = h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:16px' });

  const users = h('section', { class: 'card' });
  users.innerHTML = `<header class="card-h"><div class="card-h-title">ユーザー</div>
    <div style="font-size:12px;color:var(--dim);font-weight:600">${store.users.length} 名</div></header>
    <div style="padding:8px 18px 18px 18px" id="uList"></div>`;
  const ul = users.querySelector('#uList');
  store.users.forEach(u => {
    const isC = u.id === store.currentUserId;
    const row = h('div', { class: 'list-item', style: 'padding:11px 4px' });
    row.innerHTML = `
      <div class="avatar ${u.avatarClass}" style="width:36px;height:36px;font-size:13px">${esc(u.initials)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:800;color:var(--ink);font-size:13.5px">${esc(u.name)} ${isC ? '<span class="pill pill-info" style="margin-left:6px">現在ログイン中</span>' : ''}</div>
        <div style="font-size:11.5px;color:var(--dim);font-weight:600">${esc(u.role)} · ${esc(u.title || '')}</div>
      </div>
      ${isC ? '' : '<button class="btn btn-secondary btn-sm" data-sw>切替</button>'}`;
    if (!isC) row.querySelector('[data-sw]').addEventListener('click', () => {
      store.currentUserId = u.id; store.save('currentUserId'); toast(`${u.name} に切替えました`, 'success'); render();
    });
    ul.append(row);
  });
  grid.append(users);

  const data = h('section', { class: 'card' });
  data.innerHTML = `<header class="card-h"><div class="card-h-title">データ管理</div></header>
    <div style="padding:14px 18px 18px 18px;display:flex;flex-direction:column;gap:10px">
      <div>
        <div style="font-size:12.5px;font-weight:800;margin-bottom:4px">現在の登録数</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="kw-tag">作業 ${store.works.length}件</span>
          <span class="kw-tag">コース ${store.courses.length}件</span>
          <span class="kw-tag">お知らせ ${store.notices.length}件</span>
          <span class="kw-tag">テスト ${Object.keys(store.quizzes).length}種</span>
        </div>
      </div>
      <button class="btn btn-secondary btn-block" data-exp>${I.export}JSON でエクスポート</button>
      <button class="btn btn-secondary btn-block" data-imp>${I.import}JSON からインポート</button>
      <button class="btn btn-danger btn-block" data-reset>${I.reset}初期シードにリセット</button>
    </div>`;
  data.querySelector('[data-exp]').addEventListener('click', () => {
    const blob = new Blob([store.export()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `misakiya-denko-ai-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('エクスポートしました', 'success');
  });
  data.querySelector('[data-imp]').addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          store.import(reader.result);
          toast('インポートしました', 'success');
          render();
        } catch (e) { toast('JSON 読込エラー: ' + e.message, 'err'); }
      };
      reader.readAsText(f);
    };
    inp.click();
  });
  data.querySelector('[data-reset]').addEventListener('click', async () => {
    const ok = await confirmModal('データをリセット', h('div', {},
      h('div', {}, '全ての作業・お気に入り・進捗が消えて、初期シードデータに戻ります。'),
      h('div', { style: 'margin-top:8px;color:var(--danger);font-weight:800' }, 'この操作は元に戻せません。')));
    if (!ok) return;
    store.reset();
    toast('リセットしました', 'success');
    render();
  });
  grid.append(data);

  root.append(grid);

  // Statistics
  const stats = h('section', { class: 'card' });
  const totalWorks = store.works.length;
  const pending = store.works.filter(w => w.status === 'pending').length;
  const published = store.works.filter(w => w.status === 'published').length;
  const draft = store.works.filter(w => w.status === 'draft').length;
  const totalViews = store.works.reduce((s, w) => s + (w.views || 0), 0);
  stats.innerHTML = `<header class="card-h"><div class="card-h-title">全社KPI</div></header>
    <div class="stats"><div class="stat-grid">
      <div class="stat"><div class="stat-label">公開手順書</div><div class="stat-value">${published}<small>件</small></div></div>
      <div class="stat"><div class="stat-label">承認待ち</div><div class="stat-value">${pending}<small>件</small></div></div>
      <div class="stat"><div class="stat-label">下書き</div><div class="stat-value">${draft}<small>件</small></div></div>
      <div class="stat"><div class="stat-label">総閲覧数</div><div class="stat-value">${totalViews}</div></div>
    </div></div>`;
  root.append(stats);
}

// ============================ Work Edit / New ============================
function viewWorkNew(root) {
  const currentUid = store.currentUserId;
  // Reuse an existing empty draft by the same user (prevents draft spam on repeated #new visits)
  const existing = store.works.find(w => w.author === currentUid && !w.title.trim() && w.status === 'draft');
  if (existing) { location.hash = `#work/${existing.id}/edit`; return; }
  const newWork = {
    id: uid(), title: '', category: 'panel', tags: [], site: '', difficulty: 2, duration: '',
    thumb: 'default', status: 'draft', author: store.currentUserId, approver: null,
    createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10),
    views: 0, description: '',
    steps: [], tools: [], materials: [], tips: [], cautions: [], resources: [], relatedIds: [],
    videoUrl: '', history: [{ time: fmtDate(Date.now()).slice(5), who: store.user().name, what: '新規作成' }],
  };
  store.works.unshift(newWork);
  store.save('works');
  location.hash = `#work/${newWork.id}/edit`;
}

function viewWorkEdit(root, params) {
  const w = store.work(params.id);
  if (!w) { root.innerHTML = '<div class="empty">作業が見つかりません</div>'; return; }
  const draft = JSON.parse(JSON.stringify(w));
  draft.tools = draft.tools || [];
  draft.materials = draft.materials || [];
  draft.resources = draft.resources || [];
  draft.tips = draft.tips || [];
  draft.cautions = draft.cautions || [];
  draft.tags = draft.tags || [];
  draft.steps = draft.steps || [];

  root.append(h('div', { class: 'crumbs' },
    h('a', { onclick: () => router.go('database') }, 'データベース'), ' / ',
    h('a', { onclick: () => router.go('work/' + w.id) }, w.title || '無題'), ' / ',
    h('span', {}, '編集')));

  const card = h('section', { class: 'card' });
  card.innerHTML = `
    <div class="detail-h">
      <a class="back-link" data-back>${I.left}戻る</a>
      <div class="detail-title">${esc(w.title || '無題の作業')} <span style="font-size:11px;color:var(--dim);font-weight:700;letter-spacing:0.05em;margin-left:8px">編集モード</span></div>
    </div>
    <div class="form-grid" id="formTop"></div>
    <div class="sub-tabs" id="editTabs">
      <button class="sub-tab is-active" data-t="basic">基本情報</button>
      <button class="sub-tab" data-t="steps">手順 <small style="color:var(--dim);margin-left:3px" id="sc">(${draft.steps.length})</small></button>
      <button class="sub-tab" data-t="tools">工具・材料</button>
      <button class="sub-tab" data-t="tipsc">コツ・注意点</button>
      <button class="sub-tab" data-t="res">資料・動画</button>
    </div>
    <div id="tabBody" style="padding:14px 18px 18px 18px"></div>
    <div class="form-actions">
      <div class="form-actions-l">
        <button class="btn btn-danger" data-del>${I.trash}削除</button>
      </div>
      <div class="form-actions-r">
        <button class="btn btn-secondary" data-cancel>キャンセル</button>
        <button class="btn btn-secondary" data-save>下書き保存</button>
        <button class="btn btn-primary" data-submit>${w.status === 'published' ? '再公開' : '承認申請'}</button>
      </div>
    </div>`;

  root.append(card);

  const tabBody = card.querySelector('#tabBody');
  let currentTab = 'basic';

  function renderTab() {
    tabBody.innerHTML = '';
    if (currentTab === 'basic') {
      const g = h('div', { class: 'form-grid two' });
      g.append(
        formRow('タイトル', '', h('input', { class: 'form-in', value: draft.title, oninput: e => draft.title = e.target.value }), true),
        formRow('現場名', '', h('input', { class: 'form-in', value: draft.site || '', oninput: e => draft.site = e.target.value })),
        formRow('カテゴリ', '', buildCategoryPicker(draft)),
        formRow('難易度', '', buildDifficultyPicker(draft)),
        formRow('想定時間', '例: 約 2時間', h('input', { class: 'form-in', value: draft.duration || '', oninput: e => draft.duration = e.target.value })),
        formRow('タグ', 'Enter で追加', buildTagInput(draft)),
      );
      tabBody.append(g);
      tabBody.append(formRow('作業概要', '', h('textarea', { class: 'form-ta', oninput: e => draft.description = e.target.value }, draft.description || '')));
    } else if (currentTab === 'steps') {
      const wrap = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
      draft.steps.forEach((s, i) => wrap.append(buildStepEditor(draft, i, () => { renderTab(); card.querySelector('#sc').textContent = `(${draft.steps.length})`; })));
      wrap.append(h('button', {
        class: 'btn btn-secondary btn-block', style: 'margin-top:6px',
        onclick: () => {
          draft.steps.push({ title: '', desc: '', note: '' });
          renderTab();
          card.querySelector('#sc').textContent = `(${draft.steps.length})`;
        }
      }, h('span', { html: I.plus }), '手順を追加'));
      tabBody.append(wrap);
    } else if (currentTab === 'tools') {
      tabBody.append(buildListEditor('使用工具', draft.tools, () => renderTab()));
      tabBody.append(h('div', { style: 'height:16px' }));
      tabBody.append(buildListEditor('使用材料', draft.materials, () => renderTab()));
    } else if (currentTab === 'tipsc') {
      tabBody.append(buildTextListEditor('コツ・ポイント', draft.tips, () => renderTab()));
      tabBody.append(h('div', { style: 'height:16px' }));
      tabBody.append(buildTextListEditor('注意点・危険予知', draft.cautions, () => renderTab()));
    } else if (currentTab === 'res') {
      tabBody.append(buildResourceEditor(draft, () => renderTab()));
      tabBody.append(h('div', { style: 'height:16px' }));
      tabBody.append(formRow('動画URL', 'YouTube / Vimeo / mp4 の URL を貼り付け', h('input', { class: 'form-in', value: draft.videoUrl || '', oninput: e => draft.videoUrl = e.target.value })));
      tabBody.append(h('div', { class: 'video-note', style: 'margin-top:6px' }, `対応: YouTube (`, h('code', {}, 'youtu.be/XXX'), ` または `, h('code', {}, 'youtube.com/watch?v=XXX'), `) / Vimeo / .mp4 直リンク`));
    }
  }
  renderTab();

  card.querySelectorAll('#editTabs [data-t]').forEach(t => t.addEventListener('click', () => {
    card.querySelectorAll('#editTabs .sub-tab').forEach(x => x.classList.remove('is-active'));
    t.classList.add('is-active');
    currentTab = t.dataset.t;
    renderTab();
  }));

  card.querySelector('[data-back]').addEventListener('click', () => router.go('work/' + w.id));
  card.querySelector('[data-cancel]').addEventListener('click', () => router.go('work/' + w.id));

  card.querySelector('[data-save]').addEventListener('click', () => {
    if (!draft.title.trim()) { toast('タイトルを入力してください', 'err'); return; }
    Object.assign(w, draft, { status: 'draft', updatedAt: new Date().toISOString().slice(0, 10) });
    w.history = w.history || [];
    w.history.unshift({ time: fmtDate(Date.now()).slice(5), who: store.user().name, what: '下書き保存' });
    store.save('works');
    toast('下書きを保存しました', 'success');
    router.go('work/' + w.id);
  });

  card.querySelector('[data-submit]').addEventListener('click', async () => {
    if (!draft.title.trim()) { toast('タイトルを入力してください', 'err'); return; }
    if (draft.steps.length === 0) {
      const ok = await confirmModal('手順が未登録', h('div', {}, '手順が1件も登録されていません。このまま申請しますか?'));
      if (!ok) return;
    }
    const isSelf = store.user().role === '管理者';
    const status = isSelf ? 'published' : 'pending';
    Object.assign(w, draft, { status, updatedAt: new Date().toISOString().slice(0, 10) });
    w.history = w.history || [];
    w.history.unshift({ time: fmtDate(Date.now()).slice(5), who: store.user().name, what: status === 'published' ? '公開しました' : '承認申請しました' });
    store.save('works');
    toast(status === 'published' ? '公開しました' : '承認申請しました', 'success');
    router.go('work/' + w.id);
  });

  card.querySelector('[data-del]').addEventListener('click', async () => {
    const ok = await confirmModal('削除確認', h('div', {}, `「${w.title || '無題の作業'}」を削除します。よろしいですか?`));
    if (!ok) return;
    const idx = store.works.findIndex(x => x.id === w.id);
    if (idx >= 0) store.works.splice(idx, 1);
    store.save('works');
    toast('削除しました', 'success');
    router.go('database');
  });
}

function formRow(label, hint, inner, required) {
  const row = h('div', { class: 'form-row' });
  const lbl = h('div', { class: 'form-lbl' }, label);
  if (required) lbl.append(h('span', { class: 'req' }, '*'));
  if (hint) lbl.append(h('small', {}, hint));
  row.append(lbl, inner);
  return row;
}

function buildCategoryPicker(draft) {
  const wrap = h('div', { class: 'category-picker' });
  store.categories.forEach(c => {
    const b = h('button', { class: 'cat-chip ' + (draft.category === c.id ? 'on' : ''), type: 'button' }, c.name);
    b.addEventListener('click', () => {
      wrap.querySelectorAll('.cat-chip').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      draft.category = c.id;
    });
    wrap.append(b);
  });
  return wrap;
}

function buildDifficultyPicker(draft) {
  const wrap = h('div', { class: 'difficulty-picker' });
  for (let i = 1; i <= 5; i++) {
    const b = h('button', { class: 'diff-star ' + (i <= draft.difficulty ? 'on' : ''), type: 'button', html: I.star });
    b.addEventListener('click', () => {
      draft.difficulty = i;
      wrap.querySelectorAll('.diff-star').forEach((el, idx) => el.classList.toggle('on', idx < i));
    });
    wrap.append(b);
  }
  return wrap;
}

function buildTagInput(draft) {
  const wrap = h('div', { class: 'tag-input-wrap' });
  function refresh() {
    wrap.innerHTML = '';
    draft.tags.forEach((t, i) => {
      const chip = h('span', { class: 'tag-chip' }, t);
      const x = h('button', { type: 'button', html: I.x });
      x.addEventListener('click', () => { draft.tags.splice(i, 1); refresh(); });
      chip.append(x);
      wrap.append(chip);
    });
    const inp = h('input', { class: 'tag-input', placeholder: draft.tags.length ? '' : 'タグを入力して Enter' });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && inp.value.trim()) {
        e.preventDefault();
        draft.tags.push(inp.value.trim());
        refresh();
      } else if (e.key === 'Backspace' && !inp.value && draft.tags.length) {
        draft.tags.pop(); refresh();
      }
    });
    wrap.append(inp);
    inp.focus();
  }
  refresh();
  return wrap;
}

function buildStepEditor(draft, idx, onChange) {
  const s = draft.steps[idx];
  const wrap = h('div', { class: 'step-edit' });
  wrap.innerHTML = `
    <div class="step-edit-h">
      <div class="step-edit-no">${idx + 1}</div>
      <input class="form-in" placeholder="手順タイトル (例: 停電確認)" value="${esc(s.title)}">
      <button class="step-btn" title="上へ" ${idx === 0 ? 'disabled' : ''}>${I.up}</button>
      <button class="step-btn" title="下へ" ${idx === draft.steps.length - 1 ? 'disabled' : ''}>${I.down}</button>
      <button class="step-btn dz" title="削除">${I.trash}</button>
    </div>
    <div class="step-edit-body">
      <textarea class="form-ta" placeholder="手順の説明">${esc(s.desc || '')}</textarea>
      <textarea class="form-ta" placeholder="注意点・警告 (任意)" style="min-height:36px">${esc(s.note || '')}</textarea>
    </div>`;
  const [titleI, upB, downB, delB] = wrap.querySelectorAll('.step-edit-h input, .step-edit-h .step-btn');
  const [descT, noteT] = wrap.querySelectorAll('.step-edit-body .form-ta');
  titleI.addEventListener('input', e => s.title = e.target.value);
  descT.addEventListener('input', e => s.desc = e.target.value);
  noteT.addEventListener('input', e => s.note = e.target.value);
  upB.addEventListener('click', () => { if (idx > 0) { [draft.steps[idx - 1], draft.steps[idx]] = [draft.steps[idx], draft.steps[idx - 1]]; onChange(); } });
  downB.addEventListener('click', () => { if (idx < draft.steps.length - 1) { [draft.steps[idx + 1], draft.steps[idx]] = [draft.steps[idx], draft.steps[idx + 1]]; onChange(); } });
  delB.addEventListener('click', () => { draft.steps.splice(idx, 1); onChange(); });
  return wrap;
}

function buildListEditor(title, list, onChange) {
  const wrap = h('div', {});
  wrap.append(h('div', { class: 'related-h' }, title));
  const box = h('div', { style: 'display:flex;flex-direction:column;gap:6px' });
  list.forEach((item, i) => {
    const row = h('div', { class: 'tool-edit-row' });
    row.innerHTML = `
      <input class="form-in" placeholder="名称" value="${esc(item.name || '')}">
      <input class="form-in" placeholder="数量" value="${esc(item.qty || '')}">
      <button class="step-btn dz" title="削除">${I.trash}</button>`;
    const [nameI, qtyI, delB] = row.querySelectorAll('input, button');
    nameI.addEventListener('input', e => item.name = e.target.value);
    qtyI.addEventListener('input', e => item.qty = e.target.value);
    delB.addEventListener('click', () => { list.splice(i, 1); onChange(); });
    box.append(row);
  });
  const addBtn = h('button', { class: 'btn btn-secondary btn-sm', style: 'align-self:flex-start;margin-top:4px' }, h('span', { html: I.plus }), '項目を追加');
  addBtn.addEventListener('click', () => { list.push({ name: '', qty: '' }); onChange(); });
  box.append(addBtn);
  wrap.append(box);
  return wrap;
}

function buildTextListEditor(title, list, onChange) {
  const wrap = h('div', {});
  wrap.append(h('div', { class: 'related-h' }, title));
  const box = h('div', { style: 'display:flex;flex-direction:column;gap:6px' });
  list.forEach((item, i) => {
    const row = h('div', { style: 'display:grid;grid-template-columns:1fr 32px;gap:6px;align-items:start' });
    const ta = h('textarea', { class: 'form-ta', style: 'min-height:52px', oninput: e => list[i] = e.target.value }, item);
    const del = h('button', { class: 'step-btn dz', html: I.trash, onclick: () => { list.splice(i, 1); onChange(); } });
    row.append(ta, del);
    box.append(row);
  });
  const addBtn = h('button', { class: 'btn btn-secondary btn-sm', style: 'align-self:flex-start;margin-top:4px' }, h('span', { html: I.plus }), '追加');
  addBtn.addEventListener('click', () => { list.push(''); onChange(); });
  box.append(addBtn);
  wrap.append(box);
  return wrap;
}

function buildResourceEditor(draft, onChange) {
  const wrap = h('div', {});
  wrap.append(h('div', { class: 'related-h' }, '添付資料 (PDF・図面・写真・リンク)'));
  const box = h('div', { style: 'display:flex;flex-direction:column;gap:6px' });
  draft.resources.forEach((r, i) => {
    const row = h('div', { class: 'res-edit-row' });
    row.innerHTML = `
      <select class="form-in">
        <option value="pdf" ${r.type === 'pdf' ? 'selected' : ''}>PDF</option>
        <option value="dwg" ${r.type === 'dwg' ? 'selected' : ''}>図面</option>
        <option value="img" ${r.type === 'img' ? 'selected' : ''}>写真</option>
        <option value="link" ${r.type === 'link' ? 'selected' : ''}>リンク</option>
      </select>
      <input class="form-in" placeholder="名称" value="${esc(r.name || '')}">
      <input class="form-in" placeholder="URL または メモ" value="${esc(r.url || r.meta || '')}">
      <button class="step-btn dz" title="削除">${I.trash}</button>`;
    const [typeS, nameI, urlI, delB] = row.querySelectorAll('select, input, button');
    typeS.addEventListener('change', e => r.type = e.target.value);
    nameI.addEventListener('input', e => r.name = e.target.value);
    urlI.addEventListener('input', e => { r.url = e.target.value; r.meta = e.target.value; });
    delB.addEventListener('click', () => { draft.resources.splice(i, 1); onChange(); });
    box.append(row);
  });
  const addBtn = h('button', { class: 'btn btn-secondary btn-sm', style: 'align-self:flex-start;margin-top:4px' }, h('span', { html: I.plus }), '資料を追加');
  addBtn.addEventListener('click', () => { draft.resources.push({ type: 'pdf', name: '', url: '', meta: '' }); onChange(); });
  box.append(addBtn);
  wrap.append(box);
  return wrap;
}

// ============================ Boot ============================
store.load();
render();

// Expose for debugging
window.__store = store;
window.__router = router;

})();
