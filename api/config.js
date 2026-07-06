const { handleConfigRequest } = require("../config-endpoint");

module.exports = async (request, response) => {
  handleConfigRequest(request, response);
};
