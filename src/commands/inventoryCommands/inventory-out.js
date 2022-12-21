const { EmbedBuilder } = require("discord.js");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require(`../../secret-key.json`);
require('dotenv').config({ path: 'src/.env'})
const sheetId = process.env.sheetId;

const doc = new GoogleSpreadsheet(sheetId);

module.exports = {
  name: "inventory-out",
  async execute(message, client) {
    if (message.content.length < 10) {
      await message.reply({
        content: `🔴 ERROR: Invalid barcode.`,
        ephemeral: true,
      });
      return;
    }
    if (isNaN(message.content)) {
      await message.reply({
        content: `🔴 ERROR: Invalid barcode.`,
        ephemeral: true,
      });
      return;
    }

    //////////////////////////////////////////GSHEET
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const summarySheet = doc.sheetsByTitle["Summary"];
    const auditSheet = doc.sheetsByTitle["Pending Audit"];
    const sheetRows = await summarySheet.getRows();
    const sheetHistory = doc.sheetsByTitle["Audit History"];
    const sheetHistoryRows = await sheetHistory.getRows();

    const rowNumber = [];

    for (var row in sheetRows) {
      if (sheetRows[row]["BARCODE"].indexOf(message.content) === 0) {
        rowNumber.push(row);
      }
    }

    if (rowNumber === undefined || rowNumber.length == 0) {
      await message.reply({
        content: `🔴 ERROR: No product found for barcode **${message.content}**`,
        ephemeral: true,
      });
      return;
    }

    const date = new Date(Date.now() + 28800000).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const timestamp = Date.now() / 1000;

    const prodPic = sheetRows[rowNumber]["PIC URL"];
    const prodBrand = sheetRows[rowNumber]["BRAND"];
    const prodName = sheetRows[rowNumber]["PRODUCT"];
    const prodBarcode = sheetRows[rowNumber]["BARCODE"];
    const prodPrice = sheetRows[rowNumber]["U. PRICE"];
    const prodQuant = sheetRows[rowNumber]["QUANTITY"];
    const newQuant = Number(prodQuant) - 1;

    await auditSheet.addRow([
      prodBrand,
      prodBarcode,
      prodName,
      prodPrice,
      timestamp,
    ]);
    await sheetHistory.addRow([
      prodBrand,
      prodBarcode,
      prodName,
      prodPrice,
      timestamp,
    ]);
    sheetRows[rowNumber]["QUANTITY"] = Number(prodQuant) - 1;
    await sheetRows[rowNumber].save();

    const embed = new EmbedBuilder()
      .setTitle(`PENDING AUDIT #${prodBarcode}`)
      .setColor("DarkGold")
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
