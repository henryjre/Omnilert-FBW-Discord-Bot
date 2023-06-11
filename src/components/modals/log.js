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

    await client.channels.cache.get("1117141358264713237").send({
      embeds: [embed],
    });
  },
};
