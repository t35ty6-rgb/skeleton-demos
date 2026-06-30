/**
 * 客室・プラン カルーセル Flex Message
 * リッチメニュー「客室・プラン」postback で返す
 */

module.exports = function roomsFlex() {
  return {
    type: 'flex',
    altText: '客室とプランのご案内',
    contents: {
      type: 'carousel',
      contents: [
        bubble('荒島旅舎', '元町 8-17 · 商店街の真ん中', [
          { k: '部屋数', v: '5 室' },
          { k: '料金', v: '4,000円 〜 / 室' },
          { k: '特徴', v: '共用キッチン・ラウンジ' },
        ], '#9B3A26'),
        bubble('荒島學舎', '城町 3-05 · 書斎付き別棟', [
          { k: '部屋数', v: '3 室' },
          { k: '料金', v: '8,000円 〜 / 室' },
          { k: '特徴', v: 'Wi-Fi 1Gbps 直結書斎' },
        ], '#7C8068'),
        bubble('連泊プラン', '三泊以上 15% OFF', [
          { k: '対象', v: '全室' },
          { k: '割引', v: '15% OFF' },
          { k: '特典', v: '朝市同行ガイド 1 回無料' },
        ], '#C97A3A'),
      ],
    },
  };
};

function bubble(title, sub, rows, accent) {
  return {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: title, weight: 'bold', size: 'lg', color: '#ffffff' },
        { type: 'text', text: sub, size: 'xs', color: '#ffffff', margin: 'sm' },
      ],
      backgroundColor: accent,
      paddingAll: 'lg',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: rows.map((r) => ({
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'text', text: r.k, size: 'sm', color: '#999999', flex: 2 },
          { type: 'text', text: r.v, size: 'sm', color: '#111111', flex: 4, weight: 'bold' },
        ],
      })),
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
            label: 'この内容で予約する',
            data: 'menu=reserve',
            displayText: '予約する',
          },
        },
      ],
    },
  };
}
