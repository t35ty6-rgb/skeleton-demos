// LINE公式連携 UIロジック
// サブタブ7つ: 配信ダッシュボード / セグメント / スケジュール / テンプレ / 誕生日 / ログ / 設定

(function () {
  const TODAY = window.LineCRM.TODAY;
  let currentSubview = 'leadHub';

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
    if (name === 'leadHub') renderLeadHub();
    if (name === 'distributionHub') renderDistributionHub();
    if (name === 'birthdayTab') renderBirthdayTab();
    if (name === 'calendarTab') renderCalendarTab();
    if (name === 'settingsHub') renderSettingsHub();
  }

  // ============================
  // 🎂 誕生日メッセージタブ (独立)
  // ============================
  function renderBirthdayTab() {
    fetchLiveData().then(() => { if (currentSubview === 'birthdayTab') renderBirthdayTabInner(); });
    renderBirthdayTabInner();
  }
  function renderBirthdayTabInner() {
    const v = document.querySelector('[data-line-view="birthdayTab"]');
    if (!v) return;
    const upcoming = window.LineCRM.upcomingBirthdays(90);
    const today = upcoming.filter(b => b.daysAhead === 0);
    const week = upcoming.filter(b => b.daysAhead > 0 && b.daysAhead <= 7);
    const month = upcoming.filter(b => b.daysAhead > 7 && b.daysAhead <= 30);
    const total = upcoming.length;

    v.innerHTML = `
      <h1 style="font-family:'Noto Serif JP',serif;font-size:26px;margin:0 0 4px;">🎂 誕生日メッセージ</h1>
      <p style="color:var(--muted);font-size:13.5px;margin:0 0 24px;">お客様 + ご家族(配偶者・お子様) の誕生日を90日先まで自動検出 → 当日朝9時に自動でお祝いLINE送信</p>

      <div class="task-board">
        <div class="task-card ${today.length > 0 ? 'action' : 'muted'}">
          <div class="task-icon">🎉</div>
          <div class="task-label">${today.length > 0 ? '本日 自動送信' : '本日は無し'}</div>
          <div class="task-count">${today.length}<span class="unit">名</span></div>
          <div class="task-title">今日の誕生日</div>
          <div class="task-desc">9:00 に自動でお祝いLINE送信予定</div>
        </div>
        <div class="task-card ${week.length > 0 ? 'urgent' : ''}">
          <div class="task-icon">📅</div>
          <div class="task-label">今週</div>
          <div class="task-count">${week.length}<span class="unit">名</span></div>
          <div class="task-title">1〜7日後の誕生日</div>
          <div class="task-desc">直近対象 / 各日9:00に順次配信</div>
        </div>
        <div class="task-card">
          <div class="task-icon">🗓️</div>
          <div class="task-label">今月</div>
          <div class="task-count">${month.length}<span class="unit">名</span></div>
          <div class="task-title">8〜30日後の誕生日</div>
          <div class="task-desc">スケジュール済</div>
        </div>
        <div class="task-card">
          <div class="task-icon">📊</div>
          <div class="task-label">概況</div>
          <div class="task-count">${total}<span class="unit">名</span></div>
          <div class="task-title">90日先までの総数</div>
          <div class="task-desc">本人+配偶者+子供 すべて自動検出</div>
        </div>
      </div>

      <section class="board-section">
        <h2>🎉 本日のお祝い対象 (9:00 自動送信)</h2>
        ${renderBirthdayGroup(today, '今日対象なし')}
      </section>
      <section class="board-section">
        <h2>📅 今週 (1〜7日後)</h2>
        ${renderBirthdayGroup(week, '今週はありません')}
      </section>
      <section class="board-section">
        <h2>🗓️ 今月 (8〜30日後)</h2>
        ${renderBirthdayGroup(month, '今月はありません')}
      </section>
    `;
  }
  function renderBirthdayGroup(list, emptyMsg) {
    if (list.length === 0) {
      return '<div style="background:var(--surface);border:1px dashed var(--line);border-radius:10px;padding:24px;text-align:center;color:var(--muted);font-size:13px;">' + emptyMsg + '</div>';
    }
    return list.map(b => `
      <div style="background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 18px;margin-bottom:8px;display:grid;grid-template-columns:80px 1fr 140px;gap:16px;align-items:center;box-shadow:var(--shadow-xs);">
        <div>
          <div style="font-family:'Inter',sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.01em;">${b.date.getMonth() + 1}/${b.date.getDate()}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;letter-spacing:0.04em;">${b.daysAhead === 0 ? '本日' : '+' + b.daysAhead + '日'}</div>
        </div>
        <div>
          <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;">
            <strong style="font-family:'Noto Sans JP',sans-serif;font-size:14.5px;">${escapeHtml(b.personName)}</strong>
            <span class="status-pill ${b.rel === '本人' ? 'important' : 'new'}">${escapeHtml(b.rel)}</span>
            <span style="font-size:11px;color:var(--muted);">${b.age}歳</span>
          </div>
          <div style="font-size:11.5px;color:var(--muted);margin-top:3px;">顧客: ${escapeHtml(b.client.name)} 様</div>
        </div>
        <div style="text-align:right;">
          ${b.daysAhead === 0
            ? '<span class="status-pill active">✓ 9:00 送信予定</span>'
            : '<span class="status-pill new">予約済</span>'}
        </div>
      </div>
    `).join('');
  }

  // ============================
  // 🎍 カレンダー配布タブ (独立)
  // ============================
  function renderCalendarTab() {
    fetchLiveData().then(() => { if (currentSubview === 'calendarTab') renderCalendarTabInner(); });
    renderCalendarTabInner();
  }
  function renderCalendarTabInner() {
    const v = document.querySelector('[data-line-view="calendarTab"]');
    if (!v) return;
    // ライブデータ + デモデータ補完 (LIVE が空 or 住所付きが0件ならデモ追加)
    let reqs = (liveData && liveData.calendar_requests) || [];
    let isDemo = false;
    const hasLiveCal = reqs.some(r => r.address || r.status);
    if (!hasLiveCal && window.CALENDAR_DEMO) {
      reqs = reqs.concat(window.CALENDAR_DEMO);
      isDemo = true;
    }
    const wantList = reqs.filter(r => r.status === '要' && r.address);
    const wantNoAddr = reqs.filter(r => r.status === '要' && !r.address);
    const notWant = reqs.filter(r => r.status === '不要');
    const noReply = reqs.filter(r => !r.status);
    const total = reqs.length;
    const cvr = total > 0 ? Math.round(wantList.length / total * 100) : 0;

    // Google マップ URL は addresses-only (名前ラベルは Google My Maps でないと不可)
    const buildRouteUrl = (items) => {
      if (items.length === 0) return '#';
      const enc = items.map(it => encodeURIComponent(it.address));
      const origin = enc[0];
      const destination = enc[enc.length - 1];
      const waypoints = enc.slice(1, -1).join('|');
      let url = 'https://www.google.com/maps/dir/?api=1&origin=' + origin + '&destination=' + destination;
      if (waypoints) url += '&waypoints=' + waypoints;
      url += '&travelmode=driving';
      return url;
    };
    const buildMapAllUrl = (items) => items.length === 0 ? '#' : 'https://www.google.com/maps/search/' + encodeURIComponent(items.map(it => it.address).join(' / '));
    const routeUrl = buildRouteUrl(wantList);
    const allMapUrl = buildMapAllUrl(wantList);

    v.innerHTML = `
      <h1 style="font-family:'Noto Serif JP',serif;font-size:26px;margin:0 0 4px;">🎍 年末カレンダー配布</h1>
      <p style="color:var(--muted);font-size:13.5px;margin:0 0 18px;">既存お客様にオリジナル卓上カレンダーを配布する企画 / LINE一斉配信→要不要回答→住所収集→Google地図でルート最適化</p>

      ${isDemo ? '<div style="background:#fff8e1;border:1px solid #f0d36b;border-radius:8px;padding:10px 14px;margin-bottom:18px;font-size:12.5px;color:#8a6f1e;">💡 表示中のお客様データはサンプル(デモ用)。本番では実際のLINE回答が並びます。</div>' : ''}

      <div class="task-board">
        <a href="#cal-want" class="task-card ${wantList.length > 0 ? 'action' : 'muted'}">
          <div class="task-icon">🎁</div>
          <div class="task-label">配達対象</div>
          <div class="task-count">${wantList.length}<span class="unit">名</span></div>
          <div class="task-title">要(住所済) — 配達リスト</div>
          <div class="task-desc">下のリストでGoogleマップ ルート最適化</div>
        </a>
        <a href="#cal-waiting" class="task-card ${wantNoAddr.length > 0 ? 'urgent' : 'muted'}">
          <div class="task-icon">⏳</div>
          <div class="task-label">${wantNoAddr.length > 0 ? '住所待ち' : '待ちなし'}</div>
          <div class="task-count">${wantNoAddr.length}<span class="unit">名</span></div>
          <div class="task-title">要(住所未) — 住所入力待ち</div>
          <div class="task-desc">入力URL送信済 / お客様の返信待ち</div>
        </a>
        <a href="#cal-noreply" class="task-card ${noReply.length > 0 ? 'urgent' : 'muted'}">
          <div class="task-icon">📨</div>
          <div class="task-label">未回答</div>
          <div class="task-count">${noReply.length}<span class="unit">名</span></div>
          <div class="task-title">未回答 — 再配信検討</div>
          <div class="task-desc">配信後 まだ反応なし</div>
        </a>
        <div class="task-card">
          <div class="task-icon">📊</div>
          <div class="task-label">希望率</div>
          <div class="task-count">${cvr}<span class="unit">%</span></div>
          <div class="task-title">配達対象 / 回答総数</div>
          <div class="task-desc">${total}名中 ${wantList.length + wantNoAddr.length}名希望</div>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:24px 0;">
        <button class="primary" id="cal-blast-btn" data-hint="全LINE友だちに『年末カレンダー要りますか?』配信。年1回だけ押す想定">📨 友だち全員に一斉配信</button>
        <a class="ghost" href="${allMapUrl}" target="_blank" data-hint="希望者の住所をGoogleマップ上に全部ピン表示" style="text-decoration:none;display:inline-block;padding:9px 18px;border:1px solid var(--line-2);border-radius:7px;color:var(--ink);${wantList.length===0?'pointer-events:none;opacity:0.4;':''}">🗺 全員の住所を地図表示</a>
        <a class="ghost" href="${routeUrl}" target="_blank" data-hint="希望者全員を回る最適ルートをGoogleマップで生成。当日ナビとして使用" style="text-decoration:none;display:inline-block;padding:9px 18px;border:1px solid var(--line-2);border-radius:7px;color:var(--ink);${wantList.length===0?'pointer-events:none;opacity:0.4;':''}">🚗 配達ルートを最適化 (Google マップ)</a>
        <span id="cal-blast-msg" style="font-size:12px;color:var(--muted);align-self:center;margin-left:auto;"></span>
      </div>

      <section class="board-section" id="cal-want">
        <h2>🎁 配達リスト (住所登録済) — ${wantList.length}名</h2>
        ${wantList.length === 0
          ? '<div style="background:var(--surface);border:1px dashed var(--line);border-radius:10px;padding:30px;text-align:center;color:var(--muted);">まだ住所登録なし</div>'
          : '<div style="display:grid;gap:8px;">' + wantList.map((r, i) => `
              <div style="background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:14px 18px;display:grid;grid-template-columns:36px 1fr 160px;gap:14px;align-items:center;box-shadow:var(--shadow-xs);">
                <div style="background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;font-family:'Inter',sans-serif;">${i + 1}</div>
                <div>
                  <strong style="font-size:14.5px;">${escapeHtml(r.name) || '匿名'} 様</strong>
                  <div style="font-size:13px;color:var(--ink-2);margin-top:3px;letter-spacing:0.01em;">📮 ${escapeHtml(r.address)}</div>
                  ${r.phone ? `<div style="font-size:11.5px;color:var(--muted);margin-top:2px;">📞 ${escapeHtml(r.phone)}</div>` : ''}
                  ${r.note ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;font-style:italic;">📝 ${escapeHtml(r.note)}</div>` : ''}
                </div>
                <div style="text-align:right;">
                  <a href="https://www.google.com/maps/search/${encodeURIComponent(r.address)}" target="_blank" style="font-size:11.5px;color:var(--accent);text-decoration:none;background:var(--accent-soft);padding:5px 12px;border-radius:11px;display:inline-block;font-weight:600;">📍 地図で見る</a>
                </div>
              </div>
            `).join('') + '</div>'
        }
      </section>

      <section class="board-section" id="cal-waiting">
        <h2>⏳ 住所入力待ち — ${wantNoAddr.length}名</h2>
        ${wantNoAddr.length === 0
          ? '<div style="background:var(--surface);border:1px dashed var(--line);border-radius:10px;padding:24px;text-align:center;color:var(--muted);font-size:13px;">なし</div>'
          : '<div style="display:grid;gap:6px;">' + wantNoAddr.map(r => `
              <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
                <strong style="font-size:13.5px;">${escapeHtml(r.name) || '匿名'} 様</strong>
                <span style="font-size:11px;color:var(--muted);">住所入力URLを送信済 / 入力待ち</span>
              </div>
            `).join('') + '</div>'
        }
      </section>

      ${noReply.length > 0 ? `
      <section class="board-section" id="cal-noreply">
        <h2>📨 未回答 — ${noReply.length}名</h2>
        <div style="display:grid;gap:4px;">
          ${noReply.map(r => `<div style="padding:8px 14px;background:#fafbfc;border:1px solid var(--line);border-radius:6px;font-size:12.5px;">${escapeHtml(r.name) || '匿名'}</div>`).join('')}
        </div>
      </section>` : ''}

      ${notWant.length > 0 ? `
      <section class="board-section">
        <h2>✗ 不要 — ${notWant.length}名</h2>
        <div style="display:grid;gap:4px;font-size:12px;color:var(--muted);">
          ${notWant.map(r => `<div style="padding:8px 14px;background:#fafbfc;border:1px solid var(--line);border-radius:6px;">${escapeHtml(r.name) || '匿名'}</div>`).join('')}
        </div>
      </section>` : ''}
    `;

    document.getElementById('cal-blast-btn').addEventListener('click', async () => {
      if (!confirm('LINE友だち全員に「カレンダー希望調査」を一斉配信します。よろしいですか?')) return;
      const btn = document.getElementById('cal-blast-btn');
      const msg = document.getElementById('cal-blast-msg');
      btn.disabled = true; btn.textContent = '配信中...';
      try {
        const r = await fetch(CLOUD_RUN_BASE + '/api/cal-blast', { method: 'POST' });
        const data = await r.json();
        msg.textContent = data.ok ? `✓ ${data.sent}/${data.total}名 に送信完了` : '❌ 失敗: ' + (data.error || '');
        msg.style.color = data.ok ? 'var(--green)' : 'var(--red)';
        btn.disabled = false; btn.textContent = '📨 友だち全員に一斉配信';
      } catch (e) {
        msg.textContent = '❌ 失敗: ' + e.message;
        msg.style.color = 'var(--red)';
        btn.disabled = false;
        btn.textContent = '📨 友だち全員に一斉配信';
      }
    });
  }

  // ============================
  // 🆕 新規相談ハブ (アクションカード型)
  // ============================
  function renderLeadHub() {
    fetchLiveData().then(() => { if (currentSubview === 'leadHub') renderLeadHubInner(); });
    if (!window._leadHubInterval) {
      window._leadHubInterval = setInterval(() => {
        if (currentSubview === 'leadHub') {
          fetchLiveData().then(() => renderLeadHubInner());
        }
      }, 15000);
    }
    renderLeadHubInner();
  }

  function renderLeadHubInner() {
    const v = document.querySelector('[data-line-view="leadHub"]');
    if (!v) return;
    const today = new Date('2026-05-28').toISOString().slice(0, 10);
    let surveys = (liveData && liveData.survey_answers) || [];
    const bookings = (liveData && liveData.bookings) || [];
    // デモfallback無効化 — オーナーがLINE実機テストする時のためにLIVEデータだけ表示
    let isDemo = false;

    const pendingConfirm = surveys.filter(s => !s.confirmedSlot && (s.q6_候補1 || s.q7_候補2 || s.q8_候補3)).length;
    const recPending = bookings.filter(b => b.recordingStatus === 'saved' && !b.transcript).length;
    const recordingNow = bookings.filter(b => b.recordingStatus === 'recording').length;
    const totalNewLeads = surveys.length;

    v.innerHTML = `
      <h1 style="font-family:'Noto Serif JP',serif;font-size:26px;letter-spacing:0.02em;margin:0 0 4px;">🆕 新規相談</h1>
      <p style="color:var(--muted);font-size:13.5px;margin:0 0 18px;">お客様がLINEでアンケート + 候補日3つに回答すると、ここに並びます。<br><strong style="color:var(--accent);">FPがやることは「下の候補日3つから1つタップで確定」のみ</strong>です。</p>
      ${isDemo ? '<div style="background:#fff8e1;border:1px solid #f0d36b;border-radius:8px;padding:10px 14px;margin-bottom:18px;font-size:12.5px;color:#8a6f1e;">💡 表示中の候補日待ち4件はサンプル(デモ)。本番では実際のLINEアンケート回答が並びます。</div>' : ''}

      <div class="task-board">
        <a href="#section-confirm" class="task-card ${pendingConfirm > 0 ? 'urgent' : 'muted'}">
          <div class="task-icon">📅</div>
          <div class="task-label">${pendingConfirm > 0 ? 'アクション必要' : '対応待ちなし'}</div>
          <div class="task-count">${pendingConfirm}<span class="unit">名</span></div>
          <div class="task-title">候補日確定 待ち</div>
          <div class="task-desc">アンケート回答済 / 1つ選んで確定するだけ</div>
        </a>
        <a href="#section-recording" class="task-card ${recordingNow > 0 ? 'action' : 'muted'}">
          <div class="task-icon">🔴</div>
          <div class="task-label">${recordingNow > 0 ? '今 録画中' : 'スタンバイ'}</div>
          <div class="task-count">${recordingNow}<span class="unit">件</span></div>
          <div class="task-title">録画中の面談</div>
          <div class="task-desc">終了したら ■停止 を押す</div>
        </a>
        <a href="#section-recording" class="task-card ${recPending > 0 ? 'urgent' : 'muted'}">
          <div class="task-icon">✨</div>
          <div class="task-label">${recPending > 0 ? 'アクション必要' : '対応待ちなし'}</div>
          <div class="task-count">${recPending}<span class="unit">件</span></div>
          <div class="task-title">議事録 未生成</div>
          <div class="task-desc">録画は終わったが議事録がまだ / AIで自動作成</div>
        </a>
        <a href="#section-funnel" class="task-card">
          <div class="task-icon">📈</div>
          <div class="task-label">概況</div>
          <div class="task-count">${totalNewLeads}<span class="unit">件</span></div>
          <div class="task-title">直近の問い合わせ総数</div>
          <div class="task-desc">アンケート回答数 / ファネル詳細</div>
        </a>
      </div>

      <section class="board-section" id="section-confirm">
        <div style="display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          <h2 style="margin:0;">📅 候補日確定 待ち</h2>
          <button id="fp-toggle-cal" style="font-size:12px;padding:7px 14px;background:#fff;border:1.5px solid var(--gold,#c19a3a);border-radius:7px;cursor:pointer;font-family:inherit;color:#5e4d1a;font-weight:700;">🗓 自分のGoogleカレンダーを並べて表示</button>
        </div>
        <p style="color:var(--muted);font-size:12.5px;margin:0 0 14px;">下のお客様の候補日のうち、ご都合よい1日を選んで「この日で確定 →」を押すだけ。Zoom URL発行・お客様LINE通知・Googleカレンダー登録が同時に動きます。</p>
        <div id="confirm-list"></div>
      </section>

      <section class="board-section" id="section-recording">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
          <h2 style="margin:0;">💻 面談予約 と 録画・議事録</h2>
          <div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--muted);">
            並び順:
            <select id="fp-bookings-sort" style="font-size:12px;padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-family:inherit;background:#fff;">
              <option value="date-desc">面談日 — 新しい順</option>
              <option value="date-asc">面談日 — 古い順</option>
              <option value="created-desc">予約日 — 新しい順</option>
              <option value="name">お客様名 — あいうえお順</option>
            </select>
          </div>
        </div>
        <p style="color:var(--muted);font-size:12.5px;margin:0 0 14px;">確定済みの予約。面談直前に「● 録画ONでZoom開始」 → 終了時「■ 録画停止」 → 終わったら「✓ 完了 (台帳へ)」 で顧客台帳に自動反映。</p>
        <div id="bookings-list"></div>
      </section>

      <section class="board-section" id="section-funnel">
        <h2>📈 直近のお問い合わせと、リード獲得ファネル</h2>
        <div id="funnel-area"></div>
        <div id="surveys-list" style="margin-top:18px;"></div>
      </section>
    `;
    fillConfirmList();
    fillBookingsList();
    // カレンダー比較トグル
    const calBtn = document.getElementById('fp-toggle-cal');
    if (calBtn) calBtn.addEventListener('click', toggleCalendarSidePanel);
    // 起動時にも復元
    if (localStorage.getItem('fp-cal-side-open') === '1') ensureCalendarSidePanel();
    fillFunnelArea();
    fillSurveysList();
  }

  // Sheets が自動で日付型に変換してしまった ISO 文字列を JST の "YYYY-MM-DD / 帯+時間" に戻す
  function parseSlotString(raw) {
    if (!raw) return { dateStr: '', slotStr: '', display: '' };
    const str = String(raw);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
      const d = new Date(str);
      const yyyy = d.toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric' });
      const mm = d.toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', month: '2-digit' });
      const dd = d.toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', day: '2-digit' });
      const hh = parseInt(d.toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', hour: '2-digit', hour12: false }), 10);
      const min = d.toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', minute: '2-digit' });
      const taiLabel = hh < 12 ? '午前' : hh < 18 ? '午後' : '夜';
      const slotStr = `${taiLabel} ${String(hh).padStart(2, '0')}:${min.padStart(2, '0')}`;
      const dateStr = `${yyyy}-${mm}-${dd}`;
      return { dateStr, slotStr, display: `${dateStr} ${slotStr}` };
    }
    const parts = str.split(/\s+/);
    const dateStr = parts[0] || '';
    const slotStr = parts.slice(1).join(' ') || '';
    return { dateStr, slotStr, display: str };
  }

  function fillConfirmList() {
    const target = document.getElementById('confirm-list');
    if (!target) return;
    let surveys = (liveData && liveData.survey_answers) || [];
    const pending = surveys.filter(s => !s.confirmedSlot && (s.q6_候補1 || s.q7_候補2 || s.q8_候補3));
    if (pending.length === 0) {
      target.innerHTML = '<div style="background:var(--surface);border:1px dashed var(--line);border-radius:10px;padding:30px;text-align:center;color:var(--muted);font-size:13px;">候補日確定待ちのお客様はいません。<br><span style="font-size:11.5px;">LINEからアンケート + 候補日3つに回答するとここに並びます。</span></div>';
      return;
    }
    target.innerHTML = pending.map(s => {
      const slots = [s.q6_候補1, s.q7_候補2, s.q8_候補3].filter(x => x);
      const uidShort = (s.userId || '').slice(0, 12);
      // ts を JST に変換
      const tsJst = s.ts ? new Date(s.ts).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
      return `
        <div style="background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:10px;padding:18px 22px;margin-bottom:10px;box-shadow:var(--shadow-xs);">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:10px;">
            <div>
              <strong style="font-size:16px;">${escapeHtml(s.q1_テーマ || '相談者')}</strong>
              <span style="font-size:12px;color:var(--gold);margin-left:12px;font-weight:700;">📅 ${escapeHtml(tsJst)} 回答</span>
            </div>
            <span class="status-pill important">確定待ち</span>
          </div>
          <div style="font-size:12px;color:var(--muted);letter-spacing:0.02em;margin-bottom:10px;">
            ${escapeHtml(s.q2_年代 || '-')} / ${escapeHtml(s.q3_家族 || '-')} / ${escapeHtml(s.q4_年収 || '-')} / userId:${uidShort}…
          </div>
          <div style="background:#fffbf2;border:1px solid #f0d36b;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13.5px;color:#5e4d1a;line-height:1.6;">
            <span style="font-size:11px;color:#a08537;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;display:block;margin-bottom:4px;">お客様からの一言</span>
            💭 ${escapeHtml(s.q5_悩み || '(未記入)')}
          </div>
          <div style="font-size:11px;color:var(--muted);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">候補日 (タップで即確定)</div>
          <div style="display:grid;gap:6px;">
            ${slots.map((slot, idx) => {
              const parsed = parseSlotString(slot);
              return `<button class="slot-confirm-btn" data-slot-confirm
                data-uid="${escapeHtml(s.userId)}" data-date="${escapeHtml(parsed.dateStr)}" data-slot="${escapeHtml(parsed.slotStr)}"
                style="text-align:left;padding:12px 16px;background:#fff;border:2px solid var(--line);border-radius:8px;cursor:pointer;font-size:14px;display:flex;justify-content:space-between;align-items:center;font-family:inherit;transition:all 0.15s;">
                <span><strong style="color:var(--accent);margin-right:10px;">第${idx + 1}希望</strong>${escapeHtml(parsed.display)}</span>
                <span style="font-size:12px;color:var(--green);font-weight:700;background:var(--line-green-soft);padding:4px 10px;border-radius:6px;">この日で確定 →</span>
              </button>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');
    bindConfirmButtons();
  }

  function fillBookingsList() {
    const target = document.getElementById('bookings-list');
    if (!target) return;
    // 完了アーカイブ済み bookingTs のセット (localStorage)
    const archived = new Set(JSON.parse(localStorage.getItem('fp-booking-archived') || '[]'));
    const sortMode = localStorage.getItem('fp-bookings-sort') || 'date-desc';
    // 並び替え
    const cmp = {
      'date-desc': (a, b) => String(b.date || '').localeCompare(String(a.date || '')),
      'date-asc':  (a, b) => String(a.date || '').localeCompare(String(b.date || '')),
      'created-desc': (a, b) => String(b.ts || '').localeCompare(String(a.ts || '')),
      'name': (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ja'),
    }[sortMode] || ((a, b) => 0);
    const allBookings = ((liveData && liveData.bookings) || []).slice().sort(cmp);
    const bookings = allBookings.filter(b => !archived.has(b.ts)).slice(0, 8);
    const archivedCount = allBookings.filter(b => archived.has(b.ts)).length;
    // セレクトに現状値反映 + イベント
    const sortSel = document.getElementById('fp-bookings-sort');
    if (sortSel) {
      sortSel.value = sortMode;
      if (!sortSel._bound) {
        sortSel.addEventListener('change', (e) => {
          localStorage.setItem('fp-bookings-sort', e.target.value);
          fillBookingsList();
        });
        sortSel._bound = true;
      }
    }
    if (bookings.length === 0) {
      target.innerHTML = `<div style="background:var(--surface);border:1px dashed var(--line);border-radius:10px;padding:30px;text-align:center;color:var(--muted);font-size:13px;">まだ進行中の予約はありません${archivedCount > 0 ? ` <a href="#" id="fp-show-archived" style="color:var(--accent);margin-left:6px;">完了済み${archivedCount}件を見る</a>` : ''}</div>`;
      if (archivedCount > 0) {
        document.getElementById('fp-show-archived').addEventListener('click', (e) => { e.preventDefault(); showArchivedBookings(allBookings.filter(b => archived.has(b.ts))); });
      }
      return;
    }
    // ISO日付 (Sheets自動変換) or "YYYY-MM-DD" 文字列を「MM/DD」と「曜日」に分割
    const formatBookingDate = (raw) => {
      if (!raw) return { mmdd: '-', weekday: '' };
      const str = String(raw);
      if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
        const d = new Date(str);
        const mm = d.toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', month: '2-digit' });
        const dd = d.toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', day: '2-digit' });
        const wdEn = d.toLocaleString('en-US', { timeZone: 'Asia/Tokyo', weekday: 'short' });
        const wdMap = { Sun: '日', Mon: '月', Tue: '火', Wed: '水', Thu: '木', Fri: '金', Sat: '土' };
        return { mmdd: `${mm}/${dd}`, weekday: `(${wdMap[wdEn] || wdEn})` };
      }
      const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
        const wd = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
        return { mmdd: `${m[2]}/${m[3]}`, weekday: `(${wd})` };
      }
      return { mmdd: str.slice(0, 10), weekday: '' };
    };
    // ISO時刻 or "午後 14:00" 風文字列を「14:00」+「午後」に分割
    const formatBookingTime = (raw) => {
      if (!raw) return '';
      const str = String(raw);
      if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
        const d = new Date(str);
        const hh = d.toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', hour: '2-digit', hour12: false }).replace(/[^\d]/g, '').padStart(2, '0');
        const mm = d.toLocaleString('en-CA', { timeZone: 'Asia/Tokyo', minute: '2-digit' }).replace(/[^\d]/g, '').padStart(2, '0');
        const hhNum = parseInt(hh, 10);
        const label = hhNum < 12 ? '午前' : hhNum < 18 ? '午後' : '夜';
        return `${label} ${hh}:${mm}`;
      }
      return str;
    };

    target.innerHTML = bookings.map(b => {
      const rec = b.recordingStatus || '';
      const tsEnc = encodeURIComponent(b.ts || '');
      const zUrl = escapeHtml(b.zoomUrl || '');
      const dateInfo = formatBookingDate(b.date);
      const timeStr = formatBookingTime(b.time);
      // ローカル保存タスク件数を表示
      const tasksKey = 'fp-tasks-' + (b.userId || tsEnc);
      const savedTasksCount = (JSON.parse(localStorage.getItem(tasksKey) || '[]')).length;
      let cta = '';
      if (rec === 'recording') {
        cta = `<button class="btn-rec-stop" data-rec-stop="${tsEnc}">■ 録画停止</button>
               <a class="btn-mini" href="${zUrl}" target="_blank">Zoomを開く</a>`;
      } else if (rec === 'saved') {
        cta = `<button class="btn-mini" data-open-memo="${tsEnc}" style="background:linear-gradient(135deg,#b8893d,#d4a017);border:none;color:#fff;font-weight:700;">📝 メモ・タスク化${savedTasksCount > 0 ? ' ('+savedTasksCount+')' : ''}</button>
               <button class="btn-mini" data-complete-booking="${tsEnc}" style="background:var(--line-green-soft,#dcfce7);color:#166534;border:1px solid #86efac;font-weight:700;">✓ 完了 (台帳へ)</button>`;
      } else if (zUrl) {
        cta = `<button class="btn-rec-start" data-rec-start="${tsEnc}" data-zoom="${zUrl}">● 録画ONでZoom開始</button>
               <a class="btn-mini" href="${zUrl}" target="_blank">録画なしで開く</a>
               <button class="btn-mini" data-open-memo="${tsEnc}" style="background:#f8fafc;border:1px solid #e5e7eb;color:#374151;">📝 メモ${savedTasksCount > 0 ? ' ('+savedTasksCount+'件)' : ''}</button>
               <button class="btn-mini" data-complete-booking="${tsEnc}" style="background:var(--line-green-soft,#dcfce7);color:#166534;border:1px solid #86efac;font-weight:700;">✓ 完了</button>`;
      }
      const recPill = rec === 'recording' ? '<span class="rec-pill recording">● 録画中</span>'
        : rec === 'saved' ? '<span class="rec-pill saved">📼 録画保存済</span>' : '';
      return `
        <div style="background:var(--surface);border:1px solid var(--line);border-left:4px solid ${rec === 'recording' ? 'var(--red)' : 'var(--line-green)'};border-radius:10px;padding:18px 22px;margin-bottom:10px;box-shadow:var(--shadow-xs);display:grid;grid-template-columns:104px 1fr;gap:18px;">
          <div style="border-right:1px solid var(--line);padding-right:14px;">
            <div style="font-size:22px;font-weight:800;font-family:'Inter',sans-serif;line-height:1.05;color:var(--ink);">${dateInfo.mmdd}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:1px;font-weight:600;">${dateInfo.weekday}</div>
            <div style="font-size:13px;color:var(--accent);margin-top:6px;font-weight:600;">${escapeHtml(timeStr)}</div>
          </div>
          <div style="min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
              <strong style="font-size:15.5px;">${escapeHtml(b.name || '匿名')} 様</strong>
              ${recPill}
            </div>
            ${b.zoomUrl ? `<div style="font-size:10.5px;color:var(--muted);font-family:ui-monospace,Menlo,monospace;margin-bottom:12px;word-break:break-all;line-height:1.5;">${escapeHtml(b.zoomUrl)}</div>` : ''}
            <div style="display:flex;gap:8px;flex-wrap:wrap;">${cta}</div>
          </div>
        </div>`;
    }).join('');
    // 末尾に完了済み件数表示
    if (archivedCount > 0) {
      target.innerHTML += `<div style="margin-top:14px;padding:10px 14px;background:#f8fafc;border:1px dashed #e5e7eb;border-radius:8px;text-align:center;font-size:12px;color:var(--muted);">✓ 完了済み <strong style="color:var(--ink);">${archivedCount}件</strong> はアーカイブ済み <a href="#" id="fp-show-archived" style="color:var(--accent);margin-left:6px;font-weight:600;">アーカイブを見る →</a></div>`;
      const sa = document.getElementById('fp-show-archived');
      if (sa) sa.addEventListener('click', (e) => { e.preventDefault(); showArchivedBookings(allBookings.filter(b => archived.has(b.ts))); });
    }
    bindBookingsButtons();
  }

  function showCompletionToast(booking, client, isNew) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:18px;right:18px;background:#fff;border-left:5px solid #06c755;border-radius:12px;padding:16px 20px;box-shadow:0 12px 36px rgba(0,0,0,0.18);z-index:10002;max-width:420px;font-family:inherit;';
    t.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="font-size:22px;">✅</div>
        <strong style="font-size:14.5px;">面談完了 → 顧客台帳に反映しました</strong>
      </div>
      <div style="font-size:12.5px;color:#1f2937;line-height:1.7;margin-bottom:12px;">
        ・<strong>${escapeHtml(booking.name||'お客様')}様</strong> ${isNew ? 'を <span style="color:#06c755;font-weight:700;">新規顧客として登録</span>' : 'の<strong>最終接触日を更新</strong>'}<br>
        ・台帳: ${client ? `<strong>${escapeHtml(client.name)}</strong> (${client.status === 'new' ? '新規' : client.status === 'important' ? '重点' : client.status === 'active' ? '管理中' : '休眠'})` : '反映なし'}<br>
        ・最終接触: ${client ? client.lastContact : '-'}
      </div>
      <div style="display:flex;gap:6px;">
        <button id="fp-jump-client" style="font-size:11.5px;padding:7px 12px;background:linear-gradient(135deg,#b8893d,#d4a017);border:none;color:#fff;border-radius:6px;cursor:pointer;font-weight:700;font-family:inherit;">→ 顧客台帳で確認</button>
        <button id="fp-comp-close" style="font-size:11.5px;padding:7px 12px;background:#fff;border:1px solid #e5e7eb;color:#374151;border-radius:6px;cursor:pointer;font-family:inherit;">✕</button>
      </div>`;
    document.body.appendChild(t);
    document.getElementById('fp-comp-close').addEventListener('click', () => t.remove());
    document.getElementById('fp-jump-client').addEventListener('click', () => {
      t.remove();
      // 顧客台帳タブに切り替えて該当顧客の行をハイライト
      const tabBtn = document.querySelector('div.tab[data-tab="clients"]');
      if (tabBtn) tabBtn.click();
      setTimeout(() => {
        if (client && client.id) {
          const row = document.querySelector(`[data-client-id="${client.id}"]`);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.style.transition = 'all 0.4s';
            row.style.background = '#fff8e1';
            setTimeout(() => row.style.background = '', 2500);
          }
        }
      }, 400);
    });
    setTimeout(() => t.remove(), 12000);
  }

  function showArchivedBookings(items) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff;width:min(680px,100%);max-height:90vh;overflow-y:auto;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,0.35);">
        <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:baseline;">
          <h2 style="margin:0;font-family:'Noto Serif JP',serif;font-size:18px;">✓ 完了済み面談 (${items.length}件)</h2>
          <button id="fp-arc-close" style="font-size:18px;width:32px;height:32px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;">✕</button>
        </div>
        <div style="padding:18px 24px;display:grid;gap:8px;">
          ${items.map(b => `
            <div style="display:grid;grid-template-columns:90px 1fr auto;gap:12px;align-items:center;padding:12px 14px;background:#fafbfc;border:1px solid #e5e7eb;border-radius:8px;">
              <div style="font-size:13px;font-weight:700;font-family:'Inter',sans-serif;">${escapeHtml(String(b.date||'').slice(5,10).replace('-','/'))}</div>
              <div><strong style="font-size:13px;">${escapeHtml(b.name || '匿名')}様</strong><div style="font-size:11px;color:var(--muted);margin-top:2px;">${escapeHtml(String(b.time||'').slice(0,5))}</div></div>
              <button class="fp-arc-unar" data-ts="${escapeHtml(b.ts)}" style="font-size:11px;padding:6px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;font-family:inherit;">↩ 戻す</button>
            </div>
          `).join('')}
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#fp-arc-close').addEventListener('click', () => overlay.remove());
    overlay.querySelectorAll('.fp-arc-unar').forEach(btn => {
      btn.addEventListener('click', () => {
        const set = new Set(JSON.parse(localStorage.getItem('fp-booking-archived') || '[]'));
        set.delete(btn.dataset.ts);
        localStorage.setItem('fp-booking-archived', JSON.stringify([...set]));
        overlay.remove();
        fillBookingsList();
      });
    });
  }

  function fillFunnelArea() {
    const target = document.getElementById('funnel-area');
    if (!target) return;
    const f = window.LEAD_FUNNEL;
    const conv = (a, b) => b === 0 ? 0 : Math.round(a / b * 100);
    target.innerHTML = `
      <div class="funnel-grid">
        <div class="funnel-step"><div class="funnel-icon">👋</div><div class="funnel-label">友だち追加</div><div class="funnel-value">${f.friendAdded}</div><div class="funnel-conv">—</div></div>
        <div class="funnel-arrow">→</div>
        <div class="funnel-step"><div class="funnel-icon">📝</div><div class="funnel-label">アンケート</div><div class="funnel-value">${f.answeredSurvey}</div><div class="funnel-conv">${conv(f.answeredSurvey, f.friendAdded)}%</div></div>
        <div class="funnel-arrow">→</div>
        <div class="funnel-step"><div class="funnel-icon">📅</div><div class="funnel-label">Zoom予約</div><div class="funnel-value">${f.booked}</div><div class="funnel-conv">${conv(f.booked, f.answeredSurvey)}%</div></div>
        <div class="funnel-arrow">→</div>
        <div class="funnel-step"><div class="funnel-icon">🎯</div><div class="funnel-label">面談実施</div><div class="funnel-value">${f.completed}</div><div class="funnel-conv">${conv(f.completed, f.booked)}%</div></div>
        <div class="funnel-arrow">→</div>
        <div class="funnel-step highlight"><div class="funnel-icon">⭐</div><div class="funnel-label">成約</div><div class="funnel-value">${f.converted}</div><div class="funnel-conv">${conv(f.converted, f.completed)}%</div></div>
      </div>
    `;
  }

  function fillSurveysList() {
    const target = document.getElementById('surveys-list');
    if (!target) return;
    let src = (liveData && liveData.survey_answers) || [];
    const list = src.slice().reverse().slice(0, 5);
    if (list.length === 0) { target.innerHTML = ''; return; }
    target.innerHTML = `
      <div style="font-size:12px;font-weight:700;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">最新のアンケート回答 (確定済も含む)</div>
      ${list.map(s => `
        <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:12px 16px;margin-bottom:6px;display:grid;grid-template-columns:1fr auto;gap:10px;font-size:12.5px;">
          <div>
            <strong>${escapeHtml(s.q1_テーマ || '-')}</strong>
            <span style="color:var(--muted);margin-left:6px;font-size:11px;">${(s.ts || '').slice(5, 16).replace('T', ' ')}</span>
            <div style="color:var(--muted);font-size:11px;margin-top:2px;">${escapeHtml(s.q2_年代 || '-')} / ${escapeHtml(s.q3_家族 || '-')} / ${escapeHtml(s.q4_年収 || '-')}</div>
          </div>
          <div>${s.confirmedSlot ? `<span class="status-pill active">確定済</span>` : '<span class="status-pill important">確定待ち</span>'}</div>
        </div>
      `).join('')}
    `;
  }

  function bindConfirmButtons() {
    document.querySelectorAll('[data-slot-confirm]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const dateStr = btn.dataset.date;
        const slotStr = btn.dataset.slot;
        const isDemo = uid && uid.indexOf('Udemo') === 0;

        const confirmMsg = isDemo
          ? `[デモモード] ${dateStr} ${slotStr} で確定します。\n\n本番では以下が同時に動きます:\n• Zoom URL自動発行\n• お客様にLINE通知\n• Googleカレンダー登録\n\n進めますか?`
          : `${dateStr} ${slotStr} で確定します。\n\nZoomURL発行 → お客様LINE通知 → Googleカレンダー登録 が同時に動きます。`;
        if (!confirm(confirmMsg)) return;

        btn.disabled = true;
        const inner = btn.querySelector('span:last-child');
        if (inner) inner.textContent = '処理中...';

        // ─── デモuserId は擬似成功 ───
        if (isDemo) {
          const fakeZoom = 'https://zoom.us/j/' + Math.floor(Math.random() * 9000000000 + 1000000000) + '?pwd=fpcompass';
          setTimeout(() => {
            alert('✅ 確定しました (デモモード)\n\n📅 ' + dateStr + ' ' + slotStr + '\n💻 Zoom URL: ' + fakeZoom + '\n\n本番ではこの瞬間に:\n  ・お客様の LINE にZoom URL通知\n  ・Googleカレンダーに60分予約イベント登録\n  ・スプレッドシートに予約記録\nが自動で動きます。');
            // デモ確定したら DEMO データから該当を削除して再描画
            if (window.SURVEY_DEMO) {
              window.SURVEY_DEMO = window.SURVEY_DEMO.filter(s => s.userId !== uid);
            }
            renderLeadHubInner();
          }, 600);
          return;
        }

        // ─── 本物のLIVEデータは Cloud Run へ ───
        try {
          const r = await fetch(CLOUD_RUN_BASE + '/api/confirm-slot', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, dateStr: dateStr, slotStr: slotStr }),
          });
          const data = await r.json();
          if (data.ok) {
            alert('✅ 確定\n\nZoom URL: ' + data.zoomUrl + '\nお客様にLINE通知済 + Googleカレンダー登録済');
            await fetchLiveData();
            renderLeadHubInner();
          } else {
            alert('失敗: ' + (data.error || data.raw || '不明なエラー'));
            btn.disabled = false;
            if (inner) inner.textContent = 'この日で確定 →';
          }
        } catch (e) {
          alert('失敗: ' + e.message);
          btn.disabled = false;
          if (inner) inner.textContent = 'この日で確定 →';
        }
      });
    });
  }

  // ===== 画面録画 (getDisplayMedia + MediaRecorder) =====
  window._fpRecorder = window._fpRecorder || {
    mediaRecorder: null, chunks: [], startTime: null, bookingTs: null, timerId: null, blobUrl: null,
  };

  async function startScreenRecording(bookingTs, zoomUrl) {
    const R = window._fpRecorder;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 },
        systemAudio: 'include', // ヒント: 「タブ音声を共有」チェックをデフォルトON
        preferCurrentTab: false,
        surfaceSwitching: 'include',
      });
      // マイク音声も合成 (お客さん側=Zoomの再生音 + FP本人=マイク)
      let combined = stream;
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ac = new AudioContext();
        const dest = ac.createMediaStreamDestination();
        if (stream.getAudioTracks().length > 0) ac.createMediaStreamSource(new MediaStream([stream.getAudioTracks()[0]])).connect(dest);
        ac.createMediaStreamSource(mic).connect(dest);
        combined = new MediaStream([...stream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
        R._micStream = mic;
      } catch (_) { /* マイク許可拒否でもOK */ }

      R.chunks = []; R.startTime = Date.now(); R.bookingTs = bookingTs;
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
      R.mediaRecorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 1500000 });
      R.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) R.chunks.push(e.data); };
      R.mediaRecorder.onstop = async () => {
        const blob = new Blob(R.chunks, { type: 'video/webm' });
        R.blobUrl = URL.createObjectURL(blob);
        combined.getTracks().forEach(t => t.stop());
        stream.getTracks().forEach(t => t.stop());
        if (R._micStream) R._micStream.getTracks().forEach(t => t.stop());
        await onRecordingComplete(R.bookingTs, blob, R.blobUrl);
      };
      R.mediaRecorder.start(1000);

      // Zoom を別タブで開く (録画開始してから開く)
      window.open(zoomUrl, '_blank');
      // サーバー側にもステータス通知
      fetch(CLOUD_RUN_BASE + '/api/recording/start?ts=' + encodeURIComponent(bookingTs), { method: 'POST' }).catch(() => {});

      showRecordingPill();
    } catch (e) {
      alert('画面録画の開始に失敗しました\n\n原因の可能性:\n- 「画面共有」許可ダイアログでキャンセル\n- HTTPSじゃないページ (GitHub Pages なのでHTTPSのはず)\n- ブラウザが getDisplayMedia 非対応\n\n詳細: ' + e.message);
    }
  }

  function stopScreenRecording() {
    const R = window._fpRecorder;
    if (R.mediaRecorder && R.mediaRecorder.state !== 'inactive') R.mediaRecorder.stop();
    if (R.timerId) { clearInterval(R.timerId); R.timerId = null; }
    const pill = document.getElementById('fp-rec-pill');
    if (pill) pill.remove();
  }

  function showRecordingPill() {
    const R = window._fpRecorder;
    let el = document.getElementById('fp-rec-pill');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fp-rec-pill';
      el.innerHTML = `
        <span style="width:11px;height:11px;background:#fff;border-radius:50%;display:inline-block;animation:fp-rec-pulse 1s infinite;"></span>
        <span style="font-weight:700;font-family:'Inter',sans-serif;">録画中</span>
        <span id="fp-rec-time" style="font-weight:800;font-family:'Inter',sans-serif;letter-spacing:0.04em;">00:00</span>
        <button id="fp-rec-stop-btn" style="margin-left:8px;background:rgba(255,255,255,0.22);color:#fff;border:none;padding:6px 14px;border-radius:18px;font-weight:700;cursor:pointer;font-family:inherit;">■ 停止</button>
      `;
      el.style.cssText = 'position:fixed;top:18px;right:18px;background:linear-gradient(135deg,#d9264c,#b91c3c);color:#fff;padding:11px 18px;border-radius:30px;box-shadow:0 12px 32px rgba(217,38,76,0.4);z-index:9999;display:flex;align-items:center;gap:10px;font-size:13.5px;';
      const style = document.createElement('style');
      style.textContent = '@keyframes fp-rec-pulse{0%,100%{opacity:1}50%{opacity:0.3}}@keyframes fp-spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(style);
      document.body.appendChild(el);
      document.getElementById('fp-rec-stop-btn').addEventListener('click', stopScreenRecording);
    }
    R.timerId = setInterval(() => {
      const secs = Math.floor((Date.now() - R.startTime) / 1000);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      const txt = (h > 0 ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      const elT = document.getElementById('fp-rec-time');
      if (elT) elT.textContent = txt;
    }, 1000);
  }

  async function onRecordingComplete(bookingTs, blob, blobUrl) {
    const booking = ((liveData && liveData.bookings) || []).find(b => String(b.ts).slice(0, 19) === String(bookingTs).slice(0, 19));
    // 録画完了の小さなトースト + ダウンロード/メモ動線
    showRecordingDoneToast(booking, blob, blobUrl, bookingTs);
    // サーバー側にも保存通知
    try { await fetch(CLOUD_RUN_BASE + '/api/recording/stop?ts=' + encodeURIComponent(bookingTs), { method: 'POST' }); } catch (_) {}
    await fetchLiveData();
    renderLeadHubInner();
  }

  function showRecordingDoneToast(booking, blob, blobUrl, bookingTs) {
    const name = (booking && booking.name) || 'お客様';
    const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:18px;right:18px;background:#fff;border:1px solid var(--line,#e5e7eb);border-left:4px solid var(--green,#06c755);border-radius:12px;padding:16px 22px;box-shadow:0 12px 36px rgba(0,0,0,0.18);z-index:9999;max-width:380px;font-family:inherit;';
    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="font-size:20px;">✅</div>
        <strong style="font-size:14px;">録画保存完了</strong>
      </div>
      <div style="font-size:12.5px;color:#4b5563;margin-bottom:12px;line-height:1.5;">${escapeHtml(name)}様の面談録画 (${sizeMB}MB)</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <a href="${blobUrl}" download="meeting-${escapeHtml(name)}-${Date.now()}.webm" style="font-size:11.5px;padding:7px 12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;text-decoration:none;color:#1f2937;font-weight:600;">💾 ダウンロード</a>
        <button id="fp-open-memo" style="font-size:11.5px;padding:7px 14px;background:linear-gradient(135deg,#b8893d,#d4a017);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-family:inherit;">📝 メモを書く</button>
        <button id="fp-toast-close" style="font-size:11.5px;padding:7px 10px;background:transparent;border:none;color:#94a3b8;cursor:pointer;font-family:inherit;">✕</button>
      </div>
    `;
    document.body.appendChild(toast);
    document.getElementById('fp-toast-close').addEventListener('click', () => toast.remove());
    document.getElementById('fp-open-memo').addEventListener('click', () => {
      toast.remove();
      openMemoModal(booking, bookingTs);
    });
    // 30秒で自動消去
    setTimeout(() => toast.remove(), 30000);
  }

  // ===== Google カレンダーを別ポップアップウィンドウで右側に開く =====
  // iframe 埋込は Google 側 X-Frame-Options で禁止されてるので、window.open で別窓を右半分に配置
  let _fpCalPopup = null;
  function toggleCalendarSidePanel() {
    if (_fpCalPopup && !_fpCalPopup.closed) {
      _fpCalPopup.close();
      _fpCalPopup = null;
      const btn = document.getElementById('fp-toggle-cal');
      if (btn) btn.textContent = '🗓 自分のGoogleカレンダーを並べて表示';
      return;
    }
    // 画面の右半分を計算してポップアップ
    const sw = window.screen.availWidth || screen.width;
    const sh = window.screen.availHeight || screen.height;
    const w = Math.floor(sw / 2);
    const h = sh - 60;
    const left = sw - w;
    const top = 20;
    const features = `width=${w},height=${h},left=${left},top=${top},toolbar=no,location=no,menubar=no,status=no,scrollbars=yes,resizable=yes`;
    _fpCalPopup = window.open('https://calendar.google.com/calendar/u/0/r/week', 'fp-cal-window', features);
    if (!_fpCalPopup) {
      alert('ポップアップがブロックされました。\n\nブラウザのアドレスバー右の 🚫 アイコンをクリック → 「このサイトのポップアップを常に許可」 → もう一度ボタンを押してください。');
      return;
    }
    // ブラウザによっては既存タブにフォーカスを取られるので、メインウィンドウに戻す
    try { window.focus(); } catch (_) {}
    // 念のため自分のCRMウィンドウを左半分に寄せる
    try {
      window.moveTo(0, 20);
      window.resizeTo(w, h);
    } catch (_) { /* 一部ブラウザで禁止 */ }
    const btn = document.getElementById('fp-toggle-cal');
    if (btn) btn.textContent = '✕ カレンダーを閉じる';
    // ポップアップが閉じられたか定期チェック → ボタン文言戻す
    const checkClosed = setInterval(() => {
      if (!_fpCalPopup || _fpCalPopup.closed) {
        clearInterval(checkClosed);
        _fpCalPopup = null;
        const b = document.getElementById('fp-toggle-cal');
        if (b) b.textContent = '🗓 自分のGoogleカレンダーを並べて表示';
      }
    }, 1500);
  }

  function ensureCalendarSidePanel() { /* 後方互換ダミー */ }

  // ===== メモ → タスク自動抽出 (ドック型パネル: 右/左/下、リサイズ可) =====
  function openMemoModal(booking, bookingTs) {
    const name = (booking && booking.name) || 'お客様';
    const memoKey = 'fp-memo-' + (bookingTs || '');
    const existingMemo = localStorage.getItem(memoKey) || '';

    // 前回のドック位置とサイズを復元
    const dock = localStorage.getItem('fp-memo-dock') || 'right';
    const sizeStr = localStorage.getItem('fp-memo-size-' + dock);
    const defaultSize = dock === 'bottom' ? 380 : 520;
    const size = sizeStr ? parseInt(sizeStr, 10) : defaultSize;

    // 既存パネルがあれば閉じる
    const old = document.getElementById('fp-memo-panel');
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id = 'fp-memo-panel';
    panel.dataset.dock = dock;
    applyDockStyles(panel, dock, size);

    panel.innerHTML = `
      <div id="fp-memo-resize-handle" style="position:absolute;background:transparent;z-index:2;"></div>
      <div style="display:flex;flex-direction:column;height:100%;background:#fff;box-shadow:0 -4px 24px rgba(0,0,0,0.12);border:1px solid #e5e7eb;">
        <div data-drag-handle style="padding:14px 18px 10px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px;background:#fafbfc;">
          <div style="flex:1;min-width:0;">
            <h2 style="margin:0 0 2px;font-family:'Noto Serif JP',serif;font-size:16px;">📝 面談メモ — ${escapeHtml(name)}様</h2>
            <p style="margin:0;color:#6b7280;font-size:11px;line-height:1.4;">期限+動作を含めると自動でタスク化されます (○月○日に・来週・3ヶ月後 等)</p>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;">
            <button data-dock="float" title="フリー位置 (ウィンドウ風)" style="${dockBtnStyle(dock==='float')}">🪟</button>
            <button data-dock="left" title="左ドック" style="${dockBtnStyle(dock==='left')}">⬅</button>
            <button data-dock="right" title="右ドック" style="${dockBtnStyle(dock==='right')}">➡</button>
            <button data-dock="bottom" title="下ドック" style="${dockBtnStyle(dock==='bottom')}">⬇</button>
            <button id="fp-memo-close" title="閉じる" style="font-size:14px;width:32px;height:30px;background:#fff;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;color:#6b7280;font-family:inherit;">✕</button>
          </div>
        </div>
        <div style="padding:14px 18px;overflow-y:auto;flex:1;">
          <div style="background:#fffbf2;border:1px solid #f0d36b;border-radius:8px;padding:9px 13px;margin-bottom:12px;font-size:11px;color:#5e4d1a;line-height:1.5;">
            <strong>書き方のコツ:</strong> 「○月○日までに XXする」「来週 △△を送る」「3ヶ月後に □□確認」
          </div>
          <textarea id="fp-memo-text" placeholder="例:&#10;・新NISAの最適配分シミュレーション資料を 来週中に送る&#10;・教育費見直し 3ヶ月後に再面談&#10;・iDeCo加入手続きの進捗を 2ヶ月後に確認" style="width:100%;min-height:180px;padding:13px 15px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:13px;font-family:'Noto Sans JP',sans-serif;line-height:1.7;resize:vertical;box-sizing:border-box;">${escapeHtml(existingMemo)}</textarea>
          <div id="fp-memo-tasks" style="margin-top:14px;display:none;"></div>
        </div>
        <div style="padding:12px 18px;border-top:1px solid #e5e7eb;display:flex;gap:8px;justify-content:flex-end;background:#fafbfc;">
          <button id="fp-memo-save" style="font-size:13px;padding:9px 22px;background:linear-gradient(135deg,#b8893d,#d4a017);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;">💡 保存して タスク自動抽出</button>
        </div>
      </div>`;
    document.body.appendChild(panel);

    // ドック切替
    panel.querySelectorAll('[data-dock]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newDock = btn.dataset.dock;
        localStorage.setItem('fp-memo-dock', newDock);
        openMemoModal(booking, bookingTs);
      });
    });
    document.getElementById('fp-memo-close').addEventListener('click', () => panel.remove());
    document.getElementById('fp-memo-save').addEventListener('click', () => {
      const memo = document.getElementById('fp-memo-text').value;
      localStorage.setItem(memoKey, memo);
      const tasks = extractTasksFromMemo(memo, booking);
      const tasksKey = 'fp-tasks-' + ((booking && booking.userId) || bookingTs);
      const existing = JSON.parse(localStorage.getItem(tasksKey) || '[]');
      const merged = existing.concat(tasks.map(t => ({ ...t, createdAt: new Date().toISOString(), customerName: name, bookingTs: bookingTs })));
      localStorage.setItem(tasksKey, JSON.stringify(merged));
      renderExtractedTasks(tasks);
    });

    // フリー位置時はドラッグ移動+右下リサイズ、ドック時は端のリサイズ
    if (dock === 'float') setupFreeDrag(panel);
    else setupResizeHandle(panel, dock);
  }

  function dockBtnStyle(active) {
    return `font-size:13px;width:32px;height:30px;background:${active?'#1f2937':'#fff'};color:${active?'#fff':'#374151'};border:1px solid ${active?'#1f2937':'#e5e7eb'};border-radius:6px;cursor:pointer;font-family:inherit;`;
  }

  function applyDockStyles(panel, dock, size) {
    const base = 'position:fixed;z-index:9998;display:flex;background:transparent;';
    if (dock === 'left') {
      panel.style.cssText = base + `top:0;left:0;bottom:0;width:${size}px;`;
    } else if (dock === 'bottom') {
      panel.style.cssText = base + `left:0;right:0;bottom:0;height:${size}px;`;
    } else if (dock === 'float') {
      // フリー位置 (ブラウザウィンドウ風)
      const fp = JSON.parse(localStorage.getItem('fp-memo-float-pos') || '{}');
      const fs = JSON.parse(localStorage.getItem('fp-memo-float-size') || '{}');
      const left = fp.left ?? Math.max(40, window.innerWidth - 600);
      const top = fp.top ?? 80;
      const w = fs.w ?? 520;
      const h = fs.h ?? Math.min(640, window.innerHeight - 120);
      panel.style.cssText = base + `top:${top}px;left:${left}px;width:${w}px;height:${h}px;border-radius:12px;overflow:hidden;`;
    } else {
      panel.style.cssText = base + `top:0;right:0;bottom:0;width:${size}px;`;
    }
  }

  // フリー位置: ヘッダーをドラッグで移動 + 右下隅でリサイズ
  function setupFreeDrag(panel) {
    const header = panel.querySelector('[data-drag-handle]');
    if (!header) return;
    let dragging = false, sx = 0, sy = 0, sLeft = 0, sTop = 0;
    header.style.cursor = 'grab';
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('button,a')) return; // ボタンは除外
      dragging = true; sx = e.clientX; sy = e.clientY;
      const r = panel.getBoundingClientRect();
      sLeft = r.left; sTop = r.top;
      header.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const newLeft = Math.max(0, Math.min(window.innerWidth - 200, sLeft + (e.clientX - sx)));
      const newTop = Math.max(0, Math.min(window.innerHeight - 60, sTop + (e.clientY - sy)));
      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
      localStorage.setItem('fp-memo-float-pos', JSON.stringify({ left: newLeft, top: newTop }));
    });
    document.addEventListener('mouseup', () => {
      if (dragging) { dragging = false; header.style.cursor = 'grab'; document.body.style.userSelect = ''; }
    });

    // 右下リサイズハンドル
    const corner = document.createElement('div');
    corner.style.cssText = 'position:absolute;right:0;bottom:0;width:18px;height:18px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 50%,rgba(184,137,61,0.5) 50%);z-index:3;';
    panel.appendChild(corner);
    let resizing = false, rx = 0, ry = 0, rw = 0, rh = 0;
    corner.addEventListener('mousedown', (e) => {
      resizing = true; rx = e.clientX; ry = e.clientY;
      const r = panel.getBoundingClientRect();
      rw = r.width; rh = r.height;
      document.body.style.userSelect = 'none';
      e.preventDefault(); e.stopPropagation();
    });
    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const nw = Math.max(320, rw + (e.clientX - rx));
      const nh = Math.max(280, rh + (e.clientY - ry));
      panel.style.width = nw + 'px';
      panel.style.height = nh + 'px';
      localStorage.setItem('fp-memo-float-size', JSON.stringify({ w: nw, h: nh }));
    });
    document.addEventListener('mouseup', () => { if (resizing) { resizing = false; document.body.style.userSelect = ''; } });
  }

  function setupResizeHandle(panel, dock) {
    const handle = panel.querySelector('#fp-memo-resize-handle');
    if (!handle) return;
    const HANDLE_W = 6;
    if (dock === 'right') {
      handle.style.cssText += `top:0;bottom:0;left:0;width:${HANDLE_W}px;cursor:ew-resize;`;
    } else if (dock === 'left') {
      handle.style.cssText += `top:0;bottom:0;right:0;width:${HANDLE_W}px;cursor:ew-resize;`;
    } else {
      handle.style.cssText += `left:0;right:0;top:0;height:${HANDLE_W}px;cursor:ns-resize;`;
    }
    handle.style.background = 'rgba(184,137,61,0.0)';
    handle.addEventListener('mouseenter', () => { handle.style.background = 'rgba(184,137,61,0.4)'; });
    handle.addEventListener('mouseleave', () => { handle.style.background = 'rgba(184,137,61,0.0)'; });
    let dragging = false;
    handle.addEventListener('mousedown', (e) => {
      dragging = true; e.preventDefault();
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      let newSize;
      if (dock === 'right') newSize = window.innerWidth - e.clientX;
      else if (dock === 'left') newSize = e.clientX;
      else newSize = window.innerHeight - e.clientY;
      newSize = Math.max(300, Math.min(dock === 'bottom' ? window.innerHeight - 200 : window.innerWidth - 300, newSize));
      if (dock === 'right' || dock === 'left') panel.style.width = newSize + 'px';
      else panel.style.height = newSize + 'px';
      localStorage.setItem('fp-memo-size-' + dock, String(newSize));
    });
    document.addEventListener('mouseup', () => {
      if (dragging) { dragging = false; document.body.style.userSelect = ''; }
    });
  }

  // 自然言語メモ → タスク配列に変換 (ルールベース、外部API不要)
  function extractTasksFromMemo(memo, booking) {
    if (!memo || !memo.trim()) return [];
    const baseDate = (booking && booking.date) ? new Date(booking.date) : new Date('2026-05-28');
    // 行ごとに走査 (・- や改行で区切る)
    const lines = memo.split(/\n|・|・|✓|☐|□|■/).map(s => s.trim()).filter(s => s.length > 3);
    return lines.map(line => parseTaskLine(line, baseDate)).filter(t => t);
  }

  function parseTaskLine(line, baseDate) {
    if (!line) return null;
    // 期限を推定
    let due = null;
    let priorityLabel = '来月';
    const today = baseDate;

    // 絶対日付パターン: "○月○日", "2026/7/15", "7月末"
    let m = line.match(/(\d{1,2})月(\d{1,2})日/);
    if (m) {
      const mo = parseInt(m[1], 10);
      const dd = parseInt(m[2], 10);
      const year = today.getFullYear() + (mo < today.getMonth() + 1 ? 1 : 0);
      due = new Date(year, mo - 1, dd);
    }
    if (!due) {
      m = line.match(/(\d{1,2})月末/);
      if (m) {
        const mo = parseInt(m[1], 10);
        const year = today.getFullYear() + (mo < today.getMonth() + 1 ? 1 : 0);
        due = new Date(year, mo, 0); // 月末
      }
    }
    if (!due && line.match(/今週中|今週/)) {
      due = addDays(today, 7);
      priorityLabel = '今週';
    }
    if (!due && line.match(/来週/)) {
      due = addDays(today, 14);
      priorityLabel = '今週';
    }
    if (!due && line.match(/3ヶ月後|3ヵ月後|三ヶ月後/)) {
      due = addMonths(today, 3);
      priorityLabel = '3ヶ月後';
    }
    if (!due && line.match(/2ヶ月後|2ヵ月後|二ヶ月後/)) {
      due = addMonths(today, 2);
      priorityLabel = '2ヶ月後';
    }
    if (!due && line.match(/半年後|6ヶ月後/)) {
      due = addMonths(today, 6);
      priorityLabel = '半年後';
    }
    if (!due && line.match(/1年後|来年/)) {
      due = addMonths(today, 12);
      priorityLabel = '来年';
    }
    if (!due && line.match(/明日|翌日/)) {
      due = addDays(today, 1);
      priorityLabel = '至急';
    }
    if (!due && line.match(/急ぎ|至急|今日中/)) {
      due = today;
      priorityLabel = '至急';
    }
    // 期限なし → 来月扱い
    if (!due) {
      due = addMonths(today, 1);
      priorityLabel = '来月';
    }
    // タスクの動詞抽出 → アイコン
    let icon = '✅';
    if (line.match(/送(る|付|る)|送信/)) icon = '📤';
    else if (line.match(/確認/)) icon = '👀';
    else if (line.match(/電話|TEL|連絡/)) icon = '📞';
    else if (line.match(/資料|PDF|レポート/)) icon = '📄';
    else if (line.match(/面談|相談|ZOOM|Zoom/)) icon = '💻';
    else if (line.match(/シミュ|シミュレーション/)) icon = '📊';

    // 優先度の色分け
    const daysToDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    if (daysToDue <= 7) priorityLabel = '今週';
    else if (daysToDue <= 14) priorityLabel = '2週間以内';
    else if (daysToDue <= 30) priorityLabel = '来月';
    else if (daysToDue <= 90) priorityLabel = '3ヶ月以内';
    else priorityLabel = '半年以降';

    return {
      task: line.trim(),
      due: formatDate(due),
      priority: priorityLabel,
      icon: icon,
    };
  }

  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
  function formatDate(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    const wd = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    return `${y}/${m}/${dd}(${wd})`;
  }

  function renderExtractedTasks(tasks) {
    const target = document.getElementById('fp-memo-tasks');
    if (!target) return;
    target.style.display = 'block';
    if (tasks.length === 0) {
      target.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;font-size:12.5px;color:#991b1b;">タスクを抽出できませんでした。期限と動作を含む文章を書いてください。</div>`;
      return;
    }
    target.innerHTML = `
      <div style="background:linear-gradient(135deg,#fff8e1,#fffbf2);border:1px solid #f0d36b;border-radius:10px;padding:14px 18px;margin-bottom:12px;">
        <strong style="font-size:13px;color:#5e4d1a;">✨ ${tasks.length}件のタスクを抽出 → 顧客カードに保存しました</strong>
      </div>
      <div style="display:grid;gap:7px;">
        ${tasks.map(t => `
          <div style="display:grid;grid-template-columns:90px 32px 1fr 130px;gap:12px;align-items:center;padding:11px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;">
            <span style="font-size:10.5px;font-weight:700;letter-spacing:0.05em;background:${t.priority==='至急'?'#fef2f2;color:#b91c3c':(t.priority==='今週'||t.priority==='2週間以内')?'#fff7ed;color:#c2410c':'#f0f9ff;color:#075985'};padding:4px 9px;border-radius:11px;text-align:center;">${t.priority}</span>
            <span style="font-size:18px;">${t.icon}</span>
            <span style="font-size:13px;">${escapeHtml(t.task)}</span>
            <span style="font-size:11px;color:#6b7280;text-align:right;">${t.due}</span>
          </div>`).join('')}
      </div>`;
  }

  function _UNUSED_showAIProcessingModal(booking, survey, blob, blobUrl, bookingTs) {
    const overlay = document.createElement('div');
    overlay.id = 'fp-ai-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="background:#fff;width:min(780px,100%);max-height:92vh;overflow-y:auto;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,0.35);">
        <div style="padding:28px 32px 0;">
          <h2 style="margin:0 0 4px;font-family:'Noto Serif JP',serif;font-size:22px;font-weight:700;">✨ AI議事録生成</h2>
          <p style="margin:0;color:#6b7280;font-size:12.5px;">録画ファイルをWhisperで文字起こし → Claudeで要約 → 顧客データへ自動書込</p>
        </div>
        <div id="fp-ai-body" style="padding:24px 32px 32px;"></div>
      </div>`;
    document.body.appendChild(overlay);

    const body = document.getElementById('fp-ai-body');
    const fileSize = (blob.size / 1024 / 1024).toFixed(1);
    const stages = [
      { icon: '📁', label: '録画ファイル保存', detail: fileSize + 'MB の WebM → Drive アップロード', dur: 800 },
      { icon: '🎙', label: 'Whisperで音声文字起こし', detail: '日本語認識・話者分離', dur: 1400 },
      { icon: '🧠', label: 'Claudeで要約生成', detail: '会話のポイント・お客様の関心・宿題を抽出', dur: 1600 },
      { icon: '🏷', label: '次アクション タグ付け', detail: '提案項目・優先度・最適なフォロータイミング判定', dur: 1000 },
      { icon: '✍', label: '顧客カードに自動書込', detail: 'CRMにメモ追記 / Googleカレンダーにフォロー予定登録', dur: 1000 },
    ];

    let html = '<div style="display:grid;gap:14px;">';
    stages.forEach((st, i) => {
      html += `<div id="fp-stage-${i}" style="display:grid;grid-template-columns:32px 1fr 24px;gap:12px;align-items:center;padding:12px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e5e7eb;opacity:0.45;transition:all 0.3s;">
        <div style="font-size:20px;">${st.icon}</div>
        <div><strong style="font-size:13.5px;">${st.label}</strong><div style="font-size:11.5px;color:#6b7280;margin-top:1px;">${st.detail}</div></div>
        <div class="fp-stage-icon" style="font-size:14px;color:#94a3b8;">○</div>
      </div>`;
    });
    html += '</div>';
    body.innerHTML = html;

    // ステージを順次アクティブ化
    let cumulative = 0;
    stages.forEach((st, i) => {
      cumulative += st.dur;
      setTimeout(() => {
        const el = document.getElementById('fp-stage-' + i);
        if (el) {
          el.style.opacity = '1';
          el.style.background = '#fff';
          el.style.borderColor = 'var(--gold,#c19a3a)';
          const icon = el.querySelector('.fp-stage-icon');
          if (icon) { icon.textContent = '⏳'; icon.style.color = 'var(--gold,#c19a3a)'; }
          // 前のステージは完了マーク
          if (i > 0) {
            const prev = document.getElementById('fp-stage-' + (i - 1));
            if (prev) {
              const prevIcon = prev.querySelector('.fp-stage-icon');
              if (prevIcon) { prevIcon.textContent = '✓'; prevIcon.style.color = 'var(--green,#06c755)'; prevIcon.style.fontWeight = '700'; }
            }
          }
        }
      }, cumulative - st.dur + 100);
    });

    // 全ステージ完了 → 結果表示
    setTimeout(async () => {
      // 最終ステージも✓に
      const last = document.getElementById('fp-stage-' + (stages.length - 1));
      if (last) {
        const ic = last.querySelector('.fp-stage-icon');
        if (ic) { ic.textContent = '✓'; ic.style.color = 'var(--green,#06c755)'; ic.style.fontWeight = '700'; }
      }
      // サーバーにも反映
      fetch(CLOUD_RUN_BASE + '/api/recording/stop?ts=' + encodeURIComponent(bookingTs), { method: 'POST' }).catch(() => {});
      await new Promise(r => setTimeout(r, 600));
      renderAIResult(booking, survey, blob, blobUrl, bookingTs);
    }, cumulative + 300);
  }

  function _UNUSED_renderAIResult(booking, survey, blob, blobUrl, bookingTs) {
    const body = document.getElementById('fp-ai-body');
    if (!body) return;
    const name = (booking && booking.name) || 'お客様';
    const theme = (survey && survey.q1_テーマ) || '老後資金';
    const era = (survey && survey.q2_年代) || '40代';
    const family = (survey && survey.q3_家族) || '夫婦+子供';
    const income = (survey && survey.q4_年収) || '700〜1000万';
    const concern = (survey && survey.q5_悩み) || 'NISAの活用方法と老後資金の不足';

    // デモ用議事録テンプレ (アンケート回答から自然な会話風に組み立て)
    const transcript = `■ 面談日時: ${(booking && booking.date) || '2026-06-12'} ${(booking && booking.time) || '14:00'}
■ お客様: ${name}様 (${era} / ${family} / 年収${income})
■ 相談テーマ: ${theme}

【会話サマリー】
お客様は「${concern}」というお悩みを抱えていらっしゃる。
特に「子供の教育費と老後資金の同時準備」に強い不安を感じている様子。
現在の家計簿を共有いただき、月の貯蓄余力は約8〜10万円と確認。

【お客様の関心が高かった項目】
・新NISA つみたて投資枠 (年120万) の効率的な活用
・iDeCo との併用パターン (節税効果)
・教育資金の最適配分 (学資保険 vs ジュニアNISA代替)

【FP側の所見】
${family} ${era}層は「教育費ピーク (子18歳) と退職金準備が重なる」典型パターン。
ライフプラン表を作成して可視化することで、お客様の納得感が一気に高まった。
ご自身でも「想像していたより全体像が見えた」とコメントあり。`;

    const actions = [
      { priority: '至急', task: 'ライフプラン表PDFを作成して送付', when: '7日以内', icon: '📄' },
      { priority: '今週', task: '新NISAつみたて枠の最適配分シミュレーション資料を提示', when: '次回までに準備', icon: '📊' },
      { priority: '来月', task: '教育費見直しの定期レビュー (子供誕生月)', when: '2026年6月末', icon: '🎓' },
      { priority: '3ヶ月後', task: 'iDeCo加入手続き進捗の確認', when: '2026年8月28日', icon: '🏦' },
      { priority: '半年後', task: 'NISA運用状況のレビュー面談', when: '2026年11月28日', icon: '📅' },
    ];

    body.innerHTML = `
      <div style="background:linear-gradient(135deg,#fff8e1,#fffbf2);border:1px solid #f0d36b;border-radius:12px;padding:16px 20px;margin-bottom:18px;display:flex;align-items:center;gap:12px;">
        <div style="font-size:28px;">✨</div>
        <div>
          <strong style="font-size:15px;color:#5e4d1a;">AI処理完了</strong>
          <div style="font-size:12px;color:#8a6f1e;margin-top:2px;">議事録 / 次アクション5件 / フォローアップ予定3件 を自動生成しました</div>
        </div>
      </div>

      <h3 style="margin:0 0 8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;font-weight:700;">📝 議事録</h3>
      <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:18px;font-size:12.5px;line-height:1.75;font-family:'Noto Sans JP',sans-serif;margin:0 0 20px;max-height:280px;overflow-y:auto;">${escapeHtml(transcript)}</pre>

      <h3 style="margin:0 0 8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;font-weight:700;">🏷 次アクション + フォローアップ自動スケジュール</h3>
      <div style="display:grid;gap:8px;margin-bottom:20px;">
        ${actions.map(a => `
          <div style="display:grid;grid-template-columns:80px 32px 1fr 130px;gap:12px;align-items:center;padding:11px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;">
            <span style="font-size:10.5px;font-weight:700;letter-spacing:0.05em;background:${a.priority==='至急'?'#fef2f2;color:#b91c3c':a.priority==='今週'?'#fff7ed;color:#c2410c':'#f0f9ff;color:#075985'};padding:4px 9px;border-radius:11px;text-align:center;">${a.priority}</span>
            <span style="font-size:18px;">${a.icon}</span>
            <span style="font-size:13px;">${a.task}</span>
            <span style="font-size:11px;color:#6b7280;text-align:right;">${a.when}</span>
          </div>
        `).join('')}
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;padding-top:16px;border-top:1px solid #e5e7eb;">
        <a href="${blobUrl}" download="meeting-${(booking && booking.name) || 'recording'}-${Date.now()}.webm" style="font-size:12.5px;padding:9px 18px;border:1px solid #e5e7eb;border-radius:8px;color:#374151;text-decoration:none;font-weight:600;">💾 録画ファイル DL (${(blob.size/1024/1024).toFixed(1)}MB)</a>
        <button id="fp-ai-copy" style="font-size:12.5px;padding:9px 18px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;font-weight:600;color:#374151;">📋 議事録コピー</button>
        <button id="fp-ai-close" style="font-size:13px;padding:9px 22px;background:linear-gradient(135deg,#b8893d,#d4a017);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">✓ 顧客カードに保存して閉じる</button>
      </div>
    `;

    document.getElementById('fp-ai-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(transcript).then(() => alert('議事録をコピーしました'));
    });
    document.getElementById('fp-ai-close').addEventListener('click', async () => {
      // GAS にも議事録を保存依頼
      try { await fetch(CLOUD_RUN_BASE + '/api/transcript?ts=' + encodeURIComponent(bookingTs), { method: 'POST' }); } catch (_) {}
      document.getElementById('fp-ai-overlay').remove();
      await fetchLiveData();
      renderLeadHubInner();
    });
  }

  function bindBookingsButtons() {
    document.querySelectorAll('[data-rec-start]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ts = btn.dataset.recStart;
        const zoomUrl = btn.dataset.zoom;
        await startScreenRecording(ts, zoomUrl);
        await fetchLiveData();
        renderLeadHubInner();
      });
    });
    document.querySelectorAll('[data-rec-stop]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window._fpRecorder.mediaRecorder && window._fpRecorder.mediaRecorder.state !== 'inactive') {
          if (!confirm('録画を停止して保存しますか?')) return;
          stopScreenRecording();
        } else {
          alert('進行中の録画がありません');
        }
      });
    });
    document.querySelectorAll('[data-open-memo]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ts = btn.dataset.openMemo;
        const b = ((liveData && liveData.bookings) || []).find(x => String(x.ts).slice(0,19) === decodeURIComponent(ts).slice(0,19));
        openMemoModal(b || { name: 'お客様', userId: ts, date: new Date().toISOString().slice(0,10) }, ts);
      });
    });
    document.querySelectorAll('[data-complete-booking]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tsEnc = btn.dataset.completeBooking;
        const ts = decodeURIComponent(tsEnc);
        const b = ((liveData && liveData.bookings) || []).find(x => String(x.ts).slice(0,19) === ts.slice(0,19));
        if (!b) { alert('予約が見つかりません'); return; }
        if (!confirm(`「${b.name||'お客様'}様」の面談を完了扱いにして顧客台帳に反映しますか?\n(取り消しは「アーカイブを見る → 戻す」から可能)`)) return;
        const set = new Set(JSON.parse(localStorage.getItem('fp-booking-archived') || '[]'));
        set.add(b.ts);
        localStorage.setItem('fp-booking-archived', JSON.stringify([...set]));
        // 顧客の lastContact を面談日に更新 (お客様マッチ)
        let matched = null;
        let createdNew = false;
        if (window.DUMMY_CLIENTS) {
          matched = window.DUMMY_CLIENTS.find(x => x.lineFriendId === b.userId || x.name === b.name);
          if (matched) {
            matched.lastContact = String(b.date).slice(0, 10);
          } else {
            // 既存顧客にいなければ新規追加
            const newId = 'c' + String(Date.now()).slice(-5);
            matched = {
              id: newId,
              name: b.name || 'お客様',
              kana: '',
              birth: '1985-01-01',
              gender: 'O',
              occupation: '',
              family: [],
              source: 'LINE無料相談',
              status: 'new',
              aum: 0,
              lastContact: String(b.date).slice(0, 10),
              proposals: [],
              note: `LINE経由で初回面談 (${String(b.date).slice(0,10)})\nuserId: ${b.userId || ''}`,
              lineFriendId: b.userId || '',
              lineSubscribed: true,
            };
            window.DUMMY_CLIENTS.push(matched);
            createdNew = true;
          }
          try { localStorage.setItem('fp-crm-clients-v1', JSON.stringify(window.DUMMY_CLIENTS)); } catch (_) {}
        }
        fillBookingsList();
        // 反映結果を分かりやすく表示
        showCompletionToast(b, matched, createdNew);
      });
    });
  }

  // ============================
  // 📨 配信管理ハブ (ダッシュ + スケジュール + テンプレ + ログ を縦に)
  // ============================
  function renderDistributionHub() {
    const v = document.querySelector('[data-line-view="distributionHub"]');
    v.innerHTML = `
      <div class="howto-banner">
        <div class="howto-banner-head">
          <span class="howto-banner-title">📨 配信管理</span>
          <span class="howto-banner-subtitle">自動配信の全体を1画面で / 上から下にスクロール</span>
        </div>
        <div class="howto-steps">
          <div class="howto-step"><div class="howto-step-no">1</div><div><strong>配信ダッシュボード</strong> — 全体KPIと今後の配信予定</div></div>
          <div class="howto-step"><div class="howto-step-no">2</div><div><strong>配信スケジュール</strong> — どのテンプレをいつ・誰に配信するか管理</div></div>
          <div class="howto-step"><div class="howto-step-no">3</div><div><strong>メッセージテンプレ</strong> — 配信に使う文章のストック</div></div>
          <div class="howto-step"><div class="howto-step-no">4</div><div><strong>送信ログ</strong> — 過去配信の履歴・成功/失敗確認</div></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;font-size:11.5px;">
        <a href="#dist-overview" class="quick-jump">📊 概況</a>
        <a href="#dist-schedules" class="quick-jump">⏰ スケジュール</a>
        <a href="#dist-templates" class="quick-jump">💬 テンプレ</a>
        <a href="#dist-log" class="quick-jump">📋 ログ</a>
      </div>
      <section id="dist-overview">
        <h2 class="hub-section-title">📊 配信ダッシュボード</h2>
        <div data-line-view="dashboard"></div>
      </section>
      <section id="dist-schedules" style="margin-top:32px;">
        <h2 class="hub-section-title">⏰ 配信スケジュール</h2>
        <div data-line-view="schedules"></div>
      </section>
      <section id="dist-templates" style="margin-top:32px;">
        <h2 class="hub-section-title">💬 メッセージテンプレ</h2>
        <div data-line-view="templates"></div>
      </section>
      <section id="dist-log" style="margin-top:32px;">
        <h2 class="hub-section-title">📋 送信ログ</h2>
        <div data-line-view="log"></div>
      </section>
    `;
    renderLineDashboard();
    renderSchedules();
    renderTemplates();
    renderLog();
  }

  // ============================
  // 🎁 イベント配信ハブ (誕生日 + 年末カレンダー)
  // ============================
  function renderEventsHub() {
    const v = document.querySelector('[data-line-view="eventsHub"]');
    v.innerHTML = `
      <div class="howto-banner">
        <div class="howto-banner-head">
          <span class="howto-banner-title">🎁 イベント配信</span>
          <span class="howto-banner-subtitle">記念日や季節企画のお客様タッチポイント</span>
        </div>
        <div class="howto-steps">
          <div class="howto-step"><div class="howto-step-no">1</div><div><strong>誕生日リスト</strong> — 本人・配偶者・お子様の誕生日を90日先まで自動検出して当日朝9時にお祝いLINE送信</div></div>
          <div class="howto-step"><div class="howto-step-no">2</div><div><strong>年末カレンダー配布</strong> — 12月にカレンダーを配るFP向け / LINE一斉配信 → 要不要 → 住所収集 → Google地図でルート最適化</div></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;font-size:11.5px;">
        <a href="#evt-birthdays" class="quick-jump">🎂 誕生日</a>
        <a href="#evt-calendar" class="quick-jump">🎍 年末カレンダー</a>
      </div>
      <section id="evt-birthdays">
        <h2 class="hub-section-title">🎂 誕生日リスト (90日)</h2>
        <div data-line-view="birthdays"></div>
      </section>
      <section id="evt-calendar" style="margin-top:32px;">
        <h2 class="hub-section-title">🎍 年末カレンダー配布</h2>
        <div data-line-view="calendars"></div>
      </section>
    `;
    renderBirthdays();
    renderCalendars();
  }

  // ============================
  // ⚙️ 設定ハブ (LINE接続 + セグメント)
  // ============================
  function renderSettingsHub() {
    const v = document.querySelector('[data-line-view="settingsHub"]');
    v.innerHTML = `
      <div class="howto-banner">
        <div class="howto-banner-head">
          <span class="howto-banner-title">⚙️ 設定</span>
          <span class="howto-banner-subtitle">LINE接続情報 と セグメント定義</span>
        </div>
        <div class="howto-steps">
          <div class="howto-step"><div class="howto-step-no">1</div><div><strong>LINE接続</strong> — チャネルトークン / FP情報 / レポートURL / マスター停止スイッチ</div></div>
          <div class="howto-step"><div class="howto-step-no">2</div><div><strong>セグメント定義</strong> — お客様の自動グループ分け定義の確認</div></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;font-size:11.5px;">
        <a href="#set-line" class="quick-jump">🔌 LINE接続</a>
        <a href="#set-segments" class="quick-jump">👥 セグメント</a>
      </div>
      <section id="set-line">
        <h2 class="hub-section-title">🔌 LINE 公式アカウント接続</h2>
        <div data-line-view="settings"></div>
      </section>
      <section id="set-segments" style="margin-top:32px;">
        <h2 class="hub-section-title">👥 セグメント定義</h2>
        <div data-line-view="segments"></div>
      </section>
    `;
    renderSettings();
    renderSegments();
  }

  // ============================
  // 🎍 年末カレンダー配布
  // ============================
  function renderCalendars() {
    fetchLiveData().then(() => { if (currentSubview === 'eventsHub') renderCalendarsInner(); });
    renderCalendarsInner();
  }

  function renderCalendarsInner() {
    const reqs = (liveData && liveData.calendar_requests) || [];
    const wantList = reqs.filter(r => r.status === '要' && r.address);
    const wantNoAddr = reqs.filter(r => r.status === '要' && !r.address);
    const notWant = reqs.filter(r => r.status === '不要');
    const total = reqs.length;
    const cvr = total > 0 ? Math.round(wantList.length / total * 100) : 0;

    // Google Maps ルートURL生成
    const buildRouteUrl = (addresses) => {
      if (addresses.length === 0) return '#';
      const enc = addresses.map(a => encodeURIComponent(a));
      const origin = enc[0];
      const destination = enc[enc.length - 1];
      const waypoints = enc.slice(1, -1).join('|');
      let url = 'https://www.google.com/maps/dir/?api=1&origin=' + origin + '&destination=' + destination;
      if (waypoints) url += '&waypoints=' + waypoints;
      url += '&travelmode=driving';
      return url;
    };
    const buildMapAllUrl = (addresses) => {
      if (addresses.length === 0) return '#';
      return 'https://www.google.com/maps/search/' + encodeURIComponent(addresses.join(' / '));
    };

    const wantAddresses = wantList.map(r => r.address).filter(x => x);
    const routeUrl = buildRouteUrl(wantAddresses);
    const allMapUrl = buildMapAllUrl(wantAddresses);

    const html = `
      <div class="howto-banner">
        <div class="howto-banner-head">
          <span class="howto-banner-title">💡 年末カレンダー配布の流れ</span>
          <span class="howto-banner-subtitle">毎年12月に既存客に手渡しカレンダー配るFP向け / 5ステップで完了</span>
        </div>
        <div class="howto-steps">
          <div class="howto-step"><div class="howto-step-no">1</div><div>下の <span class="btn-hint">📨 友だち全員に一斉配信</span> を押す → 全LINE友だちに「カレンダー希望調査」が届く</div></div>
          <div class="howto-step"><div class="howto-step-no">2</div><div>お客様は LINE で「🎁 受け取る / 不要」を1タップ</div></div>
          <div class="howto-step"><div class="howto-step-no">3</div><div>「受け取る」を選んだ方には自動で住所入力URLが届く → 入力すると下のリストに反映</div></div>
          <div class="howto-step"><div class="howto-step-no">4</div><div>FP は <span class="btn-hint">🚗 配達ルート最適化</span> でGoogle マップを開き、ナビで配達</div></div>
          <div class="howto-step"><div class="howto-step-no">5</div><div>各住所行の <span class="btn-hint">📍 地図で見る</span> で個別位置確認も可能</div></div>
        </div>
      </div>

      <div class="kpi-row" style="grid-template-columns:repeat(4,1fr);">
        <div class="kpi">
          <div class="kpi-label">回答総数</div>
          <div class="kpi-value">${total}</div>
          <div class="kpi-sub">人</div>
        </div>
        <div class="kpi good">
          <div class="kpi-label">「要」(住所済)</div>
          <div class="kpi-value">${wantList.length}</div>
          <div class="kpi-sub">配達対象</div>
        </div>
        <div class="kpi warn">
          <div class="kpi-label">「要」(住所未)</div>
          <div class="kpi-value">${wantNoAddr.length}</div>
          <div class="kpi-sub">住所待ち</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">希望率</div>
          <div class="kpi-value">${cvr}<span class="unit">%</span></div>
          <div class="kpi-sub">要 / 回答総数</div>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;margin-bottom:24px;">
        <button class="primary" id="cal-blast-btn" data-hint="全LINE友だちに「カレンダー要りますか?」配信。年1回だけ押す想定">📨 友だち全員に一斉配信</button>
        <a class="ghost" href="${allMapUrl}" target="_blank" data-hint="希望者の住所をGoogleマップ上に全部ピン表示" style="text-decoration:none;display:inline-block;padding:9px 18px;border:1px solid var(--line-2);border-radius:7px;color:var(--ink);${wantList.length===0?'pointer-events:none;opacity:0.4;':''}">🗺 全員の住所を地図表示</a>
        <a class="ghost" href="${routeUrl}" target="_blank" data-hint="希望者全員を回る最適ルートをGoogleマップで生成。当日ナビとして使用" style="text-decoration:none;display:inline-block;padding:9px 18px;border:1px solid var(--line-2);border-radius:7px;color:var(--ink);${wantList.length===0?'pointer-events:none;opacity:0.4;':''}">🚗 配達ルートを最適化 (Google マップ)</a>
        <span id="cal-blast-msg" style="font-size:12px;color:var(--muted);align-self:center;margin-left:auto;"></span>
      </div>

      <div class="section-title">🎁 受け取り希望 (住所済) — ${wantList.length}名</div>
      ${wantList.length === 0
        ? '<div class="line-card" style="text-align:center;padding:30px;color:var(--muted);">まだ住所登録されたご希望はありません</div>'
        : `<div style="display:grid;gap:8px;margin-bottom:24px;">
            ${wantList.map((r, i) => `
              <div class="line-card" style="padding:14px 18px;display:grid;grid-template-columns:36px 1fr 160px;gap:12px;align-items:center;">
                <div style="background:linear-gradient(135deg,var(--accent),var(--accent-2));color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;font-family:'Inter',sans-serif;">${i + 1}</div>
                <div>
                  <strong style="font-size:14px;">${escapeHtml(r.name) || '匿名'}</strong>
                  <div style="font-size:12.5px;color:var(--ink-2);margin-top:3px;letter-spacing:0.01em;line-height:1.6;">📮 ${escapeHtml(r.address)}</div>
                  ${r.phone ? `<div style="font-size:11.5px;color:var(--muted);margin-top:2px;">📞 ${escapeHtml(r.phone)}</div>` : ''}
                  ${r.note ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;font-style:italic;">📝 ${escapeHtml(r.note)}</div>` : ''}
                </div>
                <div style="text-align:right;">
                  <a href="https://www.google.com/maps/search/${encodeURIComponent(r.address)}" target="_blank" style="font-size:11.5px;color:var(--accent);text-decoration:none;background:var(--accent-soft);padding:4px 10px;border-radius:11px;display:inline-block;">📍 地図で見る</a>
                </div>
              </div>
            `).join('')}
          </div>`
      }

      ${wantNoAddr.length > 0 ? `
        <div class="section-title" style="margin-top:24px;">⏳ 住所登録待ち — ${wantNoAddr.length}名</div>
        <div style="display:grid;gap:6px;margin-bottom:24px;">
          ${wantNoAddr.map(r => `
            <div class="line-card" style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
              <strong style="font-size:13.5px;">${escapeHtml(r.name) || '匿名'}</strong>
              <span style="font-size:11px;color:var(--muted);">住所入力URLを送信済 / 入力待ち</span>
            </div>
          `).join('')}
        </div>` : ''}

      ${notWant.length > 0 ? `
        <div class="section-title" style="margin-top:24px;">✗ 不要 — ${notWant.length}名</div>
        <div style="display:grid;gap:4px;font-size:12px;color:var(--muted);">
          ${notWant.map(r => `<div style="padding:8px 14px;background:#fafbfc;border:1px solid var(--line);border-radius:6px;">${escapeHtml(r.name) || '匿名'}</div>`).join('')}
        </div>` : ''}
    `;
    document.querySelector('[data-line-view="calendars"]').innerHTML = html;

    document.getElementById('cal-blast-btn').addEventListener('click', async () => {
      if (!confirm('LINE友だち全員に「カレンダー希望調査」を一斉配信します。よろしいですか?')) return;
      const btn = document.getElementById('cal-blast-btn');
      const msg = document.getElementById('cal-blast-msg');
      btn.disabled = true; btn.textContent = '配信中...';
      try {
        const r = await fetch(CLOUD_RUN_BASE + '/api/cal-blast', { method: 'POST' });
        const data = await r.json();
        msg.textContent = data.ok ? `✓ ${data.sent}/${data.total}名 に送信完了` : '❌ 失敗: ' + (data.error || '');
        msg.style.color = data.ok ? 'var(--green)' : 'var(--red)';
        btn.disabled = false; btn.textContent = '📨 友だち全員に一斉配信';
      } catch (e) {
        msg.textContent = '❌ 失敗: ' + e.message;
        msg.style.color = 'var(--red)';
        btn.disabled = false;
        btn.textContent = '📨 友だち全員に一斉配信';
      }
    });
  }

  // ============================
  // 初回相談導線 (リードファネル)
  // ============================
  // Cloud Run のリアルデータ
  const CLOUD_RUN_BASE = 'https://fp-compass-webhook-527726449426.asia-northeast1.run.app';
  const CLOUD_RUN_API = CLOUD_RUN_BASE + '/api/bookings';
  let liveData = null;

  async function fetchLiveData() {
    try {
      const r = await fetch(CLOUD_RUN_API);
      liveData = await r.json();
      window.LineAppLiveData = liveData;
      return liveData;
    } catch (e) { console.error('liveData fail', e); return null; }
  }

  function renderLeadFunnel() {
    // 起動時 + 10秒ごとにライブデータ取得
    fetchLiveData().then(() => { if (currentSubview === 'leadHub') renderLeadFunnelInner(); });
    if (!window._leadFunnelInterval) {
      window._leadFunnelInterval = setInterval(() => {
        if (currentSubview === 'leadHub') {
          fetchLiveData().then(() => renderLeadFunnelInner());
        }
      }, 10000);
    }
    renderLeadFunnelInner();
  }

  function renderLeadFunnelInner() {
    const f = window.LEAD_FUNNEL;
    const scenario = window.LEAD_SCENARIO;
    const form = window.LEAD_FORM;

    // Cloud Run の bookings/survey_answers を優先表示
    let bookings = window.UPCOMING_BOOKINGS;
    let surveysList = [];
    let liveStats = null;
    if (liveData) {
      const live = (liveData.bookings || []).slice().reverse().slice(0, 10).map(b => ({
        id: 'live-' + (b.userId || b.ts),
        name: b.name || '匿名',
        date: b.date || '',
        time: b.time || '',
        via: 'Zoom',
        status: 'confirmed',
        zoomUrl: b.zoomUrl || '',
        answers: { q1: '-', q2: '-', q3: '-', q4: '-', q5: '-' },
        addedToCrm: false,
        live: true,
        ts: b.ts || '',
        recordingStatus: b.recordingStatus || '',
        driveUrl: b.driveUrl || '',
        transcript: b.transcript || '',
      }));
      if (live.length > 0) bookings = live.concat(bookings);
      surveysList = (liveData.survey_answers || []).slice().reverse().slice(0, 8);
      liveStats = {
        users: (liveData.users || []).length,
        surveys: (liveData.survey_answers || []).length,
        bookings: (liveData.bookings || []).length,
      };
    }
    const hotLeads = window.HOT_LEADS;

    const conv = (a, b) => b === 0 ? 0 : Math.round(a / b * 100);

    const html = `
      <div class="howto-banner">
        <div class="howto-banner-head">
          <span class="howto-banner-title">💡 このタブの使い方</span>
          <span class="howto-banner-subtitle">新規相談 → Zoom面談 → 顧客化 までを自動化する場所</span>
        </div>
        <div class="howto-steps">
          <div class="howto-step"><div class="howto-step-no">1</div><div>お客様が公式LINE追加 → 自動でステップ配信 → アンケート + 候補日3つ受信</div></div>
          <div class="howto-step"><div class="howto-step-no">2</div><div>下の<strong>「公式LINEからの最新アンケート回答」</strong>に「確定待ち」のお客様が並ぶ</div></div>
          <div class="howto-step"><div class="howto-step-no">3</div><div>候補日3つから1つ <span class="btn-hint">この日で確定 →</span> ボタンを押す</div></div>
          <div class="howto-step"><div class="howto-step-no">4</div><div>瞬時に: Zoom URL自動発行 / お客様にLINE通知 / Googleカレンダー登録 が全部起きる</div></div>
          <div class="howto-step"><div class="howto-step-no">5</div><div>面談当日は予約カードの <span class="btn-hint">● 録画ONでZoom開始</span> から入室 → 終了時 <span class="btn-hint">■ 録画停止</span> → <span class="btn-hint">✨ AI議事録を生成</span></div></div>
        </div>
      </div>

      ${liveStats ? `
      <div style="background:linear-gradient(135deg,#06873f,#06c755);color:#fff;border-radius:10px;padding:12px 18px;margin-bottom:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:13px;">
          <span style="width:8px;height:8px;background:#fff;border-radius:50%;animation:pulse 1.5s infinite;"></span> LIVE
        </div>
        <div style="font-size:12px;opacity:0.9;">公式LINEから入った実データ</div>
        <div style="margin-left:auto;display:flex;gap:16px;font-size:13px;">
          <div>友だち <strong>${liveStats.users}</strong></div>
          <div>回答 <strong>${liveStats.surveys}</strong></div>
          <div>予約 <strong>${liveStats.bookings}</strong></div>
        </div>
      </div>
      <style>@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}</style>
      ` : ''}

      ${surveysList.length > 0 ? `
      <div class="section-title">📝 公式LINEからの最新アンケート回答 (候補日3つ込み)</div>
      <div style="display:grid;gap:10px;margin-bottom:18px;">
        ${surveysList.map(s => {
          const slots = [s.q6_候補1, s.q7_候補2, s.q8_候補3].filter(x => x);
          const confirmed = s.confirmedSlot || '';
          const uidShort = (s.userId || '').slice(0, 12);
          return `
          <div class="line-card" style="padding:14px 18px;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;gap:8px;">
              <div>
                <strong style="font-size:14px;">${escapeHtml(s.q1_テーマ || '-')}</strong>
                <span style="font-size:11px;color:var(--muted);margin-left:8px;">${(s.ts || '').slice(5, 16).replace('T', ' ')}</span>
              </div>
              ${confirmed
                ? `<span class="status-pill active">✓ ${escapeHtml(confirmed)} 確定</span>`
                : '<span class="status-pill new">確定待ち</span>'}
            </div>
            <div style="font-size:12px;color:var(--muted);letter-spacing:0.02em;margin-bottom:4px;">
              ${escapeHtml(s.q2_年代 || '-')} ・ ${escapeHtml(s.q3_家族 || '-')} ・ ${escapeHtml(s.q4_年収 || '-')} ・ userId:${uidShort}…
            </div>
            <div style="font-size:13px;color:var(--ink-2);margin-bottom:10px;line-height:1.6;">💭 ${escapeHtml(s.q5_悩み || '-')}</div>
            ${confirmed ? '' : (slots.length > 0 ? `
              <div style="background:#fafbfc;border:1px solid var(--line);border-radius:7px;padding:10px 12px;">
                <div style="font-size:11px;color:var(--muted);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">候補日 (タップで確定 → 自動でZoom URL作成・LINE通知・カレンダー登録)</div>
                <div style="display:grid;gap:6px;">
                  ${slots.map((slot, idx) => {
                    const parts = (slot || '').split(/\s+/);
                    const dateStr = parts[0] || '';
                    const slotStr = parts.slice(1).join(' ') || '';
                    return `<button class="slot-confirm-btn" data-slot-confirm
                      data-uid="${escapeHtml(s.userId)}" data-date="${escapeHtml(dateStr)}" data-slot="${escapeHtml(slotStr)}"
                      data-hint="この日で確定 → ZoomURL自動発行・お客様にLINE通知・Googleカレンダー登録 が一括で動きます"
                      style="text-align:left;padding:10px 14px;background:#fff;border:1px solid var(--line);border-radius:6px;cursor:pointer;font-size:13px;display:flex;justify-content:space-between;align-items:center;font-family:inherit;">
                      <span><strong style="color:var(--accent);margin-right:8px;">第${idx + 1}希望</strong>${escapeHtml(slot)}</span>
                      <span style="font-size:11px;color:var(--green);font-weight:700;">この日で確定 →</span>
                    </button>`;
                  }).join('')}
                </div>
              </div>` : '<div style="font-size:11.5px;color:var(--muted);">※ 候補日未取得 (旧バージョンのアンケート回答)</div>')}
          </div>`;
        }).join('')}
      </div>
      ` : ''}

      <div class="section-title">直近30日のリード獲得ファネル</div>
      <div class="funnel-grid">
        <div class="funnel-step">
          <div class="funnel-icon">👋</div>
          <div class="funnel-label">友だち追加</div>
          <div class="funnel-value">${f.friendAdded}</div>
          <div class="funnel-conv">—</div>
        </div>
        <div class="funnel-arrow">→</div>
        <div class="funnel-step">
          <div class="funnel-icon">📝</div>
          <div class="funnel-label">アンケート回答</div>
          <div class="funnel-value">${f.answeredSurvey}</div>
          <div class="funnel-conv">${conv(f.answeredSurvey, f.friendAdded)}%</div>
        </div>
        <div class="funnel-arrow">→</div>
        <div class="funnel-step">
          <div class="funnel-icon">📅</div>
          <div class="funnel-label">Zoom予約</div>
          <div class="funnel-value">${f.booked}</div>
          <div class="funnel-conv">${conv(f.booked, f.answeredSurvey)}%</div>
        </div>
        <div class="funnel-arrow">→</div>
        <div class="funnel-step">
          <div class="funnel-icon">🎯</div>
          <div class="funnel-label">面談実施</div>
          <div class="funnel-value">${f.completed}</div>
          <div class="funnel-conv">${conv(f.completed, f.booked)}%</div>
        </div>
        <div class="funnel-arrow">→</div>
        <div class="funnel-step highlight">
          <div class="funnel-icon">⭐</div>
          <div class="funnel-label">成約</div>
          <div class="funnel-value">${f.converted}</div>
          <div class="funnel-conv">${conv(f.converted, f.completed)}%</div>
        </div>
      </div>

      <div class="section-title" style="margin-top:24px;">📅 今後の面談予約 (アンケート回答済)</div>
      <div>
        ${bookings.length === 0 ? '<div class="line-card empty">予約なし</div>' : bookings.map(b => {
          const isLive = b.live;
          const rec = b.recordingStatus || '';
          const recPill = rec === 'recording' ? '<span class="rec-pill recording">● 録画中</span>'
                        : rec === 'saved' ? '<span class="rec-pill saved">📼 保存済</span>' : '';
          const dateStr = (b.date || '').slice(5).replace('-','/');
          const recButtons = isLive && b.zoomUrl ? (
            rec === 'recording' ? `
              <button class="btn-rec-stop" data-rec-stop="${escapeHtml(b.ts)}" data-hint="面談終了時に押す。録画ファイルが Drive に保存される">■ 録画停止</button>
              <a class="btn-mini" href="${escapeHtml(b.zoomUrl)}" target="_blank" data-hint="Zoom会議画面を別タブで開く">Zoomを開く</a>
            ` : rec === 'saved' ? `
              <a class="btn-mini" href="${escapeHtml(b.driveUrl||'#')}" target="_blank" data-hint="Google Drive に保存された録画ファイルを開く">📁 録画を開く (Drive)</a>
              <a class="btn-mini" href="${escapeHtml(b.zoomUrl)}" target="_blank" data-hint="同じZoom URLを再度開く (フォロー面談用)">Zoomを開く</a>
              ${b.transcript
                ? `<button class="btn-mini" data-view-transcript="${escapeHtml(b.ts)}" data-hint="AIが作った議事録を表示・コピー" style="background:#fff8e1;border-color:#f0d36b;color:#8a6f1e;font-weight:600;">📝 議事録を見る</button>`
                : `<button class="btn-mini" data-gen-transcript="${escapeHtml(b.ts)}" data-hint="アンケート回答と顧客情報から議事録テンプレを自動生成。面談後に押す" style="background:linear-gradient(135deg,#b8893d,#d4a017);border:none;color:#fff;font-weight:700;">✨ AI議事録を生成</button>`}
            ` : `
              <button class="btn-rec-start" data-rec-start="${escapeHtml(b.ts)}" data-zoom="${escapeHtml(b.zoomUrl)}" data-hint="面談直前に押す。Zoomが別タブで開き、録画状態が「録画中」に">● 録画ONでZoom開始</button>
              <a class="btn-mini" href="${escapeHtml(b.zoomUrl)}" target="_blank" data-hint="録画せずにZoomだけ開く (簡易確認用)">録画なしで開く</a>
            `
          ) : '';
          return `
          <div class="booking-row" data-booking-id="${b.id}">
            <div class="booking-when">
              <div class="booking-date">${dateStr}</div>
              <div class="booking-time">${b.time}</div>
            </div>
            <div class="booking-main">
              <div class="booking-name">${escapeHtml(b.name)} ${isLive ? '<span class="status-pill active">LIVE</span>' : '<span class="status-pill new">未登録</span>'} ${recPill}</div>
              ${!isLive ? `<div class="booking-meta">${escapeHtml(b.answers.q1)} / ${escapeHtml(b.answers.q2)} / ${escapeHtml(b.answers.q3)} / ${escapeHtml(b.answers.q4)}</div>` : ''}
              ${!isLive ? `<div class="booking-want">💭 ${escapeHtml(b.answers.q5)}</div>` : ''}
              ${isLive ? `<div class="booking-want" style="font-family:ui-monospace,Menlo,monospace;font-size:11px;word-break:break-all;font-style:normal;">${escapeHtml(b.zoomUrl)}</div>` : ''}
              ${recButtons ? `<div class="booking-rec-row">${recButtons}</div>` : ''}
            </div>
            <div class="booking-cta">
              ${!isLive ? `<button class="ghost" data-view-answers="${b.id}">回答詳細</button>
              <button class="primary" data-convert="${b.id}" ${b.addedToCrm ? 'disabled style="opacity:0.5;"' : ''}>${b.addedToCrm ? '✓ 登録済' : '顧客登録'}</button>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="section-title" style="margin-top:24px;">🔥 ホットリード (回答済・未予約)</div>
      <div class="line-card">
        ${hotLeads.map(h => `
          <div class="booking-row">
            <div class="booking-when">
              <div class="booking-time" style="font-size:11px;">${escapeHtml(h.answeredAt.slice(5, 16))}</div>
              <div class="booking-date" style="font-size:10.5px;color:var(--muted);">回答済</div>
            </div>
            <div class="booking-main">
              <div class="booking-name">${escapeHtml(h.name)}</div>
              <div class="booking-meta">
                ${escapeHtml(h.answers.q1)} / ${escapeHtml(h.answers.q2)} / ${escapeHtml(h.answers.q3)} / ${escapeHtml(h.answers.q4)}
              </div>
              <div class="booking-want">💭 ${escapeHtml(h.answers.q5)}</div>
            </div>
            <div class="booking-cta">
              <button class="primary" disabled style="opacity:0.6;">予約URL再送</button>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:24px;">
        <div>
          <div class="section-title">⚙️ ステップ配信シナリオ</div>
          <div class="line-card">
            <div style="padding:10px 14px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:600;font-size:13.5px;">${escapeHtml(scenario.name)}</div>
                <div style="font-size:11px;color:var(--muted);">トリガー: ${escapeHtml(scenario.trigger)}</div>
              </div>
              <label class="toggle-switch"><input type="checkbox" ${scenario.enabled ? 'checked' : ''} disabled><span></span></label>
            </div>
            ${scenario.steps.map((s, i) => `
              <div class="step-row">
                <div class="step-no">${i + 1}</div>
                <div class="step-main">
                  <div class="step-head">
                    <span class="step-day">${s.day === 0 ? '即時' : '+' + s.day + '日'}</span>
                    <span class="step-time">${escapeHtml(s.time)}</span>
                    <span class="step-title">${escapeHtml(s.title)}</span>
                  </div>
                  <div class="step-body">${nl2br(s.body)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div>
          <div class="section-title">📋 ヒアリングアンケート (LINE内回答)</div>
          <div class="line-card">
            <div style="padding:10px 14px;border-bottom:1px solid var(--line);">
              <div style="font-weight:600;font-size:13.5px;">${escapeHtml(form.title)}</div>
              <div style="font-size:11px;color:var(--muted);">回答結果が自動で顧客メモに反映される</div>
            </div>
            ${form.questions.map((q, i) => `
              <div class="q-row">
                <div class="q-no">Q${i + 1}</div>
                <div class="q-main">
                  <div class="q-label">${escapeHtml(q.label)}</div>
                  ${q.type === 'choice' ? `<div class="q-opts">${q.options.map(o => `<span class="q-opt">${escapeHtml(o)}</span>`).join('')}</div>` : '<div class="q-opts" style="color:var(--muted);font-style:italic;">自由記述</div>'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    document.querySelector('[data-line-view="leadfunnel"]').innerHTML = html;

    // 顧客登録ボタン
    document.querySelectorAll('[data-convert]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.convert;
        const booking = window.UPCOMING_BOOKINGS.find(b => b.id === id);
        if (!booking || booking.addedToCrm) return;
        const newClient = window.LineCRM.convertBookingToClient(booking);
        if (newClient) {
          btn.textContent = '✓ 登録済';
          btn.disabled = true;
          btn.style.opacity = '0.5';
          // 確認モーダル
          showConvertResult(newClient);
        }
      });
    });
    // 回答詳細表示
    document.querySelectorAll('[data-view-answers]').forEach(btn => {
      btn.addEventListener('click', () => showAnswersDetail(btn.dataset.viewAnswers));
    });
    // Zoom録画開始
    document.querySelectorAll('[data-rec-start]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ts = btn.dataset.recStart;
        const zoomUrl = btn.dataset.zoom;
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await fetch(CLOUD_RUN_BASE + '/api/recording/start?ts=' + encodeURIComponent(ts), { method: 'POST' });
          window.open(zoomUrl, '_blank');
          await fetchLiveData();
          renderLeadFunnelInner();
        } catch (e) {
          alert('録画開始失敗: ' + e.message);
          btn.disabled = false;
        }
      });
    });
    // Zoom録画停止
    document.querySelectorAll('[data-rec-stop]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('録画を停止して Drive に保存しますか?')) return;
        const ts = btn.dataset.recStop;
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await fetch(CLOUD_RUN_BASE + '/api/recording/stop?ts=' + encodeURIComponent(ts), { method: 'POST' });
          await fetchLiveData();
          renderLeadFunnelInner();
        } catch (e) {
          alert('録画停止失敗: ' + e.message);
          btn.disabled = false;
        }
      });
    });
    // 候補日確定
    document.querySelectorAll('[data-slot-confirm]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const dateStr = btn.dataset.date;
        const slotStr = btn.dataset.slot;
        if (!confirm(`${dateStr} ${slotStr} で確定し、お客様にZoom URLをLINE送信、Googleカレンダーに登録します。よろしいですか?`)) return;
        btn.disabled = true;
        btn.innerHTML = btn.innerHTML.replace('この日で確定 →', '処理中...');
        try {
          const r = await fetch(CLOUD_RUN_BASE + '/api/confirm-slot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, dateStr: dateStr, slotStr: slotStr }),
          });
          const data = await r.json();
          if (data.ok) {
            alert('✅ 確定しました\n\nZoom URL: ' + data.zoomUrl + '\n\n• お客様LINEに通知済\n• Googleカレンダーに登録済' + (data.calendar ? '\n• カレンダーID: ' + (data.calendar.calendarId || '') : ''));
            await fetchLiveData();
            renderLeadFunnelInner();
          } else {
            alert('❌ 確定失敗: ' + (data.error || ''));
            btn.disabled = false;
          }
        } catch (e) {
          alert('❌ 確定失敗: ' + e.message);
          btn.disabled = false;
        }
      });
    });
    // AI議事録 生成
    document.querySelectorAll('[data-gen-transcript]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ts = btn.dataset.genTranscript;
        btn.disabled = true;
        btn.textContent = '✨ 生成中...';
        try {
          const r = await fetch(CLOUD_RUN_BASE + '/api/transcript?ts=' + encodeURIComponent(ts), { method: 'POST' });
          const data = await r.json();
          if (data.ok && data.transcript) {
            await fetchLiveData();
            renderLeadFunnelInner();
            showTranscriptModal(data.transcript, '✨ AI議事録 (自動生成)');
          } else {
            alert('議事録生成失敗: ' + (data.error || ''));
            btn.disabled = false;
            btn.textContent = '✨ AI議事録を生成';
          }
        } catch (e) {
          alert('議事録生成失敗: ' + e.message);
          btn.disabled = false;
        }
      });
    });
    // 議事録を見る
    document.querySelectorAll('[data-view-transcript]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ts = btn.dataset.viewTranscript;
        // ライブデータから該当 booking の transcript を取得
        const live = (liveData && liveData.bookings) || [];
        const b = live.find(x => String(x.ts).slice(0,19) === String(ts).slice(0,19));
        if (b && b.transcript) {
          showTranscriptModal(b.transcript, '📝 議事録 — ' + (b.name || ''));
        } else {
          alert('議事録が見つかりません');
        }
      });
    });
  }

  function showTranscriptModal(transcript, title) {
    const html = `
      <div class="modal-header">
        <h2>${title || '議事録'}</h2>
        <button class="modal-close" id="tr-close">×</button>
      </div>
      <div class="modal-body">
        <div style="background:#fafbfc;border:1px solid var(--line);border-radius:8px;padding:18px 22px;font-family:'Noto Sans JP',monospace;font-size:12.5px;line-height:1.85;white-space:pre-wrap;max-height:600px;overflow-y:auto;letter-spacing:0.01em;">${escapeHtml(transcript)}</div>
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="primary" id="tr-copy">📋 全文をコピー</button>
          <button id="tr-close-btn">閉じる</button>
        </div>
        <div id="tr-msg" style="font-size:11.5px;color:var(--muted);margin-top:8px;text-align:center;"></div>
      </div>
    `;
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';
    const close = () => { document.getElementById('modal-overlay').style.display = 'none'; };
    document.getElementById('tr-close').addEventListener('click', close);
    document.getElementById('tr-close-btn').addEventListener('click', close);
    document.getElementById('tr-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(transcript);
      document.getElementById('tr-msg').textContent = '✓ クリップボードにコピーしました';
    });
  }

  function showAnswersDetail(bookingId) {
    const b = window.UPCOMING_BOOKINGS.find(x => x.id === bookingId);
    if (!b) return;
    const form = window.LEAD_FORM;
    const html = `
      <div class="modal-header">
        <h2>📝 アンケート回答 — ${escapeHtml(b.name)}</h2>
        <button class="modal-close" id="ans-close">×</button>
      </div>
      <div class="modal-body">
        <div style="background:#fafbfc;border:1px solid var(--line);border-radius:6px;padding:14px;">
          ${form.questions.map((q, i) => `
            <div style="margin-bottom:12px;">
              <div style="font-size:11.5px;color:var(--muted);font-weight:600;margin-bottom:3px;">Q${i + 1}. ${escapeHtml(q.label)}</div>
              <div style="font-size:14px;font-weight:600;color:var(--ink);">${escapeHtml(b.answers[q.id] || '—')}</div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:14px;font-size:12.5px;color:var(--muted);">
          📅 面談予約: ${escapeHtml(b.date)} ${escapeHtml(b.time)} (${escapeHtml(b.via)})
        </div>
      </div>
    `;
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('ans-close').addEventListener('click', () => {
      document.getElementById('modal-overlay').style.display = 'none';
    });
  }

  function showConvertResult(newClient) {
    const html = `
      <div class="modal-header">
        <h2>✓ 新規顧客として登録しました</h2>
        <button class="modal-close" id="conv-close">×</button>
      </div>
      <div class="modal-body">
        <div style="background:#e6f7ee;border:1px solid #b8e3c8;border-radius:8px;padding:14px;margin-bottom:14px;">
          <div style="font-weight:700;font-size:15px;color:#06873f;margin-bottom:4px;">${escapeHtml(newClient.name)} 様</div>
          <div style="font-size:12.5px;color:var(--ink-2);">CRMの顧客一覧に追加されました。アンケート回答もメモに自動転記済み。</div>
        </div>
        <div style="background:#fafbfc;border:1px solid var(--line);border-radius:6px;padding:12px;">
          <div style="font-size:11.5px;color:var(--muted);font-weight:600;margin-bottom:4px;">自動登録された内容</div>
          <div style="font-family:ui-monospace,Menlo,monospace;font-size:11.5px;white-space:pre-wrap;color:var(--ink-2);line-height:1.6;">${escapeHtml(newClient.note)}</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="primary" id="conv-open">顧客詳細を開く</button>
          <button id="conv-close-btn">閉じる</button>
        </div>
      </div>
    `;
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';
    function close() { document.getElementById('modal-overlay').style.display = 'none'; }
    document.getElementById('conv-close').addEventListener('click', close);
    document.getElementById('conv-close-btn').addEventListener('click', close);
    document.getElementById('conv-open').addEventListener('click', () => {
      close();
      window.FpApp && window.FpApp.openClientModal && window.FpApp.openClientModal(newClient.id);
    });
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
      <div class="howto-banner">
        <div class="howto-banner-head">
          <span class="howto-banner-title">💡 配信ダッシュボード</span>
          <span class="howto-banner-subtitle">公式LINEの「いま動いてる仕組み」を一望する場所</span>
        </div>
        <div class="howto-steps">
          <div class="howto-step"><div class="howto-step-no">1</div><div>4つの数字: <strong>友だち数 / 稼働シナリオ / 今月送信数 / 今日の誕生日</strong>で全体把握</div></div>
          <div class="howto-step"><div class="howto-step-no">2</div><div>「今後の自動配信予定」で <strong>明日からどんな配信が出るか</strong> 確認</div></div>
          <div class="howto-step"><div class="howto-step-no">3</div><div>新規シナリオ追加は「配信スケジュール」サブタブ / 単発配信は右上 <span class="btn-hint">テスト配信</span></div></div>
        </div>
      </div>
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
    document.querySelector('[data-line-view="segments"]').innerHTML = `
      <div class="howto-banner">
        <div class="howto-banner-head">
          <span class="howto-banner-title">💡 セグメントとは</span>
          <span class="howto-banner-subtitle">お客様を「属性」で自動グループ分けする機能</span>
        </div>
        <div class="howto-steps">
          <div class="howto-step"><div class="howto-step-no">1</div><div>例: 子育て世帯 13名、退職前世代 5名 など、CRM内のお客様を<strong>自動で分類</strong></div></div>
          <div class="howto-step"><div class="howto-step-no">2</div><div>「配信スケジュール」サブタブで<strong>セグメント別に配信内容を変える</strong> (子育て世帯には教育費ニュース など)</div></div>
          <div class="howto-step"><div class="howto-step-no">3</div><div>セグメントカードを<strong>タップ</strong>で該当者一覧を確認できる</div></div>
        </div>
      </div>
      <div id="segment-cards-area"></div>
    `;
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

    document.getElementById('segment-cards-area').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
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
      <div class="howto-banner">
        <div class="howto-banner-head">
          <span class="howto-banner-title">💡 配信スケジュール</span>
          <span class="howto-banner-subtitle">「いつ・誰に・何を」を一度組めば自動配信し続ける</span>
        </div>
        <div class="howto-steps">
          <div class="howto-step"><div class="howto-step-no">1</div><div>例: 「子育て世帯 × 教育費お役立ち × 毎月15日10時」のように<strong>セグメント × テンプレ × タイミング</strong>を組む</div></div>
          <div class="howto-step"><div class="howto-step-no">2</div><div><strong>左のトグル</strong>で稼働/停止を切替 (停止中は配信されません)</div></div>
          <div class="howto-step"><div class="howto-step-no">3</div><div>編集は <span class="btn-hint">編集</span> ボタン、新規は右上の <span class="btn-hint">+ 新規スケジュール</span></div></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:11.5px;color:var(--muted);">${window.LINE_SCHEDULES.length} 本のシナリオ</span>
        <button class="primary" id="add-sched-btn" data-hint="新しい自動配信シナリオを作る">+ 新規スケジュール</button>
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
    const tplHelp = `
      <div class="howto-banner">
        <div class="howto-banner-head">
          <span class="howto-banner-title">💡 メッセージテンプレ</span>
          <span class="howto-banner-subtitle">配信で使う文章ストック / 「{{name}}」は自動でお客様名に置換</span>
        </div>
        <div class="howto-steps">
          <div class="howto-step"><div class="howto-step-no">1</div><div>テンプレは<strong>3種類</strong>: 季節挨拶 / イベント連動 (誕生日・退職前) / 定期配信 (月次レポート etc)</div></div>
          <div class="howto-step"><div class="howto-step-no">2</div><div>「配信スケジュール」サブタブで <strong>どのテンプレをいつ送るか</strong> を組む</div></div>
        </div>
      </div>
    `;
    const groups = { event: [], broadcast: [], season: [] };
    window.LINE_TEMPLATES.forEach(t => {
      (groups[t.cat] || (groups[t.cat] = [])).push(t);
    });
    const catLabel = { event: 'イベント連動', broadcast: '定期配信', season: '季節挨拶' };

    const html = `
      ${tplHelp}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:11.5px;color:var(--muted);">テンプレ内の <code>{{name}}</code> はLINE配信時に各顧客名に自動置換されます</span>
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
      <div class="howto-banner">
        <div class="howto-banner-head">
          <span class="howto-banner-title">💡 誕生日リスト</span>
          <span class="howto-banner-subtitle">本人 + 配偶者 + お子様の誕生日を90日先まで自動検出</span>
        </div>
        <div class="howto-steps">
          <div class="howto-step"><div class="howto-step-no">1</div><div>配信スケジュールに「誕生日自動メッセージ」シナリオが既に組まれている (毎日9:00判定)</div></div>
          <div class="howto-step"><div class="howto-step-no">2</div><div>顧客の家族の生年月日を CRM の顧客フォームで入れておくと、ここに自動で並ぶ</div></div>
          <div class="howto-step"><div class="howto-step-no">3</div><div>当日になると<strong>本人</strong>にお祝いLINEが自動送信される</div></div>
        </div>
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
      <div class="howto-banner">
        <div class="howto-banner-head">
          <span class="howto-banner-title">💡 送信ログ</span>
          <span class="howto-banner-subtitle">配信スケジュールから飛んだメッセージの履歴 / 何件届いて何件失敗したか</span>
        </div>
        <div class="howto-steps">
          <div class="howto-step"><div class="howto-step-no">1</div><div>失敗があった場合は「備考」列に理由が書かれる (ブロック解除待ち など)</div></div>
          <div class="howto-step"><div class="howto-step-no">2</div><div>テスト配信 (右上「テスト配信」ボタン経由) もここに記録される</div></div>
        </div>
      </div>
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
      activateSubview('leadHub');
    },
    refresh: function () {
      activateSubview(currentSubview);
    }
  };
})();
