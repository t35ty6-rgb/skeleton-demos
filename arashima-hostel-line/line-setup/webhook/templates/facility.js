/**
 * 館内設備 Flex Message
 * リッチメニュー「館内案内」postback で返す
 */

module.exports = function facilityFlex() {
  const items = [
    { k: 'キッチン', v: '1F · 24時間', d: '豆・道具・調味料 完備' },
    { k: 'ラウンジ', v: '1F · 暖炉風ストーブ', d: '本棚あり' },
    { k: '貸自転車', v: '3 台 · 無料', d: '電動なしの普通車' },
    { k: 'シャワー', v: '男女別 · 24時間', d: 'アメニティあり' },
    { k: '洗濯機', v: '¥300 / 回', d: '乾燥機付き' },
    { k: '書斎 (學舎)', v: 'Wi-Fi 1Gbps 直結', d: 'リモートワーク向き' },
  ];

  return {
    type: 'flex',
    altText: '館内設備のご案内',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '館内のご案内', weight: 'bold', size: 'md', color: '#ffffff' },
          { type: 'text', text: 'Facility', size: 'xs', color: '#ffffff', margin: 'sm' },
        ],
        backgroundColor: '#14110E',
        paddingAll: 'lg',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: items.map((it) => ({
          type: 'box',
          layout: 'vertical',
          spacing: 'xs',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: it.k, size: 'sm', weight: 'bold', flex: 3 },
                { type: 'text', text: it.v, size: 'sm', color: '#9B3A26', flex: 5, align: 'end' },
              ],
            },
            { type: 'text', text: it.d, size: 'xxs', color: '#888888' },
          ],
        })),
      },
    },
  };
};
