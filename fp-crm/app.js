// FP顧客管理ツール デモ メインスクリプト
// シングルページ。ダッシュボード / 顧客一覧 / タイムライン / 顧客詳細モーダル。

(function () {
  const clients = window.DUMMY_CLIENTS;
  const TODAY = window.LifeEvents.TODAY;
  const LS_KEY = 'fp-crm-state-v1';

  // localStorage に保存済みの顧客があれば差し替え
  try {
    const raw = localStorage.getItem('fp-crm-clients-v1');
    if (raw) {
      const stored = JSON.parse(raw);
      if (Array.isArray(stored) && stored.length > 0) {
        clients.length = 0;
        stored.forEach(c => clients.push(c));
      }
    }
  } catch (e) {}

  const state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : { activeTab: 'dashboard', search: '', statusFilter: 'all', contactFilter: 'all', sortBy: 'contact-asc' };
    } catch (e) {
      return { activeTab: 'dashboard', search: '', statusFilter: 'all', contactFilter: 'all', sortBy: 'contact-asc' };
    }
  }
  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function fmtMoney(n) {
    if (n >= 100_000_000) return (n / 100_000_000).toFixed(2).replace(/\.?0+$/, '') + '億';
    if (n >= 10_000) return Math.round(n / 10_000).toLocaleString() + '万';
    return n.toLocaleString();
  }
  function fmtDate(d) {
    if (typeof d === 'string') d = new Date(d);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }
  function daysSince(d) {
    return Math.round((TODAY - new Date(d)) / (1000 * 60 * 60 * 24));
  }
  function statusLabel(s) {
    return { active: '管理中', important: '重点', new: '新規', dormant: '休眠' }[s] || s;
  }
  function priorityClass(p) {
    if (p >= 85) return 'high';
    if (p >= 65) return 'mid';
    return 'low';
  }
  function priorityLabel(p) {
    if (p >= 85) return '至急';
    if (p >= 65) return '今週';
    return '今月';
  }

  // ============================
  // タブ切替
  // ============================
  function activateTab(name) {
    state.activeTab = name;
    saveState();
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === name);
    });
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('active', v.dataset.view === name);
    });
    if (name === 'dashboard') renderDashboard();
    if (name === 'clients') renderClients();
    if (name === 'timeline') renderGlobalTimeline();
    // LINE系メインタブ昇格
    if (['leadHub', 'distributionHub', 'birthdayTab', 'calendarTab', 'settingsHub'].indexOf(name) >= 0) {
      if (window.LineApp) {
        if (!window._lineInited) {
          window.LineApp.init();
          window._lineInited = true;
        }
        window.LineApp.activateSubview(name);
      }
    }
  }

  // ============================
  // ダッシュボード
  // ============================
  function renderDashboard() {
    const totalClients = clients.length;
    const importantCount = clients.filter(c => c.status === 'important').length;
    const totalAum = clients.reduce((s, c) => s + (c.aum || 0), 0);

    // 3ヶ月以内の重要イベント数
    let upcoming3m = 0;
    clients.forEach(c => {
      const evs = window.LifeEvents.generate(c);
      evs.forEach(ev => {
        const days = (ev.date - TODAY) / (1000 * 60 * 60 * 24);
        if (days >= 0 && days <= 90 && ev.major) upcoming3m++;
      });
    });

    // 半年以上未接触
    const staleCount = clients.filter(c => daysSince(c.lastContact) >= 180).length;

    // 確定待ち件数 (LIVE → demo 補完)
    let surveys = [];
    try {
      // Cloud Run /api/bookings の cache from line-app (CRM ホームでも候補日確定待ちを案内)
      const liveSurveys = (window.LineAppLiveData && window.LineAppLiveData.survey_answers) || [];
      const hasLive = liveSurveys.some(s => s.q6_候補1 || s.q7_候補2 || s.q8_候補3);
      surveys = hasLive ? liveSurveys : (liveSurveys.concat(window.SURVEY_DEMO || []));
    } catch (e) {}
    const pendingConfirms = surveys.filter(s => !s.confirmedSlot && (s.q6_候補1 || s.q7_候補2 || s.q8_候補3)).length;

    const noticeArea = document.getElementById('notice-area');
    if (noticeArea) {
      if (pendingConfirms > 0) {
        noticeArea.innerHTML = `
          <a href="#" data-jump="leadHub" style="display:block;background:linear-gradient(135deg,#fff8e1,#fff);border:2px solid #f0d36b;border-radius:12px;padding:18px 22px;margin-bottom:22px;text-decoration:none;color:inherit;box-shadow:var(--shadow-sm);">
            <div style="display:flex;align-items:center;gap:18px;">
              <div style="font-size:38px;line-height:1;">📅</div>
              <div style="flex:1;">
                <div style="font-family:'Noto Sans JP',sans-serif;font-size:15.5px;font-weight:700;color:#8a6f1e;letter-spacing:0.02em;">候補日確定待ち ${pendingConfirms} 件</div>
                <div style="font-size:12.5px;color:var(--ink-2);margin-top:3px;letter-spacing:0.01em;">公式LINEからアンケート+候補日3つを回答くれたお客様。「🆕 新規相談」タブで1つタップで確定 → Zoom URL自動発行 + LINE通知 + カレンダー登録 が一括で動きます。</div>
              </div>
              <div style="color:#8a6f1e;font-size:22px;font-weight:700;">→</div>
            </div>
          </a>`;
        noticeArea.querySelector('[data-jump]').addEventListener('click', (e) => {
          e.preventDefault();
          activateTab('leadHub');
        });
      } else {
        noticeArea.innerHTML = '';
      }
    }

    // SVG icons (line-art, currentColor)
    const icoUsers = '<svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
    const icoCalendar = '<svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    const icoAlert = '<svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    const icoCoin = '<svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';

    document.getElementById('kpi-area').innerHTML = `
      <div class="kpi" data-tone="neutral">
        <div class="kpi-label">${icoUsers}<span>顧客総数</span><span class="kpi-delta kpi-delta-up">+2</span></div>
        <div class="kpi-value">${totalClients}<span class="unit">名</span></div>
        <div class="kpi-sub">うち重点 ${importantCount} 名</div>
        <canvas class="kpi-spark" data-spark="clients"></canvas>
      </div>
      <div class="kpi" data-tone="${upcoming3m > 0 ? 'warn' : 'neutral'}">
        <div class="kpi-label">${icoCalendar}<span>直近3ヶ月のイベント</span></div>
        <div class="kpi-value">${upcoming3m}<span class="unit">件</span></div>
        <div class="kpi-sub">大学入学 / 退職 / 相続 ほか</div>
        <canvas class="kpi-spark" data-spark="events"></canvas>
      </div>
      <div class="kpi" data-tone="${staleCount > 5 ? 'critical' : (staleCount > 0 ? 'warn' : 'positive')}">
        <div class="kpi-label">${icoAlert}<span>半年以上未接触</span><span class="kpi-delta kpi-delta-down">要対応</span></div>
        <div class="kpi-value">${staleCount}<span class="unit">名</span></div>
        <div class="kpi-sub">フォロー対象</div>
        <canvas class="kpi-spark" data-spark="stale"></canvas>
      </div>
      <div class="kpi" data-tone="neutral">
        <div class="kpi-label">${icoCoin}<span>管理資産総額</span><span class="kpi-delta kpi-delta-up">+3.2%</span></div>
        <div class="kpi-value">¥${fmtMoney(totalAum)}</div>
        <div class="kpi-sub">平均 ¥${fmtMoney(Math.round(totalAum / totalClients))}/名</div>
        <canvas class="kpi-spark" data-spark="aum"></canvas>
      </div>
    `;
    if (window.FPCharts && window.FPCharts.renderSparklines) window.FPCharts.renderSparklines();

    // 今週話すべき客 (top 8) — シニア向け統一カード (KPIバッジ + やる事 + 2ボタン)
    const tops = window.Recommender.topAcrossClients(clients, 8);
    const list = document.getElementById('action-list');
    if (tops.length === 0) {
      list.innerHTML = '<div class="empty">今週の重点アクションはありません</div>';
      return;
    }

    const todayDate = window.LifeEvents.TODAY;
    const fmtMoneyAum = (v) => v >= 100000000 ? `¥${(v/100000000).toFixed(2)}億` : `¥${Math.round(v/10000).toLocaleString()}万`;

    // 各客に該当する KPI を判定
    function getClientKpis(c) {
      const days = Math.floor((todayDate - new Date(c.lastContact)) / 86400000);
      const kpis = [];
      // キャンセル後フォロー (30日以内)
      const lastCancel = (c.cancellations || []).slice().sort((a,b) => new Date(b.date) - new Date(a.date))[0];
      if (lastCancel && Math.floor((todayDate - new Date(lastCancel.date)) / 86400000) <= 30) {
        kpis.push({ id: 'cancel', label: 'キャンセル後フォロー', tone: 'critical' });
      }
      // 提案検討中 (30日以上)
      const stalled = (c.proposals || []).slice().reverse().find(p => (p.result === '検討中' || p.result === '提案中') && Math.floor((todayDate - new Date(p.date)) / 86400000) >= 30);
      if (stalled) {
        kpis.push({ id: 'stalled', label: '提案クロージング', tone: 'warn' });
      }
      // イベント先取り (60日以内 major)
      const evs = window.LifeEvents.generate(c) || [];
      const nearMajor = evs.find(ev => {
        const d = (ev.date - todayDate) / 86400000;
        return ev.major && d >= 0 && d <= 60;
      });
      if (nearMajor && days >= 21) {
        kpis.push({ id: 'event', label: 'イベント先取り', tone: 'warn' });
      }
      // 休眠
      if (c.status === 'dormant' || days >= 180) {
        kpis.push({ id: 'dormant', label: '休眠の再エンゲージ', tone: 'critical' });
      }
      // 月1接触 (30日以上未接触・非休眠)
      if (kpis.length === 0 && days >= 30 && c.status !== 'dormant') {
        kpis.push({ id: 'untouched', label: '月1接触', tone: 'warn' });
      }
      return kpis;
    }

    const briefCardHtml = (t, rank) => {
      const c = t.client;
      const p = t.topAction.priority;
      const initial = (c.name || '?').replace(/\s+/g, '').slice(0, 1);
      const days = Math.max(0, Math.floor((todayDate - new Date(c.lastContact)) / 86400000));
      const age = window.LifeEvents.currentAge(c);

      // Find next upcoming event
      const evs = window.LifeEvents.generate(c);
      const futureEv = evs.find(ev => new Date(ev.date) >= todayDate);
      const nextEvent = futureEv ? {
        title: futureEv.title || futureEv.kind || futureEv.name || 'イベント',
        rel: window.LifeEvents.formatRelative(new Date(futureEv.date))
      } : null;

      const priorityLabelText = priorityLabel(p);
      const priorityCls = priorityClass(p);

      const kpis = getClientKpis(c);
      const kpiBadgeHtml = kpis.map(k => `<span class="senior-kpi-badge senior-kpi-${k.tone}"><i data-lucide="target"></i>${escapeHtml(k.label)}</span>`).join('');

      const isTop = rank === 0;

      return `
        <div class="senior-card ${isTop ? 'senior-card-top' : ''}" data-client-id="${c.id}">
          <div class="senior-card-rank">${rank + 1}</div>
          <div class="senior-card-head">
            <div class="senior-card-avatar">${initial}</div>
            <div class="senior-card-id">
              <div class="senior-card-name">${escapeHtml(c.name)} <span class="senior-card-honor">様</span></div>
              <div class="senior-card-sub">${age}歳 ・ ${escapeHtml(c.occupation || '—')} ・ AUM ${fmtMoneyAum(c.aum)}</div>
            </div>
          </div>

          <div class="senior-card-kpi">
            <div class="senior-kpi-label">この方に必要なフォロー</div>
            <div class="senior-kpi-badges">${kpiBadgeHtml || '<span class="senior-kpi-badge senior-kpi-info"><i data-lucide="info"></i>定期フォロー</span>'}</div>
          </div>

          <div class="senior-card-action">
            <div class="senior-action-label">やる事</div>
            <div class="senior-action-text">${escapeHtml(t.topAction.action)}</div>
            <div class="senior-action-reason">${escapeHtml(t.topAction.reason)}</div>
            ${nextEvent ? `<div class="senior-action-event">📅 次のイベント: <strong>${escapeHtml(nextEvent.title)}</strong> (${escapeHtml(nextEvent.rel)})</div>` : ''}
            <div class="senior-action-contact">⏰ 最終接触: <strong>${days}日前</strong></div>
          </div>

          <div class="senior-card-buttons">
            <button class="senior-btn senior-btn-primary" data-brief-open="${c.id}">
              <i data-lucide="message-square-text"></i>
              <span>文面を作って送る</span>
            </button>
            <button class="senior-btn senior-btn-secondary" data-brief-detail="${c.id}">
              <i data-lucide="user-round"></i>
              <span>この方の詳細を見る</span>
            </button>
          </div>
        </div>`;
    };

    list.innerHTML = `
      <div class="senior-stack">
        ${tops.map((t, i) => briefCardHtml(t, i)).join('')}
      </div>
    `;
    const cnt = document.getElementById('senior-counter');
    if (cnt) cnt.textContent = tops.length + ' 名';

    // Wire actions
    list.querySelectorAll('[data-brief-open], [data-brief-detail]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.briefOpen || btn.dataset.briefDetail;
        openClientModal(id);
      });
    });
    list.querySelectorAll('[data-brief-snooze]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.brief-card, .brief-compact');
        if (card) { card.style.opacity = '0.3'; card.style.pointerEvents = 'none'; }
      });
    });
    list.querySelectorAll('.brief-card, .brief-compact').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        openClientModal(card.dataset.clientId);
      });
    });
    list.querySelectorAll('.action-item').forEach(el => {
      el.addEventListener('click', () => openClientModal(el.dataset.clientId));
    });
  }

  // ============================
  // 顧客フォーム (新規/編集)
  // ============================
  function openClientForm(clientId) {
    const isNew = !clientId;
    const c = isNew ? {
      id: 'c' + String(Date.now()).slice(-5),
      name: '', kana: '', birth: '', gender: 'M',
      occupation: '', family: [], source: '',
      status: 'new', aum: 0, lastContact: TODAY.toISOString().slice(0, 10),
      proposals: [], note: '',
      lineFriendId: '', lineSubscribed: false,
    } : JSON.parse(JSON.stringify(clients.find(x => x.id === clientId)));

    function familyRowHtml(m, idx) {
      return `
        <div class="family-row" data-fidx="${idx}">
          <select data-f="rel">
            <option value="spouse" ${m.rel === 'spouse' ? 'selected' : ''}>配偶者</option>
            <option value="child" ${m.rel === 'child' ? 'selected' : ''}>お子様</option>
            <option value="parent" ${m.rel === 'parent' ? 'selected' : ''}>親</option>
          </select>
          <input type="text" placeholder="お名前" data-f="name" value="${escapeHtml(m.name || '')}">
          <input type="date" data-f="birth" value="${m.birth || ''}">
          <button class="ghost del-family">×</button>
        </div>
      `;
    }

    const html = `
      <div class="modal-header">
        <h2>${isNew ? '新規顧客の登録' : '顧客情報の編集'}</h2>
        <button class="modal-close" id="form-close-btn">×</button>
      </div>
      <div class="modal-body">
        <div class="form-section">
          <h3>基本情報</h3>
          <div class="form-grid">
            <div class="form-row"><label>お名前 *</label><input type="text" id="f-name" value="${escapeHtml(c.name)}" placeholder="例: 田中 健一"></div>
            <div class="form-row"><label>フリガナ</label><input type="text" id="f-kana" value="${escapeHtml(c.kana)}" placeholder="たなか けんいち"></div>
            <div class="form-row"><label>生年月日 *</label><input type="date" id="f-birth" value="${c.birth || ''}"></div>
            <div class="form-row"><label>性別</label>
              <select id="f-gender">
                <option value="M" ${c.gender === 'M' ? 'selected' : ''}>男性</option>
                <option value="F" ${c.gender === 'F' ? 'selected' : ''}>女性</option>
                <option value="O" ${c.gender === 'O' ? 'selected' : ''}>その他</option>
              </select>
            </div>
            <div class="form-row"><label>職業</label><input type="text" id="f-occupation" value="${escapeHtml(c.occupation)}" placeholder="例: 会社員 (IT)"></div>
            <div class="form-row"><label>流入経路</label><input type="text" id="f-source" value="${escapeHtml(c.source)}" placeholder="例: 紹介・セミナー・Instagram"></div>
            <div class="form-row"><label>ステータス</label>
              <select id="f-status">
                <option value="new" ${c.status === 'new' ? 'selected' : ''}>新規</option>
                <option value="active" ${c.status === 'active' ? 'selected' : ''}>管理中</option>
                <option value="important" ${c.status === 'important' ? 'selected' : ''}>重点</option>
                <option value="dormant" ${c.status === 'dormant' ? 'selected' : ''}>休眠</option>
              </select>
            </div>
            <div class="form-row"><label>管理資産 (円)</label><input type="number" id="f-aum" value="${c.aum || 0}" step="100000"></div>
            <div class="form-row"><label>最終接触日</label><input type="date" id="f-last-contact" value="${c.lastContact || ''}"></div>
          </div>
        </div>

        <div class="form-section">
          <h3>家族構成 <button class="ghost" id="add-family-btn" style="margin-left:8px;">+ 追加</button></h3>
          <div id="family-list">
            ${(c.family || []).map((m, i) => familyRowHtml(m, i)).join('')}
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:6px;">家族の生年月日を入れると、進学・退職などのライフイベントが自動でタイムラインに展開されます。</div>
        </div>

        <div class="form-section">
          <h3>住宅ローン (任意)</h3>
          <div class="form-grid">
            <div class="form-row"><label>残り年数</label><input type="number" id="f-mort-years" value="${c.mortgage ? c.mortgage.remainingYears : ''}" placeholder="例: 25"></div>
            <div class="form-row"><label>月返済額 (円)</label><input type="number" id="f-mort-monthly" value="${c.mortgage ? c.mortgage.monthly : ''}" step="1000" placeholder="例: 95000"></div>
          </div>
        </div>

        <div class="form-section">
          <h3>LINE公式連携</h3>
          <div class="form-grid">
            <div class="form-row"><label>LINE friend ID</label><input type="text" id="f-line-id" value="${escapeHtml(c.lineFriendId || '')}" placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"></div>
            <div class="form-row"><label>連携状態</label>
              <label class="toggle-switch" style="margin-top:4px;">
                <input type="checkbox" id="f-line-sub" ${c.lineSubscribed ? 'checked' : ''}><span></span>
              </label>
              <div style="font-size:11px;color:var(--muted);margin-top:3px;">ONで配信対象に含まれます</div>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>メモ</h3>
          <textarea id="f-note" rows="3" style="width:100%;resize:vertical;">${escapeHtml(c.note || '')}</textarea>
        </div>

        <div style="display:flex;gap:8px;margin-top:18px;">
          <button class="primary" id="form-save-btn">${isNew ? '登録' : '保存'}</button>
          <button id="form-cancel-btn">キャンセル</button>
          ${!isNew ? '<button id="form-delete-btn" style="margin-left:auto;border-color:var(--red);color:var(--red);">削除</button>' : ''}
        </div>
      </div>
    `;
    document.getElementById('form-content').innerHTML = html;
    document.getElementById('form-overlay').style.display = 'flex';

    let familyList = (c.family || []).slice();

    function rerenderFamily() {
      document.getElementById('family-list').innerHTML =
        familyList.map((m, i) => familyRowHtml(m, i)).join('');
      bindFamilyEvents();
    }
    function bindFamilyEvents() {
      document.querySelectorAll('.family-row').forEach(row => {
        const idx = parseInt(row.dataset.fidx, 10);
        row.querySelectorAll('[data-f]').forEach(input => {
          input.addEventListener('change', () => {
            familyList[idx][input.dataset.f] = input.value;
          });
        });
        row.querySelector('.del-family').addEventListener('click', () => {
          familyList.splice(idx, 1);
          rerenderFamily();
        });
      });
    }
    bindFamilyEvents();

    document.getElementById('add-family-btn').addEventListener('click', () => {
      familyList.push({ rel: 'child', name: '', birth: '' });
      rerenderFamily();
    });

    function close() { document.getElementById('form-overlay').style.display = 'none'; }
    document.getElementById('form-close-btn').addEventListener('click', close);
    document.getElementById('form-cancel-btn').addEventListener('click', close);

    document.getElementById('form-save-btn').addEventListener('click', () => {
      const name = document.getElementById('f-name').value.trim();
      const birth = document.getElementById('f-birth').value;
      if (!name || !birth) {
        alert('お名前と生年月日は必須です');
        return;
      }
      c.name = name;
      c.kana = document.getElementById('f-kana').value;
      c.birth = birth;
      c.gender = document.getElementById('f-gender').value;
      c.occupation = document.getElementById('f-occupation').value;
      c.source = document.getElementById('f-source').value;
      c.status = document.getElementById('f-status').value;
      c.aum = parseInt(document.getElementById('f-aum').value, 10) || 0;
      c.lastContact = document.getElementById('f-last-contact').value;
      c.note = document.getElementById('f-note').value;
      c.lineFriendId = document.getElementById('f-line-id').value;
      c.lineSubscribed = document.getElementById('f-line-sub').checked;
      const mortYears = parseInt(document.getElementById('f-mort-years').value, 10);
      const mortMonthly = parseInt(document.getElementById('f-mort-monthly').value, 10);
      if (mortYears && mortMonthly) {
        c.mortgage = { remainingYears: mortYears, monthly: mortMonthly };
      } else {
        delete c.mortgage;
      }
      c.family = familyList.filter(f => f.name && f.birth);

      if (isNew) {
        clients.push(c);
      } else {
        const idx = clients.findIndex(x => x.id === clientId);
        if (idx >= 0) clients[idx] = c;
      }
      saveClientsToLS();
      close();
      // モーダルが開いていれば閉じる
      document.getElementById('modal-overlay').style.display = 'none';
      activateTab(state.activeTab);
    });

    const delBtn = document.getElementById('form-delete-btn');
    if (delBtn) delBtn.addEventListener('click', () => {
      if (!confirm('この顧客を削除しますか?')) return;
      const idx = clients.findIndex(x => x.id === clientId);
      if (idx >= 0) clients.splice(idx, 1);
      saveClientsToLS();
      close();
      document.getElementById('modal-overlay').style.display = 'none';
      activateTab(state.activeTab);
    });
  }

  function saveClientsToLS() {
    try { localStorage.setItem('fp-crm-clients-v1', JSON.stringify(clients)); } catch (e) {}
  }
  function loadClientsFromLS() {
    try {
      const raw = localStorage.getItem('fp-crm-clients-v1');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  // LINE 実アクション (lastActionAt + pictureUrl) で顧客のフィールドを上書き
  function mergeLineActivity() {
    const liveUsers = (window.LineAppLiveData && window.LineAppLiveData.users) || [];
    if (liveUsers.length === 0) return;
    const byUid = {};
    liveUsers.forEach(u => { if (u.userId) byUid[u.userId] = u; });
    clients.forEach(c => {
      const u = byUid[c.lineFriendId];
      if (!u) return;
      const liveTs = u.lastActionAt || u.addedAt;
      if (liveTs) {
        const liveDate = String(liveTs).slice(0, 10);
        if (!c.lastContact || liveDate > c.lastContact) {
          c.lastContact = liveDate;
          c.lastActionType = u.lastActionType || '';
        }
      }
      if (u.pictureUrl) c.linePictureUrl = u.pictureUrl;
    });
  }

  // ============================
  // 顧客一覧
  // ============================
  // line-app.js から呼ばれる: 顧客台帳の再描画
  window.FPCrmRefreshClients = function() { renderClients(); };

  function renderContactFilterTabs(buckets) {
    let bar = document.getElementById('contact-filter-bar');
    if (!bar) {
      // 顧客台帳のトップに動的に挿入
      const toolbar = document.querySelector('.client-toolbar');
      if (!toolbar) return;
      bar = document.createElement('div');
      bar.id = 'contact-filter-bar';
      bar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px;padding:10px 12px;background:linear-gradient(135deg,#fafbfc,#f1f5f9);border:1px solid var(--line);border-radius:10px;align-items:center;';
      bar.innerHTML = '<span style="font-size:11px;color:var(--muted);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-right:6px;">📞 最終接触</span>';
      toolbar.parentNode.insertBefore(bar, toolbar);
    }
    const tabs = [
      { v: 'all', label: '全て', count: buckets.all, color: '' },
      { v: 'lt30', label: '〜30日', count: buckets.lt30, color: '#06c755' },
      { v: 'lt90', label: '31〜90日', count: buckets.lt90, color: '#0ea5e9' },
      { v: 'lt180', label: '91〜180日', count: buckets.lt180, color: '#f59e0b' },
      { v: 'lt365', label: '181〜365日', count: buckets.lt365, color: '#f97316' },
      { v: 'gt365', label: '1年以上 未接触', count: buckets.gt365, color: '#d9264c' },
    ];
    bar.innerHTML = '<span style="font-size:11px;color:var(--muted);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-right:6px;">📞 最終接触</span>' +
      tabs.map(t => {
        const active = (state.contactFilter || 'all') === t.v;
        const bg = active ? (t.color || '#1f2937') : '#fff';
        const fg = active ? '#fff' : (t.color || '#374151');
        const bd = active ? bg : '#e5e7eb';
        return `<button data-cfilter="${t.v}" style="font-size:12px;padding:6px 12px;border-radius:18px;background:${bg};color:${fg};border:1.5px solid ${bd};cursor:pointer;font-weight:${active?'700':'500'};font-family:inherit;transition:all 0.15s;">${t.label} <span style="font-size:11px;opacity:0.85;margin-left:2px;">(${t.count})</span></button>`;
      }).join('');
    bar.querySelectorAll('[data-cfilter]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.contactFilter = btn.dataset.cfilter;
        saveState();
        renderClients();
      });
    });
  }

  function renderClients() {
    const searchEl = document.getElementById('client-search');
    const filterEl = document.getElementById('status-filter');
    if (searchEl.value !== state.search) searchEl.value = state.search;
    if (filterEl.value !== state.statusFilter) filterEl.value = state.statusFilter;

    mergeLineActivity();
    const q = state.search.trim().toLowerCase();
    let list = clients.slice();
    if (state.statusFilter !== 'all') {
      list = list.filter(c => c.status === state.statusFilter);
    }
    if (q) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.kana.includes(q) ||
        (c.occupation || '').toLowerCase().includes(q)
      );
    }
    // 最終接触フィルタ
    if (state.contactFilter && state.contactFilter !== 'all') {
      list = list.filter(c => {
        const d = daysSince(c.lastContact);
        if (state.contactFilter === 'lt30') return d <= 30;
        if (state.contactFilter === 'lt90') return d > 30 && d <= 90;
        if (state.contactFilter === 'lt180') return d > 90 && d <= 180;
        if (state.contactFilter === 'lt365') return d > 180 && d <= 365;
        if (state.contactFilter === 'gt365') return d > 365;
        return true;
      });
    }
    // 並び替え
    const statusRank = { important: 0, active: 1, new: 2, dormant: 3 };
    const sortMode = state.sortBy || 'contact-asc';
    const sorter = {
      'contact-desc': (a, b) => daysSince(b.lastContact) - daysSince(a.lastContact),
      'contact-asc':  (a, b) => daysSince(a.lastContact) - daysSince(b.lastContact),
      'aum-desc':     (a, b) => (b.aum || 0) - (a.aum || 0),
      'aum-asc':      (a, b) => (a.aum || 0) - (b.aum || 0),
      'age-desc':     (a, b) => window.LifeEvents.currentAge(b) - window.LifeEvents.currentAge(a),
      'age-asc':      (a, b) => window.LifeEvents.currentAge(a) - window.LifeEvents.currentAge(b),
      'name-asc':     (a, b) => String(a.kana || a.name || '').localeCompare(String(b.kana || b.name || ''), 'ja'),
      'status':       (a, b) => (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9),
      'event-near':   (a, b) => {
        const ea = window.LifeEvents.generate(a)[0];
        const eb = window.LifeEvents.generate(b)[0];
        const da = ea ? new Date(ea.date).getTime() : Infinity;
        const db = eb ? new Date(eb.date).getTime() : Infinity;
        return da - db;
      },
    }[sortMode] || ((a, b) => 0);
    list.sort(sorter);
    // sortBy セレクトに現状値反映
    const sortEl = document.getElementById('sort-by');
    if (sortEl && sortEl.value !== sortMode) sortEl.value = sortMode;

    // 各バケットのカウント (フィルタ前の母集団から)
    const buckets = { all: clients.length, lt30: 0, lt90: 0, lt180: 0, lt365: 0, gt365: 0 };
    clients.forEach(c => {
      const d = daysSince(c.lastContact);
      if (d <= 30) buckets.lt30++;
      else if (d <= 90) buckets.lt90++;
      else if (d <= 180) buckets.lt180++;
      else if (d <= 365) buckets.lt365++;
      else buckets.gt365++;
    });
    renderContactFilterTabs(buckets);

    document.getElementById('client-count').textContent = `${list.length} / ${clients.length} 名`;

    const tbody = document.getElementById('client-tbody');
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">該当する顧客がいません</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(c => {
      const dslRaw = daysSince(c.lastContact);
      const dsl = Math.max(0, dslRaw); // 負の値 (未来日) は 0扱い
      const contactCls = dsl >= 365 ? 'contact-stale' : (dsl >= 180 ? 'contact-warn' : '');
      // 接触経過のラベル
      const contactBg = dsl <= 30 ? '#dcfce7' : (dsl <= 90 ? '#dbeafe' : (dsl <= 180 ? '#fef3c7' : (dsl <= 365 ? '#fed7aa' : '#fecaca')));
      const contactFg = dsl <= 30 ? '#166534' : (dsl <= 90 ? '#1e40af' : (dsl <= 180 ? '#92400e' : (dsl <= 365 ? '#9a3412' : '#991b1b')));
      const contactLabel = dsl <= 30 ? '直近' : (dsl <= 90 ? '3ヶ月以内' : (dsl <= 180 ? '半年以内' : (dsl <= 365 ? '1年以内' : '1年超')));
      const dayDisplay = dslRaw < 0 ? `${Math.abs(dslRaw)}日後 予定` : (dslRaw === 0 ? '今日' : `${dslRaw}日前`);
      // localStorage に保存されたタスク件数
      const taskCount = (JSON.parse(localStorage.getItem('fp-tasks-' + (c.lineFriendId || c.id)) || '[]')).length;
      const childCount = (c.family || []).filter(m => m.rel === 'child').length;
      const familyTxt = childCount > 0 ? `配偶者+子${childCount}` :
        ((c.family || []).find(m => m.rel === 'spouse') ? '夫婦' : '単身');
      const initial = (c.name || '?').replace(/\s+/g, '').slice(0, 1);
      const hue = (initial.charCodeAt(0) || 0) % 360;
      return `
        <tr data-client-id="${c.id}">
          <td>
            <div class="client-row-name">
              ${c.linePictureUrl
                ? `<span class="avatar avatar-sm" style="position:relative;padding:0;background:none;border:1.5px solid #06c755;overflow:visible;"><img src="${escapeHtml(c.linePictureUrl)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentNode.innerHTML='${escapeHtml(initial)}';this.parentNode.style.background='hsl('+${hue}+',60%,55%)';this.parentNode.style.color='#fff';"><span title="LINE友だち" style="position:absolute;bottom:-3px;right:-3px;background:#06c755;color:#fff;width:14px;height:14px;border-radius:50%;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;font-family:inherit;">L</span></span>`
                : `<span class="avatar avatar-sm" style="--avh:${hue};position:relative;">${escapeHtml(initial)}${c.lineFriendId ? '<span title="LINE友だち" style="position:absolute;bottom:-3px;right:-3px;background:#06c755;color:#fff;width:14px;height:14px;border-radius:50%;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;font-family:inherit;">L</span>' : ''}</span>`}
              <div>
                <strong>${escapeHtml(c.name)}</strong>${c.lineFriendId ? '<span style="font-size:9.5px;color:#06c755;font-weight:700;margin-left:5px;background:#dcfce7;padding:1px 5px;border-radius:6px;letter-spacing:0.05em;">LINE</span>' : ''}
                <div style="font-size:11px;color:var(--muted);letter-spacing:0.02em;">${escapeHtml(c.kana)}</div>
              </div>
            </div>
          </td>
          <td>${window.LifeEvents.currentAge(c)}</td>
          <td class="hide-mobile">${escapeHtml(c.occupation)}</td>
          <td>${familyTxt}</td>
          <td><span class="status-pill ${c.status}">${statusLabel(c.status)}</span>${taskCount > 0 ? `<button class="fp-task-badge" data-task-cid="${escapeHtml(c.lineFriendId || c.id)}" data-task-name="${escapeHtml(c.name)}" style="display:inline-block;margin-left:6px;font-size:10px;background:#fff8e1;color:#a08537;padding:2px 7px;border-radius:9px;font-weight:700;border:1px solid #f0d36b;cursor:pointer;font-family:inherit;" title="タスク一覧を見る">📝${taskCount}</button>` : ''}</td>
          <td class="num">¥${fmtMoney(c.aum)}</td>
          <td class="${contactCls}"><div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start;"><span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:${contactBg};color:${contactFg};">${contactLabel}</span><span style="font-size:11px;color:var(--muted);">${dayDisplay}</span>${c.lastActionType ? `<span style="font-size:9.5px;color:var(--accent);font-weight:600;">📱 LINE: ${escapeHtml((c.lastActionType||'').split(':')[0])}</span>` : ''}</div></td>
        </tr>
      `;
    }).join('');
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.closest('.fp-task-badge')) return; // バッジクリックは別処理
        openClientModal(tr.dataset.clientId);
      });
    });
    tbody.querySelectorAll('.fp-task-badge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openTasksListModal(btn.dataset.taskCid, btn.dataset.taskName);
      });
    });
  }

  // 顧客のタスク一覧を表示
  function openTasksListModal(customerKey, customerName) {
    const tasksKey = 'fp-tasks-' + customerKey;
    const tasks = JSON.parse(localStorage.getItem(tasksKey) || '[]');
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff;width:min(720px,100%);max-height:90vh;overflow-y:auto;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,0.35);">
        <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:baseline;">
          <h2 style="margin:0;font-family:'Noto Serif JP',serif;font-size:20px;">📝 ${escapeHtml(customerName)}様 のタスク一覧 (${tasks.length}件)</h2>
          <button id="fp-tl-close" style="font-size:18px;width:32px;height:32px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;color:#6b7280;font-family:inherit;">✕</button>
        </div>
        <div style="padding:18px 24px;">
          ${tasks.length === 0 ? '<div style="text-align:center;color:#9ca3af;padding:30px;">タスクなし</div>' :
            '<div style="display:grid;gap:8px;">' + tasks.sort((a,b) => (a.due||'').localeCompare(b.due||'')).map((t,i) => `
              <div style="display:grid;grid-template-columns:36px 90px 1fr 130px 32px;gap:10px;align-items:center;padding:10px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;">
                <span style="font-size:18px;">${t.icon || '✅'}</span>
                <span style="font-size:10.5px;font-weight:700;background:${t.priority==='至急'?'#fef2f2;color:#b91c3c':(t.priority==='今週'||t.priority==='2週間以内')?'#fff7ed;color:#c2410c':'#f0f9ff;color:#075985'};padding:4px 9px;border-radius:11px;text-align:center;">${t.priority||'-'}</span>
                <span style="font-size:13px;">${escapeHtml(t.task||'')}</span>
                <span style="font-size:11px;color:#6b7280;text-align:right;">${t.due||'-'}</span>
                <button class="fp-task-del" data-idx="${i}" title="削除" style="background:#fff;border:1px solid #fecaca;color:#b91c3c;width:26px;height:26px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:12px;">✕</button>
              </div>
            `).join('') + '</div>'
          }
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#fp-tl-close').addEventListener('click', () => overlay.remove());
    overlay.querySelectorAll('.fp-task-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const arr = JSON.parse(localStorage.getItem(tasksKey) || '[]');
        arr.splice(idx, 1);
        localStorage.setItem(tasksKey, JSON.stringify(arr));
        overlay.remove();
        openTasksListModal(customerKey, customerName);
        renderClients();
      });
    });
  }

  // ============================
  // 全体タイムライン (月別グループ縦リスト)
  // ============================
  function renderGlobalTimeline() {
    const rangeOpt = state.timelineRange || '12m';
    const catOpt = state.timelineCat || 'all';

    const RANGE_MS = {
      '6m': 180 * 86400 * 1000,
      '12m': 365 * 86400 * 1000,
      '36m': 365 * 86400 * 1000 * 3,
      '120m': 365 * 86400 * 1000 * 10,
      'all': 365 * 86400 * 1000 * 30,
    };
    const horizonMs = RANGE_MS[rangeOpt] || RANGE_MS['12m'];
    const horizonDate = new Date(TODAY.getTime() + horizonMs);

    // 全顧客のイベントを1つの配列に集める (休眠も含む)
    const allEvents = [];
    clients.forEach(c => {
      const evs = window.LifeEvents.generate(c);
      evs.forEach(ev => {
        if (ev.date <= horizonDate && (catOpt === 'all' || ev.cat === catOpt)) {
          allEvents.push({ ...ev, client: c });
        }
      });
    });
    allEvents.sort((a, b) => a.date - b.date);

    // カテゴリピル
    const cats = [
      { key: 'all', label: 'すべて' },
      { key: 'education', label: '教育' },
      { key: 'retirement', label: '退職・年金' },
      { key: 'health', label: '医療・介護' },
      { key: 'inherit', label: '相続' },
      { key: 'finance', label: '金融' },
      { key: 'family', label: '家族' },
    ];
    const ranges = [
      { key: '6m', label: '半年以内' },
      { key: '12m', label: '1年以内' },
      { key: '36m', label: '3年以内' },
      { key: '120m', label: '10年以内' },
      { key: 'all', label: '全期間' },
    ];

    const toolbarHtml = `
      <div class="tl-toolbar">
        <div class="tl-toolbar-row">
          <span class="tl-label">期間:</span>
          ${ranges.map(r => `<button class="tl-pill ${r.key === rangeOpt ? 'on' : ''}" data-range="${r.key}">${r.label}</button>`).join('')}
        </div>
        <div class="tl-toolbar-row">
          <span class="tl-label">分類:</span>
          ${cats.map(c => `<button class="tl-pill cat-${c.key} ${c.key === catOpt ? 'on' : ''}" data-cat="${c.key}">${c.label}</button>`).join('')}
          <span class="tl-count">該当 ${allEvents.length} 件</span>
        </div>
      </div>
    `;

    // 月別グループ
    const byMonth = {};
    allEvents.forEach(ev => {
      const key = `${ev.date.getFullYear()}-${String(ev.date.getMonth() + 1).padStart(2, '0')}`;
      (byMonth[key] = byMonth[key] || []).push(ev);
    });

    const monthsHtml = Object.keys(byMonth).sort().map(key => {
      const [y, m] = key.split('-');
      const monthEvents = byMonth[key];
      const cardsHtml = monthEvents.map(ev => `
        <div class="tl-card" data-client-id="${ev.client.id}">
          <div class="tl-card-bar cat-${ev.cat}${ev.major ? ' major' : ''}"></div>
          <div class="tl-card-body">
            <div class="tl-card-head">
              <span class="tl-card-date">${ev.date.getMonth() + 1}/${ev.date.getDate()}</span>
              <span class="tl-card-label">${escapeHtml(ev.label)}${ev.major ? ' <span class="tl-major-tag">重要</span>' : ''}</span>
            </div>
            <div class="tl-card-sub">
              <span class="tl-card-client">${escapeHtml(ev.client.name)} (${window.LifeEvents.currentAge(ev.client)}歳)</span>
              <span class="tl-card-who">対象: ${escapeHtml(ev.who)}</span>
            </div>
          </div>
          <div class="tl-card-cta">→</div>
        </div>
      `).join('');

      const monthLabel = `${y}年${parseInt(m, 10)}月`;
      const rel = monthRelative(parseInt(y, 10), parseInt(m, 10));
      return `
        <div class="tl-month-group">
          <div class="tl-month-header">
            <span class="tl-month-title">${monthLabel}</span>
            <span class="tl-month-sub">${rel}</span>
            <span class="tl-month-count">${monthEvents.length} 件</span>
          </div>
          <div class="tl-card-list">${cardsHtml}</div>
        </div>
      `;
    }).join('');

    document.getElementById('timeline-area').innerHTML = `
      ${toolbarHtml}
      ${monthsHtml || '<div class="empty">該当するイベントがありません。期間や分類を広げてみてください。</div>'}
    `;

    // ピル
    document.querySelectorAll('#timeline-area [data-range]').forEach(b => {
      b.addEventListener('click', () => {
        state.timelineRange = b.dataset.range;
        saveState();
        renderGlobalTimeline();
      });
    });
    document.querySelectorAll('#timeline-area [data-cat]').forEach(b => {
      b.addEventListener('click', () => {
        state.timelineCat = b.dataset.cat;
        saveState();
        renderGlobalTimeline();
      });
    });
    // カードクリック
    document.querySelectorAll('#timeline-area .tl-card').forEach(card => {
      card.addEventListener('click', () => openClientModal(card.dataset.clientId));
    });
  }

  function monthRelative(y, m) {
    const target = new Date(y, m - 1, 1);
    const cur = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
    const diffMonths = (target.getFullYear() - cur.getFullYear()) * 12 + (target.getMonth() - cur.getMonth());
    if (diffMonths === 0) return '今月';
    if (diffMonths === 1) return '来月';
    if (diffMonths < 12) return `${diffMonths}ヶ月後`;
    const years = Math.floor(diffMonths / 12);
    const remMonths = diffMonths % 12;
    return remMonths === 0 ? `${years}年後` : `${years}年${remMonths}ヶ月後`;
  }

  // Event category label
  function catLabel(cat) {
    return {
      'education':  '教育',
      'retirement': '退職',
      'pension':    '年金',
      'mortgage':   '住宅',
      'inheritance':'相続',
      'elder':      '介護',
      'health':     '健康',
      'general':    'その他',
    }[cat] || cat || 'その他';
  }

  // ============================
  // 顧客詳細モーダル
  // ============================
  // Fallback LINE history (in case dummy-data.js is cached old)
  const LINE_HISTORY_FALLBACK = {
    c001: [
      { direction: 'in',  ts: '2025-12-04 10:23', text: 'ご連絡ありがとうございます、初めての相談で緊張しています。' },
      { direction: 'out', ts: '2025-12-04 10:35', text: '田中様\n\nお問い合わせありがとうございます。FP福田です。緊張なさらず、率直なお話ができればと思います。アンケートのご回答お待ちしております。', label: '初回返信' },
      { direction: 'in',  ts: '2025-12-14 21:08', text: 'アンケートを回答しました。子供の大学資金が一番気になっています。' },
      { direction: 'out', ts: '2025-12-15 09:42', text: '田中様\n\nアンケートありがとうございました。大翔様の大学進学(教育費ピーク)について資料をまとめました。下記候補で面談いかがでしょうか。', label: '面談案内' },
      { direction: 'in',  ts: '2025-12-19 12:11', text: '候補日3で予約します。' },
      { direction: 'out', ts: '2025-12-19 12:12', text: '✅ ご予約承りました 6/1 14:00〜15:00 Zoom URL: https://zoom.us/...', label: '予約確定 (自動)' },
      { direction: 'out', ts: '2026-04-18 11:00', text: '田中様\n\n先日ご提案させていただいた「iDeCo拠出額の見直し」、その後ご検討状況はいかがでしょうか。ご質問やご懸念があれば、お気軽にお聞かせください。', label: 'フォローアップ' },
      { direction: 'in',  ts: '2026-05-25 19:30', text: '6/5の面談キャンセルさせてください。' },
      { direction: 'out', ts: '2026-05-25 19:35', text: '田中様\n\nキャンセル承りました。またご都合つけば日程ご相談ください。', label: 'キャンセル対応 (自動)' },
    ],
    c002: [
      { direction: 'in',  ts: '2025-04-28 14:08', text: 'セミナーありがとうございました。個人年金について詳しく聞きたいです。' },
      { direction: 'out', ts: '2025-04-28 18:30', text: '佐藤様\n\nセミナーへのご参加ありがとうございました。個人年金保険、看護師の方の退職時期に合わせたプランをご提案できます。', label: '初回返信' },
      { direction: 'out', ts: '2025-04-28 18:31', text: '【ご提案】個人年金保険プラン_佐藤様向け.pdf', label: '資料送付' },
      { direction: 'in',  ts: '2026-02-22 21:15', text: '退職金準備プラン、内容まだ少し検討中です。' },
      { direction: 'out', ts: '2026-02-22 22:00', text: '佐藤様\n\nお返事ありがとうございます。じっくりご検討ください。ご不明な点があればいつでもお声がけください。', label: 'フォローアップ' },
      { direction: 'out', ts: '2026-04-07 10:00', text: '佐藤様\n\n6/2 14:00 で承りました。当日はよろしくお願いします。Zoom URL: https://zoom.us/...', label: '予約確定 (自動)' },
      { direction: 'in',  ts: '2026-04-07 13:50', text: '申し訳ない、急用が入ってしまいキャンセルさせてください。' },
      { direction: 'out', ts: '2026-04-07 14:00', text: '佐藤様\n\nキャンセル承りました。また別日でも改めてご案内させてください。', label: 'キャンセル対応 (自動)' },
    ],
  };
  function ensureLineHistory_(c) {
    if (!c.lineHistory || c.lineHistory.length === 0) {
      const fb = LINE_HISTORY_FALLBACK[c.id];
      if (fb) c.lineHistory = fb;
    }
  }

  function openClientModal(id) {
    const c = clients.find(x => x.id === id);
    if (!c) return;
    ensureLineHistory_(c);
    console.log('[client modal]', c.id, c.name, 'lineHistory:', (c.lineHistory || []).length, 'DUMMY_CLIENTS_VERSION:', window.DUMMY_CLIENTS_VERSION || '(missing)');
    const events = window.LifeEvents.generate(c);
    const recs = window.Recommender.forClient(c, events);

    const familyHtml = (c.family || []).length === 0
      ? '<li style="color:var(--muted)">単身</li>'
      : (c.family || []).map(m => {
          const relCls = m.rel === 'spouse' ? 'spouse' : (m.rel === 'child' ? 'child' : '');
          const relLabel = m.rel === 'spouse' ? '配偶者' : (m.rel === 'child' ? 'お子様' : m.rel);
          const age = window.LifeEvents.currentAge({ birth: m.birth });
          return `<li><span><span class="rel-tag ${relCls}">${relLabel}</span>${escapeHtml(m.name)}</span><span style="color:var(--muted);font-size:12px;">${age}歳 (${m.birth})</span></li>`;
        }).join('');

    const proposalsHtml = (c.proposals || []).length === 0
      ? '<li class="empty">提案履歴なし</li>'
      : (c.proposals || []).slice().reverse().map(p => `
          <li>
            <span class="pdate">${p.date}</span>
            <span>${escapeHtml(p.title)}</span>
            <span class="presult ${p.result}">${p.result}</span>
          </li>
        `).join('');

    const timelineHtml = events.length === 0
      ? '<div class="empty">向こう30年に予測イベントなし</div>'
      : events.map(ev => `
          <div class="client-timeline-item">
            <div class="when">${fmtDate(ev.date)}<span class="relative">${window.LifeEvents.formatRelative(ev.date)}</span></div>
            <div class="ev-label">
              <span class="timeline-event ${ev.cat}${ev.major ? ' major' : ''}" style="position:static;display:inline-block;">${escapeHtml(ev.label)}</span>
              <span class="ev-who">${escapeHtml(ev.who)}</span>
            </div>
          </div>
        `).join('');

    const actionsHtml = recs.length === 0
      ? '<div class="empty">直近の推奨アクションなし</div>'
      : recs.slice(0, 6).map(r => {
          const cls = r.priority >= 85 ? '' : (r.priority >= 65 ? 'mid' : 'low');
          return `
            <div class="a-item">
              <div><span class="p-tag ${cls}">${priorityLabel(r.priority)}</span></div>
              <div>
                <strong>${escapeHtml(r.action)}</strong>
                <div class="a-reason">${escapeHtml(r.reason)}</div>
              </div>
            </div>
          `;
        }).join('');

    const mortgageHtml = c.mortgage
      ? `<dt>住宅ローン</dt><dd>残${c.mortgage.remainingYears}年 / 月¥${c.mortgage.monthly.toLocaleString()}</dd>`
      : '';

    // ====== NEW PREMIUM 2-COLUMN MODAL ======
    const initial = (c.name || '?').replace(/\s+/g, '').slice(0, 1);
    const age = window.LifeEvents.currentAge(c);
    const childCount = (c.family || []).filter(m => m.rel === 'child').length;
    const familyShort = childCount > 0 ? `配偶者 + 子${childCount}` :
      ((c.family || []).find(m => m.rel === 'spouse') ? '夫婦' : '単身');
    const days = daysSince(c.lastContact);
    const aumDisp = c.aum >= 100000000 ? `¥${(c.aum/100000000).toFixed(2)}億` : `¥${Math.round(c.aum/10000).toLocaleString()}万`;
    const topRec = recs[0] || null;
    const futureEvs = events.filter(ev => new Date(ev.date) >= TODAY);
    const nextEv = futureEvs[0];
    const eventsByCat = events.reduce((acc, ev) => { acc[ev.cat] = (acc[ev.cat] || 0) + 1; return acc; }, {});

    // Family avatar + meta list
    const familyHtml2 = (c.family || []).length === 0
      ? '<div class="cd-empty">単身</div>'
      : (c.family || []).map(m => {
          const relLabel = m.rel === 'spouse' ? '配偶者' : (m.rel === 'child' ? 'お子様' : m.rel);
          const mAge = window.LifeEvents.currentAge({ birth: m.birth });
          const mInit = (m.name || '?').replace(/\s+/g, '').slice(0, 1);
          return `<div class="cd-family-row">
            <span class="cd-family-avatar">${escapeHtml(mInit)}</span>
            <div class="cd-family-body">
              <div class="cd-family-name">${escapeHtml(m.name)}</div>
              <div class="cd-family-meta">${relLabel} · ${mAge}歳</div>
            </div>
          </div>`;
        }).join('');

    // Timeline (clean)
    const timelineHtml2 = events.length === 0
      ? '<div class="cd-empty">向こう30年に予測イベントなし</div>'
      : events.slice(0, 12).map(ev => {
          const rel = window.LifeEvents.formatRelative(ev.date);
          return `<div class="cd-tl-row">
            <span class="cd-tl-dot cd-cat-${ev.cat}${ev.major ? ' major' : ''}"></span>
            <span class="cd-tl-date">${fmtDate(ev.date)}</span>
            <span class="cd-tl-label">${escapeHtml(ev.label)}</span>
            <span class="cd-tl-who">${escapeHtml(ev.who || '')}</span>
            <span class="cd-tl-rel">${rel}</span>
          </div>`;
        }).join('');

    // Proposals
    const proposalsHtml2 = (c.proposals || []).length === 0
      ? '<div class="cd-empty">提案履歴なし</div>'
      : (c.proposals || []).slice().reverse().map(p => `
          <div class="cd-prop-row">
            <span class="cd-prop-date">${p.date}</span>
            <span class="cd-prop-title">${escapeHtml(p.title)}</span>
            <span class="cd-prop-result cd-prop-result-${p.result}">${p.result}</span>
          </div>
        `).join('');

    // Action recs (filtered top 4)
    const actionsHtml2 = recs.length === 0
      ? '<div class="cd-empty">直近の推奨アクションなし</div>'
      : recs.slice(0, 4).map(r => `
          <div class="cd-action-row">
            <div class="cd-action-bullet"></div>
            <div class="cd-action-body">
              <div class="cd-action-text">${escapeHtml(r.action)}</div>
              <div class="cd-action-reason">${escapeHtml(r.reason)}</div>
            </div>
            <span class="cd-action-pri">${priorityLabel(r.priority)}</span>
          </div>
        `).join('');

    document.getElementById('modal-content').innerHTML = `
      <div class="cd-modal">
        <button class="cd-close" id="modal-close-btn" aria-label="閉じる"><i data-lucide="x"></i></button>

        <!-- ============= LEFT: Profile column ============= -->
        <aside class="cd-left">
          <div class="cd-profile-head">
            <div class="cd-profile-avatar">${escapeHtml(initial)}</div>
            <div class="cd-profile-name">${escapeHtml(c.name)} <span class="cd-profile-honor">様</span></div>
            <div class="cd-profile-kana">${escapeHtml(c.kana)}</div>
            <div class="cd-profile-pills">
              <span class="status-pill ${c.status}">${statusLabel(c.status)}</span>
              ${c.lineFriendId ? '<span class="cd-line-pill"><i data-lucide="message-circle"></i>LINE連携</span>' : ''}
            </div>
          </div>

          ${(function () {
            const _days = daysSince(c.lastContact);
            const _kpis = [];
            const _lc = (c.cancellations || []).slice().sort((a,b) => new Date(b.date) - new Date(a.date))[0];
            if (_lc && daysSince(_lc.date) <= 30) _kpis.push({ label: 'キャンセル後フォロー', tone: 'critical' });
            const _stalled = (c.proposals || []).slice().reverse().find(p => (p.result === '検討中' || p.result === '提案中') && daysSince(p.date) >= 30);
            if (_stalled) _kpis.push({ label: '提案クロージング', tone: 'warn' });
            const _evs = window.LifeEvents.generate(c) || [];
            const _ne = _evs.find(ev => { const d = (ev.date - TODAY) / 86400000; return ev.major && d >= 0 && d <= 60; });
            if (_ne && _days >= 21) _kpis.push({ label: 'イベント先取り', tone: 'warn' });
            if (c.status === 'dormant' || _days >= 180) _kpis.push({ label: '休眠の再エンゲージ', tone: 'critical' });
            if (_kpis.length === 0 && _days >= 30 && c.status !== 'dormant') _kpis.push({ label: '月1接触', tone: 'warn' });
            if (_kpis.length === 0) _kpis.push({ label: '緊急対応なし', tone: 'good' });
            return `
            <div class="cd-kpi-section">
              <div class="cd-kpi-label">この方に必要なフォロー</div>
              <div class="cd-kpi-badges">
                ${_kpis.map(k => `<span class="senior-kpi-badge senior-kpi-${k.tone}"><i data-lucide="target"></i>${escapeHtml(k.label)}</span>`).join('')}
              </div>
            </div>
            `;
          })()}

          <details class="cd-qa-collapse">
            <summary class="cd-qa-summary">
              <i data-lucide="zap"></i>
              <span>その他の連絡手段</span>
              <i data-lucide="chevron-down" class="cd-qa-chev"></i>
            </summary>
            <div class="cd-qa-inner">
              <button class="cd-qa-btn" id="cd-action-line"><i data-lucide="message-square-text"></i><span>LINE</span></button>
              <button class="cd-qa-btn" id="cd-action-call"><i data-lucide="phone"></i><span>電話</span></button>
              <button class="cd-qa-btn" id="cd-action-meet"><i data-lucide="video"></i><span>Zoom</span></button>
              <button class="cd-qa-btn" id="cd-action-mail"><i data-lucide="mail"></i><span>メール</span></button>
            </div>
          </details>

          <div class="cd-profile-stats">
            <div class="cd-stat">
              <div class="cd-stat-label">管理資産</div>
              <div class="cd-stat-value">${aumDisp}</div>
            </div>
            <div class="cd-stat">
              <div class="cd-stat-label">最終接触</div>
              <div class="cd-stat-value">${days}<span class="cd-stat-unit">日前</span></div>
              <div class="cd-stat-sub">${c.lastContact}</div>
            </div>
            <div class="cd-stat">
              <div class="cd-stat-label">年齢 / 性別</div>
              <div class="cd-stat-value">${age}<span class="cd-stat-unit">歳</span></div>
              <div class="cd-stat-sub">${c.gender === 'F' ? '女性' : '男性'} · ${c.birth}</div>
            </div>
          </div>

          <div class="cd-profile-section">
            <div class="cd-section-label">プロフィール</div>
            <dl class="cd-dl">
              <dt>職業</dt><dd>${escapeHtml(c.occupation || '—')}</dd>
              <dt>流入経路</dt><dd>${escapeHtml(c.source || '—')}</dd>
              <dt>家族</dt><dd>${familyShort}</dd>
              ${c.mortgage ? `<dt>住宅ローン</dt><dd>残${c.mortgage.remainingYears}年 / 月¥${c.mortgage.monthly.toLocaleString()}</dd>` : ''}
            </dl>
          </div>

          <div class="cd-profile-section">
            <div class="cd-section-label">家族構成</div>
            <div class="cd-family-list">${familyHtml2}</div>
          </div>

          ${(c.cancellations && c.cancellations.length) ? `
          <div class="cd-profile-section">
            <div class="cd-section-label cd-section-label-warn">
              <i data-lucide="alert-triangle"></i>
              <span>キャンセル履歴 (${c.cancellations.length})</span>
            </div>
            <div class="cd-cancel-list">
              ${c.cancellations.slice().reverse().map(cc => {
                const d = new Date(cc.date);
                const daysFromCancel = Math.max(0, Math.floor((TODAY - d) / 86400000));
                return `<div class="cd-cancel-row">
                  <div class="cd-cancel-date">${cc.date}<span class="cd-cancel-rel">${daysFromCancel}日前</span></div>
                  <div class="cd-cancel-slot">${escapeHtml(cc.slot || '')}</div>
                  <div class="cd-cancel-reason"><i data-lucide="message-square"></i><span>${escapeHtml(cc.reason || '理由なし')}</span></div>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}

          ${c.note ? `
          <div class="cd-profile-section">
            <div class="cd-section-label">メモ</div>
            <div class="cd-note">${escapeHtml(c.note)}</div>
          </div>` : ''}
        </aside>

        <!-- ============= RIGHT: Activity column ============= -->
        <main class="cd-right">

          <!-- AI Next Best Action — 3-step guided flow -->
          ${topRec ? `
          <div class="cd-flow">
            <div class="cd-flow-eyebrow">
              <span class="cd-flow-eyebrow-pill"><i data-lucide="sparkles"></i>AI 推奨</span>
              <span class="cd-flow-eyebrow-pri">${priorityLabel(topRec.priority)}</span>
            </div>
            <div class="cd-flow-title">${escapeHtml(topRec.action)}</div>
            <div class="cd-flow-reason">${escapeHtml(topRec.reason)}</div>

            <div class="cd-flow-steps">
              <button class="cd-flow-step cd-flow-step-active" id="modal-draft-btn">
                <span class="cd-flow-step-no">1</span>
                <span class="cd-flow-step-body">
                  <span class="cd-flow-step-label">下書きを作る</span>
                  <span class="cd-flow-step-sub">AIが文面を生成</span>
                </span>
                <i data-lucide="wand-2" class="cd-flow-step-icon"></i>
              </button>
              <i data-lucide="chevron-right" class="cd-flow-arrow"></i>
              <div class="cd-flow-step cd-flow-step-next">
                <span class="cd-flow-step-no">2</span>
                <span class="cd-flow-step-body">
                  <span class="cd-flow-step-label">確認 / 編集</span>
                  <span class="cd-flow-step-sub">必要なら手直し</span>
                </span>
              </div>
              <i data-lucide="chevron-right" class="cd-flow-arrow"></i>
              <div class="cd-flow-step cd-flow-step-next">
                <span class="cd-flow-step-no">3</span>
                <span class="cd-flow-step-body">
                  <span class="cd-flow-step-label">LINE 送信</span>
                  <span class="cd-flow-step-sub">ワンクリックで送付</span>
                </span>
              </div>
            </div>

            <button class="cd-flow-edit ghost-btn" id="modal-edit-btn"><i data-lucide="pencil"></i><span>顧客情報を編集</span></button>
          </div>` : `
          <div class="cd-flow cd-flow-empty">
            <div class="cd-flow-eyebrow"><span class="cd-flow-eyebrow-pill">AI推奨</span></div>
            <div class="cd-flow-title">直近の推奨アクションなし</div>
            <div class="cd-flow-reason">この方のライフイベントや接触状況からは、特に緊急のアクションはありません。</div>
            <div class="cd-flow-steps">
              <button class="cd-flow-step cd-flow-step-active" id="modal-draft-btn">
                <span class="cd-flow-step-no"><i data-lucide="wand-2"></i></span>
                <span class="cd-flow-step-body">
                  <span class="cd-flow-step-label">AI返信下書きを作る</span>
                  <span class="cd-flow-step-sub">挨拶や定期連絡を起案</span>
                </span>
              </button>
            </div>
            <button class="cd-flow-edit ghost-btn" id="modal-edit-btn"><i data-lucide="pencil"></i><span>顧客情報を編集</span></button>
          </div>`}

          <!-- Tabs -->
          <div class="cd-tabs" role="tablist">
            <button class="cd-tab cd-tab-active" data-cdtab="overview">概観</button>
            <button class="cd-tab" data-cdtab="line">LINE履歴 <span class="cd-tab-count">${(c.lineHistory || []).length}</span></button>
            <button class="cd-tab" data-cdtab="timeline">タイムライン <span class="cd-tab-count">${events.length}</span></button>
            <button class="cd-tab" data-cdtab="proposals">提案履歴 <span class="cd-tab-count">${(c.proposals || []).length}</span></button>
            <button class="cd-tab" data-cdtab="meetings">面談録</button>
          </div>

          <div class="cd-tabpanels">
            <!-- OVERVIEW -->
            <div class="cd-tabpanel" data-cdpanel="overview">
              <div class="cd-overview-grid">
                <div class="cd-card">
                  <div class="cd-card-head"><i data-lucide="alert-circle"></i><span>次にやること</span><span class="cd-card-badge">${Math.min(recs.length, 4)}</span></div>
                  <div class="cd-card-body">${actionsHtml2}</div>
                </div>
                <div class="cd-card">
                  <div class="cd-card-head"><i data-lucide="calendar-clock"></i><span>直近のイベント</span></div>
                  <div class="cd-card-body">
                    ${nextEv ? `
                    <div class="cd-next-ev">
                      <div class="cd-next-ev-rel">${window.LifeEvents.formatRelative(nextEv.date)}</div>
                      <div class="cd-next-ev-label">${escapeHtml(nextEv.label)}</div>
                      <div class="cd-next-ev-meta">${fmtDate(nextEv.date)} · 対象: ${escapeHtml(nextEv.who || '—')}</div>
                    </div>
                    ${futureEvs.slice(1, 4).map(ev => `
                    <div class="cd-next-ev cd-next-ev-mini">
                      <span class="cd-next-ev-mini-rel">${window.LifeEvents.formatRelative(ev.date)}</span>
                      <span class="cd-next-ev-mini-label">${escapeHtml(ev.label)}</span>
                    </div>`).join('')}
                    ` : '<div class="cd-empty">予測イベントなし</div>'}
                  </div>
                </div>
              </div>

              <div class="cd-card">
                <div class="cd-card-head"><i data-lucide="bar-chart-3"></i><span>イベント分類サマリー</span></div>
                <div class="cd-card-body">
                  <div class="cd-cat-summary">
                    ${Object.entries(eventsByCat).map(([cat, n]) => `
                      <div class="cd-cat-chip cd-cat-${cat}">
                        <span class="cd-cat-dot"></span>
                        <span class="cd-cat-name">${catLabel(cat)}</span>
                        <span class="cd-cat-count">${n}</span>
                      </div>
                    `).join('') || '<div class="cd-empty">なし</div>'}
                  </div>
                </div>
              </div>
            </div>

            <!-- LINE HISTORY -->
            <div class="cd-tabpanel" data-cdpanel="line" hidden>
              <div class="cd-line-head">
                <div class="cd-line-stats">
                  <span class="cd-line-stat"><i data-lucide="message-square"></i><strong id="cd-line-total">${(c.lineHistory || []).length}</strong>件</span>
                  <span class="cd-line-stat"><i data-lucide="arrow-down-left"></i>受信 <strong id="cd-line-in">${(c.lineHistory || []).filter(m => m.direction === 'in').length}</strong></span>
                  <span class="cd-line-stat"><i data-lucide="arrow-up-right"></i>送信 <strong id="cd-line-out">${(c.lineHistory || []).filter(m => m.direction === 'out').length}</strong></span>
                </div>
                <button class="cd-line-new" data-line-ai="${c.id}"><i data-lucide="wand-2"></i><span>AI下書き</span></button>
              </div>
              <div class="cd-line-chat" id="cd-line-chat">
                ${(c.lineHistory || []).map(m => `
                  <div class="cd-line-msg ${m.direction === 'in' ? 'cd-line-in' : 'cd-line-out'}">
                    ${m.label ? `<div class="cd-line-label">${escapeHtml(m.label)}</div>` : ''}
                    <div class="cd-line-bubble">${escapeHtml(m.text).replace(/\n/g, '<br>')}</div>
                    <div class="cd-line-ts">${escapeHtml(m.ts)}</div>
                  </div>
                `).join('') || '<div class="cd-line-empty">まだメッセージはありません</div>'}
              </div>
              <div class="cd-line-composer">
                <textarea id="cd-line-input" placeholder="メッセージを入力... (Cmd+Enter で送信)"></textarea>
                <div class="cd-line-composer-foot">
                  <span class="cd-line-composer-meta">${c.lineFriendId ? '✓ LINE連携済' : '⚠ LINE friend ID 未登録'}</span>
                  <button class="cd-line-send-btn" id="cd-line-send"${c.lineFriendId ? '' : ' disabled'}>
                    <i data-lucide="send"></i><span>送信</span>
                  </button>
                </div>
                <div id="cd-line-msg" class="cd-line-msg-status"></div>
              </div>
            </div>

            <!-- TIMELINE -->
            <div class="cd-tabpanel" data-cdpanel="timeline" hidden>
              <div class="cd-tl-list">${timelineHtml2}</div>
              ${events.length > 12 ? `<div class="cd-tl-more">他 ${events.length - 12} 件...</div>` : ''}
            </div>

            <!-- PROPOSALS -->
            <div class="cd-tabpanel" data-cdpanel="proposals" hidden>
              <div class="cd-prop-list">${proposalsHtml2}</div>
            </div>

            <!-- MEETINGS -->
            <div class="cd-tabpanel" data-cdpanel="meetings" hidden>
              ${renderMeetingRecordsBlock(c) || '<div class="cd-empty">面談録なし</div>'}
            </div>
          </div>

          ${renderReferralBlock(c)}
        </main>
      </div>
    `;
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-edit-btn').addEventListener('click', () => {
      closeModal();
      openClientForm(c.id);
    });
    document.getElementById('modal-draft-btn').addEventListener('click', () => {
      openDraftReplyModal(c, events, recs);
    });
    // Tab switching inside new modal
    document.querySelectorAll('.cd-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.cdtab;
        document.querySelectorAll('.cd-tab').forEach(b => b.classList.toggle('cd-tab-active', b === btn));
        document.querySelectorAll('.cd-tabpanel').forEach(p => {
          if (p.dataset.cdpanel === key) p.removeAttribute('hidden');
          else p.setAttribute('hidden', '');
        });
      });
    });
    // Quick action stubs
    const qaStub = (id, label) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => alert(label + ': まだ実装してないけど、ここから ' + label + ' を起動します'));
    };
    qaStub('cd-action-line', 'LINE送信');
    qaStub('cd-action-call', '電話発信');
    qaStub('cd-action-meet', 'Zoom起動');
    qaStub('cd-action-mail', 'メール作成');
    // 「AI下書き」 → AI Action Brief を開く
    document.querySelectorAll('[data-line-ai]').forEach(btn => {
      btn.addEventListener('click', () => openDraftReplyModal(c, events, recs));
    });
    // LINE 直接送信 (composer)
    const sendBtn = document.getElementById('cd-line-send');
    const input = document.getElementById('cd-line-input');
    const statusEl = document.getElementById('cd-line-msg');
    const chatEl = document.getElementById('cd-line-chat');
    function appendLocalMessage(text) {
      const ts = new Date();
      const tsStr = ts.getFullYear() + '-' + String(ts.getMonth()+1).padStart(2,'0') + '-' + String(ts.getDate()).padStart(2,'0') + ' ' + String(ts.getHours()).padStart(2,'0') + ':' + String(ts.getMinutes()).padStart(2,'0');
      c.lineHistory = c.lineHistory || [];
      c.lineHistory.push({ direction: 'out', ts: tsStr, text: text, label: 'CRM直接送信' });
      // empty placeholder remove
      const empty = chatEl.querySelector('.cd-line-empty');
      if (empty) empty.remove();
      const div = document.createElement('div');
      div.className = 'cd-line-msg cd-line-out';
      div.innerHTML = `<div class="cd-line-label">CRM直接送信</div><div class="cd-line-bubble">${escapeHtml(text).replace(/\n/g, '<br>')}</div><div class="cd-line-ts">${tsStr}</div>`;
      chatEl.appendChild(div);
      chatEl.scrollTop = chatEl.scrollHeight;
      // Update stats
      document.getElementById('cd-line-total').textContent = c.lineHistory.length;
      document.getElementById('cd-line-out').textContent = c.lineHistory.filter(m => m.direction === 'out').length;
    }
    if (sendBtn && input) {
      const doSend = async () => {
        const text = input.value.trim();
        if (!text) return;
        const userId = c.lineFriendId;
        if (!userId) {
          statusEl.textContent = '⚠ LINE friend ID 未登録のため送信できません';
          statusEl.style.color = 'var(--critical)';
          return;
        }
        sendBtn.disabled = true;
        const orig = sendBtn.innerHTML;
        sendBtn.innerHTML = '<span>送信中...</span>';
        statusEl.textContent = '';
        try {
          const r = await fetch('https://fp-compass-webhook-527726449426.asia-northeast1.run.app/api/line/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, text }),
          });
          const data = await r.json().catch(() => ({}));
          if (data.ok) {
            statusEl.textContent = '✓ 送信完了';
            statusEl.style.color = 'var(--positive)';
            appendLocalMessage(text);
            input.value = '';
          } else {
            statusEl.textContent = '✕ 送信失敗: ' + (data.error || '不明なエラー');
            statusEl.style.color = 'var(--critical)';
          }
        } catch (e) {
          statusEl.textContent = '✕ 通信エラー: ' + e.message;
          statusEl.style.color = 'var(--critical)';
        } finally {
          sendBtn.disabled = false;
          sendBtn.innerHTML = orig;
          if (window.lucide) window.lucide.createIcons();
          setTimeout(() => { statusEl.textContent = ''; }, 4000);
        }
      };
      sendBtn.addEventListener('click', doSend);
      input.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); doSend(); }
      });
    }
    // タスクの「LINEで送信」 ボタン
    document.querySelectorAll('.fp-task-do-now').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const msg = btn.dataset.msg;
        if (!uid) { alert('このお客様は LINE 連携が確認できないため、自動送信できません'); return; }
        const finalMsg = prompt('LINEで送るメッセージ (編集可)', msg);
        if (!finalMsg) return;
        btn.disabled = true; btn.textContent = '送信中...';
        try {
          const r = await fetch('https://fp-compass-webhook-527726449426.asia-northeast1.run.app/api/send-line', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, text: finalMsg }),
          });
          const data = await r.json();
          if (data.ok) { btn.textContent = '✓ 送信済'; btn.style.background = '#94a3b8'; }
          else { alert('失敗: ' + (data.error || '')); btn.disabled = false; btn.textContent = '→ LINEで送信'; }
        } catch (e) { alert('失敗: ' + e.message); btn.disabled = false; btn.textContent = '→ LINEで送信'; }
      });
    });
    const refCopy = document.getElementById('ref-copy-url');
    if (refCopy) {
      refCopy.addEventListener('click', () => {
        const url = `https://line.me/R/ti/p/@511thleq?ref=${c.id}`;
        navigator.clipboard.writeText(url);
        refCopy.textContent = '✓ コピーしました';
        setTimeout(() => { refCopy.textContent = '📋 URLをコピー'; }, 2200);
      });
    }
  }

  // ============================
  // 面談記録ブロック (顧客詳細モーダル内 / 録画URL + メモ + タスク)
  // ============================
  function renderMeetingRecordsBlock(client) {
    // この顧客に関連する bookings を liveData から探す
    const liveBookings = (window.LineAppLiveData && window.LineAppLiveData.bookings) || [];
    const myBookings = liveBookings.filter(b => b.userId === client.lineFriendId || b.name === client.name);

    // localStorage から この顧客のメモ + タスクを取得
    const tasksKey = 'fp-tasks-' + (client.lineFriendId || client.id);
    const tasks = JSON.parse(localStorage.getItem(tasksKey) || '[]');
    // 各 booking ごとにメモを取得
    const bookingsWithMemo = myBookings.map(b => {
      const memo = localStorage.getItem('fp-memo-' + b.ts) || '';
      return { ...b, memo };
    });

    if (bookingsWithMemo.length === 0 && tasks.length === 0) return ''; // 何もない時は表示しない

    // AI 議事録データ (localStorage に保存されていれば)
    const aiKey = 'fp-ai-' + (client.lineFriendId || client.id);
    const aiResults = JSON.parse(localStorage.getItem(aiKey) || '[]');

    return `
      <div class="detail-section">
        <h3>面談記録・AI議事録 <span class="count-badge">${bookingsWithMemo.length} 回</span></h3>
        ${bookingsWithMemo.length === 0 ? '' :
          '<div style="display:grid;gap:14px;margin-bottom:18px;">' +
          bookingsWithMemo.slice().reverse().map(b => {
            const aiData = aiResults.find(a => a.bookingTs === b.ts) || {};
            return `
            <div style="background:linear-gradient(135deg,#fff,#fdfbf4);border:1px solid #e0d8c0;border-left:5px solid #c1272d;padding:20px 24px;box-shadow:0 4px 16px rgba(15,23,41,0.06);">
              <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #e0d8c0;">
                <div>
                  <div style="font-family:'Inter',sans-serif;font-size:10px;font-weight:800;color:#c1272d;letter-spacing:0.22em;text-transform:uppercase;margin-bottom:4px;">Meeting Record</div>
                  <strong style="font-family:'Noto Serif JP',serif;font-size:17px;color:#0f1729;">${escapeHtml(String(b.date||'').slice(0,10))} ${escapeHtml(String(b.time||'').slice(0,5))} 面談</strong>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  ${b.driveUrl ? `<a href="${escapeHtml(b.driveUrl)}" target="_blank" style="font-size:11px;padding:8px 14px;background:#1b2845;color:#fff;text-decoration:none;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">🎥 録画を見る</a>` : ''}
                  ${b.zoomUrl ? `<a href="${escapeHtml(b.zoomUrl)}" target="_blank" style="font-size:11px;padding:8px 14px;background:#fff;color:#0f1729;border:1px solid #e0d8c0;text-decoration:none;font-weight:700;letter-spacing:0.06em;">Zoom URL</a>` : ''}
                </div>
              </div>
              ${aiData.transcript ? `
                <div style="margin-bottom:14px;">
                  <div style="font-family:'Inter',sans-serif;font-size:10px;font-weight:800;color:#b8893d;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:8px;">📝 AI 文字起こし (Whisper)</div>
                  <details style="background:#fff;border:1px solid #e0d8c0;padding:0;">
                    <summary style="padding:12px 16px;cursor:pointer;font-size:12px;color:#0f1729;font-weight:700;background:#fafaf6;border-bottom:1px solid #e0d8c0;">📜 全文を見る (${(aiData.transcript||'').length}文字)</summary>
                    <div style="padding:14px 18px;font-size:12px;line-height:1.8;white-space:pre-wrap;max-height:300px;overflow-y:auto;">${escapeHtml(aiData.transcript)}</div>
                  </details>
                </div>` : ''}
              ${aiData.summary ? `
                <div style="margin-bottom:14px;">
                  <div style="font-family:'Inter',sans-serif;font-size:10px;font-weight:800;color:#b8893d;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:8px;">🤖 AI 議事録 (Claude Sonnet)</div>
                  <div style="font-size:12.5px;line-height:1.85;color:#0f1729;background:#fff;border:1px solid #e0d8c0;padding:14px 18px;white-space:pre-wrap;">${escapeHtml(aiData.summary)}</div>
                </div>` : ''}
              ${aiData.key_concerns && aiData.key_concerns.length > 0 ? `
                <div style="margin-bottom:14px;">
                  <div style="font-family:'Inter',sans-serif;font-size:10px;font-weight:800;color:#b8893d;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:8px;">🎯 お客様の関心事</div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    ${aiData.key_concerns.map(k => `<span style="background:#1b2845;color:#fff;padding:5px 12px;font-size:11px;font-weight:700;letter-spacing:0.04em;">${escapeHtml(k)}</span>`).join('')}
                  </div>
                </div>` : ''}
              ${b.memo ? `
                <div style="margin-top:14px;">
                  <div style="font-family:'Inter',sans-serif;font-size:10px;font-weight:800;color:#6b7280;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:8px;">手書きメモ</div>
                  <div style="font-size:12px;line-height:1.7;color:#0f1729;background:#fff;border:1px solid #e0d8c0;padding:12px 16px;white-space:pre-wrap;">${escapeHtml(b.memo)}</div>
                </div>` : ''}
              ${!aiData.transcript && !aiData.summary && !b.memo ? '<div style="font-size:12px;color:#6b7280;font-style:italic;text-align:center;padding:14px;">録画 + AI処理 or 面談メモがまだ追加されていません</div>' : ''}
            </div>
          `;
          }).join('') + '</div>'
        }

        ${tasks.length === 0 ? '' : `
          <h3 style="margin-top:16px;">フォロータスク <span class="count-badge">${tasks.length}</span></h3>
          <div style="display:grid;gap:8px;">
            ${tasks.slice().sort((a,b) => (a.due||'').localeCompare(b.due||'')).map((t, i) => {
              const priColor = t.priority==='至急' ? '#fef2f2;color:#b91c3c' : (t.priority==='今週'||t.priority==='2週間以内') ? '#fff7ed;color:#c2410c' : '#f0f9ff;color:#075985';
              return `
                <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:12px 16px;">
                  <div style="display:grid;grid-template-columns:30px 90px 1fr 130px;gap:10px;align-items:center;margin-bottom:${t.recommendedAction?'8px':'0'};">
                    <span style="font-size:16px;">${t.icon||'✅'}</span>
                    <span style="font-size:10.5px;font-weight:700;background:${priColor};padding:3px 8px;border-radius:10px;text-align:center;letter-spacing:0.04em;">${escapeHtml(t.priority||'-')}</span>
                    <span style="font-size:13px;">${escapeHtml(t.task||'')}</span>
                    <span style="font-size:11px;color:var(--muted);text-align:right;font-family:'Inter',sans-serif;">${escapeHtml(t.due||'-')}</span>
                  </div>
                  ${t.recommendedAction ? `
                    <div style="background:#fdfbf4;border:1px solid #e8d9a8;border-radius:6px;padding:8px 12px;font-size:11.5px;color:#5e4d1a;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
                      <div>
                        <strong style="color:#1f2a3f;letter-spacing:0.04em;">推奨アクション</strong>
                        <span style="margin-left:6px;">${escapeHtml(t.recommendedAction)}</span>
                      </div>
                      ${t.actionTemplate ? `<button class="fp-task-do-now" data-uid="${escapeHtml(client.lineFriendId||'')}" data-name="${escapeHtml(client.name)}" data-msg="${escapeHtml(t.actionTemplate)}" style="font-size:11px;padding:5px 11px;background:#06c755;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:700;font-family:inherit;">→ LINEで送信</button>` : ''}
                    </div>` : ''}
                </div>`;
            }).join('')}
          </div>`
        }
      </div>
    `;
  }

  // ============================
  // 紹介プログラム (顧客詳細モーダル内のブロック)
  // ============================
  function renderReferralBlock(client) {
    // この顧客が紹介で連れてきた人数を source 文字列からカウント
    const lastName = (client.name || '').split(/\s+/)[0];
    const referredByMe = clients.filter(c =>
      c.id !== client.id && (c.source || '').includes(lastName + '様')
    );
    const referralUrl = `https://line.me/R/ti/p/@511thleq?ref=${client.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(referralUrl)}`;

    const referredList = referredByMe.length === 0
      ? `<div style="font-size:12.5px;color:var(--muted);padding:14px;text-align:center;background:#fafbfc;border-radius:6px;">まだ ${escapeHtml(client.name)} 様経由のご紹介はありません</div>`
      : `<ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px;">
          ${referredByMe.map(c => `
            <li style="padding:10px 14px;background:#fafbfc;border:1px solid var(--line);border-radius:7px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;">
              <span><strong>${escapeHtml(c.name)}</strong> <span style="font-size:11px;color:var(--muted);">${window.LifeEvents.currentAge(c)}歳 / AUM ¥${fmtMoney(c.aum)}</span></span>
              <span class="status-pill ${c.status}">${statusLabel(c.status)}</span>
            </li>
          `).join('')}
        </ul>`;

    return `
      <div class="detail-section">
        <h3>🌱 紹介プログラム <span class="count-badge">${referredByMe.length} 名 ご紹介</span></h3>
        <div style="display:grid;grid-template-columns:200px 1fr;gap:16px;background:linear-gradient(135deg,#fbf4e6,#fff);border:1px solid #f0d36b;border-radius:10px;padding:18px;align-items:start;">
          <div style="text-align:center;">
            <img src="${qrUrl}" alt="referral QR" style="width:180px;height:180px;background:#fff;padding:6px;border:1px solid var(--line);border-radius:8px;">
            <div style="font-size:10.5px;color:var(--muted);margin-top:6px;letter-spacing:0.05em;font-weight:600;">${escapeHtml(client.name)} 様 専用QR</div>
          </div>
          <div>
            <div style="font-size:12.5px;color:var(--ink-2);line-height:1.7;margin-bottom:10px;">
              この方が新しいお客様をご紹介してくださる時、上のQRコードを共有していただきます。<br>
              スキャンで友だち追加されると <strong>自動で紹介者が ${escapeHtml(client.name)} 様 と紐付き</strong>、お礼メッセージも自動送信されます。
            </div>
            <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
              <button class="ghost" id="ref-copy-url" style="font-size:12px;">📋 URLをコピー</button>
              <a class="ghost" href="${qrUrl}" download="referral-${client.id}.png" style="font-size:12px;text-decoration:none;display:inline-block;padding:7px 12px;border:1px solid var(--line-2);border-radius:7px;color:var(--ink);">📥 QRをダウンロード</a>
            </div>
            <div style="font-size:11px;color:var(--muted);font-family:ui-monospace,Menlo,monospace;background:#fff;padding:6px 10px;border-radius:5px;border:1px solid var(--line);word-break:break-all;">${escapeHtml(referralUrl)}</div>
          </div>
        </div>
        <div style="margin-top:14px;">
          <h4 style="font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;font-weight:700;">この方からのご紹介</h4>
          ${referredList}
        </div>
      </div>
    `;
  }

  // ============================
  // AI返信下書き (LINE文面 自動生成)
  // ============================
  function openDraftReplyModal(client, events, recs) {
    const draft = generateDraftReply(client, events, recs);
    const topRec = recs[0];
    const initial = (client.name || '?').replace(/\s+/g, '').slice(0, 1);
    const days = daysSince(client.lastContact);
    const futureEvs = events.filter(ev => new Date(ev.date) >= TODAY);
    const nextEv = futureEvs[0];

    // Build context bullets
    const contextItems = [];
    contextItems.push({ icon: 'clock', text: `最終接触 <strong>${days}日前</strong> (${client.lastContact})` });
    if (nextEv) {
      contextItems.push({ icon: 'calendar', text: `次のライフイベント: <strong>${escapeHtml(nextEv.label)}</strong> (${window.LifeEvents.formatRelative(nextEv.date)})` });
    }
    contextItems.push({ icon: 'briefcase', text: `${escapeHtml(client.occupation || '—')} / AUM <strong>¥${fmtMoney(client.aum)}</strong>` });
    const lastProp = (client.proposals || []).slice(-1)[0];
    if (lastProp) {
      contextItems.push({ icon: 'file-text', text: `直近提案: <strong>${escapeHtml(lastProp.title)}</strong> (${lastProp.result})` });
    }
    if (client.cancellations && client.cancellations.length) {
      const recent = client.cancellations[client.cancellations.length - 1];
      const daysFromCancel = Math.max(0, Math.floor((TODAY - new Date(recent.date)) / 86400000));
      contextItems.push({ icon: 'alert-triangle', text: `<strong>直近キャンセル ${daysFromCancel}日前</strong> (理由: ${escapeHtml(recent.reason || '不明')})` });
    }

    // Post-send task queue
    const postSendTasks = [
      { icon: 'check-circle-2', text: `「${escapeHtml(topRec ? topRec.action : draft.intent)}」を <strong>対応中</strong> に変更` },
      { icon: 'bell', text: `<strong>7日後</strong>未返信なら自動リマインド` },
      { icon: 'history', text: `顧客タイムラインに <strong>「${escapeHtml(draft.intent)} 送信」</strong> を記録` },
    ];

    const html = `
      <div class="aib-modal">
        <button class="cd-close" id="draft-close" aria-label="閉じる"><i data-lucide="x"></i></button>

        <div class="aib-header">
          <div class="aib-header-left">
            <span class="aib-eyebrow"><i data-lucide="sparkles"></i>AI ACTION BRIEF</span>
            <h2 class="aib-title">${escapeHtml(client.name)} 様 への対応プラン</h2>
            <div class="aib-sub">AI がこの方の状況を分析して、いま送るべき文面まで一気に用意しました。</div>
          </div>
          <div class="aib-client-chip">
            <span class="aib-client-avatar">${escapeHtml(initial)}</span>
            <div>
              <div class="aib-client-name">${escapeHtml(client.name)}</div>
              <div class="aib-client-meta">${window.LifeEvents.currentAge(client)}歳 / ${escapeHtml(client.occupation || '—')}</div>
            </div>
          </div>
        </div>

        <div class="aib-body">

          <!-- STEP 1: AI Analysis -->
          <section class="aib-step">
            <div class="aib-step-head">
              <span class="aib-step-no">1</span>
              <div>
                <div class="aib-step-title">AI が状況を分析</div>
                <div class="aib-step-sub">優先度・タイミング・直近の動きから「いま動くべき」と判定</div>
              </div>
              <span class="aib-step-status aib-step-done"><i data-lucide="check"></i>完了</span>
            </div>
            <div class="aib-step-body">
              <div class="aib-verdict">
                <div class="aib-verdict-label">推奨アクション</div>
                <div class="aib-verdict-action">${escapeHtml(topRec ? topRec.action : draft.intent)}</div>
                <div class="aib-verdict-reason"><i data-lucide="lightbulb"></i><span>${escapeHtml(topRec ? topRec.reason : draft.reason)}</span></div>
              </div>
              <ul class="aib-context">
                ${contextItems.map(c => `<li><i data-lucide="${c.icon}"></i><span>${c.text}</span></li>`).join('')}
              </ul>
            </div>
          </section>

          <!-- STEP 2: AI Generated Draft -->
          <section class="aib-step">
            <div class="aib-step-head">
              <span class="aib-step-no">2</span>
              <div>
                <div class="aib-step-title">AI が文面を生成</div>
                <div class="aib-step-sub">そのまま送れる LINE 文面。編集できます。</div>
              </div>
              <span class="aib-step-status aib-step-done"><i data-lucide="check"></i>生成済</span>
            </div>
            <div class="aib-step-body">
              <div class="aib-draft-meta">
                <span class="aib-intent">${escapeHtml(draft.intent)}</span>
                <span class="aib-tone-label">トーン: 丁寧</span>
                <button class="aib-tone-btn" id="draft-regen"><i data-lucide="refresh-cw"></i>別のトーンで再生成</button>
              </div>
              <div class="aib-textarea-wrap">
                <textarea id="draft-text" class="aib-textarea">${escapeHtml(draft.body)}</textarea>
              </div>
              <div class="aib-attach">
                <label class="aib-attach-item"><input type="checkbox" id="aib-attach-slots" checked> <i data-lucide="calendar-clock"></i><span>次回面談候補日3つを「予約カード」で送る</span></label>
                <label class="aib-attach-item"><input type="checkbox" id="aib-attach-pdf"> <i data-lucide="paperclip"></i><span>関連資料 PDF を添付 (教育資金プラン)</span></label>
              </div>

              <!-- FP-side: Google Calendar suggested slots + week view -->
              <div class="aib-cal" id="aib-cal">
                <div class="aib-cal-head">
                  <span class="aib-cal-eyebrow">
                    <i data-lucide="calendar-check"></i>
                    <span>あなたのカレンダーから空きを抽出</span>
                    <span class="aib-cal-source">Google Calendar 連携中</span>
                  </span>
                  <div class="aib-cal-actions">
                    <button class="aib-cal-btn" id="aib-cal-regen"><i data-lucide="refresh-cw"></i><span>別の3つ</span></button>
                    <button class="aib-cal-btn" id="aib-cal-add"><i data-lucide="plus"></i><span>手動で追加</span></button>
                  </div>
                </div>
                <div class="aib-cal-split">
                  <div class="aib-cal-left">
                    <div class="aib-cal-subhead">お客様に提示する候補</div>
                    <div class="aib-cal-grid" id="aib-cal-grid"></div>
                    <div class="aib-cal-confirm">
                      <i data-lucide="info"></i>
                      <span>上記でお客様にアポを取ります。よろしければ <strong>STEP 3 で送信</strong>。</span>
                    </div>
                  </div>
                  <div class="aib-cal-right">
                    <div class="aib-cal-subhead">
                      <i data-lucide="calendar"></i><span>あなたの予定 (次の7日)</span>
                      <button class="aib-gcal-btn" id="aib-gcal-toggle"><i data-lucide="external-link"></i><span>Google Calendar を開く</span></button>
                    </div>
                    <div class="aib-week" id="aib-week"></div>
                    <details class="aib-gcal-embed">
                      <summary><i data-lucide="monitor"></i><span>本物の Google Calendar を埋め込み表示</span></summary>
                      <div class="aib-gcal-iframe-wrap">
                        <iframe src="https://calendar.google.com/calendar/embed?showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0&height=400&wkst=2&bgcolor=%23ffffff&src=ja.japanese%23holiday%40group.v.calendar.google.com&ctz=Asia%2FTokyo" style="border-width:0" width="100%" height="380" frameborder="0" scrolling="no"></iframe>
                        <div class="aib-gcal-note">サンプル表示 (日本の祝日カレンダー)。本番では FP のメインカレンダーに切替。</div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>

              <!-- LINE preview (Flex Message look) -->
              <div class="aib-preview" id="aib-preview-area">
                <div class="aib-preview-head">
                  <i data-lucide="smartphone"></i>
                  <span>LINEで実際に届く見た目</span>
                </div>
                <div class="aib-preview-phone" id="aib-preview-phone">
                  <div class="aib-preview-bubble" id="aib-preview-text"></div>
                  <div class="aib-preview-carousel" id="aib-preview-carousel"></div>
                </div>
              </div>
            </div>
          </section>

          <!-- STEP 3: Send + post-send tasks -->
          <section class="aib-step aib-step-final">
            <div class="aib-step-head">
              <span class="aib-step-no">3</span>
              <div>
                <div class="aib-step-title">送信 → タスク自動化</div>
                <div class="aib-step-sub">送信後、CRM が自動でやってくれること</div>
              </div>
              <span class="aib-step-status aib-step-ready">あと1クリック</span>
            </div>
            <div class="aib-step-body">
              <ul class="aib-postsend">
                ${postSendTasks.map(t => `<li><i data-lucide="${t.icon}"></i><span>${t.text}</span></li>`).join('')}
              </ul>
              <div class="aib-cta-row">
                <button class="primary aib-send" id="draft-send"><i data-lucide="send"></i><span>この内容で LINE 送信</span></button>
                <button class="ghost-btn" id="draft-copy"><i data-lucide="copy"></i><span>文面コピー</span></button>
                <button class="ghost-btn" id="draft-close-btn"><i data-lucide="x"></i><span>キャンセル</span></button>
              </div>
              <div id="draft-msg" class="aib-msg"></div>
            </div>
          </section>

        </div>
      </div>
    `;
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';
    let toneIndex = 0;
    document.getElementById('draft-close').addEventListener('click', () => openClientModal(client.id));
    document.getElementById('draft-close-btn').addEventListener('click', () => openClientModal(client.id));
    document.getElementById('draft-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(document.getElementById('draft-text').value);
      document.getElementById('draft-msg').textContent = '✓ クリップボードにコピーしました';
    });
    document.getElementById('draft-send').addEventListener('click', async () => {
      const baseText = document.getElementById('draft-text').value;
      const userId = client.lineFriendId || client.userId;
      const sendBtn = document.getElementById('draft-send');
      const msg = document.getElementById('draft-msg');
      if (!userId) {
        msg.textContent = '⚠ LINE friend ID が未設定のため送信できません (顧客編集で登録してください)';
        msg.style.color = 'var(--red)';
        return;
      }
      if (!confirm(client.name + ' 様 へ この内容で LINE 送信します。よろしいですか?')) return;
      // Compose final text: body + slot block (text fallback for cards) + pdf block
      const slotsOn = document.getElementById('aib-attach-slots')?.checked;
      const pdfOn = document.getElementById('aib-attach-pdf')?.checked;
      let text = baseText.trimEnd();
      if (slotsOn && slotsData.length) {
        text += '\n\n────────\n◆ 次回面談 候補日 (どれかご都合よろしければ返信ください)';
        slotsData.forEach((s, i) => {
          text += `\n【候補${i+1}】${s.month}月${s.day}日(${s.wday}) ${s.time}`;
        });
        text += '\n※ 上記が難しい場合は別日程をご提案ください。\n────────';
      }
      if (pdfOn) {
        text += '\n\n────────\n◆ 添付資料\n📎 教育資金プラン_山田様向け.pdf\n────────';
      }
      sendBtn.disabled = true;
      sendBtn.textContent = '送信中...';
      try {
        const r = await fetch('https://fp-compass-webhook-527726449426.asia-northeast1.run.app/api/line/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            text: text,
            // Send structured payload too — backend can render as Flex Carousel when ready
            slots: slotsOn && slotsData.length ? slotsData.map(s => ({
              date: s.iso,
              wday: s.wday,
              time: s.time,
              label: `候補 ${slotsData.indexOf(s) + 1}`
            })) : null,
          }),
        });
        const data = await r.json();
        if (data.ok) {
          msg.style.color = 'var(--green)';
          msg.textContent = '✅ 送信完了 — ' + client.name + ' 様の LINE に届きました';
          sendBtn.textContent = '✓ 送信済';
        } else {
          msg.style.color = 'var(--red)';
          msg.textContent = '❌ 送信失敗: ' + (data.error || '原因不明');
          sendBtn.disabled = false;
          sendBtn.textContent = '📨 この内容で LINE 送信';
        }
      } catch (e) {
        msg.style.color = 'var(--red)';
        msg.textContent = '❌ 送信失敗: ' + e.message;
        sendBtn.disabled = false;
        sendBtn.textContent = '📨 この内容で LINE 送信';
      }
    });
    document.getElementById('draft-regen').addEventListener('click', () => {
      toneIndex = (toneIndex + 1) % 3;
      const newDraft = generateDraftReply(client, events, recs, toneIndex);
      currentBaseBody = newDraft.body;
      applyAttachments();
    });

    // ===== Slot pool: simulate FP's Google Calendar free slots =====
    const TIME_POOL = [
      { label: '10:00〜11:00', icon: 'sunrise' },
      { label: '11:00〜12:00', icon: 'sunrise' },
      { label: '13:00〜14:00', icon: 'sun' },
      { label: '14:00〜15:00', icon: 'sun' },
      { label: '15:00〜16:00', icon: 'sun' },
      { label: '16:00〜17:00', icon: 'sun' },
      { label: '18:00〜19:00', icon: 'moon' },
      { label: '19:00〜20:00', icon: 'moon' },
    ];
    let slotPoolOffset = 2; // start offset from TODAY
    let slotsData = []; // current 3 active slots
    const wDayJp = ['日','月','火','水','木','金','土'];
    function pickSlots(offsetStart) {
      const out = [];
      const base = new Date(TODAY);
      base.setDate(base.getDate() + offsetStart);
      let i = 0;
      while (out.length < 3 && i < 30) {
        const d = new Date(base); d.setDate(d.getDate() + i);
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          const t = TIME_POOL[(offsetStart + i + out.length) % TIME_POOL.length];
          out.push({
            id: `s-${d.getTime()}-${out.length}`,
            month: d.getMonth() + 1,
            day: d.getDate(),
            wday: wDayJp[d.getDay()],
            time: t.label,
            icon: t.icon,
            iso: d.toISOString().slice(0,10),
          });
        }
        i++;
      }
      return out;
    }
    slotsData = pickSlots(slotPoolOffset);
    // weekData reseed runs at the bottom of init

    // ===== Render LINE preview (Flex Message look) =====
    function renderPreview() {
      const slotsOn = document.getElementById('aib-attach-slots')?.checked;
      const pdfOn = document.getElementById('aib-attach-pdf')?.checked;
      const bodyText = document.getElementById('draft-text')?.value || draft.body;

      // text bubble
      const bubble = document.getElementById('aib-preview-text');
      if (bubble) bubble.textContent = bodyText;

      // carousel
      const carousel = document.getElementById('aib-preview-carousel');
      if (!carousel) return;
      let cards = '';
      if (slotsOn) {
        cards += `<div class="lp-card lp-card-header">
          <div class="lp-card-eyebrow"><i data-lucide="calendar-clock"></i><span>次回面談 候補</span></div>
          <div class="lp-card-title">どれかタップで予約確定</div>
        </div>`;
        slotsData.forEach((s, i) => {
          cards += `<div class="lp-card lp-card-slot">
            <div class="lp-card-num">候補 ${i+1}</div>
            <div class="lp-card-date">${s.month}/${s.day}<span class="lp-card-wday">(${s.wday})</span></div>
            <div class="lp-card-time"><i data-lucide="${s.icon}"></i><span>${s.time}</span></div>
            <button class="lp-card-btn">この日で予約</button>
          </div>`;
        });
      }
      if (pdfOn) {
        cards += `<div class="lp-card lp-card-pdf">
          <div class="lp-card-eyebrow"><i data-lucide="paperclip"></i><span>資料</span></div>
          <div class="lp-card-title">教育資金プラン_山田様向け.pdf</div>
          <button class="lp-card-btn lp-card-btn-secondary">PDF を見る</button>
        </div>`;
      }
      carousel.innerHTML = cards;
      carousel.style.display = (slotsOn || pdfOn) ? 'flex' : 'none';

      const phone = document.getElementById('aib-preview-phone');
      if (phone) phone.classList.toggle('aib-preview-phone-empty', !slotsOn && !pdfOn);

      if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': '1.6' } });
    }

    // Track which slots will be sent as Flex Message (separate from text body)
    function getAttachmentPayload() {
      return {
        slots: document.getElementById('aib-attach-slots')?.checked ? slotsData : null,
        pdf: document.getElementById('aib-attach-pdf')?.checked ? { name: '教育資金プラン_山田様向け.pdf' } : null,
      };
    }
    window.__aibPayload = getAttachmentPayload;

    document.getElementById('aib-attach-slots')?.addEventListener('change', () => { renderCalendarSlots(); renderPreview(); });
    document.getElementById('aib-attach-pdf')?.addEventListener('change', renderPreview);
    document.getElementById('draft-text')?.addEventListener('input', renderPreview);

    // ===== Mock FP calendar — owner's busy events (Google Calendar mock) =====
    function buildOwnerEvents() {
      const seed = ['田中様 面談', '相続セミナー', '社内ミーティング', '佐藤様 面談', '社外研修', '保険会社訪問', '山田様 面談', '個別相談', 'パートナー打合せ'];
      const evs = [];
      const base = new Date(TODAY);
      for (let i = 0; i < 10; i++) {
        const d = new Date(base); d.setDate(d.getDate() + i);
        if (d.getDay() === 0) continue; // skip Sun
        const startHours = [10, 13, 15];
        const n = (i + d.getDay()) % 3 + 1;
        for (let k = 0; k < n; k++) {
          const sh = startHours[(i + k * 2) % startHours.length];
          evs.push({
            iso: d.toISOString().slice(0,10),
            month: d.getMonth() + 1,
            day: d.getDate(),
            wday: ['日','月','火','水','木','金','土'][d.getDay()],
            start: `${String(sh).padStart(2,'0')}:00`,
            startH: sh,
            title: seed[(i * 3 + k) % seed.length],
          });
        }
      }
      return evs;
    }
    const ownerEvents = buildOwnerEvents();

    // Generate week with both busy events and free 1-hour slots
    function buildWeekData() {
      const days = [];
      const base = new Date(TODAY);
      for (let i = 0; i < 7; i++) {
        const d = new Date(base); d.setDate(d.getDate() + i);
        if (d.getDay() === 0 || d.getDay() === 6) continue; // weekdays only
        const iso = d.toISOString().slice(0,10);
        const dayEvents = ownerEvents.filter(e => e.iso === iso);
        const busyHours = new Set(dayEvents.map(e => e.startH));
        // Build hour timeline 10-20
        const slots = [];
        const hourPool = [10, 11, 13, 14, 15, 16, 18, 19];
        hourPool.forEach(h => {
          if (!busyHours.has(h)) {
            slots.push({
              iso,
              month: d.getMonth() + 1,
              day: d.getDate(),
              wday: ['日','月','火','水','木','金','土'][d.getDay()],
              start: `${String(h).padStart(2,'0')}:00`,
              startH: h,
              time: `${String(h).padStart(2,'0')}:00〜${String(h+1).padStart(2,'0')}:00`,
              icon: h < 12 ? 'sunrise' : h < 17 ? 'sun' : 'moon',
            });
          }
        });
        days.push({ iso, month: d.getMonth()+1, day: d.getDate(), wday: ['日','月','火','水','木','金','土'][d.getDay()], events: dayEvents, slots });
      }
      return days;
    }
    const weekData = buildWeekData();

    function isSelected(slot) {
      return slotsData.some(s => s.iso === slot.iso && s.start === slot.start);
    }
    function toggleSlot(slot) {
      const idx = slotsData.findIndex(s => s.iso === slot.iso && s.start === slot.start);
      if (idx >= 0) {
        // Remove
        slotsData.splice(idx, 1);
      } else {
        // Add (replace oldest if already 3+)
        if (slotsData.length >= 3) slotsData.shift();
        slotsData.push({
          id: `s-${slot.iso}-${slot.startH}`,
          month: slot.month, day: slot.day, wday: slot.wday,
          time: slot.time, icon: slot.icon, iso: slot.iso, start: slot.start,
        });
        // Reorder by date
        slotsData.sort((a,b) => (a.iso+a.start).localeCompare(b.iso+b.start));
      }
      renderOwnerWeek();
      renderCalendarSlots();
      renderPreview();
    }

    function renderOwnerWeek() {
      const wrap = document.getElementById('aib-week');
      if (!wrap) return;
      const todayIso = TODAY.toISOString().slice(0,10);
      const html = weekData.map(day => {
        const isToday = day.iso === todayIso;
        const evHtml = day.events.map(e => `
          <div class="aib-week-ev">
            <span class="aib-week-ev-time">${e.start}</span>
            <span class="aib-week-ev-title">${escapeHtml(e.title)}</span>
          </div>
        `).join('');
        const slotsHtml = day.slots.map(s => {
          const sel = isSelected(s);
          return `<button class="aib-week-slot ${sel ? 'aib-week-slot-selected' : ''}" data-pick-iso="${s.iso}" data-pick-start="${s.start}">
            <i data-lucide="${sel ? 'check' : 'plus'}"></i>
            <span class="aib-week-slot-time">${s.start}</span>
            <span class="aib-week-slot-label">${sel ? '候補' + (slotsData.findIndex(x => x.iso === s.iso && x.start === s.start) + 1) : '空き'}</span>
          </button>`;
        }).join('');
        return `
          <div class="aib-week-day ${isToday ? 'aib-week-today' : ''}">
            <div class="aib-week-date">
              <span class="aib-week-num">${day.month}/${day.day}</span>
              <span class="aib-week-wday">${day.wday}</span>
              ${isToday ? '<span class="aib-week-today-mark">今日</span>' : ''}
            </div>
            ${evHtml ? `<div class="aib-week-events">${evHtml}</div>` : ''}
            <div class="aib-week-slots">${slotsHtml}</div>
          </div>
        `;
      }).join('');
      wrap.innerHTML = html;
      // wire pick handlers
      wrap.querySelectorAll('[data-pick-iso]').forEach(btn => {
        btn.addEventListener('click', () => {
          const iso = btn.dataset.pickIso;
          const start = btn.dataset.pickStart;
          const slot = weekData.flatMap(d => d.slots).find(s => s.iso === iso && s.start === start);
          if (slot) toggleSlot(slot);
        });
      });
      if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': '1.8' } });
    }

    // ===== FP Calendar suggestion UI =====
    function renderCalendarSlots() {
      const grid = document.getElementById('aib-cal-grid');
      const wrap = document.getElementById('aib-cal');
      if (!grid || !wrap) return;
      const enabled = document.getElementById('aib-attach-slots')?.checked;
      wrap.style.display = enabled ? '' : 'none';
      if (!enabled) return;
      grid.innerHTML = slotsData.map((s, i) => `
        <div class="aib-slot" data-slot-idx="${i}">
          <div class="aib-slot-head">
            <span class="aib-slot-num">候補 ${i+1}</span>
            <button class="aib-slot-remove" data-remove-idx="${i}" title="この候補を外す"><i data-lucide="x"></i></button>
          </div>
          <div class="aib-slot-date">${s.month}/${s.day}<span class="aib-slot-wday">(${s.wday})</span></div>
          <div class="aib-slot-time"><i data-lucide="${s.icon}"></i><span>${s.time}</span></div>
          <div class="aib-slot-free"><i data-lucide="check"></i><span>カレンダー空き</span></div>
        </div>
      `).join('');
      // remove handlers
      grid.querySelectorAll('[data-remove-idx]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.removeIdx, 10);
          slotsData.splice(idx, 1);
          renderOwnerWeek();
          renderCalendarSlots();
          renderPreview();
        });
      });
      if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': '1.6' } });
    }
    document.getElementById('aib-cal-regen')?.addEventListener('click', () => {
      // Take next 3 free slots after current selection
      const all = weekData.flatMap(d => d.slots);
      const usedKeys = new Set(slotsData.map(s => `${s.iso}::${s.start}`));
      const next = all.filter(s => !usedKeys.has(`${s.iso}::${s.start}`)).slice(0, 3);
      if (next.length >= 3) {
        slotsData = next.map(s => ({
          id: `s-${s.iso}-${s.startH}`,
          month: s.month, day: s.day, wday: s.wday,
          time: s.time, icon: s.icon, iso: s.iso, start: s.start,
        }));
        renderOwnerWeek();
        renderCalendarSlots();
        renderPreview();
      }
    });
    document.getElementById('aib-cal-add')?.addEventListener('click', () => {
      openManualPickerModal();
    });

    function openManualPickerModal() {
      const wrap = document.createElement('div');
      wrap.className = 'aib-picker-overlay';
      wrap.innerHTML = `
        <div class="aib-picker">
          <div class="aib-picker-head">
            <i data-lucide="calendar-plus"></i>
            <span>日時を手動で指定</span>
            <button class="aib-picker-close" aria-label="閉じる">×</button>
          </div>
          <div class="aib-picker-body">
            <label class="aib-picker-row">
              <span class="aib-picker-label">日付</span>
              <input type="date" id="aib-pick-date" value="${TODAY.toISOString().slice(0,10)}" min="${TODAY.toISOString().slice(0,10)}">
            </label>
            <label class="aib-picker-row">
              <span class="aib-picker-label">開始時刻</span>
              <select id="aib-pick-time">
                ${Array.from({length:11}, (_,i)=>i+9).map(h => `<option value="${String(h).padStart(2,'0')}:00">${String(h).padStart(2,'0')}:00〜${String(h+1).padStart(2,'0')}:00</option>`).join('')}
              </select>
            </label>
            <div class="aib-picker-note" id="aib-picker-note"></div>
            <div class="aib-picker-cta">
              <button class="primary aib-picker-confirm">この日時を候補に追加</button>
              <button class="ghost-btn aib-picker-cancel">キャンセル</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(wrap);
      if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': '1.6' } });
      const close = () => wrap.remove();
      wrap.querySelector('.aib-picker-close').addEventListener('click', close);
      wrap.querySelector('.aib-picker-cancel').addEventListener('click', close);
      wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
      // Live check vs owner events
      const note = wrap.querySelector('#aib-picker-note');
      const dateInput = wrap.querySelector('#aib-pick-date');
      const timeInput = wrap.querySelector('#aib-pick-time');
      function checkConflict() {
        const iso = dateInput.value;
        const time = timeInput.value;
        const startH = parseInt(time.split(':')[0], 10);
        const conflict = ownerEvents.find(e => e.iso === iso && e.startH === startH);
        if (conflict) {
          note.innerHTML = `<i data-lucide="alert-triangle"></i><span>この時間は既に <strong>「${escapeHtml(conflict.title)}」</strong> の予定が入っています</span>`;
          note.className = 'aib-picker-note aib-picker-note-warn';
        } else {
          note.innerHTML = `<i data-lucide="check"></i><span>このカレンダー上は空きです</span>`;
          note.className = 'aib-picker-note aib-picker-note-ok';
        }
        if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': '1.6' } });
      }
      dateInput.addEventListener('change', checkConflict);
      timeInput.addEventListener('change', checkConflict);
      checkConflict();
      wrap.querySelector('.aib-picker-confirm').addEventListener('click', () => {
        const iso = dateInput.value;
        const time = timeInput.value;
        if (!iso || !time) return;
        const startH = parseInt(time.split(':')[0], 10);
        const d = new Date(iso);
        const wday = ['日','月','火','水','木','金','土'][d.getDay()];
        const newSlot = {
          id: `s-${iso}-${startH}`,
          month: d.getMonth()+1,
          day: d.getDate(),
          wday,
          time: `${time}〜${String(startH+1).padStart(2,'0')}:00`,
          icon: startH < 12 ? 'sunrise' : startH < 17 ? 'sun' : 'moon',
          iso,
          start: time,
        };
        // Replace oldest if 3+
        if (slotsData.length >= 3) slotsData.shift();
        slotsData.push(newSlot);
        slotsData.sort((a,b) => (a.iso+a.start).localeCompare(b.iso+b.start));
        renderOwnerWeek();
        renderCalendarSlots();
        renderPreview();
        close();
      });
    }

    // Re-seed slotsData from weekData (free slots only, take first 3)
    const seedFreeSlots = weekData.flatMap(d => d.slots).slice(0, 3).map((s, i) => ({
      id: `s-${s.iso}-${s.startH}`,
      month: s.month, day: s.day, wday: s.wday,
      time: s.time, icon: s.icon, iso: s.iso, start: s.start,
    }));
    if (seedFreeSlots.length === 3) slotsData = seedFreeSlots;

    // Initial paint
    renderOwnerWeek();
    renderCalendarSlots();
    renderPreview();
  }

  function generateDraftReply(client, events, recs, toneIndex) {
    toneIndex = toneIndex || 0;
    const fullName = client.name || 'お客';
    const lastName = fullName.split(/\s+/)[0];
    const dsl = daysSince(client.lastContact);
    const age = window.LifeEvents.currentAge(client);
    const topRec = (recs && recs[0]) || null;

    // === 状況分析 (context) ===
    // 直近の重要イベント (90日 〜 18ヶ月)
    const upcoming = (events || []).filter(ev => {
      const days = (ev.date - TODAY) / 86400000;
      return days >= 0 && days <= 540;
    }).slice(0, 3);
    const nearestEv = upcoming[0];

    // 提案フォロー漏れ
    const stalledProp = (client.proposals || []).slice().reverse().find(p =>
      p.result === '提案中' || p.result === '検討中'
    );
    const lastSuccessProp = (client.proposals || []).slice().reverse().find(p => p.result === '成約');

    // 直近キャンセル
    const lastCancel = (client.cancellations || []).slice().sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    )[0];
    const recentCancelDays = lastCancel ? daysSince(lastCancel.date) : 9999;
    const recentCancel = recentCancelDays < 30 ? lastCancel : null;

    // 直近 LINE メッセージ
    const lastIncoming = (client.lineHistory || []).slice().reverse().find(m => m.direction === 'in');
    const lastIncomingDays = lastIncoming ? daysSince((lastIncoming.ts || '').slice(0, 10)) : 9999;

    // 家族構成
    const children = (client.family || []).filter(m => m.rel === 'child');
    const spouse = (client.family || []).find(m => m.rel === 'spouse');

    // 保有商品ギャップ
    const owns = (client.products || []).map(p => p.toLowerCase());
    const hasNisa = owns.some(p => p.includes('nisa'));
    const hasIdeco = owns.some(p => p.includes('ideco') || p.includes('idecoまた'));

    // === インテント判定 (優先度順) ===
    let intent = '定期フォロー', reason = '', situation = '';

    if (recentCancel) {
      intent = 'キャンセル後の再アプローチ';
      reason = `${recentCancelDays}日前にキャンセル (理由: ${recentCancel.reason || '不明'})`;
      situation = `直前のキャンセル理由「${recentCancel.reason || '理由なし'}」を踏まえ、お客様の負担にならない柔らかい再提案`;
    } else if (stalledProp) {
      const stalledDays = daysSince(stalledProp.date);
      intent = `${stalledProp.title} のフォローアップ`;
      reason = `${stalledDays}日前提案 / ${stalledProp.result}のまま`;
      situation = `${stalledDays}日前にご提案した「${stalledProp.title}」がまだ${stalledProp.result}。今のタイミングで決断材料を追加して提示`;
    } else if (nearestEv) {
      const evDate = nearestEv.date;
      const daysAway = Math.round((evDate - TODAY) / 86400000);
      const monthsAway = Math.round(daysAway / 30);
      intent = `${nearestEv.label} の事前準備提案`;
      reason = `${monthsAway}ヶ月後に「${nearestEv.label}」(${nearestEv.who})`;
      situation = `${nearestEv.who}様の「${nearestEv.label}」が${monthsAway}ヶ月後。今が準備のラストチャンス`;
    } else if (dsl >= 365) {
      intent = '1年以上未接触の近況伺い';
      reason = `最終接触 ${dsl}日前`;
      situation = `1年以上接触なし。ライフ状況に変化があったか伺いつつ再エンゲージ`;
    } else if (topRec) {
      intent = topRec.action;
      reason = topRec.reason;
      situation = topRec.reason;
    } else {
      intent = '定期フォロー';
      reason = `最終接触 ${dsl}日前`;
      situation = `特段の緊急事項なし。関係維持のための軽い連絡`;
    }

    // === 提案内容の組み立て (具体的) ===
    function buildProposals() {
      const props = [];
      if (recentCancel) {
        if (recentCancel.reason && recentCancel.reason.includes('日程')) {
          props.push('改めて別日候補を3つご提案 (時間帯も柔軟に)');
        } else if (recentCancel.reason && recentCancel.reason.includes('忙し')) {
          props.push('ご都合つく時期を伺うだけのライト連絡');
        } else {
          props.push('内容を整理した1ページ資料を先にお送り → ご都合つく時に面談');
        }
      } else if (stalledProp) {
        props.push(`「${stalledProp.title}」の最新シミュレーション (前回からの市況変化を反映)`);
        if (lastSuccessProp) {
          props.push(`過去にご成約いただいた「${lastSuccessProp.title}」との組み合わせ最適化`);
        }
        props.push('15分のお電話 or Zoom で疑問点を即解消');
      } else if (nearestEv) {
        if (/教育|大学|入学/.test(nearestEv.label)) {
          const childName = (children[0] && children[0].name) || `${nearestEv.who}`;
          props.push(`${childName}様の教育資金、現状残額と必要額のギャップ計算`);
          if (!hasNisa) props.push('NISA未活用なら、教育資金枠としての活用案');
          props.push('奨学金との比較表 (学資保険 vs 投資信託 vs 奨学金)');
        } else if (/退職|年金/.test(nearestEv.label)) {
          props.push(`退職金の受取方法 (一時金 vs 年金) — 税制シミュレーション`);
          if (!hasIdeco) props.push('iDeCo の出口戦略 (受給開始タイミング)');
          props.push('公的年金の繰下げ判定 (繰下げで+0.7%/月)');
        } else if (/相続/.test(nearestEv.label)) {
          props.push('基礎控除と相続税シミュレーション (家族構成ベース)');
          props.push('生前贈与の年110万円枠の活用案');
        } else if (/住宅|ローン/.test(nearestEv.label)) {
          props.push('繰上返済 vs 投資の比較 (金利と期待リターン)');
          props.push('団信見直し (収入保障保険との重複チェック)');
        } else {
          props.push(`「${nearestEv.label}」に向けた資金準備プラン (3案)`);
        }
      } else if (dsl >= 365) {
        props.push('ライフプランの定期見直し (年1回が理想)');
        props.push('家計の現状チェックシート (5分で完了)');
        if (!hasNisa || !hasIdeco) {
          props.push('NISA・iDeCo の最新枠拡充に対応した配分見直し');
        }
      } else {
        props.push('資産配分の年次レビュー');
        props.push(`${age}歳のライフステージに合った新しい商品/制度のご紹介`);
      }
      return props.slice(0, 3);
    }

    const proposals = buildProposals();

    // === トーン別 本文生成 ===
    const tones = [
      // トーン0: 標準・丁寧 — 具体提案つき
      () => {
        let b = `${lastName}様\n\nご無沙汰しております、ファイナンシャルプランナーの福田です。\n\n`;

        // 状況把握の一文
        if (recentCancel) {
          b += `先日はご予約のキャンセルご連絡ありがとうございました。\nまたお時間つけば、ぜひ改めてご一緒できればと思っております。\n\n`;
        } else if (stalledProp) {
          b += `先日ご提案させていただいた「${stalledProp.title}」の件、その後ご検討状況はいかがでしょうか。\n\n`;
        } else if (nearestEv) {
          const monthsAway = Math.round((nearestEv.date - TODAY) / 86400000 / 30);
          b += `${nearestEv.who}様の「${nearestEv.label}」まで${monthsAway}ヶ月となりました。\nこのタイミングで、いくつかご一緒に確認できればと思いご連絡しました。\n\n`;
        } else if (dsl >= 365) {
          b += `お変わりなくお過ごしでしょうか。\n前回ご相談から${Math.round(dsl/30)}ヶ月が経ち、ご家族や家計の状況に変化があるかもしれませんね。\n\n`;
        } else if (lastIncoming && lastIncomingDays < 14) {
          b += `先日はメッセージありがとうございました。\n${lastName}様の現状を踏まえて、改めて整理してみました。\n\n`;
        } else {
          b += `最近のご様子はいかがですか。\n\n`;
        }

        // 提案リスト
        if (proposals.length > 0) {
          b += `今、${lastName}様にお話しできそうな内容を整理しました:\n\n`;
          proposals.forEach((p, i) => { b += `${i + 1}. ${p}\n`; });
          b += `\n上記いずれかでも、ご興味ある内容があればお気軽にご返信ください。`;
        }

        b += `\n\nどうぞよろしくお願いいたします。\n— 福田`;
        return b;
      },

      // トーン1: カジュアル親しみ
      () => {
        let b = `${lastName}様、こんにちは!福田です😊\n\n`;

        if (recentCancel) {
          b += `先日のご都合つかなくて残念でした。\nまた良いタイミングがあればぜひ✨\n\n`;
        } else if (stalledProp) {
          b += `先日お話しした「${stalledProp.title}」、その後どうですか?\n気になる点があればお気軽に💬\n\n`;
        } else if (nearestEv) {
          b += `${nearestEv.who}様の${nearestEv.label}、いよいよ近づいてきましたね!\n\n`;
        } else if (dsl >= 365) {
          b += `お久しぶりです!ご家族みなさん元気にしていますか?\n\n`;
        } else {
          b += `お元気ですか?\n\n`;
        }

        if (proposals.length > 0) {
          b += `こんなトピックでお話できそうです:\n`;
          proposals.forEach(p => { b += `・ ${p}\n`; });
          b += `\n「これ気になる」があればスタンプ1つでもOKです👌`;
        }
        return b;
      },

      // トーン2: 提案型・具体アクション
      () => {
        let b = `${lastName}様\n\n福田です。\n${situation}と考え、ご連絡しました。\n\n`;

        b += `【ご提案 ${proposals.length}つ】\n`;
        proposals.forEach((p, i) => { b += `${i + 1}. ${p}\n`; });

        b += `\n所要 15〜30分のZoomで上記すべてカバーできます。\n下記の候補日でご都合いかがでしょうか?\n\n(本メッセージの後に候補日3つお送りします)`;
        return b;
      },
    ];

    const body = tones[toneIndex % 3]();
    return { intent, reason, body, situation, proposals };
  }

  function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
  }

  // ============================
  // KPI / タスク 管理
  // ============================
  function getKpiDefinitions() {
    const today = TODAY;
    const days = (d) => Math.floor((today - new Date(d)) / 86400000);
    return [
      {
        id: 'kpi-untouched',
        icon: 'phone-missed',
        title: 'アクティブ顧客 月1接触',
        goal: '全顧客に月1回以上の接触',
        unit: '名',
        targetCount: () => clients.filter(c => c.status !== 'dormant').length,
        targetClients: () => clients.filter(c => c.status !== 'dormant' && days(c.lastContact) >= 30),
        intent: '30日以上未接触のため、軽い近況伺いを送る',
      },
      {
        id: 'kpi-stalled',
        icon: 'clock',
        title: '提案検討中のクロージング',
        goal: '90日以内に成約 / 見送り判定',
        unit: '名',
        targetCount: () => clients.filter(c => (c.proposals || []).some(p => p.result === '検討中' || p.result === '提案中')).length,
        targetClients: () => clients.filter(c => {
          const p = (c.proposals || []).slice().reverse().find(p => p.result === '検討中' || p.result === '提案中');
          return p && days(p.date) >= 30;
        }),
        intent: '提案が検討中のまま停滞。決断材料を追加して push',
      },
      {
        id: 'kpi-event',
        icon: 'calendar-clock',
        title: 'ライフイベント先取り',
        goal: 'イベント前60日以内に必ず1接触',
        unit: '名',
        targetCount: () => clients.length,
        targetClients: () => clients.filter(c => {
          if (!window.LifeEvents) return false;
          const evs = window.LifeEvents.generate(c) || [];
          const near = evs.find(ev => {
            const d = (ev.date - today) / 86400000;
            return ev.major && d >= 0 && d <= 60;
          });
          return !!near && days(c.lastContact) >= 21;
        }),
        intent: '60日以内のライフイベント前 / 21日以上未接触',
      },
      {
        id: 'kpi-dormant',
        icon: 'moon',
        title: '休眠客の再エンゲージ',
        goal: '月3名以上を起こす',
        unit: '名',
        targetCount: () => 3,
        targetClients: () => clients.filter(c => c.status === 'dormant' || days(c.lastContact) >= 180).slice(0, 8),
        intent: '180日以上未接触 / 休眠ステータス。軽いトピックで再開',
      },
      {
        id: 'kpi-cancel-recovery',
        icon: 'rotate-ccw',
        title: 'キャンセル後の再アプローチ',
        goal: 'キャンセル後7日以内に必ずフォロー',
        unit: '名',
        targetCount: () => clients.filter(c => (c.cancellations || []).length > 0).length,
        targetClients: () => clients.filter(c => {
          const last = (c.cancellations || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          return last && days(last.date) <= 30 && days(c.lastContact) > days(last.date) - 1;
        }),
        intent: '直近キャンセル / フォロー未実施',
      },
    ];
  }

  function renderKpiBoard() {
    const wrap = document.getElementById('kpi-board');
    if (!wrap) return;
    const defs = getKpiDefinitions();

    const totalRemaining = defs.reduce((s, d) => s + d.targetClients().length, 0);
    const navCount = document.getElementById('nav-count-kpi');
    if (navCount) navCount.textContent = totalRemaining || '';

    wrap.innerHTML = defs.map(def => {
      const clientsList = def.targetClients();
      const total = def.targetCount();
      const remaining = clientsList.length;
      const done = Math.max(0, total - remaining);
      const pct = total > 0 ? Math.round(done / total * 100) : 100;
      const status = remaining === 0 ? 'good' : (remaining > total * 0.5 ? 'critical' : 'warn');

      const tasksHtml = clientsList.slice(0, 10).map(c => {
        const dsl = Math.floor((TODAY - new Date(c.lastContact)) / 86400000);
        const initial = (c.name || '?').replace(/\s+/g, '').slice(0, 1);
        return `
          <div class="kpi-task" data-kpi-client="${c.id}">
            <div class="kpi-task-avatar">${escapeHtml(initial)}</div>
            <div class="kpi-task-body">
              <div class="kpi-task-name">${escapeHtml(c.name)} 様 <span class="status-pill ${c.status}">${statusLabel(c.status)}</span></div>
              <div class="kpi-task-meta">最終接触 ${dsl}日前 / ${escapeHtml(c.occupation || '—')} / AUM ¥${fmtMoney(c.aum)}</div>
            </div>
            <button class="kpi-task-btn primary" data-kpi-ai="${c.id}">
              <i data-lucide="wand-2"></i><span>AI下書き → 送信</span>
            </button>
          </div>
        `;
      }).join('') || '<div class="kpi-empty"><i data-lucide="check-circle-2"></i><span>このKPIは今月達成済みです 🎉</span></div>';

      return `
        <div class="kpi-card kpi-tone-${status}">
          <div class="kpi-card-head">
            <div class="kpi-card-icon"><i data-lucide="${def.icon}"></i></div>
            <div class="kpi-card-meta">
              <div class="kpi-card-title">${escapeHtml(def.title)}</div>
              <div class="kpi-card-goal">${escapeHtml(def.goal)}</div>
            </div>
            <div class="kpi-card-stats">
              <div class="kpi-stat-num">${remaining}<span class="kpi-stat-unit">${def.unit}</span></div>
              <div class="kpi-stat-label">未対応</div>
            </div>
          </div>
          <div class="kpi-card-progress">
            <div class="kpi-progress-bar"><div class="kpi-progress-fill" style="width:${pct}%"></div></div>
            <div class="kpi-progress-meta">対応済 <strong>${done}</strong> / 目標 <strong>${total}</strong> (${pct}%)</div>
          </div>
          <div class="kpi-card-intent">
            <i data-lucide="info"></i>
            <span>${escapeHtml(def.intent)}</span>
          </div>
          <div class="kpi-task-list">
            ${tasksHtml}
          </div>
        </div>
      `;
    }).join('');

    // Wire actions
    wrap.querySelectorAll('[data-kpi-ai]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cid = btn.dataset.kpiAi;
        const c = clients.find(x => x.id === cid);
        if (!c) return;
        const evs = window.LifeEvents.generate(c);
        const recs = window.Recommender.forClient(c, evs);
        openDraftReplyModal(c, evs, recs);
      });
    });
    wrap.querySelectorAll('[data-kpi-client]').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        openClientModal(row.dataset.kpiClient);
      });
    });
  }

  // Render on tab switch
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.tab[data-tab="kpi"]');
    if (t) setTimeout(renderKpiBoard, 80);
  });
  setTimeout(renderKpiBoard, 1000);

  // ============================
  // util
  // ============================
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  // ============================
  // 初期化
  // ============================
  document.addEventListener('DOMContentLoaded', () => {
    // メタ
    document.getElementById('app-meta').textContent =
      `デモデータ ${clients.length}名 / 基準日 ${fmtDate(TODAY)}`;

    // タブ
    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => activateTab(t.dataset.tab));
    });

    // 検索
    const searchEl = document.getElementById('client-search');
    searchEl.addEventListener('input', e => {
      state.search = e.target.value;
      saveState();
      renderClients();
    });
    document.getElementById('status-filter').addEventListener('change', e => {
      state.statusFilter = e.target.value;
      saveState();
      renderClients();
    });
    const sortByEl = document.getElementById('sort-by');
    if (sortByEl) {
      sortByEl.addEventListener('change', e => {
        state.sortBy = e.target.value;
        saveState();
        renderClients();
      });
    }

    // 新規顧客ボタン
    const addBtn = document.getElementById('add-client-btn');
    if (addBtn) addBtn.addEventListener('click', () => openClientForm(null));

    // モーダル外クリックで閉じる
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'modal-overlay') closeModal();
    });
    document.getElementById('form-overlay').addEventListener('click', e => {
      if (e.target.id === 'form-overlay') {
        document.getElementById('form-overlay').style.display = 'none';
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeModal();
        document.getElementById('form-overlay').style.display = 'none';
      }
    });

    // line-app.js から呼び出せるように公開
    window.FpApp = { openClientModal: openClientModal, openClientForm: openClientForm };

    activateTab(state.activeTab);
  });
})();
