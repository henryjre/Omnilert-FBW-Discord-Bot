const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("shift_xchange"),
  pushToArray: false,
  async execute(interaction, client) {
    const modal = new ModalBuilder()
      .setCustomId("shiftExchangeRequestModal")
      .setTitle(`SHIFT EXCHANGE REQUEST`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`dateInput`)
      .setLabel(`📆 Date`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Enter the date.")
      .setRequired(true)
      .setMaxLength(100);

    const thirdInput = new TextInputBuilder()
      .setCustomId(`shiftInput`)
      .setLabel(`⏱️ Shift`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setPlaceholder("Enter the shift.")
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);

    modal.addComponents(firstActionRow, thirdActionRow);
    await interaction.showModal(modal);
  },
};
