/**
 * iCal Import: 各 OTA の予約カレンダー (ICS feed) を取得して
 * Firestore reservations + availability に反映
 *
 * 動作:
 *   - 15min cron で全 enabled OTA を pull
 *   - VEVENT を Firestore reservations に upsert (UID 自然キー)
 *   - 在庫台帳 availability/{date}/rooms/{roomId} を更新
 *   - 自分発の VEVENT (SELF_UID_PREFIX) は loop 防止で無視
 *
 * 設定: ota_config/{source}
 *   {
 *     enabled: true,
 *     importEnabled: true,
 *     feeds: { 'r-201': 'https://booking.com/calendar/.../r-201.ics', ... },
 *   }
 */

const functions = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const reserveRoom = require('./reserve-room');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const SELF_UID_PREFIX = 'arashima-self-';
const SOURCES = ['booking', 'airbnb', 'vrbo'];

function ymdJst(d) {
  const jst = new Date(d.getTime() + 9 * 3600000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
}

/* ============ ICS パーサ (最小実装) ============ */
function parseIcs(text) {
  const events = [];
  let cur = null;
  const lines = text.replace(/\r\n[ \t]/g, '').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') {
      if (cur && cur.uid && cur.dtstart) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx);
    const val = line.slice(colonIdx + 1);
    const [base] = key.split(';');

    switch (base) {
      case 'UID': cur.uid = val; break;
      case 'DTSTART':
        cur.dtstart = parseIcsDate(key, val); break;
      case 'DTEND':
        cur.dtend = parseIcsDate(key, val); break;
      case 'SUMMARY': cur.summary = val; break;
      case 'DESCRIPTION': cur.description = val; break;
      case 'STATUS': cur.status = val; break;
    }
  }
  return events;
}

function parseIcsDate(key, val) {
  // VALUE=DATE: YYYYMMDD (all-day)
  if (key.includes('VALUE=DATE') && !key.includes('VALUE=DATE-TIME')) {
    const y = +val.slice(0, 4), m = +val.slice(4, 6) - 1, d = +val.slice(6, 8);
    // JST 00:00 として扱う
    return new Date(Date.UTC(y, m, d, -9, 0, 0));
  }
  // YYYYMMDDTHHMMSSZ (UTC)
  if (val.endsWith('Z')) {
    const y = +val.slice(0, 4), m = +val.slice(4, 6) - 1, d = +val.slice(6, 8);
    const hh = +val.slice(9, 11), mm = +val.slice(11, 13), ss = +val.slice(13, 15);
    return new Date(Date.UTC(y, m, d, hh, mm, ss));
  }
  // YYYYMMDDTHHMMSS (local / TZID 別途) — host TZ JST と仮定
  const y = +val.slice(0, 4), m = +val.slice(4, 6) - 1, d = +val.slice(6, 8);
  const hh = +val.slice(9, 11) || 0, mm = +val.slice(11, 13) || 0;
  return new Date(Date.UTC(y, m, d, hh - 9, mm, 0));
}

