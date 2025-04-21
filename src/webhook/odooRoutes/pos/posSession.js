const { EmbedBuilder, ChannelType } = require("discord.js");
const moment = require("moment-timezone");

const client = require("../../../index.js");
const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const sessionChannelId = "1357021400363303143";
// ✅ Employee Check-In
const sessionOpen = async (req, res) => {
  const {
    cash_register_balance_end,
    cash_register_balance_start,
    name,
    opening_notes,
    x_company_name,
  } = req.body;

  console.log(req.body);

  const currentDate = getFormattedDate();
  const sessionChannel = client.channels.cache.get(sessionChannelId);
  const threadName = `${currentDate} | ${x_company_name} | ${name}`;
  const pesoEndBal = pesoFormatter.format(cash_register_balance_end);
  const pesoStartBal = pesoFormatter.format(cash_register_balance_start);
  const cashDiff = cash_register_balance_end - cash_register_balance_start;
  const cashDiffBal = pesoFormatter.format(cashDiff);

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
    { name: "Opening Date", value: getCurrentFormattedDate() },
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

  if (opening_notes && opening_notes.length > 0) {
    fields.push({
      name: "Opening Notes",
      value: `*${opening_notes}*`,
    });
  }

  const openingEmbed = new EmbedBuilder()
    .setTitle(` 🟢 Register Open`)
    .setColor("Green")
    .addFields(fields);

  await sessionThread.send({ embeds: [openingEmbed] });

  return res.status(200).json({ ok: true, message: "Webhook received" });
};

const discountOrder = async (req, res) => {
  // const {
  //   cash_register_balance_end,
  //   cash_register_balance_start,
  //   name,
  //   opening_notes,
  //   x_company_name,
  // } = req.body;

  console.log(req.body);

  return res.status(200).json({ ok: true, message: "Webhook received" });

  const currentDate = getFormattedDate();
  const sessionChannel = client.channels.cache.get(sessionChannelId);
  const threadName = `${currentDate} | ${x_company_name} | ${name}`;
  const pesoEndBal = pesoFormatter.format(cash_register_balance_end);
  const pesoStartBal = pesoFormatter.format(cash_register_balance_start);
  const cashDiff = cash_register_balance_end - cash_register_balance_start;
  const cashDiffBal = pesoFormatter.format(cashDiff);

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
    { name: "Opening Date", value: getCurrentFormattedDate() },
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

  if (opening_notes && opening_notes.length > 0) {
    fields.push({
      name: "Opening Notes",
      value: `*${opening_notes}*`,
    });
  }

  const openingEmbed = new EmbedBuilder()
    .setTitle(` 🟢 Register Open`)
    .setColor("Green")
    .addFields(fields);

  await sessionThread.send({ embeds: [openingEmbed] });

  return res.status(200).json({ ok: true, message: "Webhook received" });
};

module.exports = { sessionOpen, discountOrder };

////////////////////////// HELPER FUNCTIONS /////////////////////////////////////////

function getFormattedDate(timezone = "Asia/Manila") {
  return moment().tz(timezone).format("MMMM DD, YYYY");
}

function getCurrentFormattedDate(timezone = "Asia/Manila") {
  return moment().tz(timezone).format("MMMM DD, YYYY [at] h:mm A");
}
