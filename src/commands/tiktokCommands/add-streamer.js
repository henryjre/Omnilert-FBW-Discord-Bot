const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

const fs = require("fs");
const path = require("path");
const caCertificatePath = path.join(__dirname, "../../DO_Certificate.crt");
const caCertificate = fs.readFileSync(caCertificatePath);

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = {
  // cooldown: 90,
  data: new SlashCommandBuilder()
    .setName("add-streamer")
    .setDescription("Add a new Leviosa Tiktok livestreamer.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to add.")
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const validRoles = ["1176496361802301462"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this command.`,
        ephemeral: true,
      });
      return;
    }

    const streamer = interaction.options.getUser("user");
    const streamerId = streamer.id;

    const streamerMember = interaction.guild.members.cache.get(streamerId);

    if (streamerMember.roles.cache.has("1117440696891220050")) {
      await interaction.reply({
        content: `🔴 ERROR: ${streamer.toString()} is already a <@&1117440696891220050>.`,
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

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    try {
      const insertQuery1 = `INSERT INTO Tiktok_Livestreamers (STREAMER_ID, BALANCE, LIABILITIES, WITHDRAWALS) VALUES (?, ?, ?)`;
      await connection
        .query(insertQuery1, [streamerId, 0, 0, 2])
        .catch((err) => console.log(err));

      streamerMember.roles.add("1117440696891220050");

      embed = new EmbedBuilder()
        .setTitle(`ADDED NEW TIKTOK LIVESTREAMER`)
        .setColor("Green")
        .addFields([
          {
            name: "LIVESTREAMER",
            value: streamer.toString(),
          },
        ])
        .setFooter({
          text: `ADDED BY: ${interaction.user.globalName}`,
        })
        .setTimestamp(Date.now());

      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`ADD LIVESTREAMER ERROR`)
        .setDescription("🔴 There was an error while adding the livestreamer.")
        .setColor("Red")
        .addFields([
          {
            name: "LIVESTREAMER",
            value: streamer.toString(),
          },
        ])
        .setFooter({
          text: `COMMAND BY: ${interaction.user.globalName}`,
        })
        .setTimestamp(Date.now());

      await interaction.editReply({
        embeds: [errorEmbed],
        components: [],
      });
    } finally {
      await connection.release();
      await pool.end();
    }
  },
};
