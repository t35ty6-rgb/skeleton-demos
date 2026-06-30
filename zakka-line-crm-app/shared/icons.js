/**
 * MEI アイコンセット (SVG, stroke 1.5px ベース)
 *
 * 雑貨店の素材語彙を線画モチーフに翻訳:
 * - 器 (utsuwa)   : 茶碗の輪郭 + 口の楕円
 * - 道具 (dougu)  : 箸2本
 * - 布 (nuno)     : 麻織りの波線3本
 * - 古道具 (kodougu) : 古木箱の透視図
 *
 * signature element = 落款 (rakkan) ロゴ
 * 朱土の角丸印章 + 白抜きの「M」 が「銘」を表す印。
 */

const SVG_PROPS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
  // ─── 商品カテゴリ ───
  utsuwa: `<svg ${SVG_PROPS}><ellipse cx="12" cy="10" rx="7.5" ry="1.6"/><path d="M4.5 10 L6.5 18.5 C6.8 19.4 7.5 20 8.5 20 L15.5 20 C16.5 20 17.2 19.4 17.5 18.5 L19.5 10"/></svg>`,
  dougu:  `<svg ${SVG_PROPS}><line x1="8" y1="4" x2="9" y2="20"/><line x1="14" y1="4" x2="15" y2="20"/><circle cx="8" cy="5" r="0.5" fill="currentColor"/><circle cx="14" cy="5" r="0.5" fill="currentColor"/></svg>`,
  nuno:   `<svg ${SVG_PROPS}><path d="M3 8 Q 6 5, 9 8 T 15 8 T 21 8"/><path d="M3 12 Q 6 9, 9 12 T 15 12 T 21 12"/><path d="M3 16 Q 6 13, 9 16 T 15 16 T 21 16"/></svg>`,
  kodougu:`<svg ${SVG_PROPS}><path d="M5 9 L19 9 L19 20 L5 20 Z"/><path d="M5 9 L8 6 L22 6 L19 9"/><path d="M19 20 L22 17 L22 6"/><path d="M12 9 L12 20"/></svg>`,
  other:  `<svg ${SVG_PROPS}><circle cx="12" cy="12" r="8"/><path d="M12 8 L12 13 M12 16 L12 16"/></svg>`,

  // ─── ナビゲーション ───
  register: `<svg ${SVG_PROPS}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 11 L21 11"/><circle cx="7" cy="15" r="0.6" fill="currentColor"/><circle cx="10" cy="15" r="0.6" fill="currentColor"/></svg>`,
  home:     `<svg ${SVG_PROPS}><path d="M4 11 L12 4 L20 11"/><path d="M6 10 L6 20 L18 20 L18 10"/><path d="M10 20 L10 14 L14 14 L14 20"/></svg>`,
  customers:`<svg ${SVG_PROPS}><circle cx="9" cy="9" r="3"/><path d="M3 19 C 3 15, 6 14, 9 14 C 12 14, 15 15, 15 19"/><circle cx="17" cy="10" r="2.5" stroke-dasharray="0"/><path d="M14 19 C 14 16, 17 15, 19 15.5 C 21 16, 21 18, 21 19"/></svg>`,
  holds:    `<svg ${SVG_PROPS}><path d="M3 7 L9 3 L21 9 L15 21 L3 15 Z"/><circle cx="8" cy="9" r="1.2" fill="currentColor"/></svg>`,
  inventory:`<svg ${SVG_PROPS}><rect x="3" y="7" width="18" height="13"/><path d="M3 11 L21 11"/><path d="M3 16 L21 16"/><path d="M8 7 L8 20"/><path d="M16 7 L16 20"/></svg>`,
  reviews:  `<svg ${SVG_PROPS}><path d="M12 3 L14.5 9.5 L21 9.5 L15.8 13.7 L17.7 20 L12 16 L6.3 20 L8.2 13.7 L3 9.5 L9.5 9.5 Z"/></svg>`,
  messaging:`<svg ${SVG_PROPS}><path d="M4 18 L4 6 C 4 5, 5 4, 6 4 L18 4 C 19 4, 20 5, 20 6 L20 14 C 20 15, 19 16, 18 16 L9 16 L4 20 Z"/></svg>`,
  products: `<svg ${SVG_PROPS}><path d="M5 9 L12 4 L19 9 L19 17 L12 21 L5 17 Z"/><path d="M5 9 L12 13 L19 9"/><path d="M12 13 L12 21"/></svg>`,
  settings: `<svg ${SVG_PROPS}><circle cx="12" cy="12" r="3"/><path d="M12 2 L13 4.5 M12 22 L13 19.5 M2 12 L4.5 11 M22 12 L19.5 11 M5 5 L7 7 M19 19 L17 17 M5 19 L7 17 M19 5 L17 7"/></svg>`,

  // ─── お知らせ・状態 ───
  birthday: `<svg ${SVG_PROPS}><path d="M5 13 L5 20 L19 20 L19 13"/><path d="M5 13 L5 11 C 5 10, 6 9, 7 9 L17 9 C 18 9, 19 10, 19 11 L19 13 Z"/><path d="M12 6 C 11 5, 11 4, 12 3 C 13 4, 13 5, 12 6 Z"/><line x1="12" y1="6" x2="12" y2="9"/></svg>`,
  newArrival:`<svg ${SVG_PROPS}><circle cx="6" cy="6" r="1.5"/><path d="M9 4 L12 4"/><circle cx="18" cy="6" r="1.5"/><path d="M4 10 L20 10 L18 20 L6 20 Z"/></svg>`,
  reserved: `<svg ${SVG_PROPS}><path d="M5 4 L19 4 L19 20 L12 17 L5 20 Z"/></svg>`,
  greet:    `<svg ${SVG_PROPS}><path d="M5 10 C 5 6, 9 4, 12 4 C 15 4, 19 6, 19 10 L19 14 C 19 18, 15 20, 12 20 C 9 20, 5 18, 5 14 Z"/><circle cx="9" cy="11" r="0.6" fill="currentColor"/><circle cx="15" cy="11" r="0.6" fill="currentColor"/><path d="M9 15 C 10.5 16.5, 13.5 16.5, 15 15"/></svg>`,
  gift:     `<svg ${SVG_PROPS}><rect x="4" y="10" width="16" height="11" rx="1"/><path d="M4 10 L4 7 L20 7 L20 10"/><path d="M12 7 L12 21"/><path d="M9 7 C 7 5, 7 3, 9 3 C 11 3, 12 5, 12 7 C 12 5, 13 3, 15 3 C 17 3, 17 5, 15 7"/></svg>`,

  // ─── 支払 ───
  tap:    `<svg ${SVG_PROPS}><rect x="6" y="3" width="12" height="18" rx="2"/><line x1="6" y1="17" x2="18" y2="17"/><circle cx="12" cy="19" r="1"/><path d="M2 9 C 4 7, 4 13, 2 11" opacity=".6"/><path d="M22 9 C 20 7, 20 13, 22 11" opacity=".6"/></svg>`,
  cash:   `<svg ${SVG_PROPS}><rect x="3" y="7" width="18" height="11" rx="1"/><circle cx="12" cy="12.5" r="2.5"/><circle cx="6" cy="10" r="0.6" fill="currentColor"/><circle cx="18" cy="15" r="0.6" fill="currentColor"/></svg>`,
  qrpay:  `<svg ${SVG_PROPS}><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><line x1="14" y1="14" x2="20" y2="14"/><line x1="14" y1="17" x2="17" y2="17"/><line x1="14" y1="20" x2="20" y2="20"/><line x1="17" y1="14" x2="17" y2="20"/></svg>`,

  // ─── UI 共通 ───
  qr:        `<svg ${SVG_PROPS}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/></svg>`,
  receipt:   `<svg ${SVG_PROPS}><path d="M6 3 L18 3 L18 21 L15 19 L12 21 L9 19 L6 21 Z"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
  printer:   `<svg ${SVG_PROPS}><rect x="6" y="3" width="12" height="6"/><path d="M3 9 L21 9 L21 17 L18 17 L18 13 L6 13 L6 17 L3 17 Z"/><rect x="6" y="15" width="12" height="6"/><line x1="9" y1="18" x2="15" y2="18"/></svg>`,
  scan:      `<svg ${SVG_PROPS}><path d="M3 7 L3 5 C 3 4, 4 3, 5 3 L7 3"/><path d="M17 3 L19 3 C 20 3, 21 4, 21 5 L21 7"/><path d="M21 17 L21 19 C 21 20, 20 21, 19 21 L17 21"/><path d="M7 21 L5 21 C 4 21, 3 20, 3 19 L3 17"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`,
  search:    `<svg ${SVG_PROPS}><circle cx="11" cy="11" r="6.5"/><line x1="16" y1="16" x2="21" y2="21"/></svg>`,
  close:     `<svg ${SVG_PROPS}><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>`,
  back:      `<svg ${SVG_PROPS}><line x1="20" y1="12" x2="4" y2="12"/><path d="M10 6 L4 12 L10 18"/></svg>`,
  check:     `<svg ${SVG_PROPS}><path d="M5 13 L10 18 L20 6"/></svg>`,
  plus:      `<svg ${SVG_PROPS}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  arrow:     `<svg ${SVG_PROPS}><line x1="4" y1="12" x2="20" y2="12"/><path d="M14 6 L20 12 L14 18"/></svg>`,
  menu:      `<svg ${SVG_PROPS}><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,

  // ─── アパレル (服飾) ───
  shirt:     `<svg ${SVG_PROPS}><path d="M6 6 L4 8 L6 12 L7 10 L7 20 L17 20 L17 10 L18 12 L20 8 L18 6 L15 4 L9 4 Z"/><path d="M9 4 C 10 6, 14 6, 15 4"/></svg>`,
  cardigan:  `<svg ${SVG_PROPS}><path d="M6 5 L4 9 L6 13 L7 11 L7 21 L17 21 L17 11 L18 13 L20 9 L18 5 L14 3 L10 3 Z"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`,
  bag:       `<svg ${SVG_PROPS}><path d="M5 9 L19 9 L18 21 L6 21 Z"/><path d="M8 9 C 8 5, 16 5, 16 9"/></svg>`,
  hat:       `<svg ${SVG_PROPS}><ellipse cx="12" cy="17" rx="9" ry="2"/><path d="M7 17 C 7 12, 8 6, 12 6 C 16 6, 17 12, 17 17"/></svg>`,
  accessory: `<svg ${SVG_PROPS}><circle cx="12" cy="9" r="2"/><path d="M12 11 L9 21 M12 11 L15 21"/><path d="M9 5 L15 5"/></svg>`,
  scarf:     `<svg ${SVG_PROPS}><path d="M8 3 C 6 8, 8 12, 10 14 L 10 21 L 14 21 L 14 14 C 16 12, 18 8, 16 3 Z"/></svg>`,

  // ─── 雑貨店モチーフ (signature 周辺) ───
  sprout:    `<svg ${SVG_PROPS}><path d="M12 20 L12 11"/><path d="M12 11 C 6 11, 4 6, 4 4 C 6 4, 11 5, 12 11"/><path d="M12 11 C 18 11, 20 6, 20 4 C 18 4, 13 5, 12 11"/></svg>`,
  paper:     `<svg ${SVG_PROPS}><path d="M5 3 L15 3 L19 7 L19 21 L5 21 Z"/><path d="M15 3 L15 7 L19 7"/></svg>`,
  hanko:     `<svg ${SVG_PROPS}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 17 L7 7 L10 7 L12 13 L14 7 L17 7 L17 17" stroke-width="2"/></svg>`,
  sparkle:   `<svg ${SVG_PROPS}><path d="M12 3 L13.5 10.5 L21 12 L13.5 13.5 L12 21 L10.5 13.5 L3 12 L10.5 10.5 Z"/></svg>`,
};

