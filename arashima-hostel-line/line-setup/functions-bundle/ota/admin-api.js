/**
 * adminApi: 管理画面用 callable
 *   GET  /adminApi?action=list&pane=today|upcoming|all|guests|logs
 *   POST /adminApi  body: { action: 'updateStatus', resNo, status }
 *
 * 認証: X-Admin-Secret ヘッダが Firebase secret ADMIN_SECRET と一致
 *   (将来 Firebase Auth + custom claim に差し替え可)
 */

const functions = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { defineSecret } = require('firebase-functions/params');

const ADMIN_SECRET = defineSecret('ADMIN_SECRET');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function authed(req) {
  const got = req.headers['x-admin-secret'];
  return got && process.env.ADMIN_SECRET && got === process.env.ADMIN_SECRET;
}

function ymdJst(d) {
  if (!d) return null;
  const date = d.toDate ? d.toDate() : new Date(d);
  const jst = new Date(date.getTime() + 9 * 3600000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
}

function snapToResv(doc) {
  const r = doc.data();
  return {
    resNo: r.resNo || doc.id,
    sourceOta: r.sourceOta || 'line',
    roomId: r.roomId,
    buildingId: r.buildingId,
    checkinDateStr: r.checkinDateStr || ymdJst(r.checkin),
    nights: r.nights,
    guests: r.guests,
    name: r.name,
    tel: r.tel,
    note: r.note,
    status: r.status,
    totalPrice: r.totalPrice,
    createdAt: r.createdAt?.toDate?.()?.toISOString?.(),
    conflictFlag: !!r.conflictFlag,
  };
}

exports.adminApi = functions.onRequest(
  { region: 'asia-northeast1', cors: true, secrets: [ADMIN_SECRET], memory: '256MiB' },
  async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (!authed(req)) return res.status(401).json({ error: 'unauthorized' });

    try {
      if (req.method === 'GET') {
        const action = String(req.query.action || 'list');
        const pane = String(req.query.pane || 'today');

        if (action === 'list') {
          if (pane === 'today') {
            const today = new Date();
            const todayStr = ymdJst(today);
            const tomorrow = new Date(today.getTime() + 86400000);
            const tomStr = ymdJst(tomorrow);
            const all = await db.collection('reservations')
              .where('status', 'in', ['pending', 'confirmed', 'external'])
              .get();
            const items = all.docs.map(snapToResv);
            const todayIn = items.filter((r) => r.checkinDateStr === todayStr);
            const tomIn   = items.filter((r) => r.checkinDateStr === tomStr);
            const staying = items.filter((r) => {
              const ci = r.checkinDateStr;
              if (!ci) return false;
              const ciDate = new Date(ci + 'T00:00:00+09:00');
              const coDate = new Date(ciDate.getTime() + r.nights * 86400000);
              return ciDate <= today && today < coDate;
            });
            const todayOut = items.filter((r) => {
              const ci = r.checkinDateStr;
              if (!ci) return false;
              const ciDate = new Date(ci + 'T00:00:00+09:00');
              const coDate = new Date(ciDate.getTime() + r.nights * 86400000);
              return ymdJst(coDate) === todayStr;
            });
            return res.json({ ok: true, todayIn, todayOut, staying, tomIn });
          }

          if (pane === 'upcoming') {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const horizon = new Date(today.getTime() + 30 * 86400000);
            const snap = await db.collection('reservations')
              .where('status', 'in', ['pending', 'confirmed', 'external'])
              .where('checkin', '>=', today)
              .where('checkin', '<=', horizon)
              .orderBy('checkin', 'asc')
              .get();
            return res.json({ ok: true, items: snap.docs.map(snapToResv) });
          }

          if (pane === 'all') {
            const snap = await db.collection('reservations')
              .orderBy('createdAt', 'desc')
              .limit(200)
              .get();
            return res.json({ ok: true, items: snap.docs.map(snapToResv) });
          }

          if (pane === 'guests') {
            const snap = await db.collection('guests')
              .orderBy('totalReservations', 'desc')
              .limit(100)
              .get();
            return res.json({ ok: true, items: snap.docs.map((d) => ({ lineUserId: d.id, ...d.data() })) });
          }

          if (pane === 'logs') {
            const snap = await db.collection('ops_logs')
              .orderBy('ts', 'desc').limit(300).get();
            return res.json({ ok: true, items: snap.docs.map((d) => ({ id: d.id, ...d.data(), ts: d.data().ts?.toDate?.()?.toISOString?.() })) });
          }

          return res.status(400).json({ error: 'unknown pane' });
        }

        if (action === 'detail') {
          const resNo = String(req.query.resNo || '');
          const doc = await db.collection('reservations').doc(resNo).get();
          if (!doc.exists) return res.status(404).json({ error: 'not found' });
          return res.json({ ok: true, item: snapToResv(doc) });
        }

        return res.status(400).json({ error: 'unknown action' });
      }

      // POST: 状態変更
      if (req.method === 'POST') {
        const body = req.body || {};
        if (body.action === 'updateStatus') {
          const { resNo, status } = body;
          if (!/^A-[A-Z0-9]+$/.test(resNo)) return res.status(400).json({ error: 'invalid resNo' });
          if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'invalid status' });
          }
          await db.collection('reservations').doc(resNo).update({
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          await db.collection('ops_logs').add({
            ts: admin.firestore.FieldValue.serverTimestamp(),
            level: 'info', source: 'admin', event: 'status_updated',
            payload: { resNo, newStatus: status },
          });
          return res.json({ ok: true });
        }

        if (body.action === 'updateOtaConfig') {
          const { source, patch } = body;
          if (!['booking', 'airbnb', 'vrbo', 'rakuten', 'jalan', 'ikyu'].includes(source)) {
            return res.status(400).json({ error: 'invalid source' });
          }
          await db.collection('ota_config').doc(source).set({
            ...patch,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          return res.json({ ok: true });
        }

        return res.status(400).json({ error: 'unknown POST action' });
      }

      return res.status(405).json({ error: 'method not allowed' });
    } catch (err) {
      console.error('adminApi error', err);
      res.status(500).json({ error: err.message });
    }
  }
);
