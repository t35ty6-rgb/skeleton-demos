/**
 * 予約確定 Flex Message
 * LIFF で予約完了 → Cloud Function trigger で push する
 */

module.exports = function confirmationFlex(rec, building, room) {
  const checkin = rec.checkin?.toDate ? rec.checkin.toDate() : new Date(rec.checkin);
  const co = new Date(checkin);
  co.setDate(co.getDate() + rec.nights);

  const fmt = (d) => `${d.getMonth() + 1}月${d.getDate()}日 (${'日月火水木金土'[d.getDay()]})`;

  return {
    type: 'flex',
    altText: `ご予約 確定 (${rec.resNo})`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: 'ご予約 確定', weight: 'bold', size: 'lg', color: '#ffffff' },
          { type: 'text', text: rec.resNo, size: 'sm', color: '#F2C77A', margin: 'sm' },
        ],
        backgroundColor: '#14110E',
        paddingAll: 'lg',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          row('建屋', `${building?.name || ''} · ${building?.addrTown || ''}`),
          row('客室', `${room?.no || ''}号 / ${room?.name || ''}`),
          row('到着', fmt(checkin)),
          row('出発', `${fmt(co)} (${rec.nights}泊)`),
          row('人数', `${rec.guests}名`),
          { type: 'separator', margin: 'md' },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              { type: 'text', text: '合計', size: 'sm', color: '#999999', flex: 2 },
              { type: 'text', text: `${(rec.totalPrice || 0).toLocaleString()}円`, size: 'xl', color: '#9B3A26', weight: 'bold', flex: 4 },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: '前日に道順・チェックイン時刻、当日朝に鍵の場所をお送りします。', size: 'xs', color: '#888888', wrap: true },
        ],
      },
    },
  };
};

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
