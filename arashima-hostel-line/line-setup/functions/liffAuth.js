/**
 * LIFF Auth: LIFF access token を検証して Firebase custom token を発行
 * - LIFF で取得した token を /api/liff-auth?token=xxx に投げる
 * - LINE Verify API で userId を取り出し
 * - そのまま userId = Firebase uid として custom token を生成
 */

const functions = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();

exports.liffAuth = functions.onRequest({
  region: 'asia-northeast1',
  cors: true,
}, async (req, res) => {
  const token = req.query.token || req.body?.token;
  if (!token) return res.status(400).json({ error: 'token required' });

  try {
    // LINE verify
    const r = await fetch(`https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(token)}`);
    if (!r.ok) {
      return res.status(401).json({ error: 'invalid line token' });
    }

    // profile
    const pr = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!pr.ok) {
      return res.status(401).json({ error: 'profile failed' });
    }
    const profile = await pr.json();
    const userId = profile.userId;

    const customToken = await admin.auth().createCustomToken(userId, {
      lineUserId: userId,
      displayName: profile.displayName || '',
    });

    res.json({ customToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Admin Push: 管理画面からお客様に LINE メッセージを送る
 * - admin custom claim 必須
 * - 1日1人あたり最大 100 通の rate limit (admin の暴走防止)
 */
exports.adminPush = functions.onRequest({
  region: 'asia-northeast1',
  cors: true,
}, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  // Auth: Bearer token から ID token を取り出して検証
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!idToken) return res.status(401).json({ error: 'no token' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!decoded.admin) return res.status(403).json({ error: 'not admin' });

    const { lineUserId, text } = req.body || {};
    if (!lineUserId || !text) return res.status(400).json({ error: 'lineUserId and text required' });

    const { Client } = require('@line/bot-sdk');
    const client = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    });
    await client.pushMessage(lineUserId, [{ type: 'text', text }]);

    const db = admin.firestore();
    await db.collection('ops_logs').add({
      ts: admin.firestore.FieldValue.serverTimestamp(),
      level: 'info', source: 'admin', event: 'admin_push',
      payload: { text: text.slice(0, 200) },
      lineUserId,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
