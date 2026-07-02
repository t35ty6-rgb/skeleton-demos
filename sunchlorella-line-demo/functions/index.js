/**
 * サン・クロレラ 統合LINE OS — Cloud Functions (Firebase v2)
 *
 * multi-tenant 前提。 テナント別 collection: `sunchlorella_tenants/{tenantId}/…`
 *
 * 提供 API (Hosting rewrite で `/api/*` にマッピング):
 *   POST /api/setupTenant      新規テナント作成 + 初期管理者アカウント
 *   POST /api/setTenantConfig  テナント設定更新 (LINE / Stripe 資格情報など)
 *   POST /api/recordOrder      訪問販売員の受注確定 (顧客集計+LINE通知+決済リンク)
 *   POST /api/bindLineUser     LIFF profile.userId ⇔ customer 紐付け (?ref=販売員ID)
 *   POST /api/createCheckout   Stripe Checkout Session (LIFF EC / 定期便)
 *   POST /api/broadcastSend    セグメント配信 (LINE Messaging API push)
 *   POST /api/directPush       顧客1名にLINE push (販売員の1:1メッセージ)
 *   POST /api/getStats         KPI+チャネル別売上+販売員ランキング取得
 *   GET  /api/health           疎通確認
 *
 * イベント駆動:
 *   POST /api/lineWebhook?tenant={id}   LINE公式アカウント webhook (署名検証 + 友達追加)
 *   POST /api/stripeWebhook             Stripe webhook (checkout/subscription)
 *
 * 定期 (毎朝 07:00 JST):
 *   dailyRoutine  誕生月クーポン / 定期便お届け3日前リマインド / 休眠60日 掘り起こし
 */

const { onRequest }  = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin  = require('firebase-admin');
const crypto = require('crypto');

setGlobalOptions({ region: 'asia-northeast1', memory: '512MiB', maxInstances: 20 });

const STRIPE_SECRET_KEY     = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const SUPER_SECRET          = defineSecret('SUPER_SECRET');
const LIFF_CHANNEL_ID       = defineSecret('LIFF_CHANNEL_ID');

admin.initializeApp();
const db   = admin.firestore();
const auth = admin.auth();

const PREFIX = 'sunchlorella_tenants';
const tenantPath = (tid, col, id) => id ? `${PREFIX}/${tid}/${col}/${id}` : `${PREFIX}/${tid}/${col}`;

/* ─────────────────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────────────────── */
function cors(req, res) {
  res.set('Access-Control-Allow-Origin',  '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return true; }
  return false;
}
function fail(res, code, error, extra = {}) {
  return res.status(code).json({ error, ...extra });
}
async function verifyIdToken(req) {
  const h = req.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/);
  if (!m) return null;
  try { return await auth.verifyIdToken(m[1]); }
  catch { return null; }
}
async function requireAdmin(req, res) {
  const claims = await verifyIdToken(req);
  if (!claims) { fail(res, 401, '要ログイン'); return null; }
  if (claims.role !== 'admin' && !claims.superadmin) { fail(res, 403, '管理者権限が必要です'); return null; }
  return claims;
}
async function requireAdminOrRep(req, res) {
  const claims = await verifyIdToken(req);
  if (!claims) { fail(res, 401, '要ログイン'); return null; }
  if (!['admin', 'rep'].includes(claims.role) && !claims.superadmin) { fail(res, 403, '権限不足'); return null; }
  return claims;
}
async function tenantSettings(tid) {
  const snap = await db.doc(`${PREFIX}/${tid}`).get();
  return snap.exists ? snap.data() : null;
}
async function upsertTenant(tid, patch) {
  await db.doc(`${PREFIX}/${tid}`).set({ ...patch, id: tid, updatedAt: Date.now() }, { merge: true });
}

/* LINE API helpers */
async function lineFetchProfile(userId, accessToken) {
  const r = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return r.ok ? r.json() : { displayName: 'お客さま' };
}
async function linePush(to, accessToken, messages) {
  const r = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, messages }),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => '');
    console.error('LINE push failed', r.status, err);
    return { ok: false, status: r.status, error: err };
  }
  return { ok: true };
}
async function lineMulticast(to, accessToken, messages) {
  const chunks = [];
  for (let i = 0; i < to.length; i += 500) chunks.push(to.slice(i, i + 500));
  for (const chunk of chunks) {
    const r = await fetch('https://api.line.me/v2/bot/message/multicast', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: chunk, messages }),
    });
    if (!r.ok) console.error('LINE multicast failed', r.status, await r.text().catch(() => ''));
  }
}

/* ─────────────────────────────────────────────────────────
 * 1. Health
 * ───────────────────────────────────────────────────────── */
exports.health = onRequest(async (req, res) => {
  if (cors(req, res)) return;
  return res.json({ ok: true, service: 'sunchlorella-line-os', ts: Date.now() });
});

/* ─────────────────────────────────────────────────────────
 * 2. setupTenant — 新規テナント作成 + 管理者アカウント
 *    リクエスト: { tenantId, tenantName, adminEmail, adminPassword, superSecret }
 *    superSecret はプロジェクト管理者 (Skeleton側) のみ知る値
 * ───────────────────────────────────────────────────────── */
