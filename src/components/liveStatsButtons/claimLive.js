const { EmbedBuilder } = require("discord.js");

const fs = require("fs");
const path = require("path");
const caCertificatePath = path.join(__dirname, "../../DO_Certificate.crt");
const caCertificate = fs.readFileSync(caCertificatePath);

const mysql = require("mysql2/promise");
const moment = require("moment");

const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

module.exports = {
  data: {
    name: `claimLive`,
  },
  async execute(interaction, client) {
    if (interaction.user.id !== interaction.message.interaction.user.id) {
      await interaction.reply({
        content: "You cannot use this button.",
        ephemeral: true,
      });
      return;
    }

    const streamId = interaction.message.embeds[0].data.fields[0].value;
    const commissionString =
      interaction.message.embeds[0].data.fields[7].value.match(/[\d,.]+/);
    const subtotalString =
      interaction.message.embeds[0].data.fields[6].value.match(/[\d,.]+/);

    const netCommission = parseFloat(commissionString[0].replace(/,/g, ""));
    const netSubtotal = parseFloat(subtotalString[0].replace(/,/g, ""));
    const claimDate = moment().format("YYYY-MM-DD HH:mm:ss");

    const claimingEmbed = new EmbedBuilder()
      .setTitle(`CLAIMING LIVESTREAM`)
      .setAuthor({
        iconURL: interaction.user.displayAvatarURL(),
        name: "Livestreamer: " + interaction.user.globalName,
      })
      .setColor("#84bff3")
      .setDescription("⌛ Claiming your commission... Please wait.")
      .addFields([
        {
          name: "LIVESTREAM ID",
          value: streamId,
        },
      ])
      .setTimestamp(Date.now());

    await interaction.update({
      embeds: [claimingEmbed],
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

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    const findLiveQuery =
      "SELECT CLAIMED FROM Tiktok_Livestream_Schedules WHERE STREAM_ID = ?";
    const live = await connection
      .query(findLiveQuery, [streamId])
      .catch((err) => console.log(err));

    if (live[0][0].CLAIMED === 1) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`CLAIMING LIVESTREAM`)
        .setAuthor({
          iconURL: interaction.user.displayAvatarURL(),
          name: "Livestreamer: " + interaction.user.globalName,
        })
        .setColor("Red")
        .setDescription(`🔴 Livestream is already claimed.`)
        .addFields([
          {
            name: "LIVESTREAM ID",
            value: streamId,
          },
        ])
        .setTimestamp(Date.now());

      await interaction.editReply({
        embeds: [errorEmbed],
        components: [],
      });
      await connection.release();
      await pool.end();
      return;
    }

    const updateBalanceQuery =
      "UPDATE Tiktok_Livestreamers SET BALANCE = (BALANCE + ?) WHERE STREAMER_ID = ?";
    await connection
      .execute(updateBalanceQuery, [netCommission, interaction.user.id])
      .catch((err) => console.log(err));

    const updateQuery =
      "UPDATE Tiktok_Livestream_Schedules SET CLAIMED = ? WHERE STREAM_ID = ?";
    await connection
      .execute(updateQuery, [1, streamId])
      .catch((err) => console.log(err));

    const insertQuery1 = `INSERT INTO Claim_History (TRANSACTION_ID, STREAM_ID, STREAMER_ID, NET_ORDER_SUBTOTAL, NET_COMMISSION_CLAIMED, CLAIM_DATE) VALUES (?, ?, ?, ?, ?, ?)`;
    await connection
      .query(insertQuery1, [
        nanoid(),
        streamId,
        interaction.message.interaction.user.id,
        netSubtotal,
        netCommission,
        claimDate,
      ])
      .catch((err) => console.log(err));

    connection.release();

    const claimedEmbed = new EmbedBuilder()
      .setTitle(`LIVESTREAM CLAIMED`)
      .setAuthor({
        iconURL: interaction.user.displayAvatarURL(),
        name: "Livestreamer: " + interaction.user.globalName,
      })
      .setColor("#84bff3")
      .setDescription("✅ Commission claimed! Retrieving your dashboard...")
      .addFields([
        {
          name: "LIVESTREAM ID",
          value: streamId,
        },
      ])
      .setTimestamp(Date.now());

    await interaction.editReply({
      embeds: [claimedEmbed],
      components: [],
    });

    return client.commands
      .get("livestreamDashboard")
      .execute(interaction, client, pool);
  },
};
