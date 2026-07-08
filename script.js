const STORAGE_KEY = "shotboard-layout-v3";
const LEGACY_STORAGE_KEYS = ["shotboard-layout-v2", "storyboard-layout-v1"];
const PROJECT_STORAGE_KEY = "shotboard-project-v1";
const VIEW_STORAGE_KEY = "shotboard-view-v1";
const HEADER_STORAGE_KEY = "shotboard-header-collapsed";
const SIDEBAR_STORAGE_KEY = "shotboard-sidebar-collapsed";
const PANEL_IMAGE_DB_NAME = "shonode-panel-image-db-v1";
const PANEL_IMAGE_DB_STORE_NAME = "panel-images";
const PANEL_IMAGE_DB_RECORD_KEY = "workspace-panels";
const PANEL_VIDEO_DB_NAME = "shonode-panel-video-db-v1";
const PANEL_VIDEO_DB_STORE_NAME = "panel-videos";

const DEFAULT_PANEL_COUNT = 6;
const HISTORY_LIMIT = 80;
const DEFAULT_CANVAS_WIDTH = 2800;
const DEFAULT_CANVAS_HEIGHT = 1800;
const PANEL_WIDTH = 360;
const PANEL_MARGIN = 48;
const PANEL_SAFE_TOP = 132;
const PANEL_GAP_X = 400;
const PANEL_GAP_Y = 470;
const NEW_PANEL_OFFSET = 42;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;

const workspaceHeader = document.getElementById("workspaceHeader");
const projectSidebar = document.getElementById("projectSidebar");
const board = document.getElementById("board");
const boardSizer = document.getElementById("boardSizer");
const canvasViewport = document.getElementById("canvasViewport");
const panelTemplate = document.getElementById("panelTemplate");

const addPanelButton = document.getElementById("addPanelButton");
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const duplicateSelectionButton = document.getElementById("duplicateSelectionButton");
const regenerateSelectionButton = document.getElementById("regenerateSelectionButton");
const deleteSelectionButton = document.getElementById("deleteSelectionButton");
const clearSelectionButton = document.getElementById("clearSelectionButton");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const fitCanvasButton = document.getElementById("fitCanvasButton");
const importWorkspaceButton = document.getElementById("importWorkspaceButton");
const exportWorkspaceButton = document.getElementById("exportWorkspaceButton");
const importWorkspaceInput = document.getElementById("importWorkspaceInput");
const saveWorkspaceButton = document.getElementById("saveWorkspaceButton");
const saveWorkspaceLabel = document.getElementById("saveWorkspaceLabel");
const homeButton = document.getElementById("homeButton");
const toggleHeaderButton = document.getElementById("toggleHeaderButton");
const toggleHeaderLabel = document.getElementById("toggleHeaderLabel");
const toggleSidebarButton = document.getElementById("toggleSidebarButton");
const toggleSidebarLabel = document.getElementById("toggleSidebarLabel");
const clearBoardButton = document.getElementById("clearBoardButton");

const panelCount = document.getElementById("panelCount");
const selectionCountChip = document.getElementById("selectionCountChip");
const zoomPercentage = document.getElementById("zoomPercentage");
const statusMessage = document.getElementById("statusMessage");
const projectTitleInput = document.getElementById("projectTitleInput");
const projectSequenceInput = document.getElementById("projectSequenceInput");
const projectRuntimeInput = document.getElementById("projectRuntimeInput");
const projectToneInput = document.getElementById("projectToneInput");
const projectAspectRatioInput = document.getElementById("projectAspectRatioInput");
const projectLoglineInput = document.getElementById("projectLoglineInput");
const projectNotesInput = document.getElementById("projectNotesInput");
const projectCheckReferences = document.getElementById("projectCheckReferences");
const projectCheckShotFlow = document.getElementById("projectCheckShotFlow");
const projectCheckCharacterArc = document.getElementById("projectCheckCharacterArc");
const projectCheckArtDirection = document.getElementById("projectCheckArtDirection");
const projectCheckSoundCue = document.getElementById("projectCheckSoundCue");
const mobileUndoFab = document.getElementById("mobileUndoFab");
const mobileRedoFab = document.getElementById("mobileRedoFab");
const editBar = document.getElementById("editBar");
const editBarToggle = document.getElementById("editBarToggle");
const editBarContent = document.getElementById("editBarContent");
const editTotalDuration = document.getElementById("editTotalDuration");
const timelineScrollArea = document.getElementById("timelineScrollArea");
const timelineInnerEl = document.getElementById("timelineInner");
const timelineRulerEl = document.getElementById("timelineRuler");
const timelineTrackLane = document.getElementById("timelineTrackLane");
const timelinePlayheadEl = document.getElementById("timelinePlayhead");
const timelineTimecodeEl = document.getElementById("timelineTimecode");
const timelineZoomInBtn = document.getElementById("timelineZoomIn");
const timelineZoomOutBtn = document.getElementById("timelineZoomOut");
const timelinePlayButton = document.getElementById("timelinePlayButton");
const listViewButton = document.getElementById("listViewButton");
const beatLaneButton = document.getElementById("beatLaneButton");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileDrawer = document.getElementById("mobileDrawer");
const mobileDrawerSaveLabel = document.getElementById("mobileDrawerSaveLabel");
const mobileTabBar = document.getElementById("mobileTabBar");
const tabAddPanel = document.getElementById("tabAddPanel");
const tabAI = document.getElementById("tabAI");
const tabTimeline = document.getElementById("tabTimeline");
const tabUndo = document.getElementById("tabUndo");
const tabMore = document.getElementById("tabMore");
const mobileImportButton = document.getElementById("mobileImportButton");
const mobileExportButton = document.getElementById("mobileExportButton");
const mobileSaveButton = document.getElementById("mobileSaveButton");
const mobileCanvasViewButton = document.getElementById("mobileCanvasViewButton");
const confirmDialog = document.getElementById("confirmDialog");
const confirmDialogBackdrop = document.getElementById("confirmDialogBackdrop");
const confirmDialogEyebrow = document.getElementById("confirmDialogEyebrow");
const confirmDialogTitle = document.getElementById("confirmDialogTitle");
const confirmDialogDescription = document.getElementById("confirmDialogDescription");
const confirmDialogCancel = document.getElementById("confirmDialogCancel");
const confirmDialogConfirm = document.getElementById("confirmDialogConfirm");
const SAVE_BUTTON_IDLE_LABEL = "로컬 저장";
const SAVE_BUTTON_SUCCESS_LABEL = "로컬 저장됨";
const SAVE_BUTTON_FAILURE_LABEL = "저장 실패";
const NARROW_HOME_ZOOM = 0.82;
const MOBILE_HOME_MEDIA_QUERY = window.matchMedia("(max-width: 760px)");

let panels = loadPanels();
let project = loadProject();
let selectedPanelIds = new Set();
let headerCollapsed = loadHeaderCollapsed();
let sidebarCollapsed = loadSidebarCollapsed();
let statusTimeoutId = null;
let dragState = null;
let panState = null;
let spacePressed = false;
let canvasWidth = DEFAULT_CANVAS_WIDTH;
let canvasHeight = DEFAULT_CANVAS_HEIGHT;
let metricsFrameId = null;
let viewSaveTimeoutId = null;
let undoStack = [];
let redoStack = [];
let activeHistoryGroups = new Set();
let saveButtonTimeoutId = null;
let confirmDialogResolver = null;
let confirmDialogLastActiveElement = null;
let panelImageStoragePromise = null;
let panelImagePersistPromise = Promise.resolve();
let panelImagePersistFingerprint = "";
let canvasPointers = new Map(); // touch pointers tracked on canvas
let pinchState = null;
let editBarOpen = false;
let timelineScale = 80; // px per second
let playheadTimeSec = 0;
let timelineClipDragState = null;
let timelineResizeDragState = null;
let panelVideoBlobUrls = new Map(); // panelId → object URL
let panelVideoStoragePromise = null;
let isPlaying = false;
let playheadRafId = null;
let lastPlayTimestamp = null;
let isListMode = false;
let isBeatLaneMode = false;
let isDrawerOpen = false;
let expandedPanelIds = new Set();

const savedView = loadViewState();
let zoom = clamp(savedView.zoom ?? 1, MIN_ZOOM, MAX_ZOOM);
let pendingInitialScroll = {
  left: savedView.scrollLeft ?? 0,
  top: savedView.scrollTop ?? 0
};

board.style.transform = `scale(${zoom})`;
applyHeaderState(false);
applySidebarState(false);
updateZoomUI();
renderProjectSidebar();
updateHistoryUI();
renderPanels({ restoreView: true });
initializePanelImageStorage();

window.ShonodePanelImageStorage = {
  ready: initializePanelImageStorage,
  flush: flushPanelImagePersistence
};

initializePanelVideoStorage();

// Auto-enable list mode on mobile
if (MOBILE_HOME_MEDIA_QUERY.matches) {
  enableListMode(false);
}

listViewButton?.addEventListener("click", () => {
  if (isListMode) disableListMode(); else enableListMode();
});

beatLaneButton?.addEventListener("click", () => {
  if (isBeatLaneMode) disableBeatLaneMode(); else enableBeatLaneMode();
});

MOBILE_HOME_MEDIA_QUERY.addEventListener("change", (e) => {
  if (!e.matches && isListMode) disableListMode();
  if (e.matches && !isListMode) enableListMode(false);
});

// ── Mobile drawer ──────────────────────────────────────────────────────────
mobileMenuButton?.addEventListener("click", () => toggleMobileDrawer());
tabMore?.addEventListener("click", () => toggleMobileDrawer());

mobileImportButton?.addEventListener("click", () => {
  closeMobileDrawer();
  importWorkspaceButton?.click();
});

mobileExportButton?.addEventListener("click", () => {
  closeMobileDrawer();
  exportWorkspaceButton?.click();
});

mobileSaveButton?.addEventListener("click", () => {
  closeMobileDrawer();
  saveWorkspaceButton?.click();
});

mobileCanvasViewButton?.addEventListener("click", () => {
  closeMobileDrawer();
  if (isListMode) disableListMode(); else enableListMode();
});

// Close drawer on overlay click
document.addEventListener("pointerdown", (e) => {
  if (isDrawerOpen && !mobileDrawer?.contains(e.target) && e.target !== mobileMenuButton && e.target !== tabMore) {
    closeMobileDrawer();
  }
}, { capture: false });

// ── Tab bar ────────────────────────────────────────────────────────────────
tabAddPanel?.addEventListener("click", () => {
  addPanelButton?.click();
});

tabUndo?.addEventListener("click", () => {
  undoHistory();
});

tabTimeline?.addEventListener("click", () => {
  toggleEditBar();
  tabTimeline.classList.toggle("is-active", editBarOpen);
});

tabAI?.addEventListener("click", () => {
  // Trigger AI director sidebar (left rail)
  document.querySelector('.sidebar-rail-button[data-sidebar-target="ai"]')?.click();
});

syncSaveButtonIdleLabel();

addPanelButton.addEventListener("click", () => {
  pushHistoryState();
  const position = getSpawnPosition();
  const panel = createEmptyPanel({
    x: position.x,
    y: position.y,
    z: getNextZIndex()
  });

  panels.push(panel);
  setSelection([panel.id]);
  persistPanels();
  updateHistoryUI();
  renderPanels();
  focusPanel(panel.id);
  setStatus("새 컷을 추가했습니다.");
});

duplicateSelectionButton.addEventListener("click", () => {
  duplicatePanels(Array.from(selectedPanelIds));
});

undoButton.addEventListener("click", () => {
  undoHistory();
});

redoButton.addEventListener("click", () => {
  redoHistory();
});

mobileUndoFab?.addEventListener("click", () => {
  undoHistory();
});

mobileRedoFab?.addEventListener("click", () => {
  redoHistory();
});

editBarToggle.addEventListener("click", toggleEditBar);

