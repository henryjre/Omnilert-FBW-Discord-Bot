const { EmbedBuilder } = require("discord.js");
const client = require("../../../../../index");

module.exports = (req, res) => {
  const { data } = req.body

  const embed = new EmbedBuilder()
    .setTitle(`NEW PENDING MEMBER`)
    .setColor("#ff6723")
    .addFields([
      {
        name: `DATABASE ID`,
        value: `🆔 | ${data.transaction_id}`,
      },
      {
        name: `NAME`,
        value: `📛 | ${data.member_name}`,
      },
      {
        name: `EMAIL ADDRESS`,
        value: `📧 | ${data.email_address}\n\n`,
      },
      {
        name: `REFERRAL ID`,
        value: `🆔 | ${data.referral_id}`,
      },
    ])
    .setTimestamp(Date.now());

  client.channels.cache.get("1166248117201551410").send({
    embeds: [embed],
  });

  res.status(200).json({ ok: true, message: "success" });
  return;
};
