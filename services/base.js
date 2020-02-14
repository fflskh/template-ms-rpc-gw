const Util = require("../libs/util");
const db = require("../models");
const baseLog = require("../log");
class Base {
  constructor(ctx) {
    this.log = ctx.log;
    this.ctx = ctx;
    this.util = Util;
    this.db = db;

    const requestId = ctx.requestId || (ctx.header && ctx.header["x-request-id"]) || "";
    const dbLogger = baseLog.getReqIdLogger(requestId, "db");
    this.dbLogging = Util.buildDbLogging(dbLogger.db);
  }

  async getTransaction(ctx, tsName = "") {
    const transaction = await db.sequelize.transaction({
      bizName: tsName,
      logging: this.dbLogging
    });
    return transaction;
  }
}

module.exports = Base;
