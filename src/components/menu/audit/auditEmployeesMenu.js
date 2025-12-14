const {
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');

module.exports = {
  data: {
    name: `auditEmployeesMenu`,
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

    const selectedEmployees = interaction.values;

    const employeesField = messageEmbed.data.fields.find((f) => f.name === 'Employees On Duty');

    const formattedEmployees = selectedEmployees.map((employeeId) => `<@${employeeId}>`).join('\n');

    if (employeesField) {
      employeesField.value = formattedEmployees || 'No employees selected';
    } else {
      messageEmbed.data.fields.push({
        name: 'Employees On Duty',
        value: formattedEmployees || 'No employees selected',
      });
    }

    const auditRatingMenu = new StringSelectMenuBuilder()
      .setCustomId('auditRatingMenu')
      .setOptions([
        { label: '⭐', value: '⭐' },
        { label: '⭐⭐', value: '⭐⭐' },
        { label: '⭐⭐⭐', value: '⭐⭐⭐' },
        { label: '⭐⭐⭐⭐', value: '⭐⭐⭐⭐' },
        { label: '⭐⭐⭐⭐⭐', value: '⭐⭐⭐⭐⭐' },
      ])
      .setMinValues(1)
      .setMaxValues(1)
      .setPlaceholder('Select audit rating.');

    const auditRatingMenuRow = new ActionRowBuilder().addComponents(auditRatingMenu);

    const auditFinishButton = new ButtonBuilder()
      .setCustomId('auditFinish')
      .setLabel('Submit')
      .setDisabled(true)
      .setStyle(ButtonStyle.Success);

    const auditFinishButtonRow = new ActionRowBuilder().addComponents(auditFinishButton);

    const messageComponents = interaction.message.components;
    // Check if the messageComponents already has the rating menu and finish button
    const hasRatingMenu = messageComponents.some((row) =>
      row.components.some((component) => component.customId === 'auditRatingMenu')
    );

    const hasFinishButton = messageComponents.some((row) =>
      row.components.some((component) => component.customId === 'auditFinish')
    );

    // If the components don't exist yet, add them
    if (!hasRatingMenu) {
      messageComponents.push(auditRatingMenuRow);
    }

    if (!hasFinishButton) {
      messageComponents.push(auditFinishButtonRow);
    }

    try {
      await interaction.message.edit({
        embeds: allEmbeds,
        components: messageComponents,
      });
    } catch (error) {
      console.log(error);
      await interaction.followUp({
        content: `🔴 ERROR: An error occurred while selecting employees on duty. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
