const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

module.exports = {
  data: {
    name: `relieverMenu`
  },
  async execute(interaction, client) {
    const mentionedUser = interaction.message.mentions?.users?.first() || null;
    const mentionedRole = interaction.message.mentions?.roles?.first() || null;

    if (mentionedUser) {
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;
      if (isNotMentionedUser) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this menu.`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (mentionedRole) {
      const doesNotHaveRole = !interaction.member.roles.cache.has(mentionedRole.id);
      if (doesNotHaveRole) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this menu.`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    await interaction.deferUpdate();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const selectedEmployee = interaction.values[0];

    if (selectedEmployee === interaction.user.id) {
      return await interaction.followUp({
        content: `🔴 ERROR: You cannot select yourself as the reliever.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const employeesField = messageEmbed.data.fields.find((f) => f.name === 'Reliever');

    const formattedEmployee = `<@${selectedEmployee}>`;

    if (employeesField) {
      employeesField.value = `🤝 | ${formattedEmployee}`;
    } else {
      messageEmbed.data.fields.push({
        name: 'Reliever',
        value: `🤝 | ${formattedEmployee}`
      });
    }

    const notifyRelieverButton = new ButtonBuilder()
      .setCustomId('relieverNotify')
      .setLabel('Notify Reliever')
      .setStyle(ButtonStyle.Success);

    const notifyRelieverButtonRow = new ActionRowBuilder().addComponents(notifyRelieverButton);

    const messageComponents = interaction.message.components;

    const hasNotifyButton = messageComponents.some((row) =>
      row.components.some((component) => component.customId === 'relieverNotify')
    );

    if (!hasNotifyButton) {
      messageComponents.push(notifyRelieverButtonRow);
    }

    try {
      await interaction.message.edit({
        content: `${interaction.user.toString()}, reliever selected. Click the **Notify Reliever** button to notify the reliever.`,
        embeds: allEmbeds,
        components: messageComponents
      });
    } catch (error) {
      console.log(error);
      await interaction.followUp({
        content: `🔴 ERROR: An error occurred while selecting employees on duty. Please try again.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
