// 개인 업무 통합 관리 페이지 (/me)
// API_BASE 는 ../assets/js/common.js 에서 정의됨

const STATE = {
  tab: "dashboard",          // dashboard | inbox | tasks | projects | calendar | gantt | daily
  view: "list",              // tasks 안의 list | kanban
  inboxFilter: "active",     // active | processed
  filterCategory: null,
  search: "",
  sort: "created_desc",

  tasks: [],
  categories: [],
  projects: [],
  inbox: [],
  dailyLogs: [],
  snippets: [],              // 전달함 — 코드 브릿지 (지연 로드)
  snippetsLoaded: false,
  editingSnippetId: null,
  snippetKind: "single",     // 모달 내 종류 토글: single | tb4
  snipExpanded: {},          // 펼친 카드 { id: true } — 기본 접힘
  snipShown: 15,             // 목록 표시 개수 (더 보기로 증가)

  // Phase 6d: AI 분류 제안 { inbox_id: {suggested_title, suggested_category, suggested_priority, suggested_tags, cached} }
  inboxSuggestions: {},
  aiBusy: false,

  // AI (Phase 5)
  aiEnabled: null,           // null=unknown, true/false 후 자동 분기
  aiExtract: null,           // { id, extract, promoted, dismissed }
  aiAnalyzing: false,
  aiEditing: null,           // 편집 중인 추출 항목 "kind:index" 또는 null
  smartSearching: false,

  editingTaskId: null,
  editingProjectId: null,
  promotingInboxId: null,
  detailProjectId: null,     // 프로젝트 상세 페이지에서 보고 있는 프로젝트
  pdView: "list",            // 프로젝트 상세 작업 뷰: list | timeline

  // Calendar
  calCursor: null,           // Date — 표시 중인 달 (1일 기준)

  // Gantt
  ganttCellW: 32,            // 1일 픽셀

  // Daily Log
  dailyDate: null,           // YYYY-MM-DD
  dailyDirty: false,
  dailySaving: false,
  dailySearch: "",

  // Phase 7a: Briefing
  briefing: null,            // {today, text, numbers, ai_enabled, cached, generated_at}
  briefingLoading: false,

  // Phase 7e: Feedback tag filter (when clicking count chip)
  inboxTagFilter: null,      // null | "friction" | "unused" | "automate" | "repeat"
};

// Phase 7e — feedback tags
const FEEDBACK_TAGS = [
  { tag: "friction",  desc: "어색한 점 / 막히는 부분" },
  { tag: "unused",    desc: "안 쓰는 기능" },
  { tag: "automate",  desc: "자동화 후보" },
  { tag: "repeat",    desc: "반복 입력하는 것" },
];
const FEEDBACK_BANNER_START_KEY = "me_feedback_banner_start";
const FEEDBACK_BANNER_DAYS = 7;

const STATUS_LABEL = {
  todo: "할 일",
  in_progress: "진행 중",
  waiting: "대기",
  done: "완료",
};
const PRIORITY_LABEL = { high: "높음", medium: "보통", low: "낮음" };
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const PROJECT_STATUS_LABEL = {
  active: "진행 중",
  paused: "일시정지",
  done: "완료",
  dropped: "중단",
};
const COLOR_FALLBACK = "#6366f1";

// 이 페이지에서 표시할 이름 — 인증 character_name 과 별개인 업무용 닉네임
const OWNER_NAME = "Jett";

// ── 부팅 ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const user = getUser();
  if (!user || !getToken()) {
    document.getElementById("loginGate").hidden = false;
    return;
  }
  document.getElementById("app").hidden = false;
  document.getElementById("userChip").textContent = OWNER_NAME;

  STATE.calCursor = startOfMonth(new Date());
  STATE.dailyDate = todayStr();

  bindEvents();
  bindCmdk();
  bindQuickMemo();
  bindTagSuggest();
  bindPrivacy();
  bindSnippets();
  refreshAll();

  // Phase 7a: 첫 로드 시 브리핑
  loadBriefing(false);
  // Phase 7e: 피드백 배너
  refreshFeedbackBanner();
  // Phase 8: AI 사용량 위젯
  loadAiUsage(false);
});

// ── 통신 ──────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: authHeaders() };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401) {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    location.reload();
    throw new Error("로그인이 만료됐습니다");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `요청 실패 (${res.status})`);
  }
  return data;
}

async function refreshAll() {
  try {
    const dash = await api("GET", "/api/me/dashboard");
    STATE.tasks = dash.tasks || [];
    STATE.categories = dash.categories || [];
    STATE.projects = dash.projects || [];
    STATE.inbox = dash.inbox || [];
    STATE.dailyLogs = dash.daily_logs || [];
    renderAll();
  } catch (e) {
    showToast(e.message, true);
  }
}

async function refreshProjectsOnly() {
  try {
    STATE.projects = await api("GET", "/api/me/projects");
    renderAll();
  } catch (e) { showToast(e.message, true); }
}

async function refreshInboxOnly() {
  try {
    const list = await api(
      "GET",
      `/api/me/inbox?processed=${STATE.inboxFilter === "processed"}`
    );
    STATE.inbox = list;
    renderAll();
  } catch (e) { showToast(e.message, true); }
}

async function refreshDailyLogsList() {
  try {
    const today = new Date();
    const start = new Date(today.getTime() - 90 * 24 * 3600 * 1000);
    STATE.dailyLogs = await api(
      "GET",
      `/api/me/daily-logs?start=${dateOnly(start)}&end=${dateOnly(today)}&limit=120`
    );
    renderDailyList();
  } catch (e) { showToast(e.message, true); }
}

// ── 탭 전환 ──────────────────────────────────────────────
function setTab(name) {
  STATE.tab = name;
  STATE.detailProjectId = null;   // 탭 이동 시 프로젝트 상세 해제
  document.querySelectorAll(".nav-tab").forEach(b => {
    const active = b.dataset.tab === name;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".page").forEach(p => p.hidden = true);
  const map = {
    dashboard: "pageDashboard",
    inbox: "pageInbox",
    tasks: "pageTasks",
    projects: "pageProjects",
    calendar: "pageCalendar",
    gantt: "pageGantt",
    daily: "pageDaily",
    snippets: "pageSnippets",
    english: "pageEnglish",
  };
  const page = document.getElementById(map[name]);
  if (page) page.hidden = false;

  // FAB 는 tasks 탭에서만 보이게
  document.getElementById("newTaskBtn").hidden = name !== "tasks";

  // 탭별 진입 시 렌더
  if (name === "dashboard") renderDashboard();
  else if (name === "inbox") renderInbox();
  else if (name === "tasks") renderTasks();
  else if (name === "projects") {
    renderProjects();
    refreshProjectsOnly();
  }
  else if (name === "calendar") renderCalendar();
  else if (name === "gantt") renderGantt();
  else if (name === "daily") {
    renderDailyEditor();
    refreshDailyLogsList();
  }
  else if (name === "snippets") {
    renderSnippets();
    loadSnippets();
  }
  else if (name === "english") renderEnglish();

  window.scrollTo({ top: 0, behavior: "instant" });
}

// ── 전체 렌더 ───────────────────────────────────────────
function renderAll() {
  renderCategoryOptions();
  renderProjectOptions();
  // 프로젝트 상세 페이지가 열려있으면 그걸 갱신
  const detailPage = document.getElementById("pageProjectDetail");
  if (STATE.detailProjectId && detailPage && !detailPage.hidden) {
    renderProjectDetail();
    return;
  }
  if (STATE.tab === "dashboard") renderDashboard();
  else if (STATE.tab === "inbox") renderInbox();
  else if (STATE.tab === "tasks") renderTasks();
  else if (STATE.tab === "projects") renderProjects();
  else if (STATE.tab === "calendar") renderCalendar();
  else if (STATE.tab === "gantt") renderGantt();
  else if (STATE.tab === "daily") renderDailyEditor();
  else if (STATE.tab === "snippets") renderSnippets();
  else if (STATE.tab === "english") renderEnglish();
}

// ════════════════════════════════════════════════════════
// 1) DASHBOARD
// ════════════════════════════════════════════════════════
function renderDashboard() {
  renderHero();
  const today = startOfDay(new Date());
  const todayMs = today.getTime();
  const day = 24 * 3600 * 1000;

  const tasksOpen = STATE.tasks.filter(t => t.status !== "done");

  const tasksToday = tasksOpen.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date + "T00:00:00").getTime();
    return d <= todayMs; // 오늘 + overdue
  });

  const tasksUpcoming = tasksOpen
    .filter(t => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date + "T00:00:00").getTime();
      const diff = Math.round((d - todayMs) / day);
      return diff > 0 && diff <= 3;
    });

  const tasksWeek = tasksOpen
    .filter(t => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date + "T00:00:00").getTime();
      const diff = Math.round((d - todayMs) / day);
      return diff >= 0 && diff <= 7;
    })
    .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));

  const projectsActive = STATE.projects.filter(p => p.status === "active");

  fillWidget(
    "dashToday", "dashTodayCount", tasksToday.length,
    tasksToday.map(t => dashTaskRow(t)),
    "오늘 할 일이 없습니다 🌿"
  );
  fillWidget(
    "dashUpcoming", "dashUpcomingCount", tasksUpcoming.length,
    tasksUpcoming.map(t => dashTaskRow(t)),
    "곧 마감되는 일이 없습니다."
  );
  fillWidget(
    "dashWeek", "dashWeekCount", tasksWeek.length,
    tasksWeek.map(t => dashTaskRow(t)),
    "이번 주 일정이 없습니다."
  );
  fillWidget(
    "dashProjects", "dashProjectsCount", projectsActive.length,
    projectsActive.map(p => dashProjectRow(p)),
    "진행 중인 프로젝트가 없습니다."
  );
  fillWidget(
    "dashLogs", null, null,
    STATE.dailyLogs.slice(0, 5).map(l => dashLogRow(l)),
    "아직 작성한 로그가 없어요."
  );

  // Dashboard click 핸들러
  document.querySelectorAll("#dashToday .dash-item, #dashUpcoming .dash-item, #dashWeek .dash-item")
    .forEach(el => el.addEventListener("click", () => {
      setTab("tasks");
      setTimeout(() => openTaskModal(Number(el.dataset.id)), 50);
    }));
  document.querySelectorAll("#dashProjects .dash-project")
    .forEach(el => el.addEventListener("click", () => {
      setTab("projects");
      setTimeout(() => openProjectModal(Number(el.dataset.id)), 50);
    }));
  document.querySelectorAll("#dashLogs .dash-log")
    .forEach(el => el.addEventListener("click", () => {
      STATE.dailyDate = el.dataset.date;
      setTab("daily");
    }));

  // 오늘의 영어 위젯
  renderDashEnglish();

  // Phase 7e: 피드백 카운트 위젯 갱신
  renderFeedbackCounts();
}

function renderDashEnglish() {
  const body = document.getElementById("dashEnglish");
  if (!body) return;
  const ex = EXPRESSIONS[engDayIndex()];
  const done = engData().done.includes(todayStr());
  const streakEl = document.getElementById("dashEngStreak");
  if (streakEl) streakEl.textContent = "🔥 " + engStreakCount() + "일";
  body.innerHTML = `
    <div class="dash-eng">
      <div class="dash-eng-en">${escapeHtml(ex.en)}</div>
      <div class="dash-eng-ko">${escapeHtml(ex.ko)}</div>
      <div class="dash-eng-note">${escapeHtml(ex.note)}</div>
      <div class="dash-eng-actions">
        <button class="btn btn-outline btn-sm" id="dashEngSpeak" type="button">🔊 발음</button>
        <button class="btn ${done ? "btn-outline" : "btn-primary"} btn-sm" id="dashEngDone" type="button" ${done ? "disabled" : ""}>
          ${done ? "✓ 오늘 완료" : "학습 완료"}
        </button>
      </div>
    </div>`;
  const sp = document.getElementById("dashEngSpeak");
  if (sp) sp.addEventListener("click", () => engSpeak(ex.en));
  const dn = document.getElementById("dashEngDone");
  if (dn && !done) dn.addEventListener("click", markEnglishDone);
}

function fillWidget(bodyId, countId, count, items, emptyMsg) {
  const body = document.getElementById(bodyId);
  if (countId) {
    const c = document.getElementById(countId);
    if (c) c.textContent = count ?? items.length;
  }
  if (!items.length) {
    body.innerHTML = `<div class="widget-empty">${emptyMsg || "비어있어요."}</div>`;
  } else {
    body.innerHTML = items.join("");
  }
}

function dashTaskRow(t) {
  const cat = STATE.categories.find(c => c.name === t.category);
  const dot = cat ? `<span class="di-cat-dot" style="background:${escapeAttr(cat.color)}"></span>` : "";
  const due = dueDisplay(t.due_date);
  const dueClass = due.urgency ? `is-${due.urgency}` : "";
  return `<div class="dash-item" data-id="${t.id}">
    ${dot}
    <span class="di-title">${escapeHtml(t.title)}</span>
    <span class="di-due ${dueClass}">${due.label}</span>
  </div>`;
}

function dashProjectRow(p) {
  const pct = (p.progress_pct ?? 0) > 0 ? p.progress_pct : (p.computed_progress ?? 0);
  const dd = dDayInfo(p.end_date);
  return `<div class="dash-project" data-id="${p.id}">
    <div class="dp-name">
      <span class="dp-color-dot" style="background:${escapeAttr(p.color || COLOR_FALLBACK)}"></span>
      ${escapeHtml(p.name)}
      ${dd ? `<span class="pc-dday pc-dday-sm ${dd.urgency}">${dd.label}</span>` : ""}
    </div>
    <div class="dp-bar">
      <div class="dp-fill" style="width:${pct}%;background:${escapeAttr(p.color || COLOR_FALLBACK)}"></div>
    </div>
    <div class="dp-meta">
      <span>${pct}%</span>
      <span>${p.done_count ?? 0} / ${p.task_count ?? 0} 완료</span>
    </div>
  </div>`;
}

function dashLogRow(l) {
  const date = formatDateLong(l.log_date);
  return `<div class="dash-log" data-date="${escapeAttr(l.log_date)}">
    <div class="dl-date">${date}</div>
    <div class="dl-preview">${escapeHtml(l.content || "(빈 로그)")}</div>
  </div>`;
}

// ════════════════════════════════════════════════════════
// 2) INBOX
// ════════════════════════════════════════════════════════
function renderInbox() {
  document.querySelectorAll(".inbox-tab").forEach(b => {
    b.classList.toggle("is-active", b.dataset.inboxTab === STATE.inboxFilter);
  });
  // AI 바: 미처리 탭 + 항목 1개 이상일 때만 노출
  const aiBar = document.getElementById("inboxAiBar");
  if (aiBar) {
    const showBar = STATE.inboxFilter === "active" && STATE.inbox.length > 0;
    aiBar.hidden = !showBar;
    if (showBar) {
      const btn = document.getElementById("inboxAiBtn");
      const noSugCount = STATE.inbox.filter(i => !STATE.inboxSuggestions[i.id]).length;
      if (btn) {
        const lbl = btn.querySelector(".btn-ai-label");
        if (lbl) lbl.textContent = noSugCount > 0
          ? `AI로 정리 (${noSugCount}개)`
          : "전부 분석됨";
        btn.disabled = STATE.aiBusy || noSugCount === 0;
      }
    }
  }
  const list = document.getElementById("inboxList");

  // Phase 7e: 피드백 태그 필터 적용
  let items = STATE.inbox;
  if (STATE.inboxTagFilter) {
    const re = new RegExp(`#${STATE.inboxTagFilter}\\b`, "i");
    items = items.filter(i => re.test(i.content || ""));
  }

  if (!items.length) {
    const filterMsg = STATE.inboxTagFilter
      ? `<div class="widget-empty">#${escapeHtml(STATE.inboxTagFilter)} 태그가 붙은 메모가 없어요.
           <br><button class="btn btn-outline" id="inboxFilterClearBtn" style="margin-top:8px;">필터 해제</button></div>`
      : `<div class="widget-empty">${
          STATE.inboxFilter === "active"
            ? "받은 메모가 비어있어요. 위 입력창에 떠오르는 대로 적어두세요."
            : "처리된 메모가 없습니다."
        }</div>`;
    list.innerHTML = filterMsg;
    const clr = document.getElementById("inboxFilterClearBtn");
    if (clr) clr.addEventListener("click", () => { STATE.inboxTagFilter = null; renderInbox(); });
    return;
  }
  let header = "";
  if (STATE.inboxTagFilter) {
    header = `<div class="widget-empty" style="text-align:left; padding:8px 12px; margin-bottom:8px;">
      필터: <code style="color:#c7d2fe;">#${escapeHtml(STATE.inboxTagFilter)}</code> · ${items.length}건
      <button class="btn btn-outline" id="inboxFilterClearBtn" style="margin-left:12px; padding:2px 10px;">전체 보기</button>
    </div>`;
  }
  list.innerHTML = header + items.map(i => inboxItemHtml(i)).join("");
  const clr = document.getElementById("inboxFilterClearBtn");
  if (clr) clr.addEventListener("click", () => { STATE.inboxTagFilter = null; renderInbox(); });
  list.querySelectorAll("[data-action='delete']").forEach(btn => {
    btn.addEventListener("click", () => deleteInbox(Number(btn.dataset.id)));
  });
  list.querySelectorAll("[data-action='processed']").forEach(btn => {
    btn.addEventListener("click", () => toggleInboxProcessed(Number(btn.dataset.id), true));
  });
  list.querySelectorAll("[data-action='unprocess']").forEach(btn => {
    btn.addEventListener("click", () => toggleInboxProcessed(Number(btn.dataset.id), false));
  });
  list.querySelectorAll("[data-action='promote']").forEach(btn => {
    btn.addEventListener("click", () => openPromoteModal(Number(btn.dataset.id)));
  });
  list.querySelectorAll("[data-action='ai-classify-one']").forEach(btn => {
    btn.addEventListener("click", () => aiClassifyOne(Number(btn.dataset.id)));
  });
  list.querySelectorAll("[data-action='ai-apply']").forEach(btn => {
    btn.addEventListener("click", () => aiApplySuggestion(Number(btn.dataset.id)));
  });
  list.querySelectorAll("[data-action='ai-dismiss']").forEach(btn => {
    btn.addEventListener("click", () => aiDismissSuggestion(Number(btn.dataset.id)));
  });
}

function inboxItemHtml(i) {
  const ago = relativeTime(i.created_at);
  const processed = i.processed
    ? `<small>처리됨 · ${relativeTime(i.processed_at) || ""}</small>`
    : `<small>${ago}</small>`;
  const sug = !i.processed ? STATE.inboxSuggestions[i.id] : null;
  const actions = i.processed
    ? `
      <button class="ii-btn" data-action="unprocess" data-id="${i.id}">되돌리기</button>
      <button class="ii-btn is-danger" data-action="delete" data-id="${i.id}">삭제</button>
    `
    : `
      <button class="ii-btn is-primary" data-action="promote" data-id="${i.id}">할 일로</button>
      ${sug ? "" : `<button class="ii-btn" data-action="ai-classify-one" data-id="${i.id}" title="이 메모만 AI로 분류">✨ AI</button>`}
      <button class="ii-btn" data-action="processed" data-id="${i.id}">처리됨</button>
      <button class="ii-btn is-danger" data-action="delete" data-id="${i.id}">삭제</button>
    `;
  return `
    <div class="inbox-item ${i.processed ? "is-processed" : ""}">
      <div>
        <div class="ii-content">${escapeHtml(i.content)}</div>
        ${processed}
        ${sug ? aiSuggestionHtml(i, sug) : ""}
      </div>
      <div class="ii-actions">${actions}</div>
    </div>
  `;
}

