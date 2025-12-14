const { MessageFlags, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: {
    name: `relieverNotify`,
  },
  async execute(interaction, client) {
    const mentionedUser = interaction.message.mentions?.users?.first() || null;
    const mentionedRole = interaction.message.mentions?.roles?.first() || null;

    if (mentionedUser) {
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;
      if (isNotMentionedUser) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this menu.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (mentionedRole) {
      const doesNotHaveRole = !interaction.member.roles.cache.has(mentionedRole.id);
      if (doesNotHaveRole) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this menu.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    await interaction.deferUpdate();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const relieverField = messageEmbed.data.fields.find((f) => f.name === 'Reliever');

    const reliever = relieverField.value.split(' | ')[1];

    const approveRelieverButton = new ButtonBuilder()
      .setCustomId('approveReliever')
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success);

    const rejectRelieverButton = new ButtonBuilder()
      .setCustomId('rejectReliever')
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(
      approveRelieverButton,
      rejectRelieverButton
    );

    try {
      await interaction.channel.send({
        content: `${reliever}, ${interaction.user.toString()} has requested a shift exchange. Please approve or reject this request.`,
        embeds: allEmbeds,
        components: [buttonRow],
      });

      await interaction.message.delete();
    } catch (error) {
      console.log(error);
      await interaction.followUp({
        content: `🔴 ERROR: An error occurred while selecting employees on duty. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
