// 荒島ホテル Cloud Functions エントリーポイント

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();

// LINE 認証情報を secret から読む
const { defineSecret } = require('firebase-functions/params');
const LINE_CHANNEL_SECRET = defineSecret('LINE_CHANNEL_SECRET');
const LINE_CHANNEL_ACCESS_TOKEN = defineSecret('LINE_CHANNEL_ACCESS_TOKEN');

// secrets を process.env に流す helper (defineSecret は実行時に取得)
function setupEnv(secrets) {
  secrets.forEach(s => { process.env[s.name] = s.value(); });
}

// ============ Webhook ============
const functions = require('firebase-functions/v2/https');
const express = require('express');
const line = require('@line/bot-sdk');

const followHandler = require('./handlers/follow');
const postbackHandler = require('./handlers/postback');
const messageHandler = require('./handlers/message');

exports.webhook = functions.onRequest(
  { region: 'asia-northeast1', memory: '512MiB', secrets: [LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN] },
  async (req, res) => {
    setupEnv([LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN]);
    const cfg = {
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      channelSecret: process.env.LINE_CHANNEL_SECRET,
    };
    const lineClient = new line.Client(cfg);
    const db = admin.firestore();
    const ctx = { lineClient, db, env: process.env };

    if (req.method === 'GET' && req.path === '/health') {
      return res.json({ ok: true, ts: Date.now() });
    }

    // 簡易 LINE 署名検証
    const sig = req.headers['x-line-signature'];
    if (!sig) return res.status(400).send('missing signature');

    try {
      const events = req.body.events || [];
      await Promise.all(events.map((event) => dispatch(event, ctx)));
      res.status(200).end();
    } catch (err) {
      console.error('webhook error', err);
      res.status(500).end();
    }
  }
);

async function dispatch(event, ctx) {
  switch (event.type) {
    case 'follow': return require('./handlers/follow')(event, ctx);
    case 'postback': return require('./handlers/postback')(event, ctx);
    case 'message':
      if (event.message.type === 'text') return require('./handlers/message')(event, ctx);
      return;
    default: return;
  }
}

// ============ ownerNotify trigger ============
const ownerNotify = require('./ownerNotify');
exports.onReservationCreated = ownerNotify.onReservationCreated;
exports.onReservationUpdated = ownerNotify.onReservationUpdated;

// ============ reminder cron ============
const reminderCron = require('./reminderCron');
exports.preCheckinReminder = reminderCron.preCheckinReminder;
exports.arrivalReminder = reminderCron.arrivalReminder;
exports.markCompleted = reminderCron.markCompleted;

// ============ LIFF auth + admin push ============
const liffAuth = require('./liffAuth');
exports.liffAuth = liffAuth.liffAuth;
exports.adminPush = liffAuth.adminPush;
