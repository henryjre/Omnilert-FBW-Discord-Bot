const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: {
    name: `suggestionReply`,
  },
  async execute(interaction, client) {
    const targetUser = interaction.message.mentions.users.first();

    if (interaction.user.id !== targetUser.id) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot reply to this suggestion.`,
        ephemeral: true,
      });
      return;
    }

    const modal = buildModal();
    await interaction.showModal(modal);

    function buildModal() {
      const modal = new ModalBuilder()
        .setCustomId("suggestionReplyModal")
        .setTitle(`Suggestion Reply`);

      const firstInput = new TextInputBuilder()
        .setCustomId(`replyInput`)
        .setLabel(`Reply Details`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Your reply to the suggestion.")
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);

      modal.addComponents(firstActionRow);

      return modal;
    }
  },
};
