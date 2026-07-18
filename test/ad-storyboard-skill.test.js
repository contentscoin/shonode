// Pure-logic tests for the Ad Storyboard Skill pack (OpenCrab-distilled
// advertising grammar). No DOM/browser — runs under `node --test`.
const test = require("node:test");
const assert = require("node:assert/strict");
const pack = require("../packs/ad-storyboard-skill.js");

const BEATS = ["hook", "tension", "reveal", "proof", "joy", "cta"];

test("six-beat contract is the canonical six beats in order", () => {
  assert.equal(pack.sixBeatContract.length, 6);
  assert.deepEqual(pack.sixBeatContract.map((b) => b.beat), BEATS);
});

test("classifyProductRisk: high-risk category without proof → claim-safe mode", () => {
  const r = pack.classifyProductRisk({ categoryId: "health-functional", hasProof: false, brief: "" });
  assert.equal(r.level, "high");
  assert.equal(r.ruling, "claim_safe_rewrite");
});

test("classifyProductRisk: high-risk category WITH proof → proof_required/allowed", () => {
  const r = pack.classifyProductRisk({ categoryId: "health-functional", hasProof: true, brief: "" });
  assert.equal(r.level, "proof_required");
  assert.equal(r.ruling, "allowed");
});

test("classifyProductRisk: low-risk sensory product → low/allowed", () => {
  const r = pack.classifyProductRisk({ categoryId: "sensory", hasProof: false, brief: "시원한 탄산음료" });
  assert.equal(r.level, "low");
  assert.equal(r.ruling, "allowed");
});

test("classifyProductRisk: claim language without proof → proof_required", () => {
  const r = pack.classifyProductRisk({ categoryId: "sensory", hasProof: false, brief: "효과 좋은 음료" });
  assert.equal(r.level, "proof_required");
});

test("classifyProductRisk: high-risk keyword in a free-form brief is auto-detected", () => {
  const r = pack.classifyProductRisk({ categoryId: "", hasProof: false, brief: "혈당 관리에 좋은 유산균" });
  assert.equal(r.level, "high");
  assert.equal(r.ruling, "claim_safe_rewrite");
  assert.ok(r.detected);
});

test("buildQcDirective mirrors the ruling", () => {
  const safe = pack.buildQcDirective(pack.classifyProductRisk({ categoryId: "medical", hasProof: false, brief: "" }));
  assert.match(safe, /클레임 세이프/);
  const none = pack.buildQcDirective(pack.classifyProductRisk({ categoryId: "sensory", hasProof: false, brief: "물" }));
  assert.equal(none, "");
});

test("recommendPatterns: always 3, never recommends proof_experiment without proof", () => {
  const noProof = pack.recommendPatterns({ categoryId: "health-functional", hasProof: false, brief: "" });
  assert.equal(noProof.length, 3);
  assert.ok(!noProof.some((p) => p.id === "proof_experiment"), "proof_experiment must not appear without proof");

  const withProof = pack.recommendPatterns({ categoryId: "sensory", hasProof: true, brief: "임상 데이터가 있는 제품" });
  assert.ok(withProof.some((p) => p.id === "proof_experiment"), "proof_experiment should appear with proof");
});

test("buildPatternDirective: known pattern → grammar line; proof pattern w/o proof warns", () => {
  const proofPattern = pack.creativePatterns.find((p) => p.id === "proof_experiment");
  const directive = pack.buildPatternDirective(proofPattern, { hasProof: false });
  assert.match(directive, /증명 실험|proof_experiment/);
  assert.match(directive, /증빙 자료가 없으므로|날조/);
  assert.equal(pack.buildPatternDirective(null, {}), "");
  assert.equal(pack.buildPatternDirective({ id: "does-not-exist" }, {}), "");
});

test("scaleSixBeatContract: 30s unchanged, 45s scales the proof window to 18-30s", () => {
  const at30 = pack.scaleSixBeatContract(30);
  assert.equal(at30.find((b) => b.beat === "proof").window, "12-20s");
  const at45 = pack.scaleSixBeatContract(45);
  assert.equal(at45.find((b) => b.beat === "proof").window, "18-30s");
  const at15 = pack.scaleSixBeatContract(15);
  assert.equal(at15.find((b) => b.beat === "cta").window, "13-15s");
});

test("buildDurationDirective: injects target runtime + scaled beats; empty for invalid", () => {
  const d45 = pack.buildDurationDirective(45);
  assert.match(d45, /총 45초/);
  assert.match(d45, /proof 18-30s/);
  assert.match(pack.buildDurationDirective(15), /총 15초/);
  assert.equal(pack.buildDurationDirective(0), "");
  assert.equal(pack.buildDurationDirective("nope"), "");
});

test("validateOutputContract: a complete, claim-free 6-beat board passes", () => {
  const cuts = BEATS.map((beat, i) => ({
    panelId: `p${i}`,
    beat,
    caption: `${beat} 컷 — 브랜드 무드`,
    promptText: "premium commercial still, elegant lighting"
  }));
  const report = pack.validateOutputContract({ cuts, risk: { level: "low" }, hasProof: true });
  assert.equal(report.pass, true, JSON.stringify(report.problems));
  assert.equal(report.problems.length, 0);
});

test("validateOutputContract: missing beats and wrong CTA count are reported", () => {
  const cuts = [
    { panelId: "a", beat: "hook", caption: "훅", promptText: "x" },
    { panelId: "b", beat: "cta", caption: "전환", promptText: "y" },
    { panelId: "c", beat: "cta", caption: "전환2", promptText: "z" }
  ];
  const report = pack.validateOutputContract({ cuts, risk: { level: "low" }, hasProof: true });
  assert.equal(report.pass, false);
  assert.ok(report.problems.some((p) => /빠진 비트/.test(p)));
  assert.ok(report.problems.some((p) => /CTA는 정확히 1개/.test(p)));
});

test("validateOutputContract: claim language in claim-safe mode is flagged and blocked", () => {
  const cuts = BEATS.map((beat, i) => ({
    panelId: `p${i}`,
    beat,
    caption: beat === "proof" ? "효과가 검증된 1위 제품" : `${beat} 컷`,
    promptText: "shot"
  }));
  const report = pack.validateOutputContract({ cuts, risk: { level: "high" }, hasProof: false });
  assert.ok(report.claimFindings.length >= 1);
  assert.equal(report.claimFindings[0].ruling, "blocked");
  assert.ok(report.problems.some((p) => /클레임 세이프 모드/.test(p)));
});

test("buildVideoJobSpec + markdown: model-neutral handoff structure", () => {
  const spec = pack.buildVideoJobSpec({
    project: { title: "테스트 광고", aspectRatio: "9:16", tone: "차분함" },
    cuts: [
      { sceneTitle: "오프닝", beat: "hook", durationLabel: "약 3초", hasKeyframe: true,
        i2vStartPrompt: "start", i2vMotionPrompt: "motion", i2vEndPrompt: "end" }
    ]
  });
  assert.equal(spec.title, "테스트 광고");
  assert.equal(spec.cuts.length, 1);
  assert.equal(spec.cuts[0].beatWindow, "0-3s");
  assert.ok(spec.globalNegatives.length > 0);

  const md = pack.renderVideoJobSpecMarkdown(spec);
  assert.match(md, /# 영상 생성 잡스펙 — 테스트 광고/);
  assert.match(md, /## 공통 네거티브 제약/);
  assert.match(md, /\*\*Start frame\*\*: start/);
  assert.equal(pack.renderVideoJobSpecMarkdown(null), "");
});
