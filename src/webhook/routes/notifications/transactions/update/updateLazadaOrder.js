const { EmbedBuilder } = require("discord.js");
const client = require("../../../../../index");
const moment = require("moment");

module.exports = async (req, res) => {
  const { data } = req.body;

  const channelId = data.discordChannel;
  const orderStatus = data.status;
  const orderId = maskOrderId(data.order_info.order_id);
  const updateTime = moment(Date.now()).format("MMMM DD, YYYY [at] h:mm A");

  let emoji;
  let status;
  switch (orderStatus) {
    case "pending":
      emoji = "⌛";
      status = "Pending";
      break;
    case "packed":
      emoji = "📦";
      status = "Packed";
      break;
    case "ready_to_ship_pending":
      emoji = "⌛📦";
      status = "Waiting For Pickup";
      break;
    case "ready_to_ship":
      emoji = "⌛🚚";
      status = "Waiting for Transit";
      break;
    case "shipped":
      emoji = "🚚";
      status = "In Transit";
      break;
    case "canceled":
      emoji = "🚫";
      status = "Cancelled";
      break;
    case "delivered":
      emoji = "✅";
      status = "Delivered";
      break;
    case "confirmed":
      emoji = "⭐";
      status = "Completed";
      break;

    default:
      emoji = "";
      status = orderStatus;
      break;
  }

  const thread = client.channels.cache.get(channelId);
  await thread.setName(`${emoji} ${orderId} | ${status}`);

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
        value: `\`${status}\``,
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
