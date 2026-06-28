/**
 * LIFF 予約フォーム (荒島ホテル)
 * - liff.init で LINE userId を取得
 * - Firestore で rooms / 既存予約履歴を読み取り
 * - 予約確定で reservations に書き込み
 * - webhook (firestore onCreate trigger) が確認 push を送信
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, limit, serverTimestamp, initializeFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const ENV = window.__ENV;

const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID,
};
const app = initializeApp(firebaseConfig);
// experimentalAutoDetectLongPolling 必須 (Chrome 拡張 / NW で WebChannel ブロック対策)
const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
const auth = getAuth(app);

const state = {
  liffReady: false,
  lineUserId: null,
  displayName: null,
  rooms: [],
  buildings: [],
  history: [],
  draft: {
    buildingId: null,
    roomId: null,
    checkin: defaultCheckin(),
    nights: 2,
    guests: 2,
    name: '',
    tel: '',
    note: '',
  },
};

const body = document.getElementById('body');

(async function boot() {
  try {
    await liff.init({ liffId: ENV.LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    const profile = await liff.getProfile();
    state.lineUserId = profile.userId;
    state.displayName = profile.displayName;

    // Firebase Auth (LIFF token を Cloud Function で交換する想定)
    await authenticateWithLiff();

    await loadMasterData();
    await loadHistory();

    // 初期画面
    if (state.history.length > 0) {
      renderWelcomeBack();
    } else {
      renderSelectHouse();
    }
  } catch (err) {
    console.error(err);
    body.innerHTML = `<div class="error">読み込みに失敗しました: ${err.message}<br>もう一度お試しください。</div>`;
  }
})();

async function authenticateWithLiff() {
  // LIFF access token を Cloud Function に投げて Firebase custom token を受け取る
  const idToken = liff.getAccessToken();
  const res = await fetch(`/api/liff-auth?token=${idToken}`);
  const { customToken } = await res.json();
  if (customToken) {
    await signInWithCustomToken(auth, customToken);
  }
}

async function loadMasterData() {
  const snap = await getDocs(collection(db, 'rooms'));
  state.rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.active !== false);
  const bldgSnap = await getDocs(collection(db, 'buildings'));
  state.buildings = bldgSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function loadHistory() {
  if (!state.lineUserId) return;
  const q = query(
    collection(db, 'reservations'),
    where('lineUserId', '==', state.lineUserId),
    orderBy('createdAt', 'desc'),
    limit(5)
  );
  const snap = await getDocs(q);
  state.history = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function defaultCheckin() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso) {
  const d = iso instanceof Date ? iso : (iso?.toDate ? iso.toDate() : new Date(iso));
  return `${d.getMonth() + 1}月${d.getDate()}日 (${'日月火水木金土'[d.getDay()]})`;
}

// ============ Screens ============

function renderWelcomeBack() {
  const last = state.history[0];
  const b = state.buildings.find((x) => x.id === last.buildingId);
  const r = state.rooms.find((x) => x.id === last.roomId);
  body.innerHTML = `
    <h1 class="q">おかえりなさい、${state.displayName} 様</h1>
    <p class="q-sub">前回のご予約と同じ部屋で、日付だけ変えてご予約いただけます。</p>
    <button class="rebook" id="rebook">
      <span class="rebook-tag">前回のご予約</span>
      <span class="rebook-title">${b?.name || ''} ・ ${r?.no || ''}号</span>
      <span class="rebook-meta">${fmtDate(last.checkin)} / ${last.nights}泊 / ${last.guests}名</span>
    </button>
    <p class="q-sub" style="text-align:center; margin:8px 0 8px;">または</p>
    <button class="cta" id="newFlow">新しく予約する</button>
  `;
  document.getElementById('rebook').addEventListener('click', () => {
    state.draft.buildingId = last.buildingId;
    state.draft.roomId = last.roomId;
    state.draft.guests = last.guests;
    state.draft.name = last.name || state.displayName;
    state.draft.tel = last.tel || '';
    renderSelectDate();
  });
  document.getElementById('newFlow').addEventListener('click', renderSelectHouse);
}

function renderSelectHouse() {
  const opts = state.buildings.map((b) => {
    const rooms = state.rooms.filter((r) => r.buildingId === b.id);
    const min = Math.min(...rooms.map((r) => r.price));
    return `
      <button type="button" data-bldg="${b.id}">
        <span class="opt-name">${b.name}</span>
        <span class="opt-meta">${b.addrTown || ''} ${b.addrCode || ''} · ${rooms.length}室</span>
        <span class="opt-price">¥${min.toLocaleString()} 〜 / 室</span>
      </button>
    `;
  }).join('');
  body.innerHTML = `
    <h1 class="q">どちらの建屋に？</h1>
    <p class="q-sub">商店街の真ん中の旅舎、城町の書斎付き學舎。</p>
    <div class="opt">${opts}</div>
  `;
  body.querySelectorAll('[data-bldg]').forEach((b) => {
    b.addEventListener('click', () => {
      state.draft.buildingId = b.dataset.bldg;
      state.draft.roomId = null;
      renderSelectRoom();
    });
  });
}

function renderSelectRoom() {
  const bldg = state.buildings.find((b) => b.id === state.draft.buildingId);
  const rooms = state.rooms.filter((r) => r.buildingId === state.draft.buildingId);
  const opts = rooms.map((r) => {
    const num = (r.id || '').split('-')[1] || r.id;
    return `
      <button type="button" data-room="${r.id}">
        <span class="opt-name">${num}号 / ${r.name}</span>
        <span class="opt-meta">定員 ${r.capacity}名 · ${r.size} · ${r.beds}</span>
        <span class="opt-price">¥${r.price.toLocaleString()} 〜 / 一泊</span>
      </button>
    `;
  }).join('');
  body.innerHTML = `
    <h1 class="q">${bldg.name} のどのお部屋に？</h1>
    <p class="q-sub">全 ${rooms.length} 室からお選びください。</p>
    <div class="opt">${opts}</div>
    <button class="back-link" id="back">← 建屋を変える</button>
  `;
  body.querySelectorAll('[data-room]').forEach((b) => {
    b.addEventListener('click', () => {
      state.draft.roomId = b.dataset.room;
      renderSelectDate();
    });
  });
  document.getElementById('back').addEventListener('click', renderSelectHouse);
}

function renderSelectDate() {
  const r = state.rooms.find((x) => x.id === state.draft.roomId);
  const num = (r.id || '').split('-')[1] || r.id;
  body.innerHTML = `
    <h1 class="q">${num}号 / ${r.name}</h1>
    <p class="q-sub">いつから、何泊にされますか？</p>
    <label class="field">
      <span class="field-k">チェックイン</span>
      <input type="date" id="ci" class="input" value="${state.draft.checkin}" min="${new Date().toISOString().slice(0,10)}">
    </label>
    <div class="row">
      <label class="field">
        <span class="field-k">宿泊数</span>
        <select id="nights" class="input">
          ${[1,2,3,4,5,7].map(n => `<option value="${n}" ${n===state.draft.nights?'selected':''}>${n}泊</option>`).join('')}
        </select>
      </label>
      <label class="field">
        <span class="field-k">人数</span>
        <select id="guests" class="input">
          ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${n===state.draft.guests?'selected':''}>${n}名</option>`).join('')}
        </select>
      </label>
    </div>
    <button class="cta" id="next">確認へ進む</button>
    <button class="back-link" id="back">← 部屋を変える</button>
  `;
  document.getElementById('next').addEventListener('click', () => {
    state.draft.checkin = document.getElementById('ci').value;
    state.draft.nights = Number(document.getElementById('nights').value);
    state.draft.guests = Number(document.getElementById('guests').value);
    renderConfirm();
  });
  document.getElementById('back').addEventListener('click', renderSelectRoom);
}

function renderConfirm() {
  const b = state.buildings.find((x) => x.id === state.draft.buildingId);
  const r = state.rooms.find((x) => x.id === state.draft.roomId);
  const total = r.price * state.draft.nights;
  const co = new Date(state.draft.checkin);
  co.setDate(co.getDate() + state.draft.nights);
  body.innerHTML = `
    <h1 class="q">この内容で予約します</h1>
    <div class="summary">
      <dl>
        <dt>建屋</dt><dd>${b.name} · ${b.addrTown || ''}</dd>
        <dt>客室</dt><dd>${r.no}号 / ${r.name}</dd>
        <dt>到着</dt><dd>${fmtDate(state.draft.checkin)}</dd>
        <dt>出発</dt><dd>${fmtDate(co.toISOString().slice(0,10))} (${state.draft.nights}泊)</dd>
        <dt>人数</dt><dd>${state.draft.guests}名</dd>
        <dt>合計</dt><dd class="total">¥${total.toLocaleString()}</dd>
      </dl>
    </div>
    <label class="field">
      <span class="field-k">お名前</span>
      <input type="text" id="name" class="input" value="${state.draft.name || state.displayName || ''}" placeholder="例) 田中">
    </label>
    <label class="field">
      <span class="field-k">お電話番号</span>
      <input type="tel" id="tel" class="input" value="${state.draft.tel}" placeholder="例) 090-1234-5678">
    </label>
    <label class="field">
      <span class="field-k">ご要望 (任意)</span>
      <textarea id="note" class="input" placeholder="例) 自転車を一台貸してください">${state.draft.note}</textarea>
    </label>
    <button class="cta" id="confirm">予約を確定する</button>
    <button class="back-link" id="back">← 日付を変える</button>
  `;
  document.getElementById('confirm').addEventListener('click', confirmReservation);
  document.getElementById('back').addEventListener('click', renderSelectDate);
}

async function confirmReservation() {
  const name = document.getElementById('name').value.trim();
  const tel = document.getElementById('tel').value.trim();
  if (!name || !tel) {
    alert('お名前と電話番号をご入力ください');
    return;
  }
  state.draft.name = name;
  state.draft.tel = tel;
  state.draft.note = document.getElementById('note').value.trim();

  const cta = document.getElementById('confirm');
  cta.disabled = true;
  cta.textContent = '送信中…';

  try {
    const r = state.rooms.find((x) => x.id === state.draft.roomId);
    const total = r.price * state.draft.nights;
    const resNo = 'A-' + String(Math.floor(Math.random() * 9000) + 1000);
    const ci = new Date(state.draft.checkin);
    ci.setHours(0, 0, 0, 0);

    await setDoc(doc(db, 'reservations', resNo), {
      resNo,
      lineUserId: state.lineUserId,
      buildingId: state.draft.buildingId,
      roomId: state.draft.roomId,
      checkin: ci,
      nights: state.draft.nights,
      guests: state.draft.guests,
      name: state.draft.name,
      tel: state.draft.tel,
      note: state.draft.note,
      totalPrice: total,
      status: 'pending',
      source: 'liff',
      remindedPre: false,
      remindedArrival: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // guests upsert (Cloud Function trigger 側でも行うが、即時の repeater 判定のため)
    await setDoc(doc(db, 'guests', state.lineUserId), {
      displayName: state.displayName,
      realName: state.draft.name,
      tel: state.draft.tel,
      lastResNo: resNo,
      lastSeenAt: serverTimestamp(),
    }, { merge: true });

    renderDone(resNo);
  } catch (err) {
    console.error(err);
    cta.disabled = false;
    cta.textContent = '予約を確定する';
    alert('予約の送信に失敗しました。しばらくおいてもう一度お試しください。');
  }
}

function renderDone(resNo) {
  body.innerHTML = `
    <div class="done">
      <div class="stamp">承<br>諾</div>
      <h2>たしかに承りました</h2>
      <div class="done-no">予約番号 ${resNo}</div>
      <p>${state.draft.name} 様、ありがとうございます。<br>担当者から 24 時間以内に LINE のトークでご連絡いたします。</p>
      <p style="font-size:11px;">前日にチェックイン時刻と道順、当日朝に鍵の場所をお送りします。</p>
      <button class="cta" id="close">閉じる</button>
    </div>
  `;
  document.getElementById('close').addEventListener('click', () => liff.closeWindow());
}

// 戻る・閉じる
document.getElementById('btnBack').addEventListener('click', () => {
  // 1段戻る (現状は閉じる)
  if (liff.isInClient()) liff.closeWindow();
  else history.back();
});
document.getElementById('btnClose').addEventListener('click', () => {
  if (liff.isInClient()) liff.closeWindow();
  else window.close();
});
