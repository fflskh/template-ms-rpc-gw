/*
 * @Descripttion: 请求日志记录，包括request和response，后续有需求可以将request和response分离开
 * @version:
 * @Author: LiuHao
 */

/**
 * @description: 日志中间件
 * @param {Object} ctx Koa context对象
 * @param {Function} next
 * @return: void
 */
const filterLogUrls = ["/platform/trip/check-alive"];
const _ = require("lodash");
module.exports = async (ctx, next) => {
  const path = ctx.request.path;
  if (filterLogUrls.indexOf(path) !== -1) {
    await next();
    return;
  }
  ctx.log.biz.info({
    message: "http request",
    ip: ctx.ip,
    method: ctx.method,
    url: ctx.url,
    query: ctx.request.query,
    body: _.omit(ctx.request.body, "data.faceImage")
  });
  const startTime = new Date();
  await next();
  const endTime = new Date();
  ctx.log.biz.info({
    message: "http response",
    url: ctx.url,
    status: ctx.status,
    response: ctx.body,
    spent: `${endTime - startTime}ms`
  });
};
