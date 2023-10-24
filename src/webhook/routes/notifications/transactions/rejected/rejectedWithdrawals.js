const { EmbedBuilder } = require("discord.js");
const client = require("../../../../../index");
const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = (req, res) => {
  const { data } = req.body;

  const stringToConcat = [];
  data.forEach((member) => {
    stringToConcat.push(
      `**Transaction ID:** ${member.transaction_id}\n**Name:** ${member.member_name}\n**Leviosa ID:** ${member.leviosa_id}\n**Amount:** ${pesoFormatter.format(Number(member.amount))}\n**Reason:** ${member.reason}\n\n`
    );
  });

  const embed = new EmbedBuilder()
    .setTitle(`🔴 WITHDRAWALS REJECTED`)
    .setDescription(`${stringToConcat.join("")}`)
    .setColor("#8e44ad")
    .setTimestamp(Date.now());

  client.channels.cache.get("1166275653843288076").send({
    embeds: [embed],
  });

  res.status(200).json({ ok: true, message: "success" });
  return;
};
