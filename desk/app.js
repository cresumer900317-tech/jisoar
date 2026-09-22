// Design Desk SPA v2 — 부팅·인증·라우팅·공통 셸. 화면은 views.js, 데이터는 api.js
import { api, isDemo } from './api.js';
import * as V from './views.js';
import { ROLE, esc, go, toast, errText, $ } from './ui.js';

const app = document.getElementById('app');
const ctx = { api, me: null, profiles: [], itemTypes: [], clients: [], reload, render };
let session = null;
let rendering = 0;
let needsPassword = /type=(invite|recovery)/.test(location.hash + location.search);

api.auth.onChange((event, s) => {
  if (s !== undefined) session = s;
  if (event === 'PASSWORD_RECOVERY') needsPassword = true;
  if (event === 'SIGNED_OUT') ctx.me = null;
  render();
});
window.addEventListener('hashchange', render);
render();

async function reload() {
  ctx.me = await api.profile(session.user.id);
  if (ctx.me?.is_active) [ctx.profiles, ctx.itemTypes, ctx.clients] = await Promise.all([api.profiles(), api.itemTypes(), api.clients()]);
  return render();
}

async function render() {
  const my = ++rendering;
  session = await api.auth.session();
  const hash = location.hash.replace(/^#\/?/, '');
  const [path, query] = hash.split('?');
  const [route, arg] = path.split('/');
  const params = new URLSearchParams(query || '');

  if (!session) return viewLogin(route === 'forgot');
  if (needsPassword || route === 'set-password') return viewSetPassword();
  if (!ctx.me || ctx.me.id !== session.user.id) {
    ctx.me = await api.profile(session.user.id);
    if (ctx.me?.is_active) [ctx.profiles, ctx.itemTypes, ctx.clients] = await Promise.all([api.profiles(), api.itemTypes(), api.clients()]);
  }
  if (my !== rendering) return;
  if (!ctx.me || !ctx.me.is_active) return viewInactive();

  shell(route);
  const main = $('#main', app);
  try {
    if (route === '') await V.home(main, ctx);
    else if (route === 'list') await V.list(main, ctx, params);
    else if (route === 'new') await V.createDraft(ctx);
    else if (route === 'edit') await V.edit(main, ctx, arg);
    else if (route === 'r' || route === 'requests') await V.detail(main, ctx, arg);
    else if (route === 'clients') await V.clients(main, ctx, params, arg);
    else if (route === 'settings') await V.settings(main, ctx);
    else if (route === 'me') V.me(main, ctx);
    else if (route === 'help') V.help(main, ctx);
    else go('#/');
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="notice err">불러오지 못했습니다: ${esc(errText(e))}</div><p class="mt"><a class="btn" href="#/">홈으로</a></p>`;
  }
  window.scrollTo(0, 0);
}

function shell(route) {
  const me = ctx.me;
  const cur = (r) => (route === r || (r === '' && route === 'list') ? 'on' : '');
  const tab = (r, label, show = true) => (show ? `<a href="#/${r}" class="${cur(r)}">${label}</a>` : '');
  const btab = (r, icon, label, show = true) => (show ? `<a href="#/${r}" class="${cur(r)}"><span>${icon}</span>${label}</a>` : '');
  app.innerHTML = `
  ${isDemo ? `<div class="demo-bar">데모 모드 · 샘플 데이터입니다 · 역할 보기:${Object.entries(api.roles).map(([k, x]) => `<button data-r="${k}" class="${api.who() === k ? 'on' : ''}">${x}</button>`).join('')}</div>` : ''}
  <header class="top"><div class="in">
    <a class="brand" href="#/"><span class="lg">D</span>Design Desk</a>
    <nav class="nav">${tab('', '홈')}${tab('list', '의뢰')}${tab('clients', '고객사')}${tab('settings', '설정', me.is_admin)}${tab('help', '안내')}</nav>
    <div class="who"><a href="#/me" class="inline" style="gap:8px"><span class="av">${esc((me.name || me.email || '?').slice(0, 1))}</span><span class="nm"><b>${esc(me.name || me.email)}</b><span>${ROLE[me.role]}${me.is_admin ? ' · 관리자' : ''}</span></span></a>
      <button class="btn sm ghost" id="logout">로그아웃</button></div>
  </div></header>
  <main class="wrap" id="main"><div class="boot">불러오는 중…</div></main>
  <nav class="bottom-nav">${btab('', '⌂', '홈')}${btab('list', '≡', '의뢰')}${btab('clients', '◫', '고객사')}${btab('settings', '⚙', '설정', me.is_admin)}${btab('me', '●', '내 정보')}</nav>`;
  $('#logout', app).onclick = async () => { await api.auth.signOut(); go('#/'); };
  if (isDemo) app.querySelectorAll('.demo-bar button').forEach((b) => (b.onclick = () => { ctx.me = null; api.switchRole(b.dataset.r); }));
}

// ---------------------------------------------------------------- 인증 화면
function viewLogin(forgot) {
  app.innerHTML = `<div class="auth">
    <div class="brand"><span class="lg">D</span>Design Desk</div>
    <h1>${forgot ? '비밀번호 재설정' : '로그인'}</h1><p>${forgot ? '가입한 회사 이메일로 재설정 링크를 보내드립니다.' : '회사 이메일과 비밀번호로 들어오세요.'}</p>
    <form id="f">
      <div class="field"><label>이메일</label><input type="email" id="email" required autocomplete="username" inputmode="email"></div>
      ${forgot ? '' : '<div class="field"><label>비밀번호</label><input type="password" id="pw" required autocomplete="current-password"></div>'}
      <div class="notice err" id="err" style="display:none;margin-bottom:12px"></div>
      <button class="btn pri" type="submit">${forgot ? '재설정 메일 보내기' : '로그인'}</button>
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
      <div class="notice err" id="err" style="display:none;margin-bottom:12px"></div>
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
    <button class="btn" id="lo">로그아웃</button></div>`;
  $('#lo', app).onclick = () => api.auth.signOut();
}