exports.setupTenant = onRequest({ secrets: [SUPER_SECRET] }, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'POSTのみ対応');
  const { tenantId, tenantName, adminEmail, adminPassword, superSecret } = req.body || {};
  if (!tenantId || !tenantName || !adminEmail || !adminPassword) {
    return fail(res, 400, 'tenantId / tenantName / adminEmail / adminPassword 必須');
  }
  const expected = SUPER_SECRET.value();
  if (!expected) return fail(res, 500, 'SUPER_SECRET未設定');
  if (superSecret !== expected) return fail(res, 403, '認証エラー');
  if (!/^[a-z0-9\-]{3,32}$/.test(tenantId)) return fail(res, 400, 'tenantId 形式が不正 (英小数字ハイフンのみ 3〜32文字)');

  const existing = await db.doc(`${PREFIX}/${tenantId}`).get();
  if (existing.exists) return fail(res, 409, 'すでに存在するテナントです');

  await upsertTenant(tenantId, {
    tenantName,
    createdAt: Date.now(),
    line: { channelSecret: '', channelAccessToken: '' },
    stripe: { enabled: false },
    branding: { displayName: tenantName },
    autoBroadcast: { birthMonth: true, subscriptionReminder: true, dormant60: true },
  });

  let userRecord;
  try {
    userRecord = await auth.createUser({ email: adminEmail, password: adminPassword, displayName: tenantName + ' 管理者' });
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      userRecord = await auth.getUserByEmail(adminEmail);
    } else throw e;
  }
  await auth.setCustomUserClaims(userRecord.uid, { role: 'admin', tenantId });
  await db.doc(tenantPath(tenantId, 'users', userRecord.uid)).set({
    id: userRecord.uid, email: adminEmail, role: 'admin', createdAt: Date.now(),
  });

  return res.json({ ok: true, tenantId, adminUid: userRecord.uid });
});

/* ─────────────────────────────────────────────────────────
 * 3. setTenantConfig — LINE/Stripe/自動配信 の設定を更新
 * ───────────────────────────────────────────────────────── */
exports.setTenantConfig = onRequest(async (req, res) => {
  if (cors(req, res)) return;
  const claims = await requireAdmin(req, res);
  if (!claims) return;
  const patch = req.body || {};
  if (!patch || typeof patch !== 'object') return fail(res, 400, 'JSON本文必須');
  await upsertTenant(claims.tenantId, patch);
  return res.json({ ok: true });
});

/* ─────────────────────────────────────────────────────────
 * 4. LINE Webhook
 *   POST /api/lineWebhook?tenant={id}
 *   署名検証 + follow/message/unfollow を処理
 * ───────────────────────────────────────────────────────── */
exports.lineWebhook = onRequest(async (req, res) => {
  if (cors(req, res)) return;
  const tid = req.query.tenant || req.get('x-tenant');
  if (!tid) return fail(res, 400, 'tenant 必須');
  const t = await tenantSettings(tid);
  if (!t?.line?.channelSecret) return fail(res, 404, 'テナント未設定');

  if (!req.rawBody) return fail(res, 400, 'rawBody missing (署名検証不能)');
  const expected = crypto.createHmac('sha256', t.line.channelSecret).update(req.rawBody).digest('base64');
  if (req.get('x-line-signature') !== expected) return fail(res, 401, '署名不一致');

  for (const ev of (req.body.events || [])) {
    try { await handleLineEvent(tid, ev, t); }
    catch (e) { console.error('LINE event handler error', e); }
  }
  return res.status(200).send('OK');
});

async function handleLineEvent(tid, ev, t) {
  const userId = ev.source?.userId;
  if (!userId) return;
  const tok = t.line.channelAccessToken;

  if (ev.type === 'follow') {
    const profile = await lineFetchProfile(userId, tok);
    // ?ref=rep_xxx で来た友達追加パラメータを拾う (連携先: LIFF welcome page)
    const cid = 'c_' + crypto.randomBytes(6).toString('hex');
    await db.doc(tenantPath(tid, 'customers', cid)).set({
      id: cid, lineUserId: userId,
      name: profile.displayName || 'お客さま',
      displayName: profile.displayName || '',
      createdAt: Date.now(),
      lastVisitAt: null,
      orderCount: 0, ltv: 0,
      tags: ['new'],
      note: '',
    });
    await linePush(userId, tok, [{
      type: 'text',
      text: `${profile.displayName || 'お客さま'} さま\n${t.branding?.displayName || t.tenantName} です。 お友だち追加ありがとうございます。 担当より改めてご連絡いたします。`,
    }]);
    return;
  }

  if (ev.type === 'message' && ev.message?.type === 'text') {
    const snap = await db.collection(tenantPath(tid, 'customers'))
      .where('lineUserId', '==', userId).limit(1).get();
    if (snap.empty) return;
    const cid = snap.docs[0].id;
    const mid = 'msg_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    await db.doc(tenantPath(tid, 'messages', mid)).set({
      id: mid, customerId: cid, direction: 'outgoing',
      body: ev.message.text, createdAt: Date.now(),
      channel: 'line',
    });
    return;
  }

  if (ev.type === 'unfollow') {
    const snap = await db.collection(tenantPath(tid, 'customers'))
      .where('lineUserId', '==', userId).limit(1).get();
    if (!snap.empty) {
      await db.doc(tenantPath(tid, 'customers', snap.docs[0].id))
        .set({ tags: admin.firestore.FieldValue.arrayUnion('unfollowed'), updatedAt: Date.now() }, { merge: true });
    }
  }
}

