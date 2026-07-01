/**
 * reserveRoom: 全 7 経路 (LIFF + 6 OTA) の予約 write を一本化する transaction
 *
 * 使い方:
 *   const reserveRoom = require('./ota/reserve-room');
 *   const result = await reserveRoom(db, {
 *     resNo, sourceOta, externalResNo,
 *     roomId, checkin, nights, guests, name, tel, totalPrice, ...
 *   });
 *   if (!result.ok) handle conflict (result.conflict, result.heldBy, result.heldByResNo)
 *
 * 在庫台帳 = availability/{YYYY-MM-DD}/rooms/{roomId}
 *   - 同日同室への 2 件目は ConflictError で reject
 *   - 全 nights 分を 1 transaction で押さえる (1日でも他者保持なら全 rollback)
 */

const admin = require('firebase-admin');

const TIEBREAKER = ['line', 'booking', 'airbnb', 'vrbo', 'rakuten', 'jalan', 'ikyu'];

function ymd(d) {
  // Cloud Functions は UTC なので JST 補正 + UTC method で year/month/day を取る
  const jst = new Date(d.getTime() + 9 * 3600000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
}

function tiebreakerRank(source) {
  const i = TIEBREAKER.indexOf(source);
  return i === -1 ? 99 : i;
}

/**
 * @param {Firestore} db
 * @param {object} payload  必須: resNo, sourceOta, roomId, checkin (Date), nights
 */
async function reserveRoom(db, payload) {
  const { resNo, sourceOta, roomId, checkin, nights } = payload;
  if (!resNo || !sourceOta || !roomId || !checkin || !nights) {
    throw new Error('reserveRoom: missing required fields');
  }

  const dates = [];
  for (let i = 0; i < nights; i++) {
    const d = new Date(checkin);
    d.setDate(d.getDate() + i);
    dates.push(ymd(d));
  }

  // Single transaction: 全 nights の availability lock を read → check → write
  return db.runTransaction(async (tx) => {
    const availRefs = dates.map((dk) =>
      db.collection('availability').doc(dk).collection('rooms').doc(roomId)
    );
    const availSnaps = await Promise.all(availRefs.map((ref) => tx.get(ref)));

    // conflict check
    for (let i = 0; i < availSnaps.length; i++) {
      const snap = availSnaps[i];
      if (!snap.exists) continue;
      const cur = snap.data();
      if (cur.status === 'blocked') {
        return {
          ok: false, conflict: 'blocked',
          date: dates[i], roomId, heldBy: cur.heldBy, heldByResNo: cur.heldByResNo,
        };
      }
      if (['held', 'booked'].includes(cur.status)) {
        // 同じ source の同じ resNo (再 push 冪等) なら通す
        if (cur.heldBy === sourceOta && cur.heldByResNo === resNo) continue;
        // 異なる占有あり → tiebreaker
        const newerSource = tiebreakerRank(sourceOta) < tiebreakerRank(cur.heldBy)
          ? sourceOta : cur.heldBy;
        return {
          ok: false, conflict: 'occupied',
          date: dates[i], roomId,
          heldBy: cur.heldBy, heldByResNo: cur.heldByResNo,
          winner: newerSource,
        };
      }
    }

    // 全 nights OK → 在庫 lock 取得
    const now = admin.firestore.FieldValue.serverTimestamp();
    for (const ref of availRefs) {
      tx.set(ref, {
        status: sourceOta === 'line' ? 'held' : 'booked',
        heldBy: sourceOta,
        heldByResNo: resNo,
        heldAt: now,
        lastVerifiedAt: now,
      }, { merge: true });
    }

    // reservations 本体 (set merge で冪等)
    const resRef = db.collection('reservations').doc(resNo);
    tx.set(resRef, {
      ...payload,
      checkin: admin.firestore.Timestamp.fromDate(checkin),
      status: payload.status || 'pending',
      updatedAt: now,
      createdAt: payload.createdAt || now,
    }, { merge: true });

    return { ok: true, resNo, dates, lockedCount: dates.length };
  });
}

module.exports = reserveRoom;
module.exports.TIEBREAKER = TIEBREAKER;
module.exports.tiebreakerRank = tiebreakerRank;
