const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("auth_request")
    .setDescription("Check-in or check-out"),
  pushToArray: false,
  async execute(interaction, client, formType) {
    // formType: absence / tardiness / undertime

    if (["tardiness", "undertime"].includes(formType)) {
      return interaction.reply({
        content: "This command is unavailable.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("authRequestModal")
      .setTitle(`${formType.toUpperCase()} AUTHORIZATION REQUEST`);

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

    const fourthInput = new TextInputBuilder()
      .setCustomId(`reasonInput`)
      .setLabel(`❓ Reason`)
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setPlaceholder(`Enter the reason for ${formType}.`)
      .setRequired(true);

    const fifthInput = new TextInputBuilder()
      .setCustomId(`type`)
      .setLabel(`Type (DO NOT CHANGE)`)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setValue(formType)
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);
    const fourthActionRow = new ActionRowBuilder().addComponents(fourthInput);
    const fifthActionRow = new ActionRowBuilder().addComponents(fifthInput);

    modal.addComponents(
      firstActionRow,
      thirdActionRow,
      fourthActionRow,
      fifthActionRow
    );
    await interaction.showModal(modal);
  },
};