/* ─────────────────────────────────────────────────────────
 * 5. bindLineUser — LIFF 側から呼ばれる (?ref=rep_xxx 付き友達追加ログイン)
 *    リクエスト: { lineUserId, displayName, ref (販売員ID) }
 * ───────────────────────────────────────────────────────── */
exports.bindLineUser = onRequest({ secrets: [LIFF_CHANNEL_ID] }, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'POSTのみ対応');
  const tid = req.query.tenant || req.get('x-tenant');
  if (!tid) return fail(res, 400, 'tenant 必須');
  const liff = await verifyLiffToken(req);
  if (!liff) return fail(res, 401, 'LIFF ID Token 必須');
  const lineUserId = liff.lineUserId;
  const { displayName, ref, campaign, utmSource, utmMedium, utmCampaign } = req.body || {};
  const snap = await db.collection(tenantPath(tid, 'customers'))
    .where('lineUserId', '==', lineUserId).limit(1).get();
  let cid;
  const acquisition = campaign ? {
    acquisitionCampaign: campaign,
    acquisitionUtm: { source: utmSource || null, medium: utmMedium || null, campaign: utmCampaign || null },
  } : {};
  if (snap.empty) {
    cid = 'c_' + crypto.randomBytes(6).toString('hex');
    await db.doc(tenantPath(tid, 'customers', cid)).set({
      id: cid, lineUserId, name: displayName || 'お客さま', displayName,
      repId: ref || null,
      createdAt: Date.now(), lastVisitAt: null,
      orderCount: 0, ltv: 0, tags: ['new'],
      note: ref ? `販売員 ${ref} 経由で友だち追加` : '',
      ...acquisition,
    });
    // キャンペーン stats 更新 (新規獲得+1) — 既存 orders/revenue を保持
    if (campaign) {
      const cRef = db.doc(tenantPath(tid, 'campaigns', campaign));
      const cSnap = await cRef.get();
      if (cSnap.exists) {
        const s = cSnap.data().stats || {};
        await cRef.set({
          stats: {
            ...s,
            acquired: (s.acquired || 0) + 1,
            lastAcquiredAt: Date.now(),
          },
        }, { merge: true });
      }
    }
  } else {
    cid = snap.docs[0].id;
    const cur = snap.docs[0].data();
    const patch = { updatedAt: Date.now() };
    // 既存担当が居るなら repId 上書き禁止
    if (!cur.repId && ref) patch.repId = ref;
    // 既存キャンペーンが居るなら 上書き禁止 (最初に獲得したキャンペーンが「acquisition」)
    if (!cur.acquisitionCampaign && campaign) {
      patch.acquisitionCampaign = campaign;
      patch.acquisitionUtm = acquisition.acquisitionUtm;
    }
    if (displayName) patch.displayName = displayName;
    await db.doc(tenantPath(tid, 'customers', cid)).set(patch, { merge: true });
  }
  return res.json({ ok: true, customerId: cid });
});

/* ─────────────────────────────────────────────────────────
 * 6. recordOrder — 訪問販売員のその場受注 (LINE決済リンク送付)
 *    リクエスト: { customerId, items:[{productId,name,price,qty}], paymentMethod }
 *    要 rep or admin
 * ───────────────────────────────────────────────────────── */
