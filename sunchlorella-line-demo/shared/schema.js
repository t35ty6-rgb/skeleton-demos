/**
 * サン・クロレラジャパン LINE統合SaaS スキーマ SSOT
 *
 * 1テナント = サン・クロレラジャパン (tenantId: 'sunchlorella')
 * このファイルは rep / customer / admin すべてから import される。
 * フィールド名・enum 値・定数は ここ以外に書かない。
 */

export const TENANT_ID = 'sunchlorella';
export const TENANT_LABEL = 'サン・クロレラジャパン';
export const SCHEMA_VERSION = 1;

/* ─── 販売員 (訪問販売員) ─── */
export const REP_STATUS = {
  ACTIVE:  { id: 'active',  label: '稼働中' },
  LEAVE:   { id: 'leave',   label: '休職中' },
  RETIRED: { id: 'retired', label: '退職' },
};

/* ─── 顧客ランク ─── */
export const CUSTOMER_RANK = {
  A:      { id: 'A',      label: 'A (優良継続)',    color: 'leaf' },
  B:      { id: 'B',      label: 'B (継続)',        color: 'sun' },
  C:      { id: 'C',      label: 'C (新規/単発)',   color: 'ink' },
  DORM:   { id: 'dorm',   label: '休眠',            color: 'alert' },
};

/* ─── セグメントタグ (LSTEP代替の絞り込み軸) ─── */
export const TAG_GROUPS = {
  AGE: {
    label: '年代',
    tags: [
      { id: 'age_50', label: '50代' },
      { id: 'age_60', label: '60代' },
      { id: 'age_70', label: '70代' },
      { id: 'age_80', label: '80代以上' },
    ],
  },
  PRODUCT: {
    label: '主要ご利用商品',
    tags: [
      { id: 'p_a_grain',    label: 'クロレラA 粒' },
      { id: 'p_a_powder',   label: 'クロレラA パウダー' },
      { id: 'p_a_tablet',   label: 'クロレラA タブレット' },
      { id: 'p_drink',      label: 'ドリンク' },
      { id: 'p_wakasa',     label: 'サン・ワカサ' },
      { id: 'p_protein',    label: 'プラントプロテイン' },
      { id: 'p_plasma',     label: 'プラズマローゲン' },
      { id: 'p_agaricus',   label: 'アガリクス' },
      { id: 'p_ukogi',      label: 'エゾウコギ' },
      { id: 'p_astaxanthin',label: 'アスタキサンチン' },
      { id: 'p_cosmetic',   label: '化粧品・ヘアケア' },
    ],
  },
  STATUS: {
    label: 'ご継続状況',
    tags: [
      { id: 's_sub',        label: '定期便継続中' },
      { id: 's_new30',      label: '初回購入から30日以内' },
      { id: 's_sleep60',    label: '休眠 60日以上' },
      { id: 's_birthmonth', label: '誕生月' },
      { id: 's_vip',        label: 'LTV¥100万以上' },
    ],
  },
  REGION: {
    label: '担当営業所',
    tags: [
      { id: 'r_kyoto',    label: '京都本部' },
      { id: 'r_kanto',    label: '関東ブロック' },
      { id: 'r_kansai',   label: '関西ブロック' },
      { id: 'r_chubu',    label: '中部ブロック' },
      { id: 'r_kyushu',   label: '九州ブロック' },
    ],
  },
};

/* ─── 商品カテゴリ ─── */
export const PRODUCT_CATEGORIES = [
  { id: 'chlorella',   label: 'クロレラ' },
  { id: 'plasmalogen', label: 'プラズマローゲン' },
  { id: 'agaricus',    label: 'アガリクス' },
  { id: 'ukogi',       label: 'エゾウコギ' },
  { id: 'astaxanthin', label: 'アスタキサンチン' },
  { id: 'anserine',    label: 'アンセリン' },
  { id: 'cosmetic',    label: '化粧品・ヘアケア' },
];

/* ─── 受注チャネル (この案件の本丸) ─── */
export const CHANNELS = {
  VISIT:  { id: 'visit',  label: '訪問販売', color: 'leaf' },
  LINE:   { id: 'line',   label: 'LINE EC',  color: 'sun' },
  WEB:    { id: 'web',    label: '自社EC',   color: 'earth' },
  PHONE:  { id: 'phone',  label: '電話注文', color: 'ink' },
};

/* ─── 定期便 状態 ─── */
export const SUB_STATUS = {
  ACTIVE:  { id: 'active',  label: 'ご継続中' },
  PAUSED:  { id: 'paused',  label: 'スキップ中' },
  STOPPED: { id: 'stopped', label: '停止' },
};

