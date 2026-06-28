/**
 * Postback ハンドラ
 * リッチメニューの各マスは postback data='menu=xxx' を送る設定。
 * - menu=reserve   → LIFF URL を返す (リッチメニューは uri action 直リンクなので来ない想定だが念のため)
 * - menu=rooms     → 客室サマリー Flex
 * - menu=access    → アクセス Flex + マップリンク
 * - menu=changes   → 現在予約 Flex (履歴連動)
 * - menu=facility  → 館内設備 Flex
 * - menu=contact   → スタッフ呼出メッセージ
 */

const roomsFlex = require('../templates/rooms');
const accessFlex = require('../templates/access');
const facilityFlex = require('../templates/facility');
const changesFlex = require('../templates/changes');

module.exports = async (event, ctx) => {
  const { lineClient, db, env } = ctx;
  const lineUserId = event.source.userId;
  const data = parse(event.postback.data);
  const menu = data.menu;

  let messages = [];

  if (menu === 'reserve') {
    const liffUrl = `https://liff.line.me/${env.LIFF_ID}`;
    messages = [
      { type: 'text', text: 'かしこまりました。\nご予約フォームをこちらでお開きします。' },
      {
        type: 'text',
        text: `▼ ご予約はこちらから\n${liffUrl}\n\n所要 30 秒で完了します。`,
      },
    ];
  } else if (menu === 'rooms') {
    messages = [
      { type: 'text', text: '客室とプランをお送りします。' },
      roomsFlex(),
      { type: 'text', text: '気になる部屋があれば「予約する」 から日付を入れてください。' },
    ];
  } else if (menu === 'access') {
    messages = [
      { type: 'text', text: '道順をお送りします。' },
      accessFlex(),
      {
        type: 'location',
        title: '荒島旅舎',
        address: '福井県大野市 元町 8-17',
        latitude: 35.9787,
        longitude: 136.4866,
      },
    ];
  } else if (menu === 'changes') {
    const snap = await db.collection('reservations')
      .where('lineUserId', '==', lineUserId)
      .where('status', 'in', ['pending', 'confirmed'])
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();
    if (snap.empty) {
      messages = [
        { type: 'text', text: '現在、お客様のご予約は登録されていません。\n新しいご予約は「予約する」 からお手続きください。' },
      ];
    } else {
      const resList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      messages = [
        { type: 'text', text: 'お客様の現在のご予約は以下のとおりです。' },
        changesFlex(resList),
        { type: 'text', text: '変更・キャンセルは「予約する」 からお手続きいただけます。\n3 日前まで無料 / 前日 50% / 当日 100%。' },
      ];
    }
  } else if (menu === 'facility') {
    messages = [
      { type: 'text', text: '館内のご案内です。\n共用部はチェックイン中 24 時間ご利用いただけます。' },
      facilityFlex(),
    ];
  } else if (menu === 'contact') {
    messages = [
      { type: 'text', text: 'お問い合わせ内容を、このトークに直接ご記入ください。\n受付 9:00-21:00 / 通常 1 時間以内に返信いたします。' },
    ];
    // オーナーにエスカレ通知 (push)
    if (env.OWNER_LINE_USER_ID) {
      await lineClient.pushMessage(env.OWNER_LINE_USER_ID, [
        { type: 'text', text: `お問い合わせをいただきました (userId: ${lineUserId.slice(0, 12)}...)。\n返信をお願いします。` },
      ]).catch(() => {});
    }
  } else {
    messages = [{ type: 'text', text: 'メニューからお選びください。' }];
  }

  await lineClient.replyMessage(event.replyToken, messages);

  await db.collection('ops_logs').add({
    ts: new Date(),
    level: 'info',
    source: 'webhook',
    event: 'postback',
    payload: { menu },
    lineUserId,
  });
};

function parse(qs) {
  const obj = {};
  qs.split('&').forEach((p) => {
    const [k, v] = p.split('=');
    obj[k] = decodeURIComponent(v || '');
  });
  return obj;
}
