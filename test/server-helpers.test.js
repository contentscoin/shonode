// Pure-logic tests for server-side helpers (origin policy, model sanitizing,
// credit-charge gating). No network — every path asserted here short-circuits
// before any upstream/Supabase call. Runs under `node --test`.
const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeModel, getHeaderValue, getOriginPolicy } = require("../storyboard-proxy.js");
const { chargeCredits, STAGE_COSTS, getSupabaseServerConfig } = require("../credits.js");

function withEnv(overrides, fn) {
  const saved = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  }
}

test("sanitizeModel: allows safe ids, rejects paths and non-strings", () => {
  assert.equal(sanitizeModel("gemini-2.5-flash"), "gemini-2.5-flash");
  assert.equal(sanitizeModel("models/evil.."), "");
  assert.equal(sanitizeModel("a b"), "");
  assert.equal(sanitizeModel(""), "");
  assert.equal(sanitizeModel(123), "");
});

test("getHeaderValue: normalizes array/string/other", () => {
  assert.equal(getHeaderValue(["a", "b"]), "a");
  assert.equal(getHeaderValue("solo"), "solo");
  assert.equal(getHeaderValue(undefined), "");
  assert.equal(getHeaderValue(42), "");
});

test("getOriginPolicy: missing origin allowed off-Vercel, blocked when VERCEL set", () => {
  withEnv({ VERCEL: undefined, SHONODE_ALLOWED_ORIGINS: undefined }, () => {
    const req = { headers: { host: "127.0.0.1:4173" } };
    assert.equal(getOriginPolicy(req).allowed, true);
  });
  withEnv({ VERCEL: "1", SHONODE_ALLOWED_ORIGINS: undefined }, () => {
    const req = { headers: { host: "shonode.example" } };
    assert.equal(getOriginPolicy(req).allowed, false);
  });
});

test("getOriginPolicy: same-origin allowed, foreign origin blocked", () => {
  withEnv({ SHONODE_ALLOWED_ORIGINS: undefined }, () => {
    const same = { headers: { host: "127.0.0.1:4173", origin: "http://127.0.0.1:4173" } };
    assert.equal(getOriginPolicy(same).allowed, true);

    const foreign = { headers: { host: "127.0.0.1:4173", origin: "https://evil.example" } };
    assert.equal(getOriginPolicy(foreign).allowed, false);
  });
});

test("getOriginPolicy: SHONODE_ALLOWED_ORIGINS extends the allowlist", () => {
  withEnv({ SHONODE_ALLOWED_ORIGINS: "https://app.example" }, () => {
    const req = { headers: { host: "app.example", origin: "https://app.example" } };
    assert.equal(getOriginPolicy(req).allowed, true);
  });
});

test("STAGE_COSTS: storyboard and image are the metered stages", () => {
  assert.equal(STAGE_COSTS.storyboard, 3);
  assert.equal(STAGE_COSTS.image, 2);
});

test("getSupabaseServerConfig: env overrides the committed config; trims trailing slash", () => {
  // NOTE: the repo ships shonode.config.json (public anon key by design), so a
  // config is present even without env. Assert env takes precedence + is shaped.
  withEnv({ SUPABASE_URL: "https://env.supabase.co/", SUPABASE_ANON_KEY: "env-anon" }, () => {
    const cfg = getSupabaseServerConfig();
    assert.equal(cfg.url, "https://env.supabase.co"); // trailing slash trimmed
    assert.equal(cfg.anonKey, "env-anon");
  });
  // Without env it still resolves the committed file config (not null).
  withEnv({ SUPABASE_URL: undefined, SUPABASE_ANON_KEY: undefined }, () => {
    const cfg = getSupabaseServerConfig();
    assert.ok(cfg && typeof cfg.url === "string" && cfg.url.length > 0);
    assert.ok(typeof cfg.anonKey === "string" && cfg.anonKey.length > 0);
  });
});

test("chargeCredits: SHONODE_CREDITS=off opts out entirely (skip, no network)", async () => {
  await withEnv({ SHONODE_CREDITS: "off" }, async () => {
    assert.deepEqual(await chargeCredits({ headers: {} }, { stage: "storyboard" }), { skip: true });
  });
});

test("chargeCredits: unknown stage skips before any RPC (cost lookup miss)", async () => {
  await withEnv({ SHONODE_CREDITS: undefined }, async () => {
    const result = await chargeCredits({ headers: {} }, { stage: "bogus-stage" });
    assert.deepEqual(result, { skip: true });
  });
});

test("chargeCredits: configured + valid stage + no auth token → 401 before RPC", async () => {
  // Config comes from the committed shonode.config.json; no token → fail closed.
  await withEnv({ SHONODE_CREDITS: undefined, SUPABASE_URL: undefined, SUPABASE_ANON_KEY: undefined }, async () => {
    const result = await chargeCredits({ headers: {} }, { stage: "storyboard" });
    assert.equal(result.errorStatus, 401);
    assert.equal(result.errorBody.code, "auth_required");
  });
});
