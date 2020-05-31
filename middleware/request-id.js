/*
 * @Descripttion: 添加request id
 * @version:
 * @Author: LiuHao
 */
const uuid = require("uuid/v4");

module.exports = async (ctx, next) => {
  //添加request id
  if (!ctx.get("requestid")) {
    ctx.request.header = {
      ...ctx.header,
      requestid: uuid()
    };
  }

  await next();
};
