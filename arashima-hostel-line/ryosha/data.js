// 荒島旅舎 / 客室データ
// 福井県大野市 元町 8-17

window.ARASHIMA_DATA = {
  address: {
    main: { code: '八-一七', town: '元町', label: '福井県大野市 元町 8-17' },
  },

  buildings: [
    {
      id: 'ryosha',
      addrCode: '八-一七',
      addrTown: '元町',
      name: '旅舎',
      kana: 'たびしゃ',
      tagline: '商店街の真ん中で、暮らすように。',
      lead: '寺町通りから歩いて五分。シャッターが上がる音と、コーヒーを淹れる湯気から朝がはじまる。',
      facility: ['共用キッチン', 'ラウンジ', '無料貸自転車', 'シャワー', '洗濯機'],
      checkIn: '15:00 — 21:00',
      checkOut: '〜10:00',
      coverHue: '#C1462C',
    },
  ],

  rooms: [
    { id: 'r-201', buildingId: 'ryosha', no: '二〇一', name: '二人室・東向き', capacity: 2, beds: 'シングル × 2', size: '九畳', price: 4000, features: ['共用シャワー', '商店街側'] },
    { id: 'r-202', buildingId: 'ryosha', no: '二〇二', name: '二人室・西向き', capacity: 2, beds: 'シングル × 2', size: '九畳', price: 4000, features: ['共用シャワー', '寺町通り側'] },
    { id: 'r-203', buildingId: 'ryosha', no: '二〇三', name: '二人＋一室', capacity: 3, beds: 'セミダブル + シングル', size: '十二畳', price: 8000, features: ['朝の光', '小机'] },
    { id: 'r-301', buildingId: 'ryosha', no: '三〇一', name: '四人室', capacity: 4, beds: 'シングル × 4', size: '十六畳', price: 12000, features: ['屋根裏窓', 'グループ向き'] },
    { id: 'r-302', buildingId: 'ryosha', no: '三〇二', name: '六人室 (大部屋)', capacity: 6, beds: 'シングル × 6', size: '二十畳', price: 12000, features: ['貸切可', '畳の間'] },
  ],

  letters: [
    {
      kind: 'confirm',
      title: 'ご予約、たしかに承りました',
      lines: [
        '荒島旅舎・二〇三号室',
        '十月十一日 〜 十月十三日 / 二泊',
        '大人 二名 / 合計 ¥16,000',
        '当日はゆっくりお越しください。',
      ],
      stamp: '便 / 元町 八-一七',
    },
    {
      kind: 'remind',
      title: '明日、お待ちしています',
      lines: [
        '15:00 から鍵をお渡しできます。',
        '雨予報。商店街のアーケード側から。',
        '近くの「水」(湧水場) は徒歩四分。',
      ],
      stamp: '便 / 前夜',
    },
    {
      kind: 'arrival',
      title: 'おかえりなさい',
      lines: [
        'チェックイン完了。お部屋は二階奥。',
        'キッチンの珈琲、自由にどうぞ。',
        '夜は、商店街の音を肴に。',
      ],
      stamp: '便 / 到着',
    },
  ],
};
