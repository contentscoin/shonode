const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_KEY_ENV = "GEMINI_API_KEY";
const MAX_BODY_BYTES = 60 * 1024 * 1024;
const MAX_CONTENTS = 4;
const MAX_PARTS_PER_CONTENT = 24;
const MAX_TEXT_LENGTH = 50_000;
const MAX_INLINE_DATA_LENGTH = 25 * 1024 * 1024;

async function handleStoryboardProxy(request, response, options = {}) {
  const originPolicy = getOriginPolicy(request, options);
  setCorsHeaders(response, originPolicy.allowOrigin);

  if (request.method === "OPTIONS") {
    response.statusCode = originPolicy.allowed ? 204 : 403;
    response.end();
    return;
  }

  if (!originPolicy.allowed) {
    sendJson(response, 403, {
      error: "Origin not allowed.",
      hint: "Use the Shonode app from the same origin as this API."
    });
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const apiKey = process.env[GEMINI_API_KEY_ENV];
  if (!apiKey) {
    sendJson(response, 500, {
      error: "Gemini API key is not configured.",
      hint: options.apiKeyHint || `Set ${GEMINI_API_KEY_ENV} in the environment.`
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request, options.maxBytes || MAX_BODY_BYTES);
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Invalid JSON body." });
    return;
  }

  const model = sanitizeModel(body?.model) || DEFAULT_MODEL;
  const storyboardRequest = body?.request;
  if (!isValidStoryboardRequest(storyboardRequest)) {
    sendJson(response, 400, {
      error: "Invalid storyboard request payload.",
      hint: "Shonode only accepts the expected JSON storyboard schema."
    });
    return;
  }

  // Credit metering (escrow): server-key usage is charged when cloud mode is
  // configured; self-hosted deployments without Supabase stay free.
  const { chargeCredits } = require("./credits");
  const charge = await chargeCredits(request, { stage: "storyboard", provider: "gemini" });
  if (charge.errorStatus) {
    sendJson(response, charge.errorStatus, charge.errorBody);
    return;
  }

  const baseUrl = (process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com").replace(/\/+$/, "");
  const endpoint = `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let upstreamResponse;
  try {
    upstreamResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(storyboardRequest)
    });
  } catch (error) {
    if (!charge.skip) {
      await charge.refund("upstream_fetch_failed");
    }
    sendJson(response, 502, {
      error: "Failed to reach Gemini upstream.",
      details: error.message || "Unknown fetch error."
    });
    return;
  }

  let responseText;
  try {
    responseText = await upstreamResponse.text();
  } catch (error) {
    if (!charge.skip) {
      await charge.refund("upstream_body_read_failed");
    }
    sendJson(response, 502, {
      error: "Failed to read Gemini upstream response.",
      details: error.message || "Unknown body read error."
    });
    return;
  }

  if (!charge.skip) {
    if (upstreamResponse.ok) {
      // A 200 with no usable text (safety block, empty candidates, malformed
      // JSON) gives the user nothing — refund instead of finishing the charge.
      const planText = extractPlanText(responseText);
      if (planText === null) {
        await charge.refund("upstream_invalid_json");
        sendJson(response, 502, { error: "Gemini returned invalid JSON." });
        return;
      }
      if (!planText) {
        await charge.refund("upstream_no_text");
        sendJson(response, 502, { error: "Gemini returned no storyboard text." });
        return;
      }
      await charge.finish(true);
      if (charge.balance !== null) {
        response.setHeader("x-shonode-credit-balance", String(charge.balance));
        response.setHeader("Access-Control-Expose-Headers", "x-shonode-credit-balance");
      }
    } else {
      await charge.refund(`upstream_${upstreamResponse.status}`);
    }
  }
  response.statusCode = upstreamResponse.status;
  response.setHeader("Content-Type", upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8");
  response.end(responseText);
}

// Returns the concatenated candidate text, "" when the response parses but
// carries no text, or null when the body is not valid JSON.
function extractPlanText(responseText) {
  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    return null;
  }
  const parts = result?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function getOriginPolicy(request, options = {}) {
  const origin = getHeaderValue(request.headers?.origin);
  const requestOrigin = inferRequestOrigin(request);
  const allowedOrigins = new Set(parseAllowedOrigins(process.env.SHONODE_ALLOWED_ORIGINS));

  if (requestOrigin) {
    allowedOrigins.add(requestOrigin);
  }

  for (const value of options.allowedOrigins || []) {
    if (typeof value === "string" && value.trim()) {
      allowedOrigins.add(value.trim());
    }
  }

  const allowMissingOrigin = options.allowMissingOrigin ?? !process.env.VERCEL;
  if (!origin) {
    return {
      allowed: allowMissingOrigin,
      allowOrigin: requestOrigin || Array.from(allowedOrigins)[0] || ""
    };
  }

  return {
    allowed: allowedOrigins.has(origin),
    allowOrigin: origin
  };
}

function inferRequestOrigin(request) {
  const host = getHeaderValue(request.headers?.["x-forwarded-host"]) || getHeaderValue(request.headers?.host);
  if (!host) {
    return "";
  }

  const forwardedProto = getHeaderValue(request.headers?.["x-forwarded-proto"]);
  const protocol = forwardedProto
    || (host.startsWith("127.0.0.1") || host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

function getHeaderValue(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }

  return typeof value === "string" ? value : "";
}

function parseAllowedOrigins(value) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function readJsonBody(request, maxBytes) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return request.body ? JSON.parse(request.body) : {};
  }

  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request body too large."));
        request.destroy();
        return;
      }

      body += chunk.toString("utf8");
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error(`JSON parse failed: ${error.message}`));
      }
    });

    request.on("error", (error) => {
      reject(error);
    });
  });
}

function isValidStoryboardRequest(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return false;
  }

  if (!Array.isArray(candidate.contents) || candidate.contents.length === 0 || candidate.contents.length > MAX_CONTENTS) {
    return false;
  }

  if (!candidate.contents.every(isValidContent)) {
    return false;
  }

  const generationConfig = candidate.generationConfig;
  if (!generationConfig || typeof generationConfig !== "object" || Array.isArray(generationConfig)) {
    return false;
  }

  return generationConfig.responseMimeType === "application/json";
}

function isValidContent(content) {
  return Boolean(
    content
    && typeof content === "object"
    && !Array.isArray(content)
    && Array.isArray(content.parts)
    && content.parts.length > 0
    && content.parts.length <= MAX_PARTS_PER_CONTENT
    && content.parts.every(isValidPart)
  );
}

function isValidPart(part) {
  if (!part || typeof part !== "object" || Array.isArray(part)) {
    return false;
  }

  const hasValidText = typeof part.text === "string" && part.text.trim().length > 0 && part.text.length <= MAX_TEXT_LENGTH;
  const inlineData = part.inlineData || part.inline_data;
  const hasValidInlineData = isValidInlineData(inlineData);

  return hasValidText || hasValidInlineData;
}

function isValidInlineData(inlineData) {
  if (!inlineData || typeof inlineData !== "object" || Array.isArray(inlineData)) {
    return false;
  }

  const mimeType = typeof inlineData.mimeType === "string"
    ? inlineData.mimeType
    : typeof inlineData.mime_type === "string"
      ? inlineData.mime_type
      : "";
  const data = typeof inlineData.data === "string" ? inlineData.data : "";

  return Boolean(mimeType.startsWith("image/") && data.length > 0 && data.length <= MAX_INLINE_DATA_LENGTH);
}

function sanitizeModel(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return /^[a-zA-Z0-9._-]+$/.test(trimmed) ? trimmed : "";
}

function setCorsHeaders(response, allowOrigin) {
  if (allowOrigin) {
    response.setHeader("Access-Control-Allow-Origin", allowOrigin);
    response.setHeader("Vary", "Origin");
  }

  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, x-shonode-auth");
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

module.exports = {
  handleStoryboardProxy,
  sendJson,
  getOriginPolicy,
  readJsonBody,
  sanitizeModel,
  getHeaderValue
};
