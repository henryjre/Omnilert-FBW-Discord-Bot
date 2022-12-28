const { EmbedBuilder } = require("discord.js");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require(`../../secret-key.json`);
require('dotenv').config({ path: 'src/.env'})
const sheetId = process.env.sheetId;

const doc = new GoogleSpreadsheet(sheetId);

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

    const todaydate = new Date();
    const daysAgo = (todaydate - 1000 * 60 * 60 * 24 * 14) / 1000;

    const date = new Date(Date.now() + 28800000).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    //////////////////////////////////////////GSHEET
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const auditSheet = doc.sheetsByTitle["Pending Audit"];
    const sheetHistory = doc.sheetsByTitle["Audit History"];
    const sheetRows = await auditSheet.getRows();
    const sheetHistoryRows = await sheetHistory.getRows();

    const oldUPrice = [];
    const newUPrice = [];
    const pendingAudit = sheetHistoryRows[0]["PENDING AUDIT"];

    for (var row in sheetRows) {
      if (sheetRows[row]["TIMESTAMP"] < daysAgo) {
        oldUPrice.push(sheetRows[row]["U. PRICE"]);
      } else {
        newUPrice.push(sheetRows[row]["U. PRICE"]);
      }
    }

    const sum = oldUPrice.reduce((a, b) => Number(a) + Number(b), 0);
    const newSum = newUPrice.reduce((a, b) => Number(a) + Number(b), 0);
    const totalSum = sum + Number(pendingAudit);

    sheetHistoryRows[0]["PENDING AUDIT"] = newSum;
    await sheetHistoryRows[0].save();
    auditSheet.clearRows();

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