editBar.querySelectorAll(".edit-bar-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    if (!editBarOpen) {
      openEditBar();
    }
  });
});

timelinePlayButton?.addEventListener("click", () => {
  if (isPlaying) {
    stopTimelinePlayback();
  } else {
    startTimelinePlayback();
  }
});

timelineZoomInBtn?.addEventListener("click", () => {
  timelineScale = Math.min(400, Math.round(timelineScale * 1.5));
  renderTimeline();
});

timelineZoomOutBtn?.addEventListener("click", () => {
  timelineScale = Math.max(20, Math.round(timelineScale / 1.5));
  renderTimeline();
});

timelineRulerEl?.addEventListener("mousedown", (e) => {
  const rect = timelineRulerEl.getBoundingClientRect();
  const setTime = (clientX) => {
    const x = clientX - rect.left + (timelineScrollArea?.scrollLeft ?? 0);
    playheadTimeSec = Math.max(0, x / timelineScale);
    updatePlayheadPosition();
  };
  setTime(e.clientX);
  const onMove = (mv) => setTime(mv.clientX);
  const onUp = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
});

deleteSelectionButton.addEventListener("click", async () => {
  const ids = Array.from(selectedPanelIds);
  if (ids.length === 0) {
    return;
  }

  const shouldDelete = await openConfirmDialog({
    tone: "danger",
    eyebrow: ids.length > 1 ? "선택 컷 삭제" : "컷 삭제",
    title: ids.length > 1 ? `${ids.length}개의 선택 컷을 삭제할까요?` : "선택한 컷을 삭제할까요?",
    description: "삭제한 컷과 프롬프트는 되돌리기 전까지 복구되지 않습니다.",
    confirmLabel: ids.length > 1 ? "선택 컷 삭제" : "컷 삭제"
  });

  if (!shouldDelete) {
    return;
  }

  deletePanels(ids);
});

clearSelectionButton.addEventListener("click", () => {
  clearSelection({ announce: true });
});

zoomInButton.addEventListener("click", () => {
  stepZoom(1.12);
});

zoomOutButton.addEventListener("click", () => {
  stepZoom(1 / 1.12);
});

fitCanvasButton.addEventListener("click", () => {
  fitCanvasToView();
});

homeButton?.addEventListener("click", () => {
  goToWorkspaceHome();
});

toggleHeaderButton?.addEventListener("click", () => {
  headerCollapsed = !headerCollapsed;
  persistHeaderCollapsed();
  applyHeaderState();
});

toggleSidebarButton?.addEventListener("click", () => {
  sidebarCollapsed = !sidebarCollapsed;
  persistSidebarCollapsed();
  applySidebarState();
});

saveWorkspaceButton?.addEventListener("click", () => {
  saveWorkspace();
});

importWorkspaceButton?.addEventListener("click", () => {
  importWorkspaceInput?.click();
});

exportWorkspaceButton?.addEventListener("click", async () => {
  await window.ShonodeWorkspaceBridge?.exportWorkspace?.();
});

clearBoardButton?.addEventListener("click", async () => {
  const shouldReset = window.confirm("현재 콘티 워크스페이스를 기본 상태로 초기화할까요?");
  if (!shouldReset) {
    return;
  }

  pushHistoryState();
  panels = createDefaultPanels();
  project = getDefaultProject();
  selectedPanelIds.clear();
  zoom = 1;
  pendingInitialScroll = { left: 0, top: 0 };
  persistPanels();
  persistProject();
  persistViewState();
  updateZoomUI();
  renderProjectSidebar();
  updateHistoryUI();
  renderPanels({ restoreView: true });
  setStatus("워크스페이스를 초기화했습니다.");
});

clearBoardButton?.addEventListener("click", async (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();

  const shouldReset = await openConfirmDialog({
    tone: "danger",
    eyebrow: "작업 초기화",
    title: "현재 워크스페이스를 초기화할까요?",
    description: "패널 배치, 프로젝트 정보, AI 초안, 선택 상태가 기본값으로 돌아갑니다.",
    confirmLabel: "초기화"
  });

  if (!shouldReset) {
    return;
  }

  pushHistoryState();
  panels = createDefaultPanels();
  project = getDefaultProject();
  selectedPanelIds.clear();
  zoom = 1;
  pendingInitialScroll = { left: 0, top: 0 };
  persistPanels();
  persistProject();
  persistViewState();
  updateZoomUI();
  renderProjectSidebar();
  updateHistoryUI();
  renderPanels({ restoreView: true });
  setStatus("워크스페이스를 초기화했습니다.");
}, { capture: true });

confirmDialogBackdrop?.addEventListener("click", () => closeConfirmDialog(false));
confirmDialogCancel?.addEventListener("click", () => closeConfirmDialog(false));
confirmDialogConfirm?.addEventListener("click", () => closeConfirmDialog(true));

function resetWorkspaceState() {
  pushHistoryState();
  panels = createDefaultPanels();
  project = getDefaultProject();
  selectedPanelIds.clear();
  zoom = 1;
  pendingInitialScroll = { left: 0, top: 0 };
  persistPanels();
  persistProject();
  persistViewState();
  updateZoomUI();
  renderProjectSidebar();
  updateHistoryUI();
  renderPanels({ restoreView: true });
  setStatus("?뚰겕?ㅽ럹?댁뒪瑜?珥덇린?뷀뻽?듬땲??");
}

initializeClearBoardButton();

function initializeClearBoardButton() {
  if (!clearBoardButton || !clearBoardButton.parentElement) {
    return;
  }

  const replacement = clearBoardButton.cloneNode(true);
  clearBoardButton.replaceWith(replacement);
  replacement.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const shouldReset = await openConfirmDialog({
      tone: "danger",
      eyebrow: "Reset Workspace",
      title: "Reset the current workspace?",
      description: "All cards, project info, AI drafts, and selection state will return to their defaults.",
      confirmLabel: "Reset"
    });

    if (!shouldReset) {
      return;
    }

    resetWorkspaceState();
  }, { capture: true });
}

board?.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest(".delete-panel-button");
  if (!deleteButton) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  const card = deleteButton.closest(".story-card");
  const panelId = card?.dataset?.panelId;
  if (!panelId) {
    return;
  }

  const ids =
    selectedPanelIds.size > 1 && selectedPanelIds.has(panelId)
      ? Array.from(selectedPanelIds)
      : [panelId];

  const shouldDelete = await openConfirmDialog({
    tone: "danger",
    eyebrow: ids.length > 1 ? "선택 컷 삭제" : "컷 삭제",
    title: ids.length > 1 ? `${ids.length}개의 컷을 삭제할까요?` : "이 컷을 삭제할까요?",
    description: "삭제된 컷과 프롬프트, 연결 정보는 되돌리기 전까지 복구되지 않습니다.",
    confirmLabel: ids.length > 1 ? "선택 컷 삭제" : "컷 삭제"
  });

  if (!shouldDelete) {
    return;
  }

  deletePanels(ids);
}, { capture: true });

canvasViewport.addEventListener("wheel", handleViewportWheel, { passive: false });
canvasViewport.addEventListener("pointerdown", handlePinchDown, { capture: true });
canvasViewport.addEventListener("pointerdown", handleViewportPointerDown);
canvasViewport.addEventListener("scroll", scheduleViewStateSave, { passive: true });
board.addEventListener("pointerdown", handleBoardPointerDown);
window.addEventListener("pointermove", handlePinchMove, { capture: true, passive: false });
window.addEventListener("pointerup", handlePinchUp, { capture: true });
window.addEventListener("pointercancel", handlePinchUp, { capture: true });

window.addEventListener("resize", () => {
  scheduleCanvasMetricsUpdate();
});

window.addEventListener("keydown", handleGlobalKeyDown);
window.addEventListener("keyup", handleGlobalKeyUp);

bindProjectField(projectTitleInput, "title");
bindProjectField(projectSequenceInput, "sequence");
bindProjectField(projectRuntimeInput, "runtime");
bindProjectField(projectToneInput, "tone");
bindProjectField(projectLoglineInput, "logline");
bindProjectField(projectNotesInput, "notes");

projectAspectRatioInput.addEventListener("change", () => {
  if (project.aspectRatio === projectAspectRatioInput.value) {
    return;
  }

  pushHistoryState();
  updateProject({ aspectRatio: projectAspectRatioInput.value }, { announce: false });
  updateHistoryUI();
});

bindProjectCheckbox(projectCheckReferences, "references");
bindProjectCheckbox(projectCheckShotFlow, "shotFlow");
bindProjectCheckbox(projectCheckCharacterArc, "characterArc");
bindProjectCheckbox(projectCheckArtDirection, "artDirection");
bindProjectCheckbox(projectCheckSoundCue, "soundCue");

function createEmptyPanel(overrides = {}) {
  return {
    id: createId(),
    caption: "",
    image: "",
    fileName: "",
    x: PANEL_MARGIN,
    y: PANEL_SAFE_TOP,
    z: 1,
    ...overrides
  };
}

function createDefaultPanels() {
  return Array.from({ length: DEFAULT_PANEL_COUNT }, (_, index) => {
    const position = getDefaultPosition(index);

    return createEmptyPanel({
      x: position.x,
      y: position.y,
      z: index + 1
    });
  });
}

function getDefaultPosition(index) {
  const columns = 4;
  const row = Math.floor(index / columns);
  const column = index % columns;

  return {
    x: PANEL_MARGIN + column * PANEL_GAP_X,
    y: PANEL_SAFE_TOP + row * PANEL_GAP_Y
  };
}

function getSpawnPosition() {
  const viewportX = canvasViewport.scrollLeft / zoom;
  const viewportY = canvasViewport.scrollTop / zoom;

  return {
    x: clamp(viewportX + PANEL_MARGIN, PANEL_MARGIN, Math.max(PANEL_MARGIN, canvasWidth - PANEL_WIDTH - PANEL_MARGIN)),
    y: clamp(Math.max(viewportY + PANEL_MARGIN, PANEL_SAFE_TOP), PANEL_SAFE_TOP, Math.max(PANEL_SAFE_TOP, canvasHeight - 220))
  };
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildPanelImageRecords(sourcePanels = panels) {
  return sourcePanels
    .filter((panel) => typeof panel?.image === "string" && panel.image)
    .map((panel) => ({
      id: panel.id,
      image: panel.image,
      fileName: typeof panel.fileName === "string" ? panel.fileName : ""
    }));
}

function getPanelImagePersistFingerprint(records) {
  return records
    .map((record) => [
      record.id,
      record.fileName || "",
      record.image.length,
      record.image.slice(0, 24),
      record.image.slice(-24)
    ].join(":"))
    .join("|");
}

function serializePanelsForStorage(sourcePanels = panels) {
  return sourcePanels.map((panel, index) => {
    const normalized = normalizePanel(panel, index);
    return {
      ...normalized,
      image: ""
    };
  });
}

function applyPanelImages(sourcePanels, imageRecords) {
  const imageMap = new Map(
    imageRecords
      .filter((record) => typeof record?.id === "string" && typeof record?.image === "string")
      .map((record) => [record.id, record])
  );

  return sourcePanels.map((panel, index) => {
    const storedImage = imageMap.get(panel.id);
    return normalizePanel({
      ...panel,
      image: storedImage?.image || panel.image || "",
      fileName: panel.fileName || storedImage?.fileName || ""
    }, index);
  });
}

function initializePanelImageStorage() {
  if (panelImageStoragePromise) {
    return panelImageStoragePromise;
  }

  panelImageStoragePromise = (async () => {
    const storedRecords = await loadPanelImagesFromIndexedDb();
    const legacyRecords = buildPanelImageRecords(panels);
    const mergedRecords = legacyRecords.length > 0 ? mergePanelImageRecords(storedRecords, legacyRecords) : storedRecords;
    const hydratedPanels = applyPanelImages(panels, mergedRecords);
    const shouldPersistLegacyMigration = legacyRecords.length > 0;
    const didHydrateFromDb = mergedRecords.length > 0 && hydratedPanels.some((panel, index) => panel.image !== (panels[index]?.image || ""));

    panels = hydratedPanels;
    panelImagePersistFingerprint = getPanelImagePersistFingerprint(buildPanelImageRecords(panels));

    if (shouldPersistLegacyMigration) {
      persistPanels();
    }

    if (didHydrateFromDb) {
      renderPanels({ restoreView: true });
    }
  })().catch((error) => {
    console.warn("Failed to initialize panel image storage.", error);
  });

  return panelImageStoragePromise;
}

function mergePanelImageRecords(existingRecords, incomingRecords) {
  const merged = new Map();

  existingRecords.forEach((record) => {
    if (record?.id) {
      merged.set(record.id, record);
    }
  });

  incomingRecords.forEach((record) => {
    if (record?.id) {
      merged.set(record.id, record);
    }
  });

  return Array.from(merged.values());
}

function openPanelImageDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = window.indexedDB.open(PANEL_IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PANEL_IMAGE_DB_STORE_NAME)) {
        database.createObjectStore(PANEL_IMAGE_DB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open panel image IndexedDB."));
  });
}

