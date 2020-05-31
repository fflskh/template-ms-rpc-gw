const router = require("koa-router")();
const controllers = require("../controllers");

router.prefix("/api/user");

router.post("/add", async (ctx, next) => {
  await controllers.base.proxy(ctx, next, "com.gioneco.ms.user", "user.add");
});

module.exports = router;
