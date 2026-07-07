const { sendJson, getOriginPolicy, readJsonBody, sanitizeModel, getHeaderValue } = require("./storyboard-proxy");

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const MAX_BODY_BYTES = 60 * 1024 * 1024;
const MAX_MESSAGES = 4;
const MAX_PARTS_PER_MESSAGE = 24;
const MAX_TEXT_LENGTH = 50_000;
const MAX_IMAGE_URL_LENGTH = 25 * 1024 * 1024;
const MAX_OUTPUT_TOKENS = 16_384;

/**
 * BYO-key OpenAI proxy. The user's OpenAI API key arrives in the
 * `x-openai-key` request header, is used once to call the upstream, and is
 * never persisted or logged. The server holds no OpenAI credentials.
 * OPENAI_BASE_URL can override the upstream for testing or compatible APIs.
 */
async function handleOpenAIStoryboardProxy(request, response, options = {}) {
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

  const apiKey = sanitizeApiKey(getHeaderValue(request.headers?.["x-openai-key"]));
  if (!apiKey) {
    sendJson(response, 401, {
      error: "OpenAI API key is missing.",
      hint: "Set your OpenAI API key in the AI provider settings (stored only in your browser)."
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

  const model = sanitizeModel(body?.model) || DEFAULT_OPENAI_MODEL;
  const chatRequest = body?.request;
  if (!isValidChatRequest(chatRequest)) {
    sendJson(response, 400, {
      error: "Invalid storyboard request payload.",
      hint: "Shonode only accepts the expected JSON storyboard schema."
    });
    return;
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
  let upstreamResponse;
  try {
    upstreamResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        ...chatRequest,
        model,
        stream: false
      })
    });
  } catch (error) {
    sendJson(response, 502, {
      error: "Failed to reach OpenAI upstream.",
      details: error.message || "Unknown fetch error."
    });
    return;
  }

  const responseText = await upstreamResponse.text();
  response.statusCode = upstreamResponse.status;
  response.setHeader("Content-Type", upstreamResponse.headers.get("content-type") || "application/json; charset=utf-8");
  response.end(responseText);
}

function sanitizeApiKey(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed || trimmed.length > 300 || /\s/.test(trimmed)) {
    return "";
  }
  return trimmed;
}

function isValidChatRequest(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return false;
  }

  if (!Array.isArray(candidate.messages) || candidate.messages.length === 0 || candidate.messages.length > MAX_MESSAGES) {
    return false;
  }

  if (!candidate.messages.every(isValidMessage)) {
    return false;
  }

  if (candidate.response_format?.type !== "json_schema" && candidate.response_format?.type !== "json_object") {
    return false;
  }

  if (candidate.max_tokens !== undefined && !(Number.isInteger(candidate.max_tokens) && candidate.max_tokens > 0 && candidate.max_tokens <= MAX_OUTPUT_TOKENS)) {
    return false;
  }

  return true;
}

function isValidMessage(message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return false;
  }

  if (message.role !== "user" && message.role !== "system") {
    return false;
  }

  if (typeof message.content === "string") {
    return message.content.trim().length > 0 && message.content.length <= MAX_TEXT_LENGTH;
  }

  return Array.isArray(message.content)
    && message.content.length > 0
    && message.content.length <= MAX_PARTS_PER_MESSAGE
    && message.content.every(isValidContentPart);
}

function isValidContentPart(part) {
  if (!part || typeof part !== "object" || Array.isArray(part)) {
    return false;
  }

  if (part.type === "text") {
    return typeof part.text === "string" && part.text.trim().length > 0 && part.text.length <= MAX_TEXT_LENGTH;
  }

  if (part.type === "image_url") {
    const url = part.image_url?.url;
    return typeof url === "string" && /^data:image\//i.test(url) && url.length <= MAX_IMAGE_URL_LENGTH;
  }

  return false;
}

function setCorsHeaders(response, allowOrigin) {
  if (allowOrigin) {
    response.setHeader("Access-Control-Allow-Origin", allowOrigin);
    response.setHeader("Vary", "Origin");
  }

  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, x-openai-key");
}

module.exports = { handleOpenAIStoryboardProxy };
