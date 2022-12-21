const mysql = require("mysql2/promise");
const chalk = require("chalk");
const config = require("../config.json");

mysql
  .createConnection({
    user: config.sqlUsername,
    password: config.sqlPassword,
    database: "s80969_Leviosa-Database",
  })
  .then(() => {
    console.log(chalk.green("[Database Status]: Connected!"));
  })
  .catch((err) => console.log(err));

  module.exports
