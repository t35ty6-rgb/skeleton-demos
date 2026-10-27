(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (new URLSearchParams(location.search).has('check')) body.classList.add('show-chk');

  // メニュー
  const burger = document.querySelector('.burger');
  const gnav = document.getElementById('gnav');
  const setMenu = (open) => {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    gnav.setAttribute('aria-hidden', !open);
  };
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  gnav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // 表示アニメーション
  const io = new IntersectionObserver((ents) => {
    ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));

  // スライダー
  document.querySelectorAll('[data-slider]').forEach((sl) => {
    const imgs = [...sl.querySelectorAll('.slider__view img')];
    const dots = sl.querySelector('.slider__dots');
    let i = 0, timer;
    const go = (n) => {
      i = (n + imgs.length) % imgs.length;
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === i));
      [...dots.children].forEach((d, k) => d.setAttribute('aria-pressed', k === i));
    };
    imgs.forEach((_, k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', `${k + 1}枚目の写真`);
      b.addEventListener('click', () => { go(k); restart(); });
      dots.appendChild(b);
    });
    const restart = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => go(i + 1), 4200); };
    go(0); restart();
  });

  // ブログカードをドラッグで横移動
  const cards = document.querySelector('.blog__cards');
  if (cards) {
    let down = false, sx = 0, sl = 0, moved = false;
    cards.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = cards.scrollLeft; cards.classList.add('drag'); });
    addEventListener('pointerup', () => { down = false; cards.classList.remove('drag'); });
    cards.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; cards.scrollLeft = sl - dx; });
    cards.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
  }

  // スクロール連動（厨房の写真・海鮮丼・自転車・ロゴ）
  const par = document.querySelector('[data-parallax]');
  const spin = document.querySelector('[data-spin]');
  const ride = document.querySelector('[data-ride]');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const vh = innerHeight;
    body.classList.toggle('is-scrolled', scrollY > 120);
    if (reduce) return;
    if (par) {
      const r = par.parentElement.getBoundingClientRect();
      const p = (vh - r.top) / (vh + r.height);
      par.style.transform = `translate3d(0,${(-p * 22).toFixed(2)}%,0)`;
    }
    if (spin) {
      const r = spin.getBoundingClientRect();
      spin.style.transform = `rotate(${((vh - r.top) * 0.08).toFixed(2)}deg)`;
    }
    if (ride) {
      const r = ride.parentElement.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9)));
      ride.style.transform = `translate3d(${(p * 240).toFixed(1)}px,0,0)`;
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
})();
