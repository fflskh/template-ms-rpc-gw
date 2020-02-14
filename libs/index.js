const redis = require("./redis");
const kafka = require("./kafka");
module.exports = function() {
  return {
    redisLib: redis,
    kafkaLib: kafka
  };
};
