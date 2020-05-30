/*
 * 为每个ctx添加logger，logger附加request id
 */
const baseLog = require("../log");

module.exports = async (ctx, next) => {
  let requestId = ctx.get("requestid");

  const [bizLogger, dbLogger] = [baseLog.getReqIdLogger(requestId, "biz"), baseLog.getReqIdLogger(requestId, "db")];
  ctx.log = {
    biz: bizLogger.biz,
    db: dbLogger.db
  };

  await next();
};
