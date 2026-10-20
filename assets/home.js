'use strict';
// 홈 움직임: 큰 펼침 메뉴, 첫 화면 창 세우기, Toprise 탭 자동 넘김. 움직임 줄이기 설정이면 전부 멈춤.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) document.documentElement.classList.add('anim');

  // 큰 펼침 메뉴: 메뉴 링크에 마우스를 올리면 패널이 열림. 링크 자체는 그대로 이동(키보드·폰은 링크만)
  const bar = document.getElementById('bar');
  const triggers = [...document.querySelectorAll('[data-mega]')];
  let open = null, timer;
  const set = id => {
    triggers.forEach(a => { a.setAttribute('aria-expanded', String(a.dataset.mega === id)); document.getElementById(a.dataset.mega).hidden = a.dataset.mega !== id; });
    open = id;
  };
  if (matchMedia('(hover: hover) and (min-width: 1001px)').matches) {
    triggers.forEach(a => {
      a.setAttribute('aria-haspopup', 'true'); a.setAttribute('aria-expanded', 'false');
      a.addEventListener('mouseenter', () => { clearTimeout(timer); set(a.dataset.mega); });
    });
    document.querySelectorAll('[data-nomega]').forEach(a => a.addEventListener('mouseenter', () => set(null)));
    bar.addEventListener('mouseleave', () => { timer = setTimeout(() => set(null), 160); });
    bar.addEventListener('mouseenter', () => clearTimeout(timer));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) set(null); });
  }

  // 첫 화면 창: 처음엔 뒤로 눕혀 있다가 내려가면 바로 섬
  const win = document.getElementById('win');
  if (win && !reduce) {
    const tilt = () => {
      const r = win.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.9)));
      win.style.setProperty('--tilt', (14 * (1 - p)).toFixed(2) + 'deg');
      win.style.setProperty('--sc', (0.95 + 0.05 * p).toFixed(3));
    };
    addEventListener('scroll', tilt, { passive: true }); addEventListener('resize', tilt); tilt();
  }

  // Toprise 탭: 5초마다 다음 화면. 누르면 그 화면에서 멈춤
  const tabs = [...document.querySelectorAll('#tp-tabs button')];
  const imgs = [...document.querySelectorAll('#tp-screens img')];
  const cap = document.getElementById('tp-cap');
  if (!tabs.length) return;
  let cur = 0, rot;
  const show = i => {
    cur = i;
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); const b = t.querySelector('i'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; });
    imgs.forEach((im, k) => im.classList.toggle('on', k === i));
    cap.textContent = tabs[i].dataset.cap;
  };
  tabs.forEach((t, k) => t.addEventListener('click', () => { clearInterval(rot); document.getElementById('tp-tabs').classList.add('stopped'); show(k); }));
  if (!reduce) rot = setInterval(() => show((cur + 1) % imgs.length), 5000);
})();
