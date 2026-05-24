const API = "/api";

let posts = [];

const feed = document.getElementById("feed");
const mainMenu = document.getElementById("mainMenu");
const postMenu = document.getElementById("postMenu");
const composeModal = document.getElementById("composeModal");
const composeText = document.getElementById("composeText");
const postBtn = document.getElementById("postBtn");
const toast = document.getElementById("toast");

const THEMES = {
  default: "기본 (Fluent)",
  dark: "다크 모드",
  light: "밝은 회색",
};

let activeMenu = null;

function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderPost(post, index) {
  const imageHtml = post.hasImage
    ? `<div class="post-image-placeholder">📷 이미지</div>`
    : "";

  return `
    <article class="post" data-id="${post.id}" style="animation-delay: ${index * 0.05}s">
      <div class="avatar" style="background: ${post.gradient}">${escapeHtml(post.avatar)}</div>
      <div class="post-content">
        <div class="post-header">
          <span class="post-name">${escapeHtml(post.name)}</span>
          <span class="post-handle">@${escapeHtml(post.handle)}</span>
          <span class="post-dot">·</span>
          <span class="post-time">${escapeHtml(post.time)}</span>
          <button class="post-more" aria-label="더보기" data-id="${post.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
            </svg>
          </button>
        </div>
        <p class="post-text">${escapeHtml(post.text).replace(/\n/g, "<br>")}</p>
        ${imageHtml}
        <div class="post-actions">
          <button class="action-btn reply-btn" data-id="${post.id}" aria-label="답글">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            ${formatCount(post.replies)}
          </button>
          <button class="action-btn repost-btn ${post.reposted ? "reposted" : ""}" data-id="${post.id}" aria-label="리포스트">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            ${formatCount(post.reposts)}
          </button>
          <button class="action-btn like-btn ${post.liked ? "liked" : ""}" data-id="${post.id}" aria-label="좋아요">
            <svg viewBox="0 0 24 24" fill="${post.liked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            ${formatCount(post.likes)}
          </button>
          <button class="action-btn share-btn" data-id="${post.id}" aria-label="공유">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderFeed() {
  if (posts.length === 0) {
    feed.innerHTML = `<div class="feed-empty">표시할 게시글이 없습니다.<br>npm run seed 로 데이터를 넣어 주세요.</div>`;
    return;
  }
  feed.innerHTML = posts.map((post, i) => renderPost(post, i)).join("");
}

function showLoading() {
  feed.innerHTML = `<div class="feed-loading">피드 불러오는 중…</div>`;
}

function showError(msg) {
  feed.innerHTML = `<div class="feed-error">${escapeHtml(msg)}<br><button type="button" class="retry-btn" id="retryBtn">다시 시도</button></div>`;
  document.getElementById("retryBtn")?.addEventListener("click", loadPosts);
}

function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.hidden = true;
  }, 2500);
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

async function loadPosts() {
  showLoading();
  try {
    posts = await api("/posts");
    renderFeed();
  } catch (err) {
    console.error(err);
    const isFile = location.protocol === "file:";
    let hint = "터미널에서 <b>npm start</b> 실행 후, 이 페이지를 새로고침하세요.";
    if (isFile) {
      hint = "index.html 직접 열기(X) → test_project 폴더에서 npm start → 브라우저로 접속";
    }
    showError(`피드를 불러오지 못했습니다.<br><small>${hint}</small>`);
  }
}

function updatePostInList(updated) {
  const i = posts.findIndex((p) => p.id === updated.id);
  if (i !== -1) posts[i] = updated;
  renderFeed();
}

function openCompose() {
  composeModal.hidden = false;
  composeText.value = "";
  postBtn.disabled = true;
  setTimeout(() => composeText.focus(), 300);
}

function closeCompose() {
  composeModal.hidden = true;
  composeText.value = "";
}

function openMenu(menu, x, y, postId) {
  closeAllMenus();
  activeMenu = menu;
  if (postId !== undefined) menu.dataset.postId = postId;

  menu.hidden = false;
  menu.style.visibility = "hidden";

  const rect = menu.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 8;
  const maxY = window.innerHeight - rect.height - 8;

  menu.style.left = Math.min(Math.max(8, x), maxX) + "px";
  menu.style.top = Math.min(Math.max(8, y), maxY) + "px";
  menu.style.visibility = "";
}

function closeAllMenus() {
  mainMenu.hidden = true;
  postMenu.hidden = true;
  activeMenu = null;
}

function applyTheme(theme) {
  const valid = ["default", "dark", "light"];
  const next = valid.includes(theme) ? theme : "default";

  document.documentElement.dataset.theme = next;
  localStorage.setItem("feed-theme", next);

  document.getElementById("themeColorMeta").content =
    getComputedStyle(document.documentElement).getPropertyValue("--theme-color").trim() || "#1a1a2e";

  mainMenu.querySelectorAll(".theme-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.theme === next);
  });
}

function initTheme() {
  applyTheme(localStorage.getItem("feed-theme") || "default");
}

feed.addEventListener("click", async (e) => {
  const target = e.target.closest("button");
  if (!target) return;

  const id = target.dataset.id;
  if (!id) return;

  const post = posts.find((p) => p.id === id);
  if (!post) return;

  if (target.classList.contains("like-btn")) {
    e.stopPropagation();
    try {
      const updated = await api(`/posts/${id}/like`, { method: "PATCH" });
      updatePostInList(updated);
    } catch {
      showToast("좋아요 처리 실패");
    }
    return;
  }

  if (target.classList.contains("repost-btn")) {
    e.stopPropagation();
    try {
      const updated = await api(`/posts/${id}/repost`, { method: "PATCH" });
      updatePostInList(updated);
    } catch {
      showToast("리포스트 처리 실패");
    }
    return;
  }

  if (target.classList.contains("reply-btn")) {
    e.stopPropagation();
    showToast("답글 기능은 준비 중입니다");
    return;
  }

  if (target.classList.contains("share-btn")) {
    e.stopPropagation();
    showToast("공유 링크가 복사되었습니다");
    return;
  }

  if (target.classList.contains("post-more")) {
    e.stopPropagation();
    const rect = target.getBoundingClientRect();
    openMenu(postMenu, rect.left - 160, rect.bottom + 4, id);
  }
});

document.getElementById("modalClose").addEventListener("click", closeCompose);

composeModal.addEventListener("click", (e) => {
  if (e.target === composeModal) closeCompose();
});

composeText.addEventListener("input", () => {
  postBtn.disabled = composeText.value.trim().length === 0;
});

postBtn.addEventListener("click", async () => {
  const text = composeText.value.trim();
  if (!text) return;

  postBtn.disabled = true;
  try {
    const created = await api("/posts", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    posts.unshift(created);
    closeCompose();
    renderFeed();
    feed.scrollTo({ top: 0, behavior: "smooth" });
    showToast("게시되었습니다!");
  } catch {
    showToast("게시 실패");
  } finally {
    postBtn.disabled = composeText.value.trim().length === 0;
  }
});

mainMenu.addEventListener("click", (e) => {
  const item = e.target.closest(".theme-item");
  if (!item) return;

  applyTheme(item.dataset.theme);
  closeAllMenus();
  showToast(`${THEMES[item.dataset.theme]} 테마 적용`);
});

postMenu.addEventListener("click", (e) => {
  const item = e.target.closest(".menu-item");
  if (!item) return;

  const action = item.dataset.action;
  if (action === "copy") showToast("링크가 복사되었습니다");
  if (action === "share") showToast("공유하기");
  if (action === "report") showToast("신고가 접수되었습니다");
  closeAllMenus();
});

document.addEventListener("click", (e) => {
  if (activeMenu && !activeMenu.contains(e.target) && !e.target.closest("#menuBtn")) {
    closeAllMenus();
  }
});

document.getElementById("menuBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  const rect = e.currentTarget.getBoundingClientRect();
  openMenu(mainMenu, rect.left, rect.bottom + 8);
});

window.addEventListener("resize", closeAllMenus);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", closeAllMenus);
}

initTheme();
loadPosts();