exports.recordOrder = onRequest({ secrets: [STRIPE_SECRET_KEY] }, async (req, res) => {
  if (cors(req, res)) return;
  const claims = await requireAdminOrRep(req, res);
  if (!claims) return;
  const tid = claims.tenantId;
  const { customerId, items, paymentMethod = 'linepay', channel = 'visit', attribution = null } = req.body || {};
  if (!customerId || !Array.isArray(items) || !items.length) {
    return fail(res, 400, 'customerId / items 必須');
  }
  const total = items.reduce((s, i) => s + (i.price|0) * (i.qty|0), 0);
  if (total <= 0) return fail(res, 400, '合計金額不正');

  const cSnap = await db.doc(tenantPath(tid, 'customers', customerId)).get();
  if (!cSnap.exists) return fail(res, 404, '顧客が見つかりません');
  const customer = cSnap.data();

  // 受注の attribution — 明示指定がなければ 顧客の 獲得キャンペーン を継承
  const orderAttribution = attribution?.campaign
    ? { campaignId: attribution.campaign, ref: attribution.ref || null, utm: {
        source: attribution.utmSource || null, medium: attribution.utmMedium || null, campaign: attribution.utmCampaign || null,
      } }
    : (customer.acquisitionCampaign ? { campaignId: customer.acquisitionCampaign, source: 'inherited' } : null);

  const oid = 'ord_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
  const order = {
    id: oid, customerId, repId: claims.role === 'rep' ? claims.repId : (req.body.repId || null),
    channel, items, total, paymentMethod, status: 'pending_payment',
    createdAt: Date.now(),
    ...(orderAttribution ? { attribution: orderAttribution } : {}),
  };
  await db.doc(tenantPath(tid, 'orders', oid)).set(order);

  // キャンペーン stats — 売上/受注件数を積む
  if (orderAttribution?.campaignId) {
    const cRef = db.doc(tenantPath(tid, 'campaigns', orderAttribution.campaignId));
    const cs = await cRef.get();
    if (cs.exists) {
      const s = cs.data().stats || {};
      await cRef.set({
        stats: {
          ...s,
          orders: (s.orders || 0) + 1,
          revenue: (s.revenue || 0) + total,
          lastOrderAt: Date.now(),
        },
      }, { merge: true });
    }
  }

  // 顧客サマリ更新
  await db.doc(tenantPath(tid, 'customers', customerId)).set({
    orderCount: (customer.orderCount || 0) + 1,
    ltv: (customer.ltv || 0) + total,
    lastVisitAt: Date.now(),
    updatedAt: Date.now(),
  }, { merge: true });

  // Stripe決済リンク発行 (LINE Pay/Card)
  const t = await tenantSettings(tid);
  let paymentUrl = null;
  if (t?.stripe?.enabled) {
    const Stripe = require('stripe');
    const stripe = new Stripe(STRIPE_SECRET_KEY.value(), { apiVersion: '2024-06-20' });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: paymentMethod === 'linepay' ? ['card'] : ['card'], // LINE Pay統合は要別APIキー
      line_items: items.map(i => ({
        price_data: {
          currency: 'jpy',
          product_data: { name: i.name },
          unit_amount: i.price,
        },
        quantity: i.qty,
      })),
      metadata: { tenantId: tid, orderId: oid, customerId },
      success_url: (t.stripe.successUrl || 'https://line.me') + `?order=${oid}`,
      cancel_url:  (t.stripe.cancelUrl  || 'https://line.me') + `?order=${oid}`,
    });
    paymentUrl = session.url;
    await db.doc(tenantPath(tid, 'orders', oid)).set({ stripeSessionId: session.id, paymentUrl }, { merge: true });
  }

  // LINE 通知
  if (customer.lineUserId && t?.line?.channelAccessToken) {
    const body = paymentUrl
      ? `本日のご注文 ${total.toLocaleString('ja-JP')}円 の決済リンクをお送りします。\n${paymentUrl}`
      : `本日のご注文を承りました。 合計 ${total.toLocaleString('ja-JP')}円\n担当より改めてお届け予定をご案内いたします。`;
    await linePush(customer.lineUserId, t.line.channelAccessToken, [{ type: 'text', text: body }]);
  }

  return res.json({ ok: true, orderId: oid, paymentUrl });
});

/**
 * LIFF ID Token 検証 (顧客端末が本物の LINE user である証明)
 * 参照: https://developers.line.biz/en/reference/liff-server/#verify-liff-token
 * リクエストヘッダ: `x-liff-id-token` に LIFF SDK の `liff.getIDToken()` の値を入れる。
 */
async function verifyLiffToken(req) {
  const token = req.get('x-liff-id-token');
  if (!token) return null;
  const params = new URLSearchParams();
  params.append('id_token', token);
  const channelId = LIFF_CHANNEL_ID.value();
  if (!channelId) return null;
  params.append('client_id', channelId);
  const r = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.sub ? { lineUserId: j.sub, name: j.name || '' } : null;
}

async function findCustomerByLine(tid, lineUserId) {
  const snap = await db.collection(tenantPath(tid, 'customers'))
    .where('lineUserId', '==', lineUserId).limit(1).get();
  return snap.empty ? null : snap.docs[0].data();
}

/* ─────────────────────────────────────────────────────────
 * 7. createCheckout — 顧客(LIFF) からの購入 → Stripe Checkout Session
 *    LIFF ID Token 必須。 リクエストは items:[{productId, qty}] のみ。
 *    価格は Firestore の products/{pid}.price (or subPrice) からサーバー側で lookup。
 * ───────────────────────────────────────────────────────── */
