const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "salariesAndWagesRequestModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const referenceNumber =
      interaction.fields.getTextInputValue("referenceNumber");
    const requestedAmount =
      interaction.fields.getTextInputValue("requestedAmount");
    const bankNameInput = interaction.fields.getTextInputValue("bankNameInput");
    const accountNameInput =
      interaction.fields.getTextInputValue("accountNameInput");
    const accountNumberInput =
      interaction.fields.getTextInputValue("accountNumberInput");

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
          name: "Branch",
          value: `🛒 | ${branchInput}`,
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

    const confirmButton = new ButtonBuilder()
      .setCustomId("confirmAuthRequest")
      .setLabel("Confirm")
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
      components: [buttonRow],
    });
  },
};
