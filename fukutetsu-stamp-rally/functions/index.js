/**
 * Fukutetsu Rally · Cloud Functions
 *
 * このソースは fukutetsu-stamp-rally 内に閉じている。
 * Skel·EC / Femoon / MEI の functions とは名前空間 (関数名 prefix `fukutetsu`) で分離。
 * デプロイ時は firebase.json の "functions[].codebase" を fukutetsu にして
 * skel-ec 側の functions と 共存させる。
 *
 * 提供関数:
 *   fukutetsuVerifyStamp  (HTTPS onCall)    — 押印リクエスト検証 + Firestore書込
 *   fukutetsuOnStampWrite (Firestore trigger) — 押印後の セグメント再計算 + コンプ通知
 *   fukutetsuPushSegment  (HTTPS onCall)     — admin セグメント配信 (S1〜S5)
 *   fukutetsuSchedulePush (Cloud Scheduler)  — 定時セグメント自動配信 (毎日20時)
 *   fukutetsuGetStats     (HTTPS onCall)     — admin 集計 (今日/累計/スポット別)
 *   fukutetsuLineWebhook  (HTTPS)            — LINE Messaging API webhook (友だち追加 等)
 *
 * memory: feedback_fp_compass_broadcast_must_be_push.md
 *   → push は 必ず to: userId 指定、 broadcast禁止 (個人情報漏洩級リスク)
 */
"use strict";

const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ────────────────────── secrets ──────────────────────
const LINE_CHANNEL_ACCESS_TOKEN = defineSecret("FUKUTETSU_LINE_ACCESS_TOKEN");
const LINE_CHANNEL_SECRET = defineSecret("FUKUTETSU_LINE_CHANNEL_SECRET");

// ────────────────────── constants ──────────────────────
const RALLY_ID = "FT-2026-Summer";
const RADIUS_M = 150;
const REGION = "asia-northeast1";

// ────────────────────── helpers ──────────────────────
const haversineM = (lat1, lng1, lat2, lng2) => {
  const R = 6371000, toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

async function loadSpots(){
  const snap = await db.collection("fukutetsu_spots").get();
  const out = {};
  snap.docs.forEach(d => { out[d.id] = d.data(); });
  return out;
}

async function loadRally(){
  const snap = await db.doc(`fukutetsu_rallies/${RALLY_ID}`).get();
  return snap.exists ? snap.data() : { thresholds: [4, 7, 10], radiusM: RADIUS_M };
}

async function linePush(userId, messages, token){
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ to: userId, messages }),
  });
  if (!res.ok){
    const err = await res.text();
    throw new Error(`LINE push failed: ${res.status} ${err}`);
  }
  return res.json().catch(() => ({}));
}

async function lineMulticast(userIds, messages, token){
  // multicast は 最大500人/回、 それ以上は chunk
  const chunks = [];
  for (let i = 0; i < userIds.length; i += 500) chunks.push(userIds.slice(i, i + 500));
  const results = [];
  for (const chunk of chunks){
    const res = await fetch("https://api.line.me/v2/bot/message/multicast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ to: chunk, messages }),
    });
    if (!res.ok){
      const err = await res.text();
      throw new Error(`LINE multicast failed: ${res.status} ${err}`);
    }
    results.push(await res.json().catch(() => ({})));
  }
  return results;
}

