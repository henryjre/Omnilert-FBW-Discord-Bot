const { EmbedBuilder } = require("discord.js");
const client = require("../../../../../index");

module.exports = (req, res) => {
  const { data } = req.body;

  const embed = new EmbedBuilder()
    .setTitle(`✅ DEPOSIT APPROVED`)
    .setColor("#3498db")
    .setFooter({
      text: `Approved By: ${data.verifier_name}`,
    })
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
        name: `DEPOSIT AMOUNT`,
        value: `💸 | ${data.amount}`,
      },
    ])
    .setTimestamp(Date.now());

  client.channels.cache.get("1166273629881892935").send({
    embeds: [embed],
  });

  res.status(200).json({ ok: true, message: "success" });
  return;
};
