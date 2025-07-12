const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `signatoriesManagementMenu`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    if (
      !messageEmbed.data.fields
        .find((f) => f.name === "Prepared By")
        .value.includes(interaction.user.id)
    ) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this menu.`)
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    const selectedEmployees = interaction.values;

    for (const employee of selectedEmployees) {
      const employeeDiscord = interaction.guild.members.cache.get(employee);

      const employeeField = messageEmbed.data.fields.find(
        (f) => f.value.includes(employee) && f.name === "Management Employee"
      );

      if (!employeeField) {
        // Find the positions of both fields
        const preparedByIndex = messageEmbed.data.fields.findIndex(
          (f) => f.name === "Prepared By"
        );
        const lastServiceEmployeeIndex = messageEmbed.data.fields.findLastIndex(
          (f) => f.name === "Service Employee"
        );

        // Determine where to insert the new field
        let insertIndex;

        if (preparedByIndex !== -1 && lastServiceEmployeeIndex !== -1) {
          // Both fields exist - insert after the one that comes later
          insertIndex = Math.max(preparedByIndex, lastServiceEmployeeIndex) + 1;
        } else if (preparedByIndex !== -1) {
          // Only "Prepared By" exists
          insertIndex = preparedByIndex + 1;
        } else if (lastServiceEmployeeIndex !== -1) {
          // Only "Service Employee" exists
          insertIndex = lastServiceEmployeeIndex + 1;
        } else {
          // Neither field exists - insert at the beginning
          insertIndex = 0;
        }

        // Insert the new field
        messageEmbed.data.fields.splice(insertIndex, 0, {
          name: "Management Employee",
          value: `${employeeDiscord.user.toString()} ⌛`,
        });
      }
    }

    const messageComponents = interaction.message.components;

    if (messageEmbed.data.description) {
      const submitButtonRow = messageComponents.find((row) =>
        row.components.some(
          (component) => component.customId === "signatoriesSubmit"
        )
      );

      if (submitButtonRow) {
        const submitButtonIndex = submitButtonRow.components.findIndex(
          (component) => component.customId === "signatoriesSubmit"
        );

        if (submitButtonIndex !== -1) {
          submitButtonRow.components[submitButtonIndex].data.disabled = false;
        }
      }
    }

    await interaction.message.edit({
      embeds: allEmbeds,
      components: messageComponents,
    });

    replyEmbed
      .setDescription(`✅ Signatories request has been updated.`)
      .setColor("Grey");

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
