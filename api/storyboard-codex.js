const { handleCodexStoryboardProxy } = require("../codex-proxy");

// On Vercel this always answers 501: the Codex provider needs the local
// Codex CLI and the operator's ChatGPT OAuth session, which only exist
// when running Shonode locally (`npm run dev`).
module.exports = async (request, response) => {
  await handleCodexStoryboardProxy(request, response);
};