function aiSuggestionHtml(inboxItem, sug) {
  const rows = [];
  if (sug.suggested_title && sug.suggested_title !== inboxItem.content) {
    rows.push(`<span class="ai-suggestion-row"><span class="ais-label">제목</span><span class="ais-val">${escapeHtml(sug.suggested_title)}</span></span>`);
  }
  if (sug.suggested_category) {
    const color = getCategoryColor(sug.suggested_category);
    rows.push(`<span class="ai-suggestion-row" style="border-color:${escapeAttr(color)};"><span class="ais-label">카테고리</span><span class="ais-val">${escapeHtml(sug.suggested_category)}</span></span>`);
  }
  if (sug.suggested_priority) {
    rows.push(`<span class="ai-suggestion-row"><span class="ais-label">우선순위</span><span class="ais-val">${priorityIcon(sug.suggested_priority)}${PRIORITY_LABEL[sug.suggested_priority] || sug.suggested_priority}</span></span>`);
  }
  if ((sug.suggested_tags || []).length) {
    rows.push(`<span class="ai-suggestion-row"><span class="ais-label">태그</span><span class="ais-val">${sug.suggested_tags.map(t => `#${escapeHtml(t)}`).join(" ")}</span></span>`);
  }
  const cachedBadge = sug.cached ? `<span class="ais-label" style="margin-left:auto;">(캐시)</span>` : "";
  return `
    <div class="ai-suggestion">
      <div class="ai-suggestion-head">
        ✨ AI 제안 ${cachedBadge}
      </div>
      <div class="ai-suggestion-body">
        ${rows.join("")}
      </div>
      <div class="ai-suggestion-foot">
        <button class="ii-btn" data-action="ai-dismiss" data-id="${inboxItem.id}">무시</button>
        <button class="ii-btn is-primary" data-action="ai-apply" data-id="${inboxItem.id}">적용</button>
      </div>
    </div>
  `;
}

async function addInbox(content) {
  if (!content.trim()) return;
  try {
    const created = await api("POST", "/api/me/inbox", { content: content.trim() });
    STATE.inbox.unshift(created);
    if (STATE.tab === "dashboard") renderDashboard();
    else if (STATE.tab === "inbox" && STATE.inboxFilter === "active") renderInbox();
    showToast("담아뒀어요");
  } catch (e) { showToast(e.message, true); }
}

// 빠른 입력 — 날짜 없는 입력은 바로 '할 일(미분류)'로 (받은 메모 흡수)
async function addQuickTask(rawText) {
  const title = (rawText || "").trim();
  if (!title) return;
  const guessed = guessCategory(title);
  try {
    const created = await api("POST", "/api/me/tasks", {
      title, due_date: null, status: "todo", priority: "medium",
      category: guessed, project_id: null, tags: [], notes: "",
    });
    STATE.tasks.unshift(created);
    if (STATE.tab === "dashboard") renderDashboard();
    else if (STATE.tab === "tasks") renderTasks();
    showToast(`할 일 추가 · ${title}${guessed ? ` · #${guessed}` : ""}`);
  } catch (e) { showToast(e.message, true); }
}

// 자연어 파싱: "내일 오후 3시 회의" → {type:"task", title:"회의 (15:00)", due_date:"2026-05-15"}
// 날짜/시간 표현이 없으면 {type:"memo"} 반환 → 기존 Inbox 흐름.
function parseNL(rawText) {
  const text = (rawText || "").trim();
  if (!text) return null;

  let working = " " + text + " ";
  let dueDate = null;
  let timeStr = null;
  let matched = false;

  const now = new Date();
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  // 1) 절대 날짜: M월 D일
  let m = working.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) {
    let y = now.getFullYear();
    const candidate = new Date(y, +m[1] - 1, +m[2]);
    if (candidate < startOfDay(now)) y++;
    dueDate = new Date(y, +m[1] - 1, +m[2]);
    working = working.replace(m[0], " ");
    matched = true;
  } else if ((m = working.match(/(?:^|\s)(\d{1,2})\/(\d{1,2})(?=\s|$)/))) {
    let y = now.getFullYear();
    const candidate = new Date(y, +m[1] - 1, +m[2]);
    if (candidate < startOfDay(now)) y++;
    dueDate = new Date(y, +m[1] - 1, +m[2]);
    working = working.replace(m[0], " ");
    matched = true;
  }

  // 2) 상대 날짜
  if (!dueDate) {
    const rel = [
      [/오늘/, 0], [/내일/, 1], [/모레/, 2], [/글피/, 3]
    ];
    for (const [re, n] of rel) {
      if (re.test(working)) {
        dueDate = addDays(startOfDay(now), n);
        working = working.replace(re, " ");
        matched = true;
        break;
      }
    }
  }

  // 3) N일/N주 후|뒤
  if (!dueDate) {
    if ((m = working.match(/(\d+)\s*일\s*(?:후|뒤)/))) {
      dueDate = addDays(startOfDay(now), +m[1]);
      working = working.replace(m[0], " ");
      matched = true;
    } else if ((m = working.match(/(\d+)\s*주\s*(?:후|뒤)/))) {
      dueDate = addDays(startOfDay(now), +m[1] * 7);
      working = working.replace(m[0], " ");
      matched = true;
    }
  }

  // 4) (다음주|이번주)? + 요일
  const dowMap = { "일":0, "월":1, "화":2, "수":3, "목":4, "금":5, "토":6 };
  if (!dueDate) {
    if ((m = working.match(/(다음주|담주|이번주|금주)\s*([일월화수목금토])요일?/))) {
      const todayDow = now.getDay();
      let diff = dowMap[m[2]] - todayDow;
      if (m[1] === "다음주" || m[1] === "담주") {
        if (diff <= 0) diff += 7;
        diff += 7;
      } else {
        if (diff < 0) diff += 7;
      }
      dueDate = addDays(startOfDay(now), diff);
      working = working.replace(m[0], " ");
      matched = true;
    } else if ((m = working.match(/([일월화수목금토])요일/))) {
      const todayDow = now.getDay();
      let diff = dowMap[m[1]] - todayDow;
      if (diff <= 0) diff += 7;
      dueDate = addDays(startOfDay(now), diff);
      working = working.replace(m[0], " ");
      matched = true;
    }
  }

  // 5) 시간: 오전/오후 N시 (M분)? / HH:MM
  let m2 = working.match(/(오전|오후|아침|저녁|밤)?\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분)?/);
  if (m2) {
    let hr = +m2[2];
    const min = m2[3] ? +m2[3] : 0;
    if (/오후|저녁|밤/.test(m2[1] || "") && hr < 12) hr += 12;
    if (/오전|아침/.test(m2[1] || "") && hr === 12) hr = 0;
    if (hr <= 23 && min <= 59) {
      timeStr = `${String(hr).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
      working = working.replace(m2[0], " ");
      matched = true;
    }
  } else if ((m2 = working.match(/(?:^|\s)(\d{1,2}):(\d{2})(?=\s|$)/))) {
    const hr = +m2[1], min = +m2[2];
    if (hr <= 23 && min <= 59) {
      timeStr = `${String(hr).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
      working = working.replace(m2[0], " ");
      matched = true;
    }
  }

  let title = working.replace(/\s+/g, " ").trim();

  // 날짜는 있고 제목이 비었으면 → 의미 없는 task → memo 로 폴백
  if (dueDate && !title) return { type: "memo" };

  if (dueDate) {
    const displayTitle = timeStr ? `${title} (${timeStr})` : title;
    return {
      type: "task",
      title: displayTitle,
      due_date: dateOnly(dueDate),
      time: timeStr,
      preview: `${formatDateLong(dateOnly(dueDate))}${timeStr ? ` ${timeStr}` : ""} · ${title}`
    };
  }

  // 시간만 있는 경우 → 오늘 일정으로 해석
  if (timeStr && title) {
    return {
      type: "task",
      title: `${title} (${timeStr})`,
      due_date: dateOnly(startOfDay(now)),
      time: timeStr,
      preview: `오늘 ${timeStr} · ${title}`
    };
  }

  return { type: "memo" };
}

// 제목 키워드 → 카테고리 자동 추정. STATE.categories 에 있는 이름만 반환.
const CATEGORY_KEYWORDS = {
  "쿠팡":     ["쿠팡","coupang","회의","미팅","보고","발표","OKR","KPI","평가","팀장","리더","스프린트","스탠드업","1on1","워크샵","리뷰","면담"],
  "결혼":     ["결혼","예식","웨딩","신혼","청첩","신부","신랑","예단","예물","가우디움","상견례","스드메","드레스","턱시도","피로연","주례","사회","축가","혼수","폐백","답례품","허니문","신혼여행"],
  "자기계발": ["공부","독서","책","강의","운동","헬스","러닝","요가","영어","토익","오픽","자격증","코딩","알고리즘","블로그","글쓰기"],
  "사업준비": ["사업","창업","EAM","컴브릭스","법인","세무","사업자","아이템","BM","피칭","투자","고객인터뷰","MVP","리서치","경쟁사"],
};
function guessCategory(title) {
  if (!title) return null;
  const lower = title.toLowerCase();
  const existing = new Set((STATE.categories || []).map(c => c.name));
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (!existing.has(cat)) continue;
    if (kws.some(kw => lower.includes(kw.toLowerCase()))) return cat;
  }
  return null;
}

async function addTaskFromNL(parsed) {
  const guessed = guessCategory(parsed.title);
  const payload = {
    title: parsed.title,
    due_date: parsed.due_date,
    status: "todo",
    priority: "medium",
    category: guessed,
    project_id: null,
    tags: [],
    notes: "",
  };
  try {
    const created = await api("POST", "/api/me/tasks", payload);
    STATE.tasks.unshift(created);
    if (STATE.tab === "dashboard") renderDashboard();
    else if (STATE.tab === "tasks") renderTasks();
    const catLabel = guessed ? ` · #${guessed}` : "";
    showToast(`할 일 추가 · ${parsed.preview}${catLabel}`);
  } catch (e) { showToast(e.message, true); }
}

async function deleteInbox(id) {
  if (!confirm("이 메모를 삭제할까요?")) return;
  try {
    await api("DELETE", `/api/me/inbox/${id}`);
    STATE.inbox = STATE.inbox.filter(i => i.id !== id);
    renderAll();
    showToast("삭제됨");
  } catch (e) { showToast(e.message, true); }
}

// ── Phase 6d: AI Inbox 분류 ──────────────────────────────
async function aiClassifyBulk() {
  if (STATE.aiBusy) return;
  const targets = STATE.inbox.filter(i => !i.processed && !STATE.inboxSuggestions[i.id]);
  if (!targets.length) {
    showToast("이미 모두 분석됐어요");
    return;
  }
  STATE.aiBusy = true;
  setAiBusy(true);
  try {
    const data = await api("POST", "/api/me/inbox/bulk-ai-classify");
    const results = data.results || [];
    let added = 0;
    results.forEach(r => {
      if (!r || !r.inbox_id) return;
      STATE.inboxSuggestions[r.inbox_id] = {
        suggested_title: r.suggested_title || "",
        suggested_category: r.suggested_category || null,
        suggested_priority: r.suggested_priority || "medium",
        suggested_tags: r.suggested_tags || [],
        cached: !!r.cached,
        error: r.error || null,
      };
      added++;
    });
    renderInbox();
    if (added) showToast(`${added}건 분석 완료 — 각 메모 아래 제안 확인`);
    else showToast("분석 결과가 없어요", true);
  } catch (e) {
    showToast(e.message, true);
  } finally {
    STATE.aiBusy = false;
    setAiBusy(false);
  }
}

async function aiClassifyOne(inboxId) {
  if (STATE.aiBusy) return;
  STATE.aiBusy = true;
  setAiBusy(true);
  try {
    const r = await api("POST", `/api/me/inbox/${inboxId}/ai-classify`);
    STATE.inboxSuggestions[inboxId] = {
      suggested_title: r.suggested_title || "",
      suggested_category: r.suggested_category || null,
      suggested_priority: r.suggested_priority || "medium",
      suggested_tags: r.suggested_tags || [],
      cached: !!r.cached,
    };
    renderInbox();
  } catch (e) {
    showToast(e.message, true);
  } finally {
    STATE.aiBusy = false;
    setAiBusy(false);
  }
}

function aiDismissSuggestion(inboxId) {
  delete STATE.inboxSuggestions[inboxId];
  renderInbox();
}

async function aiApplySuggestion(inboxId) {
  const sug = STATE.inboxSuggestions[inboxId];
  const item = STATE.inbox.find(i => i.id === inboxId);
  if (!sug || !item) return;
  const payload = {
    title: (sug.suggested_title || item.content || "").slice(0, 200),
    category: sug.suggested_category || null,
    priority: sug.suggested_priority || "medium",
    project_id: null,
    due_date: null,
  };
  try {
    const result = await api("POST", `/api/me/inbox/${inboxId}/promote`, payload);
    // 태그 제안이 있으면 새 task에 PATCH로 붙이기
    if (result.task && (sug.suggested_tags || []).length) {
      try {
        const upd = await api("PATCH", `/api/me/tasks/${result.task.id}`, {
          tags: sug.suggested_tags.slice(0, 5),
        });
        Object.assign(result.task, upd);
      } catch (_) { /* 태그 실패는 무시 */ }
    }
    if (result.task) STATE.tasks.unshift(result.task);
    STATE.inbox = STATE.inbox.filter(i => i.id !== inboxId);
    delete STATE.inboxSuggestions[inboxId];
    renderAll();
    showToast("AI 제안으로 할 일 생성");
  } catch (e) { showToast(e.message, true); }
}

function setAiBusy(busy) {
  const btn = document.getElementById("inboxAiBtn");
  if (!btn) return;
  if (busy) {
    btn.disabled = true;
    const lbl = btn.querySelector(".btn-ai-label");
    if (lbl) lbl.innerHTML = `<span class="btn-ai-spinner"></span> 분석 중...`;
  } else {
    btn.disabled = false;
    const lbl = btn.querySelector(".btn-ai-label");
    if (lbl) lbl.textContent = "AI로 정리";
  }
}

async function toggleInboxProcessed(id, processed) {
  try {
    const updated = await api("PATCH", `/api/me/inbox/${id}`, { processed });
    if (STATE.tab === "inbox") {
      // 현재 필터에 안 맞으면 리스트에서 제거
      const matchesFilter = (STATE.inboxFilter === "processed") === !!processed;
      if (matchesFilter) {
        const idx = STATE.inbox.findIndex(i => i.id === id);
        if (idx >= 0) STATE.inbox[idx] = updated;
      } else {
        STATE.inbox = STATE.inbox.filter(i => i.id !== id);
      }
    } else {
      STATE.inbox = STATE.inbox.filter(i => i.id !== id);
    }
    renderAll();
  } catch (e) { showToast(e.message, true); }
}

// ── Promote 모달 ─────────────────────────────────────────
function openPromoteModal(inboxId) {
  const item = STATE.inbox.find(i => i.id === inboxId);
  if (!item) return;
  STATE.promotingInboxId = inboxId;
  document.getElementById("promoteInboxId").value = inboxId;
  document.getElementById("promoteTitle").value = item.content.slice(0, 200);
  document.getElementById("promoteCategory").value = "";
  document.getElementById("promoteProject").value = "";
  document.getElementById("promotePriority").value = "medium";
  document.getElementById("promoteDueDate").value = "";
  // 카테고리/프로젝트 옵션 채우기
  fillSelectOptions(
    "promoteCategory", "(없음)",
    STATE.categories.map(c => ({ value: c.name, label: c.name }))
  );
  fillSelectOptions(
    "promoteProject", "(없음)",
    STATE.projects.map(p => ({ value: String(p.id), label: p.name }))
  );
  document.getElementById("promoteModal").hidden = false;
  setTimeout(() => document.getElementById("promoteTitle").focus(), 0);
}

function closePromoteModal() {
  document.getElementById("promoteModal").hidden = true;
  STATE.promotingInboxId = null;
}

async function submitPromote() {
  const id = STATE.promotingInboxId;
  if (!id) return;
  const payload = {
    title: document.getElementById("promoteTitle").value.trim(),
    category: document.getElementById("promoteCategory").value || null,
    project_id: parseIntOrNull(document.getElementById("promoteProject").value),
    priority: document.getElementById("promotePriority").value,
    due_date: document.getElementById("promoteDueDate").value || null,
  };
  if (!payload.title) return;
  try {
    const result = await api("POST", `/api/me/inbox/${id}/promote`, payload);
    if (result.task) STATE.tasks.unshift(result.task);
    STATE.inbox = STATE.inbox.filter(i => i.id !== id);
    closePromoteModal();
    renderAll();
    showToast("할 일로 옮겼어요");
  } catch (e) { showToast(e.message, true); }
}

// ════════════════════════════════════════════════════════
// 3) TASKS (기존 리스트/칸반)
// ════════════════════════════════════════════════════════
function renderTasks() {
  renderCategoryChips();
  if (STATE.view === "list") renderList();
  else renderKanban();
}

function renderCategoryChips() {
  const wrap = document.getElementById("categoryChips");
  const chips = [
    { name: null, label: "전체", count: STATE.tasks.length, color: null },
    ...STATE.categories.map(c => ({
      name: c.name, label: c.name, color: c.color,
      count: STATE.tasks.filter(t => t.category === c.name).length,
    })),
    {
      name: "__none__", label: "미분류",
      count: STATE.tasks.filter(t => !t.category).length, color: null,
    },
  ];
  wrap.innerHTML = chips.map(c => `
    <button class="chip ${STATE.filterCategory === c.name ? "is-active" : ""}"
            data-cat="${c.name === null ? "" : escapeAttr(c.name)}">
      ${c.color ? `<span class="chip-dot" style="background:${escapeAttr(c.color)}"></span>` : ""}
      ${escapeHtml(c.label)} <span style="opacity:0.6;">${c.count}</span>
    </button>
  `).join("");
  wrap.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const raw = btn.getAttribute("data-cat");
      STATE.filterCategory = raw === "" ? null : raw;
      renderTasks();
    });
  });
}

function renderCategoryOptions() {
  ["taskCategory", "promoteCategory"].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    fillSelectOptions(
      id, "(없음)",
      STATE.categories.map(c => ({ value: c.name, label: c.name }))
    );
    if (current) sel.value = current;
  });
}

function renderProjectOptions() {
  ["taskProject", "promoteProject"].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    fillSelectOptions(
      id, "(없음)",
      STATE.projects.map(p => ({ value: String(p.id), label: p.name }))
    );
    if (current) sel.value = current;
  });
}

function fillSelectOptions(selectId, noneLabel, items) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">${escapeHtml(noneLabel)}</option>` +
    items.map(it => `<option value="${escapeAttr(it.value)}">${escapeHtml(it.label)}</option>`).join("");
}

function filteredTasks() {
  // 하위 작업(체크리스트)은 상위 task 안에서만 보이고 전체 목록엔 안 나옴
  let tasks = STATE.tasks.filter(t => !t.parent_task_id);
  if (STATE.filterCategory !== null) {
    if (STATE.filterCategory === "__none__") tasks = tasks.filter(t => !t.category);
    else tasks = tasks.filter(t => t.category === STATE.filterCategory);
  }
  if (STATE.search) {
    const q = STATE.search.toLowerCase();
    tasks = tasks.filter(t =>
      (t.title || "").toLowerCase().includes(q) ||
      (t.notes || "").toLowerCase().includes(q) ||
      (t.tags || []).some(tag => (tag || "").toLowerCase().includes(q))
    );
  }
  switch (STATE.sort) {
    case "due_asc":
      tasks.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
      break;
    case "priority":
      tasks.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9));
      break;
    case "title":
      tasks.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    case "created_desc":
    default:
      tasks.sort((a, b) => (b.id || 0) - (a.id || 0));
  }
  return tasks;
}

function renderList() {
  document.getElementById("viewList").hidden = false;
  document.getElementById("viewKanban").hidden = true;

  const stack = document.getElementById("listStack");
  const tasks = filteredTasks();
  if (tasks.length === 0) {
    stack.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <div>업무가 없습니다. 우측 하단 ＋ 버튼으로 추가해보세요.</div>
    </div>`;
    return;
  }
  stack.innerHTML = tasks.map(t => listRowHtml(t)).join("");
  stack.querySelectorAll(".list-row").forEach(row => {
    row.addEventListener("click", e => {
      if (e.target.closest(".row-check")) return;
      openTaskModal(Number(row.dataset.id));
    });
  });
  stack.querySelectorAll(".row-check").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const id = Number(btn.closest(".list-row").dataset.id);
      const t = STATE.tasks.find(x => x.id === id);
      if (!t) return;
      const next = t.status === "done" ? "todo" : "done";
      try {
        const updated = await api("PATCH", `/api/me/tasks/${id}`, { status: next });
        Object.assign(t, updated);
        renderAll();
      } catch (e) { showToast(e.message, true); }
    });
  });
}

function getCategoryColor(name) {
  const c = STATE.categories.find(c => c.name === name);
  return c?.color || COLOR_FALLBACK;
}

function listRowHtml(t) {
  const cat = t.category || null;
  const catColor = cat ? getCategoryColor(cat) : "#475569";
  const due = dueDisplay(t.due_date);
  const dueClass = due.urgency ? `is-${due.urgency}` : "";
  const rowUrgency = t.status !== "done" && due.urgency ? `is-urgent-${due.urgency}` : "";
  const prioHigh = t.priority === "high" && t.status !== "done" ? "is-prio-high" : "";
  return `
    <div class="list-row ${t.status === "done" ? "is-done" : ""} ${rowUrgency} ${prioHigh}" data-id="${t.id}">
      <button class="row-check ${t.status === "done" ? "is-checked" : ""}">✓</button>
      <div class="row-main">
        <div class="row-title">${escapeHtml(t.title)}</div>
        <div class="row-meta">
          ${t.status !== "todo" && t.status !== "done" ? `<span>${STATUS_LABEL[t.status]}</span>` : ""}
          ${(t.tags || []).map(tag => `<span class="row-tag">#${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
      ${cat ? `<span class="row-category" style="background:${hexToBg(catColor)};color:${catColor}">${escapeHtml(cat)}</span>` : `<span></span>`}
      <span class="row-priority priority-${t.priority}">${priorityIcon(t.priority)}${PRIORITY_LABEL[t.priority]}</span>
      <span class="row-due ${dueClass}">${due.label}</span>
    </div>
  `;
}

function priorityIcon(p) {
  if (p === "high") return `<span class="prio-icon">🔥</span>`;
  if (p === "medium") return `<span class="prio-icon">●</span>`;
  return `<span class="prio-icon">○</span>`;
}

function dueDisplay(dateStr) {
  if (!dateStr) return { label: "-", urgency: "" };
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d - today) / (24*3600*1000));
  let label;
  if (diff === 0) label = "오늘";
  else if (diff === 1) label = "내일";
  else if (diff === -1) label = "어제";
  else if (diff > 0 && diff < 7) label = `D-${diff}`;
  else if (diff < 0) label = `D+${-diff}`;
  else label = `${d.getMonth()+1}/${d.getDate()}`;
  let urgency = "";
  if (diff < 0) urgency = "overdue";
  else if (diff === 0) urgency = "today";
  return { label, urgency };
}

function renderKanban() {
  document.getElementById("viewList").hidden = true;
  document.getElementById("viewKanban").hidden = false;
  const tasks = filteredTasks();
  ["todo","in_progress","waiting","done"].forEach(status => {
    const list = document.querySelector(`.kanban-list[data-drop="${status}"]`);
    const items = tasks.filter(t => t.status === status);
    document.querySelector(`[data-count="${status}"]`).textContent = items.length;
    list.innerHTML = items.map(t => kanbanCardHtml(t)).join("") || "";
  });
  bindKanbanDnD();
}

function kanbanCardHtml(t) {
  const cat = t.category;
  const catColor = cat ? getCategoryColor(cat) : null;
  const due = dueDisplay(t.due_date);
  const cardUrgency = t.status !== "done" && due.urgency ? `is-urgent-${due.urgency}` : "";
  const prioHigh = t.priority === "high" && t.status !== "done" ? "is-prio-high" : "";
  return `
    <div class="kanban-card ${cardUrgency} ${prioHigh}" draggable="true" data-id="${t.id}">
      <div class="card-title">${escapeHtml(t.title)}</div>
      <div class="card-meta">
        ${cat ? `<span class="row-category" style="background:${hexToBg(catColor)};color:${catColor}">${escapeHtml(cat)}</span>` : ""}
        <span class="row-priority priority-${t.priority}">${priorityIcon(t.priority)}${PRIORITY_LABEL[t.priority]}</span>
        ${t.due_date ? `<span class="row-due ${due.urgency ? `is-${due.urgency}` : ""}">${due.label}</span>` : ""}
      </div>
    </div>
  `;
}

function bindKanbanDnD() {
  let draggingId = null;
  document.querySelectorAll(".kanban-card").forEach(card => {
    card.addEventListener("click", () => openTaskModal(Number(card.dataset.id)));
    card.addEventListener("dragstart", e => {
      draggingId = Number(card.dataset.id);
      card.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("is-dragging");
      draggingId = null;
    });
  });
  document.querySelectorAll(".kanban-list").forEach(list => {
    const col = list.closest(".kanban-col");
    list.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      list.classList.add("is-dragover");
      if (col) col.classList.add("is-dragover-col");
    });
    list.addEventListener("dragleave", e => {
      // Only un-mark when leaving the actual list (avoid flicker on children)
      if (!list.contains(e.relatedTarget)) {
        list.classList.remove("is-dragover");
        if (col) col.classList.remove("is-dragover-col");
      }
    });
    list.addEventListener("drop", async e => {
      e.preventDefault();
      list.classList.remove("is-dragover");
      if (col) col.classList.remove("is-dragover-col");
      if (!draggingId) return;
      const newStatus = list.dataset.drop;
      const task = STATE.tasks.find(t => t.id === draggingId);
      if (!task || task.status === newStatus) return;
      try {
        const updated = await api("PATCH", `/api/me/tasks/${draggingId}`, { status: newStatus });
        Object.assign(task, updated);
        renderKanban();
        showToast(`→ ${STATUS_LABEL[newStatus] || newStatus}`);
      } catch (e) { showToast(e.message, true); }
    });
  });
}

