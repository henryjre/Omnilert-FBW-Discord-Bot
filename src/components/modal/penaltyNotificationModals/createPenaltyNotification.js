const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

const sqliteDb = require("../../../sqliteConnection.js");

const deductionMode = [
  {
    name: "Salary",
    value: "salary",
    emoji: "💰",
  },
  {
    name: "Token Pay Balance",
    value: "token_pay",
    emoji: "🪙",
  },
];

module.exports = {
  data: {
    name: "penaltyNotificationModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const selectQuery = sqliteDb.prepare(`
        SELECT employee_id, option, mode FROM penalty_payloads WHERE id = ?
      `);
    const payload = selectQuery.get(interaction.user.id);

    if (!payload) {
      return interaction.editReply({
        content: "Error retrieving penalty data.",
      });
    }

    const deleteQuery = sqliteDb.prepare(
      `DELETE FROM penalty_payloads WHERE id = ?`
    );
    deleteQuery.run(interaction.user.id);

    const employeeInput = await interaction.guild.members.fetch(
      payload.employee_id
    );
    const mode = deductionMode.find((m) => m.value === payload.mode);

    const dateInput = interaction.fields.getTextInputValue("dateInput");
    const branchInput = interaction.fields.getTextInputValue("branchInput");
    const shiftInput = interaction.fields.getTextInputValue("shiftInput");
    const purposeInput = interaction.fields.getTextInputValue("purposeInput");
    const amountInput = interaction.fields.getTextInputValue("amountInput");

    const parsedAmount = extractDigits(amountInput);

    const interactionMember =
      interaction.member?.toString() || interaction.user.toString();

    const authRequestEmbed = new EmbedBuilder()
      .setDescription(`## 🚫 DEDUCTION/PENALTY NOTIFICATION`)
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
          name: "Shift",
          value: `⏱️ | ${shiftInput}`,
        },
        {
          name: "Penalized Employee",
          value: `👤 | ${employeeInput.toString()}`,
        },
        {
          name: "Purpose",
          value: `📝 | ${purposeInput}`,
        },
        {
          name: "Deduction Amount",
          value: `💵 | ${parsedAmount}`,
        },
        {
          name: "Deduction Mode",
          value: `${mode.emoji} | ${mode.name}`,
        },
        {
          name: "Notification By",
          value: `👔 | ${interactionMember}`,
        },
      ])
      // .setFooter({
      //   iconURL: interaction.user.displayAvatarURL(),
      //   text: `Submitted by: ${interactionMember}`,
      // })
      .setColor("Blurple"); // ff0000 when approved

    const confirmButton = new ButtonBuilder()
      .setCustomId("confirmPenaltyRequest")
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
