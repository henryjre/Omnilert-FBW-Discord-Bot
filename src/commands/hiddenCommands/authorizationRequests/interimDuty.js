const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("new_interim"),
  pushToArray: false,
  async execute(interaction, client) {
    if (interaction.user.id !== "748568303219245117") {
      return interaction.reply({
        content: "You are not authorized to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }
    const branch = interaction.options.getString("branch");

    const modal = new ModalBuilder()
      .setCustomId("interimDutyModal")
      .setTitle(`INTERIM DUTY FORM`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`dateInput`)
      .setLabel(`📆 Interim Duty Date (Follow Format)`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("E.G: Oct 1, 2025 | 10-01-25 | October 1, 2025 | 10/1/25")
      .setRequired(true)
      .setMaxLength(100);

    const secondInput = new TextInputBuilder()
      .setCustomId(`startTime`)
      .setLabel(`🟢 Shift Start Time (Follow Format)`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("E.G: 12:00 AM | 8:00 AM | 1:00 PM | 10:00 PM | 5 PM")
      .setMaxLength(100)
      .setRequired(true);

    const thirdInput = new TextInputBuilder()
      .setCustomId(`endTime`)
      .setLabel(`🔴 Shift End Time (Follow Format)`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("E.G: 12:00 AM | 2:00 AM | 4:00 PM | 10:00 PM | 11 AM")
      .setMaxLength(100)
      .setRequired(true);

    const fourthInput = new TextInputBuilder()
      .setCustomId(`shiftCoverageInput`)
      .setLabel(`🎯 Duty Coverage`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setPlaceholder("SD | CL | OP")
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
