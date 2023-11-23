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
    .setName("add-liab")
    .setDescription("Add liabilities to livestreamers.")
    .addUserOption((option) =>
      option
        .setName("livestreamer")
        .setDescription("The livestreamer to add liabilities.")
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount liabilities to add in peso.")
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const validRoles = ["1177271188997804123"];

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

    const liabAmount = interaction.options.getNumber("amount");
    const streamer = interaction.options.getUser("livestreamer");
    const streamerId = streamer.id;

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
      const updateLiabQuery =
        "UPDATE Tiktok_Livestreamers SET LIABILITIES = (LIABILITIES + ?) WHERE STREAMER_ID = ?";
      const update = await connection
        .execute(updateLiabQuery, [liabAmount, streamerId])
        .catch((err) => console.log(err));

      let embed;
      if (update[0].affectedRows) {
        embed = new EmbedBuilder()
          .setTitle(`ADD LIABILITY SUCCESS`)
          .setColor("Green")
          .setDescription(`🟢 Liabilities were added.`)
          .addFields([
            {
              name: "LIVESTREAMER",
              value: streamer.toString(),
            },
            {
              name: "LIABILITY AMOUNT",
              value: pesoFormatter.format(liabAmount),
            },
          ])
          .setFooter({
            text: `ADDED BY: ${interaction.user.globalName}`,
          })
          .setTimestamp(Date.now());
      } else {
        embed = new EmbedBuilder()
          .setTitle(`ADD LIABILITY ERROR`)
          .setColor("Yellow")
          .setDescription(
            `🟡 Liabilities were not added to the user mentioned.`
          )
          .addFields([
            {
              name: "LIVESTREAMER",
              value: streamer.toString(),
            },
            {
              name: "LIABILITY AMOUNT",
              value: pesoFormatter.format(liabAmount),
            },
          ])
          .setFooter({
            text: `COMMAND BY: ${interaction.user.globalName}`,
          })
          .setTimestamp(Date.now());
      }

      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`ADD LIABILITIES ERROR`)
        .setColor("Red")
        .setDescription(`🔴 There was an error while adding liabilities.`)
        .addFields([
          {
            name: "LIVESTREAMER",
            value: streamer.toString(),
          },
          {
            name: "LIABILITY AMOUNT",
            value: pesoFormatter.format(liabAmount),
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
