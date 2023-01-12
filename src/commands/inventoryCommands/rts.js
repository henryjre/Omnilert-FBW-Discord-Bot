const { EmbedBuilder } = require("discord.js");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

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
    const connection = await mysql.createConnection({
      host: process.env.sqlHost,
      user: process.env.inventorySqlUsername,
      password: process.env.inventorySqlPassword,
      database: process.env.inventoryDatabase,
      port: process.env.sqlPort,
    });

    const selectQueryDetails =
      "SELECT * FROM INVENTORY_SUMMARY WHERE BARCODE = ?";
    const selectFromInventory = await connection
      .query(selectQueryDetails, [barcode])
      .catch((err) => console.log(err));

    if (selectFromInventory[0].length == 0) {
      await interaction.reply({
        content: `🔴 ERROR: No product found for barcode **#${barcode}**`,
        ephemeral: true,
      });
      return;
    }

    const prodPic = selectFromInventory[0][0]["PIC_URL"];
    const prodBrand = selectFromInventory[0][0]["BRAND"];
    const prodName = selectFromInventory[0][0]["PRODUCT_NAME"];
    const prodBarcode = selectFromInventory[0][0]["BARCODE"];
    const prodPrice = selectFromInventory[0][0]["UNIT_PRICE"];
    const prodQuant = selectFromInventory[0][0]["QUANTITY"];
    const newQuant = Number(prodQuant) + 1;
    const timestamp = Date.now() / 1000;
    const negativePrice = -prodPrice;

    const updateQueryDetails =
      "UPDATE INVENTORY_SUMMARY SET QUANTITY = QUANTITY - 1 WHERE BARCODE = ?";
    await connection
      .query(updateQueryDetails, [barcode])
      .catch((err) => consolFe.log(err));

    const insertQuery = `INSERT INTO PENDING_AUDIT (BRAND, BARCODE, PRODUCT_NAME, UNIT_PRICE, TIMESTAMP) VALUES (?, ?, ?, ?, ?)`;
    await connection
      .query(insertQuery, [
        prodBrand,
        prodBarcode,
        prodName,
        negativePrice,
        timestamp,
      ])
      .catch((err) => console.log(err));

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
