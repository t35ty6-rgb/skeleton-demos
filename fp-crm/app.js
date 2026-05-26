// FP顧客管理ツール デモ メインスクリプト
// シングルページ。ダッシュボード / 顧客一覧 / タイムライン / 顧客詳細モーダル。

(function () {
  const clients = window.DUMMY_CLIENTS;
  const TODAY = window.LifeEvents.TODAY;
  const LS_KEY = 'fp-crm-state-v1';

  const state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : { activeTab: 'dashboard', search: '', statusFilter: 'all' };
    } catch (e) {
      return { activeTab: 'dashboard', search: '', statusFilter: 'all' };
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

    document.getElementById('kpi-area').innerHTML = `
      <div class="kpi">
        <div class="kpi-label">管理顧客数</div>
        <div class="kpi-value">${totalClients}<span class="unit">名</span></div>
        <div class="kpi-sub">うち重点 ${importantCount} 名</div>
      </div>
      <div class="kpi ${upcoming3m > 0 ? 'warn' : 'good'}">
        <div class="kpi-label">3ヶ月以内の重要イベント</div>
        <div class="kpi-value">${upcoming3m}<span class="unit">件</span></div>
        <div class="kpi-sub">大学入学・退職・相続など</div>
      </div>
      <div class="kpi ${staleCount > 5 ? 'alert' : (staleCount > 0 ? 'warn' : 'good')}">
        <div class="kpi-label">半年以上 未接触</div>
        <div class="kpi-value">${staleCount}<span class="unit">名</span></div>
        <div class="kpi-sub">フォロー要</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">管理資産合計</div>
        <div class="kpi-value">¥${fmtMoney(totalAum)}</div>
        <div class="kpi-sub">平均 ¥${fmtMoney(Math.round(totalAum / totalClients))}/名</div>
      </div>
    `;

    // 今週話すべき客 (top 8)
    const tops = window.Recommender.topAcrossClients(clients, 8);
    const list = document.getElementById('action-list');
    if (tops.length === 0) {
      list.innerHTML = '<div class="empty">今週の重点アクションはありません</div>';
      return;
    }
    list.innerHTML = tops.map(t => {
      const p = t.topAction.priority;
      return `
        <div class="action-item" data-client-id="${t.client.id}">
          <div><span class="action-priority ${priorityClass(p)}">${priorityLabel(p)}</span></div>
          <div class="action-client">
            ${escapeHtml(t.client.name)} <span class="status-pill ${t.client.status}">${statusLabel(t.client.status)}</span>
            <div class="client-meta">${window.LifeEvents.currentAge(t.client)}歳 / ${escapeHtml(t.client.occupation)} / AUM ¥${fmtMoney(t.client.aum)}</div>
          </div>
          <div class="action-detail">
            <strong>${escapeHtml(t.topAction.action)}</strong>
            <div class="reason">${escapeHtml(t.topAction.reason)}</div>
          </div>
          <div class="action-cta"><button class="primary">開く →</button></div>
        </div>
      `;
    }).join('');
    list.querySelectorAll('.action-item').forEach(el => {
      el.addEventListener('click', () => openClientModal(el.dataset.clientId));
    });
  }

  // ============================
  // 顧客一覧
  // ============================
  function renderClients() {
    const searchEl = document.getElementById('client-search');
    const filterEl = document.getElementById('status-filter');
    if (searchEl.value !== state.search) searchEl.value = state.search;
    if (filterEl.value !== state.statusFilter) filterEl.value = state.statusFilter;

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
    // 次接触必要 (lastContact が古い) 順
    list.sort((a, b) => daysSince(b.lastContact) - daysSince(a.lastContact));

    document.getElementById('client-count').textContent = `${list.length} / ${clients.length} 名`;

    const tbody = document.getElementById('client-tbody');
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">該当する顧客がいません</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(c => {
      const dsl = daysSince(c.lastContact);
      const contactCls = dsl >= 365 ? 'contact-stale' : (dsl >= 180 ? 'contact-warn' : '');
      const childCount = (c.family || []).filter(m => m.rel === 'child').length;
      const familyTxt = childCount > 0 ? `配偶者+子${childCount}` :
        ((c.family || []).find(m => m.rel === 'spouse') ? '夫婦' : '単身');
      return `
        <tr data-client-id="${c.id}">
          <td><strong>${escapeHtml(c.name)}</strong><div style="font-size:11px;color:var(--muted)">${escapeHtml(c.kana)}</div></td>
          <td>${window.LifeEvents.currentAge(c)}</td>
          <td class="hide-mobile">${escapeHtml(c.occupation)}</td>
          <td>${familyTxt}</td>
          <td><span class="status-pill ${c.status}">${statusLabel(c.status)}</span></td>
          <td class="num">¥${fmtMoney(c.aum)}</td>
          <td class="${contactCls}">${dsl}日前</td>
        </tr>
      `;
    }).join('');
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => openClientModal(tr.dataset.clientId));
    });
  }

  // ============================
  // 全体タイムライン (向こう15年、major イベントのみ)
  // ============================
  function renderGlobalTimeline() {
    const horizon = 15;
    const startY = TODAY.getFullYear();
    const endY = startY + horizon;

    // 顧客ごとに行を作る (顧客名 + その人のイベントを横軸に並べる)
    // 重点 / 管理中 / 新規のみ。休眠は除く。
    const visibleClients = clients
      .filter(c => c.status !== 'dormant')
      .map(c => ({ client: c, events: window.LifeEvents.generate(c).filter(ev => ev.date.getFullYear() <= endY) }))
      .filter(x => x.events.length > 0)
      // 直近イベントが早い順
      .sort((a, b) => a.events[0].date - b.events[0].date);

    // 年軸ヘッダ
    const yearLabels = [];
    for (let y = startY; y <= endY; y++) yearLabels.push(y);

    const axisHtml = `
      <div class="timeline-axis">
        <div>顧客 (年齢)</div>
        <div style="display:grid;grid-template-columns:repeat(${horizon + 1},1fr);font-size:10.5px;">
          ${yearLabels.map(y => `<div style="text-align:center;">${y}</div>`).join('')}
        </div>
      </div>
    `;

    const rowsHtml = visibleClients.map(({ client, events }) => {
      // 各イベントを左から % で配置
      const evHtml = events.map(ev => {
        const yearsFromNow = (ev.date - TODAY) / (365 * 24 * 60 * 60 * 1000);
        const leftPct = (yearsFromNow / horizon) * 100;
        if (leftPct < 0 || leftPct > 100) return '';
        return `<div class="timeline-event ${ev.cat}${ev.major ? ' major' : ''}" style="left:${leftPct.toFixed(2)}%" title="${escapeHtml(ev.who)}: ${escapeHtml(ev.label)} (${fmtDate(ev.date)})">${escapeHtml(ev.label)}</div>`;
      }).join('');
      return `
        <div class="timeline-row" data-client-id="${client.id}" style="cursor:pointer;">
          <div class="row-label">${escapeHtml(client.name)}<span class="age">${window.LifeEvents.currentAge(client)}歳</span></div>
          <div class="timeline-events">${evHtml}</div>
        </div>
      `;
    }).join('');

    document.getElementById('timeline-area').innerHTML = `
      ${axisHtml}
      ${rowsHtml || '<div class="empty">表示するイベントがありません</div>'}
      <div class="legend">
        <span class="legend-item"><span class="legend-swatch" style="background:var(--accent-soft)"></span>教育</span>
        <span class="legend-item"><span class="legend-swatch" style="background:var(--yellow-soft)"></span>退職・年金</span>
        <span class="legend-item"><span class="legend-swatch" style="background:var(--red-soft)"></span>医療・介護</span>
        <span class="legend-item"><span class="legend-swatch" style="background:var(--purple-soft)"></span>相続</span>
        <span class="legend-item"><span class="legend-swatch" style="background:var(--green-soft)"></span>金融</span>
        <span class="legend-item"><span class="legend-swatch" style="background:#f0e8d8"></span>家族</span>
        <span class="legend-item" style="margin-left:auto;">枠付き=重要イベント</span>
      </div>
    `;

    document.querySelectorAll('#timeline-area .timeline-row').forEach(r => {
      r.addEventListener('click', () => openClientModal(r.dataset.clientId));
    });
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
        <button class="modal-close" id="modal-close-btn">×</button>
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

        <div class="detail-section">
          <h3>提案履歴 <span class="count-badge">${(c.proposals || []).length}</span></h3>
          <ul class="proposals-list">${proposalsHtml}</ul>
        </div>

        ${c.note ? `<div class="detail-section">
          <h3>メモ</h3>
          <div style="background:#fafbfc;border:1px solid var(--line);border-radius:6px;padding:12px 14px;font-size:13px;line-height:1.6;">${escapeHtml(c.note)}</div>
        </div>` : ''}
      </div>
    `;
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
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

    // モーダル外クリックで閉じる
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'modal-overlay') closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });

    activateTab(state.activeTab);
  });
})();
