(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const els = document.querySelectorAll('.rv,.reveal-clip,.rvc');
  // 一覧ページの縮小表示では動きを止めて完成形を見せる
  const still = window.self !== window.top;
  if (still) document.documentElement.classList.add('still');
  if (reduce || still || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  // clip-path で隠れた要素は親を見て出す
  const io = new IntersectionObserver((en) => en.forEach((x) => {
    if (!x.isIntersecting) return;
    const t = x.target;
    (t.__kids || [t]).forEach((k) => k.classList.add('in'));
    io.unobserve(t);
  }), { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
  const groups = new Map();
  els.forEach((e) => {
    if (e.classList.contains('reveal-clip') || e.classList.contains('rvc')) {
      const p = e.parentElement; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(e);
    } else io.observe(e);
  });
  groups.forEach((kids, p) => { p.__kids = kids; io.observe(p); });

  // ゆっくりした視差（黒系の店内写真）
  const par = document.querySelector('[data-par]');
  if (par) {
    let tick = false;
    const on = () => { tick = false; const r = par.parentElement.getBoundingClientRect(); const p = (innerHeight - r.top) / (innerHeight + r.height); par.style.transform = `translate3d(0,${(-p * 12).toFixed(2)}%,0) scale(1.15)`; };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(on); } }, { passive: true }); on();
  }
})();
