const schedule = require("node-schedule");

let timer = {
  job: {},
  run: (option, fun) => {
    timer.job = schedule.scheduleJob(option, fun);
  },
  cancel: () => {
    timer.job.cancel();
  }
};
module.exports = timer;
