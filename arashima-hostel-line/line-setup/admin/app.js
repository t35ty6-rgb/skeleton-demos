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
  else if (tab === 'ops') loadOps();
  else if (tab === 'price') loadPriceScan();
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
  const bldgEnName = { ryosha: 'Ryosha · Inn', gakusha: 'Gakusha · Study House' };
  // 各客室の代表写真 (LIFFの ROOMS と同期。 識別性UPのため業務UIに採用)
  const ROOM_PHOTO = {
    'r-201': 'p17.webp', 'r-202': 'p15.webp', 'r-203': 'p16.webp',
    'r-301': 'p18.webp', 'r-302': 'p19.webp',
    'g-101': 'p07.webp', 'g-201': 'p02.webp', 'g-202': 'p04.webp',
  };
  $('#roomMap').innerHTML = bldgOrder.filter((b) => byBldg[b]).map((bId) => `
    <div class="roommap__bldg">
      <div class="roommap__bldg-head">
        <div class="roommap__bldg-icon"><svg><use href="${bldgIconHref(bId)}"/></svg></div>
        <div>
          <div class="roommap__bldg-name">${bldgName(bId)}<span class="roommap__bldg-en">${bldgEnName[bId] || ''}</span></div>
        </div>
        <div class="roommap__bldg-meta">${byBldg[bId].length} rooms</div>
      </div>
      <div class="roommap__grid">
        ${byBldg[bId].map((r) => {
          const s = roomStates.get(r.id);
          const state = s?.state || 'open';
          const stateLabel = { in: '本日 IN', out: '本日 OUT', stay: '滞在中', open: '空室', booked: '予約済', blocked: '停止' }[state];
          const photo = ROOM_PHOTO[r.id];
          return `
            <div class="rcell rcell--${state}" data-res="${s?.resNo || ''}">
              ${photo ? `<div class="rcell__photo"><img src="./assets/photos/${photo}" alt="${r.name || ''}" loading="lazy"><span class="rcell__photo-num">${roomNum(r.id)}</span><span class="rcell__photo-state rcell__photo-state--${state}">${stateLabel}</span></div>` : `<div class="rcell__num">${roomNum(r.id)}</div>`}
              <div class="rcell__body">
                <div class="rcell__name">${r.name || ''}</div>
                <div class="rcell__cap"><svg><use href="#i-people"/></svg>${r.capacity || r.maxGuests || '?'} guests · from ${(r.price || 0).toLocaleString()}円</div>
                ${s?.guest ? `<div class="rcell__guest">${s.guest} 様</div>` : ''}
              </div>
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

// ============================================
// 工程管理 (OPS) — シフト + タスク + スタッフ
// ============================================
const OPS_STAFF_KEY = 'arashima.ops.staff.v1';
const OPS_SHIFT_KEY = 'arashima.ops.shift.v1';
const OPS_TASK_KEY  = 'arashima.ops.task.v1';

// スタッフ初期データ (バイト5人想定)
const DEFAULT_STAFF = [
  { id: 's1', name: '山田 花', initial: '山', tel: '', wish: '週3', color: '#5A6B3F' },
  { id: 's2', name: '佐藤 桃', initial: '佐', tel: '', wish: '週2', color: '#B8893B' },
  { id: 's3', name: '田中 蓮', initial: '田', tel: '', wish: '週4', color: '#2A4A5E' },
  { id: 's4', name: '鈴木 葵', initial: '鈴', tel: '', wish: '週2', color: '#9B3A26' },
  { id: 's5', name: '高橋 陸', initial: '高', tel: '', wish: '週3', color: '#4A4238' },
];
const STAFF_PALETTE = ['#5A6B3F', '#B8893B', '#2A4A5E', '#9B3A26', '#4A4238', '#7C8068', '#6B7A99'];

const opsState = {
  date: new Date(),       // 本日タスクの表示日
  weekStart: null,        // シフト表の週開始日
  monthAnchor: null,      // 月ビューの表示月 (その月の 1日)
  viewMode: 'week',       // 'week' | 'month'
  reservations: [],       // Firestore から取得した予約 (直近30日)
};

// In-memory cache (Firestore 経由で同期、LocalStorage は offline fallback)
const opsCache = { staff: null, shifts: null, tasks: null, config: null };
const OPS_CFG_KEY = 'arashima.ops.config.v1';

function _lsRead(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return v == null ? fallback : v;
  } catch (_) { return fallback; }
}
function _lsWrite(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
}

async function opsLoadFromServer() {
  try {
    const data = await apiGet('ops-load');
    if (data && data.ok) {
      opsCache.staff  = Array.isArray(data.staff)  && data.staff.length  ? data.staff  : DEFAULT_STAFF;
      opsCache.shifts = (data.shifts && typeof data.shifts === 'object') ? data.shifts : {};
      opsCache.tasks  = (data.tasks  && typeof data.tasks  === 'object') ? data.tasks  : {};
      opsCache.config = (data.config && typeof data.config === 'object') ? data.config : {};
      _lsWrite(OPS_STAFF_KEY, opsCache.staff);
      _lsWrite(OPS_SHIFT_KEY, opsCache.shifts);
      _lsWrite(OPS_TASK_KEY,  opsCache.tasks);
      _lsWrite(OPS_CFG_KEY,   opsCache.config);
      // 初回 seed: server 側 staff が空ならデフォルトを push
      if (!Array.isArray(data.staff) || !data.staff.length) {
        apiPost({ action: 'ops-save-staff', list: DEFAULT_STAFF }).catch(() => {});
      }
      return;
    }
  } catch (e) {
    console.warn('[ops] server load failed, using LS cache:', e.message);
  }
  // Fallback: LS
  opsCache.staff  = _lsRead(OPS_STAFF_KEY, DEFAULT_STAFF);
  opsCache.shifts = _lsRead(OPS_SHIFT_KEY, {});
  opsCache.tasks  = _lsRead(OPS_TASK_KEY,  {});
  opsCache.config = _lsRead(OPS_CFG_KEY, {});
}

function opsLoadStaff()  { return opsCache.staff  || DEFAULT_STAFF; }
function opsLoadShifts() { return opsCache.shifts || {}; }
function opsLoadTasks()  { return opsCache.tasks  || {}; }
function opsLoadConfig() { return opsCache.config || {}; }

function opsSaveStaff(list) {
  opsCache.staff = list;
  _lsWrite(OPS_STAFF_KEY, list);
  apiPost({ action: 'ops-save-staff', list }).catch((e) => console.warn('[ops] save-staff failed:', e.message));
}
function opsSaveShifts(map) {
  opsCache.shifts = map;
  _lsWrite(OPS_SHIFT_KEY, map);
  apiPost({ action: 'ops-save-shifts', map }).catch((e) => console.warn('[ops] save-shifts failed:', e.message));
}
function opsSaveTasks(map) {
  opsCache.tasks = map;
  _lsWrite(OPS_TASK_KEY, map);
  apiPost({ action: 'ops-save-tasks', map }).catch((e) => console.warn('[ops] save-tasks failed:', e.message));
}
function opsSaveConfig(patch) {
  opsCache.config = { ...(opsCache.config || {}), ...patch };
  _lsWrite(OPS_CFG_KEY, opsCache.config);
  return apiPost({ action: 'ops-save-config', patch });
}

async function loadOps() {
  if (!opsState.weekStart) opsState.weekStart = startOfWeek(new Date());
  if (!opsState.monthAnchor) {
    const t = new Date(); opsState.monthAnchor = new Date(t.getFullYear(), t.getMonth(), 1);
  }

  // 予約データ (自動タスク生成の元) と ops state (Firestore) を並列取得
  const [data] = await Promise.all([
    apiGet('list', { pane: 'upcoming' }),
    opsLoadFromServer(),
  ]);
  opsState.reservations = data?.items || [];

  renderOpsToday();
  renderShiftMode();
  renderStaffList();

  // Wire nav buttons (idempotent)
  const dateInput = $('#opsDate');
  dateInput.value = ymd(opsState.date);
  dateInput.onchange = () => { opsState.date = new Date(dateInput.value + 'T00:00:00'); renderOpsToday(); };
  $('#opsPrev').onclick = () => { opsState.date = addDays(opsState.date, -1); dateInput.value = ymd(opsState.date); renderOpsToday(); };
  $('#opsNext').onclick = () => { opsState.date = addDays(opsState.date, 1); dateInput.value = ymd(opsState.date); renderOpsToday(); };
  $('#opsGoToday').onclick = () => { opsState.date = new Date(); dateInput.value = ymd(opsState.date); renderOpsToday(); };

  // クイックタスク追加 (Enter or 追加ボタン)
  const qi = $('#opsQuickInput');
  const qAdd = () => {
    const v = qi.value.trim();
    if (!v) { qi.focus(); return; }
    const dateStr = ymd(opsState.date);
    const m = opsLoadTasks();
    const tList = m[dateStr] || [];
    tList.push({
      id: `m-${Date.now()}`,
      type: 'other',
      typeLabel: 'Task',
      title: v,
      meta: '',
      auto: false,
      assignees: [],
      done: false,
    });
    m[dateStr] = tList;
    opsSaveTasks(m);
    qi.value = '';
    renderOpsToday();
  };
  $('#opsQuickAdd').onclick = qAdd;
  qi.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); qAdd(); } });

  $('#shiftPrev').onclick = () => {
    if (opsState.viewMode === 'month') opsState.monthAnchor = new Date(opsState.monthAnchor.getFullYear(), opsState.monthAnchor.getMonth() - 1, 1);
    else opsState.weekStart = addDays(opsState.weekStart, -7);
    renderShiftMode();
  };
  $('#shiftNext').onclick = () => {
    if (opsState.viewMode === 'month') opsState.monthAnchor = new Date(opsState.monthAnchor.getFullYear(), opsState.monthAnchor.getMonth() + 1, 1);
    else opsState.weekStart = addDays(opsState.weekStart, 7);
    renderShiftMode();
  };
  $('#shiftToday').onclick = () => {
    if (opsState.viewMode === 'month') {
      const t = new Date(); opsState.monthAnchor = new Date(t.getFullYear(), t.getMonth(), 1);
    } else {
      opsState.weekStart = startOfWeek(new Date());
    }
    renderShiftMode();
  };
  $('#shiftPrint').onclick = () => window.print();
  $('#shiftBulk').onclick = () => openBulkShiftModal();
  $('#shiftPublish').onclick = () => openPublishMonthlyModal();
  $$('.shift-mode-btn').forEach((b) => {
    b.onclick = () => {
      const mode = b.dataset.mode;
      opsState.viewMode = mode;
      $$('.shift-mode-btn').forEach((x) => x.classList.toggle('is-on', x.dataset.mode === mode));
      renderShiftMode();
    };
  });
  $('#staffAdd').onclick = () => openStaffModal(null);

  $$('[data-close-ops-modal]').forEach((b) => b.addEventListener('click', () => { $('#opsModal').hidden = true; }));
}

