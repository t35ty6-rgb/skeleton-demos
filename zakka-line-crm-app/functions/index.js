/**
 * 雑貨LINEツール - Cloud Functions 雛形
 *
 * 商談後 Firebase Functions に deploy する想定の SSOT。
 * 現時点 (デモフェーズ) は localStorage 駆動のため、ここは呼び出されない。
 * 本番化フローでフラグを切替えると、admin/customer の Repo がこれらの API を叩くようになる。
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

// ─── LINE Messaging API webhook ────────────────────────────────
exports.lineWebhook = functions.https.onRequest(async (req, res) => {
  const tenantId = req.query.tenant;
  if (!tenantId) return res.status(400).send('tenant required');

  const settings = (await db.doc(`tenants/${tenantId}`).get()).data();
  if (!settings?.line?.channelSecret) return res.status(404).send('tenant not configured');

  // 署名検証
  const signature = req.get('x-line-signature');
  const expected = crypto
    .createHmac('sha256', settings.line.channelSecret)
    .update(JSON.stringify(req.body))
    .digest('base64');
  if (signature !== expected) return res.status(401).send('invalid signature');

  for (const ev of (req.body.events || [])) {
    try {
      await handleLineEvent(tenantId, ev, settings);
    } catch (e) {
      console.error('event handler error', e);
    }
  }
  res.status(200).send('OK');
});

async function handleLineEvent(tenantId, ev, settings) {
  const userId = ev.source?.userId;
  if (!userId) return;

  if (ev.type === 'follow') {
    // 友だち追加 → カルテ自動発行
    const profile = await fetchLineProfile(userId, settings.line.channelAccessToken);
    const customerId = `c_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    await db.doc(`tenants/${tenantId}/customers/${customerId}`).set({
      id: customerId,
      lineUserId: userId,
      displayName: profile.displayName || '',
      realName: profile.displayName || '',
      ltv: 0, visits: 0, points: 0, tags: ['new'],
      createdAt: now, updatedAt: now,
    });
    await pushLine(userId, settings.line.channelAccessToken, [{
      type: 'text',
      text: `${profile.displayName} さま\n${settings.tenantName} です。お友だち追加ありがとうございます。次のご来店時にスタッフに「LINE登録しました」とお声がけいただくと、ポイントカードが発行されます。`
    }]);
  }

  if (ev.type === 'message' && ev.message?.type === 'text') {
    // 顧客からのテキスト → スタッフ通知 (admin にリアルタイム表示)
    const snap = await db.collection(`tenants/${tenantId}/customers`).where('lineUserId', '==', userId).limit(1).get();
    if (snap.empty) return;
    const customerId = snap.docs[0].id;
    await db.collection(`tenants/${tenantId}/messages`).add({
      customerId, direction: 'in', kind: 'manual',
      text: ev.message.text,
      sentAt: new Date().toISOString(),
      status: 'unread',
    });
  }
}

// ─── 購入記録 ───────────────────────────────────
exports.recordPurchase = functions.https.onCall(async (data, ctx) => {
  if (!ctx.auth) throw new functions.https.HttpsError('unauthenticated', '要ログイン');
  const { tenantId, customerId, lines, paymentMethod, pointsUsed, isGift, note } = data;
  // TODO: staff role check
  // ... (admin SDK でトランザクション)
  return { success: true };
});

// ─── 自動配信: 誕生月クーポン (毎朝9時 JST) ─────────────
exports.dailyBirthCoupon = functions.pubsub
  .schedule('every day 09:00')
  .timeZone('Asia/Tokyo')
  .onRun(async () => {
    const tenants = await db.collection('tenants').get();
    for (const tDoc of tenants.docs) {
      const t = tDoc.data();
      const month = new Date().getMonth() + 1;
      const customers = await db.collection(`tenants/${tDoc.id}/customers`).get();
      for (const cDoc of customers.docs) {
        const c = cDoc.data();
        if (!c.birthdate) continue;
        if (parseInt(c.birthdate.slice(5, 7)) !== month) continue;
        const todayStr = new Date().toISOString().slice(0, 10);
        if (c.birthdate.slice(5, 10) !== todayStr.slice(5, 10) && new Date().getDate() !== 1) continue;
        if (!c.lineUserId || !t.line?.channelAccessToken) continue;
        await pushLine(c.lineUserId, t.line.channelAccessToken, [{
          type: 'text',
          text: `${c.realName || c.displayName} さま、お誕生月おめでとうございます。10%OFFクーポンをご利用いただけます。期限: 今月末まで。`
        }]);
        // クーポン発行
        await db.collection(`tenants/${tDoc.id}/coupons`).add({
          code: `BIRTH${todayStr.replace(/-/g,'')}`,
          label: '誕生月10%OFF', kind: 'percent', value: 10,
          customerIds: [cDoc.id],
          expireAt: lastDayOfMonth().toISOString().slice(0, 10),
          used: false, createdAt: new Date().toISOString(),
        });
      }
    }
  });

// ─── 自動配信: 休眠掘り起こし (毎週月曜) ─────────────────
exports.weeklyRevival = functions.pubsub
  .schedule('every monday 09:00')
  .timeZone('Asia/Tokyo')
  .onRun(async () => {
    const tenants = await db.collection('tenants').get();
    const now = Date.now();
    for (const tDoc of tenants.docs) {
      const t = tDoc.data();
      if (!t.line?.channelAccessToken) continue;
      const customers = await db.collection(`tenants/${tDoc.id}/customers`).get();
      for (const cDoc of customers.docs) {
        const c = cDoc.data();
        if (!c.lastVisitAt) continue;
        const days = Math.floor((now - new Date(c.lastVisitAt)) / 86400000);
        if (days < 90 || days > 95) continue; // 90日経過直後のみ
        if (!c.lineUserId) continue;
        await pushLine(c.lineUserId, t.line.channelAccessToken, [{
          type: 'text',
          text: `${c.realName || c.displayName} さま、お元気ですか。最近お会いできていないので、近くお寄りいただけたら嬉しいです。— ${t.tenantName}`
        }]);
      }
    }
  });

// ─── LINE Profile fetch ──────────────────────────
async function fetchLineProfile(userId, accessToken) {
  const r = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return r.ok ? r.json() : { displayName: 'お客さま' };
}

// ─── LINE Push ────────────────────────────────────
async function pushLine(userId, accessToken, messages) {
  const r = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: userId, messages }),
  });
  if (!r.ok) console.error('LINE push failed', await r.text());
}

function lastDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