async function loadPanelImagesFromIndexedDb() {
  try {
    const database = await openPanelImageDb();
    const result = await new Promise((resolve, reject) => {
      const transaction = database.transaction(PANEL_IMAGE_DB_STORE_NAME, "readonly");
      const store = transaction.objectStore(PANEL_IMAGE_DB_STORE_NAME);
      const request = store.get(PANEL_IMAGE_DB_RECORD_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Failed to read panel images."));
    });
    database.close();

    if (!Array.isArray(result)) {
      return [];
    }

    return result.filter((record) => typeof record?.id === "string" && typeof record?.image === "string");
  } catch (error) {
    console.warn("Failed to load panel images from IndexedDB.", error);
    return [];
  }
}

async function savePanelImagesToIndexedDb(records) {
  const database = await openPanelImageDb();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(PANEL_IMAGE_DB_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PANEL_IMAGE_DB_STORE_NAME);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Failed to save panel images."));
    store.put(records, PANEL_IMAGE_DB_RECORD_KEY);
  });
  database.close();
}

function queuePanelImagePersistence() {
  const records = buildPanelImageRecords(panels);
  const nextFingerprint = getPanelImagePersistFingerprint(records);
  if (nextFingerprint === panelImagePersistFingerprint) {
    return panelImagePersistPromise;
  }

  const previousFingerprint = panelImagePersistFingerprint;
  panelImagePersistFingerprint = nextFingerprint;
  panelImagePersistPromise = panelImagePersistPromise
    .catch(() => undefined)
    .then(() => savePanelImagesToIndexedDb(records))
    .catch((error) => {
      panelImagePersistFingerprint = previousFingerprint;
      console.warn("Failed to persist panel images.", error);
      setStatus("패널 이미지를 저장하는 중 문제가 생겼습니다.", "warning");
    });

  return panelImagePersistPromise;
}

function flushPanelImagePersistence() {
  return queuePanelImagePersistence();
}

function loadPanels() {
  const sources = [window.localStorage.getItem(STORAGE_KEY)];

  LEGACY_STORAGE_KEYS.forEach((key) => {
    sources.push(window.localStorage.getItem(key));
  });

  const raw = sources.find(Boolean);
  if (!raw) {
    return createDefaultPanels();
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return createDefaultPanels();
    }

    return parsed.map((panel, index) => normalizePanel(panel, index));
  } catch {
    return createDefaultPanels();
  }
}

function normalizePanel(panel, index) {
  const fallback = getDefaultPosition(index);

  // Preserve fields this base normalizer does not know about (sceneTitle,
  // beat, prompts, reference ids, …). loadPanels() runs at script load time —
  // before shotboard-ai.js installs its richer normalizePanel override — so
  // dropping unknown fields here would permanently strip AI-generated data on
  // reload. The override re-validates every field afterwards, so passing them
  // through is safe.
  const source = panel && typeof panel === "object" ? panel : {};

  return {
    ...source,
    id: typeof panel.id === "string" ? panel.id : createId(),
    caption: typeof panel.caption === "string" ? panel.caption : "",
    image: typeof panel.image === "string" ? panel.image : "",
    fileName: typeof panel.fileName === "string" ? panel.fileName : "",
    x: Number.isFinite(panel.x) ? panel.x : fallback.x,
    y: Number.isFinite(panel.y) ? panel.y : fallback.y,
    z: Number.isFinite(panel.z) ? panel.z : index + 1
  };
}

function getDefaultProject() {
  return {
    title: "새 프로젝트",
    sequence: "Scene 01",
    runtime: "",
    tone: "",
    aspectRatio: "2.39:1",
    logline: "",
    notes: "",
    checklist: {
      references: false,
      shotFlow: false,
      characterArc: false,
      artDirection: false,
      soundCue: false
    }
  };
}

function normalizeProject(candidate) {
  const defaults = getDefaultProject();
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const checklist = source.checklist && typeof source.checklist === "object" ? source.checklist : {};

  return {
    title: typeof source.title === "string" && source.title.trim() ? source.title : defaults.title,
    sequence: typeof source.sequence === "string" ? source.sequence : defaults.sequence,
    runtime: typeof source.runtime === "string" ? source.runtime : defaults.runtime,
    tone: typeof source.tone === "string" ? source.tone : defaults.tone,
    aspectRatio: typeof source.aspectRatio === "string" && source.aspectRatio ? source.aspectRatio : defaults.aspectRatio,
    logline: typeof source.logline === "string" ? source.logline : defaults.logline,
    notes: typeof source.notes === "string" ? source.notes : defaults.notes,
    checklist: {
      references: Boolean(checklist.references),
      shotFlow: Boolean(checklist.shotFlow),
      characterArc: Boolean(checklist.characterArc),
      artDirection: Boolean(checklist.artDirection),
      soundCue: Boolean(checklist.soundCue)
    }
  };
}

function cloneProject(projectValue = project) {
  return {
    ...projectValue,
    checklist: {
      ...projectValue.checklist
    }
  };
}

function loadProject() {
  const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
  if (!raw) {
    return getDefaultProject();
  }

  try {
    return normalizeProject(JSON.parse(raw));
  } catch {
    return getDefaultProject();
  }
}

function persistProject() {
  try {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    updateDocumentTitle();
    return true;
  } catch {
    setStatus(
      "프로젝트 정보 저장 공간이 부족합니다. 이미지 용량을 줄인 뒤 다시 시도해 주세요.",
      "warning"
    );
    return false;
  }
}

function renderProjectSidebar() {
  projectTitleInput.value = project.title;
  projectSequenceInput.value = project.sequence;
  projectRuntimeInput.value = project.runtime;
  projectToneInput.value = project.tone;
  projectAspectRatioInput.value = project.aspectRatio;
  projectLoglineInput.value = project.logline;
  projectNotesInput.value = project.notes;
  if (projectCheckReferences) {
    projectCheckReferences.checked = project.checklist.references;
  }
  if (projectCheckShotFlow) {
    projectCheckShotFlow.checked = project.checklist.shotFlow;
  }
  if (projectCheckCharacterArc) {
    projectCheckCharacterArc.checked = project.checklist.characterArc;
  }
  if (projectCheckArtDirection) {
    projectCheckArtDirection.checked = project.checklist.artDirection;
  }
  if (projectCheckSoundCue) {
    projectCheckSoundCue.checked = project.checklist.soundCue;
  }
  updateDocumentTitle();
}

function updateDocumentTitle() {
  const title = project.title?.trim() || "새 프로젝트";
  document.title = `${title} | Shonode`;
}

function persistPanels() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializePanelsForStorage(panels)));
    queuePanelImagePersistence();
    return true;
  } catch {
    setStatus(
      "브라우저 저장 공간이 부족합니다. 큰 이미지는 새로고침 후 다시 넣어야 할 수 있어요.",
      "warning"
    );
    return false;
  }
}

function loadViewState() {
  const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      zoom: Number.isFinite(parsed.zoom) ? parsed.zoom : 1,
      scrollLeft: Number.isFinite(parsed.scrollLeft) ? parsed.scrollLeft : 0,
      scrollTop: Number.isFinite(parsed.scrollTop) ? parsed.scrollTop : 0
    };
  } catch {
    return {};
  }
}

function persistViewState() {
  window.localStorage.setItem(
    VIEW_STORAGE_KEY,
    JSON.stringify({
      zoom,
      scrollLeft: canvasViewport.scrollLeft,
      scrollTop: canvasViewport.scrollTop
    })
  );
}

function flashSaveButton(label) {
  if (!saveWorkspaceLabel) {
    return;
  }

  saveWorkspaceLabel.textContent = label;
  window.clearTimeout(saveButtonTimeoutId);
  saveButtonTimeoutId = window.setTimeout(() => {
    if (saveWorkspaceLabel) {
      saveWorkspaceLabel.textContent = SAVE_BUTTON_IDLE_LABEL;
    }
  }, 1600);
}

function syncSaveButtonIdleLabel() {
  if (!saveWorkspaceLabel) {
    return;
  }

  saveWorkspaceLabel.textContent = SAVE_BUTTON_IDLE_LABEL;
  saveWorkspaceButton?.setAttribute("aria-label", "로컬 저장");
  saveWorkspaceButton?.setAttribute("title", "브라우저에 즉시 저장");
  if (mobileDrawerSaveLabel) mobileDrawerSaveLabel.textContent = SAVE_BUTTON_IDLE_LABEL;
}

function saveWorkspace(options = {}) {
  const { announce = true } = options;
  const didSavePanels = persistPanels();
  const didSaveProject = persistProject();
  persistViewState();
  const didSave = didSavePanels && didSaveProject;

  if (didSave) {
    flashSaveButton(SAVE_BUTTON_SUCCESS_LABEL);
    if (announce) {
      setStatus("변경사항을 브라우저에 저장했습니다.");
    }
    return true;
  }

  flashSaveButton(SAVE_BUTTON_FAILURE_LABEL);
  return false;
}

function scheduleViewStateSave() {
  window.clearTimeout(viewSaveTimeoutId);
  viewSaveTimeoutId = window.setTimeout(() => {
    persistViewState();
  }, 120);
}

function loadHeaderCollapsed() {
  return window.localStorage.getItem(HEADER_STORAGE_KEY) === "true";
}

function persistHeaderCollapsed() {
  window.localStorage.setItem(HEADER_STORAGE_KEY, String(headerCollapsed));
}

