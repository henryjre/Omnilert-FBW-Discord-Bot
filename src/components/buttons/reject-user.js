const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

module.exports = {
  data: {
    name: `reject-user`,
  },
  async execute(interaction, client) {
    const connection = await mysql.createConnection({
      host: process.env.sqlHost,
      user: process.env.sqlUsername,
      password: process.env.sqlPassword,
      database: process.env.sqlDatabase,
      port: process.env.sqlPort,
    });

    await interaction.reply({
      content: `hello`,
    });
  },
};
