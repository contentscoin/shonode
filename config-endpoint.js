const { sendJson } = require("./storyboard-proxy");

/**
 * Serves the public client configuration.
 * Only values that are safe to expose to the browser belong here
 * (the Supabase URL and anon/publishable key are public by design).
 * When Supabase is not configured, returns an empty object and the
 * frontend stays in local-only mode.
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

  const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
  const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || "").trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    sendJson(response, 200, {});
    return;
  }

  sendJson(response, 200, { supabaseUrl, supabaseAnonKey });
}

module.exports = { handleConfigRequest };
