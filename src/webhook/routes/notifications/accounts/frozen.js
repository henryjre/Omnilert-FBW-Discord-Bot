const { EmbedBuilder } = require("discord.js");
const client = require("../../../../index");

module.exports = (req, res) => {
  const { event } = req.query;

  const embed = new EmbedBuilder()
    .setTitle("⚠️ Account Frozen")
    .setDescription(log)
    .setColor("#32CD32")
    .setTimestamp(Date.now());

  client.channels.cache.get("1128651365594443797").send({
    embeds: [embed],
  });

  res.status(200).json({ message: "success" });
  return;
};
