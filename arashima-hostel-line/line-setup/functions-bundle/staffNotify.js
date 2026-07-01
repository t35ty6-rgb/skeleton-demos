/**
 * スタッフ向け LINE 通知
 * - 新規予約発生時 → 該当日 シフト入りスタッフ に Flex
 * - 前日 20:00 JST → 翌日 シフト入りスタッフ に Flex 「明日 X-Y バイトです」
 */

const functions = require('firebase-functions/v2/scheduler');
const functions_https = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { defineSecret } = require('firebase-functions/params');
const { Client } = require('@line/bot-sdk');

const LINE_CHANNEL_ACCESS_TOKEN = defineSecret('LINE_CHANNEL_ACCESS_TOKEN');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function lineClient() {
  return new Client({ channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN });
}

function ymd(d) {
  const jst = new Date(d.getTime() + 9 * 3600000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
}
function fmtDateLbl(d) {
  const dows = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()} (${dows[d.getDay()]})`;
}

async function loadStaffList() {
  const snap = await db.collection('ops_state').doc('staff').get();
  return snap.exists ? (snap.data().list || []) : [];
}
async function loadShifts() {
  const snap = await db.collection('ops_state').doc('shifts').get();
  return snap.exists ? (snap.data().map || {}) : {};
}
async function loadConfig() {
  const snap = await db.collection('ops_state').doc('config').get();
  return snap.exists ? snap.data() : {};
}

/**
 * 指定日付にシフト入り (休以外) のスタッフを列挙
 */
async function staffOnDuty(dateStr) {
  const [list, map] = await Promise.all([loadStaffList(), loadShifts()]);
  return list
    .filter((s) => s.lineUserId)
    .map((s) => ({ staff: s, shift: map[`${dateStr}|${s.id}`] || '' }))
    .filter((row) => row.shift && row.shift !== '休');
}

/**
 * 新規予約 → 該当日 シフト入りスタッフ に Flex 通知
 * checkin 日 と checkout 日 の 両方 対象 (重複除外)
 */
function newReservationFlex(rec, shift, role) {
  const ci = new Date(rec.checkinDateStr + 'T00:00:00+09:00');
  const co = new Date(ci); co.setDate(co.getDate() + (rec.nights || 1));
  const rows = [
    { label: 'お客様', val: `${rec.name || 'お客様'} 様` },
    { label: 'お部屋', val: `${rec.roomId || '—'}` },
    { label: 'IN',  val: fmtDateLbl(ci) },
    { label: 'OUT', val: fmtDateLbl(co) },
    { label: '泊数/人数', val: `${rec.nights || 1}泊 / ${rec.guests || 1}名` },
  ];
  const roleLabel = role === 'checkin' ? '受付担当' : role === 'checkout' ? 'ベッドメイキング担当' : '担当';
  return {
    type: 'flex',
    altText: `新しい予約が入りました (${rec.name || 'お客様'} 様)`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', paddingAll: '16px', backgroundColor: '#0E0E0C',
        contents: [
          { type: 'text', text: 'NEW RESERVATION', size: 'xs', color: '#B8893B', weight: 'bold' },
          { type: 'text', text: `${roleLabel} (シフト ${shift})`, size: 'md', color: '#F2EDE3', margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
        contents: rows.map((r) => ({
          type: 'box', layout: 'horizontal', spacing: 'md',
          contents: [
            { type: 'text', text: r.label, size: 'sm', color: '#4A4238', flex: 3 },
            { type: 'text', text: r.val, size: 'sm', weight: 'bold', color: '#0E0E0C', flex: 5, align: 'end', wrap: true },
          ],
        })),
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '「タスク」で今日のやること一覧', size: 'xxs', color: '#888', align: 'center' },
        ],
      },
    },
  };
}

/**
 * 前日リマインダー Flex
 */
function tomorrowShiftFlex(staff, shift, dateLbl, tasksCount) {
  return {
    type: 'flex',
    altText: `${staff.name} さん、明日 ${shift} バイトです`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', paddingAll: '16px', backgroundColor: '#5A6B3F',
        contents: [
          { type: 'text', text: 'TOMORROW', size: 'xs', color: '#F2EDE3', weight: 'bold', letterSpacing: '0.18em' },
          { type: 'text', text: `${staff.name} さん`, size: 'lg', color: '#F2EDE3', weight: 'bold', margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', paddingAll: '16px',
        contents: [
          {
            type: 'box', layout: 'horizontal', spacing: 'md',
            contents: [
              { type: 'text', text: '日付', size: 'sm', color: '#4A4238', flex: 3 },
              { type: 'text', text: dateLbl, size: 'sm', weight: 'bold', color: '#0E0E0C', flex: 5, align: 'end' },
            ],
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'md',
            contents: [
              { type: 'text', text: 'シフト', size: 'sm', color: '#4A4238', flex: 3 },
              { type: 'text', text: shift, size: 'xl', weight: 'bold', color: '#2A4A5E', flex: 5, align: 'end' },
            ],
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'md',
            contents: [
              { type: 'text', text: '担当タスク', size: 'sm', color: '#4A4238', flex: 3 },
              { type: 'text', text: tasksCount > 0 ? `${tasksCount} 件` : 'なし', size: 'sm', weight: 'bold', color: tasksCount > 0 ? '#9B3A26' : '#5A6B3F', flex: 5, align: 'end' },
            ],
          },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: 'よろしくお願いします', size: 'xs', color: '#888', align: 'center' },
        ],
      },
    },
  };
}

async function countAssignedTasks(staffId, dateStr) {
  const tSnap = await db.collection('ops_state').doc('tasks').get();
  const map = tSnap.exists ? (tSnap.data().map || {}) : {};
  const manual = map[dateStr] || [];
  const overrides = map[`_state_${dateStr}`] || {};

  // 予約由来の自動タスク
  const resvSnap = await db.collection('reservations')
    .where('status', 'in', ['pending', 'confirmed', 'external']).get();
  const auto = [];
  for (const doc of resvSnap.docs) {
    const r = doc.data();
    const ci = r.checkinDateStr;
    if (!ci) continue;
    const ciDate = new Date(ci + 'T00:00:00+09:00');
    const coDate = new Date(ciDate.getTime() + (r.nights || 1) * 86400000);
    if (ci === dateStr) auto.push({ id: `auto-in-${r.resNo || doc.id}` });
    if (ymd(coDate) === dateStr) auto.push({ id: `auto-out-${r.resNo || doc.id}` });
  }

  const merged = [...auto, ...manual];
  let count = 0;
  for (const t of merged) {
    const st = overrides[t.id] || {};
    const assignees = st.assignees || t.assignees || [];
    if (assignees.includes(staffId) && !(st.done ?? false)) count++;
  }
  return count;
}

function newReservationBroadcastFlex(rec) {
  const ci = new Date(rec.checkinDateStr + 'T00:00:00+09:00');
  const co = new Date(ci); co.setDate(co.getDate() + (rec.nights || 1));
  return {
    type: 'flex',
    altText: `新しい予約: ${rec.name || 'お客様'} 様 (${fmtDateLbl(ci)})`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '14px',
        contents: [
          { type: 'text', text: '新しい予約 (お知らせ)', size: 'xs', color: '#B8893B', weight: 'bold', letterSpacing: '0.14em' },
          { type: 'text', text: `${rec.name || 'お客様'} 様`, size: 'md', weight: 'bold', color: '#0E0E0C', margin: 'sm' },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm', margin: 'md',
            contents: [
              { type: 'text', text: 'IN', size: 'xs', color: '#4A4238', flex: 1 },
              { type: 'text', text: fmtDateLbl(ci), size: 'sm', weight: 'bold', color: '#0E0E0C', flex: 3, align: 'end' },
            ],
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'OUT', size: 'xs', color: '#4A4238', flex: 1 },
              { type: 'text', text: fmtDateLbl(co), size: 'sm', weight: 'bold', color: '#0E0E0C', flex: 3, align: 'end' },
            ],
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'ROOM', size: 'xs', color: '#4A4238', flex: 1 },
              { type: 'text', text: `${rec.roomId || '—'} · ${rec.nights || 1}泊 · ${rec.guests || 1}名`, size: 'sm', color: '#0E0E0C', flex: 3, align: 'end' },
            ],
          },
        ],
      },
    },
  };
}

async function pushNewReservationToStaff(rec) {
  const ciDateStr = rec.checkinDateStr;
  if (!ciDateStr) return { sent: 0 };
  const ciDate = new Date(ciDateStr + 'T00:00:00+09:00');
  const coDate = new Date(ciDate); coDate.setDate(coDate.getDate() + (rec.nights || 1));
  const coDateStr = ymd(coDate);

  const [ciStaff, coStaff, cfg, allStaff] = await Promise.all([
    staffOnDuty(ciDateStr),
    ciDateStr === coDateStr ? Promise.resolve([]) : staffOnDuty(coDateStr),
    loadConfig(),
    loadStaffList(),
  ]);

  const client = lineClient();
  const sentUsers = new Set();
  let sent = 0, failed = 0;

  for (const { staff, shift } of ciStaff) {
    try {
      await client.pushMessage(staff.lineUserId, [newReservationFlex(rec, shift, 'checkin')]);
      sentUsers.add(staff.lineUserId); sent++;
    } catch (e) { failed++; console.error('staff notify (checkin) failed', staff.id, e.message); }
  }
  for (const { staff, shift } of coStaff) {
    if (sentUsers.has(staff.lineUserId)) continue;
    try {
      await client.pushMessage(staff.lineUserId, [newReservationFlex(rec, shift, 'checkout')]);
      sentUsers.add(staff.lineUserId); sent++;
    } catch (e) { failed++; console.error('staff notify (checkout) failed', staff.id, e.message); }
  }

  // 「新規予約は全員に通知」 config が ON なら 残り LINE 連携済スタッフに 軽通知
  if (cfg.notifyAllOnNewReservation) {
    for (const s of allStaff) {
      if (!s.lineUserId) continue;
      if (sentUsers.has(s.lineUserId)) continue;
      try {
        await client.pushMessage(s.lineUserId, [newReservationBroadcastFlex(rec)]);
        sentUsers.add(s.lineUserId); sent++;
      } catch (e) { failed++; console.error('staff broadcast failed', s.id, e.message); }
    }
  }
  return { sent, failed, notifyAll: !!cfg.notifyAllOnNewReservation };
}

// ---- 前日リマインダー: 20:00 JST ----
exports.staffTomorrowReminder = functions.onSchedule(
  {
    schedule: '0 20 * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async () => {
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = ymd(tomorrow);
    const onDuty = await staffOnDuty(tomorrowStr);
    const client = lineClient();
    let sent = 0, failed = 0;
    for (const { staff, shift } of onDuty) {
      try {
        const tasksCount = await countAssignedTasks(staff.id, tomorrowStr);
        await client.pushMessage(staff.lineUserId, [tomorrowShiftFlex(staff, shift, fmtDateLbl(tomorrow), tasksCount)]);
        sent++;
        await db.collection('ops_logs').add({
          ts: admin.firestore.FieldValue.serverTimestamp(),
          level: 'info', source: 'cron', event: 'staff_tomorrow_reminder_sent',
          payload: { staffId: staff.id, shift, tasksCount },
        });
      } catch (e) {
        failed++;
        console.error('staffTomorrowReminder failed for', staff.id, e.message);
      }
    }
    console.log(`staffTomorrowReminder: sent=${sent} failed=${failed} (target=${onDuty.length})`);
  }
);

module.exports.pushNewReservationToStaff = pushNewReservationToStaff;

// ============================================
// 月次 シフト 一斉配信 + .ics 生成
// ============================================

const SHIFT_HOURS = {
  '9-16':  { start: 9, end: 16 },
  '15-20': { start: 15, end: 20 },
  '9-20':  { start: 9, end: 20 },
};

function icsEscape(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
function icsDateTime(y, mo, d, h, mm) {
  // JST → UTC (JST = UTC+9)
  const utc = new Date(Date.UTC(y, mo - 1, d, h - 9, mm, 0));
  const p = (n) => String(n).padStart(2, '0');
  return `${utc.getUTCFullYear()}${p(utc.getUTCMonth()+1)}${p(utc.getUTCDate())}T${p(utc.getUTCHours())}${p(utc.getUTCMinutes())}00Z`;
}
function foldLine(line) {
  // iCalendar 折り返し: 75 octets 超えると CRLF + SP
  if (line.length <= 75) return line;
  const parts = [];
  let rest = line;
  while (rest.length > 75) { parts.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74); }
  parts.push(rest);
  return parts.join('\r\n');
}

/**
 * 指定スタッフの その月の シフトを iCalendar 形式で返す
 */
async function generateIcsForStaff(staffId, y, mo) {
  const [list, shifts] = await Promise.all([loadStaffList(), loadShifts()]);
  const staff = list.find((s) => s.id === staffId);
  if (!staff) return null;
  const daysInMonth = new Date(y, mo, 0).getDate();
  const events = [];
  for (let dd = 1; dd <= daysInMonth; dd++) {
    const dateStr = `${y}-${String(mo).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
    const v = shifts[`${dateStr}|${staffId}`];
    if (!v || v === '休') continue;
    const range = SHIFT_HOURS[v];
    if (!range) continue;
    const uid = `arashima-shift-${dateStr}-${staffId}@arashima-hotel`;
    const dtstart = icsDateTime(y, mo, dd, range.start, 0);
    const dtend = icsDateTime(y, mo, dd, range.end, 0);
    const dtstamp = icsDateTime(y, mo, dd, range.start, 0);
    events.push([
      'BEGIN:VEVENT',
      foldLine(`UID:${uid}`),
      foldLine(`DTSTAMP:${dtstamp}`),
      foldLine(`DTSTART:${dtstart}`),
      foldLine(`DTEND:${dtend}`),
      foldLine(`SUMMARY:${icsEscape(`荒島バイト (${v})`)}`),
      foldLine(`DESCRIPTION:${icsEscape(`${staff.name} さん / ${v} / 荒島ホテル`)}`),
      foldLine(`LOCATION:${icsEscape('福井県大野市元町8-17 荒島旅舎')}`),
      'END:VEVENT',
    ].join('\r\n'));
  }
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arashima Hotel//Shift//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(`荒島 ${y}年${mo}月 シフト (${staff.name})`)}`,
    'X-WR-TIMEZONE:Asia/Tokyo',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
  return { ics, eventCount: events.length, staffName: staff.name };
}

