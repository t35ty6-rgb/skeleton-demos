// 三崎屋電工AI — SPA アプリケーションロジック
(() => {
'use strict';

// ============================ Store ============================
const KEY = 'misakiya-denko-ai::v2::';
const STORE_KEYS = ['works', 'favorites', 'recent', 'notices', 'courses', 'progress', 'quizzes', 'users', 'currentUserId', 'read', 'categories', 'stepChecks', 'workLog', 'stepPhotos', 'guideDismissed'];

const store = {
  works: [], favorites: {}, recent: {}, notices: [], courses: [], progress: {}, quizzes: {}, users: [], read: {}, categories: [],
  stepChecks: {}, workLog: [], stepPhotos: {}, guideDismissed: false,
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

  pendingCount() { return 0; },

  // Step checks (現場モード)
  stepKey(uid, wid) { return `${uid}_${wid}`; },
  getSteps(wid) { return this.stepChecks[this.stepKey(this.currentUserId, wid)] || []; },
  toggleStep(wid, idx) {
    const k = this.stepKey(this.currentUserId, wid);
    const list = this.stepChecks[k] = this.stepChecks[k] || [];
    const i = list.indexOf(idx);
    if (i >= 0) list.splice(i, 1); else list.push(idx);
    this.save('stepChecks');
  },
  resetSteps(wid) {
    const k = this.stepKey(this.currentUserId, wid);
    delete this.stepChecks[k];
    this.save('stepChecks');
  },
  logWorkComplete(wid) {
    this.workLog.unshift({ userId: this.currentUserId, workId: wid, ts: Date.now() });
    if (this.workLog.length > 200) this.workLog.length = 200;
    this.save('workLog');
  },

  // Step photos (現場撮影)
  getStepPhotos(wid, stepIdx) {
    const key = this.stepKey(this.currentUserId, wid);
    const arr = this.stepPhotos[key] || [];
    return arr.filter(p => p.stepIdx === stepIdx);
  },
  getAllStepPhotos(wid) {
    const key = this.stepKey(this.currentUserId, wid);
    return this.stepPhotos[key] || [];
  },
  addStepPhoto(wid, stepIdx, dataURL, note = '') {
    const key = this.stepKey(this.currentUserId, wid);
    const arr = this.stepPhotos[key] = this.stepPhotos[key] || [];
    arr.push({ stepIdx, dataURL, ts: Date.now(), note });
    this.save('stepPhotos');
  },
  deleteStepPhoto(wid, stepIdx, ts) {
    const key = this.stepKey(this.currentUserId, wid);
    const arr = this.stepPhotos[key] || [];
    const i = arr.findIndex(p => p.stepIdx === stepIdx && p.ts === ts);
    if (i >= 0) arr.splice(i, 1);
    this.save('stepPhotos');
  },
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
const fmtDateTime = ts => {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    // Esc で閉じる
    const escHandler = e => { if (e.key === 'Escape') { e.preventDefault(); close(false); } };
    document.addEventListener('keydown', escHandler, true);
    function close(v) { document.removeEventListener('keydown', escHandler, true); back.remove(); resolve(v); }
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
    <div class="nav-group" style="margin-top:16px">
      <div class="nav-heading">Ops</div>
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
    <button class="topbar-menu-btn" id="hamburger" aria-label="メニュー" style="display:none">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
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

  // Hamburger menu (mobile)
  const ham = $('#hamburger');
  if (window.innerWidth <= 820) ham.style.display = 'grid';
  ham.addEventListener('click', () => {
    const sb = $('#sidebar');
    sb.classList.toggle('open');
  });
  // Close sidebar when nav item clicked (mobile)
  $('#sidebar').addEventListener('click', e => {
    if (window.innerWidth <= 820 && e.target.closest('.nav-item')) {
      $('#sidebar').classList.remove('open');
    }
  });

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
    approve: viewHome, // 承認フロー撤廃 (v0.9 オーナー明示) — ホームへリダイレクト
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
function stars(n, max = 5) {
  const filled = Math.max(0, Math.min(max, n));
  const empty = max - filled;
  return `<span class="stars">${I.star.repeat(filled)}${I.star.replaceAll('<svg', '<svg class="empty"').repeat(empty)}</span>`;
}
function difficultyStars(n) {
  const filled = Math.max(0, Math.min(5, n));
  return `<span class="stars">${I.star.repeat(filled)}${I.star.replace('<svg', '<svg class="empty"').repeat(5 - filled)}</span>`;
}
// backward compat alias for any lingering references
const difficultyBar = difficultyStars;

function workCard(w) {
  const isFav = store.isFav(w.id);
  const card = h('div', { class: 'reco-card' });
  card.innerHTML = `
    <div class="reco-thumb">
      ${thumbSVG(w.thumb || 'default')}
      <button class="reco-star ${isFav ? 'is-on' : ''}" data-fav="${w.id}" title="お気に入り">
        ${isFav ? I.star : I.starOutline}
      </button>
    </div>
    <div class="reco-body">
      <div class="reco-title">${esc(w.title)}</div>
      <div class="reco-meta">
        <span>更新: ${fmtDate(w.updatedAt)}</span>
        ${difficultyStars(w.difficulty)}
      </div>
    </div>`;
  card.addEventListener('click', e => {
    if (e.target.closest('[data-fav]')) return;
    router.go('work/' + w.id);
  });
  card.querySelector('[data-fav]').addEventListener('click', e => {
    e.stopPropagation();
    const on = store.toggleFav(w.id);
    render();
    toast(on ? 'お気に入りに追加しました' : 'お気に入りから外しました', 'success');
  });
  return card;
}

function searchCard(w) {
  const card = h('div', { class: 'sr-card' });
  card.innerHTML = `
    <div class="sr-thumb">${thumbSVG(w.thumb || 'default')}</div>
    <div class="sr-info">
      <div class="sr-name">${esc(w.title)}</div>
      <div class="sr-sub">${esc(w.site || '—')}</div>
      <div class="sr-tags">
        ${w.steps.length ? '<span class="sr-tag">手順書</span>' : ''}
        ${w.videoUrl ? '<span class="sr-tag">動画</span>' : ''}
        ${(w.resources || []).some(r => r.type === 'pdf' || r.type === 'dwg') ? '<span class="sr-tag">図面</span>' : ''}
      </div>
      <div class="sr-meta">
        <span class="sr-date">${fmtDate(w.updatedAt)}</span>
        <span class="sr-diff">難易度 ${difficultyStars(w.difficulty)}</span>
      </div>
    </div>`;
  card.addEventListener('click', () => router.go('work/' + w.id));
  return card;
}

// ============================ View: Home (v0.2 承認済み構造) ============================
function viewHome(root) {
  const uid = store.currentUserId;
  const publishedWorks = store.works.filter(w => w.status === 'published');
  const reco = [...publishedWorks].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 4);
  const recent = (store.recent[uid] || []).slice(0, 4);
  const unreadNotices = store.notices.slice(0, 4);

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
  reco.forEach(w => recoGrid.append(workCard(w)));
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
      it.innerHTML = `<span class="list-icon li-doc">D</span><span class="list-title">${esc(w.title)}</span><span class="list-date">${fmtRelative(r.ts)}</span>`;
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
    it.innerHTML = `<span class="pill ${pillCls}">${pillLbl}</span><span class="list-title" style="${unread ? 'font-weight:800' : ''}">${unread ? '<span class="pill-dot"></span>' : ''}${esc(n.title)}</span><span class="list-date">${fmtDate(n.createdAt).slice(5)}</span>`;
    it.addEventListener('click', () => router.go('notice/' + n.id));
    nl.append(it);
  });
  twoCol.append(recentCard, noticeCard);
  left.append(twoCol);

  // Left: Stats
  const statsCard = h('section', { class: 'card' });
  statsCard.innerHTML = `
    <header class="card-h"><div class="card-h-title">データ統計 <small>（今月）</small></div></header>
    <div class="stats">
      <div class="stat-grid">
        <div class="stat"><div class="stat-label">新規登録数</div><div class="stat-value">${thisMonth}<small>件</small></div><div class="stat-delta">${I.up2} +${Math.max(0, thisMonth - 8)} 前月比</div></div>
        <div class="stat"><div class="stat-label">閲覧数</div><div class="stat-value">${totalViews}</div><div class="stat-delta">${I.up2} +31%</div></div>
        <div class="stat"><div class="stat-label">学習完了数</div><div class="stat-value">${learners}<small>人</small></div><div class="stat-delta">${I.up2} +2 名</div></div>
        <div class="stat"><div class="stat-label">平均学習時間</div><div class="stat-value">${avgTime.toFixed(1)}<small>時間</small></div><div class="stat-delta flat">±0.0h</div></div>
      </div>
      <div class="kw-row">
        <span class="kw-row-label">よく検索されているキーワード</span>
        ${kws.map(([k]) => `<span class="kw-tag" data-kw="${esc(k)}">${esc(k)}</span>`).join('')}
      </div>
    </div>`;
  statsCard.querySelectorAll('[data-kw]').forEach(el => el.addEventListener('click', () => router.go('search', { q: el.dataset.kw })));
  left.append(statsCard);

  // Right: Detail pane (highlighted work = first reco)
  const highlight = reco[0];
  if (highlight) right.append(buildDetailCard(highlight));

  grid.append(left, right);
  root.append(grid);

  // Row 2: search preview + training
  const row2 = h('div', { style: 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;margin-top:16px' });
  row2.append(buildSearchPreview(), buildTrainingCard());
  root.append(row2);
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
          <div class="nl-thumb">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h11.5A1.5 1.5 0 0 1 19 4.5V17"/><path d="M4 19a2 2 0 0 0 2 2h13v-4H6a2 2 0 0 0-2 2z"/><path d="m9 8 2 2 5-5"/></svg>
          </div>
          <div class="nl-info">
            <div class="nl-eyebrow">受講中</div>
            <div class="nl-name">${esc(current.c.name)}</div>
            <div class="nl-progress"><div class="nl-progress-fill" style="width:${(current.ratio * 100).toFixed(0)}%"></div></div>
            <div class="nl-progress-lbl"><span>Chapter ${current.done} / ${current.total}</span><span>${(current.ratio * 100).toFixed(0)}%</span></div>
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

  const card = h('section', { class: 'card', id: 'detailCard' });

  const statusBanner = '';

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
      </div>
    </div>
    <div class="sub-tabs" id="subTabs">
      <button class="sub-tab is-active" data-tab="steps">手順一覧</button>
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
          const bodyKids = [
            h('div', { class: 'step-title' }, s.title),
            s.desc ? h('div', { class: 'step-desc' }, s.desc) : null,
            s.note ? h('div', { class: 'step-note' }, s.note) : null,
          ];
          // 動画キャプション + 時刻 + ▶ 再生 (transcribe 由来の手順のみ)
          if (s.videoStart != null && w.videoUrl) {
            const cap = h('div', { class: 'step-caption' });
            cap.innerHTML = `<span class="step-caption-time">${fmtTS(s.videoStart)}${s.videoEnd ? ' – ' + fmtTS(s.videoEnd) : ''}</span><button class="step-caption-play" title="この時刻から再生">${I.play}<span>再生</span></button>`;
            cap.querySelector('.step-caption-play').addEventListener('click', () => seekVideoTo(s.videoStart));
            bodyKids.push(cap);
          }
          steps.append(h('div', { class: 'step' },
            h('div', { class: 'step-no' }, i + 1),
            h('div', { class: 'step-body' }, ...bodyKids)
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
          const isUploadedImg = r.url && r.url.startsWith('data:image/');
          const isUploadedPdf = r.url && r.url.startsWith('data:application/pdf');
          if (isUploadedImg) {
            const th = h('div', { class: 'upload-thumb', style: 'cursor:pointer' });
            th.innerHTML = `<img class="upload-thumb-img" src="${r.url}">
              <div><div class="upload-thumb-name">${esc(r.name)}</div><div class="upload-thumb-size">${esc(r.meta || '')} · 写真</div></div>
              <div style="font-size:11px;color:var(--dim);font-weight:600">クリックで拡大</div>`;
            th.addEventListener('click', () => showImagePreview(r));
            list.append(th);
            return;
          }
          const it = h('div', { class: 'rel-item' });
          const iconCls = r.type === 'pdf' ? 'pdf' : r.type === 'dwg' ? 'dwg' : r.type === 'img' ? 'img' : 'link';
          const iconSvg = r.type === 'pdf' ? I.pdf : r.type === 'dwg' ? I.dwg : r.type === 'img' ? I.img : I.link;
          const meta = r.meta || (isUploadedPdf ? 'アップロード済 PDF' : r.type.toUpperCase());
          it.innerHTML = `<div class="rel-icon ${iconCls}">${iconSvg}</div><div class="rel-title">${esc(r.name)}</div><div class="rel-meta">${esc(meta)}</div>`;
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
  card.querySelector('[data-edit]').addEventListener('click', () => router.go('work/' + w.id + '/edit'));
  card.querySelector('[data-share]').addEventListener('click', () => {
    const url = location.origin + location.pathname + '#work/' + w.id;
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('URL をコピーしました', 'success'));
    else toast(url);
  });

  return card;
}

// ===== QR modal for work =====
function showQRModal(w) {
  const url = location.origin + location.pathname + '#work/' + w.id;
  const body = h('div', { class: 'qr-modal' });
  body.innerHTML = `
    <div class="qr-svg">${qrSVG(url, 220)}</div>
    <div class="qr-caption">スマホでこの QR を読み込むと現場ですぐに開けます</div>
    <div class="qr-url">${esc(url)}</div>`;
  modal(`QR コード · ${w.title}`, body, (row, close) => {
    row.append(
      h('button', { class: 'btn btn-secondary', onclick: () => { navigator.clipboard?.writeText(url); toast('URL をコピーしました', 'success'); } }, 'URL をコピー'),
      h('button', { class: 'btn btn-primary', onclick: () => close(true) }, '閉じる'),
    );
  });
}

// ===== 完了報告書 (現場写真+チェック+作業員 まとめて) =====
function printCompletionReport(w) {
  const win = window.open('', '_blank');
  if (!win) { toast('ポップアップを許可してください', 'err'); return; }
  const uid = store.currentUserId;
  const user = store.user(uid);
  const done = store.getSteps(w.id);
  const photos = store.getAllStepPhotos(w.id);
  const totalPhotos = photos.length;
  const isAll = done.length === w.steps.length;
  const startTs = photos.length ? Math.min(...photos.map(p => p.ts)) : null;
  const endTs = photos.length ? Math.max(...photos.map(p => p.ts)) : null;
  const cat = store.category(w.category);

  win.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(w.title)} · 完了報告書</title>
<style>
  @page{margin:14mm 15mm;size:A4}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Noto Sans JP","Hiragino Sans",sans-serif;font-size:11pt;color:#111;line-height:1.65;font-weight:500}
  .badge{display:inline-block;background:${isAll ? '#065f46' : '#b45309'};color:#fff;padding:3pt 10pt;border-radius:999pt;font-size:9pt;font-weight:800;letter-spacing:0.02em}
  h1{font-size:22pt;font-weight:900;letter-spacing:-0.02em;margin:6pt 0 4pt 0}
  .sub{font-size:10pt;color:#666;margin-bottom:10pt}
  .meta{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:4pt 12pt;font-size:9.5pt;margin:12pt 0;padding:10pt 12pt;background:#f5f5f2;border:1px solid #ddd;border-radius:4pt}
  .meta dt{color:#666;font-weight:600}
  .meta dd{font-weight:700}
  .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8pt;margin:10pt 0 14pt 0}
  .summary-box{padding:10pt 12pt;background:#fff;border:1px solid #ccc;border-radius:4pt}
  .summary-lbl{font-size:8.5pt;color:#666;font-weight:700}
  .summary-val{font-size:18pt;font-weight:900;letter-spacing:-0.02em;margin-top:2pt}
  .summary-sub{font-size:8pt;color:#666;margin-top:1pt}
  h2{font-size:12pt;font-weight:800;margin:16pt 0 6pt 0;padding-bottom:2pt;border-bottom:1px solid #666}
  .step{display:grid;grid-template-columns:24pt 1fr;gap:8pt;padding:8pt 0;border-top:1px solid #ccc;page-break-inside:avoid}
  .step:first-of-type{border-top:0}
  .step-no{background:#111;color:#fff;width:22pt;height:22pt;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10pt}
  .step-t{font-size:11pt;font-weight:800;display:flex;align-items:center;gap:6pt}
  .st-done{background:#065f46;color:#fff;padding:1pt 6pt;border-radius:999pt;font-size:8pt;font-weight:800}
  .st-miss{background:#b91c1c;color:#fff;padding:1pt 6pt;border-radius:999pt;font-size:8pt;font-weight:800}
  .step-d{font-size:9.5pt;color:#333;margin-top:2pt}
  .photos{display:grid;grid-template-columns:repeat(3,1fr);gap:4pt;margin-top:6pt}
  .photo{aspect-ratio:4/3;border-radius:3pt;overflow:hidden;border:1px solid #ccc}
  .photo img{width:100%;height:100%;object-fit:cover}
  .photo-time{font-size:7.5pt;color:#666;font-family:sans-serif;margin-top:1pt;text-align:center}
  .no-photo{font-size:9pt;color:#999;padding:4pt 8pt;background:#f5f5f2;border-radius:3pt;display:inline-block;margin-top:4pt}
  .sign{margin-top:24pt;padding-top:12pt;border-top:2px solid #111;display:grid;grid-template-columns:1fr 1fr;gap:20pt}
  .sign-box{border:1px solid #999;padding:10pt;border-radius:3pt;min-height:50pt}
  .sign-lbl{font-size:8pt;color:#666;font-weight:700}
  .sign-val{font-size:12pt;font-weight:800;margin-top:2pt}
  footer{margin-top:18pt;padding-top:8pt;border-top:1px solid #999;font-size:8pt;color:#666;display:flex;justify-content:space-between}
</style></head><body>
  <div class="badge">${isAll ? '✓ 全手順完了' : '進捗途中 · ' + done.length + '/' + w.steps.length + ' 手順'}</div>
  <h1>${esc(w.title)} · 完了報告書</h1>
  <div class="sub">${esc(cat ? cat.name : '')} · 難易度 ${w.difficulty}/5 · 想定時間 ${esc(w.duration || '—')}</div>

  <dl class="meta">
    <dt>作業員</dt><dd>${esc(user.name)}</dd>
    <dt>肩書</dt><dd>${esc(user.title || user.role)}</dd>
    <dt>作業日</dt><dd>${startTs ? fmtDate(startTs) : fmtDate(Date.now())}</dd>
    <dt>報告書発行</dt><dd>${fmtDateTime(Date.now())}</dd>
    <dt>現場</dt><dd>${esc(w.site || '—')}</dd>
    <dt>作業時間</dt><dd>${startTs && endTs ? `${fmtDateTime(startTs)} 〜 ${fmtDateTime(endTs)}` : '—'}</dd>
  </dl>

  <div class="summary">
    <div class="summary-box"><div class="summary-lbl">手順の進捗</div><div class="summary-val">${done.length}/${w.steps.length}</div><div class="summary-sub">${Math.round(done.length / (w.steps.length || 1) * 100)}% 完了</div></div>
    <div class="summary-box"><div class="summary-lbl">現場写真</div><div class="summary-val">${totalPhotos}</div><div class="summary-sub">枚 撮影</div></div>
    <div class="summary-box"><div class="summary-lbl">未完了</div><div class="summary-val" style="color:${isAll ? '#065f46' : '#b91c1c'}">${w.steps.length - done.length}</div><div class="summary-sub">${isAll ? '無し' : '手順あり'}</div></div>
  </div>

  <h2>手順ごとの記録</h2>
  ${w.steps.map((s, i) => {
    const ph = store.getStepPhotos(w.id, i);
    const isDone = done.includes(i);
    return `<div class="step">
      <div class="step-no">${i + 1}</div>
      <div>
        <div class="step-t">${esc(s.title)}<span class="${isDone ? 'st-done' : 'st-miss'}">${isDone ? '✓ 完了' : '未完'}</span></div>
        ${s.desc ? `<div class="step-d">${esc(s.desc)}</div>` : ''}
        ${ph.length > 0
          ? `<div class="photos">${ph.map(p => `<div class="photo"><img src="${p.dataURL}"></div>`).join('')}</div>`
          : `<div class="no-photo">写真なし</div>`}
      </div>
    </div>`;
  }).join('')}

  <div class="sign">
    <div class="sign-box"><div class="sign-lbl">作業員</div><div class="sign-val">${esc(user.name)}</div></div>
    <div class="sign-box"><div class="sign-lbl">確認 (現場責任者)</div><div class="sign-val">&nbsp;</div></div>
  </div>

  <footer>
    <span>三崎屋電工 作業完了報告書 · ${esc(w.title)}</span>
    <span>発行: ${fmtDateTime(Date.now())}</span>
  </footer>
  <script>window.onload=()=>setTimeout(()=>window.print(),500);<\/script>
</body></html>`);
  win.document.close();
}

// ===== Print work as procedure sheet =====
function printWork(w) {
  const win = window.open('', '_blank');
  if (!win) { toast('ポップアップを許可してください', 'err'); return; }
  const cat = store.category(w.category);
  const author = store.user(w.author);
  win.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(w.title)} · 手順書</title>
<style>
  @page{margin:14mm 15mm;size:A4}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Noto Sans JP","Hiragino Sans",sans-serif;font-size:11pt;color:#111;line-height:1.65;font-weight:500}
  h1{font-size:20pt;font-weight:900;letter-spacing:-0.02em;margin-bottom:6pt;border-bottom:2px solid #111;padding-bottom:6pt}
  .meta{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:4pt 12pt;font-size:9pt;margin-top:10pt;margin-bottom:14pt}
  .meta dt{color:#666;font-weight:600}
  .meta dd{font-weight:700}
  h2{font-size:12pt;font-weight:800;letter-spacing:-0.01em;margin:14pt 0 6pt 0;padding-bottom:2pt;border-bottom:1px solid #666}
  .step{display:grid;grid-template-columns:24pt 1fr 30pt;gap:8pt;padding:6pt 0;border-top:1px solid #ccc;page-break-inside:avoid;align-items:flex-start}
  .step:first-child{border-top:0}
  .step-no{background:#111;color:#fff;width:22pt;height:22pt;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10pt;margin-top:2pt}
  .step-title{font-weight:800;font-size:11pt;letter-spacing:-0.005em}
  .step-desc{font-size:10pt;color:#222;margin-top:2pt}
  .step-note{margin-top:4pt;padding:4pt 8pt;background:#fff4d6;border-left:3pt solid #b57f10;font-size:9.5pt;font-weight:600;color:#5c3f0f}
  .step-note::before{content:"⚠ 注意 · ";font-weight:800}
  .check-box{width:22pt;height:22pt;border:1.5pt solid #111;border-radius:3pt}
  ul.tools{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:2pt 12pt;font-size:10pt;font-weight:600}
  ul.tools li{padding:2pt 0;border-bottom:1px dotted #999}
  ul.tools li::before{content:"□ ";font-weight:800;color:#111}
  .caution{padding:8pt 10pt;background:#fff;border:2pt solid #a12013;color:#a12013;font-weight:700;margin-bottom:6pt;font-size:10pt}
  .caution::before{content:"⚠ 危険 · ";font-weight:900}
  .tip{padding:6pt 10pt;background:#fff;border:1px solid #2b5e8f;color:#123a5b;font-weight:600;margin-bottom:4pt;font-size:10pt}
  .tip::before{content:"ポイント · ";font-weight:800}
  footer{margin-top:20pt;padding-top:10pt;border-top:1px solid #666;font-size:8pt;color:#666;display:flex;justify-content:space-between}
  .desc{font-size:10.5pt;color:#333;margin-bottom:8pt;padding:6pt 10pt;background:#f7f7f2;border-radius:3pt;border-left:3pt solid #c1391d}
</style></head><body>
  <h1>${esc(w.title)}</h1>
  ${w.description ? `<div class="desc">${esc(w.description)}</div>` : ''}
  <dl class="meta">
    <dt>カテゴリ</dt><dd>${esc(cat ? cat.name : '—')}</dd>
    <dt>難易度</dt><dd>${w.difficulty} / 5</dd>
    <dt>想定時間</dt><dd>${esc(w.duration || '—')}</dd>
    <dt>現場</dt><dd>${esc(w.site || '—')}</dd>
    <dt>作成者</dt><dd>${esc(author ? author.name : '—')}</dd>
    <dt>版</dt><dd>${fmtDate(w.updatedAt)}</dd>
    <dt>印刷日</dt><dd>${fmtDate(Date.now())}</dd>
  </dl>
  ${w.cautions && w.cautions.length ? `<h2>危険予知</h2>${w.cautions.map(c => `<div class="caution">${esc(c)}</div>`).join('')}` : ''}
  ${w.tips && w.tips.length ? `<h2>コツ・ポイント</h2>${w.tips.map(t => `<div class="tip">${esc(t)}</div>`).join('')}` : ''}
  <h2>作業手順 <span style="font-weight:500;color:#666;font-size:9pt">(右端 □ で現場チェック)</span></h2>
  ${w.steps.map((s, i) => `
    <div class="step">
      <div class="step-no">${i + 1}</div>
      <div>
        <div class="step-title">${esc(s.title)}</div>
        ${s.desc ? `<div class="step-desc">${esc(s.desc)}</div>` : ''}
        ${s.note ? `<div class="step-note">${esc(s.note)}</div>` : ''}
      </div>
      <div class="check-box"></div>
    </div>
  `).join('')}
  ${w.tools && w.tools.length ? `<h2>使用工具</h2><ul class="tools">${w.tools.map(t => `<li>${esc(t.name)} <span style="color:#666;font-family:sans-serif;font-size:9pt">${esc(t.qty)}</span></li>`).join('')}</ul>` : ''}
  ${w.materials && w.materials.length ? `<h2>使用材料</h2><ul class="tools">${w.materials.map(t => `<li>${esc(t.name)} <span style="color:#666;font-family:sans-serif;font-size:9pt">${esc(t.qty)}</span></li>`).join('')}</ul>` : ''}
  <footer>
    <span>三崎屋電工 作業手順書 · ${esc(w.title)}</span>
    <span>印刷: ${fmtDate(Date.now())}</span>
  </footer>
  <script>window.onload=()=>setTimeout(()=>window.print(),400);<\/script>
</body></html>`);
  win.document.close();
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
  if (m) return `<iframe id="workVideo" src="https://www.youtube.com/embed/${m[1]}?rel=0&enablejsapi=1" allowfullscreen title="動画"></iframe>`;
  // Vimeo
  const v = url.match(/vimeo\.com\/(\d+)/);
  if (v) return `<iframe id="workVideo" src="https://player.vimeo.com/video/${v[1]}" allowfullscreen title="動画"></iframe>`;
  // Direct video URL or data: URL
  if (url.startsWith('data:video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(url)) {
    return `<video id="workVideo" controls src="${esc(url)}" style="position:absolute;inset:0;width:100%;height:100%;background:#000"></video>`;
  }
  return `<div class="video-placeholder">${I.play}<div>再生できない URL 形式です</div><div style="margin-top:4px"><code style="background:#fff;color:var(--ink);padding:2px 6px;border-radius:3px;font-size:10px">${esc(url)}</code></div></div>`;
}

// Seek current work video to given time (seconds)
function seekVideoTo(sec) {
  const video = document.getElementById('workVideo');
  if (!video) { toast('動画プレーヤーが見つかりません', 'err'); return; }
  video.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (video.tagName === 'VIDEO') {
    video.currentTime = sec;
    video.play().catch(() => {});
    toast(`${fmtTS(sec)} から再生します`, 'success');
    return;
  }
  if (video.tagName === 'IFRAME') {
    const src = video.src;
    // YouTube iframe → postMessage seek
    if (/youtube/.test(src)) {
      video.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [sec, true] }), '*');
      video.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
      toast(`${fmtTS(sec)} から再生します`, 'success');
      return;
    }
    // Vimeo iframe → postMessage
    if (/vimeo/.test(src)) {
      video.contentWindow.postMessage(JSON.stringify({ method: 'setCurrentTime', value: sec }), '*');
      video.contentWindow.postMessage(JSON.stringify({ method: 'play' }), '*');
      toast(`${fmtTS(sec)} から再生します`, 'success');
      return;
    }
    // fallback: rebuild iframe URL with &start=
    const m = src.match(/embed\/([\w-]+)/);
    if (m) {
      video.src = `https://www.youtube.com/embed/${m[1]}?start=${Math.floor(sec)}&autoplay=1&rel=0&enablejsapi=1`;
    }
  }
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

  // 現場作業ログ
  const myLog = store.workLog.filter(l => l.userId === uid).slice(0, 10);
  if (myLog.length > 0) {
    const logCard = h('section', { class: 'card' });
    logCard.innerHTML = `<header class="card-h"><div class="card-h-title">現場作業ログ <small>(直近 ${myLog.length} 件)</small></div></header><div class="list" id="lgList"></div>`;
    const ll = logCard.querySelector('#lgList');
    for (const l of myLog) {
      const w = store.work(l.workId);
      if (!w) continue;
      const it = h('div', { class: 'list-item' });
      it.innerHTML = `
        <span class="list-icon li-doc">${I.check}</span>
        <span class="list-title">${esc(w.title)} · 全手順完了</span>
        <span class="list-date">${fmtRelative(l.ts)}</span>`;
      it.addEventListener('click', () => router.go('work/' + w.id));
      ll.append(it);
    }
    root.append(logCard);
  }

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

// ============================ (承認フロー v0.9 で撤廃済み) ============================
function viewApprove(root) {
  // v0.9 で撤廃 → viewHome にフォールバック
  return viewHome(root);
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
      <div class="nl-thumb">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h11.5A1.5 1.5 0 0 1 19 4.5V17"/><path d="M4 19a2 2 0 0 0 2 2h13v-4H6a2 2 0 0 0-2 2z"/><path d="m9 8 2 2 5-5"/></svg>
      </div>
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
  const published = store.works.filter(w => w.status === 'published').length;
  const totalViews = store.works.reduce((s, w) => s + (w.views || 0), 0);
  const authors = new Set(store.works.map(w => w.author)).size;
  stats.innerHTML = `<header class="card-h"><div class="card-h-title">全社KPI</div></header>
    <div class="stats"><div class="stat-grid">
      <div class="stat"><div class="stat-label">公開手順書</div><div class="stat-value">${published}<small>件</small></div></div>
      <div class="stat"><div class="stat-label">総閲覧数</div><div class="stat-value">${totalViews}</div></div>
      <div class="stat"><div class="stat-label">執筆者</div><div class="stat-value">${authors}<small>名</small></div></div>
      <div class="stat"><div class="stat-label">カテゴリ</div><div class="stat-value">${store.categories.length}<small>種</small></div></div>
    </div></div>`;
  root.append(stats);
}


// ============================ Work Edit / New ============================
function viewWorkNew(root) {
  const currentUid = store.currentUserId;
  // Reuse an existing empty work by the same user (prevents entry spam on repeated #new visits)
  const existing = store.works.find(w => w.author === currentUid && !w.title.trim());
  if (existing) { location.hash = `#work/${existing.id}/edit`; return; }
  const newWork = {
    id: uid(), title: '', category: 'panel', tags: [], site: '', difficulty: 2, duration: '',
    thumb: 'default', status: 'published', author: store.currentUserId, approver: store.currentUserId,
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
        <button class="btn btn-primary" data-save>${I.check}保存</button>
      </div>
    </div>`;

  root.append(card);

  const tabBody = card.querySelector('#tabBody');
  let currentTab = params.tab || 'basic';
  if (currentTab !== 'basic') {
    card.querySelectorAll('#editTabs .sub-tab').forEach(x => x.classList.remove('is-active'));
    const t = card.querySelector(`[data-t="${currentTab}"]`);
    if (t) t.classList.add('is-active');
  }

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

      // 動画URL + ファイル選択 + captions 状態表示
      const videoRow = h('div', { class: 'form-row' });
      videoRow.append(h('div', { class: 'form-lbl' }, '動画URL ', h('small', {}, 'YouTube / Vimeo / mp4 の URL、または 動画ファイルを選ぶ')));
      const videoWrap = h('div', { style: 'display:flex;gap:6px;align-items:center' });
      const videoInp = h('input', { class: 'form-in', value: draft.videoUrl && !draft.videoUrl.startsWith('data:') ? draft.videoUrl : '', oninput: e => draft.videoUrl = e.target.value, placeholder: 'https://youtu.be/... または 動画ファイルを選ぶ →' });
      const videoFileBtn = h('label', { class: 'btn btn-secondary btn-sm', style: 'cursor:pointer;position:relative;white-space:nowrap' }, h('span', { html: I.plus }), '動画ファイル');
      const videoFileInp = h('input', { type: 'file', accept: 'video/*', style: 'position:absolute;inset:0;opacity:0;cursor:pointer' });
      videoFileInp.addEventListener('change', async () => {
        const f = videoFileInp.files[0];
        if (!f) return;
        if (f.size > 50 * 1024 * 1024) { toast(`動画は 50MB まで (現在 ${(f.size/1024/1024).toFixed(1)}MB)`, 'err'); return; }
        const data = await readFileAsDataURL(f);
        draft.videoUrl = data;
        renderTab();
        toast(`動画 ${f.name} を添付しました`, 'success');
      });
      videoFileBtn.append(videoFileInp);
      videoWrap.append(videoInp, videoFileBtn);
      videoRow.append(videoWrap);
      if (draft.videoUrl && draft.videoUrl.startsWith('data:video/')) {
        videoRow.append(h('div', { style: 'font-size:11px;color:var(--success);font-weight:700;margin-top:4px' }, '✓ 動画ファイル添付済 · 保存すると再生できます'));
      }
      tabBody.append(videoRow);

      tabBody.append(h('div', { style: 'height:16px' }));

      // 動画から手順を作る (compact)
      const trBox = h('div', { style: 'padding:12px 14px;background:var(--surface-2);border:1px solid var(--rule);border-radius:8px' });
      trBox.append(h('div', { class: 'form-lbl', style: 'margin-bottom:6px' }, '動画から手順を自動生成 ',
        h('small', {}, 'キャプション/字幕を分析して 手順 1・2・3… + タイムスタンプを付けます')));
      const trState = { cues: [], mode: null };
      const trActions = h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' });
      const btnVTT = h('label', { class: 'btn btn-secondary btn-sm', style: 'cursor:pointer;position:relative' }, '字幕ファイル (.vtt/.srt)');
      const vttInp = h('input', { type: 'file', accept: '.vtt,.srt,.txt', style: 'position:absolute;inset:0;opacity:0;cursor:pointer' });
      vttInp.addEventListener('change', async () => {
        const f = vttInp.files[0];
        if (!f) return;
        const text = await f.text();
        trState.cues = window.AI.parseTranscript(text);
        if (trState.cues.length === 0) { toast('字幕を認識できませんでした', 'err'); return; }
        toast(`${trState.cues.length} キャプション認識`, 'success');
        renderPrev();
      });
      btnVTT.append(vttInp);
      const btnAI = h('button', { class: 'btn btn-secondary btn-sm' }, 'AI で 疑似生成');
      btnAI.addEventListener('click', async () => {
        btnAI.disabled = true; btnAI.textContent = '生成中…';
        await new Promise(r => setTimeout(r, 700));
        const vtt = window.AI.mockTranscribe(draft.title || '');
        trState.cues = window.AI.parseTranscript(vtt);
        btnAI.disabled = false; btnAI.textContent = 'AI で 疑似生成';
        toast(`${trState.cues.length} キャプション生成`, 'success');
        renderPrev();
      });
      const btnPaste = h('button', { class: 'btn btn-secondary btn-sm' }, 'テキスト貼付');
      btnPaste.addEventListener('click', async () => {
        const ta = h('textarea', { class: 'form-ta', style: 'min-height:140px;font-family:monospace;font-size:11px', placeholder: 'WEBVTT ... or SRT or プレーンテキスト' });
        const ok = await new Promise(resolve => modal('文字起こしを貼り付け', ta, (row, close) => {
          row.append(
            h('button', { class: 'btn btn-ghost', onclick: () => { close(false); resolve(false); } }, 'キャンセル'),
            h('button', { class: 'btn btn-primary', onclick: () => { close(true); resolve(true); } }, '解析'),
          );
        }));
        if (!ok || !ta.value.trim()) return;
        trState.cues = window.AI.parseTranscript(ta.value.trim());
        if (trState.cues.length === 0) { toast('形式を認識できませんでした', 'err'); return; }
        toast(`${trState.cues.length} キャプション認識`, 'success');
        renderPrev();
      });
      trActions.append(btnVTT, btnAI, btnPaste);
      trBox.append(trActions);

      const trPrev = h('div', {});
      trBox.append(trPrev);
      const renderPrev = () => {
        trPrev.innerHTML = '';
        if (trState.cues.length === 0) return;
        const info = h('div', { style: 'margin-top:10px;padding:8px 10px;background:#fff;border:1px solid var(--rule);border-radius:6px;font-size:11.5px' });
        const preview = trState.cues.slice(0, 3).map(c => `<div style="color:var(--ink-2)"><span style="color:var(--dim);font-family:monospace;font-size:10.5px;margin-right:6px">${fmtTS(c.start)}</span>${esc(c.text.slice(0, 50))}${c.text.length > 50 ? '…' : ''}</div>`).join('');
        info.innerHTML = `<div style="font-weight:800;color:var(--ink);margin-bottom:4px">${trState.cues.length} キャプション 認識済 (${fmtTS(trState.cues[trState.cues.length-1].end)})</div>${preview}${trState.cues.length > 3 ? `<div style="color:var(--dim);margin-top:2px">… 他 ${trState.cues.length - 3} 件</div>` : ''}`;
        trPrev.append(info);
        const genBtn = h('button', { class: 'btn btn-primary btn-sm', style: 'margin-top:8px' }, 'この字幕から手順を生成');
        genBtn.addEventListener('click', async () => {
          const generated = window.AI.generateStepsFromTranscript(trState.cues);
          if (!generated.length) { toast('手順を生成できませんでした', 'err'); return; }
          let mode = 'append';
          if (draft.steps.length > 0) {
            const box = h('div', {}, h('div', {}, `${generated.length} 手順が生成されます。既存 ${draft.steps.length} 手順は?`));
            mode = await new Promise(resolve => modal('反映方法', box, (row, close) => {
              row.append(
                h('button', { class: 'btn btn-ghost', onclick: () => { close(); resolve(null); } }, 'キャンセル'),
                h('button', { class: 'btn btn-secondary', onclick: () => { close(); resolve('replace'); } }, '既存を置換'),
                h('button', { class: 'btn btn-primary', onclick: () => { close(); resolve('append'); } }, '末尾に追加'),
              );
            }));
            if (!mode) return;
          }
          if (mode === 'replace') draft.steps.length = 0;
          draft.steps.push(...generated);
          toast(`${generated.length} 手順を生成 (キャプション+タイムスタンプ付き)`, 'success');
          renderTab();
          card.querySelector('#sc').textContent = `(${draft.steps.length})`;
        });
        trPrev.append(genBtn);
      };
      tabBody.append(trBox);
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
    Object.assign(w, draft, { status: 'published', updatedAt: new Date().toISOString().slice(0, 10) });
    w.history = w.history || [];
    const isFirst = !w.history.some(hi => hi.what && hi.what.includes('新規'));
    w.history.unshift({ time: fmtDate(Date.now()).slice(5), who: store.user().name, what: isFirst ? '新規登録' : '内容を更新' });
    store.save('works');
    toast('保存しました', 'success');
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

// ============================ Transcribe / 動画から手順自動生成 ============================
function buildTranscribeSection(draft, onGenerate) {
  const wrap = h('div', { class: 'transcribe-block' });
  const state = { mode: 'file', cues: [], rawText: '' };

  wrap.innerHTML = `
    <div class="transcribe-h">
      ${I.sparkle}
      <div>
        <div class="transcribe-h-title">🎬 動画の文字起こしから 手順を自動生成</div>
        <div class="transcribe-h-sub">字幕ファイル (VTT / SRT) をアップロード or 文字起こしを貼り付け → キャプションを分析して 手順 1・2・3… に自動分解</div>
      </div>
    </div>
    <div class="transcribe-tabs" id="tt">
      <button class="transcribe-tab on" data-m="file">📁 字幕ファイル</button>
      <button class="transcribe-tab" data-m="paste">📝 テキスト貼付</button>
      <button class="transcribe-tab" data-m="ai">✨ AI 疑似生成</button>
    </div>
    <div class="transcribe-pane" id="tp"></div>
    <div id="tprev"></div>`;

  const paneEl = wrap.querySelector('#tp');
  const prevEl = wrap.querySelector('#tprev');

  function renderPane() {
    paneEl.innerHTML = '';
    if (state.mode === 'file') {
      const dz = h('div', { class: 'dropzone compact', style: 'margin:0' });
      dz.innerHTML = `
        <div class="dropzone-icon">${I.import}</div>
        <div style="flex:1;min-width:0">
          <div class="dropzone-title">.vtt / .srt / .txt ファイルをドロップ</div>
          <div class="dropzone-sub">YouTube・Zoom録画・Teams録画 の字幕ファイル (WebVTT / SubRip) 対応</div>
        </div>
        <input type="file" class="dropzone-in" accept=".vtt,.srt,.txt,text/plain,text/vtt">`;
      const inp = dz.querySelector('input');
      const handle = async (f) => {
        if (!f) return;
        const text = await f.text();
        state.rawText = text;
        state.cues = window.AI.parseTranscript(text);
        if (state.cues.length === 0) { toast('字幕を認識できませんでした', 'err'); return; }
        toast(`${state.cues.length} 個のキャプションを認識しました`, 'success');
        renderPreview();
      };
      inp.addEventListener('change', () => handle(inp.files[0]));
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
      dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragover'); handle(e.dataTransfer.files[0]); });
      paneEl.append(dz);
    } else if (state.mode === 'paste') {
      const ta = h('textarea', { class: 'transcribe-ta', placeholder: 'WEBVTT または SRT または プレーン文字起こし を貼り付けてください。\n\n例:\nWEBVTT\n\n00:00:00.000 --> 00:00:06.000\nまず停電確認を行います。\n\n00:00:06.500 --> 00:00:12.000\n次に検電器で確認します。' });
      const acts = h('div', { class: 'transcribe-actions' });
      const parseBtn = h('button', { class: 'btn btn-primary btn-sm' }, '文字起こしを解析');
      parseBtn.innerHTML = I.sparkle + '文字起こしを解析';
      parseBtn.addEventListener('click', () => {
        const text = ta.value.trim();
        if (!text) { toast('文字起こしを入力してください', 'err'); return; }
        state.rawText = text;
        state.cues = window.AI.parseTranscript(text);
        if (state.cues.length === 0) { toast('形式を認識できませんでした', 'err'); return; }
        toast(`${state.cues.length} 個のキャプションを認識しました`, 'success');
        renderPreview();
      });
      acts.append(parseBtn);
      paneEl.append(ta, acts);
    } else if (state.mode === 'ai') {
      const info = h('div', { style: 'font-size:11.5px;color:var(--dim);font-weight:500;line-height:1.65;margin-bottom:8px' },
        '本番運用時は OpenAI Whisper API に接続して 動画音声を自動文字起こしします (実装 hook 済み)。 デモではタイトルから電気工事の標準トークを疑似生成します。');
      const btn = h('button', { class: 'btn btn-primary btn-sm' });
      btn.innerHTML = I.sparkle + '疑似 AI で 文字起こしを生成';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerHTML = I.sparkle + '生成中 …';
        await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
        state.rawText = window.AI.mockTranscribe(draft.title);
        state.cues = window.AI.parseTranscript(state.rawText);
        btn.disabled = false;
        btn.innerHTML = I.sparkle + '再生成';
        toast(`${state.cues.length} 個のキャプションを生成しました`, 'success');
        renderPreview();
      });
      paneEl.append(info, btn);
    }
  }

  function renderPreview() {
    prevEl.innerHTML = '';
    if (!state.cues.length) return;
    const p = h('div', { class: 'transcribe-preview', style: 'margin-top:12px' });
    const totalDur = state.cues[state.cues.length - 1].end;
    p.innerHTML = `
      <div class="transcribe-preview-h">
        <span>認識したキャプション <small>· ${state.cues.length} 個 · ${fmtTS(totalDur)} 分</small></span>
        <button class="btn btn-primary btn-sm" data-make>${I.sparkle}この字幕から手順を作る</button>
      </div>`;
    const list = h('div', {});
    state.cues.slice(0, 15).forEach(c => {
      const row = h('div', { class: 'transcribe-cue' });
      row.innerHTML = `<div class="transcribe-cue-time">${fmtTS(c.start)}</div><div class="transcribe-cue-text">${esc(c.text)}</div>`;
      list.append(row);
    });
    if (state.cues.length > 15) list.append(h('div', { class: 'transcribe-cue', style: 'color:var(--dim);justify-content:center' }, h('div'), h('div', {}, `… 他 ${state.cues.length - 15} 個`)));
    p.append(list);
    p.querySelector('[data-make]').addEventListener('click', async () => {
      const generated = window.AI.generateStepsFromTranscript(state.cues);
      if (!generated.length) { toast('手順を生成できませんでした', 'err'); return; }
      const mode = draft.steps.length === 0 ? 'append' : await new Promise(resolve => {
        modal('手順生成方法', h('div', {},
          h('div', {}, `字幕から ${generated.length} 手順が生成されます。既存 ${draft.steps.length} 手順をどうしますか?`),
        ), (row, close) => {
          row.append(
            h('button', { class: 'btn btn-ghost', onclick: () => { close(null); resolve(null); } }, 'キャンセル'),
            h('button', { class: 'btn btn-secondary', onclick: () => { close('replace'); resolve('replace'); } }, '既存を置換'),
            h('button', { class: 'btn btn-primary', onclick: () => { close('append'); resolve('append'); } }, '末尾に追加'),
          );
        });
      });
      if (!mode) return;
      if (mode === 'replace') draft.steps.length = 0;
      draft.steps.push(...generated);
      toast(`${generated.length} 手順を生成しました (動画タイムスタンプ付き)`, 'success');
      onGenerate && onGenerate();
    });
    prevEl.append(p);
  }

  renderPane();

  wrap.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
    wrap.querySelectorAll('[data-m]').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    state.mode = b.dataset.m;
    renderPane();
  }));

  return wrap;
}

function fmtTS(seconds) {
  if (seconds == null || isNaN(seconds)) return '00:00';
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
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
  const actions = h('div', { style: 'display:flex;gap:6px;align-self:flex-start;margin-top:4px;flex-wrap:wrap' });
  const addBtn = h('button', { class: 'btn btn-secondary btn-sm' }, h('span', { html: I.plus }), '資料を追加');
  addBtn.addEventListener('click', () => { draft.resources.push({ type: 'pdf', name: '', url: '', meta: '' }); onChange(); });
  const fileBtn = h('label', { class: 'btn btn-secondary btn-sm', style: 'cursor:pointer;position:relative' }, h('span', { html: I.plus }), 'ファイルから');
  const fileInp = h('input', { type: 'file', accept: 'image/*,application/pdf', multiple: true, style: 'position:absolute;inset:0;opacity:0;cursor:pointer' });
  fileInp.addEventListener('change', async () => {
    let added = 0;
    for (const f of Array.from(fileInp.files)) {
      if (f.size > 10 * 1024 * 1024) { toast(`${f.name} は 10MB を超えています`, 'err'); continue; }
      const data = await readFileAsDataURL(f);
      const type = f.type.startsWith('image/') ? 'img' : (f.type === 'application/pdf' ? 'pdf' : 'link');
      draft.resources.push({ type, name: f.name, url: data, meta: `${(f.size / 1024).toFixed(0)} KB` });
      added++;
    }
    fileInp.value = '';
    if (added > 0) { onChange(); toast(`${added} 件のファイルを追加しました`, 'success'); }
  });
  fileBtn.append(fileInp);
  actions.append(addBtn, fileBtn);
  box.append(actions);
  wrap.append(box);
  return wrap;
}

function readFileAsDataURL(f) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}

function showImagePreview(r) {
  const body = h('div', { class: 'img-viewer' });
  body.innerHTML = `<img src="${r.url}" alt="${esc(r.name)}">`;
  modal(r.name, body, (row, close) => {
    row.append(
      h('button', { class: 'btn btn-secondary', onclick: () => {
        const a = document.createElement('a'); a.href = r.url; a.download = r.name; a.click();
      } }, 'ダウンロード'),
      h('button', { class: 'btn btn-primary', onclick: () => close(true) }, '閉じる')
    );
  });
}

// ============================ Icons additional ============================
Object.assign(I, {
  sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h4M17 21h4M21 14v3"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>',
  cmd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3a3 3 0 0 1 3 3v12a3 3 0 1 1-3-3h12a3 3 0 1 1-3 3V6a3 3 0 1 1 3 3H6a3 3 0 0 1-3-3z"/></svg>',
});

// ============================ AI FAB & Panel ============================
const ai = {
  panel: null,
  msgs: [
    { role: 'bot', text: 'こんにちは。三崎屋電工AI の技術アシスタントです。作業手順・基準値・危険予知について何でも聞いてください。', suggest: ['絶縁抵抗の合格基準は?', '検電器の動作確認は?', 'PAS交換の危険は?'] },
  ],

  toggle() {
    if (this.panel) return this.close();
    this.open();
  },
  open() {
    const p = h('div', { class: 'ai-panel' });
    p.innerHTML = `
      <div class="ai-h">
        <div class="ai-h-mark">${I.sparkle}</div>
        <div class="ai-h-title">技術アシスタント<small>電気工事の実務Q&Aに回答</small></div>
        <button class="ai-h-close" aria-label="閉じる">${I.x}</button>
      </div>
      <div class="ai-body" id="aiBody"></div>
      <div class="ai-in">
        <input placeholder="質問を入力 (例: 絶縁抵抗 100V の基準)" id="aiIn" autocomplete="off">
        <button id="aiSend" aria-label="送信">${I.send}</button>
      </div>`;
    document.body.append(p);
    this.panel = p;
    this.render();
    p.querySelector('.ai-h-close').addEventListener('click', () => this.close());
    const inp = p.querySelector('#aiIn');
    const send = p.querySelector('#aiSend');
    inp.focus();
    const submit = () => {
      const q = inp.value.trim();
      if (!q) return;
      inp.value = '';
      this.ask(q);
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    send.addEventListener('click', submit);
  },
  close() {
    if (this.panel) { this.panel.remove(); this.panel = null; }
  },
  render() {
    if (!this.panel) return;
    const body = this.panel.querySelector('#aiBody');
    body.innerHTML = '';
    for (const m of this.msgs) {
      const msg = h('div', { class: 'ai-msg ' + (m.role === 'me' ? 'me' : 'bot') });
      msg.append(h('div', { class: 'ai-msg-txt' }, m.text));
      if (m.related && m.related.length) {
        const rel = h('div', { class: 'ai-msg-rel' });
        for (const rid of m.related) {
          const w = store.work(rid);
          if (!w) continue;
          const a = h('a', { onclick: () => { router.go('work/' + rid); this.close(); } }, w.title);
          rel.append(a);
        }
        msg.append(rel);
      }
      if (m.suggest && m.suggest.length) {
        const s = h('div', { class: 'ai-suggest' });
        for (const q of m.suggest) {
          const b = h('button', { onclick: () => this.ask(q) }, q);
          s.append(b);
        }
        msg.append(s);
      }
      body.append(msg);
    }
    body.scrollTop = body.scrollHeight;
  },
  async ask(question) {
    this.msgs.push({ role: 'me', text: question });
    this.render();
    // typing indicator
    const body = this.panel.querySelector('#aiBody');
    const typing = h('div', { class: 'ai-msg bot' });
    typing.innerHTML = `<div class="ai-typing"><span></span><span></span><span></span></div>`;
    body.append(typing);
    body.scrollTop = body.scrollHeight;
    await new Promise(r => setTimeout(r, 550 + Math.random() * 350));
    typing.remove();
    const res = window.AI.ask(question);
    this.msgs.push({ role: 'bot', text: res.answer, related: res.related });
    this.render();
  },
};

function mountAIFab() {
  if (document.getElementById('aiFab')) return;
  const fab = h('button', { class: 'ai-fab', id: 'aiFab', title: '技術アシスタント (Cmd+/)', 'aria-label': 'AI アシスタント' });
  fab.innerHTML = I.sparkle + `<span class="fab-dot"></span>`;
  fab.addEventListener('click', () => ai.toggle());
  document.body.append(fab);
}

// ============================ Cmd+K Command Palette ============================
const palette = {
  el: null,
  cursor: 0,
  items: [],

  open() {
    if (this.el) return;
    const p = h('div', { class: 'palette-back' });
    p.innerHTML = `
      <div class="palette">
        <div class="palette-in">
          ${I.search}
          <input placeholder="コマンド or キーワードを入力…" id="pIn" autocomplete="off">
          <kbd>Esc</kbd>
        </div>
        <div class="palette-list" id="pList"></div>
        <div class="palette-foot">
          <span><kbd>↑↓</kbd> 選択</span>
          <span><kbd>Enter</kbd> 開く</span>
          <span><kbd>Esc</kbd> 閉じる</span>
          <span style="margin-left:auto">${store.works.filter(w => w.status === 'published').length} 件の手順書を検索対象</span>
        </div>
      </div>`;
    p.addEventListener('click', e => { if (e.target === p) this.close(); });
    document.body.append(p);
    this.el = p;
    const inp = p.querySelector('#pIn');
    inp.focus();
    this.refresh('');
    inp.addEventListener('input', e => this.refresh(e.target.value));
    p.addEventListener('keydown', e => this.onKey(e));
  },
  close() {
    if (this.el) { this.el.remove(); this.el = null; this.cursor = 0; }
  },
  onKey(e) {
    if (e.key === 'Escape') { this.close(); e.preventDefault(); }
    else if (e.key === 'ArrowDown') {
      this.cursor = Math.min(this.items.length - 1, this.cursor + 1);
      this.paint();
      e.preventDefault();
    }
    else if (e.key === 'ArrowUp') {
      this.cursor = Math.max(0, this.cursor - 1);
      this.paint();
      e.preventDefault();
    }
    else if (e.key === 'Enter') {
      const item = this.items[this.cursor];
      if (item) { item.action(); this.close(); }
      e.preventDefault();
    }
  },
  paint() {
    const list = this.el.querySelector('#pList');
    list.innerHTML = '';
    if (this.items.length === 0) {
      list.innerHTML = `<div class="palette-empty">該当なし。<br>別のキーワードで試してください。</div>`;
      return;
    }
    let lastGroup = '';
    this.items.forEach((item, idx) => {
      if (item.group !== lastGroup) {
        list.append(h('div', { class: 'palette-group-h' }, item.group));
        lastGroup = item.group;
      }
      const el = h('div', { class: 'palette-item ' + (idx === this.cursor ? 'on' : '') });
      el.innerHTML = `
        ${item.icon || I.right}
        <div class="palette-body">
          <div class="palette-title">${item.title}</div>
          ${item.sub ? `<div class="palette-sub">${esc(item.sub)}</div>` : ''}
        </div>
        ${item.hint ? `<div class="palette-hint">${item.hint}</div>` : ''}`;
      el.addEventListener('click', () => { item.action(); this.close(); });
      list.append(el);
    });
  },
  refresh(q) {
    const items = [];
    const norm = q.trim().toLowerCase();
    const highlight = (text) => {
      if (!norm) return esc(text);
      const idx = text.toLowerCase().indexOf(norm);
      if (idx < 0) return esc(text);
      return esc(text.slice(0, idx)) + `<mark>${esc(text.slice(idx, idx + norm.length))}</mark>` + esc(text.slice(idx + norm.length));
    };

    // ナビ (常に候補)
    const navs = [
      { name: 'ホーム', route: 'home', icon: I.home, hint: 'G H' },
      { name: '作業を探す', route: 'search', icon: I.search, hint: 'G S' },
      { name: 'お気に入り', route: 'favorites', icon: I.starOutline, hint: 'G F' },
      { name: '最近の閲覧', route: 'recent', icon: I.clock },
      { name: 'マイページ', route: 'mypage', icon: I.user },
      { name: 'データベース', route: 'database', icon: I.db },
      { name: '教材モード', route: 'courses', icon: I.book },
      { name: '管理メニュー', route: 'admin', icon: I.gear },
    ];
    for (const n of navs) {
      if (!norm || n.name.toLowerCase().includes(norm)) {
        items.push({ group: 'ページ', title: highlight(n.name), icon: n.icon, hint: n.hint, action: () => router.go(n.route) });
      }
    }
    // アクション
    const actions = [
      { name: '新しい作業を追加', route: 'new', icon: I.plus },
      { name: '技術アシスタントを開く', action: () => ai.open(), icon: I.sparkle },
    ];
    for (const a of actions) {
      if (!norm || a.name.toLowerCase().includes(norm)) {
        items.push({ group: 'アクション', title: highlight(a.name), icon: a.icon, action: a.action || (() => router.go(a.route)) });
      }
    }
    // 作業 (fuzzy)
    if (norm.length >= 1) {
      const works = store.works.filter(w => w.status === 'published').filter(w =>
        w.title.toLowerCase().includes(norm) ||
        (w.tags || []).some(t => t.toLowerCase().includes(norm)) ||
        (w.description || '').toLowerCase().includes(norm)
      ).slice(0, 8);
      for (const w of works) {
        const cat = store.category(w.category);
        items.push({
          group: '作業手順書',
          title: highlight(w.title),
          sub: `${cat ? cat.name : ''} · 難易度 ${w.difficulty}/5 · 更新 ${fmtDate(w.updatedAt)}`,
          icon: I.book,
          action: () => router.go('work/' + w.id),
        });
      }
      // AI 質問 sink
      items.push({
        group: 'AI アシスタント',
        title: `<mark>「${esc(q)}」</mark> について技術アシスタントに質問`,
        icon: I.sparkle,
        action: () => { ai.open(); setTimeout(() => ai.ask(q), 150); },
      });
    }
    this.items = items;
    this.cursor = 0;
    this.paint();
  },
};

// ============================ Global Keyboard Shortcuts ============================
let gLeader = null;
let gLeaderTimeout = null;
function mountShortcuts() {
  document.addEventListener('keydown', e => {
    const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;

    // Cmd+K / Ctrl+K → palette (どこからでも、両ブラウザ対応)
    if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
      e.preventDefault();
      if (palette.el) palette.close(); else palette.open();
      return;
    }
    // Cmd+/ → AI (どこからでも)
    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault();
      ai.toggle();
      return;
    }
    // Esc → close overlays (input focus 中でも効く必要あるので inField guard の 前 に置く)
    if (e.key === 'Escape') {
      if (palette.el) { palette.close(); e.preventDefault(); return; }
      if (ai.panel) { ai.close(); e.preventDefault(); return; }
      return;
    }
    if (inField) return;
    // ? → help
    if (e.key === '?') { e.preventDefault(); showHelp(); return; }
    // g leader (vim-style)
    if (e.key === 'g' && !gLeader) {
      gLeader = 'g';
      clearTimeout(gLeaderTimeout);
      gLeaderTimeout = setTimeout(() => { gLeader = null; }, 1200);
      return;
    }
    if (gLeader === 'g') {
      gLeader = null;
      clearTimeout(gLeaderTimeout);
      const map = { h: 'home', s: 'search', f: 'favorites', r: 'recent', m: 'mypage', d: 'database', c: 'courses' };
      if (map[e.key]) { router.go(map[e.key]); e.preventDefault(); return; }
    }
    // e = edit current work
    if (e.key === 'e' && router.current.name === 'work' && router.current.params.id) {
      e.preventDefault();
      router.go('work/' + router.current.params.id + '/edit');
      return;
    }
    // f = toggle favorite on work detail
    if (e.key === 'f' && router.current.name === 'work' && router.current.params.id) {
      e.preventDefault();
      const w = store.work(router.current.params.id);
      if (w) {
        const on = store.toggleFav(w.id);
        toast(on ? 'お気に入りに追加しました' : 'お気に入りから外しました', 'success');
        render();
      }
    }
  });
}

// ============================ Quick start helpers ============================
async function quickStartVideo() {
  // 新規作業を作って、資料タブへ直行
  const currentUid = store.currentUserId;
  const existing = store.works.find(w => w.author === currentUid && !w.title.trim() && w.status === 'published');
  let w;
  if (existing) {
    w = existing;
  } else {
    w = {
      id: uid(), title: '', category: 'panel', tags: [], site: '', difficulty: 2, duration: '',
      thumb: 'default', status: 'published', author: currentUid, approver: currentUid,
      createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10),
      views: 0, description: '',
      steps: [], tools: [], materials: [], tips: [], cautions: [], resources: [], relatedIds: [],
      videoUrl: '', history: [{ time: fmtDate(Date.now()).slice(5), who: store.user().name, what: '動画から手順生成モードで新規作成' }],
    };
    store.works.unshift(w);
    store.save('works');
  }
  toast('動画から手順を作るモードで開きます', 'success');
  location.hash = `#work/${w.id}/edit?tab=res`;
}

async function quickStartAI() {
  // タイトル入力 → AI 手順生成 → 保存
  const titleInput = h('input', { class: 'form-in', placeholder: '例: 分電盤の交換, PAS の交換, 照明器具の取付' });
  const catRow = h('div', { class: 'category-picker', style: 'margin-top:8px' });
  let selectedCat = 'panel';
  store.categories.forEach(c => {
    const b = h('button', { class: 'cat-chip ' + (c.id === 'panel' ? 'on' : ''), type: 'button' }, c.name);
    b.addEventListener('click', () => {
      catRow.querySelectorAll('.cat-chip').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      selectedCat = c.id;
    });
    catRow.append(b);
  });
  const body = h('div', {},
    h('div', { style: 'font-size:12.5px;color:var(--ink-2);margin-bottom:12px;line-height:1.65' },
      'タイトル (作業名) を入力すると AI が電気工事の標準手順 (停電確認→検電→養生→作業→通電→記録) を 12 前後の手順で下書きします。'),
    h('div', { class: 'form-lbl' }, '作業のタイトル *'),
    titleInput,
    h('div', { class: 'form-lbl', style: 'margin-top:8px' }, 'カテゴリ'),
    catRow,
  );
  const ok = await new Promise(resolve => {
    modal('✨ AI で下書き作成', body, (row, close) => {
      row.append(
        h('button', { class: 'btn btn-ghost', onclick: () => { close(null); resolve(null); } }, 'キャンセル'),
        h('button', { class: 'btn btn-primary', onclick: () => {
          if (!titleInput.value.trim()) { toast('タイトルを入力してください', 'err'); return; }
          close(true); resolve(true);
        } }, '手順を生成する')
      );
    });
    setTimeout(() => titleInput.focus(), 100);
  });
  if (!ok) return;
  const title = titleInput.value.trim();
  const generated = window.AI.generateSteps(title, selectedCat);
  const kyt = window.AI.generateKYT(title);
  const newWork = {
    id: uid(), title, category: selectedCat, tags: [], site: '', difficulty: 2, duration: '約 4時間',
    thumb: selectedCat, status: 'published', author: store.currentUserId, approver: store.currentUserId,
    createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10),
    views: 0, description: `AI が生成した ${title} の標準手順書です。 現場に合わせて 手順・注意点・写真 を編集してご利用ください。`,
    steps: generated,
    tools: [], materials: [], tips: [], cautions: kyt, resources: [], relatedIds: [], videoUrl: '',
    history: [{ time: fmtDate(Date.now()).slice(5), who: store.user().name, what: `AI で自動生成 (${generated.length}手順 + KYT ${kyt.length}件)` }],
  };
  store.works.unshift(newWork);
  store.save('works');
  toast(`AI が ${generated.length} 手順 + KYT ${kyt.length}件 を生成しました`, 'success');
  location.hash = `#work/${newWork.id}`;
}

// ============================ Walkthrough (5-step onboarding) ============================
function showWalkthrough() {
  const slides = [
    { num: 'STEP 1', illust: I.search, title: '① 作業を見つける', txt: 'ホーム画面の 「おすすめの作業」 か、上の 検索バー にキーワード (例: 分電盤) を入れて 作業を探します。' },
    { num: 'STEP 2', illust: I.book, title: '② 手順を上から順に読む', txt: '作業を開くと 手順が 1・2・3… と順番に並んでいます。 危険予知や注意点も 一緒に書いてあります。' },
    { num: 'STEP 3', illust: I.img, title: '③ スマホで写真を撮る', txt: '各手順の下にある 「📸 写真を追加」 ボタンを タップ すると、 スマホのカメラが起動します。 施工前・施工後 を撮って残しましょう。' },
    { num: 'STEP 4', illust: I.check, title: '④ 完了したら 緑丸をタップ', txt: '手順が終わったら 左端の 緑丸 (✓) をタップして 完了マーク をつけます。 全部の手順が終わったら 次のステップへ。' },
    { num: 'STEP 5', illust: I.print, title: '⑤ 完了報告書を出す', txt: '「完了報告書を作成」 ボタンを押すと、 撮った写真と作業員名 が入った 印刷可能な報告書 が出ます。 責任者に提出してください。' },
  ];
  let idx = 0;
  const shell = h('div', { class: 'wt-container' });
  const render = () => {
    const s = slides[idx];
    shell.innerHTML = `<div class="wt-slide">
      <div class="wt-num">${esc(s.num)} / 5</div>
      <div class="wt-illust">${s.illust}</div>
      <div class="wt-title">${esc(s.title)}</div>
      <div class="wt-txt">${esc(s.txt)}</div>
    </div>
    <div class="wt-dots">${slides.map((_, i) => `<span class="wt-dot ${i === idx ? 'on' : ''}"></span>`).join('')}</div>`;
  };
  render();
  modal('三崎屋電工AI の 使い方', shell, (row, close) => {
    const back = h('button', { class: 'btn btn-secondary' }, '← 戻る');
    const next = h('button', { class: 'btn btn-primary' }, '次へ →');
    const done = h('button', { class: 'btn btn-primary' }, '始める');
    back.addEventListener('click', () => { if (idx > 0) { idx--; render(); refresh(); } });
    next.addEventListener('click', () => { if (idx < slides.length - 1) { idx++; render(); refresh(); } });
    done.addEventListener('click', () => close(true));
    row.append(back, next);
    function refresh() {
      back.disabled = idx === 0;
      const isLast = idx === slides.length - 1;
      row.removeChild(row.lastChild);
      row.append(isLast ? done : next);
    }
    refresh();
  });
}

function showHelp() {
  const list = h('div', {});
  const rows = [
    ['Cmd+K', 'コマンドパレット'],
    ['Cmd+/', '技術アシスタント'],
    ['G → H', 'ホーム'],
    ['G → S', '作業を探す'],
    ['G → F', 'お気に入り'],
    ['G → R', '最近の閲覧'],
    ['G → M', 'マイページ'],
    ['G → D', 'データベース'],
    ['G → C', '教材モード'],
    ['F', '作業詳細でお気に入り toggle'],
    ['E', '作業詳細で編集モードへ'],
    ['?', 'このヘルプ'],
    ['Esc', 'オーバーレイを閉じる'],
  ];
  const grid = h('div', { style: 'display:grid;grid-template-columns:auto 1fr;gap:8px 18px;font-size:12.5px' });
  for (const [k, v] of rows) {
    grid.append(
      h('kbd', { style: 'background:var(--surface-2);border:1px solid var(--rule);padding:2px 8px;border-radius:4px;font-family:var(--font-mono);font-size:11px;font-weight:600;color:var(--ink);text-align:center;justify-self:start' }, k),
      h('div', { style: 'color:var(--ink-2);font-weight:600' }, v),
    );
  }
  list.append(grid);
  modal('キーボードショートカット', list, (row, close) => {
    row.append(h('button', { class: 'btn btn-primary', onclick: () => close(true) }, '閉じる'));
  });
}

// ============================ QR Code (self-contained, no external lib) ============================
// Minimal QR code generator (Model 2, ECC L, up to version 10)
function qrSVG(text, size = 200) {
  const matrix = qrMatrix(text);
  const n = matrix.length;
  const cell = Math.max(2, Math.floor(size / (n + 4)));
  const total = cell * (n + 4);
  let rects = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (matrix[y][x]) rects += `<rect x="${(x + 2) * cell}" y="${(y + 2) * cell}" width="${cell}" height="${cell}" fill="#0f0f0f"/>`;
    }
  }
  return `<svg width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg"><rect width="${total}" height="${total}" fill="#fff"/>${rects}</svg>`;
}

// Simple QR matrix generator (byte mode, ECC L)
function qrMatrix(text) {
  const bytes = new TextEncoder().encode(text);
  // Determine minimum version for byte mode ECC L
  const capacities = [17, 32, 53, 78, 106, 134, 154, 192, 230, 271];
  let version = 1;
  while (version <= 10 && bytes.length > capacities[version - 1]) version++;
  if (version > 10) version = 10; // clamp; may still error but sufficient for our short URLs
  return buildQR(bytes, version);
}

// A very compact QR encoder for byte-mode ECC-L. Adapted from public-domain implementations.
function buildQR(data, ver) {
  const size = 17 + ver * 4;
  const eccWordsPerBlock = [null, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18][ver];
  const numBlocks = [null, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2][ver];
  const totalCodewords = [null, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346][ver];
  const dataCapacity = totalCodewords - eccWordsPerBlock * numBlocks;
  // Build bit stream
  const bits = [];
  const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  push(0b0100, 4); // byte mode
  push(data.length, ver < 10 ? 8 : 16);
  for (const b of data) push(b, 8);
  // terminator
  for (let i = 0; i < 4 && bits.length < dataCapacity * 8; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }
  const pad = [0xEC, 0x11];
  let pi = 0;
  while (codewords.length < dataCapacity) codewords.push(pad[pi++ % 2]);
  // Reed-Solomon ECC over GF(256)
  const rs = rsEncode(codewords, eccWordsPerBlock);
  const allBytes = codewords.concat(rs);
  // Build matrix
  const m = Array.from({ length: size }, () => new Array(size).fill(null));
  const rsv = Array.from({ length: size }, () => new Array(size).fill(false));
  // Finder patterns
  const drawFinder = (r, c) => {
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
      const yy = r + y, xx = c + x;
      if (yy < 0 || yy >= size || xx < 0 || xx >= size) continue;
      const on = (0 <= y && y <= 6 && (x === 0 || x === 6)) ||
                 (0 <= x && x <= 6 && (y === 0 || y === 6)) ||
                 (2 <= y && y <= 4 && 2 <= x && x <= 4);
      m[yy][xx] = on ? 1 : 0;
      rsv[yy][xx] = true;
    }
  };
  drawFinder(0, 0); drawFinder(0, size - 7); drawFinder(size - 7, 0);
  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    m[6][i] = (i % 2 === 0) ? 1 : 0; rsv[6][i] = true;
    m[i][6] = (i % 2 === 0) ? 1 : 0; rsv[i][6] = true;
  }
  // Alignment (for ver >= 2)
  if (ver >= 2) {
    const alignPos = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]][ver];
    for (const cx of alignPos) for (const cy of alignPos) {
      if ((cx === 6 && cy === 6) || (cx === 6 && cy === size - 7) || (cx === size - 7 && cy === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const yy = cy + dy, xx = cx + dx;
        const on = (Math.abs(dx) === 2 || Math.abs(dy) === 2 || (dx === 0 && dy === 0));
        m[yy][xx] = on ? 1 : 0;
        rsv[yy][xx] = true;
      }
    }
  }
  // Reserve format info
  for (let i = 0; i <= 8; i++) { if (!rsv[8][i]) { m[8][i] = 0; rsv[8][i] = true; } if (!rsv[i][8]) { m[i][8] = 0; rsv[i][8] = true; } }
  for (let i = 0; i < 8; i++) { m[size - 1 - i][8] = 0; rsv[size - 1 - i][8] = true; m[8][size - 1 - i] = 0; rsv[8][size - 1 - i] = true; }
  m[size - 8][8] = 1; rsv[size - 8][8] = true;
  // Data placement
  const dataBits = [];
  for (const b of allBytes) for (let i = 7; i >= 0; i--) dataBits.push((b >> i) & 1);
  let bitIdx = 0, dir = -1, col = size - 1;
  while (col > 0) {
    if (col === 6) col--;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = col - j;
        const y = dir < 0 ? size - 1 - vert : vert;
        if (rsv[y][x]) continue;
        m[y][x] = bitIdx < dataBits.length ? dataBits[bitIdx++] : 0;
      }
    }
    dir = -dir;
    col -= 2;
  }
  // Apply mask 0 (simplest, and format bits for mask 0)
  const mask = (y, x) => (y + x) % 2 === 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (rsv[y][x]) continue;
    if (mask(y, x)) m[y][x] ^= 1;
  }
  // Format info for ECC L, mask 0
  const formatBits = 0b111011111000100;
  const formatArr = [];
  for (let i = 14; i >= 0; i--) formatArr.push((formatBits >> i) & 1);
  const putFormat = (bits) => {
    for (let i = 0; i < 6; i++) m[8][i] = bits[i];
    m[8][7] = bits[6]; m[8][8] = bits[7]; m[7][8] = bits[8];
    for (let i = 9; i < 15; i++) m[14 - i][8] = bits[i];
    for (let i = 0; i < 7; i++) m[size - 1 - i][8] = bits[i];
    for (let i = 7; i < 15; i++) m[8][size - 15 + i] = bits[i];
  };
  putFormat(formatArr);
  return m;
}
// Reed-Solomon over GF(256) with primitive poly 0x11d
function rsEncode(data, eccLen) {
  const exp = new Array(512), log = new Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) { exp[i] = x; log[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
  const gfMul = (a, b) => (a === 0 || b === 0) ? 0 : exp[log[a] + log[b]];
  // Generator polynomial
  let gen = [1];
  for (let i = 0; i < eccLen; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= gfMul(gen[j], exp[i]);
    }
    gen = next;
  }
  // Divide
  const buf = data.concat(new Array(eccLen).fill(0));
  for (let i = 0; i < data.length; i++) {
    const coef = buf[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) buf[i + j] ^= gfMul(gen[j], coef);
    }
  }
  return buf.slice(data.length);
}

// ============================ Boot ============================
store.load();
// v0.9 マイグレーション: 承認フロー撤廃、pending/draft → published 統一
let migrated = false;
for (const w of store.works) {
  if (w.status !== 'published') { w.status = 'published'; migrated = true; }
  if (!w.approver) { w.approver = w.author; migrated = true; }
}
if (migrated) store.save('works');
render();
mountShortcuts(); // Cmd+K palette 等 (キーボードのみ、UI 見えない)

window.__store = store;
window.__router = router;
window.__ai = ai;
window.__palette = palette;

})();
