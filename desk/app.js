// Design Desk SPA v3 — 부팅·인증·라우팅·셸(상단바 + 좌측 트리). 화면은 views.js, 데이터는 api.js
import { api, isDemo } from './api.js?v=4';
import * as V from './views.js?v=4';
import { ROLE, esc, go, toast, errText, $ } from './ui.js?v=4';

const app = document.getElementById('app');
const ctx = { api, me: null, profiles: [], itemTypes: [], clients: [], reqs: [], reload, render };
let session = null;
let rendering = 0;
let needsPassword = /type=(invite|recovery)/.test(location.hash + location.search);

// 인증 이벤트: 토큰 갱신·같은 사용자 재확인은 세션만 갱신(작성 중 입력 보호). 사용자 변경·로그아웃·복구만 화면 재구성.
api.auth.onChange((event, s) => {
  if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') { if (s) session = s; return; }
  if (event === 'SIGNED_IN' && ctx.me && s?.user?.id === ctx.me.id) { session = s; return; }
  if (s !== undefined) session = s;
  if (event === 'PASSWORD_RECOVERY') needsPassword = true;
  if (event === 'SIGNED_OUT') { ctx.me = null; needsPassword = false; }
  render();
});
window.addEventListener('hashchange', render);
window.addEventListener('beforeunload', (e) => { if (ctx.unloadGuard?.()) { e.preventDefault(); e.returnValue = ''; } });
if (isDemo) render(); // live 는 supabase 의 INITIAL_SESSION 이벤트가 첫 렌더를 일으킴

async function loadAll() {
  const me = await api.profile(session.user.id);
  let lists = [[], [], [], []];
  if (me?.is_active) lists = await Promise.all([api.profiles(), api.itemTypes(), api.clients(), api.requests()]);
  return { me, lists };
}
async function reload() {
  const { me, lists } = await loadAll();
  ctx.me = me; [ctx.profiles, ctx.itemTypes, ctx.clients, ctx.reqs] = lists;
  return render();
}

