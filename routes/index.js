const fs = require("fs");
const path = require("path");
const routes = [];
const basename = path.basename(__filename);
fs.readdirSync(__dirname)
  .filter(file => {
    return file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js";
  })
  .forEach(file => {
    let route = require(path.join(__dirname, file));
    routes.push(route);
  });
module.exports = routes;
