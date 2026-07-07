const { handleOpenAIStoryboardProxy } = require("../openai-proxy");

module.exports = async (request, response) => {
  await handleOpenAIStoryboardProxy(request, response);
};
