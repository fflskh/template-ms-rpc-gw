"use strict";
const Redis = require("ioredis");
const config = require("config");
const _ = require("lodash");
let redis;
const redisConfig = config.get("redis");
if (_.isArray(redisConfig)) {
  redis = new Redis.Cluster(redisConfig);

  //重写cluster模式下的del，keys方法
  redis.del = async function(key) {
    const masters = redis.nodes("master");

    await Promise.all(
      masters.map(async node => {
        try {
          await node.del(key);
        } catch (error) {
          //当key在另外的节点上，会报如下错误：”MOVED 7767 10.76.230.153:6380“
          if (error.message.indexOf("MOVED") === -1) {
            throw error;
          }
        }
      })
    );
  };

  redis.keys = async function(keyPattern) {
    const masters = redis.nodes("master");

    let keyArray = await Promise.all(
      masters.map(node => {
        return node.keys(keyPattern);
      })
    );

    let keys = [];
    for (let item of keyArray) {
      keys = keys.concat(item);
    }

    return keys;
  };
} else {
  redis = new Redis(redisConfig);
}
module.exports = redis;
