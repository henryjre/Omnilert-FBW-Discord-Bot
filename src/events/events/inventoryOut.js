const { EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");
const { inventoryPool } = require("../../sqlConnection.js");

module.exports = {
  name: "inventoryOut",
  async execute(message, thread, client) {
    const scannedSku = message.content;

    try {
      const inv_connection = await inventoryPool.getConnection();

      try {
        const selectQuery = `SELECT * FROM Pending_Inventory_Out WHERE PRODUCT_SKU = ? ORDER BY ORDER_CREATED ASC LIMIT 1;`;
        const [selectResult] = await inv_connection.query(selectQuery, [
          scannedSku,
        ]);

        if (!selectResult.length) {
          throw new Error(
            "The scanned **`PRODUCT SKU`** does not match any product in the **`PENDING INVENTORY OUT`** database."
          );
        }

        const scannedProduct = selectResult[0];
        const sqlScanDate = moment()
          .tz("Asia/Manila")
          .format("YYYY-MM-DD HH:mm:ss");

        const valuesToInsert = [
          scannedProduct.ID,
          scannedProduct.ORDER_ID,
          scannedProduct.PRODUCT_SKU,
          scannedProduct.PRODUCT_NAME,
          scannedProduct.ORDER_CREATED,
          scannedProduct.PLATFORM,
          scannedProduct.PRODUCT_COGS,
          sqlScanDate,
        ];

        const insertQuery = `INSERT IGNORE INTO Completed_Inventory_Out (ID, ORDER_ID, PRODUCT_SKU, PRODUCT_NAME, ORDER_CREATED, PLATFORM, PRODUCT_COGS, SCAN_DATE) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await inv_connection.query(insertQuery, valuesToInsert);

        const deleteQuery = `DELETE FROM Pending_Inventory_Out WHERE ID = ?`;
        await inv_connection.query(deleteQuery, [scannedProduct.ID]);

        const embed = buildSuccessEmbed(message, scannedProduct);
        await message.delete();
        await thread.send({ embeds: [embed] });
      } finally {
        inv_connection.release();
      }
    } catch (error) {
      console.log(error.toString());

      const errorEmbed = buildErrorEmbed(message, error.message);
      await message.delete();
      await thread.send({
        embeds: [errorEmbed],
      });
    }
  },
};

function buildErrorEmbed(message, description) {
  const scannedSku = message.content;
  const author = message.guild.members.cache.get(message.author.id);

  const scanDate = moment().tz("Asia/Manila").format("MMMM DD, YYYY h:mm A");
  const embed = new EmbedBuilder()
    .setDescription(`## ERROR\n${description}`)
    .addFields([
      {
        name: "PRODUCT SKU",
        value: scannedSku,
      },
      {
        name: "SCAN DATE",
        value: scanDate,
      },
    ])
    .setColor("DarkGrey")
    .setFooter({ text: `SCANNED BY: ${author.nickname}` });

  return embed;
}

function buildSuccessEmbed(message, scannedProduct) {
  const scannedSku = message.content;
  const author = message.guild.members.cache.get(message.author.id);
  const scanDate = moment().tz("Asia/Manila").format("MMMM DD, YYYY h:mm A");
  const orderDate = moment(scannedProduct.ORDER_CREATED)
    .tz("Asia/Manila")
    .format("MMMM DD, YYYY h:mm A");

  const embed = new EmbedBuilder()
    .setDescription(`## INVENTORY OUT SCANNED`)
    .addFields([
      {
        name: "ORDER ID",
        value: scannedProduct.ORDER_ID,
      },
      {
        name: "PRODUCT SKU",
        value: scannedSku,
      },
      {
        name: "PRODUCT NAME",
        value: scannedProduct.PRODUCT_NAME,
      },
      {
        name: "ORDER CREATED DATE",
        value: orderDate,
      },
      {
        name: "SCAN DATE",
        value: scanDate,
      },
    ])
    .setColor("Red")
    .setFooter({ text: `SCANNED BY: ${author.nickname}` });

  return embed;
}
