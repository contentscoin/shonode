const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { sendJson, getOriginPolicy, readJsonBody } = require("./storyboard-proxy");

const MAX_BODY_BYTES = 60 * 1024 * 1024;
const MAX_PROMPT_LENGTH = 100_000;
const MAX_IMAGES = 10;
const MAX_IMAGE_DATA_URL_LENGTH = 25 * 1024 * 1024;
const CODEX_TIMEOUT_MS = Number.parseInt(process.env.CODEX_TIMEOUT_MS || "180000", 10);

/**
 * Codex CLI (ChatGPT OAuth) provider — LOCAL MODE ONLY.
 * Runs the locally installed `codex` CLI, which authenticates with the
 * operator's own ChatGPT account (`codex login`), so no API key is needed.
 * This cannot work on serverless hosting: there is no Codex CLI and no user
 * OAuth session there, so the route refuses to run on Vercel.
 * CODEX_BIN overrides the binary path; extra args via CODEX_EXTRA_ARGS.
 */
async function handleCodexStoryboardProxy(request, response, options = {}) {
  const originPolicy = getOriginPolicy(request, options);
  setCorsHeaders(response, originPolicy.allowOrigin);

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

  if (process.env.VERCEL) {
    sendJson(response, 501, {
      error: "Codex provider is local-only.",
      hint: "Codex (ChatGPT OAuth) runs the local Codex CLI. Run Shonode locally with `npm run dev` after `codex login`, or switch the AI provider."
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

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    sendJson(response, 400, { error: "Invalid prompt." });
    return;
  }

  const images = Array.isArray(body?.images) ? body.images.slice(0, MAX_IMAGES) : [];
  if (!images.every((item) => typeof item === "string" && /^data:image\//i.test(item) && item.length <= MAX_IMAGE_DATA_URL_LENGTH)) {
    sendJson(response, 400, { error: "Invalid reference images." });
    return;
  }

  let workDir = "";
  try {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), "shonode-codex-"));
    const imagePaths = await writeImageFiles(workDir, images);
    const outputPath = path.join(workDir, "last-message.txt");

    const result = await runCodex({ prompt, imagePaths, outputPath, workDir });
    if (result.error) {
      sendJson(response, 502, result.error);
      return;
    }

    let content = "";
    try {
      content = (await fs.readFile(outputPath, "utf8")).trim();
    } catch {
      content = "";
    }
    if (!content) {
      content = result.stdout.trim();
    }

    if (!content) {
      sendJson(response, 502, {
        error: "Codex produced no output.",
        details: result.stderr.slice(-2000)
      });
      return;
    }

    sendJson(response, 200, { content });
  } catch (error) {
    sendJson(response, 500, { error: "Codex proxy failed.", details: error.message || "Unknown error." });
  } finally {
    if (workDir) {
      fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

async function writeImageFiles(workDir, images) {
  const paths = [];
  for (let index = 0; index < images.length; index += 1) {
    const dataUrl = images[index];
    const commaIndex = dataUrl.indexOf(",");
    const metadata = dataUrl.slice(0, commaIndex);
    const payload = dataUrl.slice(commaIndex + 1);
    const extension = (metadata.match(/^data:image\/([a-z0-9+.-]+)/i)?.[1] || "png").replace("jpeg", "jpg");
    const filePath = path.join(workDir, `reference-${index + 1}.${extension}`);
    const buffer = /;base64/i.test(metadata)
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf8");
    await fs.writeFile(filePath, buffer);
    paths.push(filePath);
  }
  return paths;
}

function runCodex({ prompt, imagePaths, outputPath, workDir }) {
  const binary = process.env.CODEX_BIN || "codex";
  const extraArgs = (process.env.CODEX_EXTRA_ARGS || "")
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);

  const args = [
    "exec",
    "--skip-git-repo-check",
    "--output-last-message",
    outputPath,
    ...extraArgs
  ];
  imagePaths.forEach((imagePath) => {
    args.push("--image", imagePath);
  });
  args.push(prompt);

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const child = spawn(binary, args, {
      cwd: workDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env
    });

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGKILL");
        resolve({
          stdout,
          stderr,
          error: { error: "Codex timed out.", hint: `Increase CODEX_TIMEOUT_MS (current ${CODEX_TIMEOUT_MS}ms).` }
        });
      }
    }, CODEX_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        resolve({
          stdout,
          stderr,
          error: {
            error: "Codex CLI not available.",
            hint: "Install the Codex CLI and sign in with `codex login` (ChatGPT account), or set CODEX_BIN.",
            details: error.message
          }
        });
      }
    });

    child.on("close", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        if (code !== 0) {
          resolve({
            stdout,
            stderr,
            error: {
              error: `Codex exited with code ${code}.`,
              details: stderr.slice(-2000) || stdout.slice(-2000)
            }
          });
          return;
        }
        resolve({ stdout, stderr, error: null });
      }
    });
  });
}

function setCorsHeaders(response, allowOrigin) {
  if (allowOrigin) {
    response.setHeader("Access-Control-Allow-Origin", allowOrigin);
    response.setHeader("Vary", "Origin");
  }

  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = { handleCodexStoryboardProxy };
