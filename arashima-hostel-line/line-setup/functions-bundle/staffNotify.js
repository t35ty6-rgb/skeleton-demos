/**
 * スタッフ向け LINE 通知
 * - 新規予約発生時 → 該当日 シフト入りスタッフ に Flex
 * - 前日 20:00 JST → 翌日 シフト入りスタッフ に Flex 「明日 X-Y バイトです」
 */

const functions = require('firebase-functions/v2/scheduler');
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

async function pushNewReservationToStaff(rec) {
  const ciDateStr = rec.checkinDateStr;
  if (!ciDateStr) return { sent: 0 };
  const ciDate = new Date(ciDateStr + 'T00:00:00+09:00');
  const coDate = new Date(ciDate); coDate.setDate(coDate.getDate() + (rec.nights || 1));
  const coDateStr = ymd(coDate);

  const [ciStaff, coStaff] = await Promise.all([
    staffOnDuty(ciDateStr),
    ciDateStr === coDateStr ? Promise.resolve([]) : staffOnDuty(coDateStr),
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
    if (sentUsers.has(staff.lineUserId)) continue; // 同一人物は重複送信しない
    try {
      await client.pushMessage(staff.lineUserId, [newReservationFlex(rec, shift, 'checkout')]);
      sent++;
    } catch (e) { failed++; console.error('staff notify (checkout) failed', staff.id, e.message); }
  }
  return { sent, failed };
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
