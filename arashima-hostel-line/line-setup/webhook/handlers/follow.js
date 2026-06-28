/**
 * 友だち追加時のハンドラ
 * - ゲスト情報を guests に upsert
 * - 挨拶テキスト + LIFF URL を返信
 * - 一発目の reply token を使う (push ではなく reply で送る)
 */

const admin = require('firebase-admin');

module.exports = async (event, { lineClient, db, env }) => {
  const lineUserId = event.source.userId;

  // プロフィール取得 (失敗してもブロックしない)
  let displayName = '';
  try {
    const profile = await lineClient.getProfile(lineUserId);
    displayName = profile.displayName || '';
  } catch (_) {}

  // guests upsert (初回 / 再フォロー両対応)
  const guestRef = db.collection('guests').doc(lineUserId);
  const snap = await guestRef.get();
  const now = admin.firestore.FieldValue.serverTimestamp();
  if (!snap.exists) {
    await guestRef.set({
      displayName,
      realName: '',
      tel: '',
      totalReservations: 0,
      totalNights: 0,
      isRepeater: false,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  } else {
    await guestRef.update({
      displayName: displayName || snap.data().displayName,
      lastSeenAt: now,
    });
  }

  // 挨拶メッセージ (短く・2通)
  const liffUrl = `https://liff.line.me/${env.LIFF_ID}`;
  const greeting1 = displayName
    ? `${displayName} 様、はじめまして。\n荒島ホテルの公式アカウントです。`
    : 'はじめまして。荒島ホテルの公式アカウントです。';

  const messages = [
    { type: 'text', text: greeting1 },
    {
      type: 'text',
      text: 'ご予約・道順・お問い合わせは、下のメニューからお選びください。\nまずは下の「予約する」をタップ。30秒で完了します。',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'uri',
              label: 'いますぐ予約する',
              uri: liffUrl,
            },
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: '客室を見る',
              data: 'menu=rooms',
              displayText: '客室・プラン',
            },
          },
          {
            type: 'action',
            action: {
              type: 'postback',
              label: 'アクセス',
              data: 'menu=access',
              displayText: 'アクセス',
            },
          },
        ],
      },
    },
  ];

  await lineClient.replyMessage(event.replyToken, messages);

  // ログ
  await db.collection('ops_logs').add({
    ts: now,
    level: 'info',
    source: 'webhook',
    event: 'follow',
    payload: { displayName },
    lineUserId,
  });
};
