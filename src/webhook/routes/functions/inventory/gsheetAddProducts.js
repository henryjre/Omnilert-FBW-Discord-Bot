const { EmbedBuilder } = require("discord.js");
const client = require("../../../../index");

const { leviosaPool } = require("../../../../sqlConnection");

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

    const embedsToSend = [];
    for (const product of products) {
      const embed = new EmbedBuilder()
        .setTitle("🏷️ New Product Added!")
        .addFields([
          {
            name: "Product SKU",
            value: product[1],
          },
          {
            name: "Brand",
            value: product[2],
          },
          {
            name: "Product Name",
            value: product[3],
          },
        ]);

      embedsToSend.push(embed);
    }

    client.channels.cache.get("1210581285194571806").send({
      embeds: embedsToSend,
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