exports.createCheckout = onRequest({ secrets: [STRIPE_SECRET_KEY, LIFF_CHANNEL_ID] }, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'POSTのみ対応');
  const tid = req.query.tenant || req.get('x-tenant');
  if (!tid) return fail(res, 400, 'tenant 必須');
  const liff = await verifyLiffToken(req);
  if (!liff) return fail(res, 401, 'LIFF ID Token 必須');
  const { items, subscription = false, attribution = null } = req.body || {};
  if (!Array.isArray(items) || !items.length) return fail(res, 400, 'items 必須');
  const t = await tenantSettings(tid);
  if (!t?.stripe?.enabled) return fail(res, 400, 'Stripe未設定');
  const customer = await findCustomerByLine(tid, liff.lineUserId);
  if (!customer) return fail(res, 404, '顧客未登録');

  // 受注 attribution — 明示指定がなければ 顧客の 獲得キャンペーン を継承
  const orderAttribution = attribution?.campaign
    ? { campaignId: attribution.campaign, ref: attribution.ref || null, utm: {
        source: attribution.utmSource || null, medium: attribution.utmMedium || null, campaign: attribution.utmCampaign || null,
      } }
    : (customer.acquisitionCampaign ? { campaignId: customer.acquisitionCampaign, source: 'inherited' } : null);

  // ── 商品価格 は必ず Firestore から取得 (クライアント改竄防止) ──
  const line_items = [];
  const resolved = [];
  for (const raw of items) {
    if (!raw.productId || !raw.qty) return fail(res, 400, 'productId/qty 必須');
    const qty = Math.max(1, Math.min(50, raw.qty|0));
    const pSnap = await db.doc(tenantPath(tid, 'products', raw.productId)).get();
    if (!pSnap.exists) return fail(res, 400, `不明な商品: ${raw.productId}`);
    const p = pSnap.data();
    const price = subscription ? (p.subPrice || p.price) : p.price;
    if (!(price > 0)) return fail(res, 400, `商品の価格未設定: ${raw.productId}`);
    line_items.push({
      price_data: {
        currency: 'jpy',
        product_data: { name: p.name },
        unit_amount: price,
        ...(subscription ? { recurring: { interval: 'month', interval_count: 1 } } : {}),
      },
      quantity: qty,
    });
    resolved.push({ productId: raw.productId, name: p.name, price, qty, tag: p.tag });
  }
  const total = resolved.reduce((s, i) => s + i.price * i.qty, 0);

  const Stripe = require('stripe');
  const stripe = new Stripe(STRIPE_SECRET_KEY.value(), { apiVersion: '2024-06-20' });
  const oid = 'ord_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
  const session = await stripe.checkout.sessions.create({
    mode: subscription ? 'subscription' : 'payment',
    payment_method_types: ['card'],
    line_items,
    metadata: { tenantId: tid, orderId: oid, customerId: customer.id, subscription: String(!!subscription) },
    success_url: t.stripe.successUrl || 'https://line.me',
    cancel_url:  t.stripe.cancelUrl  || 'https://line.me',
  });
  await db.doc(tenantPath(tid, 'orders', oid)).set({
    id: oid, customerId: customer.id, repId: customer.repId || null,
    channel: 'line', items: resolved, total,
    subscription: !!subscription,
    stripeSessionId: session.id, paymentUrl: session.url,
    status: 'pending_payment', createdAt: Date.now(),
    ...(orderAttribution ? { attribution: orderAttribution } : {}),
  });
  return res.json({ ok: true, url: session.url, orderId: oid });
});

/* ─────────────────────────────────────────────────────────
 * 8. Stripe webhook (checkout.session.completed 等)
 * ───────────────────────────────────────────────────────── */
exports.stripeWebhook = onRequest({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  const Stripe = require('stripe');
  const stripe = new Stripe(STRIPE_SECRET_KEY.value(), { apiVersion: '2024-06-20' });
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody, req.get('stripe-signature'),
      STRIPE_WEBHOOK_SECRET.value()
    );
  } catch (e) {
    console.error('stripe signature invalid', e.message);
    return res.status(400).send('bad sig');
  }

  // 冪等: 同じ event.id は 1回だけ処理。 create() は既存doc があると ALREADY_EXISTS で throw する
  // ので read-then-write の race を避けられる (Firestore atomic 保証)。
  const evRef = db.doc(`_stripe_events/${event.id}`);
  try {
    await evRef.create({ id: event.id, type: event.type, receivedAt: Date.now() });
  } catch (e) {
    if (e.code === 6 || /already exists/i.test(e.message || '')) {
      return res.status(200).send('OK (dedup)');
    }
    throw e;
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const { tenantId, orderId, customerId, subscription } = s.metadata || {};
    if (!tenantId || !orderId) return res.status(200).send('OK');
    await db.doc(tenantPath(tenantId, 'orders', orderId)).set({
      status: 'paid', paidAt: Date.now(),
      stripePaymentIntent: s.payment_intent,
    }, { merge: true });
    // 顧客集計 (webhook到達後にサーバー側で確定)
    const custDoc = await db.doc(tenantPath(tenantId, 'customers', customerId)).get();
    const cust    = custDoc.exists ? custDoc.data() : null;
    const order   = (await db.doc(tenantPath(tenantId, 'orders', orderId)).get()).data();
    if (cust) {
      await db.doc(tenantPath(tenantId, 'customers', customerId)).set({
        orderCount: (cust.orderCount || 0) + 1,
        ltv: (cust.ltv || 0) + (order?.total || 0),
        lastVisitAt: Date.now(),
      }, { merge: true });
    }
    // キャンペーン stats
    const campaignId = order?.attribution?.campaignId;
    if (campaignId) {
      const cRef = db.doc(tenantPath(tenantId, 'campaigns', campaignId));
      const cs = await cRef.get();
      if (cs.exists) {
        const s = cs.data().stats || {};
        await cRef.set({
          stats: {
            ...s,
            orders: (s.orders || 0) + 1,
            revenue: (s.revenue || 0) + (order?.total || 0),
            lastOrderAt: Date.now(),
          },
        }, { merge: true });
      }
    }

    if (subscription === 'true') {
      const sid = 'sub_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      const order = (await db.doc(tenantPath(tenantId, 'orders', orderId)).get()).data();
      const firstItem = order?.items?.[0] || {};
      await db.doc(tenantPath(tenantId, 'subscriptions', sid)).set({
        id: sid, customerId, orderId,
        productId: firstItem.productId || null,
        qty: firstItem.qty || 1,
        stripeSubscriptionId: s.subscription,
        status: 'active', createdAt: Date.now(),
        nextDeliveryAt: Date.now() + 30 * 86400000,
        cycleDays: 30,
      });
    }
    // LINE通知
    const t = await tenantSettings(tenantId);
    if (t?.line?.channelAccessToken && cust?.lineUserId) {
      await linePush(cust.lineUserId, t.line.channelAccessToken, [{
        type: 'text',
        text: 'ご注文ありがとうございました。 発送準備でき次第お届けいたします。',
      }]);
    }
  }
  return res.status(200).send('OK');
});

