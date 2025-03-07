const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "cashDepositRequestModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const dateInput = interaction.fields.getTextInputValue("dateInput");
    const branchInput = interaction.fields.getTextInputValue("branchInput");
    const employeesInput =
      interaction.fields.getTextInputValue("employeesInput");
    const reasonInput = interaction.fields.getTextInputValue("reasonInput");
    const amountInput = interaction.fields.getTextInputValue("amountInput");

    const parsedAmount = extractDigits(amountInput);

    const interactionMember =
      interaction.member?.toString() || interaction.user.toString();

    const authRequestEmbed = new EmbedBuilder()
      .setDescription(`## 📥 CASH DEPOSIT REQUEST`)
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
          name: "Amount",
          value: `💵 | ${parsedAmount}`,
        },
        {
          name: "Employees On Duty",
          value: `${employeesInput}`,
        },
        {
          name: "Reason",
          value: `❓ | ${reasonInput}`,
        },
        {
          name: "Requested By",
          value: `${interactionMember}`,
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

function extractDigits(input) {
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
