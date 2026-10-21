'use strict';
// 홈 움직임: 큰 펼침 메뉴, 저절로 반복 재생하는 영상 장면(스크롤에 묶지 않음), 한 줄씩 밝아지는 문장, 구역 떠오름, 움직임 멈춤 버튼.
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

  // 영상: 스크롤과 무관하게 반복 재생. 화면에 보일 때만 틀고 벗어나면 멈춤. 좁은 화면은 작은 파일
  const small = matchMedia('(max-width: 720px)').matches;
  const vids = [...document.querySelectorAll('video.sv')];
  const seen = new Set();
  const load = v => {
    if (v.getAttribute('src')) return;
    const big = v.hasAttribute('data-big') && innerWidth * (devicePixelRatio || 1) > 1600;
    v.src = v.dataset.src + (small ? '-720.mp4' : big ? '-1920.mp4' : '-1280.mp4');
  };
  const sync = v => {
    if (moving() && seen.has(v)) { load(v); v.play().catch(() => {}); } else v.pause();
  };
  const vio = new IntersectionObserver(es => es.forEach(e => {
    e.isIntersecting ? seen.add(e.target) : seen.delete(e.target);
    if (e.isIntersecting) load(e.target);
    sync(e.target);
  }), { rootMargin: '200px 0px' });
  vids.forEach(v => vio.observe(v));

  // Toprise 노트북 영상은 화면 세 개를 같은 길이로 차례로 보여 줌. 지금 화면에 맞춰 단계 표시, 누르면 그 화면으로
  const work = document.getElementById('work');
  const wv = work?.querySelector('video');
  const steps = [...document.querySelectorAll('#work .tsteps li')];
  if (wv && steps.length) {
    const mark = () => {
      if (!wv.duration) return;
      const i = Math.min(steps.length - 1, Math.floor(wv.currentTime / wv.duration * steps.length));
      steps.forEach((s, k) => s.classList.toggle('on', k === i));
    };
    wv.addEventListener('timeupdate', mark);
    steps.forEach((s, i) => s.querySelector('button')?.addEventListener('click', () => {
      steps.forEach((x, k) => x.classList.toggle('on', k === i));
      const go = () => { wv.currentTime = (i + 0.02) * wv.duration / steps.length; };
      load(wv);
      wv.duration ? go() : wv.addEventListener('loadedmetadata', go, { once: true });
    }));
  }

  // 나머지 구역: 화면에 들어오면 떠오름. 문장 구역은 들어오면 한 줄씩 밝아짐
  document.querySelectorAll('.h-sec .h2, .h-sec .lead, .h-sec figure, .h-sec .apps article, .h-sec .pledge, .sec-head, .svc li, .close .wrap > div').forEach(el => el.classList.add('rv'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
  const lit = document.querySelector('.lit');
  if (lit) {
    const lio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { lit.classList.add('in'); lio.disconnect(); } }), { threshold: 0.45 });
    lio.observe(lit);
  }

  // 움직임 멈춤 버튼(자동으로 계속 움직이는 것 전부)
  const btn = document.getElementById('motion-toggle');
  const apply = () => {
    root.classList.toggle('anim', moving());
    if (btn) { btn.hidden = mq.matches; btn.setAttribute('aria-pressed', String(paused)); btn.textContent = paused ? '움직임 다시 켜기' : '움직임 멈추기'; }
    vids.forEach(sync);
  };
  btn?.addEventListener('click', () => { paused = !paused; apply(); });
  mq.addEventListener?.('change', apply);
  apply();
})();
