/**
 * iCal Export: 各 OTA へ「我々の予約済日付」を公開する ICS feed
 *
 * URL: https://<region>-<project>.cloudfunctions.net/icalExport?source=booking&room=r-201
 * これを OTA 側 extranet の「外部カレンダー連携 URL」欄に登録する
 *
 * - source: booking | airbnb | vrbo | rakuten | jalan | ikyu | line
 * - room:   r-201..r-302 / g-101..g-202
 *
 * セキュリティ: URL に obscurity token (?key=xxx) を入れる
 * (OTA 側にしか教えない、source 別 token)
 */

const functions = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// 自分発のVEVENT UID prefix (import側で除外する)
const SELF_UID_PREFIX = 'arashima-self-';

function pad(n) { return String(n).padStart(2, '0'); }

// JST date 文字列 'YYYY-MM-DD' → ICS VALUE=DATE 'YYYYMMDD'
function ymdStrToIcs(s) {
  return s.replace(/-/g, '');
}

// Date → JST 基準で YYYYMMDD
function fmtIcsDateFromDate(d) {
  // d は UTC Date。JST に変換して年月日を取り出す
  const jst = new Date(d.getTime() + 9 * 3600000);
  return `${jst.getUTCFullYear()}${pad(jst.getUTCMonth() + 1)}${pad(jst.getUTCDate())}`;
}

function fmtIcsDateTime(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeIcs(s) {
  return String(s || '').replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}

/**
 * Firestore reservations + availability から該当部屋の「販売停止すべき期間」を集める
 * - 自社予約 (status=confirmed) は全 OTA に block 通知
 * - 他 OTA から取り込んだ予約 (status=external) も他 OTA に block 通知 (同期のため)
 * - ただし source 自身が起源のものは戻さない (loop 防止)
 */
async function collectBlockedRanges(roomId, sourceToExclude) {
  const now = new Date();
  const horizon = new Date(now); horizon.setMonth(horizon.getMonth() + 12);

  const snap = await db.collection('reservations')
    .where('roomId', '==', roomId)
    .where('status', 'in', ['confirmed', 'pending', 'external'])
    .get();

  const ranges = [];
  for (const doc of snap.docs) {
    const r = doc.data();
    if (r.sourceOta === sourceToExclude) continue;

    // checkinDateStr ('YYYY-MM-DD') を優先 (JST 1日ずれバグ防止)
    let startStr = r.checkinDateStr;
    if (!startStr) {
      const ci = r.checkin?.toDate?.();
      if (!ci) continue;
      startStr = fmtIcsDateFromDate(ci).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
    }
    const startDate = new Date(startStr + 'T00:00:00+09:00');
    if (startDate > horizon) continue;
    const endDate = new Date(startDate.getTime() + (r.nights || 1) * 86400000);
    const endStr = fmtIcsDateFromDate(endDate).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');

    ranges.push({
      uid: `${SELF_UID_PREFIX}${r.resNo || doc.id}@arashima-hotel.web.app`,
      startStr,                // 'YYYY-MM-DD' JST
      endStr,                  // 'YYYY-MM-DD' JST (exclusive)
      summary: 'Booked',
      description: `${r.sourceOta || 'line'} reservation`,
      createdAt: r.createdAt?.toDate?.() || new Date(),
    });
  }
  return ranges;
}

function buildIcs(roomId, source, ranges) {
  const dtstamp = fmtIcsDateTime(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Arashima Hotel//OTA Sync//JP`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(`Arashima ${roomId} (for ${source})`)}`,
    `X-WR-TIMEZONE:Asia/Tokyo`,
  ];

  for (const r of ranges) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${r.uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${ymdStrToIcs(r.startStr)}`);
    lines.push(`DTEND;VALUE=DATE:${ymdStrToIcs(r.endStr)}`);
    lines.push(`SUMMARY:${escapeIcs(r.summary)}`);
    lines.push(`DESCRIPTION:${escapeIcs(r.description)}`);
    lines.push(`STATUS:CONFIRMED`);
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

exports.icalExport = functions.onRequest(
  { region: 'asia-northeast1', cors: false, memory: '256MiB' },
  async (req, res) => {
    const source = String(req.query.source || '').toLowerCase();
    const roomId = String(req.query.room || '');
    const key = String(req.query.key || '');

    const VALID_SOURCES = ['booking', 'airbnb', 'vrbo', 'rakuten', 'jalan', 'ikyu', 'line'];
    if (!VALID_SOURCES.includes(source)) {
      return res.status(400).send(`invalid source. one of: ${VALID_SOURCES.join(',')}`);
    }
    if (!/^[rg]-\d{3}$/.test(roomId)) {
      return res.status(400).send('invalid room id format');
    }

    // obscurity key 検証
    const cfgSnap = await db.collection('ota_config').doc(source).get();
    if (!cfgSnap.exists) {
      return res.status(404).send('ota source not configured');
    }
    const cfg = cfgSnap.data();
    if (cfg.exportKey && cfg.exportKey !== key) {
      return res.status(403).send('invalid key');
    }
    if (cfg.exportEnabled === false) {
      return res.status(403).send('export disabled for this source');
    }

    try {
      const ranges = await collectBlockedRanges(roomId, source);
      const ics = buildIcs(roomId, source, ranges);

      res.set('Content-Type', 'text/calendar; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=300'); // 5min cache
      res.set('Content-Disposition', `inline; filename="arashima-${roomId}.ics"`);
      res.send(ics);

      // 軽量ログ (毎pull記録しないと膨れるので 1h サンプリング)
      const sampleKey = `${source}_${roomId}_${new Date().toISOString().slice(0, 13)}`;
      await db.collection('ops_logs').doc(`export_${sampleKey}`).set({
        ts: admin.firestore.FieldValue.serverTimestamp(),
        level: 'info', source: 'ical-export',
        event: 'served', payload: { source, roomId, eventCount: ranges.length },
      }, { merge: true }).catch(() => {});

    } catch (err) {
      console.error('ical-export error', err);
      res.status(500).send('internal error');
    }
  }
);
