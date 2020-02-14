"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const basename = path.basename(__filename);
const config = require("config");
const dbConfig = config.get("db");
const os = require("os");
const hostname = os.hostname();
const log = require("../log");
const _ = require("lodash");
const mycatTable = ["Order"];
let db = {},
  sequelize,
  connection;

const env = process.env.NODE_ENV || "development";
if (env === "production") {
  connection = dbConfig[hostname];
} else {
  connection = dbConfig;
}
function putUserIdFirst(options) {
  if (!options || (!options.userId && !options.uuid)) {
    return options;
  }

  let changedOptions = Object.create(null);
  if (options.userId) {
    changedOptions.userId = options.userId;
  }
  if (options.uuid) {
    changedOptions.uuid = options.uuid;
  }
  changedOptions = _.assign(changedOptions, options);
  //symbol不能assign，只能通过getOwnPropertySymbols获取
  let symbols = Object.getOwnPropertySymbols(options);
  symbols.forEach(symbol => {
    changedOptions[symbol] = options[symbol];
  });

  return changedOptions;
}
const operatorsAliases = {
  $eq: Sequelize.Op.eq,
  $ne: Sequelize.Op.ne,
  $gte: Sequelize.Op.gte,
  $gt: Sequelize.Op.gt,
  $lte: Sequelize.Op.lte,
  $lt: Sequelize.Op.lt,
  $not: Sequelize.Op.not,
  $in: Sequelize.Op.in,
  $notIn: Sequelize.Op.notIn,
  $is: Sequelize.Op.is,
  $like: Sequelize.Op.like,
  $notLike: Sequelize.Op.notLike,
  $iLike: Sequelize.Op.iLike,
  $notILike: Sequelize.Op.notILike,
  $regexp: Sequelize.Op.regexp,
  $notRegexp: Sequelize.Op.notRegexp,
  $iRegexp: Sequelize.Op.iRegexp,
  $notIRegexp: Sequelize.Op.notIRegexp,
  $between: Sequelize.Op.between,
  $notBetween: Sequelize.Op.notBetween,
  $overlap: Sequelize.Op.overlap,
  $contains: Sequelize.Op.contains,
  $contained: Sequelize.Op.contained,
  $adjacent: Sequelize.Op.adjacent,
  $strictLeft: Sequelize.Op.strictLeft,
  $strictRight: Sequelize.Op.strictRight,
  $noExtendRight: Sequelize.Op.noExtendRight,
  $noExtendLeft: Sequelize.Op.noExtendLeft,
  $and: Sequelize.Op.and,
  $or: Sequelize.Op.or,
  $any: Sequelize.Op.any,
  $all: Sequelize.Op.all,
  $values: Sequelize.Op.values,
  $col: Sequelize.Op.col
};
sequelize = new Sequelize(connection.database, connection.username, connection.password, {
  ...dbConfig,
  host: connection.host,
  port: connection.port,
  benchmark: true,
  operatorsAliases,
  logging: (sqlLogText, costMs, options) => {
    const { bizName } = options; // 用于定位sql业务 db.sequelize.transaction({bizName:"测试业务"});
    if (costMs >= config.get("slowSqlMillis")) {
      log.biz.warn(`${sqlLogText},${costMs}ms,${bizName}`);
    } else if (bizName) {
      log.biz.debug(`${sqlLogText},${costMs}ms,${bizName}`);
    } else {
      log.biz.debug(`${sqlLogText},${costMs}ms`);
    }
  }
});
fs.readdirSync(__dirname)
  .filter(file => {
    return file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js";
  })
  .forEach(file => {
    let model = sequelize["import"](path.join(__dirname, file));
    let assignParanoid = options => {
      if (!options) {
        options = {};
      }
      //判断是否是mycat分表的表格,不是的话就直接返回
      if (!mycatTable.includes(model.name)) {
        return;
      }
      if (model.prototype.rawAttributes.deletedAt) {
        options.paranoid = false;
        options.where = {
          ...(options.where || {}),
          deletedAt: {
            $eq: null
          }
        };
      }
      // if (_.isUndefined(options.paranoid)) {
      //   options.paranoid = false;
      // }
    };
    model.prototype.reload = function(options) {
      options = _.assign({}, options, {
        where: this.where(),
        include: this._options.include || null
      });

      return this.constructor
        .findOne(options)
        .then(reload => {
          if (!reload) {
            throw new Error(
              "Instance could not be reloaded because it does not exist anymore (find call returned null)"
            );
          }
          return Promise.resolve(reload);
        })
        .then(reload => {
          // update the internal options of the instance
          this._options = reload._options;
          // re-set instance values
          this.set(reload.dataValues, {
            raw: true,
            reset: true && !options.attributes
          });
          return this;
        });
    };

    //override
    model.findOne = async options => {
      assignParanoid(options);
      options.where = putUserIdFirst(options.where);
      return model.__proto__.findOne.bind(model)(options);
    };
    model.update = async (values, options) => {
      assignParanoid(options);
      options.where = putUserIdFirst(options.where);
      return model.__proto__.update.bind(model)(values, options);
    };
    model.destroy = async options => {
      assignParanoid(options);
      options.where = putUserIdFirst(options.where);
      return model.__proto__.destroy.bind(model)(options);
    };
    model.findAll = async options => {
      assignParanoid(options);
      options.where = putUserIdFirst(options.where);
      return model.__proto__.findAll.bind(model)(options);
    };
    model.findAndCountAll = async options => {
      assignParanoid(options);
      options.where = putUserIdFirst(options.where);
      return model.__proto__.findAndCountAll.bind(model)(options);
    };

    //重构model的findOrCreated方法用于解决mycat savePoint 问题
    model.findOrCreate = async options => {
      assignParanoid(options);
      let res = await model.findOne(options);
      if (res) {
        return [res, false];
      }

      res = await model.create(_.assign(options.defaults, options.where || {}), {
        transaction: options.transaction,
        logging: options.logging
      });
      return [res, true];
    };

    // 连接mycat因为sql语句 as `count` 会报错，重写 count方法
    model.count = async options => {
      assignParanoid(options);
      let result = sequelize.dialect.QueryGenerator.selectQuery(model.tableName, {
        tableAs: model.tableName,
        attributes: [["count(*)", "count"]],
        where: options.where
      });
      result = result.replace(/\`count\`/, "count");
      const results = await sequelize.query(result, {
        type: sequelize.QueryTypes.SELECT,
        logging: options.logging
      });
      return results.pop().count;
    };
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
