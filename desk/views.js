// 화면들. ctx = { api, me, profiles, itemTypes, clients, reload, render }
import { STATUS, PRIO, PRIO_RANK, ROLE, ROLE_DESC, ACTION_KO, esc, fmtD, fmtDT, fmtSize, chip, prioTag, dueText, go, back, safeUrl, toast, errText, $, $$, on, v, stepper, dialog, confirmDialog, field } from './ui.js';

const OPEN = ['draft', 'submitted', 'revision', 'approved', 'in_progress'];
const pname = (ctx, id) => ctx.profiles.find((p) => p.id === id)?.name || (id ? '(알 수 없음)' : '-');
const itemLabel = (ctx, r) => ctx.itemTypes.find((t) => t.id === r.item_type_id)?.label || '품목 미정';
const clientName = (ctx, r) => (r.kind === 'internal' ? '내부' : ctx.clients.find((c) => c.id === r.client_id)?.name || '고객사 미정');
const first = (s) => (s || '?').trim().slice(0, 1);

// ---------------------------------------------------------------- 공용: 의뢰 행
function rrow(ctx, r) {
  return `<li class="rrow" data-id="${r.id}">
    <div class="no">${esc(r.no || '작성중')}</div>
    <div><div class="ttl"><a href="#/r/${r.id}">${esc(r.title || '(제목 없음)')}</a>${prioTag(r.priority)}</div><div class="sub">${esc(itemLabel(ctx, r))} · ${esc(clientName(ctx, r))}</div></div>
    <div class="who">${esc(pname(ctx, r.requester_id))}${ctx.me.role !== 'requester' && r.designer_id ? ` → ${esc(pname(ctx, r.designer_id))}` : ''}</div>
    <div class="dd">${dueText(r)}</div>
    <div class="st">${chip(r.status)}</div></li>`;
}
function rlist(ctx, rows, emptyText = '해당하는 의뢰가 없습니다.') {
  return `<ul class="rlist">${rows.length ? rows.map((r) => rrow(ctx, r)).join('') : `<li class="empty">${emptyText}</li>`}</ul>`;
}
const bindRows = (main) => on('.rrow', 'click', (e) => { if (e.target.closest('a')) return; go('#/r/' + e.currentTarget.dataset.id); }, main);
const flowGuide = () => `<div class="flow">
  <div><b>1 작성·제출</b><p>직원이 의뢰서를 채워 제출합니다. 작성 중엔 임시저장됩니다.</p></div>
  <div><b>2 대표 승인</b><p>대표가 내용을 보고 승인하며 우선순위와 확정 납기를 정합니다.</p></div>
  <div><b>3 디자인 작업</b><p>디자이너가 작업을 시작하고, 궁금한 건 코멘트로 묻습니다.</p></div>
  <div><b>4 결과물 전달</b><p>완료되면 결과물을 이 화면에서 바로 내려받습니다.</p></div></div>`;

// ---------------------------------------------------------------- 홈
export async function home(main, ctx) {
  const { me } = ctx;
  const all = await ctx.api.requests();
  const by = (...s) => all.filter((r) => s.includes(r.status));
  const overdue = all.filter((r) => OPEN.includes(r.status) && r.status !== 'draft' && (r.confirmed_due || r.requested_due) && new Date(r.confirmed_due || r.requested_due) < new Date(new Date().toDateString()));
  const month = new Date().toISOString().slice(0, 7);
  const doneMonth = all.filter((r) => r.status === 'done' && (r.completed_at || '').startsWith(month));
  const tile = (n, label, cls = '') => `<div class="tile ${cls}"><b>${n}</b><span>${label}</span></div>`;
  const sec = (title, rows, more, empty) => `<div class="card"><div class="hd"><h3>${title} <span class="muted small">${rows.length}</span></h3>${more ? `<a class="btn sm ghost" href="${more}">전체 보기 →</a>` : ''}</div>${rlist(ctx, rows, empty)}</div>`;
  let html = '';

  if (me.role === 'requester') {
    const rev = by('revision'), open = all.filter((r) => OPEN.includes(r.status));
    html = `<div class="head"><div><div class="eyebrow">내 의뢰</div><h1>안녕하세요, ${esc(me.name || '')}님</h1><p class="lead">디자인이 필요하면 의뢰서를 작성해 제출하세요. 대표 승인 뒤 디자이너가 작업하고, 완료되면 이메일로 알려드립니다.</p></div>
      <a class="btn pri lg" href="#/new">+ 새 의뢰 작성</a></div>
      <div class="grid tiles">${tile(by('draft').length, '작성중')}${tile(by('submitted').length, '승인 대기')}${tile(by('approved', 'in_progress').length, '작업 대기·작업중')}${tile(by('done').length, '완료')}</div>
      ${rev.length ? `<div class="next warn mt-l"><div class="ic">!</div><div><h3>대표가 수정을 요청한 의뢰가 ${rev.length}건 있습니다</h3><p>내용을 고친 뒤 재제출해야 다시 검토됩니다.</p></div></div><div class="card">${rlist(ctx, rev)}</div>` : ''}
      ${all.length ? `<div class="mt-l">${sec('진행중인 의뢰', open.filter((r) => r.status !== 'revision'), '#/list?tab=progress', '진행중인 의뢰가 없습니다.')}${sec('최근 완료', by('done').slice(0, 5), '#/list?tab=done', '아직 완료된 의뢰가 없습니다.')}</div>`
        : `<div class="card soft mt-l"><div class="bd"><h3>첫 의뢰를 만들어 보세요</h3><p class="muted mt">의뢰는 이렇게 진행됩니다.</p>${flowGuide()}<div class="mt"><a class="btn pri" href="#/new">새 의뢰 작성</a> <a class="btn" href="#/help">자세한 안내</a></div></div></div>`}`;
  } else if (me.role === 'approver') {
    const wait = by('submitted'), prog = by('approved', 'in_progress');
    html = `<div class="head"><div><div class="eyebrow">대표 화면</div><h1>승인할 의뢰 ${wait.length}건</h1><p class="lead">제출된 의뢰를 열어 승인하면 디자이너에게 넘어갑니다. 승인할 때 우선순위와 확정 납기를 정하세요.</p></div><a class="btn" href="#/list?tab=all">전체 의뢰</a></div>
      <div class="grid tiles">${tile(wait.length, '승인 대기', wait.length ? 'warn' : '')}${tile(prog.length, '작업 대기·작업중')}${tile(by('revision').length, '직원 수정중')}${tile(overdue.length, '납기 지남', overdue.length ? 'danger' : '')}${tile(doneMonth.length, '이번 달 완료')}</div>
      <div class="mt-l">${sec('승인 대기', wait, null, '승인을 기다리는 의뢰가 없습니다.')}${overdue.length ? sec('납기가 지난 의뢰', overdue) : ''}${sec('작업 진행중', prog.sort(byDue), '#/list?tab=progress', '진행중인 작업이 없습니다.')}</div>`;
  } else {
    const wait = by('approved').sort(byPrioDue), prog = by('in_progress').sort(byPrioDue);
    html = `<div class="head"><div><div class="eyebrow">디자이너 화면</div><h1>작업중 ${prog.length}건 · 대기 ${wait.length}건</h1><p class="lead">승인된 의뢰를 열어 작업을 시작하세요. 목록은 대표가 정한 우선순위 → 납기 순입니다. 완료할 땐 결과물 파일을 올리거나 URL을 남깁니다.</p></div><a class="btn" href="#/list?tab=all">전체 의뢰</a></div>
      <div class="grid tiles">${tile(wait.length, '작업 대기')}${tile(prog.length, '작업중')}${tile(overdue.length, '납기 지남', overdue.length ? 'danger' : '')}${tile(doneMonth.length, '이번 달 완료')}</div>
      <div class="mt-l">${sec('작업중 (우선순위·납기순)', prog, null, '작업중인 의뢰가 없습니다.')}${sec('작업 대기 (우선순위·납기순)', wait, null, '승인된 새 의뢰가 없습니다.')}${sec('최근 완료', by('done').slice(0, 5), '#/list?tab=done', '아직 완료한 의뢰가 없습니다.')}</div>`;
  }
  main.innerHTML = html; bindRows(main);
}
const byDue = (a, b) => ((a.confirmed_due || a.requested_due || '9999') > (b.confirmed_due || b.requested_due || '9999') ? 1 : -1);
const byPrioDue = (a, b) => (PRIO_RANK[a.priority] - PRIO_RANK[b.priority]) || byDue(a, b);
let creating = false;

