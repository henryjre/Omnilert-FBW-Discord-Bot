const { EmbedBuilder } = require("discord.js");
const client = require("../../../../../index");

module.exports = (req, res) => {
  const { data } = req.body;

  const embed = new EmbedBuilder()
    .setTitle(`NEW ORDER`)
    .setColor("#e74c3c")
    .addFields([
      {
        name: `TRANSACTION ID`,
        value: `🆔 | ${data.transaction_id}`,
      },
      {
        name: `MEMBER NAME`,
        value: `📛 | ${data.member_name}`,
      },
      {
        name: `LEVIOSA ID`,
        value: `🪪 | ${data.leviosa_id}`,
      },
      {
        name: `ORDER NUMBER`,
        value: `🧾 | #${data.order_number}`,
      },
      {
        name: `ORDER TYPE`,
        value: `🚚 | ${data.order_type}`,
      },
    ])
    .setTimestamp(Date.now());


  client.channels.cache.get("1166249657605820427").send({
    embeds: [embed],
  });

  res.status(200).json({ ok: true, message: "success" });
  return;
};
