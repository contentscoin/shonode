// NOTE: deliberately dependency-free (no require of storyboard-proxy) so the
// proxies can require this module without creating a require cycle.
function getHeaderValue(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

let fileConfig = null;
try {
  fileConfig = require("./shonode.config.json");
} catch {
  fileConfig = null;
}

// Stage costs are the single server-side source of truth (기획서 §6).
const STAGE_COSTS = {
  storyboard: 3,
  image: 2
};

function getSupabaseServerConfig() {
  const url = (process.env.SUPABASE_URL || fileConfig?.supabaseUrl || "").trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || fileConfig?.supabaseAnonKey || "").trim();
  if (!url || !anonKey) {
    return null;
  }
  return { url: url.replace(/\/+$/, ""), anonKey };
}

async function callRpc(config, token, fn, args) {
  const response = await fetch(`${config.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.anonKey,
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(args)
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { ok: response.ok, status: response.status, body, text };
}

/**
 * Escrow-style credit charge for server-key (Gemini) generation stages.
 *
 * Behavior matrix:
 * - Supabase not configured (self-hosted / open-core): metering is OFF —
 *   returns { skip: true } and the caller proceeds for free.
 * - Configured but no user token: 401 — hosted server-key usage requires a
 *   signed-in account (BYO-key providers stay unmetered).
 * - Insufficient balance: 402 with the current balance in the hint.
 * - Supabase unreachable / RPC error: fail CLOSED (503) — never silently free.
 *
 * On success returns { jobId, balance, finish(ok, err), refund(reason) };
 * finish/refund are fire-and-forget (they log, never throw).
 */
async function chargeCredits(request, { stage, provider = "gemini" }) {
  // Self-host opt-out: forks that keep shonode.config.json (or set Supabase
  // env for cloud sync) but do NOT want server-key metering can disable it.
  if ((process.env.SHONODE_CREDITS || "").trim().toLowerCase() === "off") {
    return { skip: true };
  }

  const config = getSupabaseServerConfig();
  if (!config) {
    return { skip: true };
  }

  const cost = STAGE_COSTS[stage];
  if (!cost) {
    return { skip: true };
  }

  const token = (getHeaderValue(request.headers?.["x-shonode-auth"]) || "").trim();
  if (!token || token.length > 4096 || /\s/.test(token)) {
    return {
      errorStatus: 401,
      errorBody: {
        error: "로그인이 필요합니다.",
        hint: `서버 키(Gemini) 생성은 크레딧으로 운영됩니다 (${stage} ${cost}크레딧). 클라우드 로그인 후 이용하거나, 내 API 키(OpenAI) 제공자를 선택하세요.`,
        code: "auth_required"
      }
    };
  }

  let result;
  try {
    result = await callRpc(config, token, "consume_credits", { cost, stage, provider });
  } catch (error) {
    return {
      errorStatus: 503,
      errorBody: {
        error: "크레딧 서버에 연결하지 못했습니다.",
        hint: "잠시 후 다시 시도해주세요.",
        details: error.message || ""
      }
    };
  }

  if (!result.ok) {
    const message = result.body?.message || result.text || "";
    if (/insufficient credits/i.test(message)) {
      return {
        errorStatus: 402,
        errorBody: {
          error: "크레딧이 부족합니다.",
          hint: `${stage} 생성에는 ${cost}크레딧이 필요합니다. 매월 플랜 크레딧이 자동 지급되며, 내 API 키(OpenAI) 제공자는 크레딧 없이 사용할 수 있습니다.`,
          code: "insufficient_credits"
        }
      };
    }
    if (result.status === 401 || /not authenticated|jwt/i.test(message)) {
      return {
        errorStatus: 401,
        errorBody: {
          error: "로그인 세션이 만료되었습니다.",
          hint: "클라우드에 다시 로그인해주세요.",
          code: "auth_required"
        }
      };
    }
    return {
      errorStatus: 503,
      errorBody: {
        error: "크레딧 차감에 실패했습니다.",
        hint: "잠시 후 다시 시도해주세요.",
        details: message.slice(0, 300)
      }
    };
  }

  const jobId = result.body?.job_id || "";
  const balance = Number.isFinite(result.body?.balance) ? result.body.balance : null;

  return {
    jobId,
    balance,
    async finish(ok, err = "") {
      try {
        await callRpc(config, token, "finish_generation_job", {
          target_job_id: jobId,
          ok: Boolean(ok),
          err: String(err).slice(0, 500)
        });
      } catch (error) {
        console.warn("[Shonode] finish_generation_job failed:", error.message);
      }
    },
    async refund(reason = "upstream_failed") {
      try {
        await callRpc(config, token, "refund_credits", {
          target_job_id: jobId,
          refund_reason: String(reason).slice(0, 200)
        });
      } catch (error) {
        console.warn("[Shonode] refund_credits failed:", error.message);
      }
    }
  };
}

module.exports = { chargeCredits, STAGE_COSTS, getSupabaseServerConfig };
