/* ARASHIMA HOTEL / 荒島ホテル
   - ヒーロースライダー auto cross-fade
   - ナビ scroll で stuck class
   - 予約バー submit → LIFF 起動 (フォーム値を draft に流し込み)
   - LIFF: 建屋/客室/連絡先/完了 (履歴があれば再予約画面)
*/

(function () {
  'use strict';

  const D = window.ARASHIMA_DATA;
  const HIST_KEY = 'arashima.history.v4';

  // ===== Hero slider =====
  function setupHeroSlider() {
    const slides = document.querySelectorAll('.hero__slide');
    const dots = document.querySelectorAll('.hero__dot');
    if (!slides.length) return;

    let idx = 0;
    function goto(n) {
      slides.forEach((s, i) => s.classList.toggle('is-on', i === n));
      dots.forEach((d, i) => d.classList.toggle('is-on', i === n));
      idx = n;
    }

    dots.forEach((d, i) => {
      d.addEventListener('click', () => goto(i));
    });

    let timer = setInterval(() => {
      goto((idx + 1) % slides.length);
    }, 5500);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearInterval(timer);
      else timer = setInterval(() => goto((idx + 1) % slides.length), 5500);
    });
  }

  // ===== Nav stuck on scroll =====
  function setupNavStuck() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const update = () => {
      nav.setAttribute('data-stuck', window.scrollY > 80 ? 'true' : 'false');
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // ===== Reserve bar form =====
  function setupReserveBar() {
    const form = document.getElementById('reserveBarForm');
    if (!form) return;

    const ci = document.getElementById('rbCheckin');
    if (ci) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      ci.value = d.toISOString().slice(0, 10);
      ci.min = new Date().toISOString().slice(0, 10);
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const preset = {
        checkin: ci?.value || null,
        nights: Number(document.getElementById('rbNights')?.value || 2),
        guests: Number(document.getElementById('rbGuests')?.value || 2),
        buildingId: document.getElementById('rbHouse')?.value || null,
      };
      openLiff({ preset });
    });
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

  function fmtDate(iso) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 (${'日月火水木金土'[d.getDay()]})`;
  }

  function openLiff(opts = {}) {
    if (!liff.el) {
      liff.el = document.getElementById('liff');
      liff.body = document.getElementById('liffBody');
    }
    liff.draft = {
      buildingId: opts.preset?.buildingId || null,
      roomId: opts.preset?.roomId || null,
      checkin: opts.preset?.checkin || defaultCheckin(),
      nights: opts.preset?.nights || 2,
      guests: opts.preset?.guests || 2,
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
    } else if (liff.draft.buildingId) {
      renderLiff('selectRoom');
    } else {
      renderLiff('selectHouse');
    }
  }

  function closeLiff() {
    if (!liff.el) return;
    liff.el.setAttribute('data-open', 'false');
    liff.el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
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
        <p class="liff__sub">商店街の真ん中の旅舎、城町の書斎付き學舎。</p>
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
        <button class="liff__cta" id="liffCloseDone" type="button">閉じる</button>
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
    renderLiff('done', { resNo });
  }

  function setupLiffTriggers() {
    document.querySelectorAll('[data-open-liff]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        openLiff();
      });
    });
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

  // ===== Boot =====
  document.addEventListener('DOMContentLoaded', () => {
    setupHeroSlider();
    setupNavStuck();
    setupReserveBar();
    setupLiffTriggers();
  });
})();
