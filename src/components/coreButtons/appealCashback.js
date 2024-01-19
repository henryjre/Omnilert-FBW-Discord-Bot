const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: {
    name: `appealCashback`,
  },
  async execute(interaction, client) {
    const interactionMember = interaction.guild.members.cache.get(
      interaction.user.id
    );
    if (!interactionMember.roles.cache.has("1174612428206641182")) {
      await interaction.reply({
        content: `You cannot reject this cashback.`,
        ephemeral: true,
      });
      return;
    }

    const modal = buildModal();
    await interaction.showModal(modal);

    function buildModal() {
      const modal = new ModalBuilder()
        .setCustomId("appealCashbackModal")
        .setTitle(`Appeal for changes in this cashback.`);

      const firstInput = new TextInputBuilder()
        .setCustomId(`appealReason`)
        .setLabel(`Reason`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("The reason for appeal.")
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(firstInput);

      modal.addComponents(firstActionRow);

      return modal;
    }
  },
};