function loadSidebarCollapsed() {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function persistSidebarCollapsed() {
  window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
}

function createHistorySnapshot() {
  return {
    panels: panels.map((panel, index) => normalizePanel(panel, index)),
    project: cloneProject(),
    selectedPanelIds: Array.from(selectedPanelIds)
  };
}

function pushHistoryState(snapshot = createHistorySnapshot()) {
  undoStack.push(snapshot);

  if (undoStack.length > HISTORY_LIMIT) {
    undoStack.shift();
  }

  redoStack = [];
  updateHistoryUI();
}

function updateHistoryUI() {
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  undoButton.disabled = !canUndo;
  redoButton.disabled = !canRedo;
  if (mobileUndoFab) mobileUndoFab.disabled = !canUndo;
  if (mobileRedoFab) mobileRedoFab.disabled = !canRedo;
  if (tabUndo) tabUndo.disabled = !canUndo;
  updateTimelineDurationLabel();
  maybeRefreshEditTimeline();
}

function restoreHistorySnapshot(snapshot) {
  panels = snapshot.panels.map((panel, index) => normalizePanel(panel, index));
  project = normalizeProject(snapshot.project);
  selectedPanelIds = new Set(
    snapshot.selectedPanelIds.filter((panelId) => panels.some((panel) => panel.id === panelId))
  );
  activeHistoryGroups.clear();

  persistPanels();
  persistProject();
  renderProjectSidebar();
  renderPanels();
}

function undoHistory() {
  if (undoStack.length === 0) {
    return;
  }

  const snapshot = undoStack.pop();
  redoStack.push(createHistorySnapshot());
  restoreHistorySnapshot(snapshot);
  updateHistoryUI();
  setStatus("이전 상태로 되돌렸습니다.");
}

function redoHistory() {
  if (redoStack.length === 0) {
    return;
  }

  const snapshot = redoStack.pop();
  undoStack.push(createHistorySnapshot());
  restoreHistorySnapshot(snapshot);
  updateHistoryUI();
  setStatus("다시 실행했습니다.");
}

function captureHistoryGroup(key) {
  if (activeHistoryGroups.has(key)) {
    return;
  }

  activeHistoryGroups.add(key);
  pushHistoryState();
  updateHistoryUI();
}

function releaseHistoryGroup(key) {
  activeHistoryGroups.delete(key);
}

function applyHeaderState(announce = true) {
  workspaceHeader.classList.toggle("is-collapsed", headerCollapsed);
  toggleHeaderButton?.setAttribute("aria-expanded", String(!headerCollapsed));
  if (toggleHeaderLabel) {
    toggleHeaderLabel.textContent = headerCollapsed ? "헤더 펼치기" : "헤더 접기";
  }

  if (announce) {
    setStatus(headerCollapsed ? "헤더를 접었습니다." : "헤더를 펼쳤습니다.");
  }
}

function applySidebarState(announce = true) {
  document.body.classList.toggle("is-sidebar-collapsed", sidebarCollapsed);
  projectSidebar?.setAttribute("data-collapsed", String(sidebarCollapsed));
  toggleSidebarButton?.setAttribute("aria-expanded", String(!sidebarCollapsed));
  toggleSidebarButton?.setAttribute("aria-label", sidebarCollapsed ? "사이드바 열기" : "사이드바 접기");
  if (toggleSidebarLabel) {
    toggleSidebarLabel.textContent = sidebarCollapsed ? "사이드바 열기" : "사이드바 접기";
  }

  if (announce) {
    setStatus(sidebarCollapsed ? "사이드바를 접었습니다." : "사이드바를 펼쳤습니다.");
  }
}

function renderPanels(options = {}) {
  board.innerHTML = "";
  if (panelCount) {
    panelCount.textContent = String(panels.length);
  }

  if (isBeatLaneMode) {
    renderBeatLanes();
    syncSelectionUI();
    scheduleCanvasMetricsUpdate(Boolean(options.restoreView));
    return;
  }

  const orderedPanels = isListMode
    ? [...panels].sort((a, b) => a.y - b.y || a.x - b.x)
    : panels;

  orderedPanels.forEach((panel, index) => {
    board.appendChild(createPanelElement(panel, index));
  });

  if (isListMode) applyCompactCards();
  syncSelectionUI();
  scheduleCanvasMetricsUpdate(Boolean(options.restoreView));
}

// Beat-lane layout: groups every card into one swimlane per six-beat contract
// step (hook → cta), plus a trailing "미지정" lane for unassigned cuts. Beat
// order/labels/colors come from window.ShonodeBeatMeta (set by shotboard-ai.js)
// so there is a single source of truth. Cards keep their beat via panel.beat;
// their absolute x/y are neutralized by CSS in beat-lane mode, so we do not
// mutate positions — toggling back to canvas restores the hand-placed layout.
function renderBeatLanes() {
  const beatMeta = (typeof window !== "undefined" && window.ShonodeBeatMeta) || { order: [], meta: {} };
  const order = Array.isArray(beatMeta.order) ? beatMeta.order : [];
  const meta = beatMeta.meta || {};

  const buckets = new Map();
  order.forEach((beat) => buckets.set(beat, []));
  const unassigned = [];
  panels.forEach((panel) => {
    if (buckets.has(panel.beat)) {
      buckets.get(panel.beat).push(panel);
    } else {
      unassigned.push(panel);
    }
  });

  const lanes = order.map((beat) => ({
    id: beat,
    label: meta[beat]?.label ?? beat,
    color: meta[beat]?.color ?? "#94a3b8",
    items: buckets.get(beat)
  }));
  if (unassigned.length > 0) {
    lanes.push({ id: "", label: "미지정", color: "#94a3b8", items: unassigned });
  }

  lanes.forEach((lane) => {
    const laneEl = document.createElement("div");
    laneEl.className = "beat-lane";
    laneEl.dataset.beat = lane.id;

    const header = document.createElement("div");
    header.className = "beat-lane-header";
    header.style.setProperty("--lane-color", lane.color);

    const dot = document.createElement("span");
    dot.className = "beat-lane-dot";
    const label = document.createElement("span");
    label.className = "beat-lane-label";
    label.textContent = lane.label;
    const count = document.createElement("span");
    count.className = "beat-lane-count";
    count.textContent = String(lane.items.length);
    header.append(dot, label, count);

    const track = document.createElement("div");
    track.className = "beat-lane-track";
    if (lane.items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "beat-lane-empty";
      empty.textContent = "이 비트의 컷이 아직 없습니다";
      track.appendChild(empty);
    } else {
      lane.items.forEach((panel) => {
        const index = panels.indexOf(panel);
        track.appendChild(createPanelElement(panel, index));
      });
    }

    laneEl.append(header, track);
    board.appendChild(laneEl);
  });
}

function isConfirmDialogOpen() {
  return Boolean(confirmDialog && !confirmDialog.hidden);
}

function closeConfirmDialog(result = false) {
  if (!confirmDialog || confirmDialog.hidden) {
    return;
  }

  confirmDialog.hidden = true;
  confirmDialog.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-confirm-open");

  const resolver = confirmDialogResolver;
  const returnFocusTarget = confirmDialogLastActiveElement;
  confirmDialogResolver = null;
  confirmDialogLastActiveElement = null;

  if (returnFocusTarget instanceof HTMLElement) {
    returnFocusTarget.focus();
  }

  resolver?.(result);
}

function openConfirmDialog(options = {}) {
  if (!confirmDialog || !confirmDialogTitle || !confirmDialogDescription || !confirmDialogConfirm) {
    return Promise.resolve(window.confirm(options.title || "계속할까요?"));
  }

  if (confirmDialogResolver) {
    closeConfirmDialog(false);
  }

  confirmDialogLastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  confirmDialog.hidden = false;
  confirmDialog.setAttribute("aria-hidden", "false");
  confirmDialog.dataset.tone = options.tone || "default";
  document.body.classList.add("is-confirm-open");

  if (confirmDialogEyebrow) {
    confirmDialogEyebrow.textContent = options.eyebrow || "확인";
  }
  confirmDialogTitle.textContent = options.title || "계속할까요?";
  confirmDialogDescription.textContent = options.description || "현재 작업을 기준으로 진행합니다.";
  confirmDialogConfirm.textContent = options.confirmLabel || "확인";

  return new Promise((resolve) => {
    confirmDialogResolver = resolve;
    window.setTimeout(() => {
      (confirmDialogCancel || confirmDialogConfirm)?.focus();
    }, 0);
  });
}

function bindProjectField(element, fieldName) {
  const historyKey = `project:${fieldName}`;

  element.addEventListener("input", () => {
    captureHistoryGroup(historyKey);
    updateProject({ [fieldName]: element.value }, { announce: false });
  });

  element.addEventListener("blur", () => {
    releaseHistoryGroup(historyKey);
  });
}

function bindProjectCheckbox(element, fieldName) {
  if (!element) {
    return;
  }

  element.addEventListener("change", () => {
    if (project.checklist[fieldName] === element.checked) {
      return;
    }

    pushHistoryState();
    updateProjectChecklist(fieldName, element.checked, { announce: false });
    updateHistoryUI();
  });
}

function updateProject(updates, options = {}) {
  const announce = options.announce ?? true;
  const changed = Object.entries(updates).some(([key, value]) => project[key] !== value);
  if (!changed) {
    return false;
  }

  project = {
    ...project,
    ...updates
  };

  persistProject();

  if (announce) {
    setStatus("프로젝트 정보를 저장했습니다.");
  }

  return true;
}

function updateProjectChecklist(fieldName, value, options = {}) {
  const announce = options.announce ?? true;
  if (project.checklist[fieldName] === value) {
    return false;
  }

  project = {
    ...project,
    checklist: {
      ...project.checklist,
      [fieldName]: value
    }
  };

  persistProject();

  if (announce) {
    setStatus("체크리스트를 업데이트했습니다.");
  }

  return true;
}

function createPanelElement(panel, index) {
  const fragment = panelTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".story-card");
  const title = fragment.querySelector(".panel-title");
  const handle = fragment.querySelector(".panel-handle");
  const imageClearButton = fragment.querySelector(".image-clear-button");
  const duplicatePanelButton = fragment.querySelector(".duplicate-panel-button");
  const deleteButton = fragment.querySelector(".delete-panel-button");
  const dropzone = fragment.querySelector(".dropzone");
  const fileInput = fragment.querySelector(".file-input");
  const previewImage = fragment.querySelector(".preview-image");
  const imageName = fragment.querySelector(".image-name");
  const captionInput = fragment.querySelector(".caption-input");

  card.dataset.panelId = panel.id;
  card.style.left = `${panel.x}px`;
  card.style.top = `${panel.y}px`;
  card.style.zIndex = String(panel.z);
  card.classList.toggle("is-selected", selectedPanelIds.has(panel.id));
  title.textContent = `컷 ${index + 1}`;
  captionInput.value = panel.caption;

  if (panel.image) {
    dropzone.classList.add("is-filled");
    previewImage.src = panel.image;
    previewImage.loading = "lazy";
    previewImage.decoding = "async";
    previewImage.hidden = false;
    previewImage.alt = `컷 ${index + 1} 콘티 이미지`;
  }

  if (panel.fileName) {
    imageName.textContent = panel.fileName;
    imageName.hidden = false;
  }

  // Compact thumb + chevron for list mode
  const thumbImg = document.createElement("img");
  thumbImg.className = "compact-thumb";
  thumbImg.alt = "";
  if (panel.image) thumbImg.src = panel.image;
  else thumbImg.hidden = !panel.image;

  const chevron = document.createElement("span");
  chevron.className = "compact-chevron";
  chevron.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9L12 15L18 9"></path></svg>`;

  handle.appendChild(thumbImg);
  handle.appendChild(chevron);

  // In list mode: tap card-header to expand/collapse
  handle.addEventListener("click", (e) => {
    if (!isListMode) return;
    if (e.target.closest("button")) return; // don't intercept button clicks
    toggleCardExpand(panel.id);
  });

  card.addEventListener("pointerdown", (event) => {
    if (spacePressed || event.button !== 0 || shouldIgnoreCardSelection(event.target)) {
      return;
    }

    if (hasSelectionModifier(event)) {
      toggleSelection(panel.id);
      event.stopPropagation();
      return;
    }

    if (!selectedPanelIds.has(panel.id)) {
      setSelection([panel.id]);
    }
  });

  handle.addEventListener("pointerdown", (event) => {
    if (spacePressed || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (hasSelectionModifier(event)) {
      toggleSelection(panel.id);
      return;
    }

    if (!selectedPanelIds.has(panel.id)) {
      setSelection([panel.id]);
    }

    if (event.pointerType !== "touch") {
      startCardDrag(event, panel.id);
      return;
    }

    // Touch: commit drag on long press (350ms) or when finger moves > 10px
    let latestEvent = event;
    let dragCommitted = false;

    const commitDrag = () => {
      if (dragCommitted) {
        return;
      }
      dragCommitted = true;
      cleanup();
      startCardDrag(latestEvent, panel.id);
      if (navigator.vibrate) {
        navigator.vibrate(25);
      }
    };

    const cleanup = () => {
      clearTimeout(longPressTimer);
      window.removeEventListener("pointermove", onEarlyMove);
      window.removeEventListener("pointerup", onEarlyUp);
      window.removeEventListener("pointercancel", onEarlyCancel);
    };

    const onEarlyMove = (moveEvent) => {
      if (moveEvent.pointerId !== event.pointerId) {
        return;
      }
      latestEvent = moveEvent;
      const dx = moveEvent.clientX - event.clientX;
      const dy = moveEvent.clientY - event.clientY;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        commitDrag();
      }
    };

    const onEarlyUp = (upEvent) => {
      if (upEvent.pointerId !== event.pointerId) {
        return;
      }
      if (!dragCommitted) {
        cleanup();
      }
    };

    const onEarlyCancel = (cancelEvent) => {
      if (cancelEvent.pointerId !== event.pointerId) {
        return;
      }
      if (!dragCommitted) {
        cleanup();
      }
    };

    const longPressTimer = setTimeout(commitDrag, 350);

    window.addEventListener("pointermove", onEarlyMove);
    window.addEventListener("pointerup", onEarlyUp);
    window.addEventListener("pointercancel", onEarlyCancel);
  });

  handle.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 40 : 10;

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
      event.preventDefault();
      duplicatePanels([panel.id]);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      nudgeSelection(panel.id, -step, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      nudgeSelection(panel.id, step, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      nudgeSelection(panel.id, 0, -step);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      nudgeSelection(panel.id, 0, step);
    }
  });

  imageClearButton.addEventListener("click", () => {
    if (!panel.image && !panel.fileName) {
      return;
    }

    pushHistoryState();
    updatePanel(panel.id, {
      image: "",
      fileName: ""
    });
    updateHistoryUI();
    setStatus("이미지를 지웠습니다.");
  });

  duplicatePanelButton.addEventListener("click", () => {
    const ids =
      selectedPanelIds.size > 1 && selectedPanelIds.has(panel.id)
        ? Array.from(selectedPanelIds)
        : [panel.id];

    duplicatePanels(ids);
  });

  deleteButton.addEventListener("click", () => {
    const ids =
      selectedPanelIds.size > 1 && selectedPanelIds.has(panel.id)
        ? Array.from(selectedPanelIds)
        : [panel.id];

    deletePanels(ids);
  });

  captionInput.addEventListener("input", () => {
    captureHistoryGroup(`panel-caption:${panel.id}`);
    updatePanel(panel.id, { caption: captionInput.value }, { announce: false, rerender: false });
  });

  captionInput.addEventListener("blur", () => {
    releaseHistoryGroup(`panel-caption:${panel.id}`);
  });

  fileInput.addEventListener("change", async () => {
    await attachImageToPanel(panel.id, fileInput.files);
    fileInput.value = "";
  });

  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragover");
  });

  dropzone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragover");
  });

  dropzone.addEventListener("dragleave", (event) => {
    if (event.currentTarget === event.target) {
      dropzone.classList.remove("is-dragover");
    }
  });

  dropzone.addEventListener("drop", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropzone.classList.remove("is-dragover");
    await attachImageToPanel(panel.id, event.dataTransfer?.files);
  });

  dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

  return fragment;
}