// ---------------------------------------------------------------- 전체 목록
const TABS = {
  requester: [['progress', '진행중', OPEN], ['done', '완료', ['done']], ['all', '전체', null]],
  approver: [['wait', '승인 대기', ['submitted']], ['progress', '진행중', ['revision', 'approved', 'in_progress']], ['done', '완료', ['done']], ['all', '전체', null]],
  designer: [['wait', '작업 대기', ['approved']], ['progress', '작업중', ['in_progress']], ['done', '완료', ['done']], ['all', '전체', null]],
};
export async function list(main, ctx, params) {
  const tabs = TABS[ctx.me.role];
  const tab = tabs.find((t) => t[0] === params.get('tab')) || tabs[0];
  const f = { s: params.get('s') || '', status: params.get('status') || '', item: params.get('item') || '', client: params.get('client') || '' };
  let rows = await ctx.api.requests({ statuses: tab[2] || undefined, client_id: f.client || undefined });
  if (f.status) rows = rows.filter((r) => r.status === f.status);
  if (f.item) rows = rows.filter((r) => r.item_type_id == f.item);
  if (f.s) { const k = f.s.toLowerCase(); rows = rows.filter((r) => (r.title || '').toLowerCase().includes(k) || (r.no || '').toLowerCase().includes(k) || (r.product_name || '').toLowerCase().includes(k)); }
  // 탭을 바꾸면 그 탭과 모순될 수 있는 상태 필터는 버림
  const link = (t, extra = {}) => `#/list?${new URLSearchParams({ tab: t, ...Object.fromEntries(Object.entries({ ...f, ...(t !== tab[0] ? { status: '' } : {}), ...extra }).filter(([, x]) => x)) })}`;
  const opt = (arr, cur, lab) => arr.map((x) => `<option value="${x.id}" ${cur == x.id ? 'selected' : ''}>${esc(lab(x))}</option>`).join('');
  main.innerHTML = `
    <div class="head"><div><div class="eyebrow">의뢰</div><h1>${ctx.me.role === 'requester' ? '내 의뢰 전체' : '의뢰 전체'}</h1><p class="lead">${ctx.me.role === 'requester' ? '내가 신청한 의뢰만 보입니다.' : '작성중(임시저장) 의뢰는 제출 전이라 보이지 않습니다.'}</p></div><a class="btn pri" href="#/new">+ 새 의뢰</a></div>
    <div class="tabs">${tabs.map((t) => `<a href="${link(t[0])}" class="${t[0] === tab[0] ? 'on' : ''}">${t[1]}</a>`).join('')}</div>
    <form class="filters" id="ff">
      <input type="search" id="fs" placeholder="연번·제목·상품명 검색" value="${esc(f.s)}">
      <select id="fstatus"><option value="">상태 전체</option>${Object.entries(STATUS).map(([k, x]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${x[0]}</option>`).join('')}</select>
      <select id="fitem"><option value="">품목 전체</option>${opt(ctx.itemTypes, f.item, (t) => t.label)}</select>
      <select id="fclient"><option value="">고객사 전체</option>${opt(ctx.clients, f.client, (c) => c.name)}</select>
      <button class="btn" type="submit">적용</button>${f.s || f.status || f.item || f.client ? `<a class="btn ghost" href="${link(tab[0], { s: '', status: '', item: '', client: '' })}">초기화</a>` : ''}
    </form>
    <div class="card">${rlist(ctx, rows)}</div>`;
  bindRows(main);
  $('#ff', main).onsubmit = (e) => { e.preventDefault(); go(link(tab[0], { s: v('fs', main), status: v('fstatus', main), item: v('fitem', main), client: v('fclient', main) })); };
}

export async function createDraft(ctx) {
  if (creating) return; // 렌더가 겹쳐도 임시 의뢰는 한 번만 생성
  creating = true;
  try { const id = await ctx.api.create('client'); if (location.hash.startsWith('#/new')) go('#/edit/' + id); }
  catch (e) { toast(errText(e), true); go('#/'); }
  finally { creating = false; }
}

// ---------------------------------------------------------------- 작성 / 수정
export async function edit(main, ctx, id) {
  const r = await ctx.api.request(id);
  if (r.requester_id !== ctx.me.id || !['draft', 'revision'].includes(r.status)) { go('#/r/' + id); return; }
  let [files, events] = await Promise.all([ctx.api.files(id), r.status === 'revision' ? ctx.api.events(id) : []]);
  const revNote = r.status === 'revision' ? [...events].reverse().find((e) => e.action === 'request_revision')?.note : null;
  const otherId = ctx.itemTypes.find((t) => t.code === 'other')?.id;
  const items = ctx.itemTypes.filter((t) => t.is_active || t.id === r.item_type_id);
  const clientOpts = ctx.clients.map((c) => `<option value="${c.id}" ${r.client_id == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  let kind = r.kind, itemId = r.item_type_id;

  main.innerHTML = `
    <div class="head"><div><div class="eyebrow">${r.no ? esc(r.no) : '새 의뢰'}</div><h1>${r.status === 'revision' ? '의뢰 수정' : '의뢰서 작성'}</h1>
      <p class="lead">${r.status === 'revision' ? '대표 요청대로 고친 뒤 재제출하세요.' : '필수 항목(*)만 채우면 제출할 수 있습니다. 나머지는 디자이너가 작업할 때 큰 도움이 됩니다. 입력하면 잠시 후 자동으로 임시저장됩니다.'}</p></div>
      <div class="actions"><button class="btn" id="preview" type="button">저장하고 미리보기</button></div></div>
    ${revNote ? `<div class="next warn"><div class="ic">!</div><div><h3>대표의 수정 요청</h3><p>${esc(revNote)}</p></div></div>` : ''}
    <form class="card" id="f" novalidate>
      <section class="fsec"><div class="sh"><span class="num">1</span><div><h3>어떤 의뢰인가요</h3><p>고객사 납품용이면 고객사를, 회사 내부용이면 내부 의뢰를 고르세요.</p></div></div>
        <div class="field"><div class="seg" id="kind"><button type="button" data-k="client" class="${kind === 'client' ? 'on' : ''}">고객사 의뢰</button><button type="button" data-k="internal" class="${kind === 'internal' ? 'on' : ''}">내부 의뢰</button></div></div>
        <div id="clientBox" style="${kind === 'internal' ? 'display:none' : ''}">
          ${field('고객사', `<div class="inline"><select id="client_id" style="flex:1 1 180px;min-width:0"><option value="">고객사를 선택하세요</option>${clientOpts}</select><button type="button" class="btn" id="newClient">+ 새 고객사</button></div>`, { req: true, hint: '목록에 없으면 "새 고객사"로 바로 등록할 수 있습니다.' })}
          <div id="ncBox" class="card soft" style="display:none;margin-bottom:16px"><div class="bd">
            <div class="row">${field('기업명', '<input type="text" id="nc_name">', { req: true })}${field('대표자', '<input type="text" id="nc_ceo">')}${field('담당자', '<input type="text" id="nc_contact">')}${field('담당자 직급', '<input type="text" id="nc_pos">')}${field('담당자 이메일', '<input type="email" id="nc_email">')}</div>
            <div class="inline"><button type="button" class="btn pri sm" id="nc_save">등록하고 선택</button><button type="button" class="btn sm" id="nc_cancel">닫기</button></div></div></div>
        </div>
      </section>
      <section class="fsec"><div class="sh"><span class="num">2</span><div><h3>무엇을 만드나요</h3><p>품목을 고르면 자주 쓰는 사이즈를 추천해 드립니다.</p></div></div>
        ${field('품목', `<div class="picker" id="picker">${items.map((t) => `<button type="button" data-id="${t.id}" class="${itemId == t.id ? 'on' : ''}">${esc(t.label)}${t.default_sizes?.length ? `<small>${esc(t.default_sizes[0])} 등</small>` : ''}</button>`).join('')}</div>`, { req: true })}
        <div id="otherBox" style="${itemId == otherId ? '' : 'display:none'}">${field('기타 품목 설명', `<input type="text" id="item_type_other" value="${esc(r.item_type_other)}" placeholder="예: 의류 프린팅, 전시 부스 그래픽">`, { req: true })}</div>
        ${field('제목', `<input type="text" id="title" value="${esc(r.title)}" placeholder="예: 그린라이프 대나무 칫솔 상세페이지">`, { req: true, hint: '목록에서 한눈에 알아볼 수 있게 "고객사 + 제품 + 품목" 형식을 권합니다.' })}
        <div class="row">${field('상품명', `<input type="text" id="product_name" value="${esc(r.product_name)}" placeholder="예: 대나무 칫솔 4입">`)}
        ${field('제작 사이즈', `<input type="text" id="size_spec" value="${esc(r.size_spec)}" placeholder="예: 860px 폭, A4"><div class="chips mt" id="sizes"></div>`, { hint: '정확한 규격을 모르면 비워두세요. 디자이너가 확인합니다.' })}</div>
      </section>
      <section class="fsec"><div class="sh"><span class="num">3</span><div><h3>어떻게 쓰이나요</h3><p>디자이너가 방향을 잡는 데 가장 중요한 부분입니다.</p></div></div>
        ${field('사용 용도', `<textarea id="purpose" placeholder="예: 자사몰과 스마트스토어 상품 상세페이지. 기존 페이지를 새 톤으로 교체">${esc(r.purpose)}</textarea>`, { req: true, hint: '어디에(채널·매체), 무엇을 위해(판매·홍보·안내) 쓰는지 적어주세요.' })}
        ${field('상품 특장점', `<textarea id="product_features" placeholder="예: 생분해 손잡이, 미세모, 4개 묶음 구성">${esc(r.product_features)}</textarea>`, { hint: '강조하고 싶은 점 3가지 정도.' })}
        ${field('필수 기입 멘트', `<textarea id="required_copy" placeholder='예: "플라스틱 프리" 문구 필수, 할인 기간 9/30까지 명시'>${esc(r.required_copy)}</textarea>`, { hint: '반드시 들어가야 하는 문구·숫자·법적 표기.' })}
        ${field('참고사항', `<textarea id="notes" placeholder="예: 경쟁사 A 톤 참고, 브랜드 컬러 #0F5C46, 핑크 계열 금지">${esc(r.notes)}</textarea>`)}
      </section>
      <section class="fsec"><div class="sh"><span class="num">4</span><div><h3>자료와 일정</h3><p>제품 사진, 로고, 기존 디자인, 레퍼런스를 올려주세요. 제출 후에는 코멘트로 추가 자료를 전달합니다.</p></div></div>
        <div class="grid main">
          <div class="field"><label>참고자료</label><ul class="files" id="files"></ul>
            <div class="inline mt"><label class="btn">+ 파일 추가<input type="file" id="up" multiple hidden></label><span class="hint">파일당 50MB까지. 이미지·PDF·AI·PSD·ZIP 등</span></div></div>
          ${field('희망 납기', `<input type="date" id="requested_due" value="${esc(r.requested_due || '')}">`, { hint: '대표가 승인하면서 확정 납기를 정합니다.' })}
        </div>
      </section>
      <div class="stick"><div><ul class="check" id="check"></ul><div class="st" id="savest"></div></div><div class="actions"><button class="btn dan ghost sm" type="button" id="cancelReq">의뢰 취소</button><button class="btn" type="button" id="saveNow">지금 저장</button><button class="btn pri" type="submit" id="submitBtn">${r.status === 'revision' ? '재제출' : '제출하기'}</button></div></div>
    </form>`;

  // ---- 저장 상태 (자동저장: 입력 1.5초 후, 화면 이탈 시 즉시)
  let dirty = false, saving = null, queued = false, lastSaved = null, uploading = 0, inputVer = 0, timer = null;
  const setStatus = () => {
    const el = $('#savest', main); if (!el) return;
    el.textContent = uploading ? '파일 올리는 중…' : saving ? '저장 중…' : dirty ? '저장되지 않은 변경 있음' : lastSaved ? `임시저장됨 ${lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : '변경 없음';
    $('#submitBtn', main).disabled = uploading > 0;
  };
  const collect = () => ({
    kind, client_id: kind === 'client' && v('client_id', main) ? Number(v('client_id', main)) : null, title: v('title', main), item_type_id: itemId || null, item_type_other: v('item_type_other', main) || null,
    product_name: v('product_name', main) || null, purpose: v('purpose', main) || null, size_spec: v('size_spec', main) || null, product_features: v('product_features', main) || null,
    required_copy: v('required_copy', main) || null, notes: v('notes', main) || null, requested_due: v('requested_due', main) || null,
  });
  const doSave = () => {
    if (saving) { queued = true; return saving; }
    const ver = inputVer, data = collect();
    saving = ctx.api.save(id, data).then(() => { lastSaved = new Date(); if (inputVer === ver) dirty = false; })
      .catch((e) => { dirty = true; toast('임시저장 실패: ' + errText(e), true); throw e; })
      .finally(() => { saving = null; setStatus(); if (queued) { queued = false; doSave().catch(() => {}); } });
    setStatus();
    return saving;
  };
  const flush = async () => { clearTimeout(timer); if (dirty || queued) await doSave(); else if (saving) await saving; };
  const touched = () => { dirty = true; inputVer++; setStatus(); clearTimeout(timer); timer = setTimeout(() => doSave().catch(() => {}), 1500); };
  ctx.flush = () => { if (dirty) doSave().catch(() => {}); };
  ctx.unloadGuard = () => dirty || !!saving || uploading > 0;

  // ---- 파일 목록 (부분 갱신: 폼 입력을 건드리지 않음)
  const renderFiles = () => {
    $('#files', main).innerHTML = files.length ? files.map(fileLi(true)).join('') : '<li class="muted small">아직 첨부한 파일이 없습니다.</li>';
    bindFiles(ctx, $('#files', main), async () => { files = await ctx.api.files(id); renderFiles(); });
  };
  renderFiles();

  const sizesBox = $('#sizes', main);
  const renderSizes = () => { const t = ctx.itemTypes.find((x) => x.id == itemId); sizesBox.innerHTML = (t?.default_sizes || []).map((s) => `<button type="button">${esc(s)}</button>`).join(''); on('button', 'click', (e) => { $('#size_spec', main).value = e.currentTarget.textContent; touched(); check(); }, sizesBox); };
  const REQ = [['고객사', () => kind === 'internal' || !!v('client_id', main), 'client_id'], ['품목', () => !!itemId && (itemId != otherId || !!v('item_type_other', main)), itemId == otherId ? 'item_type_other' : 'picker'], ['제목', () => !!v('title', main), 'title'], ['사용 용도', () => !!v('purpose', main), 'purpose']];
  const check = () => {
    const rows = REQ.filter(([k]) => k !== '고객사' || kind === 'client').map(([k, f, el]) => [k, f(), el]);
    $('#check', main).innerHTML = rows.map(([k, o]) => `<li class="${o ? 'ok' : ''}">${k}</li>`).join('');
    return rows.find(([, o]) => !o)?.[2] || null; // 첫 누락 항목의 요소 id
  };
  on('#kind button', 'click', (e) => { kind = e.currentTarget.dataset.k; $$('#kind button', main).forEach((b) => b.classList.toggle('on', b.dataset.k === kind)); $('#clientBox', main).style.display = kind === 'internal' ? 'none' : ''; touched(); check(); }, main);
  on('#picker button', 'click', (e) => { itemId = Number(e.currentTarget.dataset.id); $$('#picker button', main).forEach((b) => b.classList.toggle('on', Number(b.dataset.id) === itemId)); $('#otherBox', main).style.display = itemId === otherId ? '' : 'none'; renderSizes(); touched(); check(); }, main);
  on('#f input:not([type=file]),#f textarea,#f select', 'input', () => { touched(); check(); }, main);
  $('#newClient', main).onclick = () => { $('#ncBox', main).style.display = ''; $('#nc_name', main).focus(); };
  $('#nc_cancel', main).onclick = () => { $('#ncBox', main).style.display = 'none'; };
  $('#nc_save', main).onclick = async () => {
    if (!v('nc_name', main)) return toast('기업명을 입력하세요.', true);
    try {
      const c = await ctx.api.clientInsert({ name: v('nc_name', main), ceo_name: v('nc_ceo', main) || null, contact_name: v('nc_contact', main) || null, contact_position: v('nc_pos', main) || null, contact_email: v('nc_email', main) || null, created_by: ctx.me.id });
      ctx.clients.push(c); ctx.clients.sort((a, b) => a.name.localeCompare(b.name));
      const sel = $('#client_id', main); sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${esc(c.name)}</option>`); sel.value = c.id;
      $('#ncBox', main).style.display = 'none'; toast('고객사를 등록했습니다.'); touched(); check();
    } catch (e) { toast(errText(e), true); }
  };
  $('#saveNow', main).onclick = async () => { try { await flush(); if (!dirty) toast('임시저장했습니다.'); } catch {} };
  $('#preview', main).onclick = async () => { try { await flush(); if (!dirty) go('#/r/' + id); } catch {} };
  $('#f', main).onsubmit = async (ev) => {
    ev.preventDefault();
    if (uploading) return toast('파일 업로드가 끝난 뒤 제출하세요.', true);
    const missing = check();
    if (missing) { toast('필수 항목을 채워주세요. 하단에 남은 항목이 표시됩니다.', true); const el = $('#' + missing, main); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (el?.focus) el.focus(); return; }
    if (files.some((f) => f.upload_state === 'pending')) return toast('업로드가 끝나지 않은 파일이 있습니다. 삭제하거나 다시 올린 뒤 제출하세요.', true);
    const btns = $$('.stick button', main); btns.forEach((b) => (b.disabled = true));
    try {
      await flush();
      if (dirty) throw new Error('save failed');
      await ctx.api.transition(id, r.status === 'revision' ? 'resubmit' : 'submit');
      ctx.flush = null; ctx.unloadGuard = null;
      toast(r.status === 'revision' ? '재제출했습니다.' : '제출했습니다. 대표에게 알림이 갑니다.'); go('#/r/' + id);
    } catch (e) { if (e?.message !== 'save failed') toast(errText(e), true); }
    finally { btns.forEach((b) => (b.disabled = false)); setStatus(); }
  };
  $('#cancelReq', main).onclick = () => confirmDialog('의뢰 취소', r.status === 'draft' ? '작성중인 의뢰를 취소할까요? 목록에서 취소로 표시됩니다.' : '이 의뢰를 취소할까요? 취소하면 되돌릴 수 없습니다.', async () => { await ctx.api.transition(id, 'cancel'); ctx.flush = null; ctx.unloadGuard = null; dirty = false; toast('취소했습니다.'); go('#/'); });
  $('#up', main).onchange = async (e) => {
    const fs = [...e.target.files]; e.target.value = '';
    uploading += fs.length; setStatus();
    for (const f of fs) { await uploadOne(ctx, id, 'reference', f); uploading--; setStatus(); }
    files = await ctx.api.files(id); renderFiles();
  };
  renderSizes(); check(); setStatus();
}

