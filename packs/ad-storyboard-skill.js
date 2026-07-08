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
    }
  };

  if (typeof window !== "undefined") {
    window.ShonodeAdPack = pack;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = pack;
  }
})();