// ── Task 모달 ────────────────────────────────────────────
function openTaskModal(taskId, presetProjectId) {
  STATE.editingTaskId = taskId || null;
  const t = taskId ? STATE.tasks.find(x => x.id === taskId) : null;
  document.getElementById("taskModalTitle").textContent = t ? "할 일 편집" : "새 할 일";
  document.getElementById("taskId").value = t?.id || "";
  document.getElementById("taskTitle").value = t?.title || "";
  document.getElementById("taskCategory").value = t?.category || "";
  document.getElementById("taskProject").value = t?.project_id ? String(t.project_id)
    : (presetProjectId ? String(presetProjectId) : "");
  document.getElementById("taskStatus").value = t?.status || "todo";
  document.getElementById("taskPriority").value = t?.priority || "medium";
  document.getElementById("taskStartDate").value = t?.start_date || "";
  document.getElementById("taskDueDate").value = t?.due_date || "";
  document.getElementById("taskActualStart").value = t?.actual_start_date || "";
  document.getElementById("taskActualEnd").value = t?.actual_end_date || "";
  document.getElementById("taskTags").value = (t?.tags || []).join(", ");
  document.getElementById("taskNotes").value = t?.notes || "";
  document.getElementById("deleteTaskBtn").hidden = !t;
  document.getElementById("taskModal").hidden = false;
  setTimeout(() => document.getElementById("taskTitle").focus(), 0);
}

function closeTaskModal() {
  document.getElementById("taskModal").hidden = true;
  STATE.editingTaskId = null;
}

// ════════════════════════════════════════════════════════
// 4) PROJECTS
// ════════════════════════════════════════════════════════
function renderProjects() {
  const grid = document.getElementById("projectGrid");
  if (!STATE.projects.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📁</div>
      <div>아직 프로젝트가 없습니다. 우측 상단 "＋ 새 프로젝트"로 시작해보세요.</div>
    </div>`;
    return;
  }
  grid.innerHTML = STATE.projects.map(p => projectCardHtml(p)).join("");
  grid.querySelectorAll(".project-card").forEach(card => {
    card.addEventListener("click", () => openProjectDetail(Number(card.dataset.id)));
  });
}

// ── 프로젝트 상세 페이지 (워크스페이스) ──────────────────────
function openProjectDetail(id) {
  if (pdRetro && pdRetro.projectId !== id) pdRetro = null;
  STATE.detailProjectId = id;
  document.querySelectorAll(".page").forEach(p => p.hidden = true);
  document.getElementById("pageProjectDetail").hidden = false;
  document.getElementById("newTaskBtn").hidden = true;
  document.querySelectorAll(".nav-tab").forEach(b =>
    b.classList.toggle("is-active", b.dataset.tab === "projects"));
  renderProjectDetail();
  window.scrollTo({ top: 0, behavior: "instant" });
}

let pdExpanded = new Set();   // 하위 작업이 펼쳐진 task id 들
let pdRetro = null;           // { projectId, text, cached } 또는 { projectId, error }
let pdRetroLoading = false;

function renderProjectDetail() {
  const body = document.getElementById("projectDetailBody");
  if (!body) return;
  const p = STATE.projects.find(x => x.id === STATE.detailProjectId);
  if (!p) {
    body.innerHTML = `<div class="empty-state"><div class="empty-icon">📁</div>
      <div>프로젝트를 찾을 수 없어요. 위 ← 버튼으로 돌아가세요.</div></div>`;
    return;
  }
  const tasks = STATE.tasks.filter(t => t.project_id === p.id && !t.parent_task_id);
  const open = tasks.filter(t => t.status !== "done")
    .sort((a, b) => (a.due_date || "9999-99-99").localeCompare(b.due_date || "9999-99-99"));
  const done = tasks.filter(t => t.status === "done");
  const pct = (p.progress_pct ?? 0) > 0 ? p.progress_pct : (p.computed_progress ?? 0);
  const dd = dDayInfo(p.end_date);
  const color = p.color || COLOR_FALLBACK;
  const dateRange = (p.start_date || p.end_date)
    ? `${p.start_date || "?"} ~ ${p.end_date || "?"}` : "기간 미설정";

  body.innerHTML = `
    <header class="pd-head" style="--proj-color:${escapeAttr(color)}">
      <div class="pd-title-row">
        <span class="pd-dot"></span>
        <h2 class="pd-name">${escapeHtml(p.name)}</h2>
        <span class="pc-status s-${p.status}">${PROJECT_STATUS_LABEL[p.status] || p.status}</span>
        ${dd ? `<span class="pc-dday ${dd.urgency}">${dd.label}</span>` : ""}
        <button class="btn btn-outline btn-sm pd-retro-btn" id="pdRetroBtn" type="button">✨ AI 회고</button>
        <button class="btn btn-outline btn-sm" id="pdEditBtn" type="button">편집</button>
      </div>
      ${p.description ? `<p class="pd-goal">${escapeHtml(p.description)}</p>` : ""}
      <div class="pd-bar"><div class="pd-fill" style="width:${pct}%"></div></div>
      <div class="pd-progress-meta">
        <span><strong>${pct}%</strong></span>
        <span>${done.length}/${tasks.length} 완료</span>
        <span>${escapeHtml(dateRange)}</span>
      </div>
      ${p.notes ? `<div class="pd-notes">${escapeHtml(p.notes)}</div>` : ""}
    </header>

    ${pdRetroHtml()}

    <section class="pd-tasks">
      <div class="pd-tasks-head">
        <h3>작업 <span class="pd-count">${tasks.length}</span></h3>
        <div class="pd-view-toggle">
          <button class="pd-view-btn ${STATE.pdView === "list" ? "is-active" : ""}" data-pdview="list" type="button">목록</button>
          <button class="pd-view-btn ${STATE.pdView === "timeline" ? "is-active" : ""}" data-pdview="timeline" type="button">타임라인</button>
        </div>
        <button class="btn btn-primary btn-sm" id="pdAddTaskBtn" type="button">＋ 작업 추가</button>
      </div>
      ${tasks.length === 0
        ? `<div class="widget-empty">아직 작업이 없어요. "작업 추가"로 시작하세요.</div>`
        : (STATE.pdView === "timeline"
            ? pdTimelineHtml(tasks, p)
            : `<div class="pd-task-list">${open.map(t => pdTaskBlock(t)).join("")
                || `<div class="widget-empty">열린 작업이 없어요 🎉</div>`}</div>
               ${done.length ? `<details class="pd-done">
                 <summary>완료한 작업 ${done.length}</summary>
                 <div class="pd-task-list">${done.map(t => pdTaskBlock(t)).join("")}</div>
               </details>` : ""}`)}
    </section>
  `;

  document.getElementById("pdEditBtn").addEventListener("click", () => openProjectModal(p.id));
  document.getElementById("pdAddTaskBtn").addEventListener("click", () => openTaskModal(null, p.id));
  document.getElementById("pdRetroBtn").addEventListener("click", () => loadProjectRetro(false));
  const retroRefresh = document.getElementById("pdRetroRefresh");
  if (retroRefresh) retroRefresh.addEventListener("click", () => loadProjectRetro(true));
  body.querySelectorAll(".pd-view-btn").forEach(btn => {
    btn.addEventListener("click", () => { STATE.pdView = btn.dataset.pdview; renderProjectDetail(); });
  });
  if (STATE.pdView === "timeline") {
    body.querySelectorAll(".tl-row[data-id]").forEach(row => {
      row.addEventListener("click", () => openTaskModal(Number(row.dataset.id)));
    });
  } else {
    bindPdTaskBlocks(body);
  }
}

// 프로젝트 상세 — AI 회고
function pdRetroHtml() {
  if (pdRetroLoading) {
    return `<div class="pd-retro"><div class="pd-retro-loading">✨ AI가 회고를 작성 중…</div></div>`;
  }
  if (!pdRetro || pdRetro.projectId !== STATE.detailProjectId) return "";
  if (pdRetro.error) {
    return `<div class="pd-retro"><div class="pd-retro-err">${escapeHtml(pdRetro.error)}</div></div>`;
  }
  return `<div class="pd-retro">
    <div class="pd-retro-head">
      <span class="pd-retro-title">✨ AI 회고</span>
      ${pdRetro.cached ? `<span class="pd-retro-cached">캐시됨</span>` : ""}
      <button class="pd-retro-refresh" id="pdRetroRefresh" type="button" title="다시 생성">↻</button>
    </div>
    <div class="pd-retro-body">${renderRetroText(pdRetro.text)}</div>
  </div>`;
}

function renderRetroText(text) {
  const lines = (text || "").split("\n");
  let html = "", inList = false;
  const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
  lines.forEach(raw => {
    const line = raw.trim();
    if (!line) { closeList(); return; }
    if (line.startsWith("#")) {
      closeList();
      html += `<h4 class="retro-h">${escapeHtml(line.replace(/^#+\s*/, ""))}</h4>`;
    } else if (line.startsWith("-") || line.startsWith("•") || line.startsWith("*")) {
      if (!inList) { html += `<ul class="retro-ul">`; inList = true; }
      html += `<li>${escapeHtml(line.replace(/^[-•*]\s*/, ""))}</li>`;
    } else {
      closeList();
      html += `<p class="retro-p">${escapeHtml(line)}</p>`;
    }
  });
  closeList();
  return html || `<p class="retro-p">회고 내용이 비어있어요.</p>`;
}

async function loadProjectRetro(force) {
  if (pdRetroLoading) return;
  const pid = STATE.detailProjectId;
  pdRetroLoading = true;
  renderProjectDetail();
  try {
    const data = await api("POST",
      `/api/me/projects/${pid}/retrospective${force ? "?force=true" : ""}`);
    pdRetroLoading = false;
    if (data.ai_enabled === false) {
      pdRetro = { projectId: pid, error: "AI 기능이 꺼져 있어요. 서버에 ANTHROPIC_API_KEY 설정이 필요해요." };
    } else if (data.empty) {
      pdRetro = { projectId: pid, error: "회고할 작업이 없어요. 작업을 먼저 추가하세요." };
    } else {
      pdRetro = { projectId: pid, text: data.text || "", cached: !!data.cached };
    }
  } catch (e) {
    pdRetroLoading = false;
    showToast(e.message, true);
  }
  renderProjectDetail();
}

// 프로젝트 상세 — 타임라인(간트) 뷰. 막대는 % 좌표로 컨테이너 폭에 맞춤.
function pdTimelineHtml(tasks, p) {
  const dayMs = 86400000;
  const toDay = s => Math.round(new Date(s + "T00:00:00").getTime() / dayMs);
  const dates = [];
  tasks.forEach(t => {
    ["start_date", "due_date", "actual_start_date", "actual_end_date"].forEach(k => {
      if (t[k]) dates.push(toDay(t[k]));
    });
  });
  if (p.start_date) dates.push(toDay(p.start_date));
  if (p.end_date) dates.push(toDay(p.end_date));
  if (!dates.length) {
    return `<div class="widget-empty">작업에 날짜가 없어요. 작업을 열어 계획/실제 날짜를 넣으면 타임라인에 막대로 나타나요.</div>`;
  }
  const todayD = Math.round(startOfDay(new Date()).getTime() / dayMs);
  dates.push(todayD);
  const winStart = Math.min(...dates) - 3;
  const winEnd = Math.max(...dates) + 3;
  const total = Math.max(winEnd - winStart, 1);
  const pos = d => ((d - winStart) / total) * 100;

  // 월 눈금 (윗줄)
  let months = "", grid = "";
  let cur = (() => { const d = new Date(winStart * dayMs); return new Date(d.getFullYear(), d.getMonth(), 1); })();
  while (Math.round(cur.getTime() / dayMs) <= winEnd) {
    const cd = Math.round(cur.getTime() / dayMs);
    if (cd >= winStart) {
      const left = pos(cd);
      months += `<span class="tl-month" style="left:${left}%">${cur.getMonth() + 1}월</span>`;
      grid += `<div class="tl-grid tl-grid-month" style="left:${left}%"></div>`;
    }
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  // 주 눈금 (아랫줄 — 월요일 기준 M/D)
  let weeks = "";
  const weekDates = [];
  const firstMon = new Date(winStart * dayMs);
  while (firstMon.getDay() !== 1) firstMon.setDate(firstMon.getDate() + 1);
  for (let w = new Date(firstMon); Math.round(w.getTime() / dayMs) <= winEnd; w.setDate(w.getDate() + 7)) {
    weekDates.push(new Date(w));
  }
  const weekStep = weekDates.length > 18 ? 2 : 1;
  weekDates.forEach((dt, i) => {
    const left = pos(Math.round(dt.getTime() / dayMs));
    grid += `<div class="tl-grid tl-grid-week" style="left:${left}%"></div>`;
    if (i % weekStep === 0) {
      weeks += `<span class="tl-week" style="left:${left}%">${dt.getMonth() + 1}/${dt.getDate()}</span>`;
    }
  });
  const todayLine = (todayD >= winStart && todayD <= winEnd)
    ? `<div class="tl-today" style="left:${pos(todayD)}%"></div>` : "";

  const span = (s, e, cls, label) => {
    const l = pos(toDay(s));
    const w = Math.max(pos(toDay(e) + 1) - l, 1.2);
    return `<div class="tl-bar ${cls}" style="left:${l}%;width:${w}%" title="${escapeAttr(label)}"></div>`;
  };
  const point = (d, cls, label) =>
    `<div class="tl-marker ${cls}" style="left:${pos(toDay(d))}%" title="${escapeAttr(label)}"></div>`;

  const rows = tasks.map(t => {
    const isDone = t.status === "done";
    let bars = "";
    // 계획 막대
    if (t.start_date && t.due_date) {
      bars += span(t.start_date, t.due_date, "tl-plan", `계획 ${t.start_date} ~ ${t.due_date}`);
    } else if (t.start_date || t.due_date) {
      const d = t.due_date || t.start_date;
      bars += point(d, "tl-plan-marker", `계획 ${d}`);
    }
    // 실제 막대
    if (t.actual_start_date && t.actual_end_date) {
      bars += span(t.actual_start_date, t.actual_end_date, "tl-actual", `실제 ${t.actual_start_date} ~ ${t.actual_end_date}`);
    } else if (t.actual_start_date || t.actual_end_date) {
      const d = t.actual_end_date || t.actual_start_date;
      bars += point(d, "tl-actual-marker", `실제 ${d}`);
    }
    if (!bars) bars = `<span class="tl-nodate">기간 미설정</span>`;
    return `<div class="tl-row" data-id="${t.id}">
      <div class="tl-label ${isDone ? "is-done" : ""}">${escapeHtml(t.title)}</div>
      <div class="tl-track">${bars}</div>
    </div>`;
  }).join("");

  return `<div class="tl" style="--proj-color:${escapeAttr(p.color || COLOR_FALLBACK)}">
    <div class="tl-row tl-head">
      <div class="tl-label"></div>
      <div class="tl-track">
        <div class="tl-axis-month">${months}</div>
        <div class="tl-axis-week">${weeks}</div>
      </div>
    </div>
    <div class="tl-body">
      <div class="tl-overlay">${grid}${todayLine}</div>
      ${rows}
    </div>
    <div class="tl-legend">
      <span class="tl-lg tl-lg-plan"></span> 계획
      <span class="tl-lg tl-lg-actual"></span> 실제
      <span class="tl-legend-sep">·</span> 빨간 선 = 오늘
    </div>
  </div>`;
}

function pdTaskBlock(t) {
  const subs = STATE.tasks.filter(s => s.parent_task_id === t.id);
  const subDone = subs.filter(s => s.status === "done").length;
  const expanded = pdExpanded.has(t.id);
  const cat = STATE.categories.find(c => c.name === t.category);
  const dot = cat ? `<span class="di-cat-dot" style="background:${escapeAttr(cat.color)}"></span>` : "";
  const due = dueDisplay(t.due_date);
  const isDone = t.status === "done";
  const subLabel = subs.length ? `하위 ${subDone}/${subs.length}` : "하위 ＋";
  return `<div class="pd-task-block" data-id="${t.id}">
    <div class="pd-task ${isDone ? "is-done" : ""}">
      <button class="pd-check ${isDone ? "is-checked" : ""}" data-act="toggle" type="button" aria-label="완료 토글">${isDone ? "✓" : ""}</button>
      ${dot}
      <span class="pd-task-title" data-act="open">${escapeHtml(t.title)}</span>
      <button class="pd-sub-toggle ${expanded ? "is-open" : ""}" data-act="expand" type="button">${subLabel}</button>
      ${t.due_date ? `<span class="di-due ${due.urgency ? "is-" + due.urgency : ""}">${due.label}</span>` : ""}
    </div>
    <div class="pd-subs" ${expanded ? "" : "hidden"}>
      ${subs.map(s => pdSubRow(s)).join("")}
      <form class="pd-sub-add">
        <input class="pd-sub-input" type="text" placeholder="하위 작업 추가 후 Enter" maxlength="200" autocomplete="off" />
      </form>
    </div>
  </div>`;
}

function pdSubRow(s) {
  const isDone = s.status === "done";
  return `<div class="pd-sub ${isDone ? "is-done" : ""}" data-id="${s.id}">
    <button class="pd-check pd-check-sm ${isDone ? "is-checked" : ""}" data-act="sub-toggle" type="button" aria-label="완료 토글">${isDone ? "✓" : ""}</button>
    <span class="pd-sub-title">${escapeHtml(s.title)}</span>
    <button class="pd-sub-del" data-act="sub-del" type="button" aria-label="삭제">✕</button>
  </div>`;
}

function bindPdTaskBlocks(body) {
  body.querySelectorAll(".pd-task-block").forEach(block => {
    const id = Number(block.dataset.id);
    block.querySelector('[data-act="toggle"]').addEventListener("click", () => togglePdTaskDone(id));
    block.querySelector('[data-act="open"]').addEventListener("click", () => openTaskModal(id));
    block.querySelector('[data-act="expand"]').addEventListener("click", () => {
      if (pdExpanded.has(id)) pdExpanded.delete(id);
      else pdExpanded.add(id);
      renderProjectDetail();
    });
    block.querySelectorAll(".pd-sub").forEach(sub => {
      const sid = Number(sub.dataset.id);
      sub.querySelector('[data-act="sub-toggle"]').addEventListener("click", () => toggleSubtaskDone(sid));
      sub.querySelector('[data-act="sub-del"]').addEventListener("click", () => deleteSubtask(sid));
    });
    const addForm = block.querySelector(".pd-sub-add");
    if (addForm) addForm.addEventListener("submit", e => {
      e.preventDefault();
      const input = addForm.querySelector(".pd-sub-input");
      const val = input.value.trim();
      if (val) addSubtask(id, val);
    });
  });
}

async function togglePdTaskDone(id) {
  const t = STATE.tasks.find(x => x.id === id);
  if (!t) return;
  const newStatus = t.status === "done" ? "todo" : "done";
  try {
    const updated = await api("PATCH", `/api/me/tasks/${id}`, { status: newStatus });
    const idx = STATE.tasks.findIndex(x => x.id === id);
    if (idx >= 0) STATE.tasks[idx] = updated;
    renderProjectDetail();
    refreshProjectsOnly();
  } catch (e) { showToast(e.message, true); }
}

async function addSubtask(parentId, title) {
  try {
    const created = await api("POST", "/api/me/tasks", {
      title, parent_task_id: parentId, status: "todo", priority: "medium",
      category: null, project_id: null, due_date: null, tags: [], notes: "",
    });
    STATE.tasks.push(created);
    pdExpanded.add(parentId);
    renderProjectDetail();
    const input = document.querySelector(`.pd-task-block[data-id="${parentId}"] .pd-sub-input`);
    if (input) input.focus();
  } catch (e) { showToast(e.message, true); }
}

async function toggleSubtaskDone(id) {
  const s = STATE.tasks.find(x => x.id === id);
  if (!s) return;
  const newStatus = s.status === "done" ? "todo" : "done";
  try {
    const updated = await api("PATCH", `/api/me/tasks/${id}`, { status: newStatus });
    const idx = STATE.tasks.findIndex(x => x.id === id);
    if (idx >= 0) STATE.tasks[idx] = updated;
    if (s.parent_task_id) pdExpanded.add(s.parent_task_id);
    renderProjectDetail();
  } catch (e) { showToast(e.message, true); }
}

async function deleteSubtask(id) {
  const s = STATE.tasks.find(x => x.id === id);
  try {
    await api("DELETE", `/api/me/tasks/${id}`);
    STATE.tasks = STATE.tasks.filter(x => x.id !== id);
    if (s && s.parent_task_id) pdExpanded.add(s.parent_task_id);
    renderProjectDetail();
  } catch (e) { showToast(e.message, true); }
}

function projectCardHtml(p) {
  const pct = (p.progress_pct ?? 0) > 0 ? p.progress_pct : (p.computed_progress ?? 0);
  const dd = dDayInfo(p.end_date);
  const projTasks = STATE.tasks.filter(t => t.project_id === p.id);
  const openTasks = projTasks.filter(t => t.status !== "done");
  const nextAction = pickNextAction(openTasks);
  const recentTask = pickRecent(projTasks);
  const tags = collectTopTags(projTasks, 3);
  const dateRange = p.start_date || p.end_date
    ? `${p.start_date || "?"} ~ ${p.end_date || "?"}`
    : "기간 미설정";

  const ddayHtml = dd
    ? `<span class="pc-dday ${dd.urgency}">${dd.label}</span>`
    : "";

  const nextActionHtml = nextAction
    ? `<div class="pc-next-action">
         <span class="pc-next-label">다음 액션</span>
         <span class="pc-next-title">${escapeHtml(nextAction.title)}</span>
         ${nextAction.due_date
           ? `<span class="pc-next-due ${dueDisplay(nextAction.due_date).urgency ? `is-${dueDisplay(nextAction.due_date).urgency}` : ""}">${dueDisplay(nextAction.due_date).label}</span>`
           : ""}
       </div>`
    : openTasks.length === 0 && projTasks.length > 0
      ? `<div class="pc-next-action is-empty">모든 할 일 완료 🎉</div>`
      : `<div class="pc-next-action is-empty">아직 연결된 할 일이 없습니다</div>`;

  const tagsHtml = tags.length
    ? `<div class="pc-tags">${tags.map(t => `<span class="pc-tag">#${escapeHtml(t)}</span>`).join("")}</div>`
    : "";

  const recentHtml = recentTask
    ? `<span class="pc-recent" title="${escapeAttr(recentTask.title)}">최근 · ${relativeTime(recentTask.updated_at || recentTask.created_at)}</span>`
    : "";

  return `
    <div class="project-card" data-id="${p.id}" style="--proj-color:${escapeAttr(p.color || COLOR_FALLBACK)}">
      <div class="pc-head">
        <div class="pc-name">${escapeHtml(p.name)}</div>
        ${ddayHtml}
        <span class="pc-status s-${p.status}">${PROJECT_STATUS_LABEL[p.status] || p.status}</span>
      </div>
      ${p.description ? `<div class="pc-desc">${escapeHtml(p.description)}</div>` : ""}
      ${nextActionHtml}
      <div class="pc-bar"><div class="pc-fill" style="width:${pct}%"></div></div>
      <div class="pc-meta">
        <span class="pc-progress"><strong>${pct}%</strong> · ${p.done_count ?? 0}/${p.task_count ?? 0} 완료</span>
        <span class="pc-range">${dateRange}</span>
      </div>
      ${tags.length || recentTask ? `<div class="pc-foot">${tagsHtml}${recentHtml}</div>` : ""}
    </div>
  `;
}

function dDayInfo(endDateStr) {
  if (!endDateStr) return null;
  const today = startOfDay(new Date());
  const d = new Date(endDateStr + "T00:00:00");
  const diff = Math.round((d - today) / (24 * 3600 * 1000));
  let label, urgency = "";
  if (diff === 0) { label = "D-DAY"; urgency = "is-today"; }
  else if (diff > 0) {
    label = `D-${diff}`;
    if (diff <= 7) urgency = "is-soon";
  }
  else { label = `D+${-diff}`; urgency = "is-overdue"; }
  return { label, urgency };
}

function pickNextAction(openTasks) {
  if (!openTasks.length) return null;
  const sorted = openTasks.slice().sort((a, b) => {
    const aDue = a.due_date || "9999-12-31";
    const bDue = b.due_date || "9999-12-31";
    if (aDue !== bDue) return aDue.localeCompare(bDue);
    return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
  });
  return sorted[0];
}

function pickRecent(tasks) {
  if (!tasks.length) return null;
  return tasks.slice().sort((a, b) =>
    (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || "")
  )[0];
}

function collectTopTags(tasks, max) {
  const counts = new Map();
  tasks.forEach(t => (t.tags || []).forEach(tag => {
    if (!tag) return;
    counts.set(tag, (counts.get(tag) || 0) + 1);
  }));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([tag]) => tag);
}

function openProjectModal(projectId) {
  STATE.editingProjectId = projectId || null;
  const p = projectId ? STATE.projects.find(x => x.id === projectId) : null;
  document.getElementById("projectModalTitle").textContent = p ? "프로젝트 편집" : "새 프로젝트";
  document.getElementById("projectId").value = p?.id || "";
  document.getElementById("projectName").value = p?.name || "";
  document.getElementById("projectDescription").value = p?.description || "";
  document.getElementById("projectStatus").value = p?.status || "active";
  document.getElementById("projectColor").value = p?.color || "#6366f1";
  document.getElementById("projectStartDate").value = p?.start_date || "";
  document.getElementById("projectEndDate").value = p?.end_date || "";
  document.getElementById("projectProgress").value = p?.progress_pct || "";
  document.getElementById("projectNotes").value = p?.notes || "";
  document.getElementById("deleteProjectBtn").hidden = !p;
  document.getElementById("projectModal").hidden = false;
  setTimeout(() => document.getElementById("projectName").focus(), 0);
}

function closeProjectModal() {
  document.getElementById("projectModal").hidden = true;
  STATE.editingProjectId = null;
}

// ════════════════════════════════════════════════════════
// 5) CALENDAR (월간)
// ════════════════════════════════════════════════════════
function renderCalendar() {
  if (!STATE.calCursor) STATE.calCursor = startOfMonth(new Date());
  const cur = STATE.calCursor;
  document.getElementById("calMonthLabel").textContent =
    `${cur.getFullYear()}년 ${cur.getMonth() + 1}월`;

  const grid = document.getElementById("calGrid");
  const firstDay = new Date(cur.getFullYear(), cur.getMonth(), 1);
  const startWeekDay = firstDay.getDay();
  const start = new Date(firstDay);
  start.setDate(1 - startWeekDay);

  const today = startOfDay(new Date());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const isOther = d.getMonth() !== cur.getMonth();
    const isToday = d.getTime() === today.getTime();
    const dateStr = dateOnly(d);
    const events = collectCalendarEvents(dateStr);
    const evHtml = events.slice(0, 4).map(e =>
      `<div class="cal-event ${e.cls}" title="${escapeAttr(e.title)}">${escapeHtml(e.title)}</div>`
    ).join("");
    const more = events.length > 4
      ? `<div class="cal-event" style="opacity:0.7;">+${events.length - 4}</div>` : "";
    cells.push(`
      <div class="cal-cell ${isOther ? "is-other-month" : ""} ${isToday ? "is-today" : ""}"
           data-date="${dateStr}">
        <div class="cal-day">${d.getDate()}</div>
        <div class="cal-events">${evHtml}${more}</div>
      </div>
    `);
  }
  grid.innerHTML = cells.join("");
  grid.querySelectorAll(".cal-cell").forEach(cell => {
    cell.addEventListener("click", () => {
      // 클릭 → daily 탭으로 + 해당 날짜
      STATE.dailyDate = cell.dataset.date;
      setTab("daily");
    });
  });
}

