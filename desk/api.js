// 데이터 계층. live = Supabase(RLS + RPC), demo = 메모리 샘플(로그인 없이 화면 점검용, ?demo=1)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const C = window.DESK_CONFIG;
export const isDemo = new URLSearchParams(location.search).has('demo');

function thrower({ data, error }) { if (error) throw error; return data; }

// ---------------------------------------------------------------- live
function live() {
  const sb = createClient(C.supabaseUrl, C.supabaseAnonKey);
  const q = (p) => p.then(thrower);
  const rpc = (n, a) => sb.rpc(n, a).then(thrower);
  return {
    sb,
    auth: {
      onChange: (fn) => sb.auth.onAuthStateChange(fn),
      session: async () => (await sb.auth.getSession()).data.session,
      signIn: (email, password) => sb.auth.signInWithPassword({ email, password }).then(thrower),
      signOut: () => sb.auth.signOut(),
      reset: (email) => sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(thrower),
      setPassword: (password) => sb.auth.updateUser({ password }).then(thrower),
    },
    profile: (id) => sb.from('profiles').select('*').eq('id', id).maybeSingle().then(thrower),
    profiles: () => q(sb.from('profiles').select('id,name,email,role,is_admin,is_active,position').order('name')),
    itemTypes: () => q(sb.from('item_types').select('*').order('sort')),
    clients: () => q(sb.from('clients').select('*').order('name')),
    requests: (filter = {}) => {
      let b = sb.from('requests').select('*').order('updated_at', { ascending: false }).limit(2000); // 함 카운트 정확도: 2,000건 넘으면 집계 RPC 로 전환 (decisions-4)
      if (filter.statuses) b = b.in('status', filter.statuses);
      if (filter.client_id) b = b.eq('client_id', filter.client_id);
      return q(b);
    },
    request: (id) => q(sb.from('requests').select('*').eq('id', id).single()),
    files: (id) => q(sb.from('request_files').select('*').eq('request_id', id).order('created_at')),
    comments: (id) => q(sb.from('request_comments').select('*').eq('request_id', id).order('created_at')),
    events: (id) => q(sb.from('request_events').select('*').eq('request_id', id).order('created_at')),
    create: (kind) => rpc('request_create', { p_kind: kind }),
    save: (id, fields) => rpc('request_save', { p_id: id, p_fields: fields }),
    transition: (id, action, payload = {}) => rpc('request_transition', { p_id: id, p_action: action, p_payload: payload }),
    comment: (id, body) => rpc('comment_add', { p_request: id, p_body: body }),
    upload: async (requestId, kind, file) => {
      const res = await rpc('file_reserve', { p_request: requestId, p_kind: kind, p_file_name: file.name, p_size: file.size, p_mime: file.type || 'application/octet-stream' });
      const { error } = await sb.storage.from('request-files').upload(res.path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
      if (error) throw error;
      await rpc('file_confirm', { p_file: res.id });
    },
    deleteFile: async (f) => {
      const { error } = await sb.storage.from('request-files').remove([f.storage_path]);
      if (error) throw error; // 객체 삭제 실패 시 DB 행은 남겨 재시도 가능하게
      await rpc('file_delete', { p_file: f.id });
    },
    downloadUrl: async (f) => (await sb.storage.from('request-files').createSignedUrl(f.storage_path, 60, { download: f.file_name }).then(thrower)).signedUrl,
    clientInsert: (row) => q(sb.from('clients').insert(row).select().single()),
    clientUpdate: (id, row) => q(sb.from('clients').update(row).eq('id', id)),
    clientDelete: (id) => q(sb.from('clients').delete().eq('id', id)),
    setUser: (id, role, is_admin, is_active) => rpc('admin_set_user', { p_user: id, p_role: role, p_is_admin: is_admin, p_is_active: is_active }),
    itemUpdate: (id, row) => q(sb.from('item_types').update(row).eq('id', id)),
    itemInsert: (row) => q(sb.from('item_types').insert(row)),
    updateMe: (id, row) => q(sb.from('profiles').update(row).eq('id', id)),
  };
}

// ---------------------------------------------------------------- demo
function demo() {
  const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const ts = (n, h = 0) => new Date(Date.now() + n * 864e5 + h * 36e5).toISOString();
  const P = {
    staff: { id: 'u1', email: 'minji@company.kr', name: '김민지', position: '마케팅팀 대리', role: 'requester', is_admin: false, is_active: true },
    boss: { id: 'u2', email: 'ceo@company.kr', name: '박대표', position: '대표', role: 'approver', is_admin: true, is_active: true },
    designer: { id: 'u3', email: 'design@company.kr', name: '이디자', position: '디자이너', role: 'designer', is_admin: true, is_active: true },
    staff2: { id: 'u4', email: 'junho@company.kr', name: '최준호', position: '영업팀', role: 'requester', is_admin: false, is_active: true },
  };
  let who = localStorage.getItem('demo_role') || 'staff';
  const profiles = Object.values(P);
  const itemTypes = [
    { id: 1, code: 'detail_page', label: '상세페이지', sort: 10, default_sizes: ['860px 폭', '1000px 폭'], is_active: true },
    { id: 9, code: 'photo', label: '촬영', sort: 15, default_sizes: [], is_active: true },
    { id: 2, code: 'thumbnail', label: '썸네일', sort: 20, default_sizes: ['1000x1000', '500x500'], is_active: true },
    { id: 3, code: 'banner', label: '배너', sort: 30, default_sizes: ['1920x600', '1200x400'], is_active: true },
    { id: 4, code: 'sns', label: 'SNS 게시물', sort: 40, default_sizes: ['1080x1080', '1080x1350'], is_active: true },
    { id: 5, code: 'print', label: '인쇄물', sort: 50, default_sizes: ['A4', 'A5', '명함 90x50mm'], is_active: true },
    { id: 6, code: 'package', label: '패키지', sort: 60, default_sizes: [], is_active: true },
    { id: 7, code: 'logo', label: '로고/BI', sort: 70, default_sizes: [], is_active: true },
    { id: 8, code: 'other', label: '기타', sort: 999, default_sizes: [], is_active: true },
  ];
  const clients = [
    { id: 1, name: '(주)그린라이프', ceo_name: '정수진', contact_name: '한지원', contact_position: '과장', contact_phone: '010-1234-5678', contact_email: 'jw@greenlife.kr', memo: '친환경 생활용품. 톤앤매너 밝고 자연스럽게', created_by: 'u1', created_at: ts(-40), updated_at: ts(-40) },
    { id: 2, name: '모던키친', ceo_name: '오세훈', contact_name: '김나래', contact_position: '팀장', contact_email: 'narae@modernkitchen.co.kr', memo: '', created_by: 'u4', created_at: ts(-30), updated_at: ts(-30) },
    { id: 3, name: '루나코스메틱', ceo_name: '이하늘', contact_name: '박서연', contact_position: '대리', contact_email: 'sy@luna.kr', memo: '핑크 계열 금지(브랜드 가이드)', created_by: 'u1', created_at: ts(-12), updated_at: ts(-12) },
  ];
  const R = (o) => ({ kind: 'client', client_id: null, item_type_other: null, product_name: null, size_spec: null, product_features: null, required_copy: null, notes: null, requested_due: null, objective: null, target_audience: null, tone_style: null, deliverable_format: null, needs_photo: false, confirmed_due: null, priority: 'normal', approver_id: null, designer_id: null, deliverable_url: null, submitted_at: null, decided_at: null, started_at: null, completed_at: null, ...o });
  let requests = [
    R({ id: 'r1', no: 'DR-2026-0012', title: '그린라이프 대나무 칫솔 상세페이지', client_id: 1, item_type_id: 1, product_name: '대나무 칫솔 4입', purpose: '자사몰·스마트스토어 상품 상세', size_spec: '860px 폭', product_features: '① 생분해 대나무 손잡이\n② 미세모로 잇몸 보호\n③ 4개 묶음 가성비 구성\n④ 플라스틱 프리 포장', required_copy: '"플라스틱 프리" 문구 필수', notes: '기존 상세페이지 톤 참고', objective: '기존 상세페이지 전환율 개선. 친환경 메시지를 첫 화면에서 전달', target_audience: '30대 여성, 친환경 생활용품에 관심 있는 1인 가구', tone_style: '밝고 자연스러운 톤, 베이지·그린 계열, 사진 위주', deliverable_format: 'JPG, PSD', needs_photo: true, requested_due: day(7), status: 'submitted', requester_id: 'u1', submitted_at: ts(-1), created_at: ts(-2), updated_at: ts(-1) }),
    R({ id: 'r2', no: 'DR-2026-0011', title: '모던키친 가을 프로모션 배너', client_id: 2, item_type_id: 3, product_name: '에어프라이어 7L', purpose: '네이버 브랜드스토어 메인 배너', size_spec: '1920x600', product_features: '20% 할인, 9/30까지', required_copy: '할인 기간 명시', requested_due: day(3), confirmed_due: day(4), priority: 'high', status: 'in_progress', requester_id: 'u4', approver_id: 'u2', designer_id: 'u3', submitted_at: ts(-4), decided_at: ts(-3), started_at: ts(-2), created_at: ts(-5), updated_at: ts(-2) }),
    R({ id: 'r3', no: 'DR-2026-0010', title: '루나 립밤 SNS 런칭 카드뉴스', client_id: 3, item_type_id: 4, product_name: '루나 틴티드 립밤', purpose: '인스타그램 피드 5장', size_spec: '1080x1350', requested_due: day(10), confirmed_due: day(9), priority: 'normal', status: 'approved', requester_id: 'u1', approver_id: 'u2', submitted_at: ts(-3), decided_at: ts(-1, 3), created_at: ts(-3), updated_at: ts(-1, 3) }),
    R({ id: 'r4', no: 'DR-2026-0009', title: '사내 워크숍 안내 포스터', kind: 'internal', item_type_id: 5, purpose: '10월 워크숍 안내, 사무실 게시', size_spec: 'A4', requested_due: day(14), status: 'revision', requester_id: 'u1', approver_id: 'u2', submitted_at: ts(-2), decided_at: ts(-1), created_at: ts(-2), updated_at: ts(-1) }),
    R({ id: 'r5', no: 'DR-2026-0008', title: '그린라이프 명함 리뉴얼', client_id: 1, item_type_id: 5, purpose: '담당자 명함 5종', size_spec: '명함 90x50mm', requested_due: day(-3), confirmed_due: day(-2), status: 'done', requester_id: 'u4', approver_id: 'u2', designer_id: 'u3', deliverable_url: 'https://drive.example.com/greenlife-namecard', submitted_at: ts(-12), decided_at: ts(-11), started_at: ts(-9), completed_at: ts(-2), created_at: ts(-12), updated_at: ts(-2) }),
    R({ id: 'r6', title: '루나 신제품 썸네일 (작성중)', client_id: 3, item_type_id: 2, status: 'draft', requester_id: 'u1', created_at: ts(0, -2), updated_at: ts(0, -1) }),
    R({ id: 'r7', no: 'DR-2026-0007', title: '모던키친 카탈로그 표지', client_id: 2, item_type_id: 5, purpose: '오프라인 카탈로그', requested_due: day(1), confirmed_due: day(1), priority: 'urgent', status: 'in_progress', requester_id: 'u4', approver_id: 'u2', designer_id: 'u3', submitted_at: ts(-8), decided_at: ts(-7), started_at: ts(-6), created_at: ts(-8), updated_at: ts(-6) }),
    R({ id: 'r8', no: 'DR-2026-0006', title: '전 직원 단체 티셔츠', kind: 'internal', item_type_id: 8, item_type_other: '의류 프린팅', purpose: '체육대회용', status: 'rejected', requester_id: 'u4', approver_id: 'u2', submitted_at: ts(-15), decided_at: ts(-14), created_at: ts(-15), updated_at: ts(-14) }),
  ];
  let files = [
    { id: 'f1', request_id: 'r1', kind: 'reference', storage_path: 'r1/f1', file_name: '기존_상세페이지.pdf', size_bytes: 2_400_000, mime: 'application/pdf', upload_state: 'ready', uploaded_by: 'u1', created_at: ts(-2) },
    { id: 'f2', request_id: 'r1', kind: 'reference', storage_path: 'r1/f2', file_name: '제품사진_4종.zip', size_bytes: 38_000_000, mime: 'application/zip', upload_state: 'ready', uploaded_by: 'u1', created_at: ts(-2) },
    { id: 'f3', request_id: 'r2', kind: 'deliverable', storage_path: 'r2/f3', file_name: '가을배너_v1.png', size_bytes: 1_200_000, mime: 'image/png', upload_state: 'ready', uploaded_by: 'u3', created_at: ts(-1) },
    { id: 'f4', request_id: 'r5', kind: 'deliverable', storage_path: 'r5/f4', file_name: '명함_최종.ai', size_bytes: 5_100_000, mime: 'application/postscript', upload_state: 'ready', uploaded_by: 'u3', created_at: ts(-2) },
  ];
  let comments = [
    { id: 1, request_id: 'r2', author_id: 'u3', body: '할인 문구를 상단에 크게 넣을까요, 우측 하단 뱃지로 할까요?', created_at: ts(-1, 2) },
    { id: 2, request_id: 'r2', author_id: 'u4', body: '상단 크게 부탁드려요. 배경은 첨부한 사진 톤으로요.', created_at: ts(-1, 3) },
    { id: 3, request_id: 'r4', author_id: 'u2', body: '날짜와 장소가 빠졌어요. 참고사항에 넣어주세요.', created_at: ts(-1) },
  ];
  let events = [
    { id: 1, request_id: 'r1', actor_id: 'u1', action: 'create', to_status: 'draft', created_at: ts(-2) },
    { id: 2, request_id: 'r1', actor_id: 'u1', action: 'submit', from_status: 'draft', to_status: 'submitted', created_at: ts(-1) },
    { id: 3, request_id: 'r2', actor_id: 'u4', action: 'submit', from_status: 'draft', to_status: 'submitted', created_at: ts(-4) },
    { id: 4, request_id: 'r2', actor_id: 'u2', action: 'approve', from_status: 'submitted', to_status: 'approved', note: '가을 시즌이라 급합니다', payload: { priority: { from: 'normal', to: 'high' }, confirmed_due: { from: null, to: day(4) } }, created_at: ts(-3) },
    { id: 5, request_id: 'r2', actor_id: 'u3', action: 'start', from_status: 'approved', to_status: 'in_progress', created_at: ts(-2) },
    { id: 6, request_id: 'r2', actor_id: 'u3', action: 'comment', note: '할인 문구를 상단에 크게 넣을까요…', created_at: ts(-1, 2) },
    { id: 7, request_id: 'r4', actor_id: 'u1', action: 'submit', from_status: 'draft', to_status: 'submitted', created_at: ts(-2) },
    { id: 8, request_id: 'r4', actor_id: 'u2', action: 'request_revision', from_status: 'submitted', to_status: 'revision', note: '날짜와 장소가 빠졌어요.', created_at: ts(-1) },
  ];
  let seq = 13, evId = 100, cmId = 10;
  const meP = () => P[who];
  const now = () => new Date().toISOString();
  const ev = (rid, action, from, to, note, payload) => events.push({ id: evId++, request_id: rid, actor_id: meP().id, action, from_status: from, to_status: to, note, payload, created_at: now() });
  const find = (id) => { const r = requests.find((x) => x.id === id); if (!r) throw new Error('not found'); return r; };
  const delay = (v) => new Promise((res) => setTimeout(() => res(v), 60));
  const listeners = [];
  return {
    demo: true,
    roles: { staff: '직원', boss: '대표', designer: '디자이너' },
    who: () => who,
    switchRole: (k) => { who = k; localStorage.setItem('demo_role', k); listeners.forEach((f) => f('SIGNED_IN')); },
    auth: {
      onChange: (fn) => listeners.push(fn),
      session: async () => ({ user: { id: meP().id, email: meP().email } }),
      signIn: async () => {}, signOut: async () => listeners.forEach((f) => f('SIGNED_OUT')), reset: async () => {}, setPassword: async () => {},
    },
    profile: async () => ({ ...meP() }),
    profiles: async () => profiles.map((p) => ({ ...p })),
    itemTypes: async () => itemTypes.map((t) => ({ ...t })),
    clients: async () => clients.map((c) => ({ ...c })),
    requests: async (filter = {}) => delay(requests.filter((r) => (r.requester_id === meP().id || (meP().role !== 'requester' && r.status !== 'draft')) && (!filter.statuses || filter.statuses.includes(r.status)) && (!filter.client_id || r.client_id == filter.client_id)).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)).map((r) => ({ ...r }))),
    request: async (id) => delay({ ...find(id) }),
    files: async (id) => files.filter((f) => f.request_id === id).map((f) => ({ ...f })),
    comments: async (id) => comments.filter((c) => c.request_id === id).map((c) => ({ ...c })),
    events: async (id) => events.filter((e) => e.request_id === id).map((e) => ({ ...e })),
    create: async (kind) => { const id = 'r' + Date.now(); requests.push(R({ id, no: null, kind, title: null, item_type_id: null, purpose: null, status: 'draft', requester_id: meP().id, created_at: now(), updated_at: now() })); ev(id, 'create', null, 'draft'); return id; },
    save: async (id, f) => { const r = find(id); Object.assign(r, f, { updated_at: now() }); if (r.kind === 'internal') r.client_id = null; },
    transition: async (id, a, p = {}) => {
      const r = find(id); const from = r.status; const note = p.note || null;
      const need = (c, m) => { if (!c) throw new Error(m); };
      if (a === 'submit' || a === 'resubmit') { need(r.title && r.item_type_id && r.purpose, 'required: title, item_type, purpose'); need(r.kind !== 'client' || r.client_id, 'required: client'); r.status = 'submitted'; r.no ||= 'DR-2026-' + String(seq++).padStart(4, '0'); r.submitted_at = now(); }
      else if (a === 'cancel') r.status = 'cancelled';
      else if (a === 'approve') { need(p.confirmed_due, 'required: confirmed_due'); r.status = 'approved'; r.priority = p.priority || r.priority; r.confirmed_due = p.confirmed_due; r.approver_id = meP().id; r.decided_at = now(); }
      else if (a === 'request_revision' || a === 'reject') { need(note, 'required: note'); r.status = a === 'reject' ? 'rejected' : 'revision'; r.approver_id = meP().id; r.decided_at = now(); }
      else if (a === 'update_terms') { r.priority = p.priority || r.priority; r.confirmed_due = p.confirmed_due || r.confirmed_due; }
      else if (a === 'start') { r.status = 'in_progress'; r.designer_id = meP().id; r.started_at = now(); }
      else if (a === 'complete') { if (p.deliverable_url) r.deliverable_url = p.deliverable_url; need(r.deliverable_url || files.some((f) => f.request_id === id && f.kind === 'deliverable'), 'required: deliverable'); r.status = 'done'; r.completed_at = now(); }
      r.updated_at = now(); ev(id, a, from, r.status, note, a === 'approve' || a === 'update_terms' ? { priority: { to: r.priority }, confirmed_due: { to: r.confirmed_due } } : null);
      return { ...r };
    },
    comment: async (id, body) => { comments.push({ id: cmId++, request_id: id, author_id: meP().id, body, created_at: now() }); ev(id, 'comment', null, null, body.slice(0, 200)); },
    upload: async (rid, kind, file) => { files.push({ id: 'f' + Date.now() + Math.random(), request_id: rid, kind, storage_path: rid + '/x', file_name: file.name, size_bytes: file.size, mime: file.type, upload_state: 'ready', uploaded_by: meP().id, created_at: now() }); },
    deleteFile: async (f) => { files = files.filter((x) => x.id !== f.id); },
    downloadUrl: async () => 'about:blank',
    clientInsert: async (row) => { const c = { id: clients.length + 1, ...row, created_at: now(), updated_at: now() }; clients.push(c); return c; },
    clientUpdate: async (id, row) => Object.assign(clients.find((c) => c.id == id), row),
    clientDelete: async (id) => { const i = clients.findIndex((c) => c.id == id); if (i >= 0) clients.splice(i, 1); },
    setUser: async (id, role, is_admin, is_active) => Object.assign(profiles.find((p) => p.id === id), { role, is_admin, is_active }),
    itemUpdate: async (id, row) => Object.assign(itemTypes.find((t) => t.id == id), row),
    itemInsert: async (row) => itemTypes.push({ id: itemTypes.length + 1, is_active: true, sort: 500, default_sizes: [], ...row }),
    updateMe: async (id, row) => Object.assign(profiles.find((p) => p.id === id), row),
  };
}

export const api = isDemo ? demo() : live();
