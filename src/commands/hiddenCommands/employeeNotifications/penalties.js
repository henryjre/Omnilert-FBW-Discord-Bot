const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("penalty"),
  pushToArray: false,
  async execute(interaction, client) {
    const modal = new ModalBuilder()
      .setCustomId("penaltyNotificationModal")
      .setTitle(`PENALTY NOTIFICATION`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`dateInput`)
      .setLabel(`📆 Date`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Enter the date.")
      .setRequired(true)
      .setMaxLength(100);

    const secondInput = new TextInputBuilder()
      .setCustomId(`branchInput`)
      .setLabel(`🛒 Branch`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setPlaceholder("Enter the branch.")
      .setRequired(true);

    const thirdInput = new TextInputBuilder()
      .setCustomId(`shiftInput`)
      .setLabel(`⏱️ Shift`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setPlaceholder("Enter the shift.")
      .setRequired(true);

    const fourthInput = new TextInputBuilder()
      .setCustomId(`purposeInput`)
      .setLabel(`📝 Purpose`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setPlaceholder("Enter the purpose of deduction.")
      .setRequired(true);

    const fifthInput = new TextInputBuilder()
      .setCustomId(`amountInput`)
      .setLabel(`💲 Deduction Amount`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setPlaceholder("Enter the amount of deduction.")
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
    const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);
    const fourthActionRow = new ActionRowBuilder().addComponents(fourthInput);
    const fifthActionRow = new ActionRowBuilder().addComponents(fifthInput);

    modal.addComponents(
      firstActionRow,
      secondActionRow,
      thirdActionRow,
      fourthActionRow,
      fifthActionRow
    );
    await interaction.showModal(modal);
  },
};