function collectCalendarEvents(dateStr) {
  const events = [];
  STATE.tasks.forEach(t => {
    if (t.due_date === dateStr) {
      events.push({ title: `📋 ${t.title}`, cls: "is-task" });
    }
  });
  STATE.projects.forEach(p => {
    if (p.start_date === dateStr) {
      events.push({ title: `▶ ${p.name} 시작`, cls: "is-project-start" });
    }
    if (p.end_date === dateStr) {
      events.push({ title: `⏹ ${p.name} 종료`, cls: "is-project-end" });
    }
  });
  return events;
}

// ════════════════════════════════════════════════════════
// 6) GANTT (365일 일단위)
// ════════════════════════════════════════════════════════
function renderGantt() {
  const wrap = document.getElementById("ganttWrap");
  const cellW = STATE.ganttCellW;
  const labelW = 200;
  const today = startOfDay(new Date());

  // 365일 윈도우: 30일 전 ~ 335일 후 (총 365일, 오늘 위치는 31번째)
  const windowStart = new Date(today);
  windowStart.setDate(today.getDate() - 30);
  const totalDays = 365;

  // 행: 진행 중·일시정지·완료 모든 프로젝트 (start/end 있는 것만)
  const projects = STATE.projects.filter(p => p.start_date || p.end_date);

  if (!projects.length) {
    wrap.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📊</div>
      <div>간트차트에 표시할 프로젝트가 없습니다.<br>
      프로젝트의 시작일/종료일을 설정해주세요.</div>
    </div>`;
    return;
  }

  // grid-template-columns 동적 설정
  const tableCols = `${labelW}px repeat(${totalDays}, ${cellW}px)`;

  // 월 라벨 행 (sticky top, 22px)
  let monthRowHtml = `<div class="gantt-month-corner"></div>`;
  let prevMonth = -1;
  let monthSpanStart = 0;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(windowStart);
    d.setDate(windowStart.getDate() + i);
    if (d.getMonth() !== prevMonth) {
      if (prevMonth !== -1) {
        const span = i - monthSpanStart;
        const dStart = new Date(windowStart);
        dStart.setDate(windowStart.getDate() + monthSpanStart);
        monthRowHtml += `<div class="gantt-month-label" style="grid-column: span ${span};">
          ${dStart.getFullYear()}년 ${dStart.getMonth() + 1}월
        </div>`;
      }
      prevMonth = d.getMonth();
      monthSpanStart = i;
    }
  }
  // 마지막 월
  const span = totalDays - monthSpanStart;
  const dStart = new Date(windowStart);
  dStart.setDate(windowStart.getDate() + monthSpanStart);
  monthRowHtml += `<div class="gantt-month-label" style="grid-column: span ${span};">
    ${dStart.getFullYear()}년 ${dStart.getMonth() + 1}월
  </div>`;

  // 일 헤더 행
  let headerRowHtml = `<div class="gantt-header-corner">프로젝트</div>`;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(windowStart);
    d.setDate(windowStart.getDate() + i);
    const isToday = d.getTime() === today.getTime();
    const wd = d.getDay();
    const cls = [
      isToday ? "is-today" : "",
      (wd === 0 || wd === 6) ? "is-weekend" : "",
      wd === 0 ? "is-sunday" : "",
      wd === 6 ? "is-saturday" : "",
    ].join(" ");
    headerRowHtml += `
      <div class="gantt-header-day ${cls}">
        <div class="ghd-day">${d.getDate()}</div>
        <div>${["일","월","화","수","목","금","토"][wd]}</div>
      </div>
    `;
  }

  // 프로젝트 행들
  let bodyHtml = "";
  projects.forEach(p => {
    bodyHtml += `<div class="gantt-row-label">
      <span class="grl-color" style="background:${escapeAttr(p.color || COLOR_FALLBACK)}"></span>
      ${escapeHtml(p.name)}
    </div>`;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(windowStart);
      d.setDate(windowStart.getDate() + i);
      const wd = d.getDay();
      const cls = [
        (wd === 0 || wd === 6) ? "is-weekend" : "",
        d.getDate() === 1 ? "is-month-start" : "",
      ].join(" ");
      bodyHtml += `<div class="gantt-cell ${cls}"></div>`;
    }
  });

  wrap.innerHTML = `
    <div class="gantt-table" style="grid-template-columns: ${tableCols};">
      ${monthRowHtml}
      ${headerRowHtml}
      ${bodyHtml}
    </div>
  `;

  // 막대 + 오늘 세로선 — DOM 위에 absolute 로 그리기
  const table = wrap.querySelector(".gantt-table");
  const headerHeight = 22 + 44; // month row + day row
  const rowH = 44;

  projects.forEach((p, rowIdx) => {
    if (!p.start_date || !p.end_date) {
      // start 만 또는 end 만 있으면 점 하나
      const single = p.start_date || p.end_date;
      const idx = dayIndexFromStart(windowStart, single, totalDays);
      if (idx < 0) return;
      const x = labelW + idx * cellW;
      const y = headerHeight + rowIdx * rowH;
      const bar = document.createElement("div");
      bar.className = "gantt-bar";
      bar.style.left = `${x + 2}px`;
      bar.style.width = `${cellW - 4}px`;
      bar.style.top = `${y + 8}px`;
      bar.style.height = `${rowH - 16}px`;
      bar.style.background = p.color || COLOR_FALLBACK;
      bar.textContent = p.name;
      bar.addEventListener("click", () => openProjectModal(p.id));
      table.appendChild(bar);
      return;
    }
    const startIdx = dayIndexFromStart(windowStart, p.start_date, totalDays);
    const endIdx = dayIndexFromStart(windowStart, p.end_date, totalDays);
    // 윈도우 밖 처리
    const visibleStart = Math.max(0, startIdx);
    const visibleEnd = Math.min(totalDays - 1, endIdx);
    if (visibleEnd < 0 || visibleStart > totalDays - 1 || visibleStart > visibleEnd) return;
    const x = labelW + visibleStart * cellW;
    const w = (visibleEnd - visibleStart + 1) * cellW;
    const y = headerHeight + rowIdx * rowH;
    const bar = document.createElement("div");
    bar.className = `gantt-bar ${p.status === "done" ? "is-done" : ""}`;
    bar.style.left = `${x + 2}px`;
    bar.style.width = `${w - 4}px`;
    bar.style.top = `${y + 8}px`;
    bar.style.height = `${rowH - 16}px`;
    bar.style.background = p.color || COLOR_FALLBACK;
    bar.textContent = p.name;
    bar.title = `${p.name} (${p.start_date} ~ ${p.end_date})`;
    bar.addEventListener("click", () => openProjectModal(p.id));
    table.appendChild(bar);
  });

  // 오늘 세로선
  const todayIdx = dayIndexFromStart(windowStart, dateOnly(today), totalDays);
  if (todayIdx >= 0 && todayIdx < totalDays) {
    const todayLine = document.createElement("div");
    todayLine.className = "gantt-today-line";
    todayLine.style.left = `${labelW + todayIdx * cellW + cellW / 2}px`;
    todayLine.style.height = `${headerHeight + projects.length * rowH - 22}px`;
    table.appendChild(todayLine);
  }

  // 오늘 위치로 자동 스크롤 (1회만)
  if (todayIdx >= 0) {
    const targetLeft = labelW + todayIdx * cellW - wrap.clientWidth / 2 + cellW / 2;
    wrap.scrollLeft = Math.max(0, targetLeft);
  }
}

function dayIndexFromStart(windowStart, dateStr, totalDays) {
  if (!dateStr) return -1;
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d - windowStart) / (24 * 3600 * 1000));
  return diff;
}

// ════════════════════════════════════════════════════════
// 7) DAILY LOG
// ════════════════════════════════════════════════════════
async function renderDailyEditor() {
  document.getElementById("dailyDateInput").value = STATE.dailyDate;
  // 해당 날짜 로그 로드
  let isEmpty = true;
  try {
    const log = await api("GET", `/api/me/daily-logs/${STATE.dailyDate}`);
    document.getElementById("dailyContent").value = log.content || "";
    isEmpty = !(log.content && log.content.trim());
    STATE.dailyDirty = false;
    setDailyStatus(isEmpty ? "" : "saved", isEmpty ? "변경사항 없음" : "저장됨");
  } catch (e) {
    if (e.message && !e.message.includes("404")) showToast(e.message, true);
    document.getElementById("dailyContent").value = "";
    STATE.dailyDirty = false;
    setDailyStatus("", "변경사항 없음");
  }
  renderDailyList();
  // AI 분석 결과 캐시 로드 (있으면 표시, 없으면 섹션 숨김)
  loadAiExtracts(STATE.dailyDate);

  // Phase 7c: 오늘 로그가 비어있으면 자동 템플릿 한 번 채워주기
  const dailyAutoKey = `me_daily_auto_${STATE.dailyDate}`;
  if (isEmpty && STATE.dailyDate === todayStr() && !sessionStorage.getItem(dailyAutoKey)) {
    sessionStorage.setItem(dailyAutoKey, "1");
    try {
      const data = await api("GET", `/api/me/daily-logs/${STATE.dailyDate}/auto-template`);
      const ta = document.getElementById("dailyContent");
      if (ta && !ta.value.trim() && data && data.template) {
        ta.value = data.template;
        STATE.dailyDirty = true;
        setDailyStatus("dirty", "초안 생성됨 — 검토 후 저장하세요");
      }
    } catch (_) { /* 자동 채우기 실패는 조용히 무시 */ }
  }
}

function renderDailyList() {
  const list = document.getElementById("dailyList");
  const q = STATE.dailySearch.toLowerCase();
  const filtered = q
    ? STATE.dailyLogs.filter(l => (l.content || "").toLowerCase().includes(q))
    : STATE.dailyLogs;
  if (!filtered.length) {
    list.innerHTML = `<div class="widget-empty">${
      q ? "검색 결과가 없습니다." : "최근 로그가 없습니다."
    }</div>`;
    return;
  }
  list.innerHTML = filtered.map(l => `
    <div class="daily-list-item" data-date="${escapeAttr(l.log_date)}">
      <div class="dli-date">${formatDateLong(l.log_date)}</div>
      <div class="dli-preview">${escapeHtml(l.content || "(빈 로그)")}</div>
    </div>
  `).join("");
  list.querySelectorAll(".daily-list-item").forEach(el => {
    el.addEventListener("click", () => {
      STATE.dailyDate = el.dataset.date;
      renderDailyEditor();
    });
  });
}

function setDailyStatus(cls, text) {
  const el = document.getElementById("dailySaveStatus");
  el.classList.remove("is-dirty", "is-saved");
  if (cls) el.classList.add(`is-${cls}`);
  el.textContent = text;
}

async function saveDailyLog(opts = {}) {
  if (STATE.dailySaving) return;
  STATE.dailySaving = true;
  setDailyStatus("dirty", "저장 중...");
  try {
    const content = document.getElementById("dailyContent").value;
    await api("PUT", "/api/me/daily-logs", {
      log_date: STATE.dailyDate,
      content,
    });
    STATE.dailyDirty = false;
    setDailyStatus("saved", "저장됨");
    // 로컬 캐시 업데이트
    const idx = STATE.dailyLogs.findIndex(l => l.log_date === STATE.dailyDate);
    if (idx >= 0) STATE.dailyLogs[idx].content = content;
    else STATE.dailyLogs.unshift({ log_date: STATE.dailyDate, content });
    renderDailyList();
    // 저장 후 AI 캐시 결과를 자동으로 새로고침 (이미 분석된 동일 내용이면 즉시 표시)
    if (!opts.skipAi) loadAiExtracts(STATE.dailyDate);
  } catch (e) {
    showToast(e.message, true);
    setDailyStatus("dirty", "저장 실패 — 재시도하세요");
  } finally {
    STATE.dailySaving = false;
  }
}

// ════════════════════════════════════════════════════════
// AI (Phase 5) — 하루 로그 추출 + 자연어 검색
// ════════════════════════════════════════════════════════

async function ensureAiStatus() {
  if (STATE.aiEnabled !== null) return STATE.aiEnabled;
  try {
    const data = await api("GET", "/api/me/ai/status");
    STATE.aiEnabled = !!data.enabled;
  } catch (e) {
    STATE.aiEnabled = false;
  }
  return STATE.aiEnabled;
}

async function loadAiExtracts(logDate) {
  const section = document.getElementById("aiExtracts");
  if (!section) return;
  const enabled = await ensureAiStatus();
  if (!enabled) {
    STATE.aiExtract = null;
    section.hidden = true;
    return;
  }
  try {
    const data = await api("GET", `/api/me/daily-logs/${logDate}/extracts`);
    if (!data || !data.extract) {
      STATE.aiExtract = null;
      hideAiExtracts();
      return;
    }
    STATE.aiExtract = data;
    renderAiExtracts();
  } catch (e) {
    STATE.aiExtract = null;
    hideAiExtracts();
  }
}

async function analyzeDailyLogNow() {
  const enabled = await ensureAiStatus();
  if (!enabled) {
    showToast("AI 기능이 비활성 상태입니다 (서버에 ANTHROPIC_API_KEY 미설정)", true);
    return;
  }
  if (STATE.aiAnalyzing) return;
  // 미저장 내용이 있으면 먼저 저장
  if (STATE.dailyDirty) {
    await saveDailyLog({ skipAi: true });
  }
  STATE.aiAnalyzing = true;
  const section = document.getElementById("aiExtracts");
  const status = document.getElementById("aiExtractsStatus");
  section.hidden = false;
  section.classList.add("is-analyzing");
  if (status) status.textContent = "분석 중...";
  document.getElementById("aiExtractsBody").innerHTML =
    `<div class="ai-empty">AI 가 하루 로그를 읽고 있어요... (보통 5–10초)</div>`;
  try {
    const data = await api("POST", `/api/me/daily-logs/${STATE.dailyDate}/analyze`);
    if (data.status === "empty") {
      document.getElementById("aiExtractsBody").innerHTML =
        `<div class="ai-empty">로그가 비어있어요. 뭐라도 적어보세요.</div>`;
      STATE.aiExtract = null;
    } else {
      STATE.aiExtract = data;
      renderAiExtracts();
    }
  } catch (e) {
    showToast("AI 분석 실패: " + e.message, true);
    document.getElementById("aiExtractsBody").innerHTML =
      `<div class="ai-empty">분석 중 오류가 발생했어요.</div>`;
  } finally {
    STATE.aiAnalyzing = false;
    section.classList.remove("is-analyzing");
    if (status) status.textContent = "";
  }
}

function hideAiExtracts() {
  const section = document.getElementById("aiExtracts");
  if (section) section.hidden = true;
}

function renderAiExtracts() {
  const section = document.getElementById("aiExtracts");
  const body = document.getElementById("aiExtractsBody");
  if (!section || !body) return;
  const data = STATE.aiExtract;
  if (!data || !data.extract) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  const ex = data.extract;
  const promoted = new Set(data.promoted || []);
  const dismissed = new Set(data.dismissed || []);

  const tasksHtml = renderExtractActionGroup(
    "tasks", ex.tasks || [], promoted, dismissed,
    "📋 할 일 후보", "오늘/단기 안에 해야 할 일",
  );
  const futureHtml = renderExtractActionGroup(
    "future", ex.future || [], promoted, dismissed,
    "📅 앞으로 할 거", "1주 이후 미래 할 일",
  );
  const decisionsHtml = renderExtractDecisions(
    ex.decisions || [], dismissed,
  );
  const tagsHtml = renderExtractTags(ex.tags || []);

  const hasAny =
    (ex.tasks || []).length || (ex.future || []).length ||
    (ex.decisions || []).length || (ex.tags || []).length;

  if (!hasAny) {
    body.innerHTML = `<div class="ai-empty">뽑을 만한 항목이 보이지 않아요. 회의/할 일/결정사항을 더 자세히 적어보세요.</div>`;
  } else {
    body.innerHTML = [tasksHtml, futureHtml, decisionsHtml, tagsHtml].filter(Boolean).join("");
  }

  // 핸들러 바인딩
  body.querySelectorAll("[data-ai-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.aiAction;
      const kind = btn.dataset.aiKind;
      const idx = Number(btn.dataset.aiIndex);
      if (action === "promote") promoteAiExtract(kind, idx);
      else if (action === "dismiss") dismissAiExtract(kind, idx);
      else if (action === "edit") startEditAiExtract(kind, idx);
      else if (action === "edit-confirm") confirmEditAiExtract(kind, idx);
      else if (action === "edit-cancel") cancelEditAiExtract();
    });
  });

  // 편집 모드 input: Enter 로 추가, Esc 로 취소, 자동 포커스
  body.querySelectorAll("[data-ai-edit-input]").forEach(input => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const kind = input.dataset.aiKind;
        const idx = Number(input.dataset.aiIndex);
        confirmEditAiExtract(kind, idx);
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEditAiExtract();
      }
    });
    setTimeout(() => { input.focus(); input.select(); }, 0);
  });
}

function renderExtractActionGroup(kind, items, promoted, dismissed, title, subtitle) {
  if (!items.length) return "";
  const editingKey = STATE.aiEditing;
  const rows = items.map((it, i) => {
    const key = `${kind}:${i}`;
    const isPromoted = promoted.has(key);
    const isDismissed = dismissed.has(key);
    const isEditing = editingKey === key;
    const stateCls = isPromoted
      ? "is-promoted"
      : isDismissed
      ? "is-dismissed"
      : isEditing
      ? "is-editing"
      : "";
    const dueHint = it.due_hint ? `<span class="ai-due">${escapeHtml(it.due_hint)}</span>` : "";
    const titleSafe = escapeHtml(it.title || "");
    const mainHtml = isEditing
      ? `<div class="ai-item-main">
           <input class="ai-edit-input" type="text" data-ai-edit-input data-ai-kind="${kind}" data-ai-index="${i}" value="${titleSafe}" />
         </div>`
      : `<div class="ai-item-main">
           <span class="ai-item-title">${titleSafe}</span>
           ${dueHint}
         </div>`;
    const stateLabel = isPromoted
      ? `<span class="ai-state-label is-done">✓ Task 추가됨</span>`
      : isDismissed
      ? `<span class="ai-state-label is-faint">무시함</span>`
      : isEditing
      ? `<div class="ai-actions">
           <button class="btn-mini btn-mini-primary" data-ai-action="edit-confirm" data-ai-kind="${kind}" data-ai-index="${i}">＋ Task</button>
           <button class="btn-mini btn-mini-ghost" data-ai-action="edit-cancel">취소</button>
         </div>`
      : `<div class="ai-actions">
           <button class="btn-mini btn-mini-primary" data-ai-action="promote" data-ai-kind="${kind}" data-ai-index="${i}">＋ Task</button>
           <button class="btn-mini btn-mini-ghost" data-ai-action="edit" data-ai-kind="${kind}" data-ai-index="${i}">수정</button>
           <button class="btn-mini btn-mini-ghost" data-ai-action="dismiss" data-ai-kind="${kind}" data-ai-index="${i}">무시</button>
         </div>`;
    return `
      <li class="ai-item ${stateCls}">
        ${mainHtml}
        ${stateLabel}
      </li>
    `;
  }).join("");
  return `
    <div class="ai-group">
      <div class="ai-group-head">
        <h4>${title} <span class="ai-count">${items.length}</span></h4>
        <span class="ai-group-sub">${subtitle}</span>
      </div>
      <ul class="ai-list">${rows}</ul>
    </div>
  `;
}

function renderExtractDecisions(items, dismissed) {
  if (!items.length) return "";
  const rows = items.map((it, i) => {
    const key = `decisions:${i}`;
    const isDismissed = dismissed.has(key);
    return `
      <li class="ai-item ${isDismissed ? "is-dismissed" : ""}">
        <div class="ai-item-main">
          <span class="ai-item-title">${escapeHtml(it.summary || "")}</span>
        </div>
        ${isDismissed
          ? `<span class="ai-state-label is-faint">무시함</span>`
          : `<div class="ai-actions">
               <button class="btn-mini btn-mini-ghost" data-ai-action="dismiss" data-ai-kind="decisions" data-ai-index="${i}">무시</button>
             </div>`}
      </li>
    `;
  }).join("");
  return `
    <div class="ai-group">
      <div class="ai-group-head">
        <h4>💡 회의 결정사항 <span class="ai-count">${items.length}</span></h4>
        <span class="ai-group-sub">나중에 검색용으로 기억해둘 메모</span>
      </div>
      <ul class="ai-list">${rows}</ul>
    </div>
  `;
}

function renderExtractTags(tags) {
  if (!tags.length) return "";
  const chips = tags.map(t => `<span class="ai-tag">#${escapeHtml(t)}</span>`).join("");
  return `
    <div class="ai-group ai-group-tags">
      <div class="ai-group-head"><h4>🏷 주제 태그</h4></div>
      <div class="ai-tags">${chips}</div>
    </div>
  `;
}

async function promoteAiExtract(kind, index, titleOverride) {
  if (!STATE.aiExtract || !STATE.aiExtract.id) return;
  const eid = STATE.aiExtract.id;
  try {
    const body = { kind, index, priority: "medium" };
    if (titleOverride) body.title_override = titleOverride;
    const data = await api("POST", `/api/me/extracts/${eid}/promote`, body);
    STATE.aiExtract.promoted = data.promoted || [];
    if (data.task) STATE.tasks.unshift(data.task);
    renderAiExtracts();
    showToast("할 일에 추가됐어요");
  } catch (e) {
    showToast("추가 실패: " + e.message, true);
  }
}

function startEditAiExtract(kind, index) {
  STATE.aiEditing = `${kind}:${index}`;
  renderAiExtracts();
}

function cancelEditAiExtract() {
  if (!STATE.aiEditing) return;
  STATE.aiEditing = null;
  renderAiExtracts();
}

async function confirmEditAiExtract(kind, index) {
  const input = document.querySelector(
    `[data-ai-edit-input][data-ai-kind="${kind}"][data-ai-index="${index}"]`,
  );
  const newTitle = (input?.value || "").trim();
  if (!newTitle) {
    showToast("제목을 입력해주세요", true);
    return;
  }
  STATE.aiEditing = null;
  await promoteAiExtract(kind, index, newTitle);
}

async function dismissAiExtract(kind, index) {
  if (!STATE.aiExtract || !STATE.aiExtract.id) return;
  const eid = STATE.aiExtract.id;
  try {
    const data = await api("POST", `/api/me/extracts/${eid}/dismiss`, { kind, index });
    STATE.aiExtract.dismissed = data.dismissed || [];
    renderAiExtracts();
  } catch (e) {
    showToast("무시 실패: " + e.message, true);
  }
}

// ── 스마트 검색 ──────────────────────────────────────────
async function smartSearch(query) {
  const enabled = await ensureAiStatus();
  if (!enabled) {
    showToast("AI 기능이 비활성 상태입니다 (서버에 ANTHROPIC_API_KEY 미설정)", true);
    return;
  }
  if (STATE.smartSearching) return;
  STATE.smartSearching = true;
  const result = document.getElementById("smartSearchResult");
  const btn = document.getElementById("smartSearchBtn");
  result.hidden = false;
  result.innerHTML = `<div class="ss-loading">하루 로그를 뒤지는 중... (보통 5–10초)</div>`;
  if (btn) btn.disabled = true;
  try {
    const data = await api("POST", "/api/me/search", { query, days: 90 });
    renderSmartSearchResult(data);
  } catch (e) {
    result.innerHTML = `<div class="ss-error">검색 실패: ${escapeHtml(e.message || "")}</div>`;
  } finally {
    STATE.smartSearching = false;
    if (btn) btn.disabled = false;
  }
}

function renderSmartSearchResult(data) {
  const result = document.getElementById("smartSearchResult");
  if (!result) return;
  const answer = (data && data.answer) || "(답변 없음)";
  const sources = (data && data.sources) || [];
  const sourcesHtml = sources.length
    ? `<div class="ss-sources">
         <div class="ss-sources-head">출처</div>
         <ul>
           ${sources.map(s => `
             <li>
               <button class="ss-source-link" data-date="${escapeAttr(s.date)}">${formatDateLong(s.date)}</button>
               <span class="ss-source-snippet">${escapeHtml(s.snippet || "")}</span>
             </li>
           `).join("")}
         </ul>
       </div>`
    : `<div class="ss-sources is-empty">관련된 로그를 찾지 못했어요.</div>`;
  result.innerHTML = `
    <div class="ss-card">
      <div class="ss-header">
        <span class="ai-badge">AI 답변</span>
        <span class="ss-meta">${data.logs_searched || 0}개 로그 검색 · 최근 ${data.days || 90}일</span>
      </div>
      <div class="ss-answer">${escapeHtml(answer)}</div>
      ${sourcesHtml}
    </div>
  `;
  // 출처 클릭 → 그 날짜로 점프
  result.querySelectorAll(".ss-source-link").forEach(btn => {
    btn.addEventListener("click", () => {
      const d = btn.dataset.date;
      if (!d) return;
      STATE.dailyDate = d;
      renderDailyEditor();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

// ════════════════════════════════════════════════════════
// 카테고리 관리 모달 (기존)
// ════════════════════════════════════════════════════════
function openCategoryModal() {
  renderCategoryList();
  document.getElementById("categoryModal").hidden = false;
}
function closeCategoryModal() {
  document.getElementById("categoryModal").hidden = true;
}

function renderCategoryList() {
  const ul = document.getElementById("categoryList");
  if (STATE.categories.length === 0) {
    ul.innerHTML = `<li style="color:var(--text-faint);padding:8px 4px;">카테고리가 없습니다.</li>`;
    return;
  }
  ul.innerHTML = STATE.categories.map(c => `
    <li class="cat-item" data-id="${c.id}">
      <label class="cat-color" style="background:${escapeAttr(c.color)}">
        <input type="color" value="${escapeAttr(c.color)}" data-action="color" />
      </label>
      <input class="cat-name" type="text" value="${escapeAttr(c.name)}" data-action="rename" maxlength="30" />
      <button class="cat-delete" data-action="delete" title="삭제">🗑</button>
    </li>
  `).join("");
  ul.querySelectorAll(".cat-item").forEach(li => {
    const id = Number(li.dataset.id);
    li.querySelector('[data-action="color"]').addEventListener("change", async e => {
      const color = e.target.value;
      li.querySelector(".cat-color").style.background = color;
      try {
        await api("PATCH", `/api/me/categories/${id}`, { color });
        const c = STATE.categories.find(c => c.id === id); if (c) c.color = color;
        renderAll();
      } catch (e) { showToast(e.message, true); }
    });
    li.querySelector('[data-action="rename"]').addEventListener("blur", async e => {
      const name = e.target.value.trim();
      const c = STATE.categories.find(c => c.id === id);
      if (!c || !name || name === c.name) return;
      try {
        await api("PATCH", `/api/me/categories/${id}`, { name });
        await refreshAll();
        openCategoryModal();
      } catch (err) {
        e.target.value = c.name;
        showToast(err.message, true);
      }
    });
    li.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      const c = STATE.categories.find(c => c.id === id);
      if (!c) return;
      if (!confirm(`"${c.name}" 카테고리를 삭제할까요?\n이 카테고리의 업무들은 "미분류"로 이동합니다.`)) return;
      try {
        await api("DELETE", `/api/me/categories/${id}`);
        await refreshAll();
        openCategoryModal();
      } catch (e) { showToast(e.message, true); }
    });
  });
}

// ════════════════════════════════════════════════════════
// 이벤트 바인딩
// ════════════════════════════════════════════════════════
function bindEvents() {
  // 큰 네비
  document.querySelectorAll(".nav-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      // 탭 직접 클릭은 항상 전체 보기 (피드백 태그 필터 해제)
      STATE.inboxTagFilter = null;
      setTab(btn.dataset.tab);
    });
  });

  // 프로젝트 상세 — 뒤로가기
  const pdBack = document.getElementById("projectDetailBack");
  if (pdBack) pdBack.addEventListener("click", () => setTab("projects"));

  // Tasks 안의 list/kanban 토글
  document.querySelectorAll(".view-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      STATE.view = btn.dataset.view;
      renderTasks();
    });
  });

  document.getElementById("searchInput").addEventListener("input", e => {
    STATE.search = e.target.value;
    renderTasks();
  });
  document.getElementById("sortSelect").addEventListener("change", e => {
    STATE.sort = e.target.value;
    renderTasks();
  });

  // FAB / 카테고리 관리
  document.getElementById("newTaskBtn").addEventListener("click", () => openTaskModal(null));
  document.getElementById("manageCategoriesBtn").addEventListener("click", openCategoryModal);

  // ── Quick capture (Dashboard) ─────────────────────────
  const qcInput = document.getElementById("quickCaptureInput");
  const qcPreview = document.getElementById("quickCapturePreview");

  function refreshQcPreview() {
    if (!qcPreview) return;
    const val = qcInput.value;
    const parsed = parseNL(val);
    if (parsed && parsed.type === "task") {
      const cat = guessCategory(parsed.title);
      const catChip = cat ? `  #${cat}` : "";
      qcPreview.hidden = false;
      qcPreview.textContent = `→ 할 일로 인식: ${parsed.preview}${catChip}`;
      qcPreview.classList.add("is-task");
    } else if (val.trim()) {
      qcPreview.hidden = false;
      qcPreview.textContent = "→ 할 일로 저장됩니다";
      qcPreview.classList.remove("is-task");
    } else {
      qcPreview.hidden = true;
    }
  }
  qcInput.addEventListener("input", refreshQcPreview);

  document.getElementById("quickCaptureForm").addEventListener("submit", e => {
    e.preventDefault();
    const val = qcInput.value;
    qcInput.value = "";
    refreshQcPreview();
    const parsed = parseNL(val);
    if (parsed && parsed.type === "task") {
      addTaskFromNL(parsed);
    } else {
      addQuickTask(val);
    }
  });

  // ── Inbox 입력 ────────────────────────────────────────
  document.getElementById("inboxAddForm").addEventListener("submit", e => {
    e.preventDefault();
    const input = document.getElementById("inboxAddInput");
    const val = input.value;
    input.value = "";
    addInbox(val);
  });
  document.querySelectorAll(".inbox-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      STATE.inboxFilter = btn.dataset.inboxTab;
      refreshInboxOnly();
    });
  });

  // ── Phase 6d: AI Inbox 정리 ───────────────────────────
  const aiBtn = document.getElementById("inboxAiBtn");
  if (aiBtn) aiBtn.addEventListener("click", aiClassifyBulk);

  // ── Project ───────────────────────────────────────────
  document.getElementById("newProjectBtn").addEventListener("click", () => openProjectModal(null));

  document.getElementById("projectForm").addEventListener("submit", async e => {
    e.preventDefault();
    const id = STATE.editingProjectId;
    const progressVal = document.getElementById("projectProgress").value;
    const payload = {
      name: document.getElementById("projectName").value.trim(),
      description: document.getElementById("projectDescription").value,
      status: document.getElementById("projectStatus").value,
      color: document.getElementById("projectColor").value,
      start_date: document.getElementById("projectStartDate").value || null,
      end_date: document.getElementById("projectEndDate").value || null,
      progress_pct: progressVal === "" ? 0 : Number(progressVal),
      notes: document.getElementById("projectNotes").value,
    };
    try {
      if (id) {
        const updated = await api("PATCH", `/api/me/projects/${id}`, payload);
        const idx = STATE.projects.findIndex(p => p.id === id);
        if (idx >= 0) STATE.projects[idx] = updated;
      } else {
        const created = await api("POST", "/api/me/projects", payload);
        STATE.projects.unshift(created);
      }
      closeProjectModal();
      renderAll();
      showToast(id ? "수정 완료" : "프로젝트 생성");
    } catch (e) { showToast(e.message, true); }
  });

  document.getElementById("deleteProjectBtn").addEventListener("click", async () => {
    const id = STATE.editingProjectId;
    if (!id) return;
    if (!confirm("이 프로젝트를 삭제할까요?\n연결된 Tasks 는 유지되지만 프로젝트 연결은 풀립니다.")) return;
    try {
      await api("DELETE", `/api/me/projects/${id}`);
      STATE.projects = STATE.projects.filter(p => p.id !== id);
      // 로컬에서 task.project_id 도 해제
      STATE.tasks.forEach(t => { if (t.project_id === id) t.project_id = null; });
      closeProjectModal();
      renderAll();
      showToast("프로젝트 삭제됨");
    } catch (e) { showToast(e.message, true); }
  });

  // ── Promote 모달 ──────────────────────────────────────
  document.getElementById("promoteForm").addEventListener("submit", e => {
    e.preventDefault();
    submitPromote();
  });

  // ── Calendar ──────────────────────────────────────────
  document.getElementById("calPrevBtn").addEventListener("click", () => {
    STATE.calCursor = new Date(STATE.calCursor.getFullYear(), STATE.calCursor.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById("calNextBtn").addEventListener("click", () => {
    STATE.calCursor = new Date(STATE.calCursor.getFullYear(), STATE.calCursor.getMonth() + 1, 1);
    renderCalendar();
  });
  document.getElementById("calTodayBtn").addEventListener("click", () => {
    STATE.calCursor = startOfMonth(new Date());
    renderCalendar();
  });

  // ── Gantt ─────────────────────────────────────────────
  document.getElementById("ganttZoom").addEventListener("change", e => {
    STATE.ganttCellW = Number(e.target.value);
    renderGantt();
  });
  document.getElementById("ganttJumpToday").addEventListener("click", renderGantt);

  // ── Daily Log ─────────────────────────────────────────
  document.getElementById("dailyDateInput").addEventListener("change", e => {
    STATE.dailyDate = e.target.value;
    renderDailyEditor();
  });
  const dailyContent = document.getElementById("dailyContent");
  dailyContent.addEventListener("input", () => {
    STATE.dailyDirty = true;
    setDailyStatus("dirty", "변경사항 있음 — Ctrl/⌘+S 또는 저장 버튼");
  });
  // Ctrl/Cmd + S
  dailyContent.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveDailyLog();
    }
  });
  // 자동 저장 (blur 시)
  dailyContent.addEventListener("blur", () => {
    if (STATE.dailyDirty) saveDailyLog();
  });
  document.getElementById("dailySaveBtn").addEventListener("click", () => saveDailyLog());
  document.getElementById("dailySearchInput").addEventListener("input", e => {
    STATE.dailySearch = e.target.value;
    renderDailyList();
  });

  // ── AI (Phase 5) ─────────────────────────────────────
  const dailyAnalyzeBtn = document.getElementById("dailyAnalyzeBtn");
  if (dailyAnalyzeBtn) dailyAnalyzeBtn.addEventListener("click", () => analyzeDailyLogNow());

  // ── Phase 7a: 브리핑 새로고침 ─────────────────────────
  const briefingRefreshBtn = document.getElementById("briefingRefreshBtn");
  if (briefingRefreshBtn) briefingRefreshBtn.addEventListener("click", () => loadBriefing(true));

  // ── Phase 8: AI 사용량 위젯 ──────────────────────────
  const aiuRefresh = document.getElementById("aiUsageRefreshBtn");
  if (aiuRefresh) aiuRefresh.addEventListener("click", () => loadAiUsage(true));
  const aiuDetail = document.getElementById("aiUsageDetailBtn");
  if (aiuDetail) aiuDetail.addEventListener("click", openAiUsageModal);

  // ── Phase 7c: 하루로그 자동 채우기 ──────────────────
  const dailyAutoFillBtn = document.getElementById("dailyAutoFillBtn");
  if (dailyAutoFillBtn) dailyAutoFillBtn.addEventListener("click", dailyAutoFill);
  const aiRefresh = document.getElementById("aiExtractsRefresh");
  if (aiRefresh) aiRefresh.addEventListener("click", () => analyzeDailyLogNow());

  const smartForm = document.getElementById("smartSearchForm");
  if (smartForm) {
    smartForm.addEventListener("submit", e => {
      e.preventDefault();
      const input = document.getElementById("smartSearchInput");
      const q = (input.value || "").trim();
      if (!q) return;
      smartSearch(q);
    });
  }

  // ── 모달 닫기/배경 클릭 ───────────────────────────────
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.close;
      if (target === "task") closeTaskModal();
      else if (target === "category") closeCategoryModal();
      else if (target === "project") closeProjectModal();
      else if (target === "promote") closePromoteModal();
      else if (target === "aiUsage") closeAiUsageModal();
      else if (target === "snippet") closeSnippetModal();
    });
  });
  document.querySelectorAll(".modal-backdrop").forEach(bd => {
    bd.addEventListener("click", e => {
      if (e.target === bd) bd.hidden = true;
    });
  });

  // ── Task 모달 ─────────────────────────────────────────
  document.getElementById("taskForm").addEventListener("submit", async e => {
    e.preventDefault();
    const id = STATE.editingTaskId;
    const payload = {
      title: document.getElementById("taskTitle").value.trim(),
      category: document.getElementById("taskCategory").value || null,
      project_id: parseIntOrNull(document.getElementById("taskProject").value),
      status: document.getElementById("taskStatus").value,
      priority: document.getElementById("taskPriority").value,
      start_date: document.getElementById("taskStartDate").value || null,
      due_date: document.getElementById("taskDueDate").value || null,
      actual_start_date: document.getElementById("taskActualStart").value || null,
      actual_end_date: document.getElementById("taskActualEnd").value || null,
      tags: document.getElementById("taskTags").value
        .split(",").map(s => s.trim()).filter(Boolean),
      notes: document.getElementById("taskNotes").value,
    };
    try {
      if (id) {
        const updated = await api("PATCH", `/api/me/tasks/${id}`, payload);
        const idx = STATE.tasks.findIndex(t => t.id === id);
        if (idx >= 0) STATE.tasks[idx] = updated;
      } else {
        const created = await api("POST", "/api/me/tasks", payload);
        STATE.tasks.unshift(created);
      }
      closeTaskModal();
      // 프로젝트 진행률 갱신
      refreshProjectsOnly();
      renderAll();
      showToast(id ? "수정 완료" : "추가 완료");
    } catch (err) { showToast(err.message, true); }
  });

  document.getElementById("deleteTaskBtn").addEventListener("click", async () => {
    const id = STATE.editingTaskId;
    if (!id) return;
    if (!confirm("이 업무를 삭제할까요?")) return;
    try {
      await api("DELETE", `/api/me/tasks/${id}`);
      // 하위 작업도 DB에서 cascade 삭제되므로 로컬에서도 같이 제거
      STATE.tasks = STATE.tasks.filter(t => t.id !== id && t.parent_task_id !== id);
      closeTaskModal();
      refreshProjectsOnly();
      renderAll();
      showToast("삭제됨");
    } catch (err) { showToast(err.message, true); }
  });

  // ── 카테고리 추가 ─────────────────────────────────────
  document.getElementById("categoryAddForm").addEventListener("submit", async e => {
    e.preventDefault();
    const name = document.getElementById("newCategoryName").value.trim();
    const color = document.getElementById("newCategoryColor").value;
    if (!name) return;
    try {
      const created = await api("POST", "/api/me/categories", {
        name, color, sort_order: STATE.categories.length + 1,
      });
      STATE.categories.push(created);
      document.getElementById("newCategoryName").value = "";
      renderCategoryList();
      renderAll();
    } catch (err) { showToast(err.message, true); }
  });
}

