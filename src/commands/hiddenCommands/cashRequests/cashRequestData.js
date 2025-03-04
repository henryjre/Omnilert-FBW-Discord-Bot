const {
  SlashCommandBuilder,

  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("cash_request_data"),
  pushToArray: false,
  async execute(interaction, client, type, modalResponse) {
    const referenceNumber =
      modalResponse.fields.getTextInputValue("referenceNumber");
    const requestedAmount =
      modalResponse.fields.getTextInputValue("requestedAmount");
    const bankNameInput =
      modalResponse.fields.getTextInputValue("bankNameInput");
    const accountNameInput =
      modalResponse.fields.getTextInputValue("accountNameInput");
    const accountNumberInput =
      modalResponse.fields.getTextInputValue("accountNumberInput");

    const interactionMember =
      interaction.member?.toString() || interaction.user.toString();

    const cashRequestEmbed = new EmbedBuilder()
      .setDescription(`## ${type.name} REQUEST`)
      .addFields([
        {
          name: "Reference",
          value: `🔗 | ${referenceNumber}`,
        },
        {
          name: "Requested Amount",
          value: `💲 | ${requestedAmount}`,
        },
        {
          name: "Bank Name",
          value: `🏛️ | ${bankNameInput}`,
        },
        {
          name: "Account Name",
          value: `👤 | ${accountNameInput}`,
        },
        {
          name: "Account Number",
          value: `🔢 | ${accountNumberInput}`,
        },
        {
          name: "Employee Name",
          value: `🪪 | ${interactionMember}`,
        },
      ])
      // .setFooter({
      //   iconURL: interaction.user.displayAvatarURL(),
      //   text: `Submitted by: ${interactionMember}`,
      // })
      .setColor(type.color);

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

    await interaction.followUp({
      embeds: [cashRequestEmbed],
      components: [buttonRow],
    });
  },
};
