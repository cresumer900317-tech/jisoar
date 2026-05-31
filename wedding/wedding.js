/* 박기백·박지은 결혼식 — 하객 사진·영상 업로드 (v3).
   - 입력 없음(이름/메시지 X) → 업로드 장벽 0
   - 사진: 클라이언트 압축(max 1920px, JPEG q0.85) / 동영상: 원본 업로드
   - 병렬 3개 / 익명 uuid / 꽃잎·라이브 카운터·제작자 모달 */

(function () {
  "use strict";

  const API_BASE = "https://guild-backend-production-75a6.up.railway.app";
  const MAX_DIMENSION = 1920;
  const JPEG_QUALITY = 0.85;
  const MAX_PARALLEL = 3;
  const VIDEO_RE = /^video\//i;
  const VIDEO_EXT_RE = /\.(mp4|mov|webm|m4v|3gp)$/i;
  const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

  function isVideo(file) { return VIDEO_RE.test(file.type) || VIDEO_EXT_RE.test(file.name || ""); }
  function isAccepted(file) {
    return /^image\//i.test(file.type) || isVideo(file) ||
           IMAGE_EXT_RE.test(file.name || "") || VIDEO_EXT_RE.test(file.name || "");
  }
  function getUuid() {
    try {
      let v = localStorage.getItem("wedding_uploader_uuid");
      if (!v) {
        v = (crypto.randomUUID && crypto.randomUUID()) ||
            ("uid-" + Math.random().toString(36).slice(2) + Date.now().toString(36));
        localStorage.setItem("wedding_uploader_uuid", v);
      }
      return v;
    } catch (_) { return "uid-" + Math.random().toString(36).slice(2); }
  }

  const $ = id => document.getElementById(id);
  const $file = $("fileInput");
  const $drop = $("dropZone");
  const $previews = $("previews");
  const $upload = $("uploadBtn");
  const $status = $("status");
  const $progressWrap = $("progressWrap");
  const $progressFill = $("progressFill");
  const $progressText = $("progressText");
  const $uploadCard = $("uploadCard");
  const $doneCard = $("doneCard");
  const $doneTitle = $("doneTitle");
  const $doneRank = $("doneRank");
  const $doneGrid = $("doneGrid");
  const $moreBtn = $("moreBtn");
  const $liveCount = $("liveCount");
  const $liveNum = $("liveNum");

  const prefersReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── 컨페티 버스트 (완료 연출) ─────────────────
  const CONFETTI_COLORS = [
    "linear-gradient(120% 120% at 30% 20%, #f6d9d0, #d99e90)", // 블러시
    "linear-gradient(120% 120% at 30% 20%, #f2e2bc, #c5a368)", // 골드
    "linear-gradient(120% 120% at 30% 20%, #d9e3cf, #a7b89a)", // 세이지
    "linear-gradient(120% 120% at 30% 20%, #fff4e6, #efd8bf)"  // 아이보리
  ];
  function burstConfetti() {
    const layer = $("confetti");
    if (!layer || prefersReduce) return;
    layer.innerHTML = "";
    const N = 36;
    for (let i = 0; i < N; i++) {
      const p = document.createElement("div");
      p.className = "wp-confetti-piece";
      const ang = (Math.PI * 2 * i) / N + (Math.random() * 0.5 - 0.25);
      const dist = 90 + Math.random() * 190;          // 퍼지는 거리
      const x = Math.cos(ang) * dist;
      const y = Math.sin(ang) * dist - 40 + Math.random() * 200; // 살짝 아래로 흩날림
      p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      p.style.setProperty("--wp-bx", x.toFixed(0) + "px");
      p.style.setProperty("--wp-by", y.toFixed(0) + "px");
      p.style.setProperty("--wp-br", (Math.random() * 720 - 360).toFixed(0) + "deg");
      p.style.setProperty("--wp-bd", (1.2 + Math.random() * 0.9).toFixed(2) + "s");
      p.style.setProperty("--wp-bdelay", (Math.random() * 0.18).toFixed(2) + "s");
      const s = 0.7 + Math.random() * 0.9;
      p.style.width = (11 * s).toFixed(0) + "px";
      p.style.height = (9 * s).toFixed(0) + "px";
      layer.appendChild(p);
    }
    setTimeout(() => { layer.innerHTML = ""; }, 2600);
  }

  // ── 공유 (Web Share → 링크 복사 폴백) ─────────
  async function sharePage(btn) {
    const url = location.origin + location.pathname;
    const data = {
      title: "박기백 ♥ 박지은 결혼식",
      text: "오늘의 순간을 사진·영상으로 함께 담아주세요 💕",
      url
    };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (_) { /* 취소 시 폴백 안 함 */ return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      if (btn) {
        const label = btn.textContent;
        btn.classList.add("is-copied");
        btn.textContent = "링크 복사됨 ✓";
        setTimeout(() => { btn.classList.remove("is-copied"); btn.textContent = label; }, 1800);
      }
    } catch (_) {
      window.prompt("아래 링크를 복사해 공유해 주세요", url);
    }
  }

  // ── 꽃잎 ──────────────────────────────────────
  (function initPetals() {
    const layer = $("petals");
    if (!layer || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    const N = 14;
    for (let i = 0; i < N; i++) {
      const p = document.createElement("div");
      p.className = "wp-petal";
      const size = 8 + Math.random() * 10;
      const dur = 9 + Math.random() * 9;
      p.style.left = (Math.random() * 100) + "vw";
      p.style.width = size + "px";
      p.style.height = (size * 0.85) + "px";
      p.style.setProperty("--wp-drift", (Math.random() * 160 - 80) + "px");
      p.style.animationDuration = dur + "s";
      p.style.animationDelay = (-Math.random() * dur) + "s";
      if (i % 3 === 0) p.style.filter = "hue-rotate(-12deg) brightness(1.05)";
      layer.appendChild(p);
    }
  })();

  // ── 라이브 카운터 ─────────────────────────────
  async function fetchCount() {
    try {
      const r = await fetch(`${API_BASE}/api/wedding/count`);
      if (!r.ok) return null;
      return await r.json();
    } catch (_) { return null; }
  }
  fetchCount().then(c => {
    if (c && c.total > 0) {
      $liveNum.textContent = Number(c.total).toLocaleString("ko-KR");
      $liveCount.hidden = false;
    }
  });

  // ── 큐 ────────────────────────────────────────
  const queue = [];

  function refreshUploadBtn() {
    const pending = queue.filter(q => q.status === "idle" || q.status === "fail").length;
    $upload.disabled = pending === 0;
    $upload.querySelector(".wp-btn-label").textContent = pending > 0 ? `${pending}개 올리기` : "사진을 선택해 주세요";
    $previews.hidden = queue.length === 0;
  }
  function setStatus(msg, isError) {
    if (!msg) { $status.hidden = true; return; }
    $status.hidden = false; $status.textContent = msg;
    $status.classList.toggle("is-error", !!isError);
  }
  let progTargets = null;   // 진행 중 항목들 (바이트 단위 진행률 집계)
  function renderProgress() {
    if (!progTargets || !progTargets.length) { $progressWrap.hidden = true; return; }
    const total = progTargets.length;
    let frac = 0, doneCount = 0, videoUploading = false;
    progTargets.forEach(t => {
      if (t.status === "done") { frac += 1; doneCount++; }
      else if (t.status === "fail") { doneCount++; }
      else {
        frac += (t.progress || 0);
        if (t.status === "uploading" && t.video) videoUploading = true;
      }
    });
    const pct = Math.round((frac / total) * 100);
    $progressWrap.hidden = false;
    $progressFill.style.width = pct + "%";
    const what = videoUploading ? "영상" : "사진";
    $progressText.textContent = `${what} 올리는 중 · ${pct}%` + (total > 1 ? `  (${doneCount}/${total})` : "");
  }
  // XHR 업로드 — 진행률(onprogress)을 받기 위해 fetch 대신 사용 (영상도 바가 실시간으로 움직임)
  function xhrUpload(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.timeout = 180000;
      xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let json = {}; try { json = JSON.parse(xhr.responseText); } catch (_) {}
          resolve(json);
        } else {
          reject(new Error(`서버 오류 (${xhr.status}) ${String(xhr.responseText || "").slice(0, 120)}`));
        }
      };
      xhr.onerror = () => reject(new Error("네트워크 오류"));
      xhr.ontimeout = () => reject(new Error("시간 초과"));
      xhr.send(formData);
    });
  }

  function addFiles(files) {
    const items = Array.from(files || []).filter(isAccepted);
    if (!items.length) return;
    items.forEach(file => {
      const id = "q-" + Math.random().toString(36).slice(2);
      const video = isVideo(file);
      const url = URL.createObjectURL(file);
      const thumb = document.createElement("div");
      thumb.className = "wp-thumb" + (video ? " is-video" : "");
      thumb.dataset.id = id;
      if (video) {
        thumb.innerHTML = `<video muted playsinline preload="metadata"></video><span class="wp-thumb-play" aria-hidden="true">▶</span><button class="wp-thumb-remove" type="button" aria-label="제거">×</button><span class="wp-thumb-status" aria-hidden="true"></span>`;
        thumb.querySelector("video").src = url;
      } else {
        thumb.innerHTML = `<img alt="" /><button class="wp-thumb-remove" type="button" aria-label="제거">×</button><span class="wp-thumb-status" aria-hidden="true"></span>`;
        thumb.querySelector("img").src = url;
      }
      thumb.querySelector(".wp-thumb-remove").addEventListener("click", () => {
        const idx = queue.findIndex(q => q.id === id);
        if (idx >= 0 && queue[idx].status !== "uploading") {
          try { URL.revokeObjectURL(queue[idx].url); } catch (_) {}
          queue.splice(idx, 1); thumb.remove(); refreshUploadBtn();
        }
      });
      $previews.appendChild(thumb);
      queue.push({ id, file, video, url, thumb, status: "idle" });
    });
    refreshUploadBtn();
    setStatus("");
  }

  // ── 압축 (사진만) ─────────────────────────────
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = e => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }
  function canvasToBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(b => resolve(b), type, quality));
  }
  async function compressImage(file) {
    let img;
    try { img = await loadImage(file); } catch (_) { return file; }
    const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longEdge > MAX_DIMENSION ? MAX_DIMENSION / longEdge : 1;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    if (!blob) return file;
    if (blob.size >= file.size && /\.jpe?g$/i.test(file.name)) return Object.assign(file, { _w: w, _h: h });
    const compressed = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    compressed._w = w; compressed._h = h;
    return compressed;
  }

  // ── 업로드 ────────────────────────────────────
  async function uploadOne(item) {
    item.status = "uploading";
    item.progress = 0;
    item.thumb.classList.add("is-uploading");
    item.thumb.querySelector(".wp-thumb-status").textContent = "…";
    try {
      const payload = item.video ? item.file : await compressImage(item.file);
      const fd = new FormData();
      fd.append("file", payload, payload.name);
      fd.append("uploader_uuid", getUuid());
      if (payload._w) fd.append("width", String(payload._w));
      if (payload._h) fd.append("height", String(payload._h));
      const json = await xhrUpload(`${API_BASE}/api/wedding/upload`, fd, frac => {
        item.progress = frac; renderProgress();
      });
      item.serverId = json && json.id != null ? json.id : null;   // 회수용 photo id
      item.progress = 1;
      item.status = "done";
      item.thumb.classList.remove("is-uploading");
      item.thumb.classList.add("is-done");
      item.thumb.querySelector(".wp-thumb-status").textContent = "✓";
    } catch (e) {
      console.error("[wedding upload]", e);
      item.progress = 0;
      item.status = "fail";
      item.thumb.classList.remove("is-uploading");
      item.thumb.classList.add("is-fail");
      item.thumb.querySelector(".wp-thumb-status").textContent = "!";
    }
    renderProgress();
  }

  // ── 회수 (본인 uuid 로만 삭제) ────────────────
  async function recallPhoto(it, cell) {
    if (it.serverId == null) {
      alert("이 사진은 회수 정보가 없어 신랑·신부에게 말씀해 주세요.");
      return;
    }
    if (!confirm("이 사진을 회수할까요?\n올라간 사진이 삭제되고 되돌릴 수 없어요.")) return;
    const btn = cell.querySelector(".wp-done-recall");
    if (btn) { btn.disabled = true; btn.textContent = "…"; }
    try {
      const res = await fetch(
        `${API_BASE}/api/wedding/${encodeURIComponent(it.serverId)}?uuid=${encodeURIComponent(getUuid())}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("회수 실패 " + res.status);
      cell.classList.add("is-removed");
      setTimeout(() => { cell.remove(); if (!$doneGrid.children.length) $doneGrid.classList.add("is-empty"); }, 260);
    } catch (e) {
      console.error("[wedding recall]", e);
      if (btn) { btn.disabled = false; btn.textContent = "×"; }
      alert("회수에 실패했어요. 잠시 후 다시 시도하거나 신랑·신부에게 말씀해 주세요.");
    }
  }

  function showDone(items) {
    $doneGrid.innerHTML = "";
    $doneGrid.classList.remove("is-empty");
    items.forEach(it => {
      const cell = document.createElement("div");
      cell.className = "wp-done-cell";
      if (it.video) {
        cell.innerHTML = `<video muted playsinline preload="metadata"></video><span class="wp-done-play">▶</span><span class="wp-done-check">✓</span><button type="button" class="wp-done-recall" aria-label="회수">×</button>`;
        cell.querySelector("video").src = it.url;
      } else {
        cell.innerHTML = `<img alt="" /><span class="wp-done-check">✓</span><button type="button" class="wp-done-recall" aria-label="회수">×</button>`;
        cell.querySelector("img").src = it.url;
      }
      cell.querySelector(".wp-done-recall").addEventListener("click", () => recallPhoto(it, cell));
      $doneGrid.appendChild(cell);
    });
    $doneTitle.textContent = `추억 ${items.length}개, 전달됐어요! 🎉`;
    $doneRank.hidden = true;
    $uploadCard.hidden = true;
    $doneCard.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    burstConfetti();

    // 모인 전체 수를 다시 받아 감정 카피로
    fetchCount().then(c => {
      if (!c || !c.total) return;
      const img = Number(c.images || 0).toLocaleString("ko-KR");
      const vid = Number(c.videos || 0).toLocaleString("ko-KR");
      $doneRank.innerHTML = c.videos > 0
        ? `지금까지 사진 <b>${img}</b>장 · 영상 <b>${vid}</b>개가 모였어요`
        : `지금까지 <b>${img}</b>개의 순간이 모였어요`;
      $doneRank.hidden = false;
    });
  }

  async function uploadAll() {
    const targets = queue.filter(q => q.status === "idle" || q.status === "fail");
    if (!targets.length) return;
    targets.forEach(t => { t.status = "idle"; t.thumb.classList.remove("is-fail"); t.thumb.querySelector(".wp-thumb-status").textContent = ""; });
    $upload.disabled = true;
    setStatus("");
    targets.forEach(t => { t.progress = 0; });
    progTargets = targets;
    renderProgress();
    let cursor = 0;
    async function worker() {
      while (cursor < targets.length) {
        await uploadOne(targets[cursor++]);
      }
    }
    const workers = [];
    for (let i = 0; i < Math.min(MAX_PARALLEL, targets.length); i++) workers.push(worker());
    await Promise.all(workers);

    const succeeded = queue.filter(q => q.status === "done");
    const failed = queue.filter(q => q.status === "fail").length;
    progTargets = null;
    $progressWrap.hidden = true;
    if (failed === 0) {
      showDone(succeeded.slice());
      queue.length = 0;
      $previews.innerHTML = "";
      $previews.hidden = true;
    } else {
      setStatus(`${succeeded.length}개 성공 · ${failed}개 실패. 아래 버튼으로 다시 시도해 주세요.`, true);
      $upload.disabled = false;
      $upload.querySelector(".wp-btn-label").textContent = `실패 ${failed}개 다시 시도`;
    }
  }

  // ── 이벤트 ────────────────────────────────────
  $file.addEventListener("change", e => { addFiles(e.target.files); e.target.value = ""; });
  ["dragenter", "dragover"].forEach(t => $drop.addEventListener(t, e => { e.preventDefault(); $drop.classList.add("is-drag"); }));
  ["dragleave", "drop"].forEach(t => $drop.addEventListener(t, e => { e.preventDefault(); $drop.classList.remove("is-drag"); }));
  $drop.addEventListener("drop", e => { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });
  $upload.addEventListener("click", uploadAll);
  $moreBtn.addEventListener("click", () => {
    $doneCard.hidden = true; $uploadCard.hidden = false; $doneGrid.innerHTML = "";
    refreshUploadBtn();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  window.addEventListener("beforeunload", e => {
    if (queue.some(q => q.status === "uploading")) { e.preventDefault(); e.returnValue = ""; }
  });

  // ── 공유 버튼 ─────────────────────────────────
  const $shareDone = $("shareBtnDone");
  if ($shareDone) $shareDone.addEventListener("click", () => sharePage($shareDone));

  // ── 제작자 / 기술 스택 모달 ───────────────────
  const $brand = $("brandBtn");
  const $modal = $("techModal");
  const $modalClose = $("techClose");
  if ($brand && $modal) {
    let lastFocused = null;
    const open = () => {
      lastFocused = document.activeElement;
      $modal.hidden = false; document.body.style.overflow = "hidden";
      if ($modalClose && $modalClose.focus) $modalClose.focus();
    };
    const close = () => {
      $modal.hidden = true; document.body.style.overflow = "";
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };
    $brand.addEventListener("click", open);
    $modalClose.addEventListener("click", close);
    $modal.addEventListener("click", e => { if (e.target === $modal) close(); });
    document.addEventListener("keydown", e => { if (!$modal.hidden && e.key === "Escape") close(); });
    // 포커스 트랩 — 모달 밖으로 탭 안 빠지게
    $modal.addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      const f = $modal.querySelectorAll('button, a[href], summary, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  // 거래 경로 링크: URL 미설정(#/빈값)이면 줄째로 숨김 — 깨진 링크 노출 방지
  const $contact = $("contactLink");
  if ($contact) {
    const href = ($contact.getAttribute("href") || "").trim();
    if (!href || href === "#") {
      const box = $contact.closest(".wp-modal-contact");
      if (box) box.hidden = true;
    }
  }

  refreshUploadBtn();
})();
