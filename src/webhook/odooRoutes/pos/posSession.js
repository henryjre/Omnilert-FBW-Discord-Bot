const { EmbedBuilder, ChannelType } = require("discord.js");
const moment = require("moment-timezone");

const client = require("../../../index.js");

const sessionChannelId = "1357021400363303143";
// ✅ Employee Check-In
const sessionOpen = async (req, res) => {
  const {
    cash_register_balance_end,
    cash_register_balance_start,
    start_at,
    name,
    opening_notes,
    x_company_name,
  } = req.body;

  const currentDate = getFormattedDate();
  const sessionChannel = client.channels.cache.get(sessionChannelId);
  const threadName = `${currentDate} | ${x_company_name} | ${name}`;
  const pesoEndBal = formatToPeso(cash_register_balance_end);
  const pesoStartBal = formatToPeso(cash_register_balance_start);
  const cashDiff = cash_register_balance_end - cash_register_balance_start;
  const cashDiffBal = formatToPeso(cashDiff);

  // sending the session name as a message content
  const sessionMessage = await sessionChannel.send({
    content: `# ${threadName}`,
  });

  // creating a thread for the opened session
  const sessionThread = await sessionMessage.startThread({
    name: threadName,
    type: ChannelType.PublicThread,
  });

  //creating an embed for the session
  const fields = [
    { name: "Session Name", value: name },
    { name: "Branch", value: x_company_name },
    { name: "Opening Date", value: formatDateTime(start_at) },
    {
      name: "Opening Cash Counted",
      value: pesoStartBal,
    },
    {
      name: "Opening Cash Expected",
      value: pesoEndBal,
    },
    {
      name: "Opening Cash Difference",
      value: cashDiffBal,
    },
  ];

  if (opening_notes) {
    fields.push({
      name: "Opening Notes",
      value: `*${opening_notes}*`,
    });
  }

  console.log(fields);

  const openingEmbed = new EmbedBuilder()
    .setTitle(` 🟢 Register Open`)
    .setColor("Green")
    .addFields(fields);

  await sessionThread.send({ embeds: openingEmbed });

  return res.status(200).json({ ok: true, message: "Webhook received" });
};

module.exports = { sessionOpen };

////////////////////////// HELPER FUNCTIONS /////////////////////////////////////////

function getFormattedDate(timezone = "Asia/Manila") {
  return moment().tz(timezone).format("MMMM DD, YYYY");
}

function formatDateTime(datetime, timezone = "Asia/Manila") {
  if (!datetime) {
    return null;
  }

  return moment
    .tz(datetime, "YYYY-MM-DD HH:mm:ss", timezone)
    .format("MMMM DD, YYYY [at] h:mm A");
}

function formatToPeso(input) {
  try {
    if (typeof input !== "string") return input; // Return original if not a string

    // Extract digits and at most one decimal point
    const match = input.match(/\d+(\.\d{0,2})?/);
    if (!match) return input; // Return input if no valid number found

    // Convert to a number and format with commas
    const amount = parseFloat(match[0]).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `₱${amount}`; // Return properly formatted amount
  } catch (error) {
    return input; // Return original string if an error occurs
  }
}
