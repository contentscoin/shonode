const { sendJson } = require("./storyboard-proxy");

let fileConfig = null;
try {
  fileConfig = require("./shonode.config.json");
} catch {
  fileConfig = null;
}

/**
 * Serves the public client configuration.
 * Only values that are safe to expose to the browser belong here
 * (the Supabase URL and anon/publishable key are public by design).
 * Environment variables take precedence over shonode.config.json.
 * When Supabase is not configured at all, returns an empty object and
 * the frontend stays in local-only mode.
 */
function handleConfigRequest(request, response) {
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const supabaseUrl = (process.env.SUPABASE_URL || fileConfig?.supabaseUrl || "").trim();
  const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || fileConfig?.supabaseAnonKey || "").trim();
  const geminiConfigured = Boolean((process.env.GEMINI_API_KEY || "").trim());

  if (!supabaseUrl || !supabaseAnonKey) {
    sendJson(response, 200, { geminiConfigured });
    return;
  }

  sendJson(response, 200, { supabaseUrl, supabaseAnonKey, geminiConfigured });
}

module.exports = { handleConfigRequest };
