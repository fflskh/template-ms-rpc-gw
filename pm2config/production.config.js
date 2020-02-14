module.exports = {
  apps: [
    {
      script: __dirname + "/../bin/www",
      instances: "1",
      exec_mode: "cluster",
      output: "/dev/null",
      name: "xxxx",
      env: {
        NODE_ENV: "production",
        THREAD_COUNT: 1,
        PORT: 3000
      }
    }
  ]
};
