/**
 * 当日案内 (鍵の場所) Flex Message
 * Cron (当日 07:00) で push する
 */

module.exports = function arrivalFlex(rec, building, room) {
  const num = parseInt(room?.id?.split('-')?.[1] || '', 10) || '';
  return {
    type: 'flex',
    altText: '本日のチェックインのご案内',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '本日、お待ちしています', weight: 'bold', size: 'md', color: '#ffffff' },
          { type: 'text', text: rec.resNo, size: 'xs', color: '#F2C77A', margin: 'sm' },
        ],
        backgroundColor: '#14110E',
        paddingAll: 'lg',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: 'チェックイン情報', size: 'xs', color: '#9B3A26', weight: 'bold' },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'お部屋', size: 'xs', color: '#888888', flex: 2 },
              { type: 'text', text: `${num} 号`, size: 'sm', weight: 'bold', flex: 4 },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '鍵の場所', size: 'xs', color: '#888888', flex: 2 },
              { type: 'text', text: `${num} 号室のポスト`, size: 'sm', weight: 'bold', flex: 4 },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: '暗証番号', size: 'xs', color: '#888888', flex: 2 },
              { type: 'text', text: rec.tel?.slice(-4) || '0000', size: 'sm', weight: 'bold', flex: 4 },
            ],
          },
          { type: 'separator', margin: 'md' },
          { type: 'text', text: '一階のキッチンとラウンジは自由にお使いください。Wi-Fi パスワードは室内のカードに記載しています。', size: 'xxs', color: '#888888', wrap: true, margin: 'md' },
          { type: 'text', text: 'お困りごとがあれば、このトークでお気軽にどうぞ。', size: 'xxs', color: '#888888', wrap: true },
        ],
      },
    },
  };
};
