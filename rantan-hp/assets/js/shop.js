/* ============================================================
   rantan.fukui.jp — EC (LocalStorage cart)
   ============================================================ */
(function() {

const PRODUCTS = [
  { sku: 'pripetto-plain',        cat: 'pripetto',  name: '1 ホール プレーン',                    sub: '16 カット・冷凍',           price: 3800, img: 'assets/img/cheesecake-single.jpg',    tags: ['Pripetto', 'Whole'] },
  { sku: 'pripetto-matcha',       cat: 'pripetto',  name: '1 ホール 抹茶',                       sub: '16 カット・冷凍',           price: 4200, img: 'assets/img/cheesecake-matcha.jpg',    tags: ['Pripetto', 'Whole'] },
  { sku: 'pripetto-tsurushigaki', cat: 'pripetto',  name: '1 ホール 今庄つるし柿',                 sub: '11–12 月限定・冷凍',        price: 4500, img: 'assets/img/cheesecake-image.jpg',     tags: ['Pripetto', 'Seasonal'], seasonal: '11-12月限定' },
  { sku: 'pripetto-3set',         cat: 'pripetto',  name: '3 種セット',                          sub: '各 1/2 ホール・冷凍',        price: 5800, img: 'assets/img/cheesecake-lineup.jpg',    tags: ['Pripetto', 'Set'] },
  { sku: 'pripetto-birthday',     cat: 'pripetto',  name: 'バースデー ホール',                     sub: 'プレート・キャンドル無料',    price: 4200, img: 'assets/img/cheesecake-birthday.jpg',  tags: ['Pripetto', 'Occasion'] },
  { sku: 'pripetto-xmas',         cat: 'pripetto',  name: 'クリスマス ホール',                    sub: '12 月限定デコレーション',     price: 4500, img: 'assets/img/cheesecake-xmas.jpg',      tags: ['Pripetto', 'Occasion'], seasonal: '12月限定' },

  { sku: 'persimmon-6',   cat: 'persimmon', name: '化粧箱 6 個入',   sub: 'ご贈答向け・常温便',   price: 3800, tags: ['つるし柿', '化粧箱'], seasonal: '11–12月末発送' },
  { sku: 'persimmon-10',  cat: 'persimmon', name: '化粧箱 10 個入',  sub: 'ご贈答向け・常温便',   price: 5800, tags: ['つるし柿', '化粧箱'], seasonal: '11–12月末発送' },
  { sku: 'persimmon-15',  cat: 'persimmon', name: '化粧箱 15 個入',  sub: '特別なご贈答に',       price: 8400, tags: ['つるし柿', '化粧箱'], seasonal: '11–12月末発送' },
  { sku: 'persimmon-5',   cat: 'persimmon', name: '簡易箱 5 個入',   sub: 'ご自宅用',            price: 2800, tags: ['つるし柿', '簡易箱'], seasonal: '11–12月末発送' },
];

const SHIPPING_FEE = 1200;
const SHIPPING_FEE_REMOTE = 1800; // 北海道・沖縄

const CART_KEY = 'rantanCart-v1';

const Cart = {
  items: [],
  load() {
    try { this.items = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch (e) { this.items = []; }
    return this.items;
  },
  save() {
    localStorage.setItem(CART_KEY, JSON.stringify(this.items));
    this._notify();
  },
  add(sku, qty = 1) {
    const p = PRODUCTS.find(x => x.sku === sku);
    if (!p) return;
    const existing = this.items.find(x => x.sku === sku);
    if (existing) existing.qty += qty;
    else this.items.push({ sku, name: p.name, sub: p.sub, price: p.price, img: p.img, qty });
    this.save();
  },
  update(sku, qty) {
    const it = this.items.find(x => x.sku === sku);
    if (!it) return;
    it.qty = Math.max(1, Math.min(99, qty));
    this.save();
  },
  remove(sku) {
    this.items = this.items.filter(x => x.sku !== sku);
    this.save();
  },
  clear() {
    this.items = [];
    this.save();
  },
  subtotal() {
    return this.items.reduce((s, x) => s + x.price * x.qty, 0);
  },
  totalQty() {
    return this.items.reduce((s, x) => s + x.qty, 0);
  },
  shipping(remote = false) {
    if (this.items.length === 0) return 0;
    return remote ? SHIPPING_FEE_REMOTE : SHIPPING_FEE;
  },
  total(remote = false) {
    return this.subtotal() + this.shipping(remote);
  },
  _notify() {
    document.dispatchEvent(new CustomEvent('cart:update', { detail: { items: this.items } }));
  }
};

Cart.load();

// Cart badge — updates any element with data-cart-count
function updateCartBadge() {
  const n = Cart.totalQty();
  document.querySelectorAll('[data-cart-count]').forEach(el => {
    el.textContent = n;
    el.hidden = n === 0;
    el.setAttribute('aria-label', `カート ${n}点`);
  });
}
document.addEventListener('cart:update', updateCartBadge);
document.addEventListener('DOMContentLoaded', updateCartBadge);

// JPY formatter
const yen = n => '¥' + n.toLocaleString('ja-JP');

// Toast
function toast(msg) {
  let t = document.getElementById('_toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '_toast';
    t.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:oklch(0.82 0.16 68);color:oklch(0.095 0.02 260);padding:0.9rem 1.4rem;font-weight:600;letter-spacing:0.06em;z-index:100;transition:opacity .3s,transform .3s;opacity:0;pointer-events:none;font-size:0.9rem;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(-4px)';
    clearTimeout(t._to);
    t._to = setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(0)';
    }, 2000);
  });
}

window.RantanShop = { PRODUCTS, Cart, yen, toast, SHIPPING_FEE, SHIPPING_FEE_REMOTE };

})();