/* ─── 配信 種別 ─── */
export const BROADCAST_KIND = {
  MANUAL: { id: 'manual', label: '手動セグメント' },
  AUTO_BIRTH:  { id: 'auto_birth',  label: '自動: 誕生月' },
  AUTO_SLEEP:  { id: 'auto_sleep',  label: '自動: 休眠掘り起こし' },
  AUTO_SUB_REMIND: { id: 'auto_sub_remind', label: '自動: 定期便お届け前' },
};

/* ─── ステップ配信シナリオ (LSTEP代替) ─── */
export const SCENARIO_TRIGGER = {
  FRIEND_ADD:    { id: 'friend_add',    label: '友だち追加時' },
  TAG_ADDED:     { id: 'tag_added',     label: 'タグが付いた時' },
  PURCHASE:      { id: 'purchase',      label: '購入時' },
  CAMPAIGN_JOIN: { id: 'campaign_join', label: 'キャンペーン獲得時' },
  MANUAL:        { id: 'manual',        label: '手動起動' },
};

export const SCENARIO_STEP_KIND = {
  WAIT:    { id: 'wait',    label: '⏱ 待機' },
  SEND:    { id: 'send',    label: '💬 メッセージ送信' },
  TAG_ADD: { id: 'tag_add', label: '🏷 タグを追加' },
  TAG_REMOVE: { id: 'tag_remove', label: '✂ タグを剥がす' },
  BRANCH:  { id: 'branch',  label: '🔀 タグで分岐' },
  END:     { id: 'end',     label: '🏁 終了' },
};

/* ─── メッセージ種別 (send step の 拡張) ─── */
export const MESSAGE_KIND = {
  TEXT:      { id: 'text',      label: 'テキスト',         desc: '通常の 平文 メッセージ' },
  IMAGE:     { id: 'image',     label: '画像',             desc: 'URL 指定 の 画像 1枚' },
  FLEX_CARD: { id: 'flex_card', label: 'カード (Flex)',    desc: 'タイトル+本文+画像+ボタン の 単一カード' },
  FLEX_LIST: { id: 'flex_list', label: 'リスト (Flex)',    desc: '複数 商品/情報 の リスト形式' },
  CAROUSEL:  { id: 'carousel',  label: 'カルーセル',       desc: '横 スライド で 複数カード 表示' },
  TEMPLATE:  { id: 'template',  label: 'テンプレート',     desc: '登録済み メッセージテンプレ から 選択' },
};

/* ─── Flex Card テンプレ (Send Step で 使い回し) ─── */
export const FLEX_CARD_PRESETS = {
  PRODUCT: {
    id: 'product',
    label: '商品紹介 カード',
    example: {
      title: 'クロレラ サンフォーム',
      subtitle: '創業50年 の 主力商品',
      imageUrl: 'https://placeholder.com/product.jpg',
      body: '9種類 の アミノ酸 と 葉緑素 が バランス良く 含まれる 総合健康食品。',
      buttons: [
        { label: '詳細 を 見る', action: 'uri', uri: 'https://sunchlorella.kyoto/products/sunform' },
      ],
    },
  },
  COUPON: {
    id: 'coupon',
    label: 'クーポン カード',
    example: {
      title: '¥1,000 クーポン',
      subtitle: '本日 より 7日間 有効',
      body: 'このメッセージ を お会計時 に 販売員 に お見せください。',
      buttons: [
        { label: 'クーポン を 使う', action: 'postback', data: 'action=use_coupon' },
      ],
    },
  },
  BOOKING: {
    id: 'booking',
    label: '訪問予約 カード',
    example: {
      title: '担当販売員 の 訪問予約',
      subtitle: '北野 誠 が お伺い します',
      body: '来週 の ご都合 の 良い 日 を お選び ください。',
      buttons: [
        { label: '予約する', action: 'uri', uri: 'https://liff.line.me/booking' },
      ],
    },
  },
};

export const SCENARIO_STATUS = {
  DRAFT:    { id: 'draft',    label: '下書き' },
  ACTIVE:   { id: 'active',   label: '稼働中' },
  PAUSED:   { id: 'paused',   label: '一時停止' },
  ARCHIVED: { id: 'archived', label: 'アーカイブ' },
};

export const RUN_STATUS = {
  ACTIVE:  { id: 'active',  label: '実行中' },
  DONE:    { id: 'done',    label: '完了' },
  STOPPED: { id: 'stopped', label: '停止' },
  ERROR:   { id: 'error',   label: 'エラー' },
};

/**
 * シナリオ の 次発火時刻を計算 (waitDays + waitHours + waitMinutes を分単位に)
 */
