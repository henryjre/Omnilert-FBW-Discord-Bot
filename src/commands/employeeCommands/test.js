const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('testt').setDescription('Testing purposes!'),
  async execute(interaction, client) {
    try {
      // Get the channel and message
      const channel = await client.channels.fetch('1416339740352843928');
      const message = await channel.messages.fetch('1429475544679972934');

      // Get the current embed
      const embed = message.embeds[0];

      // Create a new embed with updated fields
      const updatedEmbed = new EmbedBuilder()
        .setColor(embed.color)
        .setDescription(embed.description)
        .setTitle(embed.title)
        .setFooter(embed.footer)
        .setTimestamp(embed.timestamp);

      // Update the fields
      embed.fields.forEach((field) => {
        let updatedValue = field.value;

        switch (field.name) {
          case 'ID':
            updatedValue = '🆔 | 175';
            break;
          case 'Employee':
            updatedValue = '🪪 | Jomar Dela Cruz';
            break;
          case 'Discord User':
            updatedValue = '👤 | <@1334898126414282817>';
            break;
          case 'Shift Start':
            updatedValue = 'October 8, 2025 at 12:00 PM';
            break;
          case 'Shift End':
            updatedValue = 'October 8, 2025 at 9:00 PM';
            break;
        }

        updatedEmbed.addFields({
          name: field.name,
          value: updatedValue,
          inline: field.inline
        });
      });

      // Update the message
      await message.edit({
        content: '# Oct 8, 2025 | 175\n<@1334898126414282817>',
        embeds: [updatedEmbed]
      });

      await interaction.reply({ content: 'Message updated successfully!', ephemeral: true });
    } catch (error) {
      console.error('Error updating message:', error);
      await interaction.reply({
        content: 'Error updating message: ' + error.message,
        ephemeral: true
      });
    }
  }
};
