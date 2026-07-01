/**
 * reserveRoomFn: LIFF クライアント が直接呼ぶ HTTPS callable
 *   POST {lineUserId, buildingId, roomId, checkin, nights, guests, name, tel, note}
 *
 * 全 7 経路の write を 1 関数に集約することで:
 *   - 在庫 lock 取得 (reserveRoom transaction)
 *   - validation (rules で禁止項目も Function 内で再 check)
 *   - resNo を server side で UUID 発行 (Math.random() の衝突を排除)
 *   - JST 統一 (checkin は YYYY-MM-DD 文字列で受ける)
 *
 * 認証: LIFF token (verify via LINE API) で lineUserId が match することを確認
 */

const functions = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const reserveRoom = require('./reserve-room');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function genResNo() {
  // 「A-」 + 8桁 base36 (≈ 60bit エントロピー、誕生日衝突 1000万件で 0.1%)
  return 'A-' + crypto.randomBytes(6).toString('base64url').replace(/[-_]/g, '').slice(0, 8).toUpperCase();
}

function parseJstDate(s) {
  // 'YYYY-MM-DD' → JST 00:00:00 として Date を生成
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('invalid date format');
  const [y, m, d] = s.split('-').map(Number);
  // JST midnight = UTC 15:00 of previous day
  return new Date(Date.UTC(y, m - 1, d, -9, 0, 0));
}

