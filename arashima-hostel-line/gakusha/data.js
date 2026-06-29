// 荒島學舎 / 客室データ
// 福井県大野市 城町 3-05 (商談時に実住所差し替え前提のダミー)

window.ARASHIMA_DATA = {
  address: {
    main: { code: '三-〇五', town: '城町', label: '福井県大野市 城町 3-05' },
  },

  buildings: [
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
    { id: 'g-101', buildingId: 'gakusha', no: '一〇一', name: '書斎付き二人室', capacity: 2, beds: 'ダブル', size: '十畳', price: 9000, features: ['書斎机', '城下町ビュー'] },
    { id: 'g-201', buildingId: 'gakusha', no: '二〇一', name: '長期滞在 二人室', capacity: 2, beds: 'シングル × 2', size: '十二畳', price: 8000, features: ['月割相談可', '土間直結'] },
    { id: 'g-202', buildingId: 'gakusha', no: '二〇二', name: '小集団 四人室', capacity: 4, beds: 'シングル × 4', size: '十八畳', price: 14000, features: ['ワークショップ転用可'] },
  ],

  letters: [
    {
      kind: 'confirm',
      title: 'ご予約、たしかに承りました',
      lines: [
        '荒島學舎・一〇一号室',
        '十月十一日 〜 十月十三日 / 二泊',
        '大人 二名 / 合計 ¥18,000',
        '当日はゆっくりお越しください。',
      ],
      stamp: '便 / 城町 三-〇五',
    },
    {
      kind: 'remind',
      title: '明日、お待ちしています',
      lines: [
        '16:00 から書斎をお使いいただけます。',
        '朝は六時、東窓に光が入ります。',
        '隣の珈琲店、八時に開きます。',
      ],
      stamp: '便 / 前夜',
    },
    {
      kind: 'arrival',
      title: 'おかえりなさい',
      lines: [
        'チェックイン完了。書斎机は窓際に。',
        '高速Wi-Fi の鍵はカードに添えました。',
        '夜の街灯と、城下町の静けさを。',
      ],
      stamp: '便 / 到着',
    },
  ],
};
