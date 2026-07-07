const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { handleStoryboardProxy, sendJson } = require("./storyboard-proxy");
const { handleConfigRequest } = require("./config-endpoint");
const { handleOpenAIStoryboardProxy } = require("./openai-proxy");
const { handleCodexStoryboardProxy } = require("./codex-proxy");

const ROOT_DIR = __dirname;

loadEnvFile(path.join(ROOT_DIR, ".env"));

const DEFAULT_PORT = Number.parseInt(process.env.PORT || "4173", 10);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

const requestHandler = async (request, response) => {
  try {
    if (!request.url) {
      sendJson(response, 400, { error: "Missing request URL." });
      return;
    }

    const requestUrl = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);

    if (requestUrl.pathname === "/api/storyboard") {
      await handleStoryboardProxy(request, response, {
        apiKeyHint: "Set GEMINI_API_KEY in .env or the environment."
      });
      return;
    }

    if (requestUrl.pathname === "/api/config") {
      handleConfigRequest(request, response);
      return;
    }

    if (requestUrl.pathname === "/api/storyboard-openai") {
      await handleOpenAIStoryboardProxy(request, response);
      return;
    }

    if (requestUrl.pathname === "/api/storyboard-codex") {
      await handleCodexStoryboardProxy(request, response);
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }

    await serveStaticFile(requestUrl.pathname, response, request.method === "HEAD");
  } catch (error) {
    console.error("[Shonode] Unexpected server error:", error);
    sendJson(response, 500, { error: "Unexpected server error." });
  }
};

listenWithFallback(DEFAULT_PORT, 8);

async function serveStaticFile(requestPath, response, isHeadRequest = false) {
  const pathname = requestPath === "/" ? "/index.html" : requestPath;
  const safePath = decodeURIComponent(pathname);
  const pathSegments = safePath.split("/").filter(Boolean);

  if (pathSegments.some((segment) => segment.startsWith("."))) {
    sendJson(response, 404, { error: "File not found." });
    return;
  }

  const resolvedPath = path.resolve(ROOT_DIR, `.${safePath}`);

  if (!resolvedPath.startsWith(ROOT_DIR)) {
    sendJson(response, 403, { error: "Forbidden path." });
    return;
  }

  let stats;
  try {
    stats = await fsp.stat(resolvedPath);
  } catch {
    sendJson(response, 404, { error: "File not found." });
    return;
  }

  if (stats.isDirectory()) {
    await serveStaticFile(path.posix.join(pathname, "index.html"), response, isHeadRequest);
    return;
  }

  const extension = path.extname(resolvedPath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";

  response.statusCode = 200;
  response.setHeader("Content-Type", contentType);

  if (isHeadRequest) {
    response.end();
    return;
  }

  fs.createReadStream(resolvedPath).pipe(response);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (!key || process.env[key] !== undefined) {
      return;
    }

    process.env[key] = value;
  });
}

function listenWithFallback(startPort, retriesLeft) {
  const server = http.createServer(requestHandler);

  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE" && retriesLeft > 0) {
      const nextPort = startPort + 1;
      console.warn(`[Shonode] Port ${startPort} is already in use. Trying ${nextPort}...`);
      listenWithFallback(nextPort, retriesLeft - 1);
      return;
    }

    console.error(`[Shonode] Failed to start server on port ${startPort}.`, error);
    process.exit(1);
  });

  server.listen(startPort, () => {
    process.env.PORT = String(startPort);
    console.log(`[Shonode] Server running at http://127.0.0.1:${startPort}`);
  });
}
