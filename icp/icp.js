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
};

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

function showLogin() {
  $("loginView").hidden = false;
  $("appView").hidden = true;
  const saved = localStorage.getItem("icp_name") || "";
  $("loginName").value = saved;
  (saved ? $("loginCode") : $("loginName")).focus();
}

function showApp() {
  $("loginView").hidden = true;
  $("appView").hidden = false;
  $("userName").textContent = localStorage.getItem("icp_name") || "";
  loadSnippets();
}

async function login(e) {
  e.preventDefault();
  const name = $("loginName").value.trim();
  const code = $("loginCode").value;
  if (!name) { showToast("이름을 입력해주세요", true); return; }
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
    renderSnippets();
  } catch (e) {
    if (e.message !== "다시 로그인해주세요") showToast(e.message, true);
  }
}

function kindLabel(kind) {
  return kind === "tb4" ? "TB 4파트" : "단일";
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
    } else {
      body = `<div class="snip-part"><pre class="snip-pre">${preview(s.content)}</pre></div>`;
    }
    body = `<div class="snip-body">${body}</div>`;
  }
  const copyBtn = s.kind === "tb4"
    ? ""
    : `<button class="btn btn-primary btn-sm snip-copy" data-id="${s.id}" data-part="content">📋 복사</button>`;
  return `<div class="snip-card ${expanded ? "is-open" : ""}" data-id="${s.id}">
    <div class="snip-card-head snip-toggle" data-id="${s.id}" title="${expanded ? "접기" : "펼쳐서 내용 보기"}">
      <div class="snip-card-title">
        <span class="snip-caret">${expanded ? "▾" : "▸"}</span>
        <span class="kind-badge ${s.kind === "tb4" ? "is-tb4" : ""}">${kindLabel(s.kind)}</span>
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
  $("snipCount").textContent = STATE.loaded ? `${STATE.snippets.length}개` : "";
  if (!STATE.loaded) {
    list.innerHTML = `<div class="snip-loading">불러오는 중…</div>`;
    return;
  }
  if (!STATE.snippets.length) {
    list.innerHTML = `<div class="empty-state">아직 담아둔 코드가 없어요.<br><small>집에서 ＋코드 추가로 붙여넣고, 회사 노트북에서 열어 📋복사하세요.</small></div>`;
    return;
  }
  const shown = STATE.snippets.slice(0, STATE.shown);
  const moreLeft = STATE.snippets.length - shown.length;
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
    renderSnippets();
    showToast("삭제됐어요");
  } catch (e) {
    showToast(e.message, true);
  }
}

// ── 모달 ──────────────────────────────────────
function setKind(kind) {
  STATE.kind = kind;
  document.querySelectorAll(".kind-btn").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.kind === kind));
  $("fieldsSingle").hidden = kind !== "single";
  $("fieldsTb4").hidden = kind !== "tb4";
}

function openModal(id) {
  STATE.editingId = id || null;
  const s = id ? STATE.snippets.find((x) => x.id === id) : null;
  $("snippetModalTitle").textContent = s ? "코드 편집" : "새 코드";
  $("snippetId").value = s ? s.id : "";
  $("snipTitle").value = s ? s.title || "" : "";
  $("snipContent").value = s ? s.content || "" : "";
  $("snipHtml").value = s ? s.html || "" : "";
  $("snipCss").value = s ? s.css || "" : "";
  $("snipJs").value = s ? s.js || "" : "";
  $("snipSettings").value = s ? s.settings || "" : "";
  setKind(s ? s.kind || "single" : "single");
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
    content: STATE.kind === "single" ? $("snipContent").value : "",
    html: STATE.kind === "tb4" ? $("snipHtml").value : "",
    css: STATE.kind === "tb4" ? $("snipCss").value : "",
    js: STATE.kind === "tb4" ? $("snipJs").value : "",
    settings: STATE.kind === "tb4" ? $("snipSettings").value : "",
  };
  const hasContent = body.content.trim() || body.html.trim() || body.css.trim() || body.js.trim() || body.settings.trim();
  if (!hasContent) { showToast("코드를 입력해주세요", true); return; }
  try {
    if (STATE.editingId) {
      const updated = await api("PATCH", `/api/icp/snippets/${STATE.editingId}`, body);
      const i = STATE.snippets.findIndex((x) => x.id === STATE.editingId);
      if (i >= 0) STATE.snippets[i] = updated;
      showToast("수정됐어요 ✅");
    } else {
      const created = await api("POST", "/api/icp/snippets", body);
      STATE.snippets.unshift(created);
      showToast("저장됐어요 ✅");
    }
    closeModal();
    renderSnippets();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ── 초기화 ────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  $("loginForm").addEventListener("submit", login);
  $("logoutBtn").addEventListener("click", logout);
  $("addBtn").addEventListener("click", () => openModal(null));
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
  });

  if (token()) showApp();
  else showLogin();
});
