const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { customAlphabet } = require("nanoid");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("in")
    .setDescription("Log in to start work shift."),
  async execute(interaction, client) {
    await interaction.deferReply();

    client.commands.get("reminder").execute(interaction, client, 0);

    const pool = mysql.createPool({
      host: process.env.logSqlHost,
      user: process.env.logSqlUsername,
      password: process.env.logSqlPassword,
      database: process.env.logSqlDatabase,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    const id = nanoid();
    const userId = interaction.user.id;
    const timeIn = Date.now();

    const timeStamp = new Date(timeIn).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });

    const queryWorkShiftString =
      "INSERT INTO WORK_HOURS (ID, DISCORD_ID, TIME_IN) VALUES (?, ?, ?)";
    await pool
      .query(queryWorkShiftString, [id, userId, timeIn])
      .catch((err) => console.log(err));

    const embed = new EmbedBuilder()
      .setTitle(`🟢 LOG IN`)
      .setDescription(
        `👤 **User:** ${interaction.user.username}\n⏱️ **Time In:** ${timeStamp}`
      )
      .setColor("Green")
      // .setTimestamp(timeStamp)
      .setFooter({
        iconURL: interaction.user.displayAvatarURL(),
        text: "Leviosa Network",
      });
    // .addFields([
    //   {
    //     name: `User`,
    //     value: `👤 ${interaction.user.username}`,
    //   },
    //   {
    //     name: `Time In`,
    //     value: `⏱️ ${timeStamp}`,
    //   },
    // ]);

    await interaction.editReply({
      embeds: [embed],
    });

    // await client.channels.cache.get("1117121221608354015").send({
    //   embeds: [embed],
    // });
  },
};
