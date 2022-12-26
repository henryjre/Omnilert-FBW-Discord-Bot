const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

module.exports = {
  data: {
    name: `verify-user`,
  },
  async execute(interaction, client) {
    // const connection = await mysql.createConnection({
    //   host: process.env.sqlHost,
    //   user: process.env.sqlUsername,
    //   password: process.env.sqlPassword,
    //   database: process.env.sqlDatabase,
    //   port: process.env.sqlPort,
    // });

    console.log(interaction.message.embeds[0].data.fields[0])

    return

    const memberId = interaction.message.embeds[0].data.fields[0]

    await interaction.reply({
      content: `hello`,
    });
  },
};
