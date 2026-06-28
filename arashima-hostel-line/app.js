/* 荒島ホテル — LINE 予約システム デモ
   - スマホ画面 (リッチメニュー) を操作
   - 「予約する」→ LIFF 起動 (建屋/部屋/日付/連絡先/完了)
   - 他のマス → Bot 自動返信を吹き出しで追加
   - 履歴は localStorage 保存 → 次回 LIFF 起動時に「前回と同じ予約」 ワンタップ
*/

(function () {
  'use strict';

  const D = window.ARASHIMA_DATA;
  const HIST_KEY = 'arashima.history.v3';

  // ===== Initial chat setup =====
  function todayLabel() {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日 (${'日月火水木金土'[d.getDay()]})`;
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 (${'日月火水木金土'[d.getDay()]})`;
  }

  function bootChat() {
    const chat = document.getElementById('phoneChat');
    if (!chat) return;
    chat.innerHTML = '';
    addBubble('lm-day', todayLabel(), { chat });
    addInBubble('荒島ホテルへようこそ。<br>ご用件は下のメニューからお選びください。', { chat });
  }

  // ===== Bubble helpers =====
  function addBubble(cls, html, opts = {}) {
    const chat = opts.chat || document.getElementById('phoneChat');
    const el = document.createElement('div');
    el.className = cls;
    el.innerHTML = html;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
    return el;
  }

  function addInBubble(html, opts = {}) {
    const chat = opts.chat || document.getElementById('phoneChat');
    const wrap = document.createElement('div');
    wrap.className = 'lm-bub-in';
    wrap.innerHTML = `<div class="lm-bub-avatar">荒</div><div class="lm-body">${html}</div>`;
    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;
    return wrap;
  }

  function addOutBubble(html, opts = {}) {
    const chat = opts.chat || document.getElementById('phoneChat');
    const wrap = document.createElement('div');
    wrap.className = 'lm-bub-out';
    wrap.innerHTML = `<div class="lm-body">${html}</div>`;
    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;
    return wrap;
  }

  function addFlexBubble(title, rows, opts = {}) {
    const chat = opts.chat || document.getElementById('phoneChat');
    const wrap = document.createElement('div');
    wrap.className = 'lm-bub-in';
    const rowsHtml = Object.entries(rows).map(([k, v]) => `<div class="lm-flex__row"><span>${k}</span><strong>${v}</strong></div>`).join('');
    wrap.innerHTML = `
      <div class="lm-bub-avatar">荒</div>
      <div class="lm-flex">
        <div class="lm-flex__hd">${title}</div>
        <div class="lm-flex__bd">${rowsHtml}</div>
      </div>
    `;
    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;
    return wrap;
  }

  // ===== Rich menu actions =====
  function setupRichMenu() {
    document.querySelectorAll('.rich-menu__cell').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const label = btn.querySelector('.rich-menu__label')?.textContent || '';
        // Customer sends (echo)
        setTimeout(() => addOutBubble(label), 80);
        // Bot replies
        setTimeout(() => handleAction(action), 700);
      });
    });
  }

  function handleAction(action) {
    if (action === 'reserve') {
      addInBubble('かしこまりました。<br>ご予約フォームをこちらでお開きします。');
      setTimeout(() => openLiff(), 600);
    }
    else if (action === 'rooms') {
      addInBubble('客室と滞在プランをお送りします。');
      const minR = Math.min(...D.rooms.filter(r => r.buildingId === 'ryosha').map(r => r.price));
      const minG = Math.min(...D.rooms.filter(r => r.buildingId === 'gakusha').map(r => r.price));
      addFlexBubble('荒島ホテル 全室', {
        '旅舎': '5室 / ¥' + minR.toLocaleString() + '〜',
        '學舎': '3室 / ¥' + minG.toLocaleString() + '〜',
        '素泊まり': '一泊一室',
        '人気プラン': '3泊以上 15% OFF',
      });
      setTimeout(() => addInBubble('気になるお部屋があれば、「予約する」 から日付を入れてください。'), 800);
    }
    else if (action === 'access') {
      addInBubble('道順をお送りします。<br><br>📍 福井県大野市 元町 8-17<br>越美北線・越前大野駅から徒歩 12 分。');
      setTimeout(() => addFlexBubble('道順 (4ステップ)', {
        '1.': '駅前ロータリーを左へ',
        '2.': '真名川にかかる橋を渡る',
        '3.': '寺町通りに入る',
        '4.': '朱の暖簾、8-17',
      }), 600);
      setTimeout(() => addInBubble('Google マップで開く: https://maps.google.com/?q=福井県大野市元町8-17'), 1100);
    }
    else if (action === 'changes') {
      const hist = loadHistory();
      if (hist.length === 0) {
        addInBubble('現在、お客様のご予約は登録されていません。<br>新規ご予約は「予約する」から。');
      } else {
        const h = hist[0];
        const b = D.buildings.find((x) => x.id === h.buildingId);
        const r = D.rooms.find((x) => x.id === h.roomId);
        addInBubble('お客様の現在のご予約は以下のとおりです。');
        addFlexBubble('現在のご予約', {
          '予約番号': h.resNo,
          '建屋': b?.name || '',
          '客室': (r?.no || '') + '号',
          '到着': fmtDate(h.checkin),
          '泊数': h.nights + '泊',
        });
        setTimeout(() => addInBubble('変更・キャンセルは「予約する」 ボタンからお手続きできます。<br>3日前まで無料 / 前日 50% / 当日 100%。'), 700);
      }
    }
    else if (action === 'facility') {
      addInBubble('館内のご案内です。<br>共用部はチェックイン中は 24 時間お使いいただけます。');
      setTimeout(() => addFlexBubble('共用設備', {
        'キッチン': '1F / 24h',
        'ラウンジ': '1F / 暖炉風ストーブ',
        '貸自転車': '3台 / 無料',
        'シャワー': '男女別 / 24h',
        '洗濯機': '¥300/回',
      }), 600);
      setTimeout(() => addInBubble('Wi-Fi パスワードはチェックイン時にお伝えします。'), 1100);
    }
    else if (action === 'contact') {
      addInBubble('お問い合わせ内容をどうぞ。<br>このトークに直接ご記入いただけます。');
      setTimeout(() => addInBubble('受付時間: 9:00 - 21:00<br>通常 1 時間以内にスタッフが返信します。<br>営業時間外は翌朝の返信となります。'), 700);
    }
  }

  // ===== History =====
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); }
    catch (_) { return []; }
  }

  function pushHistory(rec) {
    const hist = loadHistory();
    hist.unshift({ ...rec, ts: Date.now() });
    try { localStorage.setItem(HIST_KEY, JSON.stringify(hist.slice(0, 10))); }
    catch (_) {}
  }

  // ===== LIFF (mini-app reservation) =====
  const liff = {
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

  function openLiff(opts = {}) {
    if (!liff.el) {
      liff.el = document.getElementById('liff');
      liff.body = document.getElementById('liffBody');
    }
    liff.draft = {
      buildingId: opts.preset?.buildingId || null,
      roomId: opts.preset?.roomId || null,
      checkin: defaultCheckin(),
      nights: 2,
      guests: 2,
      name: '',
      tel: '',
      note: '',
    };
    liff.el.setAttribute('data-open', 'true');
    liff.el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const hist = loadHistory();
    if (hist.length > 0) {
      renderLiff('welcomeBack', { history: hist });
    } else {
      renderLiff('selectHouse');
    }
  }

  function closeLiff() {
    if (!liff.el) return;
    liff.el.setAttribute('data-open', 'false');
    liff.el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Bot post-message in chat
    setTimeout(() => {
      if (liff.draft?._completed) {
        addInBubble('ご予約ありがとうございました。<br>当日までの案内をこのトークでお届けします。');
        liff.draft._completed = false;
      }
    }, 200);
  }

  function renderLiff(screen, ctx = {}) {
    liff.state = screen;
    const body = liff.body;
    body.innerHTML = '';

    if (screen === 'welcomeBack') {
      const last = ctx.history[0];
      const lastBldg = D.buildings.find((b) => b.id === last.buildingId);
      const lastRoom = D.rooms.find((r) => r.id === last.roomId);
      const step = document.createElement('div');
      step.className = 'liff__step';
      step.innerHTML = `
        <h3 class="liff__q">おかえりなさい、${last.name} 様</h3>
        <p class="liff__sub">前回のご予約と同じ内容で、日付だけ変更してもう一度ご予約いただけます。</p>
        <button class="liff__rebook" type="button" id="liffRebook">
          <span class="liff__rebook-tag">前回のご予約</span>
          <span class="liff__rebook-title">${lastBldg?.name || ''} ・ ${lastRoom?.no || ''}号</span>
          <span class="liff__rebook-meta">${fmtDate(last.checkin)} / ${last.nights}泊 / ${last.guests}名</span>
        </button>
        <p class="liff__sub" style="text-align:center; margin:0;">または</p>
        <button class="liff__cta" type="button" id="liffNew">新しく予約する</button>
      `;
      body.appendChild(step);
      body.querySelector('#liffRebook').addEventListener('click', () => {
        liff.draft.buildingId = last.buildingId;
        liff.draft.roomId = last.roomId;
        liff.draft.guests = last.guests;
        liff.draft.name = last.name;
        liff.draft.tel = last.tel || '';
        renderLiff('selectDate', { fromHistory: true });
      });
      body.querySelector('#liffNew').addEventListener('click', () => renderLiff('selectHouse'));
    }

    else if (screen === 'selectHouse') {
      const step = document.createElement('div');
      step.className = 'liff__step';
      const opts = D.buildings.map((b) => {
        const rooms = D.rooms.filter((r) => r.buildingId === b.id);
        const min = Math.min(...rooms.map((r) => r.price));
        return `
          <button type="button" data-bldg="${b.id}">
            <span class="liff__opt-name">${b.name}</span>
            <span class="liff__opt-meta">${b.addrTown} ${b.addrCode} · ${rooms.length}室</span>
            <span class="liff__opt-price">¥${min.toLocaleString()} 〜 / 室</span>
          </button>
        `;
      }).join('');
      step.innerHTML = `
        <h3 class="liff__q">どちらの建屋に？</h3>
        <p class="liff__sub">同じオーナーが運営する別の表情の二棟です。</p>
        <div class="liff__opt">${opts}</div>
      `;
      body.appendChild(step);
      step.querySelectorAll('[data-bldg]').forEach((b) => {
        b.addEventListener('click', () => {
          liff.draft.buildingId = b.dataset.bldg;
          liff.draft.roomId = null;
          renderLiff('selectRoom');
        });
      });
    }

    else if (screen === 'selectRoom') {
      const bldg = D.buildings.find((b) => b.id === liff.draft.buildingId);
      const rooms = D.rooms.filter((r) => r.buildingId === liff.draft.buildingId);
      const step = document.createElement('div');
      step.className = 'liff__step';
      const opts = rooms.map((r) => {
        const num = parseInt(r.id.split('-')[1], 10) || r.id;
        return `
          <button type="button" data-room="${r.id}">
            <span class="liff__opt-name">${num}号 / ${r.name}</span>
            <span class="liff__opt-meta">定員 ${r.capacity}名 · ${r.size} · ${r.beds}</span>
            <span class="liff__opt-price">¥${r.price.toLocaleString()} 〜 / 一泊</span>
          </button>
        `;
      }).join('');
      step.innerHTML = `
        <h3 class="liff__q">${bldg.name} のどのお部屋に？</h3>
        <p class="liff__sub">全 ${rooms.length} 室からお選びください。</p>
        <div class="liff__opt">${opts}</div>
        <button class="liff__back-link" type="button" id="liffBack">← 建屋を変える</button>
      `;
      body.appendChild(step);
      step.querySelectorAll('[data-room]').forEach((b) => {
        b.addEventListener('click', () => {
          liff.draft.roomId = b.dataset.room;
          renderLiff('selectDate');
        });
      });
      body.querySelector('#liffBack').addEventListener('click', () => renderLiff('selectHouse'));
    }

    else if (screen === 'selectDate') {
      const r = D.rooms.find((x) => x.id === liff.draft.roomId);
      const num = parseInt(r.id.split('-')[1], 10) || r.id;
      const step = document.createElement('div');
      step.className = 'liff__step';
      step.innerHTML = `
        <h3 class="liff__q">${num}号 / ${r.name}</h3>
        <p class="liff__sub">いつから、何泊にされますか？</p>
        <label class="liff__field">
          <span class="liff__field-k">チェックイン</span>
          <input type="date" id="liffCheckin" class="liff__input" value="${liff.draft.checkin}" min="${new Date().toISOString().slice(0,10)}">
        </label>
        <div class="liff__row">
          <label class="liff__field">
            <span class="liff__field-k">宿泊数</span>
            <select id="liffNights" class="liff__input">
              ${[1,2,3,4,5,7].map(n => `<option value="${n}" ${n===liff.draft.nights?'selected':''}>${n}泊</option>`).join('')}
            </select>
          </label>
          <label class="liff__field">
            <span class="liff__field-k">人数</span>
            <select id="liffGuests" class="liff__input">
              ${[1,2,3,4,5,6].map(n => `<option value="${n}" ${n===liff.draft.guests?'selected':''}>${n}名</option>`).join('')}
            </select>
          </label>
          <label class="liff__field">
            <span class="liff__field-k">料金/泊</span>
            <div class="liff__input" style="background:#f7f7f7; color:var(--accent); font-family:var(--display-en); font-style:italic; font-weight:600;">¥${r.price.toLocaleString()}</div>
          </label>
        </div>
        <button class="liff__cta" id="liffNext" type="button">確認へ進む</button>
        <button class="liff__back-link" type="button" id="liffBack">← 部屋を変える</button>
      `;
      body.appendChild(step);
      body.querySelector('#liffNext').addEventListener('click', () => {
        liff.draft.checkin = body.querySelector('#liffCheckin').value;
        liff.draft.nights = Number(body.querySelector('#liffNights').value);
        liff.draft.guests = Number(body.querySelector('#liffGuests').value);
        renderLiff('confirmDetails');
      });
      body.querySelector('#liffBack').addEventListener('click', () => renderLiff('selectRoom'));
    }

    else if (screen === 'confirmDetails') {
      const bldg = D.buildings.find((b) => b.id === liff.draft.buildingId);
      const room = D.rooms.find((r) => r.id === liff.draft.roomId);
      const total = room.price * liff.draft.nights;
      const co = new Date(liff.draft.checkin);
      co.setDate(co.getDate() + liff.draft.nights);

      const step = document.createElement('div');
      step.className = 'liff__step';
      step.innerHTML = `
        <h3 class="liff__q">この内容で予約します</h3>
        <div class="liff__summary">
          <dl>
            <dt>建屋</dt><dd>${bldg.name} · ${bldg.addrTown}</dd>
            <dt>客室</dt><dd>${room.no}号 / ${room.name}</dd>
            <dt>到着</dt><dd>${fmtDate(liff.draft.checkin)}</dd>
            <dt>出発</dt><dd>${fmtDate(co.toISOString().slice(0,10))} (${liff.draft.nights}泊)</dd>
            <dt>人数</dt><dd>${liff.draft.guests}名</dd>
            <dt>合計</dt><dd class="total">¥${total.toLocaleString()}</dd>
          </dl>
        </div>
        <label class="liff__field">
          <span class="liff__field-k">お名前</span>
          <input type="text" id="liffName" class="liff__input" value="${liff.draft.name}" placeholder="例) 田中">
        </label>
        <label class="liff__field">
          <span class="liff__field-k">お電話番号</span>
          <input type="tel" id="liffTel" class="liff__input" value="${liff.draft.tel}" placeholder="例) 090-1234-5678">
        </label>
        <label class="liff__field">
          <span class="liff__field-k">ご要望 (任意)</span>
          <textarea id="liffNote" class="liff__input liff__input--ta" placeholder="例) 自転車を一台貸してください">${liff.draft.note}</textarea>
        </label>
        <button class="liff__cta" id="liffConfirm" type="button">予約を確定する</button>
        <button class="liff__back-link" type="button" id="liffBack">← 日付を変える</button>
      `;
      body.appendChild(step);
      body.querySelector('#liffConfirm').addEventListener('click', () => {
        const name = body.querySelector('#liffName').value.trim();
        const tel = body.querySelector('#liffTel').value.trim();
        if (!name || !tel) {
          alert('お名前と電話番号をご入力ください');
          return;
        }
        liff.draft.name = name;
        liff.draft.tel = tel;
        liff.draft.note = body.querySelector('#liffNote').value.trim();
        confirmReservation();
      });
      body.querySelector('#liffBack').addEventListener('click', () => renderLiff('selectDate'));
    }

    else if (screen === 'done') {
      const resNo = ctx.resNo;
      const step = document.createElement('div');
      step.className = 'liff__step liff__done';
      step.innerHTML = `
        <div class="liff__stamp">承<br>諾</div>
        <h3>たしかに承りました</h3>
        <div class="liff__done-no">予約番号 ${resNo}</div>
        <p>${liff.draft.name} 様、ありがとうございます。<br>担当者から 24 時間以内に LINE のトークでご連絡いたします。</p>
        <p style="font-size:11px;">前日にチェックイン時刻と道順、当日に鍵の場所をお送りします。</p>
        <button class="liff__cta" id="liffCloseDone" type="button">トークに戻る</button>
      `;
      body.appendChild(step);
      body.querySelector('#liffCloseDone').addEventListener('click', closeLiff);
    }
  }

  function confirmReservation() {
    const resNo = 'A-' + String(Math.floor(Math.random() * 9000) + 1000);
    const rec = {
      resNo,
      buildingId: liff.draft.buildingId,
      roomId: liff.draft.roomId,
      checkin: liff.draft.checkin,
      nights: liff.draft.nights,
      guests: liff.draft.guests,
      name: liff.draft.name,
      tel: liff.draft.tel,
      note: liff.draft.note,
    };
    pushHistory(rec);
    liff.draft._completed = true;
    renderLiff('done', { resNo });

    // Bot push to chat (simulate after-close push)
    const bldg = D.buildings.find((b) => b.id === rec.buildingId);
    const room = D.rooms.find((r) => r.id === rec.roomId);
    const co = new Date(rec.checkin);
    co.setDate(co.getDate() + rec.nights);
    setTimeout(() => {
      addFlexBubble('ご予約 確定', {
        '予約番号': resNo,
        '建屋': bldg?.name || '',
        '客室': (room?.no || '') + '号',
        '到着': fmtDate(rec.checkin),
        '泊数': rec.nights + '泊',
        '合計': '¥' + (room.price * rec.nights).toLocaleString(),
      });
    }, 800);
  }

  // ===== LIFF triggers =====
  function setupLiff() {
    document.querySelectorAll('[data-close-liff]').forEach((b) => {
      b.addEventListener('click', closeLiff);
    });
    document.querySelectorAll('[data-liff-back]').forEach((b) => {
      b.addEventListener('click', () => {
        const back = {
          welcomeBack: null,
          selectHouse: loadHistory().length > 0 ? 'welcomeBack' : null,
          selectRoom: 'selectHouse',
          selectDate: 'selectRoom',
          confirmDetails: 'selectDate',
          done: null,
        };
        const to = back[liff.state];
        if (to) renderLiff(to, { history: loadHistory() });
        else closeLiff();
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && liff.el?.getAttribute('data-open') === 'true') {
        closeLiff();
      }
    });
  }

  // ===== Page-level =====
  function setupJumpToPhone() {
    document.querySelectorAll('[data-jump-phone]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.phone').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  // ===== Boot =====
  document.addEventListener('DOMContentLoaded', () => {
    bootChat();
    setupRichMenu();
    setupLiff();
    setupJumpToPhone();
  });
})();
