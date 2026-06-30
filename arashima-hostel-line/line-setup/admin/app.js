/**
 * 運営管理画面 (荒島ホテル) v2
 * - 客室マップ / 週間カレンダー / リッチ表示
 */

const ENV = window.__ENV;
const SECRET_KEY = 'arashima.admin.secret';
const PROJECT_ID = ENV.FIREBASE_PROJECT_ID || 'skeleton-arashima-hotel';
const API_BASE = `https://asia-northeast1-${PROJECT_ID}.cloudfunctions.net`;

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let secret = sessionStorage.getItem(SECRET_KEY);
{
  const qs = new URLSearchParams(location.search);
  const fromUrl = qs.get('secret');
  if (fromUrl) {
    sessionStorage.setItem(SECRET_KEY, fromUrl);
    secret = fromUrl;
    history.replaceState({}, '', location.pathname);
  }
}

async function apiGet(action, params = {}) {
  if (!secret) throw new Error('no secret');
  const qs = new URLSearchParams({ action, ...params });
  const res = await fetch(`${API_BASE}/adminApi?${qs}`, {
    headers: { 'X-Admin-Secret': secret },
  });
  if (res.status === 401) { sessionStorage.removeItem(SECRET_KEY); location.reload(); return null; }
  return res.json();
}

