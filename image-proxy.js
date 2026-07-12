const { sendJson, getOriginPolicy, readJsonBody, getHeaderValue } = require("./storyboard-proxy");

const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const MAX_BODY_BYTES = 60 * 1024 * 1024;
const MAX_PROMPT_LENGTH = 10_000;
const MAX_REFERENCE_IMAGES = 4;
const MAX_IMAGE_DATA_URL_LENGTH = 25 * 1024 * 1024;

/**
 * Keyframe image generation proxies. Mirrors the storyboard proxies:
 * - Gemini path uses the operator's server-side GEMINI_API_KEY and supports
 *   reference images (I2I) as inlineData parts.
 * - OpenAI path is BYO-key (x-openai-key header, never stored) and is
 *   prompt-only in this version.
 * GEMINI_IMAGE_BASE_URL / OPENAI_BASE_URL override upstreams for testing.
 */
async function handleGeminiImageProxy(request, response, options = {}) {
  const originPolicy = getOriginPolicy(request, options);
  setCorsHeaders(response, originPolicy.allowOrigin, "Content-Type, x-shonode-auth");

  if (request.method === "OPTIONS") {
    response.statusCode = originPolicy.allowed ? 204 : 403;
    response.end();
    return;
  }
  if (!originPolicy.allowed) {
    sendJson(response, 403, { error: "Origin not allowed." });
    return;
  }
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendJson(response, 500, {
      error: "Gemini API key is not configured.",
      hint: options.apiKeyHint || "Set GEMINI_API_KEY in the environment."
    });
    return;
  }

  const body = await readValidatedBody(request, response, options);
  if (!body) {
    return;
  }

  const { chargeCredits } = require("./credits");
  const charge = await chargeCredits(request, { stage: "image", provider: "gemini" });
  if (charge.errorStatus) {
    sendJson(response, charge.errorStatus, charge.errorBody);
    return;
  }

  const parts = [{ text: body.prompt }];
  body.images.forEach((dataUrl) => {
    const inline = dataUrlToInlineData(dataUrl);
    if (inline) {
      parts.push({ inlineData: inline });
    }
  });

  const baseUrl = (process.env.GEMINI_IMAGE_BASE_URL || "https://generativelanguage.googleapis.com").replace(/\/+$/, "");
  const endpoint = `${baseUrl}/v1beta/models/${encodeURIComponent(GEMINI_IMAGE_MODEL)}:generateContent`;

  let upstream;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["IMAGE"] }
      })
    });
  } catch (error) {
    if (!charge.skip) {
      await charge.refund("upstream_fetch_failed");
    }
    sendJson(response, 502, { error: "Failed to reach Gemini upstream.", details: error.message || "" });
    return;
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    if (!charge.skip) {
      await charge.refund(`upstream_${upstream.status}`);
    }
    sendJson(response, upstream.status, { error: "Gemini image generation failed.", details: text.slice(0, 2000) });
    return;
  }

  let result;
  try {
    result = await upstream.json();
  } catch {
    if (!charge.skip) {
      await charge.refund("upstream_invalid_json");
    }
    sendJson(response, 502, { error: "Gemini returned invalid JSON." });
    return;
  }

  const imagePart = result?.candidates?.[0]?.content?.parts?.find(
    (part) => part?.inlineData?.data || part?.inline_data?.data
  );
  const inline = imagePart?.inlineData || imagePart?.inline_data;
  if (!inline?.data) {
    if (!charge.skip) {
      await charge.refund("upstream_no_image");
    }
    sendJson(response, 502, { error: "Gemini returned no image data." });
    return;
  }

  if (!charge.skip) {
    await charge.finish(true);
    if (charge.balance !== null) {
      response.setHeader("x-shonode-credit-balance", String(charge.balance));
      response.setHeader("Access-Control-Expose-Headers", "x-shonode-credit-balance");
    }
  }
  const mimeType = inline.mimeType || inline.mime_type || "image/png";
  sendJson(response, 200, { dataUrl: `data:${mimeType};base64,${inline.data}` });
}

async function handleOpenAIImageProxy(request, response, options = {}) {
  const originPolicy = getOriginPolicy(request, options);
  setCorsHeaders(response, originPolicy.allowOrigin, "Content-Type, x-openai-key");

  if (request.method === "OPTIONS") {
    response.statusCode = originPolicy.allowed ? 204 : 403;
    response.end();
    return;
  }
  if (!originPolicy.allowed) {
    sendJson(response, 403, { error: "Origin not allowed." });
    return;
  }
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const apiKey = (getHeaderValue(request.headers?.["x-openai-key"]) || "").trim();
  if (!apiKey || apiKey.length > 300 || /\s/.test(apiKey)) {
    sendJson(response, 401, {
      error: "OpenAI API key is missing.",
      hint: "Set your OpenAI API key in the AI provider settings (stored only in your browser)."
    });
    return;
  }

  const body = await readValidatedBody(request, response, options);
  if (!body) {
    return;
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
  let upstream;
  try {
    upstream = await fetch(`${baseUrl}/v1/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt: body.prompt,
        n: 1,
        size: "1536x1024"
      })
    });
  } catch (error) {
    sendJson(response, 502, { error: "Failed to reach OpenAI upstream.", details: error.message || "" });
    return;
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    sendJson(response, upstream.status, { error: "OpenAI image generation failed.", details: text.slice(0, 2000) });
    return;
  }

  let result;
  try {
    result = await upstream.json();
  } catch {
    sendJson(response, 502, { error: "OpenAI returned invalid JSON." });
    return;
  }

  const b64 = result?.data?.[0]?.b64_json;
  if (!b64) {
    sendJson(response, 502, { error: "OpenAI returned no image data." });
    return;
  }

  sendJson(response, 200, { dataUrl: `data:image/png;base64,${b64}` });
}

async function readValidatedBody(request, response, options) {
  let body;
  try {
    body = await readJsonBody(request, options.maxBytes || MAX_BODY_BYTES);
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Invalid JSON body." });
    return null;
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    sendJson(response, 400, { error: "Invalid prompt." });
    return null;
  }

  const images = Array.isArray(body?.images) ? body.images.slice(0, MAX_REFERENCE_IMAGES) : [];
  const validImages = images.every(
    (item) => typeof item === "string" && /^data:image\//i.test(item) && item.length <= MAX_IMAGE_DATA_URL_LENGTH
  );
  if (!validImages) {
    sendJson(response, 400, { error: "Invalid reference images." });
    return null;
  }

  return { prompt, images };
}

function dataUrlToInlineData(dataUrl) {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    return null;
  }
  const metadata = dataUrl.slice(0, commaIndex);
  if (!/;base64/i.test(metadata)) {
    return null;
  }
  return {
    mimeType: metadata.match(/^data:([^;,]+)/i)?.[1] || "image/png",
    data: dataUrl.slice(commaIndex + 1)
  };
}

function setCorsHeaders(response, allowOrigin, allowHeaders) {
  if (allowOrigin) {
    response.setHeader("Access-Control-Allow-Origin", allowOrigin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", allowHeaders);
}

module.exports = { handleGeminiImageProxy, handleOpenAIImageProxy };
