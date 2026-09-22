// 화면 v3 (전자결재 스타일). ctx = { api, me, profiles, itemTypes, clients, reqs, reload, render }
import { STATUS, PRIO, PRIO_RANK, ROLE, ROLE_DESC, ACTION_KO, FORMATS, POLICY, esc, fmtD, fmtDT, fmtSize, chip, statusText, prioTag, dueText, go, back, safeUrl, toast, errText, $, $$, on, v, dialog, confirmDialog, field } from './ui.js?v=4';

const OPEN = ['draft', 'submitted', 'revision', 'approved', 'in_progress'];
const pname = (ctx, id) => ctx.profiles.find((p) => p.id === id)?.name || (id ? '(알 수 없음)' : '');
const ppos = (ctx, id) => ctx.profiles.find((p) => p.id === id)?.position || '';
const itemLabel = (ctx, r) => (ctx.itemTypes.find((t) => t.id === r.item_type_id)?.label || '미정') + (r.needs_photo ? '+촬영' : '');
const clientOf = (ctx, r) => ctx.clients.find((c) => c.id === r.client_id);
const clientName = (ctx, r) => (r.kind === 'internal' ? '내부' : clientOf(ctx, r)?.name || '미정');
const dateOf = (r) => fmtD(r.submitted_at || r.created_at);
const byDue = (a, b) => ((a.confirmed_due || a.requested_due || '9999') > (b.confirmed_due || b.requested_due || '9999') ? 1 : -1);
const byPrioDue = (a, b) => (PRIO_RANK[a.priority] - PRIO_RANK[b.priority]) || byDue(a, b);
const byRecent = (a, b) => (a.updated_at < b.updated_at ? 1 : -1);

// ---------------------------------------------------------------- 함(box) 정의: 좌측 트리와 목록 필터의 근거
export const BOXES = {
  requester: [
    { grp: '상신함', items: [['draft', '작성중', ['draft']], ['submitted', '승인 대기', ['submitted']], ['revision', '수정 요청', ['revision']], ['progress', '작업 진행', ['approved', 'in_progress']], ['done', '완료', ['done']], ['closed', '반려·취소', ['rejected', 'cancelled']]] },
  ],
  approver: [
    { grp: '결재함', items: [['pending', '미결함', ['submitted']], ['revision', '수정요청함', ['revision']], ['approved', '승인함', ['approved', 'in_progress']], ['rejected', '반려함', ['rejected']]] },
    { grp: '완료함', items: [['done', '완료', ['done']], ['closed', '취소', ['cancelled']]] },
  ],
  designer: [
    { grp: '작업함', items: [['wait', '작업 대기', ['approved']], ['working', '작업중', ['in_progress']], ['done', '완료함', ['done']]] },
    { grp: '참조함', items: [['pending', '승인 대기', ['submitted', 'revision']], ['closed', '반려·취소', ['rejected', 'cancelled']]] },
  ],
};
export const boxOf = (role, key) => BOXES[role].flatMap((g) => g.items).find((b) => b[0] === key) || ['all', '전체 의뢰', null];
export const boxCount = (ctx, statuses) => (statuses ? ctx.reqs.filter((r) => statuses.includes(r.status)).length : ctx.reqs.length);
const crumb = (...p) => `<div class="crumb">${p.map((x, i) => (i === p.length - 1 ? `<b>${esc(x)}</b>` : esc(x))).join(' › ')}</div>`;

// ---------------------------------------------------------------- 그리드
function grid(ctx, rows, empty = '조회된 의뢰가 없습니다.') {
  const isReq = ctx.me.role === 'requester';
  return `<div class="gridwrap"><table class="grid"><thead><tr><th>상태</th><th>의뢰번호</th><th>품목</th><th>제목</th><th>고객사</th>${isReq ? '' : '<th>신청자</th>'}<th>디자이너</th><th>요청일</th><th>희망납기</th><th>확정납기</th><th>우선순위</th><th>완료일</th></tr></thead><tbody>
    ${rows.length ? rows.map((r) => `<tr data-id="${r.id}"><td>${statusText(r.status)}</td><td class="mono">${esc(r.no || '-')}</td><td>${esc(itemLabel(ctx, r))}</td><td class="t"><a href="#/doc/${r.id}">${esc(r.title || '(제목 없음)')}</a></td><td>${esc(clientName(ctx, r))}</td>${isReq ? '' : `<td>${esc(pname(ctx, r.requester_id))}</td>`}<td>${esc(pname(ctx, r.designer_id) || '-')}</td><td class="mono">${dateOf(r)}</td><td class="mono">${fmtD(r.requested_due)}</td><td>${r.confirmed_due ? dueText({ confirmed_due: r.confirmed_due }) : '-'}</td><td>${PRIO[r.priority]}</td><td class="mono">${fmtD(r.completed_at)}</td></tr>`).join('')
      : `<tr><td class="empty" colspan="12">${empty}</td></tr>`}
  </tbody></table></div>`;
}
const bindGrid = (root) => on('table.grid tbody tr[data-id]', 'click', (e) => { if (e.target.closest('a')) return; go('#/doc/' + e.currentTarget.dataset.id); }, root);

