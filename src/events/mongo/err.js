const chalk = require("chalk");

module.exports = {
  name: "err",
  execute(err) {
    console.log(
      chalk.green(`An error occured with the database connection:\n${err}`)
    );
  },
};
