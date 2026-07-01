/**
 * Conflict Resolver: reservations への write を trigger に
 * 同日同室の overlap を検知 → オーナー LINE 緊急通知 + Sheets 草稿生成
 *
 * 「auto cancel API は叩かない」(host penalty 直撃するため)
 * 人手介入を必須とする = オーナー判断で 1 件を取消、客に謝罪
 */

const functions = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { defineSecret } = require('firebase-functions/params');
const { Client } = require('@line/bot-sdk');

const LINE_CHANNEL_ACCESS_TOKEN = defineSecret('LINE_CHANNEL_ACCESS_TOKEN');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

exports.conflictResolver = functions.onDocumentWritten(
  {
    document: 'reservations/{resNo}',
    region: 'asia-northeast1',
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (event) => {
    const after = event.data.after?.data();
    if (!after) return;
    if (!['pending', 'confirmed', 'external'].includes(after.status)) return;

    const ci = after.checkin?.toDate?.();
    if (!ci || !after.roomId || !after.nights) return;

    // 同日同室の他予約を探す
    const conflicts = [];
    for (let i = 0; i < after.nights; i++) {
      const d = new Date(ci); d.setDate(d.getDate() + i);
      const dateKey = ymd(d);

      const snap = await db.collection('reservations')
        .where('roomId', '==', after.roomId)
        .where('status', 'in', ['pending', 'confirmed', 'external'])
        .get();

      for (const doc of snap.docs) {
        if (doc.id === event.params.resNo) continue;
        const r = doc.data();
        const rci = r.checkin?.toDate?.();
        if (!rci) continue;
        const rco = new Date(rci); rco.setDate(rco.getDate() + (r.nights || 1));
        // overlap check: this date ∈ [rci, rco)
        if (d >= rci && d < rco) {
          conflicts.push({ docId: doc.id, ...r, conflictDate: dateKey });
        }
      }
    }

    if (conflicts.length === 0) return;

    // 検出 → 既存 document に flag
    await event.data.after.ref.update({
      conflictFlag: true,
      conflictWith: conflicts.map((c) => c.docId),
      conflictDetectedAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});

    // オーナー通知 (緊急)
    const ownerSnap = await db.collection('ops_state').doc('owner').get();
    const ownerUserId = ownerSnap.exists ? ownerSnap.data().lineUserId : null;
    if (ownerUserId) {
      const client = new Client({ channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN });
      const lines = [
        `[🚨 ダブルブッキング検知] ${after.roomId}`,
        `日付: ${conflicts.map((c) => c.conflictDate).join(',')}`,
        `今回: ${after.sourceOta || 'line'} / ${after.resNo} (${after.name || ''})`,
        ...conflicts.map((c) => `既存: ${c.sourceOta || 'line'} / ${c.docId} (${c.name || ''})`),
        ``,
        `管理画面で 1 件を取消し、客に謝罪してください。`,
        `https://arashima-admin.web.app`,
      ];
      try {
        await client.pushMessage(ownerUserId, [{ type: 'text', text: lines.join('\n') }]);
      } catch (e) {
        console.error('owner conflict push failed', e);
      }
    }

    // ログ
    await db.collection('ops_logs').add({
      ts: admin.firestore.FieldValue.serverTimestamp(),
      level: 'error', source: 'conflict-resolver',
      event: 'overbooking_detected',
      payload: {
        resNo: event.params.resNo,
        roomId: after.roomId,
        sourceOta: after.sourceOta,
        conflictWith: conflicts.map((c) => c.docId),
        dates: conflicts.map((c) => c.conflictDate),
      },
    });
  }
);
