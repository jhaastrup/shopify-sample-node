//Combine all your webhooks here
const appUninstallHandler = require("./app_uninstalled.js");
const productsCreateHandler = require("./products_create.js");
const productsUpdateHandler = require("./products_update.js");

module.exports = {
  appUninstallHandler,
  productsCreateHandler,
  productsUpdateHandler,
};
