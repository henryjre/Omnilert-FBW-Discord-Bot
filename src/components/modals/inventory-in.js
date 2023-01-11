const { EmbedBuilder } = require("discord.js");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: "src/.env" });

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
        ephemeral: true,
      });
      return;
    }
    if (quantity.indexOf(".") != -1) {
      await interaction.reply({
        content: `🔴 ERROR: The product quantity must be a whole number!`,
        ephemeral: true,
      });
      return;
    }
    if (isNaN(barcode)) {
      await interaction.reply({
        content: `🔴 ERROR: The product barcode must be a number!`,
        ephemeral: true,
      });
      return;
    }
    if (isNaN(price)) {
      await interaction.reply({
        content: `🔴 ERROR: The inventory price must be a number!`,
        ephemeral: true,
      });
      return;
    }

    //////////////////////////////////////////MYSQL
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

    const prodQuan = selectFromInventory[0][0]["QUANTITY"];
    const prodPrice = selectFromInventory[0][0]["UNIT_PRICE"];
    const prodName = selectFromInventory[0][0]["PRODUCT_NAME"];
    const prodPic = selectFromInventory[0][0]["PIC_URL"];

    const quanQuan = Number(prodQuan) + Number(quantity);

    const newPrice =
      (Number(prodQuan) * Number(prodPrice) +
        Number(quantity) * Number(price)) /
      (Number(prodQuan) + Number(quantity));

    const newVal = quanQuan * newPrice;

    const updateQueryDetails =
      "UPDATE INVENTORY_SUMMARY SET QUANTITY = ?, UNIT_PRICE = ?, UNIT_VALUE = ?  WHERE BARCODE = ?";
    await connection
      .query(updateQueryDetails, [quanQuan, newPrice, newVal, barcode])
      .catch((err) => consolFe.log(err));

    connection.end();
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
  },
};
