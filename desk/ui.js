// 공용 UI 헬퍼 + 용어 사전
export const STATUS = {
  draft: ['작성중', 'gray'], submitted: ['승인 대기', 'amber'], revision: ['수정 요청', 'amber'],
  approved: ['작업 대기', 'blue'], in_progress: ['작업중', 'blue'], done: ['완료', 'green'],
  rejected: ['반려', 'red'], cancelled: ['취소', 'gray'],
};
export const PRIO = { urgent: '긴급', high: '높음', normal: '보통', low: '낮음' };
export const ROLE = { requester: '직원', approver: '대표', designer: '디자이너' };
export const ROLE_DESC = {
  requester: '디자인이 필요할 때 의뢰서를 작성해 제출합니다. 대표 승인 후 디자이너가 작업하고, 완료되면 결과물을 여기서 내려받습니다.',
  approver: '직원이 제출한 의뢰를 검토해 승인·수정 요청·반려하고, 우선순위와 확정 납기를 정합니다.',
  designer: '승인된 의뢰를 받아 작업하고, 결과물을 올려 완료 처리합니다. 품목 카탈로그도 관리합니다.',
};
export const ACTION_KO = {
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
  ['violates foreign key', '연결된 의뢰가 있어 삭제할 수 없습니다.'], ['delete not allowed', '이 상태의 의뢰는 삭제할 수 없습니다. 먼저 취소하세요.'], ['duplicate key', '이미 있는 값입니다.'], ['Failed to fetch', '네트워크 연결을 확인하세요.'],
];
export function errText(e) {
  const m = e?.message || String(e);
  for (const [k, v] of ERR_KO) if (m.includes(k)) return v;
  return m;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtD = (d) => (d ? String(d).slice(0, 10).replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1.$2.$3') : '-');
export const fmtDT = (d) => (d ? new Date(d).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
export const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
export const chip = (s) => `<span class="chip ${STATUS[s]?.[1] || 'gray'}"><i></i>${STATUS[s]?.[0] || s}</span>`;
export const prioTag = (p) => (p === 'normal' ? '' : `<span class="prio ${p}">${PRIO[p] || p}</span>`);
export function dueText(r) {
  const d = r.confirmed_due || r.requested_due; if (!d) return '<span class="muted">납기 미정</span>';
  const diff = Math.round((new Date(d) - new Date(new Date().toDateString())) / 864e5);
  const label = r.confirmed_due ? '' : '희망 ';
  const cls = diff < 0 ? 'over' : diff <= 2 ? 'soon' : '';
  const rel = diff === 0 ? '오늘' : diff < 0 ? `${-diff}일 지남` : diff <= 14 ? `${diff}일 남음` : '';
  return `<span class="due ${cls}">${label}${fmtD(d)}${rel ? ` · ${rel}` : ''}</span>`;
}
export const go = (h) => { location.hash = h; };
export const back = (fallback = '#/') => { if (history.length > 1) history.back(); else go(fallback); };
// http(s) 만 링크로 허용 (javascript: 등 차단)
export function safeUrl(u) { try { const x = new URL(String(u || '')); return ['http:', 'https:'].includes(x.protocol) ? x.href : null; } catch { return null; } }
export const PRIO_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };
export const FORMATS = ['JPG', 'PNG', 'PDF', 'AI', 'PSD', '인쇄용 PDF', 'MP4', 'GIF'];
// 회사 의뢰서 양식의 참고사항(수정 정책) — 의뢰서 하단 고정 안내
export const POLICY = [
  '수정 가능 횟수는 2회입니다. 이후 문구·정보의 변경, 오탈자에 대한 간단한 정보수정은 가능합니다.',
  '수정 횟수는 1회의 수정사항을 모두 합쳐 수정 후 1회 처리합니다.',
  '수정의 범위는 삽입된 이미지·텍스트·수정(오탈자 등)에 한합니다.',
  '완전히 새로운 디자인으로 변경 시 수정이 아닌 "재제작"으로 분류되며 비용이 발생할 수 있습니다.',
  '원본파일(psd)은 라이선스(폰트·이미지 등)로 인해 제공하지 않습니다.',
];
export const statusText = (s) => `<span class="status-txt st-${s}">${STATUS[s]?.[0] || s}</span>`;
export function toast(msg, err) {
  const t = document.getElementById('toast'); const d = document.createElement('div');
  d.textContent = msg; if (err) d.className = 'err'; t.appendChild(d); setTimeout(() => d.remove(), err ? 6000 : 3200);
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const on = (sel, ev, fn, root = document) => $$(sel, root).forEach((el) => el.addEventListener(ev, fn));
export const v = (id, root = document) => $('#' + id, root)?.value?.trim() ?? '';

// 단계 표시줄: 작성 → 승인 → 작업 → 완료
export function stepper(status) {
  const steps = ['작성', '승인', '작업', '완료'];
  const idx = { draft: 0, revision: 0, submitted: 1, approved: 2, in_progress: 2, done: 3 }[status];
  if (idx === undefined) return `<div class="stepper ended">${chip(status)}<span class="muted">이 의뢰는 종료되었습니다.</span></div>`;
  const cur = status === 'submitted' ? 1 : status === 'approved' ? 2 : idx;
  return `<ol class="stepper">${steps.map((s, i) => `<li class="${i < idx || status === 'done' ? 'done' : i === cur ? 'cur' : ''}"><b>${i + 1}</b>${s}</li>`).join('')}</ol>`;
}

// 모달
export function dialog({ title, body, ok = '확인', danger = false, onOk }) {
  $('dialog')?.remove();
  const d = document.createElement('dialog');
  d.innerHTML = `<form><div class="hd"><h2>${title}</h2></div><div class="bd">${body}</div>
    <div class="ft"><button class="btn" type="button" id="dc">닫기</button><button class="btn ${danger ? 'dan' : 'pri'}" type="submit" id="dok">${ok}</button></div></form>`;
  document.body.appendChild(d); d.showModal();
  $('#dc', d).onclick = () => d.close();
  d.addEventListener('close', () => d.remove());
  $('form', d).onsubmit = async (ev) => { ev.preventDefault(); const b = $('#dok', d); b.disabled = true; try { await onOk(d); d.close(); } catch (e) { toast(errText(e), true); b.disabled = false; } };
  setTimeout(() => $('input,textarea,select', d)?.focus(), 30);
  return d;
}
export const confirmDialog = (title, msg, onOk) => dialog({ title, body: `<p>${esc(msg)}</p>`, ok: '확인', danger: true, onOk });
export const field = (label, inner, { req = false, hint = '' } = {}) => `<div class="field"><label>${label}${req ? '<i>*</i>' : ''}</label>${inner}${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
