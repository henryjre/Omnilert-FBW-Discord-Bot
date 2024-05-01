const {
  SlashCommandBuilder,
  Embed,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const conn = require("../../sqlConnection");
const { table } = require("table");
const moment = require("moment-timezone");
const { createCanvas, loadImage, registerFont } = require("canvas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Returns an embed."),
  // .addAttachmentOption((option) =>
  //   option
  //     .setName("csv")
  //     .setDescription("The products csv file")
  //     .setRequired(true)
  // )
  async execute(interaction, client) {
    await interaction.deferReply();

    try {
      const inv_connection = await conn.inventoryConnection();
      try {
        const selectPendingQuery = `SELECT * FROM Pending_Inventory_Out WHERE PLATFORM = ? ORDER BY ORDER_CREATED ASC LIMIT 3;`;
        const [pendingResults] = await inv_connection.query(
          selectPendingQuery,
          ["SHOPEE"]
        );

        const keysToExtract = [
          "ORDER_ID",
          "PRODUCT_SKU",
          "PRODUCT_NAME",
          // "ORDER_CREATED",
        ];

        const pendingData = pendingResults.map((obj) =>
          keysToExtract.map((key) => {
            if (key === "ORDER_CREATED") {
              const createdDate = moment(obj[key])
                .tz("Asia/Manila")
                .format("MMM DD, YYYY h:mm A");

              return createdDate;
            } else {
              return obj[key];
            }
          })
        );

        const tableData = [
          ["Order ID", "Product SKU", "Product Name"],
          ...pendingData,
        ];

        const config = {
          columns: [
            { alignment: "center" },
            { alignment: "center" },
            { alignment: "center" },
          ],
          header: {
            alignment: "center",
            content: "Next 3 pending products for SHOPEE", // platform
          },
        };

        const t = table(tableData, config);

        const message = await interaction.editReply({
          content: `\`\`\`\n${t}\`\`\``,
        });

        await message.reply({ content: `\`\`\`\n${t}\`\`\`` });
      } finally {
        await inv_connection.end();
      }
    } catch (error) {
      console.log(error);
      await interaction.editReply({
        content: error.message,
      });
    }
  },
};
