// LINE公式連携 UIロジック
// サブタブ7つ: 配信ダッシュボード / セグメント / スケジュール / テンプレ / 誕生日 / ログ / 設定

(function () {
  const TODAY = window.LineCRM.TODAY;
  let currentSubview = 'dashboard';

  function fmtMoney(n) {
    if (n >= 100_000_000) return (n / 100_000_000).toFixed(2).replace(/\.?0+$/, '') + '億';
    if (n >= 10_000) return Math.round(n / 10_000).toLocaleString() + '万';
    return n.toLocaleString();
  }
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
  function nl2br(s) {
    return escapeHtml(s).replace(/\n/g, '<br>');
  }
  function fmtDate(d) {
    if (typeof d === 'string') d = new Date(d);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }

  // ============================
  // サブタブ切替
  // ============================
  function activateSubview(name) {
    currentSubview = name;
    document.querySelectorAll('.line-subtab').forEach(t => {
      t.classList.toggle('active', t.dataset.lineSub === name);
    });
    document.querySelectorAll('.line-subview').forEach(v => {
      v.classList.toggle('active', v.dataset.lineView === name);
    });
    if (name === 'dashboard') renderLineDashboard();
    if (name === 'segments') renderSegments();
    if (name === 'schedules') renderSchedules();
    if (name === 'templates') renderTemplates();
    if (name === 'birthdays') renderBirthdays();
    if (name === 'log') renderLog();
    if (name === 'settings') renderSettings();
  }

  // ============================
  // 配信ダッシュボード
  // ============================
  function renderLineDashboard() {
    const subscribers = (window.DUMMY_CLIENTS || []).filter(c => c.lineSubscribed).length;
    const enabledSchedules = window.LINE_SCHEDULES.filter(s => s.enabled).length;
    const monthSent = window.LINE_LOG.reduce((s, l) => s + l.success, 0);
    const upcoming = window.LineCRM.upcomingBirthdays(30);
    const todayBirthdays = upcoming.filter(b => b.daysAhead === 0);

    // 次の配信予定(直近5件)
    const upcomingScheds = window.LINE_SCHEDULES
      .filter(s => s.enabled && s.nextSend && !s.nextSend.startsWith('—'))
      .sort((a, b) => a.nextSend.localeCompare(b.nextSend))
      .slice(0, 5);

    const html = `
      <div class="kpi-row" style="grid-template-columns: repeat(4, 1fr);">
        <div class="kpi">
          <div class="kpi-label">LINE友だち数</div>
          <div class="kpi-value">${subscribers}<span class="unit">名</span></div>
          <div class="kpi-sub">全顧客の ${Math.round(subscribers / window.DUMMY_CLIENTS.length * 100)}%</div>
        </div>
        <div class="kpi good">
          <div class="kpi-label">稼働中シナリオ</div>
          <div class="kpi-value">${enabledSchedules}<span class="unit">本</span></div>
          <div class="kpi-sub">自動配信中</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">今月の送信数</div>
          <div class="kpi-value">${monthSent}<span class="unit">通</span></div>
          <div class="kpi-sub">直近のログ集計</div>
        </div>
        <div class="kpi ${todayBirthdays.length > 0 ? 'warn' : ''}">
          <div class="kpi-label">今日の誕生日</div>
          <div class="kpi-value">${todayBirthdays.length}<span class="unit">名</span></div>
          <div class="kpi-sub">今後30日: ${upcoming.length}名</div>
        </div>
      </div>

      <div class="section-title" style="margin-top:24px;">今後の自動配信予定</div>
      <div class="line-card">
        ${upcomingScheds.length === 0 ? '<div class="empty">予定なし</div>' :
          upcomingScheds.map(s => {
            const seg = window.SEGMENTS.find(x => x.id === s.segment);
            const tpl = window.LINE_TEMPLATES.find(x => x.id === s.templateId);
            const recipients = seg ? window.LineCRM.evaluateSegment(seg.id).length :
              (s.segment === 'auto-birthday' ? todayBirthdays.length : 0);
            return `
              <div class="sched-row">
                <div class="sched-icon">📨</div>
                <div class="sched-main">
                  <div class="sched-name">${escapeHtml(s.name)}</div>
                  <div class="sched-meta">${escapeHtml(s.schedule)} → ${seg ? seg.icon + ' ' + escapeHtml(seg.name) : '誕生日対象者'} (${recipients}名)</div>
                </div>
                <div class="sched-next">${escapeHtml(s.nextSend)}</div>
              </div>
            `;
          }).join('')
        }
      </div>

      <div class="section-title" style="margin-top:24px;">今日〜1週間以内の誕生日</div>
      <div class="line-card">
        ${upcoming.filter(b => b.daysAhead <= 7).length === 0 ? '<div class="empty">該当なし</div>' :
          upcoming.filter(b => b.daysAhead <= 7).map(b => `
            <div class="bday-row">
              <div class="bday-date">${(b.date.getMonth() + 1)}/${b.date.getDate()}<span class="bday-rel">${b.daysAhead === 0 ? '本日' : b.daysAhead + '日後'}</span></div>
              <div class="bday-main">
                <strong>${escapeHtml(b.personName)}</strong> <span class="bday-rel-tag">${b.rel}</span>
                <div class="bday-meta">${b.age}歳 / 顧客: ${escapeHtml(b.client.name)}</div>
              </div>
              <div class="bday-action">${b.daysAhead === 0 ? '<span class="line-status-pill on">✓ 9:00 送信予定</span>' : '<span class="line-status-pill">予約済</span>'}</div>
            </div>
          `).join('')
        }
      </div>
    `;
    document.querySelector('[data-line-view="dashboard"]').innerHTML = html;
  }

  // ============================
  // セグメント一覧
  // ============================
  function renderSegments() {
    const cards = window.SEGMENTS.map(seg => {
      const list = window.LineCRM.evaluateSegment(seg.id);
      return `
        <div class="segment-card" data-segid="${seg.id}">
          <div class="seg-head">
            <span class="seg-icon">${seg.icon}</span>
            <span class="seg-name">${escapeHtml(seg.name)}</span>
            <span class="seg-count">${list.length}名</span>
          </div>
          <div class="seg-desc">${escapeHtml(seg.desc)}</div>
          <div class="seg-members">
            ${list.slice(0, 5).map(c => `<span class="seg-chip">${escapeHtml(c.name)}</span>`).join('')}
            ${list.length > 5 ? `<span class="seg-chip more">+${list.length - 5}名</span>` : ''}
            ${list.length === 0 ? '<span style="color:var(--muted);font-size:11.5px;">該当者なし</span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    document.querySelector('[data-line-view="segments"]').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-size:13px;color:var(--muted);">顧客の属性で動的にセグメントを切る。配信スケジュールの宛先指定に使う。</div>
        <button class="primary" disabled style="opacity:0.6;cursor:not-allowed;">+ カスタムセグメント (v2)</button>
      </div>
      <div class="segment-grid">${cards}</div>
    `;

    document.querySelectorAll('.segment-card').forEach(el => {
      el.addEventListener('click', () => openSegmentDetail(el.dataset.segid));
    });
  }

  function openSegmentDetail(segId) {
    const seg = window.SEGMENTS.find(s => s.id === segId);
    if (!seg) return;
    const list = window.LineCRM.evaluateSegment(segId);
    const html = `
      <div class="modal-header">
        <h2>${seg.icon} ${escapeHtml(seg.name)} <span style="font-size:12px;color:var(--muted);font-weight:400;">${list.length}名</span></h2>
        <button class="modal-close" id="seg-close-btn">×</button>
      </div>
      <div class="modal-body">
        <div style="font-size:13px;color:var(--muted);margin-bottom:14px;">${escapeHtml(seg.desc)}</div>
        ${list.length === 0 ? '<div class="empty">該当者なし</div>' :
          `<table class="clients">
            <thead><tr><th>顧客</th><th>年齢</th><th>AUM</th><th>ステータス</th><th>LINE</th></tr></thead>
            <tbody>
              ${list.map(c => `
                <tr>
                  <td><strong>${escapeHtml(c.name)}</strong></td>
                  <td>${window.LifeEvents.currentAge(c)}</td>
                  <td class="num">¥${fmtMoney(c.aum)}</td>
                  <td><span class="status-pill ${c.status}">${({active:'管理中',important:'重点',new:'新規',dormant:'休眠'})[c.status]}</span></td>
                  <td>${c.lineSubscribed ? '<span class="line-status-pill on">連携</span>' : '<span class="line-status-pill">未連携</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        }
      </div>
    `;
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('seg-close-btn').addEventListener('click', () => {
      document.getElementById('modal-overlay').style.display = 'none';
    });
  }

  // ============================
  // 配信スケジュール
  // ============================
  function renderSchedules() {
    const html = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-size:13px;color:var(--muted);">セグメント × テンプレ × タイミングで自動配信を組む。トグルでON/OFF切替。</div>
        <button class="primary" id="add-sched-btn">+ 新規スケジュール</button>
      </div>
      <table class="sched-table">
        <thead>
          <tr>
            <th></th>
            <th>シナリオ名</th>
            <th>宛先セグメント</th>
            <th>配信タイミング</th>
            <th>最終送信</th>
            <th>次回</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${window.LINE_SCHEDULES.map(s => {
            const seg = window.SEGMENTS.find(x => x.id === s.segment);
            const segLabel = seg ? `${seg.icon} ${seg.name}` : (s.segment === 'auto-birthday' ? '🎂 誕生日対象者' : s.segment);
            const recipients = seg ? window.LineCRM.evaluateSegment(seg.id).length : '-';
            return `
              <tr class="${s.enabled ? '' : 'disabled-row'}">
                <td><label class="toggle-switch"><input type="checkbox" ${s.enabled ? 'checked' : ''} data-schid="${s.id}"><span></span></label></td>
                <td><strong>${escapeHtml(s.name)}</strong></td>
                <td>${escapeHtml(segLabel)} <span style="color:var(--muted);">(${recipients}名)</span></td>
                <td>${escapeHtml(s.schedule)}</td>
                <td>${s.lastSent || '—'}</td>
                <td>${escapeHtml(s.nextSend)}</td>
                <td><button class="ghost" data-schid-edit="${s.id}">編集</button></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <div style="font-size:11.5px;color:var(--muted);margin-top:10px;">
        ※ デモのため送信は実行されません。本番では LINE Messaging API の push でセグメント全員に同時送信されます。
      </div>
    `;
    document.querySelector('[data-line-view="schedules"]').innerHTML = html;

    document.querySelectorAll('[data-schid]').forEach(el => {
      el.addEventListener('change', e => {
        const s = window.LINE_SCHEDULES.find(x => x.id === el.dataset.schid);
        if (s) s.enabled = el.checked;
        renderSchedules();
      });
    });
    document.querySelectorAll('[data-schid-edit]').forEach(el => {
      el.addEventListener('click', () => openScheduleEditor(el.dataset.schidEdit));
    });
    document.getElementById('add-sched-btn').addEventListener('click', () => openScheduleEditor(null));
  }

  function openScheduleEditor(schId) {
    const s = schId ? window.LINE_SCHEDULES.find(x => x.id === schId) : {
      id: 'sch-' + Date.now(),
      name: '新規シナリオ',
      segment: 'seg-all',
      templateId: window.LINE_TEMPLATES[0].id,
      cadence: 'monthly',
      schedule: '毎月 1日 10:00',
      enabled: true,
      lastSent: null, nextSend: '— (未送信)',
    };
    const segOptions = window.SEGMENTS.map(seg =>
      `<option value="${seg.id}" ${seg.id === s.segment ? 'selected' : ''}>${seg.icon} ${seg.name}</option>`
    ).join('');
    const tplOptions = window.LINE_TEMPLATES.map(tpl =>
      `<option value="${tpl.id}" ${tpl.id === s.templateId ? 'selected' : ''}>${tpl.name}</option>`
    ).join('');

    const html = `
      <div class="modal-header">
        <h2>${schId ? 'スケジュール編集' : '新規スケジュール作成'}</h2>
        <button class="modal-close" id="sch-edit-close">×</button>
      </div>
      <div class="modal-body">
        <div class="form-row"><label>シナリオ名</label><input type="text" id="sch-name" value="${escapeHtml(s.name)}"></div>
        <div class="form-row"><label>宛先セグメント</label><select id="sch-segment">${segOptions}<option value="auto-birthday" ${s.segment === 'auto-birthday' ? 'selected' : ''}>🎂 誕生日対象者 (自動)</option></select></div>
        <div class="form-row"><label>メッセージテンプレ</label><select id="sch-template">${tplOptions}</select></div>
        <div class="form-row"><label>配信頻度</label>
          <select id="sch-cadence">
            <option value="daily" ${s.cadence==='daily'?'selected':''}>毎日</option>
            <option value="weekly" ${s.cadence==='weekly'?'selected':''}>毎週</option>
            <option value="monthly" ${s.cadence==='monthly'?'selected':''}>毎月</option>
            <option value="birthday" ${s.cadence==='birthday'?'selected':''}>誕生日トリガー</option>
          </select>
        </div>
        <div class="form-row"><label>配信時刻 (説明)</label><input type="text" id="sch-schedule" value="${escapeHtml(s.schedule)}" placeholder="例: 毎月 15日 10:00"></div>
        <div class="form-row"><label>有効</label><label class="toggle-switch"><input type="checkbox" id="sch-enabled" ${s.enabled ? 'checked' : ''}><span></span></label></div>
        <div style="display:flex;gap:8px;margin-top:18px;">
          <button class="primary" id="sch-save-btn">${schId ? '保存' : '追加'}</button>
          <button id="sch-cancel-btn">キャンセル</button>
          ${schId ? '<button id="sch-delete-btn" style="margin-left:auto;border-color:var(--red);color:var(--red);">削除</button>' : ''}
        </div>
      </div>
    `;
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';

    function close() { document.getElementById('modal-overlay').style.display = 'none'; }
    document.getElementById('sch-edit-close').addEventListener('click', close);
    document.getElementById('sch-cancel-btn').addEventListener('click', close);
    document.getElementById('sch-save-btn').addEventListener('click', () => {
      s.name = document.getElementById('sch-name').value;
      s.segment = document.getElementById('sch-segment').value;
      s.templateId = document.getElementById('sch-template').value;
      s.cadence = document.getElementById('sch-cadence').value;
      s.schedule = document.getElementById('sch-schedule').value;
      s.enabled = document.getElementById('sch-enabled').checked;
      if (!schId) window.LINE_SCHEDULES.push(s);
      close();
      renderSchedules();
    });
    const delBtn = document.getElementById('sch-delete-btn');
    if (delBtn) delBtn.addEventListener('click', () => {
      const idx = window.LINE_SCHEDULES.indexOf(s);
      if (idx >= 0) window.LINE_SCHEDULES.splice(idx, 1);
      close();
      renderSchedules();
    });
  }

  // ============================
  // メッセージテンプレ
  // ============================
  function renderTemplates() {
    const groups = { event: [], broadcast: [], season: [] };
    window.LINE_TEMPLATES.forEach(t => {
      (groups[t.cat] || (groups[t.cat] = [])).push(t);
    });
    const catLabel = { event: 'イベント連動', broadcast: '定期配信', season: '季節挨拶' };

    const html = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-size:13px;color:var(--muted);">テンプレ内の <code>{{name}}</code> はLINE配信時に各顧客名に自動置換されます。</div>
        <button class="primary" disabled style="opacity:0.6;cursor:not-allowed;">+ 新規テンプレ (v2)</button>
      </div>
      ${Object.keys(groups).map(cat => `
        <div class="section-title">${catLabel[cat] || cat}</div>
        <div class="tpl-grid">
          ${groups[cat].map(t => `
            <div class="tpl-card">
              <div class="tpl-head">
                <span class="tpl-name">${escapeHtml(t.name)}</span>
                <span class="tpl-cat">${catLabel[t.cat] || t.cat}</span>
              </div>
              <div class="tpl-target">📌 ${escapeHtml(t.target)}</div>
              <div class="tpl-body">${nl2br(t.body)}</div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    `;
    document.querySelector('[data-line-view="templates"]').innerHTML = html;
  }

  // ============================
  // 誕生日リスト
  // ============================
  function renderBirthdays() {
    const upcoming = window.LineCRM.upcomingBirthdays(90);
    const today = upcoming.filter(b => b.daysAhead === 0);
    const week = upcoming.filter(b => b.daysAhead > 0 && b.daysAhead <= 7);
    const month = upcoming.filter(b => b.daysAhead > 7 && b.daysAhead <= 30);
    const next3m = upcoming.filter(b => b.daysAhead > 30);

    function renderGroup(title, list, accent) {
      if (list.length === 0) return '';
      return `
        <div class="section-title" style="display:flex;align-items:center;gap:8px;">
          <span>${title}</span><span style="background:${accent};color:white;padding:1px 8px;border-radius:9px;font-size:10px;font-weight:700;">${list.length}名</span>
        </div>
        <div class="line-card" style="margin-bottom:14px;">
          ${list.map(b => `
            <div class="bday-row">
              <div class="bday-date">${(b.date.getMonth() + 1)}/${b.date.getDate()}<span class="bday-rel">${b.daysAhead === 0 ? '本日' : b.daysAhead + '日後'}</span></div>
              <div class="bday-main">
                <strong>${escapeHtml(b.personName)}</strong> <span class="bday-rel-tag">${b.rel}</span>
                <div class="bday-meta">${b.age}歳 / 顧客: <a href="#" data-cid="${b.client.id}">${escapeHtml(b.client.name)}</a></div>
              </div>
              <div class="bday-action">${b.daysAhead === 0 ? '<span class="line-status-pill on">✓ 9:00 送信予定</span>' : '<span class="line-status-pill">予約済</span>'}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    document.querySelector('[data-line-view="birthdays"]').innerHTML = `
      <div style="margin-bottom:14px;">
        <div style="font-size:13px;color:var(--muted);">本人・配偶者・お子様の誕生日を全自動検出。本人にお祝いメッセージを当日朝9:00に自動配信します。</div>
      </div>
      ${renderGroup('今日 (' + (TODAY.getMonth() + 1) + '/' + TODAY.getDate() + ')', today, 'var(--red)')}
      ${renderGroup('今週 (1〜7日後)', week, 'var(--yellow)')}
      ${renderGroup('今月 (8〜30日後)', month, 'var(--accent)')}
      ${renderGroup('来月以降 (31〜90日後)', next3m, 'var(--muted)')}
      ${upcoming.length === 0 ? '<div class="empty">該当なし</div>' : ''}
    `;

    document.querySelectorAll('[data-line-view="birthdays"] a[data-cid]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        window.FpApp && window.FpApp.openClientModal && window.FpApp.openClientModal(a.dataset.cid);
      });
    });
  }

  // ============================
  // 送信ログ
  // ============================
  function renderLog() {
    const html = `
      <div style="margin-bottom:12px;font-size:13px;color:var(--muted);">直近の自動配信履歴。クリックで詳細展開 (v2)。</div>
      <table class="sched-table">
        <thead>
          <tr>
            <th>送信日時</th>
            <th>シナリオ / テンプレ</th>
            <th>宛先</th>
            <th>件数</th>
            <th>成功</th>
            <th>失敗</th>
            <th>備考</th>
          </tr>
        </thead>
        <tbody>
          ${window.LINE_LOG.map(l => `
            <tr>
              <td style="font-variant-numeric:tabular-nums;">${escapeHtml(l.date)}</td>
              <td><strong>${escapeHtml(l.template)}</strong></td>
              <td>${escapeHtml(l.segment)}</td>
              <td class="num">${l.recipients}</td>
              <td class="num" style="color:var(--green);font-weight:600;">${l.success}</td>
              <td class="num" style="color:${l.fail > 0 ? 'var(--red)' : 'var(--muted)'};font-weight:${l.fail > 0 ? '600' : '400'};">${l.fail}</td>
              <td style="font-size:11.5px;color:var(--muted);">${escapeHtml(l.detail || '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    document.querySelector('[data-line-view="log"]').innerHTML = html;
  }

  // ============================
  // 設定
  // ============================
  function renderSettings() {
    const settings = loadSettings();
    const html = `
      <div style="max-width:640px;">
        <div class="section-title">LINE公式アカウント接続</div>
        <div class="line-card">
          <div class="settings-row">
            <label>チャネルID</label>
            <input type="text" id="set-channel-id" value="${escapeHtml(settings.channelId)}" placeholder="2001234567">
          </div>
          <div class="settings-row">
            <label>チャネルアクセストークン</label>
            <input type="password" id="set-channel-token" value="${escapeHtml(settings.channelToken)}" placeholder="長いトークン文字列">
            <div style="font-size:11px;color:var(--muted);margin-top:3px;">LINE Developers Console → Messaging API → チャネルアクセストークン(長期)</div>
          </div>
          <div class="settings-row">
            <label>Webhook URL (お客様のLINE→FPへの返信を受ける)</label>
            <input type="text" value="https://fp-compass.app/webhook/line/{fp_id}" readonly style="background:#f5f6f8;">
            <div style="font-size:11px;color:var(--muted);margin-top:3px;">このURLをLINE Developers Consoleの「Webhook URL」に登録してください</div>
          </div>
          <div style="display:flex;gap:8px;margin-top:14px;">
            <button class="primary" id="set-save-btn">保存</button>
            <button id="set-test-btn">接続テスト</button>
            <span id="set-test-result" style="font-size:12px;align-self:center;"></span>
          </div>
        </div>

        <div class="section-title" style="margin-top:24px;">FP情報 (テンプレ署名で使用)</div>
        <div class="line-card">
          <div class="settings-row">
            <label>FP表示名</label>
            <input type="text" id="set-fp-name" value="${escapeHtml(settings.fpName)}" placeholder="例: 田中 太郎 ファイナンシャルプランナー">
          </div>
          <div class="settings-row">
            <label>レポートURL</label>
            <input type="text" id="set-report-url" value="${escapeHtml(settings.reportUrl)}" placeholder="例: https://example.com/report-may">
          </div>
          <div class="settings-row">
            <label>面談予約カレンダーURL</label>
            <input type="text" id="set-calendar-url" value="${escapeHtml(settings.calendarUrl)}" placeholder="例: https://timerex.net/s/...">
          </div>
        </div>

        <div class="section-title" style="margin-top:24px;">自動配信の停止・再開</div>
        <div class="line-card">
          <div style="font-size:13px;color:var(--ink-2);margin-bottom:8px;">緊急時は全自動配信を一括停止できます。</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <label class="toggle-switch"><input type="checkbox" id="set-master-enabled" ${settings.masterEnabled ? 'checked' : ''}><span></span></label>
            <span>マスター: <strong id="set-master-label">${settings.masterEnabled ? '稼働中' : '🛑 全停止中'}</strong></span>
          </div>
        </div>
      </div>
    `;
    document.querySelector('[data-line-view="settings"]').innerHTML = html;

    document.getElementById('set-save-btn').addEventListener('click', () => {
      const s = {
        channelId: document.getElementById('set-channel-id').value,
        channelToken: document.getElementById('set-channel-token').value,
        fpName: document.getElementById('set-fp-name').value,
        reportUrl: document.getElementById('set-report-url').value,
        calendarUrl: document.getElementById('set-calendar-url').value,
        masterEnabled: document.getElementById('set-master-enabled').checked,
      };
      saveSettings(s);
      const result = document.getElementById('set-test-result');
      result.textContent = '✓ 保存しました';
      result.style.color = 'var(--green)';
      setTimeout(() => { result.textContent = ''; }, 2500);
      updateHeroStatus();
    });

    document.getElementById('set-test-btn').addEventListener('click', () => {
      const result = document.getElementById('set-test-result');
      result.textContent = '接続確認中...';
      result.style.color = 'var(--muted)';
      setTimeout(() => {
        result.textContent = '✓ LINE Messaging API 接続OK (デモ)';
        result.style.color = 'var(--green)';
      }, 800);
    });

    document.getElementById('set-master-enabled').addEventListener('change', e => {
      document.getElementById('set-master-label').innerHTML = e.target.checked ? '稼働中' : '🛑 全停止中';
      const s = loadSettings();
      s.masterEnabled = e.target.checked;
      saveSettings(s);
      updateHeroStatus();
    });
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem('fp-crm-line-settings');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      channelId: '2001234567',
      channelToken: '••••••••••••••••••••••••••••',
      fpName: 'FP 山田 太郎',
      reportUrl: 'https://example.com/monthly-report',
      calendarUrl: 'https://timerex.net/s/fp-compass-sample/30min',
      masterEnabled: true,
    };
  }
  function saveSettings(s) {
    try { localStorage.setItem('fp-crm-line-settings', JSON.stringify(s)); } catch (e) {}
  }

  function updateHeroStatus() {
    const s = loadSettings();
    const el = document.getElementById('line-hero-status');
    if (!el) return;
    if (s.masterEnabled) {
      el.innerHTML = '✓ 接続済み (デモモード) — 自動配信 稼働中';
      el.style.color = 'var(--green)';
    } else {
      el.innerHTML = '🛑 全自動配信を停止中';
      el.style.color = 'var(--red)';
    }
  }

  // ============================
  // テスト配信ダイアログ
  // ============================
  function openTestSendDialog() {
    const segOptions = window.SEGMENTS.map(seg =>
      `<option value="${seg.id}">${seg.icon} ${seg.name} (${window.LineCRM.evaluateSegment(seg.id).length}名)</option>`
    ).join('');
    const tplOptions = window.LINE_TEMPLATES.map(tpl =>
      `<option value="${tpl.id}">${tpl.name}</option>`
    ).join('');

    const html = `
      <div class="modal-header">
        <h2>📨 テスト配信</h2>
        <button class="modal-close" id="test-close">×</button>
      </div>
      <div class="modal-body">
        <div class="form-row"><label>セグメント</label><select id="test-seg">${segOptions}</select></div>
        <div class="form-row"><label>テンプレ</label><select id="test-tpl">${tplOptions}</select></div>
        <div class="form-row"><label>プレビュー</label><div id="test-preview" class="tpl-body" style="min-height:120px;background:#fafbfc;border:1px solid var(--line);border-radius:6px;padding:12px;"></div></div>
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="primary" id="test-send-btn">送信実行 (デモ)</button>
          <button id="test-cancel-btn">キャンセル</button>
        </div>
        <div id="test-result" style="margin-top:12px;font-size:13px;"></div>
      </div>
    `;
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';

    function updatePreview() {
      const tpl = window.LINE_TEMPLATES.find(t => t.id === document.getElementById('test-tpl').value);
      if (!tpl) return;
      const sample = window.LineCRM.evaluateSegment(document.getElementById('test-seg').value)[0];
      const name = sample ? sample.name : 'お客様';
      const body = tpl.body
        .replace(/\{\{name\}\}/g, name)
        .replace(/\{\{age\}\}/g, sample ? window.LifeEvents.currentAge(sample) : '')
        .replace(/\{\{fp_name\}\}/g, loadSettings().fpName)
        .replace(/\{\{report_url\}\}/g, loadSettings().reportUrl)
        .replace(/\{\{calendar_url\}\}/g, loadSettings().calendarUrl)
        .replace(/\{\{article_url\}\}/g, 'https://example.com/article')
        .replace(/\{\{tool_url\}\}/g, 'https://example.com/tool')
        .replace(/\{\{years_to_retire\}\}/g, '5');
      document.getElementById('test-preview').innerHTML = nl2br(body);
    }
    document.getElementById('test-seg').addEventListener('change', updatePreview);
    document.getElementById('test-tpl').addEventListener('change', updatePreview);
    updatePreview();

    function close() { document.getElementById('modal-overlay').style.display = 'none'; }
    document.getElementById('test-close').addEventListener('click', close);
    document.getElementById('test-cancel-btn').addEventListener('click', close);
    document.getElementById('test-send-btn').addEventListener('click', () => {
      const segId = document.getElementById('test-seg').value;
      const seg = window.SEGMENTS.find(s => s.id === segId);
      const list = window.LineCRM.evaluateSegment(segId);
      const tpl = window.LINE_TEMPLATES.find(t => t.id === document.getElementById('test-tpl').value);
      const result = document.getElementById('test-result');
      result.innerHTML = '送信中...';
      setTimeout(() => {
        // ログに追加
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        window.LINE_LOG.unshift({
          date: dateStr,
          scheduleId: 'manual',
          segment: seg ? seg.name : '',
          recipients: list.length,
          success: list.length,
          fail: 0,
          template: tpl ? tpl.name : '',
          detail: '手動テスト配信',
        });
        result.innerHTML = `<span style="color:var(--green);font-weight:600;">✓ ${list.length}名に送信完了 (デモ)</span>`;
        setTimeout(close, 1500);
      }, 900);
    });
  }

  // ============================
  // 初期化 (LINEタブが activate されたら)
  // ============================
  window.LineApp = {
    activateSubview: activateSubview,
    init: function () {
      document.querySelectorAll('.line-subtab').forEach(t => {
        t.addEventListener('click', () => activateSubview(t.dataset.lineSub));
      });
      const btn = document.getElementById('line-test-send-btn');
      if (btn) btn.addEventListener('click', openTestSendDialog);
      updateHeroStatus();
      activateSubview('dashboard');
    },
    refresh: function () {
      activateSubview(currentSubview);
    }
  };
})();
