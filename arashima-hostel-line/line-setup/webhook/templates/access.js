/**
 * アクセス Flex Message
 * リッチメニュー「アクセス」postback で返す
 */

module.exports = function accessFlex() {
  return {
    type: 'flex',
    altText: '荒島ホテルへの道順',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '越前大野駅から徒歩 12 分', weight: 'bold', size: 'md', color: '#ffffff' },
          { type: 'text', text: 'Route from station', size: 'xs', color: '#ffffff', margin: 'sm' },
        ],
        backgroundColor: '#14110E',
        paddingAll: 'lg',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          step('1', '駅前ロータリーを左へ', '旧駅前通り。コンビニを右手に三分。'),
          step('2', '真名川にかかる橋を渡る', '七間朝市通りに合流。'),
          step('3', '寺町通りに入る', 'お寺が並ぶ静かな道。'),
          step('4', '朱色の暖簾、8-17', '米屋と本屋のあいだに「荒島」の暖簾。'),
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

function step(n, title, sub) {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'md',
    contents: [
      {
        type: 'text',
        text: n,
        size: 'xl',
        weight: 'bold',
        color: '#9B3A26',
        flex: 0,
      },
      {
        type: 'box',
        layout: 'vertical',
        flex: 5,
        contents: [
          { type: 'text', text: title, size: 'sm', weight: 'bold', color: '#111111' },
          { type: 'text', text: sub, size: 'xs', color: '#888888', wrap: true, margin: 'sm' },
        ],
      },
    ],
  };
}
