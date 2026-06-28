/**
 * 荒島ホテル LINE 公式アカウント Webhook
 *
 * Cloud Functions v2 (HTTP) で動作。
 * LINE Messaging API からのイベントを受け取り:
 *   - follow         : 友だち追加時の挨拶 + LIFF URL 提示
 *   - postback       : リッチメニュー6マスの分岐処理
 *   - message (text) : フリーメッセージへの応答 (キーワード判定 + フォールバック)
 *
 * Cloud Functions に deploy する想定:
 *   firebase deploy --only functions:webhook
 *
 * Webhook URL は LINE Developers Console の Messaging API 設定で登録する。
 */

require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const admin = require('firebase-admin');
const functions = require('firebase-functions/v2/https');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const lineClient = new line.Client(lineConfig);

const followHandler = require('./handlers/follow');
const postbackHandler = require('./handlers/postback');
const messageHandler = require('./handlers/message');

const ctx = { lineClient, db, env: process.env };

const app = express();

// LINE は署名検証のために raw body を必要とする
app.post('/', line.middleware(lineConfig), async (req, res) => {
  try {
    await Promise.all((req.body.events || []).map((event) => dispatch(event, ctx)));
    res.status(200).end();
  } catch (err) {
    console.error('webhook error', err);
    await logOps('error', 'webhook', 'dispatch_failed', { error: err.message });
    res.status(500).end();
  }
});

// 健康診断 (Cloud Scheduler から叩く / daily-audit 連携)
app.get('/health', async (_req, res) => {
  try {
    await db.collection('ops_state').doc('owner').get();
    res.json({ ok: true, ts: Date.now() });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

async function dispatch(event, ctx) {
  switch (event.type) {
    case 'follow':
      return followHandler(event, ctx);
    case 'postback':
      return postbackHandler(event, ctx);
    case 'message':
      if (event.message.type === 'text') return messageHandler(event, ctx);
      return;
    case 'unfollow':
      await logOps('info', 'webhook', 'unfollow', { lineUserId: event.source.userId });
      return;
    default:
      return;
  }
}

async function logOps(level, source, eventName, payload) {
  try {
    await db.collection('ops_logs').add({
      ts: admin.firestore.FieldValue.serverTimestamp(),
      level,
      source,
      event: eventName,
      payload,
    });
  } catch (_) {}
}

exports.webhook = functions.onRequest({ region: 'asia-northeast1', memory: '512MiB' }, app);
