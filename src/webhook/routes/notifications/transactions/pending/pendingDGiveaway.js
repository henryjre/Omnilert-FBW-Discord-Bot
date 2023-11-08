const { EmbedBuilder } = require("discord.js");
const client = require("../../../../../index");

module.exports = (req, res) => {
  const { data } = req.body;

  const embed = new EmbedBuilder()
    .setTitle(`NEW DAILY GIVEAWAY CLAIM`)
    .setColor("#afa8ed")
    .addFields([
      {
        name: `TIKTOK ORDER ID`,
        value: `${data.tiktok_id}`,
      },
      {
        name: `AMOUNT (₱)`,
        value: `${data.amount}`,
      },
      {
        name: `GCASH NAME`,
        value: `${data.gcash_name}`,
      },
      {
        name: `GCASH NUMBER`,
        value: `${data.gcash_number}`,
      },
    ])
    .setTimestamp(Date.now());

  client.channels.cache.get("1171798094900379740").send({
    embeds: [embed],
  });

  res.status(200).json({ ok: true, message: "success" });
  return;
};