// ════════════════════════════════════════════════════════
// 유틸
// ════════════════════════════════════════════════════════
function escapeAttr(s) { return String(s ?? "").replace(/"/g, "&quot;"); }
function hexToBg(hex) {
  if (!hex || hex[0] !== "#" || hex.length !== 7) return "rgba(99,102,241,0.15)";
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},0.15)`;
}
function parseIntOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function startOfDay(d) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function dateOnly(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayStr() { return dateOnly(new Date()); }
function formatDateLong(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const wd = ["일","월","화","수","목","금","토"][d.getDay()];
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${wd})`;
}
function relativeTime(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

let toastTimer;
function showToast(msg, isError) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.toggle("is-error", !!isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

// ════════════════════════════════════════════════════════
// Command Palette (Cmd/Ctrl + K)  — Phase 6b
// ════════════════════════════════════════════════════════
const CMDK = {
  open: false,
  results: [],
  activeIndex: 0,
};

function openCmdk() {
  if (CMDK.open) return;
  CMDK.open = true;
  const bd = document.getElementById("cmdkBackdrop");
  const input = document.getElementById("cmdkInput");
  bd.hidden = false;
  input.value = "";
  CMDK.activeIndex = 0;
  refreshCmdk("");
  setTimeout(() => input.focus(), 10);
}

function closeCmdk() {
  if (!CMDK.open) return;
  CMDK.open = false;
  document.getElementById("cmdkBackdrop").hidden = true;
}

function fuzzyMatch(text, q) {
  if (!q) return true;
  return (text || "").toLowerCase().includes(q.toLowerCase());
}

// ════════════════════════════════════════════════════════
// 전달함 (Snippets) — 맥↔회사 노트북 코드 브릿지
// ════════════════════════════════════════════════════════
const TB4_PARTS = [
  { key: "html", label: "HTML" },
  { key: "css", label: "CSS" },
  { key: "js", label: "JavaScript" },
  { key: "settings", label: "Settings" },
];

async function loadSnippets() {
  try {
    STATE.snippets = (await api("GET", "/api/me/snippets")) || [];
    STATE.snippetsLoaded = true;
    if (STATE.tab === "snippets") renderSnippets();
  } catch (e) {
    showToast(e.message, true);
  }
}

async function copyText(text, okMsg) {
  const s = String(text ?? "");
  if (!s) { showToast("복사할 내용이 없어요", true); return; }
  try {
    await navigator.clipboard.writeText(s);
    showToast(okMsg || "복사됐어요 📋");
  } catch {
    // 비보안 컨텍스트 등 fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = s;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast(okMsg || "복사됐어요 📋");
    } catch {
      showToast("복사 실패 — 직접 선택해 주세요", true);
    }
  }
}

function snipKindLabel(kind) {
  return kind === "tb4" ? "TB 4파트" : "단일";
}

function snipPreview(text) {
  const t = String(text || "");
  const clip = t.length > 600 ? t.slice(0, 600) + "\n…" : t;
  return escapeHtml(clip);
}

function snippetCardHtml(s) {
  const title = escapeHtml(s.title || "(제목 없음)");
  const when = s.updated_at ? relativeTime(s.updated_at) : "";
  const expanded = !!STATE.snipExpanded[s.id];
  let body = "";
  if (expanded) {
    if (s.kind === "tb4") {
      body = TB4_PARTS.map(p => {
        const val = s[p.key] || "";
        if (!String(val).trim()) return "";
        return `<div class="snip-part">
          <div class="snip-part-head">
            <span class="snip-part-label">${p.label}</span>
            <button class="btn btn-outline btn-sm snip-copy" data-id="${s.id}" data-part="${p.key}">📋 복사</button>
          </div>
          <pre class="snip-pre">${snipPreview(val)}</pre>
        </div>`;
      }).join("") || `<div class="snip-empty-body">내용 없음</div>`;
    } else {
      body = `<div class="snip-part">
        <pre class="snip-pre">${snipPreview(s.content)}</pre>
      </div>`;
    }
    body = `<div class="snip-body">${body}</div>`;
  }
  // 접힌 한 줄이 기본 — 단일 코드는 펼치지 않고도 헤더의 📋복사 한 번이면 끝
  const copyBtn = s.kind === "tb4"
    ? ""
    : `<button class="btn btn-primary btn-sm snip-copy" data-id="${s.id}" data-part="content">📋 복사</button>`;
  return `<div class="snip-card ${expanded ? "is-open" : ""}" data-id="${s.id}">
    <div class="snip-card-head snip-toggle" data-id="${s.id}" title="${expanded ? "접기" : "펼쳐서 내용 보기"}">
      <div class="snip-card-title">
        <span class="snip-caret">${expanded ? "▾" : "▸"}</span>
        <span class="snip-kind-badge ${s.kind === "tb4" ? "is-tb4" : ""}">${snipKindLabel(s.kind)}</span>
        <span class="snip-title-text">${title}</span>
      </div>
      <div class="snip-card-actions">
        ${when ? `<span class="snip-when">${escapeHtml(when)}</span>` : ""}
        ${copyBtn}
        <button class="icon-btn snip-edit" data-id="${s.id}" title="편집">✎</button>
        <button class="icon-btn snip-del" data-id="${s.id}" title="삭제">🗑</button>
      </div>
    </div>
    ${body}
  </div>`;
}

function renderSnippets() {
  const list = document.getElementById("snipList");
  if (!list) return;
  if (!STATE.snippetsLoaded && !STATE.snippets.length) {
    list.innerHTML = `<div class="snip-loading">불러오는 중…</div>`;
    return;
  }
  if (!STATE.snippets.length) {
    list.innerHTML = `<div class="empty-state">아직 담아둔 코드가 없어요.<br><small>맥에서 ＋코드 추가로 붙여넣고, 회사 노트북에서 열어 📋복사하세요.</small></div>`;
    return;
  }
  const total = STATE.snippets.length;
  const shown = STATE.snippets.slice(0, STATE.snipShown);
  const moreLeft = total - shown.length;
  list.innerHTML =
    `<div class="snip-count">${total}개</div>` +
    shown.map(snippetCardHtml).join("") +
    (moreLeft > 0
      ? `<button class="btn btn-outline snip-more" id="snipMoreBtn">더 보기 (${moreLeft}개 남음)</button>`
      : "");
  list.querySelectorAll(".snip-copy").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const s = STATE.snippets.find(x => x.id === Number(btn.dataset.id));
      if (!s) return;
      const part = btn.dataset.part;
      const label = part === "content" ? "코드" : part.toUpperCase();
      copyText(s[part], `${label} 복사됨 📋`);
    });
  });
  list.querySelectorAll(".snip-edit").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      openSnippetModal(Number(btn.dataset.id));
    });
  });
  list.querySelectorAll(".snip-del").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      deleteSnippetById(Number(btn.dataset.id));
    });
  });
  list.querySelectorAll(".snip-toggle").forEach(head => {
    head.addEventListener("click", () => {
      const id = Number(head.dataset.id);
      if (STATE.snipExpanded[id]) delete STATE.snipExpanded[id];
      else STATE.snipExpanded[id] = true;
      renderSnippets();
    });
  });
  const moreBtn = document.getElementById("snipMoreBtn");
  if (moreBtn) moreBtn.addEventListener("click", () => {
    STATE.snipShown += 15;
    renderSnippets();
  });
}

