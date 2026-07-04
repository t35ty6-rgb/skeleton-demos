/**
 * Seed script · fukutetsu_spots マスタ + fukutetsu_rallies/FT-2026-Summer 投入
 *
 * 実行:  cd functions && node seed.js
 * 前提:  GOOGLE_APPLICATION_CREDENTIALS または gcloud auth 認証済み
 */
"use strict";
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const RALLY_ID = "FT-2026-Summer";

const SPOTS = [
  { code:"SP-01", name:"越前和紙の里",             station:"たけふ新",       lat:35.9262, lng:136.1675 },
  { code:"SP-02", name:"サンドーム福井",           station:"サンドーム西",   lat:35.9700, lng:136.2124 },
  { code:"SP-03", name:"武生中央公園",             station:"たけふ新",       lat:35.9061, lng:136.1778 },
  { code:"SP-04", name:"西山公園",                 station:"西鯖江",         lat:35.9533, lng:136.1830 },
  { code:"SP-05", name:"めがねミュージアム",       station:"神明",           lat:35.9461, lng:136.1836 },
  { code:"SP-06", name:"福井城址",                 station:"福井城址大名町", lat:36.0665, lng:136.2223 },
  { code:"SP-07", name:"養浩館庭園",               station:"仁愛女子高校",   lat:36.0717, lng:136.2231 },
  { code:"SP-08", name:"足羽神社",                 station:"福井駅",         lat:36.0589, lng:136.2220 },
  { code:"SP-09", name:"福井駅前 恐竜モニュメント", station:"福井駅",         lat:36.0616, lng:136.2227 },
  { code:"SP-10", name:"田原町 商店街",            station:"田原町",         lat:36.0778, lng:136.2228 },
];

const RALLY = {
  id: RALLY_ID,
  name: "ふくてつ さんぽ帳 2026 夏",
  startAt: admin.firestore.Timestamp.fromDate(new Date("2026-07-15T00:00:00+09:00")),
  endAt:   admin.firestore.Timestamp.fromDate(new Date("2026-08-31T23:59:59+09:00")),
  active: true,
  radiusM: 150,
  thresholds: [4, 7, 10],
  spotCodes: SPOTS.map(s => s.code),
  prizes: [
    { threshold: 4,  name: "沿線カフェ ドリンク引換",       desc: "対象6店舗のいずれか1杯" },
    { threshold: 7,  name: "福鉄1日フリーきっぷ 半額",     desc: "通常 ¥1,000 → ¥500" },
    { threshold: 10, name: "コンプリート限定 硬券セット", desc: "実寸硬券10枚 + 記念台紙" },
  ],
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
};

async function main(){
  console.log("[seed] rally:", RALLY_ID);
  await db.doc(`fukutetsu_rallies/${RALLY_ID}`).set(RALLY, { merge: true });
  console.log("[seed] spots:", SPOTS.length);
  const batch = db.batch();
  SPOTS.forEach(s => batch.set(db.doc(`fukutetsu_spots/${s.code}`), s, { merge: true }));
  await batch.commit();
  console.log("[seed] done");
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
