const { EmbedBuilder } = require("discord.js");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require(`../../secret-key.json`);
require('dotenv').config({ path: 'src/.env'})
const sheetId = process.env.sheetId;

const doc = new GoogleSpreadsheet(sheetId);

module.exports = {
  name: "rts",
  async execute(message, client) {
    const msg = message.content.split(" ");

    if (msg[0] != "rts") {
      await message.reply({
        content: `🔴 ERROR: Invalid command. For rts, use "rts".`,
      });
      return;
    }
    if (msg[1] === undefined) {
      await message.reply({
        content: `🔴 ERROR: No barcode found in the message.`,
      });
      return;
    }
    if (isNaN(msg[1])) {
      await message.reply({
        content: `🔴 ERROR: Invalid barcode.`,
      });
      return;
    }

    const barcode = msg[1];

    const date = new Date(Date.now() + 28800000).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    //////////////////////////////////////////GSHEET
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const summarySheet = doc.sheetsByTitle["Summary"];
    const sheetHistory = doc.sheetsByTitle["Audit History"];
    const sheetRows = await summarySheet.getRows();
    const sheetHistoryRows = await sheetHistory.getRows();

    const rowNumber = [];
    const pendingAudit = sheetHistoryRows[0]["PENDING AUDIT"];

    for (var row in sheetRows) {
      if (sheetRows[row]["BARCODE"].indexOf(barcode) === 0) {
        rowNumber.push(row);
      }
    }

    if (rowNumber === undefined || rowNumber.length == 0) {
      await message.reply({
        content: `🔴 ERROR: No product found for barcode **${barcode}**`,
        ephemeral: true,
      });
      return;
    }

    const prodPic = sheetRows[rowNumber]["PIC URL"];
    const prodBrand = sheetRows[rowNumber]["BRAND"];
    const prodName = sheetRows[rowNumber]["PRODUCT"];
    const prodBarcode = sheetRows[rowNumber]["BARCODE"];
    const prodPrice = sheetRows[rowNumber]["U. PRICE"];
    const prodQuant = sheetRows[rowNumber]["QUANTITY"];
    const newQuant = Number(prodQuant) + 1;

    sheetRows[rowNumber]["QUANTITY"] = Number(prodQuant) + 1;
    await sheetRows[rowNumber].save();

    sheetHistoryRows[0]["PENDING AUDIT"] =
      Number(pendingAudit) - Number(prodPrice);
    await sheetHistoryRows[0].save();

    const embed = new EmbedBuilder()
      .setTitle(`RTS RECORDED #${prodBarcode}`)
      .setColor("DarkGreen")
      .setImage(prodPic)
      .setAuthor({
        iconURL: message.author.displayAvatarURL(),
        name: message.author.tag,
      })
      .setFooter({
        text: date,
      })
      .addFields([
        {
          name: `${prodBrand}`,
          value: `**${prodName}**`,
        },
        {
          name: `Unit Price`,
          value: `₱ ${prodPrice}`,
        },
        {
          name: `Current Quantity`,
          value: `${newQuant}`,
        },
      ]);

    await message.reply({
      embeds: [embed],
    });
  },
};
