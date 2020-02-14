/*
 * log具有如下功能：
 * 1. 可添加request id，且大并发时，每个请求的request id不会混淆
 * 2. 可格式化日志输出内容
 * 3. 可分类型存储日志，例如按业务日志、数据库日志存储等
 * 4. 可自动压缩日志文件、按日期命名、可配置保留时间等
 * 5. 可打印纯粹的日志，例如log.info({data: xxx})，纯粹日志就只包含{data: xxx}，不包含request id，level等
 */
const path = require("path");
const winston = require("winston");
require("winston-daily-rotate-file");
const config = require("config");
const moment = require("moment");
const safeStringify = require("fast-safe-stringify");
const { createLogger, format } = winston;
const { combine, timestamp, printf } = format;

const BIZ_LEVEL = process.env.NODE_ENV === "production" ? "info" : "debug";
const DB_LEVEL = process.env.NODE_ENV === "production" ? "warn" : "debug";

//日志输出路径
function getLogPath() {
  const paths = [__dirname, "logs"];
  if (process.env.pm_id) {
    paths.push(process.env.pm_id);
  }
  return path.join(...paths);
}

//日志类型
const appenders = [
  { category: "biz", level: BIZ_LEVEL },
  { category: "db", level: DB_LEVEL }
];

//包裹一次log输出方法，将log输出内容都包裹到data中去
function wrapLogger(logger) {
  const levels = ["debug", "info", "warn", "error"];
  levels.forEach(level => {
    logger[level] = function(logData) {
      logger.log({
        level: level,
        message: logData
      });
    };
  });
  return logger;
}

/**
 * 格式化输出参数，如果要新增参数，需要在此调整。
 * 如果只打印原始数据，不需要requestId，categoryName，AppName等，则使用下述方法
 * return safeStringify({
 *   data: args.message
 * });
 */
const myFormat = printf(args => {
  return safeStringify({
    requestId: args.requestId,
    categoryName: args.categoryName,
    level: args.level,
    appName: args.appName,
    date: moment(args.timestamp).format("YYYY-MM-DD HH:mm:ss.SSS"),
    data: args.message
  });
});

function getLogger(options) {
  var transport = new winston.transports.DailyRotateFile({
    filename: path.join(getLogPath(), `${options.category}.%DATE%.log`), //文件格式
    datePattern: "YYYY-MM-DD", //按天分割文件
    zippedArchive: true, //压缩
    maxSize: "20m", //单个文件最大20M
    maxFiles: "15d" //文件保存15天
  });
  transport.on("rotate", function(oldFilename, newFilename) {
    // 日志分割时间触发
  });

  const logger = createLogger({
    level: options.level,
    defaultMeta: { appName: config.get("appName"), categoryName: options.category },
    format: combine(timestamp(), myFormat),
    transports: [transport]
  });
  //非生产环境同时也打印到stdout
  if (process.env.NODE_ENV !== "production") {
    logger.add(new winston.transports.Console());
  }

  logger.getChild = function(options) {
    return wrapLogger(logger.child(options));
  };

  return wrapLogger(logger);
}

let loggers = {};
appenders.forEach(appender => {
  let logger = getLogger(appender);
  loggers[appender.category] = logger;
});

/**
 * 附加request id到日志中
 * @param {*} log 原始logger
 * @param {*} request 请求内容，必须包含header
 * @param {*} category 日志类型
 */
loggers.getReqIdLogger = function(requestId, category = "biz") {
  return {
    [category]: loggers[category].getChild({
      requestId: requestId
    })
  };
};

/*
 * log使用方法：
 *   log.biz.info, log.db.info, log.biz.getChild, log.db.getChild等
 * 导出的logger对象为
 *   exports.biz
 *   exports.db
 *   exports.getReqIdLogger
 */
module.exports = loggers;
