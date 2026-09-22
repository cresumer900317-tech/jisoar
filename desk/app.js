// Design Desk SPA v1 — 설계 docs/design-v1.1.md 3절. 쓰기는 전부 RPC(0002), 읽기는 RLS.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const C = window.DESK_CONFIG;
const sb = createClient(C.supabaseUrl, C.supabaseAnonKey);
const app = document.getElementById('app');

const STATUS = {
  draft: ['임시저장', 'gray'], submitted: ['승인대기', 'amber'], revision: ['수정요청', 'amber'],
  approved: ['승인됨', 'blue'], in_progress: ['작업중', 'blue'], done: ['완료', 'green'],
  rejected: ['반려', 'red'], cancelled: ['취소', 'gray'],
};
const PRIO = { urgent: '긴급', high: '높음', normal: '보통', low: '낮음' };
const ROLE = { requester: '직원', approver: '대표', designer: '디자이너' };
const ACTION_KO = {
  create: '의뢰 생성', submit: '제출', resubmit: '재제출', cancel: '취소', approve: '승인', request_revision: '수정 요청',
  reject: '반려', update_terms: '조건 조정', start: '작업 시작', complete: '완료', comment: '코멘트', file_add: '파일 추가', file_delete: '파일 삭제',
};
const ERR_KO = [
  ['inactive user', '비활성 계정입니다. 관리자에게 문의하세요.'], ['not owner', '본인 의뢰만 처리할 수 있습니다.'],
  ['locked', '제출된 의뢰는 수정할 수 없습니다.'], ['required: title, item_type, purpose', '제목·품목·사용 용도는 필수입니다.'],
  ['required: client', '고객사 의뢰는 고객사를 선택해야 합니다.'], ['required: item_type_other', '기타 품목 설명을 입력하세요.'],
  ['pending uploads', '업로드가 끝나지 않은 파일이 있습니다. 삭제 후 다시 제출하세요.'], ['required: confirmed_due', '확정 납기를 입력하세요.'],
  ['required: note', '사유를 입력하세요.'], ['required: deliverable', '결과물 파일 또는 URL이 필요합니다.'],
  ['invalid transition', '현재 상태에서는 할 수 없는 처리입니다.'], ['Invalid login credentials', '이메일 또는 비밀번호가 틀렸습니다.'],
  ['blocked file type', '허용되지 않는 파일 형식입니다.'], ['max 50MB', '참고자료는 50MB까지 올릴 수 있습니다.'], ['max 300MB', '결과물은 300MB까지 올릴 수 있습니다.'],
  ['remove storage object first', '파일 삭제에 실패했습니다. 다시 시도하세요.'], ['cannot demote', '본인의 관리자 권한·활성 상태는 바꿀 수 없습니다.'],
];

let session = null, me = null, profiles = [], itemTypes = [], clients = [];
let needsPassword = /type=(invite|recovery)/.test(location.hash) || /type=(invite|recovery)/.test(location.search);

// ---------------------------------------------------------------- utils
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtD = (d) => (d ? String(d).slice(0, 10) : '-');
const fmtDT = (d) => (d ? new Date(d).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const chip = (s) => `<span class="chip ${STATUS[s]?.[1] || 'gray'}">${STATUS[s]?.[0] || s}</span>`;
const prio = (p) => `<span class="prio ${p}">${PRIO[p] || p}</span>`;
const pname = (id) => profiles.find((p) => p.id === id)?.name || (id ? '(알 수 없음)' : '-');
const go = (h) => { location.hash = h; };
function toast(msg, err) {
  const t = document.getElementById('toast'); const d = document.createElement('div');
  d.textContent = msg; if (err) d.className = 'err'; t.appendChild(d); setTimeout(() => d.remove(), 3500);
}
function errText(e) {
  const m = e?.message || String(e);
  for (const [k, v] of ERR_KO) if (m.includes(k)) return v;
  return m;
}
async function rpc(name, args) { const { data, error } = await sb.rpc(name, args); if (error) throw error; return data; }
async function q(promise) { const { data, error } = await promise; if (error) throw error; return data; }
function on(sel, ev, fn, root = app) { root.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn)); }
function val(id) { return app.querySelector('#' + id)?.value?.trim() ?? ''; }

// ---------------------------------------------------------------- boot
sb.auth.onAuthStateChange((event, s) => {
  session = s;
  if (event === 'PASSWORD_RECOVERY') needsPassword = true;
  if (event === 'SIGNED_OUT') { me = null; }
  render();
});
window.addEventListener('hashchange', render);
render();

async function loadMe() {
  const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  me = data;
  if (me?.is_active) {
    [profiles, itemTypes, clients] = await Promise.all([
      q(sb.from('profiles').select('id,name,email,role,is_admin,is_active,position').order('name')),
      q(sb.from('item_types').select('*').order('sort')),
      q(sb.from('clients').select('*').order('name')),
    ]);
  }
}