function startCardDrag(event, panelId) {
  if (isListMode || isBeatLaneMode) return;
  const dragIds =
    selectedPanelIds.size > 1 && selectedPanelIds.has(panelId)
      ? Array.from(selectedPanelIds)
      : [panelId];

  const items = dragIds
    .map((id) => {
      const card = board.querySelector(`[data-panel-id="${id}"]`);
      const panel = getPanelById(id);

      if (!card || !panel) {
        return null;
      }

      return {
        id,
        card,
        width: card.offsetWidth,
        height: card.offsetHeight,
        startX: panel.x,
        startY: panel.y
      };
    })
    .filter(Boolean);

  if (items.length === 0) {
    return;
  }

  dragState = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    items,
    moved: false,
    historySnapshot: createHistorySnapshot()
  };

  items.forEach((item) => {
    item.card.classList.add("is-dragging");
  });

  document.body.classList.add("is-panning");

  window.addEventListener("pointermove", handleCardDragMove);
  window.addEventListener("pointerup", handleCardDragEnd);
  window.addEventListener("pointercancel", handleCardDragEnd);
}

function handleCardDragMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  const deltaX = (event.clientX - dragState.startClientX) / zoom;
  const deltaY = (event.clientY - dragState.startClientY) / zoom;

  if (!dragState.moved && (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0)) {
    elevatePanels(dragState.items.map((item) => item.id));
  }

  dragState.items.forEach((item) => {
    const nextX = clamp(item.startX + deltaX, PANEL_MARGIN, Math.max(PANEL_MARGIN, canvasWidth - item.width - PANEL_MARGIN));
    const nextY = clamp(item.startY + deltaY, PANEL_SAFE_TOP, Math.max(PANEL_SAFE_TOP, canvasHeight - item.height - PANEL_MARGIN));

    setPanelFields(item.id, {
      x: Math.round(nextX),
      y: Math.round(nextY)
    });

    item.card.style.left = `${Math.round(nextX)}px`;
    item.card.style.top = `${Math.round(nextY)}px`;
  });

  dragState.moved = true;
  scheduleCanvasMetricsUpdate();
}

function handleCardDragEnd(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  dragState.items.forEach((item) => {
    item.card.classList.remove("is-dragging");
  });

  document.body.classList.remove("is-panning");
  if (dragState.moved) {
    pushHistoryState(dragState.historySnapshot);
    persistPanels();
    updateHistoryUI();
  }

  if (dragState.moved) {
    setStatus(dragState.items.length > 1 ? "선택한 카드 위치를 저장했습니다." : "카드 위치를 저장했습니다.");
  }

  dragState = null;
  window.removeEventListener("pointermove", handleCardDragMove);
  window.removeEventListener("pointerup", handleCardDragEnd);
  window.removeEventListener("pointercancel", handleCardDragEnd);
}

function handleViewportWheel(event) {
  if (event.target.closest("textarea")) {
    return;
  }

  event.preventDefault();
  const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  setZoom(zoom * factor, {
    clientX: event.clientX,
    clientY: event.clientY
  });
}

function handleViewportPointerDown(event) {
  if (shouldStartPan(event)) {
    startPan(event);
    return;
  }

  if (event.button !== 0 || hasSelectionModifier(event)) {
    return;
  }

  if (!event.target.closest(".story-card")) {
    clearSelection();
  }
}

function handleBoardPointerDown(event) {
  if (spacePressed || event.button !== 0 || hasSelectionModifier(event)) {
    return;
  }

  if (event.target === board) {
    clearSelection();
  }
}

function shouldStartPan(event) {
  if (isListMode) return false;
  if (panState || dragState || pinchState) {
    return false;
  }

  if (event.button === 1) {
    return true;
  }

  // Single touch on empty canvas area → pan
  if (event.pointerType === "touch" && canvasPointers.size === 1 && !event.target.closest(".story-card")) {
    return true;
  }

  return spacePressed && !isEditableTarget(event.target);
}

function startPan(event) {
  event.preventDefault();

  panState = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startScrollLeft: canvasViewport.scrollLeft,
    startScrollTop: canvasViewport.scrollTop
  };

  document.body.classList.add("is-panning");

  window.addEventListener("pointermove", handlePanMove);
  window.addEventListener("pointerup", handlePanEnd);
  window.addEventListener("pointercancel", handlePanEnd);
}

function handlePanMove(event) {
  if (!panState || event.pointerId !== panState.pointerId) {
    return;
  }

  const deltaX = event.clientX - panState.startClientX;
  const deltaY = event.clientY - panState.startClientY;

  canvasViewport.scrollLeft = panState.startScrollLeft - deltaX;
  canvasViewport.scrollTop = panState.startScrollTop - deltaY;
  scheduleViewStateSave();
}

function handlePanEnd(event) {
  if (!panState || event.pointerId !== panState.pointerId) {
    return;
  }

  panState = null;
  document.body.classList.remove("is-panning");

  if (spacePressed) {
    document.body.classList.add("is-hand-mode");
  }

  window.removeEventListener("pointermove", handlePanMove);
  window.removeEventListener("pointerup", handlePanEnd);
  window.removeEventListener("pointercancel", handlePanEnd);
}

// ── Pinch zoom + two-finger pan ──────────────────────────────────────────────

function getPinchMidAndDistance(pointers) {
  const pts = Array.from(pointers.values());
  const midX = (pts[0].clientX + pts[1].clientX) / 2;
  const midY = (pts[0].clientY + pts[1].clientY) / 2;
  const dx = pts[0].clientX - pts[1].clientX;
  const dy = pts[0].clientY - pts[1].clientY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return { midX, midY, distance };
}

function handlePinchDown(event) {
  if (event.pointerType !== "touch") {
    return;
  }

  canvasPointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

  if (canvasPointers.size !== 2) {
    return;
  }

  // Second finger landed — cancel any existing single-touch pan or card drag
  if (panState) {
    panState = null;
    document.body.classList.remove("is-panning");
    window.removeEventListener("pointermove", handlePanMove);
    window.removeEventListener("pointerup", handlePanEnd);
    window.removeEventListener("pointercancel", handlePanEnd);
  }

  if (dragState) {
    dragState.items.forEach((item) => item.card.classList.remove("is-dragging"));
    dragState = null;
    document.body.classList.remove("is-panning");
    window.removeEventListener("pointermove", handleCardDragMove);
    window.removeEventListener("pointerup", handleCardDragEnd);
    window.removeEventListener("pointercancel", handleCardDragEnd);
  }

  const { midX, midY, distance } = getPinchMidAndDistance(canvasPointers);
  const rect = canvasViewport.getBoundingClientRect();

  pinchState = {
    startDistance: distance,
    startZoom: zoom,
    startMidX: midX,
    startMidY: midY,
    anchorLocalX: midX - rect.left,
    anchorLocalY: midY - rect.top,
    startScrollLeft: canvasViewport.scrollLeft,
    startScrollTop: canvasViewport.scrollTop
  };
}

function handlePinchMove(event) {
  if (!canvasPointers.has(event.pointerId)) {
    return;
  }

  canvasPointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

  if (!pinchState || canvasPointers.size < 2) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const { midX, midY, distance } = getPinchMidAndDistance(canvasPointers);
  const scale = distance / pinchState.startDistance;
  const targetZoom = clamp(pinchState.startZoom * scale, MIN_ZOOM, MAX_ZOOM);

  const deltaMidX = midX - pinchState.startMidX;
  const deltaMidY = midY - pinchState.startMidY;

  // Content point under the initial pinch midpoint
  const contentX = (pinchState.startScrollLeft + pinchState.anchorLocalX) / pinchState.startZoom;
  const contentY = (pinchState.startScrollTop + pinchState.anchorLocalY) / pinchState.startZoom;

  zoom = targetZoom;
  updateZoomUI();
  updateCanvasMetrics();

  canvasViewport.scrollLeft = contentX * targetZoom - pinchState.anchorLocalX - deltaMidX;
  canvasViewport.scrollTop = contentY * targetZoom - pinchState.anchorLocalY - deltaMidY;

  clampViewportScroll();
  scheduleViewStateSave();
}

function handlePinchUp(event) {
  if (!canvasPointers.has(event.pointerId)) {
    return;
  }

  canvasPointers.delete(event.pointerId);

  if (canvasPointers.size < 2) {
    pinchState = null;
  }
}

