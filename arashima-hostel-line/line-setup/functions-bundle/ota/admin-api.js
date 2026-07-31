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
const LINE_CHANNEL_ACCESS_TOKEN = defineSecret('LINE_CHANNEL_ACCESS_TOKEN');

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
  { region: 'asia-northeast1', cors: true, secrets: [ADMIN_SECRET, LINE_CHANNEL_ACCESS_TOKEN], memory: '256MiB' },
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

        // ---- 工程管理 (シフト/タスク/スタッフ/config) 一括ロード ----
        if (action === 'ops-load') {
          const [staffSnap, shiftSnap, taskSnap, cfgSnap] = await Promise.all([
            db.collection('ops_state').doc('staff').get(),
            db.collection('ops_state').doc('shifts').get(),
            db.collection('ops_state').doc('tasks').get(),
            db.collection('ops_state').doc('config').get(),
          ]);
          return res.json({
            ok: true,
            staff: staffSnap.exists ? (staffSnap.data().list || []) : [],
            shifts: shiftSnap.exists ? (shiftSnap.data().map || {}) : {},
            tasks: taskSnap.exists ? (taskSnap.data().map || {}) : {},
            config: cfgSnap.exists ? (() => { const c = cfgSnap.data(); delete c.updatedAt; return c; })() : {},
          });
        }

        // ---- 価格調査 (競合ホテル scrape) latest snapshot ----
        if (action === 'get-comp-scan') {
          const snap = await db.collection('comp_scan').doc('latest').get();
          if (!snap.exists) return res.json({ ok: true, data: null });
          return res.json({ ok: true, data: snap.data() });
        }

        // ---- 履歴 doc (相場変動 alert から call) ----
        if (action === 'get-comp-scan-history') {
          const dateKey = String(req.query.date || '').match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
          if (!dateKey) return res.status(400).json({ error: 'invalid date (YYYY-MM-DD)' });
          const snap = await db.collection('comp_scan_history').doc(dateKey).get();
          if (!snap.exists) return res.json({ ok: true, data: null });
          return res.json({ ok: true, data: snap.data() });
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

        // ---- 工程管理 保存 (staff/shifts/tasks) ----
        if (body.action === 'ops-save-staff') {
          const list = Array.isArray(body.list) ? body.list : [];
          if (list.length > 50) return res.status(400).json({ error: 'staff too large' });
          for (const s of list) {
            if (typeof s.id !== 'string' || !s.id) return res.status(400).json({ error: 'invalid staff id' });
            if (typeof s.name !== 'string') return res.status(400).json({ error: 'invalid staff name' });
          }
          await db.collection('ops_state').doc('staff').set({
            list,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return res.json({ ok: true });
        }

        if (body.action === 'ops-save-shifts') {
          const map = (body.map && typeof body.map === 'object') ? body.map : {};
          if (Object.keys(map).length > 5000) return res.status(400).json({ error: 'shifts too large' });
          await db.collection('ops_state').doc('shifts').set({
            map,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return res.json({ ok: true });
        }

        if (body.action === 'ops-save-tasks') {
          const map = (body.map && typeof body.map === 'object') ? body.map : {};
          const bytes = Buffer.byteLength(JSON.stringify(map), 'utf8');
          if (bytes > 900000) return res.status(400).json({ error: 'tasks too large (near 1MiB doc limit)' });
          await db.collection('ops_state').doc('tasks').set({
            map,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return res.json({ ok: true });
        }

        // ---- スタッフ ↔ LINE ペアリングコード発行 (10分有効) ----
        if (body.action === 'ops-issue-pair-code') {
          const staffId = String(body.staffId || '');
          if (!staffId) return res.status(400).json({ error: 'missing staffId' });
          const staffSnap = await db.collection('ops_state').doc('staff').get();
          const list = staffSnap.exists ? (staffSnap.data().list || []) : [];
          if (!list.some((s) => s.id === staffId)) return res.status(404).json({ error: 'staff not found' });
          // 6桁 数字コード (0-9)
          const code = String(Math.floor(100000 + Math.random() * 900000));
          const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
          await db.collection('ops_pair_codes').doc(code).set({
            staffId, expiresAt, createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return res.json({ ok: true, code, expiresInSec: 600 });
        }

        // ---- 工程管理 config 保存 ----
        if (body.action === 'ops-save-config') {
          const patch = (body.patch && typeof body.patch === 'object') ? body.patch : {};
          const allowed = ['notifyAllOnNewReservation'];
          const sanitized = {};
          for (const k of allowed) if (k in patch) sanitized[k] = !!patch[k];
          await db.collection('ops_state').doc('config').set({
            ...sanitized,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          return res.json({ ok: true });
        }

        // ---- 月次シフト 一斉配信 ----
        if (body.action === 'ops-publish-monthly-shifts') {
          const y = Number(body.year);
          const mo = Number(body.month);
          const staffIds = Array.isArray(body.staffIds) ? body.staffIds : [];
          if (!y || !mo || mo < 1 || mo > 12) return res.status(400).json({ error: 'invalid year/month' });
          if (!staffIds.length) return res.status(400).json({ error: 'no staffIds' });
          if (staffIds.length > 50) return res.status(400).json({ error: 'too many staff' });
          const staffNotify = require('../staffNotify');
          const r = await staffNotify.publishMonthlyShifts(y, mo, staffIds);
          return res.json({ ok: true, ...r });
        }

        // ---- スタッフから LINE 経由で lineUserId 紐付け解除 ----
        if (body.action === 'ops-unlink-staff-line') {
          const staffId = String(body.staffId || '');
          if (!staffId) return res.status(400).json({ error: 'missing staffId' });
          const staffSnap = await db.collection('ops_state').doc('staff').get();
          const list = staffSnap.exists ? (staffSnap.data().list || []) : [];
          const idx = list.findIndex((s) => s.id === staffId);
          if (idx < 0) return res.status(404).json({ error: 'staff not found' });
          delete list[idx].lineUserId;
          await db.collection('ops_state').doc('staff').set({
            list, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return res.json({ ok: true });
        }

        // ---- 価格調査 (competitor scrape) upload from LaunchAgent / notebook ----
        if (body.action === 'save-comp-scan') {
          const data = body.data;
          if (!data || typeof data !== 'object') return res.status(400).json({ error: 'invalid data' });
          const bytes = Buffer.byteLength(JSON.stringify(data), 'utf8');
          if (bytes > 900000) return res.status(400).json({ error: 'comp-scan too large (near 1MiB doc limit)' });
          await db.collection('comp_scan').doc('latest').set({
            ...data,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          const dateKey = new Date().toISOString().slice(0, 10);
          await db.collection('comp_scan_history').doc(dateKey).set({
            ...data,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return res.json({ ok: true, bytes });
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