/** 카드에서 바로 삭제 — 편집 모달 안 거침 */
async function deleteSnippetById(id) {
  const s = STATE.snippets.find(x => x.id === id);
  if (!s) return;
  if (!confirm(`"${s.title || "(제목 없음)"}" 삭제할까요?`)) return;
  try {
    await api("DELETE", `/api/me/snippets/${id}`);
    STATE.snippets = STATE.snippets.filter(x => x.id !== id);
    delete STATE.snipExpanded[id];
    renderSnippets();
    showToast("삭제됐어요");
  } catch (e) {
    showToast(e.message, true);
  }
}

/** 전달함 전체 비우기 */
async function clearAllSnippets() {
  const n = STATE.snippets.length;
  if (!n) { showToast("이미 비어 있어요"); return; }
  if (!confirm(`전달함을 전부 비울까요? ${n}개가 삭제되고 되돌릴 수 없어요.`)) return;
  try {
    const res = await api("DELETE", "/api/me/snippets");
    STATE.snippets = [];
    STATE.snipExpanded = {};
    STATE.snipShown = 15;
    renderSnippets();
    showToast(`${res.deleted ?? n}개 삭제됐어요 🧹`);
  } catch (e) {
    showToast(e.message, true);
  }
}

function setSnippetKind(kind) {
  STATE.snippetKind = kind === "tb4" ? "tb4" : "single";
  document.querySelectorAll(".snip-kind-btn").forEach(b => {
    b.classList.toggle("is-active", b.dataset.snipkind === STATE.snippetKind);
  });
  const single = document.getElementById("snipFieldsSingle");
  const tb4 = document.getElementById("snipFieldsTb4");
  if (single) single.hidden = STATE.snippetKind !== "single";
  if (tb4) tb4.hidden = STATE.snippetKind !== "tb4";
}

function openSnippetModal(id) {
  const modal = document.getElementById("snippetModal");
  if (!modal) return;
  STATE.editingSnippetId = id || null;
  const s = id ? STATE.snippets.find(x => x.id === id) : null;
  document.getElementById("snippetModalTitle").textContent = s ? "코드 편집" : "새 코드";
  document.getElementById("snippetId").value = s ? s.id : "";
  document.getElementById("snipTitle").value = s ? (s.title || "") : "";
  document.getElementById("snipContent").value = s ? (s.content || "") : "";
  document.getElementById("snipHtml").value = s ? (s.html || "") : "";
  document.getElementById("snipCss").value = s ? (s.css || "") : "";
  document.getElementById("snipJs").value = s ? (s.js || "") : "";
  document.getElementById("snipSettings").value = s ? (s.settings || "") : "";
  setSnippetKind(s ? s.kind : "single");
  document.getElementById("deleteSnippetBtn").hidden = !s;
  modal.hidden = false;
}

function closeSnippetModal() {
  const modal = document.getElementById("snippetModal");
  if (modal) modal.hidden = true;
  STATE.editingSnippetId = null;
}

async function saveSnippet(e) {
  e.preventDefault();
  const id = STATE.editingSnippetId;
  const kind = STATE.snippetKind;
  const payload = { title: document.getElementById("snipTitle").value.trim(), kind };
  if (kind === "tb4") {
    payload.html = document.getElementById("snipHtml").value;
    payload.css = document.getElementById("snipCss").value;
    payload.js = document.getElementById("snipJs").value;
    payload.settings = document.getElementById("snipSettings").value;
    payload.content = "";
  } else {
    payload.content = document.getElementById("snipContent").value;
    payload.html = ""; payload.css = ""; payload.js = ""; payload.settings = "";
  }
  try {
    if (id) {
      const updated = await api("PATCH", `/api/me/snippets/${id}`, payload);
      const i = STATE.snippets.findIndex(x => x.id === id);
      if (i >= 0) STATE.snippets[i] = updated;
    } else {
      const created = await api("POST", "/api/me/snippets", payload);
      STATE.snippets.unshift(created);
    }
    closeSnippetModal();
    renderSnippets();
    showToast("저장됐어요");
  } catch (err) {
    showToast(err.message, true);
  }
}

async function deleteSnippet() {
  const id = STATE.editingSnippetId;
  if (!id) return;
  if (!confirm("이 코드를 삭제할까요?")) return;
  try {
    await api("DELETE", `/api/me/snippets/${id}`);
    STATE.snippets = STATE.snippets.filter(x => x.id !== id);
    closeSnippetModal();
    renderSnippets();
    showToast("삭제됐어요");
  } catch (e) {
    showToast(e.message, true);
  }
}

function bindSnippets() {
  const newBtn = document.getElementById("newSnippetBtn");
  if (newBtn) newBtn.addEventListener("click", () => openSnippetModal(null));
  const form = document.getElementById("snippetForm");
  if (form) form.addEventListener("submit", saveSnippet);
  const delBtn = document.getElementById("deleteSnippetBtn");
  if (delBtn) delBtn.addEventListener("click", deleteSnippet);
  const clearBtn = document.getElementById("clearSnippetsBtn");
  if (clearBtn) clearBtn.addEventListener("click", clearAllSnippets);
  document.querySelectorAll(".snip-kind-btn").forEach(b => {
    b.addEventListener("click", () => setSnippetKind(b.dataset.snipkind));
  });
}

// ════════════════════════════════════════════════════════
// 프라이버시 모드 (어깨너머·흔적 방어 — 네트워크 로그는 못 막음)
// ════════════════════════════════════════════════════════
const PRIVACY_KEY = "me_privacy_blur";

function bindPrivacy() {
  const btn = document.getElementById("privacyToggle");
  const cover = document.getElementById("privacyCover");

  // 저장된 블러 상태 복원
  const on = localStorage.getItem(PRIVACY_KEY) === "1";
  setPrivacyBlur(on);

  if (btn) btn.addEventListener("click", () => {
    setPrivacyBlur(!document.body.classList.contains("privacy-on"));
  });

  // 패닉 커버 닫기 — 클릭 / Esc
  if (cover) cover.addEventListener("click", hidePanicCover);

  // 단축키: Ctrl/Cmd+Shift+H → 즉시 가리기 토글, Esc → 닫기
  window.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "h" || e.key === "H")) {
      e.preventDefault();
      togglePanicCover();
      return;
    }
    if (e.key === "Escape" && cover && !cover.hidden) {
      e.preventDefault();
      hidePanicCover();
    }
  });
}

function setPrivacyBlur(on) {
  document.body.classList.toggle("privacy-on", on);
  const btn = document.getElementById("privacyToggle");
  if (btn) {
    btn.classList.toggle("is-on", on);
    btn.textContent = on ? "🔒" : "🔓";
  }
  localStorage.setItem(PRIVACY_KEY, on ? "1" : "0");
}

function togglePanicCover() {
  const cover = document.getElementById("privacyCover");
  if (!cover) return;
  if (cover.hidden) cover.hidden = false;
  else hidePanicCover();
}

function hidePanicCover() {
  const cover = document.getElementById("privacyCover");
  if (cover) cover.hidden = true;
}

// ════════════════════════════════════════════════════════
// 내보내기 / 백업 (현재 STATE → 다운로드, 순수 프론트엔드)
// ════════════════════════════════════════════════════════
function downloadFile(filename, text, mime) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportStamp() {
  // 로컬 날짜 YYYY-MM-DD (파일명용)
  return todayStr();
}

function exportJson() {
  const backup = {
    exported_at: new Date().toISOString(),
    tasks: STATE.tasks,
    projects: STATE.projects,
    categories: STATE.categories,
    inbox: STATE.inbox,
    daily_logs: STATE.dailyLogs,
  };
  downloadFile(`hq-backup-${exportStamp()}.json`, JSON.stringify(backup, null, 2), "application/json");
  showToast("JSON 백업을 내보냈어요");
}

function exportMarkdown() {
  const lines = [];
  lines.push(`# 내 업무 내보내기 — ${exportStamp()}`, "");

  const openTasks = (STATE.tasks || []).filter(t => t.status !== "done");
  const doneTasks = (STATE.tasks || []).filter(t => t.status === "done");

  lines.push(`## 할 일 (진행 ${openTasks.length} · 완료 ${doneTasks.length})`, "");
  openTasks.forEach(t => {
    const meta = [t.category, t.due_date && `마감 ${t.due_date}`, PRIORITY_LABEL[t.priority]]
      .filter(Boolean).join(" · ");
    lines.push(`- [ ] ${t.title}${meta ? `  _(${meta})_` : ""}`);
  });
  if (doneTasks.length) {
    lines.push("", "<details><summary>완료된 할 일</summary>", "");
    doneTasks.forEach(t => lines.push(`- [x] ${t.title}`));
    lines.push("", "</details>");
  }

  lines.push("", `## 프로젝트 (${(STATE.projects || []).length})`, "");
  (STATE.projects || []).forEach(p => {
    const pct = (p.progress_pct ?? 0) > 0 ? p.progress_pct : (p.computed_progress ?? 0);
    const span = [p.start_date, p.end_date].filter(Boolean).join(" ~ ");
    lines.push(`- **${p.name}** — ${PROJECT_STATUS_LABEL[p.status] || p.status} · ${pct}%${span ? ` · ${span}` : ""}`);
    if (p.description) lines.push(`  - ${p.description}`);
  });

  const logs = (STATE.dailyLogs || []).slice(0, 30);
  lines.push("", `## 최근 하루 로그 (${logs.length})`, "");
  logs.forEach(l => {
    lines.push(`### ${l.log_date}`, "", (l.content || "").trim() || "_(빈 로그)_", "");
  });

  downloadFile(`hq-${exportStamp()}.md`, lines.join("\n"), "text/markdown");
  showToast("Markdown으로 내보냈어요");
}

function buildCmdkResults(query) {
  const q = (query || "").trim();

  // Quick commands first
  if (q.startsWith("/") || q.startsWith(":")) {
    const cmd = q[1];
    const rest = q.slice(2).trim();
    const cmdMap = {
      t: { title: "새 할 일", icon: "📋", sub: rest || "제목을 입력하세요" },
      p: { title: "새 프로젝트", icon: "📁", sub: rest || "이름을 입력하세요" },
      m: { title: "할 일에 담기", icon: "✓", sub: rest || "내용을 입력하세요" },
      d: { title: "오늘 하루로그에 추가", icon: "📓", sub: rest || "내용을 입력하세요" },
    };
    if (cmdMap[cmd]) {
      const def = cmdMap[cmd];
      return [{
        section: "빠른 명령",
        kind: "command",
        cmd,
        text: rest,
        title: def.title,
        sub: def.sub,
        icon: def.icon,
        tag: rest ? "Enter로 실행" : "내용 입력 필요",
      }];
    }
    // /usage — AI 사용량 모달 열기 (Phase 8)
    const lower = q.slice(1).toLowerCase();
    if (lower === "usage" || lower.startsWith("usage")
        || lower === "u" || lower.startsWith("u ")) {
      return [{
        section: "빠른 명령",
        kind: "usage",
        title: "💰 AI 사용량 자세히",
        sub: "월 한도 대비 사용량 + 종류별 + 일별 차트",
        icon: "💰",
        tag: "Enter로 열기",
      }];
    }
    // /export — 백업 / 내보내기
    if (lower === "export" || lower.startsWith("export")
        || lower === "backup" || lower.startsWith("backup")) {
      return [
        { section: "내보내기", kind: "export-md", title: "📄 Markdown으로 내보내기", sub: "할 일·프로젝트·최근 로그 — 읽기 좋은 형식", icon: "📄", tag: "Enter로 저장" },
        { section: "내보내기", kind: "export-json", title: "🗂 JSON 백업", sub: "전체 데이터 — 복원·이관용", icon: "🗂", tag: "Enter로 저장" },
      ];
    }
  }

  // Navigation entries (always visible when no query)
  const navItems = [
    { kind: "nav", tab: "dashboard", title: "홈으로 이동",     icon: "🏠", sub: "오늘 할 일 + 빠른 입력" },
    { kind: "nav", tab: "tasks",     title: "할 일로 이동",     icon: "✓", sub: "리스트 / 칸반" },
    { kind: "nav", tab: "projects",  title: "프로젝트로 이동",  icon: "📁", sub: "프로젝트 카드" },
    { kind: "nav", tab: "calendar",  title: "캘린더로 이동",    icon: "📅", sub: "월간 보기" },
    { kind: "nav", tab: "daily",     title: "로그로 이동",      icon: "📓", sub: "하루 기록" },
    { kind: "nav", tab: "snippets",  title: "전달함으로 이동",  icon: "🧩", sub: "맥↔회사 코드 브릿지" },
    { kind: "nav", tab: "gantt",     title: "간트로 이동",      icon: "📊", sub: "365일 — S3에서 프로젝트 뷰로 통합 예정" },
    { kind: "nav", tab: "inbox",     title: "받은 메모 (이전 보관함)", icon: "📥", sub: "예전에 담아둔 메모" },
  ];

  const results = [];

  if (!q) {
    navItems.forEach(n => results.push({ section: "이동", ...n }));
  }

  // Tasks
  const tasks = (STATE.tasks || []).filter(t =>
    fuzzyMatch(t.title, q) || fuzzyMatch(t.notes, q) ||
    (t.tags || []).some(tg => fuzzyMatch(tg, q))
  ).slice(0, 8);
  tasks.forEach(t => results.push({
    section: "할 일",
    kind: "task",
    id: t.id,
    title: t.title,
    sub: [t.category, t.due_date].filter(Boolean).join(" · ") || STATUS_LABEL[t.status],
    icon: t.status === "done" ? "✅" : (t.priority === "high" ? "🔥" : "📋"),
    tag: t.status !== "done" && t.due_date ? dueDisplay(t.due_date).label : null,
  }));

  // Projects
  const projects = (STATE.projects || []).filter(p =>
    fuzzyMatch(p.name, q) || fuzzyMatch(p.description, q)
  ).slice(0, 5);
  projects.forEach(p => results.push({
    section: "프로젝트",
    kind: "project",
    id: p.id,
    title: p.name,
    sub: p.description || PROJECT_STATUS_LABEL[p.status],
    icon: "📁",
    tag: p.end_date ? (dDayInfo(p.end_date)?.label || null) : null,
  }));

  // Inbox
  const inboxItems = (STATE.inbox || []).filter(i => fuzzyMatch(i.content, q)).slice(0, 5);
  inboxItems.forEach(i => results.push({
    section: "받은 메모",
    kind: "inbox",
    id: i.id,
    title: i.content.slice(0, 80),
    sub: relativeTime(i.created_at),
    icon: "📥",
  }));

  // Daily logs
  if (q) {
    const logs = (STATE.dailyLogs || []).filter(l => fuzzyMatch(l.content, q)).slice(0, 5);
    logs.forEach(l => results.push({
      section: "하루 로그",
      kind: "daily",
      date: l.log_date,
      title: formatDateLong(l.log_date),
      sub: (l.content || "").slice(0, 80),
      icon: "📓",
    }));
  }

  // Nav (when query exists) — match tab names
  if (q) {
    const matched = navItems.filter(n => fuzzyMatch(n.title, q));
    matched.forEach(n => results.push({ section: "이동", ...n }));
  }

  // Phase 8: "사용량" / "usage" / "ai" 같은 자연어로도 찾히게
  if (q) {
    const lower = q.toLowerCase();
    if (lower.includes("사용량") || lower.includes("usage")
        || lower.includes("토큰") || lower.includes("비용")
        || lower.includes("cost") || lower.includes("ai 사용")) {
      results.push({
        section: "AI",
        kind: "usage",
        title: "💰 AI 사용량 자세히",
        sub: "월 한도 대비 사용량 + 종류별 + 일별 차트",
        icon: "💰",
      });
    }
    // 내보내기 / 백업 자연어
    if (lower.includes("내보내") || lower.includes("백업")
        || lower.includes("export") || lower.includes("backup")
        || lower.includes("다운로드")) {
      results.push({ section: "내보내기", kind: "export-md", title: "📄 Markdown으로 내보내기", sub: "할 일·프로젝트·최근 로그", icon: "📄" });
      results.push({ section: "내보내기", kind: "export-json", title: "🗂 JSON 백업", sub: "전체 데이터 — 복원·이관용", icon: "🗂" });
    }
  }

  return results;
}

