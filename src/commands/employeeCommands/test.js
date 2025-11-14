const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('testt').setDescription('Testing purposes!'),
  async execute(interaction, client) {
    if (interaction.user.id !== '748568303219245117') {
      return await interaction.reply({
        content: '🔴 ERROR: You cannot use this command.',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const messageId = '1438770927021326387';
      const message = await interaction.channel.messages.fetch(messageId);

      const vnrButton = new ButtonBuilder()
        .setCustomId('auditVnr')
        .setLabel('Request VN')
        .setStyle(ButtonStyle.Danger);

      const vnrButtonRow = new ActionRowBuilder().addComponents(vnrButton);

      await message.edit({ components: [vnrButtonRow] });

      await interaction.editReply({ content: 'Button added successfully!' });
    } catch (error) {
      console.log(error);
    }
  },
};
