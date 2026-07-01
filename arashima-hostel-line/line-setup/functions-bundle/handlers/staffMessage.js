/**
 * スタッフ からの LINE メッセージ ハンドラ
 *
 * サポート コマンド:
 *   - 6桁数字        : ペアリング (未紐付けスタッフのみ)
 *   - 「シフト」       : 今週のシフト表 (自分の) を返す
 *   - 「明日 9-16」   : 明日 のシフト登録 (9-16 / 15-20 / 9-20 / 休)
 *   - 「明日 空き」   : 明日 デフォルトシフト(9-16) で登録
 *   - 「明後日 休」   : 明後日 を休みに
 *   - 「7/5 9-20」    : 日付指定 (今年)
 *   - 「今日のやること」or「タスク」: 自分に割当ての今日のタスク一覧
 *   - 「完了 1」      : 上記一覧の N 番のタスクを done に
 *   - 「解除」         : 紐付け解除
 *   - それ以外        : ヘルプ返信
 */

const admin = require('firebase-admin');

const SHIFT_OPTIONS = ['9-16', '15-20', '9-20', '休'];
const DEFAULT_SHIFT = '9-16';

function ymd(d) {
  const jst = new Date(d.getTime() + 9 * 3600000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
}

function todayJst() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 3600000);
  jst.setUTCHours(0, 0, 0, 0);
  return new Date(jst.getTime() - 9 * 3600000);
}

function addDays(d, n) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function parseRelativeDate(txt) {
  const t = txt.replace(/\s/g, '');
  const today = todayJst();
  if (/今日|きょう|本日/.test(t)) return today;
  if (/明日|あした|あす/.test(t)) return addDays(today, 1);
  if (/明後日|あさって/.test(t)) return addDays(today, 2);
  if (/明々後日|しあさって/.test(t)) return addDays(today, 3);
  // 「7/5」「07-05」形式
  const md = t.match(/(\d{1,2})[\/\-](\d{1,2})/);
  if (md) {
    const year = today.getFullYear();
    const d = new Date(`${year}-${String(md[1]).padStart(2,'0')}-${String(md[2]).padStart(2,'0')}T00:00:00+09:00`);
    // 過去日付なら来年
    if (d < today) d.setFullYear(year + 1);
    return d;
  }
  return null;
}

function parseShiftValue(txt) {
  const t = txt.replace(/\s/g, '').replace(/[ー–—－]/g, '-');
  if (/休|やすみ|OFF|off/.test(t)) return '休';
  if (/空き|あき|入れ|OK/i.test(t)) return DEFAULT_SHIFT;
  for (const opt of SHIFT_OPTIONS) {
    if (t.includes(opt)) return opt;
  }
  // 全角数字 → 半角
  const halfWidth = t.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  for (const opt of SHIFT_OPTIONS) {
    if (halfWidth.includes(opt)) return opt;
  }
  // 「9時から16時」「9時-16時」等
  const m = halfWidth.match(/(\d{1,2})[時:]?[-〜~](\d{1,2})/);
  if (m) return `${parseInt(m[1])}-${parseInt(m[2])}`;
  return null;
}

async function loadStaffList(db) {
  const snap = await db.collection('ops_state').doc('staff').get();
  return snap.exists ? (snap.data().list || []) : [];
}