// ---- 自動タスク生成 (予約 → タスク) ----
function autoTasksForDate(dateStr) {
  const tasks = [];
  const target = new Date(dateStr + 'T00:00:00');
  for (const r of opsState.reservations) {
    if (!r.checkinDateStr) continue;
    if (r.status === 'cancelled' || r.status === 'completed') continue;
    const ci = new Date(r.checkinDateStr + 'T00:00:00');
    const co = new Date(ci); co.setDate(co.getDate() + (r.nights || 1));
    // 受付 (チェックイン当日)
    if (ymd(ci) === dateStr) {
      tasks.push({
        id: `auto-in-${r.resNo}`,
        type: 'reception',
        typeLabel: 'Reception',
        title: `${r.name || 'お客様'} 様 受付`,
        meta: `${roomNum(r.roomId)}号 · ${r.nights}泊 · ${r.guests}名`,
        roomId: r.roomId,
        photo: ROOM_PHOTO_LOOKUP[r.roomId],
        auto: true,
      });
    }
    // ベッドメイキング (チェックアウト当日)
    if (ymd(co) === dateStr) {
      tasks.push({
        id: `auto-out-${r.resNo}`,
        type: 'bedmaking',
        typeLabel: 'Bed making',
        title: `${roomNum(r.roomId)}号 ベッド`,
        meta: `${r.name || ''} 様 OUT`,
        roomId: r.roomId,
        photo: ROOM_PHOTO_LOOKUP[r.roomId],
        auto: true,
      });
    }
  }
  return tasks;
}

const ROOM_PHOTO_LOOKUP = {
  'r-201': 'p17.webp', 'r-202': 'p15.webp', 'r-203': 'p16.webp',
  'r-301': 'p18.webp', 'r-302': 'p19.webp',
  'g-101': 'p07.webp', 'g-201': 'p02.webp', 'g-202': 'p04.webp',
};

// ---- 本日タスク 描画 ----
function renderOpsToday() {
  const dateStr = ymd(opsState.date);
  const dayLbl = `${opsState.date.getMonth()+1}/${opsState.date.getDate()} (${'日月火水木金土'[opsState.date.getDay()]})`;
  $('#opsToday').textContent = dayLbl;

  const auto = autoTasksForDate(dateStr);
  const manualMap = opsLoadTasks();
  const manual = manualMap[dateStr] || [];
  const allTasks = [...auto, ...manual];
  const overrides = manualMap[`_state_${dateStr}`] || {};

  const staff = opsLoadStaff();
  const staffById = Object.fromEntries(staff.map((s) => [s.id, s]));

  const buckets = { pending: [], assigned: [], done: [] };
  for (const t of allTasks) {
    const st = overrides[t.id] || {};
    const assignees = st.assignees || t.assignees || [];
    const done = st.done ?? false;
    const finalTask = { ...t, assignees, done };
    if (done) buckets.done.push(finalTask);
    else if (assignees.length > 0) buckets.assigned.push(finalTask);
    else buckets.pending.push(finalTask);
  }

  $('#opsCntPending').textContent = buckets.pending.length;
  $('#opsCntAssigned').textContent = buckets.assigned.length;
  $('#opsCntDone').textContent = buckets.done.length;
  $('#opsListPending').innerHTML  = buckets.pending.map((t) => taskCardHtml(t, staffById)).join('') || '<div style="color:var(--muted);font-size:12px;padding:16px;text-align:center;letter-spacing:0.14em;">なし</div>';
  $('#opsListAssigned').innerHTML = buckets.assigned.map((t) => taskCardHtml(t, staffById)).join('') || '<div style="color:var(--muted);font-size:12px;padding:16px;text-align:center;letter-spacing:0.14em;">なし</div>';
  $('#opsListDone').innerHTML     = buckets.done.map((t) => taskCardHtml(t, staffById)).join('') || '<div style="color:var(--muted);font-size:12px;padding:16px;text-align:center;letter-spacing:0.14em;">なし</div>';

  $$('.task-card[data-tid]').forEach((el) => {
    el.addEventListener('click', () => openTaskModal(el.dataset.tid));
  });
}

