const path = require("path");

module.exports = {
  api: {
    pm2Name: "telegram-admin",
    deployScript: path.resolve(
      __dirname,
      "../scripts/deploy.sh"
    )
  }
};