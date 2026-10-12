const path = require("path");

module.exports = {
  api: {
    pm2Name: "api-farina",
    deployScript: path.resolve(
      __dirname,
      "../scripts/deploy.sh"
    )
  }
};