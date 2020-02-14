const router = require("koa-router")();
const RES_CODE = require("../constants").RES_CODE;

router.prefix("/platform/trip");

router.get("/check-alive", async (ctx, next) => {
  ctx.body = RES_CODE.SUCCESS;
});

module.exports = router;
