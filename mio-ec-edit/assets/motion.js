/* MIO motion layer
   - Scroll-triggered fade-in for sections, cards, makers
   - Hero SCROLL indicator smooth fade-out when user scrolls
   - Nav background tightens after hero
   - Smooth in-page anchor scroll
   - Subtle hero mountain parallax
*/
(function(){
  const REVEAL_SELECTORS = [
    '.section-head',
    '.concept-grid',
    '.cat',
    '.story-card',
    '.maker',
    '.j-card',
    '.activity-strip > div',
    '.news-box',
    '.about-sec > *'
  ];
  const PROD_SELECTOR = '.prod-row > .prod, .prod-row > a';

  const seen = new WeakSet();
  let io;

  function ensureObserver(){
    if (io) return io;
    io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting){
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
    return io;
  }

  function attach(el, index){
    if (seen.has(el)) return;
    seen.add(el);
    el.classList.add('reveal');
    if (typeof index === 'number'){
      el.style.transitionDelay = (Math.min(index, 8) * 70) + 'ms';
    }
    ensureObserver().observe(el);
  }

  function attachAll(){
    REVEAL_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach((el, i) => attach(el, i));
    });
    // Product cards get stagger by position
    document.querySelectorAll(PROD_SELECTOR).forEach((el, i) => attach(el, i));
  }

  /* Hero SCROLL indicator: fade + slight drift as user scrolls */
  function hookHeroScroll(){
    const tag = document.querySelector('.hero-scroll');
    if (!tag) return;
    tag.style.transition = 'opacity .35s ease';
    let raf = false;
    function update(){
      const y = window.scrollY;
      const op = Math.max(0, 1 - y / 180);
      tag.style.opacity = op.toFixed(2);
      tag.style.pointerEvents = op < .1 ? 'none' : '';
      raf = false;
    }
    update();
    window.addEventListener('scroll', () => {
      if (!raf){ requestAnimationFrame(update); raf = true; }
    }, {passive: true});
  }

  /* Nav: subtle shadow appears after scrolling */
  function hookNav(){
    const nav = document.querySelector('.nav');
    if (!nav) return;
    let raf = false;
    function update(){
      nav.classList.toggle('is-scrolled', window.scrollY > 24);
      raf = false;
    }
    update();
    window.addEventListener('scroll', () => {
      if (!raf){ requestAnimationFrame(update); raf = true; }
    }, {passive: true});
  }

  /* Hero mountain parallax — small drift only */
  function hookParallax(){
    const mountains = document.querySelector('.hero-mountains');
    if (!mountains) return;
    let raf = false;
    function update(){
      const y = window.scrollY;
      // small downward drift so mountains "stay" a beat
      mountains.style.transform = `translateY(${Math.min(y * 0.18, 80)}px)`;
      raf = false;
    }
    window.addEventListener('scroll', () => {
      if (!raf){ requestAnimationFrame(update); raf = true; }
    }, {passive: true});
  }

  /* PDP sticky buy bar: appear after user scrolls past the main buynow block */
  function hookStickyBuy(){
    const bar = document.querySelector('[data-pdp-sticky]');
    if (!bar) return;
    const buynow = document.querySelector('.pdp-buynow');
    if (!buynow){ bar.classList.add('is-visible'); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        // bar visible when buynow is NOT in viewport (scrolled past or before)
        // we only want to show after scrolling past, so check intersection ratio + position
        const rect = e.target.getBoundingClientRect();
        const scrolledPast = rect.bottom < 60;
        bar.classList.toggle('is-visible', scrolledPast);
      });
    }, { threshold: [0, 0.1, 0.5, 1] });
    io.observe(buynow);
    // also re-check on scroll for safety
    let raf = false;
    window.addEventListener('scroll', () => {
      if (raf) return;
      requestAnimationFrame(() => {
        const rect = buynow.getBoundingClientRect();
        bar.classList.toggle('is-visible', rect.bottom < 60);
        raf = false;
      });
      raf = true;
    }, {passive:true});
  }

  /* Smooth anchor links */
  function hookSmoothAnchors(){
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const tgt = document.querySelector(href);
      if (!tgt) return;
      e.preventDefault();
      const rect = tgt.getBoundingClientRect();
      const nav = document.querySelector('.nav');
      const offset = nav ? nav.offsetHeight + 8 : 0;
      window.scrollTo({ top: window.scrollY + rect.top - offset, behavior: 'smooth' });
    });
  }

  function init(){
    hookHeroScroll();
    hookNav();
    hookParallax();
    hookSmoothAnchors();
    attachAll();
    // Re-scan after dynamic content (products / PDP) renders
    setTimeout(() => { attachAll(); hookStickyBuy(); }, 250);
    setTimeout(() => { attachAll(); hookStickyBuy(); }, 1000);
    // Also observe DOM mutations for late renders
    const mo = new MutationObserver(() => attachAll());
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