async function saveStaffList(db, list) {
  await db.collection('ops_state').doc('staff').set({
    list, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function findStaffByLineUserId(db, lineUserId) {
  const list = await loadStaffList(db);
  return list.find((s) => s.lineUserId === lineUserId) || null;
}

async function tryPair(db, lineUserId, code) {
  const doc = await db.collection('ops_pair_codes').doc(code).get();
  if (!doc.exists) return { ok: false, reason: 'コードが違います' };
  const data = doc.data();
  if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
    return { ok: false, reason: 'コードが期限切れです (10分)' };
  }
  const list = await loadStaffList(db);
  const idx = list.findIndex((s) => s.id === data.staffId);
  if (idx < 0) return { ok: false, reason: 'スタッフが見つかりません' };
  // 他スタッフ に既に紐付いてたら剥がす
  for (const s of list) if (s.lineUserId === lineUserId) delete s.lineUserId;
  list[idx].lineUserId = lineUserId;
  await saveStaffList(db, list);
  await doc.ref.delete().catch(() => {});
  return { ok: true, staff: list[idx] };
}

async function updateShift(db, staffId, dateStr, shift) {
  const snap = await db.collection('ops_state').doc('shifts').get();
  const map = snap.exists ? (snap.data().map || {}) : {};
  const key = `${dateStr}|${staffId}`;
  map[key] = shift;
  await db.collection('ops_state').doc('shifts').set({
    map, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function getMyShifts(db, staffId) {
  const snap = await db.collection('ops_state').doc('shifts').get();
  const map = snap.exists ? (snap.data().map || {}) : {};
  const out = [];
  const today = todayJst();
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    const key = `${ymd(d)}|${staffId}`;
    out.push({ date: d, shift: map[key] || '' });
  }
  return out;
}

async function getMyTasks(db, staffId) {
  const snap = await db.collection('ops_state').doc('tasks').get();
  const tasksMap = snap.exists ? (snap.data().map || {}) : {};
  const dateStr = ymd(todayJst());
  const manual = tasksMap[dateStr] || [];
  const overrides = tasksMap[`_state_${dateStr}`] || {};

  // 予約由来の自動タスクも取得
  const resvSnap = await db.collection('reservations')
    .where('status', 'in', ['pending', 'confirmed', 'external']).get();
  const auto = [];
  for (const doc of resvSnap.docs) {
    const r = doc.data();
    const ci = r.checkinDateStr || (r.checkin && ymd(r.checkin.toDate ? r.checkin.toDate() : new Date(r.checkin)));
    if (!ci) continue;
    const ciDate = new Date(ci + 'T00:00:00+09:00');
    const coDate = new Date(ciDate.getTime() + (r.nights || 1) * 86400000);
    if (ci === dateStr) auto.push({ id: `auto-in-${r.resNo || doc.id}`, title: `${r.name || 'お客様'} 様 受付`, meta: `${r.nights}泊 · ${r.guests}名`, auto: true });
    if (ymd(coDate) === dateStr) auto.push({ id: `auto-out-${r.resNo || doc.id}`, title: `${r.roomId} ベッド`, meta: `${r.name || ''} 様 OUT`, auto: true });
  }

  const merged = [...auto, ...manual].map((t) => {
    const st = overrides[t.id] || {};
    return { ...t, assignees: st.assignees || t.assignees || [], done: st.done ?? false };
  });
  return merged.filter((t) => t.assignees.includes(staffId));
}

async function markTaskDone(db, staffId, taskIndex1based) {
  const tasks = await getMyTasks(db, staffId);
  const t = tasks[taskIndex1based - 1];
  if (!t) return { ok: false, reason: 'その番号のタスクがありません' };
  if (t.done) return { ok: false, reason: 'それはもう終わってます' };
  const snap = await db.collection('ops_state').doc('tasks').get();
  const map = snap.exists ? (snap.data().map || {}) : {};
  const dateStr = ymd(todayJst());
  const overrides = map[`_state_${dateStr}`] || {};
  overrides[t.id] = { ...(overrides[t.id] || {}), assignees: t.assignees, done: true, doneAt: new Date().toISOString() };
  map[`_state_${dateStr}`] = overrides;
  await db.collection('ops_state').doc('tasks').set({
    map, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true, task: t };
}

function fmtDateLbl(d) {
  const dows = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()} (${dows[d.getDay()]})`;
}

function shiftListFlex(shifts, staffName) {
  const rows = shifts.map((s) => ({
    type: 'box', layout: 'horizontal', spacing: 'md',
    contents: [
      { type: 'text', text: fmtDateLbl(s.date), size: 'sm', color: '#4A4238', flex: 3 },
      { type: 'text', text: s.shift || '—', size: 'sm', weight: 'bold', color: s.shift === '休' ? '#9B3A26' : '#2A4A5E', flex: 2, align: 'end' },
    ],
  }));
  return {
    type: 'flex',
    altText: `${staffName} さんの今週シフト`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', paddingAll: '16px', backgroundColor: '#0E0E0C',
        contents: [
          { type: 'text', text: 'THIS WEEK', size: 'xs', color: '#B8893B', weight: 'bold' },
          { type: 'text', text: `${staffName} さん`, size: 'lg', color: '#F2EDE3', weight: 'bold', margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
        contents: rows,
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '「明日 9-16」で追加/更新できます', size: 'xxs', color: '#888', align: 'center' },
        ],
      },
    },
  };
}

function tasksFlex(tasks, staffName) {
  if (!tasks.length) {
    return { type: 'text', text: `${staffName} さん、今日の担当タスクはありません。おつかれさま。` };
  }
  const rows = tasks.map((t, i) => ({
    type: 'box', layout: 'baseline', spacing: 'md',
    contents: [
      { type: 'text', text: `${i + 1}.`, size: 'sm', color: '#B8893B', weight: 'bold', flex: 1 },
      { type: 'text', text: t.title, size: 'sm', color: t.done ? '#888' : '#0E0E0C', weight: 'bold', flex: 5, wrap: true, decoration: t.done ? 'line-through' : 'none' },
      { type: 'text', text: t.done ? '済' : '', size: 'sm', color: '#5A6B3F', flex: 1, align: 'end' },
    ],
  }));
  return {
    type: 'flex',
    altText: `${staffName} さんの今日のタスク`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', paddingAll: '16px', backgroundColor: '#0E0E0C',
        contents: [
          { type: 'text', text: 'TODAY', size: 'xs', color: '#B8893B', weight: 'bold' },
          { type: 'text', text: `${staffName} さん`, size: 'lg', color: '#F2EDE3', weight: 'bold', margin: 'sm' },
        ],
      },
      body: { type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px', contents: rows },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '終わったら「完了 番号」で送ってください', size: 'xxs', color: '#888', align: 'center' },
        ],
      },
    },
  };
}

module.exports = async (event, ctx, staff) => {
  const { lineClient, db } = ctx;
  const text = (event.message.text || '').trim();
  const t = text.replace(/\s/g, '');

  // ---- 未紐付け: 6桁 数字コード だけ受付 ----
  if (!staff) {
    const codeMatch = t.match(/^(\d{6})$/);
    if (codeMatch) {
      const r = await tryPair(db, event.source.userId, codeMatch[1]);
      if (r.ok) {
        await lineClient.replyMessage(event.replyToken, [
          { type: 'text', text: `${r.staff.name} さん、荒島ホテルの LINE 連携ができました。\n\n・「シフト」→ 今週の予定\n・「明日 9-16」→ シフト追加\n・「タスク」→ 今日のやること` },
        ]);
        return;
      }
      await lineClient.replyMessage(event.replyToken, [{ type: 'text', text: r.reason }]);
      return;
    }
    return false; // 未紐付けは false 返して guest handler へフォールバック
  }

  // ---- 紐付け解除 ----
  if (/^解除$|^unlink$/i.test(t)) {
    const list = await loadStaffList(db);
    const idx = list.findIndex((s) => s.id === staff.id);
    if (idx >= 0) delete list[idx].lineUserId;
    await saveStaffList(db, list);
    await lineClient.replyMessage(event.replyToken, [{ type: 'text', text: '連携を解除しました。またご参加のときは店主にコード発行してもらってください。' }]);
    return true;
  }

  // ---- シフト参照 ----
  if (/^シフト$|^予定$|^schedule$/i.test(t)) {
    const shifts = await getMyShifts(db, staff.id);
    await lineClient.replyMessage(event.replyToken, [shiftListFlex(shifts, staff.name)]);
    return true;
  }

  // ---- 今日のタスク ----
  if (/^タスク$|^今日のやること$|^やること$/.test(t)) {
    const tasks = await getMyTasks(db, staff.id);
    await lineClient.replyMessage(event.replyToken, [tasksFlex(tasks, staff.name)]);
    return true;
  }

  // ---- タスク完了 「完了 3」 ----
  const doneMatch = t.match(/^完了(\d+)$|^(\d+)完了$|^done(\d+)$/i);
  if (doneMatch) {
    const idx = parseInt(doneMatch[1] || doneMatch[2] || doneMatch[3], 10);
    const r = await markTaskDone(db, staff.id, idx);
    if (r.ok) {
      await lineClient.replyMessage(event.replyToken, [{ type: 'text', text: `おつかれさま。「${r.task.title}」を完了にしました。` }]);
    } else {
      await lineClient.replyMessage(event.replyToken, [{ type: 'text', text: r.reason }]);
    }
    return true;
  }

  // ---- シフト登録 「明日 9-16」等 ----
  const date = parseRelativeDate(text);
  const shift = parseShiftValue(text);
  if (date && shift) {
    await updateShift(db, staff.id, ymd(date), shift);
    const lbl = fmtDateLbl(date);
    await lineClient.replyMessage(event.replyToken, [{
      type: 'text',
      text: `${staff.name} さん、${lbl} を「${shift}」で登録しました。\n\n「シフト」で今週の確認できます。`,
    }]);
    return true;
  }

  // ---- ヘルプ ----
  await lineClient.replyMessage(event.replyToken, [{
    type: 'text',
    text: [
      `${staff.name} さん、こんにちは。`,
      '',
      '使えるコマンド:',
      '・「シフト」 今週の予定',
      '・「明日 9-16」 or 「明日 空き」 シフト追加',
      '・「明後日 休」 その日を休みに',
      '・「7/5 9-20」 日付指定',
      '・「タスク」 今日のやること',
      '・「完了 1」 その番号を完了に',
      '・「解除」 LINE 連携を解除',
    ].join('\n'),
  }]);
  return true;
};

module.exports.findStaffByLineUserId = findStaffByLineUserId;
