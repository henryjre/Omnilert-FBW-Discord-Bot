const { SlashCommandBuilder, Embed, EmbedBuilder } = require("discord.js");
const { leviosaPool } = require("../../sqlConnection");
const XLSX = require("xlsx");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Returns an embed.")
    .addAttachmentOption((option) =>
      option
        .setName("csv")
        .setDescription("The products csv file")
        .setRequired(true)
    ),
  async execute(interaction, client) {
    await interaction.deferReply();
    const connection = await leviosaPool.getConnection();

    try {
      const attachment = interaction.options.getAttachment("csv");

      if (attachment.contentType !== "text/csv; charset=utf-8") {
        throw new Error("The attachment should be an Excel file.");
      }

      const attachmentUrl = attachment.url;
      const fetchBuffer = await fetch(attachmentUrl)
        .then((response) => response.arrayBuffer())
        .catch((error) => {
          console.error("Error downloading the file:", error);
          return null;
        });

      if (!fetchBuffer) {
        throw new Error(
          "There was an error while reading your Excel file. Please try again."
        );
      }

      const workbook = XLSX.read(new Uint8Array(fetchBuffer), {
        type: "array",
      });

      const orderSheets = workbook.Sheets[workbook.SheetNames[0]];
      const orderData = XLSX.utils.sheet_to_json(orderSheets);

      const updateProductQuery = `
  UPDATE Leviosa_Inventory
  SET TOTAL_QUANTITY = CASE SKU
    ${orderData
      .map(
        (product) =>
          `WHEN '${product["BARCODE"]}' THEN ${product["QUANTITY (OLD)"]}`
      )
      .join(" ")}
  END,
      COST_OF_GOODS = CASE SKU
    ${orderData
      .map(
        (product) =>
          `WHEN '${product["BARCODE"]}' THEN ${product["COST OF GOODS"]}`
      )
      .join(" ")}
  END
  WHERE SKU IN (${orderData
    .map((product) => `'${product["BARCODE"]}'`)
    .join(", ")});
`;
      await connection.query(updateProductQuery);

      const success = new EmbedBuilder()
        .setColor("Green")
        .setDescription("## SUCCESS\nInventory database updated.");

      await interaction.editReply({
        embeds: [success],
      });
    } catch (error) {
      const success = new EmbedBuilder()
        .setColor("Red")
        .setDescription(`## ERROR\n${error.toString()}.`);

      await interaction.editReply({
        embeds: [success],
      });
    } finally {
      connection.release();
    }
  },
};
