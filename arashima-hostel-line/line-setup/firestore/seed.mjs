#!/usr/bin/env node
/**
 * Firestore シード投入
 * - buildings (2棟) + rooms (8室) を初期投入
 * - 管理画面で空室カレンダーが見えるようにする初期データ
 *
 * 実行: node seed.mjs
 * 前提: firebase-admin SA を GOOGLE_APPLICATION_CREDENTIALS で指定
 */

import admin from 'firebase-admin';
import 'dotenv/config';

admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
});
const db = admin.firestore();

const buildings = [
  {
    id: 'ryosha',
    name: '旅舎',
    addrTown: '元町',
    addrCode: '8-17',
    tagline: '商店街の真ん中で、暮らすように。',
    lead: '寺町通りから歩いて五分。シャッターが上がる音と、コーヒーを淹れる湯気から朝がはじまる。',
    facility: ['共用キッチン', 'ラウンジ', '無料貸自転車', 'シャワー', '洗濯機'],
    checkIn: '15:00 - 21:00',
    checkOut: '〜10:00',
  },
  {
    id: 'gakusha',
    name: '學舎',
    addrTown: '城町',
    addrCode: '3-05',
    tagline: '元・町の学び舎。今は誰かの書斎になる。',
    lead: '長期滞在に向くワークスペース付き別棟。窓の向こうに城下町の屋根が連なる。',
    facility: ['書斎机', '高速Wi-Fi', '土間キッチン', '貸自転車', 'シャワー'],
    checkIn: '16:00 - 20:00',
    checkOut: '〜11:00',
  },
];

const rooms = [
  { id: 'r-201', buildingId: 'ryosha', no: '201', name: '二人室・東向き', capacity: 2, beds: 'シングル × 2', size: '九畳', price: 4000, features: ['共用シャワー', '商店街側'], active: true },
  { id: 'r-202', buildingId: 'ryosha', no: '202', name: '二人室・西向き', capacity: 2, beds: 'シングル × 2', size: '九畳', price: 4000, features: ['共用シャワー', '寺町通り側'], active: true },
  { id: 'r-203', buildingId: 'ryosha', no: '203', name: '二人＋一室', capacity: 3, beds: 'セミダブル + シングル', size: '十二畳', price: 8000, features: ['朝の光', '小机'], active: true },
  { id: 'r-301', buildingId: 'ryosha', no: '301', name: '四人室', capacity: 4, beds: 'シングル × 4', size: '十六畳', price: 12000, features: ['屋根裏窓', 'グループ向き'], active: true },
  { id: 'r-302', buildingId: 'ryosha', no: '302', name: '六人室 (大部屋)', capacity: 6, beds: 'シングル × 6', size: '二十畳', price: 12000, features: ['貸切可', '畳の間'], active: true },
  { id: 'g-101', buildingId: 'gakusha', no: '101', name: '書斎付き二人室', capacity: 2, beds: 'ダブル', size: '十畳', price: 9000, features: ['書斎机', '城下町ビュー'], active: true },
  { id: 'g-201', buildingId: 'gakusha', no: '201', name: '長期滞在 二人室', capacity: 2, beds: 'シングル × 2', size: '十二畳', price: 8000, features: ['月割相談可', '土間直結'], active: true },
  { id: 'g-202', buildingId: 'gakusha', no: '202', name: '小集団 四人室', capacity: 4, beds: 'シングル × 4', size: '十八畳', price: 14000, features: ['ワークショップ転用可'], active: true },
];

async function main() {
  console.log('Seeding buildings...');
  for (const b of buildings) {
    const { id, ...rest } = b;
    await db.collection('buildings').doc(id).set(rest);
    console.log(`  ✓ ${id}`);
  }
  console.log('Seeding rooms...');
  for (const r of rooms) {
    const { id, ...rest } = r;
    await db.collection('rooms').doc(id).set(rest);
    console.log(`  ✓ ${id}`);
  }
  console.log('\n初期データ投入完了。');
  console.log('次は: オーナー LINE userId を ops_state/owner に設定してください。');
  console.log('  → admin SDK で 1度書き込むか、最初に webhook follow で受信した userId を Firestore Console から手動投入');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
