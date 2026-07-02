/**
 * API facade — local / firebase モード共通の 業務アクション
 *
 * 「単純な CRUD」 は shared/data.js の db を直接使う。
 * 「LINE push / 決済リンク発行 / セグメント配信」 のような
 * サーバー側処理が必要なアクションだけ ここに集約する。
 *
 * localモードでは 直書き + トースト、 firebaseモードでは Cloud Functions 経由。
 */

import { db, uid, session } from './data.js';
import { getConfig } from './config.js';

async function callFunction(name, payload, opts = {}) {
  const { callFunction: cf } = await import('./firebase-adapter.js');
  return cf(name, payload, opts);
}

/** LIFF 経由の Cloud Functions 呼び出し用に IDToken を取得 */
function liffToken() {
  return (window.liff && window.liff.isLoggedIn && window.liff.isLoggedIn())
    ? window.liff.getIDToken()
    : null;
}

/**
 * 訪問販売員 受注 (LINE決済リンク付き)
 */
export async function writeOrder({ customerId, repId, items, paymentMethod = 'linepay', channel = 'visit' }) {
  const total = items.reduce((s, i) => s + (i.price|0) * (i.qty|0), 0);
  const cfg = getConfig();
  if (cfg.backend === 'firebase') {
    return callFunction('recordOrder', { customerId, repId, items, paymentMethod, channel });
  }
  // local
  const oid = uid('ord');
  const order = {
    id: oid, customerId, repId, channel,
    items, total, paymentMethod, status: 'shipped', createdAt: Date.now(),
  };
  await db.set('orders', oid, order);
  const c = await db.get('customers', customerId);
  if (c) await db.update('customers', customerId, {
    orderCount: (c.orderCount || 0) + 1,
    ltv: (c.ltv || 0) + total,
    lastVisitAt: Date.now(),
  });
  // ローカルの LINE メッセージも記録
  const mid = uid('msg');
  await db.set('messages', mid, {
    id: mid, customerId, direction: 'incoming', repId,
    body: `本日のご注文 ${total.toLocaleString('ja-JP')}円 の決済リンクをお送りします。`,
    createdAt: Date.now(),
  });
  return { ok: true, orderId: oid };
}

/**
 * 販売員 → 顧客 直接メッセージ (LINE push)
 */
export async function sendDirect({ customerId, body, repId }) {
  const cfg = getConfig();
  if (cfg.backend === 'firebase') {
    return callFunction('directPush', { customerId, body });
  }
  const mid = uid('msg');
  await db.set('messages', mid, {
    id: mid, customerId, direction: 'incoming', repId, body, createdAt: Date.now(),
  });
  return { ok: true, messageId: mid };
}

/**
 * セグメント配信 (LINE multicast)
 */
export async function sendBroadcast({ title, body, segmentTags = [] }) {
  const cfg = getConfig();
  if (cfg.backend === 'firebase') {
    return callFunction('broadcastSend', { title, body, segmentTags });
  }
  const bid = uid('bc');
  await db.set('broadcasts', bid, {
    id: bid, kind: 'manual', title: title || '手動配信',
    segment: segmentTags, targetCount: 0,
    bodyPreview: (body || '').slice(0, 200),
    sentAt: Date.now(),
    openRate: 30 + Math.random() * 25,
    clickRate: 4 + Math.random() * 10,
  });
  return { ok: true, broadcastId: bid };
}

/**
 * 顧客 (LIFF) → Stripe Checkout Session 作成
 * @returns { url } リダイレクト先
 */
export async function createCheckout({ customerId, items, subscription = false }) {
  const cfg = getConfig();
  if (cfg.backend === 'firebase') {
    // productId + qty のみを送る (price はサーバー側 Firestore lookup)
    const trimmed = items.map(i => ({ productId: i.productId, qty: i.qty }));
    return callFunction('createCheckout', { items: trimmed, subscription }, { liffIdToken: liffToken() });
  }
  const oid = uid('ord');
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  await db.set('orders', oid, {
    id: oid, customerId, channel: 'line', items, total,
    subscription: !!subscription,
    status: 'shipped', createdAt: Date.now(),
  });
  const c = await db.get('customers', customerId);
  if (c) await db.update('customers', customerId, {
    orderCount: (c.orderCount || 0) + 1,
    ltv: (c.ltv || 0) + total,
  });
  // 定期便として申込 = 同時に subscription も作成
  if (subscription) {
    const first = items[0];
    if (first?.productId) {
      const sid = uid('sub');
      await db.set('subscriptions', sid, {
        id: sid, customerId, productId: first.productId, qty: first.qty || 1,
        cycleDays: 30, nextDeliveryAt: Date.now() + 30 * 86400000,
        status: 'active', createdAt: Date.now(),
        repId: c?.repId || null,
      });
    }
  }
  return { ok: true, orderId: oid, url: null };
}

/**
 * LIFF 経由の 顧客紐付け (?ref=販売員ID)
 */
export async function bindLineCustomer({ displayName, ref }) {
  const cfg = getConfig();
  if (cfg.backend !== 'firebase') return null;
  const r = await callFunction('bindLineUser', { displayName, ref }, { liffIdToken: liffToken() });
  if (r?.customerId) session.customerId = r.customerId;
  return r;
}

/** LIFF 顧客 が自分のデータ一式を取得 */
export async function fetchCustomerBundle() {
  const cfg = getConfig();
  if (cfg.backend !== 'firebase') return null;
  return callFunction('getCustomerBundle', {}, { liffIdToken: liffToken() });
}

/** LIFF 顧客 が自分の定期便を skip/pause/stop/resume */
export async function updateSubscription({ subscriptionId, action }) {
  const cfg = getConfig();
  if (cfg.backend === 'firebase') {
    return callFunction('updateSubscription', { subscriptionId, action }, { liffIdToken: liffToken() });
  }
  const s = await db.get('subscriptions', subscriptionId);
  if (!s) throw new Error('定期便が見つかりません');
  const patch = { updatedAt: Date.now() };
  if (action === 'pause')  patch.status = 'paused';
  else if (action === 'stop')   patch.status = 'stopped';
  else if (action === 'resume') patch.status = 'active';
  else if (action === 'skip')   patch.nextDeliveryAt = (s.nextDeliveryAt || Date.now()) + (s.cycleDays || 30) * 86400000;
  await db.update('subscriptions', subscriptionId, patch);
  return { ok: true };
}

/** LIFF 顧客 → 販売員 テキスト送信 */
export async function customerReply({ body }) {
  const cfg = getConfig();
  if (cfg.backend === 'firebase') {
    return callFunction('customerReply', { body }, { liffIdToken: liffToken() });
  }
  const cid = session.customerId;
  const mid = uid('msg');
  await db.set('messages', mid, {
    id: mid, customerId: cid, direction: 'outgoing', body, createdAt: Date.now(),
  });
  return { ok: true, messageId: mid };
}