function handleGlobalKeyDown(event) {
  if (isConfirmDialogOpen()) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeConfirmDialog(false);
    }
    return;
  }

  if (event.code === "Space" && !isEditableTarget(document.activeElement)) {
    event.preventDefault();

    if (!spacePressed) {
      spacePressed = true;
      document.body.classList.add("is-hand-mode");
    }
  }

  const key = event.key.toLowerCase();
  const isCommand = event.metaKey || event.ctrlKey;

  if (isCommand && key === "s") {
    event.preventDefault();

    if (event.shiftKey) {
      void window.ShonodeWorkspaceBridge?.exportWorkspace?.();
    } else {
      saveWorkspace();
    }
    return;
  }

  if (isEditableTarget(document.activeElement)) {
    return;
  }

  if (isCommand && key === "z" && event.shiftKey) {
    event.preventDefault();
    redoHistory();
    return;
  }

  if (isCommand && key === "z") {
    event.preventDefault();
    undoHistory();
    return;
  }

  if (isCommand && key === "y") {
    event.preventDefault();
    redoHistory();
    return;
  }

  if (isCommand && key === "d" && selectedPanelIds.size > 0) {
    event.preventDefault();
    duplicatePanels(Array.from(selectedPanelIds));
    return;
  }

  if (isCommand && key === "a" && panels.length > 0) {
    event.preventDefault();
    setSelection(panels.map((panel) => panel.id));
    setStatus(`${panels.length}개 컷을 선택했습니다.`);
    return;
  }

  if (isCommand && (key === "=" || key === "+")) {
    event.preventDefault();
    stepZoom(1.12);
    return;
  }

  if (isCommand && key === "-") {
    event.preventDefault();
    stepZoom(1 / 1.12);
    return;
  }

  if (isCommand && key === "0") {
    event.preventDefault();
    fitCanvasToView();
    return;
  }

  if (selectedPanelIds.size > 0 && key.startsWith("arrow")) {
    event.preventDefault();
    const step = event.shiftKey ? 40 : 10;
    const [firstSelectedId] = selectedPanelIds;

    if (!firstSelectedId) {
      return;
    }

    if (key === "arrowleft") {
      nudgeSelection(firstSelectedId, -step, 0);
      return;
    }

    if (key === "arrowright") {
      nudgeSelection(firstSelectedId, step, 0);
      return;
    }

    if (key === "arrowup") {
      nudgeSelection(firstSelectedId, 0, -step);
      return;
    }

    if (key === "arrowdown") {
      nudgeSelection(firstSelectedId, 0, step);
      return;
    }
  }

  if ((event.key === "Delete" || event.key === "Backspace") && selectedPanelIds.size > 0) {
    event.preventDefault();
    deleteSelectionButton?.click();
    return;
  }

  if (event.key === "Escape") {
    clearSelection({ announce: true });
  }
}

function handleGlobalKeyUp(event) {
  if (event.code !== "Space") {
    return;
  }

  if (!isEditableTarget(document.activeElement)) {
    event.preventDefault();
  }

  spacePressed = false;
  document.body.classList.remove("is-hand-mode");

  if (!panState) {
    document.body.classList.remove("is-panning");
  }
}

function stepZoom(factor) {
  setZoom(zoom * factor);
}

function setZoom(nextZoom, anchor = {}) {
  const targetZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  if (Math.abs(targetZoom - zoom) < 0.001) {
    return;
  }

  const rect = canvasViewport.getBoundingClientRect();
  const localX = anchor.clientX ? anchor.clientX - rect.left : rect.width / 2;
  const localY = anchor.clientY ? anchor.clientY - rect.top : rect.height / 2;
  const contentX = anchor.contentX ?? (canvasViewport.scrollLeft + localX) / zoom;
  const contentY = anchor.contentY ?? (canvasViewport.scrollTop + localY) / zoom;

  zoom = targetZoom;
  updateZoomUI();
  updateCanvasMetrics();

  canvasViewport.scrollLeft = contentX * zoom - localX;
  canvasViewport.scrollTop = contentY * zoom - localY;

  clampViewportScroll();
  scheduleViewStateSave();
}

function goToWorkspaceHome() {
  window.ShonodeWorkspaceBridge?.closePanels?.({ announce: false });
  const targetPanel = getHomeTargetPanel();

  if (MOBILE_HOME_MEDIA_QUERY.matches && targetPanel) {
    const targetZoom = clamp(Math.max(zoom, NARROW_HOME_ZOOM), MIN_ZOOM, MAX_ZOOM);
    zoomToPanel(targetPanel.id, targetZoom);
    focusPanel(targetPanel.id);
    setStatus("현재 컷을 중심으로 이동했습니다.");
    return;
  }

  clearSelection();
  fitCanvasToView({ announce: false });
  setStatus("작업 홈으로 돌아왔습니다.");
}

function fitCanvasToView(options = {}) {
  const { announce = true } = options;
  const bounds = getContentBounds();
  const viewportWidth = canvasViewport.clientWidth;
  const viewportHeight = canvasViewport.clientHeight;

  if (!viewportWidth || !viewportHeight) {
    return;
  }

  const contentWidth = Math.max(480, bounds.maxX - bounds.minX + PANEL_MARGIN * 2);
  const contentHeight = Math.max(320, bounds.maxY - bounds.minY + PANEL_MARGIN * 2);
  const nextZoom = clamp(
    Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight),
    MIN_ZOOM,
    MAX_ZOOM
  );

  setZoom(nextZoom, {
    contentX: (bounds.minX + bounds.maxX) / 2,
    contentY: (bounds.minY + bounds.maxY) / 2
  });

  if (!announce) {
    return;
  }

  setStatus("현재 배치에 맞게 화면을 조정했습니다.");
}

function getHomeTargetPanel() {
  const [selectedPanelId] = selectedPanelIds;
  if (selectedPanelId) {
    return getPanelById(selectedPanelId);
  }

  return panels[0] ?? null;
}

function zoomToPanel(panelId, targetZoom) {
  const panel = getPanelById(panelId);
  const card = board.querySelector(`[data-panel-id="${panelId}"]`);

  if (!panel || !card) {
    return false;
  }

  setZoom(targetZoom, {
    contentX: panel.x + card.offsetWidth / 2,
    contentY: panel.y + card.offsetHeight / 2
  });

  return true;
}

function updateZoomUI() {
  zoomPercentage.textContent = `${Math.round(zoom * 100)}%`;
}

function scheduleCanvasMetricsUpdate(restoreView = false) {
  window.cancelAnimationFrame(metricsFrameId);
  metricsFrameId = window.requestAnimationFrame(() => {
    updateCanvasMetrics();

    if (restoreView && pendingInitialScroll) {
      canvasViewport.scrollLeft = pendingInitialScroll.left;
      canvasViewport.scrollTop = pendingInitialScroll.top;
      pendingInitialScroll = null;
      clampViewportScroll();
    }
  });
}

function updateCanvasMetrics() {
  const viewportWidth = canvasViewport.clientWidth || window.innerWidth;
  const viewportHeight = canvasViewport.clientHeight || window.innerHeight;
  const bounds = getContentBounds();

  canvasWidth = Math.max(DEFAULT_CANVAS_WIDTH, Math.ceil(bounds.maxX + PANEL_MARGIN), Math.ceil(viewportWidth / zoom));
  canvasHeight = Math.max(DEFAULT_CANVAS_HEIGHT, Math.ceil(bounds.maxY + PANEL_MARGIN), Math.ceil(viewportHeight / zoom));

  board.style.width = `${canvasWidth}px`;
  board.style.height = `${canvasHeight}px`;
  board.style.transform = `scale(${zoom})`;
  boardSizer.style.width = `${Math.ceil(canvasWidth * zoom)}px`;
  boardSizer.style.height = `${Math.ceil(canvasHeight * zoom)}px`;

  clampViewportScroll();
}

function clampViewportScroll() {
  const maxScrollLeft = Math.max(0, boardSizer.offsetWidth - canvasViewport.clientWidth);
  const maxScrollTop = Math.max(0, boardSizer.offsetHeight - canvasViewport.clientHeight);

  canvasViewport.scrollLeft = clamp(canvasViewport.scrollLeft, 0, maxScrollLeft);
  canvasViewport.scrollTop = clamp(canvasViewport.scrollTop, 0, maxScrollTop);
}

function getContentBounds() {
  const cards = board.querySelectorAll(".story-card");
  let maxX = DEFAULT_CANVAS_WIDTH;
  let maxY = DEFAULT_CANVAS_HEIGHT;

  cards.forEach((card) => {
    const left = parseFloat(card.style.left) || 0;
    const top = parseFloat(card.style.top) || 0;
    maxX = Math.max(maxX, left + card.offsetWidth + PANEL_MARGIN);
    maxY = Math.max(maxY, top + card.offsetHeight + PANEL_MARGIN);
  });

  return {
    minX: 0,
    minY: 0,
    maxX,
    maxY
  };
}

function setSelection(ids) {
  selectedPanelIds = new Set(ids);
  syncSelectionUI();
}

function toggleSelection(panelId) {
  if (selectedPanelIds.has(panelId)) {
    selectedPanelIds.delete(panelId);
  } else {
    selectedPanelIds.add(panelId);
  }

  syncSelectionUI();
}

function clearSelection(options = {}) {
  if (selectedPanelIds.size === 0) {
    return;
  }

  selectedPanelIds.clear();
  syncSelectionUI();

  if (options.announce) {
    setStatus("선택을 해제했습니다.");
  }
}

function syncSelectionUI() {
  const selectionCount = selectedPanelIds.size;

  board.querySelectorAll(".story-card").forEach((card) => {
    card.classList.toggle("is-selected", selectedPanelIds.has(card.dataset.panelId));
  });

  selectionCountChip.textContent = `선택 ${selectionCount}`;
  selectionCountChip.classList.toggle("is-hidden", selectionCount === 0);

  duplicateSelectionButton.disabled = selectionCount === 0;
  if (regenerateSelectionButton) {
    regenerateSelectionButton.disabled = selectionCount === 0;
  }
  deleteSelectionButton.disabled = selectionCount === 0;
  clearSelectionButton.disabled = selectionCount === 0;
}

function duplicatePanels(panelIds) {
  const ids = panelIds.filter(Boolean);
  if (ids.length === 0) {
    return;
  }

  const sourcePanels = panels.filter((panel) => ids.includes(panel.id));
  if (sourcePanels.length === 0) {
    return;
  }

  pushHistoryState();
  const zBase = getNextZIndex();
  const clones = sourcePanels.map((panel, index) => ({
    ...panel,
    id: createId(),
    x: clamp(panel.x + NEW_PANEL_OFFSET, PANEL_MARGIN, Math.max(PANEL_MARGIN, canvasWidth - PANEL_WIDTH - PANEL_MARGIN)),
    y: clamp(panel.y + NEW_PANEL_OFFSET, PANEL_SAFE_TOP, Math.max(PANEL_SAFE_TOP, canvasHeight - 220)),
    z: zBase + index
  }));

  panels = [...panels, ...clones];
  setSelection(clones.map((panel) => panel.id));
  persistPanels();
  updateHistoryUI();
  renderPanels();
  focusPanel(clones[0].id);
  setStatus(clones.length > 1 ? "선택한 카드를 복제했습니다." : "카드를 복제했습니다.");
}

function deletePanels(panelIds) {
  const ids = panelIds.filter(Boolean);
  if (ids.length === 0) {
    return;
  }

  pushHistoryState();
  const nextPanels = panels.filter((panel) => !ids.includes(panel.id));
  panels = nextPanels.length > 0 ? nextPanels : [createEmptyPanel({ ...getSpawnPosition(), z: 1 })];
  selectedPanelIds.clear();
  persistPanels();
  updateHistoryUI();
  renderPanels();
  setStatus(ids.length > 1 ? "선택한 카드를 삭제했습니다." : "카드를 삭제했습니다.");
}

function elevatePanels(panelIds) {
  const ids = panelIds.filter(Boolean);
  if (ids.length === 0) {
    return;
  }

  let nextZ = getNextZIndex();

  ids.forEach((id) => {
    setPanelFields(id, { z: nextZ });

    const card = board.querySelector(`[data-panel-id="${id}"]`);
    if (card) {
      card.style.zIndex = String(nextZ);
    }

    nextZ += 1;
  });
}

