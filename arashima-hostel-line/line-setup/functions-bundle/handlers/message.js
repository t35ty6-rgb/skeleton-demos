/**
 * フリーメッセージ ハンドラ
 * まず staff LINE 紐付け を確認し、 該当スタッフからの メッセージ なら staffMessage に委譲。
 * それ以外は キーワードベース guest 応答。
 */

const staffMessage = require('./staffMessage');

module.exports = async (event, ctx) => {
  const { lineClient, db, env } = ctx;
  const lineUserId = event.source.userId;
  const text = (event.message.text || '').trim();
  const liffUrl = `https://liff.line.me/${env.LIFF_ID}`;

  // ---- スタッフ 判定 (紐付け済 or ペアリング coward 試行) ----
  const staff = await staffMessage.findStaffByLineUserId(db, lineUserId);
  if (staff) {
    // 既に紐付け済みスタッフ: staffMessage に完全委譲
    await staffMessage(event, ctx, staff);
    return;
  }
  // 未紐付け: 6桁 数字 コードなら staffMessage が ペアリング処理、それ以外は false 返す
  const handled = await staffMessage(event, ctx, null);
  if (handled !== false) return;

  let messages = [];

  if (/(予約|よやく|reservation|book)/i.test(text)) {
    messages = [
      { type: 'text', text: 'ご予約はこちらのフォームからどうぞ。' },
      { type: 'text', text: liffUrl },
    ];
  } else if (/(キャンセル|cancel|変更)/i.test(text)) {
    messages = [
      { type: 'text', text: 'ご予約の変更・キャンセルは、下のメニュー「予約変更・キャンセル」からお手続きください。\n直接のご相談はそのままこのトークにご記入ください。' },
    ];
  } else if (/(アクセス|道順|行き方|場所|どこ)/i.test(text)) {
    messages = [
      { type: 'text', text: '福井県大野市 元町 8-17。\nJR 越美北線・越前大野駅から徒歩 12 分です。' },
      {
        type: 'location',
        title: '荒島旅舎',
        address: '福井県大野市 元町 8-17',
        latitude: 35.9787,
        longitude: 136.4866,
      },
    ];
  } else if (/(料金|値段|いくら|price)/i.test(text)) {
    messages = [
      { type: 'text', text: '素泊まり ¥4,000 から (一室一泊)。\n3 泊以上で 15% オフ。詳細は下のメニュー「客室・プラン」からご確認ください。' },
    ];
  } else if (/(空室|空き|空いて|availability)/i.test(text)) {
    messages = [
      { type: 'text', text: '空室確認はご予約フォームから日付を入れていただくのが早いです。' },
      { type: 'text', text: liffUrl },
    ];
  } else if (/(ありがとう|thank|サンキュー)/i.test(text)) {
    messages = [
      { type: 'text', text: 'こちらこそ、ありがとうございます。\nまたのご利用をお待ちしています。' },
    ];
  } else {
    // スタッフ受付メッセージ + オーナー通知
    messages = [
      { type: 'text', text: 'お問い合わせありがとうございます。\n担当者が確認のうえ、通常 1 時間以内にご返信いたします (受付 9:00-21:00)。' },
    ];

    if (env.OWNER_LINE_USER_ID) {
      let displayName = '';
      try {
        const profile = await lineClient.getProfile(lineUserId);
        displayName = profile.displayName || '';
      } catch (_) {}
      await lineClient.pushMessage(env.OWNER_LINE_USER_ID, [
        {
          type: 'text',
          text: `[新規お問い合わせ]\n${displayName || lineUserId.slice(0, 12) + '...'}\n\n「${text.slice(0, 200)}」\n\nLINE Official Account Manager から返信してください。`,
        },
      ]).catch(() => {});
    }
  }

  await lineClient.replyMessage(event.replyToken, messages);

  await db.collection('ops_logs').add({
    ts: new Date(),
    level: 'info',
    source: 'webhook',
    event: 'message_text',
    payload: { text: text.slice(0, 100) },
    lineUserId,
  });
};
