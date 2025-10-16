const {
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require('discord.js');

const employeeNotificationChannelId = '1347592755706200155';

module.exports = {
  data: {
    name: `auditNotifyEmployee`
  },
  async execute(interaction, client) {
    const mentionedUser = interaction.message.mentions?.users?.first() || null;
    const mentionedRole = interaction.message.mentions?.roles?.first() || null;

    if (mentionedUser) {
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;
      if (isNotMentionedUser) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (mentionedRole) {
      const doesNotHaveRole = !interaction.member.roles.cache.has(mentionedRole.id);
      if (doesNotHaveRole) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const mentionableEmployeeField = messageEmbed.data.fields.find(
      (f) => f.name === 'Cashier Discord User'
    );
    const mentionableEmployee = mentionableEmployeeField.value;

    // Filter out the fields we want to remove
    if (messageEmbed.data && messageEmbed.data.fields) {
      // Keep track of how many blank fields we've seen
      let blankFieldCount = 0;

      messageEmbed.data.fields = messageEmbed.data.fields.filter((field) => {
        const fieldName = field.name;

        // Check if this is a blank field (both name and value are '\u200b')
        const isBlankField = field.name === '\u200b' && field.value === '\u200b';

        // If it's a blank field, increment our counter
        if (isBlankField) {
          blankFieldCount++;
        }

        return (
          fieldName !== 'Audited By' &&
          fieldName !== 'Violation Notice Link' &&
          fieldName !== 'Violation Notice Status' &&
          fieldName !== 'Audit Logs' &&
          // Only remove the last blank field (the second one)
          !(isBlankField && blankFieldCount === 2)
        );
      });
    }

    if (messageEmbed.data) {
      messageEmbed.data.color = 0x5865f2; // Discord Blurple color
    }

    const confirmButton = new ButtonBuilder()
      .setCustomId('acknowledgePenalty')
      .setLabel('Acknowledge')
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(confirmButton);

    const employeeNotificationChannel = await client.channels.cache.get(
      employeeNotificationChannelId
    );

    const vnrButton = new ButtonBuilder()
      .setCustomId('auditVnr')
      .setLabel('Request VN')
      .setStyle(ButtonStyle.Primary);

    const notifyEmployeeButtonRow = new ActionRowBuilder().addComponents(vnrButton);

    await employeeNotificationChannel.send({
      content: mentionableEmployee,
      embeds: allEmbeds,
      components: [buttonRow]
    });

    await interaction.message.edit({ content: '', components: [notifyEmployeeButtonRow] });

    const replyEmbed = new EmbedBuilder()
      .setDescription(`Employee has been notified successfully.`)
      .setColor('Green');
    await interaction.editReply({ embeds: [replyEmbed] });
  }
};
