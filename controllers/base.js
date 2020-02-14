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
   * @param {string} interfaceName
   * @param {string} funName
   * @param {object} params
   */
  async rpcExc(interfaceName, funName, params) {
    // 3. 创建服务的 consumer
    const consumer = this.client.createConsumer({
      interfaceName: interfaceName
    });
    // 4. 等待 consumer ready（从注册中心订阅服务列表...）
    await consumer.ready();
    // 5. 执行泛化调用
    const result = await consumer.invoke(funName, [params], { responseTimeout: 3000 });
    return result;
  }

  /**
   * 网关通用处理
   * @param {String} interfaceName zk命名空间名称
   * @param {String} funName 方法名
   */
  async proxy(ctx, next, interfaceName, funName) {
    //组装参数
    let params = {
      query: ctx.request.query,
      body: ctx.request.body,
      params: ctx.request.params,
      header: ctx.header
    };
    // TODO 根据具体的情况，组装额外的参数
    // ...

    try {
      ctx.body = await this.rpcExc(interfaceName, funName, params);
      ctx.log.biz.info({
        msg: "rpc调用",
        data: {
          interfaceName: interfaceName,
          funName: funName,
          params: params
        }
      });
    } catch (error) {
      ctx.log.biz.error({
        msg: "rpc调用报错",
        error: error.stack,
        errorData: {
          interfaceName: interfaceName,
          funName: funName,
          params: params
        }
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
