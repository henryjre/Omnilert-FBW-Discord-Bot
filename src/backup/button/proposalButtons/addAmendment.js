const {
  ActionRowBuilder,
  TextInputStyle,
  TextInputBuilder,
  ModalBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `addAmendment`,
  },
  async execute(interaction, client) {
    if (!interaction.member.roles.cache.has("1196806310524629062")) {
      await interaction.reply({
        content: `🔴 ERROR: This button can only be used by <@&1196806310524629062>.`,
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder();
    modal.setCustomId("proposalAmendment").setTitle(`ADD AMENDMENT`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`amendmentDetails`)
      .setLabel(`Amendment Details`)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Explain the details of your amendment.")
      .setMaxLength(3000)
      .setRequired(true);

    const secondInput = new TextInputBuilder()
      .setCustomId(`amendmentOptions`)
      .setLabel(`Amendment Voting Options`)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Add options that the boards will vote from.")
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
    const secondActionRow = new ActionRowBuilder().addComponents(secondInput);

    modal.addComponents(firstActionRow, secondActionRow);

    await interaction.showModal(modal);
  },
};
