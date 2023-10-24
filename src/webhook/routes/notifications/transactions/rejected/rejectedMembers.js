const { EmbedBuilder } = require("discord.js");
const client = require("../../../../../index");

module.exports = (req, res) => {
  const { data } = req.body;

  const embed = new EmbedBuilder()
    .setTitle(`🔴 MEMBER REJECTED`)
    .setColor("#ff6723")
    .setDescription(`**Reason for Rejection:**\n\n${data.reason}\n\n`)
    .setFooter({
      text: `Approved By: ${data.verifier_name}`,
    })
    .addFields([
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

  client.channels.cache.get("1166275440755867740").send({
    embeds: [embed],
  });

  res.status(200).json({ ok: true, message: "success" });
  return;
};
