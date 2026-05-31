const API_BASE = "https://guild-backend-production-75a6.up.railway.app";

const GUILD_META = {
  "친구들": { className: "guild-f1", label: "친구들" },
  "친구둘": { className: "guild-f2", label: "친구둘" },
  "친구삼": { className: "guild-f3", label: "친구삼" },
  "친구넷": { className: "guild-f4", label: "친구넷" },
  "친구닷": { className: "guild-f5", label: "친구닷" },
  "길드 없음": { className: "guild-none", label: "길드 없음" }
};

async function fetchLocalJson(filename) {
  const key = filename.replace(".json", "");
  const apiKey = {
    "home-summary": "home-summary",
    "members": "members",
    "ranking": "ranking",
    "weekly": "weekly",
    "notices": "notices",
  }[key] || key;
  const response = await fetch(`${API_BASE}/api/${apiKey}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`데이터를 불러오지 못했습니다: ${filename}`);
  return response.json();
}

const getHomeData = () => fetchLocalJson("home-summary.json");
const getRankingData = () => fetchLocalJson("ranking.json");
const getWeeklyData = () => fetchLocalJson("weekly.json");
const getGuildsData = () => fetchLocalJson("members.json");
const getNoticeData = () => fetchLocalJson("notices.json");
const getTipsData = async () => ({ posts: [] });

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("ko-KR").format(Math.round(num));
}

function formatRate(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "-";
  return `${num.toFixed(2)}%`;
}

function formatCompactPower(value) {
  const num = Number(String(value ?? "0").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num) || num === 0) return "-";
  const gyeong = Math.floor(num / 1e16);
  const jo = Math.floor((num % 1e16) / 1e12);
  const eok = Math.floor((num % 1e12) / 1e8);
  if (gyeong > 0 && jo > 0) return `${formatNumber(gyeong)}경 ${formatNumber(jo)}조`;
  if (gyeong > 0) return `${formatNumber(gyeong)}경`;
  if (jo > 0 && eok > 0) return `${formatNumber(jo)}조 ${formatNumber(eok)}억`;
  if (jo > 0) return `${formatNumber(jo)}조`;
  if (eok > 0) return `${formatNumber(eok)}억`;
  const man = Math.floor(num / 1e4);
  if (man > 0) return `${formatNumber(man)}만`;
  return formatNumber(num);
}

function fullPowerText(text) {
  return formatCompactPower(text);
}

function normalizeGuildName(guild) {
  const text = String(guild || "").trim();
  return GUILD_META[text] ? text : "길드 없음";
}

function guildBadgeHtml(guild) {
  const normalized = normalizeGuildName(guild);
  const meta = GUILD_META[normalized];
  return `<span class="guild-badge ${meta.className}">${escapeHtml(meta.label)}</span>`;
}

function metricClass(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num) || num === 0) return "metric-neutral";
  return num > 0 ? "metric-up" : "metric-down";
}

function metricHtml(value, suffix = "") {
  const num = Number(value ?? 0);
  const absVal = formatCompactPower(Math.abs(num));
  const text = !Number.isFinite(num) ? "-" : `${num > 0 ? "+" : num < 0 ? "-" : ""}${absVal}${suffix}`;
  return `<span class="${metricClass(num)}">${escapeHtml(text)}</span>`;
}

function rankTrendHtml(item) {
  const diff = Number(item?.serverRankDiff ?? 0);
  const direction = item?.serverRankDirection || (diff > 0 ? "up" : diff < 0 ? "down" : "same");
  if (!diff || direction === "same") return `<span class="rank-trend neutral">-</span>`;
  if (direction === "up") return `<span class="rank-trend up">▲ ${Math.abs(diff)}</span>`;
  return `<span class="rank-trend down">▼ ${Math.abs(diff)}</span>`;
}

function navLink(href, key, label, currentPage) {
  const activeClass = currentPage === key ? "is-active" : "";
  return `<a class="nav-link ${activeClass}" href="${href}">${label}</a>`;
}

function renderShell() {
  const root = document.getElementById("app-shell");
  if (!root) return;
  const page = document.body.dataset.page || "home";
  const user = getUser();

  // 공지/팁은 로그인 필요
  if (!requireLogin(page)) return;

  const links = `
    ${navLink("./", "home", "홈", page)}
    ${navLink("./ranking", "ranking", "랭킹", page)}
    ${navLink("./members", "members", "길드원", page)}
    ${navLink("./weekly", "weekly", "월간성장", page)}
    ${navLink("./rivals", "rivals", "라이벌전", page)}
    ${navLink("./civil", "civil", "내전", page)}
    ${navLink("./notice", "notice", "공지", page)}
    ${navLink("./tips", "tips", "팁", page)}
    ${navLink("./free", "free", "자유", page)}
    ${navLink("./download", "download", "매크로", page)}
  `;

  const userHtml = user
    ? `<div class="nav-user-dropdown">
        <button class="nav-user-trigger" onclick="this.parentElement.classList.toggle('is-open')">
          <span class="nav-user-name">${escapeHtml(user.character_name)}</span>
          <span class="nav-user-arrow">▾</span>
        </button>
        <div class="nav-user-menu">
          <div class="nav-user-menu-header">
            <strong>${escapeHtml(user.character_name)}</strong>
            <span>${escapeHtml(user.guild||"")}</span>
          </div>
          <a href="./mypage" class="nav-user-menu-item">회원정보</a>
          <a href="./login?tab=changepw" class="nav-user-menu-item">비밀번호 변경</a>
          <button class="nav-user-menu-item nav-user-menu-logout" onclick="logout()">로그아웃</button>
        </div>
       </div>`
    : `<div class="nav-auth-btns">
        <a class="nav-register-btn" href="./login?tab=register">회원가입</a>
        <a class="nav-login-btn" href="./login">로그인</a>
       </div>`;

  root.innerHTML = `
    <header class="site-header-bar">
      <div class="container site-header-inner">
        <a class="brand-box" href="./">
          <span class="brand-emoji">🛡️</span>
          <div>
            <div class="brand-title">친구패밀리</div>
            <div class="brand-sub">Guild Portal</div>
          </div>
        </a>
        <nav class="nav-menu">${links}</nav>
        ${userHtml}
        <div class="mobile-auth-header">
          ${user
            ? `<span class="mobile-header-user">👤 ${escapeHtml(user.character_name)}</span>`
            : `<a href="./login?tab=register" class="mobile-header-register">가입</a>
               <a href="./login" class="mobile-header-login">로그인</a>`
          }
        </div>
        <button id="mobileMenuButton" class="mobile-menu-btn" type="button" aria-label="메뉴 열기">☰</button>
      </div>
      <div id="mobileNavPanel" class="mobile-nav-panel">
        <div class="container mobile-nav-links">
          ${links}
          <div class="mobile-auth-links">
            ${user
              ? `<div class="mobile-user-info">
                  <div style="font-size:0.85rem;font-weight:700;color:var(--text);margin-bottom:8px;">👤 ${escapeHtml(user.character_name)} <span style="font-size:0.72rem;font-weight:400;color:var(--text-faint);">${escapeHtml(user.guild||"")}</span></div>
                  <div style="display:flex;gap:8px;">
                    <a href="./mypage" class="mobile-auth-btn mobile-register" style="flex:1;">회원정보</a>
                    <a href="./login?tab=changepw" class="mobile-auth-btn mobile-register" style="flex:1;">비밀번호 변경</a>
                  </div>
                  <button onclick="logout()" class="mobile-auth-btn mobile-login" style="width:100%;margin-top:8px;border:none;cursor:pointer;">로그아웃</button>
                </div>`
              : `<a href="./login?tab=register" class="mobile-auth-btn mobile-register">회원가입</a>
                 <a href="./login" class="mobile-auth-btn mobile-login">로그인</a>`
            }
          </div>
        </div>
      </div>
    </header>
  `;
  const mobileMenuButton = document.getElementById("mobileMenuButton");
  const mobileNavPanel = document.getElementById("mobileNavPanel");
  if (mobileMenuButton && mobileNavPanel) {
    mobileMenuButton.addEventListener("click", () => mobileNavPanel.classList.toggle("is-open"));
  }

  // 드롭다운 바깥 클릭 시 닫기
  document.addEventListener("click", (e) => {
    const dd = document.querySelector(".nav-user-dropdown");
    if (dd && !dd.contains(e.target)) dd.classList.remove("is-open");
  });

  // 방문자 ping
  pingVisitor();
  // 3분마다 재핑 (접속 유지)
  setInterval(pingVisitor, 3 * 60 * 1000);
}

function getPowerDisplay(item) {
  const pt = item.powerText || "";
  const parts = pt.trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? parts[0] + " " + parts[1] : pt || formatCompactPower(item.power);
}

function bindCardSearch(inputId, resetBtnId, listId, dataAttr) {
  const input = document.getElementById(inputId);
  const resetBtn = document.getElementById(resetBtnId);
  const wrap = document.getElementById(listId);
  if (!input || !wrap) return;
  function apply() {
    const kw = String(input.value || "").trim().toLowerCase();
    const cards = Array.from(wrap.querySelectorAll(`[${dataAttr}]`));
    cards.forEach(c => c.classList.remove("highlight-card", "dim-card"));
    if (!kw) return;
    let first = null;
    cards.forEach(c => {
      if ((c.getAttribute(dataAttr) || "").includes(kw)) {
        c.classList.add("highlight-card");
        if (!first) first = c;
      } else {
        c.classList.add("dim-card");
      }
    });
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  input.addEventListener("input", apply);
  if (resetBtn) resetBtn.addEventListener("click", () => { input.value = ""; apply(); input.focus(); });
}

function renderLoading(targetId, message = "불러오는 중...") {
  const el = document.getElementById(targetId) || document.querySelector("main");
  if (el) el.innerHTML = `<div class="container" style="padding-top:40px;"><div class="loading-box">${escapeHtml(message)}</div></div>`;
}

function renderError(targetId, error) {
  const el = document.getElementById(targetId) || document.querySelector("main");
  if (el) el.innerHTML = `<div class="container" style="padding-top:40px;"><div class="error-box">${escapeHtml(error?.message || "오류가 발생했습니다.")}</div></div>`;
}

function createEmptyBox(message = "데이터가 없습니다.") {
  return `<div class="empty-box">${escapeHtml(message)}</div>`;
}

function characterAvatarHtml(item) {
  const name = String(item?.name || "").trim();
  const imageUrl = `https://mgf.gg/ranking/ranking_image.php?n=${encodeURIComponent(name)}`;
  const fallback = escapeHtml((name || "?").slice(0, 1));
  return `
    <div class="character-avatar">
      <img src="${imageUrl}" alt="${escapeHtml(name)}" loading="lazy" referrerpolicy="no-referrer"
           onerror="this.parentElement.classList.add('no-image'); this.remove();" />
      <span class="avatar-fallback">${fallback}</span>
    </div>
  `;
}

function renderBoardList(posts, emptyMessage) {
  if (!Array.isArray(posts) || posts.length === 0) return createEmptyBox(emptyMessage);
  return `
    <div class="notice-stack">
      ${posts.map(post => `
        <article class="notice-card">
          <div class="notice-top">
            <span class="notice-chip">${escapeHtml(post.category || "게시글")}</span>
            ${post.isPinned || post.is_pinned ? `<span class="notice-pin">고정</span>` : ""}
          </div>
          <h3 class="notice-title">${escapeHtml(post.title || "")}</h3>
          <p class="notice-content">${escapeHtml(post.content || "")}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function byGuild(rows) {
  const grouped = {};
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const guild = normalizeGuildName(row.guild || "길드 없음");
    grouped[guild] ||= [];
    grouped[guild].push(row);
  });
  return grouped;
}
// ── 방문자 트래킹 ──────────────────────────────────────────
function getSessionId() {
  let sid = sessionStorage.getItem("session_id");
  if (!sid) {
    sid = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem("session_id", sid);
  }
  return sid;
}

function pingVisitor() {
  const user = getUser();
  const name = user ? user.character_name : ("guest_" + getSessionId().slice(-4));
  fetch(`${API_BASE}/api/visitors/ping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: getSessionId(), character_name: name }),
  }).catch(() => {});
}

// ── 인증 유틸 ──────────────────────────────────────────────
function getUser() {
  try {
    const u = sessionStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

function getToken() {
  return sessionStorage.getItem("token") || "";
}

function authHeaders() {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function requireLogin(page) {
  // 공지, 팁 페이지는 로그인 필요
  const restricted = ["members", "weekly", "rivals", "civil", "notice", "tips", "notice-view", "notice-write", "tips-view", "tips-write", "free", "free-view", "free-write", "download"];
  if (restricted.includes(page) && !getUser()) {
    const base = page.startsWith("notice") ? "notice" : page.startsWith("tips") ? "tips" : page.startsWith("free") ? "free" : page;
    location.href = `./login?redirect=./${base}`;
    return false;
  }
  return true;
}

function logout() {
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("token");
  location.href = "./";
}