function taskCardHtml(t, staffById) {
  const photo = t.photo ? `<div class="task-card__photo"><img src="./assets/photos/${t.photo}" alt="" loading="lazy">${t.done ? '<span class="task-card__stamp">済</span>' : ''}</div>` : '';
  const assigneesHtml = t.assignees.length
    ? t.assignees.map((aid) => {
        const s = staffById[aid];
        if (!s) return '';
        return `<span class="avatar" style="background:${s.color}">${s.initial}</span>`;
      }).join('')
    : '<span class="task-card__none">まだ誰も</span>';
  const kindCls = t.auto ? 'task-card--auto' : 'task-card--manual';
  const doneCls = t.done ? 'task-card--done' : '';
  return `<div class="task-card ${kindCls} ${doneCls}" data-tid="${t.id}">
    ${photo}
    <div class="task-card__body">
      <div class="task-card__type">${t.typeLabel || 'Task'}</div>
      <div class="task-card__title">${escapeHtml(t.title)}</div>
      <div class="task-card__meta">${escapeHtml(t.meta || '')}</div>
      <div class="task-card__assignees">${assigneesHtml}</div>
    </div>
  </div>`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---- タスク編集 モーダル ----
function openTaskModal(tid) {
  const dateStr = ymd(opsState.date);
  const auto = autoTasksForDate(dateStr);
  const manualMap = opsLoadTasks();
  const manual = manualMap[dateStr] || [];
  const overrides = manualMap[`_state_${dateStr}`] || {};

  let task = tid ? [...auto, ...manual].find((t) => t.id === tid) : null;
  const isNew = !task;
  if (isNew) {
    task = { id: `m-${Date.now()}`, type: 'other', typeLabel: 'Task', title: '', meta: '', auto: false, assignees: [], done: false };
  } else {
    const st = overrides[task.id] || {};
    task = { ...task, assignees: st.assignees || task.assignees || [], done: st.done ?? false };
  }

  const staff = opsLoadStaff();
  $('#opsModalTitle').textContent = isNew ? 'タスクを追加' : 'タスクの詳細';
  $('#opsModalBody').innerHTML = `
    <div class="ops-edit">
      ${!isNew && task.auto ? `<div style="font-family:var(--num);font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:var(--indigo);">Auto — 予約から生成</div>` : ''}
      ${isNew ? `
        <label class="ops-edit__field">
          <span class="ops-edit__lbl">やること</span>
          <input type="text" id="tfTitle" value="${escapeHtml(task.title)}" placeholder="例) 洗濯機を回す">
        </label>
        <label class="ops-edit__field">
          <span class="ops-edit__lbl">補足</span>
          <input type="text" id="tfMeta" value="${escapeHtml(task.meta)}" placeholder="例) タオル 12枚">
        </label>
      ` : `
        <div class="ops-edit__field"><span class="ops-edit__lbl">やること</span><div style="font-family:var(--sans);font-weight:700;font-size:15px;color:var(--ink);">${escapeHtml(task.title)}</div></div>
        <div class="ops-edit__field"><span class="ops-edit__lbl">補足</span><div style="font-family:var(--sans);font-size:13px;color:var(--muted);">${escapeHtml(task.meta || '—')}</div></div>
      `}
      <div class="ops-edit__field">
        <span class="ops-edit__lbl">担当</span>
        <div class="ops-edit__staff-picker" id="tfStaff">
          ${staff.map((s) => `
            <button type="button" data-sid="${s.id}" class="${task.assignees.includes(s.id) ? 'is-on' : ''}">
              <span class="avatar" style="background:${s.color}">${s.initial}</span>${escapeHtml(s.name)}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="ops-edit__actions">
        ${isNew ? '<span></span>' : `<button class="btn--ghost" id="tfToggleDone">${task.done ? '未完了に戻す' : '終わりにする'}</button>`}
        <div style="display:flex;gap:10px;">
          ${!isNew && !task.auto ? '<button class="btn--danger btn" id="tfDelete">削除</button>' : ''}
          <button class="btn btn--primary" id="tfSave">${isNew ? '追加する' : '保存する'}</button>
        </div>
      </div>
    </div>
  `;

  const chosen = new Set(task.assignees);
  $$('#tfStaff button').forEach((b) => {
    b.addEventListener('click', () => {
      const sid = b.dataset.sid;
      if (chosen.has(sid)) { chosen.delete(sid); b.classList.remove('is-on'); }
      else { chosen.add(sid); b.classList.add('is-on'); }
    });
  });

  $('#tfSave').onclick = () => {
    const m = opsLoadTasks();
    if (isNew) {
      const tList = m[dateStr] || [];
      const t = {
        ...task,
        title: $('#tfTitle').value.trim() || 'タスク',
        meta: $('#tfMeta').value.trim(),
        assignees: Array.from(chosen),
      };
      if (!t.title) return;
      tList.push(t);
      m[dateStr] = tList;
      opsSaveTasks(m);
    } else {
      const st = m[`_state_${dateStr}`] || {};
      st[task.id] = { ...(st[task.id] || {}), assignees: Array.from(chosen), done: task.done };
      m[`_state_${dateStr}`] = st;
      opsSaveTasks(m);
    }
    $('#opsModal').hidden = true;
    renderOpsToday();
  };

  if (!isNew) {
    $('#tfToggleDone').onclick = () => {
      const m = opsLoadTasks();
      const st = m[`_state_${dateStr}`] || {};
      st[task.id] = { ...(st[task.id] || {}), assignees: Array.from(chosen), done: !task.done };
      m[`_state_${dateStr}`] = st;
      opsSaveTasks(m);
      $('#opsModal').hidden = true;
      renderOpsToday();
    };
    const del = $('#tfDelete');
    if (del) del.onclick = () => {
      if (!confirm('このタスクを削除しますか?')) return;
      const m = opsLoadTasks();
      m[dateStr] = (m[dateStr] || []).filter((t) => t.id !== task.id);
      if (m[`_state_${dateStr}`]) delete m[`_state_${dateStr}`][task.id];
      opsSaveTasks(m);
      $('#opsModal').hidden = true;
      renderOpsToday();
    };
  }

  $('#opsModal').hidden = false;
}

// ---- シフトビュー切替 (週/月) ----
function renderShiftMode() {
  const isMonth = opsState.viewMode === 'month';
  $('#shiftGrid').hidden = isMonth;
  $('#shiftMonthGrid').hidden = !isMonth;
  $('#shiftChap').textContent = isMonth ? 'Monthly' : 'Weekly Shift';
  $('#shiftToday').textContent = isMonth ? '今月' : '今週';
  if (isMonth) renderMonthShift();
  else renderShiftGrid();
}

// ---- 月シフトビュー (6x7 グリッド) ----
function renderMonthShift() {
  const anchor = opsState.monthAnchor;
  const y = anchor.getFullYear(), mo = anchor.getMonth();
  const firstDay = new Date(y, mo, 1);
  const firstDow = firstDay.getDay(); // 0=日
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const gridStart = new Date(y, mo, 1 - firstDow);
  const rowCount = Math.ceil((firstDow + daysInMonth) / 7);
  const cells = Array.from({ length: rowCount * 7 }, (_, i) => addDays(gridStart, i));

  $('#opsWeekRange').textContent = `${y}年 ${mo + 1}月`;

  const staff = opsLoadStaff();
  const staffById = Object.fromEntries(staff.map((s) => [s.id, s]));
  const shifts = opsLoadShifts();

  // 予約日別 map
  const resByDate = {};
  for (const r of opsState.reservations) {
    if (!r.checkinDateStr) continue;
    if (r.status === 'cancelled') continue;
    const ci = new Date(r.checkinDateStr + 'T00:00:00');
    const co = new Date(ci); co.setDate(co.getDate() + (r.nights || 1));
    for (let d = new Date(ci); d < co; d = new Date(d.getTime() + 86400000)) {
      const k = ymd(d);
      resByDate[k] = (resByDate[k] || 0) + 1;
    }
  }

  const dowLbl = ['日', '月', '火', '水', '木', '金', '土'];
  const html = `
    <div class="mm-dow-head">
      ${dowLbl.map((lbl, i) => `<div class="mm-dow ${i===0||i===6?'is-wknd':''}">${lbl}</div>`).join('')}
    </div>
    <div class="mm-grid" style="grid-template-rows: repeat(${rowCount}, 1fr);">
      ${cells.map((d) => {
        const inMonth = d.getMonth() === mo;
        const isT = isToday(d);
        const dateStr = ymd(d);
        const dowIdx = d.getDay();
        const staffOnDuty = staff.filter((s) => {
          const v = shifts[`${dateStr}|${s.id}`];
          return v && v !== '休';
        });
        const staffOff = staff.filter((s) => shifts[`${dateStr}|${s.id}`] === '休');
        const resCount = resByDate[dateStr] || 0;
        return `<div class="mm-cell ${inMonth ? '' : 'is-out'} ${isT ? 'is-today' : ''} ${dowIdx===0||dowIdx===6?'is-wknd':''}" data-date="${dateStr}">
          <div class="mm-cell__head">
            <span class="mm-cell__day">${d.getDate()}</span>
            ${resCount > 0 ? `<span class="mm-cell__resv" title="${resCount}件の予約">${resCount}</span>` : ''}
          </div>
          <div class="mm-cell__staff">
            ${staffOnDuty.slice(0, 4).map((s) => {
              const v = shifts[`${dateStr}|${s.id}`];
              return `<span class="mm-chip shift-cell" style="background:${s.color}" title="${escapeHtml(s.name)} ${v} (タップで編集)" data-key="${dateStr}|${s.id}" data-sid="${s.id}" data-sname="${escapeHtml(s.name)}" data-date="${dateStr}" data-color="${s.color}">${s.initial}<em>${v}</em></span>`;
            }).join('')}
            ${staffOnDuty.length > 4 ? `<span class="mm-chip mm-chip--more" data-more="1">+${staffOnDuty.length - 4}</span>` : ''}
            ${staffOff.slice(0, 3).map((s) => `<span class="mm-chip mm-chip--off shift-cell" title="${escapeHtml(s.name)} 休 (タップで編集)" data-key="${dateStr}|${s.id}" data-sid="${s.id}" data-sname="${escapeHtml(s.name)}" data-date="${dateStr}" data-color="${s.color}">${s.initial}<em>休</em></span>`).join('')}
            ${staffOff.length > 3 ? `<span class="mm-off">休 +${staffOff.length - 3}</span>` : ''}
            <span class="mm-chip mm-chip--add" data-add="1" title="スタッフを選んで追加">+</span>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
  $('#shiftMonthGrid').innerHTML = html;

  // 個別チップ tap → 週ビューと同じ 5ボタンピッカー
  $$('#shiftMonthGrid .mm-chip.shift-cell').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openShiftPicker(el);
    });
  });

  // + 追加 chip tap → その日 全スタッフ編集シート (bulk 入力)
  $$('#shiftMonthGrid .mm-chip--add').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const cell = el.closest('.mm-cell');
      if (cell) openMonthDaySheet(cell.dataset.date);
    });
  });

  // +Nスタッフ (溢れ) tap → その日 全スタッフ編集シート
  $$('#shiftMonthGrid .mm-chip--more').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const cell = el.closest('.mm-cell');
      if (cell) openMonthDaySheet(cell.dataset.date);
    });
  });

  // セル本体 (チップ以外) tap → 全スタッフ編集シート (bulk 経路)
  $$('#shiftMonthGrid .mm-cell').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.mm-chip')) return; // チップ内は個別処理
      openMonthDaySheet(el.dataset.date);
    });
  });
}

// 月ビュー: セルをタップ → その日 全スタッフのシフトを1画面で編集
// (選択は local state に保持 → 「保存」で一括コミット、「キャンセル」で破棄)
function openMonthDaySheet(dateStr) {
  const [y, mo, dd] = dateStr.split('-').map(Number);
  const d = new Date(y, mo - 1, dd);
  const dowLbl = '日月火水木金土'[d.getDay()];
  const staff = opsLoadStaff();
  const shifts = opsLoadShifts();

  // 各スタッフの 変更前値 / 変更後値 を保持
  const pending = {};
  for (const s of staff) pending[s.id] = shifts[`${dateStr}|${s.id}`] || '';
  const original = { ...pending };

  const opts = ['9-16', '15-20', '9-20', '休', ''];
  const optLbl = { '9-16': '9-16 朝', '15-20': '15-20 夜', '9-20': '9-20 通し', '休': '休', '': '未定' };

  $('#opsModalTitle').textContent = `${mo}/${dd}(${dowLbl}) のシフト`;
  $('#opsModalBody').innerHTML = `
    <div class="ops-edit">
      <div class="ops-edit__lbl" style="margin-bottom:4px;">スタッフごとに選択 → 下の <strong>保存する</strong> で確定</div>
      <div id="dayRowsBox">
      ${staff.map((s) => {
        const cur = pending[s.id];
        return `<div class="day-row" data-sid="${s.id}">
          <div class="day-row__name" style="border-left:3px solid ${s.color};">
            <span class="avatar avatar--sm" style="background:${s.color}">${s.initial}</span>
            <span>${escapeHtml(s.name)}</span>
            ${s.lineUserId ? '<span class="st-line-dot" title="LINE連携済"></span>' : ''}
          </div>
          <div class="day-row__opts">
            ${opts.map((v) => `<button data-shift="${v}" class="day-opt ${v===cur?'is-on':''}">${optLbl[v]}</button>`).join('')}
          </div>
        </div>`;
      }).join('')}
      </div>
      <div id="dayChangeSummary" class="day-summary"></div>
      <div class="ops-edit__actions">
        <button class="btn--ghost" id="dayCancel">キャンセル</button>
        <button class="btn btn--primary" id="daySave" disabled>保存する</button>
      </div>
    </div>
  `;
  $('#opsModal').hidden = false;

  const updateSummary = () => {
    const changed = staff.filter((s) => pending[s.id] !== original[s.id]);
    $('#daySave').disabled = changed.length === 0;
    $('#dayChangeSummary').innerHTML = changed.length
      ? `<span class="day-summary__chg">${changed.length} 名 変更予定 (保存を押すと反映)</span>`
      : '<span class="day-summary__none">変更なし</span>';
  };
  updateSummary();

  // ボタン クリックで pending 更新のみ (保存はしない)
  $$('#opsModalBody .day-row').forEach((row) => {
    const sid = row.dataset.sid;
    $$('.day-opt', row).forEach((btn) => {
      btn.onclick = () => {
        pending[sid] = btn.dataset.shift;
        $$('.day-opt', row).forEach((x) => x.classList.remove('is-on'));
        btn.classList.add('is-on');
        updateSummary();
      };
    });
  });

  $('#daySave').onclick = () => {
    const m = opsLoadShifts();
    let n = 0;
    for (const s of staff) {
      if (pending[s.id] === original[s.id]) continue;
      const key = `${dateStr}|${s.id}`;
      if (pending[s.id] === '') delete m[key]; else m[key] = pending[s.id];
      n++;
    }
    opsSaveShifts(m);
    $('#opsModal').hidden = true;
    renderShiftMode();
    showOpsToast(`${n} 名のシフトを保存しました`);
  };
  $('#dayCancel').onclick = () => {
    const changed = staff.filter((s) => pending[s.id] !== original[s.id]);
    if (changed.length > 0 && !confirm(`${changed.length} 名 の変更を破棄しますか?`)) return;
    $('#opsModal').hidden = true;
  };
}

// ---- 月次シフト全員に配信 モーダル ----
function openPublishMonthlyModal() {
  const staff = opsLoadStaff();
  const shifts = opsLoadShifts();
  const anchor = opsState.monthAnchor || (() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1); })();
  const y = anchor.getFullYear(), mo = anchor.getMonth();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const monthLbl = `${y}年${mo + 1}月`;

  // 各スタッフの その月の シフト集計
  const summary = staff.map((s) => {
    let cnt = 0, off = 0;
    for (let dd = 1; dd <= daysInMonth; dd++) {
      const v = shifts[`${y}-${String(mo+1).padStart(2,'0')}-${String(dd).padStart(2,'0')}|${s.id}`];
      if (v === '休') off++;
      else if (v) cnt++;
    }
    return { staff: s, count: cnt, off, hasLine: !!s.lineUserId };
  });

  const cfg = opsLoadConfig();
  const notifyAll = !!cfg.notifyAllOnNewReservation;

  $('#opsModalTitle').textContent = `${monthLbl} シフト 一斉配信`;
  $('#opsModalBody').innerHTML = `
    <div class="ops-edit">
      <div class="ops-edit__lbl">配信内容</div>
      <div style="font-size:13px;color:var(--ink-3);line-height:1.7;">
        LINE 連携済みの スタッフ に、 その月の 自分の シフト一覧 + Google カレンダー 一括登録リンク の Flex を送信します。
      </div>

      <div class="ops-edit__lbl" style="margin-top:8px;">対象スタッフ</div>
      <div class="publish-list" id="publishList">
        ${summary.map((r) => `
          <label class="publish-row ${!r.hasLine ? 'is-disabled' : ''}">
            <input type="checkbox" data-sid="${r.staff.id}" ${r.hasLine && r.count > 0 ? 'checked' : ''} ${!r.hasLine ? 'disabled' : ''}>
            <span class="publish-row__avatar avatar avatar--sm" style="background:${r.staff.color}">${r.staff.initial}</span>
            <span class="publish-row__name">${escapeHtml(r.staff.name)}</span>
            <span class="publish-row__meta">
              ${r.hasLine ? `<span class="publish-row__cnt">${r.count}件</span>${r.off > 0 ? `<span class="publish-row__off">/休${r.off}</span>` : ''}` : '<span class="publish-row__nolink">LINE 未連携</span>'}
            </span>
          </label>
        `).join('')}
      </div>

      <div class="ops-edit__lbl" style="margin-top:8px;border-top:1px solid var(--rule);padding-top:14px;">通知 設定 (常時)</div>
      <label class="cfg-row">
        <input type="checkbox" id="cfgNotifyAll" ${notifyAll ? 'checked' : ''}>
        <span>
          <strong>新規予約が入ったら 全員に通知する</strong>
          <span class="cfg-row__hint">OFF なら 該当日 シフト入り の スタッフ のみに通知 (現行動作)。 ON なら グループ LINE のように 連携済み 全員 に軽通知も追加送信。</span>
        </span>
      </label>

      <div class="ops-edit__actions">
        <button class="btn--ghost" id="pubClose">閉じる</button>
        <button class="btn btn--primary" id="pubSend">配信する</button>
      </div>
      <div id="pubResult" style="font-size:13px;color:var(--muted);"></div>
    </div>
  `;
  $('#opsModal').hidden = false;

  // config toggle: 即保存
  $('#cfgNotifyAll').onchange = async (e) => {
    try { await opsSaveConfig({ notifyAllOnNewReservation: e.target.checked }); }
    catch (err) { console.warn('config save failed', err); }
  };

  $('#pubClose').onclick = () => { $('#opsModal').hidden = true; };
  $('#pubSend').onclick = async () => {
    const targets = $$('#publishList input[type=checkbox]:checked').map((c) => c.dataset.sid);
    if (!targets.length) { $('#pubResult').textContent = '対象スタッフを選択してください。'; return; }
    if (!confirm(`${monthLbl} のシフトを ${targets.length}名 の LINE に送信します。よろしいですか?`)) return;
    $('#pubSend').disabled = true; $('#pubSend').textContent = '送信中…';
    try {
      const r = await apiPost({
        action: 'ops-publish-monthly-shifts',
        year: y, month: mo + 1,
        staffIds: targets,
      });
      if (r?.ok) {
        $('#pubResult').innerHTML = `<span style="color:var(--moss);">✓ ${r.sent}名 送信完了 (失敗 ${r.failed || 0})</span>`;
        $('#pubSend').textContent = '完了';
      } else {
        $('#pubResult').innerHTML = `<span style="color:var(--accent);">エラー: ${escapeHtml(r?.error || 'unknown')}</span>`;
        $('#pubSend').disabled = false; $('#pubSend').textContent = '再送信';
      }
    } catch (e) {
      $('#pubResult').innerHTML = `<span style="color:var(--accent);">${escapeHtml(e.message)}</span>`;
      $('#pubSend').disabled = false; $('#pubSend').textContent = '再送信';
    }
  };
}

// ---- 週間シフト表 ----
function renderShiftGrid() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(opsState.weekStart, i));
  const dayDows = ['日', '月', '火', '水', '木', '金', '土'];
  $('#opsWeekRange').textContent = `${opsState.weekStart.getMonth()+1}/${opsState.weekStart.getDate()} - ${days[6].getMonth()+1}/${days[6].getDate()}`;

  const staff = opsLoadStaff();
  const shifts = opsLoadShifts();

  const html = `
    <table class="shift-table">
      <thead>
        <tr>
          <th class="st-staff-h">スタッフ</th>
          ${days.map((d) => {
            const isT = isToday(d);
            const isWknd = d.getDay() === 0 || d.getDay() === 6;
            return `<th class="${isT ? 'st-today' : ''} ${isWknd ? 'st-wknd' : ''}"><span class="st-dow">${dayDows[d.getDay()]}</span><span class="st-date">${d.getMonth()+1}/${d.getDate()}</span></th>`;
          }).join('')}
        </tr>
      </thead>
      <tbody>
        ${staff.map((s) => `
          <tr>
            <td class="st-staff" style="border-left-color:${s.color}">
              <div class="st-staff-name"><span class="avatar avatar--sm" style="background:${s.color}">${s.initial}</span>${escapeHtml(s.name)}${s.lineUserId ? '<span class="st-line-dot" title="LINE連携済"></span>' : ''}</div>
            </td>
            ${days.map((d) => {
              const key = `${ymd(d)}|${s.id}`;
              const val = shifts[key] || '';
              const isT = isToday(d);
              let cls = 'shift-cell';
              if (val === '休') cls += ' shift-cell--off';
              else if (val) cls += ' shift-cell--set';
              if (isT) cls += ' shift-cell--today';
              return `<td>
                <div class="${cls}" data-key="${key}" data-sid="${s.id}" data-sname="${escapeHtml(s.name)}" data-date="${ymd(d)}" data-color="${s.color}">
                  ${val ? `<span class="shift-cell__time">${val}</span>` : '<span class="shift-cell__empty">＋</span>'}
                </div>
              </td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  $('#shiftGrid').innerHTML = html;

  // セル タップ → ピッカーポップオーバー
  $$('.shift-cell[data-key]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      openShiftPicker(el);
    });
  });
}

// ---- シフトピッカー (候補選択 → 確定/取消 の 2段階) ----
let _shiftPickerAnchor = null;
let _shiftPickerPending = null; // { key, prevVal, chosenVal }
function openShiftPicker(cellEl) {
  const picker = $('#shiftPicker');
  const key = cellEl.dataset.key;
  const sname = cellEl.dataset.sname;
  const dateStr = cellEl.dataset.date;
  const [y, mo, dd] = dateStr.split('-').map(Number);
  const d = new Date(y, mo - 1, dd);
  const dowLbl = '日月火水木金土'[d.getDay()];
  const prevVal = opsLoadShifts()[key] || '';
  _shiftPickerAnchor = cellEl;
  _shiftPickerPending = { key, prevVal, chosenVal: prevVal };
  cellEl.classList.add('shift-cell--active');

  // ヘッダ 描画
  $('#shiftPickerHead').innerHTML = `
    <div><strong>${escapeHtml(sname)}</strong> さん<span class="shift-picker__date">${mo}/${dd}(${dowLbl})</span></div>
    <div class="shift-picker__cur" id="shiftPickerCur">現在: <em>${prevVal || '未定'}</em></div>
  `;

  // 選択肢 に is-on を prevVal に付与
  $$('#shiftPicker .shift-opt').forEach((b) => {
    b.classList.toggle('is-on', b.dataset.shift === prevVal);
  });

  // 確定/取消 バー を表示
  const bar = $('#shiftPickerBar');
  if (bar) {
    bar.hidden = false;
    $('#shiftPickerConfirm').disabled = true;
    $('#shiftPickerConfirm').textContent = '確定';
  }

  // 表示位置
  picker.hidden = false;
  picker.style.visibility = 'hidden';
  requestAnimationFrame(() => {
    const rect = cellEl.getBoundingClientRect();
    const pickRect = picker.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      picker.classList.add('shift-picker--sheet');
      picker.style.left = '0';
      picker.style.right = '0';
      picker.style.top = 'auto';
      picker.style.bottom = '0';
    } else {
      picker.classList.remove('shift-picker--sheet');
      let top = rect.bottom + window.scrollY + 6;
      if (top + pickRect.height > window.innerHeight + window.scrollY - 20) {
        top = rect.top + window.scrollY - pickRect.height - 6;
      }
      let left = rect.left + window.scrollX;
      if (left + pickRect.width > window.innerWidth - 12) {
        left = window.innerWidth - pickRect.width - 12;
      }
      picker.style.left = left + 'px';
      picker.style.top = top + 'px';
      picker.style.bottom = 'auto';
      picker.style.right = 'auto';
    }
    picker.style.visibility = 'visible';
  });

  // 選択肢ボタン: chosenVal を更新 (即保存しない)
  $$('#shiftPicker .shift-opt').forEach((b) => {
    b.onclick = (ev) => {
      ev.stopPropagation();
      const v = b.dataset.shift;
      _shiftPickerPending.chosenVal = v;
      $$('#shiftPicker .shift-opt').forEach((x) => x.classList.toggle('is-on', x.dataset.shift === v));
      const cur = $('#shiftPickerCur');
      const changed = v !== _shiftPickerPending.prevVal;
      if (cur) cur.innerHTML = changed
        ? `変更: <em>${_shiftPickerPending.prevVal || '未定'}</em> → <strong>${v || '未定'}</strong>`
        : `現在: <em>${v || '未定'}</em>`;
      $('#shiftPickerConfirm').disabled = !changed;
    };
  });

  // 確定
  $('#shiftPickerConfirm').onclick = (ev) => {
    ev.stopPropagation();
    const { key, chosenVal } = _shiftPickerPending;
    const m = opsLoadShifts();
    if (chosenVal === '') delete m[key]; else m[key] = chosenVal;
    opsSaveShifts(m);
    closeShiftPicker();
    renderShiftMode();
    showOpsToast('シフトを保存しました');
  };
  // 取消
  $('#shiftPickerCancel').onclick = (ev) => {
    ev.stopPropagation();
    closeShiftPicker();
  };
}
function closeShiftPicker() {
  const picker = $('#shiftPicker');
  picker.hidden = true;
  if (_shiftPickerAnchor) { _shiftPickerAnchor.classList.remove('shift-cell--active'); _shiftPickerAnchor = null; }
  _shiftPickerPending = null;
}
document.addEventListener('click', (e) => {
  const picker = $('#shiftPicker');
  if (!picker || picker.hidden) return;
  if (picker.contains(e.target)) return;
  closeShiftPicker();
});

// ---- 共通トースト ----
let _toastTimer = null;
function showOpsToast(msg, type = 'ok') {
  let el = $('#opsToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'opsToast';
    el.className = 'ops-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove('is-error');
  if (type === 'error') el.classList.add('is-error');
  el.classList.add('is-visible');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('is-visible'), 1800);
}

// ---- まとめて設定モーダル ----
function openBulkShiftModal() {
  const staff = opsLoadStaff();
  const days = Array.from({ length: 7 }, (_, i) => addDays(opsState.weekStart, i));
  const dowLbl = ['日', '月', '火', '水', '木', '金', '土'];
  $('#opsModalTitle').textContent = 'まとめてシフト設定';
  $('#opsModalBody').innerHTML = `
    <div class="ops-edit">
      <div class="ops-edit__field">
        <span class="ops-edit__lbl">スタッフ</span>
        <select id="bulkStaff" style="width:100%;padding:8px;border:1px solid var(--rule);background:var(--paper);font-family:inherit;font-size:14px;">
          ${staff.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="ops-edit__field">
        <span class="ops-edit__lbl">対象曜日 (今週 ${opsState.weekStart.getMonth()+1}/${opsState.weekStart.getDate()}〜)</span>
        <div class="bulk-dow" id="bulkDow">
          ${dowLbl.map((lbl, i) => {
            const d = days[i];
            return `<label class="bulk-dow__cell ${i===0||i===6?'is-wknd':''}">
              <input type="checkbox" data-dow="${i}" checked>
              <span class="bulk-dow__lbl">${lbl}</span>
              <span class="bulk-dow__date">${d.getMonth()+1}/${d.getDate()}</span>
            </label>`;
          }).join('')}
        </div>
      </div>
      <div class="ops-edit__field">
        <span class="ops-edit__lbl">シフト</span>
        <div class="bulk-shift" id="bulkShift">
          ${['9-16', '15-20', '9-20', '休', ''].map((v, i) => `
            <button type="button" data-shift="${v}" class="bulk-shift__btn ${i===0?'is-on':''}">${v || '未定 (空欄)'}</button>
          `).join('')}
        </div>
      </div>
      <div class="ops-edit__actions">
        <button class="btn--ghost" id="bulkClose">キャンセル</button>
        <button class="btn btn--primary" id="bulkApply">まとめて適用</button>
      </div>
    </div>
  `;
  $('#opsModal').hidden = false;

  let chosenShift = '9-16';
  $$('#bulkShift .bulk-shift__btn').forEach((b) => {
    b.onclick = () => {
      $$('#bulkShift .bulk-shift__btn').forEach((x) => x.classList.remove('is-on'));
      b.classList.add('is-on');
      chosenShift = b.dataset.shift;
    };
  });

  $('#bulkClose').onclick = () => { $('#opsModal').hidden = true; };
  $('#bulkApply').onclick = () => {
    const staffId = $('#bulkStaff').value;
    const selectedDows = $$('#bulkDow input[type=checkbox]:checked').map((c) => Number(c.dataset.dow));
    if (!selectedDows.length) return;
    const m = opsLoadShifts();
    let n = 0;
    for (const dowIdx of selectedDows) {
      const key = `${ymd(days[dowIdx])}|${staffId}`;
      if (chosenShift === '') delete m[key]; else m[key] = chosenShift;
      n++;
    }
    opsSaveShifts(m);
    $('#opsModal').hidden = true;
    renderShiftGrid();
  };
}

// ---- スタッフ一覧 ----
function renderStaffList() {
  const staff = opsLoadStaff();
  $('#staffList').innerHTML = staff.map((s) => {
    const isLinked = !!s.lineUserId;
    return `<div class="staff-card" data-sid="${s.id}" style="border-left-color:${s.color}">
      <span class="avatar avatar--lg" style="background:${s.color}">${s.initial}</span>
      <div class="staff-card__body">
        <div class="staff-card__name">${escapeHtml(s.name)}${isLinked ? '<span class="staff-card__line" title="LINE連携済">LINE</span>' : ''}</div>
        <div class="staff-card__meta">${escapeHtml(s.tel || '電話 未登録')}${s.wish ? ' · ' + escapeHtml(s.wish) : ''}</div>
      </div>
      <div class="staff-card__actions">
        <button class="btn staff-card__shift" data-act="shift" data-sid="${s.id}">📅 シフト入力</button>
        <button class="btn--ghost staff-card__info" data-act="info" data-sid="${s.id}" title="情報を編集">i</button>
      </div>
    </div>`;
  }).join('');
  $$('.staff-card__shift').forEach((el) => {
    el.addEventListener('click', (e) => { e.stopPropagation(); openStaffShiftEditor(el.dataset.sid); });
  });
  $$('.staff-card__info').forEach((el) => {
    el.addEventListener('click', (e) => { e.stopPropagation(); openStaffModal(el.dataset.sid); });
  });
  // カード全体クリックはシフト入力を優先
  $$('.staff-card[data-sid]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      openStaffShiftEditor(el.dataset.sid);
    });
  });
}

