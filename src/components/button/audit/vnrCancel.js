const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: {
    name: `cancelVnr`,
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
        flags: MessageFlags.Ephemeral,
      });
    }

    const originalMessage = await interaction.channel.fetchStarterMessage();
    const thread = originalMessage.thread;

    const messageComponents = originalMessage.components;

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

    await originalMessage.edit({
      components: messageComponents,
    });

    if (thread.name.includes('VN Request')) {
      await thread.delete();
    } else {
      await interaction.message.delete();
      await thread.send({
        content: 'VN request has been cancelled.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
