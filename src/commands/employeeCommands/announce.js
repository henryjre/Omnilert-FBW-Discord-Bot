const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  LabelBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('announce').setDescription('Prepare an announcement.'),

  async execute(interaction, client) {
    const validRoles = ['1314413671245676685'];

    if (!interaction.member.roles.cache.some((r) => validRoles.includes(r.id))) {
      const replyEmbed = new EmbedBuilder().setDescription(
        `🔴 ERROR: This command can only be used by <@&1314413671245676685>.`
      );
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [replyEmbed],
      });
      return;
    }

    // Check if the command was invoked in a thread
    if (interaction.channel.isThread()) {
      const replyEmbed = new EmbedBuilder().setDescription(
        `🔴 ERROR: This command cannot be used in a thread channel.`
      );
      await interaction.reply({
        ephemeral: true,
        embeds: [replyEmbed],
      });
      return;
    }

    const modal = buildModal();
    await interaction.showModal(modal);

    function buildModal() {
      const modal = new ModalBuilder().setCustomId('announcementModal');

      modal.setTitle(`Make an announcement`);

      const firstInput = new TextInputBuilder()
        .setCustomId(`titleInput`)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const firstLabel = new LabelBuilder()
        .setLabel('Title')
        .setDescription('The title of your announcement')
        .setTextInputComponent(firstInput);

      const secondInput = new TextInputBuilder()
        .setCustomId(`announcementInput`)
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(4000)
        .setRequired(true);

      const secondLabel = new LabelBuilder()
        .setLabel('Announcement Details')
        .setDescription('The details of your announcement')
        .setTextInputComponent(secondInput);

      modal.addLabelComponents(firstLabel, secondLabel);

      return modal;
    }
  },
};
