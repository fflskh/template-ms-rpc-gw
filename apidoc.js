const { spawn } = require("child_process");

const bat = spawn("./node_modules/apidoc/bin/apidoc", ["-i", "routes/", "-o", "apidoc/"]);

bat.stdout.on("data", data => {
  console.log(data.toString());
});

bat.stderr.on("data", data => {
  console.log(data.toString());
});

bat.on("exit", () => {
  console.log("执行完成");
});