/**
 * SVG パターン (背景用) — data URI で CSS background-image に使う
 */
export const PATTERNS = {
  // 麻の葉 (シームレスタイル 80x80)
  asanoha: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><g fill="none" stroke="%231f3328" stroke-width="0.7" stroke-linecap="round" opacity="0.5"><path d="M40 0 L40 40 M40 0 L20 14 M40 0 L60 14 M40 40 L20 26 M40 40 L60 26 M20 14 L20 40 M60 14 L60 40 M20 14 L60 26 M60 14 L20 26 M0 40 L40 40 L40 80 M40 80 L20 66 M40 80 L60 66 M40 40 L20 54 M40 40 L60 54 M20 54 L20 80 M60 54 L60 80 M20 54 L60 66 M60 54 L20 66 M80 40 L40 40"/></g></svg>`)}`,
  // 七宝 (円が重なるパターン)
  shippo: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><g fill="none" stroke="%232e4a3a" stroke-width="0.6" opacity="0.18"><circle cx="30" cy="30" r="20"/><circle cx="0" cy="30" r="20"/><circle cx="60" cy="30" r="20"/><circle cx="30" cy="0" r="20"/><circle cx="30" cy="60" r="20"/></g></svg>`)}`,
  // 青海波 (波の重なり)
  seigaiha: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><g fill="none" stroke="%232e4a3a" stroke-width="0.7" opacity="0.18"><path d="M0 20 Q 10 0 20 20 T 40 20"/><path d="M0 16 Q 10 -4 20 16 T 40 16"/><path d="M0 12 Q 10 -8 20 12 T 40 12"/></g></svg>`)}`,
  // 和紙風 ノイズ (粒子感)
  washi: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0.11 0 0 0 0 0.10 0 0 0 0 0.08 0 0 0 0.07 0"/></filter><rect width="200" height="200" filter="url(%23n)"/></svg>`)}`,
};