async function render() {
  const my = ++rendering;
  if (ctx.flush) { const f = ctx.flush; ctx.flush = null; ctx.unloadGuard = null; try { await f(); } catch {} } // 이전 작성 화면의 저장 큐가 끝난 뒤 이동
  const hash = location.hash.replace(/^#\/?/, '');
  const [path, query] = hash.split('?');
  const [route, arg] = path.split('/');
  const params = new URLSearchParams(query || '');
  try {
    const s = await api.auth.session();
    if (my !== rendering) return;
    session = s;
    if (!session) return viewLogin(route === 'forgot');
    if (needsPassword || route === 'set-password') return viewSetPassword();
    // 프로필은 사용자 변경 시, 의뢰 목록은 매 화면 진입 시 갱신(트리 카운트·홈·목록 공용)
    if (!ctx.me || ctx.me.id !== session.user.id) {
      const { me, lists } = await loadAll(); if (my !== rendering) return;
      ctx.me = me; [ctx.profiles, ctx.itemTypes, ctx.clients, ctx.reqs] = lists;
    } else if (ctx.me.is_active) {
      const reqs = await api.requests(); if (my !== rendering) return; ctx.reqs = reqs;
    }
    if (!ctx.me || !ctx.me.is_active) return viewInactive();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="auth"><div class="brand"><span class="lg">D</span>Design Desk</div><h1>연결에 문제가 있습니다</h1><p>${esc(errText(e))}</p><button class="btn pri" id="retry">다시 시도</button></div>`;
    $('#retry', app).onclick = () => render();
    return;
  }

  shell(route, arg);
  const main = $('#main', app);
  try {
    if (route === '') await V.home(main, ctx);
    else if (route === 'box') await V.list(main, ctx, params, arg || 'all');
    else if (route === 'list') go('#/box/all');
    else if (route === 'new') await V.createDraft(ctx);
    else if (['doc', 'r', 'requests', 'edit'].includes(route)) await V.doc(main, ctx, arg, params);
    else if (route === 'clients') await V.clients(main, ctx, params, arg);
    else if (route === 'settings') await V.settings(main, ctx);
    else if (route === 'me') V.me(main, ctx);
    else if (route === 'help') V.help(main, ctx);
    else go('#/');
  } catch (e) {
    console.error(e);
    if (my !== rendering) return;
    const msg = /PGRST116|JSON object requested|not found/i.test(e?.message || '') ? '의뢰가 없거나 볼 권한이 없습니다.' : errText(e);
    main.innerHTML = `<div class="notice err">불러오지 못했습니다: ${esc(msg)}</div><p class="mt inline"><button class="btn" id="retry">다시 시도</button><a class="btn" href="#/">홈으로</a></p>`;
    $('#retry', main).onclick = () => render();
  }
  if (my === rendering) window.scrollTo(0, 0);
}

function shell(route, arg) {
  const me = ctx.me;
  const on = (r, a) => (route === r && (a === undefined || arg === a) ? 'on' : '');
  const item = (href, label, cls, cnt) => `<a href="${href}" class="${cls}">${label}${cnt !== undefined ? `<span class="cnt">${cnt}</span>` : ''}</a>`;
  const tree = V.BOXES[me.role].map((g) => `<li class="grp">${g.grp}</li>${g.items.map(([k, l, s]) => `<li>${item('#/box/' + k, l, on('box', k), V.boxCount(ctx, s))}</li>`).join('')}`).join('');
  app.innerHTML = `
  ${isDemo ? `<div class="demo-bar">데모 모드 · 샘플 데이터 · 역할 보기:${Object.entries(api.roles).map(([k, x]) => `<button data-r="${k}" class="${api.who() === k ? 'on' : ''}">${x}</button>`).join('')}</div>` : ''}
  <header class="topbar"><button class="btn sm menu-btn" id="menu" type="button" aria-label="메뉴 열기" aria-controls="side" aria-expanded="false">☰</button><a class="brand" href="#/"><span class="lg">D</span>Design Desk</a><div class="sys">디자인 제작 의뢰 관리</div>
    <div class="user"><a href="#/me"><b>${esc(me.name || me.email)}</b> · ${ROLE[me.role]}${me.is_admin ? ' · 관리자' : ''}</a><button class="btn sm" id="logout" type="button">로그아웃</button></div></header>
  <div class="layout"><nav class="side" id="side">
    <div class="who"><b>${esc(me.name || '')}</b>${esc(me.position || ROLE[me.role])}</div>
    <div style="padding:4px 12px 8px"><a class="btn pri" href="#/new" style="width:100%">＋ 새 의뢰 작성</a></div>
    <ul class="tree">
      <li>${item('#/', '홈 (함 현황)', on(''))}</li>
      ${tree}
      <li class="grp">의뢰 조회</li><li>${item('#/box/all', '전체 의뢰', on('box', 'all'), ctx.reqs.length)}</li>
      <li class="grp">기준정보</li><li>${item('#/clients', '고객사', on('clients'), ctx.clients.length)}</li>${me.is_admin ? `<li>${item('#/settings', '사용자·품목', on('settings'))}</li>` : ''}
      <li class="grp">기타</li><li>${item('#/me', '내 정보', on('me'))}</li><li>${item('#/help', '사용 안내', on('help'))}</li>
    </ul></nav>
    <main class="content" id="main"><div class="boot">불러오는 중…</div></main></div>`;
  $('#logout', app).onclick = async () => { await api.auth.signOut(); go('#/'); };
  const side = $('#side', app), menu = $('#menu', app);
  const setMenu = (open) => { side.classList.toggle('open', open); menu.setAttribute('aria-expanded', String(open)); if (!open) menu.focus?.(); };
  menu.onclick = () => setMenu(!side.classList.contains('open'));
  side.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && side.classList.contains('open')) setMenu(false); }, { once: false });
  if (isDemo) app.querySelectorAll('.demo-bar button').forEach((b) => (b.onclick = () => { ctx.me = null; api.switchRole(b.dataset.r); }));
}

// ---------------------------------------------------------------- 인증 화면
function viewLogin(forgot) {
  app.innerHTML = `<div class="auth">
    <div class="brand"><span class="lg">D</span>Design Desk</div>
    <h1>${forgot ? '비밀번호 재설정' : 'LOGIN'}</h1><p>${forgot ? '가입한 회사 이메일로 재설정 링크를 보내드립니다.' : '회사 이메일과 비밀번호로 로그인하세요.'}</p>
    <form id="f">
      <div class="field"><label>이메일</label><input type="email" id="email" required autocomplete="username" inputmode="email"></div>
      ${forgot ? '' : '<div class="field"><label>비밀번호</label><input type="password" id="pw" required autocomplete="current-password"></div>'}
      <div class="notice err" id="err" style="display:none;margin-bottom:10px"></div>
      <button class="btn pri" type="submit">${forgot ? '재설정 메일 보내기' : 'Log on'}</button>
    </form>
    <div class="foot">${forgot ? '<a href="#/">로그인으로 돌아가기</a>' : '<a href="#/forgot">비밀번호를 잊으셨나요?</a><br>계정은 관리자가 이메일로 초대합니다.'}</div>
  </div>`;
  $('#f', app).onsubmit = async (ev) => {
    ev.preventDefault();
    const err = $('#err', app); err.style.display = 'none'; const b = $('button[type=submit]', app); b.disabled = true;
    try {
      if (forgot) { await api.auth.reset($('#email', app).value.trim()); toast('재설정 메일을 보냈습니다. 메일함을 확인하세요.'); go('#/'); }
      else await api.auth.signIn($('#email', app).value.trim(), $('#pw', app).value);
    } catch (e) { err.textContent = errText(e); err.style.display = 'block'; b.disabled = false; }
  };
}

function viewSetPassword() {
  app.innerHTML = `<div class="auth">
    <div class="brand"><span class="lg">D</span>Design Desk</div>
    <h1>비밀번호 설정</h1><p>${esc(session.user.email)} 계정으로 사용할 비밀번호를 정하세요.</p>
    <form id="f">
      <div class="field"><label>새 비밀번호</label><input type="password" id="pw" required minlength="8" autocomplete="new-password"><div class="hint">8자 이상</div></div>
      <div class="field"><label>한 번 더</label><input type="password" id="pw2" required autocomplete="new-password"></div>
      <div class="notice err" id="err" style="display:none;margin-bottom:10px"></div>
      <button class="btn pri" type="submit">저장하고 시작하기</button>
    </form></div>`;
  $('#f', app).onsubmit = async (ev) => {
    ev.preventDefault();
    const err = $('#err', app); err.style.display = 'none';
    const pw = $('#pw', app).value, pw2 = $('#pw2', app).value;
    if (pw !== pw2) { err.textContent = '비밀번호가 서로 다릅니다.'; err.style.display = 'block'; return; }
    try { await api.auth.setPassword(pw); needsPassword = false; toast('비밀번호를 저장했습니다.'); history.replaceState(null, '', location.pathname); go('#/'); render(); }
    catch (e) { err.textContent = errText(e); err.style.display = 'block'; }
  };
}

function viewInactive() {
  app.innerHTML = `<div class="auth"><div class="brand"><span class="lg">D</span>Design Desk</div><h1>사용할 수 없는 계정</h1><p>${esc(session.user.email)} 계정이 아직 활성화되지 않았거나 비활성 처리되었습니다. 관리자(대표·디자이너)에게 문의하세요.</p>
    <button class="btn" id="lo" type="button">로그아웃</button></div>`;
  $('#lo', app).onclick = () => api.auth.signOut();
}