function fileLi(canDelete) {
  return (f) => {
    const pending = f.upload_state === 'pending';
    return `<li data-id="${f.id}" data-path="${esc(f.storage_path)}"><span class="n">${esc(f.file_name)}</span><span class="s">${fmtSize(f.size_bytes)}${pending ? ' · <b class="due over">업로드 미완료</b>' : ''}</span>
    ${pending ? '' : '<button class="btn sm dl" type="button">내려받기</button>'}${canDelete || pending ? '<button class="btn sm dan ghost del" type="button">삭제</button>' : ''}</li>`;
  };
}
// 내려받기: 팝업 차단을 피하려고 클릭 시 탭을 먼저 열고 서명 URL 발급 후 이동
function bindFiles(ctx, root, onDeleted) {
  on('.files .dl', 'click', async (e) => {
    const li = e.currentTarget.closest('li'); const w = window.open('', '_blank');
    try { const url = await ctx.api.downloadUrl({ storage_path: li.dataset.path, file_name: $('.n', li).textContent }); if (w) w.location = url; else location.href = url; }
    catch (err) { w?.close(); toast('내려받기 실패: ' + errText(err), true); }
  }, root);
  on('.files .del', 'click', (e) => { const li = e.currentTarget.closest('li'); confirmDialog('파일 삭제', `${$('.n', li).textContent} 파일을 삭제할까요?`, async () => { await ctx.api.deleteFile({ id: li.dataset.id, storage_path: li.dataset.path }); toast('삭제했습니다.'); if (onDeleted) await onDeleted(); else li.remove(); }); }, root);
}
async function uploadOne(ctx, requestId, kind, file) {
  try { toast(`${file.name} 올리는 중…`); await ctx.api.upload(requestId, kind, file); toast(`${file.name} 업로드 완료`); return true; }
  catch (e) { toast(`${file.name}: ${errText(e)}`, true); return false; }
}

