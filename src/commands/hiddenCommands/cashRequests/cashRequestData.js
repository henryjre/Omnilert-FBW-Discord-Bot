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
  async execute(interaction, client, type, modalResponse, attachmentFile) {
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

    const parsedAmount = extractDigits(requestedAmount);

    const cashRequestEmbed = new EmbedBuilder()
      .setDescription(`## ${type.name} REQUEST`)
      .addFields([
        {
          name: "Reference",
          value: `🔗 | ${referenceNumber}`,
        },
        {
          name: "Requested Amount",
          value: `🪙 | ${parsedAmount}`,
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

    const messagePayload = {
      embeds: [cashRequestEmbed],
      components: [buttonRow],
    };

    if (attachmentFile) {
      messagePayload.files = [attachmentFile];
    }

    await interaction.followUp(messagePayload);
  },
};

function extractDigits(input) {
  try {
    if (typeof input !== "string") return input; // Return original if not a string

    // Extract a valid number (including thousands separators)
    const match = input.match(/[\d,]+(\.\d{0,2})?/);
    if (!match) return input; // Return input if no valid number found

    // Remove commas and convert to a number
    const amount = parseFloat(match[0].replace(/,/g, "")).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `₱${amount}`; // Return properly formatted amount
  } catch (error) {
    return input; // Return original string if an error occurs
  }
}