/* ─────────────────────────────────────────────────────────
 * 9. broadcastSend — セグメント配信 (LINE multicast)
 *    リクエスト: { title, body, segmentTags:[], flexImageEmoji?, dryRun? }
 * ───────────────────────────────────────────────────────── */
exports.broadcastSend = onRequest(async (req, res) => {
  if (cors(req, res)) return;
  const claims = await requireAdmin(req, res);
  if (!claims) return;
  const tid = claims.tenantId;
  const { title, body, segmentTags = [], dryRun = false } = req.body || {};
  if (!body) return fail(res, 400, 'body 必須');
  const t = await tenantSettings(tid);
  if (!t?.line?.channelAccessToken) return fail(res, 400, 'LINE未設定');

  const custs = await db.collection(tenantPath(tid, 'customers')).get();
  const target = custs.docs.map(d => d.data()).filter(c => {
    if (!c.lineUserId) return false;
    if (c.tags?.includes('unfollowed')) return false;
    if (!segmentTags.length) return true;
    return segmentTags.every(tag => (c.tags || []).includes(tag));
  });

  const bid = 'bc_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
  await db.doc(tenantPath(tid, 'broadcasts', bid)).set({
    id: bid, kind: 'manual', title: title || '手動配信',
    segment: segmentTags, targetCount: target.length,
    bodyPreview: body.slice(0, 200),
    sentAt: Date.now(),
    openRate: 0, clickRate: 0,
    sentBy: claims.uid,
    status: dryRun ? 'draft' : 'sending',
  });

  if (!dryRun) {
    const messages = [{ type: 'text', text: (title ? title + '\n\n' : '') + body }];
    await lineMulticast(target.map(c => c.lineUserId), t.line.channelAccessToken, messages);
    await db.doc(tenantPath(tid, 'broadcasts', bid)).set({ status: 'sent' }, { merge: true });
  }

  return res.json({ ok: true, broadcastId: bid, targetCount: target.length, dryRun: !!dryRun });
});

/* ─────────────────────────────────────────────────────────
 * 10. directPush — 販売員1:1 メッセージ
 * ───────────────────────────────────────────────────────── */
exports.directPush = onRequest(async (req, res) => {
  if (cors(req, res)) return;
  const claims = await requireAdminOrRep(req, res);
  if (!claims) return;
  const tid = claims.tenantId;
  const { customerId, body } = req.body || {};
  if (!customerId || !body) return fail(res, 400, 'customerId/body 必須');
  const t = await tenantSettings(tid);
  const c = (await db.doc(tenantPath(tid, 'customers', customerId)).get()).data();
  if (!c?.lineUserId) return fail(res, 400, '顧客のLINE未紐付け');
  if (!t?.line?.channelAccessToken) return fail(res, 400, 'LINE未設定');
  const r = await linePush(c.lineUserId, t.line.channelAccessToken, [{ type: 'text', text: body }]);
  if (!r.ok) return fail(res, 502, 'LINE送信失敗', { detail: r.error });
  const mid = 'msg_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
  await db.doc(tenantPath(tid, 'messages', mid)).set({
    id: mid, customerId, direction: 'incoming', repId: claims.repId || null,
    body, createdAt: Date.now(),
  });
  return res.json({ ok: true, messageId: mid });
});

/* ─────────────────────────────────────────────────────────
 * 11a. getCustomerBundle — LIFF 顧客が自分の情報一式を取得
 *      x-liff-id-token 必須。 rules で customer 直読み禁止のため 経由必須。
 * ───────────────────────────────────────────────────────── */
