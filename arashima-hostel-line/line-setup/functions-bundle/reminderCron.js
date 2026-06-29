/**
 * リマインダー Cron (Cloud Scheduler から叩く Cloud Function)
 * - 前日 18:00 JST → 道順 Flex push
 * - 当日 07:00 JST → 鍵案内 Flex push
 * - 翌日 02:00 JST → status=completed マーク
 */

const functions = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { defineSecret } = require('firebase-functions/params');
const { Client } = require('@line/bot-sdk');
const reminderFlex = require('./templates/reminder');
const arrivalFlex = require('./templates/arrival');

const LINE_CHANNEL_ACCESS_TOKEN = defineSecret('LINE_CHANNEL_ACCESS_TOKEN');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function lineClient() {
  return new Client({ channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN });
}

async function fetchBuilding(id) {
  const d = await db.collection('buildings').doc(id).get();
  return d.exists ? { id: d.id, ...d.data() } : null;
}
async function fetchRoom(id) {
  const d = await db.collection('rooms').doc(id).get();
  return d.exists ? { id: d.id, ...d.data() } : null;
}
async function logOps(level, event, payload, lineUserId, resNo) {
  await db.collection('ops_logs').add({
    ts: admin.firestore.FieldValue.serverTimestamp(),
    level, source: 'cron', event, payload, lineUserId, resNo,
  });
}

exports.preCheckinReminder = functions.onSchedule(
  {
    schedule: '0 18 * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async () => {
    const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1);

    const snap = await db.collection('reservations')
      .where('status', '==', 'confirmed')
      .where('checkin', '>=', tomorrow)
      .where('checkin', '<', dayAfter)
      .where('remindedPre', '==', false)
      .get();

    const client = lineClient();
    let sent = 0, failed = 0;
    for (const docSnap of snap.docs) {
      const rec = { id: docSnap.id, ...docSnap.data() };
      try {
        const [bldg, room] = await Promise.all([fetchBuilding(rec.buildingId), fetchRoom(rec.roomId)]);
        await client.pushMessage(rec.lineUserId, [reminderFlex(rec, bldg, room)]);
        await docSnap.ref.update({
          remindedPre: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        sent++;
        await logOps('info', 'reminder_pre_sent', { resNo: rec.resNo }, rec.lineUserId, rec.resNo);
      } catch (err) {
        failed++;
        await logOps('error', 'reminder_pre_failed', { error: err.message, resNo: rec.resNo }, rec.lineUserId, rec.resNo);
      }
    }
    console.log(`preCheckinReminder: sent=${sent} failed=${failed}`);
  }
);

exports.arrivalReminder = functions.onSchedule(
  {
    schedule: '0 7 * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const snap = await db.collection('reservations')
      .where('status', '==', 'confirmed')
      .where('checkin', '>=', today)
      .where('checkin', '<', tomorrow)
      .where('remindedArrival', '==', false)
      .get();

    const client = lineClient();
    let sent = 0, failed = 0;
    for (const docSnap of snap.docs) {
      const rec = { id: docSnap.id, ...docSnap.data() };
      try {
        const [bldg, room] = await Promise.all([fetchBuilding(rec.buildingId), fetchRoom(rec.roomId)]);
        await client.pushMessage(rec.lineUserId, [arrivalFlex(rec, bldg, room)]);
        await docSnap.ref.update({
          remindedArrival: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        sent++;
        await logOps('info', 'reminder_arrival_sent', { resNo: rec.resNo }, rec.lineUserId, rec.resNo);
      } catch (err) {
        failed++;
        await logOps('error', 'reminder_arrival_failed', { error: err.message, resNo: rec.resNo }, rec.lineUserId, rec.resNo);
      }
    }
    console.log(`arrivalReminder: sent=${sent} failed=${failed}`);
  }
);

exports.markCompleted = functions.onSchedule(
  {
    schedule: '0 2 * * *',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
  },
  async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const snap = await db.collection('reservations').where('status', '==', 'confirmed').get();
    let marked = 0;
    for (const docSnap of snap.docs) {
      const rec = docSnap.data();
      const ci = rec.checkin?.toDate?.();
      if (!ci) continue;
      const co = new Date(ci); co.setDate(co.getDate() + rec.nights);
      if (co <= today) {
        await docSnap.ref.update({
          status: 'completed',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        marked++;
      }
    }
    console.log(`markCompleted: ${marked}`);
  }
);