// ---- スタッフ × 月シフト エディタ ----
// スタッフを選んで、その人の 月カレンダー上で 日付タップ or テキスト入力+Enter で
// シフトを 一括で 入力・保存する UI
let _staffShiftEditor = null;
function openStaffShiftEditor(sid) {
  const staff = opsLoadStaff();
  const s = staff.find((x) => x.id === sid);
  if (!s) return;
  const shifts = opsLoadShifts();

  // その人の 全シフト を pending にコピー (保存前は Firestore に反映しない)
  const pending = {};
  const original = {};
  for (const [k, v] of Object.entries(shifts)) {
    if (k.endsWith('|' + sid)) { pending[k] = v; original[k] = v; }
  }

  const anchor = opsState.monthAnchor || (() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1); })();
  _staffShiftEditor = { sid, s, pending, original, anchor: new Date(anchor), curShift: '9-16' };

  $('#opsModalTitle').innerHTML = `<span class="avatar avatar--sm" style="background:${s.color};vertical-align:middle;margin-right:8px;">${s.initial}</span>${escapeHtml(s.name)} さん のシフト`;
  $('#opsModalBody').innerHTML = `
    <div class="ops-edit sse-root">
      <!-- 月ナビ -->
      <div class="sse-nav">
        <button class="btn--icon" id="sseMonthPrev">‹</button>
        <div class="sse-month" id="sseMonthLbl"></div>
        <button class="btn--icon" id="sseMonthNext">›</button>
        <button class="btn--ghost" id="sseMonthThis" style="font-size:11px;">今月</button>
      </div>

      <!-- 個人カレンダー (mini) -->
      <div class="sse-cal" id="sseCal"></div>

      <!-- 日付テキスト入力: "7/2 7/5 7/12" -->
      <div class="ops-edit__lbl" style="margin-top:14px;">キーボード入力 (日付をスペース or カンマで区切る)</div>
      <div class="sse-input-row">
        <input type="text" id="sseDateInput" placeholder="例) 7/2 7/5 7/12  → Enter で追加" autocomplete="off">
        <select id="sseShiftSelect" class="sse-select">
          <option value="9-16">9-16 朝</option>
          <option value="15-20">15-20 夜</option>
          <option value="9-20">9-20 通し</option>
          <option value="休">休</option>
          <option value="">未定 (削除)</option>
        </select>
        <button class="btn btn--primary" id="sseAdd">追加</button>
      </div>
      <div class="sse-hint">Enter で追加 / カレンダーの日付を直接タップしてもOK</div>

      <!-- 変更予定サマリー -->
      <div id="sseSummary" class="sse-summary"></div>

      <div class="ops-edit__actions">
        <button class="btn--ghost" id="sseCancel">キャンセル</button>
        <button class="btn btn--primary" id="sseSave" disabled>保存する</button>
      </div>
    </div>
  `;
  $('#opsModal').hidden = false;

  renderStaffShiftCal();

  // 月ナビ
  $('#sseMonthPrev').onclick = () => {
    _staffShiftEditor.anchor = new Date(_staffShiftEditor.anchor.getFullYear(), _staffShiftEditor.anchor.getMonth() - 1, 1);
    renderStaffShiftCal();
  };
  $('#sseMonthNext').onclick = () => {
    _staffShiftEditor.anchor = new Date(_staffShiftEditor.anchor.getFullYear(), _staffShiftEditor.anchor.getMonth() + 1, 1);
    renderStaffShiftCal();
  };
  $('#sseMonthThis').onclick = () => {
    const t = new Date();
    _staffShiftEditor.anchor = new Date(t.getFullYear(), t.getMonth(), 1);
    renderStaffShiftCal();
  };

  // シフト種別選択の変更
  $('#sseShiftSelect').onchange = (e) => { _staffShiftEditor.curShift = e.target.value; };

  // 日付テキスト入力 → Enter or 追加ボタン
  const addFromInput = () => {
    const raw = $('#sseDateInput').value;
    const dates = parseDateTokens(raw, _staffShiftEditor.anchor);
    if (!dates.length) { showOpsToast('日付を認識できませんでした (例: 7/2 or 2 5 12)', 'error'); return; }
    const v = $('#sseShiftSelect').value;
    for (const dstr of dates) {
      const key = `${dstr}|${sid}`;
      if (v === '') delete _staffShiftEditor.pending[key];
      else _staffShiftEditor.pending[key] = v;
    }
    $('#sseDateInput').value = '';
    renderStaffShiftCal();
    showOpsToast(`${dates.length} 日を「${v || '未定'}」に設定 (未保存)`);
  };
  $('#sseAdd').onclick = addFromInput;
  $('#sseDateInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addFromInput(); }
  });

  // キャンセル / 保存
  $('#sseCancel').onclick = () => {
    const changed = getStaffShiftChangedCount();
    if (changed > 0 && !confirm(`${changed} 日の 変更を破棄しますか?`)) return;
    $('#opsModal').hidden = true;
    _staffShiftEditor = null;
  };
  $('#sseSave').onclick = () => {
    const m = opsLoadShifts();
    let n = 0;
    // その人のキー を pending で置き換える
    for (const k of Object.keys(m)) {
      if (k.endsWith('|' + sid)) delete m[k];
    }
    for (const [k, v] of Object.entries(_staffShiftEditor.pending)) {
      if (v && v !== '') m[k] = v;
    }
    // 差分カウント
    const beforeKeys = new Set(Object.keys(_staffShiftEditor.original));
    const afterKeys = new Set(Object.keys(_staffShiftEditor.pending));
    for (const k of afterKeys) {
      if (!beforeKeys.has(k) || _staffShiftEditor.original[k] !== _staffShiftEditor.pending[k]) n++;
    }
    for (const k of beforeKeys) if (!afterKeys.has(k)) n++;
    opsSaveShifts(m);
    $('#opsModal').hidden = true;
    _staffShiftEditor = null;
    renderShiftMode();
    showOpsToast(`${s.name} さん のシフト ${n} 日 を保存しました`);
  };
}

