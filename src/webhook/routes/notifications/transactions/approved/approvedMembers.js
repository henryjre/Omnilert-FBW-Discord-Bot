const { EmbedBuilder } = require("discord.js");
const client = require("../../../../../index");

module.exports = (req, res) => {
  const { data } = req.body;

  const embed = new EmbedBuilder()
    .setTitle(`✅ MEMBER APPROVED`)
    .setColor("#ff6723")
    .setFooter({
      text: `Approved By: ${data.verifier_name}`,
    })
    .addFields([
      {
        name: `NAME`,
        value: `📛 | ${data.member_name}`,
      },
      {
        name: `LEVIOSA ID`,
        value: `🪪 | ${data.leviosa_id}`,
      },
      {
        name: `EMAIL ADDRESS`,
        value: `📧 | ${data.email_address}\n\n`,
      },
      {
        name: `REFERRAL ID`,
        value: `🆔 | ${data.referral_id}`,
      },
      {
        name: `REFERRER NAME`,
        value: `📛 | ${data.referrer_name}`,
      },
    ])
    .setTimestamp(Date.now());

  client.channels.cache.get("1166248117201551410").send({
    embeds: [embed],
  });

  res.status(200).json({ ok: true, message: "success" });
  return;
};
