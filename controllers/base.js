const config = require("config");
const { GrpcClient, ServiceRegistry } = require("gioneco-grpc");
const RES_CODE = require("../constants").RES_CODE;

class Base {
  constructor() {
    this.grpcClient = new GrpcClient({
      protosDir: `${process.cwd()}/protos`,
      registry: new ServiceRegistry(config.get("consul"))
    });
  }

  /**
   * 调用RPC方法
   * @param {String} service 远程服务名+rpc方法，格式为serviceName.funcName
   * @param {string} funName
   * @param {object} params
   */
  async rpcExc(ctx, service, params) {
    const args = service.split(".");
    if (args.length !== 2) {
      throw new Error("服务名称参数错误");
    }

    const [serviceName, funcName] = args;
    const client = this.grpcClient.getGrpcClient(serviceName);

    if (client) {
      return new Promise((resolve, reject) => {
        params.header.requestId = params.header.requestid;

        client[funcName](params, function(err, response) {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        });
      });
    } else {
      throw new Error("无法获取grpc client");
    }
  }

  /**
   * 网关通用处理
   * @param {String} service 远程服务名+rpc方法，格式为serviceName.funcName
   * @param {String} funName 方法名
   */
  async proxy(ctx, next, service) {
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
      service: service,
      params: params
    };

    try {
      ctx.body = await this.rpcExc(ctx, service, params);
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
}

module.exports = Base;