// ---------------------------------------------------------------- 상세
export async function detail(main, ctx, id) {
  const { me } = ctx;
  const [r, files, comments, events] = await Promise.all([ctx.api.request(id), ctx.api.files(id), ctx.api.comments(id), ctx.api.events(id)]);
  const cl = ctx.clients.find((c) => c.id === r.client_id);
  const mine = r.requester_id === me.id;
  const lastNote = (a) => [...events].reverse().find((e) => e.action === a)?.note;
  const refs = files.filter((f) => f.kind === 'reference'), dels = files.filter((f) => f.kind === 'deliverable');
  const A = (a, label, cls = 'btn') => `<button class="${cls}" data-a="${a}">${label}</button>`;

  // 다음 단계 카드
  let nx = { cls: '', icon: '→', h: '', p: '', acts: '' };
  switch (r.status) {
    case 'draft': nx = mine ? { icon: '1', h: '아직 제출 전입니다', p: '필수 항목을 채우고 제출하면 대표에게 전달됩니다.', acts: `<a class="btn pri" href="#/edit/${id}">이어서 작성</a>${A('cancel', '취소', 'btn ghost')}` } : { cls: 'gray', icon: '1', h: '작성중인 의뢰', p: '신청자가 아직 제출하지 않았습니다.' }; break;
    case 'submitted': nx = me.role === 'approver' ? { icon: '2', h: '검토가 필요합니다', p: '내용을 확인하고 승인하세요. 승인할 때 우선순위와 확정 납기를 정합니다. 보완이 필요하면 수정 요청, 진행하지 않으면 반려합니다.', acts: A('approve', '승인', 'btn pri') + A('request_revision', '수정 요청') + A('reject', '반려', 'btn dan ghost') } : { icon: '2', h: '대표 승인을 기다리는 중', p: mine ? '승인되면 이메일로 알려드립니다. 내용을 고치려면 취소 후 다시 작성해야 합니다.' : '대표가 검토 중입니다.', acts: mine ? A('cancel', '의뢰 취소', 'btn ghost') : '' }; break;
    case 'revision': nx = mine ? { cls: 'warn', icon: '!', h: '대표가 수정을 요청했습니다', p: lastNote('request_revision') || '내용을 보완한 뒤 재제출하세요.', acts: `<a class="btn pri" href="#/edit/${id}">수정하고 재제출</a>${A('cancel', '취소', 'btn ghost')}` } : { cls: 'warn', icon: '!', h: '신청자가 수정 중', p: lastNote('request_revision') || '' }; break;
    case 'approved': nx = me.role === 'designer' ? { icon: '3', h: '작업을 시작하세요', p: `확정 납기 ${fmtD(r.confirmed_due)}. 시작을 누르면 신청자에게 알림이 갑니다.`, acts: A('start', '작업 시작', 'btn pri') } : { icon: '3', h: '승인 완료, 디자이너 작업 대기', p: `확정 납기 ${fmtD(r.confirmed_due)}. 디자이너가 작업을 시작하면 알려드립니다.`, acts: me.role === 'approver' ? A('update_terms', '우선순위·납기 조정') : '' }; break;
    case 'in_progress': nx = me.role === 'designer' ? { icon: '3', h: '작업중', p: '결과물 파일을 올리거나 URL을 남긴 뒤 완료 처리하세요. 질문은 코멘트로 남기면 신청자에게 메일이 갑니다.', acts: `<label class="btn">+ 결과물 업로드<input type="file" id="upDel" multiple hidden></label>${A('complete', '완료 처리', 'btn pri')}` } : { icon: '3', h: '디자이너가 작업 중입니다', p: `확정 납기 ${fmtD(r.confirmed_due)}. 전달할 내용은 코멘트로 남겨주세요.`, acts: me.role === 'approver' ? A('update_terms', '우선순위·납기 조정') : '' }; break;
    case 'done': nx = { icon: '✓', h: '완료되었습니다', p: dels.length || r.deliverable_url ? '아래 결과물을 내려받으세요.' : '결과물은 코멘트를 확인하세요.' }; break;
    case 'rejected': nx = { cls: 'gray', icon: '×', h: '반려된 의뢰', p: lastNote('reject') || '' }; break;
    case 'cancelled': nx = { cls: 'gray', icon: '×', h: '취소된 의뢰', p: '신청자가 취소했습니다.' }; break;
  }
  const sec = (t, val) => (val ? `<div class="sec"><h4>${t}</h4><div class="txt">${esc(val)}</div></div>` : '');

  main.innerHTML = `
    <div class="head"><div><div class="eyebrow">${esc(r.no || '작성중')} · ${esc(itemLabel(ctx, r))}${prioTag(r.priority)}</div><h1>${esc(r.title || '(제목 없음)')}</h1>
      <p class="lead">${esc(clientName(ctx, r))} · 신청 ${esc(pname(ctx, r.requester_id))}${r.designer_id ? ` · 디자인 ${esc(pname(ctx, r.designer_id))}` : ''}</p></div>
      <div class="actions"><button class="btn ghost" id="back" type="button">← 뒤로</button></div></div>
    ${stepper(r.status)}
    <div class="next ${nx.cls}"><div class="ic">${nx.icon}</div><div><h3>${nx.h}</h3><p>${esc(nx.p)}</p></div>${nx.acts ? `<div class="actions" id="acts">${nx.acts}</div>` : ''}</div>
    <div class="grid main"><div>
      <div class="card"><div class="hd"><h3>의뢰 내용</h3>${mine && ['draft', 'revision'].includes(r.status) ? `<a class="btn sm" href="#/edit/${id}">수정</a>` : ''}</div><div class="bd">
        <div class="meta">
          <div><b>구분</b>${r.kind === 'internal' ? '내부 의뢰' : '고객사 의뢰'}</div><div><b>상품명</b>${esc(r.product_name || '-')}</div><div><b>제작 사이즈</b>${esc(r.size_spec || '-')}</div>
          <div><b>희망 납기</b>${fmtD(r.requested_due)}</div><div><b>확정 납기</b>${dueText({ confirmed_due: r.confirmed_due })}</div><div><b>우선순위</b>${PRIO[r.priority]}</div>
          ${r.item_type_other ? `<div><b>기타 품목</b>${esc(r.item_type_other)}</div>` : ''}
        </div>
        ${sec('사용 용도', r.purpose)}${sec('상품 특장점', r.product_features)}${sec('필수 기입 멘트', r.required_copy)}${sec('참고사항', r.notes)}
        ${cl ? `<div class="sec"><h4>고객사</h4><div class="kv"><b>기업명</b><span>${esc(cl.name)}</span>${cl.ceo_name ? `<b>대표자</b><span>${esc(cl.ceo_name)}</span>` : ''}${cl.contact_name ? `<b>담당자</b><span>${esc(cl.contact_name)}${cl.contact_position ? ' ' + esc(cl.contact_position) : ''}${cl.contact_email ? ` · ${esc(cl.contact_email)}` : ''}</span>` : ''}${cl.memo ? `<b>메모</b><span>${esc(cl.memo)}</span>` : ''}</div></div>` : ''}
      </div></div>
      <div class="card"><div class="hd"><h3>코멘트 <span class="muted small">${comments.length}</span></h3></div><div class="bd">
        ${comments.map((c) => `<div class="cm"><div class="a"><b>${esc(pname(ctx, c.author_id))}</b> · ${fmtDT(c.created_at)}</div><div class="b">${esc(c.body)}</div></div>`).join('') || '<p class="muted small">아직 코멘트가 없습니다. 질문, 추가 자료 링크, 피드백을 남기면 관련자에게 이메일로 전달됩니다.</p>'}
        <form id="cf" class="mt"><div class="field"><textarea id="cbody" placeholder="코멘트를 남기세요" required></textarea></div><div class="right"><button class="btn pri" type="submit">코멘트 남기기</button></div></form>
      </div></div>
    </div><div>
      ${dels.length || r.deliverable_url || r.status === 'in_progress' ? `<div class="card"><div class="hd"><h3>결과물</h3></div><div class="bd">
        ${r.deliverable_url ? (safeUrl(r.deliverable_url) ? `<p class="mb"><a href="${esc(safeUrl(r.deliverable_url))}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;word-break:break-all">${esc(r.deliverable_url)}</a></p>` : `<p class="muted small">결과물 URL 형식이 올바르지 않습니다: ${esc(r.deliverable_url)}</p>`) : ''}
        <ul class="files" id="dels"></ul></div></div>` : ''}
      <div class="card"><div class="hd"><h3>참고자료 <span class="muted small" id="refcnt">${refs.length}</span></h3></div><div class="bd"><ul class="files" id="refs"></ul></div></div>
      <div class="card"><div class="hd"><h3>진행 기록</h3></div><div class="bd"><ul class="tl">${[...events].reverse().map((e) => `<li><span class="d">${fmtDT(e.created_at)}</span><div><b>${esc(ACTION_KO[e.action] || e.action)}</b> <span class="muted small">${esc(pname(ctx, e.actor_id))}</span>${termsText(e)}${e.note && e.action !== 'comment' ? `<div class="m">${esc(e.note)}</div>` : ''}</div></li>`).join('')}</ul></div></div>
    </div></div>`;

  // 파일 목록은 부분 갱신 (코멘트 입력 중인 내용을 지키기 위해 화면 전체를 다시 그리지 않음)
  let allFiles = files;
  const renderFiles = () => {
    const d = allFiles.filter((f) => f.kind === 'deliverable'), rf = allFiles.filter((f) => f.kind === 'reference');
    const dl = $('#dels', main); if (dl) { dl.innerHTML = d.length ? d.map(fileLi(me.role === 'designer' && r.status === 'in_progress')).join('') : '<li class="muted small">아직 올린 파일이 없습니다.</li>'; bindFiles(ctx, dl, refresh); }
    const rl = $('#refs', main); rl.innerHTML = rf.length ? rf.map(fileLi(mine && ['draft', 'revision'].includes(r.status))).join('') : '<li class="muted small">첨부 없음</li>'; bindFiles(ctx, rl, refresh);
    $('#refcnt', main).textContent = rf.length;
  };
  const refresh = async () => { allFiles = await ctx.api.files(id); renderFiles(); };
  renderFiles();
  $('#back', main).onclick = () => back('#/');
  const up = $('#upDel', main); if (up) up.onchange = async (e) => { const fs = [...e.target.files]; e.target.value = ''; for (const f of fs) await uploadOne(ctx, id, 'deliverable', f); await refresh(); };
  $('#cf', main).onsubmit = async (ev) => { ev.preventDefault(); const b = $('#cf button', main); b.disabled = true; try { await ctx.api.comment(id, v('cbody', main)); toast('코멘트를 남겼습니다.'); ctx.render(); } catch (e) { toast(errText(e), true); b.disabled = false; } };
  on('#acts button', 'click', (e) => actionDialog(ctx, r, e.currentTarget.dataset.a), main);
}
function termsText(e) {
  const p = e.payload; if (!p || (!p.priority && !p.confirmed_due)) return '';
  const a = [];
  if (p.priority && p.priority.from !== p.priority.to) a.push(`우선순위 ${p.priority.from ? PRIO[p.priority.from] + ' → ' : ''}${PRIO[p.priority.to] || '없음'}`);
  if (p.confirmed_due && p.confirmed_due.from !== p.confirmed_due.to) a.push(`납기 ${p.confirmed_due.from ? fmtD(p.confirmed_due.from) + ' → ' : ''}${p.confirmed_due.to ? fmtD(p.confirmed_due.to) : '없음'}`);
  return a.length ? `<div class="m">${esc(a.join(', '))}</div>` : '';
}
const dv = (d, id) => $('#' + id, d)?.value?.trim() ?? '';
function actionDialog(ctx, r, a) {
  const prioSel = (cur) => field('우선순위', `<select id="d_prio">${Object.entries(PRIO).map(([k, x]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${x}</option>`).join('')}</select>`);
  const dueIn = (cur, req) => field('확정 납기', `<input type="date" id="d_due" value="${cur || r.requested_due || ''}" ${req ? 'required' : ''}>`, { req, hint: r.requested_due ? `신청자 희망 납기 ${fmtD(r.requested_due)}` : '신청자가 희망 납기를 적지 않았습니다.' });
  const noteIn = (req, ph) => field(req ? '사유' : '메모', `<textarea id="d_note" placeholder="${ph || ''}" ${req ? 'required' : ''}></textarea>`, { req });
  const run = (payload) => ctx.api.transition(r.id, a, payload).then(() => { toast('처리했습니다.'); ctx.render(); });
  switch (a) {
    case 'cancel': return confirmDialog('의뢰 취소', '이 의뢰를 취소할까요? 취소하면 되돌릴 수 없습니다.', () => run({}));
    case 'approve': return dialog({ title: '승인', body: '<p class="muted small" style="margin-bottom:14px">승인하면 디자이너와 신청자에게 이메일이 갑니다.</p>' + prioSel(r.priority) + dueIn(r.confirmed_due, true) + noteIn(false, '디자이너·신청자에게 전달할 메모'), ok: '승인', onOk: (d) => run({ priority: dv(d, 'd_prio'), confirmed_due: dv(d, 'd_due'), note: dv(d, 'd_note') }) });
    case 'request_revision': return dialog({ title: '수정 요청', body: '<p class="muted small" style="margin-bottom:14px">신청자가 내용을 고쳐 재제출하면 다시 승인 대기로 돌아옵니다.</p>' + noteIn(true, '무엇을 어떻게 고쳐야 하는지'), ok: '수정 요청', onOk: (d) => run({ note: dv(d, 'd_note') }) });
    case 'reject': return dialog({ title: '반려', body: '<p class="muted small" style="margin-bottom:14px">반려하면 의뢰가 종료됩니다. 다시 진행하려면 새로 작성해야 합니다.</p>' + noteIn(true, '반려 사유'), ok: '반려', danger: true, onOk: (d) => run({ note: dv(d, 'd_note') }) });
    case 'update_terms': return dialog({ title: '우선순위·납기 조정', body: prioSel(r.priority) + dueIn(r.confirmed_due, false) + noteIn(false), ok: '조정', onOk: (d) => run({ priority: dv(d, 'd_prio'), confirmed_due: dv(d, 'd_due') || null, note: dv(d, 'd_note') }) });
    case 'start': return dialog({ title: '작업 시작', body: '<p style="margin-bottom:14px">이 의뢰를 작업중으로 바꿉니다. 신청자에게 알림이 갑니다.</p>' + noteIn(false, '예: 시안은 목요일에 공유드릴게요'), ok: '시작', onOk: (d) => run({ note: dv(d, 'd_note') }) });
    case 'complete': return dialog({ title: '완료 처리', body: `<p class="muted small" style="margin-bottom:14px">결과물 파일을 올렸거나 아래 URL을 입력해야 완료할 수 있습니다.</p>${field('결과물 URL', `<input type="url" id="d_url" value="${esc(r.deliverable_url || '')}" placeholder="https:// (드라이브·피그마 링크 등)">`)}${noteIn(false, '신청자·대표에게 전달할 메모')}`, ok: '완료', onOk: (d) => run({ deliverable_url: dv(d, 'd_url'), note: dv(d, 'd_note') }) });
  }
}

// ---------------------------------------------------------------- 고객사
export async function clients(main, ctx, params, sel) {
  const s = (params.get('s') || '').toLowerCase();
  const list = ctx.clients.filter((c) => !s || [c.name, c.ceo_name, c.contact_name, c.contact_email, c.memo].some((x) => (x || '').toLowerCase().includes(s)));
  const cur = sel ? ctx.clients.find((c) => c.id == sel) : null;
  const hist = cur ? await ctx.api.requests({ client_id: cur.id }) : [];
  const form = (c = {}) => `<div class="row">${field('기업명', `<input type="text" id="c_name" value="${esc(c.name)}" required>`, { req: true })}${field('대표자', `<input type="text" id="c_ceo" value="${esc(c.ceo_name)}">`)}${field('담당자', `<input type="text" id="c_contact" value="${esc(c.contact_name)}">`)}${field('담당자 직급', `<input type="text" id="c_pos" value="${esc(c.contact_position)}">`)}${field('담당자 이메일', `<input type="email" id="c_email" value="${esc(c.contact_email)}">`)}</div>${field('메모', `<textarea id="c_memo" placeholder="브랜드 가이드, 선호 톤, 주의사항">${esc(c.memo)}</textarea>`, { hint: '사내 전원이 볼 수 있습니다.' })}`;
  const pick = (d) => ({ name: dv(d, 'c_name'), ceo_name: dv(d, 'c_ceo') || null, contact_name: dv(d, 'c_contact') || null, contact_position: dv(d, 'c_pos') || null, contact_email: dv(d, 'c_email') || null, memo: dv(d, 'c_memo') || null });

  main.innerHTML = `
    <div class="head"><div><div class="eyebrow">고객사</div><h1>고객사 ${ctx.clients.length}곳</h1><p class="lead">의뢰서에서 고를 고객사 목록입니다. 누구나 등록할 수 있고, 수정·삭제는 관리자가 합니다. 담당자 정보와 메모는 사내 전원이 봅니다.</p></div><button class="btn pri" id="add">+ 고객사 등록</button></div>
    ${cur ? `<div class="card" id="cdetail"><div class="hd"><div><h2>${esc(cur.name)}</h2><p class="muted small">${[cur.ceo_name && '대표 ' + cur.ceo_name, cur.contact_name && '담당 ' + cur.contact_name + (cur.contact_position ? ' ' + cur.contact_position : ''), cur.contact_email].filter(Boolean).map(esc).join(' · ') || '연락처 정보 없음'}</p></div>
        <div class="actions">${ctx.me.is_admin ? '<button class="btn sm" id="ed">수정</button><button class="btn sm dan ghost" id="rm">삭제</button>' : ''}<a class="btn sm ghost" href="#/clients">닫기</a></div></div>
      ${cur.memo ? `<div class="bd" style="padding-bottom:0"><div class="notice">${esc(cur.memo)}</div></div>` : ''}
      <div class="bd"><h4 style="margin-bottom:8px">의뢰 이력 ${hist.length}건</h4>${rlist(ctx, hist, '이 고객사의 의뢰가 아직 없습니다.')}</div></div><div class="mt-l"></div>` : ''}
    <form class="filters" id="sf"><input type="search" id="s" placeholder="기업명·담당자·메모 검색" value="${esc(params.get('s') || '')}"><button class="btn" type="submit">검색</button></form>
    <div class="clist">${list.map((c) => `<div class="ccard" data-id="${c.id}"><h3>${esc(c.name)}</h3><div class="c">${[c.ceo_name && '대표 ' + c.ceo_name, c.contact_name && '담당 ' + c.contact_name].filter(Boolean).map(esc).join(' · ') || '<span class="muted">연락처 미입력</span>'}</div>${c.memo ? `<div class="m">${esc(c.memo.slice(0, 60))}</div>` : ''}</div>`).join('') || '<div class="empty"><b>고객사가 없습니다</b>첫 고객사를 등록해 보세요.</div>'}</div>`;
  bindRows(main);
  $('#sf', main).onsubmit = (e) => { e.preventDefault(); go('#/clients?s=' + encodeURIComponent(v('s', main))); };
  on('.ccard', 'click', (e) => go('#/clients/' + e.currentTarget.dataset.id), main);
  $('#add', main).onclick = () => dialog({ title: '고객사 등록', body: form(), ok: '등록', onOk: async (d) => { await ctx.api.clientInsert({ ...pick(d), created_by: ctx.me.id }); toast('등록했습니다.'); await ctx.reload(); } });
  if (cur && ctx.me.is_admin) {
    $('#ed', main).onclick = () => dialog({ title: '고객사 수정', body: form(cur), ok: '저장', onOk: async (d) => { await ctx.api.clientUpdate(cur.id, pick(d)); toast('저장했습니다.'); await ctx.reload(); } });
    $('#rm', main).onclick = () => confirmDialog('고객사 삭제', `${cur.name} 을(를) 삭제할까요? 의뢰가 연결된 고객사는 삭제되지 않습니다.`, async () => { await ctx.api.clientDelete(cur.id); toast('삭제했습니다.'); go('#/clients'); await ctx.reload(); });
  }
  if (cur) $('#cdetail', main).scrollIntoView({ block: 'start' });
}

// ---------------------------------------------------------------- 설정 (관리자)
export async function settings(main, ctx) {
  if (!ctx.me.is_admin) { go('#/'); return; }
  main.innerHTML = `
    <div class="head"><div><div class="eyebrow">관리자</div><h1>설정</h1><p class="lead">사용자 역할과 품목 카탈로그를 관리합니다.</p></div></div>
    <div class="card"><div class="hd"><h3>사용자 <span class="muted small">${ctx.profiles.length}</span></h3></div>
      <div class="bd" style="padding-bottom:0"><div class="notice info">새 사용자 초대는 Supabase 대시보드 → Authentication → Users → <b>Invite user</b>. 초대 메일의 링크로 들어오면 비밀번호를 정하고 바로 쓸 수 있습니다. 새 사용자는 <b>직원</b> 역할로 시작하니 아래에서 역할을 바꿔주세요. 퇴사자는 삭제하지 말고 "활성"을 끄세요.</div>
      <div class="kv mt" style="grid-template-columns:80px 1fr">${Object.entries(ROLE).map(([k, x]) => `<b>${x}</b><span class="small">${ROLE_DESC[k]}</span>`).join('')}</div></div>
      <table class="mt"><thead><tr><th>이름</th><th>이메일</th><th>직급</th><th>역할</th><th>관리자</th><th>활성</th><th></th></tr></thead><tbody>
      ${ctx.profiles.map((p) => `<tr data-id="${p.id}"><td><b>${esc(p.name || '-')}</b></td><td class="mono small">${esc(p.email)}</td><td>${esc(p.position || '-')}</td>
        <td><select class="u_role" style="width:auto">${Object.entries(ROLE).map(([k, x]) => `<option value="${k}" ${p.role === k ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
        <td><input type="checkbox" class="u_admin" ${p.is_admin ? 'checked' : ''}></td><td><input type="checkbox" class="u_active" ${p.is_active ? 'checked' : ''}></td>
        <td class="right"><button class="btn sm u_save">저장</button></td></tr>`).join('')}</tbody></table></div>
    <div class="card"><div class="hd"><h3>품목 카탈로그</h3><button class="btn sm" id="addItem">+ 품목 추가</button></div>
      <table><thead><tr><th>코드</th><th>표시명</th><th>정렬</th><th>추천 사이즈 (쉼표 구분)</th><th>사용</th><th></th></tr></thead><tbody>
      ${ctx.itemTypes.map((t) => `<tr data-id="${t.id}"><td class="mono small">${esc(t.code)}</td><td><input type="text" class="i_label" value="${esc(t.label)}"></td><td><input type="number" class="i_sort" value="${t.sort}" style="width:80px"></td>
        <td><input type="text" class="i_sizes" value="${esc((t.default_sizes || []).join(', '))}"></td><td><input type="checkbox" class="i_active" ${t.is_active ? 'checked' : ''}></td>
        <td class="right"><button class="btn sm i_save">저장</button></td></tr>`).join('')}</tbody></table>
      <div class="bd hint">품목은 삭제하지 않고 "사용"을 꺼서 숨깁니다. 기존 의뢰가 참조하기 때문입니다.</div></div>`;
  on('.u_save', 'click', async (e) => { const tr = e.currentTarget.closest('tr'); try { await ctx.api.setUser(tr.dataset.id, $('.u_role', tr).value, $('.u_admin', tr).checked, $('.u_active', tr).checked); toast('저장했습니다.'); await ctx.reload(); } catch (err) { toast(errText(err), true); } }, main);
  on('.i_save', 'click', async (e) => { const tr = e.currentTarget.closest('tr'); try { await ctx.api.itemUpdate(tr.dataset.id, { label: $('.i_label', tr).value.trim(), sort: Number($('.i_sort', tr).value) || 100, default_sizes: $('.i_sizes', tr).value.split(',').map((s) => s.trim()).filter(Boolean), is_active: $('.i_active', tr).checked }); toast('저장했습니다.'); await ctx.reload(); } catch (err) { toast(errText(err), true); } }, main);
  $('#addItem', main).onclick = () => dialog({ title: '품목 추가', body: `<div class="row">${field('코드', '<input type="text" id="n_code" placeholder="영문 소문자, 예: catalog" required pattern="[a-z0-9_]+">', { req: true })}${field('표시명', '<input type="text" id="n_label" required>', { req: true })}</div>${field('추천 사이즈', '<input type="text" id="n_sizes" placeholder="쉼표로 구분">')}`, ok: '추가', onOk: async (d) => { await ctx.api.itemInsert({ code: dv(d, 'n_code').toLowerCase(), label: dv(d, 'n_label'), default_sizes: dv(d, 'n_sizes').split(',').map((s) => s.trim()).filter(Boolean), sort: 500 }); toast('추가했습니다.'); await ctx.reload(); } });
}

// ---------------------------------------------------------------- 내 정보
export function me(main, ctx) {
  const { me } = ctx;
  main.innerHTML = `<div class="head"><div><div class="eyebrow">내 정보</div><h1>${esc(me.name || me.email)}</h1><p class="lead">${esc(me.email)}</p></div></div>
    <div class="grid main"><div class="card"><div class="hd"><h3>프로필</h3></div><form class="bd" id="f">
      ${field('이름', `<input type="text" id="m_name" value="${esc(me.name)}" required>`, { req: true, hint: '의뢰서와 알림 메일에 표시됩니다.' })}${field('직급·부서', `<input type="text" id="m_pos" value="${esc(me.position)}" placeholder="예: 마케팅팀 대리">`)}
      <div class="inline"><button class="btn pri" type="submit">저장</button><button class="btn" type="button" id="pwreset">비밀번호 재설정 메일 받기</button></div></form></div>
    <div><div class="card"><div class="hd"><h3>내 역할: ${ROLE[me.role]}${me.is_admin ? ' · 관리자' : ''}</h3></div><div class="bd"><p>${ROLE_DESC[me.role]}</p>${me.is_admin ? '<p class="mt small muted">관리자는 설정에서 사용자 역할·활성화와 품목 카탈로그를 관리할 수 있습니다.</p>' : '<p class="mt small muted">역할 변경은 관리자(대표·디자이너)에게 요청하세요.</p>'}<div class="mt"><a class="btn" href="#/help">사용 안내 보기</a></div></div></div></div></div>`;
  $('#f', main).onsubmit = async (e) => { e.preventDefault(); try { await ctx.api.updateMe(me.id, { name: v('m_name', main), position: v('m_pos', main) || null }); toast('저장했습니다.'); await ctx.reload(); } catch (err) { toast(errText(err), true); } };
  $('#pwreset', main).onclick = async () => { try { await ctx.api.auth.reset(me.email); toast('재설정 메일을 보냈습니다. 메일함을 확인하세요.'); } catch (err) { toast(errText(err), true); } };
}

// ---------------------------------------------------------------- 도움말
export function help(main) {
  main.innerHTML = `<div class="head"><div><div class="eyebrow">안내</div><h1>Design Desk 사용법</h1><p class="lead">디자인 의뢰가 접수부터 결과물 전달까지 어떻게 흘러가는지, 각 역할이 무엇을 하는지 정리했습니다.</p></div></div>
    <div class="card help"><div class="bd">
      <h2 style="margin-top:0">진행 흐름</h2>${flowGuide()}
      <h2>상태의 뜻</h2><div class="kv" style="grid-template-columns:120px 1fr">
        <b>${chip('draft')}</b><span>작성 중이며 아직 제출하지 않았습니다. 신청자 본인만 봅니다.</span>
        <b>${chip('submitted')}</b><span>제출되어 대표 검토를 기다립니다. 이 상태에선 내용을 고칠 수 없습니다(취소는 가능).</span>
        <b>${chip('revision')}</b><span>대표가 보완을 요청했습니다. 신청자가 고쳐서 재제출합니다.</span>
        <b>${chip('approved')}</b><span>승인되어 디자이너 작업 시작을 기다립니다. 우선순위·확정 납기가 정해졌습니다.</span>
        <b>${chip('in_progress')}</b><span>디자이너가 작업 중입니다. 질문·피드백은 코멘트로 주고받습니다.</span>
        <b>${chip('done')}</b><span>결과물이 올라왔습니다. 상세 화면에서 내려받습니다.</span>
        <b>${chip('rejected')}</b><span>대표가 진행하지 않기로 했습니다. 필요하면 새로 작성합니다.</span>
        <b>${chip('cancelled')}</b><span>신청자가 취소했습니다.</span></div>
      <h2>역할</h2><div class="kv" style="grid-template-columns:90px 1fr">${Object.entries(ROLE).map(([k, x]) => `<b>${x}</b><span>${ROLE_DESC[k]}</span>`).join('')}</div>
      <h2>알림</h2><ul><li>제출·재제출 → 대표에게 메일</li><li>승인 → 디자이너와 신청자에게</li><li>수정 요청·반려·작업 시작 → 신청자에게</li><li>완료 → 신청자(대표 참조)</li><li>코멘트 → 작성자를 제외한 관련자에게</li></ul>
      <h2>자주 묻는 것</h2><ul>
        <li><b>제출했는데 내용을 고치고 싶어요.</b> 승인 대기 중엔 잠깁니다. 코멘트로 알리거나, 취소 후 다시 작성하세요. 대표가 수정 요청을 보내면 고칠 수 있습니다.</li>
        <li><b>참고자료를 나중에 추가하고 싶어요.</b> 제출 후에는 코멘트에 링크를 남기세요. 디자이너에게 메일로 전달됩니다.</li>
        <li><b>파일이 안 올라가요.</b> 참고자료는 50MB, 결과물은 300MB까지입니다. 실행 파일(.exe 등)은 막혀 있습니다.</li>
        <li><b>연번(DR-2026-0001)은 언제 생기나요.</b> 처음 제출할 때 발급됩니다. 작성중엔 없습니다.</li></ul>
    </div></div>`;
}
