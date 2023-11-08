const { EmbedBuilder } = require("discord.js");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

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
      .query(selectQueryDetails, [message.content])
      .catch((err) => console.log(err));

    if (selectFromInventory[0].length == 0) {
      await interaction.reply({
        content: `🔴 ERROR: No product found for barcode **#${message.content}**`,
        ephemeral: true,
      });
      return;
    }

    const date = new Date(Date.now() + 28800000).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    const timestamp = Date.now() / 1000;

    const prodPic = selectFromInventory[0][0]["PIC_URL"];
    const prodBrand = selectFromInventory[0][0]["BRAND"];
    const prodName = selectFromInventory[0][0]["PRODUCT_NAME"];
    const prodBarcode = selectFromInventory[0][0]["BARCODE"];
    const prodPrice = selectFromInventory[0][0]["UNIT_PRICE"];
    const prodQuant = selectFromInventory[0][0]["QUANTITY"];
    const newQuant = Number(prodQuant) - 1;

    const insertQuery1 = `INSERT INTO PENDING_AUDIT (BRAND, BARCODE, PRODUCT_NAME, UNIT_PRICE, TIMESTAMP) VALUES (?, ?, ?, ?, ?)`;
    await connection
      .query(insertQuery1, [
        prodBrand,
        prodBarcode,
        prodName,
        prodPrice,
        timestamp,
      ])
      .catch((err) => console.log(err));

    const insertQuery2 = `INSERT INTO AUDIT_HISTORY (BRAND, BARCODE, PRODUCT_NAME, UNIT_PRICE, TIMESTAMP) VALUES (?, ?, ?, ?, ?)`;
    await connection
      .query(insertQuery2, [
        prodBrand,
        prodBarcode,
        prodName,
        prodPrice,
        timestamp,
      ])
      .catch((err) => console.log(err));

    const updateQueryDetails =
      "UPDATE INVENTORY_SUMMARY SET QUANTITY = QUANTITY - 1 WHERE BARCODE = ?";
    await connection
      .query(updateQueryDetails, [message.content])
      .catch((err) => console.log(err));

    connection.end();

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
