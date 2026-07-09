(function enhanceShotBoard() {
  const LEFT_SIDEBAR_SECTION_STORAGE_KEY = "shotboard-left-sidebar-sections-v3";
  const RIGHT_SIDEBAR_SECTION_STORAGE_KEY = "shotboard-right-sidebar-sections-v3";
  const LEFT_RAIL_COLLAPSED_STORAGE_KEY = "shotboard-left-rail-collapsed-v1";
  const RIGHT_RAIL_COLLAPSED_STORAGE_KEY = "shotboard-right-rail-collapsed-v1";
  const AI_REFERENCE_IMAGES_STORAGE_KEY = "shotboard-ai-reference-images-v1";
  const AI_REFERENCE_DB_NAME = "shotboard-ai-reference-db-v1";
  const AI_REFERENCE_DB_STORE_NAME = "reference-images";
  const AI_REFERENCE_DB_RECORD_KEY = "active-project";
  const WORKSPACE_LIBRARY_STORAGE_KEY = "shonode-workspace-library-v1";
  const ACTIVE_WORKSPACE_STORAGE_KEY = "shonode-active-workspace-v1";
  const WORKSPACE_LIBRARY_DB_NAME = "shonode-workspace-library-db-v1";
  const WORKSPACE_LIBRARY_DB_STORE_NAME = "workspace-snapshots";
  const AI_REFERENCE_IMAGE_LIMIT = 10;
  const WORKSPACE_EXPORT_VERSION = "shonode-workspace-v2";
  const PANEL_BEATS = ["hook", "tension", "reveal", "proof", "joy", "cta"];
  // Single source of truth for six-beat metadata (Korean label + color).
  // PANEL_BEATS defines canonical order; BEAT_META defines label/color.
  // Keep keys identical to PANEL_BEATS so the badge, the coverage panel,
  // and the reassign control never drift.
  const BEAT_META = {
    hook: { label: "훅", color: "#EC4899" },
    tension: { label: "긴장", color: "#F97316" },
    reveal: { label: "반전", color: "#8B5CF6" },
    proof: { label: "증명", color: "#0EA5E9" },
    joy: { label: "환희", color: "#22C55E" },
    cta: { label: "전환(CTA)", color: "#EF4444" }
  };
  // Expose the six-beat metadata (canonical order + Korean label + color) as a
  // read-only global so the base canvas engine (script.js) can render beat lanes
  // from the SAME source of truth without duplicating the beat list.
  if (typeof window !== "undefined") {
    window.ShonodeBeatMeta = { order: PANEL_BEATS.slice(), meta: BEAT_META };
  }
  const PATTERN_SOURCE_FAMILIES = ["award", "dolphiners", "hybrid"];
  const CLAIM_RISK_LEVELS = ["low", "proof_required", "high"];
  const CLAIM_RULINGS = ["allowed", "claim_safe_rewrite", "blocked"];
  const CLAIM_LOG_LIMIT = 200;

  const aiBriefInputEl = document.getElementById("aiBriefInput");
  const aiModelInputEl = document.getElementById("aiModelInput");
  const aiProviderSelectEl = document.getElementById("aiProviderSelect");
  const aiProviderStatusEl = document.getElementById("aiProviderStatus");
  const aiProviderStatusTextEl = document.getElementById("aiProviderStatusText");
  const aiProviderStatusDetailEl = document.getElementById("aiProviderStatusDetail");
  const aiProviderStatusRefreshEl = document.getElementById("aiProviderStatusRefresh");
  const openaiKeyFieldEl = document.getElementById("openaiKeyField");
  const openaiKeyInputEl = document.getElementById("openaiKeyInput");
  const openaiModelFieldEl = document.getElementById("openaiModelField");
  const openaiModelInputEl = document.getElementById("openaiModelInput");
  const aiCutCountOutputEl = document.getElementById("aiCutCountOutput");
  const aiPlanMetaEl = document.getElementById("aiPlanMeta");
  const aiGenerationIndicatorEl = document.getElementById("aiGenerationIndicator");
  const aiGenerationStageEl = document.getElementById("aiGenerationStage");
  const aiGenerationHintEl = document.getElementById("aiGenerationHint");
  const aiReferenceDropzoneEl = document.getElementById("aiReferenceDropzone");
  const aiReferenceInputEl = document.getElementById("aiReferenceInput");
  const aiReferenceInlineGridEl = document.getElementById("aiReferenceInlineGrid");
  const aiReferenceListEl = document.getElementById("aiReferenceList");
  const aiReferenceCountEl = document.getElementById("aiReferenceCount");
  const referenceLightboxEl = document.getElementById("referenceLightbox");
  const referenceLightboxBackdropEl = document.getElementById("referenceLightboxBackdrop");
  const referenceLightboxCloseEl = document.getElementById("referenceLightboxClose");
  const referenceLightboxImageEl = document.getElementById("referenceLightboxImage");
  const referenceLightboxMetaEl = document.getElementById("referenceLightboxMeta");
  const referenceLightboxTitleEl = document.getElementById("referenceLightboxTitle");
  const aiReferenceWeightInputEl = document.getElementById("aiReferenceWeightInput");
  const aiSummaryOutputEl = document.getElementById("aiSummaryOutput");
  const aiSequenceOutputEl = document.getElementById("aiSequenceOutput");
  const beatCoverageOutputEl = document.getElementById("beatCoverageOutput");
  const productCategoryInputEl = document.getElementById("productCategoryInput");
  const hasProofAssetsInputEl = document.getElementById("hasProofAssetsInput");
  const qcRiskBadgeEl = document.getElementById("qcRiskBadge");
  const creativePatternInputEl = document.getElementById("creativePatternInput");
  const patternRecommendOutputEl = document.getElementById("patternRecommendOutput");
  const selectionDetailOutputEl = document.getElementById("selectionDetailOutput");
  const generatePlanButtonEl = document.getElementById("generatePlanButton");
  const generatePlanButtonLabelEl = document.getElementById("generatePlanButtonLabel");
  const regenerateSelectionButtonEl = document.getElementById("regenerateSelectionButton");
  const importWorkspaceInputEl = document.getElementById("importWorkspaceInput");
  const exportWorkspaceButtonEl = document.getElementById("exportWorkspaceButton");
  const workspaceMainEl = document.querySelector(".workspace-main");
  const workspaceStageEl = document.querySelector(".workspace-stage");
  const workspaceOverlayEl = document.getElementById("workspaceOverlay");
  const leftRailEl = document.getElementById("leftSidebarRail");
  const rightRailEl = document.getElementById("rightSidebarRail");
  const leftRailToggleButtonEl = document.getElementById("leftRailToggleButton");
  const rightRailToggleButtonEl = document.getElementById("rightRailToggleButton");
  const closeProjectSidebarButtonEl = document.getElementById("closeProjectSidebarButton");
  const closePreviewSidebarButtonEl = document.getElementById("closePreviewSidebarButton");
  const projectSidebarPanelEyebrowEl = document.getElementById("projectSidebarPanelEyebrow");
  const projectSidebarPanelTitleEl = document.getElementById("projectSidebarPanelTitle");
  const previewSidebarPanelEyebrowEl = document.getElementById("previewSidebarPanelEyebrow");
  const previewSidebarPanelTitleEl = document.getElementById("previewSidebarPanelTitle");
  const projectSidebarEl = document.getElementById("projectSidebar");
  const previewSidebarEl = document.getElementById("previewSidebar");
  const leftRailButtons = Array.from(document.querySelectorAll('.sidebar-rail-button[data-sidebar-side="left"]'));
  const rightRailButtons = Array.from(document.querySelectorAll('.sidebar-rail-button[data-sidebar-side="right"]'));
  const togglePreviewButtonEl = document.getElementById("togglePreviewButton");
  const togglePreviewLabelEl = document.getElementById("togglePreviewLabel");
  const previewVideoUrlInputEl = document.getElementById("previewVideoUrlInput");
  const previewPosterUrlInputEl = document.getElementById("previewPosterUrlInput");
  const createWorkspaceButtonEl = document.getElementById("createWorkspaceButton");
  const duplicateWorkspaceButtonEl = document.getElementById("duplicateWorkspaceButton");
  const workspaceLibraryMetaEl = document.getElementById("workspaceLibraryMeta");
  const workspaceLibraryListEl = document.getElementById("workspaceLibraryList");
  const previewVideoEl = document.getElementById("previewVideo");
  const previewVideoEmptyEl = document.getElementById("previewVideoEmpty");
  const connectionLayerEl = document.getElementById("connectionLayer");
  const aiSidebarCardEl = projectSidebarEl?.querySelector('[data-sidebar-section="ai"]');
  const leftSidebarSections = Array.from(projectSidebarEl?.querySelectorAll("[data-sidebar-section]") ?? []);
  const rightSidebarSections = Array.from(previewSidebarEl?.querySelectorAll("[data-sidebar-section]") ?? []);

  if (!aiBriefInputEl || !projectSidebarEl || !previewSidebarEl || !connectionLayerEl) {
    return;
  }

  const originalGetDefaultProject = getDefaultProject;
  const originalNormalizeProject = normalizeProject;
  const originalCloneProject = cloneProject;
  const originalCreateEmptyPanel = createEmptyPanel;
  const originalNormalizePanel = normalizePanel;
  const originalRenderProjectSidebar = renderProjectSidebar;
  const originalCreatePanelElement = createPanelElement;
  const originalRenderPanels = renderPanels;
  const originalUpdateCanvasMetrics = updateCanvasMetrics;
  const originalUpdatePanel = updatePanel;
  const originalCreateHistorySnapshot = createHistorySnapshot;
  const originalRestoreHistorySnapshot = restoreHistorySnapshot;
  const originalPersistProject = persistProject;
  const originalPersistPanels = persistPanels;
  const originalPersistViewState = persistViewState;

  let aiGenerating = false;
  let aiGenerationStageIndex = 0;
  let aiGenerationIntervalId = null;
  let aiReferenceImages = loadAiReferenceImages();
  let aiReferenceStoragePromise = null;
  let linkState = null;
  let activeLeftSidebarSections = loadSidebarSections("left");
  let activeRightSidebarSections = loadSidebarSections("right");
  let leftRailCollapsed = loadRailCollapsed("left");
  let rightRailCollapsed = loadRailCollapsed("right");
  let draggedReferenceImageId = "";
  let workspaceLibraryItems = loadWorkspaceLibraryItems();
  let activeWorkspaceId = loadActiveWorkspaceId() || "";
  let workspaceLibraryInitialized = false;
  let workspaceLibrarySyncTimeoutId = null;
  let workspaceLibrarySyncPromise = Promise.resolve();
  let workspaceImportInFlight = false;

  getDefaultProject = function overrideDefaultProject() {
    return {
      ...originalGetDefaultProject(),
      aiBrief: "",
      aiModel: "Gemini 2.5 Flash",
      referenceWeight: "2.0",
      aiSummary: "",
      previewVideoUrl: "",
      previewPosterUrl: "",
      productCategory: "",
      hasProofAssets: false,
      pattern: null,
      claimLog: []
    };
  };

  normalizeProject = function overrideNormalizeProject(candidate) {
    const base = originalNormalizeProject(candidate);
    return {
      ...base,
      aiBrief: typeof candidate?.aiBrief === "string" ? candidate.aiBrief : "",
      aiModel: typeof candidate?.aiModel === "string" && candidate.aiModel ? candidate.aiModel : "Gemini 2.5 Flash",
      referenceWeight: sanitizeReferenceWeight(candidate?.referenceWeight),
      aiSummary: typeof candidate?.aiSummary === "string" ? candidate.aiSummary : "",
      previewVideoUrl: typeof candidate?.previewVideoUrl === "string" ? candidate.previewVideoUrl : "",
      previewPosterUrl: typeof candidate?.previewPosterUrl === "string" ? candidate.previewPosterUrl : "",
      productCategory: sanitizeProductCategory(candidate?.productCategory),
      hasProofAssets: candidate?.hasProofAssets === true,
      pattern: sanitizeProjectPattern(candidate?.pattern),
      claimLog: sanitizeClaimLog(candidate?.claimLog)
    };
  };

  function sanitizeProductCategory(candidate) {
    if (typeof candidate !== "string" || !candidate) {
      return "";
    }
    const pack = typeof window !== "undefined" ? window.ShonodeAdPack : null;
    const categories = Array.isArray(pack?.productRiskCategories) ? pack.productRiskCategories : null;
    // If the pack (taxonomy) can't be consulted — e.g. its script failed to load —
    // preserve the stored string by type instead of wiping saved user data.
    if (!categories) {
      return candidate;
    }
    return categories.some((cat) => cat.id === candidate) ? candidate : "";
  }

  function sanitizeProjectPattern(candidate) {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    if (!id && !name) {
      return null;
    }

    return {
      id,
      name,
      sourceFamily: PATTERN_SOURCE_FAMILIES.includes(candidate.sourceFamily) ? candidate.sourceFamily : ""
    };
  }

  function sanitizeClaimLog(candidate) {
    if (!Array.isArray(candidate)) {
      return [];
    }

    return candidate
      .filter((entry) => entry && typeof entry === "object" && typeof entry.claimText === "string" && entry.claimText.trim())
      .slice(0, CLAIM_LOG_LIMIT)
      .map((entry) => ({
        claimText: entry.claimText,
        riskLevel: CLAIM_RISK_LEVELS.includes(entry.riskLevel) ? entry.riskLevel : "low",
        ruling: CLAIM_RULINGS.includes(entry.ruling) ? entry.ruling : "allowed",
        panelId: typeof entry.panelId === "string" ? entry.panelId : ""
      }));
  }

  cloneProject = function overrideCloneProject(projectValue = project) {
    return {
      ...originalCloneProject(projectValue),
      aiBrief: projectValue.aiBrief ?? "",
      aiModel: projectValue.aiModel ?? "Gemini 2.5 Flash",
      referenceWeight: sanitizeReferenceWeight(projectValue.referenceWeight),
      aiSummary: projectValue.aiSummary ?? "",
      previewVideoUrl: projectValue.previewVideoUrl ?? "",
      previewPosterUrl: projectValue.previewPosterUrl ?? "",
      productCategory: sanitizeProductCategory(projectValue.productCategory),
      hasProofAssets: projectValue.hasProofAssets === true,
      pattern: projectValue.pattern ? { ...projectValue.pattern } : null,
      claimLog: Array.isArray(projectValue.claimLog) ? projectValue.claimLog.map((entry) => ({ ...entry })) : []
    };
  };

  createEmptyPanel = function overrideCreateEmptyPanel(overrides = {}) {
    return originalCreateEmptyPanel({
      sceneTitle: "",
      durationLabel: "",
      beat: "",
      viewMode: "image",
      imagePromptMode: "i2i",
      t2iCollapsed: false,
      i2vCollapsed: false,
      referenceImageIds: [],
      referenceImageNames: [],
      referenceImageId: "",
      referenceImageName: "",
      t2iPrompt: "",
      i2vStartPrompt: "",
      i2vMotionPrompt: "",
      i2vEndPrompt: "",
      nextPanelIds: [],
      videoFileName: "",
      ...overrides
    });
  };

  normalizePanel = function overrideNormalizePanel(panel, index) {
    const base = originalNormalizePanel(panel, index);
    const referenceImageIds = normalizeReferenceImageIds(panel?.referenceImageIds, panel?.referenceImageId);
    const referenceImageNames = normalizeReferenceImageNames(panel?.referenceImageNames, panel?.referenceImageName);
    const imagePromptMode = panel?.imagePromptMode === "i2i" || panel?.imagePromptMode === "t2i"
      ? panel.imagePromptMode
      : referenceImageIds.length > 0
        ? "i2i"
        : typeof panel?.t2iPrompt === "string" && panel.t2iPrompt.trim()
          ? "t2i"
          : "i2i";

    return {
      ...base,
      sceneTitle: typeof panel?.sceneTitle === "string" ? panel.sceneTitle : "",
      durationLabel: typeof panel?.durationLabel === "string" ? panel.durationLabel : "",
      beat: PANEL_BEATS.includes(panel?.beat) ? panel.beat : "",
      viewMode: ["image", "t2i", "i2v", "vid"].includes(panel?.viewMode)
        ? panel.viewMode
        : panel?.viewMode === "i2t"
          ? "t2i"
          : "image",
      t2iCollapsed: Boolean(panel?.t2iCollapsed),
      i2vCollapsed: Boolean(panel?.i2vCollapsed),
      imagePromptMode,
      referenceImageIds,
      referenceImageNames,
      referenceImageId: referenceImageIds[0] || "",
      referenceImageName: referenceImageNames[0] || "",
      t2iPrompt: typeof panel?.t2iPrompt === "string" ? panel.t2iPrompt : "",
      i2vStartPrompt: typeof panel?.i2vStartPrompt === "string" ? panel.i2vStartPrompt : "",
      i2vMotionPrompt: typeof panel?.i2vMotionPrompt === "string" ? panel.i2vMotionPrompt : "",
      i2vEndPrompt: typeof panel?.i2vEndPrompt === "string" ? panel.i2vEndPrompt : "",
      nextPanelIds: Array.isArray(panel?.nextPanelIds) ? panel.nextPanelIds.filter((value) => typeof value === "string") : [],
      videoFileName: typeof panel?.videoFileName === "string" ? panel.videoFileName : ""
    };
  };

  createHistorySnapshot = function overrideCreateHistorySnapshot() {
    return {
      ...originalCreateHistorySnapshot(),
      aiReferenceImages: aiReferenceImages.map((image) => ({ ...image }))
    };
  };

  restoreHistorySnapshot = function overrideRestoreHistorySnapshot(snapshot) {
    aiReferenceImages = Array.isArray(snapshot?.aiReferenceImages)
      ? snapshot.aiReferenceImages.filter((image) => typeof image?.dataUrl === "string").slice(0, AI_REFERENCE_IMAGE_LIMIT)
      : [];

    originalRestoreHistorySnapshot(snapshot);
    persistAiReferenceImages();
    renderAiReferenceImages();
  };

  renderProjectSidebar = function overrideRenderProjectSidebar() {
    originalRenderProjectSidebar();
    aiBriefInputEl.value = project.aiBrief ?? "";
    aiModelInputEl.value = project.aiModel ?? "Gemini 2.5 Flash";
    if (aiReferenceWeightInputEl) {
      aiReferenceWeightInputEl.value = sanitizeReferenceWeight(project.referenceWeight);
    }
    if (productCategoryInputEl) {
      productCategoryInputEl.value = project.productCategory ?? "";
    }
    if (hasProofAssetsInputEl) {
      hasProofAssetsInputEl.checked = project.hasProofAssets === true;
    }
    if (creativePatternInputEl) {
      const patternId = project.pattern?.id ?? "";
      const hasOption = Array.from(creativePatternInputEl.options).some((opt) => opt.value === patternId);
      // Unknown/legacy ids (or pack absent) fall back to the auto option instead
      // of a blank select (selectedIndex -1); project.pattern itself is kept.
      creativePatternInputEl.value = hasOption ? patternId : "";
    }
    renderWorkspaceLibrary();
    renderAiReferenceImages();
    renderAiOutputs();
    renderPreviewSidebar();
    renderBeatCoverage();
    renderQcRiskBadge();
    renderPatternRecommendations();
  };

  persistProject = function overridePersistProject(...args) {
    const didPersist = originalPersistProject(...args);
    if (didPersist) {
      scheduleWorkspaceLibrarySync();
    }
    return didPersist;
  };

  persistPanels = function overridePersistPanels(...args) {
    const didPersist = originalPersistPanels(...args);
    if (didPersist) {
      scheduleWorkspaceLibrarySync();
    }
    return didPersist;
  };

  persistViewState = function overridePersistViewState(...args) {
    originalPersistViewState(...args);
    scheduleWorkspaceLibrarySync();
  };

  updatePanel = function overrideUpdatePanel(panelId, updates, options = {}) {
    originalUpdatePanel(panelId, updates, options);
    if (options.rerender === false) {
      renderAiOutputs();
      renderSelectionDetail();
      renderBeatCoverage();
    }
  };

  duplicatePanels = function overrideDuplicatePanels(panelIds) {
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
    const idMap = new Map(sourcePanels.map((panel) => [panel.id, createId()]));
    const baseLength = panels.length;
    const clones = sourcePanels.map((panel, index) =>
      normalizePanel(
        {
          ...panel,
          id: idMap.get(panel.id),
          x: clamp(panel.x + NEW_PANEL_OFFSET, PANEL_MARGIN, Math.max(PANEL_MARGIN, canvasWidth - PANEL_WIDTH - PANEL_MARGIN)),
          y: clamp(panel.y + NEW_PANEL_OFFSET, PANEL_SAFE_TOP, Math.max(PANEL_SAFE_TOP, canvasHeight - 220)),
          z: zBase + index,
          nextPanelIds: (panel.nextPanelIds ?? []).map((nextId) => idMap.get(nextId)).filter(Boolean),
          videoFileName: ""
        },
        baseLength + index
      )
    );

    panels = [...panels, ...clones];
    setSelection(clones.map((panel) => panel.id));
    persistPanels();
    updateHistoryUI();
    renderPanels();
    focusPanel(clones[0].id);
    setStatus(clones.length > 1 ? "선택한 카드를 복제했습니다." : "카드를 복제했습니다.");
  };

  deletePanels = function overrideDeletePanels(panelIds) {
    const ids = panelIds.filter(Boolean);
    if (ids.length === 0) {
      return;
    }

    const deleteSet = new Set(ids);
    if (linkState && (deleteSet.has(linkState.sourceId) || deleteSet.has(linkState.targetId))) {
      cleanupLinkDrag(false);
    }

    // Revoke video blob URLs and purge from IDB
    ids.forEach((id) => {
      const url = panelVideoBlobUrls.get(id);
      if (url) {
        URL.revokeObjectURL(url);
        panelVideoBlobUrls.delete(id);
        deletePanelVideoFromIndexedDb(id);
      }
    });

    pushHistoryState();
    const nextPanels = panels
      .filter((panel) => !deleteSet.has(panel.id))
      .map((panel, index) =>
        normalizePanel(
          {
            ...panel,
            nextPanelIds: (panel.nextPanelIds ?? []).filter((nextId) => !deleteSet.has(nextId))
          },
          index
        )
      );

    panels = nextPanels.length > 0 ? nextPanels : [createEmptyPanel({ ...getSpawnPosition(), z: 1 })];
    selectedPanelIds.clear();
    persistPanels();
    updateHistoryUI();
    renderPanels();
    setStatus(ids.length > 1 ? "선택한 카드를 삭제했습니다." : "카드를 삭제했습니다.");
  };

  createPanelElement = function overrideCreatePanelElement(panel, index) {
    const fragment = originalCreatePanelElement(panel, index);
    const card = fragment.querySelector(".story-card");
    const sceneLabelEl = fragment.querySelector(".panel-scene-label");
    const titleEl = fragment.querySelector(".panel-title");
    const durationEl = fragment.querySelector(".panel-duration");
    const beatBadgeEl = fragment.querySelector(".panel-beat-badge");
    const nextCountEl = fragment.querySelector(".panel-next-count");
    const viewButtons = fragment.querySelectorAll(".media-view-button");
    const mediaPanels = fragment.querySelectorAll(".media-panel");
    const vidUploadArea = fragment.querySelector(".vid-upload-area");
    const vidFileInput = fragment.querySelector(".vid-file-input");
    const vidPreviewWrap = fragment.querySelector(".vid-preview-wrap");
    const vidPreview = fragment.querySelector(".vid-preview");
    const vidNameEl = fragment.querySelector(".vid-name");
    const vidClearButton = fragment.querySelector(".vid-clear-button");
    const t2iInput = fragment.querySelector(".t2i-prompt-input");
    const i2vStartInput = fragment.querySelector(".i2v-start-input");
    const i2vMotionInput = fragment.querySelector(".i2v-motion-input");
    const i2vEndInput = fragment.querySelector(".i2v-end-input");
    const t2iTitleEl = fragment.querySelector("[data-prompt-title]") || fragment.querySelector(".prompt-panel-title");
    const t2iTitleTextEl = fragment.querySelector('[data-prompt-title-kind="t2i"]');
    const i2iTitleTextEl = fragment.querySelector('[data-prompt-title-kind="i2i"]');
    const t2iViewLabelEl = fragment.querySelector('[data-view-label="t2i"]');
    const referenceBookmarkListEl = fragment.querySelector(".reference-bookmark-list");
    const referenceBookmarkEl = fragment.querySelector(".reference-bookmark");
    const referenceBookmarkThumbEl = fragment.querySelector(".reference-bookmark-thumb");
    const referenceBookmarkNameEl = fragment.querySelector(".reference-bookmark-name");
    const inputPort = fragment.querySelector(".node-port--in");
    const outputPort = fragment.querySelector(".node-port--out");
    const clearLinksButton = fragment.querySelector(".clear-links-button");
    const promptToggleButtons = fragment.querySelectorAll(".prompt-toggle-button");
    const promptPanels = fragment.querySelectorAll(".prompt-panel");

    sceneLabelEl.textContent = `씬 ${String(index + 1).padStart(2, "0")}`;
    titleEl.textContent = panel.sceneTitle || `컷 ${index + 1}`;
    durationEl.textContent = panel.durationLabel || "";
    durationEl.hidden = !panel.durationLabel;
    if (beatBadgeEl) {
      const beatMeta = BEAT_META[panel.beat];
      if (beatMeta) {
        beatBadgeEl.textContent = beatMeta.label;
        beatBadgeEl.dataset.beat = panel.beat;
        beatBadgeEl.style.background = beatMeta.color;
        beatBadgeEl.hidden = false;
      } else {
        beatBadgeEl.textContent = "";
        beatBadgeEl.dataset.beat = "";
        beatBadgeEl.style.background = "";
        beatBadgeEl.hidden = true;
      }
    }
    nextCountEl.textContent = String(panel.nextPanelIds.length);
    t2iInput.value = panel.t2iPrompt;
    i2vStartInput.value = panel.i2vStartPrompt;
    i2vMotionInput.value = panel.i2vMotionPrompt;
    i2vEndInput.value = panel.i2vEndPrompt;
    if (t2iTitleTextEl && i2iTitleTextEl) {
      const isI2I = getPromptMode(panel) === "i2i";
      t2iTitleTextEl.hidden = isI2I;
      i2iTitleTextEl.hidden = !isI2I;
    } else if (t2iTitleEl) {
      t2iTitleEl.textContent = getPromptDisplayTitle(panel);
    }
    if (t2iViewLabelEl) {
      t2iViewLabelEl.textContent = getPromptDisplayLabel(panel);
    }
    syncMediaView(panel, viewButtons, mediaPanels);
    syncPromptPanels(panel, promptPanels);
    card.classList.toggle("is-link-source", linkState?.sourceId === panel.id);
    card.classList.toggle("is-link-target", linkState?.targetId === panel.id);

    const referenceImages = getPanelReferenceImages(panel);
    if (referenceBookmarkListEl) {
      referenceBookmarkListEl.innerHTML = "";
      referenceBookmarkListEl.hidden = referenceImages.length === 0;

      referenceImages.forEach((referenceItem, referenceIndex) => {
        const bookmarkEl = document.createElement("button");
        bookmarkEl.className = "reference-bookmark";
        bookmarkEl.type = "button";
        bookmarkEl.innerHTML = `
          <div class="reference-bookmark-thumb-wrap">
            <img class="reference-bookmark-thumb" alt="">
          </div>
          <div class="reference-bookmark-copy">
            <span class="reference-bookmark-label">Reference ${referenceIndex + 1}</span>
            <strong class="reference-bookmark-name"></strong>
          </div>
        `;

        const bookmarkThumbEl = bookmarkEl.querySelector(".reference-bookmark-thumb");
        const bookmarkNameEl = bookmarkEl.querySelector(".reference-bookmark-name");
        bookmarkNameEl.textContent = referenceItem.name || `reference-${referenceIndex + 1}`;

        if (referenceItem.image?.dataUrl && bookmarkThumbEl) {
          bookmarkEl.classList.add("is-clickable");
          bookmarkThumbEl.hidden = false;
          bookmarkThumbEl.src = referenceItem.image.dataUrl;
          bookmarkThumbEl.alt = `${titleEl.textContent} reference ${referenceIndex + 1}`;
          bookmarkEl.setAttribute("aria-label", `${titleEl.textContent} 레퍼런스 ${referenceIndex + 1} 확대 보기`);
          bookmarkEl.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            openReferenceLightbox(referenceItem.image, referenceItem.image.name || titleEl.textContent);
          });
        } else {
          bookmarkEl.classList.add("is-placeholder");
          bookmarkEl.disabled = true;
          if (bookmarkThumbEl) {
            bookmarkThumbEl.hidden = true;
            bookmarkThumbEl.removeAttribute("src");
            bookmarkThumbEl.alt = "";
          }
        }

        referenceBookmarkListEl.appendChild(bookmarkEl);
      });
    } else if (referenceBookmarkEl && referenceBookmarkNameEl) {
      const primaryReference = referenceImages[0];
      const referenceImage = primaryReference?.image || null;
      referenceBookmarkEl.classList.remove("is-clickable");
      referenceBookmarkEl.removeAttribute("role");
      referenceBookmarkEl.removeAttribute("tabindex");
      referenceBookmarkEl.removeAttribute("aria-label");
      if (referenceImage) {
        referenceBookmarkEl.hidden = false;
        referenceBookmarkEl.classList.add("is-clickable");
        referenceBookmarkEl.setAttribute("role", "button");
        referenceBookmarkEl.setAttribute("tabindex", "0");
        referenceBookmarkEl.setAttribute("aria-label", `${titleEl.textContent} 첨부 이미지 확대 보기`);
        referenceBookmarkNameEl.textContent = referenceImage.name || panel.referenceImageName || "연결된 레퍼런스";
        if (referenceBookmarkThumbEl) {
          referenceBookmarkThumbEl.hidden = false;
          referenceBookmarkThumbEl.src = referenceImage.dataUrl;
          referenceBookmarkThumbEl.alt = `${titleEl.textContent} 첨부 이미지`;
        }
        const openBookmarkPreview = (event) => {
          event.preventDefault();
          event.stopPropagation();
          openReferenceLightbox(referenceImage, referenceImage.name || titleEl.textContent);
        };
        referenceBookmarkEl.addEventListener("click", openBookmarkPreview);
        referenceBookmarkEl.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") {
            return;
          }
          openBookmarkPreview(event);
        });
      } else if (primaryReference?.name) {
        referenceBookmarkEl.hidden = false;
        referenceBookmarkNameEl.textContent = primaryReference.name;
        if (referenceBookmarkThumbEl) {
          referenceBookmarkThumbEl.hidden = true;
          referenceBookmarkThumbEl.removeAttribute("src");
          referenceBookmarkThumbEl.alt = "";
        }
      } else {
        referenceBookmarkEl.hidden = true;
        if (referenceBookmarkThumbEl) {
          referenceBookmarkThumbEl.hidden = true;
          referenceBookmarkThumbEl.removeAttribute("src");
          referenceBookmarkThumbEl.alt = "";
        }
      }
    }

    if (inputPort) {
      inputPort.dataset.panelId = panel.id;
      inputPort.classList.toggle("is-active", linkState?.targetId === panel.id);
      inputPort.setAttribute("aria-label", `${titleEl.textContent}로 연결 받기`);
      inputPort.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    }

    if (outputPort) {
      outputPort.dataset.panelId = panel.id;
      outputPort.classList.toggle("is-active", linkState?.sourceId === panel.id);
      outputPort.setAttribute("aria-label", `${titleEl.textContent}에서 다음 컷 연결 시작`);
      outputPort.addEventListener("pointerdown", (event) => {
        if (spacePressed || event.button !== 0) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        startLinkDrag(event, panel.id);
      });
    }

    if (clearLinksButton) {
      clearLinksButton.hidden = panel.nextPanelIds.length === 0;
      clearLinksButton.addEventListener("click", () => {
        clearPanelConnections(panel.id);
      });
    }

    promptToggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.dataset.promptKind;
        const fieldName = getPromptCollapsedField(kind);
        const promptLabel = kind === "t2i" ? getPromptDisplayLabel(panel) : kind.toUpperCase();
        if (!fieldName) {
          return;
        }

        updatePanel(panel.id, { [fieldName]: !panel[fieldName] }, { announce: false });
        setStatus(`${titleEl.textContent} ${promptLabel} 패널을 ${panel[fieldName] ? "펼쳤습니다" : "접었습니다"}.`);
      });
    });

    viewButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (panel.viewMode === button.dataset.view) {
          return;
        }

        pushHistoryState();
        updatePanel(panel.id, { viewMode: button.dataset.view }, { announce: false });
        setStatus(`${titleEl.textContent} 보기 모드를 전환했습니다.`);
      });
    });

    bindPanelPromptInput(t2iInput, panel.id, "t2iPrompt", `panel-t2i:${panel.id}`);
    bindPanelPromptInput(i2vStartInput, panel.id, "i2vStartPrompt", `panel-i2v-start:${panel.id}`);
    bindPanelPromptInput(i2vMotionInput, panel.id, "i2vMotionPrompt", `panel-i2v-motion:${panel.id}`);
    bindPanelPromptInput(i2vEndInput, panel.id, "i2vEndPrompt", `panel-i2v-end:${panel.id}`);

    // Vid panel: hydrate state
    const blobUrl = panelVideoBlobUrls.get(panel.id);
    if (blobUrl && vidPreview && vidPreviewWrap && vidUploadArea) {
      vidPreview.src = blobUrl;
      if (vidNameEl) {
        vidNameEl.textContent = panel.videoFileName || "";
      }
      vidPreviewWrap.hidden = false;
      vidUploadArea.hidden = true;
      if (vidClearButton) vidClearButton.hidden = false;
    }

    // Vid file input
    if (vidFileInput) {
      vidFileInput.addEventListener("change", async () => {
        await attachVideoToPanel(panel.id, vidFileInput.files);
        vidFileInput.value = "";
      });
    }

    // Vid upload area click (label handles it) + drag-drop
    if (vidUploadArea) {
      vidUploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        vidUploadArea.classList.add("is-dragover");
      });
      vidUploadArea.addEventListener("dragleave", (e) => {
        if (e.currentTarget === e.target) vidUploadArea.classList.remove("is-dragover");
      });
      vidUploadArea.addEventListener("drop", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        vidUploadArea.classList.remove("is-dragover");
        await attachVideoToPanel(panel.id, e.dataTransfer?.files);
      });
    }

    // Vid clear button
    if (vidClearButton) {
      vidClearButton.addEventListener("click", async () => {
        await clearVideoFromPanel(panel.id);
      });
    }

    return fragment;
  };

  renderPanels = function overrideRenderPanels(options = {}) {
    originalRenderPanels(options);
    renderConnections();
    renderAiReferenceImages();
    renderAiOutputs();
    renderSelectionDetail();
    renderBeatCoverage();
  };

  updateCanvasMetrics = function overrideUpdateCanvasMetrics() {
    originalUpdateCanvasMetrics();
    syncConnectionLayer();
    renderConnections();
  };

  bindProjectField(aiBriefInputEl, "aiBrief");
  bindProjectField(aiModelInputEl, "aiModel");
  bindProjectField(aiReferenceWeightInputEl, "referenceWeight");
  bindProjectField(previewVideoUrlInputEl, "previewVideoUrl");
  bindProjectField(previewPosterUrlInputEl, "previewPosterUrl");

  // qc_gate intake wiring: keep the risk badge live as the operator edits the
  // brief, picks a product category, or toggles proof availability.
  populateProductCategorySelect();
  populateCreativePatternSelect();
  aiBriefInputEl.addEventListener("input", () => {
    renderQcRiskBadge();
    renderPatternRecommendations();
  });
  // Discrete edits: snapshot first so each is its own undo step. These fields ride
  // in every history snapshot (cloneProject), so without this an unrelated undo
  // would silently revert the category / proof selection.
  productCategoryInputEl?.addEventListener("change", () => {
    pushHistoryState();
    updateProject({ productCategory: sanitizeProductCategory(productCategoryInputEl.value) }, { announce: false });
    renderQcRiskBadge();
    renderPatternRecommendations();
  });
  hasProofAssetsInputEl?.addEventListener("change", () => {
    pushHistoryState();
    updateProject({ hasProofAssets: hasProofAssetsInputEl.checked }, { announce: false });
    renderQcRiskBadge();
    renderPatternRecommendations();
  });
  creativePatternInputEl?.addEventListener("change", () => {
    pushHistoryState();
    updateProject({ pattern: buildPatternFromId(creativePatternInputEl.value) }, { announce: false });
    renderPatternRecommendations();
  });
  patternRecommendOutputEl?.addEventListener("click", (event) => {
    const chip = event.target.closest(".pattern-recommend__chip");
    if (!chip) {
      return;
    }
    const patternId = chip.dataset.patternId || "";
    const next = project.pattern?.id === patternId ? null : buildPatternFromId(patternId);
    pushHistoryState();
    updateProject({ pattern: next }, { announce: false });
    if (creativePatternInputEl) {
      creativePatternInputEl.value = next?.id ?? "";
    }
    renderPatternRecommendations();
  });

  // Coverage panel ↔ beat lane: clicking a coverage chip jumps into beat-lane
  // view and focuses that beat's lane.
  beatCoverageOutputEl?.addEventListener("click", (event) => {
    const chip = event.target.closest(".beat-coverage-chip");
    if (!chip || !beatCoverageOutputEl.contains(chip)) {
      return;
    }
    if (typeof focusBeatLane === "function") {
      focusBeatLane(chip.dataset.beat || "");
    }
  });

  generatePlanButtonEl.addEventListener("click", handleGeneratePlan);
  regenerateSelectionButtonEl?.addEventListener("click", handleRegenerateSelectedPanels);
  importWorkspaceInputEl?.addEventListener("change", handleImportWorkspaceInputChange);
  createWorkspaceButtonEl?.addEventListener("click", handleCreateWorkspace);
  duplicateWorkspaceButtonEl?.addEventListener("click", handleDuplicateWorkspace);
  workspaceLibraryListEl?.addEventListener("click", handleWorkspaceLibraryClick);
  togglePreviewButtonEl?.addEventListener("click", () => {
    setSidebarSections("right", activeRightSidebarSections.length > 0 ? [] : ["video"], false);
  });
  window.addEventListener("keydown", handleLinkKeyDown);
  initializeSidebarRails();
  initializeReferenceImages();

  let serverConfigCache = null;
  let codexStatusCache = null;
  let providerStatusToken = 0;

  initializeAiProviderControls();

  function initializeAiProviderControls() {
    const aiClient = window.ShonodeAI || window.ShotBoardAI;
    if (!aiProviderSelectEl || !aiClient?.getProviderSettings) {
      return;
    }

    const settings = aiClient.getProviderSettings();
    aiProviderSelectEl.value = settings.provider;
    if (openaiKeyInputEl) {
      openaiKeyInputEl.value = settings.openaiKey;
    }
    if (openaiModelInputEl && settings.openaiModel !== aiClient.openaiModel) {
      openaiModelInputEl.value = settings.openaiModel;
    }
    syncAiProviderVisibility(settings.provider);
    renderAiProviderStatus(settings.provider);

    aiProviderSelectEl.addEventListener("change", () => {
      aiClient.setProviderSettings({ provider: aiProviderSelectEl.value });
      syncAiProviderVisibility(aiProviderSelectEl.value);
      renderAiProviderStatus(aiProviderSelectEl.value);
    });
    openaiKeyInputEl?.addEventListener("change", () => {
      aiClient.setProviderSettings({ openaiKey: openaiKeyInputEl.value.trim() });
      renderAiProviderStatus(aiProviderSelectEl.value);
    });
    openaiModelInputEl?.addEventListener("change", () => {
      aiClient.setProviderSettings({ openaiModel: openaiModelInputEl.value.trim() });
    });
    aiProviderStatusRefreshEl?.addEventListener("click", () => {
      renderAiProviderStatus(aiProviderSelectEl.value, { force: true });
    });
  }

  function syncAiProviderVisibility(provider) {
    const isOpenAI = provider === "openai-byok";
    if (openaiKeyFieldEl) {
      openaiKeyFieldEl.hidden = !isOpenAI;
    }
    if (openaiModelFieldEl) {
      openaiModelFieldEl.hidden = !isOpenAI;
    }
  }

  function setProviderStatus(state, text, detail = "", showRefresh = false) {
    if (!aiProviderStatusEl) {
      return;
    }
    aiProviderStatusEl.hidden = false;
    aiProviderStatusEl.dataset.state = state;
    aiProviderStatusTextEl.textContent = text;
    aiProviderStatusDetailEl.textContent = detail;
    aiProviderStatusDetailEl.hidden = !detail;
    aiProviderStatusRefreshEl.hidden = !showRefresh;
  }

  async function renderAiProviderStatus(provider, { force = false } = {}) {
    if (!aiProviderStatusEl) {
      return;
    }
    const token = ++providerStatusToken;

    if (provider === "openai-byok") {
      const aiClient = window.ShonodeAI || window.ShotBoardAI;
      const hasKey = Boolean(aiClient?.getProviderSettings()?.openaiKey);
      setProviderStatus(
        hasKey ? "ok" : "warn",
        hasKey ? "OpenAI 키 설정됨 — 바로 생성할 수 있습니다." : "OpenAI API 키를 입력해주세요.",
        "키는 이 브라우저에만 저장되며 서버에 보관·로깅되지 않습니다."
      );
      return;
    }

    if (provider === "gemini-server") {
      setProviderStatus("checking", "서버 설정 확인 중…");
      try {
        if (!serverConfigCache || force) {
          const response = await fetch("/api/config", { headers: { Accept: "application/json" } });
          serverConfigCache = response.ok ? await response.json() : {};
        }
      } catch {
        serverConfigCache = {};
      }
      if (token !== providerStatusToken) {
        return;
      }
      const configured = Boolean(serverConfigCache?.geminiConfigured);
      setProviderStatus(
        configured ? "ok" : "warn",
        configured
          ? "서버 Gemini 키 설정됨 — 바로 생성할 수 있습니다."
          : "서버에 Gemini 키가 없습니다 — 생성 시 오프라인 초안으로 대체됩니다.",
        configured ? "" : "운영자가 GEMINI_API_KEY를 설정하거나, 다른 제공자를 선택하세요."
      );
      return;
    }

    if (provider === "codex-oauth") {
      setProviderStatus("checking", "Codex(ChatGPT 로그인) 상태 확인 중…");
      try {
        if (!codexStatusCache || force) {
          const response = await fetch("/api/codex-status", { headers: { Accept: "application/json" } });
          codexStatusCache = response.ok ? await response.json() : { available: false, reason: "unreachable" };
        }
      } catch {
        codexStatusCache = { available: false, reason: "unreachable" };
      }
      if (token !== providerStatusToken) {
        return;
      }

      const status = codexStatusCache;
      if (status.reason === "hosted") {
        setProviderStatus(
          "error",
          "호스팅 환경에서는 사용할 수 없습니다 — 로컬 실행 전용입니다.",
          "내 PC에서 `npm run dev`로 Shonode를 실행한 뒤 이 제공자를 선택하세요.",
          true
        );
      } else if (status.reason === "not_installed" || status.reason === "unreachable") {
        setProviderStatus(
          "error",
          "Codex CLI를 찾을 수 없습니다.",
          "터미널에서 `npm install -g @openai/codex` 설치 후 `codex login`을 실행하고 '다시 확인'을 누르세요.",
          true
        );
      } else if (!status.loggedIn) {
        setProviderStatus(
          "warn",
          `Codex CLI 감지됨${status.version ? ` (${status.version})` : ""} — ChatGPT 로그인이 필요합니다.`,
          "터미널에서 `codex login`을 실행해 ChatGPT 계정으로 로그인한 뒤 '다시 확인'을 누르세요.",
          true
        );
      } else {
        setProviderStatus(
          "ok",
          `ChatGPT 계정으로 로그인되어 있습니다${status.version ? ` (${status.version})` : ""} — API 키 없이 바로 생성할 수 있습니다.`,
          status.detail || "",
          true
        );
      }
    }
  }

  window.ShonodeWorkspaceBridge = {
    ...(window.ShonodeWorkspaceBridge || {}),
    createSnapshot: createWorkspaceExportSnapshot,
    closePanels: closeSidebarPanels,
    closeProjectSidebar: () => closeSidebarSide("left"),
    closePreviewSidebar: () => closeSidebarSide("right"),
    exportWorkspace: handleExportWorkspace,
    importWorkspace: importWorkspaceSnapshot,
    regenerateSelected: handleRegenerateSelectedPanels
  };

  document.body.classList.remove("is-sidebar-collapsed", "is-preview-collapsed");
  project = normalizeProject(project);
  panels = panels.map((panel, index) => normalizePanel(panel, index));
  renderProjectSidebar();
  applySidebarRailState(false);
  syncConnectionLayer();
  // Restore a persisted beat-lane view (from the last session) before rendering.
  if (typeof primeBeatLaneMode === "function") {
    primeBeatLaneMode(typeof savedView !== "undefined" && savedView?.beatLaneMode === true);
  }
  renderPanels({ restoreView: true });
  initializeWorkspaceLibrary();

  function bindProjectField(element, fieldName) {
    if (!element) {
      return;
    }

    const historyKey = `project:${fieldName}`;
    element.addEventListener("input", () => {
      captureHistoryGroup(historyKey);
      const nextValue = fieldName === "referenceWeight"
        ? sanitizeReferenceWeight(element.value)
        : element.value;
      updateProject({ [fieldName]: nextValue }, { announce: false });
      if (fieldName === "previewVideoUrl" || fieldName === "previewPosterUrl") {
        renderPreviewVideo();
      } else {
        renderAiOutputs();
      }
    });

    element.addEventListener("blur", () => {
      releaseHistoryGroup(historyKey);
    });
  }

  function loadWorkspaceLibraryItems() {
    const raw = window.localStorage.getItem(WORKSPACE_LIBRARY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return sortWorkspaceLibraryItems(
        parsed
          .map(normalizeWorkspaceLibraryItem)
          .filter(Boolean)
      );
    } catch {
      return [];
    }
  }

  function normalizeWorkspaceLibraryItem(item) {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id.trim()) {
      return null;
    }

    const createdAt = normalizeWorkspaceTimestamp(item.createdAt);
    const updatedAt = normalizeWorkspaceTimestamp(item.updatedAt, createdAt);

    return {
      id: item.id,
      title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : "새 프로젝트",
      sequence: typeof item.sequence === "string" ? item.sequence : "",
      aspectRatio: typeof item.aspectRatio === "string" ? item.aspectRatio : "",
      panelCount: Number.isFinite(item.panelCount) ? Math.max(0, Math.round(item.panelCount)) : 0,
      createdAt,
      updatedAt
    };
  }

  function normalizeWorkspaceTimestamp(value, fallback = "") {
    const timestamp = typeof value === "string" ? value : "";
    const parsed = Date.parse(timestamp);
    if (Number.isNaN(parsed)) {
      return fallback || new Date().toISOString();
    }

    return new Date(parsed).toISOString();
  }

  function sortWorkspaceLibraryItems(items) {
    return [...items].sort((left, right) => {
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });
  }

  function persistWorkspaceLibraryItems() {
    workspaceLibraryItems = sortWorkspaceLibraryItems(workspaceLibraryItems);
    window.localStorage.setItem(WORKSPACE_LIBRARY_STORAGE_KEY, JSON.stringify(workspaceLibraryItems));
  }

  function loadActiveWorkspaceId() {
    const raw = window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    return typeof raw === "string" ? raw.trim() : "";
  }

  function persistActiveWorkspaceId() {
    if (!activeWorkspaceId) {
      window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, activeWorkspaceId);
  }

  function openWorkspaceLibraryDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB is not available."));
        return;
      }

      const request = window.indexedDB.open(WORKSPACE_LIBRARY_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(WORKSPACE_LIBRARY_DB_STORE_NAME)) {
          database.createObjectStore(WORKSPACE_LIBRARY_DB_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Failed to open workspace library IndexedDB."));
    });
  }

  async function loadWorkspaceSnapshotFromDb(workspaceId) {
    if (!workspaceId) {
      return null;
    }

    try {
      const database = await openWorkspaceLibraryDb();
      const result = await new Promise((resolve, reject) => {
        const transaction = database.transaction(WORKSPACE_LIBRARY_DB_STORE_NAME, "readonly");
        const store = transaction.objectStore(WORKSPACE_LIBRARY_DB_STORE_NAME);
        const request = store.get(workspaceId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Failed to read workspace snapshot."));
      });
      database.close();

      return result && typeof result === "object" ? result : null;
    } catch (error) {
      console.warn("Failed to load workspace snapshot.", error);
      return null;
    }
  }

  async function saveWorkspaceSnapshotToDb(workspaceId, snapshot) {
    const database = await openWorkspaceLibraryDb();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(WORKSPACE_LIBRARY_DB_STORE_NAME, "readwrite");
      const store = transaction.objectStore(WORKSPACE_LIBRARY_DB_STORE_NAME);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Failed to save workspace snapshot."));
      store.put(snapshot, workspaceId);
    });
    database.close();
  }

  async function deleteWorkspaceSnapshotFromDb(workspaceId) {
    const database = await openWorkspaceLibraryDb();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(WORKSPACE_LIBRARY_DB_STORE_NAME, "readwrite");
      const store = transaction.objectStore(WORKSPACE_LIBRARY_DB_STORE_NAME);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Failed to delete workspace snapshot."));
      store.delete(workspaceId);
    });
    database.close();
  }

  function buildWorkspaceLibraryItem(workspaceId, snapshot, existingItem = null) {
    return normalizeWorkspaceLibraryItem({
      id: workspaceId,
      title: snapshot?.project?.title,
      sequence: snapshot?.project?.sequence,
      aspectRatio: snapshot?.project?.aspectRatio,
      panelCount: Array.isArray(snapshot?.panels) ? snapshot.panels.length : 0,
      createdAt: existingItem?.createdAt,
      updatedAt: new Date().toISOString()
    });
  }

  function upsertWorkspaceLibraryItem(nextItem) {
    workspaceLibraryItems = sortWorkspaceLibraryItems([
      ...workspaceLibraryItems.filter((item) => item.id !== nextItem.id),
      nextItem
    ]);
    persistWorkspaceLibraryItems();
  }

  function buildEmptyWorkspaceSnapshot() {
    return {
      version: WORKSPACE_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      project: normalizeProject({
        ...getDefaultProject(),
        title: "새 프로젝트"
      }),
      panels: createDefaultPanels().map((panel, index) => normalizePanel(panel, index)),
      referenceImages: [],
      selection: {
        panelIds: []
      },
      view: {
        zoom: 1,
        scrollLeft: 0,
        scrollTop: 0,
        beatLaneMode: false
      },
      sidebar: {
        leftSections: ["project"],
        rightSections: [],
        leftRailCollapsed: false,
        rightRailCollapsed: false
      }
    };
  }

  function buildDuplicatedWorkspaceTitle(title) {
    const baseTitle = typeof title === "string" && title.trim() ? title.trim() : "새 프로젝트";
    return /복사본$/.test(baseTitle) ? `${baseTitle} 2` : `${baseTitle} 복사본`;
  }

  function formatWorkspaceUpdatedAt(value) {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      return "방금 전";
    }

    return new Intl.DateTimeFormat("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(parsed));
  }

  function renderWorkspaceLibrary() {
    if (!workspaceLibraryListEl || !workspaceLibraryMetaEl) {
      return;
    }

    const itemCount = workspaceLibraryItems.length;
    workspaceLibraryMetaEl.textContent = itemCount > 0
      ? `총 ${itemCount}개 프로젝트 · 현재 작업은 브라우저에 자동 저장됩니다.`
      : "현재 작업은 브라우저에 자동 저장됩니다.";

    if (itemCount === 0) {
      workspaceLibraryListEl.innerHTML = '<div class="workspace-library-empty">아직 저장된 프로젝트가 없습니다. 새 프로젝트를 만들거나 현재 작업을 복제해 시작해 보세요.</div>';
      return;
    }

    workspaceLibraryListEl.innerHTML = workspaceLibraryItems.map((item) => {
      const isActive = item.id === activeWorkspaceId;
      const subtitleParts = [
        item.sequence || "시퀀스 미정",
        `${Math.max(1, item.panelCount)}컷`
      ];

      if (item.aspectRatio) {
        subtitleParts.push(item.aspectRatio);
      }

      return `
        <article class="workspace-library-item${isActive ? " is-active" : ""}">
          <button class="workspace-library-open" type="button" data-workspace-open="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)} 프로젝트 열기">
            <span class="workspace-library-title-row">
              <strong class="workspace-library-title">${escapeHtml(item.title)}</strong>
              ${isActive ? '<span class="workspace-library-badge">현재</span>' : ""}
            </span>
            <p class="workspace-library-subtitle">${escapeHtml(subtitleParts.join(" · "))}</p>
            <p class="workspace-library-time">최근 저장 ${escapeHtml(formatWorkspaceUpdatedAt(item.updatedAt))}</p>
          </button>
          <button class="ghost-button workspace-library-delete" type="button" data-workspace-delete="${escapeHtml(item.id)}">삭제</button>
        </article>
      `;
    }).join("");
  }

  function scheduleWorkspaceLibrarySync(options = {}) {
    if (!workspaceLibraryInitialized || workspaceImportInFlight || !activeWorkspaceId) {
      return;
    }

    const delay = Number.isFinite(options.delay) ? options.delay : 480;
    window.clearTimeout(workspaceLibrarySyncTimeoutId);
    workspaceLibrarySyncTimeoutId = window.setTimeout(() => {
      void syncActiveWorkspaceRecord(options);
    }, Math.max(0, delay));
  }

  async function syncActiveWorkspaceRecord(options = {}) {
    if (!activeWorkspaceId) {
      return false;
    }

    window.clearTimeout(workspaceLibrarySyncTimeoutId);
    if (workspaceImportInFlight) {
      return false;
    }

    const snapshot = createWorkspaceExportSnapshot();
    const existingItem = workspaceLibraryItems.find((item) => item.id === activeWorkspaceId) ?? null;
    const nextItem = buildWorkspaceLibraryItem(
      activeWorkspaceId,
      snapshot,
      existingItem
        ? {
            ...existingItem,
            createdAt: options.createdAt || existingItem.createdAt
          }
        : {
            createdAt: options.createdAt || new Date().toISOString()
          }
    );

    workspaceLibrarySyncPromise = workspaceLibrarySyncPromise
      .catch(() => undefined)
      .then(async () => {
        await saveWorkspaceSnapshotToDb(activeWorkspaceId, snapshot);
        upsertWorkspaceLibraryItem(nextItem);
        persistActiveWorkspaceId();
        renderWorkspaceLibrary();
      })
      .catch((error) => {
        console.warn("Failed to sync workspace library.", error);
        setStatus("프로젝트 라이브러리를 저장하지 못했습니다.", "warning");
      });

    await workspaceLibrarySyncPromise;
    return true;
  }

  async function initializeWorkspaceLibrary() {
    if (workspaceLibraryInitialized) {
      return;
    }

    workspaceLibraryInitialized = true;
    if (!activeWorkspaceId) {
      activeWorkspaceId = createId();
      persistActiveWorkspaceId();
    }

    renderWorkspaceLibrary();

    const existingSnapshot = await loadWorkspaceSnapshotFromDb(activeWorkspaceId);
    if (!existingSnapshot && !workspaceLibraryItems.some((item) => item.id === activeWorkspaceId)) {
      await syncActiveWorkspaceRecord({ createdAt: new Date().toISOString() });
      return;
    }

    await syncActiveWorkspaceRecord({
      createdAt: workspaceLibraryItems.find((item) => item.id === activeWorkspaceId)?.createdAt
    });
  }

  async function activateWorkspaceSnapshot(workspaceId, snapshot, options = {}) {
    workspaceImportInFlight = true;
    activeWorkspaceId = workspaceId;
    persistActiveWorkspaceId();

    try {
      await importWorkspaceSnapshot(snapshot);
    } finally {
      workspaceImportInFlight = false;
    }

    await syncActiveWorkspaceRecord({ createdAt: options.createdAt });
    renderWorkspaceLibrary();

    if (options.statusMessage) {
      setStatus(options.statusMessage);
    }
  }

  async function activateWorkspaceById(workspaceId, options = {}) {
    const targetItem = workspaceLibraryItems.find((item) => item.id === workspaceId);
    if (!targetItem) {
      setStatus("프로젝트 목록에서 대상을 찾지 못했습니다.", "warning");
      return;
    }

    if (workspaceId === activeWorkspaceId && !options.forceReload) {
      setStatus("이미 열려 있는 프로젝트입니다.");
      return;
    }

    const snapshot = await loadWorkspaceSnapshotFromDb(workspaceId);
    if (!snapshot) {
      setStatus("프로젝트를 불러오지 못했습니다.", "warning");
      return;
    }

    await activateWorkspaceSnapshot(workspaceId, snapshot, {
      createdAt: targetItem.createdAt,
      statusMessage: options.statusMessage || `${targetItem.title} 프로젝트를 불러왔습니다.`
    });
  }

  async function handleCreateWorkspace() {
    await syncActiveWorkspaceRecord();
    const workspaceId = createId();
    await activateWorkspaceSnapshot(workspaceId, buildEmptyWorkspaceSnapshot(), {
      createdAt: new Date().toISOString(),
      statusMessage: "새 프로젝트를 만들었습니다."
    });
  }

  async function handleDuplicateWorkspace() {
    await syncActiveWorkspaceRecord();
    const snapshot = createWorkspaceExportSnapshot();
    snapshot.project = normalizeProject({
      ...snapshot.project,
      title: buildDuplicatedWorkspaceTitle(snapshot.project?.title)
    });

    await activateWorkspaceSnapshot(createId(), snapshot, {
      createdAt: new Date().toISOString(),
      statusMessage: "현재 작업을 새 프로젝트로 복제했습니다."
    });
  }

  async function handleWorkspaceLibraryClick(event) {
    const deleteTarget = event.target.closest("[data-workspace-delete]");
    if (deleteTarget) {
      event.preventDefault();
      await handleDeleteWorkspace(deleteTarget.dataset.workspaceDelete);
      return;
    }

    const openTarget = event.target.closest("[data-workspace-open]");
    if (!openTarget) {
      return;
    }

    event.preventDefault();
    await activateWorkspaceById(openTarget.dataset.workspaceOpen);
  }

  async function handleDeleteWorkspace(workspaceId) {
    const targetItem = workspaceLibraryItems.find((item) => item.id === workspaceId);
    if (!targetItem) {
      return;
    }

    const shouldDelete = await openConfirmDialog({
      tone: "danger",
      eyebrow: "프로젝트 삭제",
      title: `${targetItem.title} 프로젝트를 삭제할까요?`,
      description: "라이브러리 목록과 저장된 스냅샷에서 함께 제거됩니다.",
      confirmLabel: "프로젝트 삭제"
    });

    if (!shouldDelete) {
      return;
    }

    await deleteWorkspaceSnapshotFromDb(workspaceId);
    workspaceLibraryItems = workspaceLibraryItems.filter((item) => item.id !== workspaceId);
    persistWorkspaceLibraryItems();

    if (workspaceId !== activeWorkspaceId) {
      renderWorkspaceLibrary();
      setStatus(`${targetItem.title} 프로젝트를 삭제했습니다.`);
      return;
    }

    if (workspaceLibraryItems.length === 0) {
      await activateWorkspaceSnapshot(createId(), buildEmptyWorkspaceSnapshot(), {
        createdAt: new Date().toISOString(),
        statusMessage: "마지막 프로젝트를 삭제하고 새 프로젝트를 만들었습니다."
      });
      return;
    }

    renderWorkspaceLibrary();
    await activateWorkspaceById(workspaceLibraryItems[0].id, {
      forceReload: true,
      statusMessage: `${targetItem.title} 프로젝트를 삭제하고 다른 프로젝트를 열었습니다.`
    });
  }

  function bindPanelPromptInput(element, panelId, fieldName, historyKey) {
    element.addEventListener("input", () => {
      captureHistoryGroup(historyKey);
      updatePanel(panelId, { [fieldName]: element.value }, { announce: false, rerender: false });
    });

    element.addEventListener("blur", () => {
      releaseHistoryGroup(historyKey);
    });
  }

  function initializeSidebarRails() {
    [...leftRailButtons, ...rightRailButtons].forEach((button) => {
      button.addEventListener("click", () => {
        toggleSidebarSection(button.dataset.sidebarSide, button.dataset.sidebarTarget);
      });
    });

    leftRailToggleButtonEl?.addEventListener("click", () => {
      toggleRailCollapsed("left");
    });

    rightRailToggleButtonEl?.addEventListener("click", () => {
      toggleRailCollapsed("right");
    });

    closeProjectSidebarButtonEl?.addEventListener("click", () => {
      closeSidebarSide("left");
    });

    closePreviewSidebarButtonEl?.addEventListener("click", () => {
      closeSidebarSide("right");
    });

    workspaceOverlayEl?.addEventListener("click", () => {
      closeSidebarPanels();
    });
  }

  function initializeReferenceImages() {
    aiReferenceDropzoneEl?.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-reference-remove]");
      if (removeButton) {
        event.preventDefault();
        event.stopPropagation();
        removeAiReferenceImage(removeButton.dataset.referenceRemove);
        return;
      }
      const previewTarget = event.target.closest("[data-reference-preview]");
      if (previewTarget) {
        event.preventDefault();
        event.stopPropagation();
        const referenceImage = getReferenceImageById(previewTarget.dataset.referencePreview);
        if (referenceImage) {
          openReferenceLightbox(referenceImage);
        }
        return;
      }
    });

    aiReferenceDropzoneEl?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      const removeButton = event.target.closest("[data-reference-remove]");
      if (removeButton) {
        return;
      }

      event.preventDefault();
      const previewTarget = event.target.closest("[data-reference-preview]");
      if (previewTarget) {
        const referenceImage = getReferenceImageById(previewTarget.dataset.referencePreview);
        if (referenceImage) {
          openReferenceLightbox(referenceImage);
        }
        return;
      }
      aiReferenceInputEl?.click();
    });

    aiReferenceDropzoneEl?.addEventListener("dragenter", (event) => {
      event.preventDefault();
      aiReferenceDropzoneEl.classList.add("is-dragover");
    });

    aiReferenceDropzoneEl?.addEventListener("dragover", (event) => {
      event.preventDefault();
      aiReferenceDropzoneEl.classList.add("is-dragover");
    });

    aiReferenceDropzoneEl?.addEventListener("dragleave", (event) => {
      if (event.currentTarget !== event.target) {
        return;
      }
      aiReferenceDropzoneEl.classList.remove("is-dragover");
    });

    aiReferenceDropzoneEl?.addEventListener("drop", async (event) => {
      event.preventDefault();
      aiReferenceDropzoneEl.classList.remove("is-dragover");
      const files = Array.from(event.dataTransfer?.files ?? []);
      await addAiReferenceFiles(files);
    });

    aiReferenceInputEl?.addEventListener("change", async () => {
      const files = Array.from(aiReferenceInputEl.files ?? []);
      await addAiReferenceFiles(files);
      aiReferenceInputEl.value = "";
    });

    aiReferenceListEl?.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-reference-remove]");
      if (!removeButton) {
        return;
      }

      removeAiReferenceImage(removeButton.dataset.referenceRemove);
    });

    referenceLightboxBackdropEl?.addEventListener("click", closeReferenceLightbox);
    referenceLightboxCloseEl?.addEventListener("click", closeReferenceLightbox);

    renderAiReferenceImages();
    initializeReferenceImageStorage();
  }

  function loadAiReferenceImages() {
    const raw = window.sessionStorage.getItem(AI_REFERENCE_IMAGES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((image) => typeof image?.dataUrl === "string").slice(0, AI_REFERENCE_IMAGE_LIMIT);
    } catch {
      return [];
    }
  }

  function initializeReferenceImageStorage() {
    if (aiReferenceStoragePromise) {
      return aiReferenceStoragePromise;
    }

    aiReferenceStoragePromise = (async () => {
      const storedImages = await loadAiReferenceImagesFromIndexedDb();
      const { images: hydratedImages, changed } = await ensureReferenceImageAccentColors(storedImages);
      if (storedImages.length > 0 && storedImages.length >= aiReferenceImages.length) {
        aiReferenceImages = hydratedImages.slice(0, AI_REFERENCE_IMAGE_LIMIT);
        if (changed) {
          await saveAiReferenceImagesToIndexedDb(aiReferenceImages);
        }
      } else if (aiReferenceImages.length > 0) {
        await saveAiReferenceImagesToIndexedDb(aiReferenceImages);
      }

      try {
        window.sessionStorage.removeItem(AI_REFERENCE_IMAGES_STORAGE_KEY);
      } catch {}

      renderAiReferenceImages();
      renderAiOutputs();
      renderPanels({ restoreView: true });
    })().catch((error) => {
      console.warn("Failed to initialize AI reference storage.", error);
    });

    return aiReferenceStoragePromise;
  }

  function openAiReferenceImageDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB is not available."));
        return;
      }

      const request = window.indexedDB.open(AI_REFERENCE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(AI_REFERENCE_DB_STORE_NAME)) {
          database.createObjectStore(AI_REFERENCE_DB_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
    });
  }

  async function loadAiReferenceImagesFromIndexedDb() {
    try {
      const database = await openAiReferenceImageDb();
      const result = await new Promise((resolve, reject) => {
        const transaction = database.transaction(AI_REFERENCE_DB_STORE_NAME, "readonly");
        const store = transaction.objectStore(AI_REFERENCE_DB_STORE_NAME);
        const request = store.get(AI_REFERENCE_DB_RECORD_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Failed to read AI references from IndexedDB."));
      });
      database.close();

      if (!Array.isArray(result)) {
        return [];
      }

      return result.filter((image) => typeof image?.dataUrl === "string").slice(0, AI_REFERENCE_IMAGE_LIMIT);
    } catch (error) {
      console.warn("Failed to load AI references from IndexedDB.", error);
      return [];
    }
  }

  async function saveAiReferenceImagesToIndexedDb(images) {
    const database = await openAiReferenceImageDb();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(AI_REFERENCE_DB_STORE_NAME, "readwrite");
      const store = transaction.objectStore(AI_REFERENCE_DB_STORE_NAME);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Failed to save AI references to IndexedDB."));
      store.put(images, AI_REFERENCE_DB_RECORD_KEY);
    });
    database.close();
  }

  function sanitizeReferenceWeight(value) {
    const numericValue = Number.parseFloat(value);
    if (!Number.isFinite(numericValue)) {
      return "2.0";
    }

    return Math.min(3, Math.max(0.5, numericValue)).toFixed(1);
  }

  function getReferenceImageById(referenceImageId) {
    if (!referenceImageId) {
      return [];
    }

    return aiReferenceImages.find((image) => image.id === referenceImageId) || null;
  }

  function normalizeReferenceImageIds(referenceImageIds, fallbackId = "") {
    const ids = Array.isArray(referenceImageIds)
      ? referenceImageIds.filter((value) => typeof value === "string" && value)
      : [];

    if (ids.length > 0) {
      return Array.from(new Set(ids));
    }

    return typeof fallbackId === "string" && fallbackId ? [fallbackId] : [];
  }

  function normalizeReferenceImageNames(referenceImageNames, fallbackName = "") {
    const names = Array.isArray(referenceImageNames)
      ? referenceImageNames
        .filter((value) => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
      : [];

    if (names.length > 0) {
      return names;
    }

    return typeof fallbackName === "string" && fallbackName.trim() ? [fallbackName.trim()] : [];
  }

  function getPanelReferenceImageIds(panel) {
    return normalizeReferenceImageIds(panel?.referenceImageIds, panel?.referenceImageId);
  }

  function getPanelReferenceImageNames(panel) {
    return normalizeReferenceImageNames(panel?.referenceImageNames, panel?.referenceImageName);
  }

  function getPanelReferenceImages(panel) {
    const ids = getPanelReferenceImageIds(panel);
    const names = getPanelReferenceImageNames(panel);
    const items = ids.map((id, index) => {
      const image = getReferenceImageById(id);
      return {
        id,
        name: image?.name || names[index] || `reference-${index + 1}`,
        image
      };
    });

    if (items.length > 0) {
      return items;
    }

    return names.map((name, index) => ({
      id: "",
      name: name || `reference-${index + 1}`,
      image: null
    }));
  }

  function getPromptMode(panel) {
    if (panel?.imagePromptMode === "i2i" || panel?.imagePromptMode === "t2i") {
      return panel.imagePromptMode;
    }

    if (getPanelReferenceImageIds(panel).length > 0) {
      return "i2i";
    }

    return typeof panel?.t2iPrompt === "string" && panel.t2iPrompt.trim() ? "t2i" : "i2i";
  }

  function getPromptDisplayLabel(panel) {
    return getPromptMode(panel).toUpperCase();
  }

  function getPromptDisplayTitle(panel) {
    return `${getPromptDisplayLabel(panel)} Prompt`;
  }

  function getReferenceSummaryText(panel) {
    const names = getPanelReferenceImages(panel)
      .map((item) => item.name)
      .filter(Boolean);

    if (names.length === 0) {
      return "레퍼런스 없음";
    }

    if (names.length === 1) {
      return `레퍼런스 ${names[0]}`;
    }

    return `레퍼런스 ${names.length}장`;
  }

  function normalizeReferenceIndexes(referenceImageIndexes, fallbackIndex = -1) {
    const indexes = Array.isArray(referenceImageIndexes)
      ? referenceImageIndexes.filter((value) => Number.isInteger(value) && value >= 0)
      : [];

    if (indexes.length > 0) {
      return Array.from(new Set(indexes));
    }

    return Number.isInteger(fallbackIndex) && fallbackIndex >= 0 ? [fallbackIndex] : [];
  }

  function normalizeImagePromptMode(mode, referenceImageIndexes, i2iPrompt = "", t2iPrompt = "") {
    const normalizedMode = typeof mode === "string" ? mode.trim().toLowerCase() : "";

    if (normalizedMode === "i2i" || normalizedMode === "t2i") {
      return normalizedMode;
    }

    if (referenceImageIndexes.length > 0 || (typeof i2iPrompt === "string" && i2iPrompt.trim())) {
      return "i2i";
    }

    return "t2i";
  }

  function ensureReferenceGuidedPrompt(prompt) {
    const normalizedPrompt = typeof prompt === "string" ? prompt.trim() : "";
    if (!normalizedPrompt) {
      return "";
    }

    const lowerPrompt = normalizedPrompt.toLowerCase();
    if (
      lowerPrompt.includes("reference image") ||
      lowerPrompt.includes("reference images") ||
      lowerPrompt.includes("source image") ||
      lowerPrompt.includes("source images") ||
      lowerPrompt.includes("transform the assigned") ||
      lowerPrompt.includes("reinterpret") ||
      lowerPrompt.includes("reimagine")
    ) {
      return normalizedPrompt;
    }

    return `Use the assigned reference images as source anchors. Recompose and redesign the scene into a fresh commercial still instead of recreating the uploaded frame literally. ${normalizedPrompt}`;
  }

  function resolveCutImagePrompt(cut) {
    const referenceImageIndexes = normalizeReferenceIndexes(cut?.referenceImageIndexes, cut?.referenceImageIndex);
    const i2iPrompt = typeof cut?.i2iPrompt === "string" ? cut.i2iPrompt.trim() : "";
    const t2iPrompt = typeof cut?.t2iPrompt === "string" ? cut.t2iPrompt.trim() : "";
    const imagePromptMode = normalizeImagePromptMode(cut?.imagePromptMode, referenceImageIndexes, i2iPrompt, t2iPrompt);
    const resolvedI2IPrompt = ensureReferenceGuidedPrompt(i2iPrompt || t2iPrompt);
    const resolvedT2IPrompt = t2iPrompt || i2iPrompt;

    return {
      imagePromptMode,
      referenceImageIndexes,
      i2iPrompt: resolvedI2IPrompt,
      t2iPrompt: resolvedT2IPrompt,
      imagePrompt: imagePromptMode === "i2i"
        ? resolvedI2IPrompt
        : resolvedT2IPrompt
    };
  }

  function resolveCutReferenceIndexes(cut, referenceImageCount = 0, fallbackIndex = 0) {
    const normalizedIndexes = normalizeReferenceIndexes(cut?.referenceImageIndexes, cut?.referenceImageIndex);
    if (normalizedIndexes.length > 0) {
      return normalizedIndexes;
    }

    if (referenceImageCount > 0) {
      return buildReferenceIndexList(referenceImageCount, fallbackIndex, referenceImageCount > 2 ? 3 : 2);
    }

    return [];
  }

  function buildReferenceIndexList(referenceCount, cutIndex, preferredCount = 2) {
    if (referenceCount <= 0) {
      return [];
    }

    const count = Math.max(1, Math.min(referenceCount, preferredCount));
    const indexes = [];

    for (let offset = 0; offset < count; offset += 1) {
      indexes.push((cutIndex + offset) % referenceCount);
    }

    return Array.from(new Set(indexes));
  }

  async function addAiReferenceFiles(files) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      return;
    }

    const remainingSlots = AI_REFERENCE_IMAGE_LIMIT - aiReferenceImages.length;
    if (remainingSlots <= 0) {
      setStatus(`첨부 이미지는 최대 ${AI_REFERENCE_IMAGE_LIMIT}장까지 추가할 수 있습니다.`, "warning");
      return;
    }

    const acceptedFiles = imageFiles.slice(0, remainingSlots);
    const processedImages = [];

    for (const file of acceptedFiles) {
      try {
        const processed = await processAiReferenceFile(file);
        if (processed) {
          processedImages.push(processed);
        }
      } catch (error) {
        console.warn("Failed to process ai reference image.", error);
      }
    }

    if (processedImages.length === 0) {
      setStatus("이미지를 읽지 못했습니다. 다른 파일로 다시 시도해 주세요.", "warning");
      return;
    }

    aiReferenceImages = [...aiReferenceImages, ...processedImages];
    await persistAiReferenceImages();
    renderAiReferenceImages();
    setStatus(`${processedImages.length}개의 첨부 이미지를 추가했습니다.`);
  }

  async function removeAiReferenceImage(referenceId) {
    const nextImages = aiReferenceImages.filter((image) => image.id !== referenceId);
    if (nextImages.length === aiReferenceImages.length) {
      return;
    }

    aiReferenceImages = nextImages;
    await persistAiReferenceImages();
    renderAiReferenceImages();
    setStatus("첨부 이미지를 제거했습니다.");
  }

  /* function renderAiReferenceImages() {
    if (!aiReferenceListEl || !aiReferenceCountEl) {
      return;
    }

    aiReferenceCountEl.textContent = `${aiReferenceImages.length}장`;
    aiReferenceListEl.innerHTML = "";
    aiReferenceListEl.hidden = aiReferenceImages.length === 0;

    aiReferenceImages.forEach((image, imageIndex) => {
      const orderLabel = String(imageIndex + 1).padStart(2, "0");
      const usageLabels = usageMap.get(image.id) ?? [];
      const visibleUsageLabels = usageLabels.slice(0, 2);
      const extraUsageCount = Math.max(0, usageLabels.length - visibleUsageLabels.length);
      const orderLabel = String(imageIndex + 1).padStart(2, "0");
      const usageLabels = usageMap.get(image.id) ?? [];
      const visibleUsageLabels = usageLabels.slice(0, 2);
      const extraUsageCount = Math.max(0, usageLabels.length - visibleUsageLabels.length);
      const item = document.createElement("article");
      item.className = "ai-reference-item";
      item.innerHTML = `
        <img class="ai-reference-thumb" src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.name || "첨부 이미지")}">
        <button class="ai-reference-remove" type="button" data-reference-remove="${escapeHtml(image.id)}" aria-label="첨부 이미지 삭제" title="첨부 이미지 삭제">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6L18 18M18 6L6 18"></path>
          </svg>
        </button>
        <div class="ai-reference-meta">
          <strong class="ai-reference-name">${escapeHtml(image.name || "reference.jpg")}</strong>
          <span class="ai-reference-size">${escapeHtml(`${image.width}×${image.height}`)}</span>
        </div>
      `;
      aiReferenceListEl.appendChild(item);
    });
  }

  } */

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });
  }

  function loadImageElement(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to decode image."));
      image.src = dataUrl;
    });
  }

  async function deriveReferenceAccentRgb(dataUrl) {
    const image = await loadImageElement(dataUrl);
    const sampleSize = 18;
    const sampleCanvas = document.createElement("canvas");
    const sampleContext = sampleCanvas.getContext("2d");

    if (!sampleContext) {
      return "37 99 235";
    }

    sampleCanvas.width = sampleSize;
    sampleCanvas.height = sampleSize;
    sampleContext.drawImage(image, 0, 0, sampleSize, sampleSize);

    const pixelData = sampleContext.getImageData(0, 0, sampleSize, sampleSize).data;
    let redTotal = 0;
    let greenTotal = 0;
    let blueTotal = 0;
    let visiblePixels = 0;

    for (let index = 0; index < pixelData.length; index += 4) {
      const alpha = pixelData[index + 3];
      if (alpha < 12) {
        continue;
      }

      redTotal += pixelData[index];
      greenTotal += pixelData[index + 1];
      blueTotal += pixelData[index + 2];
      visiblePixels += 1;
    }

    if (visiblePixels === 0) {
      return "37 99 235";
    }

    return `${Math.round(redTotal / visiblePixels)} ${Math.round(greenTotal / visiblePixels)} ${Math.round(blueTotal / visiblePixels)}`;
  }

  async function ensureReferenceImageAccentColors(images) {
    let changed = false;
    const nextImages = await Promise.all(
      images.map(async (image) => {
        if (image?.accentRgb || typeof image?.dataUrl !== "string") {
          return image;
        }

        changed = true;
        return {
          ...image,
          accentRgb: await deriveReferenceAccentRgb(image.dataUrl)
        };
      })
    );

    return { images: nextImages, changed };
  }

  function loadSidebarSections(side) {
    const key = side === "left" ? LEFT_SIDEBAR_SECTION_STORAGE_KEY : RIGHT_SIDEBAR_SECTION_STORAGE_KEY;
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const validSectionIds = new Set(getSidebarSectionIds(side));

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return getSidebarSectionIds(side).filter((sectionId) => parsed.includes(sectionId));
    } catch {
      return validSectionIds.has(raw) ? [raw] : [];
    }
  }

  function persistSidebarSections(side, values) {
    const key = side === "left" ? LEFT_SIDEBAR_SECTION_STORAGE_KEY : RIGHT_SIDEBAR_SECTION_STORAGE_KEY;
    window.localStorage.setItem(key, JSON.stringify(values));
    scheduleWorkspaceLibrarySync();
  }

  function loadRailCollapsed(side) {
    const key = side === "left" ? LEFT_RAIL_COLLAPSED_STORAGE_KEY : RIGHT_RAIL_COLLAPSED_STORAGE_KEY;
    return window.localStorage.getItem(key) === "true";
  }

  function persistRailCollapsed(side, value) {
    const key = side === "left" ? LEFT_RAIL_COLLAPSED_STORAGE_KEY : RIGHT_RAIL_COLLAPSED_STORAGE_KEY;
    window.localStorage.setItem(key, String(value));
    scheduleWorkspaceLibrarySync();
  }

  function getRailElement(side) {
    return side === "left" ? leftRailEl : rightRailEl;
  }

  function getRailButtons(side) {
    return side === "left" ? leftRailButtons : rightRailButtons;
  }

  function getSidebarSections(side) {
    return side === "left" ? leftSidebarSections : rightSidebarSections;
  }

  function getSidebarSectionIds(side) {
    return getSidebarSections(side).map((section) => section.dataset.sidebarSection);
  }

  function getSidebarElement(side) {
    return side === "left" ? projectSidebarEl : previewSidebarEl;
  }

  function getActiveSidebarSections(side) {
    return side === "left" ? activeLeftSidebarSections : activeRightSidebarSections;
  }

  function isRailCollapsed(side) {
    return side === "left" ? leftRailCollapsed : rightRailCollapsed;
  }

  function toggleRailCollapsed(side) {
    const nextValue = !isRailCollapsed(side);

    if (side === "left") {
      leftRailCollapsed = nextValue;
      if (nextValue) {
        activeLeftSidebarSections = [];
        persistSidebarSections("left", []);
      }
    } else {
      rightRailCollapsed = nextValue;
      if (nextValue) {
        activeRightSidebarSections = [];
        persistSidebarSections("right", []);
      }
    }

    persistRailCollapsed(side, nextValue);
    applySidebarRailState(false);
    setStatus(`${side === "left" ? "왼쪽" : "오른쪽"} 레일을 ${nextValue ? "접었습니다" : "펼쳤습니다"}.`);
  }

  function toggleSidebarSection(side, sectionId) {
    if (isRailCollapsed(side)) {
      if (side === "left") {
        leftRailCollapsed = false;
      } else {
        rightRailCollapsed = false;
      }
      persistRailCollapsed(side, false);
    }

    const currentSections = new Set(getActiveSidebarSections(side));
    const willActivate = !currentSections.has(sectionId);

    if (willActivate) {
      currentSections.add(sectionId);
    } else {
      currentSections.delete(sectionId);
    }

    setSidebarSections(side, Array.from(currentSections), false);
    const label = getSidebarSectionLabel(side, sectionId);
    if (label) {
      setStatus(`${label} 섹션을 ${willActivate ? "열었습니다" : "닫았습니다"}.`);
    }
  }

  function setSidebarSections(side, sectionIds, announce = true) {
    const nextSections = getSidebarSectionIds(side).filter((sectionId) => sectionIds.includes(sectionId));
    if (side === "left") {
      activeLeftSidebarSections = nextSections;
      if (nextSections.length > 0) {
        leftRailCollapsed = false;
        persistRailCollapsed("left", false);
      }
    } else {
      activeRightSidebarSections = nextSections;
      if (nextSections.length > 0) {
        rightRailCollapsed = false;
        persistRailCollapsed("right", false);
      }
    }

    persistSidebarSections(side, nextSections);
    applySidebarRailState(false);

    if (!announce) {
      return;
    }
  }

  function closeSidebarPanels(options = {}) {
    const { announce = true } = options;
    const hadOpenPanel = activeLeftSidebarSections.length > 0 || activeRightSidebarSections.length > 0;
    activeLeftSidebarSections = [];
    activeRightSidebarSections = [];
    persistSidebarSections("left", []);
    persistSidebarSections("right", []);
    applySidebarRailState(false);

    if (announce && hadOpenPanel) {
      setStatus("열린 사이드 패널을 닫았습니다.");
    }
  }

  function closeSidebarSide(side, announce = true) {
    const activeSections = side === "left" ? activeLeftSidebarSections : activeRightSidebarSections;
    const hadOpenPanel = activeSections.length > 0;
    setSidebarSections(side, [], false);

    if (!announce || !hadOpenPanel) {
      return;
    }

    setStatus(`${side === "left" ? "프로젝트" : "프리뷰"} 패널을 닫았습니다.`);
  }

  function getSidebarSectionLabel(side, sectionId) {
    const button = getRailButtons(side).find((item) => item.dataset.sidebarTarget === sectionId);
    return button?.dataset.sidebarLabel ?? "";
  }

  function syncSidebarPanelToolbar(side, activeSectionIds) {
    const eyebrowEl = side === "left" ? projectSidebarPanelEyebrowEl : previewSidebarPanelEyebrowEl;
    const titleEl = side === "left" ? projectSidebarPanelTitleEl : previewSidebarPanelTitleEl;
    const fallbackEyebrow = side === "left" ? "Project" : "Preview";
    const fallbackTitle = side === "left" ? "프로젝트 개요" : "프리뷰";

    if (!eyebrowEl || !titleEl) {
      return;
    }

    const activeSectionId = activeSectionIds[0];
    if (!activeSectionId) {
      eyebrowEl.textContent = fallbackEyebrow;
      titleEl.textContent = fallbackTitle;
      return;
    }

    const sectionEl = getSidebarSections(side).find((section) => section.dataset.sidebarSection === activeSectionId);
    const nextEyebrow = sectionEl?.querySelector(".sidebar-eyebrow")?.textContent?.trim() || fallbackEyebrow;
    const nextTitle = sectionEl?.querySelector("h2")?.textContent?.trim() || getSidebarSectionLabel(side, activeSectionId) || fallbackTitle;

    eyebrowEl.textContent = nextEyebrow;
    titleEl.textContent = nextTitle;
  }

  function applySidebarRailState() {
    applySidebarRailStateForSide("left", activeLeftSidebarSections);
    applySidebarRailStateForSide("right", activeRightSidebarSections);
    document.body.classList.remove("is-sidebar-collapsed", "is-preview-collapsed");
    workspaceMainEl?.classList.toggle("has-active-panel", activeLeftSidebarSections.length > 0 || activeRightSidebarSections.length > 0);
    applyPreviewSidebarState(false);
  }

  function applySidebarRailStateForSide(side, activeSectionIds) {
    const railEl = getRailElement(side);
    const railButtons = getRailButtons(side);
    const sections = getSidebarSections(side);
    const sidebarEl = getSidebarElement(side);
    const railCollapsed = isRailCollapsed(side);
    const toggleButton = side === "left" ? leftRailToggleButtonEl : rightRailToggleButtonEl;
    const toggleLabel = `${side === "left" ? "왼쪽" : "오른쪽"} 레일 ${railCollapsed ? "펼치기" : "접기"}`;
    const activeSectionSet = new Set(activeSectionIds);
    const isPanelOpen = activeSectionIds.length > 0;

    railEl?.classList.toggle("is-collapsed", railCollapsed);
    railEl?.classList.toggle("is-panel-open", isPanelOpen);
    railEl?.setAttribute("data-collapsed", String(railCollapsed));
    railEl?.setAttribute("data-panel-open", String(isPanelOpen));
    toggleButton?.setAttribute("aria-expanded", String(!railCollapsed));
    toggleButton?.setAttribute("aria-label", toggleLabel);

    sidebarEl.classList.toggle("is-open", isPanelOpen);
    sidebarEl.dataset.activeSections = activeSectionIds.join(",");
    sidebarEl.setAttribute("aria-hidden", isPanelOpen ? "false" : "true");

    railButtons.forEach((button) => {
      const isActive = activeSectionSet.has(button.dataset.sidebarTarget);
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
      button.setAttribute("aria-label", `${button.dataset.sidebarLabel} 패널 ${isActive ? "닫기" : "열기"}`);
    });

    sections.forEach((section) => {
      const isActive = activeSectionSet.has(section.dataset.sidebarSection);
      section.hidden = !isActive;
      section.classList.toggle("is-active", isActive);
    });

    syncSidebarPanelToolbar(side, activeSectionIds);
  }

  function startLinkDrag(event, sourceId) {
    if (linkState?.sourceId === sourceId) {
      cleanupLinkDrag(false);
      renderConnections();
      setStatus("연결 모드를 취소했습니다.");
      return;
    }

    cleanupLinkDrag(false);

    const startPoint = getPortPoint(sourceId, "out");
    if (!startPoint) {
      return;
    }

    if (!selectedPanelIds.has(sourceId)) {
      setSelection([sourceId]);
    }

    linkState = {
      pointerId: event.pointerId,
      sourceId,
      targetId: null,
      historySnapshot: createHistorySnapshot(),
      currentPoint: startPoint
    };

    document.body.classList.add("is-linking");
    updateLinkTargetStates();
    renderConnections();
    window.addEventListener("pointermove", handleLinkDragMove);
    window.addEventListener("pointerup", handleLinkDragEnd);
    window.addEventListener("pointercancel", handleLinkDragEnd);
    setStatus("다음 컷으로 연결할 카드를 선택하세요.");
  }

  function handleLinkDragMove(event) {
    if (!linkState || event.pointerId !== linkState.pointerId) {
      return;
    }

    linkState.currentPoint = clientToBoardPoint(event.clientX, event.clientY);
    linkState.targetId = getDropTargetId(event.clientX, event.clientY, linkState.sourceId);
    updateLinkTargetStates();
    renderConnections();
  }

  function handleLinkDragEnd(event) {
    if (!linkState || event.pointerId !== linkState.pointerId) {
      return;
    }

    const targetId = getDropTargetId(event.clientX, event.clientY, linkState.sourceId);
    finishLinkDrag(targetId);
  }

  function finishLinkDrag(targetId) {
    if (!linkState) {
      return;
    }

    const { sourceId, historySnapshot } = linkState;
    cleanupLinkDrag(false);

    if (!targetId || targetId === sourceId) {
      renderConnections();
      setStatus("연결을 취소했습니다.");
      return;
    }

    const sourcePanel = getPanelById(sourceId);
    if (!sourcePanel) {
      renderConnections();
      return;
    }

    const nextPanelIds = [targetId];
    const isSameLink =
      Array.isArray(sourcePanel.nextPanelIds) &&
      sourcePanel.nextPanelIds.length === nextPanelIds.length &&
      sourcePanel.nextPanelIds.every((value, index) => value === nextPanelIds[index]);

    if (isSameLink) {
      renderConnections();
      setStatus("이미 같은 컷과 연결되어 있습니다.");
      return;
    }

    pushHistoryState(historySnapshot);
    updatePanel(sourceId, { nextPanelIds }, { announce: false });
    updateHistoryUI();
    setStatus("컷 연결을 저장했습니다.");
  }

  function cleanupLinkDrag(render = true) {
    if (!linkState) {
      return;
    }

    linkState = null;
    document.body.classList.remove("is-linking");
    window.removeEventListener("pointermove", handleLinkDragMove);
    window.removeEventListener("pointerup", handleLinkDragEnd);
    window.removeEventListener("pointercancel", handleLinkDragEnd);
    updateLinkTargetStates();

    if (render) {
      renderConnections();
    }
  }

  function clearPanelConnections(panelId) {
    const panel = getPanelById(panelId);
    if (!panel || !Array.isArray(panel.nextPanelIds) || panel.nextPanelIds.length === 0) {
      return;
    }

    pushHistoryState();
    updatePanel(panelId, { nextPanelIds: [] }, { announce: false });
    updateHistoryUI();
    setStatus("컷 연결을 지웠습니다.");
  }

  function updateLinkTargetStates() {
    board.querySelectorAll(".story-card").forEach((cardEl) => {
      const panelId = cardEl.dataset.panelId;
      cardEl.classList.toggle("is-link-source", linkState?.sourceId === panelId);
      cardEl.classList.toggle("is-link-target", Boolean(linkState?.targetId) && linkState?.targetId === panelId);

      const inputPort = cardEl.querySelector(".node-port--in");
      const outputPort = cardEl.querySelector(".node-port--out");
      inputPort?.classList.toggle("is-active", linkState?.targetId === panelId);
      outputPort?.classList.toggle("is-active", linkState?.sourceId === panelId);
    });
  }

  function handleLinkKeyDown(event) {
    if (event.key !== "Escape") {
      return;
    }

    if (!referenceLightboxEl?.hidden) {
      event.preventDefault();
      closeReferenceLightbox();
      return;
    }

    if (!linkState) {
      return;
    }

    event.preventDefault();
    cleanupLinkDrag();
    setStatus("연결 모드를 취소했습니다.");
  }

  function getDropTargetId(clientX, clientY, sourceId) {
    const element = document.elementFromPoint(clientX, clientY);
    const portTargetId = element?.closest?.(".node-port--in")?.dataset?.panelId;
    if (portTargetId && portTargetId !== sourceId) {
      return portTargetId;
    }

    const cardTargetId = element?.closest?.(".story-card")?.dataset?.panelId;
    if (cardTargetId && cardTargetId !== sourceId) {
      return cardTargetId;
    }

    return null;
  }

  function getPortPoint(panelId, portType) {
    const portEl = board.querySelector(`[data-panel-id="${panelId}"] .node-port--${portType} .node-port-core`);
    if (!portEl) {
      return null;
    }

    const rect = portEl.getBoundingClientRect();
    return clientToBoardPoint(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5);
  }

  function clientToBoardPoint(clientX, clientY) {
    const viewportRect = canvasViewport.getBoundingClientRect();
    return {
      x: (canvasViewport.scrollLeft + clientX - viewportRect.left) / zoom,
      y: (canvasViewport.scrollTop + clientY - viewportRect.top) / zoom
    };
  }

  function syncMediaView(panel, buttons, stagePanels) {
    buttons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === panel.viewMode);
    });

    stagePanels.forEach((section) => {
      section.hidden = section.dataset.panelView !== panel.viewMode;
    });
  }

  function getPromptCollapsedField(kind) {
    if (kind === "t2i") {
      return "t2iCollapsed";
    }

    if (kind === "i2v") {
      return "i2vCollapsed";
    }

    return "";
  }

  function syncPromptPanels(panel, sections) {
    sections.forEach((section) => {
      const kind = section.dataset.panelView;
      const fieldName = getPromptCollapsedField(kind);
      const promptLabel = kind === "t2i" ? getPromptDisplayLabel(panel) : kind.toUpperCase();
      if (!fieldName) {
        return;
      }

      const collapsed = Boolean(panel[fieldName]);
      const body = section.querySelector(".prompt-panel-body");
      const preview = section.querySelector(".prompt-collapsed-preview");
      const button = section.querySelector(".prompt-toggle-button");

      section.classList.toggle("is-collapsed", collapsed);
      if (body) {
        body.hidden = collapsed;
      }

      if (preview) {
        preview.hidden = true;
        preview.textContent = "";
      }

      if (button) {
        button.setAttribute("aria-expanded", String(!collapsed));
        button.setAttribute("aria-label", `${promptLabel} 프롬프트 ${collapsed ? "펼치기" : "접기"}`);
        button.title = collapsed ? "프롬프트 펼치기" : "프롬프트 접기";
      }
    });
  }

  function applyPreviewSidebarState(announce = true) {
    const isOpen = activeRightSidebarSections.length > 0;
    togglePreviewButtonEl?.setAttribute("aria-expanded", String(isOpen));
    togglePreviewButtonEl?.setAttribute("aria-label", isOpen ? "프리뷰 닫기" : "프리뷰 열기");
    if (togglePreviewLabelEl) {
      togglePreviewLabelEl.textContent = isOpen ? "프리뷰 닫기" : "프리뷰 열기";
    }

    if (announce) {
      setStatus(isOpen ? "프리뷰를 펼쳤습니다." : "프리뷰를 접었습니다.");
    }
  }

  function renderPreviewSidebar() {
    previewVideoUrlInputEl.value = project.previewVideoUrl ?? "";
    previewPosterUrlInputEl.value = project.previewPosterUrl ?? "";
    renderPreviewVideo();
  }

  function renderPreviewVideo() {
    const videoUrl = (project.previewVideoUrl ?? "").trim();
    const posterUrl = (project.previewPosterUrl ?? "").trim();

    if (!videoUrl) {
      previewVideoEl.removeAttribute("src");
      previewVideoEl.removeAttribute("poster");
      previewVideoEl.classList.remove("is-visible");
      previewVideoEl.load();
      previewVideoEmptyEl.classList.remove("is-hidden");
      return;
    }

    previewVideoEl.src = videoUrl;
    if (posterUrl) {
      previewVideoEl.poster = posterUrl;
    } else {
      previewVideoEl.removeAttribute("poster");
    }
    previewVideoEl.classList.add("is-visible");
    previewVideoEmptyEl.classList.add("is-hidden");
  }

  function composeSequenceText(panel) {
    const duration = panel.durationLabel ? `${panel.durationLabel} · ` : "";
    const caption = panel.caption || "설명이 아직 없습니다.";
    return `${duration}${caption.length > 88 ? `${caption.slice(0, 87)}…` : caption}`;
  }

  function renderConnections() {
    connectionLayerEl.innerHTML = "";
    const links = collectLinks();

    links.forEach(({ fromId, toId, type }) => {
      const fromPoint = getPortPoint(fromId, "out");
      const toPoint = getPortPoint(toId, "in");
      if (!fromPoint || !toPoint) {
        return;
      }

      appendConnectionPath(fromPoint, toPoint, type);
    });

    if (linkState) {
      const fromPoint = getPortPoint(linkState.sourceId, "out");
      const toPoint =
        linkState.targetId
          ? getPortPoint(linkState.targetId, "in")
          : linkState.currentPoint;

      if (fromPoint && toPoint) {
        appendConnectionPath(fromPoint, toPoint, linkState.targetId ? "preview-target" : "preview");
      }
    }
  }

  function collectLinks() {
    const explicitLinks = panels.flatMap((panel) =>
      panel.nextPanelIds.map((nextId) => ({ fromId: panel.id, toId: nextId, type: "manual" }))
    );
    if (explicitLinks.length > 0) {
      return explicitLinks;
    }

    return panels.slice(0, -1).map((panel, index) => ({
      fromId: panel.id,
      toId: panels[index + 1].id,
      type: "suggested"
    }));
  }

  function appendConnectionPath(fromPoint, toPoint, type) {
    const curve = Math.max(60, Math.abs(toPoint.x - fromPoint.x) * 0.35);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      `M ${fromPoint.x} ${fromPoint.y} C ${fromPoint.x + curve} ${fromPoint.y}, ${toPoint.x - curve} ${toPoint.y}, ${toPoint.x} ${toPoint.y}`
    );
    path.setAttribute("class", `connection-line connection-line--${type}`);
    connectionLayerEl.appendChild(path);

    const startDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    startDot.setAttribute("cx", String(fromPoint.x));
    startDot.setAttribute("cy", String(fromPoint.y));
    startDot.setAttribute("r", type.startsWith("preview") ? "4.4" : "3.8");
    startDot.setAttribute("class", `connection-dot connection-dot--${type.startsWith("preview") ? "preview" : type}`);
    connectionLayerEl.appendChild(startDot);

    const endDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    endDot.setAttribute("cx", String(toPoint.x));
    endDot.setAttribute("cy", String(toPoint.y));
    endDot.setAttribute("r", type === "preview-target" ? "5.2" : "4");
    endDot.setAttribute("class", `connection-dot connection-dot--${type.startsWith("preview") ? "preview" : type}`);
    connectionLayerEl.appendChild(endDot);
  }

  function syncConnectionLayer() {
    connectionLayerEl.style.width = board.style.width;
    connectionLayerEl.style.height = board.style.height;
    connectionLayerEl.style.transform = board.style.transform;
    connectionLayerEl.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);
  }

  // Shared by full generation AND selected-cut regeneration so both flows honour
  // the same qc_gate ruling and creative-pattern grammar.
  // - qcDirective: claim-safe ruling as a SEPARATE field (never mutates the brief,
  //   so the local fallback's brief parsing stays clean).
  // - patternDirective: the chosen creative pattern's grammar + risk control.
  function buildGenerationDirectives(brief) {
    const pack = window.ShonodeAdPack;
    const qcRisk = pack && typeof pack.classifyProductRisk === "function"
      ? pack.classifyProductRisk({
          categoryId: project.productCategory,
          hasProof: project.hasProofAssets === true,
          brief
        })
      : null;
    const qcDirective = qcRisk && pack && typeof pack.buildQcDirective === "function"
      ? pack.buildQcDirective(qcRisk)
      : "";
    const patternDirective = project.pattern && pack && typeof pack.buildPatternDirective === "function"
      ? pack.buildPatternDirective(project.pattern, { hasProof: project.hasProofAssets === true })
      : "";
    return { qcRisk, qcDirective, patternDirective };
  }

  async function handleGeneratePlan() {
    const brief = project.aiBrief?.trim();
    if (!brief) {
      aiBriefInputEl.focus();
      setStatus("브리프를 먼저 입력해 주세요.", "warning");
      return;
    }

    setGeneratingState(true);
    pushHistoryState();
    setStatus("브리프를 분석해 컷 초안을 생성하고 있습니다.");

    try {
      const { qcRisk, qcDirective, patternDirective } = buildGenerationDirectives(brief);

      const payload = {
        brief,
        project: cloneProject(),
        qcRisk,
        qcDirective,
        patternDirective,
        existingPanelCount: panels.length,
        referenceWeight: Number.parseFloat(sanitizeReferenceWeight(project.referenceWeight)),
        referenceImageCount: aiReferenceImages.length,
        referenceImages: aiReferenceImages.map((image) => ({
          name: image.name,
          mimeType: image.mimeType,
          dataUrl: image.dataUrl,
          width: image.width,
          height: image.height
        }))
      };
      let plan = null;
      let source = "local";

      const aiClient = window.ShonodeAI || window.ShotBoardAI;
      if (aiClient && typeof aiClient.generateStoryboard === "function") {
        try {
          plan = await aiClient.generateStoryboard(payload);
          if (plan) {
            source = "api";
          }
        } catch (error) {
          console.warn("ShonodeAI.generateStoryboard failed, using local fallback.", error);
        }
      }

      if (!plan) {
        plan = buildLocalStoryboardPlan(payload);
        setStatus("AI 연결에 실패해 로컬 초안으로 대체했습니다.", "warning");
      }

      applyStoryboardPlan(normalizePlan(plan, payload), source);
    } finally {
      setGeneratingState(false);
    }
  }

  function renderGeneratingStage(index = 0) {
    const stages = getGeneratingStages();
    const safeStage = stages[index % stages.length];
    if (aiGenerationStageEl) {
      aiGenerationStageEl.textContent = safeStage.title;
    }
    if (aiGenerationHintEl) {
      aiGenerationHintEl.textContent = safeStage.hint;
    }
    if (aiPlanMetaEl) {
      aiPlanMetaEl.textContent = `${safeStage.title}...`;
    }
  }

  function setGeneratingState(nextState) {
    aiGenerating = nextState;
    generatePlanButtonEl.disabled = nextState;
    generatePlanButtonLabelEl.textContent = nextState ? "생성 중..." : "AI 콘티 초안 생성";
    generatePlanButtonEl.classList.toggle("is-generating", nextState);
    generatePlanButtonEl.setAttribute("aria-busy", String(nextState));
    if (aiGenerationIndicatorEl) {
      aiGenerationIndicatorEl.hidden = !nextState;
    }
    aiPlanMetaEl.classList.toggle("is-generating", nextState);
    aiSidebarCardEl?.classList.toggle("is-generating", nextState);
    workspaceStageEl?.classList.toggle("is-generating", nextState);

    if (nextState) {
      aiGenerationStageIndex = 0;
      renderGeneratingStage(aiGenerationStageIndex);
      window.clearInterval(aiGenerationIntervalId);
      aiGenerationIntervalId = window.setInterval(() => {
        aiGenerationStageIndex = (aiGenerationStageIndex + 1) % getGeneratingStages().length;
        renderGeneratingStage(aiGenerationStageIndex);
      }, 1150);
      return;
    }

    window.clearInterval(aiGenerationIntervalId);
    aiGenerationIntervalId = null;
    renderAiOutputs();
  }

  function normalizeProjectDraft(rawProjectDraft, payload, cuts) {
    const fallback = buildProjectDraft(payload, extractDuration(payload?.brief || ""), cuts);
    const source = rawProjectDraft && typeof rawProjectDraft === "object" ? rawProjectDraft : {};

    return {
      title: typeof source.title === "string" && source.title.trim() ? source.title.trim() : fallback.title,
      sequence: typeof source.sequence === "string" && source.sequence.trim() ? source.sequence.trim() : fallback.sequence,
      runtime: typeof source.runtime === "string" && source.runtime.trim() ? source.runtime.trim() : fallback.runtime,
      tone: typeof source.tone === "string" && source.tone.trim() ? source.tone.trim() : fallback.tone,
      logline: typeof source.logline === "string" && source.logline.trim() ? source.logline.trim() : fallback.logline,
      notes: typeof source.notes === "string" && source.notes.trim() ? source.notes.trim() : fallback.notes
    };
  }

  function buildProjectDraft(payload, duration, cuts = []) {
    const brief = payload?.brief?.trim() || "";
    const title = deriveProjectTitle(brief);
    const runtimeText = duration.min === duration.max ? `${duration.min}초` : `${duration.min}~${duration.max}초`;
    const tone = brief.includes("차갑")
      ? "고급스럽고 차가운 패션 광고 톤"
      : brief.includes("따뜻")
        ? "따뜻하고 서정적인 영상 톤"
        : "브랜드 무드가 또렷한 시네마틱 광고 톤";
    const cutCount = cuts.length > 0 ? cuts.length : Number(payload?.existingPanelCount) || 6;

    return {
      title,
      sequence: "Scene 01",
      runtime: runtimeText,
      tone,
      logline: `${runtimeText} 안에 브랜드의 태도와 감도를 또렷하게 보여주는 ${cutCount}컷 광고 콘티.`,
      notes: `${cutCount}컷 기준으로 훅, 디테일, 움직임, 엔드 프레임 순서로 구성합니다. 카메라는 절제된 이동을 유지하고, 감정선은 차분하지만 강한 인상을 남기며, 색감은 브랜드 무드에 맞춰 정리합니다.`
    };
  }

  function deriveProjectTitle(brief) {
    if (!brief) {
      return "AI 생성 프로젝트";
    }

    if (brief.includes("승마") && brief.includes("패션")) {
      return "승마 패션 브랜드 광고";
    }

    if (brief.includes("브랜드") && brief.includes("광고")) {
      return "브랜드 광고 콘티";
    }

    return brief.length > 20 ? `${brief.slice(0, 20)}…` : brief;
  }

  function withDurationInCaption(caption, durationLabel) {
    const safeCaption = typeof caption === "string" ? caption.trim() : "";
    const safeDuration = typeof durationLabel === "string" ? durationLabel.trim() : "";

    if (!safeDuration) {
      return safeCaption;
    }

    if (safeCaption.includes(safeDuration) || safeCaption.includes("분량")) {
      return safeCaption;
    }

    return `${safeDuration} 분량. ${safeCaption}`.trim();
  }

  function getGeneratedPosition(index) {
    return {
      x: PANEL_MARGIN + index * 392,
      y: PANEL_SAFE_TOP + 20
    };
  }

  function extractDuration(brief) {
    const rangeMatch = brief.match(/(\d{1,3})\s*초\s*[~\-]\s*(\d{1,3})\s*초/);
    if (rangeMatch) {
      return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };
    }

    const exactMatch = brief.match(/(\d{1,3})\s*초/);
    if (exactMatch) {
      const seconds = Number(exactMatch[1]);
      return { min: seconds, max: seconds };
    }

    return { min: 15, max: 30 };
  }

  function renderBeatCoverage() {
    if (!beatCoverageOutputEl) {
      return;
    }

    const counts = Object.fromEntries(PANEL_BEATS.map((beat) => [beat, 0]));
    let unassigned = 0;
    panels.forEach((panel) => {
      if (counts[panel.beat] !== undefined) {
        counts[panel.beat] += 1;
      } else {
        unassigned += 1;
      }
    });

    const chips = PANEL_BEATS.map((beat) => {
      const present = counts[beat] > 0;
      const meta = BEAT_META[beat];
      return `<button type="button" class="beat-coverage-chip" data-beat="${beat}" data-present="${present}" style="background:${meta.color}" title="${escapeHtml(meta.label)} 레인으로 이동">`
        + `${escapeHtml(meta.label)}<span class="beat-coverage-count">${counts[beat]}</span></button>`;
    }).join("");

    const missing = PANEL_BEATS.filter((beat) => counts[beat] === 0);
    const problems = [];
    if (missing.length > 0) {
      problems.push(`빠진 비트: ${missing.map((beat) => BEAT_META[beat].label).join(", ")}`);
    }
    if (counts.cta !== 1) {
      problems.push(`CTA는 정확히 1개여야 합니다 (현재 ${counts.cta}개)`);
    }
    if (unassigned > 0) {
      problems.push(`미지정 컷 ${unassigned}개`);
    }

    const status = problems.length === 0
      ? `<p class="beat-coverage-status beat-coverage-status--ok">계약 충족 · 6비트가 모두 채워졌습니다</p>`
      : `<ul class="beat-coverage-status beat-coverage-status--warn">${problems.map((problem) => `<li>${escapeHtml(problem)}</li>`).join("")}</ul>`;

    beatCoverageOutputEl.innerHTML = `<div class="beat-coverage-chips">${chips}</div>${status}`;
  }

  // qc_gate intake — fill the "제품 카테고리" select from the pack taxonomy so the
  // option ids/labels never drift from the classifier.
  function populateProductCategorySelect() {
    if (!productCategoryInputEl) {
      return;
    }
    const pack = window.ShonodeAdPack;
    const categories = Array.isArray(pack?.productRiskCategories) ? pack.productRiskCategories : [];
    const options = [`<option value="">카테고리 선택 (선택)</option>`]
      .concat(categories.map((cat) =>
        `<option value="${escapeHtml(cat.id)}">${escapeHtml(cat.label)}</option>`
      ))
      .join("");
    productCategoryInputEl.innerHTML = options;
  }

  // Runs the client-side qc_gate classifier and paints the risk badge next to the
  // brief. Cheap enough to call on every brief keystroke and sidebar render.
  function renderQcRiskBadge() {
    if (!qcRiskBadgeEl) {
      return;
    }
    const pack = window.ShonodeAdPack;
    if (!pack || typeof pack.classifyProductRisk !== "function") {
      qcRiskBadgeEl.hidden = true;
      return;
    }

    const result = pack.classifyProductRisk({
      categoryId: project.productCategory,
      hasProof: project.hasProofAssets === true,
      brief: project.aiBrief || ""
    });

    qcRiskBadgeEl.hidden = false;
    qcRiskBadgeEl.dataset.risk = result.level;

    const parts = [];
    parts.push(`<span class="qc-risk-badge__pill">${escapeHtml(result.headline)}</span>`);
    if (result.detected && result.categoryLabel) {
      parts.push(`<span class="qc-risk-badge__tag">브리프에서 감지: ${escapeHtml(result.categoryLabel)}</span>`);
    }
    if (result.matchedKeywords.length > 0) {
      parts.push(`<span class="qc-risk-badge__tag qc-risk-badge__tag--muted">${result.matchedKeywords.map(escapeHtml).join(" · ")}</span>`);
    }

    qcRiskBadgeEl.innerHTML =
      `<div class="qc-risk-badge__row">${parts.join("")}</div>`
      + `<p class="qc-risk-badge__detail">${escapeHtml(result.detail)}</p>`;
  }

  // pattern_selection — fill the "크리에이티브 패턴" select from the pack matrix
  // so option ids/labels never drift from the recommendation heuristic.
  function populateCreativePatternSelect() {
    if (!creativePatternInputEl) {
      return;
    }
    const pack = window.ShonodeAdPack;
    const patterns = Array.isArray(pack?.creativePatterns) ? pack.creativePatterns : [];
    const options = [`<option value="">자동 — AI가 브리프에 맞게 선택</option>`]
      .concat(patterns.map((p) =>
        `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)} · ${escapeHtml(p.when)}</option>`
      ))
      .join("");
    creativePatternInputEl.innerHTML = options;
  }

  function buildPatternFromId(patternId) {
    const pack = window.ShonodeAdPack;
    const meta = Array.isArray(pack?.creativePatterns)
      ? pack.creativePatterns.find((p) => p.id === patternId)
      : null;
    if (!meta) {
      return null;
    }
    return { id: meta.id, name: meta.label, sourceFamily: meta.sourceFamily };
  }

  // Kernel-matrix recommendations for the current intake, rendered as clickable
  // chips. Also warns when proof_experiment is chosen without proof assets.
  function renderPatternRecommendations() {
    if (!patternRecommendOutputEl) {
      return;
    }
    const pack = window.ShonodeAdPack;
    if (!pack || typeof pack.recommendPatterns !== "function") {
      patternRecommendOutputEl.hidden = true;
      return;
    }

    const brief = (project.aiBrief || "").trim();
    if (!brief) {
      patternRecommendOutputEl.hidden = true;
      return;
    }

    const input = {
      categoryId: project.productCategory,
      hasProof: project.hasProofAssets === true,
      brief
    };
    const recommendations = pack.recommendPatterns(input);
    const selectedId = project.pattern?.id || "";

    const chips = recommendations.map((p) =>
      `<button type="button" class="pattern-recommend__chip" data-pattern-id="${escapeHtml(p.id)}"`
      + ` data-selected="${p.id === selectedId}" title="${escapeHtml(p.when)} — ${escapeHtml(p.risk)}">`
      + `${escapeHtml(p.label)}</button>`
    ).join("");

    let warning = "";
    const selectedMeta = Array.isArray(pack.creativePatterns)
      ? pack.creativePatterns.find((p) => p.id === selectedId)
      : null;
    if (selectedMeta?.requiresProof && !input.hasProof) {
      warning = `<p class="pattern-recommend__warning">증빙 없이 ${escapeHtml(selectedMeta.label)} 패턴은 권장되지 않습니다 — 증거 날조 금지 규칙이 적용됩니다.</p>`;
    }

    patternRecommendOutputEl.hidden = false;
    patternRecommendOutputEl.innerHTML =
      `<span class="pattern-recommend__label">추천</span>${chips}${warning}`;
  }

  function renderSelectionDetail() {
    selectionDetailOutputEl.innerHTML = "";
    const selectedPanels = panels.filter((panel) => selectedPanelIds.has(panel.id));

    if (selectedPanels.length === 0) {
      selectionDetailOutputEl.textContent = "카드를 선택하면 연결 정보와 프롬프트 요약이 표시됩니다.";
      return;
    }

    if (selectedPanels.length > 1) {
      selectionDetailOutputEl.textContent = `${selectedPanels.length}개의 컷이 선택되었습니다. 여러 컷의 흐름을 비교하거나 복제/삭제를 진행할 수 있습니다.`;
      return;
    }

    const panel = selectedPanels[0];
    const detail = document.createElement("article");
    detail.className = "selection-detail-card";
    detail.innerHTML = `
      <strong>${escapeHtml(panel.sceneTitle || "선택된 컷")}</strong>
      <p>${escapeHtml(panel.caption || "설명 없음")}</p>
      <p>${escapeHtml([
        getReferenceSummaryText(panel),
        panel.t2iPrompt ? `${getPromptDisplayLabel(panel)} ${panel.t2iPrompt.length}자` : `${getPromptDisplayLabel(panel)} 비어 있음`,
        panel.i2vStartPrompt || panel.i2vMotionPrompt || panel.i2vEndPrompt ? "I2V 준비됨" : "I2V 비어 있음"
      ].join(" · "))}</p>
    `;
    selectionDetailOutputEl.appendChild(detail);

    const beatField = document.createElement("label");
    beatField.className = "beat-select-field";
    const beatOptions = [`<option value="">미지정</option>`]
      .concat(PANEL_BEATS.map((beat) =>
        `<option value="${beat}"${panel.beat === beat ? " selected" : ""}>${escapeHtml(BEAT_META[beat].label)}</option>`
      ))
      .join("");
    beatField.innerHTML = `<span>비트</span><select class="beat-select sidebar-input">${beatOptions}</select>`;
    selectionDetailOutputEl.appendChild(beatField);

    const beatSelect = beatField.querySelector(".beat-select");
    beatSelect.addEventListener("change", (event) => {
      const nextBeat = PANEL_BEATS.includes(event.target.value) ? event.target.value : "";
      pushHistoryState();
      // Full rerender (like the view-mode buttons) so the card badge updates
      // immediately; a <select> change is a completed discrete action, so the
      // sidebar rebuild does not disrupt typing the way a text input would.
      updatePanel(panel.id, { beat: nextBeat }, { announce: false });
    });
  }

  function getGeneratingStages() {
    if (aiReferenceImages.length > 0) {
      return [
        {
          title: "첨부 이미지 분석 중",
          hint: "업로드한 이미지를 읽고 유지할 핵심 피사체와 무드를 정리하고 있습니다."
        },
        {
          title: "컷별 첨부 이미지 배치 중",
          hint: "어떤 컷에 어떤 첨부 이미지를 묶을지 고르고 있습니다."
        },
        {
          title: "I2I / T2I / I2V 프롬프트 조합 중",
          hint: "레퍼런스를 바탕으로 이미지 생성과 영상 생성 문장을 정리하고 있습니다."
        },
        {
          title: "보드 반영 준비 중",
          hint: "생성된 컷과 프롬프트를 카드 형태로 정리하고 있습니다."
        }
      ];
    }

    return [
      {
        title: "브리프 해석 중",
        hint: "브랜드 무드와 장면 흐름을 읽고 적절한 컷 수를 계산하고 있습니다."
      },
      {
        title: "컷 흐름 설계 중",
        hint: "도입부터 엔드 프레임까지 이어지는 장면 순서를 정리하고 있습니다."
      },
      {
        title: "I2I / T2I / I2V 프롬프트 조합 중",
        hint: "컷별 프롬프트를 모델 흐름에 맞게 정리하고 있습니다."
      },
      {
        title: "보드 반영 준비 중",
        hint: "생성된 카드 위치와 프롬프트 요약을 정리하고 있습니다."
      }
    ];
  }

  function normalizePlan(rawPlan, payload) {
    const rawCuts = Array.isArray(rawPlan?.cuts) ? rawPlan.cuts : [];
    const cuts = rawCuts.length > 0 ? rawCuts : buildLocalStoryboardPlan(payload).cuts;
    const projectDraft = normalizeProjectDraft(rawPlan?.projectDraft, payload, cuts);

    return {
      summary: typeof rawPlan?.summary === "string" && rawPlan.summary.trim()
        ? rawPlan.summary.trim()
        : "브리프를 기반으로 컷 흐름과 생성 프롬프트 초안을 만들었습니다.",
      previewVideoUrl: typeof rawPlan?.previewVideoUrl === "string" ? rawPlan.previewVideoUrl : "",
      previewPosterUrl: typeof rawPlan?.previewPosterUrl === "string" ? rawPlan.previewPosterUrl : "",
      projectDraft,
      cuts: cuts.map((cut, index) => {
        const referenceImageIndexes = resolveCutReferenceIndexes(cut, Number(payload?.referenceImageCount) || 0, index);
        const promptState = resolveCutImagePrompt({
          ...cut,
          referenceImageIndexes,
          referenceImageIndex: referenceImageIndexes[0] ?? -1
        });

        return {
          sceneTitle: typeof cut.sceneTitle === "string" ? cut.sceneTitle : `${index + 1}. 컷`,
          durationLabel: typeof cut.durationLabel === "string" ? cut.durationLabel : "",
          beat: PANEL_BEATS.includes(cut.beat) ? cut.beat : "",
          caption: withDurationInCaption(
            typeof cut.caption === "string" ? cut.caption : "",
            typeof cut.durationLabel === "string" ? cut.durationLabel : ""
          ),
          referenceImageIndexes,
          referenceImageIndex: referenceImageIndexes[0] ?? -1,
          imagePromptMode: promptState.imagePromptMode,
          i2iPrompt: promptState.i2iPrompt,
          t2iPrompt: promptState.t2iPrompt,
          i2vStartPrompt: typeof cut.i2vStartPrompt === "string" ? cut.i2vStartPrompt : "",
          i2vMotionPrompt: typeof cut.i2vMotionPrompt === "string" ? cut.i2vMotionPrompt : "",
          i2vEndPrompt: typeof cut.i2vEndPrompt === "string" ? cut.i2vEndPrompt : ""
        };
      })
    };
  }

  function resolveReferenceAssignment(rawIndex, fallbackIndex = 0) {
    if (aiReferenceImages.length === 0) {
      return [];
    }

    const normalizedIndexes = normalizeReferenceIndexes(rawIndex)
      .filter((value) => value < aiReferenceImages.length);
    const referenceIndexes = normalizedIndexes.length > 0
      ? normalizedIndexes
      : buildReferenceIndexList(aiReferenceImages.length, fallbackIndex, aiReferenceImages.length > 1 ? 2 : 1);

    return referenceIndexes
      .map((referenceIndex) => {
        const image = aiReferenceImages[referenceIndex];
        return image
          ? {
              id: image.id,
              name: image.name || `reference-${referenceIndex + 1}`,
              index: referenceIndex
            }
          : null;
      })
      .filter(Boolean);

  }

  function applyStoryboardPlan(plan, source) {
    const nextPanels = plan.cuts.map((cut, index) => {
      const position = getGeneratedPosition(index);
      const existing = panels[index];
      const promptState = resolveCutImagePrompt(cut);
      const referenceAssignment = resolveReferenceAssignment(
        cut.referenceImageIndexes ?? cut.referenceImageIndex,
        index
      );

      return createEmptyPanel({
        id: existing?.id || createId(),
        x: position.x,
        y: position.y,
        z: index + 1,
        image: existing?.image || "",
        fileName: existing?.fileName || "",
        viewMode: "t2i",
        imagePromptMode: promptState.imagePromptMode,
        t2iCollapsed: false,
        i2vCollapsed: true,
        sceneTitle: cut.sceneTitle,
        durationLabel: cut.durationLabel,
        beat: cut.beat,
        caption: cut.caption,
        referenceImageIds: referenceAssignment.map((item) => item.id),
        referenceImageNames: referenceAssignment.map((item) => item.name),
        referenceImageId: referenceAssignment[0]?.id || "",
        referenceImageName: referenceAssignment[0]?.name || "",
        t2iPrompt: promptState.imagePrompt,
        i2vStartPrompt: cut.i2vStartPrompt,
        i2vMotionPrompt: cut.i2vMotionPrompt,
        i2vEndPrompt: cut.i2vEndPrompt,
        nextPanelIds: []
      });
    });

    for (let index = 0; index < nextPanels.length - 1; index += 1) {
      nextPanels[index].nextPanelIds = [nextPanels[index + 1].id];
    }

    panels = nextPanels.map((panel, index) => normalizePanel(panel, index));
    project = normalizeProject({
      ...project,
      title: plan.projectDraft.title || project.title,
      sequence: plan.projectDraft.sequence || project.sequence,
      runtime: plan.projectDraft.runtime || project.runtime,
      tone: plan.projectDraft.tone || project.tone,
      logline: plan.projectDraft.logline || project.logline,
      notes: plan.projectDraft.notes || project.notes,
      aiSummary: plan.summary,
      previewVideoUrl: plan.previewVideoUrl || project.previewVideoUrl,
      previewPosterUrl: plan.previewPosterUrl || project.previewPosterUrl
    });
    selectedPanelIds = new Set(nextPanels.length > 0 ? [nextPanels[0].id] : []);
    persistPanels();
    persistProject();
    renderProjectSidebar();
    setSidebarSections("right", plan.previewVideoUrl ? ["video", "output"] : ["output"], false);
    renderPanels({ restoreView: true });
    setStatus(source === "api" ? "AI 응답으로 콘티 초안을 반영했습니다." : "로컬 초안으로 콘티를 구성했습니다.");
  }

  function buildLocalStoryboardPlan(payload) {
    const duration = extractDuration(payload.brief);
    const average = Math.round((duration.min + duration.max) / 2);
    const cutCount = average <= 20 ? 5 : average <= 30 ? 6 : 8;
    const subject = payload.brief.split(/[.!?]/)[0].trim() || "premium equestrian fashion commercial";
    const mood = payload.brief.includes("차갑")
      ? "cool toned, refined, controlled"
      : "premium, elegant, cinematic";
    const secondsPerCut = Math.max(2, (average / cutCount).toFixed(1));
    const names = ["브랜드 훅", "루트 샷", "주인공 등장", "디테일 강조", "브랜드 아이콘", "엔드 프레임", "보조 컷", "보조 무드"];
    const beats = ["hook", "tension", "reveal", "proof", "joy", "cta", "", ""];
    const referenceCount = Number(payload?.referenceImageCount) || 0;

    return {
      summary: `총 ${cutCount}컷이 적당합니다. ${duration.min}초~${duration.max}초 안에서 컷당 약 ${secondsPerCut}초로 운영하면 브랜드 무드와 엔드 프레임까지 자연스럽게 이어집니다.`,
      projectDraft: buildProjectDraft(payload, duration),
      cuts: Array.from({ length: cutCount }, (_, index) => {
        const referenceImageIndexes = buildReferenceIndexList(referenceCount, index, referenceCount > 2 ? 3 : 2);
        const imagePromptMode = referenceImageIndexes.length > 0 ? "i2i" : "t2i";
        const basePrompt = `${subject}, ${names[index] || `shot ${index + 1}`}, premium Korean commercial still, ${mood}`;

        return {
          sceneTitle: `${index + 1}. ${names[index] || `컷 ${index + 1}`}`,
          durationLabel: `약 ${secondsPerCut}초`,
          beat: cutCount === 5 && index === 4 ? "cta" : beats[index] || "",
          caption: `약 ${secondsPerCut}초 분량. ${names[index] || `컷 ${index + 1}`}에서 ${subject}의 무드와 브랜드 톤을 또렷하게 보여줍니다.`,
          referenceImageIndexes,
          referenceImageIndex: referenceImageIndexes[0] ?? -1,
          imagePromptMode,
          i2iPrompt: imagePromptMode === "i2i"
            ? `${basePrompt}, transform and combine the assigned reference images into a newly designed advertising frame, preserve the strongest subject, styling, and mood anchors without recreating the source frame literally, premium art direction, no text, no watermark`
            : "",
          t2iPrompt: imagePromptMode === "t2i"
            ? `${basePrompt}, original text-to-image concept, premium advertising photography, elegant composition, no text, no watermark`
            : "",
          i2vStartPrompt: `${basePrompt}, start frame, derived from the redesigned still, continuity-ready commercial opening frame`,
          i2vMotionPrompt: `controlled camera motion, premium editorial pacing, preserve continuity from the redesigned still while smoothly bridging into the next shot`,
          i2vEndPrompt: `${basePrompt}, end frame, refined brand-commercial finish`
        };
      })
    };
  }

  async function processAiReferenceFile(file) {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImageElement(dataUrl);
    const maxSize = 640;
    const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const sampleSize = 18;
    const sampleCanvas = document.createElement("canvas");
    const sampleContext = sampleCanvas.getContext("2d");
    let accentRgb = "37 99 235";

    if (sampleContext) {
      sampleCanvas.width = sampleSize;
      sampleCanvas.height = sampleSize;
      sampleContext.drawImage(image, 0, 0, sampleSize, sampleSize);
      const pixelData = sampleContext.getImageData(0, 0, sampleSize, sampleSize).data;
      let redTotal = 0;
      let greenTotal = 0;
      let blueTotal = 0;
      let visiblePixels = 0;

      for (let index = 0; index < pixelData.length; index += 4) {
        const alpha = pixelData[index + 3];
        if (alpha < 12) {
          continue;
        }
        redTotal += pixelData[index];
        greenTotal += pixelData[index + 1];
        blueTotal += pixelData[index + 2];
        visiblePixels += 1;
      }

      if (visiblePixels > 0) {
        accentRgb = `${Math.round(redTotal / visiblePixels)} ${Math.round(greenTotal / visiblePixels)} ${Math.round(blueTotal / visiblePixels)}`;
      }
    }

    return {
      id: createId(),
      name: file.name,
      mimeType: "image/jpeg",
      width,
      height,
      accentRgb,
      dataUrl: canvas.toDataURL("image/jpeg", 0.74)
    };
  }

  async function persistAiReferenceImages() {
    try {
      await saveAiReferenceImagesToIndexedDb(aiReferenceImages);
      try {
        window.sessionStorage.removeItem(AI_REFERENCE_IMAGES_STORAGE_KEY);
      } catch {}
      return true;
    } catch {
      setStatus("첨부 이미지를 저장하지 못했습니다. 브라우저 저장 공간을 확인해주세요.", "warning");
      return false;
    }
  }

  function getAiReferenceThumbSize(count) {
    if (count <= 1) {
      return 116;
    }
    if (count <= 2) {
      return 98;
    }
    if (count <= 4) {
      return 78;
    }
    if (count <= 6) {
      return 64;
    }
    return 46;
  }

  function openReferenceLightbox(referenceImage, title = "") {
    if (!referenceLightboxEl || !referenceLightboxImageEl) {
      return;
    }

    const imageTitle = title || referenceImage?.name || "첨부 이미지";
    referenceLightboxTitleEl.textContent = imageTitle;
    referenceLightboxImageEl.src = referenceImage?.dataUrl || "";
    referenceLightboxImageEl.alt = imageTitle;
    if (referenceLightboxMetaEl) {
      referenceLightboxMetaEl.textContent = referenceImage
        ? [referenceImage.name, `${referenceImage.width} x ${referenceImage.height}`].filter(Boolean).join(" · ")
        : "";
    }
    referenceLightboxEl.hidden = false;
    referenceLightboxEl.setAttribute("aria-hidden", "false");
    window.setTimeout(() => {
      referenceLightboxCloseEl?.focus();
    }, 0);
  }

  function closeReferenceLightbox() {
    if (!referenceLightboxEl) {
      return;
    }

    referenceLightboxEl.hidden = true;
    referenceLightboxEl.setAttribute("aria-hidden", "true");
    if (referenceLightboxImageEl) {
      referenceLightboxImageEl.removeAttribute("src");
      referenceLightboxImageEl.alt = "";
    }
    if (referenceLightboxMetaEl) {
      referenceLightboxMetaEl.textContent = "";
    }
  }

  function renderAiOutputs() {
    aiCutCountOutputEl.textContent = panels.length > 0 ? String(panels.length) : "-";

    if (project.aiBrief?.trim()) {
      const referenceMeta = aiReferenceImages.length > 0
        ? ` · 첨부 이미지 ${aiReferenceImages.length}장 · iw ${sanitizeReferenceWeight(project.referenceWeight)}`
        : "";
      aiPlanMetaEl.textContent = `${project.aiModel || "Gemini 2.5 Flash"} 기준 브리프 초안 준비 완료${referenceMeta}`;
    } else {
      aiPlanMetaEl.textContent = "브리프와 첨부 이미지를 넣으면 컷 흐름과 프롬프트가 카드로 펼쳐집니다.";
    }

    aiSummaryOutputEl.textContent = project.aiSummary?.trim()
      ? project.aiSummary
      : "브리프를 넣고 생성하면 전체 연출 방향과 AI 결과가 여기에 정리됩니다.";

    aiSequenceOutputEl.innerHTML = "";
    panels.forEach((panel, index) => {
      const item = document.createElement("article");
      item.className = "sequence-item";
      item.innerHTML = `
        <span class="sequence-index">${index + 1}</span>
        <div>
          <strong>${escapeHtml(panel.sceneTitle || `컷 ${index + 1}`)}</strong>
          <p>${escapeHtml(composeSequenceText(panel))}</p>
        </div>
      `;
      aiSequenceOutputEl.appendChild(item);
    });

    if (panels.length === 0) {
      const emptyItem = document.createElement("article");
      emptyItem.className = "sequence-item sequence-item--empty";
      emptyItem.innerHTML = `
        <span class="sequence-index">+</span>
        <div>
          <strong>아직 생성된 컷이 없습니다</strong>
          <p>브리프와 첨부 이미지를 넣고 AI 콘티 초안 생성을 눌러주세요.</p>
        </div>
      `;
      aiSequenceOutputEl.appendChild(emptyItem);
    }
  }

  function getReferenceUsageMap() {
    const usageMap = new Map();

    panels.forEach((panel, index) => {
      getPanelReferenceImageIds(panel).forEach((referenceImageId) => {
        const usageList = usageMap.get(referenceImageId) ?? [];
        usageList.push({
          label: `S${String(index + 1).padStart(2, "0")}`,
          panelId: panel.id
        });
        usageMap.set(referenceImageId, usageList);
      });
    });

    return usageMap;
  }

  function renderAiReferenceImages() {
    if (!aiReferenceCountEl || !aiReferenceDropzoneEl) {
      return;
    }

    const count = aiReferenceImages.length;
    const usageMap = getReferenceUsageMap();
    aiReferenceCountEl.textContent = `${count} / ${AI_REFERENCE_IMAGE_LIMIT}`;

    if (aiReferenceListEl) {
      aiReferenceListEl.innerHTML = "";
      aiReferenceListEl.hidden = true;
    }

    if (!aiReferenceInlineGridEl) {
      aiReferenceDropzoneEl.classList.toggle("has-images", false);
      return;
    }

    aiReferenceInlineGridEl.innerHTML = "";
    aiReferenceInlineGridEl.hidden = count === 0;
    aiReferenceDropzoneEl.classList.toggle("has-images", count > 0);
    aiReferenceDropzoneEl.style.setProperty("--reference-thumb-size", `${getAiReferenceThumbSize(count)}px`);

    aiReferenceImages.forEach((image, imageIndex) => {
      const orderLabel = String(imageIndex + 1).padStart(2, "0");
      const usageEntries = usageMap.get(image.id) ?? [];
      const visibleUsageEntries = usageEntries.slice(0, 2);
      const extraUsageCount = Math.max(0, usageEntries.length - visibleUsageEntries.length);
      const item = document.createElement("article");
      item.className = "ai-reference-inline-item";
      item.title = image.name || "reference image";
      item.dataset.referencePreview = image.id;
      item.draggable = true;
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.setAttribute("aria-label", `${image.name || "첨부 이미지"} 크게 보기`);
      item.style.setProperty("--reference-accent-rgb", image.accentRgb || "37 99 235");
      item.innerHTML = `
        <span class="ai-reference-inline-order">${orderLabel}</span>
        <div class="ai-reference-inline-photo">
          <img class="ai-reference-inline-thumb" src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.name || "첨부 이미지")}">
        </div>
        <button class="ai-reference-inline-remove" type="button" data-reference-remove="${escapeHtml(image.id)}" aria-label="첨부 이미지 삭제" title="첨부 이미지 삭제">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6L18 18M18 6L6 18"></path>
          </svg>
        </button>
        <div class="ai-reference-inline-footer">
          <span class="ai-reference-inline-ref">REF ${orderLabel}</span>
          <div class="ai-reference-inline-scenes">
            ${visibleUsageEntries.map((entry) => `
              <span
                class="ai-reference-inline-scene-tag"
                role="button"
                tabindex="0"
                data-focus-panel-id="${escapeHtml(entry.panelId)}"
                aria-label="${escapeHtml(entry.label)} 컷으로 이동"
              >${escapeHtml(entry.label)}</span>
            `).join("")}
            ${extraUsageCount > 0 ? `<span class="ai-reference-inline-scene-tag">+${extraUsageCount}</span>` : ""}
          </div>
        </div>
      `;
      aiReferenceInlineGridEl.appendChild(item);
    });
  }

  function initializeReferenceInlineInteractions() {
    if (!aiReferenceDropzoneEl || aiReferenceDropzoneEl.dataset.inlineInteractionsReady === "true") {
      return;
    }

    aiReferenceDropzoneEl.dataset.inlineInteractionsReady = "true";

    aiReferenceDropzoneEl.addEventListener("click", (event) => {
      const sceneTag = event.target.closest("[data-focus-panel-id]");
      if (!sceneTag) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      focusPanelFromReferenceTag(sceneTag.dataset.focusPanelId);
    }, true);

    aiReferenceDropzoneEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      const sceneTag = event.target.closest("[data-focus-panel-id]");
      if (!sceneTag) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      focusPanelFromReferenceTag(sceneTag.dataset.focusPanelId);
    }, true);

    aiReferenceInlineGridEl?.addEventListener("dragstart", (event) => {
      const item = event.target.closest(".ai-reference-inline-item[data-reference-preview]");
      if (!item) {
        return;
      }

      draggedReferenceImageId = item.dataset.referencePreview || "";
      item.classList.add("is-dragging");
      event.dataTransfer?.setData("text/plain", draggedReferenceImageId);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
    });

    aiReferenceInlineGridEl?.addEventListener("dragover", (event) => {
      if (!draggedReferenceImageId) {
        return;
      }

      const targetItem = event.target.closest(".ai-reference-inline-item[data-reference-preview]");
      if (!targetItem || targetItem.dataset.referencePreview === draggedReferenceImageId) {
        return;
      }

      event.preventDefault();
      syncReferenceDropTarget(targetItem.dataset.referencePreview);
    });

    aiReferenceInlineGridEl?.addEventListener("drop", async (event) => {
      if (!draggedReferenceImageId) {
        return;
      }

      const targetItem = event.target.closest(".ai-reference-inline-item[data-reference-preview]");
      if (!targetItem) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const targetId = targetItem.dataset.referencePreview || "";
      clearReferenceDropTarget();
      const sourceId = draggedReferenceImageId;
      draggedReferenceImageId = "";
      await reorderAiReferenceImages(sourceId, targetId);
    });

    aiReferenceInlineGridEl?.addEventListener("dragend", () => {
      draggedReferenceImageId = "";
      clearReferenceDropTarget();
    });

    aiReferenceInlineGridEl?.addEventListener("dragleave", (event) => {
      const relatedTarget = event.relatedTarget;
      if (relatedTarget instanceof Node && aiReferenceInlineGridEl.contains(relatedTarget)) {
        return;
      }
      clearReferenceDropTarget();
    });
  }

  function syncReferenceDropTarget(targetId) {
    aiReferenceInlineGridEl?.querySelectorAll(".ai-reference-inline-item").forEach((item) => {
      const isDragging = item.dataset.referencePreview === draggedReferenceImageId;
      const isDropTarget = item.dataset.referencePreview === targetId;
      item.classList.toggle("is-dragging", isDragging);
      item.classList.toggle("is-drop-target", isDropTarget);
    });
  }

  function clearReferenceDropTarget() {
    aiReferenceInlineGridEl?.querySelectorAll(".ai-reference-inline-item").forEach((item) => {
      item.classList.remove("is-dragging", "is-drop-target");
    });
  }

  async function reorderAiReferenceImages(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) {
      return;
    }

    const sourceIndex = aiReferenceImages.findIndex((image) => image.id === sourceId);
    const targetIndex = aiReferenceImages.findIndex((image) => image.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }

    pushHistoryState();
    const nextImages = [...aiReferenceImages];
    const [movedImage] = nextImages.splice(sourceIndex, 1);
    nextImages.splice(targetIndex, 0, movedImage);
    aiReferenceImages = nextImages;
    await persistAiReferenceImages();
    renderAiReferenceImages();
    updateHistoryUI();
    setStatus("첨부 이미지 순서를 변경했습니다.");
  }

  function focusPanelFromReferenceTag(panelId) {
    if (!panelId || !getPanelById(panelId)) {
      return;
    }

    setSelection([panelId]);
    renderSelectionDetail();
    setSidebarSections("right", Array.from(new Set([...activeRightSidebarSections, "selection"])), false);
    focusPanel(panelId);
    setStatus("해당 씬으로 이동했습니다.");
  }

  function createWorkspaceExportSnapshot() {
    return {
      version: WORKSPACE_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      project: cloneProject(),
      panels: panels.map((panel, index) => normalizePanel(panel, index)),
      referenceImages: aiReferenceImages.map((image) => ({ ...image })),
      selection: {
        panelIds: Array.from(selectedPanelIds)
      },
      view: {
        zoom,
        scrollLeft: canvasViewport.scrollLeft,
        scrollTop: canvasViewport.scrollTop,
        beatLaneMode: isBeatLaneMode === true
      },
      sidebar: {
        leftSections: [...activeLeftSidebarSections],
        rightSections: [...activeRightSidebarSections],
        leftRailCollapsed,
        rightRailCollapsed
      }
    };
  }

  function sanitizeWorkspaceFileName(name) {
    const base = (name || "shonode-workspace")
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return base || "shonode-workspace";
  }

  async function handleExportWorkspace() {
    await window.ShonodePanelImageStorage?.ready?.();
    await window.ShonodePanelImageStorage?.flush?.();
    const snapshot = createWorkspaceExportSnapshot();
    const fileName = `${sanitizeWorkspaceFileName(project.title)}-${new Date().toISOString().slice(0, 10)}.shonode`;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/x-shonode+json" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus("프로젝트를 내보냈습니다.");
  }

  async function handleImportWorkspaceInputChange(event) {
    const file = event.target?.files?.[0];
    if (!file) {
      return;
    }

    try {
      const shouldImport = await openConfirmDialog({
        tone: "danger",
        eyebrow: "프로젝트 가져오기",
        title: "현재 작업 위에 불러올까요?",
        description: "현재 워크스페이스를 새 프로젝트 내용으로 덮어씁니다. 불러오기 전에 내보내기로 백업할 수 있습니다.",
        confirmLabel: "불러오기"
      });

      if (!shouldImport) {
        return;
      }

      const text = await file.text();
      const snapshot = JSON.parse(text);
      await importWorkspaceSnapshot(snapshot);
    } catch (error) {
      console.warn("Failed to import workspace snapshot.", error);
      setStatus("프로젝트 파일을 불러오지 못했습니다.", "warning");
    } finally {
      if (event.target) {
        event.target.value = "";
      }
    }
  }

  async function importWorkspaceSnapshot(snapshot) {
    const snapshotPanels = Array.isArray(snapshot?.panels) && snapshot.panels.length > 0
      ? snapshot.panels
      : createDefaultPanels();
    const snapshotProject = snapshot?.project && typeof snapshot.project === "object"
      ? snapshot.project
      : getDefaultProject();
    const snapshotReferenceImages = Array.isArray(snapshot?.referenceImages)
      ? snapshot.referenceImages
      : Array.isArray(snapshot?.aiReferenceImages)
        ? snapshot.aiReferenceImages
        : [];
    const safeReferenceImages = snapshotReferenceImages
      .filter((image) => typeof image?.dataUrl === "string")
      .slice(0, AI_REFERENCE_IMAGE_LIMIT)
      .map((image, index) => ({
        id: typeof image.id === "string" ? image.id : createId(),
        name: typeof image.name === "string" ? image.name : `reference-${index + 1}.jpg`,
        mimeType: typeof image.mimeType === "string" ? image.mimeType : "image/jpeg",
        width: Number.isFinite(image.width) ? image.width : 0,
        height: Number.isFinite(image.height) ? image.height : 0,
        dataUrl: image.dataUrl,
        accentRgb: typeof image.accentRgb === "string" ? image.accentRgb : ""
      }));
    const hydratedReferenceImages = await ensureReferenceImageAccentColors(safeReferenceImages);
    const sidebarSnapshot = snapshot?.sidebar && typeof snapshot.sidebar === "object" ? snapshot.sidebar : {};
    const viewSnapshot = snapshot?.view && typeof snapshot.view === "object" ? snapshot.view : {};
    const selectionIds = Array.isArray(snapshot?.selection?.panelIds)
      ? snapshot.selection.panelIds
      : Array.isArray(snapshot?.selectedPanelIds)
        ? snapshot.selectedPanelIds
        : [];

    panels = snapshotPanels.map((panel, index) => normalizePanel(panel, index));
    project = normalizeProject(snapshotProject);
    aiReferenceImages = hydratedReferenceImages.images;
    selectedPanelIds = new Set(selectionIds.filter((panelId) => panels.some((panel) => panel.id === panelId)));
    activeLeftSidebarSections = getSidebarSectionIds("left").filter((sectionId) => (sidebarSnapshot.leftSections ?? []).includes(sectionId));
    activeRightSidebarSections = getSidebarSectionIds("right").filter((sectionId) => (sidebarSnapshot.rightSections ?? []).includes(sectionId));
    leftRailCollapsed = Boolean(sidebarSnapshot.leftRailCollapsed) && activeLeftSidebarSections.length === 0;
    rightRailCollapsed = Boolean(sidebarSnapshot.rightRailCollapsed) && activeRightSidebarSections.length === 0;
    zoom = clamp(Number.isFinite(viewSnapshot.zoom) ? viewSnapshot.zoom : 1, MIN_ZOOM, MAX_ZOOM);
    pendingInitialScroll = {
      left: Number.isFinite(viewSnapshot.scrollLeft) ? viewSnapshot.scrollLeft : 0,
      top: Number.isFinite(viewSnapshot.scrollTop) ? viewSnapshot.scrollTop : 0
    };
    undoStack = [];
    redoStack = [];
    activeHistoryGroups.clear();

    persistSidebarSections("left", activeLeftSidebarSections);
    persistSidebarSections("right", activeRightSidebarSections);
    persistRailCollapsed("left", leftRailCollapsed);
    persistRailCollapsed("right", rightRailCollapsed);
    await persistAiReferenceImages();
    persistPanels();
    persistProject();
    await window.ShonodePanelImageStorage?.flush?.();
    updateZoomUI();
    renderProjectSidebar();
    applySidebarRailState(false);
    updateHistoryUI();
    if (typeof primeBeatLaneMode === "function") {
      primeBeatLaneMode(viewSnapshot.beatLaneMode === true);
    }
    renderPanels({ restoreView: true });
    window.setTimeout(() => {
      persistViewState();
    }, 120);
    setStatus("프로젝트를 불러왔습니다.");
  }

  function buildSelectedPanelsPayload(selectedPanels) {
    return selectedPanels.map((panel) => ({
      imagePromptMode: getPromptMode(panel),
      i2iPrompt: getPromptMode(panel) === "i2i" ? (panel.t2iPrompt || "") : "",
      referenceImageIds: getPanelReferenceImageIds(panel),
      referenceImageNames: getPanelReferenceImageNames(panel),
      panelId: panel.id,
      sceneTitle: panel.sceneTitle || "",
      durationLabel: panel.durationLabel || "",
      caption: panel.caption || "",
      referenceImageId: panel.referenceImageId || "",
      referenceImageName: panel.referenceImageName || "",
      referenceImageIndexes: getPanelReferenceImageIds(panel)
        .map((referenceId) => aiReferenceImages.findIndex((image) => image.id === referenceId))
        .filter((referenceIndex) => referenceIndex >= 0),
      referenceImageIndex: panel.referenceImageId
        ? aiReferenceImages.findIndex((image) => image.id === panel.referenceImageId)
        : -1,
      t2iPrompt: getPromptMode(panel) === "t2i" ? (panel.t2iPrompt || "") : "",
      i2vStartPrompt: panel.i2vStartPrompt || "",
      i2vMotionPrompt: panel.i2vMotionPrompt || "",
      i2vEndPrompt: panel.i2vEndPrompt || "",
      hasImage: Boolean(panel.image),
      fileName: panel.fileName || ""
    }));
  }

  function createSelectedFallbackCut(panel, index) {
    const sceneTitle = panel?.sceneTitle || `${index + 1}. 컷`;
    const durationLabel = panel?.durationLabel || "약 3초";
    const caption = withDurationInCaption(
      panel?.caption || `${sceneTitle}을 더 광고적으로 다듬은 컷입니다.`,
      durationLabel
    );

    return {
      sceneTitle,
      durationLabel,
      caption,
      referenceImageIndexes: normalizeReferenceIndexes(panel?.referenceImageIndexes, panel?.referenceImageIndex),
      referenceImageIndex: Number.isInteger(panel?.referenceImageIndex) ? panel.referenceImageIndex : -1,
      imagePromptMode: getPromptMode(panel || {}),
      i2iPrompt: getPromptMode(panel || {}) === "i2i" ? (panel?.t2iPrompt || "") : "",
      t2iPrompt: getPromptMode(panel || {}) === "t2i" ? (panel?.t2iPrompt || "") : "",
      i2vStartPrompt: panel?.i2vStartPrompt || "",
      i2vMotionPrompt: panel?.i2vMotionPrompt || "",
      i2vEndPrompt: panel?.i2vEndPrompt || ""
    };
  }

  function buildLocalSelectedStoryboardPlan(payload) {
    const selectedPanels = Array.isArray(payload?.selectedPanels) ? payload.selectedPanels : [];
    const duration = extractDuration(payload?.brief || "");
    const averageDuration = Math.round((duration.min + duration.max) / 2) || 18;
    const secondsPerCut = Math.max(2, Math.round(averageDuration / Math.max(selectedPanels.length, 1)));

    return {
      summary: "선택한 컷을 기준으로 프롬프트를 다시 정제했습니다.",
      projectDraft: cloneProject(),
      cuts: selectedPanels.map((panel, index) => {
        const sceneTitle = panel.sceneTitle || `${index + 1}. 컷`;
        const durationLabel = panel.durationLabel || `약 ${secondsPerCut}초`;
        const caption = withDurationInCaption(
          panel.caption || `${sceneTitle}의 핵심 이미지를 유지하면서 더 정교한 광고 컷으로 리디자인합니다.`,
          durationLabel
        );
        const promptSeed = [
          sceneTitle,
          caption,
          ...getPanelReferenceImageNames(panel).map((referenceName) => `reference ${referenceName}`),
          payload?.brief || ""
        ].filter(Boolean).join(", ");
        const referenceImageIndexes = normalizeReferenceIndexes(panel.referenceImageIndexes, panel.referenceImageIndex);
        const imagePromptMode = referenceImageIndexes.length > 0 ? "i2i" : "t2i";

        return {
          sceneTitle,
          durationLabel,
          caption,
          referenceImageIndexes,
          referenceImageIndex: referenceImageIndexes[0] ?? -1,
          imagePromptMode,
          i2iPrompt: imagePromptMode === "i2i"
            ? (panel.t2iPrompt?.trim()
              ? `${panel.t2iPrompt.trim()}, transform the assigned reference images into a fresh commercial still, keep continuity anchors but redesign the composition and advertising intent, polished premium composition, no text, no watermark`
              : `${promptSeed}, premium commercial still, transform and combine the assigned reference images into a redesigned advertising frame, elegant lighting, polished composition, no text, no watermark`)
            : "",
          t2iPrompt: imagePromptMode === "t2i"
            ? (panel.t2iPrompt?.trim()
              ? `${panel.t2iPrompt.trim()}, strengthen the composition and advertising clarity, polished premium composition, no text, no watermark`
              : `${promptSeed}, premium commercial still, original text-to-image concept, elegant lighting, polished composition, no text, no watermark`)
            : "",
          i2vStartPrompt: panel.i2vStartPrompt?.trim()
            ? `${panel.i2vStartPrompt.trim()}, refined opening frame derived from the redesigned still`
            : `${promptSeed}, opening frame derived from the redesigned still, premium commercial look`,
          i2vMotionPrompt: panel.i2vMotionPrompt?.trim()
            ? `${panel.i2vMotionPrompt.trim()}, cleaner camera rhythm, smoother motion arc, bridge naturally into the next scene`
            : "subtle cinematic camera move, controlled subject motion, refined pacing, premium commercial polish, bridge naturally into the next scene",
          i2vEndPrompt: panel.i2vEndPrompt?.trim()
            ? `${panel.i2vEndPrompt.trim()}, refined closing frame`
            : `${promptSeed}, closing frame, polished brand finish`
        };
      })
    };
  }

  function normalizeSelectedPlan(rawPlan, payload) {
    const normalized = normalizePlan(rawPlan, payload);
    const fallback = normalizePlan(buildLocalSelectedStoryboardPlan(payload), payload);
    const targetCount = Number(payload?.selectedPanelCount) || payload?.selectedPanels?.length || 0;
    const cuts = [];

    for (let index = 0; index < targetCount; index += 1) {
      cuts.push(
        normalized.cuts[index] ||
        fallback.cuts[index] ||
        createSelectedFallbackCut(payload?.selectedPanels?.[index], index)
      );
    }

    return {
      ...normalized,
      cuts
    };
  }

  function applySelectedStoryboardPlan(plan, selectedPanels, source) {
    const selectedPanelMap = new Map(selectedPanels.map((panel, index) => [panel.id, { panel, index }]));
    const nextPanels = panels.map((panel, panelIndex) => {
      const match = selectedPanelMap.get(panel.id);
      if (!match) {
        return panel;
      }

      const cut = plan.cuts[match.index] || createSelectedFallbackCut(match.panel, match.index);
      const promptState = resolveCutImagePrompt(cut);
      const referenceAssignment = resolveReferenceAssignment(
        cut.referenceImageIndexes ?? cut.referenceImageIndex,
        match.index
      );

      return normalizePanel({
        ...panel,
        viewMode: "t2i",
        imagePromptMode: promptState.imagePromptMode,
        t2iCollapsed: false,
        i2vCollapsed: true,
        sceneTitle: cut.sceneTitle,
        durationLabel: cut.durationLabel,
        caption: cut.caption,
        referenceImageIds: referenceAssignment.map((item) => item.id),
        referenceImageNames: referenceAssignment.map((item) => item.name),
        referenceImageId: referenceAssignment[0]?.id || panel.referenceImageId || "",
        referenceImageName: referenceAssignment[0]?.name || panel.referenceImageName || "",
        t2iPrompt: promptState.imagePrompt,
        i2vStartPrompt: cut.i2vStartPrompt,
        i2vMotionPrompt: cut.i2vMotionPrompt,
        i2vEndPrompt: cut.i2vEndPrompt
      }, panelIndex);
    });

    panels = nextPanels;
    project = normalizeProject({
      ...project,
      aiSummary: plan.summary || project.aiSummary,
      previewVideoUrl: plan.previewVideoUrl || project.previewVideoUrl,
      previewPosterUrl: plan.previewPosterUrl || project.previewPosterUrl
    });
    selectedPanelIds = new Set(selectedPanels.map((panel) => panel.id).filter((panelId) => nextPanels.some((panel) => panel.id === panelId)));
    persistPanels();
    persistProject();
    renderProjectSidebar();
    setSidebarSections(
      "right",
      Array.from(new Set([
        ...(plan.previewVideoUrl ? ["video"] : []),
        "output",
        "selection",
        ...activeRightSidebarSections
      ])),
      false
    );
    renderPanels({ restoreView: true });

    if (selectedPanels[0]) {
      focusPanel(selectedPanels[0].id);
    }

    setStatus(
      source === "api"
        ? "선택한 컷만 다시 AI 생성했습니다."
        : "선택한 컷을 로컬 초안으로 다시 정리했습니다."
    );
  }

  async function handleRegenerateSelectedPanels() {
    const orderedSelectedPanels = panels.filter((panel) => selectedPanelIds.has(panel.id));
    if (orderedSelectedPanels.length === 0) {
      setStatus("먼저 다시 만들 컷을 선택해주세요.", "warning");
      return;
    }

    const brief = project.aiBrief?.trim();
    if (!brief) {
      setSidebarSections("left", Array.from(new Set([...activeLeftSidebarSections, "ai"])), false);
      aiBriefInputEl.focus();
      setStatus("브리프를 먼저 입력해주세요.", "warning");
      return;
    }

    const shouldRegenerate = await openConfirmDialog({
      eyebrow: "선택 컷 재생성",
      title: `${orderedSelectedPanels.length}개의 선택 컷만 다시 생성할까요?`,
      description: "선택한 컷의 제목, 설명, T2I/I2V 프롬프트만 새로 정리합니다. 카드 위치와 연결은 그대로 유지됩니다.",
      confirmLabel: "선택 컷 재생성"
    });

    if (!shouldRegenerate) {
      return;
    }

    setGeneratingState(true);
    setStatus("선택한 컷만 다시 정리하고 있습니다.");

    try {
      const regenDirectives = buildGenerationDirectives(brief);
      const payload = {
        generationMode: "selected-panels",
        brief,
        project: cloneProject(),
        qcRisk: regenDirectives.qcRisk,
        qcDirective: regenDirectives.qcDirective,
        patternDirective: regenDirectives.patternDirective,
        selectedPanelCount: orderedSelectedPanels.length,
        selectedPanels: buildSelectedPanelsPayload(orderedSelectedPanels),
        referenceWeight: Number.parseFloat(sanitizeReferenceWeight(project.referenceWeight)),
        referenceImageCount: aiReferenceImages.length,
        referenceImages: aiReferenceImages.map((image) => ({
          name: image.name,
          mimeType: image.mimeType,
          dataUrl: image.dataUrl,
          width: image.width,
          height: image.height
        }))
      };

      let plan = null;
      let source = "local";

      const aiClient = window.ShonodeAI || window.ShotBoardAI;
      if (aiClient && typeof aiClient.generateStoryboard === "function") {
        try {
          plan = await aiClient.generateStoryboard(payload);
          if (plan) {
            source = "api";
          }
        } catch (error) {
          console.warn("ShonodeAI.generateStoryboard failed for selected panels, using local fallback.", error);
        }
      }

      if (!plan) {
        plan = buildLocalSelectedStoryboardPlan(payload);
        setStatus("AI 연결에 실패해 선택 컷을 로컬 초안으로 다시 만들었습니다.", "warning");
      }

      pushHistoryState();
      applySelectedStoryboardPlan(normalizeSelectedPlan(plan, payload), orderedSelectedPanels, source);
      updateHistoryUI();
    } finally {
      setGeneratingState(false);
    }
  }

  initializeReferenceInlineInteractions();
  renderAiReferenceImages();

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
