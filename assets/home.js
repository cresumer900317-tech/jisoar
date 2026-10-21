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

  // 영상: 스크롤과 무관하게 반복 재생(조금 느리게). 화면에 보일 때만 틀고 벗어나면 멈춤. 실제 픽셀 폭에 맞는 파일
  const px = innerWidth * (devicePixelRatio || 1);
  const vids = [...document.querySelectorAll('video.sv')];
  const seen = new Set();
  const load = v => {
    if (v.getAttribute('src')) return;
    const big = v.hasAttribute('data-big') && px > 1600;
    v.src = v.dataset.src + (px <= 800 ? '-720' : big ? '-1920' : '-1280') + '.mp4?v=2';
    v.playbackRate = v.defaultPlaybackRate = 0.75;
  };
  // 재생이 막히면(저전력 모드 등) 조작 막대를 보여 직접 틀 수 있게. 첫 화면 영상은 포스터로 둠
  const sync = v => {
    if (moving() && seen.has(v)) { load(v); v.play().catch(() => { if (!v.hasAttribute('aria-hidden')) v.controls = true; }); } else v.pause();
  };
  // 미리 받기(가까워지면)와 재생(실제로 보일 때)을 따로 판단
  const pre = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && moving()) { load(e.target); pre.unobserve(e.target); } }), { rootMargin: '300px 0px' });
  const vio = new IntersectionObserver(es => es.forEach(e => {
    e.isIntersecting ? seen.add(e.target) : seen.delete(e.target);
    sync(e.target);
  }));
  vids.forEach(v => pre.observe(v));
  vids.forEach(v => vio.observe(v));

  // 노트북 영상은 화면 세 개를 차례로 보여 주고 천천히 되돌아오는 왕복 영상(위치 = (1 - cos 2πu) / 2).
  // 지금 화면에 맞춰 단계 표시, 누르면 그 화면으로
  const pos = u => (1 - Math.cos(2 * Math.PI * u)) / 2;
  const work = document.getElementById('work');
  const wv = work?.querySelector('video');
  const steps = [...document.querySelectorAll('#work .tsteps li')];
  if (wv && steps.length) {
    const setCur = i => steps.forEach((s, k) => { const b = s.querySelector('button'); k === i ? b?.setAttribute('aria-current', 'step') : b?.removeAttribute('aria-current'); });
    setCur(0);
    const mark = () => {
      if (!wv.duration) return;
      const i = Math.min(steps.length - 1, Math.floor(pos(wv.currentTime / wv.duration) * steps.length));
      steps.forEach((s, k) => s.classList.toggle('on', k === i));
      setCur(i);
    };
    wv.addEventListener('timeupdate', mark);
    steps.forEach((s, i) => s.querySelector('button')?.addEventListener('click', () => {
      steps.forEach((x, k) => x.classList.toggle('on', k === i));
      setCur(i);
      const go = () => { wv.currentTime = Math.acos(1 - 2 * (i + 0.5) / steps.length) / (2 * Math.PI) * wv.duration; };
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
    const lio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { lit.classList.add('in'); lio.disconnect(); } }), { threshold: 0.3 });
    lio.observe(lit.querySelector('.lines') || lit);
  }

  // 첫 화면 제목: 검색창에 치듯 자모 단위(ㅎ → 회 → 회사 …)로 저절로 쳐짐. 움직임이 꺼지면 바로 전체 표시
  const words = [...document.querySelectorAll('#hero-h .w')];
  const jamo = ch => {
    const c = ch.charCodeAt(0) - 0xAC00;
    if (c < 0 || c > 11171) return [ch];
    const L = Math.floor(c / 588), V = Math.floor(c % 588 / 28), T = c % 28;
    const lead = String.fromCharCode('ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.charCodeAt(L));
    const open = String.fromCharCode(0xAC00 + L * 588 + V * 28);
    return T ? [lead, open, ch] : [lead, ch];
  };
  let typing = 0;
  const typeOut = () => {
    clearTimeout(typing);
    words.forEach(w => {
      if (!w.dataset.full) { w.dataset.full = w.textContent; w.setAttribute('aria-hidden', 'true'); }
      w.innerHTML = moving() ? `<span class="ghost">${w.dataset.full}</span><span class="typed"></span>` : w.dataset.full;
    });
    if (!moving()) return;
    const steps = [];
    words.forEach((w, wi) => {
      const out = w.querySelector('.typed');
      let done = '';
      [...w.dataset.full].forEach(ch => {
        jamo(ch).forEach(part => steps.push([out, done + part]));
        done += ch;
      });
      steps.push([out, done, wi < words.length - 1 ? 380 : 0]);
    });
    const caret = document.createElement('span');
    caret.className = 'caret';
    let i = 0;
    const tick = () => {
      if (!moving()) return;
      const [out, text, pause] = steps[i++];
      out.textContent = text; out.append(caret);
      if (i < steps.length) typing = setTimeout(tick, pause || 38 + Math.random() * 40);
      else typing = setTimeout(() => caret.remove(), 3200);
    };
    typing = setTimeout(tick, 700);
  };
  // 움직임 멈춤 버튼(자동으로 계속 움직이는 것 전부)
  const btn = document.getElementById('motion-toggle');
  const apply = () => {
    root.classList.toggle('anim', moving());
    if (btn) { btn.hidden = mq.matches; btn.setAttribute('aria-pressed', String(paused)); btn.textContent = paused ? '움직임 다시 켜기' : '움직임 멈추기'; }
    vids.forEach(sync);
    if (words.length) typeOut();
  };
  btn?.addEventListener('click', () => { paused = !paused; apply(); });
  mq.addEventListener?.('change', apply);
  apply();
})();