// ────────────────────── verifyStamp ──────────────────────
exports.fukutetsuVerifyStamp = onCall(
  { region: REGION, secrets: [LINE_CHANNEL_ACCESS_TOKEN] },
  async (req) => {
    if (!req.auth || !req.auth.uid) throw new HttpsError("unauthenticated", "認証が必要");
    const userId = req.auth.uid;
    const { spotCode, coord } = req.data || {};
    if (!spotCode || !coord) throw new HttpsError("invalid-argument", "spotCode と coord は必須");

    // spot master lookup
    const spots = await loadSpots();
    const spot = spots[spotCode];
    if (!spot) throw new HttpsError("not-found", `${spotCode} は対象外`);

    // GPS 再判定 (server-side)
    const dist = haversineM(coord.lat, coord.lng, spot.lat, spot.lng);
    const rally = await loadRally();
    const radius = rally.radiusM || RADIUS_M;
    if (dist > radius){
      // 圏外 → fraud log
      await db.collection(`fukutetsu_rallies/${RALLY_ID}/fraud`).add({
        userId, spotCode, coord, distM: dist, reason: "out_of_range",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      throw new HttpsError("out-of-range", `圏外です (${Math.round(dist)}m > ${radius}m)`);
    }

    // duplicate check
    const dupQ = await db.collection(`fukutetsu_rallies/${RALLY_ID}/stamps`)
      .where("userId", "==", userId).where("code", "==", spotCode).limit(1).get();
    if (!dupQ.empty){
      throw new HttpsError("already-exists", `${spot.name} は既に集印済`);
    }

    // hash-chain: 前の押印 hash + userId + spotCode + time
    const prevQ = await db.collection(`fukutetsu_rallies/${RALLY_ID}/stamps`)
      .where("userId", "==", userId).orderBy("createdAt", "desc").limit(1).get();
    const prevHash = prevQ.empty ? "genesis" : (prevQ.docs[0].data().hash || "");
    const now = new Date();
    const timeStr = now.toISOString();
    const hash = crypto.createHash("sha256")
      .update(`${prevHash}|${userId}|${spotCode}|${timeStr}`).digest("hex").slice(0, 16);

    // count for serial + threshold check
    const totalQ = await db.collection(`fukutetsu_rallies/${RALLY_ID}/stamps`)
      .where("userId", "==", userId).get();
    const nBefore = totalQ.size;
    const serial = String(284 + nBefore * 7).padStart(6, "0");

    const stamp = {
      userId, code: spotCode, name: spot.name, station: spot.station,
      coord: `${coord.lat.toFixed(4)},${coord.lng.toFixed(4)}`,
      lat: coord.lat, lng: coord.lng, distM: dist,
      time: timeStr, serial, hash, prevHash,
      valid: true,
      rallyId: RALLY_ID,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection(`fukutetsu_rallies/${RALLY_ID}/stamps`).add(stamp);

    return { success: true, id: docRef.id, serial, hash, total: nBefore + 1 };
  }
);

// ────────────────────── onStampWrite ──────────────────────
exports.fukutetsuOnStampWrite = onDocumentCreated(
  {
    document: `fukutetsu_rallies/${RALLY_ID}/stamps/{stampId}`,
    region: REGION,
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (event) => {
    const stamp = event.data && event.data.data();
    if (!stamp || !stamp.userId) return;

    // participant upsert
    const partRef = db.doc(`fukutetsu_rallies/${RALLY_ID}/participants/${stamp.userId}`);
    const partSnap = await partRef.get();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // カウント再計算 (このstampを含む)
    const allQ = await db.collection(`fukutetsu_rallies/${RALLY_ID}/stamps`)
      .where("userId", "==", stamp.userId).get();
    const n = allQ.size;

    await partRef.set({
      userId: stamp.userId,
      lastStampAt: now,
      totalStamps: n,
      updatedAt: now,
      ...(partSnap.exists ? {} : { joinedAt: now, firstSpot: stamp.code }),
    }, { merge: true });

    // threshold triggers: 4個 / 7個 / 10個 (コンプ)
    const rally = await loadRally();
    const [t1, t2, t3] = rally.thresholds || [4, 7, 10];
    let msg = null;
    if (n === t1) msg = `${stamp.name} 押印おめでとうございます。 4個到達で 沿線カフェ ドリンク1杯 が交換可能になりました。 引換所は 帳タブの景品セクションから。`;
    else if (n === t2) msg = `7個到達。 コンプまで あと3個。 福鉄1日フリーきっぷ 半額クーポンも交換可能です。`;
    else if (n === t3) msg = `コンプリート達成。 硬券セットは 福井駅観光案内所で 8/31まで お受け取りください。 次期ラリーは秋10月開催、 いち早くお知らせします。`;
    if (msg && partSnap.exists && partSnap.data().pushEnabled !== false){
      try {
        const token = process.env.FUKUTETSU_LINE_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN.value();
        await linePush(stamp.userId, [{ type: "text", text: msg }], token);
        await db.collection("fukutetsu_pushes").add({
          userId: stamp.userId, kind: "threshold", threshold: n, message: msg,
          rallyId: RALLY_ID, createdAt: now,
        });
      } catch(e){ console.warn("[fukutetsu] threshold push failed:", e.message); }
    }
  }
);

// ────────────────────── pushSegment (admin) ──────────────────────
exports.fukutetsuPushSegment = onCall(
  {
    region: REGION,
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (req) => {
    // TODO: admin auth (role check)
    if (!req.auth) throw new HttpsError("unauthenticated", "認証が必要");
    const { segId, text, dryRun } = req.data || {};
    if (!segId || !text) throw new HttpsError("invalid-argument", "segId と text は必須");

    const userIds = await resolveSegmentUsers(segId);
    if (!userIds.length){
      return { sent: 0, note: "対象ユーザーが 0名" };
    }

    if (dryRun){
      return { sent: 0, would_send: userIds.length, sample: userIds.slice(0, 5) };
    }

    const token = process.env.FUKUTETSU_LINE_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN.value();
    // "◯◯さん" は 個別置換のため multicast ではなく individual push
    let ok = 0, fail = 0;
    for (const userId of userIds){
      // fetch displayName from participant
      const p = await db.doc(`fukutetsu_rallies/${RALLY_ID}/participants/${userId}`).get();
      const name = (p.exists && p.data().name) || "";
      const personal = text.replace(/◯◯さん/g, name ? `${name}さん` : "こんにちは");
      try {
        await linePush(userId, [{ type: "text", text: personal }], token);
        ok++;
      } catch(e){ fail++; console.warn("[fukutetsu] segment push failed:", userId, e.message); }
    }
    await db.collection("fukutetsu_pushes").add({
      kind: "segment", segId, template: text, sent: ok, failed: fail,
      rallyId: RALLY_ID, createdAt: admin.firestore.FieldValue.serverTimestamp(),
      operatorUid: req.auth.uid,
    });
    return { sent: ok, failed: fail, total: userIds.length };
  }
);

// ────────────────────── scheduledSegmentPush ──────────────────────
exports.fukutetsuSchedulePush = onSchedule(
  {
    schedule: "0 20 * * *",
    timeZone: "Asia/Tokyo",
    region: REGION,
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async () => {
    // ラリー期間内でのみ稼働
    const rally = await loadRally();
    if (!rally.active) return;
    const now = Date.now();
    const start = rally.startAt && rally.startAt.toMillis();
    const end = rally.endAt && rally.endAt.toMillis();
    if (start && now < start) return;
    if (end && now > end) return;

    // S2 育成中 (押印2-3個)
    const s2 = await resolveSegmentUsers("S2");
    if (s2.length){
      // 実行日が金曜のみ (週末前)
      if (new Date().getDay() === 5){
        await sendSegmentAuto("S2", s2, "今週末はどこ行きますか。 まだ未訪問のスポットが残っています。 週末は晴れ予報です。");
      }
    }
    // S5 途中離脱 (3日以上更新なし)
    const s5 = await resolveSegmentUsers("S5");
    if (s5.length){
      await sendSegmentAuto("S5", s5, "ラリーは 8/31 までです。 硬券帳の続きを ぜひ集めてください。");
    }
    console.log("[fukutetsu] scheduled push finished");
  }
);

async function sendSegmentAuto(segId, userIds, text){
  const token = process.env.FUKUTETSU_LINE_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN.value();
  let ok = 0, fail = 0;
  for (const userId of userIds){
    const p = await db.doc(`fukutetsu_rallies/${RALLY_ID}/participants/${userId}`).get();
    const name = (p.exists && p.data().name) || "";
    const msg = `${name ? name + "さん、" : ""}${text}`;
    try {
      await linePush(userId, [{ type: "text", text: msg }], token);
      ok++;
    } catch(e){ fail++; }
  }
  await db.collection("fukutetsu_pushes").add({
    kind: "scheduled", segId, sent: ok, failed: fail,
    rallyId: RALLY_ID, createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok, fail };
}

// segment resolver
async function resolveSegmentUsers(segId){
  const parts = await db.collection(`fukutetsu_rallies/${RALLY_ID}/participants`).get();
  const now = Date.now();
  const THREE_DAYS = 3 * 24 * 3600 * 1000;
  const rules = {
    S1: p => p.totalStamps === 1,
    S2: p => p.totalStamps >= 2 && p.totalStamps <= 3,
    S3: p => p.totalStamps >= 5 && p.totalStamps <= 6,
    S4: p => p.totalStamps >= 10,
    S5: p => p.totalStamps >= 1 && p.totalStamps < 10 && p.lastStampAt && (now - p.lastStampAt.toMillis()) > THREE_DAYS,
  };
  const rule = rules[segId];
  if (!rule) return [];
  return parts.docs.filter(d => rule(d.data())).map(d => d.data().userId).filter(Boolean);
}

// ────────────────────── getStats ──────────────────────
exports.fukutetsuGetStats = onCall(
  { region: REGION },
  async (req) => {
    // TODO: admin auth check
    const partsSnap = await db.collection(`fukutetsu_rallies/${RALLY_ID}/participants`).get();
    const stampsSnap = await db.collection(`fukutetsu_rallies/${RALLY_ID}/stamps`).get();
    const spotCounts = {};
    stampsSnap.docs.forEach(d => {
      const s = d.data();
      spotCounts[s.code] = (spotCounts[s.code] || 0) + 1;
    });
    // 今日の参加者
    const start = new Date(); start.setHours(0,0,0,0);
    const todayQ = await db.collection(`fukutetsu_rallies/${RALLY_ID}/stamps`)
      .where("createdAt", ">=", start).get();
    const todayUsers = new Set();
    todayQ.docs.forEach(d => todayUsers.add(d.data().userId));
    // segment counts
    const segCounts = {};
    for (const seg of ["S1", "S2", "S3", "S4", "S5"]){
      segCounts[seg] = (await resolveSegmentUsers(seg)).length;
    }
    return {
      participants: partsSnap.size,
      totalStamps: stampsSnap.size,
      todayParticipants: todayUsers.size,
      todayStamps: todayQ.size,
      spotCounts,
      segCounts,
    };
  }
);

// ────────────────────── LINE Webhook ──────────────────────
exports.fukutetsuLineWebhook = onRequest(
  {
    region: REGION,
    secrets: [LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET],
  },
  async (req, res) => {
    // TODO: 署名検証 (X-Line-Signature)
    const events = (req.body && req.body.events) || [];
    for (const ev of events){
      if (ev.type === "follow"){
        const userId = ev.source.userId;
        try {
          const token = process.env.FUKUTETSU_LINE_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN.value();
          await linePush(userId, [
            { type: "text", text: "友だち追加ありがとうございます。 福武線 沿線スタンプラリー「ふくてつ さんぽ帳」 へようこそ。" },
            { type: "text", text: "リッチメニューの 「さんぽ帳を開く」 から参加できます。 10観光地を巡ってスタンプを集めましょう。" },
          ], token);
        } catch(e){ console.warn("[fukutetsu] follow reply failed:", e.message); }
      }
    }
    res.status(200).send("OK");
  }
);
