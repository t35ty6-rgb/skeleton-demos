/**
 * 運営管理画面 (荒島ホテル)
 * - Google ログイン (admin custom claim 必須)
 * - 予約一覧 / 今日 / 今後 / 全予約 / ゲスト / ログ
 * - 予約詳細モーダル + 状態変更 + LINE メッセージ送信
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  initializeFirestore, collection, doc, getDoc, getDocs, updateDoc,
  query, where, orderBy, limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const ENV = window.__ENV;
const app = initializeApp({
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID,
});
const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
const auth = getAuth(app);

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let buildings = [];
let rooms = [];

// ============ Auth ============
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    $('#login').style.display = 'block';
    $('#dash').style.display = 'none';
    $('#userBadge').textContent = '未ログイン';
    return;
  }
  const token = await user.getIdTokenResult();
  if (!token.claims.admin) {
    $('#userBadge').textContent = `${user.email} (権限なし)`;
    $('#login').style.display = 'block';
    $('#dash').style.display = 'none';
    alert('管理者権限がありません。オーナーに連絡してください。');
    signOut(auth);
    return;
  }
  $('#userBadge').textContent = user.displayName || user.email;
  $('#login').style.display = 'none';
  $('#dash').style.display = 'block';
  await loadMaster();
  renderTab('today');
});

$('#btnLogin').addEventListener('click', () => {
  signInWithPopup(auth, new GoogleAuthProvider()).catch((e) => alert(e.message));
});

// ============ Tabs ============
$$('.head__nav button').forEach((b) => {
  b.addEventListener('click', () => {
    $$('.head__nav button').forEach((x) => x.classList.remove('is-on'));
    b.classList.add('is-on');
    renderTab(b.dataset.tab);
  });
});

function renderTab(tab) {
  $$('[data-pane]').forEach((s) => { s.hidden = s.dataset.pane !== tab; });
  if (tab === 'today') loadToday();
  else if (tab === 'upcoming') loadUpcoming();
  else if (tab === 'all') loadAll();
  else if (tab === 'guests') loadGuests();
  else if (tab === 'logs') loadLogs();
}

// ============ Master ============
async function loadMaster() {
  const bSnap = await getDocs(collection(db, 'buildings'));
  buildings = bSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const rSnap = await getDocs(collection(db, 'rooms'));
  rooms = rSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function bldgName(id) { return buildings.find((b) => b.id === id)?.name || id; }
function roomName(id) {
  const r = rooms.find((x) => x.id === id);
  if (!r) return id;
  const num = (r.id || '').split('-')[1] || r.id;
  return `${num}号 / ${r.name}`;
}

function fmtDate(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
  if (!d) return '—';
  return `${d.getMonth() + 1}/${d.getDate()} (${'日月火水木金土'[d.getDay()]})`;
}
function fmtDateTime(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
  if (!d) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusTag(s) {
  const map = {
    pending: '受付中', confirmed: '確定', cancelled: 'キャンセル', completed: '完了',
  };
  return `<span class="tag tag--${s || 'pending'}">${map[s] || s}</span>`;
}

// ============ Today ============
async function loadToday() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today); dayAfter.setDate(dayAfter.getDate() + 2);

  // 本日 IN
  const inSnap = await getDocs(query(
    collection(db, 'reservations'),
    where('status', 'in', ['pending', 'confirmed']),
    where('checkin', '>=', today),
    where('checkin', '<', tomorrow),
  ));
  const todayIn = inSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // 本日 OUT (checkin + nights == today)
  const outQ = query(collection(db, 'reservations'),
    where('status', 'in', ['confirmed', 'completed']),
    where('checkin', '>=', new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)),
    where('checkin', '<', today),
  );
  const outSnap = await getDocs(outQ);
  const todayOut = outSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => {
    const ci = r.checkin?.toDate();
    if (!ci) return false;
    const co = new Date(ci); co.setDate(co.getDate() + r.nights);
    return co.toDateString() === today.toDateString();
  });

  // 今夜滞在中
  const staySnap = await getDocs(query(
    collection(db, 'reservations'),
    where('status', '==', 'confirmed'),
  ));
  const staying = staySnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => {
    const ci = r.checkin?.toDate();
    if (!ci) return false;
    const co = new Date(ci); co.setDate(co.getDate() + r.nights);
    return ci <= today && today < co;
  });

  // 明日 IN
  const tomSnap = await getDocs(query(
    collection(db, 'reservations'),
    where('status', 'in', ['pending', 'confirmed']),
    where('checkin', '>=', tomorrow),
    where('checkin', '<', dayAfter),
  ));
  const tomIn = tomSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  $('#kpiTodayIn').textContent = todayIn.length;
  $('#kpiTodayOut').textContent = todayOut.length;
  $('#kpiStaying').textContent = staying.length;
  $('#kpiTomorrow').textContent = tomIn.length;

  renderTable('#tblTodayIn', todayIn, true);
  renderTable('#tblTodayOut', todayOut, true);
}

function renderTable(sel, data, withDetail) {
  const tbl = $(sel);
  if (data.length === 0) {
    tbl.innerHTML = '<tr><td class="empty">該当する予約はありません</td></tr>';
    return;
  }
  const head = `
    <thead><tr>
      <th>予約番号</th><th>状態</th><th>建屋</th><th>客室</th>
      <th>到着</th><th>泊数</th><th>人数</th><th>お名前</th><th>連絡先</th>
    </tr></thead>
  `;
  const rows = data.map((r) => `
    <tr class="clickable" data-res="${r.resNo || r.id}">
      <td>${r.resNo || r.id}</td>
      <td>${statusTag(r.status)}</td>
      <td>${bldgName(r.buildingId)}</td>
      <td>${roomName(r.roomId)}</td>
      <td>${fmtDate(r.checkin)}</td>
      <td>${r.nights}</td>
      <td>${r.guests}</td>
      <td>${r.name || ''}</td>
      <td>${r.tel || ''}</td>
    </tr>
  `).join('');
  tbl.innerHTML = head + `<tbody>${rows}</tbody>`;
  if (withDetail) {
    tbl.querySelectorAll('tr.clickable').forEach((tr) => {
      tr.addEventListener('click', () => openDetail(tr.dataset.res));
    });
  }
}

// ============ Upcoming ============
async function loadUpcoming() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const future = new Date(today); future.setDate(future.getDate() + 30);
  const snap = await getDocs(query(
    collection(db, 'reservations'),
    where('status', 'in', ['pending', 'confirmed']),
    where('checkin', '>=', today),
    where('checkin', '<=', future),
    orderBy('checkin', 'asc'),
  ));
  renderTable('#tblUpcoming', snap.docs.map((d) => ({ id: d.id, ...d.data() })), true);
}

// ============ All ============
async function loadAll() {
  const snap = await getDocs(query(
    collection(db, 'reservations'),
    orderBy('createdAt', 'desc'),
    limit(100),
  ));
  let data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const apply = () => {
    const s = $('#filterStatus').value;
    const b = $('#filterBldg').value;
    const filtered = data.filter((r) => (!s || r.status === s) && (!b || r.buildingId === b));
    renderTable('#tblAll', filtered, true);
  };
  $('#filterStatus').onchange = apply;
  $('#filterBldg').onchange = apply;
  $('#exportCsv').onclick = () => exportCsv(data);
  apply();
}

function exportCsv(data) {
  const head = ['予約番号', '状態', '建屋', '客室', '到着', '泊数', '人数', '名前', '電話', '合計', '作成日時'];
  const rows = data.map((r) => [
    r.resNo, r.status, bldgName(r.buildingId), roomName(r.roomId),
    fmtDate(r.checkin), r.nights, r.guests, r.name, r.tel, r.totalPrice,
    fmtDateTime(r.createdAt),
  ].map((x) => `"${String(x || '').replace(/"/g, '""')}"`).join(','));
  const csv = '﻿' + [head.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `arashima-reservations-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============ Guests ============
async function loadGuests() {
  const snap = await getDocs(query(
    collection(db, 'guests'),
    orderBy('totalReservations', 'desc'),
    limit(50),
  ));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const tbl = $('#tblGuests');
  if (data.length === 0) {
    tbl.innerHTML = '<tr><td class="empty">ゲストデータがまだありません</td></tr>';
    return;
  }
  tbl.innerHTML = `
    <thead><tr>
      <th>LINE 名</th><th>本名</th><th>電話</th><th>予約回数</th><th>泊数累計</th>
      <th>区分</th><th>最終訪問</th><th>メモ</th>
    </tr></thead>
    <tbody>
      ${data.map((g) => `
        <tr>
          <td>${g.displayName || '—'}</td>
          <td>${g.realName || '—'}</td>
          <td>${g.tel || '—'}</td>
          <td>${g.totalReservations || 0}</td>
          <td>${g.totalNights || 0}</td>
          <td>${g.isRepeater ? '<span class="tag tag--repeater">リピーター</span>' : ''}</td>
          <td>${fmtDate(g.lastSeenAt)}</td>
          <td>${g.preferences || '—'}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
}

// ============ Logs ============
async function loadLogs() {
  const snap = await getDocs(query(
    collection(db, 'ops_logs'),
    orderBy('ts', 'desc'),
    limit(200),
  ));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const tbl = $('#tblLogs');
  if (data.length === 0) {
    tbl.innerHTML = '<tr><td class="empty">ログがまだありません</td></tr>';
    return;
  }
  tbl.innerHTML = `
    <thead><tr><th>時刻</th><th>レベル</th><th>ソース</th><th>イベント</th><th>詳細</th></tr></thead>
    <tbody>
      ${data.map((l) => `
        <tr>
          <td>${fmtDateTime(l.ts)}</td>
          <td>${l.level}</td>
          <td>${l.source}</td>
          <td>${l.event}</td>
          <td><small>${JSON.stringify(l.payload || {}).slice(0, 80)}</small></td>
        </tr>
      `).join('')}
    </tbody>
  `;
}

// ============ Detail Modal ============
async function openDetail(resNo) {
  const snap = await getDoc(doc(db, 'reservations', resNo));
  if (!snap.exists()) return;
  const r = { id: snap.id, ...snap.data() };
  const co = r.checkin?.toDate ? new Date(r.checkin.toDate()) : null;
  if (co) co.setDate(co.getDate() + r.nights);
  $('#modalTitle').textContent = `予約 ${r.resNo}`;
  $('#modalBody').innerHTML = `
    <div class="detail">
      <dl>
        <dt>状態</dt><dd>${statusTag(r.status)}</dd>
        <dt>建屋</dt><dd>${bldgName(r.buildingId)}</dd>
        <dt>客室</dt><dd>${roomName(r.roomId)}</dd>
        <dt>到着</dt><dd>${fmtDate(r.checkin)}</dd>
        <dt>出発</dt><dd>${fmtDate(co)}</dd>
        <dt>泊数</dt><dd>${r.nights}泊</dd>
        <dt>人数</dt><dd>${r.guests}名</dd>
        <dt>お名前</dt><dd>${r.name || '—'}</dd>
        <dt>電話</dt><dd>${r.tel || '—'}</dd>
        <dt>ご要望</dt><dd>${r.note || '—'}</dd>
        <dt>合計</dt><dd>¥${(r.totalPrice || 0).toLocaleString()}</dd>
        <dt>受付経路</dt><dd>${r.source || '—'}</dd>
        <dt>受付日時</dt><dd>${fmtDateTime(r.createdAt)}</dd>
      </dl>
      <div class="detail__actions">
        ${r.status === 'pending'
          ? `<button class="action-confirm" data-act="confirm">確定する</button>`
          : ''}
        ${r.status !== 'cancelled'
          ? `<button class="action-cancel" data-act="cancel">キャンセル扱い</button>`
          : ''}
        <button class="action-message" data-act="message">LINE で連絡</button>
      </div>
    </div>
  `;
  $('#modal').hidden = false;
  $('#modalBody').querySelectorAll('[data-act]').forEach((b) => {
    b.addEventListener('click', () => handleAction(r, b.dataset.act));
  });
}

async function handleAction(r, act) {
  if (act === 'confirm') {
    await updateDoc(doc(db, 'reservations', r.resNo), {
      status: 'confirmed',
      updatedAt: serverTimestamp(),
    });
    alert('確定しました。お客様にも LINE で通知されます。');
    closeModal();
    renderTab('today');
  } else if (act === 'cancel') {
    if (!confirm('キャンセル扱いにしてよろしいですか？')) return;
    await updateDoc(doc(db, 'reservations', r.resNo), {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
    alert('キャンセルしました。');
    closeModal();
    renderTab('today');
  } else if (act === 'message') {
    const text = prompt(`${r.name} 様へのメッセージ:`, '');
    if (!text) return;
    try {
      await fetch('/api/admin-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: r.lineUserId,
          text,
          adminUid: auth.currentUser.uid,
        }),
      });
      alert('送信しました。');
    } catch (e) {
      alert('送信失敗: ' + e.message);
    }
  }
}

function closeModal() { $('#modal').hidden = true; }
$$('[data-close-modal]').forEach((b) => b.addEventListener('click', closeModal));
