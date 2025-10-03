const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "interimDutyFormModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const replyEmbed = new EmbedBuilder();

    const dateInput = interaction.fields.getTextInputValue("dateInput");
    const shiftCoverageInput =
      interaction.fields.getTextInputValue("shiftCoverageInput");
    const scopeOfWorkIput =
      interaction.fields.getTextInputValue("scopeOfWorkIput");
    const assignedByInput =
      interaction.fields.getTextInputValue("assignedByInput");
    const interactionMember =
      interaction.member?.toString() || interaction.user.toString();

    const authRequestEmbed = new EmbedBuilder()
      .setDescription(`## ⌛ INTERIM DUTY FORM`)
      .addFields([
        {
          name: "Date",
          value: `📆 | ${dateInput}`,
        },
        {
          name: "Shift Coverage",
          value: `⏱️ | ${shiftCoverageInput}`,
        },
        {
          name: "Scope of Work",
          value: `🎯 | ${scopeOfWorkIput}`,
        },
        {
          name: "Employee Name",
          value: `${interactionMember}`,
        },
        {
          name: "Assigned By",
          value: `${assignedByInput}`,
        },
      ])
      // .setFooter({
      //   iconURL: interaction.user.displayAvatarURL(),
      //   text: `Submitted by: ${interactionMember}`,
      // })
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
