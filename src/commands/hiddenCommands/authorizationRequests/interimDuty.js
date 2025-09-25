const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("new_interim"),
  pushToArray: false,
  async execute(interaction, client) {
    const branch = interaction.options.getString("branch");

    const modal = new ModalBuilder()
      .setCustomId("interimDutyModal")
      .setTitle(`INTERIM DUTY FORM`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`dateInput`)
      .setLabel(`📆 Date`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Enter the date.")
      .setRequired(true)
      .setMaxLength(100);

    const secondInput = new TextInputBuilder()
      .setCustomId(`branchInput`)
      .setLabel(`🛒 Branch (DO NOT CHANGE)`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true)
      .setValue(branch);

    const thirdInput = new TextInputBuilder()
      .setCustomId(`shiftCoverageInput`)
      .setLabel(`🎯 Duty Coverage`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setPlaceholder("Enter the duty coverage.")
      .setRequired(true);

    const fourthInput = new TextInputBuilder()
      .setCustomId(`startAndEndTimeInput`)
      .setLabel(`⏱️ Start and End Time`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setPlaceholder("Enter the shift time coverage.")
      .setRequired(true);

    const fifthInput = new TextInputBuilder()
      .setCustomId(`reasonInput`)
      .setLabel(`❓ Reason`)
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setPlaceholder("Enter the reason for the interim duty.")
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
