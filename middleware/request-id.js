/*
 * @Descripttion: 添加request id
 * @version:
 * @Author: LiuHao
 */
const uuid = require("uuid/v4");

module.exports = async (ctx, next) => {
  //添加request id
  if (!ctx.get("x-request-id")) {
    ctx.request.header = {
      ...ctx.header,
      "x-request-id": uuid()
    };
  }

  await next();
};
