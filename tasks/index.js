/*
 * 运行定时任务
 */
const config = require("config");
const timer = require("./timer");
const Util = require("../libs/util");
const testTask = require("./test-task");
const log = require("../log");
const targetHostNames = {
  production: "xxxx",
  tytest: "xxxx"
};
const hostname = require("os").hostname();

const isHost2PM2id0 = process.env.NODE_APP_INSTANCE === "0" && hostname === targetHostNames[process.env.NODE_ENV];

if (!process.env.NODE_ENV || process.env.NODE_ENV === "development" || isHost2PM2id0) {
  log.biz.info("开始定时任务");

  //单边
  const testRule = config.get("timerRules.test");
  if (testRule.enable) {
    timer.run(Util.getScheduleRule(testRule.rules), testTask.task);
  }
}
