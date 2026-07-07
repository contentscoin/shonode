const { handleCodexStatusRequest } = require("../codex-proxy");

module.exports = async (request, response) => {
  await handleCodexStatusRequest(request, response);
};