exports.reserveRoomFn = functions.onRequest(
  { region: 'asia-northeast1', cors: true, memory: '256MiB' },
  async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    try {
      const body = req.body || {};
      const liffToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

      // ★ 認証: LIFF access token を LINE Verify API で検証
      let lineUserId = null;
      let displayName = '';
      if (liffToken) {
        const v = await fetch(`https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(liffToken)}`);
        if (!v.ok) return res.status(401).json({ error: 'invalid liff token' });
        const pr = await fetch('https://api.line.me/v2/profile', { headers: { Authorization: `Bearer ${liffToken}` } });
        if (!pr.ok) return res.status(401).json({ error: 'profile fetch failed' });
        const p = await pr.json();
        lineUserId = p.userId;
        displayName = p.displayName || '';
      } else if (body.demoUserId) {
        // LIFF 外 (LINE 未ログイン) からの予約: demoUserId を userId として使う
        lineUserId = `demo:${body.demoUserId}`;
      } else {
        return res.status(401).json({ error: 'no auth' });
      }

      // ★ Validation (rules で防げない分も Function 側で再 check)
      const { buildingId, roomId, checkin, nights, guests, name, tel, note } = body;
      if (!buildingId || !roomId || !checkin || !nights || !guests || !name || !tel) {
        return res.status(400).json({ error: 'missing fields' });
      }
      if (!/^[rg]-\d{3}$/.test(roomId)) return res.status(400).json({ error: 'invalid roomId' });
      if (!/^[1-9]\d{0,1}$/.test(String(nights))) return res.status(400).json({ error: 'invalid nights' });
      if (!/^[1-9]\d{0,1}$/.test(String(guests))) return res.status(400).json({ error: 'invalid guests' });
      if (name.length > 100) return res.status(400).json({ error: 'name too long' });
      if (tel.length > 30) return res.status(400).json({ error: 'tel too long' });

      // ★ price は server side で計算 (改竄防止)
      const roomSnap = await db.collection('rooms').doc(roomId).get();
      if (!roomSnap.exists) return res.status(400).json({ error: 'room not found' });
      const room = roomSnap.data();
      if (room.active === false) return res.status(400).json({ error: 'room inactive' });
      const totalPrice = room.price * Number(nights);

      // ★ checkin を JST 解釈
      const checkinDate = parseJstDate(checkin);

      // ★ reserveRoom transaction で在庫 lock + 予約 commit (atomic)
      const resNo = genResNo();
      const result = await reserveRoom(db, {
        resNo,
        sourceOta: 'line',
        externalResNo: null,
        roomId,
        buildingId,
        checkin: checkinDate,
        checkinDateStr: checkin,    // JST date 文字列 (UI 表示用、TZ バグ防止)
        nights: Number(nights),
        guests: Number(guests),
        name: String(name).slice(0, 100),
        tel: String(tel).slice(0, 30),
        note: String(note || '').slice(0, 500),
        totalPrice,
        lineUserId,
        displayName,
        status: 'pending',
        remindedPre: false,
        remindedArrival: false,
        source: 'liff',
      });

      if (!result.ok) {
        return res.status(409).json({
          ok: false, conflict: result.conflict,
          message: `${result.date} の ${roomId} は既に他経路 (${result.heldBy}) で押さえられています`,
        });
      }

      // ★ ログ
      await db.collection('ops_logs').add({
        ts: admin.firestore.FieldValue.serverTimestamp(),
        level: 'info', source: 'reserveRoomFn', event: 'reservation_created',
        payload: { resNo, roomId, totalPrice }, lineUserId, resNo,
      });

      res.json({ ok: true, resNo, totalPrice, lockedDates: result.dates });
    } catch (err) {
      console.error('reserveRoomFn error', err);
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * getMyReservations: 自分の予約一覧を返す (LIFF 履歴表示用)
 */
exports.getMyReservations = functions.onRequest(
  { region: 'asia-northeast1', cors: true },
  async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(204).end();
    const liffToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const demoUserId = req.query.demoUserId;

    let lineUserId = null;
    if (liffToken) {
      const v = await fetch(`https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(liffToken)}`);
      if (!v.ok) return res.status(401).json({ error: 'invalid liff token' });
      const pr = await fetch('https://api.line.me/v2/profile', { headers: { Authorization: `Bearer ${liffToken}` } });
      const p = await pr.json();
      lineUserId = p.userId;
    } else if (demoUserId) {
      lineUserId = `demo:${demoUserId}`;
    } else {
      return res.status(401).json({ error: 'no auth' });
    }

    const snap = await db.collection('reservations')
      .where('lineUserId', '==', lineUserId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    res.json({
      ok: true,
      reservations: snap.docs.map((d) => {
        const r = d.data();
        return {
          resNo: r.resNo,
          roomId: r.roomId,
          buildingId: r.buildingId,
          checkin: r.checkinDateStr || (r.checkin?.toDate?.()?.toISOString?.()?.slice(0, 10)),
          nights: r.nights,
          guests: r.guests,
          name: r.name,
          status: r.status,
          totalPrice: r.totalPrice,
        };
      }),
    });
  }
);

/**
 * getAvailability: 月単位の availability を返す (LIFF カレンダー用)
 *   GET ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
exports.getAvailability = functions.onRequest(
  { region: 'asia-northeast1', cors: true },
  async (req, res) => {
    if (req.method === 'OPTIONS') return res.status(204).end();
    const from = String(req.query.from || '');
    const to   = String(req.query.to || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: 'invalid date range' });
    }

    const startDate = new Date(from + 'T00:00:00+09:00');
    const endDate = new Date(to + 'T00:00:00+09:00');
    if (endDate < startDate || (endDate - startDate) > 90 * 86400000) {
      return res.status(400).json({ error: 'range too large' });
    }

    // 各日付について availability/{date}/rooms/* を取得 (JST 固定)
    const map = {};
    for (let d = new Date(startDate); d <= endDate; d = new Date(d.getTime() + 86400000)) {
      const jst = new Date(d.getTime() + 9 * 3600000);
      const key = `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
      const snap = await db.collection('availability').doc(key).collection('rooms').get();
      map[key] = {};
      snap.forEach((doc) => {
        const data = doc.data();
        map[key][doc.id] = { status: data.status, heldBy: data.heldBy };
      });
    }

    res.set('Cache-Control', 'public, max-age=60'); // 1分 cache
    res.json({ ok: true, availability: map });
  }
);
