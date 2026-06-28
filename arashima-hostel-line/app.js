/* 荒島旅舎 / 學舎 — LINE予約デモ app.js
   - ハイブリッド構成 (LIFFミニアプリ想定) のフロー再現
   - LIFF SDK は demoMode bypass、Bot push は「商店街の便り」モックで体験
   - 状態は localStorage に保管 (戻る/再訪での復元)
*/

(function () {
  'use strict';

  const D = window.ARASHIMA_DATA;
  const LS_KEY = 'arashima.draft.v1';

  // ===== State =====
  const state = loadDraft() || {
    step: 1,
    buildingId: null,
    roomId: null,
    checkin: defaultCheckin(),
    nights: 2,
    guests: 2,
    name: '',
    note: '',
  };

  function defaultCheckin() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }

  function saveDraft() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function clearDraft() {
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
  }

  // ===== Render: 棟カード (top section) =====
  function renderBuildings() {
    const host = document.getElementById('buildingsGrid');
    host.innerHTML = D.buildings.map((b) => {
      const rooms = D.rooms.filter((r) => r.buildingId === b.id);
      const minPrice = Math.min(...rooms.map((r) => r.price));
      return `
        <article class="bldg-card" data-bldg="${b.id}">
          <div class="bldg-card__addr">${b.addrTown}・${b.addrCode}</div>
          <h3 class="bldg-card__name">${b.name}</h3>
          <div class="bldg-card__kana">${b.kana} / arashima</div>
          <p class="bldg-card__tagline">${b.tagline}</p>
          <p class="bldg-card__lead">${b.lead}</p>
          <div class="bldg-card__fac">
            ${b.facility.map((f) => `<span>${f}</span>`).join('')}
          </div>
          <div class="bldg-card__time">
            <div><strong>IN</strong> ${b.checkIn}</div>
            <div><strong>OUT</strong> ${b.checkOut}</div>
            <div><strong>最低</strong> ¥${minPrice.toLocaleString()}〜</div>
          </div>
        </article>
      `;
    }).join('');

    host.querySelectorAll('.bldg-card').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.bldg;
        state.buildingId = id;
        state.roomId = null;
        state.step = 2;
        saveDraft();
        jumpTo('reserve');
        renderReserve();
      });
    });
  }

  // ===== Render: 客室一覧 (top section) =====
  function renderRooms(filter = 'all') {
    const host = document.getElementById('roomsGrid');
    const rooms = D.rooms.filter((r) => filter === 'all' || r.buildingId === filter);
    host.innerHTML = rooms.map((r) => {
      const b = D.buildings.find((x) => x.id === r.buildingId);
      return `
        <article class="room-card" data-room="${r.id}">
          <div class="room-card__head">
            <div class="room-card__no">${r.no}</div>
            <div class="room-card__bldg">${b.name}・${b.addrCode}</div>
          </div>
          <h3 class="room-card__name">${r.name}</h3>
          <div class="room-card__specs">
            <div>定員<strong>${r.capacity}名</strong></div>
            <div>広さ<strong>${r.size}</strong></div>
            <div>寝具<strong style="font-size:11px">${r.beds}</strong></div>
          </div>
          <div class="room-card__feat">
            ${r.features.map((f) => `<span>${f}</span>`).join('')}
          </div>
          <div class="room-card__foot">
            <div>
              <span class="room-card__price-k">一泊</span>
              <span class="room-card__price">¥${r.price.toLocaleString()}</span>
              <span class="room-card__price-u">〜</span>
            </div>
            <div class="room-card__cta">この部屋 →</div>
          </div>
        </article>
      `;
    }).join('');

    host.querySelectorAll('.room-card').forEach((el) => {
      el.addEventListener('click', () => {
        const r = D.rooms.find((x) => x.id === el.dataset.room);
        state.buildingId = r.buildingId;
        state.roomId = r.id;
        state.step = 3;
        saveDraft();
        jumpTo('reserve');
        renderReserve();
      });
    });

    updateCounts();
  }

  function updateCounts() {
    document.getElementById('countAll').textContent = D.rooms.length;
    document.getElementById('countRyosha').textContent =
      D.rooms.filter((r) => r.buildingId === 'ryosha').length;
    document.getElementById('countGakusha').textContent =
      D.rooms.filter((r) => r.buildingId === 'gakusha').length;
  }

  // ===== Reserve panel renderer =====
  function renderReserve() {
    // Steps
    document.querySelectorAll('.reserve__step').forEach((el) => {
      const s = el.dataset.step;
      el.classList.toggle('is-on', String(state.step) === s);
      el.classList.toggle('is-done', Number(s) < Number(state.step));
    });

    // Panels
    document.querySelectorAll('.reserve__panel').forEach((el) => {
      el.classList.toggle('is-on', el.dataset.panel === String(state.step));
    });

    // Step 1 — 建屋
    const bldgHost = document.getElementById('rsBuildings');
    bldgHost.innerHTML = D.buildings.map((b) => {
      const rooms = D.rooms.filter((r) => r.buildingId === b.id);
      const minPrice = Math.min(...rooms.map((r) => r.price));
      return `
        <article class="rs-bldg-card" data-bldg="${b.id}">
          <div class="rs-bldg-card__addr">${b.addrTown}・${b.addrCode}</div>
          <h4 class="rs-bldg-card__name">${b.name}</h4>
          <p class="rs-bldg-card__lead">${b.tagline}<br>最低 ¥${minPrice.toLocaleString()}〜 / 室</p>
        </article>
      `;
    }).join('');
    bldgHost.querySelectorAll('.rs-bldg-card').forEach((el) => {
      el.addEventListener('click', () => {
        state.buildingId = el.dataset.bldg;
        state.roomId = null;
        state.step = 2;
        saveDraft();
        renderReserve();
      });
    });

    // Step 2 — 部屋
    const roomHost = document.getElementById('rsRooms');
    const rooms = state.buildingId
      ? D.rooms.filter((r) => r.buildingId === state.buildingId)
      : [];
    roomHost.innerHTML = rooms.map((r) => `
      <article class="rs-room-card" data-room="${r.id}">
        <div class="rs-room-card__no">${r.no}号 / ${r.size}</div>
        <h4 class="rs-room-card__name">${r.name}</h4>
        <div class="rs-room-card__meta">
          <span>定員 ${r.capacity}名</span>
          <span class="rs-room-card__price">¥${r.price.toLocaleString()}〜</span>
        </div>
      </article>
    `).join('');
    roomHost.querySelectorAll('.rs-room-card').forEach((el) => {
      el.addEventListener('click', () => {
        state.roomId = el.dataset.room;
        state.step = 3;
        saveDraft();
        renderReserve();
      });
    });

    // Step 3 — 日付
    const ci = document.getElementById('rsCheckin');
    if (ci) {
      ci.value = state.checkin;
      ci.min = new Date().toISOString().slice(0, 10);
      ci.onchange = () => { state.checkin = ci.value; saveDraft(); };
    }
    const nights = document.getElementById('rsNights');
    if (nights) {
      nights.value = state.nights;
      nights.onchange = () => { state.nights = Number(nights.value); saveDraft(); };
    }
    const guests = document.getElementById('rsGuests');
    if (guests) {
      guests.value = state.guests;
      guests.onchange = () => { state.guests = Number(guests.value); saveDraft(); };
    }

    // Step 4 — Summary
    if (state.step === 4) {
      renderSummary();
    }
  }

  function renderSummary() {
    const bldg = D.buildings.find((b) => b.id === state.buildingId);
    const room = D.rooms.find((r) => r.id === state.roomId);
    if (!bldg || !room) return;

    const ci = new Date(state.checkin);
    const co = new Date(state.checkin);
    co.setDate(co.getDate() + state.nights);

    const total = room.price * state.nights;

    const fmt = (d) => `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日 (${'日月火水木金土'[d.getDay()]})`;

    document.getElementById('rsSummary').innerHTML = `
      <dl>
        <dt>建屋</dt><dd>${bldg.name} / ${bldg.addrTown} ${bldg.addrCode}</dd>
        <dt>部屋</dt><dd>${room.no}号 ・ ${room.name}</dd>
        <dt>到着</dt><dd>${fmt(ci)}</dd>
        <dt>出発</dt><dd>${fmt(co)} <span class="num">(${state.nights}泊)</span></dd>
        <dt>人数</dt><dd><span class="num">${state.guests}</span> 名</dd>
        <dt>合計</dt><dd class="total">¥${total.toLocaleString()}</dd>
      </dl>
    `;

    const name = document.getElementById('rsName');
    if (name) {
      name.value = state.name;
      name.oninput = () => { state.name = name.value; saveDraft(); };
    }
    const note = document.getElementById('rsNote');
    if (note) {
      note.value = state.note;
      note.oninput = () => { state.note = note.value; saveDraft(); };
    }
  }

  // ===== Letters (Bot通知プレビュー) =====
  function renderLetters() {
    const host = document.getElementById('lettersRail');
    host.innerHTML = D.letters.map((l) => `
      <article class="letter">
        <div class="letter__head">
          <div class="letter__from">
            <span class="letter__from-mark">荒</span>
            <span>荒島旅舎・學舎</span>
          </div>
          <span>${l.kind === 'confirm' ? '予約確定' : l.kind === 'remind' ? '前夜' : '当日'}</span>
        </div>
        <h4 class="letter__title">${l.title}</h4>
        <div class="letter__body">
          ${l.lines.map((x) => `<p>${x}</p>`).join('')}
        </div>
        <div class="letter__stamp">${l.stamp}</div>
      </article>
    `).join('');
  }

  // ===== Navigation =====
  function jumpTo(anchor) {
    const el = document.getElementById(anchor);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setupNav() {
    // Hero CTA + buttons with data-jump
    document.querySelectorAll('[data-jump]').forEach((b) => {
      b.addEventListener('click', () => jumpTo(b.dataset.jump));
    });

    // Reserve step nav (back / next)
    document.querySelectorAll('[data-back]').forEach((b) => {
      b.addEventListener('click', () => {
        state.step = Number(b.dataset.back);
        saveDraft();
        renderReserve();
      });
    });
    document.querySelectorAll('[data-next]').forEach((b) => {
      b.addEventListener('click', () => {
        if (b.dataset.next === '4' && !state.roomId) {
          alert('お部屋を選んでください');
          state.step = 2;
          renderReserve();
          return;
        }
        state.step = Number(b.dataset.next);
        saveDraft();
        renderReserve();
      });
    });

    // Confirm
    const confirm = document.getElementById('rsConfirm');
    if (confirm) {
      confirm.addEventListener('click', () => {
        if (!state.name.trim()) {
          alert('お名前を入力してください');
          return;
        }
        // 予約番号生成 (A-0000)
        const resNo = 'A-' + String(Math.floor(Math.random() * 9000) + 1000);
        document.getElementById('rsResNo').textContent = resNo;
        state.step = 'done';
        // 完了状態は draft に残さず別キーで履歴化
        try {
          const hist = JSON.parse(localStorage.getItem('arashima.history') || '[]');
          hist.unshift({
            resNo, ts: Date.now(),
            buildingId: state.buildingId,
            roomId: state.roomId,
            checkin: state.checkin,
            nights: state.nights,
            guests: state.guests,
            name: state.name,
            note: state.note,
          });
          localStorage.setItem('arashima.history', JSON.stringify(hist.slice(0, 20)));
        } catch (_) {}
        clearDraft();
        renderReserve();
      });
    }

    const restart = document.getElementById('rsRestart');
    if (restart) {
      restart.addEventListener('click', () => {
        Object.assign(state, {
          step: 1,
          buildingId: null,
          roomId: null,
          checkin: defaultCheckin(),
          nights: 2,
          guests: 2,
          name: '',
          note: '',
        });
        renderReserve();
        jumpTo('reserve');
      });
    }

    // Filter chips
    document.querySelectorAll('.chip').forEach((c) => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach((x) => x.classList.remove('chip--on'));
        c.classList.add('chip--on');
        renderRooms(c.dataset.filter);
      });
    });

    // Address rail scroll spy
    const sections = ['hero', 'buildings', 'rooms', 'reserve', 'letters'];
    const rail = document.querySelectorAll('.addr-rail__list li');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          rail.forEach((li) => {
            li.classList.toggle('is-on', li.dataset.anchor === e.target.id);
          });
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    // Rail click → jump
    rail.forEach((li) => {
      li.addEventListener('click', () => jumpTo(li.dataset.anchor));
    });
  }

  // ===== Boot =====
  document.addEventListener('DOMContentLoaded', () => {
    renderBuildings();
    renderRooms('all');
    renderLetters();
    renderReserve();
    setupNav();
  });
})();