function exportCsv(ctx, rows) {
  const head = ['상태', '의뢰번호', '품목', '제목', '고객사', '신청자', '디자이너', '요청일', '희망납기', '확정납기', '우선순위', '완료일'];
  const line = (a) => a.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',');
  const body = rows.map((r) => line([STATUS[r.status]?.[0], r.no, itemLabel(ctx, r), r.title, clientName(ctx, r), pname(ctx, r.requester_id), pname(ctx, r.designer_id), dateOf(r), fmtD(r.requested_due), fmtD(r.confirmed_due), PRIO[r.priority], fmtD(r.completed_at)]));
  const blob = new Blob(['﻿' + [line(head), ...body].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `design-desk_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------------------------------------------------------------- 홈
export async function home(main, ctx) {
  const { me } = ctx;
  const all = ctx.reqs;
  const today = new Date(new Date().toDateString());
  const overdue = all.filter((r) => ['approved', 'in_progress'].includes(r.status) && r.confirmed_due && new Date(r.confirmed_due) < today);
  const box = (key, label, statuses, cls = '') => `<a class="box ${cls}" href="#/box/${key}"><b>${boxCount(ctx, statuses)}</b><span>${label}</span></a>`;
  const boxes = BOXES[me.role].flatMap((g) => g.items).map(([k, l, s]) => box(k, l, s, (me.role === 'approver' && k === 'pending') || (me.role === 'requester' && k === 'revision') ? (boxCount(ctx, s) ? 'warn' : '') : (me.role === 'designer' && k === 'wait' ? 'blue' : ''))).join('');
  let todo = '';
  if (me.role === 'requester') { const rev = all.filter((r) => r.status === 'revision'); if (rev.length) todo = `<div class="next warn"><b>수정 요청 ${rev.length}건</b><span>대표가 보완을 요청한 의뢰가 있습니다. 내용을 고쳐 재제출하세요.</span><a class="btn sm" href="#/box/revision">보기</a></div>`; }
  if (me.role === 'approver') { const p = all.filter((r) => r.status === 'submitted'); todo = p.length ? `<div class="next warn"><b>미결 ${p.length}건</b><span>결재를 기다리는 의뢰가 있습니다. 승인 시 우선순위와 확정 납기를 정합니다.</span><a class="btn sm" href="#/box/pending">미결함</a></div>` : '<div class="next ok"><b>미결 없음</b><span>결재 대기 중인 의뢰가 없습니다.</span></div>'; }
  if (me.role === 'designer') { const w = all.filter((r) => r.status === 'approved'); if (w.length) todo = `<div class="next"><b>작업 대기 ${w.length}건</b><span>승인된 의뢰를 열어 작업 시작을 누르세요.</span><a class="btn sm" href="#/box/wait">작업 대기</a></div>`; }
  if (overdue.length) todo += `<div class="next warn"><b>납기 초과 ${overdue.length}건</b><span>확정 납기가 지난 진행 건이 있습니다.</span></div>`;
  const recent = [...all].sort(byRecent).slice(0, 12);
  main.innerHTML = `${crumb('홈')}
    <div class="pagehead"><div><h1>${esc(me.name || '')} ${ROLE[me.role]} · 함 현황</h1><p>${ROLE_DESC[me.role]}</p></div><a class="btn pri" href="#/new">＋ 새 의뢰 작성</a></div>
    ${todo}
    <div class="boxes">${boxes}${box('all', '전체 의뢰', null)}</div>
    <div class="sec"><div class="sec-title">최근 의뢰 <small>최근 수정 순 ${recent.length}건</small></div>${grid(ctx, recent, all.length ? '' : '아직 의뢰가 없습니다. "새 의뢰 작성"으로 시작하세요.')}</div>`;
  bindGrid(main);
}

// ---------------------------------------------------------------- 목록 (함 + 선택조건)
export async function list(main, ctx, params, boxKey) {
  const box = boxOf(ctx.me.role, boxKey);
  const f = { status: params.get('status') || '', from: params.get('from') || '', to: params.get('to') || '', client: params.get('client') || '', item: params.get('item') || '', s: params.get('s') || '', sort: params.get('sort') || 'recent' };
  let rows = ctx.reqs.filter((r) => !box[2] || box[2].includes(r.status));
  if (f.status) rows = rows.filter((r) => r.status === f.status);
  if (f.from) rows = rows.filter((r) => (r.submitted_at || r.created_at).slice(0, 10) >= f.from);
  if (f.to) rows = rows.filter((r) => (r.submitted_at || r.created_at).slice(0, 10) <= f.to);
  if (f.client) rows = rows.filter((r) => r.client_id == f.client);
  if (f.item) rows = rows.filter((r) => r.item_type_id == f.item);
  if (f.s) { const k = f.s.toLowerCase(); rows = rows.filter((r) => [r.title, r.no, r.product_name, pname(ctx, r.requester_id)].some((x) => (x || '').toLowerCase().includes(k))); }
  rows.sort(f.sort === 'due' ? byDue : f.sort === 'prio' ? byPrioDue : byRecent);
  const statuses = box[2] || Object.keys(STATUS);
  const opt = (arr, cur, lab) => arr.map((x) => `<option value="${x.id}" ${cur == x.id ? 'selected' : ''}>${esc(lab(x))}</option>`).join('');
  main.innerHTML = `${crumb('의뢰', box[1])}
    <div class="cond"><div class="ct">선택조건</div><form id="cf">
      <div class="cr"><span class="cl">진행상태</span><label class="rd"><input type="radio" name="status" value="" ${!f.status ? 'checked' : ''}>전체</label>${statuses.map((s) => `<label class="rd"><input type="radio" name="status" value="${s}" ${f.status === s ? 'checked' : ''}>${STATUS[s][0]}</label>`).join('')}</div>
      <div class="cr"><span class="cl">요청일</span><input type="date" id="from" value="${esc(f.from)}" style="width:150px"> ~ <input type="date" id="to" value="${esc(f.to)}" style="width:150px"><span class="cl">정렬</span><select id="sort" style="width:130px"><option value="recent" ${f.sort === 'recent' ? 'selected' : ''}>최근 수정순</option><option value="due" ${f.sort === 'due' ? 'selected' : ''}>납기순</option><option value="prio" ${f.sort === 'prio' ? 'selected' : ''}>우선순위순</option></select></div>
      <div class="cr"><span class="cl">고객사</span><select id="client" style="width:190px"><option value="">전체</option>${opt(ctx.clients, f.client, (c) => c.name)}</select><span class="cl">품목</span><select id="item" style="width:150px"><option value="">전체</option>${opt(ctx.itemTypes, f.item, (t) => t.label)}</select><span class="cl">검색어</span><input type="search" id="s" value="${esc(f.s)}" placeholder="의뢰번호·제목·상품명·신청자" style="width:220px">
        <span class="act inline"><button class="btn pri" type="submit">조회</button><a class="btn" href="#/box/${box[0]}">초기화</a></span></div>
    </form></div>
    <div class="gridbar"><span><b>${box[1]}</b> · ${rows.length}건${ctx.reqs.length >= 500 ? ' <span class="muted">(최근 500건 기준)</span>' : ''}</span><span class="inline"><button class="btn sm" id="csv">엑스포트(CSV)</button><a class="btn sm pri" href="#/new">＋ 새 의뢰</a></span></div>
    ${grid(ctx, rows)}`;
  bindGrid(main);
  $('#cf', main).onsubmit = (e) => { e.preventDefault(); const q = new URLSearchParams(); const st = $('input[name=status]:checked', main)?.value; if (st) q.set('status', st); for (const k of ['from', 'to', 'client', 'item', 's', 'sort']) { const val = v(k, main); if (val && !(k === 'sort' && val === 'recent')) q.set(k, val); } go(`#/box/${box[0]}?${q}`); };
  $('#csv', main).onclick = () => exportCsv(ctx, rows);
}

let creating = false;
export async function createDraft(ctx) {
  if (creating) return;
  creating = true;
  try { const id = await ctx.api.create('client'); if (location.hash.startsWith('#/new')) go('#/doc/' + id); }
  catch (e) { toast(errText(e), true); go('#/'); }
  finally { creating = false; }
}

// ---------------------------------------------------------------- 문서 (작성·조회·결재 한 화면)
const docTab = {};
export async function doc(main, ctx, id, params) {
  const { me } = ctx;
  const printMode = params?.get('print') === '1'; // 작성자가 인쇄할 때 읽기 전용 표현으로 출력
  const r = await ctx.api.request(id);
  let [files, comments, events] = await Promise.all([ctx.api.files(id), ctx.api.comments(id), ctx.api.events(id)]);
  events.sort((a, b) => (a.created_at > b.created_at ? 1 : a.created_at < b.created_at ? -1 : a.id - b.id));
  const mine = r.requester_id === me.id;
  const editable = mine && ['draft', 'revision'].includes(r.status) && !printMode;
  const cl = clientOf(ctx, r);
  const otherId = Number(ctx.itemTypes.find((t) => t.code === 'other')?.id);
  const items = ctx.itemTypes.filter((t) => t.is_active || t.id === r.item_type_id);
  const isOther = Number(r.item_type_id) === otherId;
  // 결재선용: 마지막 제출 이후의 결정 이벤트만 사용 (과거 수정 요청 사유가 승인 의견으로 섞이지 않게)
  const lastSubmitIdx = events.reduce((acc, e, i) => (['submit', 'resubmit'].includes(e.action) ? i : acc), -1);
  const after = events.slice(lastSubmitIdx + 1);
  const lastEv = (...acts) => [...after].reverse().find((e) => acts.includes(e.action));
  const lastNote = (a) => lastEv(a)?.note;
  const refs = files.filter((f) => f.kind === 'reference'), dels = files.filter((f) => f.kind === 'deliverable');
  const A = (a, label, cls = 'btn') => `<button class="${cls}" data-a="${a}" type="button">${label}</button>`;
  const ro = !editable;
  const inp = (idn, val, ph = '', type = 'text') => ro ? `<span>${esc(val) || '<span class="muted">-</span>'}</span>` : `<input type="${type}" id="${idn}" value="${esc(val ?? '')}" placeholder="${esc(ph)}" aria-labelledby="l_${idn}">`;
  const ta = (idn, val, ph = '') => ro ? `<div class="pre">${esc(val) || '<span class="muted">-</span>'}</div>` : `<textarea id="${idn}" placeholder="${esc(ph)}" aria-labelledby="l_${idn}">${esc(val ?? '')}</textarea>`;
  const L = (t, req = false, forId = '') => `<div class="l" ${forId ? `id="l_${forId}"` : ''}>${req ? '<span class="req">*</span>' : ''}${t}</div>`;

  // 툴바·다음 단계
  let tools = [], next = '';
  if (editable) { tools.push('<button class="btn" id="saveNow" type="button">임시저장</button>', `<button class="btn pri" id="submitBtn" type="button">${r.status === 'revision' ? '재제출' : '결재 요청(제출)'}</button>`, A('cancel', '의뢰 취소', 'btn dan')); next = r.status === 'revision' ? `<div class="next warn"><b>수정 요청</b><span>${esc(lastNote('request_revision') || '대표가 보완을 요청했습니다.')}</span></div>` : '<div class="next gray"><b>작성중</b><span>필수 항목(*)을 채우고 "결재 요청(제출)"을 누르면 대표에게 전달됩니다. 입력 내용은 자동으로 임시저장됩니다.</span></div>'; }
  else if (r.status === 'submitted') { if (me.role === 'approver') { tools.push(A('approve', '승인', 'btn ok'), A('request_revision', '수정 요청'), A('reject', '반려', 'btn dan')); next = '<div class="next warn"><b>결재 대기</b><span>내용을 확인하고 승인·수정 요청·반려 중 하나를 선택하세요. 승인 시 우선순위와 확정 납기를 정합니다.</span></div>'; } else { if (mine) tools.push(A('cancel', '의뢰 취소', 'btn dan')); next = '<div class="next"><b>승인 대기</b><span>대표 결재를 기다리는 중입니다. 승인되면 이메일로 알립니다.</span></div>'; } }
  else if (r.status === 'revision') next = `<div class="next warn"><b>수정 요청</b><span>${esc(lastNote('request_revision') || '')} (신청자가 수정 중)</span></div>`;
  else if (r.status === 'approved') { if (me.role === 'designer') tools.push(A('start', '작업 시작', 'btn pri')); if (me.role === 'approver') tools.push(A('update_terms', '우선순위·납기 조정')); next = `<div class="next"><b>승인 완료</b><span>확정 납기 ${fmtD(r.confirmed_due)} · 디자이너 작업 시작 대기</span></div>`; }
  else if (r.status === 'in_progress') { if (me.role === 'designer') tools.push('<button class="btn" type="button" data-up="upDel">결과물 업로드</button><input type="file" id="upDel" multiple hidden>', A('complete', '완료 처리', 'btn pri')); if (me.role === 'approver') tools.push(A('update_terms', '우선순위·납기 조정')); next = `<div class="next"><b>작업중</b><span>담당 ${esc(pname(ctx, r.designer_id))} · 확정 납기 ${fmtD(r.confirmed_due)}${me.role === 'designer' ? ' · 결과물을 올리고 완료 처리하세요' : ' · 전달 사항은 진행기록 탭의 코멘트로'}</span></div>`; }
  else if (r.status === 'done') next = `<div class="next ok"><b>완료</b><span>${fmtD(r.completed_at)} 완료 · 결과물은 첨부파일 탭에서 내려받습니다.</span></div>`;
  else if (r.status === 'rejected') next = `<div class="next gray"><b>반려</b><span>${esc(lastNote('reject') || '')}</span></div>`;
  else if (r.status === 'cancelled') next = '<div class="next gray"><b>취소</b><span>신청자가 취소한 의뢰입니다.</span></div>';
  tools.push('<span class="sp"></span>', '<button class="btn" id="print" type="button">인쇄</button>', '<button class="btn" id="back" type="button">목록</button>');

  const clientOpts = ctx.clients.map((c) => `<option value="${c.id}" ${r.client_id == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const itemOpts = items.map((t) => `<option value="${t.id}" ${r.item_type_id == t.id ? 'selected' : ''}>${esc(t.label)}</option>`).join('');
  // 결재선: 실제 이벤트(마지막 제출 이후)를 기준으로 처리자·상태·일시·의견을 한 줄씩
  const aline = () => {
    const rows = [];
    const sub = lastSubmitIdx >= 0 ? events[lastSubmitIdx] : null;
    const cancelEv = lastEv('cancel');
    rows.push(['001', '상신', pname(ctx, r.requester_id), ppos(ctx, r.requester_id), cancelEv && !sub ? '취소(미제출)' : sub ? (sub.action === 'resubmit' ? '재상신' : '상신') : '작성중', sub?.created_at, sub?.note || '']);
    const dec = lastEv('approve', 'request_revision', 'reject');
    const decSt = dec ? { approve: '승인', request_revision: '수정 요청', reject: '반려' }[dec.action] : (cancelEv ? '취소됨' : sub ? '결재 대기' : '-');
    rows.push(['002', '결재', dec ? pname(ctx, dec.actor_id) : '미지정', dec ? ppos(ctx, dec.actor_id) : '대표 결재 대기', decSt, dec?.created_at, dec?.note || '']);
    const work = lastEv('complete') || lastEv('start');
    const wSt = { approved: '작업 대기', in_progress: '작업중', done: '완료' }[r.status] || (cancelEv ? '취소됨' : '-');
    rows.push(['003', '작업', work ? pname(ctx, work.actor_id) : (r.designer_id ? pname(ctx, r.designer_id) : '미지정'), work ? ppos(ctx, work.actor_id) : '디자이너', wSt, work?.created_at, work?.note || '']);
    return `<table class="plain"><thead><tr><th>순번</th><th>구분</th><th>이름</th><th>직급</th><th>처리 상태</th><th>처리 일시</th><th>의견</th></tr></thead><tbody>${rows.map((x) => `<tr><td class="mono">${x[0]}</td><td>${x[1]}</td><td><b>${esc(x[2] || '-')}</b></td><td>${esc(x[3] || '-')}</td><td>${esc(x[4])}</td><td class="mono">${fmtDT(x[5]) || '-'}</td><td>${esc(x[6])}</td></tr>`).join('')}</tbody></table>`;
  };

  main.innerHTML = `${crumb('의뢰', r.no || '작성중')}
    <div class="toolbar" id="tools">${tools.join('')}</div>
    <div class="doc-title"><span class="l"><span class="req">*</span>제목</span>${ro ? `<span class="txt">${esc(r.title || '(제목 없음)')}${prioTag(r.priority)}</span>` : `<input type="text" id="title" value="${esc(r.title)}" placeholder="예: 그린라이프 대나무 칫솔 상세페이지">`}</div>
    ${next}
    <div class="tabs" id="tabs" role="tablist"><button data-t="1" type="button" role="tab" aria-controls="pane1">의뢰 상세 정보</button><button data-t="2" type="button" role="tab" aria-controls="pane2">결재정보</button><button data-t="3" type="button" role="tab" aria-controls="pane3">첨부파일<em id="fcnt">${files.length}</em></button><button data-t="4" type="button" role="tab" aria-controls="pane4">진행기록·코멘트<em>${comments.length}</em></button></div>

    <div class="tabpane ${ro ? 'ro' : ''}" data-t="1" id="pane1" role="tabpanel">
      <div class="sec-title">의뢰 정보</div>
      <div class="fg">${L('의뢰번호')}<div class="v mono">${esc(r.no || '제출 시 발급')}</div>${L('진행 상태')}<div class="v">${statusText(r.status)}</div>
        ${L('신청자')}<div class="v">${esc(pname(ctx, r.requester_id))}${ppos(ctx, r.requester_id) ? ` <span class="muted">${esc(ppos(ctx, r.requester_id))}</span>` : ''}</div>${L('요청일')}<div class="v mono">${r.submitted_at ? fmtDT(r.submitted_at) : '<span class="muted">미제출</span>'}</div>
        ${L('우선순위')}<div class="v">${PRIO[r.priority]}<span class="hint">대표가 승인 시 정합니다</span></div>${L('확정 납기')}<div class="v">${r.confirmed_due ? dueText({ confirmed_due: r.confirmed_due }) : '<span class="muted">미정</span>'}</div>
        ${L('결재(대표)')}<div class="v">${esc(pname(ctx, r.approver_id) || '-')}${r.decided_at ? ` <span class="muted mono">${fmtDT(r.decided_at)}</span>` : ''}</div>${L('담당 디자이너')}<div class="v">${esc(pname(ctx, r.designer_id) || '-')}</div></div>

      <div class="sec"><div class="sec-title">1. 기본정보 <small>고객사와 의뢰 품목</small></div>
      <div class="fg">${L('의뢰 구분', true)}<div class="v">${ro ? (r.kind === 'internal' ? '내부 의뢰' : '고객사 의뢰') : `<label class="rd"><input type="radio" name="kind" value="client" ${r.kind === 'client' ? 'checked' : ''}>고객사 의뢰</label><label class="rd"><input type="radio" name="kind" value="internal" ${r.kind === 'internal' ? 'checked' : ''}>내부 의뢰</label>`}</div>
        ${L('디자인 의뢰품목', true, 'item_type_id')}<div class="v">${ro ? `${esc(ctx.itemTypes.find((t) => t.id === r.item_type_id)?.label || '미정')}${isOther && r.item_type_other ? ` (${esc(r.item_type_other)})` : ''} · ${r.needs_photo ? '<b>촬영 포함</b>' : '촬영 없음'}` : `<select id="item_type_id" style="width:170px" aria-labelledby="l_item_type_id"><option value="">선택</option>${itemOpts}</select><label class="rd"><input type="checkbox" id="needs_photo" ${r.needs_photo ? 'checked' : ''}>촬영 포함</label>`}</div>
        <div class="l cl-row" id="cl_l">기업명${r.kind === 'client' ? '<span class="req"> *</span>' : ''}</div><div class="v wide cl-row" id="cl_v">${ro ? esc(cl?.name || (r.kind === 'internal' ? '해당 없음(내부 의뢰)' : '-')) : `<select id="client_id" style="width:260px;max-width:100%" aria-label="기업명"><option value="">고객사 선택</option>${clientOpts}</select><button class="btn sm" id="newClient" type="button">＋ 새 고객사</button>${ctx.me.is_admin && cl ? `<a class="btn sm lnk" href="#/clients/${cl.id}">고객사 정보 수정</a>` : ''}`}</div>
        <div class="l cl-row">대표자 성함</div><div class="v cl-row" id="c_ceo">${esc(cl?.ceo_name || '-')}</div><div class="l cl-row">담당자명 / 직급</div><div class="v cl-row" id="c_contact">${esc(cl ? [cl.contact_name, cl.contact_position].filter(Boolean).join(' / ') || '-' : '-')}</div>
        <div class="l cl-row">담당자 직통 연락처</div><div class="v mono cl-row" id="c_phone">${esc(cl?.contact_phone || '-')}</div><div class="l cl-row">E-MAIL</div><div class="v cl-row" id="c_email">${esc(cl?.contact_email || '-')}</div>
        ${!ro || isOther ? `<div class="l" id="oth_l" style="${isOther ? '' : 'display:none'}">기타 품목 설명</div><div class="v wide" id="oth_v" style="${isOther ? '' : 'display:none'}">${inp('item_type_other', isOther ? r.item_type_other : '', '예: 의류 프린팅, 전시 부스 그래픽')}</div>` : ''}</div></div>

      <div class="sec"><div class="sec-title">2. 제품정보 <small>무엇을, 어디에 쓰는 디자인인지</small></div>
      <div class="fg one">${L('상품명', false, 'product_name')}<div class="v">${inp('product_name', r.product_name, '예: 대나무 칫솔 4입')}</div>
        ${L('사용 용도', true, 'purpose')}<div class="v col">${ta('purpose', r.purpose, '예: 스마트스토어 메인화면 배너 / 자사몰 상품 상세페이지')}</div>
        ${L('제작 사이즈', false, 'size_spec')}<div class="v col">${inp('size_spec', r.size_spec, '예: 가로 1000px 세로 7000px, A4')}${ro ? '' : '<div class="chips" id="sizes"></div><div class="hint">상세페이지는 세로 사이즈에 오차가 생길 수 있습니다. 정확한 규격을 모르면 비워두세요.</div>'}</div>
        ${L('상품의 특장점', false, 'product_features')}<div class="v col">${ta('product_features', r.product_features, '①\n②\n③\n④\n⑤')}</div>
        ${L('필수 기입 멘트', false, 'required_copy')}<div class="v col">${ta('required_copy', r.required_copy, '반드시 들어가야 하는 문구·숫자·법적 표기')}</div>
        ${L('참고자료')}<div class="v">${refs.length ? `${refs.length}개 첨부` : '<span class="muted">없음</span>'} <button class="btn sm lnk noprint" type="button" data-tab="3">첨부파일 탭에서 ${ro ? '보기' : '추가'}</button><span class="hint">참고자료는 비율을 훼손하지 말고 jpg·png 파일 등으로 별도 첨부해 주세요.</span></div>
        ${L('참고사항', false, 'notes')}<div class="v col">${ta('notes', r.notes, '예: 경쟁사 A 톤 참고, 브랜드 컬러 #0F5C46, 핑크 계열 금지')}</div></div></div>

      <div class="sec"><div class="sec-title">3. 제작 방향 <small>디자이너가 방향을 잡는 브리프</small></div>
      <div class="fg one">${L('제작 목표·배경', false, 'objective')}<div class="v col">${ta('objective', r.objective, '예: 기존 상세페이지 전환율 개선, 신제품 런칭 알림')}</div>
        ${L('타깃 고객', false, 'target_audience')}<div class="v col">${ta('target_audience', r.target_audience, '예: 30대 여성, 친환경 생활용품 관심층')}</div>
        ${L('톤앤매너·스타일', false, 'tone_style')}<div class="v col">${ta('tone_style', r.tone_style, '예: 밝고 자연스러운 톤, 베이지·그린 계열, 사진 위주')}</div>
        ${L('납품 파일 형식', false, 'deliverable_format')}<div class="v col">${inp('deliverable_format', r.deliverable_format, '예: JPG, PSD')}${ro ? '' : `<div class="chips" id="fmts">${FORMATS.map((x) => `<button type="button">${x}</button>`).join('')}</div>`}</div>
        ${L('희망 납기', false, 'requested_due')}<div class="v">${ro ? fmtD(r.requested_due) : `<input type="date" id="requested_due" value="${esc(r.requested_due || '')}" style="width:170px" aria-labelledby="l_requested_due">`}<span class="hint">확정 납기는 대표가 승인하면서 정합니다.</span></div></div></div>

      <div class="sec policy"><b>참고사항 (수정 정책)</b><ol>${POLICY.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></div>
      ${editable ? '<div class="toolbar mt noprint"><ul class="check" id="check"></ul><span class="sp"></span><span class="st" id="savest" role="status"></span><button class="btn" id="saveNow2" type="button">임시저장</button><button class="btn pri" id="submitBtn2" type="button">' + (r.status === 'revision' ? '재제출' : '결재 요청(제출)') + '</button></div>' : ''}
    </div>

    <div class="tabpane" data-t="2" id="pane2" role="tabpanel"><div class="sec-title">결재선</div>${aline()}<div class="hint mt">상신 → 대표 결재(승인·수정 요청·반려) → 디자이너 작업 → 완료 순으로 처리됩니다. 결재·작업은 지정 담당자가 아니라 해당 역할의 누구나 처리할 수 있으며, 처리한 사람이 결재선에 기록됩니다.</div></div>

    <div class="tabpane" data-t="3" id="pane3" role="tabpanel">
      <div class="sec-title">참고자료 <small>신청자 첨부</small>${editable ? '<span class="noprint"><button class="btn sm" type="button" data-up="upRef">＋ 파일 추가</button><input type="file" id="upRef" multiple hidden></span>' : ''}</div><div id="refs"></div>
      <div class="sec"><div class="sec-title">결과물 <small>디자이너 첨부</small>${me.role === 'designer' && ['approved', 'in_progress'].includes(r.status) ? '<span class="noprint"><button class="btn sm" type="button" data-up="upDel2">＋ 결과물 업로드</button><input type="file" id="upDel2" multiple hidden></span>' : ''}</div>
        ${r.deliverable_url ? (safeUrl(r.deliverable_url) ? `<p class="mb">결과물 URL: <a href="${esc(safeUrl(r.deliverable_url))}" target="_blank" rel="noopener noreferrer">${esc(r.deliverable_url)}</a></p>` : `<p class="mb muted">결과물 URL 형식이 올바르지 않습니다: ${esc(r.deliverable_url)}</p>`) : ''}<div id="dels"></div></div>
      <div class="hint mt">참고자료 50MB, 결과물 300MB까지. 실행 파일은 올릴 수 없습니다. 내려받기 링크는 60초 동안 유효합니다.</div>
    </div>

    <div class="tabpane" data-t="4" id="pane4" role="tabpanel">
      <div class="sec-title">진행 기록</div>
      <table class="plain"><thead><tr><th>일시</th><th>처리</th><th>처리자</th><th>내용</th></tr></thead><tbody>${[...events].reverse().map((e) => `<tr><td class="mono">${fmtDT(e.created_at)}</td><td><b>${esc(ACTION_KO[e.action] || e.action)}</b></td><td>${esc(pname(ctx, e.actor_id))}</td><td>${esc(e.note || '')}${termsText(e)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">기록 없음</td></tr>'}</tbody></table>
      <div class="sec"><div class="sec-title">코멘트 <small><span id="ccnt">${comments.length}</span>건 · 관련자에게 이메일로 전달됩니다</small></div>
        <div id="clist"></div>
        <form id="cf" class="mt noprint"><textarea id="cbody" placeholder="질문, 추가 자료 링크, 피드백" required aria-label="코멘트"></textarea><div class="right mt"><button class="btn pri" type="submit">코멘트 남기기</button></div></form></div>
    </div>`;

  // ---- 탭
  const setTab = (t) => { docTab[id] = t; $$('#tabs button', main).forEach((b) => { const onb = b.dataset.t === String(t); b.classList.toggle('on', onb); b.setAttribute('aria-selected', onb); }); $$('.tabpane', main).forEach((p) => p.classList.toggle('on', p.dataset.t === String(t))); };
  on('#tabs button', 'click', (e) => setTab(e.currentTarget.dataset.t), main);
  on('#tabs', 'keydown', (e) => { if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return; const cur = Number(docTab[id] || 1); const nx = e.key === 'ArrowRight' ? Math.min(4, cur + 1) : Math.max(1, cur - 1); setTab(nx); $(`#tabs button[data-t="${nx}"]`, main).focus(); }, main);
  on('[data-tab]', 'click', (e) => setTab(e.currentTarget.dataset.tab), main);
  setTab(docTab[id] || 1);

  // ---- 코멘트 목록 (부분 갱신)
  const renderComments = () => { $('#clist', main).innerHTML = comments.map((c) => `<div class="cm"><div class="a"><b>${esc(pname(ctx, c.author_id))}</b> · ${fmtDT(c.created_at)}</div><div class="b">${esc(c.body)}</div></div>`).join('') || '<p class="muted small">아직 코멘트가 없습니다.</p>'; $('#ccnt', main).textContent = comments.length; $('#tabs button[data-t="4"] em', main).textContent = comments.length; };
  renderComments();

  // ---- 파일 목록 (부분 갱신). 삭제 권한 = 서버 규칙과 동일(참고자료: 작성자+draft/revision, 결과물: 디자이너+in_progress). 미완료 파일은 올린 본인만.
  const canDelFile = (f) => (f.kind === 'reference' ? editable : me.role === 'designer' && r.status === 'in_progress') && (f.upload_state === 'ready' || f.uploaded_by === me.id);
  const fileTable = (arr) => arr.length ? `<table class="plain"><thead><tr><th>파일명</th><th>크기</th><th>첨부자</th><th>등록일</th><th class="noprint"></th></tr></thead><tbody>${arr.map((f) => { const pending = f.upload_state === 'pending'; return `<tr data-id="${f.id}" data-path="${esc(f.storage_path)}"><td class="n"><b>${esc(f.file_name)}</b>${pending ? ' <span class="chip red">업로드 미완료</span>' : ''}</td><td class="mono">${fmtSize(f.size_bytes)}</td><td>${esc(pname(ctx, f.uploaded_by))}</td><td class="mono">${fmtDT(f.created_at)}</td><td class="noprint inline">${pending ? '' : '<button class="btn sm dl" type="button">내려받기</button>'}${canDelFile(f) ? '<button class="btn sm dan del" type="button">삭제</button>' : ''}</td></tr>`; }).join('')}</tbody></table>` : '<div class="files-empty">첨부 없음</div>';
  const renderFiles = () => {
    $('#refs', main).innerHTML = fileTable(files.filter((f) => f.kind === 'reference')); $('#dels', main).innerHTML = fileTable(files.filter((f) => f.kind === 'deliverable'));
    $('#fcnt', main).textContent = files.length;
    bindFiles(ctx, $('#refs', main), refreshFiles); bindFiles(ctx, $('#dels', main), refreshFiles);
  };
  const refreshFiles = async () => { files = await ctx.api.files(id); renderFiles(); };
  renderFiles();
  // 업로드 상태는 조회 화면(디자이너 결과물)에서도 필요하므로 편집 여부와 무관하게 여기서 정의
  let uploading = 0, submitting = false;
  let setStatus = () => {};
  const uploadHandler = (kind, gotoTab) => async (e) => {
    const fs = [...e.target.files]; e.target.value = ''; if (!fs.length) return;
    uploading += fs.length; setStatus();
    try { for (const f of fs) { try { await uploadOne(ctx, id, kind, f); } finally { uploading--; setStatus(); } } }
    finally { uploading = Math.max(0, uploading); setStatus(); }
    await refreshFiles(); if (gotoTab) setTab(3);
  };
  on('button[data-up]', 'click', (e) => $('#' + e.currentTarget.dataset.up, main)?.click(), main);
  const upRef = $('#upRef', main); if (upRef) upRef.onchange = uploadHandler('reference', false);
  const upDel = $('#upDel', main); if (upDel) upDel.onchange = uploadHandler('deliverable', true);
  const upDel2 = $('#upDel2', main); if (upDel2) upDel2.onchange = uploadHandler('deliverable', false);

  // ---- 공통 버튼
  $('#back', main).onclick = () => back('#/');
  $('#print', main).onclick = () => {
    if (editable) { go(`#/doc/${id}?print=1`); return; } // 작성 중이면 읽기 전용 표현으로 출력(입력창 대신 본문 텍스트)
    const prev = docTab[id]; setTab(1); const restore = () => { setTab(prev); window.removeEventListener('afterprint', restore); }; window.addEventListener('afterprint', restore); window.print();
  };
  if (printMode) { setTab(1); setTimeout(() => { const backAfter = () => { window.removeEventListener('afterprint', backAfter); history.back(); }; window.addEventListener('afterprint', backAfter); window.print(); }, 300); }
  $('#cf', main).onsubmit = async (ev) => { ev.preventDefault(); const b = $('#cf button', main); b.disabled = true; try { await ctx.api.comment(id, v('cbody', main)); toast('코멘트를 남겼습니다.'); $('#cbody', main).value = ''; comments = await ctx.api.comments(id); renderComments(); } catch (e) { toast(errText(e), true); } finally { b.disabled = false; } };
  on('#tools button[data-a]', 'click', (e) => actionDialog(ctx, r, e.currentTarget.dataset.a), main);

  if (!editable) return;

  // ---- 편집: 자동저장 + 검증
  let dirty = false, saving = null, queued = false, lastSaved = null, inputVer = 0, timer = null;
  let kind = r.kind, itemId = Number(r.item_type_id) || null, keptClient = r.client_id ? String(r.client_id) : '';
  setStatus = () => {
    const el = $('#savest', main); if (!el) return;
    el.textContent = submitting ? '제출 중…' : uploading ? '파일 올리는 중…' : saving ? '저장 중…' : dirty ? '저장되지 않은 변경 있음' : lastSaved ? `임시저장됨 ${lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : '변경 없음';
    const lock = submitting || uploading > 0;
    for (const s of ['#submitBtn', '#submitBtn2', '#saveNow', '#saveNow2']) { const b = $(s, main); if (b) b.disabled = lock; }
    $$('#pane1 input, #pane1 select, #pane1 textarea, #title', main).forEach((i) => { i.disabled = submitting; });
  };
  const collect = () => ({
    kind, client_id: kind === 'client' && v('client_id', main) ? Number(v('client_id', main)) : null, title: v('title', main), item_type_id: itemId || null, item_type_other: itemId === otherId ? v('item_type_other', main) || null : null,
    needs_photo: !!$('#needs_photo', main)?.checked, product_name: v('product_name', main) || null, purpose: v('purpose', main) || null, size_spec: v('size_spec', main) || null,
    product_features: v('product_features', main) || null, required_copy: v('required_copy', main) || null, notes: v('notes', main) || null, requested_due: v('requested_due', main) || null,
    objective: v('objective', main) || null, target_audience: v('target_audience', main) || null, tone_style: v('tone_style', main) || null, deliverable_format: v('deliverable_format', main) || null,
  });
  const doSave = () => {
    if (saving) { queued = true; return saving; }
    const ver = inputVer, data = collect();
    saving = ctx.api.save(id, data).then(() => { lastSaved = new Date(); if (inputVer === ver) dirty = false; })
      .catch((e) => { dirty = true; toast('임시저장 실패: ' + errText(e), true); throw e; })
      .finally(() => { saving = null; setStatus(); if (queued) { queued = false; doSave().catch(() => {}); } });
    setStatus(); return saving;
  };
  // 큐가 모두 비워질 때까지 기다림(진행 중 저장 → 대기 중 저장 순). 실패하면 dirty 가 남고 false 반환.
  const flush = async () => {
    clearTimeout(timer);
    for (let i = 0; i < 4; i++) {
      if (saving) { try { await saving; } catch {} continue; }
      if (dirty || queued) { try { await doSave(); } catch { return false; } continue; }
      return true;
    }
    return !dirty && !saving && !queued;
  };
  const touched = () => { dirty = true; inputVer++; setStatus(); clearTimeout(timer); timer = setTimeout(() => doSave().catch(() => {}), 1500); };
  ctx.flush = flush;
  ctx.unloadGuard = () => dirty || !!saving || uploading > 0 || submitting;

  // 필수 항목: 포커스 대상은 검사 시점에 계산(품목 변경을 따라감)
  const REQ = [['제목', () => !!v('title', main), () => 'title'], ['의뢰품목', () => !!itemId && (itemId !== otherId || !!v('item_type_other', main)), () => (itemId === otherId ? 'item_type_other' : 'item_type_id')], ['기업명', () => kind === 'internal' || !!v('client_id', main), () => 'client_id'], ['사용 용도', () => !!v('purpose', main), () => 'purpose']];
  const check = () => {
    const rows = REQ.filter(([k]) => k !== '기업명' || kind === 'client').map(([k, f, el]) => [k, f(), el()]);
    const el = $('#check', main); if (el) el.innerHTML = rows.map(([k, o]) => `<li class="${o ? 'ok' : ''}">${k}</li>`).join('');
    return rows.find(([, o]) => !o) || null;
  };
  const showClient = () => { const c = clientOf(ctx, { client_id: Number(v('client_id', main)) }); $('#c_ceo', main).textContent = c?.ceo_name || '-'; $('#c_contact', main).textContent = c ? [c.contact_name, c.contact_position].filter(Boolean).join(' / ') || '-' : '-'; $('#c_phone', main).textContent = c?.contact_phone || '-'; $('#c_email', main).textContent = c?.contact_email || '-'; };
  // 내부 의뢰: 고객사 행 자체를 숨기고 선택값은 keptClient 에 보관(다시 고객사 의뢰로 바꾸면 복원)
  const applyKind = () => { const isC = kind === 'client'; const sel = $('#client_id', main); if (!isC) { keptClient = sel.value || keptClient; sel.value = ''; } else if (!sel.value && keptClient) sel.value = keptClient; $$('.cl-row', main).forEach((el) => { el.style.display = isC ? '' : 'none'; }); showClient(); };
  const renderSizes = () => { const t = ctx.itemTypes.find((x) => Number(x.id) === itemId); const box = $('#sizes', main); box.innerHTML = (t?.default_sizes || []).map((s) => `<button type="button">${esc(s)}</button>`).join(''); on('button', 'click', (e) => { $('#size_spec', main).value = e.currentTarget.textContent; touched(); check(); }, box); };
  on('input[name=kind]', 'change', (e) => { kind = e.currentTarget.value; applyKind(); touched(); check(); }, main);
  $('#item_type_id', main).onchange = (e) => { itemId = Number(e.target.value) || null; const oth = itemId === otherId; $('#oth_l', main).style.display = oth ? '' : 'none'; $('#oth_v', main).style.display = oth ? '' : 'none'; renderSizes(); touched(); check(); };
  $('#client_id', main).onchange = () => { showClient(); touched(); check(); };
  on('#fmts button', 'click', (e) => { const i = $('#deliverable_format', main); const cur = i.value.split(',').map((s) => s.trim()).filter(Boolean); const x = e.currentTarget.textContent; i.value = (cur.includes(x) ? cur.filter((y) => y !== x) : [...cur, x]).join(', '); touched(); }, main);
  on('#pane1 input:not([type=file]), #pane1 textarea, #pane1 select, #title', 'input', () => { touched(); check(); }, main); // 코멘트 입력은 제외
  $('#newClient', main).onclick = () => clientDialog(ctx, null, async (c) => { ctx.clients.push(c); ctx.clients.sort((a, b) => a.name.localeCompare(b.name)); const sel = $('#client_id', main); sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${esc(c.name)}</option>`); sel.value = c.id; showClient(); touched(); check(); });
  const submit = async () => {
    if (submitting) return;
    if (uploading) return toast('파일 업로드가 끝난 뒤 제출하세요.', true);
    const focusMissing = (m) => { toast('필수 항목을 채워주세요: ' + m[0], true); setTab(1); const el = $('#' + m[2], main); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.focus?.(); };
    let missing = check(); if (missing) return focusMissing(missing);
    if (files.some((f) => f.upload_state === 'pending')) return toast('업로드가 끝나지 않은 파일이 있습니다. 첨부파일 탭에서 삭제하거나 다시 올린 뒤 제출하세요.', true);
    submitting = true; setStatus();
    try {
      const ok = await flush();
      if (!ok) { toast('임시저장에 실패해 제출할 수 없습니다. 네트워크를 확인하고 다시 시도하세요.', true); return; }
      missing = check(); if (missing) { focusMissing(missing); return; }
      await ctx.api.transition(id, r.status === 'revision' ? 'resubmit' : 'submit');
      ctx.flush = null; ctx.unloadGuard = null; docTab[id] = 2;
      toast(r.status === 'revision' ? '재제출했습니다.' : '결재 요청했습니다. 대표에게 알림이 갑니다.'); submitting = false; ctx.render();
    } catch (e) { toast(errText(e), true); }
    finally { submitting = false; setStatus(); }
  };
  for (const s of ['#saveNow', '#saveNow2']) { const b = $(s, main); if (b) b.onclick = async () => { try { await flush(); if (!dirty) toast('임시저장했습니다.'); } catch {} }; }
  for (const s of ['#submitBtn', '#submitBtn2']) { const b = $(s, main); if (b) b.onclick = submit; }
  applyKind(); renderSizes(); check(); setStatus();
}

function termsText(e) {
  const p = e.payload; if (!p || (!p.priority && !p.confirmed_due)) return '';
  const a = [];
  if (p.priority && p.priority.from !== p.priority.to) a.push(`우선순위 ${p.priority.from ? PRIO[p.priority.from] + ' → ' : ''}${PRIO[p.priority.to] || '없음'}`);
  if (p.confirmed_due && p.confirmed_due.from !== p.confirmed_due.to) a.push(`납기 ${p.confirmed_due.from ? fmtD(p.confirmed_due.from) + ' → ' : ''}${p.confirmed_due.to ? fmtD(p.confirmed_due.to) : '없음'}`);
  return a.length ? `<div class="muted small">${esc(a.join(', '))}</div>` : '';
}
function bindFiles(ctx, root, onChanged) {
  on('.dl', 'click', async (e) => {
    const tr = e.currentTarget.closest('tr'); const w = window.open('', '_blank');
    try { const url = await ctx.api.downloadUrl({ storage_path: tr.dataset.path, file_name: $('.n b', tr).textContent }); if (w) w.location = url; else location.href = url; }
    catch (err) { w?.close(); toast('내려받기 실패: ' + errText(err), true); }
  }, root);
  on('.del', 'click', (e) => { const tr = e.currentTarget.closest('tr'); confirmDialog('파일 삭제', `${$('.n b', tr).textContent} 파일을 삭제할까요?`, async () => { await ctx.api.deleteFile({ id: tr.dataset.id, storage_path: tr.dataset.path }); toast('삭제했습니다.'); await onChanged(); }); }, root);
}
async function uploadOne(ctx, requestId, kind, file) {
  try { toast(`${file.name} 올리는 중…`); await ctx.api.upload(requestId, kind, file); toast(`${file.name} 업로드 완료`); return true; }
  catch (e) { toast(`${file.name}: ${errText(e)}`, true); return false; }
}
const dv = (d, id) => $('#' + id, d)?.value?.trim() ?? '';
function actionDialog(ctx, r, a) {
  const prioSel = (cur) => field('우선순위', `<select id="d_prio">${Object.entries(PRIO).map(([k, x]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${x}</option>`).join('')}</select>`);
  const dueIn = (cur, req) => field(`확정 납기${req ? ' <span class="req">*</span>' : ''}`, `<input type="date" id="d_due" value="${esc(cur || r.requested_due || '')}" ${req ? 'required' : ''}>`, { hint: r.requested_due ? `신청자 희망 납기 ${fmtD(r.requested_due)}` : '신청자가 희망 납기를 적지 않았습니다.' });
  const noteIn = (req, ph) => field(req ? '사유 <span class="req">*</span>' : '의견', `<textarea id="d_note" placeholder="${ph || ''}" ${req ? 'required' : ''}></textarea>`);
  const run = (payload) => ctx.api.transition(r.id, a, payload).then(() => { toast('처리했습니다.'); docTab[r.id] = 2; ctx.render(); });
  switch (a) {
    case 'cancel': return confirmDialog('의뢰 취소', '이 의뢰를 취소할까요? 취소하면 되돌릴 수 없습니다.', () => run({}));
    case 'approve': return dialog({ title: '승인', body: '<p class="muted small mb">승인하면 디자이너와 신청자에게 이메일이 갑니다.</p>' + prioSel(r.priority) + dueIn(r.confirmed_due, true) + noteIn(false, '디자이너·신청자에게 전달할 의견'), ok: '승인', onOk: (d) => run({ priority: dv(d, 'd_prio'), confirmed_due: dv(d, 'd_due'), note: dv(d, 'd_note') }) });
    case 'request_revision': return dialog({ title: '수정 요청', body: '<p class="muted small mb">신청자가 내용을 고쳐 재제출하면 다시 미결함으로 돌아옵니다.</p>' + noteIn(true, '무엇을 어떻게 고쳐야 하는지'), ok: '수정 요청', onOk: (d) => run({ note: dv(d, 'd_note') }) });
    case 'reject': return dialog({ title: '반려', body: '<p class="muted small mb">반려하면 의뢰가 종료됩니다.</p>' + noteIn(true, '반려 사유'), ok: '반려', danger: true, onOk: (d) => run({ note: dv(d, 'd_note') }) });
    case 'update_terms': return dialog({ title: '우선순위·납기 조정', body: prioSel(r.priority) + dueIn(r.confirmed_due, false) + noteIn(false), ok: '조정', onOk: (d) => run({ priority: dv(d, 'd_prio'), confirmed_due: dv(d, 'd_due') || null, note: dv(d, 'd_note') }) });
    case 'start': return dialog({ title: '작업 시작', body: '<p class="mb">이 의뢰를 작업중으로 바꿉니다. 신청자에게 알림이 갑니다.</p>' + noteIn(false, '예: 시안은 목요일에 공유드릴게요'), ok: '시작', onOk: (d) => run({ note: dv(d, 'd_note') }) });
    case 'complete': return dialog({ title: '완료 처리', body: `<p class="muted small mb">결과물 파일을 올렸거나 아래 URL을 입력해야 완료할 수 있습니다.</p>${field('결과물 URL', `<input type="url" id="d_url" value="${esc(r.deliverable_url || '')}" placeholder="https:// (드라이브·피그마 링크 등)">`)}${noteIn(false, '신청자·대표에게 전달할 의견')}`, ok: '완료', onOk: (d) => run({ deliverable_url: dv(d, 'd_url'), note: dv(d, 'd_note') }) });
  }
}

// ---------------------------------------------------------------- 고객사
function clientDialog(ctx, c, onDone) {
  const form = `<div class="row">${field('기업명 <span class="req">*</span>', `<input type="text" id="c_name" value="${esc(c?.name)}" required>`)}${field('대표자 성함', `<input type="text" id="c_ceo" value="${esc(c?.ceo_name)}">`)}${field('담당자명', `<input type="text" id="c_contact" value="${esc(c?.contact_name)}">`)}${field('담당자 직급', `<input type="text" id="c_pos" value="${esc(c?.contact_position)}">`)}${field('담당자 직통 연락처', `<input type="tel" id="c_phone" value="${esc(c?.contact_phone)}" placeholder="000-0000-0000">`)}${field('E-MAIL', `<input type="email" id="c_email" value="${esc(c?.contact_email)}">`)}</div>${field('메모', `<textarea id="c_memo" placeholder="브랜드 가이드, 선호 톤, 주의사항">${esc(c?.memo)}</textarea>`, { hint: '사내 전원이 볼 수 있습니다.' })}`;
  const pick = (d) => ({ name: dv(d, 'c_name'), ceo_name: dv(d, 'c_ceo') || null, contact_name: dv(d, 'c_contact') || null, contact_position: dv(d, 'c_pos') || null, contact_phone: dv(d, 'c_phone') || null, contact_email: dv(d, 'c_email') || null, memo: dv(d, 'c_memo') || null });
  return dialog({ title: c ? '고객사 수정' : '고객사 등록', body: form, ok: c ? '저장' : '등록', onOk: async (d) => { if (c) { await ctx.api.clientUpdate(c.id, pick(d)); onDone({ ...c, ...pick(d) }); } else { const row = await ctx.api.clientInsert({ ...pick(d), created_by: ctx.me.id }); onDone(row); } } });
}
export async function clients(main, ctx, params, sel) {
  const s = (params.get('s') || '').toLowerCase();
  const list = ctx.clients.filter((c) => !s || [c.name, c.ceo_name, c.contact_name, c.contact_email, c.contact_phone, c.memo].some((x) => (x || '').toLowerCase().includes(s)));
  const cnt = {}; ctx.reqs.forEach((r) => { if (r.client_id) cnt[r.client_id] = (cnt[r.client_id] || 0) + 1; });
  const cur = sel ? ctx.clients.find((c) => c.id == sel) : null;
  const hist = cur ? ctx.reqs.filter((r) => r.client_id === cur.id).sort(byRecent) : [];
  main.innerHTML = `${crumb('기준정보', '고객사')}
    <div class="cond"><div class="ct">선택조건</div><form id="sf"><div class="cr"><span class="cl">검색어</span><input type="search" id="s" value="${esc(params.get('s') || '')}" placeholder="기업명·담당자·연락처·메모" style="width:260px"><span class="act inline"><button class="btn pri" type="submit">조회</button><a class="btn" href="#/clients">초기화</a></span></div></form></div>
    ${cur ? `<div class="panel" id="cdetail"><div class="ph"><span>${esc(cur.name)}</span><span class="inline">${ctx.me.is_admin ? '<button class="btn sm" id="ed" type="button">수정</button><button class="btn sm dan" id="rm" type="button">삭제</button>' : ''}<a class="btn sm" href="#/clients">닫기</a></span></div>
      <div class="pb"><div class="fg">${['대표자 성함', cur.ceo_name, '담당자명 / 직급', [cur.contact_name, cur.contact_position].filter(Boolean).join(' / '), '담당자 직통 연락처', cur.contact_phone, 'E-MAIL', cur.contact_email].reduce((h, x, i) => h + (i % 2 ? `<div class="v">${esc(x || '-')}</div>` : `<div class="l">${x}</div>`), '')}<div class="l">메모</div><div class="v wide pre">${esc(cur.memo || '-')}</div></div>
      <div class="sec"><div class="sec-title">의뢰 이력 <small>${hist.length}건</small></div>${grid(ctx, hist, '이 고객사의 의뢰가 없습니다.')}</div></div></div>` : ''}
    <div class="gridbar"><span><b>고객사</b> · ${list.length}곳 <span class="muted">누구나 등록, 수정·삭제는 관리자</span></span><button class="btn sm pri" id="add" type="button">＋ 고객사 등록</button></div>
    <div class="gridwrap"><table class="grid"><thead><tr><th>기업명</th><th>대표자</th><th>담당자</th><th>직급</th><th>연락처</th><th>E-MAIL</th><th>메모</th><th>의뢰</th></tr></thead><tbody>
      ${list.length ? list.map((c) => `<tr data-cid="${c.id}"><td class="t">${esc(c.name)}</td><td>${esc(c.ceo_name || '-')}</td><td>${esc(c.contact_name || '-')}</td><td>${esc(c.contact_position || '-')}</td><td class="mono">${esc(c.contact_phone || '-')}</td><td>${esc(c.contact_email || '-')}</td><td class="muted">${esc((c.memo || '').slice(0, 40))}</td><td class="num">${cnt[c.id] || 0}</td></tr>`).join('') : '<tr><td class="empty" colspan="8">고객사가 없습니다.</td></tr>'}
    </tbody></table></div>`;
  bindGrid(main);
  on('tr[data-cid]', 'click', (e) => go('#/clients/' + e.currentTarget.dataset.cid), main);
  $('#sf', main).onsubmit = (e) => { e.preventDefault(); go('#/clients?s=' + encodeURIComponent(v('s', main))); };
  $('#add', main).onclick = () => clientDialog(ctx, null, async () => { toast('등록했습니다.'); await ctx.reload(); });
  if (cur && ctx.me.is_admin) {
    $('#ed', main).onclick = () => clientDialog(ctx, cur, async () => { toast('저장했습니다.'); await ctx.reload(); });
    $('#rm', main).onclick = () => confirmDialog('고객사 삭제', `${cur.name} 을(를) 삭제할까요? 의뢰가 연결된 고객사는 삭제되지 않습니다.`, async () => { await ctx.api.clientDelete(cur.id); toast('삭제했습니다.'); go('#/clients'); await ctx.reload(); });
  }
  if (cur) $('#cdetail', main).scrollIntoView({ block: 'start' });
}

// ---------------------------------------------------------------- 설정 (관리자)
export async function settings(main, ctx) {
  if (!ctx.me.is_admin) { go('#/'); return; }
  main.innerHTML = `${crumb('기준정보', '사용자·품목')}
    <div class="notice info mb">새 사용자 초대는 Supabase 대시보드 → Authentication → Users → <b>Invite user</b>. 초대 메일 링크로 들어오면 비밀번호를 정하고 바로 쓸 수 있습니다. 새 사용자는 <b>직원</b> 역할로 시작하니 아래에서 역할을 바꿔주세요. 퇴사자는 삭제 대신 "활성"을 끄세요.</div>
    <div class="panel"><div class="ph"><span>사용자 (${ctx.profiles.length})</span></div><div class="pb">
      <div class="fg one mb">${Object.entries(ROLE).map(([k, x]) => `<div class="l">${x}</div><div class="v">${ROLE_DESC[k]}</div>`).join('')}</div>
      <table class="plain"><thead><tr><th>이름</th><th>이메일</th><th>직급</th><th>역할</th><th>관리자</th><th>활성</th><th></th></tr></thead><tbody>
      ${ctx.profiles.map((p) => `<tr data-id="${p.id}"><td><b>${esc(p.name || '-')}</b></td><td class="mono">${esc(p.email)}</td><td>${esc(p.position || '-')}</td>
        <td><select class="u_role" style="width:110px">${Object.entries(ROLE).map(([k, x]) => `<option value="${k}" ${p.role === k ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
        <td class="center"><input type="checkbox" class="u_admin" ${p.is_admin ? 'checked' : ''}></td><td class="center"><input type="checkbox" class="u_active" ${p.is_active ? 'checked' : ''}></td>
        <td class="right"><button class="btn sm u_save" type="button">저장</button></td></tr>`).join('')}</tbody></table></div></div>
    <div class="panel"><div class="ph"><span>디자인 의뢰품목</span><button class="btn sm" id="addItem" type="button">＋ 품목 추가</button></div><div class="pb">
      <table class="plain"><thead><tr><th>코드</th><th>표시명</th><th>정렬</th><th>추천 사이즈 (쉼표 구분)</th><th>사용</th><th></th></tr></thead><tbody>
      ${ctx.itemTypes.map((t) => `<tr data-id="${t.id}"><td class="mono">${esc(t.code)}</td><td><input type="text" class="i_label" value="${esc(t.label)}"></td><td><input type="number" class="i_sort" value="${t.sort}" style="width:70px"></td>
        <td><input type="text" class="i_sizes" value="${esc((t.default_sizes || []).join(', '))}"></td><td class="center"><input type="checkbox" class="i_active" ${t.is_active ? 'checked' : ''}></td>
        <td class="right"><button class="btn sm i_save" type="button">저장</button></td></tr>`).join('')}</tbody></table>
      <div class="hint mt">품목은 삭제하지 않고 "사용"을 꺼서 숨깁니다(기존 의뢰가 참조).</div></div></div>`;
  on('.u_save', 'click', async (e) => { const tr = e.currentTarget.closest('tr'); try { await ctx.api.setUser(tr.dataset.id, $('.u_role', tr).value, $('.u_admin', tr).checked, $('.u_active', tr).checked); toast('저장했습니다.'); await ctx.reload(); } catch (err) { toast(errText(err), true); } }, main);
  on('.i_save', 'click', async (e) => { const tr = e.currentTarget.closest('tr'); try { await ctx.api.itemUpdate(tr.dataset.id, { label: $('.i_label', tr).value.trim(), sort: Number($('.i_sort', tr).value) || 100, default_sizes: $('.i_sizes', tr).value.split(',').map((s) => s.trim()).filter(Boolean), is_active: $('.i_active', tr).checked }); toast('저장했습니다.'); await ctx.reload(); } catch (err) { toast(errText(err), true); } }, main);
  $('#addItem', main).onclick = () => dialog({ title: '품목 추가', body: `<div class="row">${field('코드 <span class="req">*</span>', '<input type="text" id="n_code" placeholder="영문 소문자, 예: catalog" required pattern="[a-z0-9_]+">')}${field('표시명 <span class="req">*</span>', '<input type="text" id="n_label" required>')}</div>${field('추천 사이즈', '<input type="text" id="n_sizes" placeholder="쉼표로 구분">')}`, ok: '추가', onOk: async (d) => { await ctx.api.itemInsert({ code: dv(d, 'n_code').toLowerCase(), label: dv(d, 'n_label'), default_sizes: dv(d, 'n_sizes').split(',').map((s) => s.trim()).filter(Boolean), sort: 500 }); toast('추가했습니다.'); await ctx.reload(); } });
}

// ---------------------------------------------------------------- 내 정보
export function me(main, ctx) {
  const { me } = ctx;
  main.innerHTML = `${crumb('내 정보')}
    <div class="panel" style="max-width:640px"><div class="ph"><span>사용자 정보</span></div><form class="pb" id="f">
      <div class="fg one"><div class="l">이메일</div><div class="v">${esc(me.email)}</div><div class="l">역할</div><div class="v">${ROLE[me.role]}${me.is_admin ? ' · 관리자' : ''}<span class="hint">${ROLE_DESC[me.role]}</span></div>
        <div class="l"><span class="req">*</span>이름</div><div class="v"><input type="text" id="m_name" value="${esc(me.name)}" required style="max-width:260px"></div>
        <div class="l">직급·부서</div><div class="v"><input type="text" id="m_pos" value="${esc(me.position)}" placeholder="예: 마케팅팀 대리" style="max-width:260px"></div></div>
      <div class="toolbar mt"><button class="btn pri" type="submit">저장</button><button class="btn" type="button" id="pwreset">비밀번호 재설정 메일 받기</button><a class="btn" href="#/help">사용 안내</a></div></form></div>`;
  $('#f', main).onsubmit = async (e) => { e.preventDefault(); try { await ctx.api.updateMe(me.id, { name: v('m_name', main), position: v('m_pos', main) || null }); toast('저장했습니다.'); await ctx.reload(); } catch (err) { toast(errText(err), true); } };
  $('#pwreset', main).onclick = async () => { try { await ctx.api.auth.reset(me.email); toast('재설정 메일을 보냈습니다. 메일함을 확인하세요.'); } catch (err) { toast(errText(err), true); } };
}

// ---------------------------------------------------------------- 안내
export function help(main) {
  main.innerHTML = `${crumb('안내')}<div class="panel help"><div class="ph"><span>Design Desk 사용 안내</span></div><div class="pb">
    <h2 style="margin-top:0">진행 흐름</h2><ol><li><b>작성·제출</b> — 직원이 의뢰서(기본정보·제품정보·제작 방향)를 채워 "결재 요청(제출)". 작성 중엔 자동 임시저장.</li><li><b>대표 결재</b> — 미결함에서 승인·수정 요청·반려. 승인 시 우선순위와 확정 납기 지정.</li><li><b>디자이너 작업</b> — 작업 대기함에서 작업 시작, 코멘트로 질문, 결과물 업로드 후 완료 처리.</li><li><b>결과물 전달</b> — 신청자는 첨부파일 탭에서 내려받기.</li></ol>
    <h2>상태</h2><div class="fg one">${Object.keys(STATUS).map((s) => `<div class="l">${statusText(s)}</div><div class="v">${{ draft: '작성 중, 미제출. 신청자만 봅니다.', submitted: '제출됨, 대표 결재 대기. 내용 수정 불가(취소 가능).', revision: '대표가 보완 요청. 신청자가 고쳐 재제출.', approved: '승인됨, 디자이너 작업 시작 대기.', in_progress: '디자이너 작업 중.', done: '결과물 등록, 완료.', rejected: '대표가 진행하지 않기로 함(종료).', cancelled: '신청자가 취소(종료).' }[s]}</div>`).join('')}</div>
    <h2>역할</h2><div class="fg one">${Object.entries(ROLE).map(([k, x]) => `<div class="l">${x}</div><div class="v">${ROLE_DESC[k]}</div>`).join('')}</div>
    <h2>이메일 알림</h2><ul><li>제출·재제출 → 대표</li><li>승인 → 디자이너·신청자</li><li>수정 요청·반려·작업 시작 → 신청자</li><li>완료 → 신청자(대표 참조)</li><li>코멘트 → 작성자 제외 관련자</li></ul>
    <h2>자주 묻는 것</h2><ul><li><b>제출 후 수정하고 싶어요.</b> 결재 대기 중엔 잠깁니다. 코멘트로 알리거나, 취소 후 다시 작성하세요.</li><li><b>참고자료를 나중에 추가하고 싶어요.</b> 제출 후에는 코멘트에 링크를 남기세요.</li><li><b>파일이 안 올라가요.</b> 참고자료 50MB, 결과물 300MB까지. 실행 파일은 막혀 있습니다.</li><li><b>의뢰번호는 언제 생기나요.</b> 처음 제출할 때 발급됩니다(DR-연도-순번).</li></ul>
    <h2>수정 정책</h2><ol>${POLICY.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></div></div>`;
}
