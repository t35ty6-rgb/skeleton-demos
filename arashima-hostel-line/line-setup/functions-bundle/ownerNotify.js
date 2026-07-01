/**
 * 新規予約のオーナー通知 (Firestore onCreate trigger)
 */

const functions = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { defineSecret } = require('firebase-functions/params');
const { Client } = require('@line/bot-sdk');
const confirmationFlex = require('./templates/confirmation');

const LINE_CHANNEL_ACCESS_TOKEN = defineSecret('LINE_CHANNEL_ACCESS_TOKEN');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function lineClient() {
  return new Client({ channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN });
}

exports.onReservationCreated = functions.onDocumentCreated(
  {
    document: 'reservations/{resNo}',
    region: 'asia-northeast1',
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (event) => {
    const rec = { id: event.params.resNo, ...event.data.data() };
    const client = lineClient();

    let bldg = null, room = null;
    if (rec.buildingId) {
      const d = await db.collection('buildings').doc(rec.buildingId).get();
      if (d.exists) bldg = { id: d.id, ...d.data() };
    }
    if (rec.roomId) {
      const d = await db.collection('rooms').doc(rec.roomId).get();
      if (d.exists) room = { id: d.id, ...d.data() };
    }

    try {
      await client.pushMessage(rec.lineUserId, [
        { type: 'text', text: 'ご予約ありがとうございました。\n下記の内容で承りました。' },
        confirmationFlex(rec, bldg, room),
        { type: 'text', text: '担当者が空室を確認のうえ、24 時間以内に「確定」のご連絡をお送りいたします。' },
      ]);
    } catch (err) {
      console.error('customer push failed', err);
    }

    const ownerSnap = await db.collection('ops_state').doc('owner').get();
    const ownerUserId = ownerSnap.exists ? ownerSnap.data().lineUserId : null;
    if (ownerUserId) {
      try {
        const ci = rec.checkin?.toDate?.();
        const dateStr = ci ? `${ci.getMonth() + 1}/${ci.getDate()} (${'日月火水木金土'[ci.getDay()]})` : '-';
        await client.pushMessage(ownerUserId, [
          { type: 'text', text: `[新規予約] ${rec.resNo}\n${rec.name} 様 / ${rec.tel}\n${bldg?.name || ''} ・ ${room?.no || ''}号\n${dateStr} から ${rec.nights}泊 / ${rec.guests}名\n合計 ${(rec.totalPrice || 0).toLocaleString()}円\n備考: ${rec.note || 'なし'}` },
        ]);
      } catch (err) {
        console.error('owner push failed', err);
      }
    }

    // 該当日 シフト入りスタッフ に Flex 通知
    try {
      const staffNotify = require('./staffNotify');
      const r = await staffNotify.pushNewReservationToStaff(rec);
      await db.collection('ops_logs').add({
        ts: admin.firestore.FieldValue.serverTimestamp(),
        level: 'info', source: 'trigger', event: 'staff_notified_new_reservation',
        payload: { resNo: rec.resNo, sent: r.sent, failed: r.failed },
      });
    } catch (err) {
      console.error('staff notify failed', err);
    }

    const guestRef = db.collection('guests').doc(rec.lineUserId);
    const gSnap = await guestRef.get();
    const prev = gSnap.exists ? gSnap.data() : {};
    await guestRef.set({
      realName: rec.name,
      tel: rec.tel,
      totalReservations: (prev.totalReservations || 0) + 1,
      totalNights: (prev.totalNights || 0) + rec.nights,
      lastResNo: rec.resNo,
      isRepeater: (prev.totalReservations || 0) >= 1,
      lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.collection('ops_logs').add({
      ts: admin.firestore.FieldValue.serverTimestamp(),
      level: 'info', source: 'trigger', event: 'reservation_created',
      payload: { resNo: rec.resNo, totalPrice: rec.totalPrice },
      resNo: rec.resNo, lineUserId: rec.lineUserId,
    });
  }
);

exports.onReservationUpdated = functions.onDocumentUpdated(
  {
    document: 'reservations/{resNo}',
    region: 'asia-northeast1',
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (before.status === after.status) return;

    const client = lineClient();
    const rec = { id: event.params.resNo, ...after };

    if (after.status === 'confirmed' && before.status === 'pending') {
      try {
        const flex = buildConfirmFlex(rec);
        await client.pushMessage(rec.lineUserId, [flex]);
      } catch (err) { console.error('confirm flex push failed', err); }
    } else if (after.status === 'cancelled') {
      try {
        await client.pushMessage(rec.lineUserId, [
          { type: 'text', text: `${rec.name} 様\n\nご予約 ${rec.resNo} をキャンセル扱いとさせていただきました。\nまたのご利用をお待ちしております。` },
        ]);
      } catch (err) { console.error(err); }
    }

    await db.collection('ops_logs').add({
      ts: admin.firestore.FieldValue.serverTimestamp(),
      level: 'info', source: 'trigger', event: 'reservation_status_changed',
      payload: { resNo: rec.resNo, from: before.status, to: after.status },
      resNo: rec.resNo, lineUserId: rec.lineUserId,
    });
  }
);

// ============================================
// 予約確定 Flex (Google カレンダー登録ボタン付き)
// ============================================
const BUILDING_META = {
  ryosha:  { name: '旅舎', addr: '福井県大野市元町 8-17', ciHour: 15, coHour: 10 },
  gakusha: { name: '學舎', addr: '福井県大野市城町 3-05', ciHour: 16, coHour: 11 },
};

function buildGcalUrl(rec, bldg) {
  // YYYYMMDDTHHmmssZ (UTC)
  const ci = new Date(rec.checkinDateStr + 'T00:00:00+09:00');
  ci.setHours(ci.getHours() + bldg.ciHour);
  const co = new Date(ci);
  co.setDate(co.getDate() + (rec.nights || 1));
  co.setHours(0, 0, 0, 0);
  co.setHours(bldg.coHour);

  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const title = `${bldg.name} 宿泊 (${rec.name} 様)`;
  const detail = `荒島ホテル ${bldg.name}\n予約番号: ${rec.resNo}\n部屋: ${rec.roomId}\n人数: ${rec.guests} 名\n合計: ${(rec.totalPrice || 0).toLocaleString()}円\n\nLINE @arashima-hotel`;

  const qs = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(ci)}/${fmt(co)}`,
    details: detail,
    location: bldg.addr,
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

function buildConfirmFlex(rec) {
  const bldg = BUILDING_META[rec.buildingId] || { name: '荒島ホテル', addr: '福井県大野市', ciHour: 15, coHour: 10 };
  const gcalUrl = buildGcalUrl(rec, bldg);

  // 表示用 date
  const ciDate = new Date(rec.checkinDateStr + 'T00:00:00+09:00');
  const coDate = new Date(ciDate);
  coDate.setDate(coDate.getDate() + (rec.nights || 1));
  const fmtJp = (d) => `${d.getMonth() + 1}月${d.getDate()}日 (${'日月火水木金土'[d.getDay()]})`;

  return {
    type: 'flex',
    altText: `ご予約を確定しました — ${rec.resNo}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1B5E20',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: 'ご予約を確定しました', color: '#FFFFFF', size: 'lg', weight: 'bold' },
          { type: 'text', text: `${rec.name} 様`, color: '#A5D6A7', size: 'sm', margin: 'sm' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: '予約番号', color: '#888', size: 'sm', flex: 2 },
              { type: 'text', text: rec.resNo, weight: 'bold', size: 'md', flex: 5, align: 'end' },
            ],
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'お部屋', color: '#888', size: 'sm', flex: 2 },
              { type: 'text', text: `${bldg.name} ${rec.roomId}`, weight: 'bold', size: 'md', flex: 5, align: 'end' },
            ],
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'チェックイン', color: '#888', size: 'sm', flex: 2 },
              { type: 'text', text: `${fmtJp(ciDate)} ${bldg.ciHour}:00〜`, weight: 'bold', size: 'md', flex: 5, align: 'end', wrap: true },
            ],
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'チェックアウト', color: '#888', size: 'sm', flex: 2 },
              { type: 'text', text: `${fmtJp(coDate)} 〜${bldg.coHour}:00`, weight: 'bold', size: 'md', flex: 5, align: 'end', wrap: true },
            ],
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: '泊数 / 人数', color: '#888', size: 'sm', flex: 2 },
              { type: 'text', text: `${rec.nights} 泊 / ${rec.guests} 名`, weight: 'bold', size: 'md', flex: 5, align: 'end' },
            ],
          },
          { type: 'separator', margin: 'md' },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: '合計 (現地払い)', color: '#888', size: 'sm', flex: 3 },
              { type: 'text', text: `${(rec.totalPrice || 0).toLocaleString()}円`, weight: 'bold', size: 'xl', flex: 4, align: 'end', color: '#1B5E20' },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#4285F4',
            action: { type: 'uri', label: 'Google カレンダーに登録', uri: gcalUrl },
          },
          {
            type: 'text',
            text: '前日に道順、 当日に鍵の場所をお送りします。',
            size: 'xs', color: '#888', wrap: true, align: 'center', margin: 'sm',
          },
        ],
      },
    },
  };
}
