const { EmbedBuilder } = require("discord.js");
const client = require("../../../../../index");
const moment = require("moment");

module.exports = async (req, res) => {
  const { data } = req.body;

  const channelId = data.order.discordChannel;
  const orderStatus = data.order.orderStatus.replace("_", " ");
  const orderId = maskOrderId(data.order._id);
  const updateTime = moment(Date.now()).format("MMMM DD, YYYY [at] h:mm A");

  const thread = client.channels.cache.get(channelId);
  await thread.setName(`${orderId} | ${orderStatus}`);

  const updateEmbed = new EmbedBuilder()
    .setDescription(`## ORDER STATUS UPDATED`)
    .setColor("#2B2D31")
    .addFields([
      {
        name: `TIMESTAMP`,
        value: `\`${updateTime}\``,
      },
      {
        name: `STATUS`,
        value: `\`${orderStatus}\``,
      },
    ]);

  await thread.send({
    embeds: [updateEmbed],
  });

  return res.status(200).json({ ok: true, message: "success" });

  function maskOrderId(number) {
    let numberStr = number.toString();
    let length = numberStr.length;
    if (length < 8) {
      return numberStr;
    } else {
      let maskedStr =
        numberStr.substring(0, 4) +
        "▪️".repeat(length - 8) +
        numberStr.substring(length - 4);
      return maskedStr;
    }
  }
};
