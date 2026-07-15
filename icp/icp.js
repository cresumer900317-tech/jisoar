// ICP 코드 브릿지 — ThingsBoard·Node-RED 코드 전달함 (공용 작업공간)
// 인증: 접속코드 → /api/icp/login → JWT(sessionStorage). 길드 계정과 무관.
const API_BASE = "https://guild-backend-production-75a6.up.railway.app";

const STATE = {
  snippets: [],
  loaded: false,
  expanded: {},
  shown: 15,
  editingId: null,
  kind: "single",
  filter: "__all__",   // "__all__" | 작성자 이름
  search: "",          // 제목 검색어
};

const ALL_TAB = "__all__";
const MEMBERS = ["Jett", "Minhyun"];   // 고정 사용자 — 탭과 로그인 선택지
function myName() { return localStorage.getItem("icp_name") || ""; }

const TB4_PARTS = [
  { key: "html", label: "HTML" },
  { key: "css", label: "CSS" },
  { key: "js", label: "JavaScript" },
  { key: "settings", label: "Settings" },
];

// ── 유틸 ──────────────────────────────────────
const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function relativeTime(iso) {
  const t = new Date(iso).getTime();
  if (!t) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

let toastTimer = null;
function showToast(msg, isError) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.toggle("is-error", !!isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

async function copyText(text, okMsg) {
  const s = String(text ?? "");
  if (!s) { showToast("복사할 내용이 없어요", true); return; }
  try {
    await navigator.clipboard.writeText(s);
    showToast(okMsg || "복사됐어요 📋");
  } catch {
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

// ── 인증 / API ────────────────────────────────
function token() { return sessionStorage.getItem("icp_token") || ""; }

async function api(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  const t = token();
  if (t) opts.headers["Authorization"] = `Bearer ${t}`;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401 || res.status === 403) {
    sessionStorage.removeItem("icp_token");
    showLogin();
    throw new Error("다시 로그인해주세요");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "요청에 실패했어요");
  return data;
}

let pickedMember = "";
function pickMember(name) {
  pickedMember = name;
  document.querySelectorAll(".member-btn").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.name === name));
}

function showLogin() {
  $("loginView").hidden = false;
  $("appView").hidden = true;
  const saved = localStorage.getItem("icp_name") || "";
  if (MEMBERS.includes(saved)) pickMember(saved);
  if (pickedMember) $("loginCode").focus();
}

function showApp() {
  $("loginView").hidden = true;
  $("appView").hidden = false;
  $("userName").textContent = myName();
  STATE.filter = localStorage.getItem("icp_filter") || myName() || ALL_TAB;
  loadSnippets();
}

async function login(e) {
  e.preventDefault();
  const name = pickedMember;
  const code = $("loginCode").value;
  if (!name) { showToast("사용자를 선택해주세요 (Jett / Minhyun)", true); return; }
  if (!code) { showToast("접속코드를 입력해주세요", true); return; }
  $("loginBtn").disabled = true;
  try {
    const data = await api("POST", "/api/icp/login", { code, name });
    sessionStorage.setItem("icp_token", data.token);
    localStorage.setItem("icp_name", data.name);
    $("loginCode").value = "";
    showApp();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    $("loginBtn").disabled = false;
  }
}

function logout() {
  sessionStorage.removeItem("icp_token");
  STATE.snippets = [];
  STATE.loaded = false;
  showLogin();
}

// ── 목록 ──────────────────────────────────────
async function loadSnippets() {
  try {
    STATE.snippets = (await api("GET", "/api/icp/snippets")) || [];
    STATE.loaded = true;
    renderAll();
  } catch (e) {
    if (e.message !== "다시 로그인해주세요") showToast(e.message, true);
  }
}

// ── 작성자 탭 ─────────────────────────────────
function setFilter(key) {
  STATE.filter = key;
  localStorage.setItem("icp_filter", key);
  STATE.shown = 15;
  renderAll();
}

function filteredSnippets() {
  let items = STATE.snippets;
  if (STATE.filter !== ALL_TAB) items = items.filter((s) => (s.author || "") === STATE.filter);
  const q = STATE.search.trim().toLowerCase();
  if (q) items = items.filter((s) => String(s.title || "").toLowerCase().includes(q));
  return items;
}

function setSearch(value) {
  STATE.search = value;
  STATE.shown = 15;
  $("searchClearBtn").hidden = !value;
  renderSnippets();
}

function clearSearch() {
  $("searchInput").value = "";
  setSearch("");
}

function renderTabs() {
  const el = $("authorTabs");
  // 고정 멤버 탭 + (혹시 남아있는) 그 외 작성자 탭은 데이터가 있을 때만 표시
  const extras = [...new Set(STATE.snippets.map((s) => s.author || "").filter(Boolean))]
    .filter((a) => !MEMBERS.includes(a));
  const authors = [...MEMBERS, ...extras];
  if (STATE.filter !== ALL_TAB && !authors.includes(STATE.filter)) STATE.filter = ALL_TAB;
  const countOf = (a) => STATE.snippets.filter((s) => (s.author || "") === a).length;
  const tabs = [
    { key: ALL_TAB, label: "전체", count: STATE.snippets.length },
    ...authors.map((a) => ({ key: a, label: a, count: countOf(a) })),
  ];
  el.innerHTML = tabs.map((t) =>
    `<button class="author-tab ${STATE.filter === t.key ? "is-active" : ""}" data-key="${escapeHtml(t.key)}">
      ${escapeHtml(t.label)}<span class="tab-count">${t.count}</span>
    </button>`).join("");
  el.querySelectorAll(".author-tab").forEach((btn) =>
    btn.addEventListener("click", () => setFilter(btn.dataset.key)));
}

function renderAll() {
  renderTabs();
  renderSnippets();
}

function kindLabel(kind) {
  if (kind === "tb4") return "TB 4파트";
  if (kind === "note") return "메모";
  return "단일";
}

function preview(text) {
  const t = String(text || "");
  const clip = t.length > 600 ? t.slice(0, 600) + "\n…" : t;
  return escapeHtml(clip);
}

function cardHtml(s) {
  const title = escapeHtml(s.title || "(제목 없음)");
  const author = escapeHtml(s.author || "");
  const when = s.updated_at ? relativeTime(s.updated_at) : "";
  const expanded = !!STATE.expanded[s.id];
  let body = "";
  if (expanded) {
    if (s.kind === "tb4") {
      body = TB4_PARTS.map((p) => {
        const val = s[p.key] || "";
        if (!String(val).trim()) return "";
        return `<div class="snip-part">
          <div class="snip-part-head">
            <span class="snip-part-label">${p.label}</span>
            <button class="btn btn-outline btn-sm snip-copy" data-id="${s.id}" data-part="${p.key}">📋 복사</button>
          </div>
          <pre class="snip-pre">${preview(val)}</pre>
        </div>`;
      }).join("") || `<div class="snip-empty-body">내용 없음</div>`;
    } else if (s.kind === "note") {
      // 메모는 읽는 용도 — 줄바꿈 살려 표시. 아주 길면 화면만 자르고(렌더 부담) 복사는 항상 전문
      const full = String(s.content || "");
      const NOTE_SHOW_MAX = 20000;
      const clipped = full.length > NOTE_SHOW_MAX;
      const shownText = clipped ? full.slice(0, NOTE_SHOW_MAX) : full;
      const notice = clipped
        ? `<div class="snip-note-notice">내용이 길어 앞부분만 표시했어요 (전체 ${Math.round(full.length / 1000)}KB) — 📋 복사 버튼은 전체를 복사합니다</div>`
        : "";
      body = `<div class="snip-part"><div class="snip-note">${escapeHtml(shownText)}${clipped ? "\n…" : ""}</div>${notice}</div>`;
    } else {
      body = `<div class="snip-part"><pre class="snip-pre">${preview(s.content)}</pre></div>`;
    }
    body = `<div class="snip-body">${body}</div>`;
  }
  const copyBtn = s.kind === "tb4"
    ? ""
    : `<button class="btn ${s.kind === "note" ? "btn-outline" : "btn-primary"} btn-sm snip-copy" data-id="${s.id}" data-part="content">📋 복사</button>`;
  const badgeCls = s.kind === "tb4" ? "is-tb4" : s.kind === "note" ? "is-note" : "";
  return `<div class="snip-card ${expanded ? "is-open" : ""}" data-id="${s.id}">
    <div class="snip-card-head snip-toggle" data-id="${s.id}" title="${expanded ? "접기" : "펼쳐서 내용 보기"}">
      <div class="snip-card-title">
        <span class="snip-caret">${expanded ? "▾" : "▸"}</span>
        <span class="kind-badge ${badgeCls}">${kindLabel(s.kind)}</span>
        <span class="snip-title-text">${title}</span>
        ${author ? `<span class="snip-author">${author}</span>` : ""}
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
  const list = $("snipList");
  const items = filteredSnippets();
  $("snipCount").textContent = STATE.loaded ? `${items.length}개` : "";
  if (!STATE.loaded) {
    list.innerHTML = `<div class="snip-loading">불러오는 중…</div>`;
    return;
  }
  if (!items.length) {
    if (STATE.search.trim()) {
      list.innerHTML = `<div class="empty-state">"${escapeHtml(STATE.search.trim())}" 제목 검색 결과가 없어요.<br><small>다른 검색어를 입력하거나 ✕로 지워보세요.</small></div>`;
      return;
    }
    const who = STATE.filter === ALL_TAB ? "" : `${escapeHtml(STATE.filter)}님의 `;
    list.innerHTML = `<div class="empty-state">${who}코드가 아직 없어요.<br><small>집에서 ＋코드 추가로 붙여넣고, 회사 노트북에서 열어 📋복사하세요.</small></div>`;
    return;
  }
  const shown = items.slice(0, STATE.shown);
  const moreLeft = items.length - shown.length;
  list.innerHTML =
    shown.map(cardHtml).join("") +
    (moreLeft > 0 ? `<button class="btn btn-outline snip-more" id="snipMoreBtn">더 보기 (${moreLeft}개 남음)</button>` : "");

  list.querySelectorAll(".snip-copy").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const s = STATE.snippets.find((x) => x.id === Number(btn.dataset.id));
      if (!s) return;
      const part = btn.dataset.part;
      const label = part === "content" ? "코드" : part.toUpperCase();
      copyText(s[part], `${label} 복사됨 📋`);
    });
  });
  list.querySelectorAll(".snip-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openModal(Number(btn.dataset.id));
    });
  });
  list.querySelectorAll(".snip-del").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSnippet(Number(btn.dataset.id));
    });
  });
  list.querySelectorAll(".snip-toggle").forEach((head) => {
    head.addEventListener("click", () => {
      const id = Number(head.dataset.id);
      if (STATE.expanded[id]) delete STATE.expanded[id];
      else STATE.expanded[id] = true;
      renderSnippets();
    });
  });
  const moreBtn = $("snipMoreBtn");
  if (moreBtn) moreBtn.addEventListener("click", () => {
    STATE.shown += 15;
    renderSnippets();
  });
}

async function deleteSnippet(id) {
  const s = STATE.snippets.find((x) => x.id === id);
  if (!s) return;
  if (!confirm(`"${s.title || "(제목 없음)"}" 삭제할까요? (${s.author || "?"}님이 올린 코드)`)) return;
  try {
    await api("DELETE", `/api/icp/snippets/${id}`);
    STATE.snippets = STATE.snippets.filter((x) => x.id !== id);
    delete STATE.expanded[id];
    renderAll();
    showToast("삭제됐어요");
  } catch (e) {
    showToast(e.message, true);
  }
}

// ── 모달 ──────────────────────────────────────
function setKind(kind) {
  STATE.kind = kind;
  // 메모는 종류 토글에 없음 — 별도 버튼(＋메모 추가)으로만 진입, 토글 자체를 숨김
  $("kindToggle").hidden = kind === "note";
  document.querySelectorAll(".kind-btn").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.kind === kind));
  $("fieldsSingle").hidden = kind !== "single";
  $("fieldsTb4").hidden = kind !== "tb4";
  $("fieldsNote").hidden = kind !== "note";
}

function openModal(id, newKind) {
  STATE.editingId = id || null;
  const s = id ? STATE.snippets.find((x) => x.id === id) : null;
  const kind = s ? s.kind || "single" : newKind || "single";
  const isNote = kind === "note";
  $("snippetModalTitle").textContent = s
    ? (isNote ? "메모 편집" : "코드 편집")
    : (isNote ? "새 메모" : "새 코드");
  $("snippetId").value = s ? s.id : "";
  $("snipTitle").value = s ? s.title || "" : "";
  $("snipContent").value = s && !isNote ? s.content || "" : "";
  $("snipNote").value = s && isNote ? s.content || "" : "";
  $("snipHtml").value = s ? s.html || "" : "";
  $("snipCss").value = s ? s.css || "" : "";
  $("snipJs").value = s ? s.js || "" : "";
  $("snipSettings").value = s ? s.settings || "" : "";
  setKind(kind);
  $("snippetModal").hidden = false;
  $("snipTitle").focus();
}

function closeModal() {
  $("snippetModal").hidden = true;
  STATE.editingId = null;
}

async function saveSnippet(e) {
  if (e) e.preventDefault();
  const body = {
    title: $("snipTitle").value.trim(),
    kind: STATE.kind,
    content: STATE.kind === "single" ? $("snipContent").value
      : STATE.kind === "note" ? $("snipNote").value : "",
    html: STATE.kind === "tb4" ? $("snipHtml").value : "",
    css: STATE.kind === "tb4" ? $("snipCss").value : "",
    js: STATE.kind === "tb4" ? $("snipJs").value : "",
    settings: STATE.kind === "tb4" ? $("snipSettings").value : "",
  };
  const hasContent = body.content.trim() || body.html.trim() || body.css.trim() || body.js.trim() || body.settings.trim();
  if (!hasContent) { showToast(STATE.kind === "note" ? "내용을 입력해주세요" : "코드를 입력해주세요", true); return; }
  try {
    if (STATE.editingId) {
      const updated = await api("PATCH", `/api/icp/snippets/${STATE.editingId}`, body);
      const i = STATE.snippets.findIndex((x) => x.id === STATE.editingId);
      if (i >= 0) STATE.snippets[i] = updated;
      showToast("수정됐어요 ✅");
    } else {
      const created = await api("POST", "/api/icp/snippets", body);
      STATE.snippets.unshift(created);
      // 다른 사람 탭을 보던 중이었으면 내 탭으로 이동해서 방금 저장한 게 보이게
      if (STATE.filter !== ALL_TAB && STATE.filter !== myName()) setFilter(myName() || ALL_TAB);
      // 검색 중이었으면 지워서 방금 저장한 게 가려지지 않게
      if (STATE.search) clearSearch();
      showToast("저장됐어요 ✅");
    }
    closeModal();
    renderAll();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ── 초기화 ────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  $("loginForm").addEventListener("submit", login);
  document.querySelectorAll(".member-btn").forEach((b) =>
    b.addEventListener("click", () => { pickMember(b.dataset.name); $("loginCode").focus(); }));
  $("logoutBtn").addEventListener("click", logout);
  $("addBtn").addEventListener("click", () => openModal(null));
  $("addMemoBtn").addEventListener("click", () => openModal(null, "note"));
  $("searchInput").addEventListener("input", (e) => setSearch(e.target.value));
  $("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Escape") { clearSearch(); e.target.blur(); }
  });
  $("searchClearBtn").addEventListener("click", () => { clearSearch(); $("searchInput").focus(); });
  $("snippetForm").addEventListener("submit", saveSnippet);
  $("modalCloseBtn").addEventListener("click", closeModal);
  $("modalCancelBtn").addEventListener("click", closeModal);
  $("snippetModal").addEventListener("click", (e) => {
    if (e.target === $("snippetModal")) closeModal();
  });
  document.querySelectorAll(".kind-btn").forEach((b) =>
    b.addEventListener("click", () => setKind(b.dataset.kind)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("snippetModal").hidden) closeModal();
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !$("snippetModal").hidden) saveSnippet();
    // "/" 로 검색창 포커스 (입력 중이거나 모달 열려 있으면 무시)
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || "");
    if (e.key === "/" && !typing && $("snippetModal").hidden && !$("appView").hidden) {
      e.preventDefault();
      $("searchInput").focus();
    }
  });

  if (token()) showApp();
  else showLogin();
});
