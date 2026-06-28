/**
 * 現在予約 (変更・キャンセル用) Flex Message
 * 履歴連動: 該当ユーザーの pending/confirmed な予約を表示
 */

module.exports = function changesFlex(reservations) {
  return {
    type: 'flex',
    altText: '現在のご予約',
    contents: {
      type: 'carousel',
      contents: reservations.slice(0, 5).map((r) => bubble(r)),
    },
  };
};

function bubble(r) {
  const checkin = r.checkin?.toDate ? r.checkin.toDate() : new Date(r.checkin);
  const dateStr = `${checkin.getMonth() + 1}/${checkin.getDate()}`;
  const dow = '日月火水木金土'[checkin.getDay()];
  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: r.resNo || '', weight: 'bold', size: 'md', color: '#ffffff' },
        { type: 'text', text: r.status === 'confirmed' ? '確定済' : '受付中', size: 'xxs', color: '#ffffff', margin: 'sm' },
      ],
      backgroundColor: '#9B3A26',
      paddingAll: 'lg',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        row('到着', `${dateStr} (${dow})`),
        row('泊数', `${r.nights}泊`),
        row('人数', `${r.guests}名`),
        row('合計', `¥${(r.totalPrice || 0).toLocaleString()}`),
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: '#06C755',
          action: {
            type: 'postback',
            label: '変更する',
            data: `menu=change_one&resNo=${encodeURIComponent(r.resNo || r.id)}`,
            displayText: `${r.resNo} を変更`,
          },
        },
        {
          type: 'button',
          style: 'link',
          action: {
            type: 'postback',
            label: 'キャンセル相談',
            data: `menu=cancel_one&resNo=${encodeURIComponent(r.resNo || r.id)}`,
            displayText: `${r.resNo} をキャンセル相談`,
          },
        },
      ],
    },
  };
}

function row(k, v) {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: k, size: 'sm', color: '#999999', flex: 2 },
      { type: 'text', text: v, size: 'sm', color: '#111111', flex: 4, weight: 'bold' },
    ],
  };
}
