/* 荒島旅舎 / 學舎 — 公式予約サイト
   - トップページ: houses / rooms 表示
   - LINE モーダル: チャット形式で予約フロー (新規 + 再予約)
   - 履歴: localStorage に保存し、次回モーダル開いた時に「もう一度予約」を提案
*/

(function () {
  'use strict';

  const D = window.ARASHIMA_DATA;
  const HIST_KEY = 'arashima.history.v2';

  // ===== Top page: houses =====
  function renderHouses() {
    const host = document.getElementById('housesGrid');
    if (!host) return;
    host.innerHTML = D.buildings.map((b) => {
      const rooms = D.rooms.filter((r) => r.buildingId === b.id);
      const minPrice = Math.min(...rooms.map((r) => r.price));
      const nameEn = b.id === 'ryosha' ? 'RYOSHA' : 'GAKUSHA';
      return `
        <article class="house" data-house="${b.id}">
          <div class="house__addr">${b.addrTown.toUpperCase()} · NO.${b.addrCode}</div>
          <h3 class="house__name">${b.name}</h3>
          <div class="house__name-en">${nameEn}</div>
          <p class="house__tagline">${b.tagline}</p>
          <p class="house__lead">${b.lead}</p>
          <div class="house__facility">
            ${b.facility.map((f) => `<span>${f}</span>`).join('')}
          </div>
          <div class="house__time">
            <div>Check-in<strong>${b.checkIn}</strong></div>
            <div>Check-out<strong>${b.checkOut}</strong></div>
            <div>From<strong>¥${minPrice.toLocaleString()}</strong></div>
          </div>
        </article>
      `;
    }).join('');

    host.querySelectorAll('.house').forEach((el) => {
      el.addEventListener('click', () => {
        const bid = el.dataset.house;
        openLineModal({ preset: { buildingId: bid } });
      });
    });
  }

  // ===== Top page: rooms (リスト型) =====
  function renderRooms(filter = 'all') {
    const host = document.getElementById('roomsGrid');
    if (!host) return;
    const rooms = D.rooms.filter((r) => filter === 'all' || r.buildingId === filter);
    host.innerHTML = rooms.map((r) => {
      const b = D.buildings.find((x) => x.id === r.buildingId);
      const num = parseInt(r.id.split('-')[1], 10) || r.id;
      return `
        <article class="room" data-room="${r.id}">
          <div class="room__num">${num}</div>
          <div class="room__main">
            <h3 class="room__name">${r.name}</h3>
            <div class="room__bldg">${b.name} / ${b.addrTown}</div>
          </div>
          <div class="room__specs">
            <div>定員<strong>${r.capacity}名</strong></div>
            <div>広さ<strong>${r.size}</strong></div>
          </div>
          <div class="room__feat">
            ${r.features.map((f) => `<span>${f}</span>`).join('')}
          </div>
          <div class="room__price">
            <div class="room__price-num">¥${r.price.toLocaleString()}<small>〜</small></div>
            <div class="room__price-unit">per night</div>
          </div>
        </article>
      `;
    }).join('');

    host.querySelectorAll('.room').forEach((el) => {
      el.addEventListener('click', () => {
        const r = D.rooms.find((x) => x.id === el.dataset.room);
        openLineModal({ preset: { buildingId: r.buildingId, roomId: r.id } });
      });
    });

    updateFilterCounts();
  }

  function updateFilterCounts() {
    const all = D.rooms.length;
    const ryosha = D.rooms.filter((r) => r.buildingId === 'ryosha').length;
    const gakusha = D.rooms.filter((r) => r.buildingId === 'gakusha').length;
    document.querySelectorAll('.filter').forEach((f) => {
      const sp = f.querySelector('span');
      if (!sp) return;
      if (f.dataset.filter === 'all') sp.textContent = all;
      if (f.dataset.filter === 'ryosha') sp.textContent = ryosha;
      if (f.dataset.filter === 'gakusha') sp.textContent = gakusha;
    });
  }

  // ===== Filter toggle =====
  function setupFilters() {
    document.querySelectorAll('.filter').forEach((f) => {
      f.addEventListener('click', () => {
        document.querySelectorAll('.filter').forEach((x) => x.classList.remove('is-on'));
        f.classList.add('is-on');
        renderRooms(f.dataset.filter);
      });
    });
  }

  // ===== History (localStorage) =====
  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    } catch (_) { return []; }
  }

  function pushHistory(record) {
    const hist = loadHistory();
    hist.unshift({ ...record, ts: Date.now() });
    try {
      localStorage.setItem(HIST_KEY, JSON.stringify(hist.slice(0, 10)));
    } catch (_) {}
  }

  // ===== LINE Modal — state machine =====
  const modal = {
    el: null,
    body: null,
    state: null,
    draft: null,
  };

  function defaultCheckin() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 (${'日月火水木金土'[d.getDay()]})`;
  }

  function openLineModal(opts = {}) {
    if (!modal.el) {
      modal.el = document.getElementById('lineModal');
      modal.body = document.getElementById('lineModalBody');
    }
    modal.draft = {
      buildingId: opts.preset?.buildingId || null,
      roomId: opts.preset?.roomId || null,
      checkin: defaultCheckin(),
      nights: 2,
      guests: 2,
      name: '',
      tel: '',
      note: '',
      planLabel: opts.preset?.planLabel || null,
    };
    modal.el.setAttribute('data-open', 'true');
    modal.el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // 履歴があれば「welcome-back」、なければ「welcome-new」
    const hist = loadHistory();
    if (opts.preset?.buildingId || opts.preset?.roomId) {
      // 直接クリック → 即フロー
      modal.draft.flow = 'preset';
      renderModal('selectDate');
    } else if (hist.length > 0) {
      modal.draft.flow = 'returning';
      renderModal('welcomeBack', { history: hist });
    } else {
      modal.draft.flow = 'new';
      renderModal('welcomeNew');
    }
  }

  function closeLineModal() {
    if (!modal.el) return;
    modal.el.setAttribute('data-open', 'false');
    modal.el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function renderModal(screen, ctx = {}) {
    modal.state = screen;
    const body = modal.body;
    body.innerHTML = '';

    const day = new Date();
    const dayLabel = `${day.getMonth() + 1}月${day.getDate()}日 (${'日月火水木金土'[day.getDay()]})`;

    const dayDiv = document.createElement('div');
    dayDiv.className = 'lm-day';
    dayDiv.textContent = dayLabel;
    body.appendChild(dayDiv);

    if (screen === 'welcomeNew') {
      addBubble('こんにちは。荒島旅舎・學舎の公式アカウントです。<br>はじめてのご予約ですね、ようこそ。');
      addBubble('ご予約のお手伝いをします。<br>4つだけお伺いします:<br>① 建屋 ② 客室 ③ 日付 ④ お名前。<br>所要 1〜2分です。');
      addQuick([
        { label: '予約を始める', onclick: () => renderModal('selectHouse') },
        { label: 'まずは部屋を見たい', secondary: true, onclick: () => { closeLineModal(); document.getElementById('rooms').scrollIntoView({ behavior: 'smooth' }); } },
      ]);
    }

    else if (screen === 'welcomeBack') {
      const last = ctx.history[0];
      const lastBldg = D.buildings.find((b) => b.id === last.buildingId);
      const lastRoom = D.rooms.find((r) => r.id === last.roomId);
      addBubble(`おかえりなさい、${last.name} 様。<br>前回は <strong>${lastBldg?.name || ''}・${lastRoom?.no || ''}号</strong> にお泊まりいただきました。`);
      addCardSummary({
        建屋: lastBldg?.name + ' ' + lastBldg?.addrTown,
        客室: lastRoom?.no + '号 / ' + lastRoom?.name,
        到着: fmtDate(last.checkin),
        泊数: last.nights + '泊',
        人数: last.guests + '名',
      }, '前回のご予約');
      addBubble('同じ内容でもう一度、または新しい内容でご予約いただけます。');
      addQuick([
        { label: '前回と同じ部屋を予約', onclick: () => {
          modal.draft.buildingId = last.buildingId;
          modal.draft.roomId = last.roomId;
          modal.draft.guests = last.guests;
          modal.draft.name = last.name;
          modal.draft.tel = last.tel || '';
          renderModal('selectDate', { fromHistory: true });
        }},
        { label: '別の部屋で予約', onclick: () => renderModal('selectHouse') },
        { label: '予約履歴を全部見る', secondary: true, onclick: () => renderModal('history', { history: ctx.history }) },
      ]);
    }

    else if (screen === 'history') {
      addBubble('これまでのご予約履歴です。');
      const list = document.createElement('div');
      list.className = 'lm-list';
      ctx.history.forEach((h) => {
        const b = D.buildings.find((x) => x.id === h.buildingId);
        const r = D.rooms.find((x) => x.id === h.roomId);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = `
          <span class="lm-list-name">${b?.name || ''} ・ ${r?.no || ''}号</span>
          <span class="lm-list-meta">${fmtDate(h.checkin)} / ${h.nights}泊 / ${h.guests}名</span>
        `;
        btn.addEventListener('click', () => {
          modal.draft.buildingId = h.buildingId;
          modal.draft.roomId = h.roomId;
          modal.draft.guests = h.guests;
          modal.draft.name = h.name;
          modal.draft.tel = h.tel || '';
          renderModal('selectDate', { fromHistory: true });
        });
        list.appendChild(btn);
      });
      body.appendChild(wrapInBubble(list));
    }

    else if (screen === 'selectHouse') {
      addBubble('まず、どちらの建屋に？');
      const list = document.createElement('div');
      list.className = 'lm-list';
      D.buildings.forEach((b) => {
        const rooms = D.rooms.filter((r) => r.buildingId === b.id);
        const minPrice = Math.min(...rooms.map((r) => r.price));
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = `
          <span class="lm-list-name">${b.name}</span>
          <span class="lm-list-meta">${b.addrTown} ${b.addrCode}</span>
          <span class="lm-list-price">¥${minPrice.toLocaleString()} 〜 / 室</span>
        `;
        btn.addEventListener('click', () => {
          modal.draft.buildingId = b.id;
          modal.draft.roomId = null;
          renderModal('selectRoom');
        });
        list.appendChild(btn);
      });
      body.appendChild(wrapInBubble(list));
    }

    else if (screen === 'selectRoom') {
      const bldg = D.buildings.find((b) => b.id === modal.draft.buildingId);
      addBubble(`${bldg.name} ですね。<br>どのお部屋に？`);
      const rooms = D.rooms.filter((r) => r.buildingId === modal.draft.buildingId);
      const list = document.createElement('div');
      list.className = 'lm-list';
      rooms.forEach((r) => {
        const num = parseInt(r.id.split('-')[1], 10) || r.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerHTML = `
          <span class="lm-list-name">${num}号 / ${r.name}</span>
          <span class="lm-list-meta">定員 ${r.capacity}名 · ${r.size} · ${r.beds}</span>
          <span class="lm-list-price">¥${r.price.toLocaleString()} 〜 / 一泊</span>
        `;
        btn.addEventListener('click', () => {
          modal.draft.roomId = r.id;
          renderModal('selectDate');
        });
        list.appendChild(btn);
      });
      body.appendChild(wrapInBubble(list));
      addQuick([{ label: '← 建屋を変える', secondary: true, onclick: () => renderModal('selectHouse') }]);
    }

    else if (screen === 'selectDate') {
      const r = D.rooms.find((x) => x.id === modal.draft.roomId);
      const num = parseInt(r.id.split('-')[1], 10) || r.id;
      addBubble(`${num}号 (${r.name}) ですね。<br>いつから、何泊にされますか？`);
      const form = document.createElement('form');
      form.className = 'lm-form';
      form.innerHTML = `
        <label>
          <span class="lm-form-k">チェックイン</span>
          <input type="date" id="lmCheckin" value="${modal.draft.checkin}" min="${new Date().toISOString().slice(0,10)}">
        </label>
        <label>
          <span class="lm-form-k">宿泊数</span>
          <select id="lmNights">
            ${[1,2,3,4,5,7].map((n) => `<option value="${n}" ${n===modal.draft.nights?'selected':''}>${['','一','二','三','四','五','六','七'][n] || n}泊</option>`).join('')}
          </select>
        </label>
        <label>
          <span class="lm-form-k">人数</span>
          <select id="lmGuests">
            ${[1,2,3,4,5,6].map((n) => `<option value="${n}" ${n===modal.draft.guests?'selected':''}>${['','一','二','三','四','五','六'][n] || n}名</option>`).join('')}
          </select>
        </label>
        <button type="submit">確認へ進む</button>
      `;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        modal.draft.checkin = form.querySelector('#lmCheckin').value;
        modal.draft.nights = Number(form.querySelector('#lmNights').value);
        modal.draft.guests = Number(form.querySelector('#lmGuests').value);
        renderModal('confirmDetails');
      });
      body.appendChild(wrapInBubble(form));
      addQuick([{ label: '← 部屋を選び直す', secondary: true, onclick: () => renderModal('selectRoom') }]);
    }

    else if (screen === 'confirmDetails') {
      const bldg = D.buildings.find((b) => b.id === modal.draft.buildingId);
      const room = D.rooms.find((r) => r.id === modal.draft.roomId);
      const total = room.price * modal.draft.nights;
      const co = new Date(modal.draft.checkin);
      co.setDate(co.getDate() + modal.draft.nights);

      addBubble('内容を確認しました。');
      addCardSummary({
        建屋: bldg.name,
        客室: room.no + '号 / ' + room.name,
        到着: fmtDate(modal.draft.checkin),
        出発: fmtDate(co.toISOString().slice(0,10)) + ` (${modal.draft.nights}泊)`,
        人数: modal.draft.guests + '名',
        合計: '¥' + total.toLocaleString(),
      }, 'ご予約内容', { total: '¥' + total.toLocaleString() });

      const needContact = !modal.draft.name || !modal.draft.tel;
      if (needContact) {
        addBubble('最後に、お名前とお電話番号を教えてください。');
        const form = document.createElement('form');
        form.className = 'lm-form';
        form.innerHTML = `
          <label>
            <span class="lm-form-k">お名前</span>
            <input type="text" id="lmName" value="${modal.draft.name}" placeholder="例) 田中" required>
          </label>
          <label>
            <span class="lm-form-k">お電話番号</span>
            <input type="tel" id="lmTel" value="${modal.draft.tel}" placeholder="例) 090-1234-5678" required>
          </label>
          <label>
            <span class="lm-form-k">ご要望 (任意)</span>
            <textarea id="lmNote" placeholder="例) 自転車を一台貸してください">${modal.draft.note}</textarea>
          </label>
          <button type="submit">予約を確定する</button>
        `;
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          modal.draft.name = form.querySelector('#lmName').value.trim();
          modal.draft.tel = form.querySelector('#lmTel').value.trim();
          modal.draft.note = form.querySelector('#lmNote').value.trim();
          confirmReservation();
        });
        body.appendChild(wrapInBubble(form));
      } else {
        // 履歴経由で名前/電話あり
        addBubble(`${modal.draft.name} 様、ご連絡先は前回と同じでよろしいですか？`);
        const form = document.createElement('form');
        form.className = 'lm-form';
        form.innerHTML = `
          <label>
            <span class="lm-form-k">ご要望 (任意)</span>
            <textarea id="lmNote" placeholder="例) 自転車を一台貸してください">${modal.draft.note}</textarea>
          </label>
          <button type="submit">この内容で予約する</button>
        `;
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          modal.draft.note = form.querySelector('#lmNote').value.trim();
          confirmReservation();
        });
        body.appendChild(wrapInBubble(form));
        addQuick([{ label: '連絡先を変更する', secondary: true, onclick: () => {
          modal.draft.name = ''; modal.draft.tel = '';
          renderModal('confirmDetails');
        }}]);
      }
    }

    else if (screen === 'done') {
      const resNo = ctx.resNo;
      addBubble(`<strong>${modal.draft.name}</strong> 様、ありがとうございます。<br>たしかに承りました。`);

      // 確定スタンプ
      const stamp = document.createElement('div');
      stamp.className = 'lm-stamp';
      stamp.innerHTML = '承<br>諾';
      body.appendChild(stamp);

      addBubble(`予約番号: <strong style="color:#843C28">${resNo}</strong>`);
      addBubble('24時間以内に担当者から、改めてご連絡いたします。<br>当日までの道順・チェックイン案内も、このトークでお届けします。');

      addQuick([
        { label: 'もう一度予約する', onclick: () => {
          const hist = loadHistory();
          renderModal('welcomeBack', { history: hist });
        }},
        { label: 'トークを閉じる', secondary: true, onclick: closeLineModal },
      ]);

      // Scroll to bottom
      setTimeout(() => { body.scrollTop = body.scrollHeight; }, 100);
    }

    // 自動スクロール
    requestAnimationFrame(() => {
      body.scrollTop = body.scrollHeight;
    });
  }

  function confirmReservation() {
    const resNo = 'A-' + String(Math.floor(Math.random() * 9000) + 1000);
    const rec = {
      resNo,
      buildingId: modal.draft.buildingId,
      roomId: modal.draft.roomId,
      checkin: modal.draft.checkin,
      nights: modal.draft.nights,
      guests: modal.draft.guests,
      name: modal.draft.name,
      tel: modal.draft.tel,
      note: modal.draft.note,
    };
    pushHistory(rec);
    renderModal('done', { resNo });
  }

  // ===== Modal helpers =====
  function addBubble(html) {
    const wrap = document.createElement('div');
    wrap.className = 'lm-bub-in';
    wrap.innerHTML = `<div class="lm-bub-avatar">荒</div><div class="lm-body">${html}</div>`;
    modal.body.appendChild(wrap);
  }

  function wrapInBubble(inner) {
    const wrap = document.createElement('div');
    wrap.className = 'lm-bub-in';
    const avatar = document.createElement('div');
    avatar.className = 'lm-bub-avatar';
    avatar.textContent = '荒';
    wrap.appendChild(avatar);
    wrap.appendChild(inner);
    return wrap;
  }

  function addCardSummary(rows, title, opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'lm-bub-in';
    const avatar = document.createElement('div');
    avatar.className = 'lm-bub-avatar';
    avatar.textContent = '荒';
    wrap.appendChild(avatar);

    const card = document.createElement('div');
    card.className = 'lm-card';
    let html = `<div class="lm-card__head">${title}</div><div class="lm-card__body">`;
    for (const [k, v] of Object.entries(rows)) {
      if (k === '合計' && opts.total) continue;
      html += `<div class="lm-card__row"><span>${k}</span><strong>${v}</strong></div>`;
    }
    if (opts.total) {
      html += `<div class="lm-card__row lm-card__row--total"><span>合計</span><strong>${opts.total}</strong></div>`;
    }
    html += `</div>`;
    card.innerHTML = html;
    wrap.appendChild(card);
    modal.body.appendChild(wrap);
  }

  function addQuick(items) {
    const wrap = document.createElement('div');
    wrap.className = 'lm-quick';
    items.forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.label;
      if (it.secondary) b.classList.add('is-secondary');
      b.addEventListener('click', it.onclick);
      wrap.appendChild(b);
    });
    modal.body.appendChild(wrap);
  }

  // ===== Modal triggers =====
  function setupModal() {
    document.querySelectorAll('[data-open-line-modal]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        openLineModal();
      });
    });
    document.querySelectorAll('[data-close-line-modal]').forEach((b) => {
      b.addEventListener('click', closeLineModal);
    });
    document.querySelectorAll('[data-line-back]').forEach((b) => {
      b.addEventListener('click', () => {
        const back = {
          welcomeBack: null, welcomeNew: null,
          history: 'welcomeBack',
          selectHouse: loadHistory().length > 0 ? 'welcomeBack' : 'welcomeNew',
          selectRoom: 'selectHouse',
          selectDate: 'selectRoom',
          confirmDetails: 'selectDate',
        };
        const to = back[modal.state];
        if (to) renderModal(to, { history: loadHistory() });
        else closeLineModal();
      });
    });
    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.el?.getAttribute('data-open') === 'true') {
        closeLineModal();
      }
    });
  }

  // ===== Boot =====
  document.addEventListener('DOMContentLoaded', () => {
    renderHouses();
    renderRooms('all');
    setupFilters();
    setupModal();
  });
})();
