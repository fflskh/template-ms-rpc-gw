const Koa = require("koa");
const app = new Koa();
const json = require("koa-json");
const bodyparser = require("koa-bodyparser");
const logger = require("./middleware/logger");
const requestLogger = require("./middleware/request-logger");
const addRequestId = require("./middleware/request-id");
const RES_CODE = require("./constants").RES_CODE;
const routes = require("./routes");

require("koa-validate")(app);
require("./tasks");

global.env = process.env.NODE_ENV || "development";

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error({
      message: error.message,
      error: error.stack
    });
    return (ctx.body = RES_CODE.INTERNAL_ERROR);
  }
});
app.use(
  bodyparser({
    enableTypes: ["json", "form", "text"],
    extendTypes: {
      text: ["text/xml", "application/xml"]
    }
  })
);
//API文档静态文件，视情况考虑剥除
app.use(
  require("koa-static-cache")(__dirname + "/apidoc", {
    prefix: "/member/doc"
  })
);
app.use(json());
app.use(addRequestId);
app.use(logger);
app.use(requestLogger);

// routes
for (const route of routes) {
  app.use(route.routes(), route.allowedMethods());
}

module.exports = app;
