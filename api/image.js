const { handleGeminiImageProxy } = require("../image-proxy");

module.exports = async (request, response) => {
  await handleGeminiImageProxy(request, response, {
    apiKeyHint: "Set GEMINI_API_KEY in the Vercel project environment variables."
  });
};
