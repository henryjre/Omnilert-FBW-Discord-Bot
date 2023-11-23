const { SlashCommandBuilder } = require("discord.js");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

const fs = require("fs");
const path = require("path");
const caCertificatePath = path.join(__dirname, "../../DO_Certificate.crt");
const caCertificate = fs.readFileSync(caCertificatePath);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dashboard")
    .setDescription("View your livestream dashboard."),
  async execute(interaction, client) {
    const validRoles = ["1117440696891220050"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this command.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

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
