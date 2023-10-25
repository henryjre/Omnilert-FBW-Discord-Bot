const { EmbedBuilder } = require("discord.js");
const { customAlphabet } = require("nanoid");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

module.exports = {
  data: {
    name: "log",
  },
  async execute(interaction, client) {
    const pool = mysql.createPool({
      host: process.env.logSqlHost,
      user: process.env.logSqlUsername,
      password: process.env.logSqlPassword,
      database: process.env.logSqlDatabase,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    const connection = await pool
      .getConnection()
      .catch((err) => console.log(err));

    const queryWorkShiftString =
      "SELECT * FROM WORK_HOURS WHERE DISCORD_ID = ? AND TIME_OUT IS NULL";
    const workShift = await connection
      .query(queryWorkShiftString, [interaction.user.id])
      .catch((err) => console.log(err));

    if (workShift[0].length <= 0) {
      await interaction.reply({
        content: `🔴 ERROR: No work log in found.`,
      });
      connection.release();
      pool.end();
      return;
    }

    const firstLog = interaction.fields.getTextInputValue("logInput1");
    const secondLog = interaction.fields.getTextInputValue("logInput2");
    const thirdLog = interaction.fields.getTextInputValue("logInput3");
    // const firstImageLog = interaction.fields.getTextInputValue("logInput4");
    // const secondImageLog = interaction.fields.getTextInputValue("logInput5");

    firstLog.length > 0 ? await addLogs(firstLog, "Narrative") : {};
    secondLog.length > 0 ? await addLogs(secondLog, "Narrative") : {};
    thirdLog.length > 0 ? await addLogs(thirdLog, "Narrative") : {};
    // firstImageLog.length > 0 ? await addLogs(firstImageLog, "Attachment") : {};
    // secondImageLog.length > 0
    //   ? await addLogs(secondImageLog, "Attachment")
    //   : {};

    async function addLogs(log, type) {
      const timestamp = Date.now();
      const id = nanoid();
      const userId = interaction.user.id;

      const queryWorkLogString =
        "INSERT INTO WORK_LOGS (ID, DISCORD_ID, TIMESTAMP, LOG, TYPE) VALUES (?, ?, ?, ?, ?)";
      await connection
        .query(queryWorkLogString, [id, userId, timestamp, log, type])
        .catch((err) => console.log(err));
    }

    connection.release();
    pool.end();

    // const convertedImage1 =
    //   firstImageLog.length > 0 ? `[See Attachment](${firstImageLog})` : "";
    // const convertedImage2 =
    //   secondImageLog.length > 0 ? `[See Attachment](${secondImageLog})` : "";

    const logs = [secondLog, thirdLog];

    var description = `**1.** ${firstLog}`;
    var counter = 2;
    logs.forEach((log, index) => {
      if (log.length > 0) {
        description += `\n**${counter}** ${log}`;
        counter++;
      }
    });

    const embed = new EmbedBuilder()
      .setTitle("✅ LOGS ADDED")
      .setAuthor({
        name: interaction.user.username,
      })
      .setDescription(description)
      .setColor("Gold")
      .setFooter({
        iconURL: interaction.user.displayAvatarURL(),
        text: "Leviosa Network",
      })
      .setTimestamp(Date.now());

    await interaction.reply({
      embeds: [embed],
    });
  },
};
