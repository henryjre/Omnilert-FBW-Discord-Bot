const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const client = require("../../../../index");

const conn = require("../../../../sqlConnection");
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
  const { data, pr_number, total_value } = req.body;

  if (data.length <= 0) {
    res.status(400).json({ ok: true, message: "no products" });
    return;
  }

  const connection = await conn.leviosaConnection();

  try {
    const productSkus = data.map((product) => product["SKU"]);
    const queryPlaceholders = Array.from(
      { length: productSkus.length },
      (_, index) => "?"
    ).join(", ");
    const queryProductsArray = `SELECT * FROM Leviosa_Inventory WHERE SKU IN (${queryPlaceholders})`;
    const [products] = await connection.query(queryProductsArray, productSkus);

    const toUpdate = data.map((item) => {
      console.log(item["SKU"]);
      const product = products.find((p) => p.SKU == item["SKU"]);
      const totalProductCost =
        Number(product.TOTAL_QUANTITY) * Number(product.COST_OF_GOODS) +
        Number(item["QUANTITY"]) * Number(item["COST OF GOODS"]);
      const totalProductQuantity =
        Number(product.TOTAL_QUANTITY) + Number(item["QUANTITY"]);

      const newCost = parseFloat(
        (totalProductCost / totalProductQuantity).toFixed(2)
      );

      return {
        sku: product.SKU,
        quantity: Number(item["QUANTITY"]),
        newCogs: newCost,
        newExpDate: item["NEW EXPIRATION DATE"],
      };
    });

    const updateProductQuery = `
  UPDATE Leviosa_Inventory
  SET TOTAL_QUANTITY = TOTAL_QUANTITY + CASE SKU
    ${toUpdate
      .map((product) => `WHEN '${product.sku}' THEN ${product.quantity}`)
      .join(" ")}
  END,
      COST_OF_GOODS = CASE SKU
    ${toUpdate
      .map((product) => `WHEN '${product.sku}' THEN ${product.newCogs}`)
      .join(" ")}
  END,
      NEW_QUANTITY = CASE SKU
    ${toUpdate
      .map((product) => `WHEN '${product.sku}' THEN ${product.quantity}`)
      .join(" ")}
  END,
      NEW_EXPIRATION_DATE = CASE SKU
    ${toUpdate
      .map((product) => `WHEN '${product.sku}' THEN '${product.newExpDate}'`)
      .join(" ")}
  END
  WHERE SKU IN (${toUpdate.map((product) => `'${product.sku}'`).join(", ")});
`;
    await connection.query(updateProductQuery);

    const excelFileData = data.map((item) => {
      const product = products.find((p) => p.SKU == item["SKU"]);
      const totalProductCost =
        Number(product.TOTAL_QUANTITY) * Number(product.COST_OF_GOODS) +
        Number(item["QUANTITY"]) * Number(item["COST OF GOODS"]);
      const totalProductQuantity =
        Number(product.TOTAL_QUANTITY) + Number(item["QUANTITY"]);

      const newCost = parseFloat(
        (totalProductCost / totalProductQuantity).toFixed(2)
      );
      const oldCost = Number(product.COST_OF_GOODS);
      const oldQuantity = Number(product.TOTAL_QUANTITY);

      return [
        pr_number,
        product.SKU,
        product.PRODUCT_NAME,
        oldQuantity,
        totalProductQuantity,
        oldCost,
        newCost,
        item["NEW EXPIRATION DATE"],
      ];
    });

    const workbook = XLSX.utils.book_new();
    const sheetData = [
      [
        "PR NUMBER",
        "SKU",
        "PRODUCT NAME",
        "OLD QUANTITY",
        "NEW QUANTITY",
        "OLD COST",
        "NEW COST",
        "NEW EXPIRATION DATE",
      ],
      ...excelFileData,
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet 1");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    const attachmentId = nanoid();
    const attachment = new AttachmentBuilder()
      .setFile(buffer)
      .setName(`Add_Inventory_Log-${attachmentId}-${pr_number}.xlsx`);

    const embed = new EmbedBuilder()
      .setDescription(
        "## 🧾 Add Inventory Log\nCheck the attachment file for the logs."
      )
      .setAuthor({ name: `Log ID: ${attachmentId}` })
      .setColor("Blue")
      .addFields([
        {
          name: "PR Number",
          value: `${pr_number}`,
        },
        {
          name: "Total Value",
          value: pesoFormatter.format(total_value),
        },
      ]);

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
    await connection.end();
  }
};
