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

    // 今週話すべき客 (top 8) — Brief Card 階層 (1: mega / 2-3: medium / 4+: compact)
    const tops = window.Recommender.topAcrossClients(clients, 8);
    const list = document.getElementById('action-list');
    if (tops.length === 0) {
      list.innerHTML = '<div class="empty">今週の重点アクションはありません</div>';
      return;
    }

    const todayDate = window.LifeEvents.TODAY;
    const fmtMoneyAum = (v) => v >= 100000000 ? `¥${(v/100000000).toFixed(2)}億` : `¥${Math.round(v/10000).toLocaleString()}万`;

    const briefCardHtml = (t, rank) => {
      const c = t.client;
      const p = t.topAction.priority;
      const initial = (c.name || '?').replace(/\s+/g, '').slice(0, 1);
      const days = Math.max(0, Math.floor((todayDate - new Date(c.lastContact)) / 86400000));
      const age = window.LifeEvents.currentAge(c);
      const childCount = (c.family || []).filter(m => m.rel === 'child').length;
      const family = childCount > 0 ? `配偶者 + 子${childCount}` :
        ((c.family || []).find(m => m.rel === 'spouse') ? '夫婦' : '単身');

      // Find next upcoming event
      const evs = window.LifeEvents.generate(c);
      const futureEv = evs.find(ev => new Date(ev.date) >= todayDate);
      const nextEvent = futureEv ? {
        title: futureEv.title || futureEv.kind || futureEv.name || 'イベント',
        rel: window.LifeEvents.formatRelative(new Date(futureEv.date))
      } : null;

      // Channel suggestion (heuristic)
      const channel = c.lineFriendId ? 'LINE' : '電話';
      const minutes = days >= 365 ? '15分' : days >= 90 ? '10分' : '5分';
      const priorityLabelText = priorityLabel(p);
      const priorityCls = priorityClass(p);

      // TIER 1 — Mega next-best-action card
      if (rank === 0) {
        return `
        <div class="brief-card brief-card-mega" data-client-id="${c.id}">
          <div class="brief-rank-badge"><i data-lucide="flame"></i><span>NEXT BEST ACTION · #${rank+1}</span></div>
          <div class="brief-mega-grid">
            <div class="brief-mega-left">
              <div class="brief-mega-head">
                <div class="brief-mega-avatar">${initial}</div>
                <div>
                  <div class="brief-mega-name">${escapeHtml(c.name)} 様 <span class="status-pill ${c.status}">${statusLabel(c.status)}</span></div>
                  <div class="brief-mega-meta">${age}歳 / ${escapeHtml(c.occupation || '—')} / ${family}</div>
                </div>
              </div>
              <div class="brief-mega-action">
                <span class="brief-mega-action-label">いま取るべきアクション</span>
                <div class="brief-mega-action-text">${escapeHtml(t.topAction.action)}</div>
                <div class="brief-mega-reason"><i data-lucide="sparkles"></i><span>${escapeHtml(t.topAction.reason)}</span></div>
              </div>
              <div class="brief-mega-cta">
                <button class="primary" data-brief-open="${c.id}"><i data-lucide="message-square-text"></i><span>${channel}で連絡する</span></button>
                <button class="ghost-btn" data-brief-detail="${c.id}"><i data-lucide="user"></i><span>詳細</span></button>
                <button class="ghost-btn" data-brief-snooze="${c.id}"><i data-lucide="clock"></i><span>後回し</span></button>
                <span class="brief-time-hint"><i data-lucide="timer"></i> 所要約${minutes}</span>
              </div>
            </div>
            <div class="brief-mega-right">
              <div class="brief-stat">
                <span class="brief-stat-label">優先度</span>
                <span class="brief-stat-pill brief-pri ${priorityCls}">${priorityLabelText}</span>
              </div>
              <div class="brief-stat">
                <span class="brief-stat-label">管理資産</span>
                <span class="brief-stat-value">${fmtMoneyAum(c.aum)}</span>
              </div>
              <div class="brief-stat">
                <span class="brief-stat-label">最終接触</span>
                <span class="brief-stat-value">${days}<span class="brief-stat-unit">日前</span></span>
              </div>
              <div class="brief-stat">
                <span class="brief-stat-label">次のイベント</span>
                <span class="brief-stat-text">${nextEvent ? escapeHtml(nextEvent.title) : 'なし'}</span>
                ${nextEvent ? `<span class="brief-stat-sub">${escapeHtml(nextEvent.rel)}</span>` : ''}
              </div>
            </div>
          </div>
        </div>`;
      }

      // TIER 2 — Medium card (rank 1-2)
      if (rank <= 2) {
        return `
        <div class="brief-card brief-card-medium" data-client-id="${c.id}">
          <div class="brief-rank-medium">#${rank+1}</div>
          <div class="brief-medium-head">
            <div class="brief-medium-avatar">${initial}</div>
            <div class="brief-medium-meta">
              <div class="brief-medium-name">${escapeHtml(c.name)} 様 <span class="status-pill ${c.status}">${statusLabel(c.status)}</span></div>
              <div class="brief-medium-sub">${age}歳 / ${escapeHtml(c.occupation || '—')} / ${fmtMoneyAum(c.aum)}</div>
            </div>
            <span class="brief-pri ${priorityCls}">${priorityLabelText}</span>
          </div>
          <div class="brief-medium-action">${escapeHtml(t.topAction.action)}</div>
          <div class="brief-medium-reason"><i data-lucide="sparkles"></i><span>${escapeHtml(t.topAction.reason)}</span></div>
          <div class="brief-medium-foot">
            <div class="brief-medium-info"><i data-lucide="clock"></i> ${days}日未接触 ${nextEvent ? `· 次: ${escapeHtml(nextEvent.title)} (${escapeHtml(nextEvent.rel)})` : ''}</div>
            <div class="brief-medium-cta">
              <button class="ghost-btn brief-mini-btn" data-brief-detail="${c.id}"><i data-lucide="arrow-right"></i><span>開く</span></button>
            </div>
          </div>
        </div>`;
      }

      // TIER 3 — Compact row (rank 3+)
      return `
        <div class="brief-compact" data-client-id="${c.id}">
          <span class="brief-compact-rank">#${rank+1}</span>
          <span class="brief-compact-avatar">${initial}</span>
          <div class="brief-compact-body">
            <div class="brief-compact-name">${escapeHtml(c.name)} 様 <span class="status-pill ${c.status}">${statusLabel(c.status)}</span></div>
            <div class="brief-compact-action">${escapeHtml(t.topAction.action)}</div>
          </div>
          <span class="brief-compact-meta">${days}日 / ${fmtMoneyAum(c.aum)}</span>
          <span class="brief-pri ${priorityCls}">${priorityLabelText}</span>
          <button class="brief-mini-btn" data-brief-detail="${c.id}"><i data-lucide="chevron-right"></i></button>
        </div>`;
    };

    list.innerHTML = `
      <div class="brief-stack">
        ${tops.map((t, i) => briefCardHtml(t, i)).join('')}
      </div>
    `;

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

  // ============================
  // 顧客詳細モーダル
  // ============================
  function openClientModal(id) {
    const c = clients.find(x => x.id === id);
    if (!c) return;
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

    document.getElementById('modal-content').innerHTML = `
      <div class="modal-header">
        <h2>
          ${escapeHtml(c.name)}
          <span class="status-pill ${c.status}">${statusLabel(c.status)}</span>
        </h2>
        <div style="display:flex;gap:6px;align-items:center;">
          <button id="modal-draft-btn" data-hint="この顧客向けのLINE返信文をAIが自動で作る → 確認・編集してLINE送信できます" style="background:linear-gradient(135deg,#b8893d,#d4a017);border:none;color:#fff;font-weight:700;">✨ AI返信下書きを作る</button>
          <button id="modal-edit-btn" data-hint="顧客情報・家族構成・住宅ローン・LINE連携などを編集">編集</button>
          <button class="modal-close" id="modal-close-btn" data-hint="閉じる">×</button>
        </div>
      </div>
      <div class="modal-body">
        <div class="detail-grid">
          <div class="detail-block">
            <h3>基本情報</h3>
            <dl>
              <dt>フリガナ</dt><dd>${escapeHtml(c.kana)}</dd>
              <dt>生年月日</dt><dd>${c.birth} (${window.LifeEvents.currentAge(c)}歳)</dd>
              <dt>職業</dt><dd>${escapeHtml(c.occupation)}</dd>
              <dt>流入経路</dt><dd>${escapeHtml(c.source)}</dd>
              <dt>管理資産</dt><dd>¥${fmtMoney(c.aum)}</dd>
              ${mortgageHtml}
              <dt>最終接触</dt><dd>${c.lastContact} (${daysSince(c.lastContact)}日前)</dd>
            </dl>
          </div>
          <div class="detail-block">
            <h3>家族構成</h3>
            <ul class="family-list">${familyHtml}</ul>
          </div>
        </div>

        <div class="detail-section">
          <h3>次にやること <span class="count-badge">${recs.length}</span></h3>
          <div class="actions-list">${actionsHtml}</div>
        </div>

        <div class="detail-section">
          <h3>ライフイベント・タイムライン (向こう30年) <span class="count-badge">${events.length}</span></h3>
          <div class="client-timeline">${timelineHtml}</div>
        </div>

        ${renderMeetingRecordsBlock(c)}

        <div class="detail-section">
          <h3>提案履歴 <span class="count-badge">${(c.proposals || []).length}</span></h3>
          <ul class="proposals-list">${proposalsHtml}</ul>
        </div>

        ${c.note ? `<div class="detail-section">
          <h3>メモ</h3>
          <div style="background:#fafbfc;border:1px solid var(--line);border-radius:6px;padding:12px 14px;font-size:13px;line-height:1.6;">${escapeHtml(c.note)}</div>
        </div>` : ''}

        ${renderReferralBlock(c)}
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
    const html = `
      <div class="modal-header">
        <h2>✨ AI返信下書き — ${escapeHtml(client.name)} 様 宛</h2>
        <button class="modal-close" id="draft-close">×</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;align-items:center;gap:10px;font-size:11.5px;color:var(--muted);margin-bottom:8px;letter-spacing:0.02em;">
          <span style="background:linear-gradient(135deg,#fff8e1,#fff);border:1px solid #f0d36b;color:#8a6f1e;padding:2px 9px;border-radius:9px;font-weight:700;letter-spacing:0.04em;">${escapeHtml(draft.intent)}</span>
          <span>${escapeHtml(draft.reason)}</span>
        </div>
        <textarea id="draft-text" style="width:100%;min-height:280px;font-family:'Noto Sans JP',sans-serif;font-size:13.5px;line-height:1.85;padding:16px 18px;border:1px solid var(--line);border-radius:8px;background:#fff;letter-spacing:0.02em;">${escapeHtml(draft.body)}</textarea>
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
          <button class="primary" id="draft-send" data-hint="このまま LINE 公式アカウントから本送信します (取消不可)">📨 この内容で LINE 送信</button>
          <button id="draft-copy" data-hint="文面をクリップボードへ。送信せずに手動でLINEに貼るとき使用">📋 コピー</button>
          <button id="draft-regen" data-hint="同じ顧客で別のトーン (丁寧/カジュアル/提案型) で再生成">🔄 別のトーンで生成</button>
          <button id="draft-close-btn" style="margin-left:auto;" data-hint="閉じる">閉じる</button>
        </div>
        <div id="draft-msg" style="font-size:11.5px;color:var(--muted);margin-top:8px;text-align:center;letter-spacing:0.02em;"></div>
        <div style="margin-top:18px;padding:12px 16px;background:#fafbfc;border:1px solid var(--line);border-radius:8px;font-size:11.5px;color:var(--muted);line-height:1.7;">
          💡 AIがこの顧客のライフイベント・最終接触日・提案履歴を分析して生成しました。<br>
          内容を確認・編集して、LINE公式アカウントの個別トークから送信してください。
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
      const text = document.getElementById('draft-text').value;
      const userId = client.lineFriendId || client.userId;
      const sendBtn = document.getElementById('draft-send');
      const msg = document.getElementById('draft-msg');
      if (!userId) {
        msg.textContent = '⚠ LINE friend ID が未設定のため送信できません (顧客編集で登録してください)';
        msg.style.color = 'var(--red)';
        return;
      }
      if (!confirm(client.name + ' 様 へ この内容で LINE 送信します。よろしいですか?')) return;
      sendBtn.disabled = true;
      sendBtn.textContent = '送信中...';
      try {
        const r = await fetch('https://fp-compass-webhook-527726449426.asia-northeast1.run.app/api/line/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId, text: text }),
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
      document.getElementById('draft-text').value = newDraft.body;
    });
  }

  function generateDraftReply(client, events, recs, toneIndex) {
    toneIndex = toneIndex || 0;
    const name = (client.name || 'お客').split(/\s+/)[0]; // 苗字
    const dsl = daysSince(client.lastContact);
    const topRec = (recs && recs[0]) || null;

    // 直近の重要イベント (90日以内)
    const nearby = (events || []).filter(ev => {
      const days = (ev.date - TODAY) / 86400000;
      return days >= 0 && days <= 90;
    }).slice(0, 2);

    // 提案フォロー漏れ
    const stalledProp = (client.proposals || []).reverse().find(p =>
      p.result === '提案中' || p.result === '検討中'
    );

    // インテント判定
    let intent = '定期フォロー', reason = '', body = '';

    if (dsl >= 365) {
      intent = '1年以上未接触フォロー';
      reason = `最終接触 ${dsl}日前`;
    } else if (stalledProp) {
      intent = '提案フォローアップ';
      reason = `${stalledProp.title} が ${stalledProp.result}のまま`;
    } else if (nearby.length > 0) {
      intent = 'ライフイベント先取り';
      reason = `${nearby[0].who} : ${nearby[0].label}`;
    } else if (topRec) {
      intent = topRec.action;
      reason = topRec.reason;
    } else {
      intent = '定期フォロー';
      reason = `最終接触 ${dsl}日前`;
    }

    // 3トーンのバリエーション
    const tones = [
      // トーン0: 標準・丁寧
      () => {
        let b = `${name}様\n\nご無沙汰しております、ファイナンシャルプランナーの福田です。\n\n`;
        if (stalledProp) {
          b += `先日ご提案させていただいた「${stalledProp.title}」の件、その後ご検討状況はいかがでしょうか。\n\nご質問やご懸念があれば、お気軽にお聞かせください。`;
        } else if (nearby.length > 0) {
          b += `${nearby[0].who}様の「${nearby[0].label}」が近づいてきました。\n\n資金準備や手続きについて、お話しできる機会があればと思い、ご連絡しました。お時間ある時にこのトークで返信いただけると嬉しいです。`;
        } else if (dsl >= 365) {
          b += `お変わりなくお過ごしでしょうか。\n\n前回お会いしてから少し時間が経ちましたので、ご家族の近況やお考えの変化など、近況伺いだけでもさせていただけたらと思います。`;
        } else {
          b += `最近のご様子はいかがですか。\n\nお時間ある時に、ライフプランの定期見直しをご一緒できればと思っております。`;
        }
        b += `\n\nどうぞよろしくお願いいたします。`;
        return b;
      },
      // トーン1: カジュアル親しみ
      () => {
        let b = `${name}様、こんにちは!福田です🌸\n\n`;
        if (stalledProp) {
          b += `先日お話しした「${stalledProp.title}」、その後どうですか?\n\n「ここちょっと気になる」「もう少し詳しく聞きたい」などあれば、お気軽にどうぞ✨`;
        } else if (nearby.length > 0) {
          b += `${nearby[0].who}様の${nearby[0].label}が近づいていますね😊\n\n資金面の準備で気になることがあればお気軽に。\n少しでも安心して迎えられるようサポートします!`;
        } else if (dsl >= 365) {
          b += `お久しぶりです!ご家族みなさんお元気ですか?\n\n久しぶりに近況伺えると嬉しいです。お時間ある時にスタンプ1つでも☺️`;
        } else {
          b += `お元気ですか?\n\n季節の変わり目、家計やプランで気になることがあればお気軽にメッセージください!`;
        }
        return b;
      },
      // トーン2: 提案型・前向き
      () => {
        let b = `${name}様\n\n福田です。${name}様の状況を改めて整理していまして、ご提案したいことが出てきましたのでご連絡しました。\n\n`;
        if (stalledProp) {
          b += `①「${stalledProp.title}」 — 現在の市況だと、もう一段早めに決断するメリットが出てきています。\n② 関連で、税制改正の影響も併せてご説明できればと思います。\n\n15分のお電話か、Zoomで再度お時間いただけますか?`;
        } else if (nearby.length > 0) {
          b += `①「${nearby[0].label}」を見据えた資金準備プラン (3案)\n② 公的制度・税制を最大限活かす方法\n\nどちらか30分でも、お時間調整できればと思います。来週以降のご都合いかがでしょう?`;
        } else if (dsl >= 365) {
          b += `① ライフプランの定期見直し (年1回が理想)\n② 最新の税制改正・NISA枠の拡充への対応\n\n短時間で構いませんので、近況伺いも兼ねて1度お時間ください。`;
        } else {
          b += `① 直近の資産配分レビュー\n② ${name}様に合う新しい商品/制度のご紹介\n\nお気軽にこのトークか面談予約からどうぞ。`;
        }
        return b;
      },
    ];
    body = tones[toneIndex % 3]();
    return { intent, reason, body };
  }

  function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
  }

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
