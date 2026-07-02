/**
 * サン・クロレラ 統合LINE OS SVG アイコンセット (stroke 1.75, currentColor)
 */

const A = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
  leaf:      `<svg ${A}><path d="M12 22c0-6 4-11 10-12-1 6-4 10-10 12z"/><path d="M12 22C6 20 3 16 2 10c6 1 10 5 10 12z"/><path d="M12 22v-9"/></svg>`,
  home:      `<svg ${A}><path d="M3 12l9-8 9 8v8a2 2 0 0 1-2 2h-3v-6H10v6H5a2 2 0 0 1-2-2z"/></svg>`,
  users:     `<svg ${A}><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M17 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87"/></svg>`,
  user:      `<svg ${A}><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>`,
  cart:      `<svg ${A}><path d="M3 4h2l2.5 12h11L21 8H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>`,
  package:   `<svg ${A}><path d="M20 7l-8-4-8 4 8 4 8-4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg>`,
  refresh:   `<svg ${A}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M21 3v5h-5M3 21v-5h5"/></svg>`,
  bell:      `<svg ${A}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
  send:      `<svg ${A}><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>`,
  calendar:  `<svg ${A}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`,
  clock:     `<svg ${A}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  qr:        `<svg ${A}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM17 17h4v4h-4zM14 20h3"/></svg>`,
  chart:     `<svg ${A}><path d="M18 20V10M12 20V4M6 20v-6"/></svg>`,
  medal:     `<svg ${A}><circle cx="12" cy="14" r="6"/><path d="M8 8L6 3h12l-2 5"/></svg>`,
  edit:      `<svg ${A}><path d="M11 4H4v16h16v-7"/><path d="M18 2l4 4-10 10H8v-4z"/></svg>`,
  plus:      `<svg ${A}><path d="M12 5v14M5 12h14"/></svg>`,
  check:     `<svg ${A}><path d="M20 6L9 17l-5-5"/></svg>`,
  x:         `<svg ${A}><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  chevronR:  `<svg ${A}><path d="M9 6l6 6-6 6"/></svg>`,
  chevronL:  `<svg ${A}><path d="M15 6l-6 6 6 6"/></svg>`,
  chevronD:  `<svg ${A}><path d="M6 9l6 6 6-6"/></svg>`,
  arrowU:    `<svg ${A}><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,
  arrowD:    `<svg ${A}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>`,
  search:    `<svg ${A}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`,
  filter:    `<svg ${A}><path d="M3 6h18M6 12h12M10 18h4"/></svg>`,
  yen:       `<svg ${A}><path d="M6 4l6 8 6-8M6 12h12M6 16h12M12 12v8"/></svg>`,
  phone:     `<svg ${A}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2z"/></svg>`,
  location:  `<svg ${A}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  ticket:    `<svg ${A}><path d="M3 8V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M12 4v16"/></svg>`,
  crown:     `<svg ${A}><path d="M2 8l4 10h12l4-10-6 4-4-7-4 7z"/></svg>`,
  chat:      `<svg ${A}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  gift:      `<svg ${A}><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9M12 8a4 4 0 0 0-4-4 2 2 0 0 0 0 4M12 8a4 4 0 0 1 4-4 2 2 0 0 1 0 4"/></svg>`,
  megaphone: `<svg ${A}><path d="M3 11v2a1 1 0 0 0 1 1h2l8 5V5L6 10H4a1 1 0 0 0-1 1z"/><path d="M17 7a5 5 0 0 1 0 10"/></svg>`,
  file:      `<svg ${A}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 3v4h4"/></svg>`,
  card:      `<svg ${A}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>`,
  cog:       `<svg ${A}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.7.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.7V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>`,
  logout:    `<svg ${A}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>`,
  print:     `<svg ${A}><path d="M6 9V4h12v5M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>`,
  heart:     `<svg ${A}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
  sparkle:   `<svg ${A}><path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 15.8 10.2 11.2 6 9.4l4.2-1.8z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></svg>`,
  drop:      `<svg ${A}><path d="M12 2s6 8 6 13a6 6 0 0 1-12 0c0-5 6-13 6-13z"/></svg>`,
};

export function icon(name, opts = {}) {
  const svg = ICONS[name] || ICONS.leaf;
  return svg.replace('<svg ', `<svg class="ic ${opts.class || ''}" style="width:${opts.size||18}px;height:${opts.size||18}px" `);
}
