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

  // 첫 화면 검색창(flex.team 식): 맡길 만한 일이 자모 단위(ㅈ → 정 → 정산 …)로 쳐지고, 잠시 뒤 지워지고 다음 문장
  const q = document.querySelector('.ask .q');
  // 실제로 들어온 요청만. [실제] JISOAR가 받은 요청, [시장] 크몽 서비스 상품에 나온 고객 사례(Codex 53671ecf·9863fb3e 검토).
  // 페이지를 열 때마다 순서를 섞음
  const asks = [
    '정산 엑셀을 은행 대량이체 파일로 바꿔 주세요',            // [실제] Paylist
    '같은 업체에 중복 연락하지 않게 기록을 같이 보고 싶어요',   // [실제] JIPICK
    '광고별 순위와 작업 기간을 한 화면에서 관리하고 싶어요',     // [실제] Toprise
    '광고 등록부터 정산까지 한곳에서 관리하고 싶어요',          // [실제] Toprise
    '하객이 앱 설치 없이 사진을 올리게 해 주세요',              // [실제] Snapwed
    '웹에서 쓰던 서비스를 앱으로도 낼 수 있나요?',              // [실제] Guild Lounge
    '대표가 폰으로 진행 현황을 바로 보게 해 주세요',            // [실제] Toprise 대표 전용 계정
    '지점마다 다른 발주 엑셀을 한 번에 합쳐 주세요',            // [시장] kmong.com/gig/697103
    '매출 엑셀로 직원별 정산서를 뽑고 싶어요',                 // [시장] kmong.com/gig/697103
    '주문 엑셀과 택배 송장 번호를 자동으로 맞춰 주세요',        // [시장] kmong.com/gig/748573
    '마켓별 송장 업로드 파일을 한 번에 만들 수 있나요?',        // [시장] kmong.com/gig/748573
    '회원과 수업 예약을 한 화면에서 관리하고 싶어요',           // [시장] kmong.com/gig/789158
    '엑셀 고객 명단을 여러 직원이 같이 쓰게 해 주세요',         // [시장] kmong.com/gig/789158
    '기간별 매출을 한눈에 보고 싶어요',                        // [시장] kmong.com/gig/789158
  ].sort(() => Math.random() - 0.5);
  const jamo = ch => {
    const c = ch.charCodeAt(0) - 0xAC00;
    if (c < 0 || c > 11171) return [ch];
    const L = Math.floor(c / 588), V = Math.floor(c % 588 / 28), T = c % 28;
    const lead = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[L];
    const open = String.fromCharCode(0xAC00 + L * 588 + V * 28);
    return T ? [lead, open, ch] : [lead, ch];
  };
  let typing = 0, heroSeen = true, currentAsk = asks[0];
  // 화면 밖·숨은 탭·마우스를 올리거나 키보드로 고른 동안은 멈춤
  let hold = false;
  const idle = () => !heroSeen || document.hidden || hold;
  const caret = document.createElement('span');
  caret.className = 'caret';
  const show = t => { q.textContent = t; q.append(caret); q.scrollLeft = q.scrollWidth; };
  const typeOut = () => {
    clearTimeout(typing);
    if (!q) return;
    if (!moving()) { q.textContent = currentAsk = asks[0]; return; }
    let n = 0;
    const run = () => {
      const text = asks[n++ % asks.length];
      currentAsk = text;
      const steps = [];
      let done = '';
      [...text].forEach(ch => { jamo(ch).forEach(part => steps.push(done + part)); done += ch; });
      let i = 0, back = text.length;
      const type = () => {
        if (!moving()) return;
        if (idle()) { typing = setTimeout(type, 400); return; }
        show(steps[i++]);
        typing = i < steps.length ? setTimeout(type, 34 + Math.random() * 36) : setTimeout(erase, 2200);
      };
      const erase = () => {
        if (!moving()) return;
        if (idle()) { typing = setTimeout(erase, 400); return; }
        show(text.slice(0, --back));
        typing = back > 0 ? setTimeout(erase, 16) : setTimeout(run, 450);
      };
      type();
    };
    show(currentAsk = asks[0]);
    typing = setTimeout(run, 900);
  };
  const ask = q?.closest('.ask');
  const updateHold = () => {
    hold = ask.matches(':hover') || document.activeElement === ask;
    if (hold && moving()) show(currentAsk);
  };
  ['mouseenter', 'mouseleave', 'focus', 'blur'].forEach(event => ask?.addEventListener(event, updateHold));
  if (q) new IntersectionObserver(es => { heroSeen = es[0].isIntersecting; }).observe(q);

  // 움직임 멈춤 버튼(자동으로 계속 움직이는 것 전부)
  const btn = document.getElementById('motion-toggle');
  const apply = () => {
    root.classList.toggle('anim', moving());
    if (btn) { btn.hidden = mq.matches; btn.setAttribute('aria-pressed', String(paused)); btn.textContent = paused ? '움직임 다시 켜기' : '움직임 멈추기'; }
    vids.forEach(sync);
    typeOut();
  };
  btn?.addEventListener('click', () => { paused = !paused; apply(); });
  mq.addEventListener?.('change', apply);
  apply();
})();