/**
 * SVG文字列をサイズ・classを差込んで返す
 * @param {string} name - ICONS のキー
 * @param {object} opts - { size: number, cls: string, color: string }
 */
export function icon(name, opts = {}) {
  const svg = ICONS[name];
  if (!svg) return '';
  const size = opts.size || 22;
  const cls = opts.cls || 'ico';
  let out = svg.replace(/^<svg /, `<svg class="${cls}" width="${size}" height="${size}" `);
  if (opts.color) out = out.replace('stroke="currentColor"', `stroke="${opts.color}"`);
  return out;
}

/**
 * MEI 落款 ロゴ (signature element)
 * 朱土地に白抜きの「M」、 雑貨と道具の銘印。
 * @param {object} opts - { size: number, color?: string (背景), inkColor?: string (文字) }
 */
export function logoMark(opts = {}) {
  const size = opts.size || 28;
  const bg = opts.color || '#b25538';
  const ink = opts.inkColor || '#f7f6f1';
  const cls = opts.cls || 'logo-mark';
  return `<svg class="${cls}" viewBox="0 0 32 32" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="32" height="32" rx="5" fill="${bg}"/>
    <path d="M7.5 23 L7.5 9.5 L11 9.5 L16 19 L21 9.5 L24.5 9.5 L24.5 23" stroke="${ink}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
}

/**
 * 落款を 全画面ヘッダの「印影」 として大きく置く時の variant
 * 角度を少し傾けて 朱印らしさを出す
 */
export function hankoBig(opts = {}) {
  const size = opts.size || 80;
  const bg = opts.color || '#b25538';
  return `<svg viewBox="0 0 80 80" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(-3 40 40)">
      <rect x="6" y="6" width="68" height="68" rx="10" fill="${bg}"/>
      <path d="M18 58 L18 22 L26 22 L40 48 L54 22 L62 22 L62 58" stroke="#f7f6f1" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <rect x="6" y="6" width="68" height="68" rx="10" fill="none" stroke="#8e3f25" stroke-width="1" opacity=".4"/>
    </g>
  </svg>`;
}