async function render() {
  const { data: { session: s } } = await sb.auth.getSession();
  session = s;
  const hash = location.hash.replace(/^#\/?/, '');
  const [route, arg] = hash.split('?')[0].split('/');
  const params = new URLSearchParams(hash.split('?')[1] || '');

  if (!session) return viewLogin(route === 'forgot');
  if (needsPassword || route === 'set-password') return viewSetPassword();
  if (!me || me.id !== session.user.id) await loadMe();
  if (!me || !me.is_active) return viewInactive();

  shell(route);
  const main = app.querySelector('#main');
  try {
    if (route === '' || route === 'list') await viewList(main, params);
    else if (route === 'new') await createDraft();
    else if (route === 'edit') await viewEdit(main, arg);
    else if (route === 'r' || route === 'requests') await viewDetail(main, arg);
    else if (route === 'clients') await viewClients(main);
    else if (route === 'settings') await viewSettings(main);
    else if (route === 'me') viewMe(main);
    else go('#/');
  } catch (e) { console.error(e); main.innerHTML = `<div class="notice err">${esc(errText(e))}</div>`; }
}

function shell(route) {
  const tab = (r, label, show = true) => (show ? `<a href="#/${r}" class="${route === r || (r === '' && route === 'list') ? 'on' : ''}">${label}</a>` : '');
  app.innerHTML = `
  <header class="top"><div class="in">
    <a class="brand" href="#/">Design Desk<span>디자인 의뢰</span></a>
    <nav class="nav">${tab('', '의뢰')}${tab('clients', '고객사')}${tab('settings', '설정', me.is_admin)}${tab('me', '내 정보')}</nav>
    <div class="who"><b>${esc(me.name || me.email)}</b><span class="chip">${ROLE[me.role]}${me.is_admin ? ' · 관리자' : ''}</span>
      <button class="btn sm ghost" id="logout">로그아웃</button></div>
  </div></header>
  <main class="wrap" id="main"><div class="boot">불러오는 중…</div></main>`;
  app.querySelector('#logout').onclick = async () => { await sb.auth.signOut(); go('#/'); };
}

// ---------------------------------------------------------------- auth views
function viewLogin(forgot) {
  app.innerHTML = `<div class="auth">
    <h1>Design Desk</h1><p>${forgot ? '가입한 이메일로 재설정 링크를 보냅니다.' : '회사 이메일로 로그인하세요.'}</p>
    <form id="f">
      <div class="field"><label>이메일</label><input type="email" id="email" required autocomplete="username"></div>
      ${forgot ? '' : '<div class="field"><label>비밀번호</label><input type="password" id="pw" required autocomplete="current-password"></div>'}
      <div class="notice err" id="err" style="display:none;margin-bottom:12px"></div>
      <button class="btn pri" type="submit">${forgot ? '재설정 메일 보내기' : '로그인'}</button>
    </form>
    <div class="foot">${forgot ? '<a href="#/">로그인으로 돌아가기</a>' : '<a href="#/forgot">비밀번호를 잊으셨나요?</a> · 계정은 관리자가 초대합니다'}</div>
  </div>`;
  app.querySelector('#f').onsubmit = async (ev) => {
    ev.preventDefault();
    const err = app.querySelector('#err'); err.style.display = 'none';
    try {
      if (forgot) {
        const { error } = await sb.auth.resetPasswordForEmail(val('email'), { redirectTo: location.origin + location.pathname });
        if (error) throw error; toast('재설정 메일을 보냈습니다.'); go('#/');
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: val('email'), password: app.querySelector('#pw').value });
        if (error) throw error;
      }
    } catch (e) { err.textContent = errText(e); err.style.display = 'block'; }
  };
}

function viewSetPassword() {
  app.innerHTML = `<div class="auth">
    <h1>비밀번호 설정</h1><p>${esc(session.user.email)} 계정의 비밀번호를 정하세요.</p>
    <form id="f">
      <div class="field"><label>새 비밀번호</label><input type="password" id="pw" required minlength="8" autocomplete="new-password"><div class="hint">8자 이상</div></div>
      <div class="field"><label>확인</label><input type="password" id="pw2" required autocomplete="new-password"></div>
      <div class="notice err" id="err" style="display:none;margin-bottom:12px"></div>
      <button class="btn pri" type="submit">저장하고 시작</button>
    </form></div>`;
  app.querySelector('#f').onsubmit = async (ev) => {
    ev.preventDefault();
    const err = app.querySelector('#err'); err.style.display = 'none';
    const pw = app.querySelector('#pw').value, pw2 = app.querySelector('#pw2').value;
    if (pw !== pw2) { err.textContent = '비밀번호가 서로 다릅니다.'; err.style.display = 'block'; return; }
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) { err.textContent = errText(error); err.style.display = 'block'; return; }
    needsPassword = false; toast('비밀번호를 저장했습니다.'); history.replaceState(null, '', location.pathname); go('#/');
  };
}

function viewInactive() {
  app.innerHTML = `<div class="auth"><h1>사용할 수 없는 계정</h1><p>${esc(session.user.email)} 계정이 아직 활성화되지 않았거나 비활성 처리되었습니다. 관리자에게 문의하세요.</p>
    <button class="btn" id="lo">로그아웃</button></div>`;
  app.querySelector('#lo').onclick = () => sb.auth.signOut();
}

