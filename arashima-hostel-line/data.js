// 荒島旅舎 + 荒島學舎 / 客室・建屋データ
// 商談デモ用。実情報は公式サイトの公開情報をベースに、未公開は「商談時差し替え」前提のダミー。

window.ARASHIMA_DATA = {
  address: {
    main: { code: '八-一七', town: '元町', label: '福井県大野市 元町 8-17' },
    sister: { code: '三-〇五', town: '城町', label: '福井県大野市 城町 (商談時に実住所差し替え)' },
  },

  buildings: [
    {
      id: 'ryosha',
      addrCode: '八-一七',
      addrTown: '元町',
      name: '旅舎',
      kana: 'りょしゃ',
      tagline: '商店街の真ん中で、暮らすように。',
      lead: '寺町通りから歩いて五分。シャッターが上がる音と、コーヒーを淹れる湯気から朝がはじまる。',
      facility: ['共用キッチン', 'ラウンジ', '無料貸自転車', 'シャワー', '洗濯機'],
      checkIn: '15:00 — 21:00',
      checkOut: '〜10:00',
      coverHue: '#C1462C',
    },
    {
      id: 'gakusha',
      addrCode: '三-〇五',
      addrTown: '城町',
      name: '學舎',
      kana: 'がくしゃ',
      tagline: '元・町の学び舎。今は誰かの書斎になる。',
      lead: '長期滞在に向くワークスペース付き別棟。窓の向こうに城下町の屋根が連なる。',
      facility: ['書斎机', '高速Wi-Fi', '土間キッチン', '貸自転車', 'シャワー'],
      checkIn: '16:00 — 20:00',
      checkOut: '〜11:00',
      coverHue: '#7C8068',
    },
  ],

  rooms: [
    // 旅舎 (5室)
    { id: 'r-201', buildingId: 'ryosha', no: '二〇一', name: '二人室・東向き', capacity: 2, beds: 'シングル × 2', size: '九畳', price: 4000, features: ['共用シャワー', '商店街側'] },
    { id: 'r-202', buildingId: 'ryosha', no: '二〇二', name: '二人室・西向き', capacity: 2, beds: 'シングル × 2', size: '九畳', price: 4000, features: ['共用シャワー', '寺町通り側'] },
    { id: 'r-203', buildingId: 'ryosha', no: '二〇三', name: '二人＋一室', capacity: 3, beds: 'セミダブル + シングル', size: '十二畳', price: 8000, features: ['朝の光', '小机'] },
    { id: 'r-301', buildingId: 'ryosha', no: '三〇一', name: '四人室', capacity: 4, beds: 'シングル × 4', size: '十六畳', price: 12000, features: ['屋根裏窓', 'グループ向き'] },
    { id: 'r-302', buildingId: 'ryosha', no: '三〇二', name: '六人室 (大部屋)', capacity: 6, beds: 'シングル × 6', size: '二十畳', price: 12000, features: ['貸切可', '畳の間'] },

    // 學舎 (3室・商談で実情報差し替え前提のダミー)
    { id: 'g-101', buildingId: 'gakusha', no: '一〇一', name: '書斎付き二人室', capacity: 2, beds: 'ダブル', size: '十畳', price: 9000, features: ['書斎机', '城下町ビュー'] },
    { id: 'g-201', buildingId: 'gakusha', no: '二〇一', name: '長期滞在 二人室', capacity: 2, beds: 'シングル × 2', size: '十二畳', price: 8000, features: ['月割相談可', '土間直結'] },
    { id: 'g-202', buildingId: 'gakusha', no: '二〇二', name: '小集団 四人室', capacity: 4, beds: 'シングル × 4', size: '十八畳', price: 14000, features: ['ワークショップ転用可'] },
  ],

  // 商店街の「便り」= LINE Bot プレビュー用テンプレ
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
