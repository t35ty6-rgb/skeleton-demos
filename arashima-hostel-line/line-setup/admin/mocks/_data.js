// 5 mock 共通 data (2026-08-01 の 実 scan、 bug fix 済 の 実数字)
window.MOCK_DATA = {
  center: '荒島旅舎 (福井県大野市 元町8-17)',
  todayMedian: 18400,
  own: { name: '荒島 (自ホテル)', priceTonight: 9800, deltaVsMarket: -8600, targetDate: '2026-08-02' },
  radiusKm: 10,
  hotelCount: 12, // 競合、 自ホテル 除く
  avg30: 27052,
  median30: 25900,
  medianWeekend: 33500,
  tightness: '緩',
  trendPct: -9,
  trendLabel: '下降',
  scannedAt: '2026-08-01 03:37',
  hotels: [
    { name: '荒島 (自ホテル)', dist: 0, avg: 9800, min: 8600, max: 15000, coverage: 30, own: true, photo: null },
    { name: '古民家ゲストハウス ナマケモノ', dist: 0.8, avg: 14400, min: 12000, max: 18000, coverage: 28, review: '9.0' },
    { name: '勝山ニューホテル', dist: 8.5, avg: 32200, min: 27500, max: 42000, coverage: 30, review: '8.1' },
    { name: 'ふとん屋 の 宿 悦', dist: 9.4, avg: 28300, min: 22000, max: 35000, coverage: 26, review: '9.0' },
    { name: 'じゅらどん の 家', dist: 9.3, avg: 34100, min: 28800, max: 40000, coverage: 29, review: '8.9' },
    { name: 'JAM FUKUI KATSUYAMA TOKYU', dist: 12.1, avg: 45200, min: 38000, max: 58000, coverage: 25, review: '8.6' },
    { name: '山斎 勝山最北端 一棟貸し', dist: 16.2, avg: 30000, min: 25000, max: 38000, coverage: 22, review: '9.2' },
    { name: '天然木曽ひのき 貸切民泊 志ろきや', dist: 9.6, avg: 18500, min: 15000, max: 22000, coverage: 15 },
    { name: '恐竜一色 Dinosaur Guest', dist: 9.4, avg: 21000, min: 16000, max: 26000, coverage: 12 },
    { name: 'Irifune', dist: 9.1, avg: 19800, min: 17000, max: 24000, coverage: 20 },
    { name: '勝山駅 恐竜博物館 BBQ 民泊', dist: 8.6, avg: 24500, min: 20000, max: 30000, coverage: 18 },
    { name: '大野 街道 の 宿', dist: 3.2, avg: 12800, min: 10500, max: 16000, coverage: 24 },
    { name: '奥越 民泊 みずのわ', dist: 5.8, avg: 15200, min: 13000, max: 19000, coverage: 20 },
  ],
  // 30日 相場 折線 (実 median 系列)
  trend: [24500, 25200, 26100, 27800, 32100, 34800, 29500, 25100, 25800, 26400, 27200, 30500, 33200, 28900, 24800, 25400, 26800, 27900, 32400, 35800, 30200, 25100, 25400, 26200, 28100, 33500, 36800, 28100, 25800, 24900],
  // 日別 供給 (取得 hotel 数)
  supply: [12, 13, 11, 12, 10, 9, 11, 13, 12, 12, 11, 10, 8, 11, 13, 12, 11, 12, 9, 8, 10, 13, 12, 12, 10, 9, 8, 11, 13, 12],
  dates: Array.from({ length: 30 }, (_, i) => {
    const d = new Date(2026, 7, 2 + i);
    return d.toISOString().slice(0, 10);
  }),
};

window.fmtYen = (n) => n == null ? '—' : '¥' + Math.round(n).toLocaleString('ja-JP');
window.dowChars = ['日', '月', '火', '水', '木', '金', '土'];
