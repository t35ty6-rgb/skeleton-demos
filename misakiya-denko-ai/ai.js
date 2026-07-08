// 三崎屋電工AI — AI 機能 (client-side generation)
// 電気工事の標準手順・FAQ・KYT・クイズをパターンから生成。
// 実 API を叩かない simulation だが、電気工事士の実務常識に基づいた出力を返す。

window.AI = (() => {
'use strict';

// ============ Standard step templates (電気工事の実務標準) ============
const STANDARD_PROLOGUE = [
  { title: '事前確認 · 図面照合', desc: '施工図・単線結線図で対象回路と接続先を確認。既設状態を写真撮影 (3方向以上)。', note: '' },
  { title: '停電範囲の周知', desc: '需要家・現場責任者に停電時間帯と影響範囲を伝達。掲示物を貼り出す。', note: '' },
  { title: '該当ブレーカー OFF', desc: '対象回路の一次側ブレーカーを OFF にし、施錠タグを取り付ける。', note: '' },
  { title: '検電', desc: '検電器で各相の電圧がないことを確認。使用前に既知の活線で検電器動作確認。', note: '故障検電器で「停電」誤認は感電事故の主因。動作確認を怠らない' },
  { title: '養生', desc: '周囲に養生シートを敷き、隣接機器を保護。落下防止措置。', note: '' },
];

const STANDARD_EPILOGUE = [
  { title: '絶縁抵抗測定', desc: '500V メガーで各回路の絶縁抵抗を測定。電技解釈14条基準 (150V以下=0.1MΩ以上、150V超300V以下=0.2MΩ以上、300V超=0.4MΩ以上) を満たすことを確認。', note: '' },
  { title: '導通・極性確認', desc: 'テスターで導通・極性を確認。誤結線がないこと。', note: '' },
  { title: '通電・動作確認', desc: '主幹 → 分岐の順で投入。負荷側の動作を確認。', note: '主幹より先に分岐を投入しない (突入電流集中でトリップ原因)' },
  { title: '記録・引渡し', desc: '測定値・写真・作業内容を記録票に記入。需要家に完了報告。', note: '' },
];

// タイトルからパターンを推定
function classifyTitle(title) {
  const t = title.toLowerCase();
  if (/(pas|高圧|受変電|キュービクル|変圧器)/.test(t)) return 'hv';
  if (/(cv|cvt|端末|ケーブル.*処理)/.test(t)) return 'cable-term';
  if (/(ケーブル|幹線|ラック|敷設)/.test(t)) return 'cable';
  if (/(照明|led|器具|取付)/.test(t)) return 'lighting';
  if (/(絶縁|測定|メガー|接地抵抗)/.test(t)) return 'measure';
  if (/(接地|アース|d種)/.test(t)) return 'ground';
  if (/(elb|漏電|遮断)/.test(t)) return 'elb';
  if (/(分電盤|盤|ブレーカー|交換)/.test(t)) return 'panel';
  return 'panel';
}

const MID_STEPS = {
  panel: [
    { title: '既設機器の取外し', desc: '配線に符号を付けてから外す。既設分電盤/機器を取外し、搬出。', note: '' },
    { title: '新設機器の取付', desc: '水平・垂直を水準器で確認し、アンカーで固定。取付ボルトは規定トルクで締める。', note: '' },
    { title: '配線接続', desc: '符号に従って結線。端子ネジは規定トルク (M4=1.2N·m 目安、M5=2.5N·m 目安) で締付。', note: '' },
  ],
  hv: [
    { title: '接地器具の設置', desc: '停電・検電後、必ず接地器具を取り付ける。三種の神器 (停電/検電/接地) を省略しない。', note: '接地忘れは死亡事故の主因' },
    { title: '既設 HV 機器の取外し', desc: '高所作業車で慎重に取り外す。制御ケーブルの結線状態を写真記録。', note: '' },
    { title: '新設 HV 機器の据付', desc: '規定寸法で据付、制御ケーブルを結線。SOG 等制御回路の誤結線に注意。', note: '波及事故 = 会社倒産級リスク' },
    { title: 'SOG/地絡試験', desc: '所定の動作試験を実施。判定結果を記録。', note: '' },
    { title: '接地撤去 · 送電手続き', desc: '接地器具を撤去。電力会社と連絡して送電。', note: '' },
  ],
  'cable-term': [
    { title: 'ケーブル切断 · シース剥離', desc: '所定寸法で切断。カッターでシースを剥離、内部半導電層を傷つけない。', note: '' },
    { title: '半導電層の剥離', desc: '規定寸法で半導電層を剥離。カッター跡は絶縁破壊の起点となるため目視チェック。', note: 'カッター傷は絶縁破壊の起点' },
    { title: 'ストレスコーン装着', desc: 'ストレスコーンを規定位置に装着。潤滑剤は指定品のみ使用。', note: '' },
    { title: '圧着端子取付', desc: '油圧圧着工具・規定ダイスで圧着。圧着後の目視 + マーキング。', note: '' },
    { title: 'テープ処理', desc: '自己融着テープ → 保護テープの順で規定重ね幅で巻く。', note: '雨天施工は吸湿でトラッキング事故、絶対不可' },
  ],
  cable: [
    { title: '経路確認 · 墨出し', desc: '設計図と現場を照合、経路に墨出し。梁・ダクト・他設備との干渉を確認。', note: '' },
    { title: '支持金物取付', desc: '3m ピッチで支持金物を取付。天井裏の墜落防止措置。', note: '' },
    { title: 'ケーブルラック取付', desc: 'ラックを支持金物に固定。曲り部はエルボ使用。', note: '' },
    { title: 'ケーブル敷設', desc: '延線ローラー使用。曲げ半径は径の8倍以上を確保。', note: '' },
    { title: 'ケーブル固定・端末処理', desc: '2m ピッチでバンド固定。両端で端末処理・結線。', note: '' },
  ],
  lighting: [
    { title: '既設器具の撤去', desc: '既設灯具を取り外す。水銀含有安定器は特別管理産業廃棄物として分別廃棄。', note: '' },
    { title: '結線', desc: '差込コネクタで結線 (電源側・器具側の極性確認)。', note: '' },
    { title: '器具取付', desc: '天井にビス留め or 引掛シーリング接続。器具の水平を確認。', note: '' },
  ],
  measure: [
    { title: '計器の動作確認', desc: '測定器を既知の状態で確認 (メガーは L-E 短絡で 0MΩ / 開放で ∞)。', note: '' },
    { title: '対象回路の準備', desc: '電源を切り、負荷側の機器を切り離す (誤測定防止)。', note: '' },
    { title: '測定実施', desc: '所定の測定手順に従い測定。複数点で確認。', note: '' },
    { title: '基準判定', desc: '電技解釈・社内基準と照合。合否判定を明確に。', note: '' },
    { title: '接地放電・記録', desc: '測定後は必ず接地放電。ケーブル残留電荷は感電原因。', note: '' },
  ],
  ground: [
    { title: '接地極打込み', desc: '深さ 750mm 以上に接地棒を打込む。', note: '' },
    { title: '接地線接続', desc: '接地棒と機器間を接地線 (D種は緑IV 1.6mm 以上) で接続。', note: '' },
    { title: '接地抵抗測定', desc: '接地抵抗計で測定。D種=100Ω以下、C種=10Ω以下 を確認。', note: '土壌湿度で抵抗値が変わる。乾燥期の測定値で判定するのが安全' },
  ],
  elb: [
    { title: '既設ブレーカー取外し', desc: '既設ブレーカーを外し、配線状態を確認。', note: '' },
    { title: 'ELB 取付・結線', desc: 'ELB を規定位置に取付。一次側・二次側の極性を厳守 (銘板指示)。', note: '極性誤で誤動作/不動作' },
    { title: '動作テスト', desc: 'テストボタン押下でトリップ動作確認。動作しない ELB は不良品として交換。', note: '' },
  ],
};

// タイトルから手順を生成
function generateSteps(title, category) {
  const type = classifyTitle(title);
  const mid = MID_STEPS[type] || MID_STEPS.panel;
  return [
    ...STANDARD_PROLOGUE,
    ...mid,
    ...STANDARD_EPILOGUE,
  ];
}

// ============ KYT (危険予知) 自動生成 ============
const KYT_BY_TYPE = {
  panel: [
    '停電作業でも一次側は活線。触れないこと。',
    '端子ネジ緩みによる発熱・焼損。規定トルクで締付。',
    '養生不足による工具・部品の落下 (下階作業者への衝突)。',
    '検電器故障による停電誤認。動作確認を必ず行う。',
  ],
  hv: [
    '高圧活線接近 (感電死亡事故)。接地忘れは絶対に避ける。',
    '波及事故による他需要家への影響 (賠償リスク)。',
    'SOG 制御ケーブル誤結線による不動作 (再送電時の事故)。',
    '高所作業車の転倒 (アウトリガー設置忘れ)。',
    'PCB 含有機器の取扱い (特別産業廃棄物)。',
  ],
  'cable-term': [
    '半導電層のカッター傷 (トラッキング事故起点)。',
    '雨天時の吸湿 (絶縁破壊)。',
    '圧着不良による発熱・焼損。',
    '有機溶剤中毒 (換気不足)。',
  ],
  cable: [
    '天井裏の熱中症 (夏場)。',
    '延線時の手指挟み込み。',
    'ケーブル曲げ半径不足 (絶縁劣化)。',
    '重量物落下 (延線中のケーブル自重)。',
  ],
  lighting: [
    '脚立転落 (二人組必須)。',
    '水銀安定器の破損 (水銀曝露)。',
    '極性誤結線による発光不良・器具寿命短縮。',
  ],
  measure: [
    'ケーブル残留電荷による感電 (測定後の接地放電忘れ)。',
    '負荷側機器の絶縁を測定して誤判定 (電子機器故障の原因)。',
    'メガー電池切れ・故障による誤測定。',
  ],
  ground: [
    '接地棒打込み時の地下埋設物損傷 (ガス管・水道管・通信線)。',
    '接地不良による感電事故継続。',
    '季節変動で基準値ギリギリ = 冬季に基準割れ。',
  ],
  elb: [
    '極性誤による不動作 (漏電しても遮断しない)。',
    'テストボタン未確認で故障 ELB を放置。',
    '動作電流値の選定誤り (30mA 高感度型と 100mA を混同)。',
  ],
};

function generateKYT(title) {
  const type = classifyTitle(title);
  const list = KYT_BY_TYPE[type] || KYT_BY_TYPE.panel;
  return list.slice();
}

// ============ AI テスト問題自動生成 ============
function generateQuizFromSteps(steps, title) {
  const questions = [];
  const t = classifyTitle(title);
  const notes = steps.filter(s => s.note && s.note.trim().length > 0);

  // Q1: 開始前に必ず行うこと
  questions.push({
    q: `${title} の作業開始前、最初に必ず行うべきことは?`,
    choices: ['配線に符号を付ける', 'ブレーカー OFF 後の検電確認', '新設機器の水平確認', '養生シートを敷く'],
    answer: 1,
    explain: '検電による停電確認は感電防止の最重要工程。他の作業は検電後。',
  });

  // Q2: 検電器の動作確認
  questions.push({
    q: '検電器を使う前に必ず行うべきことは?',
    choices: ['電池残量の確認', '端子カバーを外す', '既知の活線で動作確認', '手袋を外して感度確認'],
    answer: 2,
    explain: '故障検電器での「停電」誤認は感電事故の主因。既知の活線で動作確認してから使う。',
  });

  // Q3: 危険項目から (note がある手順)
  if (notes.length > 0) {
    const note = notes[0];
    questions.push({
      q: `「${note.title}」で最も注意すべきことは?`,
      choices: [
        '見た目の美しさ',
        note.note.split('。')[0] || note.note,
        '作業時間の短縮',
        '工具の選定',
      ],
      answer: 1,
      explain: `${note.note}`,
    });
  }

  // カテゴリ別問題
  if (t === 'panel' || t === 'elb') {
    questions.push({
      q: '端子ネジの締付で正しいのは?',
      choices: ['できるだけ強く締める', '規定トルクで締める', '手で回らなくなるまで', '感覚で最適に'],
      answer: 1,
      explain: '締めすぎは端子破損、緩みは発熱の原因。規定トルク厳守。',
    });
  }
  if (t === 'measure' || t === 'panel') {
    questions.push({
      q: '100V 回路 (対地電圧 150V 以下) の絶縁抵抗合格基準は?',
      choices: ['0.1MΩ 以上', '0.4MΩ 以上', '1MΩ 以上', '10MΩ 以上'],
      answer: 0,
      explain: '電技解釈 14 条: 対地電圧 150V 以下は 0.1MΩ 以上。',
    });
  }
  if (t === 'hv') {
    questions.push({
      q: '高圧作業の三種の神器を省略した場合の主な事故は?',
      choices: ['機器破損', '感電死亡事故', '停電時間延長', '見積超過'],
      answer: 1,
      explain: '停電・検電・接地の三種の神器を省略すると死亡事故に直結。絶対省略しない。',
    });
  }
  if (t === 'ground') {
    questions.push({
      q: 'D 種接地の抵抗値基準は?',
      choices: ['10Ω 以下', '100Ω 以下', '500Ω 以下', '1000Ω 以下'],
      answer: 1,
      explain: 'D 種は 100Ω 以下。地絡時の感電を防ぐ最低基準。',
    });
  }

  // Q最後: 通電順
  questions.push({
    q: '通電時のブレーカー投入順序は?',
    choices: ['分岐 → 主幹', '主幹 → 分岐', '同時に ON', '任意で可'],
    answer: 1,
    explain: '主幹 → 分岐の順が原則。逆にすると突入電流が集中し主幹がトリップすることがある。',
  });

  return questions.slice(0, 5);
}

// ============ AI 質問応答 (FAQ + 自然文検索) ============
const FAQ = [
  {
    keywords: ['絶縁抵抗', '基準', '合格', '合否', '100V', '200V'],
    answer: '電技解釈 14 条による絶縁抵抗基準:\n・対地電圧 150V 以下 = 0.1MΩ 以上\n・150V 超 300V 以下 = 0.2MΩ 以上\n・300V 超 = 0.4MΩ 以上\n\n測定は 500V メガーで。負荷側機器は切り離すこと。',
    related: ['w5', 'w1'],
  },
  {
    keywords: ['メガー', '検電', '動作確認', '故障確認'],
    answer: 'メガーの動作確認は L-E をショートで 0MΩ、開放で ∞ を示すことを確認。検電器は既知の活線で動作確認してから使う (故障検電器での停電誤認は感電事故の主因)。',
    related: ['w5'],
  },
  {
    keywords: ['トルク', '締付', '端子', 'ネジ'],
    answer: '端子ネジは規定トルクで締める。目安値:\n・M4 = 1.2 N·m\n・M5 = 2.5 N·m\n・M6 = 4.5 N·m\n\n締めすぎは端子破損、緩みは発熱の原因。トルクドライバー必須。',
    related: ['w1', 'w2'],
  },
  {
    keywords: ['接地抵抗', '基準', 'd種', 'c種', 'a種', 'b種'],
    answer: '接地抵抗基準 (電技解釈 17 条):\n・A 種 (高圧設備) = 10Ω 以下\n・B 種 (変圧器中性線) = 計算式による\n・C 種 (300V超低圧) = 10Ω 以下\n・D 種 (300V以下) = 100Ω 以下\n\n季節変動で乾燥期に基準割れするので余裕を持って施工。',
    related: ['w12'],
  },
  {
    keywords: ['停電', '検電', '接地', '三種の神器', '安全'],
    answer: '高圧作業の三種の神器: 停電 → 検電 → 接地。この順で必ず実施。省略は死亡事故の主因。復電時は逆順で。',
    related: ['w6'],
  },
  {
    keywords: ['波及事故', '賠償', 'pas', 'sog'],
    answer: '波及事故 = 自己の需要家設備の事故が電力系統に波及し他の需要家を停電させる事故。賠償額は数百万〜数千万円、業務停止・信用失墜のリスクも。特に PAS の SOG 制御回路誤結線が原因になりやすい。',
    related: ['w6'],
  },
  {
    keywords: ['cv', '端末', '半導電層', 'ストレスコーン'],
    answer: 'CV 端末処理は半導電層のカッター傷が絶縁破壊の起点になる。剥離時は必ず目視チェック、傷は絶縁テープで補修。雨天施工は吸湿でトラッキング事故につながるため絶対不可。',
    related: ['w4'],
  },
  {
    keywords: ['ELB', '漏電', '極性', 'テストボタン'],
    answer: 'ELB (漏電遮断器) は一次側・二次側の極性厳守。銘板の指示に従う。取付後は必ずテストボタン押下でトリップ動作確認 — 動作しないものは不良品として交換。',
    related: ['w11'],
  },
  {
    keywords: ['曲げ半径', 'ケーブル', '敷設'],
    answer: 'CV ケーブルの曲げ半径は仕上外径の 8 倍以上が原則。急曲げは絶縁層の破壊・寿命低下の原因。延線ローラー使用推奨。',
    related: ['w8'],
  },
];

function askAI(question) {
  const q = question.toLowerCase().trim();
  if (!q) return { answer: '質問を入力してください。例: 「絶縁抵抗の合格基準は?」', related: [], score: 0 };

  // FAQ をスコアリング
  const scored = FAQ.map(item => {
    let s = 0;
    for (const k of item.keywords) {
      if (q.includes(k.toLowerCase())) s += k.length;
    }
    return { item, score: s };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const top = scored[0];
    return { answer: top.item.answer, related: top.item.related, score: top.score };
  }

  // FAQ ヒットしない → 全文検索フォールバック
  const results = fulltextSearch(question).slice(0, 3);
  if (results.length > 0) {
    return {
      answer: `直接の回答は見つかりませんでしたが、関連する手順書が ${results.length} 件見つかりました。手順書を確認してください。`,
      related: results.map(r => r.workId),
      score: 0.5,
    };
  }

  return {
    answer: '該当する情報が見つかりませんでした。より具体的なキーワード (例: 「PAS 交換の危険」「絶縁抵抗の判定」) で聞いてみてください。',
    related: [],
    score: 0,
  };
}

// ============ 自然文全文検索 (BM25 風 スコアリング) ============
function fulltextSearch(query) {
  const q = query.toLowerCase();
  const terms = q.split(/[\s、。・.,]+/).filter(t => t.length >= 2);
  if (terms.length === 0) return [];

  const store = window.__store;
  if (!store) return [];

  const results = [];
  for (const w of store.works) {
    if (w.status !== 'published') continue;
    const hay = [
      w.title, w.description || '', w.site || '',
      ...(w.tags || []),
      ...(w.steps || []).map(s => `${s.title} ${s.desc} ${s.note || ''}`),
      ...(w.tips || []),
      ...(w.cautions || []),
    ].join(' ').toLowerCase();
    let score = 0;
    for (const t of terms) {
      const count = (hay.match(new RegExp(t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g')) || []).length;
      score += count * t.length;
    }
    if (score > 0) results.push({ workId: w.id, score, work: w });
  }
  return results.sort((a, b) => b.score - a.score);
}

// ============ Public API ============
return {
  generateSteps,
  generateKYT,
  generateQuiz: generateQuizFromSteps,
  ask: askAI,
  search: fulltextSearch,
};

})();