export function stepWaitMillis(step) {
  if (step.kind !== 'wait') return 0;
  const d = (step.waitDays  || 0) * 86400000;
  const h = (step.waitHours || 0) * 3600000;
  const m = (step.waitMinutes || 0) * 60000;
  return d + h + m;
}

/**
 * シナリオ Run の 次ステップを探す。 分岐時 は tag を見て branchYes / branchNo を返す。
 */
export function nextStepIndex(scenario, currentIndex, customerTags = []) {
  const cur = scenario.steps[currentIndex];
  if (!cur) return -1;
  if (cur.kind === 'branch') {
    const has = cur.branchTag && customerTags.includes(cur.branchTag);
    // 分岐は「次のインデックス」ではなく「N ステップ飛ばし」で表現
    // シンプルには「Yes なら次 (+1)、 No なら +2」
    return has ? currentIndex + 1 : currentIndex + 2;
  }
  return currentIndex + 1;
}

/* ─── 公式LINEアカウント (channels) ─── */
export const CHANNEL_KIND = {
  SALES:   { id: 'sales',   label: '営業・受注' },
  CS:      { id: 'cs',      label: 'カスタマーサポート' },
  SUB:     { id: 'sub',     label: '定期便お知らせ' },
  EVENT:   { id: 'event',   label: 'イベント・キャンペーン' },
  MARKETING:{ id: 'marketing', label: 'マーケティング配信' },
  OTHER:   { id: 'other',   label: 'その他' },
};

export const CHANNEL_STATUS = {
  ACTIVE:  { id: 'active',  label: '稼働中' },
  PAUSED:  { id: 'paused',  label: '一時停止' },
  ARCHIVED:{ id: 'archived',label: 'アーカイブ (統合済)' },
};

/* ─── キャンペーン (attribution) ─── */
export const CAMPAIGN_KIND = {
  DEFAULT:  { id: 'default',  label: '通常運用' },
  SPORTS:   { id: 'sports',   label: 'スポーツ協賛 (試合会場)' },
  EXPO:     { id: 'expo',     label: '博覧会・イベント' },
  RETAIL:   { id: 'retail',   label: '実店舗・催事' },
  ADS:      { id: 'ads',      label: '広告 (Web / SNS)' },
  PARTNER:  { id: 'partner',  label: '協業・タイアップ' },
};

export const CAMPAIGN_STATUS = {
  SCHEDULED: { id: 'scheduled', label: '予定' },
  ACTIVE:    { id: 'active',    label: '実施中' },
  ENDED:     { id: 'ended',     label: '終了' },
  PAUSED:    { id: 'paused',    label: '一時停止' },
};

/* ─── 支払方法 ─── */
export const PAYMENT_METHODS = {
  LINEPAY:  { id: 'linepay',  label: 'LINE Pay' },
  CARD:     { id: 'card',     label: 'クレジットカード' },
  COD:      { id: 'cod',      label: '代金引換' },
  BANK:     { id: 'bank',     label: '銀行振込' },
};

/* ─── 訪問記録 種別 ─── */
export const VISIT_KIND = {
  DELIVERY: { id: 'delivery', label: 'お届け' },
  CHECK:    { id: 'check',    label: 'お伺い (体調確認)' },
  NEW:      { id: 'new',      label: '新規訪問' },
  FOLLOWUP: { id: 'followup', label: '未購入フォロー' },
};

/* ─── ヘルパー: 顧客ランク自動判定 ─── */
export function autoRank(customer) {
  const now = Date.now();
  const daysSinceLast = customer.lastVisitAt
    ? Math.floor((now - customer.lastVisitAt) / 86400000) : 9999;
  if (daysSinceLast >= 90) return 'DORM';
  if ((customer.ltv || 0) >= 200000 && daysSinceLast <= 45) return 'A';
  if ((customer.orderCount || 0) >= 3) return 'B';
  return 'C';
}

/* ─── ヘルパー: キャンペーン期間中か判定 ─── */
export function isCampaignActive(campaign, at = Date.now()) {
  if (!campaign) return false;
  if (campaign.status === 'ended' || campaign.status === 'paused') return false;
  if (campaign.startAt && at < campaign.startAt) return false;
  if (campaign.endAt && at > campaign.endAt) return false;
  return true;
}

/* ─── ヘルパー: 「いま流す」べきリッチメニュー ID (試合日はスポーツ、それ以外は default) ─── */
export function currentRichMenuId(campaigns, at = Date.now()) {
  const ordered = [...campaigns].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  for (const c of ordered) {
    if (isCampaignActive(c, at) && c.richMenuId) return { campaignId: c.id, richMenuId: c.richMenuId };
  }
  const def = campaigns.find(c => c.kind === 'default');
  return def?.richMenuId ? { campaignId: def.id, richMenuId: def.richMenuId } : null;
}