exports.generateStaffIcs = functions_https.onRequest(
  { region: 'asia-northeast1', cors: true, memory: '256MiB' },
  async (req, res) => {
    try {
      const staffId = String(req.query.staffId || '');
      const y = Number(req.query.year);
      const mo = Number(req.query.month);
      if (!staffId || !y || y < 2020 || y > 2100 || !mo || mo < 1 || mo > 12) return res.status(400).send('invalid params');
      const r = await generateIcsForStaff(staffId, y, mo);
      if (!r) return res.status(404).send('staff not found');
      res.set('Content-Type', 'text/calendar; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="arashima-${y}-${mo}-${staffId}.ics"`);
      res.set('Cache-Control', 'no-store');
      res.send(r.ics);
    } catch (err) {
      console.error('generateStaffIcs error', err);
      res.status(500).send(err.message);
    }
  }
);

/**
 * 月次シフト一斉配信 (admin から発火)
 * 各スタッフに その月の Flex + .ics ダウンロードボタン
 */
function monthlyShiftFlex(staffName, y, mo, shiftRows, icsUrl, gcalWebUrl) {
  const rowsBody = shiftRows.length
    ? shiftRows.slice(0, 30).map((r) => ({
        type: 'box', layout: 'baseline', spacing: 'md',
        contents: [
          { type: 'text', text: r.dateLbl, size: 'xs', color: '#4A4238', flex: 3 },
          { type: 'text', text: r.shift, size: 'sm', weight: 'bold', color: r.shift === '休' ? '#9B3A26' : '#2A4A5E', flex: 2, align: 'end' },
        ],
      }))
    : [{ type: 'text', text: 'この月のシフトはまだ入っていません', size: 'sm', color: '#888', wrap: true }];
  return {
    type: 'flex',
    altText: `${y}年${mo}月のシフトが確定しました`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', paddingAll: '18px', backgroundColor: '#0E0E0C',
        contents: [
          { type: 'text', text: 'SHIFT FIXED', size: 'xs', color: '#B8893B', weight: 'bold', letterSpacing: '0.18em' },
          { type: 'text', text: `${y}年${mo}月`, size: 'xl', color: '#F2EDE3', weight: 'bold', margin: 'sm' },
          { type: 'text', text: `${staffName} さん / ${shiftRows.filter((r) => r.shift !== '休').length}件 のシフト`, size: 'xs', color: '#B8893B', margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
        contents: rowsBody,
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          {
            type: 'button', style: 'primary', color: '#4285F4', height: 'sm',
            action: { type: 'uri', label: 'Google カレンダーに追加', uri: icsUrl },
          },
          {
            type: 'button', style: 'secondary', height: 'sm',
            action: { type: 'uri', label: '一覧 ページで開く', uri: gcalWebUrl || icsUrl },
          },
          { type: 'text', text: 'ボタンをタップ → カレンダーに全件登録', size: 'xxs', color: '#888', align: 'center', wrap: true },
        ],
      },
    },
  };
}