exports.getCustomerBundle = onRequest({ secrets: [LIFF_CHANNEL_ID] }, async (req, res) => {
  if (cors(req, res)) return;
  const tid = req.query.tenant || req.get('x-tenant');
  if (!tid) return fail(res, 400, 'tenant 必須');
  const liff = await verifyLiffToken(req);
  if (!liff) return fail(res, 401, 'LIFF ID Token 必須');
  const customer = await findCustomerByLine(tid, liff.lineUserId);
  if (!customer) return fail(res, 404, '顧客未登録');
  const cid = customer.id;
  const [ordersSnap, subsSnap, msgsSnap, prodsSnap, repsSnap, tSnap] = await Promise.all([
    db.collection(tenantPath(tid, 'orders')).where('customerId', '==', cid).orderBy('createdAt', 'desc').limit(50).get(),
    db.collection(tenantPath(tid, 'subscriptions')).where('customerId', '==', cid).get(),
    db.collection(tenantPath(tid, 'messages')).where('customerId', '==', cid).orderBy('createdAt', 'asc').limit(100).get(),
    db.collection(tenantPath(tid, 'products')).get(),
    db.collection(tenantPath(tid, 'reps')).where('status', '==', 'active').get(),
    db.doc(tenantPath(tid, 'settings', 'tenant')).get(),
  ]);
  const rep = customer.repId
    ? (await db.doc(tenantPath(tid, 'reps', customer.repId)).get()).data()
    : null;
  // 販売員は顧客に見せる項目だけ抜粋
  const safeRep = rep ? { id: rep.id, name: rep.name, office: rep.office } : null;
  return res.json({
    ok: true,
    customer: {
      ...customer,
      // 秘匿フィールドは返さない
      note: undefined,
    },
    rep: safeRep,
    orders:        ordersSnap.docs.map(d => d.data()),
    subscriptions: subsSnap.docs.map(d => d.data()),
    messages:      msgsSnap.docs.map(d => d.data()),
    products:      prodsSnap.docs.map(d => d.data()),
    tenant:        tSnap.exists ? tSnap.data() : null,
  });
});

/* ─────────────────────────────────────────────────────────
 * 11b. updateSubscription — LIFF 顧客が自分の定期便を skip/pause/stop
 * ───────────────────────────────────────────────────────── */
exports.updateSubscription = onRequest({ secrets: [LIFF_CHANNEL_ID] }, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'POSTのみ対応');
  const tid = req.query.tenant || req.get('x-tenant');
  if (!tid) return fail(res, 400, 'tenant 必須');
  const liff = await verifyLiffToken(req);
  if (!liff) return fail(res, 401, 'LIFF ID Token 必須');
  const { subscriptionId, action } = req.body || {};
  if (!subscriptionId || !action) return fail(res, 400, 'subscriptionId/action 必須');
  const customer = await findCustomerByLine(tid, liff.lineUserId);
  if (!customer) return fail(res, 404, '顧客未登録');
  const sSnap = await db.doc(tenantPath(tid, 'subscriptions', subscriptionId)).get();
  if (!sSnap.exists) return fail(res, 404, '定期便が見つかりません');
  const s = sSnap.data();
  if (s.customerId !== customer.id) return fail(res, 403, 'この定期便は操作できません');
  const patch = { updatedAt: Date.now() };
  if (action === 'pause')  patch.status = 'paused';
  else if (action === 'stop')   patch.status = 'stopped';
  else if (action === 'resume') patch.status = 'active';
  else if (action === 'skip')   patch.nextDeliveryAt = (s.nextDeliveryAt || Date.now()) + (s.cycleDays || 30) * 86400000;
  else return fail(res, 400, '不明な action');
  await db.doc(tenantPath(tid, 'subscriptions', subscriptionId)).set(patch, { merge: true });
  return res.json({ ok: true });
});

/* ─────────────────────────────────────────────────────────
 * 11c. customerReply — LIFF 顧客からのメッセージ書込
 * ───────────────────────────────────────────────────────── */
exports.customerReply = onRequest({ secrets: [LIFF_CHANNEL_ID] }, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return fail(res, 405, 'POSTのみ対応');
  const tid = req.query.tenant || req.get('x-tenant');
  if (!tid) return fail(res, 400, 'tenant 必須');
  const liff = await verifyLiffToken(req);
  if (!liff) return fail(res, 401, 'LIFF ID Token 必須');
  const { body } = req.body || {};
  if (!body || body.length > 2000) return fail(res, 400, 'body 必須(2000文字以内)');
  const customer = await findCustomerByLine(tid, liff.lineUserId);
  if (!customer) return fail(res, 404, '顧客未登録');
  const mid = 'msg_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
  await db.doc(tenantPath(tid, 'messages', mid)).set({
    id: mid, customerId: customer.id, direction: 'outgoing',
    body, createdAt: Date.now(),
  });
  return res.json({ ok: true, messageId: mid });
});

/* ─────────────────────────────────────────────────────────
 * 12. getStats — 本社ダッシュボード KPI
 * ───────────────────────────────────────────────────────── */
