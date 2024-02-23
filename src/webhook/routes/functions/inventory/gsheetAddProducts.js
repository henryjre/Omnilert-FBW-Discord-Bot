const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const client = require("../../../../index");

const { leviosaPool } = require("../../../../sqlConnection");
const XLSX = require("xlsx");

const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

module.exports = async (req, res) => {
  const { products } = req.body;

  if (products.length <= 0) {
    res.status(400).json({ ok: true, message: "no products" });
    return;
  }

  const connection = await leviosaPool.getConnection();

  try {
    const insertQuery =
      "INSERT IGNORE INTO Leviosa_Inventory (SKU, BRAND, PRODUCT_NAME, WEIGHT, `L(cm)`, `W(cm)`, `H(cm)`, SRP, REGULAR_DISCOUNTED_PRICE, RESELLER_PRICE, CAMPAIGN_PRICE, PRODUCT_DESCRIPTION, HOW_TO_USE, INGREDIENTS, BENEFITS, DISCLAIMER) VALUES ?";
    await connection.query(insertQuery, [products]);

    const workbook = XLSX.utils.book_new();
    const data = [
      [
        "SKU",
        "BRAND",
        "PRODUCT NAME",
        "WEIGHT",
        "L(cm)",
        "W(cm)",
        "H(cm)",
        "SRP",
        "REGULAR DISCOUNTED PRICE",
        "RESELLER PRICE",
        "CAMPAIGN PRICE",
        "PRODUCT DESCRIPTION",
        "HOW TO USE",
        "INGREDIENTS",
        "BENEFITS",
        "DISCLAIMER",
      ],
      ...products,
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet 1");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    const attachmentId = nanoid();
    const attachment = new AttachmentBuilder()
      .setFile(buffer)
      .setName(`Add_Products_Log-${attachmentId}.xlsx`);

    const embed = new EmbedBuilder()
      .setDescription(
        "## 🏷️ New Products Added!\nCheck the attachment file for the logs."
      )
      .setColor("Green")
      .setAuthor({ name: `Log ID: ${attachmentId}` });

    client.channels.cache.get("1210581512689426522").send({
      embeds: [embed],
      files: [attachment],
    });

    res.status(200).json({ ok: true, message: "success" });
    return;
  } catch (error) {
    console.log(error);
    res.status(400).json({ ok: true, message: "an error has occured" });
  } finally {
    connection.release();
  }
};
