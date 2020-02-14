const generate = require("nanoid/generate");
const randomString = "1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const config = require("config");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const schedule = require("node-schedule");
const moment = require("moment");
const Redlock = require("redlock");
const redis = require("./redis");
const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");
const redlock = new Redlock([redis], {
  retryCount: 0
});
redlock.on("clientError", function(err) {
  console.error("A redis error has occurred:", err);
});
const hostname = require("os").hostname();
const _ = require("lodash");
function _interval(intr, end = 60) {
  let i = 0,
    arr = [],
    res;
  while ((res = intr * i++) < end) {
    arr.push(res);
  }
  return arr;
}

class Util {
  //生成随机字符串
  static generateRandomStr(type = "string", length = 5) {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    if (type === "integer") {
      chars = "0123456789";
    }
    let noceStr = "",
      maxPos = chars.length;
    while (length--) noceStr += chars[(Math.random() * maxPos) | 0];
    return noceStr;
  }

  // 生成uuid
  static generateUid(length = 10) {
    return generate(randomString, length);
  }

  //生成loginToken
  static generateLoginToken(uid) {
    const app_token = jwt.sign(
      {
        uuid: uid,
        timestamp: new Date().getTime()
      },
      config.get("tokenSecret")
    );
    return app_token;
  }

  //验证短信验证码
  static async validateSmsCode({ mobile, code, type }) {
    const cacheCode = await redis.get(`${mobile}:${type}`);
    return cacheCode === code;
  }
  static async clearSmsCode({ mobile, type }) {
    await redis.del(`${mobile}:${type}`);
  }
  static encryptThreeDESECB(plaintext) {
    const secret = config.get("qrcodeSecret");
    const key = Buffer.from(secret).slice(0, 24);
    const cipher = crypto.createCipheriv("des-ede3", key, "");
    cipher.setAutoPadding(true); //default true
    let ciph = cipher.update(plaintext, "utf8", "base64");
    ciph += cipher.final("base64");
    return ciph.replace(/\\r/g, "").replace(/\\n/g, "");
  }
  static decodeThreeDESECB(str) {
    const secret = config.get("qrcodeSecret");
    const key = Buffer.from(secret).slice(0, 24);
    const cipher = crypto.createDecipheriv("des-ede3", key, "");
    cipher.setAutoPadding(true); //default true
    let ciph = cipher.update(str, "base64", "utf8");
    ciph += cipher.final("utf8");
    return ciph;
  }
  static buildDbLogging(log) {
    return (sqlLogText, costMs, options) => {
      const { bizName } = options; // 用于定位sql业务 db.sequelize.transaction({bizName:"测试业务"});
      if (costMs >= config.get("slowSqlMillis")) {
        log.warn(`${sqlLogText},${costMs}ms,${bizName}`);
      } else if (bizName) {
        log.debug(`${sqlLogText},${costMs}ms,${bizName}`);
      } else {
        log.debug(`${sqlLogText},${costMs}ms`);
      }
    };
  }
  static encryptAseCert(str) {
    const secret = config.get("certAseSecret");
    const iv = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const cipher = crypto.createCipheriv("aes-128-cbc", secret, Buffer.from(iv));
    cipher.setAutoPadding(true); //default true
    let ciph = cipher.update(str, "utf8", "base64");
    ciph += cipher.final("base64");
    return ciph;
  }
  static decodeAseCert(str) {
    const secret = config.get("certAseSecret");
    const iv = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const clearEncoding = "utf8";
    const cipherEncoding = "base64";
    const cipherChunks = [];
    const decipher = crypto.createDecipheriv("aes-128-cbc", secret, Buffer.from(iv));
    decipher.setAutoPadding(true);
    cipherChunks.push(decipher.update(str, cipherEncoding, clearEncoding));
    cipherChunks.push(decipher.final(clearEncoding));
    return cipherChunks.join("");
  }
  static encryptUserId(str) {
    const secret = config.get("certAseSecret");
    const iv = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const cipher = crypto.createCipheriv("aes-128-cbc", secret, Buffer.from(iv));
    cipher.setAutoPadding(true); //default true
    let ciph = cipher.update(str, "utf8", "hex");
    ciph += cipher.final("hex");
    return ciph;
  }
  static getScheduleRule(option) {
    let rule = new schedule.RecurrenceRule();
    if (option.second !== undefined && option.second !== null) {
      rule.second = _.isArray(option.second) && option.second.length === 1 ? _interval(option.second) : option.second;
    }
    if (option.minute !== undefined && option.minute !== null) {
      rule.minute = _.isArray(option.minute) && option.minute.length === 1 ? _interval(option.minute) : option.minute;
    }
    if (option.hour !== undefined && option.hour !== null) {
      rule.hour = option.hour;
    }
    if (option.date !== undefined && option.date !== null) {
      rule.date = option.date;
    }
    if (option.month !== undefined && option.month !== null) {
      rule.month = option.month;
    }
    if (option.year !== undefined && option.year !== null) {
      rule.year = option.year;
    }
    if (option.dayOfWeek !== undefined && option.dayOfWeek !== null) {
      rule.dayOfWeek = option.dayOfWeek;
    }
    return rule;
  }
  static getConfigUrl(urlName) {
    const env = process.env.NODE_ENV || "development";
    let url;
    if (env === "production") {
      url = config.get(urlName)[hostname];
    } else {
      url = config.get(urlName);
    }
    return url;
  }

  static getRedisLock(lockName, ttl = 1000) {
    return redlock.lock(lockName, ttl);
  }

  static normalizePort(val) {
    const port = parseInt(val, 10);
    if (isNaN(port)) {
      return val;
    }

    if (port >= 0) {
      return port;
    }
    return false;
  }
  static generateRecordNo() {
    return `20${moment().format("YYYYMMDDHHmmssSSS")}${this.generateRandomStr("integer", 13)}`;
  }
  static generateOrderNo() {
    return `21${moment().format("YYYYMMDDHHmmssSSS")}${this.generateRandomStr("integer", 5)}`;
  }

  static splitStation(station) {
    //将”大风站(站点1)“转换为”站点1“
    try {
      return station.substring(station.indexOf("(") + 1, station.indexOf(")"));
    } catch (error) {
      return station;
    }
  }

  static saveFaceImage(uniqId, basePath, faceImage) {
    fs.writeFileSync(path.join(basePath, uniqId + ".img"), faceImage);

    return `${uniqId}.img`;
  }

  static createImageDir(path) {
    try {
      fs.openSync(path, "r");
    } catch (error) {
      if (error.code === "ENOENT") {
        mkdirp.sync(path);
        return;
      }
      throw new Error("创建人脸图片存储路径失败：" + error.message);
    }
  }
}
module.exports = Util;
