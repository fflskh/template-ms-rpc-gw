const config = require("config");
const db = require("../models");
const Util = require("../libs/util");
const { RpcClient } = require("sofa-rpc-node").client;
const { ZookeeperRegistry } = require("sofa-rpc-node").registry;
const RES_CODE = require("../constants").RES_CODE;

const logger = require("../log").biz;

class Base {
  constructor() {
    this.util = Util;

    // 1. 创建 zk 注册中心客户端
    const registry = new ZookeeperRegistry({
      logger: logger,
      address: config.get("zkAddress")
    });
    // 2. 创建 RPC Client 实例
    this.client = new RpcClient({
      logger: logger,
      registry
    });
  }

  /**
   * 调用RPC方法
   * @param {String} serviceName 远程服务名
   * @param {String} funcName 远程方法名，由模块名.方法名构成
   * @param {object} params
   */
  async rpcExc(ctx, serviceName, funcName, params) {
    // 3. 创建服务的 consumer
    const consumer = this.client.createConsumer({
      interfaceName: serviceName
    });
    // 4. 等待 consumer ready（从注册中心订阅服务列表...）
    await consumer.ready();
    // 5. 执行泛化调用
    const result = await consumer.invoke(funcName, [params], { responseTimeout: 3000 });
    return result;
  }

  /**
   * 网关通用处理
   * @param {String} serviceName 远程服务名
   * @param {String} funcName 远程方法名，由模块名.方法名构成
   */
  async proxy(ctx, next, serviceName, funcName) {
    //组装参数
    let params = {
      ...ctx.request.body,
      ...ctx.request.query,
      ...ctx.request.params,
      ...{
        requestId: ctx.header.requestid
      },
      user: ctx.user
    };

    const logData = {
      serviceName: serviceName,
      funcName: funcName,
      params: params
    };

    try {
      ctx.body = await this.rpcExc(ctx, serviceName, funcName, params);
      ctx.log.biz.info({
        msg: "rpc调用",
        data: logData
      });
    } catch (error) {
      ctx.log.biz.error({
        msg: "rpc调用报错",
        error: error.stack,
        errorData: logData
      });
      ctx.body = RES_CODE.INTERNAL_ERROR;
    }
  }

  async getTransaction(ctx, tsName = "") {
    const transaction = await db.sequelize.transaction({
      bizName: tsName,
      logging: this.util.buildDbLogging(ctx.log)
    });
    return transaction;
  }
}

module.exports = Base;
