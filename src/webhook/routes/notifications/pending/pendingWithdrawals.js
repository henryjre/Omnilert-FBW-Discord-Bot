const { EmbedBuilder } = require("discord.js");
const client = require("../../../../index");

module.exports = (req, res) => {
  const { data } = req.query;

  const embed = new EmbedBuilder()
    .setTitle(`NEW PENDING WITHDRAWAL`)
    .setColor("#8e44ad")
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
        name: `BANK NAME`,
        value: `🏦 | ${data.bank_name}`,
      },
      {
        name: `WITHDRAWAL AMOUNT`,
        value: `💸 | ${data.amount}`,
      },
    ])
    .setTimestamp(Date.now());

  client.channels.cache.get("1166249568011288647").send({
    embeds: [embed],
  });

  res.status(200).json({ ok: true, message: "success" });
  return;
};
