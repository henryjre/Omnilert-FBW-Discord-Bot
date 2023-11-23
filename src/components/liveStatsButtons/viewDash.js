const { EmbedBuilder } = require("discord.js");

const fs = require("fs");
const path = require("path");
const caCertificatePath = path.join(__dirname, "../../DO_Certificate.crt");
const caCertificate = fs.readFileSync(caCertificatePath);

const mysql = require("mysql2/promise");

module.exports = {
  data: {
    name: `viewDash`,
  },
  async execute(interaction, client) {
    if (interaction.user.id !== interaction.message.interaction.user.id) {
      await interaction.reply({
        content: "You cannot use this button.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const claimedEmbed = new EmbedBuilder()
      .setTitle(`RETRIEVING DASHBOARD`)
      .setColor("#e8fbd4")
      .setDescription("⌛ Retrieving your dashboard... Please wait.");

    await interaction.editReply({
      embeds: [claimedEmbed],
      components: [],
    });

    const pool = mysql.createPool({
      host: process.env.logSqlHost,
      port: process.env.logSqlPort,
      user: process.env.logSqlUsername,
      password: process.env.logSqlPassword,
      database: process.env.logSqlDatabase,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        ca: caCertificate,
        rejectUnauthorized: true,
      },
    });

    return client.commands
      .get("livestreamDashboard")
      .execute(interaction, client, pool);
  },
};
