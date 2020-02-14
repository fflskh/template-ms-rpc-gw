module.exports = {
  db: {
    username: "root",
    password: "12345678",
    database: "xxxx",
    host: "127.0.0.1",
    port: "3306",
    dialect: "mysql",
    dialectOptions: {
      charset: "utf8mb4"
    },
    timezone: "+08:00",
    pool: {
      max: 80,
      min: 1
    }
  },
  redis: {
    host: "127.0.0.1",
    port: "6379",
    db: 10
  },
  timerRules: {
    test: {
      enable: true,
      rules: {
        minute: [10]
      }
    }
  },
  appName: "xxxx",
  slowSqlMillis: 1000,
  //运营日时间
  operationalDay: "03:00",
  zkAddress: "127.0.0.1:2181"
};
