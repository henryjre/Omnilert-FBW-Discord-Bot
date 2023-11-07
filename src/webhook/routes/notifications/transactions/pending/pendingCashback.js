const { EmbedBuilder } = require("discord.js");
const client = require("../../../../../index");

module.exports = (req, res) => {
  const { data } = req.body;

  const embed = new EmbedBuilder()
    .setTitle(`NEW CASHBACK REQUEST`)
    .setColor("#e8fbd4")
    .addFields([
      {
        name: `TIKTOK ORDER ID`,
        value: `🆔 | ${data.tiktok_id}`,
      },
      {
        name: `CASHBACK`,
        value: `💸 | ${data.cashback_reward}`,
      },
      {
        name: `GCASH NAME`,
        value: `🪪 | ${data.gcash_name}`,
      },
      {
        name: `GCASH NUMBER`,
        value: `📞 | ${data.gcash_number}`,
      },
    ])
    .setTimestamp(Date.now());

  client.channels.cache.get("1171463711156862986").send({
    embeds: [embed],
  });

  res.status(200).json({ ok: true, message: "success" });
  return;
};
