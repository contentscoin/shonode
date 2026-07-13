const shonodeAiClient = {
  model: "gemini-2.5-flash",
  openaiModel: "gpt-4o-mini",
  headers: {},

  // Provider settings live in localStorage so users can bring their own key.
  // "gemini-server" uses the operator's server-side key; "openai-byok" sends
  // the user's OpenAI key per request (stored only in this browser).
  // A future "openai-oauth" provider (Sign in with ChatGPT) can plug in here
  // by returning an OAuth access token from getProviderSettings().
  PROVIDER_STORAGE_KEY: "shonode-ai-provider-v1",
  OPENAI_KEY_STORAGE_KEY: "shonode-openai-key-v1",
  OPENAI_MODEL_STORAGE_KEY: "shonode-openai-model-v1",

  // Supabase access token from the cloud session (when logged in). Sent only
  // to same-origin server-key (Gemini) endpoints for credit metering.
  getAuthHeaders() {
    try {
      const token = window.ShonodeCloud?.getSession?.()?.access_token;
      return token ? { "x-shonode-auth": token } : {};
    } catch {
      return {};
    }
  },

  async readProxyError(response) {
    const raw = await response.text();
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error) {
        return `${parsed.error}${parsed.hint ? ` ${parsed.hint}` : ""}`;
      }
    } catch {
      // fall through to raw text
    }
    return raw.slice(0, 300);
  },

  get baseOrigin() {
    return window.location.protocol === "file:"
      ? "http://127.0.0.1:4173"
      : window.location.origin;
  },

  get endpoint() {
    return `${this.baseOrigin}/api/storyboard`;
  },

  get openaiEndpoint() {
    return `${this.baseOrigin}/api/storyboard-openai`;
  },

  getProviderSettings() {
    let provider = "gemini-server";
    let openaiKey = "";
    let openaiModel = "";
    try {
      provider = window.localStorage.getItem(this.PROVIDER_STORAGE_KEY) || "gemini-server";
      openaiKey = window.localStorage.getItem(this.OPENAI_KEY_STORAGE_KEY) || "";
      openaiModel = window.localStorage.getItem(this.OPENAI_MODEL_STORAGE_KEY) || "";
    } catch {
      // storage unavailable -> defaults
    }
    return {
      provider: ["openai-byok", "codex-oauth"].includes(provider) ? provider : "gemini-server",
      openaiKey: openaiKey.trim(),
      openaiModel: openaiModel.trim() || this.openaiModel
    };
  },

  setProviderSettings({ provider, openaiKey, openaiModel }) {
    try {
      if (provider !== undefined) {
        window.localStorage.setItem(this.PROVIDER_STORAGE_KEY, provider);
      }
      if (openaiKey !== undefined) {
        window.localStorage.setItem(this.OPENAI_KEY_STORAGE_KEY, openaiKey);
      }
      if (openaiModel !== undefined) {
        window.localStorage.setItem(this.OPENAI_MODEL_STORAGE_KEY, openaiModel);
      }
    } catch {
      // ignore storage failures
    }
  },

  get codexEndpoint() {
    return `${this.baseOrigin}/api/storyboard-codex`;
  },

  get imageEndpoint() {
    return `${this.baseOrigin}/api/image`;
  },

  get openaiImageEndpoint() {
    return `${this.baseOrigin}/api/image-openai`;
  },

  // Generates a keyframe still for one cut. Provider-aware:
  // gemini-server supports reference images (I2I); openai-byok is prompt-only;
  // the Codex provider does not support keyframes (callers should surface that).
  async generateKeyframe({ prompt, images = [] }) {
    const settings = this.getProviderSettings();
    const cleanPrompt = typeof prompt === "string" ? prompt.trim() : "";
    if (!cleanPrompt) {
      throw new Error("이미지 프롬프트가 비어 있습니다.");
    }

    if (settings.provider === "codex-oauth") {
      throw new Error("Codex 제공자는 키프레임 생성을 지원하지 않습니다. Gemini 또는 OpenAI 제공자를 선택하세요.");
    }

    const isOpenAI = settings.provider === "openai-byok";
    if (isOpenAI && !settings.openaiKey) {
      throw new Error("OpenAI API 키가 설정되지 않았습니다. 왼쪽 AI 패널에서 키를 입력해주세요.");
    }

    const safeImages = images
      .filter((dataUrl) => typeof dataUrl === "string" && /^data:image\//i.test(dataUrl))
      .slice(0, 4);

    const response = await fetch(isOpenAI ? this.openaiImageEndpoint : this.imageEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(isOpenAI ? { "x-openai-key": settings.openaiKey } : this.getAuthHeaders()),
        ...this.headers
      },
      body: JSON.stringify(isOpenAI ? { prompt: cleanPrompt } : { prompt: cleanPrompt, images: safeImages })
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 402) {
        throw new Error(await this.readProxyError(response));
      }
      const errorText = await response.text();
      throw new Error(`키프레임 생성 실패: ${response.status} ${errorText.slice(0, 300)}`);
    }

    const result = await response.json();
    if (typeof result?.dataUrl !== "string" || !result.dataUrl.startsWith("data:image/")) {
      throw new Error("이미지 응답이 비어 있습니다.");
    }
    return result.dataUrl;
  },

  async generateStoryboard(payload) {
    const settings = this.getProviderSettings();
    if (settings.provider === "openai-byok") {
      if (!settings.openaiKey) {
        throw new Error("OpenAI API 키가 설정되지 않았습니다. 왼쪽 AI 패널에서 키를 입력해주세요.");
      }
      return this.generateStoryboardOpenAI(payload, settings);
    }
    if (settings.provider === "codex-oauth") {
      return this.generateStoryboardCodex(payload);
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
        ...this.headers
      },
      body: JSON.stringify({
        model: this.model,
        request: this.buildRequest(payload)
      })
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 402) {
        throw new Error(await this.readProxyError(response));
      }
      const errorText = await response.text();
      throw new Error(`Shonode AI proxy failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return this.mapResponse(result);
  },

  async generateStoryboardOpenAI(payload, settings) {
    const response = await fetch(this.openaiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-openai-key": settings.openaiKey,
        ...this.headers
      },
      body: JSON.stringify({
        model: settings.openaiModel,
        request: this.buildOpenAIRequest(payload)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shonode OpenAI proxy failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return this.mapOpenAIResponse(result);
  },

  async generateStoryboardCodex(payload) {
    const prompt = [
      this.buildPrompt(payload),
      "",
      "Output contract: respond with ONLY one JSON object (no markdown, no commentary) matching this JSON Schema:",
      JSON.stringify(this.buildPlanJsonSchema())
    ].join("\n");

    const images = (payload?.referenceImages || [])
      .map((image) => (typeof image?.dataUrl === "string" && /^data:image\//i.test(image.dataUrl) ? image.dataUrl : null))
      .filter(Boolean);

    const response = await fetch(this.codexEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.headers
      },
      body: JSON.stringify({ prompt, images })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shonode Codex proxy failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const content = typeof result?.content === "string" ? result.content.trim() : "";
    if (!content) {
      throw new Error("Codex returned no content.");
    }

    let parsed;
    try {
      parsed = JSON.parse(this.extractJsonBlock(content));
    } catch (error) {
      throw new Error(`Codex JSON parse failed: ${error.message}`);
    }

    return this.mapParsedPlan(parsed);
  },

  extractJsonBlock(text) {
    const trimmed = text.trim();
    if (trimmed.startsWith("{")) {
      return trimmed;
    }

    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced?.[1]?.trim().startsWith("{")) {
      return fenced[1].trim();
    }

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return trimmed.slice(start, end + 1);
    }

    return trimmed;
  },

  buildOpenAIRequest(payload) {
    const content = [
      {
        type: "text",
        text: this.buildPrompt(payload)
      }
    ];

    (payload?.referenceImages || []).forEach((image) => {
      if (typeof image?.dataUrl === "string" && /^data:image\//i.test(image.dataUrl)) {
        content.push({
          type: "image_url",
          image_url: { url: image.dataUrl }
        });
      }
    });

    return {
      messages: [
        {
          role: "user",
          content
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "shonode_storyboard_plan",
          schema: this.buildPlanJsonSchema()
        }
      },
      max_tokens: 8192
    };
  },

  buildRequest(payload) {
    const parts = [
      {
        text: this.buildPrompt(payload)
      }
    ];

    (payload?.referenceImages || []).forEach((image) => {
      const inlineData = this.toInlineData(image);
      if (inlineData) {
        parts.push({ inlineData });
      }
    });

    return {
      contents: [
        {
          role: "user",
          parts
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: this.buildPlanJsonSchema()
      }
    };
  },

  buildPlanJsonSchema() {
    return {
      type: "object",
      properties: {
        summary: { type: "string" },
        previewVideoUrl: { type: "string" },
        previewPosterUrl: { type: "string" },
        projectDraft: {
          type: "object",
          properties: {
            title: { type: "string" },
            sequence: { type: "string" },
            runtime: { type: "string" },
            tone: { type: "string" },
            logline: { type: "string" },
            notes: { type: "string" }
          },
          required: ["title", "sequence", "runtime", "tone", "logline", "notes"]
        },
        cuts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sceneTitle: { type: "string" },
              durationLabel: { type: "string" },
              caption: { type: "string" },
              beat: {
                type: "string",
                enum: ["hook", "tension", "reveal", "proof", "joy", "cta"]
              },
              referenceImageIndex: { type: "integer" },
              referenceImageIndexes: {
                type: "array",
                items: { type: "integer" }
              },
              imagePromptMode: { type: "string" },
              i2iPrompt: { type: "string" },
              t2iPrompt: { type: "string" },
              i2vStartPrompt: { type: "string" },
              i2vMotionPrompt: { type: "string" },
              i2vEndPrompt: { type: "string" }
            },
            required: [
              "sceneTitle",
              "durationLabel",
              "caption",
              "referenceImageIndexes",
              "imagePromptMode",
              "i2iPrompt",
              "t2iPrompt",
              "i2vStartPrompt",
              "i2vMotionPrompt",
              "i2vEndPrompt"
            ]
          }
        }
      },
      required: ["summary", "projectDraft", "cuts"]
    };
  },

  normalizeReferenceImageIndexes(referenceImageIndexes, referenceImageIndex) {
    const values = Array.isArray(referenceImageIndexes)
      ? referenceImageIndexes
      : Number.isInteger(referenceImageIndex)
        ? [referenceImageIndex]
        : [];

    return values
      .filter((value, index, items) => Number.isInteger(value) && value >= 0 && items.indexOf(value) === index);
  },

  inferImagePromptMode(cut, referenceImageIndexes = this.normalizeReferenceImageIndexes(
    cut?.referenceImageIndexes,
    cut?.referenceImageIndex
  )) {
    const explicitMode = typeof cut?.imagePromptMode === "string"
      ? cut.imagePromptMode.trim().toLowerCase()
      : "";

    if (explicitMode === "i2i" || explicitMode === "t2i") {
      return explicitMode;
    }

    return referenceImageIndexes.length > 0 || (typeof cut?.i2iPrompt === "string" && cut.i2iPrompt.trim())
      ? "i2i"
      : "t2i";
  },

  buildPackSection() {
    const pack = typeof window !== "undefined" ? window.ShonodeAdPack : null;
    if (!pack?.buildPromptSection) {
      return "";
    }

    try {
      return pack.buildPromptSection();
    } catch {
      return "";
    }
  },

  buildReferenceCatalog(referenceImages) {
    if (!Array.isArray(referenceImages) || referenceImages.length === 0) {
      return "- none";
    }

    return referenceImages.map((image, index) => {
      const width = Number(image?.width) || "?";
      const height = Number(image?.height) || "?";
      return `- [${index}] ${image?.name || `reference-${index + 1}.jpg`} (${width}x${height})`;
    }).join("\n");
  },

  buildSelectedPanelContext(selectedPanels) {
    return selectedPanels.map((panel, index) => {
      const referenceImageIndexes = this.normalizeReferenceImageIndexes(
        panel?.referenceImageIndexes,
        panel?.referenceImageIndex
      );
      const imagePromptMode = this.inferImagePromptMode(panel, referenceImageIndexes);

      return [
        `Selected cut ${index + 1}:`,
        `- sceneTitle: ${panel?.sceneTitle || ""}`,
        `- durationLabel: ${panel?.durationLabel || ""}`,
        `- caption: ${panel?.caption || ""}`,
        `- referenceImageName: ${panel?.referenceImageName || ""}`,
        `- referenceImageIndex: ${Number.isInteger(panel?.referenceImageIndex) ? panel.referenceImageIndex : -1}`,
        `- referenceImageIndexes: ${JSON.stringify(referenceImageIndexes)}`,
        `- imagePromptMode: ${imagePromptMode}`,
        `- currentI2I: ${panel?.i2iPrompt || ""}`,
        `- currentT2I: ${panel?.t2iPrompt || ""}`,
        `- currentI2VStart: ${panel?.i2vStartPrompt || ""}`,
        `- currentI2VMotion: ${panel?.i2vMotionPrompt || ""}`,
        `- currentI2VEnd: ${panel?.i2vEndPrompt || ""}`
      ].join("\n");
    }).join("\n\n");
  },

  buildPrompt(payload) {
    const brief = payload?.brief?.trim() || "";
    const qcDirective = typeof payload?.qcDirective === "string" ? payload.qcDirective.trim() : "";
    const patternDirective = typeof payload?.patternDirective === "string" ? payload.patternDirective.trim() : "";
    const project = payload?.project || {};
    const existingCount = Number(payload?.existingPanelCount) || 0;
    const referenceImageCount = Number(payload?.referenceImageCount) || 0;
    const referenceWeight = Number(payload?.referenceWeight) || 2;
    const referenceImages = Array.isArray(payload?.referenceImages) ? payload.referenceImages : [];
    const referenceCatalog = this.buildReferenceCatalog(referenceImages);
    const selectedPanels = Array.isArray(payload?.selectedPanels) ? payload.selectedPanels : [];
    const isSelectedRegeneration = payload?.generationMode === "selected-panels";

    if (isSelectedRegeneration) {
      const selectedPanelCount = Number(payload?.selectedPanelCount) || selectedPanels.length || 1;
      const selectedPanelContext = this.buildSelectedPanelContext(selectedPanels);

      return [
        "You are an AI storyboard refiner for short commercial videos.",
        "Return only valid JSON matching the provided schema.",
        "This is NOT a full storyboard generation request.",
        `Regenerate only the ${selectedPanelCount} selected cuts listed below.`,
        "Keep the same cut count and preserve each cut's role in the sequence.",
        "Improve clarity, shot design, and production usability while keeping the existing intent.",
        "",
        "Requirements:",
        `- Return exactly ${selectedPanelCount} cuts in the same order as the selected cuts.`,
        "- summary, sceneTitle, durationLabel, and caption must be written in natural Korean.",
        "- durationLabel should be written naturally in Korean and indicate the rough shot length.",
        "- caption should naturally mention how many seconds this shot roughly takes.",
        "- imagePromptMode, i2iPrompt, t2iPrompt, i2vStartPrompt, i2vMotionPrompt, and i2vEndPrompt must be written in strong production-friendly English.",
        "- Return referenceImageIndexes as an ordered array of the uploaded attached-image indexes that should guide each cut. Use 0-based indexes.",
        "- Return referenceImageIndex as the primary reference for backward compatibility. Use the first item from referenceImageIndexes or -1.",
        "- If attached images exist for this request, every cut must use at least one attached image, set imagePromptMode to 'i2i', and write an i2iPrompt for image-to-image generation.",
        "- Use 't2i' only when there are truly no attached images in the request.",
        "- Leave the unused image prompt field as an empty string.",
        "- Do not merely caption, paraphrase, or restate the attached images. Reinterpret the chosen attached-image set into a fresh, polished, ad-ready frame.",
        "- When multiple attached images are assigned, combine them intentionally. One can drive subject identity, another styling, product detail, composition, lighting, texture, or mood.",
        "- Preserve the right anchors from the attached images without copying the uploaded frame literally.",
        "- I2I prompts should describe how to transform or recombine the selected attached images into a newly art-directed commercial still, not how to recreate the source image as-is.",
        "- i2vStartPrompt, i2vMotionPrompt, and i2vEndPrompt must make the shot continue smoothly into the next cut in sequence. The end state of each shot should set up the next shot naturally.",
        "- projectDraft fields can stay close to the current project context and do not need to invent a new project direction.",
        "- If preview video or poster URLs do not exist, return empty strings.",
        "",
        "Project context:",
        `- title: ${project.title || ""}`,
        `- sequence: ${project.sequence || ""}`,
        `- runtime: ${project.runtime || ""}`,
        `- tone: ${project.tone || ""}`,
        `- aspectRatio: ${project.aspectRatio || ""}`,
        `- logline: ${project.logline || ""}`,
        `- notes: ${project.notes || ""}`,
        `- referenceImageCount: ${referenceImageCount}`,
        `- referenceImageWeight: ${referenceWeight}`,
        "",
        "Uploaded attached images (0-based index order, same order as the attached images):",
        referenceCatalog,
        "",
        qcDirective ? `QC gate ruling (obey before writing any claim): ${qcDirective}` : "",
        patternDirective ? `Creative pattern directive (keep regenerated cuts on this grammar): ${patternDirective}` : "",
        "Original user brief:",
        brief,
        "",
        "Selected cuts to regenerate:",
        selectedPanelContext
      ].join("\n");
    }

    return [
      "You are an AI storyboard planner for short commercial videos.",
      "Read the user's vague Korean brief and convert it into a practical storyboard plan.",
      "Return only valid JSON matching the provided schema.",
      "",
      this.buildPackSection(),
      "",
      "Requirements:",
      "- Infer an appropriate number of cuts for a 15-30 second commercial unless the brief explicitly requests something else.",
      "- Write concise but production-usable shot descriptions.",
      "- summary, sceneTitle, durationLabel, and caption must be written in natural Korean.",
      "- durationLabel should be written naturally in Korean and indicate the rough shot length.",
      "- caption should naturally mention how many seconds this shot roughly takes.",
      "- Return referenceImageIndexes as an ordered array of the uploaded attached-image indexes that guide each cut. Use 0-based indexes.",
      "- Return referenceImageIndex as the primary reference for backward compatibility. Use the first item from referenceImageIndexes or -1.",
      "- imagePromptMode, i2iPrompt, t2iPrompt, i2vStartPrompt, i2vMotionPrompt, and i2vEndPrompt must be written in strong production-friendly English for image and video generation.",
      "- projectDraft.title, sequence, runtime, tone, logline, and notes must be filled in Korean for the left sidebar.",
      "- projectDraft.notes should include camera movement, emotional flow, visual tone, or edit direction.",
      "- If attached images exist for this request, every cut must use at least one attached image, set imagePromptMode to 'i2i', and write an i2iPrompt for image-to-image generation.",
      "- Use 't2i' only when there are truly no attached images in the request.",
      "- Leave the unused image prompt field as an empty string.",
      "- Do not simply caption the attached images or describe them literally. Reinterpret, restage, and elevate the chosen attached images into a fresh ad-ready frame.",
      "- Multiple attached images may be combined in one cut. Use them intentionally rather than averaging everything together.",
      "- When attached images exist, preserve the right subject, product, styling, composition, lighting, or mood anchors while still producing a newly designed shot.",
      "- Write I2I prompts for Nano Banana Pro 2 style attached-image-guided generation and T2I prompts only when a cut has no attached images.",
      "- I2I prompts should explain how to transform or combine the assigned attached images into a new premium commercial still instead of narrating the source image.",
      "- Write I2V prompts for Kling or Higgsfield using start frame, motion, and end frame fields.",
      "- Keep prompts visually specific, ad-ready, and sequenced so each shot can flow smoothly into the next one.",
      "- For I2V, make the start, motion, and end prompts continue naturally into the next cut. The end of one shot should tee up the opening of the next shot.",
      "- If preview video or poster URLs do not exist, return empty strings.",
      "- referenceImageWeight describes how strongly the original reference images should be preserved. Higher values should keep more composition, silhouette, and styling anchors.",
      "",
      "Project context:",
      `- title: ${project.title || ""}`,
      `- sequence: ${project.sequence || ""}`,
      `- runtime: ${project.runtime || ""}`,
      `- tone: ${project.tone || ""}`,
      `- aspectRatio: ${project.aspectRatio || ""}`,
      `- logline: ${project.logline || ""}`,
      `- notes: ${project.notes || ""}`,
      `- currentPanelCount: ${existingCount}`,
      `- referenceImageCount: ${referenceImageCount}`,
      `- referenceImageWeight: ${referenceWeight}`,
      "",
      "Uploaded attached images (0-based index order, same order as the attached images):",
      referenceCatalog,
      "",
      qcDirective ? `QC gate ruling (obey before writing any claim): ${qcDirective}` : "",
      patternDirective ? `Creative pattern directive (build the storyboard on this grammar): ${patternDirective}` : "",
      "User brief:",
      brief
    ].join("\n");
  },

  toInlineData(image) {
    if (!image?.dataUrl || typeof image.dataUrl !== "string") {
      return null;
    }

    const commaIndex = image.dataUrl.indexOf(",");
    if (commaIndex === -1) {
      return null;
    }

    const metadata = image.dataUrl.slice(0, commaIndex);
    const payload = image.dataUrl.slice(commaIndex + 1);
    const mimeTypeMatch = metadata.match(/^data:([^;,]+)/i);
    const mimeType = image.mimeType || mimeTypeMatch?.[1] || "image/jpeg";
    const data = /;base64/i.test(metadata)
      ? payload
      : this.encodeBase64Data(decodeURIComponent(payload));

    return {
      mimeType,
      data
    };
  },

  encodeBase64Data(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  },

  mapResponse(result) {
    const candidateText = result?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("")
      .trim();

    if (!candidateText) {
      throw new Error("Gemini returned no text content.");
    }

    let parsed;
    try {
      parsed = JSON.parse(candidateText);
    } catch (error) {
      throw new Error(`Gemini JSON parse failed: ${error.message}`);
    }

    return this.mapParsedPlan(parsed);
  },

  mapOpenAIResponse(result) {
    const candidateText = typeof result?.choices?.[0]?.message?.content === "string"
      ? result.choices[0].message.content.trim()
      : "";

    if (!candidateText) {
      throw new Error("OpenAI returned no text content.");
    }

    let parsed;
    try {
      parsed = JSON.parse(candidateText);
    } catch (error) {
      throw new Error(`OpenAI JSON parse failed: ${error.message}`);
    }

    return this.mapParsedPlan(parsed);
  },

  mapParsedPlan(parsed) {
    const cuts = Array.isArray(parsed?.cuts)
      ? parsed.cuts.map((cut) => {
        const referenceImageIndexes = this.normalizeReferenceImageIndexes(
          cut?.referenceImageIndexes,
          cut?.referenceImageIndex
        );
        const imagePromptMode = this.inferImagePromptMode(cut, referenceImageIndexes);
        const rawI2IPrompt = typeof cut?.i2iPrompt === "string" ? cut.i2iPrompt : "";
        const rawT2IPrompt = typeof cut?.t2iPrompt === "string" ? cut.t2iPrompt : "";
        const i2iPrompt = rawI2IPrompt || (referenceImageIndexes.length > 0 ? rawT2IPrompt : "");
        const t2iPrompt = rawT2IPrompt || rawI2IPrompt;

        return {
          ...cut,
          referenceImageIndexes,
          referenceImageIndex: referenceImageIndexes[0] ?? -1,
          imagePromptMode,
          i2iPrompt,
          t2iPrompt
        };
      })
      : [];

    return {
      summary: typeof parsed?.summary === "string" ? parsed.summary : "",
      previewVideoUrl: typeof parsed?.previewVideoUrl === "string" ? parsed.previewVideoUrl : "",
      previewPosterUrl: typeof parsed?.previewPosterUrl === "string" ? parsed.previewPosterUrl : "",
      projectDraft: parsed?.projectDraft && typeof parsed.projectDraft === "object" ? parsed.projectDraft : {},
      cuts
    };
  }
};

window.ShonodeAI = shonodeAiClient;
window.ShotBoardAI = shonodeAiClient;