function getStaffShiftChangedCount() {
  if (!_staffShiftEditor) return 0;
  const { pending, original } = _staffShiftEditor;
  const allKeys = new Set([...Object.keys(pending), ...Object.keys(original)]);
  let n = 0;
  for (const k of allKeys) if (pending[k] !== original[k]) n++;
  return n;
}

function renderStaffShiftCal() {
  if (!_staffShiftEditor) return;
  const { sid, s, pending, anchor, curShift } = _staffShiftEditor;
  const y = anchor.getFullYear(), mo = anchor.getMonth();
  $('#sseMonthLbl').textContent = `${y}年 ${mo + 1}月`;

  const firstDay = new Date(y, mo, 1);
  const firstDow = firstDay.getDay();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const gridStart = new Date(y, mo, 1 - firstDow);
  const rowCount = Math.ceil((firstDow + daysInMonth) / 7);
  const cells = Array.from({ length: rowCount * 7 }, (_, i) => addDays(gridStart, i));

  const dowLbl = ['日', '月', '火', '水', '木', '金', '土'];
  const html = `
    <div class="sse-dow-head">
      ${dowLbl.map((lbl, i) => `<div class="sse-dow ${i===0||i===6?'is-wknd':''}">${lbl}</div>`).join('')}
    </div>
    <div class="sse-grid" style="grid-template-rows: repeat(${rowCount}, 1fr);">
      ${cells.map((d) => {
        const inMonth = d.getMonth() === mo;
        const isT = isToday(d);
        const dateStr = ymd(d);
        const key = `${dateStr}|${sid}`;
        const val = pending[key] || '';
        const origVal = _staffShiftEditor.original[key] || '';
        const changed = val !== origVal;
        return `<div class="sse-cell ${inMonth?'':'is-out'} ${isT?'is-today':''} ${val?'has-val':''} ${val==='休'?'is-off':''} ${changed?'is-changed':''}" data-date="${dateStr}">
          <div class="sse-cell__day">${d.getDate()}</div>
          ${val ? `<div class="sse-cell__val" style="background:${val==='休'?'transparent':s.color}">${val}</div>` : '<div class="sse-cell__empty">＋</div>'}
        </div>`;
      }).join('')}
    </div>
  `;
  $('#sseCal').innerHTML = html;

  // セル tap: curShift を割当 (もう一度同じセル tap で 削除にできる)
  $$('#sseCal .sse-cell[data-date]').forEach((el) => {
    el.addEventListener('click', () => {
      const dstr = el.dataset.date;
      const key = `${dstr}|${sid}`;
      const cur = pending[key];
      if (cur === curShift) delete pending[key];
      else pending[key] = curShift;
      renderStaffShiftCal();
      updateStaffShiftSummary();
    });
  });

  updateStaffShiftSummary();
}