// ---------------------------------------------------------------- list
const TABS = {
  requester: [['progress', '진행중', ['draft', 'submitted', 'revision', 'approved', 'in_progress']], ['done', '완료', ['done']], ['all', '전체', null]],
  approver: [['wait', '승인대기', ['submitted']], ['progress', '진행중', ['revision', 'approved', 'in_progress']], ['all', '전체', null]],
  designer: [['wait', '작업대기', ['approved']], ['progress', '작업중', ['in_progress']], ['done', '완료', ['done']], ['all', '전체', null]],
};
async function viewList(main, params) {
  const tabs = TABS[me.role];
  const tabKey = params.get('tab') || tabs[0][0];
  const tab = tabs.find((t) => t[0] === tabKey) || tabs[0];
  const f = { s: params.get('s') || '', status: params.get('status') || '', item: params.get('item') || '', client: params.get('client') || '' };

  let qb = sb.from('requests').select('id,no,title,kind,status,priority,confirmed_due,requested_due,requester_id,client_id,item_type_id,updated_at,submitted_at').order('updated_at', { ascending: false }).limit(300);
  if (tab[2]) qb = qb.in('status', tab[2]);
  if (f.status) qb = qb.eq('status', f.status);
  if (f.item) qb = qb.eq('item_type_id', f.item);
  if (f.client) qb = qb.eq('client_id', f.client);
  let rows = await q(qb);
  if (f.s) { const k = f.s.toLowerCase(); rows = rows.filter((r) => (r.title || '').toLowerCase().includes(k) || (r.no || '').toLowerCase().includes(k)); }

  const link = (t, extra = {}) => { const p = new URLSearchParams({ tab: t, ...Object.fromEntries(Object.entries({ ...f, ...extra }).filter(([, v]) => v)) }); return `#/?${p}`; };
  main.innerHTML = `
    <div class="head"><div><h1>${me.role === 'requester' ? '내 의뢰' : '디자인 의뢰'}</h1><p>${me.role === 'requester' ? '내가 신청한 의뢰만 보입니다.' : me.role === 'approver' ? '제출된 의뢰를 승인하고 우선순위·납기를 정합니다.' : '승인된 의뢰를 받아 작업하고 완료 처리합니다.'}</p></div>
      <a class="btn pri" href="#/new">+ 새 의뢰</a></div>
    <div class="tabs">${tabs.map((t) => `<a href="${link(t[0])}" class="${t[0] === tab[0] ? 'on' : ''}">${t[1]}</a>`).join('')}</div>
    <form class="filters" id="ff">
      <input type="text" id="fs" placeholder="연번·제목 검색" value="${esc(f.s)}">
      <select id="fstatus"><option value="">상태 전체</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
      <select id="fitem"><option value="">품목 전체</option>${itemTypes.map((t) => `<option value="${t.id}" ${f.item == t.id ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select>
      <select id="fclient"><option value="">고객사 전체</option>${clients.map((c) => `<option value="${c.id}" ${f.client == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      <button class="btn" type="submit">적용</button>${f.s || f.status || f.item || f.client ? `<a class="btn ghost" href="${link(tab[0], { s: '', status: '', item: '', client: '' })}">초기화</a>` : ''}
    </form>
    <div class="card">${rows.length ? `<table><thead><tr><th>연번</th><th>제목</th><th>품목</th><th>고객사</th><th>신청자</th><th>우선순위</th><th>확정납기</th><th>상태</th></tr></thead><tbody>
      ${rows.map((r) => `<tr class="link" data-id="${r.id}"><td class="mono">${esc(r.no || '임시')}</td><td class="t">${esc(r.title || '(제목 없음)')}</td>
        <td>${esc(itemTypes.find((t) => t.id === r.item_type_id)?.label || '-')}</td><td>${r.kind === 'internal' ? '<span class="muted">내부</span>' : esc(clients.find((c) => c.id === r.client_id)?.name || '-')}</td>
        <td>${esc(pname(r.requester_id))}</td><td>${prio(r.priority)}</td><td class="mono">${fmtD(r.confirmed_due) === '-' && r.requested_due ? `<span class="muted">희망 ${fmtD(r.requested_due)}</span>` : fmtD(r.confirmed_due)}</td><td>${chip(r.status)}</td></tr>`).join('')}
    </tbody></table>` : '<div class="empty">해당하는 의뢰가 없습니다.</div>'}</div>`;
  on('tr.link', 'click', (e) => go('#/r/' + e.currentTarget.dataset.id));
  main.querySelector('#ff').onsubmit = (e) => { e.preventDefault(); go(link(tab[0], { s: val('fs'), status: val('fstatus'), item: val('fitem'), client: val('fclient') })); };
}

async function createDraft() {
  try { const id = await rpc('request_create', { p_kind: 'client' }); go('#/edit/' + id); }
  catch (e) { toast(errText(e), true); go('#/'); }
}

// ---------------------------------------------------------------- edit
async function viewEdit(main, id) {
  const r = await q(sb.from('requests').select('*').eq('id', id).single());
  if (r.requester_id !== me.id || !['draft', 'revision'].includes(r.status)) { go('#/r/' + id); return; }
  const files = await q(sb.from('request_files').select('*').eq('request_id', id).eq('kind', 'reference').order('created_at'));
  const otherId = itemTypes.find((t) => t.code === 'other')?.id;
  const sizes = itemTypes.flatMap((t) => t.default_sizes || []);
  const opt = (arr, cur, label) => arr.map((x) => `<option value="${x.id}" ${cur == x.id ? 'selected' : ''}>${esc(label(x))}</option>`).join('');

  main.innerHTML = `
    <div class="head"><div><h1>${r.status === 'revision' ? '의뢰 수정' : '새 의뢰'}</h1><p>${r.no ? `${r.no} · ` : ''}임시저장 후 제출하면 대표에게 전달됩니다.</p></div>
      <div class="actions"><a class="btn" href="#/r/${id}">상세 보기</a></div></div>
    ${r.status === 'revision' ? '<div class="notice" style="margin-bottom:16px">대표가 수정을 요청한 의뢰입니다. 내용을 고친 뒤 <b>재제출</b>하세요.</div>' : ''}
    <div class="grid two"><div>
    <form class="card" id="f"><div class="bd">
      <div class="field"><label>의뢰 구분</label><div class="seg" id="kind">
        <button type="button" data-k="client" class="${r.kind === 'client' ? 'on' : ''}">고객사 의뢰</button><button type="button" data-k="internal" class="${r.kind === 'internal' ? 'on' : ''}">내부 의뢰</button></div></div>
      <div id="clientBox" style="${r.kind === 'internal' ? 'display:none' : ''}">
        <div class="field"><label>고객사<i>*</i></label><div class="inline"><select id="client_id" style="flex:1"><option value="">선택</option>${opt(clients, r.client_id, (c) => c.name)}</select>
          <button type="button" class="btn" id="newClient">+ 즉석 등록</button></div></div>
        <div id="newClientBox" class="card" style="display:none;margin-bottom:14px"><div class="bd">
          <div class="row"><div class="field"><label>기업명<i>*</i></label><input type="text" id="nc_name"></div><div class="field"><label>대표자</label><input type="text" id="nc_ceo"></div>
          <div class="field"><label>담당자</label><input type="text" id="nc_contact"></div><div class="field"><label>직급</label><input type="text" id="nc_pos"></div>
          <div class="field"><label>이메일</label><input type="email" id="nc_email"></div></div>
          <div class="inline"><button type="button" class="btn pri sm" id="nc_save">등록</button><button type="button" class="btn sm" id="nc_cancel">닫기</button></div></div></div>
      </div>
      <div class="field"><label>제목<i>*</i></label><input type="text" id="title" value="${esc(r.title)}" placeholder="예: 봄 시즌 상세페이지"></div>
      <div class="row">
        <div class="field"><label>품목<i>*</i></label><select id="item_type_id"><option value="">선택</option>${opt(itemTypes.filter((t) => t.is_active || t.id === r.item_type_id), r.item_type_id, (t) => t.label)}</select></div>
        <div class="field" id="otherBox" style="${r.item_type_id == otherId ? '' : 'display:none'}"><label>기타 품목 설명<i>*</i></label><input type="text" id="item_type_other" value="${esc(r.item_type_other)}"></div>
      </div>
      <div class="row">
        <div class="field"><label>상품명</label><input type="text" id="product_name" value="${esc(r.product_name)}"></div>
        <div class="field"><label>제작 사이즈</label><input type="text" id="size_spec" list="sizes" value="${esc(r.size_spec)}" placeholder="품목별 기본 규격 추천"><datalist id="sizes">${[...new Set(sizes)].map((s) => `<option value="${esc(s)}">`).join('')}</datalist></div>
      </div>
      <div class="field"><label>사용 용도<i>*</i></label><textarea id="purpose" placeholder="어디에, 어떤 목적으로 쓰이는지">${esc(r.purpose)}</textarea></div>
      <div class="field"><label>상품 특장점</label><textarea id="product_features">${esc(r.product_features)}</textarea></div>
      <div class="field"><label>필수 기입 멘트</label><textarea id="required_copy" placeholder="반드시 들어가야 할 문구">${esc(r.required_copy)}</textarea></div>
      <div class="field"><label>참고사항</label><textarea id="notes">${esc(r.notes)}</textarea></div>
      <div class="field" style="max-width:240px"><label>희망 납기</label><input type="date" id="requested_due" value="${esc(r.requested_due || '')}"></div>
    </div>
    <div class="hd" style="border-top:1px solid var(--line);border-bottom:0"><div class="actions">
      <button class="btn" type="submit" data-act="save">임시저장</button>
      <button class="btn pri" type="submit" data-act="submit">${r.status === 'revision' ? '재제출' : '제출'}</button></div>
      <button class="btn dan sm" type="button" id="cancelReq">의뢰 취소</button></div>
    </form></div>
    <div><div class="card"><div class="hd"><h3>참고자료</h3><label class="btn sm">+ 파일 추가<input type="file" id="up" multiple hidden></label></div>
      <div class="bd"><ul class="files" id="files">${files.length ? files.map(fileLi(true)).join('') : '<li class="muted">첨부 없음</li>'}</ul>
      <div class="hint mt">50MB 이하. 이미지·PDF·AI·PSD·ZIP 등. 제출 후에는 코멘트로 추가 자료를 전달하세요.</div></div></div></div></div>`;

  let kind = r.kind;
  on('#kind button', 'click', (e) => { kind = e.currentTarget.dataset.k; main.querySelectorAll('#kind button').forEach((b) => b.classList.toggle('on', b.dataset.k === kind)); main.querySelector('#clientBox').style.display = kind === 'internal' ? 'none' : ''; });
  main.querySelector('#item_type_id').onchange = (e) => { main.querySelector('#otherBox').style.display = e.target.value == otherId ? '' : 'none'; };
  main.querySelector('#newClient').onclick = () => { main.querySelector('#newClientBox').style.display = ''; };
  main.querySelector('#nc_cancel').onclick = () => { main.querySelector('#newClientBox').style.display = 'none'; };
  main.querySelector('#nc_save').onclick = async () => {
    if (!val('nc_name')) return toast('기업명을 입력하세요.', true);
    try {
      const c = await q(sb.from('clients').insert({ name: val('nc_name'), ceo_name: val('nc_ceo') || null, contact_name: val('nc_contact') || null, contact_position: val('nc_pos') || null, contact_email: val('nc_email') || null, created_by: me.id }).select().single());
      clients.push(c); clients.sort((a, b) => a.name.localeCompare(b.name));
      const sel = main.querySelector('#client_id'); sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${esc(c.name)}</option>`); sel.value = c.id;
      main.querySelector('#newClientBox').style.display = 'none'; toast('고객사를 등록했습니다.');
    } catch (e) { toast(errText(e), true); }
  };
  const collect = () => ({
    kind, client_id: kind === 'client' && val('client_id') ? Number(val('client_id')) : null,
    title: val('title'), item_type_id: val('item_type_id') ? Number(val('item_type_id')) : null, item_type_other: val('item_type_other'),
    product_name: val('product_name'), purpose: val('purpose'), size_spec: val('size_spec'), product_features: val('product_features'),
    required_copy: val('required_copy'), notes: val('notes'), requested_due: val('requested_due') || null,
  });
  main.querySelector('#f').onsubmit = async (ev) => {
    ev.preventDefault();
    const act = ev.submitter?.dataset.act || 'save';
    try {
      await rpc('request_save', { p_id: id, p_fields: collect() });
      if (act === 'submit') { await rpc('request_transition', { p_id: id, p_action: r.status === 'revision' ? 'resubmit' : 'submit', p_payload: {} }); toast('제출했습니다. 대표에게 알림이 갑니다.'); go('#/r/' + id); }
      else toast('임시저장했습니다.');
    } catch (e) { toast(errText(e), true); }
  };
  main.querySelector('#cancelReq').onclick = () => confirmDialog('의뢰 취소', '이 의뢰를 취소할까요? 취소하면 되돌릴 수 없습니다.', async () => {
    await rpc('request_transition', { p_id: id, p_action: 'cancel', p_payload: {} }); toast('취소했습니다.'); go('#/');
  });
  main.querySelector('#up').onchange = async (e) => { for (const f of e.target.files) await uploadFile(id, 'reference', f); render(); };
  bindFileDelete(main);
}

function fileLi(canDelete) {
  return (f) => `<li data-id="${f.id}" data-path="${esc(f.storage_path)}"><span class="n">${esc(f.file_name)}</span><span class="s">${fmtSize(f.size_bytes)}${f.upload_state === 'pending' ? ' · 업로드 미완료' : ''}</span>
    <button class="btn sm dl" type="button">내려받기</button>${canDelete ? '<button class="btn sm dan del" type="button">삭제</button>' : ''}</li>`;
}
function bindFileDelete(main) {
  on('.files .dl', 'click', async (e) => {
    const li = e.currentTarget.closest('li');
    try { const { data, error } = await sb.storage.from('request-files').createSignedUrl(li.dataset.path, 60, { download: li.querySelector('.n').textContent }); if (error) throw error; window.open(data.signedUrl, '_blank'); }
    catch (err) { toast('내려받기 실패: ' + errText(err), true); }
  }, main);
  on('.files .del', 'click', async (e) => {
    const li = e.currentTarget.closest('li');
    try { await sb.storage.from('request-files').remove([li.dataset.path]); await rpc('file_delete', { p_file: li.dataset.id }); li.remove(); toast('삭제했습니다.'); }
    catch (err) { toast(errText(err), true); }
  }, main);
}
async function uploadFile(requestId, kind, file) {
  try {
    const res = await rpc('file_reserve', { p_request: requestId, p_kind: kind, p_file_name: file.name, p_size: file.size, p_mime: file.type || 'application/octet-stream' });
    const { error } = await sb.storage.from('request-files').upload(res.path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
    if (error) throw error;
    await rpc('file_confirm', { p_file: res.id });
    toast(`${file.name} 업로드 완료`);
  } catch (e) { toast(`${file.name}: ${errText(e)}`, true); }
}

// ---------------------------------------------------------------- detail
async function viewDetail(main, id) {
  const [r, files, comments, events] = await Promise.all([
    q(sb.from('requests').select('*').eq('id', id).single()),
    q(sb.from('request_files').select('*').eq('request_id', id).order('created_at')),
    q(sb.from('request_comments').select('*').eq('request_id', id).order('created_at')),
    q(sb.from('request_events').select('*').eq('request_id', id).order('created_at')),
  ]);
  const it = itemTypes.find((t) => t.id === r.item_type_id); const cl = clients.find((c) => c.id === r.client_id);
  const mine = r.requester_id === me.id;
  const acts = [];
  if (mine && ['draft', 'revision'].includes(r.status)) acts.push(`<a class="btn pri" href="#/edit/${id}">${r.status === 'revision' ? '수정하고 재제출' : '이어서 작성'}</a>`);
  if (mine && ['draft', 'submitted', 'revision'].includes(r.status)) acts.push('<button class="btn dan" data-a="cancel">의뢰 취소</button>');
  if (me.role === 'approver' && r.status === 'submitted') acts.push('<button class="btn pri" data-a="approve">승인</button><button class="btn" data-a="request_revision">수정 요청</button><button class="btn dan" data-a="reject">반려</button>');
  if (me.role === 'approver' && ['approved', 'in_progress'].includes(r.status)) acts.push('<button class="btn" data-a="update_terms">우선순위·납기 조정</button>');
  if (me.role === 'designer' && r.status === 'approved') acts.push('<button class="btn pri" data-a="start">작업 시작</button>');
  if (me.role === 'designer' && r.status === 'in_progress') acts.push('<button class="btn pri" data-a="complete">완료 처리</button>');
  const canDeliver = me.role === 'designer' && ['approved', 'in_progress'].includes(r.status);
  const canDelRef = mine && ['draft', 'revision'].includes(r.status);
  const refs = files.filter((f) => f.kind === 'reference'), dels = files.filter((f) => f.kind === 'deliverable');
  const sec = (t, v) => (v ? `<div class="sec"><h3>${t}</h3><div class="txt">${esc(v)}</div></div>` : '');

  main.innerHTML = `
    <div class="head"><div><div class="inline" style="margin-bottom:6px"><span class="mono">${esc(r.no || '임시저장')}</span>${chip(r.status)}${prio(r.priority)}</div>
      <h1>${esc(r.title || '(제목 없음)')}</h1></div><div class="actions" id="acts">${acts.join('')}</div></div>
    <div class="grid two"><div>
      <div class="card"><div class="bd">
        <div class="meta">
          <div><b>구분</b>${r.kind === 'internal' ? '내부 의뢰' : '고객사 의뢰'}</div><div><b>고객사</b>${esc(cl?.name || '-')}</div>
          <div><b>품목</b>${esc(it?.label || '-')}${r.item_type_other ? ` (${esc(r.item_type_other)})` : ''}</div><div><b>상품명</b>${esc(r.product_name || '-')}</div>
          <div><b>제작 사이즈</b>${esc(r.size_spec || '-')}</div><div><b>신청자</b>${esc(pname(r.requester_id))}</div>
          <div><b>희망 납기</b>${fmtD(r.requested_due)}</div><div><b>확정 납기</b>${fmtD(r.confirmed_due)}</div>
          <div><b>승인</b>${r.approver_id ? esc(pname(r.approver_id)) + ' · ' + fmtD(r.decided_at) : '-'}</div><div><b>디자이너</b>${r.designer_id ? esc(pname(r.designer_id)) : '-'}</div>
        </div>
        ${sec('사용 용도', r.purpose)}${sec('상품 특장점', r.product_features)}${sec('필수 기입 멘트', r.required_copy)}${sec('참고사항', r.notes)}
        ${cl ? `<div class="sec"><h3>고객사 정보</h3><div class="txt">${esc([cl.ceo_name && '대표 ' + cl.ceo_name, cl.contact_name && '담당 ' + cl.contact_name + (cl.contact_position ? ' ' + cl.contact_position : ''), cl.contact_email].filter(Boolean).join(' · ') || '-')}</div></div>` : ''}
      </div></div>
      <div class="card"><div class="hd"><h3>코멘트 <span class="muted">${comments.length}</span></h3></div><div class="bd">
        ${comments.map((c) => `<div class="cm"><div class="a"><b>${esc(pname(c.author_id))}</b> · ${fmtDT(c.created_at)}</div><div class="b">${esc(c.body)}</div></div>`).join('') || '<div class="muted">아직 코멘트가 없습니다.</div>'}
        <form id="cf" class="mt"><div class="field"><textarea id="cbody" placeholder="질문·추가 자료 링크·피드백을 남기세요. 관련자에게 이메일로 알립니다." required></textarea></div><div class="right"><button class="btn pri" type="submit">코멘트 남기기</button></div></form>
      </div></div>
    </div><div>
      <div class="card"><div class="hd"><h3>결과물</h3>${canDeliver ? '<label class="btn sm">+ 업로드<input type="file" id="upDel" multiple hidden></label>' : ''}</div><div class="bd">
        ${r.deliverable_url ? `<div style="margin-bottom:8px"><a href="${esc(r.deliverable_url)}" target="_blank" rel="noopener" style="text-decoration:underline">${esc(r.deliverable_url)}</a></div>` : ''}
        <ul class="files">${dels.length ? dels.map(fileLi(me.role === 'designer' && r.status === 'in_progress')).join('') : '<li class="muted">아직 없음</li>'}</ul></div></div>
      <div class="card"><div class="hd"><h3>참고자료</h3></div><div class="bd"><ul class="files">${refs.length ? refs.map(fileLi(canDelRef)).join('') : '<li class="muted">첨부 없음</li>'}</ul></div></div>
      <div class="card"><div class="hd"><h3>타임라인</h3></div><div class="bd"><ul class="tl">${events.map((e) => `<li><span class="d">${fmtDT(e.created_at)}</span><div><b>${ACTION_KO[e.action] || e.action}</b> <span class="muted">${esc(pname(e.actor_id))}</span>${termsText(e)}${e.note && e.action !== 'comment' ? `<div class="m">${esc(e.note)}</div>` : ''}</div></li>`).join('')}</ul></div></div>
    </div></div>`;

  bindFileDelete(main);
  const up = main.querySelector('#upDel'); if (up) up.onchange = async (e) => { for (const f of e.target.files) await uploadFile(id, 'deliverable', f); render(); };
  main.querySelector('#cf').onsubmit = async (ev) => { ev.preventDefault(); try { await rpc('comment_add', { p_request: id, p_body: val('cbody') }); toast('코멘트를 남겼습니다.'); render(); } catch (e) { toast(errText(e), true); } };
  on('#acts button', 'click', (e) => actionDialog(r, e.currentTarget.dataset.a));
}
function termsText(e) {
  const p = e.payload; if (!p || !p.priority) return '';
  const a = [];
  if (p.priority.from !== p.priority.to) a.push(`우선순위 ${PRIO[p.priority.from] || '-'} → ${PRIO[p.priority.to]}`);
  if (p.confirmed_due?.from !== p.confirmed_due?.to) a.push(`납기 ${fmtD(p.confirmed_due?.from)} → ${fmtD(p.confirmed_due?.to)}`);
  return a.length ? `<div class="m">${esc(a.join(', '))}</div>` : '';
}

function dialog(title, body, okLabel, onOk, danger) {
  document.querySelector('dialog')?.remove();
  const d = document.createElement('dialog');
  d.innerHTML = `<form method="dialog"><div class="hd"><h2>${title}</h2></div><div class="bd">${body}</div>
    <div class="ft"><button class="btn" value="cancel" type="button" id="dc">닫기</button><button class="btn ${danger ? 'dan' : 'pri'}" type="submit" id="dok">${okLabel}</button></div></form>`;
  document.body.appendChild(d); d.showModal();
  d.querySelector('#dc').onclick = () => d.close();
  d.querySelector('form').onsubmit = async (ev) => { ev.preventDefault(); const b = d.querySelector('#dok'); b.disabled = true; try { await onOk(d); d.close(); } catch (e) { toast(errText(e), true); b.disabled = false; } };
  return d;
}
const confirmDialog = (t, msg, fn) => dialog(t, `<p>${esc(msg)}</p>`, '확인', fn, true);
const dv = (d, id) => d.querySelector('#' + id)?.value?.trim() ?? '';

function actionDialog(r, a) {
  const prioSel = (cur) => `<div class="field"><label>우선순위</label><select id="d_prio">${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>`;
  const dueIn = (cur, req) => `<div class="field"><label>확정 납기${req ? '<i>*</i>' : ''}</label><input type="date" id="d_due" value="${cur || r.requested_due || ''}" ${req ? 'required' : ''}>${r.requested_due ? `<div class="hint">신청자 희망 납기: ${fmtD(r.requested_due)}</div>` : ''}</div>`;
  const noteIn = (req, ph) => `<div class="field"><label>${req ? '사유<i>*</i>' : '메모'}</label><textarea id="d_note" placeholder="${ph || ''}" ${req ? 'required' : ''}></textarea></div>`;
  const run = (payload) => rpc('request_transition', { p_id: r.id, p_action: a, p_payload: payload }).then(() => { toast('처리했습니다.'); render(); });
  switch (a) {
    case 'cancel': return confirmDialog('의뢰 취소', '이 의뢰를 취소할까요? 취소하면 되돌릴 수 없습니다.', () => run({}));
    case 'approve': return dialog('승인', prioSel(r.priority) + dueIn(r.confirmed_due, true) + noteIn(false, '디자이너·신청자에게 전달할 메모'), '승인', (d) => run({ priority: dv(d, 'd_prio'), confirmed_due: dv(d, 'd_due'), note: dv(d, 'd_note') }));
    case 'request_revision': return dialog('수정 요청', noteIn(true, '무엇을 어떻게 고쳐야 하는지'), '수정 요청', (d) => run({ note: dv(d, 'd_note') }));
    case 'reject': return dialog('반려', '<p class="muted">반려하면 의뢰가 종료됩니다.</p>' + noteIn(true, '반려 사유'), '반려', (d) => run({ note: dv(d, 'd_note') }), true);
    case 'update_terms': return dialog('우선순위·납기 조정', prioSel(r.priority) + dueIn(r.confirmed_due, false) + noteIn(false), '조정', (d) => run({ priority: dv(d, 'd_prio'), confirmed_due: dv(d, 'd_due') || null, note: dv(d, 'd_note') }));
    case 'start': return dialog('작업 시작', '<p>이 의뢰를 작업중으로 바꿉니다. 신청자에게 알림이 갑니다.</p>' + noteIn(false), '시작', (d) => run({ note: dv(d, 'd_note') }));
    case 'complete': return dialog('완료 처리', `<p class="muted">결과물 파일을 먼저 업로드했거나, 아래 URL을 입력해야 합니다.</p><div class="field"><label>결과물 URL</label><input type="url" id="d_url" value="${esc(r.deliverable_url || '')}" placeholder="https://"></div>` + noteIn(false, '신청자·대표에게 전달할 메모'), '완료', (d) => run({ deliverable_url: dv(d, 'd_url'), note: dv(d, 'd_note') }));
  }
}

// ---------------------------------------------------------------- clients
async function viewClients(main) {
  const counts = await q(sb.from('requests').select('client_id').not('client_id', 'is', null));
  const cnt = {}; counts.forEach((r) => { cnt[r.client_id] = (cnt[r.client_id] || 0) + 1; });
  main.innerHTML = `
    <div class="head"><div><h1>고객사</h1><p>모든 직원이 등록할 수 있고, 수정·삭제는 관리자만 합니다.</p></div><button class="btn pri" id="add">+ 고객사 등록</button></div>
    <div class="card">${clients.length ? `<table><thead><tr><th>기업명</th><th>대표자</th><th>담당자</th><th>이메일</th><th>메모</th><th>의뢰</th><th></th></tr></thead><tbody>
      ${clients.map((c) => `<tr><td class="t">${esc(c.name)}</td><td>${esc(c.ceo_name || '-')}</td><td>${esc(c.contact_name || '-')}${c.contact_position ? ` <span class="muted">${esc(c.contact_position)}</span>` : ''}</td><td>${esc(c.contact_email || '-')}</td><td class="muted">${esc(c.memo || '')}</td>
        <td><a href="#/?tab=all&client=${c.id}" style="text-decoration:underline">${cnt[c.id] || 0}건</a></td>
        <td class="right">${me.is_admin ? `<button class="btn sm ed" data-id="${c.id}">수정</button> <button class="btn sm dan rm" data-id="${c.id}">삭제</button>` : ''}</td></tr>`).join('')}
    </tbody></table>` : '<div class="empty">등록된 고객사가 없습니다.</div>'}</div>`;
  const form = (c = {}) => `<div class="row"><div class="field"><label>기업명<i>*</i></label><input type="text" id="c_name" value="${esc(c.name)}" required></div><div class="field"><label>대표자</label><input type="text" id="c_ceo" value="${esc(c.ceo_name)}"></div>
    <div class="field"><label>담당자</label><input type="text" id="c_contact" value="${esc(c.contact_name)}"></div><div class="field"><label>직급</label><input type="text" id="c_pos" value="${esc(c.contact_position)}"></div>
    <div class="field"><label>이메일</label><input type="email" id="c_email" value="${esc(c.contact_email)}"></div></div><div class="field"><label>메모</label><textarea id="c_memo">${esc(c.memo)}</textarea></div>`;
  const pick = (d) => ({ name: dv(d, 'c_name'), ceo_name: dv(d, 'c_ceo') || null, contact_name: dv(d, 'c_contact') || null, contact_position: dv(d, 'c_pos') || null, contact_email: dv(d, 'c_email') || null, memo: dv(d, 'c_memo') || null });
  main.querySelector('#add').onclick = () => dialog('고객사 등록', form(), '등록', async (d) => { await q(sb.from('clients').insert({ ...pick(d), created_by: me.id })); toast('등록했습니다.'); me = null; render(); });
  on('.ed', 'click', (e) => { const c = clients.find((x) => x.id == e.currentTarget.dataset.id); dialog('고객사 수정', form(c), '저장', async (d) => { await q(sb.from('clients').update(pick(d)).eq('id', c.id)); toast('저장했습니다.'); me = null; render(); }); });
  on('.rm', 'click', (e) => { const c = clients.find((x) => x.id == e.currentTarget.dataset.id); confirmDialog('고객사 삭제', `${c.name} 을(를) 삭제할까요? 의뢰가 연결된 고객사는 삭제되지 않습니다.`, async () => { await q(sb.from('clients').delete().eq('id', c.id)); toast('삭제했습니다.'); me = null; render(); }); });
}

// ---------------------------------------------------------------- settings (admin)
async function viewSettings(main) {
  if (!me.is_admin) { go('#/'); return; }
  main.innerHTML = `
    <div class="head"><div><h1>설정</h1><p>사용자 역할·활성화와 품목 카탈로그를 관리합니다.</p></div></div>
    <div class="notice info" style="margin-bottom:16px">새 사용자 초대는 Supabase 대시보드 → Authentication → Users → <b>Invite user</b> 로 합니다. 초대 메일의 링크를 열면 비밀번호를 정하고 바로 사용할 수 있습니다. 초대된 사용자는 기본 <b>직원</b> 역할입니다.</div>
    <div class="card"><div class="hd"><h3>사용자 <span class="muted">${profiles.length}</span></h3></div>
      <table><thead><tr><th>이름</th><th>이메일</th><th>직급</th><th>역할</th><th>관리자</th><th>활성</th><th></th></tr></thead><tbody>
      ${profiles.map((p) => `<tr data-id="${p.id}"><td class="t">${esc(p.name || '-')}</td><td class="mono">${esc(p.email)}</td><td>${esc(p.position || '-')}</td>
        <td><select class="u_role" style="width:auto">${Object.entries(ROLE).map(([k, v]) => `<option value="${k}" ${p.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
        <td><input type="checkbox" class="u_admin" ${p.is_admin ? 'checked' : ''}></td><td><input type="checkbox" class="u_active" ${p.is_active ? 'checked' : ''}></td>
        <td class="right"><button class="btn sm u_save">저장</button></td></tr>`).join('')}</tbody></table></div>
    <div class="card"><div class="hd"><h3>품목 카탈로그</h3><button class="btn sm" id="addItem">+ 품목 추가</button></div>
      <table><thead><tr><th>코드</th><th>표시명</th><th>정렬</th><th>기본 규격</th><th>사용</th><th></th></tr></thead><tbody>
      ${itemTypes.map((t) => `<tr data-id="${t.id}"><td class="mono">${esc(t.code)}</td><td><input type="text" class="i_label" value="${esc(t.label)}"></td><td><input type="number" class="i_sort" value="${t.sort}" style="width:80px"></td>
        <td><input type="text" class="i_sizes" value="${esc((t.default_sizes || []).join(', '))}" placeholder="쉼표로 구분"></td><td><input type="checkbox" class="i_active" ${t.is_active ? 'checked' : ''}></td>
        <td class="right"><button class="btn sm i_save">저장</button></td></tr>`).join('')}</tbody></table>
      <div class="bd hint">품목은 삭제하지 않고 "사용" 해제로 숨깁니다(기존 의뢰가 참조).</div></div>`;
  on('.u_save', 'click', async (e) => {
    const tr = e.currentTarget.closest('tr');
    try { await rpc('admin_set_user', { p_user: tr.dataset.id, p_role: tr.querySelector('.u_role').value, p_is_admin: tr.querySelector('.u_admin').checked, p_is_active: tr.querySelector('.u_active').checked }); toast('저장했습니다.'); me = null; render(); }
    catch (err) { toast(errText(err), true); }
  });
  on('.i_save', 'click', async (e) => {
    const tr = e.currentTarget.closest('tr');
    try { await q(sb.from('item_types').update({ label: tr.querySelector('.i_label').value.trim(), sort: Number(tr.querySelector('.i_sort').value) || 100, default_sizes: tr.querySelector('.i_sizes').value.split(',').map((s) => s.trim()).filter(Boolean), is_active: tr.querySelector('.i_active').checked }).eq('id', tr.dataset.id)); toast('저장했습니다.'); me = null; render(); }
    catch (err) { toast(errText(err), true); }
  });
  main.querySelector('#addItem').onclick = () => dialog('품목 추가', `<div class="row"><div class="field"><label>코드<i>*</i></label><input type="text" id="n_code" placeholder="영문 소문자, 예: catalog" required></div><div class="field"><label>표시명<i>*</i></label><input type="text" id="n_label" required></div></div><div class="field"><label>기본 규격</label><input type="text" id="n_sizes" placeholder="쉼표로 구분"></div>`, '추가', async (d) => {
    await q(sb.from('item_types').insert({ code: dv(d, 'n_code').toLowerCase(), label: dv(d, 'n_label'), default_sizes: dv(d, 'n_sizes').split(',').map((s) => s.trim()).filter(Boolean), sort: 500 })); toast('추가했습니다.'); me = null; render();
  });
}

// ---------------------------------------------------------------- me
function viewMe(main) {
  main.innerHTML = `<div class="head"><div><h1>내 정보</h1><p>${esc(me.email)} · ${ROLE[me.role]}${me.is_admin ? ' · 관리자' : ''}</p></div></div>
    <div class="card" style="max-width:520px"><form class="bd" id="f">
      <div class="field"><label>이름</label><input type="text" id="m_name" value="${esc(me.name)}" required></div>
      <div class="field"><label>직급</label><input type="text" id="m_pos" value="${esc(me.position)}"></div>
      <div class="inline"><button class="btn pri" type="submit">저장</button><a class="btn" href="#/forgot" id="pwreset">비밀번호 재설정 메일</a></div></form></div>`;
  main.querySelector('#f').onsubmit = async (e) => { e.preventDefault(); try { await q(sb.from('profiles').update({ name: val('m_name'), position: val('m_pos') || null }).eq('id', me.id)); toast('저장했습니다.'); me = null; render(); } catch (err) { toast(errText(err), true); } };
  main.querySelector('#pwreset').onclick = async (e) => { e.preventDefault(); const { error } = await sb.auth.resetPasswordForEmail(me.email, { redirectTo: location.origin + location.pathname }); toast(error ? errText(error) : '재설정 메일을 보냈습니다.', !!error); };
}
