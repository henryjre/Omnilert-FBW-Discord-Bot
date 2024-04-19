const {
  ActionRowBuilder,
  TextInputStyle,
  TextInputBuilder,
  ModalBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `reportalAddTask`,
  },
  async execute(interaction, client) {
    try {
      if (interaction.user.id !== interaction.message.interaction.user.id) {
        await interaction.reply({
          content: "You cannot use this button.",
          ephemeral: true,
        });
        return;
      }

      const modal = new ModalBuilder();
      modal.setCustomId("reportalTask").setTitle(`ADD NEW TASK`);

      const firstInput = new TextInputBuilder()
        .setCustomId(`taskName`)
        .setLabel(`Task Name`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(
          `Create a name for your task. E.G. "System Maintenance" / "Thumbnail Designing"`
        )
        .setMaxLength(75)
        .setRequired(true);

      const secondInput = new TextInputBuilder()
        .setCustomId(`taskDescription`)
        .setLabel(`Task Description (OPTIONAL)`)
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setPlaceholder("Optional information for your task.")
        .setRequired(false);

      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
      const secondActionRow = new ActionRowBuilder().addComponents(secondInput);

      modal.addComponents(firstActionRow, secondActionRow);

      await interaction.showModal(modal);
    } catch (error) {
      console.log(error.stack);
      await interaction.followUp({
        content: `🔴 ERROR: ${error.message}.`,
        ephemeral: true,
      });
    }
  },
};