async function publishMonthlyShifts(y, mo, staffIds) {
  const [list, shifts] = await Promise.all([loadStaffList(), loadShifts()]);
  const staffMap = Object.fromEntries(list.map((s) => [s.id, s]));
  const daysInMonth = new Date(y, mo, 0).getDate();
  const client = lineClient();
  let sent = 0, failed = 0;
  const results = [];
  for (const sid of staffIds) {
    const s = staffMap[sid];
    if (!s || !s.lineUserId) { failed++; results.push({ staffId: sid, status: 'no-line' }); continue; }
    const rows = [];
    for (let dd = 1; dd <= daysInMonth; dd++) {
      const dateStr = `${y}-${String(mo).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
      const v = shifts[`${dateStr}|${sid}`];
      if (!v) continue;
      const dt = new Date(y, mo - 1, dd);
      const dow = ['日','月','火','水','木','金','土'][dt.getDay()];
      rows.push({ dateStr, dateLbl: `${mo}/${dd}(${dow})`, shift: v });
    }
    const icsUrl = `https://asia-northeast1-skeleton-arashima-hotel.cloudfunctions.net/generateStaffIcs?staffId=${encodeURIComponent(sid)}&year=${y}&month=${mo}`;
    try {
      await client.pushMessage(s.lineUserId, [monthlyShiftFlex(s.name, y, mo, rows, icsUrl, null)]);
      sent++;
      results.push({ staffId: sid, status: 'sent', rows: rows.length });
      await db.collection('ops_logs').add({
        ts: admin.firestore.FieldValue.serverTimestamp(),
        level: 'info', source: 'admin', event: 'monthly_shift_published',
        payload: { staffId: sid, year: y, month: mo, rows: rows.length },
      });
    } catch (err) {
      failed++;
      results.push({ staffId: sid, status: 'error', message: err.message });
      console.error('publishMonthlyShifts push failed', sid, err.message);
    }
  }
  return { sent, failed, results };
}

module.exports.publishMonthlyShifts = publishMonthlyShifts;
module.exports.generateIcsForStaff = generateIcsForStaff;
