const { EmbedBuilder } = require("discord.js");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

module.exports = {
  name: "audit",
  async execute(message, client) {
    if (message.content != "AUDIT") {
      await message.reply({
        content: `🔴 ERROR: Invalid command. For audit, use "AUDIT".`,
        ephemeral: true,
      });
      return;
    }

    const connection = await mysql.createConnection({
      host: process.env.sqlHost,
      user: process.env.inventorySqlUsername,
      password: process.env.inventorySqlPassword,
      database: process.env.inventoryDatabase,
      port: process.env.sqlPort,
    });

    const todaydate = new Date();
    const daysAgo = (todaydate - 1000 * 60 * 60 * 24 * 14) / 1000;

    const date = new Date(Date.now() + 28800000).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    //////////////////////////////////////////SQL
    const selectQueryDetails =
      "SELECT UNIT_PRICE FROM PENDING_AUDIT WHERE TIMESTAMP < ?";
    const selectFromInventory = await connection
      .query(selectQueryDetails, [daysAgo])
      .catch((err) => console.log(err));

    if (selectFromInventory[0].length == 0) {
      await interaction.reply({
        content: `🔴 ERROR: No pending found from 14 days ago.`,
        ephemeral: true,
      });
      return;
    }

    const sums = selectFromInventory[0].reduce(
      (a, b) => a + Number(b.UNIT_PRICE),
      0
    );
    const totalSum = sums.toFixed(2);

    const deleteQueryDetails = "DELETE FROM PENDING_AUDIT WHERE TIMESTAMP < ?";
    await connection
      .query(deleteQueryDetails, [daysAgo])
      .catch((err) => console.log(err));

    const embed = new EmbedBuilder()
      .setTitle(`AUDIT SUCCESS`)
      .setColor("Grey")
      .setThumbnail(client.user.displayAvatarURL())
      .setAuthor({
        iconURL: message.author.displayAvatarURL(),
        name: message.author.tag,
      })
      .setFooter({
        text: date,
      })
      .addFields([
        {
          name: `Cost of Goods Sold`,
          value: `**₱ ${totalSum}**`,
        },
      ]);

    await message.reply({
      embeds: [embed],
    });
  },
};