/* ============ 単一 OTA / 単一 feed の pull ============ */
async function pullOneFeed(source, roomId, feedUrl) {
  const log = { source, roomId, feedUrl };
  try {
    const res = await fetch(feedUrl, { headers: { 'User-Agent': 'Arashima-Hotel-Sync/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const events = parseIcs(text);

    let upserted = 0, skipped = 0, conflictsCount = 0;
    const seenResNos = new Set();

    for (const ev of events) {
      if (ev.uid.startsWith(SELF_UID_PREFIX)) { skipped++; continue; }

      const externalId = ev.uid.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100);
      const resNo = `${source}__${externalId}`;
      seenResNos.add(resNo);

      const checkin = ev.dtstart;
      const checkout = ev.dtend || new Date(checkin.getTime() + 86400000);
      const nights = Math.max(1, Math.round((checkout - checkin) / 86400000));
      const checkinDateStr = ymdJst(checkin);

      // reserveRoom() transaction で在庫 lock + reservation atomic commit
      const result = await reserveRoom(db, {
        resNo,
        sourceOta: source,
        externalResNo: ev.uid,
        externalRawPayload: ev,
        roomId,
        buildingId: roomId.startsWith('r-') ? 'ryosha' : 'gakusha',
        checkin,
        checkinDateStr,
        nights,
        guests: 0,
        name: ev.summary || '(OTA予約)',
        tel: '',
        note: ev.description || '',
        totalPrice: 0,
        lineUserId: null,
        status: 'external',
        remindedPre: true,
        remindedArrival: true,
        source: 'ical-import',
      }).catch((err) => ({ ok: false, error: err.message }));

      if (!result.ok) {
        conflictsCount++;
        await db.collection('ops_logs').add({
          ts: admin.firestore.FieldValue.serverTimestamp(),
          level: 'warn', source: 'ical-import',
          event: 'conflict_on_import',
          payload: { source, resNo, roomId, checkinDateStr, conflict: result.conflict, heldBy: result.heldBy },
        });
      } else {
        upserted++;
      }
    }

    // 過去 pull で取り込んだが今回 feed にない外部予約 → キャンセル扱い
    const stale = await db.collection('reservations')
      .where('sourceOta', '==', source)
      .where('roomId', '==', roomId)
      .where('status', '==', 'external')
      .get();
    let cancelled = 0;
    for (const sd of stale.docs) {
      if (seenResNos.has(sd.id)) continue;
      // 過去日付は無視
      const ci = sd.data().checkin?.toDate?.();
      if (!ci || ci < new Date()) continue;
      await sd.ref.update({
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelReason: 'external_removed',
      });
      cancelled++;
    }

    await db.collection('ops_logs').add({
      ts: admin.firestore.FieldValue.serverTimestamp(),
      level: 'info', source: 'ical-import',
      event: 'feed_pulled',
      payload: { ...log, upserted, skipped, cancelled, totalEvents: events.length },
    });
    return { ok: true, upserted, skipped, cancelled };
  } catch (err) {
    await db.collection('ops_logs').add({
      ts: admin.firestore.FieldValue.serverTimestamp(),
      level: 'error', source: 'ical-import',
      event: 'feed_failed', payload: { ...log, error: err.message },
    });
    return { ok: false, error: err.message };
  }
}

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ============ 15分 cron entrypoint ============ */
exports.icalImport = functions.onSchedule(
  { schedule: '*/15 * * * *', timeZone: 'Asia/Tokyo', region: 'asia-northeast1' },
  async () => {
    let total = { ok: 0, fail: 0 };
    for (const source of SOURCES) {
      const cfgSnap = await db.collection('ota_config').doc(source).get();
      if (!cfgSnap.exists) continue;
      const cfg = cfgSnap.data();
      if (!cfg.enabled || !cfg.importEnabled || !cfg.feeds) continue;

      for (const [roomId, feedUrl] of Object.entries(cfg.feeds)) {
        if (!feedUrl) continue;
        const r = await pullOneFeed(source, roomId, feedUrl);
        if (r.ok) total.ok++; else total.fail++;
      }
    }
    console.log(`icalImport: ok=${total.ok} fail=${total.fail}`);
    return total;
  }
);

// オーナーが管理画面から手動 trigger 可能なエンドポイントも公開
const httpsFn = require('firebase-functions/v2/https');
exports.icalImportNow = httpsFn.onRequest(
  { region: 'asia-northeast1', cors: true },
  async (req, res) => {
    // admin 認証
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!idToken) return res.status(401).json({ error: 'no token' });
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      if (!decoded.admin) return res.status(403).json({ error: 'not admin' });
      let total = { ok: 0, fail: 0 };
      for (const source of SOURCES) {
        const cfgSnap = await db.collection('ota_config').doc(source).get();
        if (!cfgSnap.exists) continue;
        const cfg = cfgSnap.data();
        if (!cfg.enabled || !cfg.importEnabled || !cfg.feeds) continue;
        for (const [roomId, feedUrl] of Object.entries(cfg.feeds)) {
          if (!feedUrl) continue;
          const r = await pullOneFeed(source, roomId, feedUrl);
          if (r.ok) total.ok++; else total.fail++;
        }
      }
      res.json({ ok: true, ...total });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
