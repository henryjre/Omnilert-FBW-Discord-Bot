const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "interimDutyModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const replyEmbed = new EmbedBuilder();

    const dateInput = interaction.fields.getTextInputValue("dateInput");
    const startTimeInput = interaction.fields.getTextInputValue("startTime");
    const endTimeInput = interaction.fields.getTextInputValue("endTime");
    const shiftCoverageInput =
      interaction.fields.getTextInputValue("shiftCoverageInput");
    const reasonInput = interaction.fields.getTextInputValue("reasonInput");
    const interactionMember =
      interaction.member?.toString() || interaction.user.toString();

    const authRequestEmbed = new EmbedBuilder()
      .setDescription(`## ⌛ INTERIM DUTY FORM TEST`)
      .addFields([
        {
          name: "Interim Duty Date",
          value: `📆 | ${dateInput}`,
        },
        {
          name: "Shift Start Time",
          value: `⏰ | ${startTimeInput}`,
        },
        {
          name: "Shift End Time",
          value: `⏰ | ${endTimeInput}`,
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
