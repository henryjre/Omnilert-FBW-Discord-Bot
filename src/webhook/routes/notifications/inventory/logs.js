const { EmbedBuilder } = require("discord.js");
const client = require("../../../../index");

module.exports = (req, res) => {
  const { logs } = req.query;

  for (const log of logs) {
    const embed = new EmbedBuilder()
      .setTitle("🧾 Inventory Log")
      .setDescription(
        `**Product Name:** ${log.productName}\n**Changes:** ${log.log}`
      )
      .setColor("#fee700")
      .setTimestamp(log.time);

    client.channels.cache.get("1128651365594443797").send({
      embeds: [embed],
    });
  }

  res.status(200).json({ ok: true, message: "success" });
  return;
};
