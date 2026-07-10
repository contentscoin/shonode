const { handleOpenAIImageProxy } = require("../image-proxy");

module.exports = async (request, response) => {
  await handleOpenAIImageProxy(request, response);
};