function nudgeSelection(fallbackPanelId, deltaX, deltaY) {
  // Beat-lane mode lays cards out by CSS; nudging x/y would silently corrupt the
  // stored canvas positions while nothing moves on screen.
  if (isBeatLaneMode) return;

  const ids =
    selectedPanelIds.size > 0 && selectedPanelIds.has(fallbackPanelId)
      ? Array.from(selectedPanelIds)
      : [fallbackPanelId];

  pushHistoryState();
  elevatePanels(ids);

  ids.forEach((id) => {
    const card = board.querySelector(`[data-panel-id="${id}"]`);
    const panel = getPanelById(id);

    if (!card || !panel) {
      return;
    }

    const nextX = clamp(panel.x + deltaX, PANEL_MARGIN, Math.max(PANEL_MARGIN, canvasWidth - card.offsetWidth - PANEL_MARGIN));
    const nextY = clamp(panel.y + deltaY, PANEL_SAFE_TOP, Math.max(PANEL_SAFE_TOP, canvasHeight - card.offsetHeight - PANEL_MARGIN));

    setPanelFields(id, { x: nextX, y: nextY });
    card.style.left = `${nextX}px`;
    card.style.top = `${nextY}px`;
  });

  persistPanels();
  updateHistoryUI();
  scheduleCanvasMetricsUpdate();
  setStatus("카드 위치를 조정했습니다.");
}

function focusPanel(panelId) {
  const panel = getPanelById(panelId);
  if (!panel) {
    return;
  }

  const card = board.querySelector(`[data-panel-id="${panelId}"]`);
  if (!card) {
    return;
  }

  const cardRect = card.getBoundingClientRect();
  const viewportRect = canvasViewport.getBoundingClientRect();

  if (cardRect.right > viewportRect.right || cardRect.left < viewportRect.left) {
    canvasViewport.scrollLeft = panel.x * zoom - 40;
  }

  if (cardRect.bottom > viewportRect.bottom || cardRect.top < viewportRect.top) {
    canvasViewport.scrollTop = panel.y * zoom - 40;
  }

  const handle = card.querySelector(".panel-handle");
  handle?.focus();
  scheduleViewStateSave();
}

