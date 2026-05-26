// LINE公式連携モジュール
// セグメント定義 / メッセージテンプレ / 配信スケジュール / 送信ログ / セグメント評価

(function () {
  const TODAY = new Date('2026-05-27');

  // ============================
  // セグメント定義
  // 各セグメントは clients を絞り込む述語と表示メタを持つ
  // ============================
  window.SEGMENTS = [
    {
      id: 'seg-all', name: '全顧客 (LINE連携済)', icon: '👥',
      color: 'gray',
      desc: 'LINE友だち追加してくれている全員',
      filter: c => c.lineSubscribed,
    },
    {
      id: 'seg-vip', name: 'VIP (AUM 3,000万以上)', icon: '⭐',
      color: 'purple',
      desc: '管理資産が3,000万円以上の上位顧客',
      filter: c => c.lineSubscribed && c.aum >= 30_000_000,
    },
    {
      id: 'seg-mid', name: 'コア (AUM 1,000〜3,000万)', icon: '🎯',
      color: 'accent',
      desc: '中核層・継続フォロー対象',
      filter: c => c.lineSubscribed && c.aum >= 10_000_000 && c.aum < 30_000_000,
    },
    {
      id: 'seg-young', name: '若年層 (35歳未満)', icon: '🌱',
      color: 'green',
      desc: 'NISA・結婚・住宅購入期',
      filter: c => c.lineSubscribed && window.LifeEvents.currentAge(c) < 35,
    },
    {
      id: 'seg-edu', name: '子育て世帯', icon: '🎒',
      color: 'accent',
      desc: '小学生〜高校生の子供がいる世帯',
      filter: c => c.lineSubscribed && (c.family || []).some(m => {
        if (m.rel !== 'child') return false;
        const age = window.LifeEvents.currentAge({ birth: m.birth });
        return age >= 6 && age <= 18;
      }),
    },
    {
      id: 'seg-pre-retire', name: '退職前世代 (55〜64歳)', icon: '🏖️',
      color: 'yellow',
      desc: '退職金準備・年金繰下げ判定対象',
      filter: c => {
        const a = window.LifeEvents.currentAge(c);
        return c.lineSubscribed && a >= 55 && a < 65;
      },
    },
    {
      id: 'seg-senior', name: 'シニア (65歳以上)', icon: '🌸',
      color: 'red',
      desc: '相続・介護準備対象',
      filter: c => c.lineSubscribed && window.LifeEvents.currentAge(c) >= 65,
    },
    {
      id: 'seg-stale', name: '半年以上未接触', icon: '⏰',
      color: 'red',
      desc: 'フォロー必須・再接点づくり',
      filter: c => {
        if (!c.lineSubscribed) return false;
        const days = Math.round((TODAY - new Date(c.lastContact)) / 86400000);
        return days >= 180;
      },
    },
    {
      id: 'seg-new', name: '新規顧客', icon: '🆕',
      color: 'accent',
      desc: '関係構築フェーズ',
      filter: c => c.lineSubscribed && c.status === 'new',
    },
  ];

  // ============================
  // メッセージテンプレ
  // ============================
  window.LINE_TEMPLATES = [
    {
      id: 'tpl-birthday', name: '誕生日メッセージ', cat: 'event',
      target: '本人 / 配偶者 / 子供 (誕生日当日)',
      body: '{{name}} 様\n\nお誕生日おめでとうございます🎉\nいつもお世話になり、ありがとうございます。\n\n{{age}}歳の節目に、改めてライフプランの見直しをしてみませんか?\nご都合のよいタイミングでメッセージください。\n\n— {{fp_name}}',
    },
    {
      id: 'tpl-monthly', name: '月次市場レポート', cat: 'broadcast',
      target: 'コア顧客以上',
      body: '{{name}} 様\n\n5月の運用レポートをお届けします📊\n\n■ 国内株: +2.4%\n■ 米国株: +1.8%\n■ 為替: 円高基調\n\n詳細レポート → {{report_url}}\n\nご質問はお気軽にどうぞ。',
    },
    {
      id: 'tpl-edu-summer', name: '夏休み・教育費お役立ち', cat: 'broadcast',
      target: '子育て世帯',
      body: '{{name}} 様\n\n夏休み前のお役立ち情報🎒\n\n児童手当・高校無償化の最新情報と、塾代・習い事の家計影響をまとめました。\n\n→ {{article_url}}\n\nお子様の教育資金について、いつでもご相談ください。',
    },
    {
      id: 'tpl-retirement', name: '退職前リマインド', cat: 'event',
      target: '55〜64歳',
      body: '{{name}} 様\n\n退職まで{{years_to_retire}}年。\n退職金受取方法 (一時金 vs 年金) で生涯手取りが数百万円変わることをご存知ですか?\n\n判定シート → {{tool_url}}\n\n一度シミュレーションしてみませんか?',
    },
    {
      id: 'tpl-stale-followup', name: '半年フォロー', cat: 'event',
      target: '半年以上未接触',
      body: '{{name}} 様\n\nお久しぶりです。お変わりありませんでしょうか?\n\n前回お話してから時間が経ちましたので、近況伺いも兼ねて15分ほどお時間いただけませんか?\n\nお気軽にメッセージください。',
    },
    {
      id: 'tpl-season-newyear', name: '新年のご挨拶', cat: 'season',
      target: '全顧客',
      body: '{{name}} 様\n\n新年あけましておめでとうございます🎍\n\n旧年中はお世話になりました。\n本年もご家族のライフプランを一緒に考えていきます。\nよろしくお願いいたします。',
    },
    {
      id: 'tpl-season-summer', name: '夏のご挨拶', cat: 'season',
      target: '全顧客',
      body: '{{name}} 様\n\n暑中お見舞い申し上げます🌻\n\nお盆休暇のご家族時間、いかがお過ごしですか?\nお子様の教育費・帰省時の親御様との相続話など、お盆をきっかけにご相談増える時期です。\n\nお気軽にどうぞ。',
    },
    {
      id: 'tpl-inherit', name: '相続対策ご案内', cat: 'event',
      target: '65歳以上',
      body: '{{name}} 様\n\n相続税制の改正情報をお届けします📜\n\n暦年贈与の見直しや生前対策で、お孫様に残せる金額が大きく変わります。\n\n面談ご希望の方はこちらから → {{calendar_url}}',
    },
  ];

  // ============================
  // 配信スケジュール
  // ============================
  window.LINE_SCHEDULES = [
    {
      id: 'sch-1', name: '月次市場レポート (コア+VIP)',
      segment: 'seg-mid', templateId: 'tpl-monthly',
      cadence: 'monthly', schedule: '毎月 第1月曜 10:00', enabled: true,
      lastSent: '2026-05-04', nextSend: '2026-06-01',
    },
    {
      id: 'sch-2', name: 'VIPデイリーマーケット情報',
      segment: 'seg-vip', templateId: 'tpl-monthly',
      cadence: 'weekly', schedule: '毎週 月曜 8:00', enabled: true,
      lastSent: '2026-05-26', nextSend: '2026-06-01',
    },
    {
      id: 'sch-3', name: '子育て世帯・教育費お役立ち',
      segment: 'seg-edu', templateId: 'tpl-edu-summer',
      cadence: 'monthly', schedule: '毎月 15日 10:00', enabled: true,
      lastSent: '2026-05-15', nextSend: '2026-06-15',
    },
    {
      id: 'sch-4', name: '退職前世代・年金準備リマインド',
      segment: 'seg-pre-retire', templateId: 'tpl-retirement',
      cadence: 'monthly', schedule: '毎月 1日 10:00', enabled: true,
      lastSent: '2026-05-01', nextSend: '2026-06-01',
    },
    {
      id: 'sch-5', name: '誕生日自動メッセージ',
      segment: 'auto-birthday', templateId: 'tpl-birthday',
      cadence: 'birthday', schedule: '対象者の誕生日当日 9:00', enabled: true,
      lastSent: '2026-05-25', nextSend: '本日 9:00 (3名)',
    },
    {
      id: 'sch-6', name: 'シニア・相続対策お役立ち',
      segment: 'seg-senior', templateId: 'tpl-inherit',
      cadence: 'monthly', schedule: '毎月 20日 10:00', enabled: true,
      lastSent: '2026-04-20', nextSend: '2026-06-20',
    },
    {
      id: 'sch-7', name: '半年フォロー (自動)',
      segment: 'seg-stale', templateId: 'tpl-stale-followup',
      cadence: 'weekly', schedule: '毎週 火曜 14:00', enabled: false,
      lastSent: null, nextSend: '— (停止中)',
    },
  ];

  // ============================
  // 送信ログ (直近)
  // ============================
  window.LINE_LOG = [
    { date: '2026-05-26 08:00', scheduleId: 'sch-2', segment: 'VIP', recipients: 5, success: 5, fail: 0, template: '月次市場レポート' },
    { date: '2026-05-25 09:00', scheduleId: 'sch-5', segment: '誕生日 (5/25)', recipients: 1, success: 1, fail: 0, template: '誕生日メッセージ', detail: '小林 浩 様 (孫: 結菜さん 誕生日)' },
    { date: '2026-05-20 10:00', scheduleId: 'sch-6', segment: 'シニア', recipients: 4, success: 4, fail: 0, template: '相続対策ご案内' },
    { date: '2026-05-19 08:00', scheduleId: 'sch-2', segment: 'VIP', recipients: 5, success: 5, fail: 0, template: '月次市場レポート' },
    { date: '2026-05-15 10:00', scheduleId: 'sch-3', segment: '子育て世帯', recipients: 9, success: 9, fail: 0, template: '教育費お役立ち' },
    { date: '2026-05-12 08:00', scheduleId: 'sch-2', segment: 'VIP', recipients: 5, success: 5, fail: 0, template: '月次市場レポート' },
    { date: '2026-05-04 10:00', scheduleId: 'sch-1', segment: 'コア+VIP', recipients: 15, success: 14, fail: 1, template: '月次市場レポート', detail: '中村様 ブロック解除待ち' },
    { date: '2026-05-01 10:00', scheduleId: 'sch-4', segment: '退職前世代', recipients: 6, success: 6, fail: 0, template: '退職金受取シミュ案内' },
  ];

  // ============================
  // 誕生日抽出 (向こう30日)
  // ============================
  function upcomingBirthdays(days) {
    days = days || 30;
    const result = [];
    const clients = window.DUMMY_CLIENTS || [];
    clients.forEach(c => {
      if (!c.lineSubscribed) return;
      // 本人
      addBirthday(result, c, c, '本人', days);
      // 家族
      (c.family || []).forEach(m => {
        const rel = m.rel === 'spouse' ? '配偶者' : (m.rel === 'child' ? 'お子様' : m.rel);
        addBirthday(result, c, m, rel, days);
      });
    });
    result.sort((a, b) => a.daysAhead - b.daysAhead);
    return result;
  }

  function addBirthday(arr, client, person, rel, days) {
    if (!person.birth) return;
    const b = new Date(person.birth);
    const thisYear = new Date(TODAY.getFullYear(), b.getMonth(), b.getDate());
    let target = thisYear;
    if (target < TODAY) {
      // 今年は過ぎてるので来年
      target = new Date(TODAY.getFullYear() + 1, b.getMonth(), b.getDate());
    }
    const daysAhead = Math.round((target - TODAY) / 86400000);
    if (daysAhead >= 0 && daysAhead <= days) {
      const age = target.getFullYear() - b.getFullYear();
      arr.push({
        client: client,
        personName: person.name || person.kana,
        rel: rel,
        date: target,
        daysAhead: daysAhead,
        age: age,
      });
    }
  }

  // ============================
  // セグメント評価 (動的)
  // ============================
  function evaluateSegment(segId) {
    const seg = window.SEGMENTS.find(s => s.id === segId);
    if (!seg) return [];
    return (window.DUMMY_CLIENTS || []).filter(seg.filter);
  }

  window.LineCRM = {
    evaluateSegment: evaluateSegment,
    upcomingBirthdays: upcomingBirthdays,
    TODAY: TODAY,
  };
})();
