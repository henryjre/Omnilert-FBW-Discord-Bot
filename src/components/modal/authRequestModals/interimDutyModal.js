const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: {
    name: "interimDutyModal",
  },
  async execute(interaction, client) {
    const replyEmbed = new EmbedBuilder();

    const dateInput = interaction.fields.getTextInputValue("dateInput");
    const startTimeInput = interaction.fields.getTextInputValue("startTime");
    const endTimeInput = interaction.fields.getTextInputValue("endTime");
    const shiftCoverageInput =
      interaction.fields.getTextInputValue("shiftCoverageInput");
    const reasonInput = interaction.fields.getTextInputValue("reasonInput");
    const interactionMember =
      interaction.member?.toString() || interaction.user.toString();

    const date = parseToLongDate(dateInput);
    const startTime = parseToStandardTime(startTimeInput);
    const endTime = parseToStandardTime(endTimeInput);

    if (!date || !startTime || !endTime) {
      replyEmbed
        .setDescription(
          `🔴 ERROR: Invalid date or time format. Please try again.`
        )
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    const authRequestEmbed = new EmbedBuilder()
      .setDescription(`## ⌛ INTERIM DUTY FORM TEST`)
      .addFields([
        {
          name: "Interim Duty Date",
          value: `📆 | ${date}`,
        },
        {
          name: "Shift Start Time",
          value: `⏰ | ${startTime}`,
        },
        {
          name: "Shift End Time",
          value: `⏰ | ${endTime}`,
        },
        {
          name: "Shift Coverage",
          value: `🎯 | ${shiftCoverageInput}`,
        },
        {
          name: "Interim Duty Reason",
          value: `❓ | ${reasonInput}`,
        },
        {
          name: "Submitted By",
          value: `👤 | ${interactionMember}`,
        },
      ])
      .setColor("#f3ff00"); // f3ff00 when approved

    const branchMenu = new StringSelectMenuBuilder()
      .setCustomId("branchMenu")
      .setPlaceholder("Select a branch")
      .addOptions(
        { label: "DHVSU Bacolor", value: "DHVSU Bacolor" },
        { label: "Primark Center Guagua", value: "Primark Center Guagua" },
        {
          label: "Robinsons Starmills CSFP",
          value: "Robinsons Starmills CSFP",
        },
        { label: "JASA Hiway Guagua", value: "JASA Hiway Guagua" }
      )
      .setMinValues(1)
      .setMaxValues(1);

    const menuRow = new ActionRowBuilder().addComponents(branchMenu);

    const confirmButton = new ButtonBuilder()
      .setCustomId("confirmAuthRequest")
      .setLabel("Confirm")
      .setDisabled(true)
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId("cancelAuthRequest")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(
      confirmButton,
      cancelButton
    );

    await interaction.editReply({
      embeds: [authRequestEmbed],
      components: [menuRow, buttonRow],
    });
  },
};

function parseToLongDate(input, tz = "Asia/Manila") {
  const DATE_FORMATS = [
    "MMM DD, YYYY",
    "MM-DD-YY",
    "MMM D, YYYY",
    "MM-D-YY",
    "M-D-YY",
    "MMMM DD, YYYY",
    "MMMM D, YYYY",
  ];

  if (typeof input !== "string") return null;

  const s = input.trim().replace(/\s+/g, " ");
  const m = moment.tz(s, DATE_FORMATS, true, tz);

  if (!m.isValid()) return null;

  return m.format("MMMM DD, YYYY");
}

function parseToStandardTime(input, tz = "Asia/Manila") {
  const TIME_FORMATS = ["h:mm A", "h:mm a", "h A", "h a"];

  if (typeof input !== "string") return null;

  const s = input.trim().replace(/\s+/g, " ");
  const m = moment.tz(s, TIME_FORMATS, true, tz);

  if (!m.isValid()) return null;

  return m.format("h:mm A");
}
