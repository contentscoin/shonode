// Ad Storyboard Skill playbook.
// Distilled from the OpenCrab "Ad Storyboard Skill Workflow" (5-node QC-verified
// workflow: qc_gate -> pattern_selection -> storyboard_beats -> prompt_and_risk
// -> final_output_contract) so every provider (Gemini / OpenAI / Codex) plans
// storyboards against the same advertising grammar without a live OpenCrab call.
(function shonodeAdPack() {
  const pack = {
    id: "ad-storyboard-skill",
    version: "1.0.0",
    source: "OpenCrab: Ad Storyboard Skill Workflow (workflow_id 9eedf85d-430c-4cd7-814f-dae1ee93b258)",

    sixBeatContract: [
      { beat: "hook", window: "0-3s", role: "Scroll-stopping hook that earns attention immediately" },
      { beat: "tension", window: "3-7s", role: "Problem, desire, or tension the product will resolve" },
      { beat: "reveal", window: "7-12s", role: "Product reveal with clear brand linkage" },
      { beat: "proof", window: "12-20s", role: "Demo/proof: product action, serving moment, use behavior, or evidence" },
      { beat: "joy", window: "20-26s", role: "Joy payoff: the emotional, social, sensory, or comic consequence" },
      { beat: "cta", window: "26-30s", role: "Single CTA and memory frame" }
    ],

    qcGateRules: [
      "Classify product risk first: health/medical, functional food, cosmetics with efficacy claims, and finance are HIGH RISK.",
      "High-risk product without verifiable proof: produce a claim-safe concept only — no efficacy, ranking, or measurable-benefit claims.",
      "Never invent proof, statistics, awards, reviews, or expert endorsements that were not provided in the brief.",
      "Low-risk sensory product without proof assets: do not build the storyboard around a proof experiment; prefer a delightful demo plus problem-relief flow."
    ],

    beatRules: [
      "Assign every cut exactly one beat from: hook, tension, reveal, proof, joy, cta.",
      "Each beat must serve a distinct story function; proof and joy must never repeat the same scene function.",
      "Cover all six beats in order when cut count allows; with fewer cuts, merge tension into hook or joy into cta rather than dropping reveal or proof.",
      "Scale beat timing proportionally for lengths other than 30 seconds."
    ],

    promptRiskRules: [
      "Every generation prompt must add negative constraints: no copying of source assets, actors, lines, frames, logos, costumes, layouts, or celebrity likenesses.",
      "Keep the product clearly visible and readable in reveal and proof beats; the product must explain the delight, not just decorate it.",
      "Exactly one CTA action in the final beat — never multiple asks.",
      "Reinterpret reference images into newly art-directed frames; never recreate a reference frame literally (keep reference distance)."
    ],

    // qc_gate step 1 — product risk taxonomy. These are the canonical options
    // shown in the brief intake "제품 카테고리" select. `risk` classifies the
    // category itself; the final claim ruling also depends on proof availability.
    // Keyword arrays let the classifier guess a category from a free-form brief
    // when the operator has not picked one explicitly.
    productRiskCategories: [
      { id: "sensory", label: "일반 · 감각재화", risk: "low", keywords: [] },
      {
        id: "health-functional",
        label: "건강기능식품",
        risk: "high",
        keywords: ["건강기능", "건기식", "다이어트", "체지방", "혈당", "혈압", "면역", "유산균", "프로바이오", "콜라겐", "루테인", "오메가", "관절", "피로회복", "숙취", "영양제"]
      },
      {
        id: "medical",
        label: "의료 · 의약품",
        risk: "high",
        keywords: ["의료", "의약", "병원", "치료", "질환", "질병", "처방", "임상시험", "부작용", "진단", "시술", "성형"]
      },
      {
        id: "cosmetics-efficacy",
        label: "화장품 (효능 강조)",
        risk: "high",
        keywords: ["미백", "주름개선", "탄력", "안티에이징", "여드름", "모공", "재생", "잡티", "기미", "화이트닝", "리프팅"]
      },
      {
        id: "finance",
        label: "금융 · 투자",
        risk: "high",
        keywords: ["투자", "수익률", "금융", "대출", "보험", "펀드", "코인", "주식", "재테크", "이자", "적금", "보장", "원금"]
      },
      { id: "other", label: "기타 · 미분류", risk: "unknown", keywords: [] }
    ],

    // Generic claim-language markers: measurable/comparative claims that need
    // proof regardless of category.
    claimLanguageKeywords: ["효과", "효능", "1위", "최고", "최저가", "검증", "임상", "특허", "인증", "수상", "후기", "리뷰", "보장", "%", "증가", "감소", "개선"],

    // pattern_selection step 2 — creative pattern matrix, distilled from the
    // OpenCrab kernel pack "Pattern Selection Matrix" (award corpus 1,890 +
    // Dolphiners corpus 162 records). `when` mirrors the matrix input condition,
    // `risk` its risk-control column; sourceFamily matches PATTERN_SOURCE_FAMILIES.
    creativePatterns: [
      {
        id: "delightful_twist_demo",
        label: "반전 데모",
        sourceFamily: "hybrid",
        when: "제품 시연에 예상 밖의 반전을 얹을 수 있을 때 (코퍼스 최다 검증 패턴)",
        why: "제품이 재미의 엔진이 되는 가장 검증된 패턴",
        risk: "제품을 빼도 같은 재미가 남으면 리라이트"
      },
      {
        id: "proof_experiment",
        label: "증명 실험",
        sourceFamily: "award",
        requiresProof: true,
        when: "증빙·비교·측정 결과·전문가 근거·성분 스토리가 있을 때",
        why: "클레임을 눈에 보이고 검증 가능하게 만듦",
        risk: "증거 날조 금지 — 제출된 증빙 범위 안에서만"
      },
      {
        id: "problem_relief",
        label: "문제 해소",
        sourceFamily: "award",
        when: "일상 속 마찰·불편이 있지만 증빙이 제한적일 때",
        why: "공감 가는 순간 속에서 제품을 유용하게 보여줌",
        risk: "효능 주장 대신 루틴·상황 언어 사용"
      },
      {
        id: "absurd_product_demo",
        label: "부조리 데모",
        sourceFamily: "dolphiners",
        when: "제품이 불가능한 상황을 만들어내는 오브젝트가 될 수 있을 때",
        why: "제품이 개그의 엔진이 됨",
        risk: "반전의 원인은 반드시 제품이어야 함"
      },
      {
        id: "story_first_branded_film",
        label: "스토리 브랜디드 필름",
        sourceFamily: "award",
        when: "브랜드가 엔터테인먼트 우선 내러티브를 감당할 수 있을 때",
        why: "롱폼·크래프트 주도 서사에 유용",
        risk: "최종 팩샷 전에 브랜드 기억 요소가 먼저 등장해야 함"
      },
      {
        id: "genre_parody_longform",
        label: "장르 패러디",
        sourceFamily: "dolphiners",
        when: "신뢰를 해치지 않고 알려진 장르 문법을 패러디할 수 있을 때",
        why: "시청자가 이미 아는 서사 문법을 즐기게 함",
        risk: "원작 장면·배우·대사 복제 금지"
      },
      {
        id: "cultural_participation",
        label: "문화 참여",
        sourceFamily: "award",
        when: "공적 의례·팬덤·챌린지·사회적 행동에 합류할 수 있을 때",
        why: "관객의 행동이 곧 배포가 됨",
        risk: "위험하거나 배타적인 참여 유도 금지"
      },
      {
        id: "surreal_product_metaphor",
        label: "초현실 은유",
        sourceFamily: "award",
        when: "제품이 시각·감각·패키지·오브젝트 중심일 때",
        why: "빠른 제품 기억을 만듦",
        risk: "제품과 동떨어진 로고 장난 금지"
      },
      {
        id: "meme_collision",
        label: "밈 충돌",
        sourceFamily: "dolphiners",
        when: "한국형(돌고래유괴단 스타일) 브랜디드 콘텐츠를 원할 때",
        why: "콘텐츠로 시작해 브랜드 기억으로 귀결",
        risk: "재미가 제품 역할을 가리면 안 됨"
      }
    ],

    // Kernel matrix heuristic: rank the top-3 patterns for the current intake.
    // Mirrors the matrix rules — proof_experiment is NEVER recommended without
    // proof, and claim-safe mode prefers claim-free relatable patterns.
    recommendPatterns(input = {}) {
      const brief = typeof input.brief === "string" ? input.brief.toLowerCase() : "";
      const hasProof = Boolean(input.hasProof);
      const risk = this.classifyProductRisk(input);
      const has = (kws) => kws.some((kw) => brief.includes(kw));

      let ids;
      if (has(["챌린지", "참여", "팬덤", "밈", "유행"])) {
        ids = ["cultural_participation", "meme_collision", "delightful_twist_demo"];
      } else if (has(["웃긴", "유머", "개그", "병맛", "코믹", "부조리"])) {
        ids = ["absurd_product_demo", "meme_collision", "genre_parody_longform"];
      } else if (hasProof) {
        ids = ["proof_experiment", "delightful_twist_demo", "problem_relief"];
      } else if (risk.ruling === "claim_safe_rewrite" || risk.level === "proof_required") {
        // No usable proof: keep claims out — relatable/sensory patterns only.
        ids = ["problem_relief", "surreal_product_metaphor", "story_first_branded_film"];
      } else {
        ids = ["delightful_twist_demo", "surreal_product_metaphor", "absurd_product_demo"];
      }

      return ids
        .map((id) => this.creativePatterns.find((p) => p.id === id))
        .filter(Boolean);
    },

    // Korean directive injected into the generation prompt when a pattern is
    // chosen; mirrors the kernel's pattern + risk-control contract.
    buildPatternDirective(pattern, input = {}) {
      if (!pattern || !pattern.id) {
        return "";
      }
      const meta = this.creativePatterns.find((p) => p.id === pattern.id);
      if (!meta) {
        return "";
      }
      const lines = [
        `[크리에이티브 패턴] ${meta.label}(${meta.id}) 패턴으로 스토리보드를 구성하세요. ${meta.why}. 리스크 컨트롤: ${meta.risk}.`
      ];
      if (meta.requiresProof && !input.hasProof) {
        lines.push("주의: 증빙 자료가 없으므로 실험·증명 장면에서 증거·수치·비교 결과를 날조하지 말고, 감각적 시연으로 대체하세요.");
      }
      return lines.join(" ");
    },

    // qc_gate classifier — client-side product-risk + proof judgement.
    // Mirrors qcGateRules. Returns { level, ruling, categoryId, categoryLabel,
    // detected, matchedKeywords, headline, detail } where:
    //   level  ∈ low | proof_required | high      (matches CLAIM_RISK_LEVELS)
    //   ruling ∈ allowed | claim_safe_rewrite     (matches CLAIM_RULINGS)
    classifyProductRisk(input = {}) {
      const brief = typeof input.brief === "string" ? input.brief : "";
      const hasProof = Boolean(input.hasProof);
      const lower = brief.toLowerCase();

      const known = this.productRiskCategories.find((cat) => cat.id === input.categoryId);
      let category = known && known.id !== "other" ? known : null;
      let detected = false;
      const matchedKeywords = [];

      // When no explicit high-risk category is chosen, scan the brief.
      if (!category || category.risk !== "high") {
        for (const cat of this.productRiskCategories) {
          if (cat.risk !== "high") continue;
          const hits = cat.keywords.filter((kw) => lower.includes(kw.toLowerCase()));
          if (hits.length > 0) {
            category = cat;
            detected = !known || known.id === "other";
            matchedKeywords.push(...hits);
            break;
          }
        }
      }

      const claimHits = this.claimLanguageKeywords.filter((kw) => lower.includes(kw.toLowerCase()));
      const effective = category || known || this.productRiskCategories[0];

      let level = "low";
      let ruling = "allowed";
      let headline = "저위험";
      let detail = "감각·정서 소구 중심으로 자유롭게 생성합니다.";

      if (effective.risk === "high") {
        if (hasProof) {
          level = "proof_required";
          ruling = "allowed";
          headline = "증빙 필요 · 검증 자료 확보";
          detail = "제출한 증빙 범위 안에서만 효능·수치를 주장하세요. 근거 없는 과장은 금지됩니다.";
        } else {
          level = "high";
          ruling = "claim_safe_rewrite";
          headline = "고위험 · 클레임 세이프 모드";
          detail = "증빙이 없어 효능·순위·수치 주장 없이 컨셉만 생성합니다. 통계·수상·후기 날조 금지.";
        }
      } else if (claimHits.length > 0) {
        matchedKeywords.push(...claimHits);
        if (hasProof) {
          level = "low";
          ruling = "allowed";
          headline = "저위험 · 주장 근거 확보";
          detail = "제출한 증빙 범위 안에서 주장하세요.";
        } else {
          level = "proof_required";
          ruling = "allowed";
          headline = "증빙 필요";
          detail = "수치·효능·순위 주장을 넣으려면 증빙 자료가 필요합니다. 없으면 감각 소구로 전환하세요.";
        }
      }

      return {
        level,
        ruling,
        hasProof,
        categoryId: effective.id,
        categoryLabel: effective.label,
        detected,
        matchedKeywords: Array.from(new Set(matchedKeywords)).slice(0, 6),
        headline,
        detail
      };
    },

    // Turns a classifyProductRisk result into a Korean directive passed to every
    // provider so generation honours the same qc_gate ruling. proof_required has
    // two distinct meanings (high-risk WITH proof vs. claim-language WITHOUT
    // proof); the directive must match the on-screen badge in both.
    buildQcDirective(result) {
      if (!result) {
        return "";
      }
      if (result.ruling === "claim_safe_rewrite") {
        return "[QC 게이트 · 클레임 세이프 모드] 고위험 제품이며 증빙 자료가 없습니다. 효능·순위·측정 가능한 이점·통계·수상·후기·전문가 보증을 절대 만들지 말고, 클레임 없는 컨셉 스켈레톤만 생성하세요.";
      }
      if (result.level === "proof_required") {
        if (result.hasProof) {
          return "[QC 게이트] 고위험 제품이지만 증빙 자료가 제출되었습니다. 제출된 증빙 범위 안의 효능·수치만 주장하고, 증빙을 벗어난 과장·순위·통계·후기·전문가 보증은 만들지 마세요.";
        }
        return "[QC 게이트] 증빙 자료가 확인되지 않았습니다. 효능·수치·순위 등 검증이 필요한 주장은 넣지 말고, 감각·상황 소구 중심으로 컷을 구성하세요.";
      }
      return "";
    },

    // final_output_contract — non-LLM validation of the finished board against
    // the six-beat contract and claim-safety rules. Pure function: takes cut
    // digests, returns a report; the app decides how to surface/store it.
    //   cuts: [{ panelId, beat, caption, promptText }]
    //   risk: result of classifyProductRisk (or null)
    // Returns { pass, problems: string[], claimFindings: [{claimText, riskLevel, ruling, panelId}] }
    validateOutputContract(input = {}) {
      const cuts = Array.isArray(input.cuts) ? input.cuts : [];
      const risk = input.risk || null;
      const hasProof = Boolean(input.hasProof);
      const problems = [];

      const beatOrder = this.sixBeatContract.map((item) => item.beat);
      const counts = Object.fromEntries(beatOrder.map((beat) => [beat, 0]));
      let unassigned = 0;
      cuts.forEach((cut) => {
        if (counts[cut.beat] !== undefined) counts[cut.beat] += 1;
        else unassigned += 1;
      });

      const missing = beatOrder.filter((beat) => counts[beat] === 0);
      if (missing.length > 0) {
        problems.push(`빠진 비트: ${missing.join(", ")}`);
      }
      if (counts.cta !== 1) {
        problems.push(`CTA는 정확히 1개여야 합니다 (현재 ${counts.cta}개)`);
      }
      if (unassigned > 0) {
        problems.push(`비트 미지정 컷 ${unassigned}개`);
      }

      // Beat order must be non-decreasing along the cut sequence.
      let lastIndex = -1;
      let outOfOrder = false;
      cuts.forEach((cut) => {
        const index = beatOrder.indexOf(cut.beat);
        if (index === -1) return;
        if (index < lastIndex) outOfOrder = true;
        lastIndex = index;
      });
      if (outOfOrder) {
        problems.push("비트 순서가 계약 순서(훅→긴장→반전→증명→환희→CTA)를 벗어났습니다");
      }

      const incomplete = cuts.filter((cut) =>
        !(typeof cut.caption === "string" && cut.caption.trim())
        || !(typeof cut.promptText === "string" && cut.promptText.trim())
      ).length;
      if (incomplete > 0) {
        problems.push(`설명 또는 이미지 프롬프트가 비어 있는 컷 ${incomplete}개`);
      }

      // Claim scan: measurable/comparative claim language in captions/prompts.
      // Ruling mirrors the qc_gate: proof → allowed; high-risk without proof →
      // blocked (claim-safe mode forbids claims outright); otherwise rewrite.
      const claimFindings = [];
      const ruling = hasProof ? "allowed" : (risk && risk.level === "high" ? "blocked" : "claim_safe_rewrite");
      const riskLevel = risk && ["low", "proof_required", "high"].includes(risk.level) ? risk.level : "low";
      cuts.forEach((cut) => {
        const text = `${cut.caption || ""} ${cut.promptText || ""}`;
        const lower = text.toLowerCase();
        const hits = this.claimLanguageKeywords.filter((kw) => lower.includes(kw.toLowerCase()));
        if (hits.length > 0) {
          claimFindings.push({
            claimText: `${hits.slice(0, 4).join(", ")} — ${String(cut.caption || "").slice(0, 60)}`,
            riskLevel,
            ruling,
            panelId: typeof cut.panelId === "string" ? cut.panelId : ""
          });
        }
      });
      if (claimFindings.length > 0 && ruling === "blocked") {
        problems.push(`클레임 세이프 모드인데 주장 표현이 감지된 컷 ${claimFindings.length}개`);
      }

      return { pass: problems.length === 0, problems, claimFindings };
    },

    buildPromptSection() {
      const beats = this.sixBeatContract
        .map((item) => `  - ${item.beat} (${item.window}): ${item.role}`)
        .join("\n");
      const rules = [...this.qcGateRules, ...this.beatRules, ...this.promptRiskRules]
        .map((rule) => `- ${rule}`)
        .join("\n");

      return [
        "Ad Storyboard Skill playbook (follow strictly):",
        "Six-beat advertising contract for a 30s spot:",
        beats,
        "Rules:",
        rules,
        '- Return a "beat" field for every cut using one of: hook, tension, reveal, proof, joy, cta.'
      ].join("\n");
    },

    // Step 5 handoff — turn the finished board into a MODEL-NEUTRAL video
    // generation job spec (Kling / Runway / Seedance / Higgsfield). Reuses
    // promptRiskRules as the global negative constraints (reference distance,
    // no asset reuse). Pure function: takes cut digests, returns structured spec.
    //   input.cuts: [{ sceneTitle, beat, durationLabel, hasKeyframe,
    //                  keyframeDataUrl?, i2vStartPrompt, i2vMotionPrompt, i2vEndPrompt }]
    //   input.project: { title, aspectRatio, tone }
    buildVideoJobSpec(input = {}) {
      const cuts = Array.isArray(input.cuts) ? input.cuts : [];
      const project = input.project || {};
      const beatMeta = Object.fromEntries(this.sixBeatContract.map((b) => [b.beat, b]));
      const str = (v) => (typeof v === "string" ? v.trim() : "");
      return {
        title: str(project.title) || "Untitled",
        aspectRatio: str(project.aspectRatio),
        tone: str(project.tone),
        globalNegatives: this.promptRiskRules.slice(),
        cuts: cuts.map((cut, i) => {
          const beat = str(cut.beat);
          const meta = beatMeta[beat];
          // Only genuine data-URI images ride into the spec (the HTML sheet
          // embeds them verbatim as <img src>).
          const keyframeDataUrl = typeof cut.keyframeDataUrl === "string" && /^data:image\//i.test(cut.keyframeDataUrl)
            ? cut.keyframeDataUrl
            : "";
          return {
            order: i + 1,
            sceneTitle: str(cut.sceneTitle),
            beat,
            beatWindow: meta ? meta.window : "",
            beatRole: meta ? meta.role : "",
            duration: str(cut.durationLabel),
            hasKeyframe: cut.hasKeyframe === true || Boolean(keyframeDataUrl),
            keyframeDataUrl,
            startPrompt: str(cut.i2vStartPrompt),
            motionPrompt: str(cut.i2vMotionPrompt),
            endPrompt: str(cut.i2vEndPrompt)
          };
        })
      };
    },

    // Renders a buildVideoJobSpec result as a copy/paste-ready Markdown handoff
    // sheet. Labeled blocks (not tables) so long prompts stay intact.
    renderVideoJobSpecMarkdown(spec) {
      if (!spec) {
        return "";
      }
      const lines = [];
      lines.push(`# 영상 생성 잡스펙 — ${spec.title}`);
      lines.push("");
      lines.push("> 모델 중립 핸드오프. 컷별 프롬프트를 Kling / Runway / Seedance / Higgsfield 등에 붙여넣으세요.");
      lines.push("> 각 컷의 키프레임 스틸을 시작 프레임(I2V)으로 사용하세요.");
      lines.push("");
      if (spec.aspectRatio) lines.push(`- **화면비**: ${spec.aspectRatio}`);
      if (spec.tone) lines.push(`- **톤**: ${spec.tone}`);
      lines.push(`- **컷 수**: ${spec.cuts.length}`);
      lines.push("");
      lines.push("## 공통 네거티브 제약 (모든 컷 적용)");
      spec.globalNegatives.forEach((n) => lines.push(`- ${n}`));
      lines.push("");
      spec.cuts.forEach((cut) => {
        lines.push(`## 컷 ${cut.order}${cut.sceneTitle ? " · " + cut.sceneTitle : ""}`);
        const badges = [];
        if (cut.beat) badges.push(`비트 \`${cut.beat}\`${cut.beatWindow ? " (" + cut.beatWindow + ")" : ""}`);
        if (cut.duration) badges.push(`길이 ${cut.duration}`);
        badges.push(`키프레임 ${cut.hasKeyframe ? "있음" : "없음 — 먼저 키프레임 생성 권장"}`);
        lines.push(badges.join(" · "));
        if (cut.beatRole) lines.push(`_${cut.beatRole}_`);
        lines.push("");
        lines.push(`**Start frame**: ${cut.startPrompt || "(비어 있음)"}`);
        lines.push("");
        lines.push(`**Motion**: ${cut.motionPrompt || "(비어 있음)"}`);
        lines.push("");
        lines.push(`**End frame**: ${cut.endPrompt || "(비어 있음)"}`);
        lines.push("");
      });
      return lines.join("\n");
    },

    // Renders a buildVideoJobSpec result as a SELF-CONTAINED HTML visual sheet:
    // keyframe stills embedded as data URIs next to each cut's I2V prompts, so
    // one file serves both the client proposal and the video-generation handoff.
    // options.beatColors: optional { beatId: cssColor } map (the app passes its
    // BEAT_META colors so the sheet matches the canvas badges).
    renderVideoJobSpecHtml(spec, options = {}) {
      if (!spec) {
        return "";
      }
      const esc = (value) => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
      const beatColors = options.beatColors && typeof options.beatColors === "object" ? options.beatColors : {};

      const metaBits = [];
      if (spec.aspectRatio) metaBits.push(`화면비 ${esc(spec.aspectRatio)}`);
      if (spec.tone) metaBits.push(`톤 ${esc(spec.tone)}`);
      metaBits.push(`컷 ${spec.cuts.length}개`);

      const negatives = spec.globalNegatives.map((n) => `<li>${esc(n)}</li>`).join("");

      const cards = spec.cuts.map((cut) => {
        // Constrain to a hex color literal — esc() alone cannot stop CSS
        // declaration injection ("; background-image:url(...)") in style="".
        const rawColor = beatColors[cut.beat] || "";
        const color = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : "#94a3b8";
        const beatPill = cut.beat
          ? `<span class="pill" style="background:${color}">${esc(cut.beat)}${cut.beatWindow ? " · " + esc(cut.beatWindow) : ""}</span>`
          : "";
        const durationPill = cut.duration ? `<span class="pill pill--soft">${esc(cut.duration)}</span>` : "";
        // keyframeDataUrl is validated as data:image/ in buildVideoJobSpec —
        // esc() additionally neutralizes any quote-based attribute breakout.
        const media = cut.keyframeDataUrl
          ? `<img class="keyframe" src="${esc(cut.keyframeDataUrl)}" alt="컷 ${esc(cut.order)} 키프레임">`
          : `<div class="keyframe keyframe--empty">키프레임 없음<br><small>먼저 키프레임을 생성하면 시트에 포함됩니다</small></div>`;
        const prompt = (label, text) =>
          `<div class="prompt"><span class="prompt-label">${label}</span><p>${text ? esc(text) : '<em class="empty">(비어 있음)</em>'}</p></div>`;
        return [
          `<section class="cut">`,
          `<header><h2>컷 ${esc(cut.order)}${cut.sceneTitle ? " · " + esc(cut.sceneTitle) : ""}</h2><div class="pills">${beatPill}${durationPill}</div></header>`,
          cut.beatRole ? `<p class="role">${esc(cut.beatRole)}</p>` : "",
          `<div class="cut-body">${media}<div class="prompts">${prompt("Start frame", cut.startPrompt)}${prompt("Motion", cut.motionPrompt)}${prompt("End frame", cut.endPrompt)}</div></div>`,
          `</section>`
        ].join("");
      }).join("\n");

      return [
        "<!DOCTYPE html>",
        '<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
        `<title>영상 잡스펙 — ${esc(spec.title)}</title>`,
        "<style>",
        "body{font-family:'Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif;margin:0;padding:32px;background:#f6f8fc;color:#1a2140;}",
        ".sheet{max-width:920px;margin:0 auto;}",
        "h1{font-size:24px;margin:0 0 4px;} .meta{color:#7581a3;font-size:13px;margin:0 0 20px;}",
        ".negatives{background:#fff;border:1px solid rgba(15,23,42,.1);border-radius:14px;padding:14px 18px;margin-bottom:22px;}",
        ".negatives h3{margin:0 0 8px;font-size:13px;color:#7581a3;} .negatives ul{margin:0;padding-left:18px;font-size:12.5px;line-height:1.6;}",
        ".cut{background:#fff;border:1px solid rgba(15,23,42,.1);border-radius:16px;padding:18px 20px;margin-bottom:18px;page-break-inside:avoid;}",
        ".cut header{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}",
        ".cut h2{font-size:16px;margin:0;} .pills{display:flex;gap:6px;}",
        ".pill{padding:3px 10px;border-radius:999px;color:#fff;font-size:11px;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;}",
        ".pill--soft{background:#eef1fb;color:#5b6ba8;}",
        ".role{margin:6px 0 0;font-size:12px;color:#7581a3;font-style:italic;}",
        ".cut-body{display:flex;gap:16px;margin-top:12px;align-items:flex-start;}",
        ".keyframe{width:260px;border-radius:10px;flex-shrink:0;display:block;}",
        ".keyframe--empty{height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f1f4fa;color:#9aa5c4;font-size:12.5px;text-align:center;gap:4px;}",
        ".prompts{flex:1;min-width:0;} .prompt{margin-bottom:10px;}",
        ".prompt-label{display:block;font-size:11px;font-weight:700;color:#7f90f2;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;}",
        ".prompt p{margin:0;font-size:13px;line-height:1.55;word-break:break-word;} .empty{color:#b3bcd6;}",
        "@media print{body{background:#fff;padding:12px;} .cut{border-color:#ccc;}}",
        "@media (max-width:640px){.cut-body{flex-direction:column;} .keyframe{width:100%;}}",
        "</style></head><body>",
        '<div class="sheet">',
        `<h1>영상 생성 잡스펙 — ${esc(spec.title)}</h1>`,
        `<p class="meta">${metaBits.join(" · ")} · 모델 중립(Kling / Runway / Seedance / Higgsfield) · 키프레임을 I2V 시작 프레임으로 사용</p>`,
        `<div class="negatives"><h3>공통 네거티브 제약 (모든 컷 적용)</h3><ul>${negatives}</ul></div>`,
        cards,
        "</div></body></html>"
      ].join("\n");
    }
  };

  if (typeof window !== "undefined") {
    window.ShonodeAdPack = pack;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = pack;
  }
})();
