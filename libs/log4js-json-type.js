const util = require("util");
const _ = require("lodash");
const moment = require("moment");
const colors = require("colors/safe");

const defaultLevelColors = {
  ALL: "grey",
  TRACE: "blue",
  DEBUG: "cyan",
  INFO: "green",
  WARN: "yellow",
  ERROR: "red",
  FATAL: "magenta",
  MARK: "grey",
  OFF: "grey"
};

function wrapErrorsWithInspect(items) {
  return _(items)
    .map(item => {
      if (_.isError(item) && item.stack) {
        return {
          inspect() {
            return `${util.format(item)}\n${item.stack}`;
          }
        };
      } else if (!_.isObject(item)) {
        return item;
      }
      return undefined;
    })
    .compact()
    .value();
}

function jsonLayout(config) {
  function formatter(raw) {
    const data = _.clone(raw);
    delete data.logger;

    const output = {
      requestId: data.context.requestId,
      date: moment(data.startTime).format("YYYY-MM-DD HH:mm:ss.SSS"),
      categoryName: data.categoryName,
      level: data.level.levelStr,
      pid: data.pid
    };

    if (config.source) {
      output.source = config.source;
    }

    // Emit own properties of config.static if specified
    if (_.has(config, "static")) {
      Object.assign(output, config.static);
    }

    const messages = _.isArray(data.data) ? data.data : [data.data];
    if (messages.length === 2) {
      output.src = messages[1];
    }
    output.data = messages[0] || "";

    // Only include fields specified in 'include' field
    // if field is specified
    if (config.include && config.include.length) {
      const newOutput = {};
      _.forEach(config.include, key => {
        if (_.has(output, key)) {
          newOutput[key] = output[key];
        }
      });
      return newOutput;
    }

    return output;
  }

  return function layout(data) {
    let output = JSON.stringify(formatter(data));

    // Add color to output; don't use this when logging.
    if (_.has(config, "colors") && config.colors) {
      if (_.has(defaultLevelColors, data.level.levelStr)) {
        const color = defaultLevelColors[data.level.levelStr];
        output = colors[color](output);
      }
    }

    return output;
  };
}

module.exports = jsonLayout;