/* ─── ヘルパー: 顧客が属するタグ一覧を自動算出 ─── */
export function autoTags(customer, orders = [], subs = []) {
  const tags = new Set();
  const age = customer.age;
  if (age >= 50 && age < 60) tags.add('age_50');
  else if (age >= 60 && age < 70) tags.add('age_60');
  else if (age >= 70 && age < 80) tags.add('age_70');
  else if (age >= 80) tags.add('age_80');
  const office = customer.officeId;
  if (office === 'kyoto')  tags.add('r_kyoto');
  if (office === 'kanto')  tags.add('r_kanto');
  if (office === 'kansai') tags.add('r_kansai');
  if (office === 'chubu')  tags.add('r_chubu');
  if (office === 'kyushu') tags.add('r_kyushu');
  if (subs.some(s => s.customerId === customer.id && s.status === 'active')) tags.add('s_sub');
  const daysSinceLast = customer.lastVisitAt
    ? (Date.now() - customer.lastVisitAt) / 86400000 : 9999;
  if (daysSinceLast >= 60) tags.add('s_sleep60');
  const created = customer.createdAt || 0;
  if ((Date.now() - created) / 86400000 <= 30 && (customer.orderCount || 0) <= 1) tags.add('s_new30');
  const birth = customer.birthMonth;
  if (birth && birth === (new Date().getMonth() + 1)) tags.add('s_birthmonth');
  if ((customer.ltv || 0) >= 1000000) tags.add('s_vip');
  const productTags = new Set();
  orders.filter(o => o.customerId === customer.id).forEach(o => (o.items || []).forEach(i => {
    if (i.tag) productTags.add(i.tag);
  }));
  productTags.forEach(t => tags.add(t));
  // キャンペーン獲得タグ
  if (customer.acquisitionCampaign) tags.add('camp:' + customer.acquisitionCampaign);
  // 獲得アカウント (どの公式LINEアカから友達追加されたか)
  if (customer.acquiredChannel) tags.add('ch:' + customer.acquiredChannel);
  // チャネル選好: 直近3件のうち最頻を「LINE派/訪問派」タグに
  const recent = orders.filter(o => o.customerId === customer.id)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 3);
  if (recent.length >= 2) {
    const count = { visit: 0, line: 0, web: 0, phone: 0 };
    recent.forEach(o => { count[o.channel] = (count[o.channel] || 0) + 1; });
    const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) tags.add('pref_' + top[0]);
  }
  return [...tags];
}

/* ─── ヘルパー: 配信対象顧客抽出 ─── */
export function filterCustomers(customers, selectedTagIds, orders, subs) {
  if (!selectedTagIds.length) return customers;
  const groups = {};
  Object.values(TAG_GROUPS).forEach(g => g.tags.forEach(t => {
    const groupKey = Object.entries(TAG_GROUPS).find(([, v]) => v === g)[0];
    groups[t.id] = groupKey;
  }));
  const byGroup = {};
  selectedTagIds.forEach(t => {
    let g;
    if (t.startsWith('camp:'))       g = 'CAMPAIGN';
    else if (t.startsWith('ch:'))    g = 'CHANNEL';
    else if (t.startsWith('pref_'))  g = 'PREF';
    else g = groups[t] || 'OTHER';
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(t);
  });
  return customers.filter(c => {
    const ct = autoTags(c, orders, subs);
    return Object.values(byGroup).every(orTags => orTags.some(t => ct.includes(t)));
  });
}

/* ─── ヘルパー: 通貨/日付 表示 ─── */
export const fmt = {
  yen: n => '¥' + Math.round(n).toLocaleString('ja-JP'),
  yenShort: n => {
    if (n >= 100000000) return '¥' + (n / 100000000).toFixed(2).replace(/\.?0+$/, '') + '億';
    if (n >= 10000)     return '¥' + (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    return '¥' + Math.round(n).toLocaleString('ja-JP');
  },
  date: t => {
    if (!t) return '—';
    const d = new Date(t);
    return `${d.getFullYear()}/${(d.getMonth()+1)}/${d.getDate()}`;
  },
  dateShort: t => {
    if (!t) return '—';
    const d = new Date(t);
    return `${d.getMonth()+1}/${d.getDate()}`;
  },
  time: t => {
    if (!t) return '—';
    const d = new Date(t);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
  },
  daysAgo: t => {
    if (!t) return '—';
    const d = Math.floor((Date.now() - t) / 86400000);
    if (d === 0) return '今日';
    if (d === 1) return '昨日';
    if (d < 30) return `${d}日前`;
    if (d < 365) return `${Math.floor(d/30)}ヶ月前`;
    return `${Math.floor(d/365)}年前`;
  },
};