function updateStaffShiftSummary() {
  const n = getStaffShiftChangedCount();
  $('#sseSave').disabled = n === 0;
  $('#sseSummary').innerHTML = n > 0
    ? `<span class="sse-summary__chg">${n} 日 変更予定 (保存を押すと反映)</span>`
    : '<span class="sse-summary__none">変更なし</span>';
}

// テキスト入力 "7/2 7/5 7/12" or "2 5 12" (現月扱い) を YYYY-MM-DD 配列に
function parseDateTokens(text, anchor) {
  const y = anchor.getFullYear(), mo = anchor.getMonth() + 1;
  const daysInMonth = new Date(y, mo, 0).getDate();
  const out = [];
  const tokens = String(text || '').replace(/[、,，]/g, ' ').split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    // "M/D" or "MM/DD"
    const md = t.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (md) {
      const m = Number(md[1]), d = Number(md[2]);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const useY = m === mo ? y : (m < mo ? y + 1 : y);
        const daysCheck = new Date(useY, m, 0).getDate();
        if (d <= daysCheck) out.push(`${useY}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
      }
      continue;
    }
    // 単独数字 → 現月の日
    const dOnly = t.match(/^(\d{1,2})$/);
    if (dOnly) {
      const d = Number(dOnly[1]);
      if (d >= 1 && d <= daysInMonth) out.push(`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
      continue;
    }
    // "1-5" 範囲
    const range = t.match(/^(\d{1,2})[-〜~](\d{1,2})$/);
    if (range) {
      const a = Number(range[1]), b = Number(range[2]);
      if (a >= 1 && b <= daysInMonth && a <= b) {
        for (let d = a; d <= b; d++) out.push(`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
      }
      continue;
    }
  }
  // dedupe
  return Array.from(new Set(out));
}

function openStaffModal(sid) {
  const list = opsLoadStaff();
  const s = sid ? list.find((x) => x.id === sid) : { id: `s${Date.now()}`, name: '', initial: '', tel: '', wish: '', color: STAFF_PALETTE[list.length % STAFF_PALETTE.length] };
  const isNew = !sid;
  const isLinked = !!s.lineUserId;

  $('#opsModalTitle').textContent = isNew ? 'スタッフを追加' : 'スタッフ情報';
  $('#opsModalBody').innerHTML = `
    <div class="ops-edit">
      <label class="ops-edit__field">
        <span class="ops-edit__lbl">お名前</span>
        <input type="text" id="sfName" value="${escapeHtml(s.name)}" placeholder="例) 山田 花">
      </label>
      <label class="ops-edit__field">
        <span class="ops-edit__lbl">イニシャル (1文字)</span>
        <input type="text" id="sfInitial" value="${escapeHtml(s.initial)}" maxlength="2" placeholder="山">
      </label>
      <label class="ops-edit__field">
        <span class="ops-edit__lbl">電話</span>
        <input type="tel" id="sfTel" value="${escapeHtml(s.tel)}" placeholder="090-xxxx-xxxx">
      </label>
      <label class="ops-edit__field">
        <span class="ops-edit__lbl">希望シフト</span>
        <input type="text" id="sfWish" value="${escapeHtml(s.wish)}" placeholder="週3 / 週末のみ 等">
      </label>
      <div class="ops-edit__field">
        <span class="ops-edit__lbl">色 (シフト表・タスクで使用)</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${STAFF_PALETTE.map((c) => `<button type="button" data-color="${c}" class="sfColor" style="width:32px;height:32px;border-radius:50%;border:${c===s.color?'3px solid var(--ink)':'1px solid var(--rule)'};background:${c};cursor:pointer;"></button>`).join('')}
        </div>
      </div>
      ${isNew ? '' : `
      <div class="ops-edit__field" style="border-top:1px solid var(--rule);padding-top:14px;margin-top:6px;">
        <span class="ops-edit__lbl">LINE連携</span>
        <div id="sfLineArea" style="font-size:13px;color:var(--muted);">
          ${isLinked
            ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><span style="color:var(--ink);font-weight:600;">✓ 連携済み</span><button class="btn--ghost" id="sfUnlinkBtn" style="font-size:12px;">解除</button></div>`
            : `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><span>未連携 — LINE で操作するには連携コードを発行</span><button class="btn--ghost" id="sfPairBtn" style="font-size:12px;">コード発行</button></div>`
          }
        </div>
      </div>`}
      <div class="ops-edit__actions">
        ${isNew ? '<span></span>' : '<button class="btn--danger btn" id="sfDelete">削除</button>'}
        <div style="display:flex;gap:10px;">
          <button class="btn btn--primary" id="sfSave">${isNew ? '追加する' : '保存する'}</button>
        </div>
      </div>
    </div>
  `;

  // ---- LINE 連携ボタン配線 ----
  if (!isNew) {
    const pairBtn = $('#sfPairBtn');
    if (pairBtn) pairBtn.onclick = async () => {
      pairBtn.disabled = true; pairBtn.textContent = '発行中…';
      try {
        const r = await apiPost({ action: 'ops-issue-pair-code', staffId: s.id });
        if (r?.ok) {
          $('#sfLineArea').innerHTML = `
            <div style="text-align:center;padding:14px;border:1px dashed var(--rule);border-radius:4px;background:var(--paper2);">
              <div style="font-size:11px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;">連携コード (10分有効)</div>
              <div style="font-family:var(--num);font-size:32px;font-weight:700;letter-spacing:0.14em;color:var(--ink);margin:8px 0;">${r.code}</div>
              <div style="font-size:12px;color:var(--muted);">${escapeHtml(s.name)} さんの LINE から <br>この 6桁 を送ってもらってください</div>
            </div>`;
        } else {
          $('#sfLineArea').innerHTML = `<div style="color:var(--red);">発行に失敗しました: ${escapeHtml(r?.error || 'unknown')}</div>`;
        }
      } catch (e) {
        $('#sfLineArea').innerHTML = `<div style="color:var(--red);">${escapeHtml(e.message)}</div>`;
      }
    };
    const unlinkBtn = $('#sfUnlinkBtn');
    if (unlinkBtn) unlinkBtn.onclick = async () => {
      if (!confirm(`${s.name} の LINE 連携を解除しますか?`)) return;
      unlinkBtn.disabled = true; unlinkBtn.textContent = '解除中…';
      try {
        const r = await apiPost({ action: 'ops-unlink-staff-line', staffId: s.id });
        if (r?.ok) {
          // ローカル cache も更新
          delete s.lineUserId;
          const l = opsLoadStaff();
          const idx = l.findIndex((x) => x.id === s.id);
          if (idx >= 0) { delete l[idx].lineUserId; opsCache.staff = l; _lsWrite(OPS_STAFF_KEY, l); }
          $('#sfLineArea').innerHTML = '<div>解除しました</div>';
        }
      } catch (e) {
        $('#sfLineArea').innerHTML = `<div style="color:var(--red);">${escapeHtml(e.message)}</div>`;
      }
    };
  }

  let chosenColor = s.color;
  $$('#opsModalBody .sfColor').forEach((b) => {
    b.addEventListener('click', () => {
      chosenColor = b.dataset.color;
      $$('#opsModalBody .sfColor').forEach((x) => x.style.border = '1px solid var(--rule)');
      b.style.border = '3px solid var(--ink)';
    });
  });

  $('#sfSave').onclick = () => {
    const name = $('#sfName').value.trim();
    if (!name) return;
    const initial = ($('#sfInitial').value.trim() || name.slice(0, 1));
    const tel = $('#sfTel').value.trim();
    const wish = $('#sfWish').value.trim();
    const next = { id: s.id, name, initial, tel, wish, color: chosenColor };
    let l = opsLoadStaff();
    const idx = l.findIndex((x) => x.id === s.id);
    if (idx >= 0) l[idx] = next; else l.push(next);
    opsSaveStaff(l);
    $('#opsModal').hidden = true;
    renderStaffList();
    renderShiftGrid();
    renderOpsToday();
  };

  const del = $('#sfDelete');
  if (del) del.onclick = () => {
    if (!confirm(`${s.name} を削除しますか?`)) return;
    let l = opsLoadStaff().filter((x) => x.id !== s.id);
    opsSaveStaff(l);
    $('#opsModal').hidden = true;
    renderStaffList();
    renderShiftGrid();
    renderOpsToday();
  };

  $('#opsModal').hidden = false;
}

// ============ 価格調査 (Booking 半径10km) ============
const OWN_EXTERNAL_IDS = new Set([
  'booking:arashima-hostel',
]);
let priceScanCache = null;

async function loadPriceScan() {
  const wrap = $('#priceHeatmap');
  const tbl = $('#priceTable');
  const empty = $('#priceEmpty');
  wrap.innerHTML = '<div class="hint" style="padding:24px;">読み込み中…</div>';
  tbl.innerHTML = '';
  empty.hidden = true;
  try {
    const r = await apiGet('get-comp-scan');
    if (!r || !r.ok || !r.data || !r.data.dates || !r.data.dates.length) {
      wrap.innerHTML = '';
      empty.hidden = false;
      renderPriceKpis(null);
      return;
    }
    priceScanCache = r.data;
    renderPriceKpis(r.data);
    renderHeatmap(r.data);
    renderPriceCards(r.data);
    renderPriceTable(r.data);
  } catch (e) {
    wrap.innerHTML = `<div class="hint" style="padding:24px;color:#b91c1c;">読み込み失敗: ${e.message}</div>`;
  }
}

$('#priceRefresh')?.addEventListener('click', loadPriceScan);

function fmtYen(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}

function median(arr) {
  const s = arr.filter((x) => x != null).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function average(arr) {
  const s = arr.filter((x) => x != null);
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null;
}

function quantileBucket(price, buckets) {
  if (price == null) return null;
  for (let i = 0; i < buckets.length; i++) if (price <= buckets[i]) return i + 1;
  return 5;
}

function computeBuckets(allPrices) {
  const s = allPrices.filter((x) => x != null).sort((a, b) => a - b);
  if (!s.length) return [0, 0, 0, 0];
  const q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))];
  return [q(0.20), q(0.40), q(0.60), q(0.80)];
}

function renderPriceKpis(data) {
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const setEyebrow = (label) => setText('priceEyebrow', label);

  if (!data) {
    setText('priceMedian', '—');
    setText('priceDelta', 'データなし');
    setText('priceCount', '—');
    setText('priceAvg30', '—');
    setText('priceWeekend', '—');
    setText('priceScannedAt', '—');
    return;
  }
  setEyebrow(`大野 半径 ${data.radiusKm}km · ${data.sites?.join(' + ') || 'Booking.com'}`);

  const dates = data.dates.slice().sort();
  const today = new Date().toISOString().slice(0, 10);
  const targetDate = dates.find((d) => d >= today) || dates[0];

  const compKeys = Object.keys(data.hotels).filter((k) => !OWN_EXTERNAL_IDS.has(k));
  const ownKeys = Object.keys(data.hotels).filter((k) => OWN_EXTERNAL_IDS.has(k));

  const compPricesToday = compKeys.map((k) => data.prices[k]?.[targetDate]).filter((x) => x != null);
  const med = median(compPricesToday);
  setText('priceMedian', fmtYen(med));

  const ownPricesToday = ownKeys.map((k) => data.prices[k]?.[targetDate]).filter((x) => x != null);
  const ownMed = median(ownPricesToday);
  const deltaEl = document.getElementById('priceDelta');
  if (ownMed != null && med != null) {
    const diff = ownMed - med;
    const dir = diff > 0 ? '高い' : diff < 0 ? '安い' : '同じ';
    deltaEl.textContent = `自ホテル ${fmtYen(ownMed)} · ${dir}${diff !== 0 ? ' ' + fmtYen(Math.abs(diff)) : ''} (${targetDate})`;
    deltaEl.className = 'price-hero__delta ' + (diff < 0 ? 'is-cheaper' : diff > 0 ? 'is-pricier' : '');
  } else {
    deltaEl.textContent = `対象日 ${targetDate}`;
    deltaEl.className = 'price-hero__delta';
  }

  setText('priceCount', compKeys.length);

  const allCompPrices = compKeys.flatMap((k) => Object.values(data.prices[k] || {}));
  setText('priceAvg30', fmtYen(average(allCompPrices)));

  const weekendPrices = compKeys.flatMap((k) => {
    return dates.filter((d) => {
      const dow = new Date(d + 'T00:00:00+09:00').getDay();
      return dow === 5 || dow === 6;
    }).map((d) => data.prices[k]?.[d]).filter((x) => x != null);
  });
  setText('priceWeekend', fmtYen(average(weekendPrices)));

  const scanned = new Date(data.scannedAt);
  const scannedStr = `${scanned.getMonth() + 1}/${scanned.getDate()} ${String(scanned.getHours()).padStart(2, '0')}:${String(scanned.getMinutes()).padStart(2, '0')}`;
  setText('priceScannedAt', scannedStr);
}

function renderHeatmap(data) {
  const wrap = $('#priceHeatmap');
  wrap.innerHTML = '';

  const dates = data.dates.slice().sort();
  const allPrices = Object.values(data.prices).flatMap((row) => Object.values(row));
  const buckets = computeBuckets(allPrices);

  // header row (date labels)
  const head = document.createElement('div');
  head.className = 'price-hm__row price-hm__row--head';
  const headLbl = document.createElement('div');
  headLbl.className = 'price-hm__label';
  headLbl.textContent = 'ホテル / 日付';
  head.appendChild(headLbl);

  const headCells = document.createElement('div');
  headCells.className = 'price-hm__cells';
  const dowChars = ['日', '月', '火', '水', '木', '金', '土'];
  // 日別 「価格 取得 hotel 数 = 0」 判定 (qa-reviewer P2-1): 検索 hit ゼロ 日 は 「?」 バッジ
  const zeroDates = new Set(dates.filter((d) => {
    return Object.values(data.prices).every((row) => row?.[d] == null);
  }));
  for (const d of dates) {
    const cell = document.createElement('div');
    const dObj = new Date(d + 'T00:00:00+09:00');
    const dow = dObj.getDay();
    const isWknd = dow === 0 || dow === 5 || dow === 6;
    const isZero = zeroDates.has(d);
    cell.className = 'price-hm__date' + (isWknd ? ' price-hm__date--wknd' : '') + (isZero ? ' price-hm__date--zero' : '');
    cell.title = isZero ? `${d} 半径10km 全滅 (検索hit0)` : '';
    cell.innerHTML = `<span class="price-hm__date-dow">${dowChars[dow]}</span><span class="price-hm__date-num">${dObj.getDate()}${isZero ? '<span class="price-hm__date-zero">?</span>' : ''}</span>`;
    headCells.appendChild(cell);
  }
  head.appendChild(headCells);
  wrap.appendChild(head);

  // sort hotels: own first, then by distance
  const hotelKeys = Object.keys(data.hotels).sort((a, b) => {
    const oa = OWN_EXTERNAL_IDS.has(a) ? 0 : 1;
    const ob = OWN_EXTERNAL_IDS.has(b) ? 0 : 1;
    if (oa !== ob) return oa - ob;
    return (data.hotels[a].distanceKm || 99) - (data.hotels[b].distanceKm || 99);
  });

  for (const k of hotelKeys) {
    const h = data.hotels[k];
    const isOwn = OWN_EXTERNAL_IDS.has(k);
    const row = document.createElement('div');
    row.className = 'price-hm__row' + (isOwn ? ' price-hm__row--own' : '');

    const label = document.createElement('div');
    label.className = 'price-hm__label';
    const thumbHtml = h.photoUrl && /^https:\/\//.test(h.photoUrl)
      ? `<img class="price-hm__thumb" src="${escapeHtml(h.photoUrl)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'price-hm__thumb price-hm__thumb--fallback',textContent:'${escapeHtml((h.name || '?').slice(0, 1))}'}))">`
      : `<span class="price-hm__thumb price-hm__thumb--fallback">${escapeHtml((h.name || '?').slice(0, 1))}</span>`;
    label.innerHTML = `
      ${thumbHtml}
      <span class="price-hm__label-text">
        <span class="price-hm__name" title="${escapeHtml(h.name || '?')}">${escapeHtml(h.name || '?')}</span>
        <span class="price-hm__meta">${(h.distanceKm ?? '—')} km${isOwn ? ' · 自ホテル' : ''}</span>
      </span>
    `;
    row.appendChild(label);

    const cells = document.createElement('div');
    cells.className = 'price-hm__cells';
    for (const d of dates) {
      const p = data.prices[k]?.[d];
      const cell = document.createElement('div');
      cell.className = 'price-hm__cell';
      if (p == null) {
        cell.dataset.empty = '1';
        cell.dataset.tooltip = `${d} · 満室 or 未取得`;
      } else {
        cell.dataset.h = String(quantileBucket(p, buckets));
        cell.dataset.tooltip = `${d} · ${fmtYen(p)}`;
      }
      cells.appendChild(cell);
    }
    row.appendChild(cells);
    wrap.appendChild(row);
  }
}

function renderPriceCards(data) {
  const wrap = $('#priceCards');
  if (!wrap) return;
  const hotelKeys = Object.keys(data.hotels).sort((a, b) => {
    const oa = OWN_EXTERNAL_IDS.has(a) ? 0 : 1;
    const ob = OWN_EXTERNAL_IDS.has(b) ? 0 : 1;
    if (oa !== ob) return oa - ob;
    return (data.hotels[a].distanceKm || 99) - (data.hotels[b].distanceKm || 99);
  });
  const html = hotelKeys.map((k) => {
    const h = data.hotels[k];
    const prices = Object.values(data.prices[k] || {}).filter((v) => v != null);
    const min = prices.length ? Math.min(...prices) : null;
    const max = prices.length ? Math.max(...prices) : null;
    const avg = average(prices);
    const isOwn = OWN_EXTERNAL_IDS.has(k);
    const safeUrl = (h.url && /^https:\/\//.test(h.url)) ? escapeHtml(h.url) : '#';
    const safePhoto = (h.photoUrl && /^https:\/\//.test(h.photoUrl)) ? escapeHtml(h.photoUrl) : null;
    const initial = escapeHtml((h.name || '?').slice(0, 1));
    const photoBlock = safePhoto
      ? `<a class="price-card__photo" href="${safeUrl}" target="_blank" rel="noopener">
           <img src="${safePhoto}" alt="" loading="lazy" onerror="this.parentNode.classList.add('price-card__photo--fallback');this.parentNode.dataset.initial='${initial}';this.remove();">
         </a>`
      : `<a class="price-card__photo price-card__photo--fallback" href="${safeUrl}" target="_blank" rel="noopener" data-initial="${initial}"></a>`;
    return `
      <article class="price-card${isOwn ? ' price-card--own' : ''}">
        ${photoBlock}
        <div class="price-card__body">
          <div class="price-card__head">
            <a class="price-card__name" href="${safeUrl}" target="_blank" rel="noopener">${escapeHtml(h.name || '?')}</a>
            ${isOwn ? '<span class="price-card__badge">自ホテル</span>' : ''}
          </div>
          <div class="price-card__meta">${h.distanceKm ?? '—'} km${h.reviewScore ? ' · ' + escapeHtml(h.reviewScore) : ''}</div>
          <div class="price-card__prices">
            <div class="price-card__stat">
              <span class="price-card__stat-lbl">${data.dates.length}日 平均</span>
              <span class="price-card__stat-val">${fmtYen(avg)}</span>
            </div>
            <div class="price-card__stat">
              <span class="price-card__stat-lbl">最安 → 最高</span>
              <span class="price-card__stat-val">${fmtYen(min)} → ${fmtYen(max)}</span>
            </div>
          </div>
          <div class="price-card__foot">
            <span class="price-card__coverage">${prices.length} / ${data.dates.length} 日 取得</span>
            <a class="price-card__link" href="${safeUrl}" target="_blank" rel="noopener">Booking で見る →</a>
          </div>
        </div>
      </article>
    `;
  }).join('');
  wrap.innerHTML = html;
}

function renderPriceTable(data) {
  const tbl = $('#priceTable');
  const hotelKeys = Object.keys(data.hotels).sort((a, b) => {
    const oa = OWN_EXTERNAL_IDS.has(a) ? 0 : 1;
    const ob = OWN_EXTERNAL_IDS.has(b) ? 0 : 1;
    if (oa !== ob) return oa - ob;
    return (data.hotels[a].distanceKm || 99) - (data.hotels[b].distanceKm || 99);
  });
  const rows = hotelKeys.map((k) => {
    const h = data.hotels[k];
    const prices = Object.entries(data.prices[k] || {}).filter(([, v]) => v != null);
    const priceVals = prices.map(([, v]) => v);
    const min = priceVals.length ? Math.min(...priceVals) : null;
    const max = priceVals.length ? Math.max(...priceVals) : null;
    const avg = average(priceVals);
    const minDate = priceVals.length ? prices.find(([, v]) => v === min)?.[0] : null;
    const maxDate = priceVals.length ? prices.find(([, v]) => v === max)?.[0] : null;
    const isOwn = OWN_EXTERNAL_IDS.has(k);
    return `
      <tr class="${isOwn ? 'is-own' : ''}">
        <td class="name"><a href="${(h.url && /^https:\/\//.test(h.url)) ? escapeHtml(h.url) : '#'}" target="_blank" rel="noopener">${escapeHtml(h.name || '?')}</a>${isOwn ? ' <span style="font-size:10px;letter-spacing:0.16em;">自ホテル</span>' : ''}</td>
        <td class="num">${h.distanceKm ?? '—'} km</td>
        <td class="num">${fmtYen(avg)}</td>
        <td class="num">${fmtYen(min)}${minDate ? ` <span style="font-size:10px;color:var(--muted);">${minDate.slice(5)}</span>` : ''}</td>
        <td class="num">${fmtYen(max)}${maxDate ? ` <span style="font-size:10px;color:var(--muted);">${maxDate.slice(5)}</span>` : ''}</td>
        <td class="num">${prices.length} / ${data.dates.length}</td>
      </tr>
    `;
  }).join('');
  tbl.innerHTML = `
    <table class="price-table">
      <thead>
        <tr>
          <th>ホテル</th>
          <th style="text-align:right;">距離</th>
          <th style="text-align:right;">${data.dates.length}日 平均</th>
          <th style="text-align:right;">最安</th>
          <th style="text-align:right;">最高</th>
          <th style="text-align:right;">出現日</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