async function apiPost(body) {
  if (!secret) throw new Error('no secret');
  const res = await fetch(`${API_BASE}/adminApi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
    body: JSON.stringify(body),
  });
  return res.json();
}

let rooms = [];
let buildings = [];
let weekStart = startOfWeek(new Date());

document.addEventListener('DOMContentLoaded', boot);

async function boot() {
  if (!secret) { showSecretPrompt(); return; }
  const test = await fetch(`${API_BASE}/adminApi?action=list&pane=today`, {
    headers: { 'X-Admin-Secret': secret },
  });
  if (test.status === 401) { sessionStorage.removeItem(SECRET_KEY); showSecretPrompt(); return; }

  $('#login').style.display = 'none';
  $('#dash').style.display = 'block';
  $('#userBadge').innerHTML = `<a href="#" id="logout" style="color:inherit;text-decoration:underline;">arashima (ログアウト)</a>`;
  $('#logout').addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem(SECRET_KEY);
    location.reload();
  });

  await loadMaster();
  renderTab('today');
}

function showSecretPrompt() {
  $('#login').style.display = 'block';
  $('#dash').style.display = 'none';
  $('#login').innerHTML = `
    <h1>運営管理</h1>
    <p>管理キー (Jobs から受領した <code>ADMIN_SECRET</code>) を入力してください。</p>
    <form id="secretForm" style="display:flex;flex-direction:column;gap:12px;max-width:380px;margin:24px auto 0;">
      <input type="password" id="adminSecret" placeholder="ADMIN_SECRET" autocomplete="off" required
        style="padding:12px 14px;border:1px solid #ccc;border-radius:6px;font-size:14px;font-family:monospace;">
      <button class="cta" type="submit">ログイン</button>
      <p id="secretErr" style="color:#dc2626;font-size:12px;text-align:center;margin:0;display:none;">無効なキーです</p>
    </form>
  `;
  document.getElementById('secretForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = document.getElementById('adminSecret').value.trim();
    const r = await fetch(`${API_BASE}/adminApi?action=list&pane=today`, { headers: { 'X-Admin-Secret': val } });
    if (r.status === 401) {
      document.getElementById('secretErr').style.display = 'block';
    } else {
      sessionStorage.setItem(SECRET_KEY, val);
      secret = val;
      location.reload();
    }
  });
}

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
  else if (tab === 'week') loadWeek();
  else if (tab === 'upcoming') loadUpcoming();
  else if (tab === 'all') loadAll();
  else if (tab === 'guests') loadGuests();
  else if (tab === 'ota') loadOta();
  else if (tab === 'logs') loadLogs();
}

// ============ Master ============
async function loadMaster() {
  const apiKey = ENV.FIREBASE_API_KEY;
  const projId = ENV.FIREBASE_PROJECT_ID;
  const bRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projId}/databases/(default)/documents/buildings?key=${apiKey}`);
  const bData = await bRes.json();
  buildings = (bData.documents || []).map((d) => {
    const id = d.name.split('/').pop();
    const fields = parseFields(d.fields || {});
    return { id, ...fields };
  });
  const rRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projId}/databases/(default)/documents/rooms?key=${apiKey}`);
  const rData = await rRes.json();
  rooms = (rData.documents || []).map((d) => {
    const id = d.name.split('/').pop();
    const fields = parseFields(d.fields || {});
    return { id, ...fields };
  });
  // 安定ソート (building → roomId)
  rooms.sort((a, b) => {
    const bldgOrder = { ryosha: 0, gakusha: 1 };
    const ba = bldgOrder[a.buildingId] ?? 9;
    const bb = bldgOrder[b.buildingId] ?? 9;
    if (ba !== bb) return ba - bb;
    return (a.id || '').localeCompare(b.id || '');
  });
}

function parseFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) out[k] = Number(v.doubleValue);
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    else if (v.arrayValue) out[k] = (v.arrayValue.values || []).map((x) => x.stringValue || x.integerValue);
    else out[k] = v;
  }
  return out;
}

function bldgName(id) { return buildings.find((b) => b.id === id)?.name || id; }
function bldgIconHref(id) { return id === 'gakusha' ? '#i-school' : '#i-house'; }
function roomNum(id) { return (id || '').split('-')[1] || id; }
function roomName(id) {
  const r = rooms.find((x) => x.id === id);
  if (!r) return id;
  return `${roomNum(r.id)}号 / ${r.name || ''}`;
}
function roomShortName(id) {
  const r = rooms.find((x) => x.id === id);
  if (!r) return id;
  return r.name || id;
}
function roomCapacity(id) {
  const r = rooms.find((x) => x.id === id);
  return r?.capacity || r?.maxGuests || '—';
}

function statusTag(s) {
  const map = { pending: '受付中', confirmed: '確定', cancelled: 'キャンセル', completed: '完了', external: '外部' };
  return `<span class="tag tag--${s || 'pending'}">${map[s] || s}</span>`;
}

function routeChip(src) {
  const src2 = src || 'line';
  const labels = {
    line: 'LINE', booking: 'Booking', airbnb: 'Airbnb', vrbo: 'Vrbo',
    rakuten: '楽天', jalan: 'じゃらん', ikyu: '一休',
  };
  return `<span class="route-chip route-chip--${src2}">${labels[src2] || src2}</span>`;
}

function bldgChip(id) {
  return `<span class="bldg-chip"><svg><use href="${bldgIconHref(id)}"/></svg>${bldgName(id)}</span>`;
}

function roomCell(id) {
  const n = roomNum(id);
  const name = roomShortName(id);
  return `<div class="room-cell"><span class="room-cell__num">${n}</span><span class="room-cell__name">${name}</span></div>`;
}

function fmtDate(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function fmtDateLong(d) {
  return `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日`;
}
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay(); // 0 = sunday
  x.setDate(x.getDate() - dow);
  return x;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function isToday(d) { const t = new Date(); return ymd(t) === ymd(d); }

// ============ Today ============
let _todayInRaw = [];
let _todayInFilter = 'all';

async function loadToday() {
  const data = await apiGet('list', { pane: 'today' });
  if (!data?.ok) return;

  // KPI
  $('#kpiTodayIn').textContent = data.todayIn.length;
  $('#kpiTodayOut').textContent = data.todayOut.length;
  $('#kpiStaying').textContent = data.staying.length;
  $('#kpiTomorrow').textContent = data.tomIn.length;
  const occ = rooms.length ? Math.round((data.staying.length / rooms.length) * 100) : 0;
  $('#kpiOcc').textContent = `稼働率 ${occ}%  ·  全 ${rooms.length} 室`;

  // 客室マップ
  renderRoomMap(data);

  // テーブル
  _todayInRaw = data.todayIn || [];
  applyTodayInFilter();
  renderResvTable('#tblTodayOut', data.todayOut);

  // フィルタ chip
  $$('#todayInFilter .seg-filter__btn').forEach((b) => {
    b.onclick = () => {
      $$('#todayInFilter .seg-filter__btn').forEach((x) => x.classList.remove('is-on'));
      b.classList.add('is-on');
      _todayInFilter = b.dataset.filter;
      applyTodayInFilter();
    };
  });
}

function applyTodayInFilter() {
  let list = _todayInRaw;
  if (_todayInFilter === 'pending') list = list.filter((r) => r.status === 'pending');
  else if (_todayInFilter === 'confirmed') list = list.filter((r) => r.status === 'confirmed');
  renderResvTable('#tblTodayIn', list);
}

function renderRoomMap(data) {
  const todayStr = ymd(new Date());
  // 各 room の状態を判定
  const roomStates = new Map(); // roomId → {state, guest, resNo}
  for (const r of data.todayIn || []) roomStates.set(r.roomId, { state: 'in', guest: r.name, resNo: r.resNo });
  for (const r of data.todayOut || []) {
    if (!roomStates.has(r.roomId)) roomStates.set(r.roomId, { state: 'out', guest: r.name, resNo: r.resNo });
  }
  for (const r of data.staying || []) {
    if (!roomStates.has(r.roomId)) roomStates.set(r.roomId, { state: 'stay', guest: r.name, resNo: r.resNo });
  }

  const byBldg = {};
  for (const r of rooms) {
    if (!byBldg[r.buildingId]) byBldg[r.buildingId] = [];
    byBldg[r.buildingId].push(r);
  }

  const bldgOrder = ['ryosha', 'gakusha'];
  $('#roomMap').innerHTML = bldgOrder.filter((b) => byBldg[b]).map((bId) => `
    <div class="roommap__bldg">
      <div class="roommap__bldg-head">
        <div class="roommap__bldg-icon"><svg><use href="${bldgIconHref(bId)}"/></svg></div>
        <div>
          <div class="roommap__bldg-name">${bldgName(bId)}</div>
        </div>
        <div class="roommap__bldg-meta">${byBldg[bId].length} 室</div>
      </div>
      <div class="roommap__grid">
        ${byBldg[bId].map((r) => {
          const s = roomStates.get(r.id);
          const state = s?.state || 'open';
          const stateLabel = { in: '本日 IN', out: '本日 OUT', stay: '滞在中', open: '空室', booked: '予約済', blocked: 'ブロック' }[state];
          return `
            <div class="rcell rcell--${state}" data-res="${s?.resNo || ''}">
              <div class="rcell__num">${roomNum(r.id)}</div>
              <div class="rcell__name">${r.name || ''}</div>
              <div class="rcell__cap"><svg><use href="#i-people"/></svg>定員 ${r.capacity || r.maxGuests || '?'} 名 · ${(r.price || 0).toLocaleString()}円〜</div>
              <div class="rcell__status">${stateLabel}</div>
              ${s?.guest ? `<div class="rcell__guest">${s.guest} 様</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');

  // クリックで予約詳細
  $$('.rcell[data-res]').forEach((el) => {
    if (!el.dataset.res) return;
    el.addEventListener('click', () => openDetail(el.dataset.res));
  });
}

// ============ Week ============
let _weekFilter = 'all';
async function loadWeek() {
  $('#weekRange').textContent = `${fmtDateLong(weekStart)}  〜  ${fmtDate(addDays(weekStart, 6))}`;
  $('#weekPrev').onclick = () => { weekStart = addDays(weekStart, -7); loadWeek(); };
  $('#weekNext').onclick = () => { weekStart = addDays(weekStart, 7); loadWeek(); };
  $('#weekToday').onclick = () => { weekStart = startOfWeek(new Date()); loadWeek(); };

  $$('#weekFilter .seg-filter__btn').forEach((b) => {
    b.onclick = () => {
      $$('#weekFilter .seg-filter__btn').forEach((x) => x.classList.remove('is-on'));
      b.classList.add('is-on');
      _weekFilter = b.dataset.filter;
      loadWeek();
    };
  });

  // upcoming 全件取って 週内のものだけ拾う
  const data = await apiGet('list', { pane: 'upcoming' });
  if (!data?.ok) return;
  let items = data.items || [];
  if (_weekFilter === 'pending') items = items.filter((r) => r.status === 'pending');
  else if (_weekFilter === 'confirmed') items = items.filter((r) => r.status === 'confirmed');

  // 7 日 × 全室のセル
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayDows = ['日', '月', '火', '水', '木', '金', '土'];

  // 各 day × room の予約を index
  const cellMap = new Map(); // key = `${roomId}|${dateStr}` → reservation
  for (const r of items) {
    if (!r.checkinDateStr) continue;
    const inDate = new Date(r.checkinDateStr + 'T00:00:00');
    for (let n = 0; n < (r.nights || 1); n++) {
      const d = addDays(inDate, n);
      const key = `${r.roomId}|${ymd(d)}`;
      cellMap.set(key, r);
    }
  }

  // 1行(=1部屋)分のセルを colspan で連結しながら組み立てる
  function buildRow(room) {
    let cells = '';
    let dayIdx = 0;
    while (dayIdx < 7) {
      const d = days[dayIdx];
      const res = cellMap.get(`${room.id}|${ymd(d)}`);
      if (!res) {
        cells += `<td><div class="wgcell wgcell--open"></div></td>`;
        dayIdx++;
        continue;
      }
      // 同じ予約が連続する範囲を週内で求める
      let span = 1;
      while (dayIdx + span < 7) {
        const nxt = cellMap.get(`${room.id}|${ymd(days[dayIdx + span])}`);
        if (!nxt || nxt.resNo !== res.resNo) break;
        span++;
      }
      // 連泊全体の中での前/後接続 (週またぎ線対応)
      const prevDayRes = cellMap.get(`${room.id}|${ymd(addDays(d, -1))}`);
      const nextDayRes = cellMap.get(`${room.id}|${ymd(addDays(days[dayIdx + span - 1], +1))}`);
      const isFirstNight = !prevDayRes || prevDayRes.resNo !== res.resNo;
      const isLastNight = !nextDayRes || nextDayRes.resNo !== res.resNo;
      const cutLeft = !isFirstNight;  // 週またぎ前半 (左端カット)
      const cutRight = !isLastNight;  // 週またぎ後半 (右端カット)

      const isLine = (res.sourceOta || 'line') === 'line';
      const colorClass = isLine ? 'wgseg--line' : 'wgseg--ota';
      const statusCls = `wgseg--${res.status || 'pending'}`;
      const shapeClass = [
        cutLeft ? 'wgseg--cut-l' : '',
        cutRight ? 'wgseg--cut-r' : '',
      ].filter(Boolean).join(' ');
      const nightsText = `${res.nights}泊`;
      const inDow = isFirstNight ? '' : '<span class="wgseg__cont">←連泊</span> ';
      const outDow = isLastNight ? '' : ' <span class="wgseg__cont">連泊→</span>';
      const label = `${inDow}<span class="wgseg__name">${res.name || res.resNo}</span> <span class="wgseg__nights">(${nightsText})</span>${outDow}`;
      const title = `${res.name} (${res.resNo}) — ${res.nights}泊 ${res.checkinDateStr} から`;
      cells += `<td colspan="${span}"><div class="wgcell wgseg ${shapeClass} ${colorClass} ${statusCls}" data-res="${res.resNo}" title="${title}">${label}</div></td>`;
      dayIdx += span;
    }
    return cells;
  }

  const html = `
    <table class="wgtable">
      <thead>
        <tr>
          <th class="wg-room-h">客室</th>
          ${days.map((d) => {
            const isT = isToday(d);
            return `<th class="${isT ? 'wg-today' : ''}">${dayDows[d.getDay()]}<small>${d.getMonth()+1}/${d.getDate()}</small></th>`;
          }).join('')}
        </tr>
      </thead>
      <tbody>
        ${rooms.map((r) => `
          <tr>
            <td class="wg-room"><strong>${roomNum(r.id)}号</strong><small>${bldgName(r.buildingId)} · ${r.name || ''}</small></td>
            ${buildRow(r)}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  $('#weekGrid').innerHTML = html;

  $$('.wgcell[data-res]').forEach((el) => el.addEventListener('click', () => openDetail(el.dataset.res)));
}

let _upcomingRaw = [];
let _upcomingFilter = 'all';
async function loadUpcoming() {
  const data = await apiGet('list', { pane: 'upcoming' });
  if (!data?.ok) return;
  _upcomingRaw = data.items || [];
  applyUpcomingFilter();
  $$('#upcomingFilter .seg-filter__btn').forEach((b) => {
    b.onclick = () => {
      $$('#upcomingFilter .seg-filter__btn').forEach((x) => x.classList.remove('is-on'));
      b.classList.add('is-on');
      _upcomingFilter = b.dataset.filter;
      applyUpcomingFilter();
    };
  });
}
function applyUpcomingFilter() {
  let list = _upcomingRaw;
  if (_upcomingFilter === 'pending') list = list.filter((r) => r.status === 'pending');
  else if (_upcomingFilter === 'confirmed') list = list.filter((r) => r.status === 'confirmed');
  renderResvTable('#tblUpcoming', list);
}

async function loadAll() {
  const data = await apiGet('list', { pane: 'all' });
  if (!data?.ok) return;
  let items = data.items;
  const apply = () => {
    const s = $('#filterStatus').value;
    const b = $('#filterBldg').value;
    const filtered = items.filter((r) => (!s || r.status === s) && (!b || r.buildingId === b));
    renderResvTable('#tblAll', filtered);
  };
  $('#filterStatus').onchange = apply;
  $('#filterBldg').onchange = apply;
  $('#exportCsv').onclick = () => exportCsv(items);
  apply();
}

async function loadGuests() {
  const data = await apiGet('list', { pane: 'guests' });
  const tblwrap = $('#tblGuests');
  if (!data?.ok || data.items.length === 0) {
    tblwrap.innerHTML = '<div class="tblwrap"><table class="tbl"><tr><td class="empty">ゲストデータがまだありません</td></tr></table></div>';
    return;
  }
  tblwrap.innerHTML = `<div class="tblwrap"><table class="tbl">
    <thead><tr>
      <th>LINE 名</th><th>本名</th><th>電話</th><th>予約回数</th><th>泊数累計</th>
      <th>区分</th><th>最終訪問</th>
    </tr></thead>
    <tbody>${data.items.map((g) => `
      <tr>
        <td><strong>${g.displayName || '—'}</strong></td>
        <td>${g.realName || '—'}</td>
        <td>${g.tel || '—'}</td>
        <td>${g.totalReservations || 0}</td>
        <td>${g.totalNights || 0}</td>
        <td>${g.isRepeater ? '<span class="tag tag--repeater">リピーター</span>' : '—'}</td>
        <td>${g.lastSeenAt?.toDate?.()?.toLocaleDateString?.('ja-JP') || '—'}</td>
      </tr>
    `).join('')}</tbody>
  </table></div>`;
}

async function loadLogs() {
  const data = await apiGet('list', { pane: 'logs' });
  const tblwrap = $('#tblLogs');
  if (!data?.ok || data.items.length === 0) {
    tblwrap.innerHTML = '<div class="tblwrap"><table class="tbl"><tr><td class="empty">ログがまだありません</td></tr></table></div>';
    return;
  }
  tblwrap.innerHTML = `<div class="tblwrap"><table class="tbl">
    <thead><tr><th>時刻</th><th>レベル</th><th>ソース</th><th>イベント</th><th>詳細</th></tr></thead>
    <tbody>${data.items.map((l) => `
      <tr>
        <td><small>${l.ts ? new Date(l.ts).toLocaleString('ja-JP') : '—'}</small></td>
        <td>${l.level}</td>
        <td>${l.source}</td>
        <td><strong>${l.event}</strong></td>
        <td><small>${JSON.stringify(l.payload || {}).slice(0, 80)}</small></td>
      </tr>
    `).join('')}</tbody>
  </table></div>`;
}

function renderResvTable(sel, data) {
  const tblwrap = $(sel);
  if (!data || data.length === 0) {
    tblwrap.innerHTML = '<div class="tblwrap"><table class="tbl"><tr><td class="empty">該当する予約はありません</td></tr></table></div>';
    return;
  }
  tblwrap.innerHTML = `<div class="tblwrap"><table class="tbl">
    <thead><tr>
      <th>予約番号</th><th>経路</th><th>状態</th><th>建屋</th><th>客室</th>
      <th>到着</th><th>泊数</th><th>人数</th><th>お名前</th><th>連絡先</th>
    </tr></thead>
    <tbody>${data.map((r) => `
      <tr class="clickable" data-res="${r.resNo}">
        <td><strong>${r.resNo}</strong>${r.conflictFlag ? ' 🚨' : ''}</td>
        <td>${routeChip(r.sourceOta)}</td>
        <td>${statusTag(r.status)}</td>
        <td>${bldgChip(r.buildingId)}</td>
        <td>${roomCell(r.roomId)}</td>
        <td><strong>${r.checkinDateStr || '—'}</strong></td>
        <td>${r.nights}</td>
        <td>${r.guests}</td>
        <td>${r.name || ''}</td>
        <td>${r.tel || ''}</td>
      </tr>
    `).join('')}</tbody>
  </table></div>`;
  tblwrap.querySelectorAll('tr.clickable').forEach((tr) => {
    tr.addEventListener('click', () => openDetail(tr.dataset.res));
  });
}

function exportCsv(data) {
  const head = ['予約番号', '経路', '状態', '建屋', '客室', '到着', '泊数', '人数', '名前', '電話', '合計'];
  const rows = data.map((r) => [
    r.resNo, r.sourceOta || 'line', r.status, bldgName(r.buildingId), roomName(r.roomId),
    r.checkinDateStr, r.nights, r.guests, r.name, r.tel, r.totalPrice,
  ].map((x) => `"${String(x || '').replace(/"/g, '""')}"`).join(','));
  const csv = '﻿' + [head.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `arashima-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function openDetail(resNo) {
  if (!resNo) return;
  const data = await apiGet('detail', { resNo });
  if (!data?.ok) return;
  const r = data.item;
  $('#modalTitle').textContent = `予約 ${r.resNo}`;
  $('#modalBody').innerHTML = `
    <div class="detail">
      <dl>
        <dt>状態</dt><dd>${statusTag(r.status)}</dd>
        <dt>経路</dt><dd>${routeChip(r.sourceOta)}</dd>
        <dt>建屋</dt><dd>${bldgChip(r.buildingId)}</dd>
        <dt>客室</dt><dd>${roomCell(r.roomId)}</dd>
        <dt>到着</dt><dd><strong>${r.checkinDateStr || '—'}</strong></dd>
        <dt>泊数</dt><dd>${r.nights} 泊</dd>
        <dt>人数</dt><dd>${r.guests} 名</dd>
        <dt>お名前</dt><dd><strong>${r.name || '—'}</strong></dd>
        <dt>電話</dt><dd>${r.tel || '—'}</dd>
        <dt>ご要望</dt><dd>${r.note || '—'}</dd>
        <dt>合計</dt><dd><strong>${(r.totalPrice || 0).toLocaleString()}円</strong></dd>
        ${r.conflictFlag ? '<dt style="color:#dc2626;">🚨 衝突</dt><dd style="color:#dc2626;">同日同室の他予約と重複しています</dd>' : ''}
      </dl>
      <div class="detail__actions">
        ${r.status === 'pending' ? `<button class="action-confirm" data-act="confirm">確定する</button>` : ''}
        ${r.status !== 'cancelled' ? `<button class="action-cancel" data-act="cancel">キャンセル</button>` : ''}
      </div>
    </div>
  `;
  $('#modal').hidden = false;
  $('#modalBody').querySelectorAll('[data-act]').forEach((b) => {
    b.addEventListener('click', async () => {
      const newStatus = b.dataset.act === 'confirm' ? 'confirmed' : 'cancelled';
      const result = await apiPost({ action: 'updateStatus', resNo: r.resNo, status: newStatus });
      if (result?.ok) {
        alert('更新しました');
        closeModal();
        const cur = $$('.head__nav button.is-on')[0]?.dataset.tab || 'today';
        renderTab(cur);
      } else {
        alert('失敗: ' + (result?.error || 'unknown'));
      }
    });
  });
}

function closeModal() { $('#modal').hidden = true; }
$$('[data-close-modal]').forEach((b) => b.addEventListener('click', closeModal));

// ============ OTA ============
const OTA_SOURCES = [
  { id: 'booking', name: 'Booking.com', iCal: true },
  { id: 'airbnb', name: 'Airbnb', iCal: true },
  { id: 'vrbo', name: 'Vrbo', iCal: true },
  { id: 'rakuten', name: '楽天トラベル', iCal: false },
  { id: 'jalan', name: 'じゃらん', iCal: false },
  { id: 'ikyu', name: '一休.com', iCal: false },
];

async function loadOta() {
  const wrap = $('#otaList');
  wrap.innerHTML = OTA_SOURCES.map((s) => `
    <div style="background:white;border:1px solid var(--rule);border-radius:10px;padding:18px 22px;margin-bottom:10px;display:grid;grid-template-columns:auto 1fr auto auto;gap:16px;align-items:center;">
      <div style="width:44px;height:44px;border-radius:10px;background:var(--paper-2);display:grid;place-items:center;">${routeChip(s.id)}</div>
      <div>
        <strong style="font-size:15px;letter-spacing:0.04em;">${s.name}</strong>
        <div style="font-size:12px;color:var(--muted);margin-top:2px;">${s.iCal ? '✓ iCal 双方向同期 (Cloud Functions / 15 分)' : '✓ Mac mini Playwright (30 分)'}</div>
      </div>
      <span class="tag tag--${s.iCal ? 'confirmed' : 'pending'}">${s.iCal ? '稼働中' : '出店待ち'}</span>
      <button class="btn" data-ota-info="${s.id}">設定情報</button>
    </div>
  `).join('');
  wrap.querySelectorAll('[data-ota-info]').forEach((b) => {
    b.addEventListener('click', () => showOtaInfo(b.dataset.otaInfo));
  });
}

function showOtaInfo(otaId) {
  const s = OTA_SOURCES.find((x) => x.id === otaId);
  const $body = $('#otaModalBody');
  $('#otaModalTitle').textContent = `${s.name} 設定`;
  if (s.iCal) {
    $body.innerHTML = `
      <p style="font-size:13px;">iCal 双方向同期。OTA 側 extranet で:</p>
      <ol style="font-size:13px;line-height:1.9;">
        <li><strong>当方発信 URL</strong> (我々の予約を OTA 側に伝える) を「カレンダー連携 / Import calendar」に登録</li>
        <li><strong>OTA 側 iCal URL</strong> を入手 (extranet の「Export calendar」) → Jobs に渡す</li>
        <li>Jobs が ota_config/${otaId}.feeds に各室の URL を設定</li>
      </ol>
      <p style="font-size:12px;color:var(--muted);margin-top:12px;">
        当方発信 URL: <code style="font-size:11px;">https://asia-northeast1-skeleton-arashima-hotel.cloudfunctions.net/icalExport?source=${otaId}&room=&lt;ROOM_ID&gt;&key=&lt;EXPORT_KEY&gt;</code>
      </p>
      <button class="btn" data-close-ota-modal style="margin-top:16px;">閉じる</button>
    `;
  } else {
    $body.innerHTML = `
      <p style="font-size:13px;">${s.name} は iCal 非対応のため Mac mini Playwright で対応 (scaffold 済)。</p>
      <p style="font-size:13px;">出店後の手順は Jobs に依頼してください。</p>
      <button class="btn" data-close-ota-modal style="margin-top:16px;">閉じる</button>
    `;
  }
  $('#otaModal').hidden = false;
  $$('[data-close-ota-modal]').forEach((b) => b.addEventListener('click', () => { $('#otaModal').hidden = true; }));
}

$('#btnImportNow')?.addEventListener('click', async () => {
  const r = $('#otaImportResult');
  r.textContent = '同期中…';
  const url = `${API_BASE}/icalImportNow`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer demo-admin` },
  });
  r.textContent = `結果: ${await res.text()}`;
});
