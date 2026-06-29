/**
 * 荒島ホテル LIFF 予約フォーム
 * フロー: カレンダー → 空き部屋一覧 → 詳細 → 確認 → 完了
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  initializeFirestore, collection, doc, getDocs, setDoc,
  query, where, orderBy, limit, serverTimestamp, Timestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const ENV = window.__ENV;

// ============================================
// データ (静的マスタ)
// ============================================
const BUILDINGS = {
  ryosha: {
    id: 'ryosha',
    name: '旅舎',
    addr: '元町 8-17',
    hero: 'assets/photos/p12.webp',
    tagline: '商店街の真ん中で、暮らすように。',
    experiences: [
      '商店街徒歩30秒・米屋・本屋・湧水場へ徒歩4分以内',
      '一枚板の共用キッチンで朝のコーヒー',
      '本棚のある居間、大野の本と地図が並ぶ',
      '無料の貸自転車・越前大野城まで7分',
    ],
    facility: ['共用キッチン (IH/冷蔵庫/調味料)', 'ラウンジ・本棚', 'シャワー個室 3', '洗濯機 ¥200/回', '貸自転車 4台', 'Wi-Fi 全室'],
    checkIn: '15:00 - 21:00',
    checkOut: '〜10:00',
    fitFor: ['商店街と地元文化を体験したい方', '一人旅・カップル・2-6名グループ', '朝活・早朝散歩が好きな方'],
    notFitFor: ['完全な静寂を求める方 (朝の物音あり)', '全室個別バスルーム希望の方', '22時以降のチェックイン希望の方'],
  },
  gakusha: {
    id: 'gakusha',
    name: '學舎',
    addr: '城町 3-05',
    hero: 'assets/photos/p01.webp',
    tagline: '元・町の学び舎。今は誰かの書斎になる。',
    experiences: [
      '書斎机のある客室・一人で集中、二人で対話',
      '城下町ビュー・越前大野城まで徒歩8分',
      '土間のカフェスペース・朝はコーヒー、夜は読書',
      '1週間〜の長期割・月割相談可、ワーケーション歓迎',
    ],
    facility: ['書斎机・デスクライト 全室', '高速Wi-Fi (100Mbps実測)', '土間キッチン', 'シャワー個室 2', '貸自転車 2台'],
    checkIn: '16:00 - 20:00',
    checkOut: '〜11:00',
    fitFor: ['ワーケーション・執筆・研究滞在', '連泊3泊以上', '静かに過ごしたいカップル・一人旅'],
    notFitFor: ['1泊だけの観光ステイ', '飲食店併設希望の方 (旅舎まで徒歩6分)'],
  },
};

const ROOMS = [
  {
    id: 'r-201', buildingId: 'ryosha', no: '201', name: '二人室・東向き', price: 4000, capacity: 2,
    bed: 'シングル×2 (低床)', size: '9畳 / 約14㎡', view: '商店街側 2階',
    photos: ['assets/photos/p17.webp', 'assets/photos/p15.webp', 'assets/photos/p16.webp'],
    tags: ['朝日', '商店街側', '提灯'],
    oneLiner: '大窓から朝日が入る、起きるのが楽しい二人室',
    amenities: ['エアコン', 'Wi-Fi', 'タオル', 'シャンプー', 'ドライヤー'],
    cautions: ['朝6:30頃から商店街のシャッター音', '上段ベッドは梯子昇降'],
  },
  {
    id: 'r-202', buildingId: 'ryosha', no: '202', name: '二人室・西向き', price: 4000, capacity: 2,
    bed: 'シングル×2', size: '9畳 / 約14㎡', view: '寺町通り側 2階',
    photos: ['assets/photos/p15.webp', 'assets/photos/p17.webp', 'assets/photos/p16.webp'],
    tags: ['夕日', '寺町側', '静か'],
    oneLiner: '寺町通りの夕日を浴びる、落ち着いた西向きの部屋',
    amenities: ['エアコン', 'Wi-Fi', 'タオル', 'シャンプー', 'ドライヤー'],
    cautions: ['上段ベッドは梯子昇降'],
  },
  {
    id: 'r-203', buildingId: 'ryosha', no: '203', name: '二人＋一室', price: 8000, capacity: 3,
    bed: 'セミダブル + シングル', size: '12畳 / 約20㎡', view: '商店街側 2階',
    photos: ['assets/photos/p16.webp', 'assets/photos/p15.webp', 'assets/photos/p17.webp'],
    tags: ['小机', '籐あかり', '広め'],
    oneLiner: '朝の光と籐の灯り、小机のある静かな部屋',
    amenities: ['エアコン', 'Wi-Fi', 'タオル', 'シャンプー', 'ドライヤー', '小机'],
    cautions: [],
  },
  {
    id: 'r-301', buildingId: 'ryosha', no: '301', name: '四人室', price: 12000, capacity: 4,
    bed: 'シングル×4 (二段ベッド×2)', size: '16畳 / 約27㎡', view: '屋根裏窓',
    photos: ['assets/photos/p18.webp', 'assets/photos/p19.webp', 'assets/photos/p15.webp'],
    tags: ['家族向き', '屋根裏窓', '二段×2'],
    oneLiner: '屋根裏窓の四人部屋、家族や仲間で一棟感覚',
    amenities: ['エアコン', 'Wi-Fi', 'タオル', 'シャンプー', 'ドライヤー'],
    cautions: ['上段ベッドは梯子昇降 (お子様要注意)'],
  },
  {
    id: 'r-302', buildingId: 'ryosha', no: '302', name: '六人大部屋', price: 12000, capacity: 6,
    bed: 'シングル×6', size: '20畳 / 約33㎡', view: '畳の間付き',
    photos: ['assets/photos/p19.webp', 'assets/photos/p18.webp', 'assets/photos/p11.webp'],
    tags: ['貸切可', '畳の間', '6人'],
    oneLiner: '六人で貸切れる、畳の間付きの大部屋',
    amenities: ['エアコン', 'Wi-Fi', 'タオル', 'シャンプー', 'ドライヤー', '畳の間'],
    cautions: ['上段ベッドは梯子昇降'],
  },
  {
    id: 'g-101', buildingId: 'gakusha', no: '101', name: '書斎付き二人室', price: 9000, capacity: 2,
    bed: 'ダブル', size: '10畳 / 約17㎡', view: '城下町ビュー 1F',
    photos: ['assets/photos/p07.webp', 'assets/photos/p06.webp', 'assets/photos/p03.webp'],
    tags: ['書斎机', '城下町ビュー', '黄椅子'],
    oneLiner: '書斎机付き、城下町の屋根が見える二人室',
    amenities: ['エアコン', 'Wi-Fi 100Mbps', '書斎机', 'デスクライト', 'タオル', 'シャンプー'],
    cautions: [],
  },
  {
    id: 'g-201', buildingId: 'gakusha', no: '201', name: '長期滞在 二人室', price: 8000, capacity: 2,
    bed: 'シングル×2', size: '12畳 / 約20㎡', view: '土間直結',
    photos: ['assets/photos/p02.webp', 'assets/photos/p03.webp', 'assets/photos/p05.webp'],
    tags: ['月割可', '土間直結', '長期向き'],
    oneLiner: '月割相談可、土間キッチン直結の長期滞在向き',
    amenities: ['エアコン', 'Wi-Fi 100Mbps', '書斎机', 'タオル', 'シャンプー'],
    cautions: ['上段ベッドは梯子昇降'],
  },
  {
    id: 'g-202', buildingId: 'gakusha', no: '202', name: '小集団 四人室', price: 14000, capacity: 4,
    bed: 'シングル×4', size: '18畳 / 約30㎡', view: 'WS転用可',
    photos: ['assets/photos/p04.webp', 'assets/photos/p07.webp', 'assets/photos/p03.webp'],
    tags: ['WS可', 'ピンク壁', '4人'],
    oneLiner: 'ワークショップ転用も可能な四人室',
    amenities: ['エアコン', 'Wi-Fi 100Mbps', '書斎机×2', 'タオル', 'シャンプー'],
    cautions: ['上段ベッドは梯子昇降'],
  },
];

const POLICY = {
  checkIn: '旅舎 15:00-21:00 / 學舎 16:00-20:00 (學舎は旅舎にて受付後ご案内)',
  checkOut: '旅舎 〜10:00 / 學舎 〜11:00',
  payment: '現地払い (現金・クレジットカード・PayPay・LINE Pay)',
  cancel: '7日前まで無料 / 6-3日前 30% / 2-1日前 50% / 当日・無連絡 100%',
  contact: `LINE @${ENV.HOTEL_LINE_ID.replace('@','')} / TEL ${ENV.HOTEL_TEL}`,
};

// ============================================
// State
// ============================================
const state = {
  lineUserId: null,
  displayName: '',
  inLineBrowser: false,
  view: 'calendar',  // calendar | rooms | detail | confirm | done
  availability: {},  // { 'YYYY-MM-DD': Set<roomId> }
  monthsLoaded: 2,
  checkin: null,     // Date
  checkout: null,    // Date
  buildingFilter: 'all',
  selectedRoom: null,
  agreedTerms: false,
  agreedCancel: false,
  guestName: '',
  guestTel: '',
  guestNote: '',
};

const body = document.getElementById('body');
const dock = document.getElementById('dock');
const sheet = document.getElementById('sheet');
const sheetBody = document.getElementById('sheetBody');
const toastEl = document.getElementById('toast');

// ============================================
// Firestore (遅延)
// ============================================
let _db = null;
function getDb() {
  if (_db) return _db;
  const app = initializeApp({
    apiKey: ENV.FIREBASE_API_KEY,
    authDomain: ENV.FIREBASE_AUTH_DOMAIN,
    projectId: ENV.FIREBASE_PROJECT_ID,
  });
  _db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  return _db;
}

// ============================================
// Util
// ============================================
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dowLabel = ['日','月','火','水','木','金','土'];
const fmtDate = (d) => `${d.getMonth()+1}/${d.getDate()} (${dowLabel[d.getDay()]})`;
const fmtDateLong = (d) => `${d.getMonth()+1}月${d.getDate()}日(${dowLabel[d.getDay()]})`;
const nightsBetween = (a, b) => Math.round((b - a) / 86400000);

function showToast(msg, ms = 2400) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => { toastEl.hidden = true; }, ms);
}

// ============================================
// 起動
// ============================================
(async function boot() {
  // 1. demoUserId (LIFF外でも動く)
  let demoId = localStorage.getItem('arashima.demoUserId');
  if (!demoId) {
    demoId = 'demo-' + Math.random().toString(36).slice(2, 11);
    localStorage.setItem('arashima.demoUserId', demoId);
  }
  state.lineUserId = demoId;
  state.displayName = 'ゲスト';

  // 2. 即カレンダー表示
  await loadAvailability();
  renderCalendar();

  // 3. LIFF init (背景)
  void (async () => {
    try {
      if (typeof liff === 'undefined') return;
      await liff.init({ liffId: ENV.LIFF_ID });
      state.inLineBrowser = liff.isInClient();
      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        state.lineUserId = profile.userId;
        state.displayName = profile.displayName || 'ゲスト';
        await loadAvailability();
        if (state.view === 'calendar') renderCalendar();
      } else if (state.inLineBrowser) {
        liff.login();
      }
    } catch (e) { console.warn('liff init', e); }
  })();
})();

// ============================================
// Availability (Firestore reservations から日付×部屋を集計)
// ============================================
async function loadAvailability() {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const from = new Date(today); from.setDate(from.getDate() - 7);
    const to = new Date(today); to.setDate(to.getDate() + state.monthsLoaded * 31);

    const q = query(
      collection(getDb(), 'reservations'),
      where('checkin', '>=', Timestamp.fromDate(from)),
      where('checkin', '<=', Timestamp.fromDate(to)),
    );
    const snap = await getDocs(q);

    // 初期化: from-to の各日付に全室空きで埋める
    const map = {};
    for (let d = new Date(today); d <= to; d.setDate(d.getDate()+1)) {
      map[ymd(d)] = new Set(ROOMS.map((r) => r.id));
    }
    // 予約で塞ぐ
    snap.docs.forEach((doc) => {
      const r = doc.data();
      if (r.status === 'cancelled') return;
      const ci = r.checkin?.toDate?.();
      if (!ci) return;
      for (let i = 0; i < (r.nights || 1); i++) {
        const d = new Date(ci); d.setDate(d.getDate() + i);
        const key = ymd(d);
        if (map[key]) map[key].delete(r.roomId);
      }
    });
    state.availability = map;
  } catch (e) {
    console.warn('availability load failed', e);
    // 失敗時: 全室空き扱い
    const today = new Date(); today.setHours(0,0,0,0);
    const map = {};
    for (let i = 0; i < state.monthsLoaded * 31; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      map[ymd(d)] = new Set(ROOMS.map((r) => r.id));
    }
    state.availability = map;
  }
}

function cellStatus(dateKey) {
  const set = state.availability[dateKey];
  if (!set) return 'open';
  const n = set.size;
  if (n === 0) return 'full';
  if (n <= 3) return 'few';
  return 'open';
}

function minPriceFor(dateKey) {
  const set = state.availability[dateKey];
  if (!set || set.size === 0) return null;
  const prices = ROOMS.filter((r) => set.has(r.id)).map((r) => r.price);
  return Math.min(...prices);
}

// 連泊範囲で利用可能な部屋IDのリスト
function roomsAvailableForRange(checkin, checkout) {
  let common = null;
  for (let d = new Date(checkin); d < checkout; d.setDate(d.getDate()+1)) {
    const set = state.availability[ymd(d)] || new Set();
    common = common === null ? new Set(set) : new Set([...common].filter((x) => set.has(x)));
  }
  return common ? [...common] : [];
}

// ============================================
// Screen: Calendar
// ============================================
function renderCalendar() {
  state.view = 'calendar';
  const today = new Date(); today.setHours(0,0,0,0);

  const rangeBar = renderRangeBar();
  let html = `
    <div class="step-pill">STEP 1 / 3</div>
    <h1 class="h1">いつ、お泊まりですか？</h1>
    <p class="lead">チェックインの日 → チェックアウトの日 の順にタップしてください。</p>
    ${rangeBar}
    <div class="cal-wrap" id="calWrap"></div>
    <div class="cal-legend">
      <span><i class="open"></i>空室あり</span>
      <span><i class="few"></i>残わずか</span>
      <span><i class="full"></i>満室</span>
    </div>
  `;
  body.innerHTML = html;

  const calWrap = document.getElementById('calWrap');
  calWrap.innerHTML = '';
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  for (let m = 0; m < state.monthsLoaded; m++) {
    const month = new Date(start.getFullYear(), start.getMonth() + m, 1);
    calWrap.appendChild(buildMonth(month, today));
  }

  bindCalendarTaps();
  renderDock();
}

function buildMonth(monthFirst, today) {
  const wrap = document.createElement('div');
  wrap.className = 'cal-month';
  const y = monthFirst.getFullYear();
  const m = monthFirst.getMonth();
  const head = document.createElement('div');
  head.className = 'cal-month__head';
  head.textContent = `${y}年 ${m + 1}月`;
  wrap.appendChild(head);

  const grid = document.createElement('div');
  grid.className = 'cal-grid';
  ['日','月','火','水','木','金','土'].forEach((dow, i) => {
    const el = document.createElement('div');
    el.className = 'cal-dow' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '');
    el.textContent = dow;
    grid.appendChild(el);
  });

  // 今日を含む週から render (過去日の表示量を削減)
  const isThisMonth = (y === today.getFullYear() && m === today.getMonth());
  const startDay = isThisMonth ? today.getDate() - today.getDay() : 1;
  const startDate = new Date(y, m, startDay > 0 ? startDay : 1);
  const startDow = startDate.getDay();
  for (let i = 0; i < startDow; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell cal-cell--empty';
    grid.appendChild(empty);
  }

  const lastDay = new Date(y, m + 1, 0).getDate();
  for (let d = Math.max(startDay, 1); d <= lastDay; d++) {
    const date = new Date(y, m, d);
    grid.appendChild(buildCell(date, today));
  }

  wrap.appendChild(grid);
  return wrap;
}

function buildCell(date, today) {
  const isPast = date < today;
  const key = ymd(date);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cal-cell';
  btn.dataset.date = key;

  if (isPast) {
    btn.classList.add('cal-cell--past');
    btn.disabled = true;
    btn.innerHTML = `<span class="cal-cell__day">${date.getDate()}</span>`;
    return btn;
  }
  if (date.getTime() === today.getTime()) btn.classList.add('cal-cell--today');

  const status = cellStatus(key);
  btn.classList.add(`cal-cell--${status}`);

  // 選択範囲のハイライト
  if (state.checkin && state.checkout) {
    if (date.getTime() === state.checkin.getTime()) btn.classList.add('cal-cell--in');
    else if (date.getTime() === state.checkout.getTime()) btn.classList.add('cal-cell--out');
    else if (date > state.checkin && date < state.checkout) btn.classList.add('cal-cell--range');
  } else if (state.checkin && date.getTime() === state.checkin.getTime()) {
    btn.classList.add('cal-cell--in');
  }

  const minP = minPriceFor(key);
  const set = state.availability[key];
  const remaining = set ? set.size : 0;
  let badge = '';
  if (status === 'few') badge = `<span class="cal-cell__badge">残${remaining}</span>`;
  else if (status === 'full') badge = `<span class="cal-cell__badge">満室</span>`;

  let price = '';
  if (status !== 'full' && minP) {
    price = `<span class="cal-cell__price">¥${(minP/1000).toFixed(0)}k〜</span>`;
  }

  btn.innerHTML = `<span class="cal-cell__day">${date.getDate()}</span>${badge}${price}`;
  if (status === 'full') btn.disabled = true;

  return btn;
}

function bindCalendarTaps() {
  document.querySelectorAll('.cal-cell:not(.cal-cell--empty):not(.cal-cell--past):not(.cal-cell--full)').forEach((btn) => {
    btn.addEventListener('click', () => {
      const d = new Date(btn.dataset.date);
      d.setHours(0,0,0,0);
      handleCellTap(d);
    });
  });
}

function handleCellTap(date) {
  // 1回目 or 3回目 (リセット)
  if (!state.checkin || (state.checkin && state.checkout)) {
    state.checkin = date;
    state.checkout = null;
  } else {
    // 2回目: in より前なら入れ替え
    if (date <= state.checkin) {
      state.checkin = date;
      state.checkout = null;
    } else {
      // 範囲内 full あるか確認
      const fullDay = checkFullInRange(state.checkin, date);
      if (fullDay) {
        showToast(`⚠ ${fullDay} は満室のため選択できません`);
        return;
      }
      state.checkout = date;
    }
  }
  renderCalendar();
}

function checkFullInRange(ci, co) {
  for (let d = new Date(ci); d < co; d.setDate(d.getDate()+1)) {
    const set = state.availability[ymd(d)];
    if (set && set.size === 0) return fmtDateLong(d);
  }
  return null;
}

function renderRangeBar() {
  const inStr = state.checkin ? `<span class="range-bar__val">${fmtDateLong(state.checkin)}</span>` : `<span class="range-bar__val empty">日付を選択</span>`;
  const outStr = state.checkout ? `<span class="range-bar__val">${fmtDateLong(state.checkout)}</span>` : `<span class="range-bar__val empty">日付を選択</span>`;
  const nights = state.checkin && state.checkout ? nightsBetween(state.checkin, state.checkout) : null;
  const cls = state.checkin && state.checkout ? 'range-bar is-selected' : 'range-bar';
  return `
    <div class="${cls}">
      <div class="range-bar__col">
        <div class="range-bar__lbl">CHECK IN</div>
        ${inStr}
      </div>
      <div class="range-bar__sep">→</div>
      <div class="range-bar__col">
        <div class="range-bar__lbl">CHECK OUT</div>
        ${outStr}
      </div>
      ${nights ? `<div class="range-bar__nights">${nights}泊</div>` : ''}
    </div>
  `;
}

// ============================================
// Dock (sticky bottom CTA)
// ============================================
function renderDock() {
  if (state.view === 'calendar') {
    if (state.checkin && state.checkout) {
      const avail = roomsAvailableForRange(state.checkin, state.checkout);
      dock.innerHTML = `
        <div class="dock__row">
          <span>空いてるお部屋</span>
          <strong>${avail.length}室</strong>
        </div>
        <button class="btn btn--primary" id="btnGotoRooms">この日程で部屋を選ぶ</button>
      `;
      dock.hidden = false;
      document.getElementById('btnGotoRooms').addEventListener('click', () => renderRooms());
    } else {
      dock.hidden = true;
    }
  } else {
    dock.hidden = true;
  }
}

// ============================================
// Screen: Rooms (空き部屋一覧)
// ============================================
function renderRooms() {
  state.view = 'rooms';
  const ci = state.checkin, co = state.checkout;
  const nights = nightsBetween(ci, co);
  const availIds = roomsAvailableForRange(ci, co);

  let list = ROOMS.filter((r) => state.buildingFilter === 'all' || r.buildingId === state.buildingFilter);
  list = list.map((r) => ({ ...r, _available: availIds.includes(r.id) }));
  list.sort((a, b) => (b._available - a._available) || a.price - b.price);

  body.innerHTML = `
    <div class="step-pill">STEP 2 / 3</div>
    <h1 class="h1">どのお部屋に？</h1>
    <p class="lead"><strong>${fmtDate(ci)} → ${fmtDate(co)} / ${nights}泊</strong> で空いてる お部屋を表示しています。</p>
    <div class="filters" id="filters">
      <button class="filter-chip ${state.buildingFilter==='all'?'is-on':''}" data-f="all">全室 (${availIds.length}空)</button>
      <button class="filter-chip ${state.buildingFilter==='ryosha'?'is-on':''}" data-f="ryosha">旅舎</button>
      <button class="filter-chip ${state.buildingFilter==='gakusha'?'is-on':''}" data-f="gakusha">學舎</button>
    </div>
    <div class="room-list" id="roomList">
      ${list.map(renderRoomCard).join('')}
    </div>
    <button class="btn btn--text" id="backCal">← 日程を変える</button>
  `;
  document.querySelectorAll('.filter-chip').forEach((c) => {
    c.addEventListener('click', () => {
      state.buildingFilter = c.dataset.f;
      renderRooms();
    });
  });
  document.querySelectorAll('.room-card').forEach((card) => {
    card.addEventListener('click', () => {
      const r = ROOMS.find((x) => x.id === card.dataset.room);
      if (!r) return;
      if (!availIds.includes(r.id)) {
        showToast('この期間は満室です');
        return;
      }
      openRoomSheet(r);
    });
  });
  document.getElementById('backCal').addEventListener('click', () => renderCalendar());
  renderDock();
  window.scrollTo(0, 0);
}

function renderRoomCard(r) {
  const b = BUILDINGS[r.buildingId];
  const nights = nightsBetween(state.checkin, state.checkout);
  const total = r.price * nights;
  return `
    <button class="room-card ${!r._available ? 'room-card--unavail' : ''}" data-room="${r.id}" type="button">
      <div class="room-card__media">
        <img src="${r.photos[0]}" alt="${r.name}" loading="lazy">
        <span class="room-card__tag room-card__tag--bldg">${b.name}</span>
        ${!r._available ? `<span class="room-card__tag room-card__tag--full">満室</span>` : ''}
        <div class="room-card__price-badge">¥${r.price.toLocaleString()}<small>/泊</small></div>
      </div>
      <div class="room-card__body">
        <div class="room-card__title">
          <span class="room-card__num">${r.no}</span>
          <span>${r.name}</span>
        </div>
        <p class="room-card__one">${r.oneLiner}</p>
        <ul class="room-card__specs">
          <li><svg class="ico"><use href="#i-person"/></svg>定員${r.capacity}名</li>
          <li><svg class="ico"><use href="#i-bed"/></svg>${r.bed.split(' (')[0]}</li>
          <li><svg class="ico"><use href="#i-area"/></svg>${r.size.split(' /')[0]}</li>
        </ul>
        <ul class="room-card__chips">
          ${r.tags.slice(0, 3).map((t) => `<li>${t}</li>`).join('')}
        </ul>
        <div class="room-card__row">
          <div class="room-card__total">${nights}泊 合計 <strong>¥${total.toLocaleString()}</strong></div>
          <span class="room-card__cta">詳細 <svg class="ico"><use href="#i-arrow-r"/></svg></span>
        </div>
      </div>
    </button>
  `;
}

// ============================================
// Bottom Sheet: 客室詳細
// ============================================
function openRoomSheet(r) {
  state.selectedRoom = r;
  const b = BUILDINGS[r.buildingId];
  const nights = nightsBetween(state.checkin, state.checkout);
  const total = r.price * nights;

  sheetBody.innerHTML = `
    <div class="detail-carousel-wrap">
      <div class="detail-carousel" id="detailCarousel">
        ${r.photos.map((p, i) => `<img src="${p}" alt="${r.name} ${i+1}/${r.photos.length}" loading="${i===0?'eager':'lazy'}">`).join('')}
      </div>
      <div class="detail-dots" id="detailDots">${r.photos.map((_,i)=>`<span class="${i===0?'is-on':''}"></span>`).join('')}</div>
    </div>
    <div class="detail-body">
      <h3>${r.no} <span style="font-weight:700">${r.name}</span></h3>
      <div class="detail-bldg">${b.name} · ${b.addr} · ${r.view}</div>
      <div class="detail-specs">
        <div>定員<strong>${r.capacity}名</strong></div>
        <div>ベッド<strong>${r.bed.split(' (')[0]}</strong></div>
        <div>広さ<strong>${r.size.split(' /')[0]}</strong></div>
      </div>
      <div class="detail-h">このお部屋の魅力</div>
      <ul class="detail-list"><li>${r.oneLiner}</li></ul>

      <div class="detail-h">設備</div>
      <div class="detail-amen">
        ${r.amenities.map((a) => `<span>${amenIcon(a)} ${a}</span>`).join('')}
      </div>

      ${r.cautions.length ? `
        <div class="detail-h">知っておいてほしいこと</div>
        <ul class="detail-list detail-caution">
          ${r.cautions.map((c) => `<li>${c}</li>`).join('')}
        </ul>` : ''}

      <div class="detail-h">料金</div>
      <ul class="detail-list">
        <li>一泊一室 ¥${r.price.toLocaleString()} (税込・素泊まり)</li>
        <li>${nights}泊 合計 ¥${total.toLocaleString()}</li>
      </ul>

      <div style="height:90px"></div>
    </div>
    <div class="dock">
      <div class="dock__row">
        <span>${nights}泊 合計</span>
        <strong>¥${total.toLocaleString()}</strong>
      </div>
      <button class="btn btn--primary" id="selectRoom">この部屋を予約する</button>
    </div>
  `;
  sheet.hidden = false;
  requestAnimationFrame(() => sheet.setAttribute('aria-hidden', 'false'));
  document.body.style.overflow = 'hidden';

  // Dots scroll spy
  const carousel = document.getElementById('detailCarousel');
  const dots = document.getElementById('detailDots').children;
  carousel.addEventListener('scroll', () => {
    const idx = Math.round(carousel.scrollLeft / carousel.clientWidth);
    Array.from(dots).forEach((d, i) => d.classList.toggle('is-on', i === idx));
  });

  document.getElementById('selectRoom').addEventListener('click', () => {
    closeSheet();
    renderConfirm();
  });
}

function amenIcon(a) {
  if (a.includes('Wi-Fi')) return '<svg class="ico"><use href="#i-wifi"/></svg>';
  if (a.includes('シャワー') || a.includes('シャンプー')) return '<svg class="ico"><use href="#i-shower"/></svg>';
  if (a.includes('書斎')) return '<svg class="ico"><use href="#i-window"/></svg>';
  return '<svg class="ico"><use href="#i-check"/></svg>';
}

function closeSheet() {
  sheet.setAttribute('aria-hidden', 'true');
  setTimeout(() => { sheet.hidden = true; }, 300);
  document.body.style.overflow = '';
}
document.querySelectorAll('[data-close-sheet]').forEach((b) => b.addEventListener('click', closeSheet));

// ============================================
// Screen: Confirm
// ============================================
function renderConfirm() {
  state.view = 'confirm';
  const r = state.selectedRoom;
  const b = BUILDINGS[r.buildingId];
  const nights = nightsBetween(state.checkin, state.checkout);
  const total = r.price * nights;

  body.innerHTML = `
    <div class="step-pill">STEP 3 / 3</div>
    <h1 class="h1">ご予約内容の確認</h1>
    <p class="lead">下記の内容で承ります。重要事項にご同意のうえお進みください。</p>

    <div class="summary">
      <div class="summary__row"><span>建屋</span><strong>${b.name} (${b.addr})</strong></div>
      <div class="summary__row"><span>客室</span><strong>${r.no} ${r.name}</strong></div>
      <div class="summary__row"><span>チェックイン</span><strong>${fmtDateLong(state.checkin)}</strong></div>
      <div class="summary__row"><span>チェックアウト</span><strong>${fmtDateLong(state.checkout)}</strong></div>
      <div class="summary__row"><span>泊数</span><strong>${nights}泊</strong></div>
      <div class="summary__row"><span>定員</span><strong>${r.capacity}名 まで</strong></div>
      <div class="summary__row summary__total"><span>合計 (税込)</span><strong>¥${total.toLocaleString()}</strong></div>
    </div>

    <h2 class="h2">ご予約代表者</h2>
    <div class="field">
      <span class="field__k">お名前 <em>必須</em></span>
      <input type="text" id="gName" class="input" value="${state.guestName || state.displayName || ''}" placeholder="山田 太郎">
    </div>
    <div class="field">
      <span class="field__k">お電話番号 <em>必須</em></span>
      <input type="tel" id="gTel" class="input" inputmode="numeric" value="${state.guestTel}" placeholder="09012345678">
    </div>
    <div class="field">
      <span class="field__k">ご要望 (任意)</span>
      <textarea id="gNote" class="input" placeholder="例) 自転車を1台貸してください / 到着は20時頃">${state.guestNote}</textarea>
    </div>

    <h2 class="h2">重要事項</h2>
    <div class="terms-block">
      <details open>
        <summary>チェックイン・アウト</summary>
        <div class="terms-content">${POLICY.checkIn}<br>${POLICY.checkOut}</div>
      </details>
      <details>
        <summary>お支払い方法</summary>
        <div class="terms-content">${POLICY.payment}<br><br>※ 事前のお支払いは不要です。チェックアウト時にお願いいたします。</div>
      </details>
      <details>
        <summary>キャンセル規定</summary>
        <div class="terms-content">${POLICY.cancel}<br><br>※ 台風・大雪等の交通障害は別途ご相談に応じます。</div>
      </details>
      <details>
        <summary>連絡先</summary>
        <div class="terms-content">${POLICY.contact}</div>
      </details>
    </div>

    <label class="agree" id="agree1">
      <input type="checkbox" id="cbTerms" ${state.agreedTerms?'checked':''}>
      <span>利用規約・宿泊約款 に同意します</span>
    </label>
    <label class="agree" id="agree2">
      <input type="checkbox" id="cbCancel" ${state.agreedCancel?'checked':''}>
      <span>キャンセル規定 に同意します</span>
    </label>

    <button class="btn btn--text" id="backRooms" style="margin-top:8px; margin-bottom:120px">← 部屋を選び直す</button>

    <div class="confirm-dock">
      <div class="confirm-dock__hint">合計 ¥${total.toLocaleString()} (税込・現地払い)</div>
      <button class="btn btn--primary" id="btnConfirm" ${(!state.agreedTerms||!state.agreedCancel)?'disabled':''}>予約を確定する</button>
    </div>
  `;

  // 入力保存
  document.getElementById('gName').addEventListener('input', (e) => state.guestName = e.target.value);
  document.getElementById('gTel').addEventListener('input', (e) => state.guestTel = e.target.value);
  document.getElementById('gNote').addEventListener('input', (e) => state.guestNote = e.target.value);

  const cb1 = document.getElementById('cbTerms');
  const cb2 = document.getElementById('cbCancel');
  const btn = document.getElementById('btnConfirm');
  const updateBtn = () => {
    state.agreedTerms = cb1.checked;
    state.agreedCancel = cb2.checked;
    btn.disabled = !(cb1.checked && cb2.checked);
    document.getElementById('agree1').classList.toggle('is-checked', cb1.checked);
    document.getElementById('agree2').classList.toggle('is-checked', cb2.checked);
  };
  cb1.addEventListener('change', updateBtn);
  cb2.addEventListener('change', updateBtn);
  updateBtn();

  btn.addEventListener('click', confirmReservation);
  document.getElementById('backRooms').addEventListener('click', () => renderRooms());

  window.scrollTo(0, 0);
  dock.hidden = true;
  dock.innerHTML = '';
}

async function confirmReservation() {
  const name = document.getElementById('gName').value.trim();
  const tel = document.getElementById('gTel').value.trim();
  if (!name || !tel) { showToast('お名前と電話番号を入力してください'); return; }
  if (!/^[\d\-+ ]{10,15}$/.test(tel)) { showToast('電話番号の形式が正しくありません'); return; }
  state.guestName = name; state.guestTel = tel;

  const btn = document.getElementById('btnConfirm');
  btn.disabled = true;
  btn.textContent = '送信中…';

  try {
    const r = state.selectedRoom;
    const nights = nightsBetween(state.checkin, state.checkout);
    const total = r.price * nights;
    const resNo = 'A-' + String(Math.floor(Math.random() * 9000) + 1000);
    const ci = new Date(state.checkin); ci.setHours(0,0,0,0);

    const rec = {
      resNo,
      lineUserId: state.lineUserId,
      buildingId: r.buildingId,
      roomId: r.id,
      checkin: ci,
      nights,
      guests: r.capacity, // 簡略化 (将来 picker 追加)
      name, tel,
      note: state.guestNote,
      totalPrice: total,
      status: 'pending',
      source: state.inLineBrowser ? 'liff' : 'web',
      remindedPre: false,
      remindedArrival: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(getDb(), 'reservations', resNo), rec);
    setDoc(doc(getDb(), 'guests', state.lineUserId), {
      displayName: state.displayName, realName: name, tel,
      lastResNo: resNo, lastSeenAt: serverTimestamp(),
    }, { merge: true }).catch(()=>{});

    renderDone(resNo);
  } catch (e) {
    console.error(e);
    btn.disabled = false;
    btn.textContent = '予約を確定する';
    showToast('送信に失敗しました: ' + e.message, 4000);
  }
}

// ============================================
// Screen: Done
// ============================================
function renderDone(resNo) {
  state.view = 'done';
  const r = state.selectedRoom;
  const b = BUILDINGS[r.buildingId];
  const nights = nightsBetween(state.checkin, state.checkout);
  const total = r.price * nights;

  body.innerHTML = `
    <div class="done">
      <div class="done__stamp">承<br>諾</div>
      <h2>たしかに承りました</h2>
      <div class="done__no">${resNo}</div>
      <p>${state.guestName} 様、ありがとうございます。<br>担当者が空室を確認のうえ、<strong>24時間以内に LINE のトーク</strong>でご連絡いたします。</p>

      <div class="done__info">
        <div class="done__info-row"><span>建屋・客室</span><strong>${b.name} ${r.no}</strong></div>
        <div class="done__info-row"><span>チェックイン</span><strong>${fmtDateLong(state.checkin)}</strong></div>
        <div class="done__info-row"><span>チェックアウト</span><strong>${fmtDateLong(state.checkout)}</strong></div>
        <div class="done__info-row"><span>合計</span><strong>¥${total.toLocaleString()}</strong></div>
      </div>

      <p style="font-size:12px;">前日にチェックイン時刻と道順、当日朝に鍵の場所を LINE でお送りします。</p>

      <button class="btn btn--primary" id="btnClose2" style="margin-top:20px">${state.inLineBrowser ? 'LINE に戻る' : '閉じる'}</button>
    </div>
  `;
  document.getElementById('btnClose2').addEventListener('click', () => {
    if (state.inLineBrowser && typeof liff !== 'undefined') liff.closeWindow();
    else location.reload();
  });
  dock.hidden = true;
  dock.innerHTML = '';
}

// ============================================
// Nav (戻る/閉じる)
// ============================================
document.getElementById('btnBack').addEventListener('click', () => {
  if (state.view === 'rooms') return renderCalendar();
  if (state.view === 'confirm') return renderRooms();
  if (state.view === 'done') return location.reload();
  if (state.inLineBrowser && typeof liff !== 'undefined') liff.closeWindow();
  else history.back();
});
document.getElementById('btnClose').addEventListener('click', () => {
  if (state.inLineBrowser && typeof liff !== 'undefined') liff.closeWindow();
  else window.close();
});
