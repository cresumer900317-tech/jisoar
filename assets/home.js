'use strict';
// 홈 움직임: 큰 펼침 메뉴, 스크롤로 재생하는 영상 장면(토스식), 한 줄씩 밝아지는 문장(플렉스식), 구역 떠오름, 움직임 멈춤 버튼.
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

  const clamp = v => Math.min(1, Math.max(0, v));
  // 구역 진행도: 고정 구역이 화면 맨 위에 붙은 순간 0, 풀리는 순간 1
  const prog = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };

  // 스크롤로 재생하는 영상. 좁은 화면은 작은 파일
  const small = matchMedia('(max-width: 720px)').matches;
  const vids = [...document.querySelectorAll('video.sv')].map(v => {
    const big = v.hasAttribute('data-big') && innerWidth * (devicePixelRatio || 1) > 1600;
    v.src = v.dataset.src + (small ? '-720.mp4' : big ? '-1920.mp4' : '-1280.mp4');
    const o = { v, host: v.closest('.film, .scene'), cur: 0 };
    v.addEventListener('loadedmetadata', () => { o.dur = v.duration; });
    return o;
  });
  const film = document.getElementById('film');
  const words = film ? [...film.querySelectorAll('.w')] : [];
  const frame = film?.querySelector('.frame');
  const cue = film?.querySelector('.cue');
  const lines = [...document.querySelectorAll('.lit .l')];
  const lit = document.querySelector('.lit');
  const steps = [...document.querySelectorAll('#work .tsteps li')];
  const work = document.getElementById('work');

  let raf = 0;
  const frameTick = () => {
    raf = 0;
    if (!moving()) return;
    // 영상: 목표 시점으로 부드럽게 따라감
    let again = false;
    for (const o of vids) {
      if (!o.dur) continue;
      const r = o.host.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const t = prog(o.host) * (o.dur - 0.05);
      o.cur += (t - o.cur) * 0.18;
      if (Math.abs(t - o.cur) > 0.01) again = true;
      if (Math.abs(o.v.currentTime - o.cur) > 0.03 && !o.v.seeking) o.v.currentTime = o.cur;
    }
    // 첫 화면: 테두리가 줄며 화면 가득, 글자는 세 번에 나눠 등장
    if (film) {
      const p = prog(film);
      const g = clamp(p / 0.35);
      frame.style.setProperty('--in', `${(88 * (1 - g)).toFixed(1)}px ${(24 * (1 - g)).toFixed(1)}px ${(24 * (1 - g)).toFixed(1)}px`);
      frame.style.setProperty('--rad', (28 * (1 - g)).toFixed(1) + 'px');
      frame.style.setProperty('--shade', (0.12 + 0.26 * clamp((p - 0.1) / 0.5)).toFixed(3));
      words.forEach((w, i) => {
        const k = i === 0 ? 1 : clamp((p - (0.15 + i * 0.2)) / 0.15);
        w.style.setProperty('--o', k.toFixed(3));
        w.style.setProperty('--y', (24 * (1 - k)).toFixed(1) + 'px');
      });
      cue?.style.setProperty('--cue', (0.85 * (1 - clamp(p / 0.08))).toFixed(3));
    }
    // 문장 밝히기: 지나간 줄은 진하게, 지금 줄이 가장 밝게
    if (lit) {
      const p = prog(lit) * (lines.length + 0.6);
      lines.forEach((l, i) => l.style.setProperty('--a', (0.16 + 0.84 * clamp(p - i)).toFixed(3)));
    }
    if (work && steps.length) {
      const i = Math.min(steps.length - 1, Math.floor(prog(work) * steps.length));
      steps.forEach((s, k) => s.classList.toggle('on', k === i));
    }
    if (again) raf = requestAnimationFrame(frameTick);
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(frameTick); };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll);
  vids.forEach(o => o.v.addEventListener('loadedmetadata', onScroll));

  // 나머지 구역: 화면에 들어오면 떠오름
  document.querySelectorAll('.h-sec .h2, .h-sec .lead, .h-sec figure, .h-sec .apps article, .h-sec .pledge, .sec-head, .svc li, .close .wrap > div').forEach(el => el.classList.add('rv'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  // 움직임 멈춤 버튼(자동으로 계속 움직이는 것 전부)
  const btn = document.getElementById('motion-toggle');
  const apply = () => {
    root.classList.toggle('anim', moving());
    if (btn) { btn.hidden = mq.matches; btn.setAttribute('aria-pressed', String(paused)); btn.textContent = paused ? '움직임 다시 켜기' : '움직임 멈추기'; }
    if (!moving()) {
      frame?.style.removeProperty('--in'); frame?.style.removeProperty('--rad');
      [...words, ...lines].forEach(el => el.removeAttribute('style'));
      steps.forEach(s => s.classList.remove('on'));
    }
    onScroll();
  };
  btn?.addEventListener('click', () => { paused = !paused; apply(); });
  mq.addEventListener?.('change', apply);
  apply();
})();
