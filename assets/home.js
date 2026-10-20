'use strict';
// 홈 움직임: 큰 펼침 메뉴, 첫 화면 창 세우기, Toprise 탭 자동 넘김, 움직임 멈춤 버튼.
// 움직임 줄이기 설정이거나 멈춤 버튼을 누르면 html.anim 을 빼서 전부 멈춤.
(() => {
  const root = document.documentElement;
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  const moving = () => !mq.matches && !paused;

  // 큰 펼침 메뉴: 넓은 화면에서 메뉴 링크에 마우스를 올리면 패널이 열림. 링크 자체는 그대로 이동(키보드·폰은 링크만)
  const bar = document.getElementById('bar');
  const triggers = [...document.querySelectorAll('[data-mega]')];
  let open = null, closeTimer;
  const setMega = id => {
    triggers.forEach(a => { document.getElementById(a.dataset.mega).hidden = a.dataset.mega !== id; });
    open = id;
  };
  if (matchMedia('(hover: hover) and (min-width: 1001px)').matches) {
    triggers.forEach(a => a.addEventListener('mouseenter', () => { clearTimeout(closeTimer); setMega(a.dataset.mega); }));
    document.querySelectorAll('[data-nomega]').forEach(a => a.addEventListener('mouseenter', () => setMega(null)));
    bar.addEventListener('mouseleave', () => { closeTimer = setTimeout(() => setMega(null), 160); });
    bar.addEventListener('mouseenter', () => clearTimeout(closeTimer));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) setMega(null); });
    document.addEventListener('focusin', e => { if (open && !bar.contains(e.target)) setMega(null); });
  }

  // 첫 화면 창: 처음엔 뒤로 눕혀 있다가 내려가면 바로 섬
  const win = document.getElementById('win');
  const tilt = () => {
    if (!win || !moving()) return;
    const r = win.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.9)));
    win.style.setProperty('--tilt', (14 * (1 - p)).toFixed(2) + 'deg');
    win.style.setProperty('--sc', (0.95 + 0.05 * p).toFixed(3));
  };
  addEventListener('scroll', tilt, { passive: true }); addEventListener('resize', tilt);

  // Toprise 탭: 5초마다 다음 화면. 누르거나 방향키로 고르면 그 화면에서 멈춤
  const list = document.getElementById('tp-tabs');
  const tabs = list ? [...list.querySelectorAll('[role="tab"]')] : [];
  const imgs = [...document.querySelectorAll('#tp-screens img')];
  const panel = document.getElementById('tp-screens');
  const cap = document.getElementById('tp-cap');
  let cur = 0, rot = null, picked = false;
  const show = (i, focus) => {
    cur = i;
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      const b = t.querySelector('i'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    });
    imgs.forEach((im, k) => { im.classList.toggle('on', k === i); im.setAttribute('aria-hidden', String(k !== i)); });
    panel.setAttribute('aria-labelledby', tabs[i].id);
    cap.textContent = tabs[i].dataset.cap;
    if (focus) tabs[i].focus();
  };
  const stopRot = () => { clearInterval(rot); rot = null; };
  const startRot = () => { stopRot(); if (tabs.length && moving() && !picked) rot = setInterval(() => show((cur + 1) % imgs.length), 5000); };
  const pick = (i, focus) => { picked = true; stopRot(); list.classList.add('stopped'); show(i, focus); };
  tabs.forEach((t, k) => {
    t.addEventListener('click', () => pick(k));
    t.addEventListener('keydown', e => {
      const n = tabs.length;
      const to = { ArrowRight: (k + 1) % n, ArrowLeft: (k - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault(); pick(to, true);
    });
  });

  // 움직임 멈춤 버튼(자동으로 계속 움직이는 것 전부)
  const btn = document.getElementById('motion-toggle');
  const apply = () => {
    root.classList.toggle('anim', moving());
    if (btn) { btn.hidden = mq.matches; btn.setAttribute('aria-pressed', String(paused)); btn.textContent = paused ? '움직임 다시 켜기' : '움직임 멈추기'; }
    if (!moving() && win) { win.style.removeProperty('--tilt'); win.style.removeProperty('--sc'); }
    tilt(); startRot();
  };
  btn?.addEventListener('click', () => { paused = !paused; apply(); });
  mq.addEventListener?.('change', apply);
  if (tabs.length) show(0);
  apply();
})();
