const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
require("dotenv").config({ path: "src/.env" });

const fs = require("fs");
const path = require("path");
const caCertificatePath = path.join(__dirname, "../../DO_Certificate.crt");
const caCertificate = fs.readFileSync(caCertificatePath);

const mysql = require("mysql2/promise");
const moment = require("moment");

const { customAlphabet } = require("nanoid");
const { networkInterfaces } = require("os");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const timer = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = {
  data: {
    name: "livestreamWithdrawal",
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const totalAmount =
      interaction.message.embeds[0].data.fields[2].value.match(/[\d,.]+/);
    const fees =
      interaction.message.embeds[0].data.fields[3].value.match(/[\d,.]+/);
    const netAmount =
      interaction.message.embeds[0].data.fields[4].value.match(/[\d,.]+/);

    const pendingSubmitEmbed = new EmbedBuilder()
      .setTitle(`SUBMITTING REQUEST`)
      .setColor("#e8fbd4")
      .setDescription("⌛ Submitting your withdrawal request... Please wait.")
      .setTimestamp(Date.now());

    await interaction.editReply({
      embeds: [pendingSubmitEmbed],
      components: [],
    });

    await timer(1200);

    const bankName = interaction.fields.getTextInputValue("bankName");
    const accountName = interaction.fields.getTextInputValue("accountName");
    const accountNumber = interaction.fields.getTextInputValue("accountNumber");

    const withdrawalAmount = parseFloat(totalAmount[0].replace(/,/g, ""));
    const withdrawalFees = parseFloat(fees[0].replace(/,/g, ""));
    const netWithdrawal = parseFloat(netAmount[0].replace(/,/g, ""));
    const claimDate = moment().format("YYYY-MM-DD HH:mm:ss");

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

    const updateBalanceQuery =
      "UPDATE Tiktok_Livestreamers SET BALANCE = (BALANCE - ?), LIABILITIES = (LIABILITIES - ?), WITHDRAWALS = (WITHDRAWALS - 1) WHERE STREAMER_ID = ?";
    await connection
      .execute(updateBalanceQuery, [
        netWithdrawal,
        withdrawalFees,
        interaction.user.id,
      ])
      .catch((err) => console.log(err));

    const insertQuery1 = `INSERT INTO Withdraw_History (TRANSACTION_ID, STREAMER_ID, AMOUNT, FEES, CREATED_DATE) VALUES (?, ?, ?, ?, ?)`;
    await connection
      .query(insertQuery1, [
        nanoid(),
        interaction.user.id,
        netWithdrawal,
        withdrawalFees,
        claimDate,
      ])
      .catch((err) => console.log(err));

    await connection.release();
    await pool.end();

    const newEmbed = new EmbedBuilder()
      .setTitle("⌛ NEW COMMISSION WITHDRAWAL")
      .setColor("Yellow")
      .addFields([
        {
          name: "BANK NAME",
          value: bankName,
        },
        {
          name: "BANK ACCOUNT NAME",
          value: accountName,
        },
        {
          name: "BANK ACCOUNT NUMBER",
          value: accountNumber + "\n\u200b",
        },
        {
          name: "WITHDRAWAL AMOUNT",
          value: pesoFormatter.format(withdrawalAmount),
        },
        {
          name: "LIABILITY PAYMENT",
          value: pesoFormatter.format(withdrawalFees),
        },
        {
          name: "🟢 NET WITHDRAWAL (₱)",
          value: String(netWithdrawal),
        },
      ])
      .setTimestamp(Date.now())
      .setFooter({
        text: `REQUESTED BY: ${interaction.user.globalName}`,
      });

    await client.channels.cache.get("1176497779040858173").send({
      embeds: [newEmbed],
    });

    const claimedEmbed = new EmbedBuilder()
      .setTitle(`WITHDRAWAL SUCCESS`)
      .setColor("#84bff3")
      .setDescription(
        "✅ Withdrawal request submitted! Please wait for the finance department to process your withdrawal."
      )
      .setTimestamp(Date.now());

    const viewDash = new ButtonBuilder()
      .setCustomId("viewDash")
      .setLabel("View Dashboard")
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(viewDash);

    return await interaction.editReply({
      embeds: [claimedEmbed],
      components: [buttonRow],
    });
  },
};
