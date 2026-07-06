(function shonodeCloudSync() {
  const CLOUD_PROJECT_ID_STORAGE_KEY = "shonode-cloud-project-id-v1";
  const FREE_PLAN_PROJECT_LIMIT = 3;

  let dialogEl = null;
  let cloudButtonEl = null;
  let busy = false;

  init();

  async function init() {
    const enabled = await window.ShonodeCloud?.ready;
    if (!enabled) {
      return;
    }

    mountHeaderButton();
    window.ShonodeCloud.onAuthChange(() => {
      refreshCloudButtonLabel();
      if (dialogEl) {
        renderDialog();
      }
    });
    refreshCloudButtonLabel();
  }

  function mountHeaderButton() {
    const actionRow = document.querySelector(".action-row");
    if (!actionRow || document.getElementById("cloudWorkspaceButton")) {
      return;
    }

    cloudButtonEl = document.createElement("button");
    cloudButtonEl.id = "cloudWorkspaceButton";
    cloudButtonEl.type = "button";
    cloudButtonEl.className = "secondary-button cloud-workspace-button";
    cloudButtonEl.textContent = "클라우드";
    cloudButtonEl.addEventListener("click", openDialog);
    actionRow.insertBefore(cloudButtonEl, actionRow.firstElementChild);
  }

  function refreshCloudButtonLabel() {
    if (!cloudButtonEl) {
      return;
    }
    const user = window.ShonodeCloud.getUser();
    cloudButtonEl.textContent = user ? "클라우드 ●" : "클라우드";
    cloudButtonEl.title = user ? `로그인됨: ${user.email || user.id}` : "클라우드 로그인 / 프로젝트";
  }

  function openDialog() {
    if (dialogEl) {
      dialogEl.remove();
    }

    dialogEl = document.createElement("div");
    dialogEl.className = "cloud-dialog-backdrop";
    dialogEl.addEventListener("click", (event) => {
      if (event.target === dialogEl) {
        closeDialog();
      }
    });
    document.body.appendChild(dialogEl);
    renderDialog();
  }

  function closeDialog() {
    dialogEl?.remove();
    dialogEl = null;
  }

  async function renderDialog() {
    if (!dialogEl) {
      return;
    }

    const user = window.ShonodeCloud.getUser();
    dialogEl.innerHTML = "";

    const card = document.createElement("section");
    card.className = "cloud-dialog-card";
    dialogEl.appendChild(card);

    if (!user) {
      renderLoginView(card);
      return;
    }

    await renderProjectsView(card, user);
  }

  function renderLoginView(card) {
    card.innerHTML = `
      <header class="cloud-dialog-header">
        <h2>클라우드 로그인</h2>
        <button type="button" class="cloud-dialog-close" aria-label="닫기">×</button>
      </header>
      <p class="cloud-dialog-note">로그인하면 프로젝트를 클라우드에 저장하고 어디서든 이어서 작업할 수 있습니다.</p>
      <form class="cloud-login-form">
        <label>이메일<input type="email" name="email" autocomplete="email" required></label>
        <label>비밀번호<input type="password" name="password" autocomplete="current-password" minlength="6" required></label>
        <p class="cloud-dialog-error" hidden></p>
        <div class="cloud-dialog-actions">
          <button type="submit" class="primary-button" data-action="signin">로그인</button>
          <button type="button" class="secondary-button" data-action="signup">회원가입</button>
        </div>
      </form>
      <button type="button" class="secondary-button cloud-google-button">Google로 계속하기</button>
    `;

    card.querySelector(".cloud-dialog-close").addEventListener("click", closeDialog);
    const form = card.querySelector(".cloud-login-form");
    const errorEl = card.querySelector(".cloud-dialog-error");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await handleAuthAction("signin", form, errorEl);
    });
    card.querySelector('[data-action="signup"]').addEventListener("click", async () => {
      await handleAuthAction("signup", form, errorEl);
    });
    card.querySelector(".cloud-google-button").addEventListener("click", async () => {
      try {
        await window.ShonodeCloud.signInWithGoogle();
      } catch (error) {
        showError(errorEl, error);
      }
    });
  }

  async function handleAuthAction(action, form, errorEl) {
    if (busy) {
      return;
    }
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    if (!email || !password) {
      return;
    }

    busy = true;
    errorEl.hidden = true;
    try {
      if (action === "signup") {
        const result = await window.ShonodeCloud.signUpWithPassword(email, password);
        if (!result.session) {
          errorEl.textContent = "확인 메일을 보냈습니다. 메일함에서 인증 후 로그인해주세요.";
          errorEl.hidden = false;
          return;
        }
      } else {
        await window.ShonodeCloud.signInWithPassword(email, password);
      }
      renderDialog();
    } catch (error) {
      showError(errorEl, error);
    } finally {
      busy = false;
    }
  }

  function showError(errorEl, error) {
    errorEl.textContent = error?.message || "요청에 실패했습니다. 잠시 후 다시 시도해주세요.";
    errorEl.hidden = false;
  }

  async function renderProjectsView(card, user) {
    card.innerHTML = `
      <header class="cloud-dialog-header">
        <h2>클라우드 프로젝트</h2>
        <button type="button" class="cloud-dialog-close" aria-label="닫기">×</button>
      </header>
      <p class="cloud-dialog-note">${escapeText(user.email || user.id)} 계정</p>
      <p class="cloud-dialog-error" hidden></p>
      <div class="cloud-dialog-actions">
        <button type="button" class="primary-button" data-action="save">현재 작업 저장</button>
        <button type="button" class="secondary-button" data-action="save-new">새 프로젝트로 저장</button>
        <button type="button" class="ghost-button" data-action="signout">로그아웃</button>
      </div>
      <ul class="cloud-project-list"><li class="cloud-project-empty">불러오는 중…</li></ul>
    `;

    card.querySelector(".cloud-dialog-close").addEventListener("click", closeDialog);
    const errorEl = card.querySelector(".cloud-dialog-error");
    const listEl = card.querySelector(".cloud-project-list");

    card.querySelector('[data-action="signout"]').addEventListener("click", async () => {
      try {
        await window.ShonodeCloud.signOut();
        window.localStorage.removeItem(CLOUD_PROJECT_ID_STORAGE_KEY);
        renderDialog();
      } catch (error) {
        showError(errorEl, error);
      }
    });
    card.querySelector('[data-action="save"]').addEventListener("click", async () => {
      await saveCurrentWorkspace({ asNew: false, errorEl, listEl, user });
    });
    card.querySelector('[data-action="save-new"]').addEventListener("click", async () => {
      await saveCurrentWorkspace({ asNew: true, errorEl, listEl, user });
    });

    await refreshProjectList(listEl, errorEl);
  }

  async function refreshProjectList(listEl, errorEl) {
    try {
      const client = window.ShonodeCloud.getClient();
      const { data, error } = await client
        .from("projects")
        .select("id, title, snapshot_version, updated_at")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) {
        throw error;
      }

      listEl.innerHTML = "";
      if (!data || data.length === 0) {
        listEl.innerHTML = '<li class="cloud-project-empty">저장된 프로젝트가 없습니다.</li>';
        return;
      }

      const activeId = window.localStorage.getItem(CLOUD_PROJECT_ID_STORAGE_KEY) || "";
      data.forEach((row) => {
        const item = document.createElement("li");
        item.className = "cloud-project-item" + (row.id === activeId ? " is-active" : "");
        item.innerHTML = `
          <div class="cloud-project-meta">
            <strong>${escapeText(row.title || "제목 없음")}</strong>
            <span>${formatDate(row.updated_at)}${row.id === activeId ? " · 연결됨" : ""}</span>
          </div>
          <div class="cloud-project-actions">
            <button type="button" class="secondary-button" data-load>불러오기</button>
            <button type="button" class="ghost-button" data-delete aria-label="삭제">삭제</button>
          </div>
        `;
        item.querySelector("[data-load]").addEventListener("click", async () => {
          await loadCloudProject(row.id, errorEl);
        });
        item.querySelector("[data-delete]").addEventListener("click", async () => {
          await deleteCloudProject(row.id, listEl, errorEl);
        });
        listEl.appendChild(item);
      });
    } catch (error) {
      showError(errorEl, error);
    }
  }

  async function saveCurrentWorkspace({ asNew, errorEl, listEl, user }) {
    if (busy) {
      return;
    }
    busy = true;
    errorEl.hidden = true;
    try {
      const bridge = window.ShonodeWorkspaceBridge;
      if (!bridge?.createSnapshot) {
        throw new Error("워크스페이스 스냅샷을 만들 수 없습니다.");
      }

      await window.ShonodePanelImageStorage?.ready?.();
      await window.ShonodePanelImageStorage?.flush?.();
      const snapshot = bridge.createSnapshot();
      const title = snapshot?.project?.title || "새 프로젝트";
      const client = window.ShonodeCloud.getClient();
      const existingId = asNew ? "" : window.localStorage.getItem(CLOUD_PROJECT_ID_STORAGE_KEY) || "";

      if (existingId) {
        const { error } = await client
          .from("projects")
          .update({ title, snapshot, snapshot_version: snapshot.version })
          .eq("id", existingId);
        if (error) {
          throw error;
        }
      } else {
        const { count, error: countError } = await client
          .from("projects")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null);
        if (countError) {
          throw countError;
        }
        if ((count ?? 0) >= FREE_PLAN_PROJECT_LIMIT) {
          throw new Error(`무료 플랜은 클라우드 프로젝트 ${FREE_PLAN_PROJECT_LIMIT}개까지 저장할 수 있습니다. 기존 프로젝트를 삭제하거나 덮어써 주세요.`);
        }

        const { data, error } = await client
          .from("projects")
          .insert({ owner_id: user.id, title, snapshot, snapshot_version: snapshot.version })
          .select("id")
          .single();
        if (error) {
          throw error;
        }
        window.localStorage.setItem(CLOUD_PROJECT_ID_STORAGE_KEY, data.id);
      }

      await refreshProjectList(listEl, errorEl);
      errorEl.textContent = "클라우드에 저장했습니다.";
      errorEl.hidden = false;
    } catch (error) {
      showError(errorEl, error);
    } finally {
      busy = false;
    }
  }

  async function loadCloudProject(projectId, errorEl) {
    if (busy) {
      return;
    }
    busy = true;
    try {
      const client = window.ShonodeCloud.getClient();
      const { data, error } = await client
        .from("projects")
        .select("id, snapshot")
        .eq("id", projectId)
        .single();
      if (error) {
        throw error;
      }
      if (!data?.snapshot || typeof data.snapshot !== "object") {
        throw new Error("스냅샷이 비어 있습니다.");
      }

      await window.ShonodeWorkspaceBridge.importWorkspace(data.snapshot);
      window.localStorage.setItem(CLOUD_PROJECT_ID_STORAGE_KEY, data.id);
      closeDialog();
    } catch (error) {
      showError(errorEl, error);
    } finally {
      busy = false;
    }
  }

  async function deleteCloudProject(projectId, listEl, errorEl) {
    if (busy) {
      return;
    }
    busy = true;
    try {
      const client = window.ShonodeCloud.getClient();
      const { error } = await client
        .from("projects")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", projectId);
      if (error) {
        throw error;
      }
      if (window.localStorage.getItem(CLOUD_PROJECT_ID_STORAGE_KEY) === projectId) {
        window.localStorage.removeItem(CLOUD_PROJECT_ID_STORAGE_KEY);
      }
      await refreshProjectList(listEl, errorEl);
    } catch (error) {
      showError(errorEl, error);
    } finally {
      busy = false;
    }
  }

  function formatDate(value) {
    try {
      return new Date(value).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return "";
    }
  }

  function escapeText(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
