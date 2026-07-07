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
