const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const vnrQueueChannelId = '1424950819501113466';

module.exports = {
  data: {
    name: `cancelVnr`
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    if (
      !messageEmbed.data.fields
        .find((f) => f.name === 'Requested By')
        .value.includes(interaction.user.id)
    ) {
      replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');

      return await interaction.followUp({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral
      });
    }

    const messageComponents = interaction.message.components;

    const submitButtonRow = messageComponents.find((row) =>
      row.components.some((component) => component.customId === 'auditVnr')
    );

    if (submitButtonRow) {
      const submitButtonIndex = submitButtonRow.components.findIndex(
        (component) => component.customId === 'auditVnr'
      );

      if (submitButtonIndex !== -1) {
        submitButtonRow.components[submitButtonIndex].data.disabled = false;
      }
    }

    await interaction.message.edit({
      components: messageComponents
    });

    await interaction.channel.delete();
  }
};
