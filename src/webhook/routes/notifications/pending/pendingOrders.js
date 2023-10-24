const { EmbedBuilder } = require("discord.js");
const client = require("../../../../index");

module.exports = (req, res) => {
  const { data } = req.query;

  const pickupEmbed = new EmbedBuilder()
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
        value: `🤝 | ${data.order_type}\n\n`,
      },
      {
        name: `OTP CODE`,
        value: `🔢 | ${data.otp_code}\n\n`,
      },
    ])
    .setTimestamp(Date.now());

  const shippingEmbed = new EmbedBuilder()
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

  let embedToSend;
  if (data.order_type === "Pickup") {
    embedToSend = pickupEmbed;
  } else {
    embedToSend = shippingEmbed;
  }

  client.channels.cache.get("1166249568011288647").send({
    embeds: [embedToSend],
  });

  res.status(200).json({ ok: true, message: "success" });
  return;
};
