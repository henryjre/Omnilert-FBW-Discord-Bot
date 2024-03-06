const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const client = require("../../../../index");

const { leviosaPool } = require("../../../../sqlConnection");
const XLSX = require("xlsx");

const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = async (req, res) => {
  const { data } = req.body;

  if (data.length <= 0) {
    res.status(400).json({ ok: true, message: "no products" });
    return;
  }

  const connection = await leviosaPool.getConnection();

  try {
    const productSkus = data.map((product) => product["SKU"]);
    const queryPlaceholders = Array.from(
      { length: productSkus.length },
      (_, index) => "?"
    ).join(", ");
    const queryProductsArray = `SELECT * FROM Leviosa_Inventory WHERE SKU IN (${queryPlaceholders})`;
    const [products] = await connection.query(queryProductsArray, productSkus);

    await connection.beginTransaction();
    const updatePromises = data.map(async (item) => {
      const sku = item.SKU;

      const keys = Object.keys(item).filter((key) => key !== "SKU");
      const values = keys.map((key) => item[key]);

      const updateQuery = `
          UPDATE Leviosa_Inventory
          SET ${keys.map((key) => `\`${key}\` = ?`).join(", ")}
          WHERE SKU = ?;
        `;

      await connection.query(updateQuery, [...values, sku]);
    });

    await Promise.all(updatePromises);

    await connection.commit();

    const excelData = [];
    for (const obj of data) {
      const product = products.find((p) => p.SKU == obj["SKU"]);
      if (!product) {
        console.log("no edits made for sku: ", obj["SKU"]);
        continue;
      }
      const keys = [
        "",
        "SKU",
        ...Object.keys(obj).filter((key) => key !== "SKU"),
      ];

      const oldData = ["OLD:", product.SKU];
      Object.keys(obj)
        .filter((key) => key !== "SKU")
        .forEach((key) => {
          oldData.push(product[key]);
        });

      const newData = [
        "NEW:",
        product.SKU,
        ...Object.keys(obj)
          .filter((key) => key !== "SKU")
          .map((key) => obj[key]),
      ];

      excelData.push(keys, oldData, newData, []);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet 1");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    const attachmentId = nanoid();
    const attachment = new AttachmentBuilder()
      .setFile(buffer)
      .setName(`Edit_Products_Log-${attachmentId}.xlsx`);

    const embed = new EmbedBuilder()
      .setDescription(
        "## 🧾 Edit Products Log\nCheck the attachment file for the logs."
      )
      .setAuthor({ name: `Log ID: ${attachmentId}` })
      .setColor("Orange");

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
