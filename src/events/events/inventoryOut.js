const { EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");
// const conn = require("../../sqlConnection.js");
const pools = require("../../sqlPools.js");
// const { table } = require("table");

module.exports = {
  name: "inventoryOut",
  async execute(message, thread, client, platform) {
    const scannedSku = message.content;

    try {
      // const inv_connection = await conn.inventoryConnection();
      const inv_connection = await pools.inventoryPool.getConnection();

      try {
        const selectQuery = `SELECT * FROM Pending_Inventory_Out WHERE PRODUCT_SKU = ? AND PLATFORM = ? ORDER BY ORDER_CREATED ASC LIMIT 1;`;
        const [selectResult] = await inv_connection.query(selectQuery, [
          scannedSku,
          platform,
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

        // const selectPendingQuery = `SELECT * FROM Pending_Inventory_Out WHERE PLATFORM = ? ORDER BY ORDER_CREATED ASC LIMIT 3;`;
        // const [pendingResults] = await inv_connection.query(
        //   selectPendingQuery,
        //   [platform]
        // );

        // const keysToExtract = [
        //   "ORDER_ID",
        //   "PRODUCT_SKU",
        //   "PRODUCT_NAME",
        //   // "ORDER_CREATED",
        // ];

        // const pendingData = pendingResults.map((obj) =>
        //   keysToExtract.map((key) => obj[key])
        // );

        // const tableData = [
        //   ["Order ID", "Product SKU", "Product Name"],
        //   ...pendingData,
        // ];

        // const config = {
        //   columns: [
        //     { alignment: "center" },
        //     { alignment: "center" },
        //     { alignment: "center" },
        //   ],
        //   header: {
        //     alignment: "center",
        //     content: `Next 3 pending products for ${platform}`, // platform
        //   },
        // };

        // const t = table(tableData, config);

        const embed = buildSuccessEmbed(message, scannedProduct);
        await message.delete();

        const threadMessage = await thread.send({ embeds: [embed] });
        // await threadMessage.reply({ content: `\`\`\`\n${t}\`\`\`` });
      } finally {
        // await inv_connection.end();
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
