const fs = require("fs");
const path = require("path");
const controllers = {};
const basename = path.basename(__filename);
const _ = require("lodash");

fs.readdirSync(__dirname)
  .filter(file => {
    return file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js";
  })
  .forEach(file => {
    let Ctrl = require(path.join(__dirname, file));
    let controller = new Ctrl();
    controllers[_.camelCase(file.replace(file.slice(-3), ""))] = controller;
  });
module.exports = controllers;