function refreshCmdk(query) {
  CMDK.results = buildCmdkResults(query);
  if (CMDK.activeIndex >= CMDK.results.length) CMDK.activeIndex = 0;
  renderCmdkList();
}

function renderCmdkList() {
  const list = document.getElementById("cmdkList");
  if (!CMDK.results.length) {
    list.innerHTML = `<div class="cmdk-empty">결과가 없습니다.<br><small>"/t 회의" 처럼 입력해 바로 만들어 보세요.</small></div>`;
    return;
  }
  // Group by section
  let html = "";
  let lastSection = null;
  CMDK.results.forEach((r, idx) => {
    if (r.section !== lastSection) {
      if (lastSection !== null) html += "";
      html += `<div class="cmdk-section-title">${escapeHtml(r.section)}</div>`;
      lastSection = r.section;
    }
    const active = idx === CMDK.activeIndex ? "is-active" : "";
    const tagHtml = r.tag ? `<span class="cmdk-item-tag">${escapeHtml(r.tag)}</span>` : "";
    html += `<div class="cmdk-item ${active}" data-idx="${idx}">
      <span class="cmdk-item-icon">${r.icon || "•"}</span>
      <div class="cmdk-item-main">
        <div class="cmdk-item-title">${escapeHtml(r.title)}</div>
        ${r.sub ? `<div class="cmdk-item-sub">${escapeHtml(r.sub)}</div>` : ""}
      </div>
      ${tagHtml}
    </div>`;
  });
  list.innerHTML = html;
  list.querySelectorAll(".cmdk-item").forEach(el => {
    el.addEventListener("mouseenter", () => {
      CMDK.activeIndex = Number(el.dataset.idx);
      renderCmdkList();
    });
    el.addEventListener("click", () => {
      CMDK.activeIndex = Number(el.dataset.idx);
      executeCmdk();
    });
  });
  // Scroll active into view
  const activeEl = list.querySelector(".cmdk-item.is-active");
  if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
}

async function executeCmdk() {
  const r = CMDK.results[CMDK.activeIndex];
  if (!r) return;

  if (r.kind === "command") {
    const text = (r.text || "").trim();
    if (!text) { showToast("내용을 입력해주세요", true); return; }
    if (r.cmd === "t") {
      try {
        const created = await api("POST", "/api/me/tasks", {
          title: text, status: "todo", priority: "medium",
          category: null, project_id: null, tags: [], notes: "", due_date: null,
        });
        STATE.tasks.unshift(created);
        closeCmdk();
        setTab("tasks");
        showToast("할 일 추가됨");
      } catch (e) { showToast(e.message, true); }
    } else if (r.cmd === "p") {
      closeCmdk();
      setTab("projects");
      setTimeout(() => {
        openProjectModal(null);
        document.getElementById("projectName").value = text;
      }, 60);
    } else if (r.cmd === "m") {
      try {
        await addQuickTask(text);
        closeCmdk();
      } catch (e) { showToast(e.message, true); }
    } else if (r.cmd === "d") {
      closeCmdk();
      STATE.dailyDate = todayStr();
      setTab("daily");
      setTimeout(async () => {
        const ta = document.getElementById("dailyContent");
        const stamp = new Date().toTimeString().slice(0, 5);
        const append = `${ta.value ? ta.value.replace(/\s+$/, "") + "\n" : ""}- ${stamp} ${text}`;
        ta.value = append;
        STATE.dailyDirty = true;
        await saveDailyLog();
      }, 80);
    }
    return;
  }

  if (r.kind === "nav") {
    closeCmdk();
    setTab(r.tab);
    return;
  }

  if (r.kind === "task") {
    closeCmdk();
    setTab("tasks");
    setTimeout(() => openTaskModal(r.id), 60);
    return;
  }

  if (r.kind === "project") {
    closeCmdk();
    setTab("projects");
    setTimeout(() => openProjectModal(r.id), 60);
    return;
  }

  if (r.kind === "inbox") {
    closeCmdk();
    setTab("inbox");
    return;
  }

  if (r.kind === "usage") {
    closeCmdk();
    openAiUsageModal();
    return;
  }

  if (r.kind === "export-md") {
    closeCmdk();
    exportMarkdown();
    return;
  }

  if (r.kind === "export-json") {
    closeCmdk();
    exportJson();
    return;
  }

  if (r.kind === "daily") {
    closeCmdk();
    STATE.dailyDate = r.date;
    setTab("daily");
    return;
  }
}

function bindCmdk() {
  // Open: Cmd/Ctrl + K
  window.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      if (CMDK.open) closeCmdk();
      else openCmdk();
      return;
    }
    if (!CMDK.open) return;
    if (e.key === "Escape") { e.preventDefault(); closeCmdk(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (CMDK.results.length) {
        CMDK.activeIndex = (CMDK.activeIndex + 1) % CMDK.results.length;
        renderCmdkList();
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (CMDK.results.length) {
        CMDK.activeIndex = (CMDK.activeIndex - 1 + CMDK.results.length) % CMDK.results.length;
        renderCmdkList();
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      executeCmdk();
      return;
    }
  });

  // Input handler
  const input = document.getElementById("cmdkInput");
  if (input) {
    input.addEventListener("input", () => {
      CMDK.activeIndex = 0;
      refreshCmdk(input.value);
    });
  }

  // Backdrop click to close
  const bd = document.getElementById("cmdkBackdrop");
  if (bd) {
    bd.addEventListener("click", e => {
      if (e.target === bd) closeCmdk();
    });
  }

  // Topbar trigger button
  const trigger = document.getElementById("cmdkTrigger");
  if (trigger) trigger.addEventListener("click", openCmdk);
}

// ════════════════════════════════════════════════════════
// Phase 7a — AI Dashboard Briefing
// ════════════════════════════════════════════════════════
async function loadBriefing(force) {
  const card = document.getElementById("briefing");
  if (!card) return;
  if (STATE.briefingLoading) return;
  STATE.briefingLoading = true;

  card.hidden = false;
  const text = document.getElementById("briefingText");
  const meta = document.getElementById("briefingMeta");
  const refreshBtn = document.getElementById("briefingRefreshBtn");
  if (refreshBtn) refreshBtn.disabled = true;
  if (force || !STATE.briefing) {
    text.textContent = "오늘 상태를 정리하는 중...";
    text.className = "briefing-text is-loading";
  }

  try {
    const url = force ? "/api/me/dashboard-briefing?force=true" : "/api/me/dashboard-briefing";
    const data = await api("POST", url);
    STATE.briefing = data;
    renderBriefing();
  } catch (e) {
    text.className = "briefing-text is-empty";
    if ((e.message || "").includes("503")) {
      text.textContent = "AI 비활성 (서버에 ANTHROPIC_API_KEY 미설정).";
    } else {
      text.textContent = "브리핑을 불러오지 못했어요.";
    }
    if (meta) meta.textContent = "";
  } finally {
    STATE.briefingLoading = false;
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

function renderBriefing() {
  const data = STATE.briefing;
  if (!data) return;
  const card = document.getElementById("briefing");
  const text = document.getElementById("briefingText");
  const meta = document.getElementById("briefingMeta");
  const cards = document.getElementById("briefingCards");
  if (!card || !text || !cards) return;

  card.hidden = false;

  if (data.text) {
    text.textContent = data.text;
    text.className = "briefing-text";
  } else if (data.ai_enabled === false) {
    text.textContent = "AI 비활성 — 서버에 ANTHROPIC_API_KEY 가 설정되면 한 줄 요약이 표시됩니다.";
    text.className = "briefing-text is-empty";
  } else {
    text.textContent = "오늘 큰 일정은 없어요.";
    text.className = "briefing-text is-empty";
  }

  if (meta) {
    if (data.cached) {
      meta.textContent = `${data.today} · 캐시`;
    } else if (data.generated_at) {
      meta.textContent = `${data.today} · 방금 갱신`;
    } else {
      meta.textContent = data.today || "";
    }
  }

  const n = data.numbers || {};
  const items = [
    { label: "오늘 마감", num: n.today_due ?? 0,
      cls: (n.today_due ?? 0) > 0 ? "is-warn" : "" },
    { label: "미처리 메모", num: n.inbox_unprocessed ?? 0,
      cls: (n.inbox_unprocessed ?? 0) > 5 ? "is-warn" : "" },
    { label: "진행 프로젝트", num: n.projects_active ?? 0, cls: "" },
    { label: "위험 task", num: n.at_risk ?? 0,
      cls: (n.at_risk ?? 0) > 0 ? "is-danger" : "" },
  ];
  cards.innerHTML = items.map(it => `
    <div class="briefing-card">
      <div class="briefing-card-num ${it.cls}">${it.num}</div>
      <div class="briefing-card-label">${escapeHtml(it.label)}</div>
    </div>
  `).join("");
}

// ════════════════════════════════════════════════════════
// Phase 7c — Daily auto-template
// ════════════════════════════════════════════════════════
async function dailyAutoFill() {
  const ta = document.getElementById("dailyContent");
  if (!ta) return;
  if (ta.value.trim() && !confirm("이미 작성 중인 내용을 지우고 자동 초안으로 덮어쓸까요?")) return;
  try {
    const data = await api("GET", `/api/me/daily-logs/${STATE.dailyDate}/auto-template`);
    if (!data || !data.template) {
      showToast("템플릿을 받지 못했어요", true);
      return;
    }
    ta.value = data.template;
    STATE.dailyDirty = true;
    setDailyStatus("dirty", "변경사항 있음 — 검토 후 저장하세요");
    ta.focus();
    const first = data.template.indexOf("\n");
    ta.setSelectionRange(first > 0 ? first : 0, first > 0 ? first : 0);
    showToast(`초안 생성 (완료 ${data.completed_count}개 / 일정 ${data.due_today_count}개)`);
  } catch (e) {
    showToast("자동 채우기 실패: " + e.message, true);
  }
}

// ════════════════════════════════════════════════════════
// Phase 7d — Quick Memo (Cmd/Ctrl + N)
// ════════════════════════════════════════════════════════
function openQuickMemo() {
  const bd = document.getElementById("qmemoBackdrop");
  const ta = document.getElementById("qmemoTextarea");
  if (!bd || !ta) return;
  bd.hidden = false;
  ta.value = "";
  setTimeout(() => ta.focus(), 10);
}

function closeQuickMemo() {
  const bd = document.getElementById("qmemoBackdrop");
  if (bd) bd.hidden = true;
  // 태그 자동완성도 같이 닫기 (Phase 7e)
  if (typeof hideTagSuggest === "function") hideTagSuggest();
}

async function submitQuickMemo() {
  const ta = document.getElementById("qmemoTextarea");
  if (!ta) return;
  const val = (ta.value || "").trim();
  if (!val) { showToast("내용이 비어있어요", true); return; }
  closeQuickMemo();
  await addQuickTask(val);
}

function bindQuickMemo() {
  const bd = document.getElementById("qmemoBackdrop");
  const ta = document.getElementById("qmemoTextarea");
  const saveBtn = document.getElementById("qmemoSaveBtn");
  const cancelBtn = document.getElementById("qmemoCancelBtn");

  // Global Cmd/Ctrl+N → open. Cmd+K 가 열려있을 때는 무시.
  window.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === "n" || e.key === "N")) {
      const cmdkOpen = !document.getElementById("cmdkBackdrop")?.hidden;
      if (cmdkOpen) return;
      e.preventDefault();
      if (bd && !bd.hidden) closeQuickMemo();
      else openQuickMemo();
    }
  });

  if (bd) {
    bd.addEventListener("click", e => {
      if (e.target === bd) closeQuickMemo();
    });
  }
  if (cancelBtn) cancelBtn.addEventListener("click", closeQuickMemo);
  if (saveBtn) saveBtn.addEventListener("click", submitQuickMemo);
  if (ta) {
    ta.addEventListener("keydown", e => {
      // 태그 자동완성이 열려있으면 키 처리 양보 (Phase 7e)
      if (typeof TAG_SUGGEST !== "undefined" && TAG_SUGGEST.open
          && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter" || e.key === "Tab" || e.key === "Escape")) return;
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        submitQuickMemo();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeQuickMemo();
      }
    });
  }
}

// ════════════════════════════════════════════════════════
// Phase 7e — # 태그 자동완성 (Inbox · Daily · Quick · Quick-capture)
// ════════════════════════════════════════════════════════
const TAG_SUGGEST = {
  open: false,
  target: null,        // input/textarea element
  hashStart: -1,       // index of `#` in target.value
  filter: "",          // chars typed after #
  results: [],
  activeIndex: 0,
};

function bindTagSuggest() {
  const targets = [
    "quickCaptureInput",
    "inboxAddInput",
    "dailyContent",
    "qmemoTextarea",
  ];
  targets.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => onTagSuggestInput(el));
    el.addEventListener("keydown", e => onTagSuggestKeydown(e, el));
    el.addEventListener("blur", () => setTimeout(hideTagSuggest, 120));
  });

  // 클릭 외부 시 닫기
  document.addEventListener("click", e => {
    const popup = document.getElementById("tagSuggest");
    if (!popup || popup.hidden) return;
    if (popup.contains(e.target)) return;
    if (TAG_SUGGEST.target === e.target) return;
    hideTagSuggest();
  });
  // 스크롤 시 닫기
  window.addEventListener("scroll", hideTagSuggest, { passive: true });
}

function onTagSuggestInput(el) {
  const val = el.value || "";
  const cursor = el.selectionStart ?? val.length;
  // 가장 가까운 # 찾기 (커서 바로 앞쪽)
  let i = cursor - 1;
  let hashIdx = -1;
  while (i >= 0) {
    const ch = val[i];
    if (ch === "#") { hashIdx = i; break; }
    if (/\s/.test(ch)) break;
    i--;
  }
  if (hashIdx < 0) { hideTagSuggest(); return; }
  // # 앞은 줄 시작 또는 공백이어야 함
  const before = hashIdx > 0 ? val[hashIdx - 1] : "";
  if (before && !/\s/.test(before)) { hideTagSuggest(); return; }

  const filter = val.slice(hashIdx + 1, cursor);
  if (/\s/.test(filter)) { hideTagSuggest(); return; }

  TAG_SUGGEST.target = el;
  TAG_SUGGEST.hashStart = hashIdx;
  TAG_SUGGEST.filter = filter.toLowerCase();
  TAG_SUGGEST.results = FEEDBACK_TAGS.filter(t =>
    !filter || t.tag.startsWith(filter.toLowerCase())
  );
  // 사용자가 4개 외 다른 태그를 적으면 자동완성 사라짐
  if (TAG_SUGGEST.results.length === 0) { hideTagSuggest(); return; }
  TAG_SUGGEST.activeIndex = 0;
  renderTagSuggest();
}

function onTagSuggestKeydown(e, el) {
  if (!TAG_SUGGEST.open || TAG_SUGGEST.target !== el) return;
  if (e.key === "Escape") {
    e.preventDefault(); hideTagSuggest(); return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    TAG_SUGGEST.activeIndex = (TAG_SUGGEST.activeIndex + 1) % TAG_SUGGEST.results.length;
    renderTagSuggest();
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    TAG_SUGGEST.activeIndex = (TAG_SUGGEST.activeIndex - 1 + TAG_SUGGEST.results.length) % TAG_SUGGEST.results.length;
    renderTagSuggest();
    return;
  }
  if (e.key === "Enter" || e.key === "Tab") {
    e.preventDefault();
    applyTagSuggest(TAG_SUGGEST.activeIndex);
    return;
  }
}

function renderTagSuggest() {
  const popup = document.getElementById("tagSuggest");
  const el = TAG_SUGGEST.target;
  if (!popup || !el) return;
  const rect = el.getBoundingClientRect();
  popup.style.left = `${Math.max(8, rect.left)}px`;
  popup.style.top = `${rect.bottom + 4 + window.scrollY}px`;
  const items = TAG_SUGGEST.results.map((r, idx) => `
    <div class="tag-suggest-item ${idx === TAG_SUGGEST.activeIndex ? "is-active" : ""}" data-idx="${idx}">
      <span class="tag-suggest-tag">#${r.tag}</span>
      <span class="tag-suggest-desc">${escapeHtml(r.desc)}</span>
    </div>
  `).join("");
  popup.innerHTML = items + `<div class="tag-suggest-foot">↑↓ 이동 · Enter/Tab 삽입 · Esc 닫기</div>`;
  popup.hidden = false;
  TAG_SUGGEST.open = true;
  popup.querySelectorAll(".tag-suggest-item").forEach(itm => {
    itm.addEventListener("mousedown", e => {
      e.preventDefault(); // blur 방지
      applyTagSuggest(Number(itm.dataset.idx));
    });
  });
}

function hideTagSuggest() {
  const popup = document.getElementById("tagSuggest");
  if (popup) popup.hidden = true;
  TAG_SUGGEST.open = false;
  TAG_SUGGEST.target = null;
}

function applyTagSuggest(idx) {
  const el = TAG_SUGGEST.target;
  const r = TAG_SUGGEST.results[idx];
  if (!el || !r) { hideTagSuggest(); return; }
  const val = el.value || "";
  const cursor = el.selectionStart ?? val.length;
  const before = val.slice(0, TAG_SUGGEST.hashStart);
  const after = val.slice(cursor);
  const inserted = `#${r.tag} `;
  el.value = before + inserted + after;
  const newPos = before.length + inserted.length;
  el.setSelectionRange(newPos, newPos);
  hideTagSuggest();
  // input 이벤트 트리거 — 다른 핸들러도 갱신되도록
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// ════════════════════════════════════════════════════════
// Phase 7e — 피드백 가이드 배너 + 카운트
// ════════════════════════════════════════════════════════
function refreshFeedbackBanner() {
  const banner = document.getElementById("feedbackBanner");
  if (!banner) return;

  // 시작 시점 기록 (없으면 오늘로 세팅)
  let start = localStorage.getItem(FEEDBACK_BANNER_START_KEY);
  if (!start) {
    start = todayStr();
    localStorage.setItem(FEEDBACK_BANNER_START_KEY, start);
  }
  const startDate = new Date(start + "T00:00:00");
  const today = startOfDay(new Date());
  const dayDiff = Math.floor((today - startDate) / (24 * 3600 * 1000));
  if (dayDiff >= FEEDBACK_BANNER_DAYS) {
    banner.hidden = true;
    return;
  }

  // 오늘 숨김 처리됐는지 확인
  const hiddenKey = `me_feedback_banner_hidden_${todayStr()}`;
  if (localStorage.getItem(hiddenKey) === "1") {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;

  const closeBtn = document.getElementById("feedbackBannerCloseBtn");
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = "1";
    closeBtn.addEventListener("click", () => {
      localStorage.setItem(hiddenKey, "1");
      banner.hidden = true;
    });
  }
}

function countFeedbackTags() {
  const counts = { friction: 0, unused: 0, automate: 0, repeat: 0 };
  // 이번 주 시작 (월요일)
  const today = startOfDay(new Date());
  const dow = today.getDay() || 7; // 일=7
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (dow - 1));

  STATE.inbox.forEach(i => {
    const created = i.created_at ? new Date(i.created_at) : null;
    if (created && created < weekStart) return;
    const txt = (i.content || "").toLowerCase();
    FEEDBACK_TAGS.forEach(t => {
      const re = new RegExp(`#${t.tag}\\b`, "i");
      if (re.test(txt)) counts[t.tag]++;
    });
  });
  return counts;
}

function renderFeedbackCounts() {
  const widget = document.getElementById("feedbackCountsWidget");
  const grid = document.getElementById("feedbackCounts");
  const total = document.getElementById("feedbackTotalCount");
  if (!widget || !grid) return;

  // 시작 후 7일 내에만 노출
  const start = localStorage.getItem(FEEDBACK_BANNER_START_KEY);
  if (start) {
    const startDate = new Date(start + "T00:00:00");
    const today = startOfDay(new Date());
    const dayDiff = Math.floor((today - startDate) / (24 * 3600 * 1000));
    if (dayDiff >= FEEDBACK_BANNER_DAYS) {
      widget.hidden = true;
      return;
    }
  }
  widget.hidden = false;

  const counts = countFeedbackTags();
  if (total) total.textContent = Object.values(counts).reduce((a, b) => a + b, 0);
  grid.innerHTML = FEEDBACK_TAGS.map(t => `
    <button class="fc-chip ${counts[t.tag] === 0 ? "is-zero" : ""}" data-tag="${t.tag}" type="button">
      <span class="fc-chip-tag">#${t.tag}</span>
      <span class="fc-chip-num">${counts[t.tag]}</span>
    </button>
  `).join("");
  grid.querySelectorAll(".fc-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      STATE.inboxTagFilter = btn.dataset.tag;
      STATE.inboxFilter = "active";
      setTab("inbox");
    });
  });
}

// ════════════════════════════════════════════════════════
// Phase 8 — AI 사용량 위젯 & 상세 모달
// ════════════════════════════════════════════════════════

const AI_USAGE = {
  data: null,
  loadedAt: 0,
  inflight: null,
};

const KIND_LABEL = {
  briefing: "대시보드 브리핑",
  inbox_classify: "Inbox 분류",
  daily_log_extract: "하루로그 추출",
  search: "스마트 검색",
  other: "기타",
};

