const { UserService } = require("../services");

class User {
  constructor() {}

  async addUser(ctx) {
    const userService = new UserService(ctx);

    ctx.log.biz.info({
      message: "add user",
      body: ctx.request.body
    });

    const user = await userService.addUser();

    ctx.body = {
      code: 200,
      msg: "成功",
      data: user
    };
  }
}

module.exports = User;