async function attachImageToPanel(panelId, fileList) {
  const file = fileList?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setStatus("이미지 파일만 넣을 수 있어요.", "warning");
    return;
  }

  try {
    const imageDataUrl = await readFileAsDataUrl(file);
    pushHistoryState();
    updatePanel(panelId, {
      image: imageDataUrl,
      fileName: file.name
    });
    updateHistoryUI();
    setStatus("이미지를 반영했습니다.");
  } catch {
    setStatus("이미지를 불러오는 중 문제가 생겼습니다.", "warning");
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function updatePanel(panelId, updates, options = {}) {
  const announce = options.announce ?? true;
  const rerender = options.rerender ?? true;
  const persist = options.persist ?? true;

  setPanelFields(panelId, updates);

  if (persist) {
    persistPanels();
  }

  if (rerender) {
    renderPanels();
  }

  if (announce) {
    setStatus("변경사항을 저장했습니다.");
  }
}

function setPanelFields(panelId, updates) {
  panels = panels.map((panel) => {
    if (panel.id !== panelId) {
      return panel;
    }

    return {
      ...panel,
      ...updates
    };
  });
}

function getPanelById(panelId) {
  return panels.find((panel) => panel.id === panelId);
}

function getNextZIndex() {
  return panels.reduce((maxValue, panel) => Math.max(maxValue, panel.z ?? 1), 0) + 1;
}

function hasSelectionModifier(event) {
  return event.metaKey || event.ctrlKey || event.shiftKey;
}

function isEditableTarget(target) {
  return Boolean(target?.closest?.("textarea, input, [contenteditable='true']"));
}

function shouldIgnoreCardSelection(target) {
  return Boolean(target?.closest?.("button, textarea, input, .dropzone, .panel-handle"));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ── Mobile Drawer ─────────────────────────────────────────────────────────────

function openMobileDrawer() {
  if (!mobileDrawer) return;
  isDrawerOpen = true;
  mobileDrawer.hidden = false;
  requestAnimationFrame(() => mobileDrawer.removeAttribute("hidden"));
  mobileMenuButton?.setAttribute("aria-expanded", "true");
  tabMore?.setAttribute("aria-expanded", "true");
  syncDrawerSaveLabel();
}

function closeMobileDrawer() {
  if (!mobileDrawer) return;
  isDrawerOpen = false;
  mobileDrawer.hidden = true;
  mobileMenuButton?.setAttribute("aria-expanded", "false");
  tabMore?.setAttribute("aria-expanded", "false");
}

function toggleMobileDrawer() {
  if (isDrawerOpen) closeMobileDrawer(); else openMobileDrawer();
}

function syncDrawerSaveLabel() {
  if (mobileDrawerSaveLabel && saveWorkspaceLabel) {
    mobileDrawerSaveLabel.textContent = saveWorkspaceLabel.textContent;
  }
}

// ── List Mode ─────────────────────────────────────────────────────────────────

function enableListMode(animate = true) {
  clearBeatLaneMode();
  isListMode = true;
  document.body.classList.add("is-list-mode");
  if (listViewButton) {
    listViewButton.setAttribute("aria-pressed", "true");
    listViewButton.querySelector(".view-toggle-label").textContent = "캔버스";
  }
  if (mobileCanvasViewButton) {
    mobileCanvasViewButton.querySelector("span") && (mobileCanvasViewButton.lastChild.textContent = " 캔버스 뷰로 전환");
  }
  renderPanels();
  applyCompactCards();
  if (animate) setStatus("리스트 뷰로 전환했습니다.");
}

function disableListMode() {
  isListMode = false;
  expandedPanelIds.clear();
  document.body.classList.remove("is-list-mode");
  if (listViewButton) {
    listViewButton.setAttribute("aria-pressed", "false");
    listViewButton.querySelector(".view-toggle-label").textContent = "리스트";
  }
  renderPanels();
  setStatus("캔버스 뷰로 전환했습니다.");
}

// ── Beat Lane Mode ────────────────────────────────────────────────────────────
// A third, mutually-exclusive board layout (canvas / list / beat-lane) that
// arranges cards into six-beat swimlanes. Purely visual and ephemeral, like list
// mode — it never mutates panel positions or history.

function syncBeatLaneButton() {
  if (!beatLaneButton) return;
  beatLaneButton.setAttribute("aria-pressed", isBeatLaneMode ? "true" : "false");
}

// Reset beat-lane state WITHOUT re-rendering (callers render themselves).
function clearBeatLaneMode() {
  if (!isBeatLaneMode) return;
  isBeatLaneMode = false;
  document.body.classList.remove("is-beat-lane-mode");
  syncBeatLaneButton();
}

function enableBeatLaneMode(animate = true) {
  // Silently drop list mode (mutually exclusive) — we re-render once below.
  if (isListMode) {
    isListMode = false;
    expandedPanelIds.clear();
    document.body.classList.remove("is-list-mode");
    if (listViewButton) {
      listViewButton.setAttribute("aria-pressed", "false");
      listViewButton.querySelector(".view-toggle-label").textContent = "리스트";
    }
  }
  isBeatLaneMode = true;
  document.body.classList.add("is-beat-lane-mode");
  syncBeatLaneButton();
  renderPanels();
  if (animate) setStatus("비트 레인 뷰로 전환했습니다.");
}

function disableBeatLaneMode(animate = true) {
  isBeatLaneMode = false;
  document.body.classList.remove("is-beat-lane-mode");
  syncBeatLaneButton();
  renderPanels();
  if (animate) setStatus("캔버스 뷰로 전환했습니다.");
}

function applyCompactCards() {
  if (!isListMode) return;
  board.querySelectorAll(".story-card").forEach((card) => {
    const panelId = card.dataset.panelId;
    if (!panelId) return;
    if (expandedPanelIds.has(panelId)) {
      card.classList.remove("is-compact");
    } else {
      card.classList.add("is-compact");
    }
  });
}

function toggleCardExpand(panelId) {
  if (expandedPanelIds.has(panelId)) {
    expandedPanelIds.delete(panelId);
  } else {
    expandedPanelIds.add(panelId);
  }
  applyCompactCards();
}

// ── Edit Bar ────────────────────────────────────────────────────────────────

function openEditBar() {
  editBarOpen = true;
  editBar.classList.add("is-open");
  editBarContent.hidden = false;
  editBarToggle.setAttribute("aria-expanded", "true");
  editBarToggle.setAttribute("aria-label", "편집 패널 닫기");
  renderTimeline();
}

function closeEditBar() {
  stopTimelinePlayback();
  editBarOpen = false;
  editBar.classList.remove("is-open");
  editBarContent.hidden = true;
  editBarToggle.setAttribute("aria-expanded", "false");
  editBarToggle.setAttribute("aria-label", "편집 패널 열기");
}

function toggleEditBar() {
  if (editBarOpen) {
    closeEditBar();
  } else {
    openEditBar();
  }
}

function getTimelineOrder() {
  return [...panels].sort((a, b) => a.y - b.y || a.x - b.x);
}

function parseDurationSeconds(label) {
  if (!label) {
    return 0;
  }
  const s = String(label).trim().toLowerCase();
  const simple = s.match(/^([\d.]+)\s*(?:s|sec|초|秒)?$/);
  if (simple) {
    return parseFloat(simple[1]);
  }
  const timecode = s.match(/^(\d+):(\d{2})$/);
  if (timecode) {
    return parseInt(timecode[1], 10) * 60 + parseInt(timecode[2], 10);
  }
  return 0;
}

function formatTotalDuration(totalSec) {
  if (totalSec <= 0) {
    return "총 0초";
  }
  if (totalSec < 60) {
    return `총 ${Math.round(totalSec)}초`;
  }
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return s > 0 ? `총 ${m}분 ${s}초` : `총 ${m}분`;
}

function formatTimecode(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const fr = Math.floor((sec % 1) * 24);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(fr).padStart(2, "0")}`;
}

function getClipDurationSec(panel) {
  const parsed = parseDurationSeconds(panel.durationLabel);
  return parsed > 0 ? parsed : 3;
}

function getOrderedPanelsWithTimes() {
  const ordered = getTimelineOrder();
  let t = 0;
  return ordered.map((panel) => {
    const dur = getClipDurationSec(panel);
    const startTime = t;
    t += dur;
    return { panel, startTime, duration: dur };
  });
}

function updateTimelineDurationLabel() {
  const clips = getOrderedPanelsWithTimes();
  const totalSec = clips.reduce((sum, c) => sum + c.duration, 0);
  editTotalDuration.textContent = formatTotalDuration(totalSec);
}

function renderTimeline() {
  if (!editBarOpen) {
    return;
  }

  const clips = getOrderedPanelsWithTimes();
  const totalSec = clips.reduce((sum, c) => sum + c.duration, 0);
  editTotalDuration.textContent = formatTotalDuration(totalSec);

  const END_PAD = 80;
  const areaWidth = timelineScrollArea ? timelineScrollArea.clientWidth : 600;
  const totalWidth = Math.max(totalSec * timelineScale + END_PAD, areaWidth);

  if (timelineInnerEl) {
    timelineInnerEl.style.width = `${totalWidth}px`;
  }

  renderTimelineRuler(totalSec, totalWidth);
  renderTimelineClips(clips);
  updatePlayheadPosition();
}

function renderTimelineRuler(totalSec, totalWidth) {
  if (!timelineRulerEl) {
    return;
  }
  timelineRulerEl.innerHTML = "";

  let majorInterval = 1;
  if (timelineScale < 25) {
    majorInterval = 10;
  } else if (timelineScale < 50) {
    majorInterval = 5;
  } else if (timelineScale < 100) {
    majorInterval = 2;
  }
  const minorInterval = majorInterval / 4;

  let t = 0;
  while (t <= totalSec + majorInterval) {
    const x = t * timelineScale;
    if (x > totalWidth + 10) {
      break;
    }
    const stepIndex = Math.round(t / minorInterval);
    const isMajor = stepIndex % 4 === 0;

    const tick = document.createElement("div");
    tick.className = "timeline-ruler-tick";
    tick.style.left = `${x}px`;

    const line = document.createElement("div");
    line.className = "timeline-ruler-tick-line" + (isMajor ? " timeline-ruler-tick-line--major" : "");
    tick.appendChild(line);

    if (isMajor) {
      const label = document.createElement("div");
      label.className = "timeline-ruler-tick-label";
      label.textContent = formatTimecode(t);
      tick.appendChild(label);
    }

    timelineRulerEl.appendChild(tick);
    t = Math.round((t + minorInterval) * 10000) / 10000;
  }
}

function renderTimelineClips(clips) {
  if (!timelineTrackLane) {
    return;
  }
  timelineTrackLane.innerHTML = "";

  if (clips.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-subtle);font-size:0.84rem;";
    empty.textContent = "컷을 추가하면 타임라인이 표시됩니다.";
    timelineTrackLane.appendChild(empty);
    return;
  }

  clips.forEach(({ panel, startTime, duration }, index) => {
    const x = startTime * timelineScale;
    const w = Math.max(duration * timelineScale, 20);

    const clip = document.createElement("div");
    clip.className = "timeline-clip";
    clip.style.left = `${x}px`;
    clip.style.width = `${w}px`;
    clip.dataset.panelId = panel.id;

    if (selectedPanelIds.has(panel.id)) {
      clip.classList.add("is-selected");
    }

    if (panelVideoBlobUrls.has(panel.id)) {
      clip.classList.add("has-video");
    }

    if (panel.image) {
      const img = document.createElement("img");
      img.className = "timeline-clip-thumb";
      img.src = panel.image;
      img.alt = "";
      clip.appendChild(img);
    }

    const content = document.createElement("div");
    content.className = "timeline-clip-content";
    const titleEl = document.createElement("span");
    titleEl.className = "timeline-clip-title";
    titleEl.textContent = panel.sceneTitle || `컷 ${index + 1}`;
    content.appendChild(titleEl);
    clip.appendChild(content);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "timeline-clip-resize-handle";
    clip.appendChild(resizeHandle);

    // Click: navigate
    clip.addEventListener("click", () => {
      if (timelineClipDragState || timelineResizeDragState) {
        return;
      }
      setSelection([panel.id]);
      zoomToPanel(panel.id, Math.max(zoom, NARROW_HOME_ZOOM));
      renderTimeline();
    });

    // Drag body: reorder
    clip.addEventListener("mousedown", (e) => {
      if (e.target === resizeHandle || e.button !== 0) {
        return;
      }
      e.preventDefault();

      const startClientX = e.clientX;
      const startLeft = x;
      let moved = false;

      timelineClipDragState = { panelId: panel.id };
      clip.classList.add("is-dragging");

      const onMove = (mv) => {
        if (Math.abs(mv.clientX - startClientX) > 4) {
          moved = true;
        }
        clip.style.left = `${Math.max(0, startLeft + (mv.clientX - startClientX))}px`;
      };

      const onUp = (up) => {
        clip.classList.remove("is-dragging");
        timelineClipDragState = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);

        if (moved) {
          const dropLeft = Math.max(0, startLeft + (up.clientX - startClientX));
          const dropTime = dropLeft / timelineScale;
          const target = clips.find((c) =>
            c.panel.id !== panel.id &&
            dropTime >= c.startTime &&
            dropTime < c.startTime + c.duration
          );
          if (target) {
            swapTimelineClips(panel.id, target.panel.id);
          } else {
            renderTimeline();
          }
        }
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });

    // Drag resize handle: change duration
    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const startClientX = e.clientX;
      const startW = w;

      timelineResizeDragState = { panelId: panel.id };

      const onMove = (mv) => {
        const newW = Math.max(20, startW + (mv.clientX - startClientX));
        clip.style.width = `${newW}px`;
      };

      const onUp = (up) => {
        const newW = Math.max(20, startW + (up.clientX - startClientX));
        const newDurSec = Math.round((newW / timelineScale) * 10) / 10;
        const newLabel = `${newDurSec}s`;

        pushHistoryState();
        setPanelFields(panel.id, { durationLabel: newLabel });
        persistPanels();
        updateHistoryUI();
        setStatus(`${panel.sceneTitle || `컷 ${index + 1}`} 길이를 ${newLabel}로 변경했습니다.`);

        timelineResizeDragState = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });

    timelineTrackLane.appendChild(clip);
  });
}

function updatePlayheadPosition() {
  if (!timelinePlayheadEl) {
    return;
  }
  timelinePlayheadEl.style.left = `${playheadTimeSec * timelineScale}px`;
  if (timelineTimecodeEl) {
    timelineTimecodeEl.textContent = formatTimecode(playheadTimeSec);
  }
}

function swapTimelineClips(sourceId, targetId) {
  const src = panels.find((p) => p.id === sourceId);
  const tgt = panels.find((p) => p.id === targetId);
  if (!src || !tgt) {
    return;
  }

  pushHistoryState();

  const tmpX = src.x;
  const tmpY = src.y;
  setPanelFields(sourceId, { x: tgt.x, y: tgt.y });
  setPanelFields(targetId, { x: tmpX, y: tmpY });

  persistPanels();
  updateHistoryUI();
  renderPanels();
  setStatus("타임라인 순서를 변경했습니다.");
}

function maybeRefreshEditTimeline() {
  if (editBarOpen) {
    renderTimeline();
  }
}

// ── Video Storage ──────────────────────────────────────────────────────────

function openPanelVideoDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const request = window.indexedDB.open(PANEL_VIDEO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PANEL_VIDEO_DB_STORE_NAME)) {
        db.createObjectStore(PANEL_VIDEO_DB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open video DB."));
  });
}

async function loadAllPanelVideosFromIndexedDb() {
  try {
    const db = await openPanelVideoDb();
    const map = await new Promise((resolve, reject) => {
      const result = new Map();
      const tx = db.transaction(PANEL_VIDEO_DB_STORE_NAME, "readonly");
      const store = tx.objectStore(PANEL_VIDEO_DB_STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (cursor.value?.blob instanceof Blob) {
            result.set(String(cursor.key), cursor.value);
          }
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return map;
  } catch (err) {
    console.warn("Failed to load panel videos from IndexedDB.", err);
    return new Map();
  }
}

async function savePanelVideoToIndexedDb(panelId, blob, fileName) {
  const db = await openPanelVideoDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(PANEL_VIDEO_DB_STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(PANEL_VIDEO_DB_STORE_NAME).put({ blob, fileName }, panelId);
  });
  db.close();
}

async function deletePanelVideoFromIndexedDb(panelId) {
  try {
    const db = await openPanelVideoDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(PANEL_VIDEO_DB_STORE_NAME, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(PANEL_VIDEO_DB_STORE_NAME).delete(panelId);
    });
    db.close();
  } catch (err) {
    console.warn("Failed to delete panel video from IndexedDB.", err);
  }
}

function initializePanelVideoStorage() {
  if (panelVideoStoragePromise) {
    return panelVideoStoragePromise;
  }
  panelVideoStoragePromise = loadAllPanelVideosFromIndexedDb().then((videoMap) => {
    panelVideoBlobUrls.forEach((url) => URL.revokeObjectURL(url));
    panelVideoBlobUrls = new Map();
    videoMap.forEach(({ blob }, panelId) => {
      panelVideoBlobUrls.set(panelId, URL.createObjectURL(blob));
    });
    if (panelVideoBlobUrls.size > 0) {
      renderPanels();
    }
  }).catch((err) => {
    console.warn("Failed to initialize panel video storage.", err);
  });
  return panelVideoStoragePromise;
}

async function attachVideoToPanel(panelId, fileList) {
  const file = fileList?.[0];
  if (!file) return;
  if (!file.type.startsWith("video/")) {
    setStatus("영상 파일만 넣을 수 있어요.", "warning");
    return;
  }
  try {
    const oldUrl = panelVideoBlobUrls.get(panelId);
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    const newUrl = URL.createObjectURL(file);
    panelVideoBlobUrls.set(panelId, newUrl);
    await savePanelVideoToIndexedDb(panelId, file, file.name);
    pushHistoryState();
    updatePanel(panelId, { videoFileName: file.name });
    updateHistoryUI();
    setStatus("영상을 반영했습니다.");
  } catch (err) {
    setStatus("영상을 불러오는 중 문제가 생겼습니다.", "warning");
  }
}

async function clearVideoFromPanel(panelId) {
  const url = panelVideoBlobUrls.get(panelId);
  if (url) {
    URL.revokeObjectURL(url);
    panelVideoBlobUrls.delete(panelId);
  }
  await deletePanelVideoFromIndexedDb(panelId);
  pushHistoryState();
  updatePanel(panelId, { videoFileName: "" });
  updateHistoryUI();
  setStatus("영상을 지웠습니다.");
}

// ── Timeline Playback ──────────────────────────────────────────────────────

function startTimelinePlayback() {
  if (!editBarOpen) openEditBar();
  isPlaying = true;
  lastPlayTimestamp = null;
  if (timelinePlayButton) {
    timelinePlayButton.querySelector(".play-icon").hidden = true;
    timelinePlayButton.querySelector(".stop-icon").hidden = false;
    timelinePlayButton.classList.add("is-playing");
  }
  playheadRafId = requestAnimationFrame(tickPlayback);
}

function stopTimelinePlayback() {
  if (!isPlaying) return;
  isPlaying = false;
  if (playheadRafId != null) {
    cancelAnimationFrame(playheadRafId);
    playheadRafId = null;
  }
  lastPlayTimestamp = null;
  if (timelinePlayButton) {
    timelinePlayButton.querySelector(".play-icon").hidden = false;
    timelinePlayButton.querySelector(".stop-icon").hidden = true;
    timelinePlayButton.classList.remove("is-playing");
  }
  timelineTrackLane?.querySelectorAll(".timeline-clip.is-playing").forEach((el) => {
    el.classList.remove("is-playing");
  });
}

function tickPlayback(timestamp) {
  if (!isPlaying) return;
  if (lastPlayTimestamp == null) lastPlayTimestamp = timestamp;
  const delta = (timestamp - lastPlayTimestamp) / 1000;
  lastPlayTimestamp = timestamp;

  const clips = getOrderedPanelsWithTimes();
  const totalSec = clips.reduce((sum, c) => sum + c.duration, 0);

  if (totalSec <= 0) {
    stopTimelinePlayback();
    return;
  }

  playheadTimeSec += delta;
  if (playheadTimeSec >= totalSec) {
    playheadTimeSec = 0;
  }

  updatePlayheadPosition();

  const currentClip = clips.find(
    (c) => playheadTimeSec >= c.startTime && playheadTimeSec < c.startTime + c.duration
  );

  timelineTrackLane?.querySelectorAll(".timeline-clip").forEach((clipEl) => {
    const active = currentClip?.panel.id === clipEl.dataset.panelId;
    clipEl.classList.toggle("is-playing", active);

    if (active) {
      const vidUrl = panelVideoBlobUrls.get(clipEl.dataset.panelId);
      const previewVideo = document.getElementById("previewVideo");
      if (previewVideo && vidUrl && previewVideo.src !== vidUrl) {
        previewVideo.src = vidUrl;
        previewVideo.play().catch(() => {});
      }
    }
  });

  playheadRafId = requestAnimationFrame(tickPlayback);
}


function setStatus(message, tone = "neutral") {
  statusMessage.textContent = message;
  statusMessage.dataset.tone = tone;

  window.clearTimeout(statusTimeoutId);
  statusTimeoutId = window.setTimeout(() => {
    statusMessage.textContent = "준비 완료. 전체 페이지를 캔버스처럼 사용해보세요.";
    statusMessage.dataset.tone = "neutral";
  }, 3200);
}
