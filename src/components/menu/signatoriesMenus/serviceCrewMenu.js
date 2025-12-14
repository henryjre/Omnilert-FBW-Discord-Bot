const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: {
    name: `signatoriesServiceCrewMenu`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    // Check field limit before insertion
    if (messageEmbed.data.fields.length >= 25) {
      replyEmbed
        .setDescription(
          `🔴 ERROR: Cannot add more serviceemployees. This signatory has reached the maximum signing parties that can be added.`
        )
        .setColor('Red');

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    if (
      !messageEmbed.data.fields
        .find((f) => f.name === 'Prepared By')
        .value.includes(interaction.user.id)
    ) {
      replyEmbed.setDescription(`🔴 ERROR: You cannot use this menu.`).setColor('Red');

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    const selectedEmployees = interaction.values;

    for (const employee of selectedEmployees) {
      const employeeDiscord = interaction.guild.members.cache.get(employee);

      const employeeField = messageEmbed.data.fields.find(
        (f) => f.value.includes(employee) && f.name === 'Service Employee'
      );

      if (!employeeField) {
        const preparedByIndex = messageEmbed.data.fields.findIndex((f) => f.name === 'Prepared By');

        if (preparedByIndex !== -1) {
          messageEmbed.data.fields.splice(preparedByIndex + 1, 0, {
            name: 'Service Employee',
            value: `${employeeDiscord.user.toString()} ⌛`,
          });
        } else {
          messageEmbed.data.fields.unshift({
            name: 'Service Employee',
            value: `${employeeDiscord.user.toString()} ⌛`,
          });
        }
      }
    }

    const messageComponents = interaction.message.components;

    if (messageEmbed.data.description) {
      const submitButtonRow = messageComponents.find((row) =>
        row.components.some((component) => component.customId === 'signatoriesSubmit')
      );

      if (submitButtonRow) {
        const submitButtonIndex = submitButtonRow.components.findIndex(
          (component) => component.customId === 'signatoriesSubmit'
        );

        if (submitButtonIndex !== -1) {
          submitButtonRow.components[submitButtonIndex].data.disabled = false;
        }
      }
    }

    try {
      await interaction.message.edit({
        embeds: allEmbeds,
        components: messageComponents,
      });
    } catch (error) {
      if (error.message.includes('BASE_TYPE_MAX_LENGTH')) {
        replyEmbed
          .setDescription(
            `🔴 ERROR: The maximum number of signing parties that can be added is **24**.`
          )
          .setColor('Red');

        return await interaction.editReply({ embeds: [replyEmbed] });
      }

      console.error(error);
    }

    replyEmbed.setDescription(`✅ Signatories request has been updated.`).setColor('Grey');

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
