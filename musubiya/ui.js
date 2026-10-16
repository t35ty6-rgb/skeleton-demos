/* 心プラス 動き + スマホUI */
(function () {
  var d = document, root = d.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  /* 進捗バー */
  var bar = d.createElement('div'); bar.className = 'pgbar'; d.body.appendChild(bar);

  /* ハンバーガーとドロワー（既存ナビから自動で作る） */
  var hd = d.querySelector('.hd'), nav = d.querySelector('.nav');
  if (hd && nav) {
    var hb = d.createElement('button');
    hb.className = 'hb'; hb.type = 'button';
    hb.setAttribute('aria-label', 'メニューを開く'); hb.setAttribute('aria-expanded', 'false');
    hb.innerHTML = '<span></span>';
    nav.appendChild(hb);
    var dr = d.createElement('nav'); dr.className = 'drawer'; dr.setAttribute('aria-label', 'メニュー');
    var links = nav.querySelectorAll('a:not(.btn)'), i = 0;
    links.forEach(function (a) {
      var c = d.createElement('a'); c.className = 'dl'; c.href = a.getAttribute('href'); c.textContent = a.textContent;
      c.style.transitionDelay = (0.12 + i++ * 0.06) + 's'; dr.appendChild(c);
    });
    var pics = [].slice.call(d.querySelectorAll('.flow .st img, .mc .ph img')).slice(0, 3);
    if (pics.length === 3) {
      var row = d.createElement('div'); row.className = 'dimg';
      pics.forEach(function (p) { var im = d.createElement('img'); im.src = p.getAttribute('src'); im.alt = ''; row.appendChild(im); });
      dr.appendChild(row);
    }
    var cta = nav.querySelector('.btn');
    if (cta) { var b = cta.cloneNode(true); b.classList.remove('btn--s'); dr.appendChild(b); }
    d.body.appendChild(dr);
    var toggle = function (open) {
      root.classList.toggle('menu-open', open);
      hb.setAttribute('aria-expanded', open ? 'true' : 'false');
      hb.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    };
    hb.addEventListener('click', function () { toggle(!root.classList.contains('menu-open')); });
    dr.addEventListener('click', function (e) { if (e.target.closest('a')) toggle(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
  }

  /* お惣菜ボックス（インライン grid）にクラスを付ける */
  d.querySelectorAll('.box[style*="grid-template-columns"]').forEach(function (b) { b.classList.add('deli-box'); });

  /* ふわっと出す対象を自動で付ける */
  var groups = [
    ['.h2, .ttl, .ribbon, .lead', ''],
    ['.mc, .f4, .plan, .mo', ''],
    ['.r', ''],
    ['.wish li, .tl li, .faq details, .room ul li', 'rv--l'],
    ['.teacher, .room, .price1, .promise, .box, .wish', 'rv--z'],
    ['.cta-box', 'rv--z']
  ];
  groups.forEach(function (g) {
    d.querySelectorAll(g[0]).forEach(function (el) {
      if (el.closest('.hero') || el.closest('.drawer')) return;
      el.classList.add('rv'); if (g[1]) el.classList.add(g[1]);
      var sib = [].slice.call(el.parentNode.children).filter(function (s) { return s.matches(g[0]); });
      var k = sib.indexOf(el); if (k > 0) el.style.setProperty('--d', Math.min(k, 6) * 0.1 + 's');
    });
  });
  d.querySelectorAll('.r').forEach(function (r, k) { r.classList.add(k % 2 ? 'rv--r' : 'rv--l'); });

  var targets = d.querySelectorAll('.rv, .mk');
  if (!('IntersectionObserver' in window) || reduce) {
    targets.forEach(function (t) { t.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach(function (t) { io.observe(t); });
    /* 念のため：3秒たっても画面内なのに出ていないものは出す */
    setTimeout(function () {
      targets.forEach(function (t) { var r = t.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) t.classList.add('in'); });
    }, 3000);
  }

  /* スマホは横スワイプ＋ドット */
  var mq = matchMedia('(max-width: 820px)');
  function setupSwipe(sel) {
    d.querySelectorAll(sel).forEach(function (box) {
      if (box.dataset.sw) return; box.dataset.sw = 1;
      var n = box.children.length; if (n < 2) return;
      var dots = d.createElement('div'); dots.className = 'dots'; dots.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < n; i++) dots.appendChild(d.createElement('i'));
      box.after(dots);
      var mark = function () {
        var w = box.firstElementChild.getBoundingClientRect().width + 14;
        var idx = Math.round(box.scrollLeft / w);
        [].forEach.call(dots.children, function (dt, j) { dt.classList.toggle('on', j === idx); });
      };
      box.addEventListener('scroll', function () { requestAnimationFrame(mark); }, { passive: true });
      var apply = function () { box.classList.toggle('swipe', mq.matches); mark(); };
      apply(); mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply);
    });
  }
  setupSwipe('.menu3, .flow4, .plans, .month');

  /* スクロール連動：ヘッダー・進捗・固定バー・ヒーローの視差 */
  var sticky = d.querySelector('.sticky'), heroPh = d.querySelector('.hero-ph'), hero = d.querySelector('.hero');
  var ctaZones = d.querySelectorAll('.cta-band:last-of-type, #reserve, .ft');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = scrollY, h = d.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    if (hd) hd.classList.toggle('is-scrolled', y > 10);
    if (sticky) {
      var past = hero ? y > hero.offsetHeight * 0.7 : y > 300;
      var inCta = false;
      ctaZones.forEach(function (z) { var r = z.getBoundingClientRect(); if (r.top < innerHeight * 0.85 && r.bottom > 0) inCta = true; });
      sticky.classList.toggle('show', past && !inCta);
    }
    if (heroPh && !reduce && !mq.matches && y < 900) heroPh.style.transform = 'translateY(' + (y * 0.18) + 'px)';
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
})();
