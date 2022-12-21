const { EmbedBuilder } = require("discord.js");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require(`../../secret-key.json`);
require('dotenv').config()
const sheetId = process.env.sheetId;

const doc = new GoogleSpreadsheet(sheetId);

module.exports = {
  data: {
    name: "inventory-in",
  },
  async execute(interaction, client) {
    const barcode = interaction.fields.getTextInputValue("barcode");
    const quantity = interaction.fields.getTextInputValue("quantity");
    const price = interaction.fields.getTextInputValue("price");

    if (isNaN(quantity)) {
      await interaction.reply({
        content: `🔴 ERROR: The product quantity must be a number!`,
        ephemeral: true
      });
      return;
    }
    if (quantity.indexOf(".") != -1) {
      await interaction.reply({
        content: `🔴 ERROR: The product quantity must be a whole number!`,
        ephemeral: true
      });
      return;
    }
    if (isNaN(barcode)) {
      await interaction.reply({
        content: `🔴 ERROR: The product barcode must be a number!`,
        ephemeral: true
      });
      return;
    }
    if (isNaN(price)) {
      await interaction.reply({
        content: `🔴 ERROR: The inventory price must be a number!`,
        ephemeral: true
      });
      return;
    }

    //////////////////////////////////////////GSHEET
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const summarySheet = doc.sheetsByTitle["Summary"];
    const sheetRows = await summarySheet.getRows();

    const rowNumber = [];

    for (var row in sheetRows) {
      if (sheetRows[row]['BARCODE'].indexOf(barcode) === 0) {
        rowNumber.push(row);
      }
    }

    if (rowNumber === undefined || rowNumber.length == 0) {
      await interaction.reply({
        content: `🔴 ERROR: No product found for barcode #**${barcode}**`,
        ephemeral: true
      });
      return;
    }
    if (rowNumber.length > 1) {
      await interaction.reply({
        content: `🔴 ERROR: Two products were found for barcode #**${barcode}**`,
        ephemeral: true
      });
      return;
    }

    const prodQuan = sheetRows[rowNumber]["QUANTITY"];
    const prodPrice = sheetRows[rowNumber]["U. PRICE"];
    const prodName = sheetRows[rowNumber]["PRODUCT"];
    const prodPic = sheetRows[rowNumber]["PIC URL"];

    const quanQuan = Number(prodQuan) + Number(quantity);

    const newPrice =
      (Number(prodQuan) * Number(prodPrice) +
        Number(quantity) * Number(price)) /
      (Number(prodQuan) + Number(quantity));

    const newVal = quanQuan * newPrice;

    sheetRows[rowNumber]["QUANTITY"] = quanQuan;
    sheetRows[rowNumber]["U. PRICE"] = newPrice;
    sheetRows[rowNumber]["U. VALUE"] = newVal;

    //////////////////////////////////////////////////

    const date = new Date(Date.now()).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const embed = new EmbedBuilder()
      .setTitle("✅ INVENTORY ADDED SUCCESSFULLY")
      .setDescription(
        `You added ${quantity} pcs of ${prodName} at the price of ₱ ${price}.`
      )
      .setColor("Gold")
      .setThumbnail(prodPic)
      .setAuthor({
        iconURL: interaction.user.displayAvatarURL(),
        name: interaction.user.tag,
      })
      .setFooter({
        text: date,
      })
      .addFields([
        {
          name: `${prodName}`,
          value: `Barcode: ${barcode}`,
        },
        {
          name: `New Quantity`,
          value: `${quanQuan}`,
        },
        {
          name: `New Price`,
          value: `₱ ${newPrice}`,
        },
      ]);

    await interaction.reply({
      embeds: [embed],
    });

    await sheetRows[rowNumber].save();
  },
};