function fmtUsd(n) {
  const v = Number(n) || 0;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(3)}`;
}
function fmtTok(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

async function loadAiUsage(force) {
  // 30초 이내 재호출은 캐시
  if (!force && AI_USAGE.data && (Date.now() - AI_USAGE.loadedAt) < 30_000) {
    renderAiUsageWidget(AI_USAGE.data);
    return AI_USAGE.data;
  }
  if (AI_USAGE.inflight) return AI_USAGE.inflight;

  const widget = document.getElementById("aiUsageWidget");
  if (widget) widget.classList.add("is-loading");

  AI_USAGE.inflight = (async () => {
    try {
      const data = await api("GET", "/api/me/ai-usage");
      AI_USAGE.data = data;
      AI_USAGE.loadedAt = Date.now();
      renderAiUsageWidget(data);
      return data;
    } catch (e) {
      console.warn("AI usage load failed:", e);
      renderAiUsageWidget(null, e.message);
      return null;
    } finally {
      AI_USAGE.inflight = null;
      if (widget) widget.classList.remove("is-loading");
    }
  })();
  return AI_USAGE.inflight;
}

function renderAiUsageWidget(data, errMsg) {
  const costNow = document.getElementById("aiUsageCostNow");
  const costCap = document.getElementById("aiUsageCostCap");
  const fill = document.getElementById("aiUsageBarFill");
  const meta = document.getElementById("aiUsageMeta");
  const sub = document.getElementById("aiUsageSub");
  if (!costNow || !costCap || !fill || !meta) return;

  if (!data) {
    costNow.textContent = "$0.00";
    costCap.textContent = "$10.00";
    fill.style.width = "0%";
    meta.textContent = errMsg
      ? `불러오기 실패 — ${errMsg.slice(0, 80)}`
      : "데이터 없음";
    if (sub) sub.hidden = true;
    return;
  }

  const month = data.this_month || {};
  const cap = Number(month.limit_usd) || 10;
  const cost = Number(month.cost_usd) || 0;
  const pct = Math.min(100, Number(month.pct) || (cap > 0 ? (cost / cap) * 100 : 0));

  costNow.textContent = fmtUsd(cost);
  costCap.textContent = fmtUsd(cap);
  fill.style.width = `${pct.toFixed(1)}%`;
  fill.classList.toggle("is-warn", pct >= 70 && pct < 90);
  fill.classList.toggle("is-danger", pct >= 90);

  const calls = month.calls || 0;
  const tin = month.tokens_in || 0;
  const tout = month.tokens_out || 0;
  const days = month.days_until_reset || 1;
  meta.textContent = `이번 달 ${calls}건 · 입력 ${fmtTok(tin)} · 출력 ${fmtTok(tout)} 토큰 · 리셋까지 ${days}일`;

  if (sub) {
    if (data.table_missing) {
      sub.hidden = false;
      sub.textContent = "⚠ DB 테이블 미생성 — sql/ai_usage.sql 실행 필요";
    } else if (data.ai_enabled === false) {
      sub.hidden = false;
      sub.textContent = "ANTHROPIC_API_KEY 미설정 — AI 호출 자체가 비활성화";
    } else if (pct >= 90) {
      sub.hidden = false;
      sub.textContent = `한도 ${pct.toFixed(0)}% 도달 — Anthropic 콘솔 한도 ${fmtUsd(cap)} 도달 시 API 차단됩니다`;
    } else {
      sub.hidden = true;
    }
  }
}

function openAiUsageModal() {
  const m = document.getElementById("aiUsageModal");
  if (!m) return;
  m.hidden = false;
  renderAiUsageModalBody(AI_USAGE.data, AI_USAGE.data ? null : "불러오는 중…");
  // 최신 데이터로 한 번 더 (force)
  loadAiUsage(true).then(d => renderAiUsageModalBody(d));
}

function closeAiUsageModal() {
  const m = document.getElementById("aiUsageModal");
  if (m) m.hidden = true;
}

function renderAiUsageModalBody(data, placeholder) {
  const body = document.getElementById("aiUsageModalBody");
  if (!body) return;
  if (!data) {
    body.innerHTML = `<div class="aiu-loading">${escapeHtml(placeholder || "데이터 없음")}</div>`;
    return;
  }

  const today = data.today || {};
  const week = data.this_week || {};
  const month = data.this_month || {};
  const cap = Number(month.limit_usd) || 10;
  const pct = Math.min(100, Number(month.pct) || 0);

  // 통계 카드 3개
  const statsHtml = `
    <div class="aiu-stat-row">
      <div class="aiu-stat-card">
        <div class="aiu-stat-label">오늘</div>
        <div class="aiu-stat-cost">${fmtUsd(today.cost_usd || 0)}</div>
        <div class="aiu-stat-sub">${today.calls || 0}건 · 입력 ${fmtTok(today.tokens_in)} · 출력 ${fmtTok(today.tokens_out)}</div>
      </div>
      <div class="aiu-stat-card">
        <div class="aiu-stat-label">이번 주</div>
        <div class="aiu-stat-cost">${fmtUsd(week.cost_usd || 0)}</div>
        <div class="aiu-stat-sub">${week.calls || 0}건 · 입력 ${fmtTok(week.tokens_in)} · 출력 ${fmtTok(week.tokens_out)}</div>
      </div>
      <div class="aiu-stat-card">
        <div class="aiu-stat-label">이번 달</div>
        <div class="aiu-stat-cost">${fmtUsd(month.cost_usd || 0)}<small style="font-size:13px;color:var(--text-meta);font-weight:500;"> / ${fmtUsd(cap)}</small></div>
        <div class="aiu-stat-sub">${pct.toFixed(1)}% · ${month.calls || 0}건 · 리셋까지 ${month.days_until_reset || 1}일</div>
      </div>
    </div>
  `;

  // 종류별 (이번 달)
  const byKind = data.by_kind || [];
  const maxKindCost = byKind.reduce((m, k) => Math.max(m, Number(k.cost_usd) || 0), 0) || 1;
  const byKindHtml = byKind.length === 0
    ? `<div class="aiu-loading" style="padding:14px 0;">이번 달 AI 호출 기록이 없습니다.</div>`
    : `<div class="aiu-bykind-list">${byKind.map(k => {
        const w = ((Number(k.cost_usd) || 0) / maxKindCost) * 100;
        const label = KIND_LABEL[k.kind] || k.kind;
        return `<div class="aiu-bykind-row">
          <span class="aiu-bykind-name">${escapeHtml(label)}</span>
          <div class="aiu-bykind-bar"><div class="aiu-bykind-bar-fill" style="width:${w.toFixed(1)}%"></div></div>
          <span class="aiu-bykind-cost">${fmtUsd(k.cost_usd)} · ${k.calls}건</span>
        </div>`;
      }).join("")}</div>`;

  // 지난 30일 일별
  const daily = data.daily_last_30 || [];
  const todayStrLocal = (function () {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const maxDaily = daily.reduce((m, d) => Math.max(m, Number(d.cost_usd) || 0), 0) || 0.0001;
  const dailyBarsHtml = daily.map(d => {
    const cost = Number(d.cost_usd) || 0;
    const h = Math.max(2, (cost / maxDaily) * 84);
    const zero = cost <= 0 ? "is-zero" : "";
    const todayFlag = d.date === todayStrLocal ? `data-today="1"` : "";
    return `<div class="aiu-daily-bar ${zero}" style="height:${h.toFixed(1)}px"
                 title="${escapeAttr(d.date)} — ${fmtUsd(cost)} (${d.calls || 0}건)" ${todayFlag}></div>`;
  }).join("");
  const firstDate = daily[0]?.date || "";
  const lastDate = daily[daily.length - 1]?.date || "";

  // 모델 / 단가
  const model = data.model || "claude-haiku-4-5";
  const priceIn = data.price?.input_per_m_usd ?? 1.0;
  const priceOut = data.price?.output_per_m_usd ?? 5.0;

  // 경고
  let warn = "";
  if (data.table_missing) {
    warn = `<div class="aiu-warn-note">⚠ <strong>personal_ai_usage</strong> 테이블이 아직 생성되지 않았습니다. <code>guild_backend/sql/ai_usage.sql</code> 을 Supabase SQL Editor 에서 한 번 실행해 주세요.</div>`;
  } else if (data.ai_enabled === false) {
    warn = `<div class="aiu-warn-note">⚠ Railway 에 <code>ANTHROPIC_API_KEY</code> 가 설정되지 않아 AI 호출 자체가 비활성 상태입니다.</div>`;
  } else if (pct >= 90) {
    warn = `<div class="aiu-warn-note">⚠ 월 한도 ${pct.toFixed(0)}% 사용. Anthropic 콘솔 한도(<strong>${fmtUsd(cap)}</strong>) 도달 시 API 호출이 자동 차단됩니다.</div>`;
  }

  body.innerHTML = `
    ${warn}
    ${statsHtml}

    <div>
      <div class="aiu-section-title">
        <span>종류별 (이번 달)</span>
        <span class="aiu-section-note">총 ${month.calls || 0}건 · ${fmtUsd(month.cost_usd || 0)}</span>
      </div>
      ${byKindHtml}
    </div>

    <div>
      <div class="aiu-section-title">
        <span>지난 30일 일별</span>
        <span class="aiu-section-note">최대 ${fmtUsd(maxDaily)} / 일 · 오늘은 외곽선</span>
      </div>
      <div class="aiu-daily-chart">${dailyBarsHtml}</div>
      <div class="aiu-daily-axis">
        <span>${escapeHtml(firstDate)}</span>
        <span>${escapeHtml(lastDate)}</span>
      </div>
    </div>

    <div class="aiu-info">
      <strong>모델</strong>: <code>${escapeHtml(model)}</code><br>
      <strong>단가</strong>: 입력 <code>$${priceIn}/M tokens</code> · 출력 <code>$${priceOut}/M tokens</code><br>
      <strong>한도</strong>: 월 <code>${fmtUsd(cap)}</code> (환경변수 <code>AI_MONTHLY_BUDGET_USD</code>로 조정).
      이 위젯은 backend 가 기록한 추정치이며, 실제 결제는 Anthropic 콘솔이 정확합니다. 한도 도달 시 API 가 자동 차단됩니다.<br>
      <strong>주의</strong>: 캐시 hit (실제 호출 없음) 은 기록되지 않습니다.
    </div>
  `;
}

// ════════════════════════════════════════════════════════
// Life OS — 히어로 (인사말 · D-day · 올해 진행률 · 스탯)
// ════════════════════════════════════════════════════════
const LIFE_EVENTS = [
  { emoji: "💍", label: "결혼식",   date: "2026-06-06" },
  { emoji: "✈️", label: "신혼여행", date: "2026-06-08" },
];

function renderHero() {
  const hero = document.getElementById("hero");
  if (!hero) return;

  const now = new Date();
  const h = now.getHours();
  const greet = h < 5  ? "고요한 새벽이에요"
              : h < 11 ? "좋은 아침이에요"
              : h < 14 ? "점심은 챙기셨어요?"
              : h < 18 ? "좋은 오후예요"
              : h < 22 ? "좋은 저녁이에요"
              :          "늦은 밤이에요";
  const name = OWNER_NAME;
  const wd = ["일","월","화","수","목","금","토"][now.getDay()];

  document.getElementById("heroDate").textContent =
    `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${wd}요일`;
  document.getElementById("heroGreeting").innerHTML =
    `${escapeHtml(greet)}, <span class="hero-accent">${escapeHtml(name)}</span> 님`;

  // D-day 카드 (지난 일정은 숨김)
  const todayMid = startOfDay(now).getTime();
  document.getElementById("heroDday").innerHTML = LIFE_EVENTS.map(ev => {
    const diff = Math.round(
      (new Date(ev.date + "T00:00:00").getTime() - todayMid) / 86400000
    );
    if (diff < 0) return "";
    const num = diff === 0 ? "D-DAY" : "D-" + diff;
    return `<div class="dday-card ${diff <= 31 ? "is-soon" : ""}">
      <span class="dday-emoji">${ev.emoji}</span>
      <span class="dday-num">${num}</span>
      <span class="dday-label">${escapeHtml(ev.label)}</span>
    </div>`;
  }).filter(Boolean).join("");

  // 올해 진행률
  const y = now.getFullYear();
  const startY = new Date(y, 0, 1).getTime();
  const endY = new Date(y + 1, 0, 1).getTime();
  const pct = Math.round(((now.getTime() - startY) / (endY - startY)) * 100);
  document.getElementById("heroYearLabel").innerHTML = `<strong>${y}년</strong> 흘러간 시간`;
  document.getElementById("heroYearPct").textContent = pct + "%";
  document.getElementById("heroYearFill").style.width = pct + "%";

  // 스탯 칩
  const openTasks = STATE.tasks.filter(t => t.status !== "done");
  const dueToday = openTasks.filter(t => t.due_date &&
    new Date(t.due_date + "T00:00:00").getTime() <= todayMid).length;
  const activeProj = STATE.projects.filter(p => p.status === "active").length;
  document.getElementById("heroStats").innerHTML = [
    `<span class="hero-stat">오늘 할 일 <b>${dueToday}</b></span>`,
    `<span class="hero-stat">진행 프로젝트 <b>${activeProj}</b></span>`,
    `<span class="hero-stat">🔥 영어 <b>${engStreakCount()}</b>일</span>`,
  ].join("");

  hero.hidden = false;
}

// ════════════════════════════════════════════════════════
// 영어 한 입 — 오늘의 표현 + 스트릭 (백엔드 없이 로컬 동작)
// ════════════════════════════════════════════════════════
const EXPRESSIONS = [
  { en: "Let's circle back on this.", ko: "이 건은 나중에 다시 얘기해요.", note: "회의에서 주제를 정중히 미룰 때. circle back = 나중에 다시 다루다." },
  { en: "I'll loop you in.", ko: "관련해서 같이 공유드릴게요.", note: "메일·메신저에서 누군가를 대화에 합류시킬 때. loop in = 끼워 넣다." },
  { en: "Can you give me a heads-up?", ko: "미리 좀 알려주실래요?", note: "heads-up = 사전 귀띔. 갑작스럽지 않게 미리 알리는 것." },
  { en: "Let's touch base tomorrow.", ko: "내일 잠깐 상황 공유해요.", note: "touch base = 짧게 근황·진행을 확인하다." },
  { en: "That's out of scope for now.", ko: "그건 지금 범위 밖이에요.", note: "업무 범위를 정중하게 선 긋는 표현." },
  { en: "We're on the same page.", ko: "우리 생각이 같네요.", note: "서로 합의·이해가 일치했음을 확인할 때." },
  { en: "Let's take this offline.", ko: "이건 따로 얘기해요.", note: "회의 중 곁가지 주제를 회의 밖으로 빼낼 때." },
  { en: "I'll keep you posted.", ko: "진행되는 대로 알려드릴게요.", note: "keep posted = 계속 업데이트해 주다." },
  { en: "Let's not reinvent the wheel.", ko: "있는 걸 굳이 다시 만들 필요는 없어요.", note: "이미 있는 해법을 쓰자는 뜻." },
  { en: "Can we ballpark it?", ko: "대략 어림잡아 볼 수 있을까요?", note: "ballpark = 대략적인 추정치." },
  { en: "It's a no-brainer.", ko: "고민할 것도 없죠.", note: "너무 당연해서 망설일 필요 없는 선택." },
  { en: "Let's hit the ground running.", ko: "시작하자마자 바로 달려봐요.", note: "준비 단계 없이 곧장 본격적으로 가동하다." },
  { en: "I'm swamped today.", ko: "오늘 일이 너무 많아요.", note: "swamped = 일에 파묻힌, 정신없이 바쁜." },
  { en: "Let's table this discussion.", ko: "이 논의는 잠시 보류해요.", note: "(미국식) table = 안건을 일단 미루다." },
  { en: "Could you walk me through it?", ko: "차근차근 설명해 주실래요?", note: "walk through = 단계별로 안내하다." },
  { en: "Let's sync up later.", ko: "이따 한번 맞춰봐요.", note: "sync up = 진행 상황을 서로 맞추다." },
  { en: "That's a fair point.", ko: "일리 있는 말이에요.", note: "상대 의견을 정중히 인정할 때." },
  { en: "Let me get back to you.", ko: "확인하고 다시 알려드릴게요.", note: "즉답이 어려울 때 자연스러운 표현." },
  { en: "We need to manage expectations.", ko: "기대치를 좀 조절해야 해요.", note: "과한 기대를 미리 누그러뜨리는 것." },
  { en: "Let's go for the low-hanging fruit.", ko: "쉬운 것부터 처리해요.", note: "low-hanging fruit = 손쉽게 얻는 성과." },
  { en: "Let me take a rain check.", ko: "다음 기회로 미룰게요.", note: "초대·약속을 정중히 다음으로 미룰 때." },
  { en: "Let's not boil the ocean.", ko: "한 번에 다 하려고 하지 말아요.", note: "지나치게 거대한 목표를 경계하는 말." },
  { en: "Ping me when you're done.", ko: "끝나면 알려줘요.", note: "ping = 가볍게 연락하다, 메시지 보내다." },
  { en: "It slipped my mind.", ko: "깜빡했어요.", note: "잊었다는 걸 부드럽게 인정하는 표현." },
  { en: "Let's double down on this.", ko: "여기에 더 집중하고 투자해요.", note: "double down = 더 강하게 밀어붙이다." },
  { en: "I'm playing it by ear.", ko: "상황 봐가며 할게요.", note: "play it by ear = 미리 정하지 않고 융통성 있게." },
  { en: "Let's nail down the details.", ko: "세부사항을 확정해요.", note: "nail down = 못 박듯 확실하게 정하다." },
  { en: "That ship has sailed.", ko: "이미 지난 일이에요.", note: "되돌릴 수 없는 기회를 가리킬 때." },
  { en: "Let's keep it on the radar.", ko: "계속 주시해 둬요.", note: "on the radar = 시야에 두고 챙기다." },
  { en: "Let me cut to the chase.", ko: "본론부터 말할게요.", note: "cut to the chase = 핵심으로 곧장 가다." },
  { en: "Let's pencil it in.", ko: "일단 임시로 잡아둬요.", note: "pencil in = 변경 가능성을 두고 예약하다." },
  { en: "It's a win-win.", ko: "서로한테 다 좋은 일이에요.", note: "양쪽 모두 이득을 보는 상황." },
  { en: "Let me give you the gist.", ko: "요지만 짚어드릴게요.", note: "gist = 핵심 요지, 줄거리." },
  { en: "We're cutting it close.", ko: "시간이 빠듯해요.", note: "cut it close = 아슬아슬하게 맞추다." },
  { en: "Let's move the needle.", ko: "실질적인 변화를 만들어요.", note: "move the needle = 눈에 띄는 성과를 내다." },
  { en: "I'll wrap up soon.", ko: "곧 마무리할게요.", note: "wrap up = 일을 끝맺다, 정리하다." },
  { en: "Let's not jump the gun.", ko: "너무 성급하게 굴지 말아요.", note: "jump the gun = 신호도 전에 출발하다." },
  { en: "Can you flag any issues?", ko: "문제 있으면 짚어 줄래요?", note: "flag = 문제를 표시·제기하다." },
  { en: "Let's revisit this next week.", ko: "다음 주에 다시 보죠.", note: "revisit = 나중에 다시 검토하다." },
  { en: "I'm on the fence about it.", ko: "아직 결정을 못 했어요.", note: "on the fence = 어느 쪽도 정하지 못한." },
  { en: "Let's get the ball rolling.", ko: "일단 시작해 봐요.", note: "get the ball rolling = 일을 착수하다." },
  { en: "That's the bottom line.", ko: "결국 핵심은 그거예요.", note: "bottom line = 결론, 가장 중요한 점." },
  { en: "Let me run it by my manager.", ko: "매니저한테 한번 확인해 볼게요.", note: "run by = 의견을 물어 확인받다." },
  { en: "We're stretched thin.", ko: "인력·자원이 빠듯해요.", note: "stretched thin = 여력이 부족한 상태." },
  { en: "Let's circle up at 3.", ko: "3시에 잠깐 모여요.", note: "circle up = 짧게 모여 이야기하다." },
  { en: "I'll ride it out.", ko: "버티면서 지나가 볼게요.", note: "ride out = 어려운 시기를 견뎌내다." },
  { en: "Let's call it a day.", ko: "오늘은 여기까지 해요.", note: "하루 일과를 마칠 때 쓰는 말." },
  { en: "Let's play it safe.", ko: "안전하게 가요.", note: "위험을 피하고 신중한 선택을 하다." },
];

function engDayIndex() {
  const now = new Date();
  const doy = Math.floor(
    (now - new Date(now.getFullYear(), 0, 0)) / 86400000
  );
  return doy % EXPRESSIONS.length;
}

function engData() {
  try {
    const d = JSON.parse(localStorage.getItem("me_eng_v1"));
    if (d && Array.isArray(d.done)) return d;
  } catch (e) {}
  return { done: [] };
}

function engStreakCount() {
  const set = new Set(engData().done);
  if (!set.size) return 0;
  const cursor = new Date(todayStr() + "T00:00:00");
  // 오늘 미완료면 어제부터 — 어제도 없으면 스트릭 끊김
  if (!set.has(dateOnly(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(dateOnly(cursor))) return 0;
  }
  let count = 0;
  while (set.has(dateOnly(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function renderEnglish() {
  const ex = EXPRESSIONS[engDayIndex()];
  const doneToday = engData().done.includes(todayStr());

  const streakEl = document.getElementById("engStreak");
  if (streakEl) streakEl.innerHTML = `🔥 연속 <b>${engStreakCount()}</b>일`;

  const card = document.getElementById("engCard");
  card.className = "eng-card" + (doneToday ? " is-done" : "");
  card.innerHTML = `
    <span class="eng-tag">오늘의 표현</span>
    <p class="eng-en">${escapeHtml(ex.en)}</p>
    <p class="eng-ko">${escapeHtml(ex.ko)}</p>
    <div class="eng-note">${escapeHtml(ex.note)}</div>
    <div class="eng-actions">
      <button class="btn btn-outline" id="engSpeakBtn" type="button">🔊 발음 듣기</button>
      <button class="btn btn-primary" id="engDoneBtn" type="button" ${doneToday ? "disabled" : ""}>
        ${doneToday ? "✓ 오늘 학습 완료됨" : "오늘 학습 완료"}
      </button>
    </div>`;
  document.getElementById("engSpeakBtn").addEventListener("click", () => engSpeak(ex.en));
  const doneBtn = document.getElementById("engDoneBtn");
  if (doneBtn && !doneToday) doneBtn.addEventListener("click", markEnglishDone);

  renderEngHistory();
}

function renderEngHistory() {
  const list = document.getElementById("engHistoryList");
  if (!list) return;
  const now = new Date();
  const rows = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    const ex = EXPRESSIONS[doy % EXPRESSIONS.length];
    rows.push(`<div class="eng-hist-item">
      <span class="eng-hist-en">${escapeHtml(ex.en)}</span>
      <span class="eng-hist-ko">${escapeHtml(ex.ko)}</span>
      <span class="eng-hist-day">${d.getMonth() + 1}/${d.getDate()}</span>
    </div>`);
  }
  list.innerHTML = rows.join("");
}

function engSpeak(text) {
  if (!("speechSynthesis" in window)) {
    showToast("이 브라우저는 음성 재생을 지원하지 않아요", true);
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

function markEnglishDone() {
  const data = engData();
  const today = todayStr();
  if (!data.done.includes(today)) {
    data.done.push(today);
    if (data.done.length > 400) data.done = data.done.slice(-400);
    try { localStorage.setItem("me_eng_v1", JSON.stringify(data)); } catch (e) {}
  }
  renderDashEnglish();
  renderHero();
  showToast(`🔥 영어 ${engStreakCount()}일 연속! 잘하고 있어요`);
}

