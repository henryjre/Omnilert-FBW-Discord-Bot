const chalk = require("chalk");

module.exports = {
  name: "connecting",
  execute() {
    console.log(chalk.blue("[Database Status]: Connecting..."));
  },
};
