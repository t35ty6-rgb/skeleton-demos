/**
 * 前日リマインダー Flex Message
 * Cron (前日 18:00) で push する
 */

module.exports = function reminderFlex(rec, building, room) {
  const checkin = rec.checkin?.toDate ? rec.checkin.toDate() : new Date(rec.checkin);
  const fmt = (d) => `${d.getMonth() + 1}月${d.getDate()}日 (${'日月火水木金土'[d.getDay()]})`;

  return {
    type: 'flex',
    altText: '明日、お待ちしています',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '明日、お待ちしています', weight: 'bold', size: 'md', color: '#ffffff' },
          { type: 'text', text: `${rec.resNo} · ${fmt(checkin)}`, size: 'xs', color: '#F2C77A', margin: 'sm' },
        ],
        backgroundColor: '#9B3A26',
        paddingAll: 'lg',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: `${building?.name || ''} ${room?.no || ''}号 のお部屋でお待ちしております。`, size: 'sm', wrap: true },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              { type: 'text', text: 'チェックイン', size: 'xs', color: '#888888', flex: 2 },
              { type: 'text', text: building?.checkIn || '15:00 - 21:00', size: 'sm', color: '#111111', weight: 'bold', flex: 4 },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '所在地', size: 'xs', color: '#888888', flex: 2 },
              { type: 'text', text: `${building?.addrTown || ''} ${building?.addrCode || ''}`, size: 'sm', color: '#111111', weight: 'bold', flex: 4 },
            ],
          },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '道順は商店街のアーケード側から入ると雨に濡れません。お気をつけてお越しください。', size: 'xxs', color: '#888888', wrap: true, margin: 'md' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'link',
            action: {
              type: 'uri',
              label: 'Google Maps で開く',
              uri: 'https://maps.google.com/?q=' + encodeURIComponent('福井県大野市元町8-17'),
            },
          },
        ],
      },
    },
  };
};
