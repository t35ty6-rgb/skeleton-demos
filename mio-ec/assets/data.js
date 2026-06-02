/* MIO ストア — 商品データローダー
   data/products.json から商品データを取得し、ページ内の指定スロットにレンダリング。
   data/products.json は GitHub Actions (.github/workflows/sync-stripe-products.yml)
   により Stripe Dashboard と自動同期される設計。
*/
(function(){
  const DATA_URL = 'data/products.json';
  // sub-pages (success.html等) からも data/ にアクセスできるよう絶対パス補正
  const BASE = location.pathname.replace(/[^/]*$/,'');

  function yen(n){ return '¥' + n.toLocaleString('ja-JP'); }
  function withTax(p){ return Math.round(p * (1 + p.taxRate ? p.taxRate : 0.10)); }
  function calcTaxIncluded(price, rate){ return Math.round(price * (1 + (rate||0.10))); }
  function escapeHtml(s){
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function nl2br(s){ return escapeHtml(s).replace(/\n/g,'<br>'); }

  const MioData = {
    _cache: null,
    _pending: null,

    async load(){
      if (this._cache) return this._cache;
      if (this._pending) return this._pending;
      this._pending = fetch(DATA_URL, {cache:'no-cache'}).then(r => {
        if (!r.ok) throw new Error('products.json fetch failed: ' + r.status);
        return r.json();
      }).then(data => {
        // sort by displayOrder
        data.products = (data.products || []).filter(p => p.active !== false)
          .sort((a,b) => (a.displayOrder||999) - (b.displayOrder||999));
        this._cache = data;
        return data;
      }).catch(err => {
        console.error('[MIO] data load error', err);
        return {products: []};
      });
      return this._pending;
    },

    async getBySlug(slug){
      const data = await this.load();
      return (data.products || []).find(p => p.slug === slug);
    },

    /* === Card rendering (used by index.html / products.html) === */
    renderCard(p){
      const tagClass = p.tagStyle === 'shu' ? 'prod-tag shu' : 'prod-tag';
      const tagHtml = p.tag ? `<div class="${tagClass}">${escapeHtml(p.tag)}</div>` : '';
      const detailUrl = `product.html?slug=${encodeURIComponent(p.slug)}`;
      return `
<a href="${detailUrl}" class="prod">
  <div class="prod-img">
    <img src="${escapeHtml(p.images.main)}" alt="${escapeHtml(p.name)}">
    ${tagHtml}
  </div>
  <div class="prod-body">
    <div class="prod-cat">${escapeHtml(p.category)}</div>
    <div class="prod-name">${escapeHtml(p.name)}</div>
    <div class="prod-maker">${escapeHtml(p.maker)}</div>
    <div class="prod-desc">${escapeHtml(p.shortDescription || '')}</div>
    <div class="prod-bottom">
      <div class="prod-price"><strong>${yen(p.priceTaxExcluded)}</strong><span>税抜</span></div>
      <span class="prod-arrow">→</span>
    </div>
  </div>
</a>`;
    },

    renderCardCompact(p){
      // PDP related products use compact (no description) cards
      const tagClass = p.tagStyle === 'shu' ? 'prod-tag shu' : 'prod-tag';
      const tagHtml = p.tag ? `<div class="${tagClass}">${escapeHtml(p.tag)}</div>` : '';
      const detailUrl = `product.html?slug=${encodeURIComponent(p.slug)}`;
      return `
<a href="${detailUrl}" class="prod">
  <div class="prod-img">
    <img src="${escapeHtml(p.images.main)}" alt="${escapeHtml(p.name)}">
    ${tagHtml}
  </div>
  <div class="prod-body">
    <div class="prod-cat">${escapeHtml(p.category)}</div>
    <div class="prod-name">${escapeHtml(p.name)}</div>
    <div class="prod-maker">${escapeHtml(p.maker)}</div>
    <div class="prod-bottom"><div class="prod-price"><strong>${yen(p.priceTaxExcluded)}</strong><span>税抜</span></div><span class="prod-arrow">→</span></div>
  </div>
</a>`;
    },

    /* === Detail (PDP) rendering === */
    renderPDP(p){
      const taxIncluded = calcTaxIncluded(p.priceTaxExcluded, p.taxRate);
      const taxAmount = taxIncluded - p.priceTaxExcluded;
      const specsHtml = (p.specs || []).map(s =>
        `<dl><dt>${escapeHtml(s.label)}</dt><dd>${escapeHtml(s.value)}</dd></dl>`
      ).join('');
      const thumbsHtml = (p.images.thumbs || [p.images.main]).map(src =>
        `<div><img src="${escapeHtml(src)}" alt=""></div>`
      ).join('');
      const badgeHtml = p.badge ? `<div class="badge">${escapeHtml(p.badge)}</div>` : '';
      const shippingHtml = p.shippingFee ? `全国一律 ¥${p.shippingFee.toLocaleString('ja-JP')}（地域により異なる場合あり）` : 'お問い合わせください';

      return `
<div style="background:var(--sky-pale);padding:18px 24px;font-size:11px;letter-spacing:.2em;color:var(--ink-sub)">
  <div style="max-width:1280px;margin:0 auto">
    <a href="index.html">HOME</a> ／ <a href="products.html">PRODUCTS</a> ／ <a href="products.html">${escapeHtml(p.category)}</a> ／ ${escapeHtml(p.name)}
  </div>
</div>

<section class="pdp">
  <div class="pdp-gallery">
    <div class="pdp-main">
      ${badgeHtml}
      <img src="${escapeHtml(p.images.main)}" alt="${escapeHtml(p.name)}">
    </div>
    <div class="pdp-thumbs">${thumbsHtml}</div>
  </div>

  <div class="pdp-info">
    <div class="pdp-cat">${escapeHtml(p.category)} ／ ${escapeHtml(p.categoryJa || '')}</div>
    <h1>${escapeHtml(p.name)}</h1>
    <div class="pdp-maker">${escapeHtml(p.maker)}</div>

    <div class="pdp-price">
      <strong>${yen(p.priceTaxExcluded)}</strong>
      <span class="unit">税抜（消費税 ${yen(taxAmount)}）</span>
      <span class="tax">送料別</span>
    </div>

    <div class="pdp-buynow">
      <div class="pdp-qty">
        <button aria-label="数量を減らす">−</button>
        <span>1</span>
        <button aria-label="数量を増やす">＋</button>
      </div>
      <div class="pdp-actions">
        <a class="btn-cart" href="${escapeHtml(p.paymentLink || '#')}">この商品を注文する →</a>
        <button class="btn-fav" aria-label="お気に入りに追加">♡</button>
      </div>
      <div class="pdp-meta-inline">
        <span>製作 ${escapeHtml(p.leadTimeText || '—')}</span>
        <span>${escapeHtml(shippingHtml)}</span>
      </div>
    </div>

    <div class="pdp-desc">${nl2br(p.description)}</div>

    <div class="pdp-spec">
      ${specsHtml}
      <dl><dt>製作日数目安</dt><dd>${escapeHtml(p.leadTimeText)}</dd></dl>
      <dl><dt>送料</dt><dd>${escapeHtml(shippingHtml)}</dd></dl>
    </div>

    ${p.note ? `<div class="pdp-note">${p.note}</div>` : ''}
  </div>
</section>

<div class="pdp-sticky" data-pdp-sticky>
  <div class="pdp-sticky-inner">
    <div class="pdp-sticky-info">
      <div class="pdp-sticky-name">${escapeHtml(p.name)}</div>
      <div class="pdp-sticky-price"><strong>${yen(p.priceTaxExcluded)}</strong><span>税抜</span></div>
    </div>
    <a class="pdp-sticky-cta" href="${escapeHtml(p.paymentLink || '#')}">注文する →</a>
  </div>
</div>

${p.makerQuote ? `
<section style="background:var(--sky-pale);padding:100px 24px">
  <div class="wrap">
    <div class="section-head">
      <span class="section-eyebrow">FROM THE MAKER</span>
      <h2 class="section-title">作り手から、ひとこと。</h2>
    </div>
    <div style="max-width:780px;margin:0 auto;font-family:var(--serif);font-size:15px;line-height:2.4;color:var(--ink-sub);text-align:center">
      <p style="margin-bottom:24px">${nl2br(p.makerQuote.body)}</p>
      <p style="margin-top:32px;letter-spacing:.2em;font-size:13px;color:var(--ink)">— ${escapeHtml(p.makerQuote.author)}</p>
    </div>
  </div>
</section>` : ''}
`;
    },

    renderRelated(currentSlug, all){
      const related = all.filter(p => p.slug !== currentSlug).slice(0, 2);
      const cards = related.map(p => this.renderCardCompact(p)).join('');
      return `
<section style="padding:100px 24px;background:#fff">
  <div class="wrap">
    <div class="section-head">
      <span class="section-eyebrow">RELATED</span>
      <h2 class="section-title" style="font-size:28px">こちらもおすすめ。</h2>
    </div>
    <div class="prod-row">
      ${cards}
      <a href="about.html" class="prod" style="background:var(--ink);color:#fff">
        <div class="prod-img" style="background:linear-gradient(135deg,#5eb9d6,#2a7a98);display:flex;align-items:center;justify-content:center">
          <svg style="width:80px;height:40px;color:#fff" viewBox="0 0 100 50" fill="currentColor"><path d="M 10 42 Q 18 30 28 32 Q 36 32 44 38 L 56 38 Z"/><path d="M 32 42 Q 48 14 64 36 L 82 36 L 82 42 Z"/><circle cx="74" cy="20" r="6"/></svg>
        </div>
        <div class="prod-body">
          <div class="prod-cat" style="color:var(--sky)">ABOUT</div>
          <div class="prod-name" style="color:#fff">MIO というブランドについて</div>
          <div class="prod-desc" style="color:#9bb8c4">大野商工会議所が立ち上げた、地元の匠とプロダクトデザイナーが共創する公式アウトドアブランドです。</div>
          <div class="prod-bottom" style="border-top-color:rgba(255,255,255,.15)"><span style="font-size:11px;letter-spacing:.25em;color:var(--sky)">READ MORE</span><span class="prod-arrow" style="color:var(--sky)">→</span></div>
        </div>
      </a>
    </div>
  </div>
</section>`;
    },

    /* === Footer dynamic links === */
    renderShopLinks(){
      if (!this._cache) return '';
      return this._cache.products.map(p =>
        `<a href="product.html?slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.name)}</a>`
      ).join('');
    }
  };

  window.MioData = MioData;

  /* === Auto-renderers (attach via data-mio-render attribute) === */
  document.addEventListener('DOMContentLoaded', async () => {
    const data = await MioData.load();

    // Featured/grid lists
    document.querySelectorAll('[data-mio-render="product-list"]').forEach(el => {
      const limit = parseInt(el.dataset.limit || '0', 10) || data.products.length;
      el.innerHTML = data.products.slice(0, limit).map(p => MioData.renderCard(p)).join('');
    });

    // Product count
    document.querySelectorAll('[data-mio-render="product-count"]').forEach(el => {
      el.textContent = data.products.length;
    });

    // Footer SHOP links
    document.querySelectorAll('[data-mio-render="shop-links"]').forEach(el => {
      el.innerHTML = '<h4>SHOP</h4><a href="products.html">すべての商品</a>' + MioData.renderShopLinks();
    });

    // PDP (single product)
    const pdpEl = document.querySelector('[data-mio-render="pdp"]');
    if (pdpEl){
      const slug = new URLSearchParams(location.search).get('slug') || data.products[0]?.slug;
      const p = data.products.find(x => x.slug === slug);
      if (!p){
        pdpEl.innerHTML = `<section style="padding:120px 24px;text-align:center"><h2 style="font-family:var(--serif);font-size:24px;letter-spacing:.1em">お探しの商品が見つかりません。</h2><p style="margin-top:24px"><a href="products.html" class="btn btn-dark" style="color:var(--ink);border-color:var(--ink)">商品一覧へ →</a></p></section>`;
        return;
      }
      document.title = `${p.name} ／ ${p.maker} ｜ MIO`;
      pdpEl.innerHTML = MioData.renderPDP(p) + MioData.renderRelated(p.slug, data.products);
    }
  });
})();