exports.getStats = onRequest(async (req, res) => {
  if (cors(req, res)) return;
  const claims = await requireAdmin(req, res);
  if (!claims) return;
  const tid = claims.tenantId;
  const period = req.query.period || 'month';
  const now = new Date();
  let since;
  if (period === 'day')  since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  else if (period === 'year') since = new Date(now.getFullYear(), 0, 1).getTime();
  else since = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const [ordersSnap, subsSnap, custSnap, repsSnap] = await Promise.all([
    db.collection(tenantPath(tid, 'orders')).where('createdAt', '>=', since).get(),
    db.collection(tenantPath(tid, 'subscriptions')).get(),
    db.collection(tenantPath(tid, 'customers')).get(),
    db.collection(tenantPath(tid, 'reps')).get(),
  ]);
  const orders = ordersSnap.docs.map(d => d.data());
  const subs = subsSnap.docs.map(d => d.data());
  const customers = custSnap.docs.map(d => d.data());
  const reps = repsSnap.docs.map(d => d.data());
  const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const active = subs.filter(s => s.status === 'active').length;
  const total  = subs.length;
  const retention = total ? Math.round((active / total) * 1000) / 10 : 0;
  const byChannel = {};
  orders.forEach(o => { byChannel[o.channel] = (byChannel[o.channel] || 0) + (o.total || 0); });
  const byRep = {};
  reps.forEach(r => byRep[r.id] = { rep: r, revenue: 0, count: 0 });
  orders.forEach(o => { if (o.repId && byRep[o.repId]) { byRep[o.repId].revenue += o.total || 0; byRep[o.repId].count += 1; } });
  return res.json({
    ok: true, period, revenue, retention, byChannel,
    friends: customers.filter(c => c.lineUserId).length,
    byRep: Object.values(byRep).sort((a, b) => b.revenue - a.revenue),
  });
});

/* ─────────────────────────────────────────────────────────
 * 12. dailyRoutine — 毎朝 07:00 JST (誕生月+定期便リマインド+休眠60日)
 * ───────────────────────────────────────────────────────── */
exports.dailyRoutine = onSchedule({ schedule: 'every day 07:00', timeZone: 'Asia/Tokyo' }, async () => {
  const tenants = await db.collection(PREFIX).get();
  for (const tDoc of tenants.docs) {
    const t = tDoc.data();
    const tid = tDoc.id;
    if (!t.line?.channelAccessToken) continue;

    // (a) 誕生月クーポン
    if (t.autoBroadcast?.birthMonth) {
      const month = new Date().getMonth() + 1;
      const cs = await db.collection(tenantPath(tid, 'customers')).get();
      const targets = cs.docs.map(d => d.data()).filter(c =>
        c.lineUserId && c.birthMonth === month && !c._birthCouponSentThisYear
      );
      if (targets.length) {
        const text = `お誕生月おめでとうございます。\nささやかですが、¥1,000クーポン (今月末まで) をお使いいただけます。`;
        await lineMulticast(targets.map(c => c.lineUserId), t.line.channelAccessToken, [{ type: 'text', text }]);
        for (const c of targets) {
          await db.doc(tenantPath(tid, 'customers', c.id))
            .set({ _birthCouponSentThisYear: new Date().getFullYear() }, { merge: true });
        }
      }
    }

    // (b) 定期便お届け3日前
    if (t.autoBroadcast?.subscriptionReminder) {
      const now = Date.now();
      const soon = now + 3 * 86400000;
      const subs = await db.collection(tenantPath(tid, 'subscriptions'))
        .where('status', '==', 'active').get();
      const targets = subs.docs.map(d => d.data()).filter(s => s.nextDeliveryAt <= soon && s.nextDeliveryAt >= now);
      for (const s of targets) {
        const c = (await db.doc(tenantPath(tid, 'customers', s.customerId)).get()).data();
        if (!c?.lineUserId) continue;
        const p = s.productId ? (await db.doc(tenantPath(tid, 'products', s.productId)).get()).data() : null;
        const text = `定期便のお届けが近づいてまいりました。\n商品: ${p?.name || 'ご継続商品'}\n次回お届け予定: ${new Date(s.nextDeliveryAt).toLocaleDateString('ja-JP')}`;
        await linePush(c.lineUserId, t.line.channelAccessToken, [{ type: 'text', text }]);
      }
    }

    // (c) 休眠60日 掘り起こし
    if (t.autoBroadcast?.dormant60) {
      const now = Date.now();
      const cs = await db.collection(tenantPath(tid, 'customers')).get();
      const targets = cs.docs.map(d => d.data()).filter(c => {
        if (!c.lineUserId || !c.lastVisitAt) return false;
        const days = (now - c.lastVisitAt) / 86400000;
        return days >= 60 && days < 61 && !c.tags?.includes('unfollowed');
      });
      if (targets.length) {
        const text = 'ご無沙汰しております。 お元気でお過ごしですか。 担当より改めてご連絡いたします。';
        await lineMulticast(targets.map(c => c.lineUserId), t.line.channelAccessToken, [{ type: 'text', text }]);
      }
    }
  }
});
