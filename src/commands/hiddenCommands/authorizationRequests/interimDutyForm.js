const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("interim"),
  pushToArray: false,
  async execute(interaction, client) {
    const branch = interaction.options.getString("branch");

    const modal = new ModalBuilder()
      .setCustomId("interimDutyFormModal")
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
      .setLabel(`⏱️ Shift Coverage`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setPlaceholder("Enter the shift coverage.")
      .setRequired(true);

    const fourthInput = new TextInputBuilder()
      .setCustomId(`scopeOfWorkIput`)
      .setLabel(`🎯 Scope of Work`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setPlaceholder("Enter the shift coverage.")
      .setRequired(true);

    const fifthInput = new TextInputBuilder()
      .setCustomId(`assignedByInput`)
      .setLabel(`🤝 Assigned By`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setPlaceholder("Enter who assigned the duty.")
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
