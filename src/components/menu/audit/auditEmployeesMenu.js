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
    name: `auditEmployeesMenu`
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

    const selectedEmployees = interaction.values;

    const employeesField = messageEmbed.data.fields.find((f) => f.name === 'Employees On Duty');

    const formattedEmployees = selectedEmployees.map((employeeId) => `<@${employeeId}>`).join('\n');

    if (employeesField) {
      employeesField.value = formattedEmployees || 'No employees selected';
    } else {
      messageEmbed.data.fields.push({
        name: 'Employees On Duty',
        value: formattedEmployees || 'No employees selected'
      });
    }

    const messageComponents = interaction.message.components;

    const auditRatingField = messageEmbed.data.fields.find((f) => f.name === 'Audit Rating');

    if (auditRatingField) {
      const submitButtonRow = messageComponents.find((row) =>
        row.components.some((component) => component.customId === 'auditFinish')
      );

      if (submitButtonRow) {
        const submitButtonIndex = submitButtonRow.components.findIndex(
          (component) => component.customId === 'auditFinish'
        );

        if (submitButtonIndex !== -1) {
          submitButtonRow.components[submitButtonIndex].data.disabled = false;
        }
      }
    }

    try {
      await interaction.message.edit({
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
